"""
Staff Settings Management
Settings for counselors, psychologists, and intake coordinators
University-focused without pricing (no hourly rates)
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from models import db
from datetime import datetime

staff_settings_bp = Blueprint('staff_settings', __name__, url_prefix='/api/staff/settings')

STAFF_ROLES = ['COUNSELOR', 'PSYCHOLOGIST', 'IC', 'CSC', 'CSP']


@staff_settings_bp.route('/my-settings', methods=['GET'])
@jwt_required()
def get_my_settings():
    """Get current staff member's settings"""
    user_id = get_jwt_identity()
    
    try:
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        user = db.db.users.find_one({"_id": user_id_obj})
    except:
        user = db.db.users.find_one({"_id": user_id})
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if user.get('role') not in STAFF_ROLES:
        return jsonify({'error': 'Only staff can access settings'}), 403
    
    # Get or create settings document
    settings = db.db.staff_settings.find_one({'user_id': user_id_obj})
    
    if not settings:
        # Return defaults
        return jsonify({
            'user_id': str(user_id_obj),
            'name': f"{user.get('first_name', '')} {user.get('last_name', '')}",
            'role': user.get('role'),
            'work_preferences': {
                'default_session_duration': 50,  # Default 50 min sessions
                'meeting_methods': ['in-person'],  # Can be: in-person, google-meet, zoom
                'accepts_walk_ins': False
            },
            'notification_preferences': {
                'email_on_new_request': True,
                'email_on_appointment_change': True,
                'email_on_cancellation': True,
                'sms_reminders': False
            },
            'specialty_areas': [],
            'languages': ['English'],
            'max_students_per_day': 0,  # 0 = unlimited
            'bio': '',
            'tags': [],
            'created_at': None,
            'updated_at': None
        }), 200
    
    return jsonify({
        'user_id': str(settings['user_id']),
        'name': f"{user.get('first_name', '')} {user.get('last_name', '')}",
        'role': user.get('role'),
        'work_preferences': settings.get('work_preferences', {}),
        'notification_preferences': settings.get('notification_preferences', {}),
        'specialty_areas': settings.get('specialty_areas', []),
        'languages': settings.get('languages', ['English']),
        'max_students_per_day': settings.get('max_students_per_day', 0),
        'bio': settings.get('bio', ''),
        'tags': settings.get('tags', []),
        'created_at': settings.get('created_at').isoformat() if settings.get('created_at') else None,
        'updated_at': settings.get('updated_at').isoformat() if settings.get('updated_at') else None
    }), 200


@staff_settings_bp.route('/my-settings', methods=['POST', 'PUT'])
@jwt_required()
def update_my_settings():
    """Update current staff member's settings"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    try:
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        user = db.db.users.find_one({"_id": user_id_obj})
    except:
        user = db.db.users.find_one({"_id": user_id})
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if user.get('role') not in STAFF_ROLES:
        return jsonify({'error': 'Only staff can update settings'}), 403
    
    # Prepare update document
    update_data = {
        'user_id': user_id_obj,
        'updated_at': datetime.utcnow()
    }
    
    # Update work preferences if provided
    if 'work_preferences' in data:
        prefs = data['work_preferences']
        meeting_methods = prefs.get('meeting_methods', ['in-person'])
        # Ensure it's a list and contains valid methods
        if isinstance(meeting_methods, str):
            meeting_methods = [meeting_methods]
        valid_methods = {'in-person', 'google-meet', 'zoom'}
        meeting_methods = [m for m in meeting_methods if m in valid_methods]
        if not meeting_methods:
            meeting_methods = ['in-person']
        
        update_data['work_preferences'] = {
            'default_session_duration': prefs.get('default_session_duration', 50),
            'meeting_methods': meeting_methods,  # Now supports multiple methods
            'accepts_walk_ins': prefs.get('accepts_walk_ins', False)
        }
    
    # Update notification preferences if provided
    if 'notification_preferences' in data:
        notif = data['notification_preferences']
        update_data['notification_preferences'] = {
            'email_on_new_request': notif.get('email_on_new_request', True),
            'email_on_appointment_change': notif.get('email_on_appointment_change', True),
            'email_on_cancellation': notif.get('email_on_cancellation', True),
            'sms_reminders': notif.get('sms_reminders', False)
        }
    
    # Update other fields
    if 'specialty_areas' in data:
        update_data['specialty_areas'] = data.get('specialty_areas', [])
    
    if 'languages' in data:
        update_data['languages'] = data.get('languages', ['English'])
    
    if 'max_students_per_day' in data:
        update_data['max_students_per_day'] = int(data.get('max_students_per_day', 0))
    
    if 'bio' in data:
        update_data['bio'] = data.get('bio', '')[:500]  # Max 500 chars
    
    if 'tags' in data:
        update_data['tags'] = data.get('tags', [])
    
    # Upsert settings document
    result = db.db.staff_settings.update_one(
        {'user_id': user_id_obj},
        {
            '$set': update_data,
            '$setOnInsert': {'created_at': datetime.utcnow()}
        },
        upsert=True
    )
    
    return jsonify({
        'message': 'Settings updated successfully',
        'user_id': str(user_id_obj),
        'updated': {
            'work_preferences': update_data.get('work_preferences'),
            'notification_preferences': update_data.get('notification_preferences'),
            'specialty_areas': update_data.get('specialty_areas'),
            'languages': update_data.get('languages'),
            'max_students_per_day': update_data.get('max_students_per_day'),
            'bio': update_data.get('bio'),
            'tags': update_data.get('tags')
        }
    }), 200


@staff_settings_bp.route('/<user_id>/work-preferences', methods=['GET'])
@jwt_required()
def get_work_preferences(user_id):
    """Get specific staff member's work preferences (public view for scheduling)"""
    try:
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        user = db.db.users.find_one({"_id": user_id_obj})
    except:
        user = db.db.users.find_one({"_id": user_id})
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if user.get('role') not in STAFF_ROLES:
        return jsonify({'error': 'User is not staff'}), 400
    
    settings = db.db.staff_settings.find_one({'user_id': user_id_obj})
    
    return jsonify({
        'user_id': str(user_id_obj),
        'name': f"{user.get('first_name', '')} {user.get('last_name', '')}",
        'role': user.get('role'),
        'specialty_areas': settings.get('specialty_areas', []) if settings else [],
        'languages': settings.get('languages', ['English']) if settings else ['English'],
        'bio': settings.get('bio', '') if settings else '',
        'work_preferences': settings.get('work_preferences', {}) if settings else {},
        'tags': settings.get('tags', []) if settings else []
    }), 200


@staff_settings_bp.route('/availability-working-hours', methods=['GET'])
@jwt_required()
def get_working_hours():
    """Get staff member's typical working hours (for availability scheduling context)"""
    user_id = get_jwt_identity()
    
    try:
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        user = db.db.users.find_one({"_id": user_id_obj})
    except:
        user = db.db.users.find_one({"_id": user_id})
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if user.get('role') not in STAFF_ROLES:
        return jsonify({'error': 'Only staff can access this'}), 403
    
    # Get working hours if set (typically stored with availability settings or calendar)
    working_hours = db.db.staff_working_hours.find_one({'user_id': user_id_obj})
    
    if not working_hours:
        # Return default university hours
        return jsonify({
            'user_id': str(user_id_obj),
            'working_hours': {
                'monday': {'start': '09:00', 'end': '17:00', 'enabled': True},
                'tuesday': {'start': '09:00', 'end': '17:00', 'enabled': True},
                'wednesday': {'start': '09:00', 'end': '17:00', 'enabled': True},
                'thursday': {'start': '09:00', 'end': '17:00', 'enabled': True},
                'friday': {'start': '09:00', 'end': '17:00', 'enabled': True},
                'saturday': {'start': '00:00', 'end': '00:00', 'enabled': False},
                'sunday': {'start': '00:00', 'end': '00:00', 'enabled': False}
            },
            'is_default': True,
            'updated_at': None
        }), 200
    
    return jsonify({
        'user_id': str(user_id_obj),
        'working_hours': working_hours.get('working_hours', {}),
        'is_default': False,
        'updated_at': working_hours.get('updated_at').isoformat() if working_hours.get('updated_at') else None
    }), 200


@staff_settings_bp.route('/availability-working-hours', methods=['POST', 'PUT'])
@jwt_required()
def update_working_hours():
    """Update staff member's working hours"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    try:
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        user = db.db.users.find_one({"_id": user_id_obj})
    except:
        user = db.db.users.find_one({"_id": user_id})
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if user.get('role') not in STAFF_ROLES:
        return jsonify({'error': 'Only staff can update this'}), 403
    
    working_hours = data.get('working_hours', {})
    
    if not working_hours:
        return jsonify({'error': 'working_hours is required'}), 400
    
    # Validate working hours structure
    valid_days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    for day in valid_days:
        if day in working_hours:
            day_data = working_hours[day]
            if day_data.get('enabled'):
                # Validate time format HH:MM
                start = day_data.get('start', '')
                end = day_data.get('end', '')
                if not (len(start.split(':')) == 2 and len(end.split(':')) == 2):
                    return jsonify({'error': f'Invalid time format for {day}. Use HH:MM'}), 400
    
    update_data = {
        'user_id': user_id_obj,
        'working_hours': working_hours,
        'updated_at': datetime.utcnow()
    }
    
    db.db.staff_working_hours.update_one(
        {'user_id': user_id_obj},
        {
            '$set': update_data,
            '$setOnInsert': {'created_at': datetime.utcnow()}
        },
        upsert=True
    )
    
    return jsonify({
        'message': 'Working hours updated successfully',
        'user_id': str(user_id_obj),
        'working_hours': working_hours
    }), 200


@staff_settings_bp.route('/specialty-areas', methods=['GET'])
@jwt_required()
def get_all_specialty_areas():
    """Get list of available specialty areas for the university"""
    specialties = db.db.specialty_areas.find_one({'type': 'university_specialties'})
    
    if not specialties:
        # Return default specialties
        default = [
            'Academic Performance',
            'Stress and Anxiety',
            'Depression and Mood',
            'Relationship Issues',
            'Life Transitions',
            'Identity and Self-Worth',
            'Study Skills',
            'Career Counseling',
            'Substance Use',
            'Trauma and PTSD',
            'Grief and Loss',
            'Eating/Body Image',
            'Sleep Issues',
            'Attention Concerns'
        ]
        return jsonify({'specialty_areas': default}), 200
    
    return jsonify({
        'specialty_areas': specialties.get('areas', [])
    }), 200
