"""
Google Calendar Integration
Auto-sync appointments to user's Google Calendar
"""

from flask import Blueprint, request, jsonify, current_app, url_for, redirect
from flask_jwt_extended import jwt_required, get_jwt_identity
from integrations.google import GoogleIntegration
from integrations.token_store import get_tokens, save_tokens
from models import db, PermissionType
from utils import user_has_permission
from bson import ObjectId
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

calendar_bp = Blueprint('calendar', __name__, url_prefix='/api/calendar')

SYSTEM_CALENDAR_USER = '__cps_system__'


@calendar_bp.route('/system-authorize', methods=['GET'])
@jwt_required()
def system_authorize_calendar():
    """Admin-only: authorize a single CPS system Google account used for all appointments."""
    user_id = get_jwt_identity()
    if not user_has_permission(db.db, user_id, PermissionType.MANAGE_USERS.value):
        return jsonify({'error': 'Admin access required'}), 403

    state = f"{SYSTEM_CALENDAR_USER}_{datetime.utcnow().timestamp()}"
    google = GoogleIntegration(current_app.config)
    auth_url = google.get_authorize_url(state=state)

    db.db.oauth_states.update_one(
        {"user_id": SYSTEM_CALENDAR_USER},
        {"$set": {"state": state, "created_at": datetime.utcnow(),
                  "expires_at": datetime.utcnow() + timedelta(hours=1)}},
        upsert=True
    )
    return jsonify({'auth_url': auth_url}), 200


@calendar_bp.route('/system-status', methods=['GET'])
@jwt_required()
def system_calendar_status():
    """Check if the CPS system Google account is connected."""
    user_id = get_jwt_identity()
    if not user_has_permission(db.db, user_id, PermissionType.MANAGE_USERS.value):
        return jsonify({'error': 'Admin access required'}), 403

    tokens = get_tokens(db.db, current_app.config, SYSTEM_CALENDAR_USER, 'google')
    return jsonify({'connected': tokens is not None and bool(tokens.get('access_token'))}), 200


@calendar_bp.route('/system-disconnect', methods=['POST'])
@jwt_required()
def system_disconnect_calendar():
    """Disconnect the CPS system Google account."""
    user_id = get_jwt_identity()
    if not user_has_permission(db.db, user_id, PermissionType.MANAGE_USERS.value):
        return jsonify({'error': 'Admin access required'}), 403

    db.db.tokens.delete_one({"user_id": SYSTEM_CALENDAR_USER, "provider": "google"})
    return jsonify({'message': 'System Google Calendar disconnected'}), 200


@calendar_bp.route('/authorize', methods=['GET'])
@jwt_required()
def authorize_calendar():
    """Get Google OAuth authorization URL for calendar permissions"""
    user_id = get_jwt_identity()
    
    try:
        user = db.db.users.find_one({"_id": ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id})
    except:
        user = db.db.users.find_one({"_id": user_id})
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Create state to track authorization
    state = f"{user_id}_{datetime.utcnow().timestamp()}"
    
    google = GoogleIntegration(current_app.config)
    auth_url = google.get_authorize_url(state=state)
    
    # Store state in database for verification
    db.db.oauth_states.update_one(
        {"user_id": ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id},
        {"$set": {
            "state": state,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(hours=1)
        }},
        upsert=True
    )
    
    return jsonify({
        'auth_url': auth_url,
        'message': 'Click the auth_url to authorize Google Calendar access'
    }), 200


@calendar_bp.route('/callback', methods=['GET'])
def calendar_callback():
    """Handle OAuth callback from Google"""
    code = request.args.get('code')
    state = request.args.get('state')
    error = request.args.get('error')
    
    if error:
        return jsonify({'error': f'Authorization failed: {error}'}), 400
    
    if not code or not state:
        return jsonify({'error': 'Missing code or state parameter'}), 400
    
    # Verify state and get user_id (supports both regular users and __cps_system__)
    # System state format: "__cps_system___{timestamp}"
    # User state format:   "{user_id}_{timestamp}"
    try:
        is_system = state.startswith(SYSTEM_CALENDAR_USER)

        if is_system:
            db_user_id = SYSTEM_CALENDAR_USER
            state_record = db.db.oauth_states.find_one({
                "user_id": SYSTEM_CALENDAR_USER,
                "state": state,
                "expires_at": {"$gt": datetime.utcnow()}
            })
        else:
            raw_user_id = state.rsplit('_', 1)[0]
            db_user_id = raw_user_id
            state_record = db.db.oauth_states.find_one({
                "user_id": ObjectId(raw_user_id),
                "state": state,
                "expires_at": {"$gt": datetime.utcnow()}
            })

        if not state_record:
            return jsonify({'error': 'Invalid or expired state'}), 400
    except Exception as e:
        return jsonify({'error': f'State verification failed: {str(e)}'}), 400

    # Exchange code for tokens
    try:
        google = GoogleIntegration(current_app.config)
        tokens = google.exchange_code_and_store(db, current_app.config, db_user_id, code)

        db.db.oauth_states.delete_one({"_id": state_record['_id']})

        frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:3000')
        if is_system:
            redirect_url = f"{frontend_url}/admin/settings?calendar_connected=true"
        else:
            redirect_url = f"{frontend_url}/dashboard?calendar_connected=true"

        return redirect(redirect_url)
    except Exception as e:
        return jsonify({'error': f'Token exchange failed: {str(e)}'}), 400


@calendar_bp.route('/status', methods=['GET'])
@jwt_required()
def calendar_status():
    """Check if user has Google Calendar connected"""
    user_id = get_jwt_identity()
    
    try:
        tokens = get_tokens(db.db, current_app.config, user_id, 'google')
        is_connected = tokens is not None and tokens.get('access_token') is not None
        
        return jsonify({
            'connected': is_connected,
            'scopes': tokens.get('scopes', []) if tokens else []
        }), 200
    except Exception as e:
        return jsonify({
            'connected': False,
            'error': str(e)
        }), 200


@calendar_bp.route('/disconnect', methods=['POST'])
@jwt_required()
def disconnect_calendar():
    """Disconnect Google Calendar"""
    user_id = get_jwt_identity()
    
    try:
        db.db.tokens.delete_one({
            "user_id": ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id,
            "provider": "google"
        })
        
        return jsonify({'message': 'Google Calendar disconnected'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@calendar_bp.route('/personal-events', methods=['GET'])
@jwt_required()
def list_personal_events():
    user_id = get_jwt_identity()
    try:
        uid = ObjectId(user_id)
    except Exception:
        uid = user_id
    from_str = request.args.get('from')
    to_str   = request.args.get('to')
    query = {'user_id': uid}
    if from_str or to_str:
        query['start'] = {}
        if from_str:
            query['start']['$gte'] = datetime.fromisoformat(from_str.replace('Z', '+00:00'))
        if to_str:
            query['start']['$lte'] = datetime.fromisoformat(to_str.replace('Z', '+00:00'))
    events = list(db.db.personal_events.find(query).sort('start', 1))
    return jsonify([{
        'id':    str(e['_id']),
        'title': e.get('title', ''),
        'start': e['start'].isoformat() if isinstance(e['start'], datetime) else e['start'],
        'end':   e['end'].isoformat()   if isinstance(e['end'],   datetime) else e['end'],
        'note':  e.get('note', ''),
        'color': e.get('color', '#64748b'),
    } for e in events]), 200


@calendar_bp.route('/personal-events', methods=['POST'])
@jwt_required()
def create_personal_event():
    user_id = get_jwt_identity()
    try:
        uid = ObjectId(user_id)
    except Exception:
        uid = user_id
    data = request.get_json() or {}
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({'error': 'title is required'}), 400
    try:
        start = datetime.fromisoformat(data['start'].replace('Z', '+00:00'))
        end   = datetime.fromisoformat(data['end'].replace('Z', '+00:00'))
    except Exception:
        return jsonify({'error': 'start and end must be ISO datetime strings'}), 400
    doc = {
        'user_id':    uid,
        'title':      title,
        'start':      start,
        'end':        end,
        'note':       data.get('note', ''),
        'color':      data.get('color', '#64748b'),
        'created_at': datetime.utcnow(),
    }
    res = db.db.personal_events.insert_one(doc)
    return jsonify({'id': str(res.inserted_id)}), 201


@calendar_bp.route('/personal-events/<event_id>', methods=['DELETE'])
@jwt_required()
def delete_personal_event(event_id):
    user_id = get_jwt_identity()
    try:
        uid = ObjectId(user_id)
    except Exception:
        uid = user_id
    try:
        eid = ObjectId(event_id)
    except Exception:
        return jsonify({'error': 'Invalid event id'}), 400
    result = db.db.personal_events.delete_one({'_id': eid, 'user_id': uid})
    if result.deleted_count == 0:
        return jsonify({'error': 'Not found'}), 404
    return jsonify({'message': 'Deleted'}), 200


def sync_appointment_to_calendar(user_id, appointment_data, counselor_email=None):
    """
    Sync appointment to Google Calendar and create a Meet link for online sessions.
    Returns: (calendar_event_id, meet_link) or (None, None) if calendar not connected.
    """
    try:
        google = GoogleIntegration(current_app.config)

        # Try the counselor's own token first, fall back to the CPS system account
        access_token = google.get_valid_token(db.db, current_app.config, user_id)
        if not access_token:
            access_token = google.get_valid_token(db.db, current_app.config, SYSTEM_CALENDAR_USER)
        if not access_token:
            return None, None
        
        # Get user and case details
        try:
            student = db.db.users.find_one({"_id": ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id})
        except:
            student = db.db.users.find_one({"_id": user_id})
        
        case_id = appointment_data.get('case_id')
        if case_id:
            try:
                case = db.db.cases.find_one({"_id": ObjectId(case_id) if not isinstance(case_id, ObjectId) else case_id})
            except:
                case = db.db.cases.find_one({"_id": case_id})
        else:
            case = None
        
        # Get counselor info
        counselor = None
        if appointment_data.get('counselor_id'):
            try:
                counselor = db.db.users.find_one({"_id": ObjectId(appointment_data['counselor_id'])})
            except:
                counselor = db.db.users.find_one({"_id": appointment_data['counselor_id']})
        
        # Build calendar event — prefer confirmed scheduled times, fall back to requested
        start_time = appointment_data.get('scheduled_start') or appointment_data.get('requested_start')
        end_time   = appointment_data.get('scheduled_end')   or appointment_data.get('requested_end')

        if isinstance(start_time, str):
            start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        if isinstance(end_time, str):
            end_time = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
        if start_time and not end_time:
            end_time = start_time + timedelta(minutes=60)
        
        s_name = f"{student.get('first_name', 'Student')} {student.get('last_name', '')}".strip() if student else 'Student'
        c_name = f"{counselor.get('first_name', '')} {counselor.get('last_name', '')}".strip() if counselor else 'Counselor'
        purpose_label = {
            'intake_interview': 'Intake Interview',
            'counseling': 'Counseling Session',
            'follow_up_counselling': 'Follow-up Session',
        }.get(appointment_data.get('purpose', ''), 'Counseling Session')

        def _to_pht_iso(dt):
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone(timedelta(hours=8)))
            return dt.isoformat()

        event = {
            'summary': f"CPS {purpose_label} — {s_name}",
            'description': (
                f"DLSU Counseling & Psychological Services\n\n"
                f"Student: {s_name}\n"
                f"Counselor: {c_name}\n"
                f"Type: {purpose_label}"
            ),
            'start': {
                'dateTime': _to_pht_iso(start_time),
                'timeZone': 'Asia/Manila'
            },
            'end': {
                'dateTime': _to_pht_iso(end_time),
                'timeZone': 'Asia/Manila'
            },
            'attendees': [
                {'email': student.get('email', ''), 'optional': False}
            ],
            'reminders': {
                'useDefault': False,
                'overrides': [
                    {'method': 'email', 'minutes': 1440},  # 1 day before
                    {'method': 'popup', 'minutes': 15}     # 15 minutes before
                ]
            }
        }
        
        # Add counselor if available
        if counselor and counselor.get('email'):
            event['attendees'].append({
                'email': counselor['email'],
                'optional': False
            })

        # Create Meet link for online appointments
        is_online = appointment_data.get('preferred_method', '') in ('google_meet', 'google-meet', 'online', 'video')
        result = google.create_calendar_event(access_token, event, create_meet_link=is_online)

        meet_link = None
        if is_online:
            meet_link = result.get('hangoutLink')
            if not meet_link:
                try:
                    meet_link = result['conferenceData']['entryPoints'][0]['uri']
                except (KeyError, IndexError):
                    pass

        # Store event ID and meet link in appointment
        if result.get('id'):
            update = {"calendar_event_id": result['id']}
            if meet_link:
                update["meeting_link"] = meet_link
                update["is_telehealth"] = True
            db.db.appointments.update_one(
                {"_id": appointment_data.get('_id') or ObjectId(appointment_data.get('id', ''))},
                {"$set": update}
            )

        return result.get('id'), meet_link

    except Exception as e:
        print(f"Calendar sync error: {str(e)}")
        return None, None


def update_appointment_in_calendar(user_id, appointment_data):
    """Update existing calendar event"""
    try:
        tokens = get_tokens(db.db, current_app.config, user_id, 'google')
        
        if not tokens or not appointment_data.get('calendar_event_id'):
            return None
        
        access_token = tokens['access_token']
        google = GoogleIntegration(current_app.config)
        
        # Get updated details
        student_id = appointment_data.get('student_id')
        if student_id:
            try:
                student = db.db.users.find_one({"_id": ObjectId(student_id)})
            except:
                student = db.db.users.find_one({"_id": student_id})
        else:
            student = {}
        
        start_time = appointment_data.get('requested_start')
        end_time = appointment_data.get('requested_end')
        
        if isinstance(start_time, str):
            start_time = datetime.fromisoformat(start_time)
        if isinstance(end_time, str):
            end_time = datetime.fromisoformat(end_time)
        
        event = {
            'summary': f"Therapy Session - {student.get('first_name', 'Student')} {student.get('last_name', '')}",
            'start': {
                'dateTime': start_time.isoformat(),
                'timeZone': 'Asia/Manila'
            },
            'end': {
                'dateTime': end_time.isoformat(),
                'timeZone': 'Asia/Manila'
            }
        }
        
        result = google.update_calendar_event(
            access_token,
            appointment_data['calendar_event_id'],
            event
        )
        
        return result.get('id')
    
    except Exception as e:
        print(f"Calendar update error: {str(e)}")
        return None


def delete_appointment_from_calendar(user_id, calendar_event_id):
    """Delete calendar event"""
    try:
        tokens = get_tokens(db.db, current_app.config, user_id, 'google')
        
        if not tokens or not calendar_event_id:
            return False
        
        access_token = tokens['access_token']
        google = GoogleIntegration(current_app.config)
        
        google.delete_calendar_event(access_token, calendar_event_id)
        
        return True
    except Exception as e:
        print(f"Calendar delete error: {str(e)}")
        return False
