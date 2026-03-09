"""
EPIC 4: BOOKING & SCHEDULING SYSTEM
Blueprint for appointment booking with real-time availability and automated confirmations
"""

from flask import Blueprint, request, jsonify, redirect
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from models import db, AppointmentStatus, PermissionType
from utils import audit_log, user_has_permission
from datetime import datetime, timedelta

appointments_bp = Blueprint('appointments', __name__, url_prefix='/api/appointments')


@appointments_bp.route('/request', methods=['POST'])
@jwt_required()
def request_appointment():
    """Student request appointment (EPIC 4: Student Appointment Request System)"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data.get('case_id') or not data.get('requested_start') or not data.get('requested_end'):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        case_id = ObjectId(data['case_id']) if isinstance(data['case_id'], str) else data['case_id']
        case = db.db.cases.find_one({"_id": case_id})
    except:
        case = db.db.cases.find_one({"_id": data['case_id']})
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    try:
        requested_start = datetime.fromisoformat(data['requested_start'])
        requested_end = datetime.fromisoformat(data['requested_end'])
    except ValueError:
        return jsonify({'error': 'Invalid datetime format'}), 400
    
    appointment = {
        "case_id": case_id,
        "appointment_type": data.get('appointment_type', 'followup'),
        "requested_start": requested_start,
        "requested_end": requested_end,
        "status": AppointmentStatus.REQUESTED.value,
        "created_at": datetime.utcnow()
    }
    
    result = db.db.appointments.insert_one(appointment)
    
    audit_log(db.db, 'appointment', 'request', entity_id=str(result.inserted_id), new_values={
        'case_id': str(case_id),
        'requested_start': data['requested_start']
    })
    
    return jsonify({
        'appointment_id': str(result.inserted_id),
        'status': AppointmentStatus.REQUESTED.value,
        'requested_start': requested_start.isoformat(),
        'requested_end': requested_end.isoformat()
    }), 201


@appointments_bp.route('/<appointment_id>/match-counselor', methods=['POST'])
@jwt_required()
def match_counselor(appointment_id):
    """Match and assign counselor using algorithm (EPIC 4: Counselor Matching Algorithm)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.ASSIGN_CASES.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        apt_id = ObjectId(appointment_id)
        appointment = db.db.appointments.find_one({"_id": apt_id})
    except:
        appointment = db.db.appointments.find_one({"_id": appointment_id})
    
    if not appointment:
        return jsonify({'error': 'Appointment not found'}), 404
    
    data = request.get_json()
    
    if data.get('counselor_id'):
        # Manual assignment
        try:
            counselor_id = ObjectId(data['counselor_id'])
            counselor = db.db.users.find_one({"_id": counselor_id})
        except:
            counselor = db.db.users.find_one({"_id": data['counselor_id']})
        
        if not counselor:
            return jsonify({'error': 'Counselor not found'}), 404
    else:
        # Auto-match algorithm - find available counselor
        available = db.db.counselor_availability.find_one({
            "slot_start": {"$lte": appointment['requested_start']},
            "slot_end": {"$gte": appointment['requested_end']},
            "is_available": True
        })
        
        if not available:
            return jsonify({'error': 'No available counselors for requested time'}), 409
        
        counselor = db.db.users.find_one({"_id": available['counselor_id']})
    
    db.db.appointments.update_one(
        {"_id": appointment['_id']},
        {"$set": {
            "counselor_id": counselor['_id'],
            "status": AppointmentStatus.CONFIRMED.value,
            "confirmation_sent": True,
            "updated_at": datetime.utcnow()
        }}
    )
    
    audit_log(db.db, 'appointment', 'assign_counselor', entity_id=str(appointment['_id']), new_values={
        'counselor_id': str(counselor['_id']),
        'status': AppointmentStatus.CONFIRMED.value
    })
    
    return jsonify({
        'message': 'Counselor matched',
        'appointment_id': str(appointment['_id']),
        'counselor_id': str(counselor['_id']),
        'counselor_name': f"{counselor.get('first_name', '')} {counselor.get('last_name', '')}",
        'status': AppointmentStatus.CONFIRMED.value
    }), 200


@appointments_bp.route('/availability', methods=['GET'])
@jwt_required()
def get_availability():
    """Get real-time slot availability (EPIC 4: Real-Time Slot Availability Engine)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    counselor_id = request.args.get('counselor_id')
    
    if not start_date or not end_date:
        return jsonify({'error': 'start_date and end_date are required'}), 400
    
    try:
        start = datetime.fromisoformat(start_date)
        end = datetime.fromisoformat(end_date)
    except ValueError:
        return jsonify({'error': 'Invalid datetime format'}), 400
    
    # Query availability slots
    query = {
        "slot_start": {"$gte": start},
        "slot_end": {"$lte": end},
        "is_available": True
    }
    
    if counselor_id:
        try:
            query["counselor_id"] = ObjectId(counselor_id)
        except:
            query["counselor_id"] = counselor_id
    
    slots = list(db.db.counselor_availability.find(query))
    
    result_slots = []
    for s in slots:
        counselor = db.db.users.find_one({"_id": s.get('counselor_id')})
        result_slots.append({
            'slot_id': str(s['_id']),
            'counselor_id': str(s.get('counselor_id')),
            'counselor_name': f"{counselor.get('first_name', '')} {counselor.get('last_name', '')}" if counselor else None,
            'slot_start': s['slot_start'].isoformat() if isinstance(s['slot_start'], datetime) else s['slot_start'],
            'slot_end': s['slot_end'].isoformat() if isinstance(s['slot_end'], datetime) else s['slot_end']
        })
    
    return jsonify({
        'available_slots': result_slots,
        'total_slots': len(slots)
    }), 200


@appointments_bp.route('/validate-slot', methods=['POST'])
@jwt_required()
def validate_slot():
    """Validate if a requested slot conflicts with existing confirmed appointments"""
    user_id = get_jwt_identity()

    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403

    data = request.get_json() or {}
    counselor_id = data.get('counselor_id')
    start = data.get('start')
    end = data.get('end')

    if not counselor_id or not start or not end:
        return jsonify({'error': 'counselor_id, start, and end are required'}), 400

    try:
        start_dt = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end)
    except ValueError:
        return jsonify({'error': 'Invalid datetime format'}), 400

    try:
        cid = ObjectId(counselor_id)
    except:
        cid = counselor_id

    # Find overlapping confirmed appointments for counselor
    overlap_q = {
        'counselor_id': cid,
        'status': {'$in': [AppointmentStatus.CONFIRMED.value, AppointmentStatus.MATCHED.value]}
    }

    appointments = list(db.db.appointments.find(overlap_q))
    conflict = False
    for a in appointments:
        a_start = a.get('requested_start')
        a_end = a.get('requested_end')
        if isinstance(a_start, datetime) and isinstance(a_end, datetime):
            # overlap if start < a_end and end > a_start
            if start_dt < a_end and end_dt > a_start:
                conflict = True
                break

    return jsonify({'available': not conflict}), 200


@appointments_bp.route('/<appointment_id>/confirm', methods=['POST'])
@jwt_required()
def confirm_appointment(appointment_id):
    """Confirm appointment (EPIC 4: Automated Appointment Confirmation)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        apt_id = ObjectId(appointment_id)
        appointment = db.db.appointments.find_one({"_id": apt_id})
    except:
        appointment = db.db.appointments.find_one({"_id": appointment_id})
    
    if not appointment:
        return jsonify({'error': 'Appointment not found'}), 404
    
    if not appointment.get('counselor_id'):
        return jsonify({'error': 'Counselor must be assigned before confirmation'}), 400
    
    db.db.appointments.update_one(
        {"_id": appointment['_id']},
        {"$set": {
            "status": AppointmentStatus.CONFIRMED.value,
            "confirmation_sent": True,
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Auto-sync to Google Calendar if counselor has calendar connected
    counselor_id = appointment.get('counselor_id')
    if counselor_id:
        try:
            from blueprints.google_calendar import sync_appointment_to_calendar
            calendar_event_id = sync_appointment_to_calendar(str(counselor_id), appointment)
            if calendar_event_id:
                db.db.appointments.update_one(
                    {"_id": appointment['_id']},
                    {"$set": {"calendar_event_id": calendar_event_id}}
                )
        except Exception as e:
            # Calendar sync is optional, don't fail appointment confirmation
            print(f"Calendar sync error: {str(e)}")
    
    audit_log(db.db, 'appointment', 'confirm', entity_id=str(appointment['_id']), new_values={
        'status': AppointmentStatus.CONFIRMED.value
    })
    
    return jsonify({
        'message': 'Appointment confirmed',
        'appointment_id': str(appointment['_id']),
        'status': AppointmentStatus.CONFIRMED.value
    }), 200


@appointments_bp.route('/<appointment_id>/remind', methods=['POST'])
@jwt_required()
def send_reminder(appointment_id):
    """Send appointment reminder (EPIC 4: SMS/Email Reminder System)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        apt_id = ObjectId(appointment_id)
        appointment = db.db.appointments.find_one({"_id": apt_id})
    except:
        appointment = db.db.appointments.find_one({"_id": appointment_id})
    
    if not appointment:
        return jsonify({'error': 'Appointment not found'}), 404
    
    if appointment.get('status') not in [AppointmentStatus.CONFIRMED.value]:
        return jsonify({'error': 'Can only send reminders for confirmed appointments'}), 400
    
    # In production, integrate with SMS/Email service here
    db.db.appointments.update_one(
        {"_id": appointment['_id']},
        {"$set": {"reminder_sent": True, "updated_at": datetime.utcnow()}}
    )
    
    audit_log(db.db, 'appointment', 'reminder_sent', entity_id=str(appointment['_id']))
    
    return jsonify({
        'message': 'Reminder sent',
        'appointment_id': str(appointment['_id'])
    }), 200


@appointments_bp.route('/<appointment_id>/mark-no-show', methods=['POST'])
@jwt_required()
def mark_no_show(appointment_id):
    """Mark appointment as no-show (EPIC 4: Missed Appointment Tracker)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        apt_id = ObjectId(appointment_id)
        appointment = db.db.appointments.find_one({"_id": apt_id})
    except:
        appointment = db.db.appointments.find_one({"_id": appointment_id})
    
    if not appointment:
        return jsonify({'error': 'Appointment not found'}), 404
    
    db.db.appointments.update_one(
        {"_id": appointment['_id']},
        {"$set": {
            "status": AppointmentStatus.NO_SHOW.value,
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Track missed appointment
    tracker = db.db.missed_appointment_tracker.find_one({"case_id": appointment.get('case_id')})
    
    if tracker:
        db.db.missed_appointment_tracker.update_one(
            {"_id": tracker['_id']},
            {"$inc": {"no_show_count": 1}}
        )
        no_show_count = tracker['no_show_count'] + 1
    else:
        doc = {
            "case_id": appointment.get('case_id'),
            "appointment_id": appointment['_id'],
            "no_show_count": 1,
            "created_at": datetime.utcnow()
        }
        db.db.missed_appointment_tracker.insert_one(doc)
        no_show_count = 1
    
    audit_log(db.db, 'appointment', 'mark_no_show', entity_id=str(appointment['_id']), new_values={
        'status': AppointmentStatus.NO_SHOW.value,
        'no_show_count': no_show_count
    })
    
    return jsonify({
        'message': 'Appointment marked as no-show',
        'appointment_id': str(appointment['_id']),
        'no_show_count': no_show_count
    }), 200


@appointments_bp.route('/<appointment_id>/complete', methods=['POST'])
@jwt_required()
def complete_appointment(appointment_id):
    """Mark appointment as completed"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        apt_id = ObjectId(appointment_id)
        appointment = db.db.appointments.find_one({"_id": apt_id})
    except:
        appointment = db.db.appointments.find_one({"_id": appointment_id})
    
    if not appointment:
        return jsonify({'error': 'Appointment not found'}), 404
    
    db.db.appointments.update_one(
        {"_id": appointment['_id']},
        {"$set": {
            "status": AppointmentStatus.COMPLETED.value,
            "actual_start": datetime.utcnow(),
            "actual_end": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }}
    )
    
    return jsonify({
        'message': 'Appointment completed',
        'appointment_id': str(appointment['_id']),
        'status': AppointmentStatus.COMPLETED.value
    }), 200


@appointments_bp.route('/<case_id>/upcoming', methods=['GET'])
@jwt_required()
def get_upcoming_appointments(case_id):
    """Get upcoming appointments for a case"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        cid = ObjectId(case_id)
        case = db.db.cases.find_one({"_id": cid})
    except:
        case = db.db.cases.find_one({"_id": case_id})
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    now = datetime.utcnow()
    appointments = list(db.db.appointments.find({
        "case_id": case['_id'],
        "requested_start": {"$gte": now},
        "status": {"$ne": AppointmentStatus.CANCELLED.value}
    }).sort("requested_start", 1))
    
    result_appointments = []
    for a in appointments:
        counselor = db.db.users.find_one({"_id": a.get('counselor_id')}) if a.get('counselor_id') else None
        result_appointments.append({
            'appointment_id': str(a['_id']),
            'appointment_type': a.get('appointment_type'),
            'counselor': f"{counselor.get('first_name', '')} {counselor.get('last_name', '')}" if counselor else "Not assigned",
            'requested_start': a['requested_start'].isoformat() if isinstance(a['requested_start'], datetime) else a['requested_start'],
            'requested_end': a['requested_end'].isoformat() if isinstance(a['requested_end'], datetime) else a['requested_end'],
            'status': a.get('status')
        })
    
    return jsonify({
        'case_id': str(case['_id']),
        'upcoming_appointments': result_appointments
    }), 200


# ============= GOOGLE CALENDAR INTEGRATION =============

@appointments_bp.route('/google/authorize', methods=['GET'])
@jwt_required()
def get_google_authorization_url():
    """Get Google OAuth authorization URL for staff"""
    from config import Config
    from integrations.google import GoogleIntegration
    import secrets
    
    user_id = get_jwt_identity()
    state = secrets.token_urlsafe(32)
    
    # Store state in database for verification
    db.db.oauth_states.insert_one({
        'user_id': ObjectId(user_id),
        'state': state,
        'created_at': datetime.utcnow(),
        'expires_at': datetime.utcnow() + timedelta(minutes=10)
    })
    
    google = GoogleIntegration(Config)
    auth_url = google.get_authorize_url(state=state)
    
    return jsonify({
        'auth_url': auth_url,
        'message': 'Visit this URL to authorize Google Calendar access'
    }), 200


@appointments_bp.route('/google/callback', methods=['GET'])
def google_oauth_callback():
    """Handle Google OAuth callback"""
    from config import Config
    from integrations.google import GoogleIntegration
    
    code = request.args.get('code')
    state = request.args.get('state')
    
    if not code or not state:
        return redirect(f'/dashboard/staff-settings?error=Missing+code+or+state')
    
    # Verify state
    oauth_state = db.db.oauth_states.find_one({'state': state})
    if not oauth_state:
        return redirect(f'/dashboard/staff-settings?error=Invalid+state+parameter')
    
    if oauth_state['expires_at'] < datetime.utcnow():
        return redirect(f'/dashboard/staff-settings?error=State+expired')
    
    user_id = oauth_state['user_id']
    
    # Exchange code for tokens
    google = GoogleIntegration(Config)
    try:
        google.exchange_code_and_store(db.db, Config, user_id, code)
        
        # Delete used state
        db.db.oauth_states.delete_one({'state': state})
        
        # Redirect to success page
        return redirect(f'/dashboard/staff-settings?success=Google+Calendar+connected')
    except Exception as e:
        return redirect(f'/dashboard/staff-settings?error={str(e)}')


@appointments_bp.route('/<appointment_id>/sync-to-calendar', methods=['POST'])
@jwt_required()
def sync_appointment_to_calendar(appointment_id):
    """Sync appointment to counselor's Google Calendar"""
    from config import Config
    from integrations.google import GoogleIntegration
    from integrations.token_store import get_tokens
    
    user_id = get_jwt_identity()
    user = db.db.users.find_one({'_id': ObjectId(user_id)})
    
    if not user:
        return jsonify({'error': 'User not found'}), 401
    
    try:
        appointment = db.db.appointments.find_one({'_id': ObjectId(appointment_id)})
    except:
        return jsonify({'error': 'Invalid appointment ID'}), 400
    
    if not appointment:
        return jsonify({'error': 'Appointment not found'}), 404
    
    # Check if counselor has Google Calendar connected
    google_tokens = get_tokens(db.db, user_id, 'google')
    if not google_tokens or not google_tokens.get('access_token'):
        return jsonify({
            'error': 'Google Calendar not connected',
            'auth_url': f'/api/appointments/google/authorize'
        }), 400
    
    # Get case and counselor info
    case = db.db.cases.find_one({'_id': appointment['case_id']})
    student = db.db.users.find_one({'_id': case['student_id']})
    
    # Build calendar event
    event = {
        'summary': f'Therapy Session - {student.get("first_name", "Student")} {student.get("last_name", "")}',
        'description': f'Case: {str(case["_id"])}\nPresenting Issue: {case.get("presenting_issue")}',
        'start': {
            'dateTime': appointment['requested_start'].isoformat(),
            'timeZone': 'America/New_York'
        },
        'end': {
            'dateTime': appointment['requested_end'].isoformat(),
            'timeZone': 'America/New_York'
        },
        'attendees': [
            {'email': user['email'], 'responseStatus': 'accepted'},
            {'email': student.get('email', '')},  # Student gets invite too
        ],
        'reminders': {
            'useDefault': False,
            'overrides': [
                {'method': 'email', 'minutes': 24*60},  # 1 day before
                {'method': 'notification', 'minutes': 15}  # 15 min before
            ]
        }
    }
    
    # Create event on Google Calendar
    google = GoogleIntegration(Config)
    try:
        response = google.create_calendar_event(google_tokens['access_token'], event)
        
        # Store event ID in database for later updates/deletions
        db.db.appointments.update_one(
            {'_id': ObjectId(appointment_id)},
            {'$set': {
                'google_calendar_event_id': response['id'],
                'calendar_synced': True,
                'calendar_last_sync': datetime.utcnow()
            }}
        )
        
        audit_log(db, 'appointment', 'calendar_sync', entity_id=appointment_id,
                  new_values={'google_event_id': response['id']})
        
        return jsonify({
            'success': True,
            'event_id': response['id'],
            'event_url': response.get('htmlLink'),
            'message': 'Appointment synced to Google Calendar'
        }), 201
    except Exception as e:
        return jsonify({'error': f'Failed to sync to calendar: {str(e)}'}), 400


@appointments_bp.route('/<appointment_id>/remove-from-calendar', methods=['DELETE'])
@jwt_required()
def remove_appointment_from_calendar(appointment_id):
    """Remove appointment from Google Calendar"""
    from config import Config
    from integrations.google import GoogleIntegration
    from integrations.token_store import get_tokens
    
    user_id = get_jwt_identity()
    
    try:
        appointment = db.db.appointments.find_one({'_id': ObjectId(appointment_id)})
    except:
        return jsonify({'error': 'Invalid appointment ID'}), 400
    
    if not appointment:
        return jsonify({'error': 'Appointment not found'}), 404
    
    if not appointment.get('google_calendar_event_id'):
        return jsonify({'error': 'Appointment not synced to calendar'}), 400
    
    google_tokens = get_tokens(db.db, user_id, 'google')
    if not google_tokens:
        return jsonify({'error': 'Google Calendar not connected'}), 400
    
    google = GoogleIntegration(Config)
    try:
        google.delete_calendar_event(google_tokens['access_token'], 
                                     appointment['google_calendar_event_id'])
        
        # Update database
        db.db.appointments.update_one(
            {'_id': ObjectId(appointment_id)},
            {'$set': {
                'calendar_synced': False,
                'google_calendar_event_id': None
            }}
        )
        
        return jsonify({
            'success': True,
            'message': 'Appointment removed from Google Calendar'
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to remove from calendar: {str(e)}'}), 400


@appointments_bp.route('/google/available-slots', methods=['GET'])
@jwt_required()
def get_available_slots():
    """Get available time slots from counselor's Google Calendar"""
    from config import Config
    from integrations.google import GoogleIntegration
    from integrations.token_store import get_tokens
    
    user_id = get_jwt_identity()
    date = request.args.get('date')  # Format: YYYY-MM-DD
    duration = request.args.get('duration', 60, type=int)  # minutes
    
    if not date:
        return jsonify({'error': 'Missing date parameter'}), 400
    
    google_tokens = get_tokens(db.db, user_id, 'google')
    if not google_tokens:
        return jsonify({
            'error': 'Google Calendar not connected',
            'auth_url': '/api/appointments/google/authorize'
        }), 400
    
    google = GoogleIntegration(Config)
    try:
        free_slots = google.get_free_slots(google_tokens['access_token'], date, duration)
        return jsonify({
            'date': date,
            'duration_minutes': duration,
            'available_slots': free_slots,
            'count': len(free_slots)
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to fetch slots: {str(e)}'}), 400


@appointments_bp.route('/google/disconnect', methods=['POST'])
@jwt_required()
def disconnect_google_calendar():
    """Disconnect user's Google Calendar access"""
    user_id = get_jwt_identity()
    
    # Remove the Google tokens
    db.db.token_store.delete_many({
        'user_id': ObjectId(user_id),
        'service': 'google'
    })
    
    return jsonify({
        'success': True,
        'message': 'Google Calendar disconnected successfully'
    }), 200
