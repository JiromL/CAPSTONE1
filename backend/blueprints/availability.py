"""
Counselor Availability Management
Endpoints for creating, updating, and retrieving counselor availability slots
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from models import db, PermissionType
from utils import user_has_permission
from datetime import datetime, timedelta

availability_bp = Blueprint('availability', __name__, url_prefix='/api/availability')

STAFF_ROLES = {'COUNSELOR', 'PSYCHOLOGIST', 'ADMIN', 'IC', 'STAFF'}

# Statuses that occupy a counselor's time and must remove a slot from availability.
ACTIVE_BOOKING_STATUSES = ['REQUESTED', 'CONFIRMED', 'APPROVED', 'MATCHED',
                           'PENDING_STUDENT_APPROVAL', 'CHECKED_IN']


def _slot_minutes():
    """Configured session length; single source of truth for slot generation."""
    try:
        return int(current_app.config.get('APPOINTMENT_DURATION_MINUTES', 60))
    except Exception:
        return 60


def date_block_reason(counselor_id, date_str):
    """Return (True, payload) when a date is a declared holiday or counselor leave.

    counselor_id may be None to check holidays only. Payload matches the shape
    the slot endpoints return so callers can pass it straight through.
    """
    holiday = db.db.holidays.find_one({'date': date_str})
    if holiday:
        return True, {'slots': [], 'date': date_str,
                      'is_holiday': True, 'holiday_name': holiday['name']}
    if counselor_id is not None:
        leave = db.db.counselor_leaves.find_one({'counselor_id': counselor_id, 'date': date_str})
        if leave:
            return True, {'slots': [], 'date': date_str, 'is_leave': True}
    return False, None


def free_slots_for_counselor(counselor_id, target_date, exclude_past=False):
    """Free session slots for one counselor on one date, from the weekly schedule.

    Single source of truth for availability. Reads counselor_weekly_schedule (the
    collection counselors populate through the schedule page), supports multiple
    blocks per day, and drops any slot overlapping an active booking.
    Returns a list of {time: "HH:MM", method: str}.
    """
    duration = _slot_minutes()
    dow = target_date.weekday()

    doc = db.db.counselor_weekly_schedule.find_one({'counselor_id': counselor_id})
    if not doc or not doc.get('schedule'):
        return []
    day_entries = [e for e in doc['schedule'] if e.get('day_of_week') == dow]
    if not day_entries:
        return []

    session_method = (day_entries[0].get('session_method')
                      or day_entries[0].get('method')
                      or doc.get('session_method', 'in-person'))

    slot_set = set()
    for block in day_entries:
        try:
            sh, sm = map(int, block['start_time'].split(':'))
            eh, em = map(int, block['end_time'].split(':'))
        except (KeyError, ValueError):
            continue
        cursor = target_date.replace(hour=sh, minute=sm, second=0, microsecond=0)
        day_end = target_date.replace(hour=eh, minute=em, second=0, microsecond=0)
        while cursor + timedelta(minutes=duration) <= day_end:
            slot_set.add(cursor)
            cursor += timedelta(minutes=duration)
    all_slots = sorted(slot_set)

    if exclude_past:
        now = datetime.utcnow()
        all_slots = [s for s in all_slots if s > now]

    day_start_dt = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end_dt = target_date.replace(hour=23, minute=59, second=59)
    booked = list(db.db.appointments.find({
        'counselor_id': counselor_id,
        'status': {'$in': ACTIVE_BOOKING_STATUSES},
        '$or': [
            {'scheduled_start': {'$gte': day_start_dt, '$lte': day_end_dt}},
            {'requested_start': {'$gte': day_start_dt, '$lte': day_end_dt}},
        ],
    }))

    def is_booked(slot_dt):
        slot_end = slot_dt + timedelta(minutes=duration)
        for apt in booked:
            apt_start = apt.get('scheduled_start') or apt.get('requested_start')
            if not apt_start:
                continue
            if isinstance(apt_start, str):
                try:
                    apt_start = datetime.fromisoformat(apt_start)
                except Exception:
                    continue
            apt_end = apt_start + timedelta(minutes=duration)
            if slot_dt < apt_end and slot_end > apt_start:
                return True
        return False

    return [{'time': s.strftime('%H:%M'), 'method': session_method}
            for s in all_slots if not is_booked(s)]


# ============================================================================
# WEEKLY RECURRING SCHEDULE  (new, simple model)
# Collection: counselor_weekly_schedule
# Doc shape:  { counselor_id, schedule: [{day_of_week: 0-6, start_time: "HH:MM", end_time: "HH:MM"}] }
# ============================================================================

@availability_bp.route('', methods=['GET'])
@jwt_required()
def list_all_slots():
    """Return all availability slots across all counselors (for IC schedule view)."""
    slots = list(db.db.availability.find({}).sort('start_time', 1).limit(500))
    result = []
    for s in slots:
        result.append({
            '_id': str(s['_id']),
            'counselor_id': str(s.get('counselor_id', '')),
            'counselor_name': s.get('counselor_name', ''),
            'start_time': s['start_time'].isoformat() if hasattr(s.get('start_time'), 'isoformat') else str(s.get('start_time', '')),
            'end_time': s['end_time'].isoformat() if hasattr(s.get('end_time'), 'isoformat') else str(s.get('end_time', '')),
            'status': s.get('status', 'available'),
            'is_available': s.get('is_available', True),
        })
    return jsonify(result), 200


@availability_bp.route('/weekly', methods=['GET'])
@jwt_required()
def get_weekly_schedule():
    """Return the current user's weekly recurring schedule."""
    uid = get_jwt_identity()
    try:
        uid_obj = ObjectId(uid)
    except Exception:
        return jsonify({'error': 'Invalid user id'}), 400

    doc = db.db.counselor_weekly_schedule.find_one({'counselor_id': uid_obj})
    return jsonify({
        'schedule': doc['schedule'] if doc else [],
        'session_method': doc.get('session_method', 'in-person') if doc else 'in-person',
    }), 200


@availability_bp.route('/weekly', methods=['PUT'])
@jwt_required()
def set_weekly_schedule():
    """Replace the current user's weekly recurring schedule.

    Body: { schedule: [{day_of_week: 0-6, start_time: "HH:MM", end_time: "HH:MM"}, ...] }
    """
    uid = get_jwt_identity()
    try:
        uid_obj = ObjectId(uid)
    except Exception:
        return jsonify({'error': 'Invalid user id'}), 400

    user = db.db.users.find_one({'_id': uid_obj})
    if not user or user.get('role') not in STAFF_ROLES:
        return jsonify({'error': 'Only counseling staff can set availability'}), 403

    data = request.get_json() or {}
    schedule = data.get('schedule', [])
    # Global fallback method (kept for backwards-compat); per-day overrides live in each entry
    session_method = data.get('session_method', 'in-person')
    if session_method not in ('in-person', 'online'):
        return jsonify({'error': 'session_method must be in-person or online'}), 400

    # Validate and normalise each entry
    for entry in schedule:
        dow = entry.get('day_of_week')
        if not isinstance(dow, int) or dow < 0 or dow > 6:
            return jsonify({'error': f'Invalid day_of_week: {dow}'}), 400
        for field in ('start_time', 'end_time'):
            val = entry.get(field, '')
            parts = val.split(':')
            if len(parts) != 2:
                return jsonify({'error': f'Invalid {field}: {val}'}), 400
            try:
                h, m = int(parts[0]), int(parts[1])
                if not (0 <= h <= 23 and 0 <= m <= 59):
                    raise ValueError
            except ValueError:
                return jsonify({'error': f'Invalid {field}: {val}. Use HH:MM (00:00–23:59)'}), 400
        # Store per-day method, falling back to global
        day_method = entry.get('session_method', session_method)
        if day_method not in ('in-person', 'online'):
            day_method = session_method
        entry['session_method'] = day_method

    db.db.counselor_weekly_schedule.replace_one(
        {'counselor_id': uid_obj},
        {'counselor_id': uid_obj, 'session_method': session_method, 'schedule': schedule, 'updated_at': datetime.utcnow()},
        upsert=True,
    )
    return jsonify({'message': 'Weekly schedule saved', 'days': len(schedule)}), 200


@availability_bp.route('/free-slots', methods=['GET'])
@jwt_required()
def get_free_slots():
    """Return available 30-min slots for a counselor on a given date.

    Query params:
      counselor_id  – ObjectId string of the counselor
      date          – YYYY-MM-DD

    Logic:
      1. Look up the counselor's weekly_schedule for that day-of-week.
      2. Generate 30-min slots inside the working window.
      3. Remove slots that overlap a CONFIRMED/APPROVED/MATCHED appointment.
      4. Return remaining slots as "HH:MM" strings.
    """
    counselor_id = request.args.get('counselor_id')
    date_str = request.args.get('date')

    if not counselor_id or not date_str:
        return jsonify({'error': 'counselor_id and date are required'}), 400

    try:
        cid = ObjectId(counselor_id)
    except Exception:
        return jsonify({'error': 'Invalid counselor_id'}), 400

    try:
        target_date = datetime.strptime(date_str, '%Y-%m-%d')
    except ValueError:
        return jsonify({'error': 'date must be YYYY-MM-DD'}), 400

    # Holiday / counselor-leave check
    blocked, payload = date_block_reason(cid, date_str)
    if blocked:
        return jsonify(payload), 200

    slots = free_slots_for_counselor(cid, target_date)
    session_method = slots[0]['method'] if slots else 'in-person'
    return jsonify({
        'slots': [s['time'] for s in slots],
        'session_method': session_method,
    }), 200


@availability_bp.route('/open-slots', methods=['GET'])
@jwt_required()
def get_open_slots():
    """Aggregate free 30-min slots across ALL intake counselors for a given date.

    Query params:
      date   – YYYY-MM-DD (required)
      method – 'online' or 'in-person' (optional): only intake counselors working that way

    Returns:
      {
        date, slots: [{time, counselor_id, counselor_name}],
        next_available_date  – nearest date in next 14 days that has ≥1 slot (or null)
      }
    """
    date_str = request.args.get('date')
    if not date_str:
        return jsonify({'error': 'date is required'}), 400
    want = (request.args.get('method') or '').lower()
    ONLINE = ('online', 'video', 'zoom', 'google-meet', 'google_meet')

    def method_ok(m):
        """An online student must get an intake counselor who works online, and the other way round."""
        if not want:
            return True
        online = (m or '').lower() in ONLINE
        return online if want in ONLINE else not online
    try:
        target_date = datetime.strptime(date_str, '%Y-%m-%d')
    except ValueError:
        return jsonify({'error': 'date must be YYYY-MM-DD'}), 400

    # Holiday check — no slots on declared university holidays
    holiday = db.db.holidays.find_one({'date': date_str})
    if holiday:
        return jsonify({'date': date_str, 'slots': [],
                        'is_holiday': True, 'holiday_name': holiday['name'],
                        'next_available_date': None}), 200

    def slots_for_counselor(counselor, date):
        """Free slots for one counselor on one date (skips their leave days)."""
        if db.db.counselor_leaves.find_one(
                {'counselor_id': counselor['_id'], 'date': date.strftime('%Y-%m-%d')}):
            return []
        return free_slots_for_counselor(counselor['_id'], date)

    # Get all IC counselors
    ics = list(db.db.users.find({'role': {'$in': ['IC', 'INTAKE_COUNSELOR']}, 'is_active': True}))

    # Count confirmed/requested appointments this week per IC for workload balancing
    week_start = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start -= timedelta(days=target_date.weekday())  # Monday of this week
    week_end = week_start + timedelta(days=7)
    ic_load = {}
    for ic in ics:
        ic_load[ic['_id']] = db.db.appointments.count_documents({
            'counselor_id': ic['_id'],
            'status': {'$in': ['CONFIRMED', 'REQUESTED', 'APPROVED', 'MATCHED']},
            '$or': [
                {'scheduled_start': {'$gte': week_start, '$lt': week_end}},
                {'requested_start':  {'$gte': week_start, '$lt': week_end}},
            ],
        })

    # Sort ICs lightest load first so deduplication always picks least busy IC
    ics_sorted = sorted(ics, key=lambda ic: ic_load.get(ic['_id'], 0))

    def build_slots_for_date(date):
        time_counts = {}   # time_str → number of ICs available
        time_first  = {}   # time_str → (ic, method) — least-busy IC for that time
        for ic in ics_sorted:
            for s in slots_for_counselor(ic, date):
                if not method_ok(s.get('method')):
                    continue
                t = s['time']
                time_counts[t] = time_counts.get(t, 0) + 1
                if t not in time_first:
                    time_first[t] = (ic, s['method'])
        combined = []
        for time_str in sorted(time_counts.keys()):
            ic, method = time_first[time_str]
            combined.append({
                'time': time_str,
                'method': method,
                'counselor_id': str(ic['_id']),
                'counselor_name': f"{ic.get('first_name','')} {ic.get('last_name','')}".strip(),
                'count': time_counts[time_str],
            })
        return combined

    slots = build_slots_for_date(target_date)

    # Find next available date if today has no slots (skip declared holidays)
    next_available_date = None
    if not slots:
        for delta in range(1, 15):
            candidate = target_date + timedelta(days=delta)
            cand_str = candidate.strftime('%Y-%m-%d')
            if db.db.holidays.find_one({'date': cand_str}):
                continue
            if build_slots_for_date(candidate):
                next_available_date = cand_str
                break

    return jsonify({
        'date': date_str,
        'slots': slots,
        'next_available_date': next_available_date,
    }), 200


# ============================================================================
# LEGACY SLOT MANAGEMENT (kept for backwards compat)
# ============================================================================

@availability_bp.route('/set-availability', methods=['POST'])
@jwt_required()
def set_availability():
    """Create or update counselor's availability slots"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    try:
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        user = db.db.users.find_one({"_id": user_id_obj})
    except:
        user = db.db.users.find_one({"_id": user_id})
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Only counselors and staff can set their availability
    if user.get('role') not in ['COUNSELOR', 'PSYCHOLOGIST', 'ADMIN']:
        return jsonify({'error': 'Only counselors can set availability'}), 403

    # Get slots from request (array of time slots)
    slots = data.get('slots', [])
    if not slots:
        return jsonify({'error': 'No slots provided'}), 400
    
    created_slots = []
    
    for slot in slots:
        try:
            slot_start = datetime.fromisoformat(slot['start'])
            slot_end = datetime.fromisoformat(slot['end'])
        except (ValueError, KeyError):
            return jsonify({'error': 'Invalid slot format. Required: start, end (ISO format)'}), 400
        
        if slot_end <= slot_start:
            return jsonify({'error': 'Slot end must be after start'}), 400
        
        # Check for existing slot in same time range
        existing = db.db.counselor_availability.find_one({
            'counselor_id': user_id_obj,
            'slot_start': {'$lt': slot_end},
            'slot_end': {'$gt': slot_start}
        })
        
        if existing:
            # Update existing slot
            db.db.counselor_availability.update_one(
                {'_id': existing['_id']},
                {'$set': {
                    'slot_start': slot_start,
                    'slot_end': slot_end,
                    'is_available': True,
                    'updated_at': datetime.utcnow()
                }}
            )
            created_slots.append({
                'slot_id': str(existing['_id']),
                'slot_start': slot_start.isoformat(),
                'slot_end': slot_end.isoformat(),
                'status': 'updated'
            })
        else:
            # Create new slot
            new_slot = {
                'counselor_id': user_id_obj,
                'slot_start': slot_start,
                'slot_end': slot_end,
                'is_available': True,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }
            result = db.db.counselor_availability.insert_one(new_slot)
            created_slots.append({
                'slot_id': str(result.inserted_id),
                'slot_start': slot_start.isoformat(),
                'slot_end': slot_end.isoformat(),
                'status': 'created'
            })
    
    return jsonify({
        'message': f'Created/updated {len(created_slots)} availability slots',
        'slots': created_slots
    }), 201


@availability_bp.route('/my-availability', methods=['GET'])
@jwt_required()
def get_my_availability():
    """Get current user's availability slots"""
    user_id = get_jwt_identity()
    
    try:
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        user = db.db.users.find_one({"_id": user_id_obj})
    except:
        user = db.db.users.find_one({"_id": user_id})
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Get date range if provided
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    query = {'counselor_id': user_id_obj}
    
    if start_date and end_date:
        try:
            start = datetime.fromisoformat(start_date)
            end = datetime.fromisoformat(end_date)
            query['slot_start'] = {'$gte': start}
            query['slot_end'] = {'$lte': end}
        except ValueError:
            return jsonify({'error': 'Invalid datetime format'}), 400
    
    slots = list(db.db.counselor_availability.find(query).sort('slot_start', 1))
    
    result_slots = []
    for s in slots:
        result_slots.append({
            'slot_id': str(s['_id']),
            'slot_start': s['slot_start'].isoformat() if isinstance(s['slot_start'], datetime) else s['slot_start'],
            'slot_end': s['slot_end'].isoformat() if isinstance(s['slot_end'], datetime) else s['slot_end'],
            'is_available': s.get('is_available', True),
            'created_at': s['created_at'].isoformat() if isinstance(s['created_at'], datetime) else s['created_at']
        })
    
    return jsonify({
        'counselor_id': str(user_id_obj),
        'counselor_name': f"{user.get('first_name', '')} {user.get('last_name', '')}",
        'total_slots': len(slots),
        'slots': result_slots
    }), 200


@availability_bp.route('/counselor/<counselor_id>', methods=['GET'])
@jwt_required()
def get_counselor_availability(counselor_id):
    """Get specific counselor's availability slots (for scheduling)"""
    user_id = get_jwt_identity()
    
    try:
        cid = ObjectId(counselor_id) if isinstance(counselor_id, str) else counselor_id
    except:
        cid = counselor_id
    
    # Get date range
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    if not start_date or not end_date:
        return jsonify({'error': 'start_date and end_date required'}), 400
    
    try:
        start = datetime.fromisoformat(start_date)
        end = datetime.fromisoformat(end_date)
    except ValueError:
        return jsonify({'error': 'Invalid datetime format'}), 400
    
    # Get counselor info
    try:
        counselor = db.db.users.find_one({"_id": cid})
    except:
        counselor = db.db.users.find_one({"_id": ObjectId(counselor_id)})
    
    if not counselor:
        return jsonify({'error': 'Counselor not found'}), 404
    
    # Get slots
    query = {
        'counselor_id': counselor.get('_id'),
        'slot_start': {'$gte': start},
        'slot_end': {'$lte': end},
        'is_available': True
    }
    
    slots = list(db.db.counselor_availability.find(query).sort('slot_start', 1))
    
    # Filter out slots with conflicting appointments
    available_slots = []
    for slot in slots:
        # Check for conflicting confirmed appointments
        conflict = db.db.appointments.find_one({
            'counselor_id': counselor.get('_id'),
            'status': {'$in': ['CONFIRMED', 'MATCHED']},
            'requested_start': {'$lt': slot['slot_end']},
            'requested_end': {'$gt': slot['slot_start']}
        })
        
        if not conflict:
            available_slots.append({
                'slot_id': str(slot['_id']),
                'slot_start': slot['slot_start'].isoformat() if isinstance(slot['slot_start'], datetime) else slot['slot_start'],
                'slot_end': slot['slot_end'].isoformat() if isinstance(slot['slot_end'], datetime) else slot['slot_end'],
                'duration_minutes': int((slot['slot_end'] - slot['slot_start']).total_seconds() / 60)
            })
    
    return jsonify({
        'counselor_id': str(counselor.get('_id')),
        'counselor_name': f"{counselor.get('first_name', '')} {counselor.get('last_name', '')}",
        'available_slots': available_slots,
        'total_available': len(available_slots)
    }), 200


@availability_bp.route('/<slot_id>', methods=['DELETE'])
@jwt_required()
def delete_availability(slot_id):
    """Delete an availability slot"""
    user_id = get_jwt_identity()
    
    try:
        slot_id_obj = ObjectId(slot_id) if isinstance(slot_id, str) else slot_id
        slot = db.db.counselor_availability.find_one({"_id": slot_id_obj})
    except:
        slot = db.db.counselor_availability.find_one({"_id": slot_id})
    
    if not slot:
        return jsonify({'error': 'Slot not found'}), 404
    
    # Only the counselor or admin can delete their own slots
    user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
    user = db.db.users.find_one({"_id": user_id_obj})
    
    if slot['counselor_id'] != user_id_obj and user.get('role') != 'ADMIN':
        return jsonify({'error': 'Unauthorized'}), 403
    
    db.db.counselor_availability.delete_one({"_id": slot.get('_id')})
    
    return jsonify({'message': 'Availability slot deleted'}), 200


@availability_bp.route('/bulk-create', methods=['POST'])
@jwt_required()
def bulk_create_availability():
    """Create recurring availability slots (e.g., every Monday 2-4pm for 8 weeks)"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    try:
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        user = db.db.users.find_one({"_id": user_id_obj})
    except:
        user = db.db.users.find_one({"_id": user_id})
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if user.get('role') not in ['COUNSELOR', 'PSYCHOLOGIST', 'ADMIN']:
        return jsonify({'error': 'Only counselors can set availability'}), 403

    # Required fields
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    slot_start_time = data.get('slot_start_time')  # e.g., "14:00"
    slot_end_time = data.get('slot_end_time')      # e.g., "16:00"
    days_of_week = data.get('days_of_week', [])    # [0-6] Monday=0, Sunday=6
    
    if not all([start_date, end_date, slot_start_time, slot_end_time, days_of_week]):
        return jsonify({'error': 'Missing required fields: start_date, end_date, slot_start_time, slot_end_time, days_of_week'}), 400
    
    try:
        start = datetime.fromisoformat(start_date)
        end = datetime.fromisoformat(end_date)
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400
    
    # Parse times
    try:
        start_h, start_m = map(int, slot_start_time.split(':'))
        end_h, end_m = map(int, slot_end_time.split(':'))
    except:
        return jsonify({'error': 'Invalid time format. Use HH:MM'}), 400
    
    created_slots = []
    current = start
    
    # Generate slots for matching days within date range
    while current <= end:
        if current.weekday() in days_of_week:
            slot_start = current.replace(hour=start_h, minute=start_m, second=0)
            slot_end = current.replace(hour=end_h, minute=end_m, second=0)
            
            new_slot = {
                'counselor_id': user_id_obj,
                'slot_start': slot_start,
                'slot_end': slot_end,
                'is_available': True,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }
            
            result = db.db.counselor_availability.insert_one(new_slot)
            created_slots.append({
                'slot_id': str(result.inserted_id),
                'slot_start': slot_start.isoformat(),
                'slot_end': slot_end.isoformat()
            })
        
        current += timedelta(days=1)
    
    return jsonify({
        'message': f'Created {len(created_slots)} recurring availability slots',
        'total_slots': len(created_slots),
        'slots': created_slots
    }), 201


@availability_bp.route('/my-slots', methods=['GET'])
@jwt_required()
def get_my_slots():
    """Return the requesting counselor/psychologist's own free slots for a given date.
    Used by the schedule modal so staff see only their own availability.

    Query params:
      date – YYYY-MM-DD (required)
    """
    user_id = get_jwt_identity()
    date_str = request.args.get('date')
    if not date_str:
        return jsonify({'error': 'date is required'}), 400
    try:
        target_date = datetime.strptime(date_str, '%Y-%m-%d')
    except ValueError:
        return jsonify({'error': 'date must be YYYY-MM-DD'}), 400

    try:
        user_id_obj = ObjectId(user_id)
    except Exception:
        return jsonify({'error': 'Invalid user'}), 400

    user = db.db.users.find_one({'_id': user_id_obj})
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Respect declared holidays and the counselor's own leave days.
    blocked, payload = date_block_reason(user_id_obj, date_str)
    if blocked:
        return jsonify(payload), 200

    slots = free_slots_for_counselor(user_id_obj, target_date)
    return jsonify({'slots': slots, 'date': date_str}), 200


# ============================================================================
# COUNSELOR LEAVE / BLOCKING  (D2)
# Collection: counselor_leaves
# Doc shape:  { counselor_id: ObjectId, date: "YYYY-MM-DD", reason: str, created_at }
# ============================================================================

CLINICAL_ROLES = {'COUNSELOR', 'PSYCHOLOGIST', 'IC', 'CASE_MANAGER'}


@availability_bp.route('/leave', methods=['GET'])
@jwt_required()
def get_my_leaves():
    """Return the authenticated counselor's leave blocks (upcoming by default)."""
    user_id = get_jwt_identity()
    try:
        uid = ObjectId(user_id)
    except Exception:
        return jsonify({'error': 'Invalid user ID'}), 400

    include_past = request.args.get('include_past', 'false').lower() == 'true'
    query = {'counselor_id': uid}
    if not include_past:
        today = datetime.utcnow().strftime('%Y-%m-%d')
        query['date'] = {'$gte': today}

    docs = list(db.db.counselor_leaves.find(query).sort('date', 1))
    return jsonify({
        'leaves': [
            {'id': str(d['_id']), 'date': d['date'], 'reason': d.get('reason', '')}
            for d in docs
        ]
    }), 200


@availability_bp.route('/leave', methods=['POST'])
@jwt_required()
def add_leave():
    """Block one or more dates as leave (clinical staff only)."""
    user_id = get_jwt_identity()
    try:
        uid = ObjectId(user_id)
    except Exception:
        return jsonify({'error': 'Invalid user ID'}), 400

    user = db.db.users.find_one({'_id': uid})
    if not user or user.get('role') not in CLINICAL_ROLES:
        return jsonify({'error': 'Only clinical staff can block leave dates'}), 403

    data = request.get_json() or {}
    dates = data.get('dates') or ([data.get('date')] if data.get('date') else [])
    reason = data.get('reason', '').strip()

    if not dates:
        return jsonify({'error': 'dates (array) or date is required'}), 400

    created = []
    skipped = []
    today = datetime.utcnow().strftime('%Y-%m-%d')
    for date_str in dates:
        if not date_str:
            continue
        try:
            datetime.strptime(date_str, '%Y-%m-%d')
        except ValueError:
            return jsonify({'error': f'Invalid date format: {date_str}. Use YYYY-MM-DD'}), 400
        if date_str < today:
            skipped.append(date_str)
            continue
        if db.db.counselor_leaves.find_one({'counselor_id': uid, 'date': date_str}):
            skipped.append(date_str)
            continue
        # Check for confirmed appointments on this date (warn but still allow)
        day_start = datetime.strptime(date_str, '%Y-%m-%d')
        day_end   = day_start.replace(hour=23, minute=59, second=59)
        confirmed_count = db.db.appointments.count_documents({
            'counselor_id': uid,
            'status': {'$in': ['CONFIRMED', 'APPROVED', 'MATCHED', 'CHECKED_IN']},
            '$or': [
                {'scheduled_start': {'$gte': day_start, '$lte': day_end}},
                {'requested_start':  {'$gte': day_start, '$lte': day_end}},
            ],
        })

        result = db.db.counselor_leaves.insert_one({
            'counselor_id': uid,
            'date': date_str,
            'reason': reason,
            'confirmed_appointments_on_date': confirmed_count,
            'created_at': datetime.utcnow(),
        })
        entry = {'id': str(result.inserted_id), 'date': date_str}
        if confirmed_count:
            entry['warning'] = (
                f"You have {confirmed_count} confirmed session(s) on {date_str}. "
                f"This leave block hides new slots but does NOT cancel existing appointments."
            )
        created.append(entry)

    return jsonify({'created': created, 'skipped': skipped}), 201


@availability_bp.route('/leave/<leave_id>', methods=['DELETE'])
@jwt_required()
def delete_leave(leave_id):
    """Remove a leave block (owner only)."""
    user_id = get_jwt_identity()
    try:
        uid = ObjectId(user_id)
        lid = ObjectId(leave_id)
    except Exception:
        return jsonify({'error': 'Invalid ID'}), 400

    result = db.db.counselor_leaves.delete_one({'_id': lid, 'counselor_id': uid})
    if result.deleted_count == 0:
        return jsonify({'error': 'Leave block not found or not yours'}), 404
    return jsonify({'message': 'Leave block removed'}), 200
