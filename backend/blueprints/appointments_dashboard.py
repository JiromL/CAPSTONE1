"""
Appointments Dashboard Endpoints
Role-based appointment request viewing for different user types
"""

from flask import Blueprint, jsonify, request
from utils import server_error
from flask_jwt_extended import get_jwt_identity, jwt_required
from bson import ObjectId
from datetime import datetime, timedelta
from models import db, AppointmentStatus

appointments_dashboard_bp = Blueprint('appointments_dashboard', __name__, url_prefix='/api/appointments/dashboard')

@appointments_dashboard_bp.route('/role-view', methods=['GET'])
@jwt_required()
def get_role_based_dashboard():
    """Get appointments view based on user role - efficient and simple"""
    user_id = get_jwt_identity()
    
    try:
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        user = db.db.users.find_one({"_id": user_id_obj})
    except:
        user = db.db.users.find_one({"_id": user_id})
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    role = user.get('role', '').upper()
    user_name = f"{user.get('first_name', '')} {user.get('last_name', '')}"
    
    try:
        # Build data based on role
        if role == 'STUDENT':
            return get_student_appointments(user_id_obj, user_name)
        elif role in ['COUNSELOR', 'PSYCHOLOGIST']:
            return get_counselor_appointments(user_id_obj, user_name)
        elif role == 'ADMIN':
            return get_admin_dashboard(user_id_obj, user_name)
        elif role == 'IC':  # Intake Coordinator
            return get_intake_coordinator_requests(user_id_obj, user_name)
        elif role == 'STAFF':
            return get_staff_dashboard(user_id_obj, user_name)
        elif role == 'CASE_MANAGER':
            return get_case_manager_dashboard(user_id_obj, user_name)
        else:
            return get_generic_dashboard(user_id_obj, user_name)
    
    except Exception as e:
        return server_error(e, 'Failed to fetch dashboard. Please try again.')

def get_student_appointments(user_id_obj, user_name):
    """STUDENT: All their own appointments — by student_id directly, not via case."""
    try:
        appointments = list(db.db.appointments.find(
            {"student_id": user_id_obj}
        ).sort("created_at", -1))

        status_map: dict = {}
        for a in appointments:
            s = a.get('status', '')
            status_map[s] = status_map.get(s, 0) + 1

        return jsonify({
            'role': 'STUDENT',
            'user_name': user_name,
            'view_type': 'personal_appointments',
            'appointments': format_appointments(appointments),
            'summary': {
                'total': len(appointments),
                'by_status': status_map,
            },
            'can_edit': True,
            'can_delete': True,
        }), 200
    except Exception as e:
        return server_error(e)

def get_counselor_appointments(user_id_obj, user_name):
    """COUNSELOR/PSYCHOLOGIST: View their assigned appointments across all active statuses"""
    try:
        appointments = list(db.db.appointments.find({
            "counselor_id": user_id_obj
        }).sort("created_at", -1))

        active_statuses = {
            AppointmentStatus.PENDING_APPROVAL.value,
            AppointmentStatus.APPROVED.value,
            AppointmentStatus.MATCHED.value,
            AppointmentStatus.CONFIRMED.value,
            AppointmentStatus.EVALUATION.value,
            AppointmentStatus.FOLLOW_UP.value,
            AppointmentStatus.REFERRAL.value,
        }

        confirmed_count   = sum(1 for a in appointments if a.get('status') in {AppointmentStatus.CONFIRMED.value, AppointmentStatus.APPROVED.value, AppointmentStatus.MATCHED.value})
        evaluation_count  = sum(1 for a in appointments if a.get('status') == AppointmentStatus.EVALUATION.value)
        follow_up_count   = sum(1 for a in appointments if a.get('status') == AppointmentStatus.FOLLOW_UP.value)
        referral_count    = sum(1 for a in appointments if a.get('status') == AppointmentStatus.REFERRAL.value)
        completed_count   = sum(1 for a in appointments if a.get('status') == AppointmentStatus.COMPLETED.value)

        return jsonify({
            'role': 'COUNSELOR',
            'user_name': user_name,
            'view_type': 'assigned_appointments',
            'appointments': format_appointments(appointments),
            'summary': {
                'total_appointments': len(appointments),
                'confirmed': confirmed_count,
                'awaiting_evaluation': evaluation_count,
                'follow_up': follow_up_count,
                'referral': referral_count,
                'completed': completed_count,
            },
            'can_manage_sessions': True,
            'can_reschedule': True,
        }), 200
    except Exception as e:
        return server_error(e)

def get_admin_dashboard(user_id_obj, user_name):
    """ADMIN: View all appointments with detailed statistics"""
    try:
        # Get all appointments
        all_appointments = list(db.db.appointments.find({}))
        
        # Count by status
        status_pipeline = [
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ]
        status_stats = list(db.db.appointments.aggregate(status_pipeline))
        status_map = {item['_id']: item['count'] for item in status_stats}
        
        # Count by counselor
        counselor_pipeline = [
            {"$group": {"_id": "$counselor_id", "count": {"$sum": 1}}}
        ]
        counselor_stats = list(db.db.appointments.aggregate(counselor_pipeline))
        
        # Get counselor names
        counselor_data = []
        for stat in counselor_stats:
            if stat['_id']:
                counselor = db.db.users.find_one({"_id": ObjectId(stat['_id'])})
                counselor_data.append({
                    'counselor_id': str(stat['_id']),
                    'counselor_name': f"{counselor.get('first_name', '')} {counselor.get('last_name', '')}" if counselor else 'Unknown',
                    'appointment_count': stat['count']
                })
        
        return jsonify({
            'role': 'ADMIN',
            'user_name': user_name,
            'view_type': 'all_appointments_admin',
            'appointments': format_appointments(all_appointments[:50]),  # Last 50 for efficiency
            'summary': {
                'total_appointments': len(all_appointments),
                'by_status': status_map,
                'by_counselor': counselor_data
            },
            'can_assign_counselor': True,
            'can_view_all': True
        }), 200
    except Exception as e:
        return server_error(e)

def get_intake_coordinator_requests(user_id_obj, user_name):
    """IC: Sees their own assigned appointments + any unassigned REQUESTED intake appointments."""
    try:
        active_statuses = [
            AppointmentStatus.REQUESTED.value,
            AppointmentStatus.PENDING_APPROVAL.value,
            AppointmentStatus.CONFIRMED.value,
            AppointmentStatus.APPROVED.value,
            AppointmentStatus.MATCHED.value,
            AppointmentStatus.EVALUATION.value,
            AppointmentStatus.FOLLOW_UP.value,
            AppointmentStatus.REFERRAL.value,
            "RESCHEDULE_REQUESTED",
            "CHECKED_IN",
        ]

        # Appointments assigned to this IC
        own_appointments = list(db.db.appointments.find({
            "counselor_id": user_id_obj,
            "status": {"$in": active_statuses},
        }).sort("created_at", -1))

        # Unassigned REQUESTED intake appointments — no IC claimed them yet
        own_ids = {a['_id'] for a in own_appointments}
        unassigned_intakes = list(db.db.appointments.find({
            "counselor_id": {"$in": [None, ""]},
            "status": AppointmentStatus.REQUESTED.value,
            "purpose": "intake_interview",
        }).sort("created_at", -1))
        # Exclude any that also exist in own_appointments (shouldn't happen, but be safe)
        unassigned_intakes = [a for a in unassigned_intakes if a['_id'] not in own_ids]

        all_appointments = own_appointments + unassigned_intakes

        reschedule_count = db.db.appointments.count_documents({
            "counselor_id": user_id_obj,
            "status": "RESCHEDULE_REQUESTED",
        })
        evaluation_count = sum(1 for a in own_appointments if a.get('status') == AppointmentStatus.EVALUATION.value)
        slot_pending     = [a for a in own_appointments if a.get('status') == AppointmentStatus.REQUESTED.value]
        pending_approval = [a for a in own_appointments if a.get('status') == AppointmentStatus.PENDING_APPROVAL.value]

        return jsonify({
            'role': 'IC',
            'user_name': user_name,
            'view_type': 'own_appointments',
            'appointments': format_appointments(all_appointments),
            'pending_requests': format_appointments(slot_pending),
            'pending_approval': format_appointments(pending_approval),
            'summary': {
                'unassigned_requests': len(slot_pending) + len(unassigned_intakes),
                'awaiting_approval': len(pending_approval),
                'action_required': len(slot_pending) + len(pending_approval) + len(unassigned_intakes),
                'pending_reschedules': reschedule_count,
                'awaiting_evaluation': evaluation_count,
            },
            'can_assign_counselor': False,
            'can_approve': True,
        }), 200
    except Exception as e:
        return server_error(e)

def get_case_coordinator_requests(user_id_obj, user_name):
    """CSC/CSP: View active/ongoing appointments assigned to them plus all follow-up/referral sessions"""
    try:
        # Appointments directly assigned to this counselor
        assigned = list(db.db.appointments.find({
            "counselor_id": user_id_obj
        }).sort("created_at", -1))

        # Also include unassigned FOLLOW_UP / REFERRAL sessions so nothing falls through
        followup_referral = list(db.db.appointments.find({
            "status": {"$in": [AppointmentStatus.FOLLOW_UP.value, AppointmentStatus.REFERRAL.value]},
            "counselor_id": {"$exists": False}
        }).sort("created_at", -1).limit(50))

        all_apts = assigned + followup_referral

        confirmed_count   = sum(1 for a in all_apts if a.get('status') in {AppointmentStatus.CONFIRMED.value, AppointmentStatus.APPROVED.value, AppointmentStatus.MATCHED.value})
        evaluation_count  = sum(1 for a in all_apts if a.get('status') == AppointmentStatus.EVALUATION.value)
        follow_up_count   = sum(1 for a in all_apts if a.get('status') == AppointmentStatus.FOLLOW_UP.value)
        referral_count    = sum(1 for a in all_apts if a.get('status') == AppointmentStatus.REFERRAL.value)

        return jsonify({
            'role': 'COUNSELOR',
            'user_name': user_name,
            'view_type': 'ongoing_sessions',
            'appointments': format_appointments(all_apts),
            'summary': {
                'total_appointments': len(all_apts),
                'confirmed': confirmed_count,
                'awaiting_evaluation': evaluation_count,
                'follow_up': follow_up_count,
                'referral': referral_count,
            },
            'can_manage_sessions': True,
            'can_manage_cases': True
        }), 200
    except Exception as e:
        return server_error(e)

def get_staff_dashboard(user_id_obj, user_name):
    """STAFF: Unassigned requests, confirmed appointments the OA scheduled, and reschedules."""
    try:
        # Unassigned requests waiting for OA to assign
        unassigned = list(db.db.appointments.find({
            'counselor_id': None,
            'status': {'$in': [
                AppointmentStatus.REQUESTED.value,
                AppointmentStatus.PENDING_APPROVAL.value,
            ]}
        }).sort("created_at", -1).limit(100))

        # Confirmed/matched appointments (OA already assigned these — they stay visible)
        confirmed = list(db.db.appointments.find({
            'status': {'$in': [
                AppointmentStatus.CONFIRMED.value,
                AppointmentStatus.MATCHED.value,
                "CHECKED_IN",
            ]}
        }).sort("scheduled_start", 1).limit(200))

        # Reschedule requests
        reschedule_apts = list(db.db.appointments.find({
            'status': 'RESCHEDULE_REQUESTED'
        }).sort("created_at", -1).limit(50))

        # Merge, deduplicate by _id
        seen = set()
        all_appointments = []
        for a in unassigned + confirmed + reschedule_apts:
            key = str(a['_id'])
            if key not in seen:
                seen.add(key)
                all_appointments.append(a)

        staff_apts = format_appointments(all_appointments)
        for a in staff_apts:
            a.pop('concern', None)

        return jsonify({
            'role': 'STAFF',
            'user_name': user_name,
            'view_type': 'staff_assignment',
            'appointments': staff_apts,
            'summary': {
                'total_appointments': len(all_appointments),
                'unassigned_requests': len(unassigned),
                'confirmed_appointments': len(confirmed),
                'pending_reschedules': len(reschedule_apts),
            },
            'can_assign_counselor': True,
            'can_cancel': True,
        }), 200
    except Exception as e:
        return server_error(e)


def get_case_manager_dashboard(user_id_obj, user_name):
    """CASE_MANAGER: View all active/confirmed appointments for cases they oversee."""
    try:
        apts = list(db.db.appointments.find({
            'status': {'$nin': ['CANCELLED', 'DENIED', 'CLOSED_AT_INTAKE']},
        }).sort('scheduled_start', 1).limit(200))

        confirmed = sum(1 for a in apts if a.get('status') in ('CONFIRMED', 'MATCHED', 'APPROVED', 'CHECKED_IN'))
        evaluation = sum(1 for a in apts if a.get('status') == 'EVALUATION')
        follow_up  = sum(1 for a in apts if a.get('status') == 'FOLLOW_UP')

        return jsonify({
            'role': 'CASE_MANAGER',
            'user_name': user_name,
            'view_type': 'case_manager_view',
            'appointments': format_appointments(apts),
            'summary': {
                'total_appointments': len(apts),
                'confirmed': confirmed,
                'awaiting_evaluation': evaluation,
                'follow_up': follow_up,
            },
            'can_manage_sessions': False,
            'can_reschedule': False,
        }), 200
    except Exception as e:
        return server_error(e)


def get_generic_dashboard(user_id_obj, user_name):
    """Generic view for other roles"""
    try:
        appointments = list(db.db.appointments.find({}).limit(20))
        
        return jsonify({
            'role': 'OTHER_STAFF',
            'user_name': user_name,
            'view_type': 'generic',
            'appointments': format_appointments(appointments),
            'summary': {
                'total': len(appointments)
            }
        }), 200
    except Exception as e:
        return server_error(e)

def format_appointments(appointments):
    """Convert appointments to JSON-friendly format with enriched details"""
    formatted = []
    for apt in appointments:
        try:
            # Get student info
            student = None
            if apt.get('student_id'):
                try:
                    student_id = ObjectId(apt['student_id']) if isinstance(apt['student_id'], str) else apt['student_id']
                    student = db.db.users.find_one({"_id": student_id})
                except:
                    student = None
            
            # Get counselor info
            counselor = None
            if apt.get('counselor_id'):
                try:
                    counselor_id = ObjectId(apt['counselor_id']) if isinstance(apt['counselor_id'], str) else apt['counselor_id']
                    counselor = db.db.users.find_one({"_id": counselor_id})
                except:
                    counselor = None
            
            # Get case info for risk level + no-show streak
            case = None
            risk_level = None
            consecutive_no_shows = 0
            if apt.get('case_id'):
                try:
                    case_id = ObjectId(apt['case_id']) if isinstance(apt['case_id'], str) else apt['case_id']
                    case = db.db.cases.find_one({"_id": case_id})
                    risk_level = case.get('risk_level', 'GREEN') if case else None
                    tracker = db.db.missed_appointment_tracker.find_one({"case_id": case_id})
                    if tracker:
                        consecutive_no_shows = tracker.get('consecutive_no_shows', 0)
                except:
                    risk_level = None
            
            # Format appointment date/time — prefer scheduled_start (set on confirmation)
            date_source = apt.get('scheduled_start') or apt.get('requested_start', '')
            preferred_date = ''
            preferred_time = ''

            if date_source:
                try:
                    if isinstance(date_source, str):
                        dt = datetime.fromisoformat(date_source.replace('Z', '+00:00'))
                    else:
                        dt = date_source
                    preferred_date = dt.isoformat()
                    preferred_time = dt.strftime('%H:%M')
                except:
                    preferred_date = str(date_source)
            
            # For walk-ins the appointment has no student_id (unregistered visitor);
            # fall back to name/email stored directly on the appointment or its case.
            resolved_name = (
                (f"{student.get('first_name', '')} {student.get('last_name', '')}".strip() if student else None)
                or apt.get('student_name', '')
                or (case.get('student_name', '') if case else '')
                or apt.get('student_email', '')
                or 'Unknown'
            )
            resolved_email = (
                (student.get('email', '') if student else None)
                or apt.get('student_email', '')
                or (case.get('student_email', '') if case else '')
            ) or ''

            formatted.append({
                'appointment_id': str(apt.get('_id')),
                'student_id': str(apt.get('student_id', '')),
                'student_name': resolved_name,
                'student_email': resolved_email,
                'student_phone': student.get('phone', '') if student else '',
                'student_id_number': student.get('id_number', '') if student else '',
                'counselor_id': str(apt.get('counselor_id', '')) if apt.get('counselor_id') else None,
                'counselor_name': f"{counselor.get('first_name', '')} {counselor.get('last_name', '')}".strip() if counselor else 'Not Assigned',
                'status': apt.get('status', 'UNKNOWN'),
                'purpose': apt.get('purpose') or ('intake_interview' if apt.get('appointment_type', '').upper() == 'INTAKE' else 'counseling'),
                'concern': apt.get('concern', ''),
                'preferred_date': preferred_date,
                'preferred_time': preferred_time,
                'method': (lambda pm, pp: pp if (pm or '').lower() == 'online' and pp else (pm or apt.get('appointment_method', 'in-person')))(apt.get('preferred_method'), apt.get('preferred_platform')),
                'preferred_platform': apt.get('preferred_platform', ''),
                'meeting_link': apt.get('meeting_link', ''),
                'risk_level': risk_level,
                'referral_type': apt.get('referral_type', ''),
                'notes': apt.get('notes', ''),
                'case_id': str(apt.get('case_id', '')) if apt.get('case_id') else None,
                'mhbot_username': student.get('mhbot_username', '') if student else '',
                'created_at': apt.get('created_at').isoformat() if hasattr(apt.get('created_at'), 'isoformat') else str(apt.get('created_at', '')),
                'consecutive_no_shows': consecutive_no_shows
            })
        except Exception as e:
            print(f"Error formatting appointment: {e}")
            continue
    
    return formatted


# ─────────────────────────────────────────────────────────────
# Calendar endpoint — returns appointments for a date range
# ─────────────────────────────────────────────────────────────
@appointments_dashboard_bp.route('/calendar', methods=['GET'])
@jwt_required()
def get_calendar_appointments():
    """Return appointments within a date range, formatted for week-view calendar."""
    user_id = get_jwt_identity()

    try:
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        user = db.db.users.find_one({'_id': user_id_obj})
    except Exception:
        user = db.db.users.find_one({'_id': user_id})

    if not user:
        return jsonify({'error': 'User not found'}), 404

    role = user.get('role', '').upper()

    from_str = request.args.get('from')
    to_str   = request.args.get('to')

    if not from_str or not to_str:
        return jsonify({'error': 'from and to query params required'}), 400

    try:
        from_dt = datetime.fromisoformat(from_str)
        to_dt   = datetime.fromisoformat(to_str)
    except ValueError:
        return jsonify({'error': 'Invalid date format, use ISO 8601'}), 400

    date_range = {'$gte': from_dt, '$lt': to_dt}
    query = {
        '$or': [
            {'scheduled_start': date_range},
            # Fallback: appointments confirmed without scheduled_start set (uses requested time)
            {'scheduled_start': None, 'requested_start': date_range, 'status': 'CONFIRMED'},
        ],
        'status': {'$nin': ['CANCELLED', 'DENIED', 'CLOSED_AT_INTAKE']},
    }

    # Own appointments only for clinical staff
    if role in ('COUNSELOR', 'PSYCHOLOGIST', 'IC', 'INTAKE_COUNSELOR', 'CASE_MANAGER'):
        query['counselor_id'] = user_id_obj
    # STAFF, ADMIN, DPO — no counselor_id filter (see all)

    try:
        apts = list(db.db.appointments.find(query).sort('scheduled_start', 1))
    except Exception as e:
        return server_error(e)

    # Cache lookups to avoid N+1
    user_cache: dict = {}

    def get_user(uid):
        if uid is None:
            return None
        key = str(uid)
        if key not in user_cache:
            try:
                user_cache[key] = db.db.users.find_one({'_id': uid if isinstance(uid, ObjectId) else ObjectId(uid)},
                                                        {'first_name': 1, 'last_name': 1, 'role': 1})
            except Exception:
                user_cache[key] = None
        return user_cache[key]

    def full_name(u):
        if not u:
            return 'Unknown'
        return f"{u.get('first_name', '')} {u.get('last_name', '')}".strip() or 'Unknown'

    result = []
    for apt in apts:
        try:
            student   = get_user(apt.get('student_id'))
            counselor = get_user(apt.get('counselor_id'))

            start = apt.get('scheduled_start') or apt.get('requested_start')
            end   = apt.get('scheduled_end')   or apt.get('requested_end')
            if not end and start:
                end = start + timedelta(minutes=50)

            result.append({
                'id':               str(apt['_id']),
                'student_name':     full_name(student),
                'counselor_name':   full_name(counselor) if apt.get('counselor_id') else 'Unassigned',
                'counselor_id':     str(apt['counselor_id']) if apt.get('counselor_id') else '',
                'counselor_role':   counselor.get('role', '') if counselor else '',
                'scheduled_start':  start.isoformat() if start else None,
                'scheduled_end':    end.isoformat() if end else None,
                'status':           apt.get('status', ''),
                'purpose':          apt.get('purpose') or (
                                        'intake_interview'
                                        if apt.get('appointment_type', '').upper() == 'INTAKE'
                                        else 'counseling'
                                    ),
                'method':           apt.get('preferred_method') or apt.get('method') or 'in-person',
                'meeting_link':     apt.get('meeting_link', ''),
                'office':           apt.get('office', ''),
            })
        except Exception as e:
            print(f"[calendar] error formatting apt {apt.get('_id')}: {e}")
            continue

    return jsonify({'appointments': result})


@appointments_dashboard_bp.route('/pending-notes', methods=['GET'])
@jwt_required()
def dashboard_pending_notes():
    """Return completed appointments from the last 30 days that lack a session note."""
    user_id = get_jwt_identity()
    try:
        uid = ObjectId(user_id)
        user = db.db.users.find_one({'_id': uid})
    except Exception:
        return jsonify({'error': 'Invalid user'}), 401
    if not user:
        return jsonify({'error': 'User not found'}), 404

    role = user.get('role', '').upper()
    if role not in ('COUNSELOR', 'PSYCHOLOGIST', 'IC', 'CASE_MANAGER', 'ADMIN', 'DPO'):
        return jsonify({'pending': [], 'count': 0}), 200

    cutoff = datetime.utcnow() - timedelta(days=30)

    completed = list(db.db.appointments.find(
        {'counselor_id': uid, 'status': 'COMPLETED', 'scheduled_start': {'$gte': cutoff}},
        {'_id': 1, 'student_name': 1, 'student_id': 1, 'case_id': 1, 'scheduled_start': 1},
    ).sort('scheduled_start', -1).limit(50))

    if not completed:
        return jsonify({'pending': [], 'count': 0}), 200

    apt_ids = [a['_id'] for a in completed]

    noted_ids = set(
        n['appointment_id']
        for n in db.db.session_notes.find(
            {'appointment_id': {'$in': apt_ids}, 'is_deleted': {'$ne': True}},
            {'appointment_id': 1},
        )
        if n.get('appointment_id')
    )

    pending = []
    for a in completed:
        if a['_id'] in noted_ids:
            continue
        s_start = a.get('scheduled_start')
        case_id = a.get('case_id')
        student_id = a.get('student_id')
        student_name = a.get('student_name', '')
        if not student_name and student_id:
            try:
                s = db.db.users.find_one({'_id': student_id}, {'first_name': 1, 'last_name': 1})
                if s:
                    student_name = f"{s.get('first_name','')} {s.get('last_name','')}".strip()
            except Exception:
                pass
        pending.append({
            'appointment_id':  str(a['_id']),
            'case_id':         str(case_id) if case_id else None,
            'student_name':    student_name or 'Student',
            'scheduled_start': s_start.isoformat() if hasattr(s_start, 'isoformat') else (s_start or ''),
        })
        if len(pending) >= 5:
            break

    return jsonify({'pending': pending, 'count': len(pending)}), 200
