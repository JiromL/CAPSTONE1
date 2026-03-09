"""
Google Calendar Integration
Auto-sync appointments to user's Google Calendar
"""

from flask import Blueprint, request, jsonify, current_app, url_for, redirect
from flask_jwt_extended import jwt_required, get_jwt_identity
from integrations.google import GoogleIntegration
from integrations.token_store import get_tokens, save_tokens
from models import db
from bson import ObjectId
from datetime import datetime, timedelta
from urllib.parse import urlencode

calendar_bp = Blueprint('calendar', __name__, url_prefix='/api/calendar')


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
    
    # Verify state and get user_id
    try:
        user_id = state.split('_')[0]
        state_record = db.db.oauth_states.find_one({
            "user_id": ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id,
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
        tokens = google.exchange_code_and_store(db, current_app.config, user_id, code)
        
        # Clean up state
        db.db.oauth_states.delete_one({"_id": state_record['_id']})
        
        # Redirect to frontend success page
        frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:3000')
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
        tokens = get_tokens(db, current_app.config, user_id, 'google')
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


def sync_appointment_to_calendar(user_id, appointment_data, counselor_email=None):
    """
    Helper function to sync appointment to Google Calendar
    Returns: calendar_event_id or None if calendar not connected
    """
    try:
        tokens = get_tokens(db, current_app.config, user_id, 'google')
        
        if not tokens or not tokens.get('access_token'):
            return None  # Calendar not connected
        
        access_token = tokens['access_token']
        google = GoogleIntegration(current_app.config)
        
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
        
        # Build calendar event
        start_time = appointment_data.get('requested_start')
        end_time = appointment_data.get('requested_end')
        
        if isinstance(start_time, str):
            start_time = datetime.fromisoformat(start_time)
        if isinstance(end_time, str):
            end_time = datetime.fromisoformat(end_time)
        
        event = {
            'summary': f"Therapy Session - {student.get('first_name', 'Student')} {student.get('last_name', '')}",
            'description': f"CPS Counseling Appointment\nCase: {str(case_id) if case_id else 'N/A'}\nType: {appointment_data.get('appointment_type', 'General')}",
            'start': {
                'dateTime': start_time.isoformat(),
                'timeZone': 'Asia/Manila'  # DLSU timezone
            },
            'end': {
                'dateTime': end_time.isoformat(),
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
        
        # Create event
        result = google.create_calendar_event(access_token, event)
        
        # Store event ID in appointment
        if result.get('id'):
            db.db.appointments.update_one(
                {"_id": appointment_data.get('_id') or ObjectId(appointment_data.get('id', ''))},
                {"$set": {"calendar_event_id": result['id']}}
            )
        
        return result.get('id')
    
    except Exception as e:
        print(f"Calendar sync error: {str(e)}")
        return None


def update_appointment_in_calendar(user_id, appointment_data):
    """Update existing calendar event"""
    try:
        tokens = get_tokens(db, current_app.config, user_id, 'google')
        
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
        tokens = get_tokens(db, current_app.config, user_id, 'google')
        
        if not tokens or not calendar_event_id:
            return False
        
        access_token = tokens['access_token']
        google = GoogleIntegration(current_app.config)
        
        google.delete_calendar_event(access_token, calendar_event_id)
        
        return True
    except Exception as e:
        print(f"Calendar delete error: {str(e)}")
        return False
