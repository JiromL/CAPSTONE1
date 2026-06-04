"""
ENGAGEMENT & WELLBEING MODULE
Blueprint for chat/video links, journaling, reminders, and feedback collection
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from models import db
from utils import audit_log
from datetime import datetime, timedelta

engagement_bp = Blueprint('engagement', __name__, url_prefix='/api/engagement')


# ============ CHAT/VIDEO LINKS ============

@engagement_bp.route('/session/<session_id>/video-link', methods=['POST'])
@jwt_required()
def create_video_link(session_id):
    """Create chat/video link for counseling session"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    try:
        session = db.db.session_notes.find_one({"_id": ObjectId(session_id)})
    except:
        return jsonify({'error': 'Invalid session ID'}), 400
    
    if not session:
        return jsonify({'error': 'Session not found'}), 404
    
    # Only counselor or admin can create links
    if str(session.get('counselor_id')) != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    video_link = {
        'session_id': ObjectId(session_id),
        'case_id': session.get('case_id'),
        'counselor_id': ObjectId(user_id),
        'platform': data.get('platform', 'zoom'),  # zoom, google_meet, teams
        'link_url': data.get('link_url'),
        'password': data.get('password'),
        'start_time': data.get('start_time'),
        'created_at': datetime.utcnow(),
        'created_by': ObjectId(user_id)
    }
    
    result = db.db.video_links.insert_one(video_link)
    
    audit_log(db.db, 'video_link', 'create', entity_id=str(result.inserted_id), new_values={
        'session_id': str(session_id),
        'platform': data.get('platform')
    })
    
    return jsonify({
        'video_link_id': str(result.inserted_id),
        'platform': data.get('platform'),
        'link_url': data.get('link_url'),
        'created_at': datetime.utcnow().isoformat()
    }), 201


@engagement_bp.route('/session/<session_id>/video-link', methods=['GET'])
@jwt_required()
def get_video_link(session_id):
    """Get video link for session"""
    try:
        link = db.db.video_links.find_one({"session_id": ObjectId(session_id)})
    except:
        link = db.db.video_links.find_one({"session_id": session_id})
    
    if not link:
        return jsonify({'error': 'Video link not found'}), 404
    
    return jsonify({
        'video_link_id': str(link['_id']),
        'platform': link.get('platform'),
        'link_url': link.get('link_url'),
        'password': link.get('password'),
        'start_time': link.get('start_time'),
        'created_at': link.get('created_at').isoformat() if link.get('created_at') else None
    }), 200


# ============ JOURNALING ============

@engagement_bp.route('/journal', methods=['POST'])
@jwt_required()
def create_journal_entry():
    """Create journal entry (student self-reflection)"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data.get('content'):
        return jsonify({'error': 'Content is required'}), 400
    
    entry = {
        'student_id': ObjectId(user_id),
        'mood': data.get('mood'),  # 1-5 scale
        'content': data.get('content'),
        'tags': data.get('tags', []),  # e.g., ['stress', 'family', 'school']
        'is_private': data.get('is_private', True),
        'attachments': data.get('attachments', []),
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow()
    }
    
    result = db.db.journal_entries.insert_one(entry)
    
    audit_log(db.db, 'journal', 'create', entity_id=str(result.inserted_id), new_values={
        'student_id': user_id,
        'mood': data.get('mood')
    })
    
    return jsonify({
        'journal_id': str(result.inserted_id),
        'created_at': datetime.utcnow().isoformat(),
        'mood': data.get('mood')
    }), 201


@engagement_bp.route('/journal', methods=['GET'])
@jwt_required()
def list_journal_entries():
    """List student's journal entries"""
    user_id = get_jwt_identity()
    skip = request.args.get('skip', 0, type=int)
    limit = request.args.get('limit', 20, type=int)
    
    entries = list(db.db.journal_entries.find({
        'student_id': ObjectId(user_id)
    }).sort('created_at', -1).skip(skip).limit(limit))
    
    result_entries = []
    for entry in entries:
        result_entries.append({
            'journal_id': str(entry['_id']),
            'mood': entry.get('mood'),
            'content': entry.get('content')[:200] + '...' if len(entry.get('content', '')) > 200 else entry.get('content'),
            'tags': entry.get('tags', []),
            'created_at': entry.get('created_at').isoformat() if entry.get('created_at') else None
        })
    
    return jsonify({
        'entries': result_entries,
        'total': db.db.journal_entries.count_documents({'student_id': ObjectId(user_id)})
    }), 200


@engagement_bp.route('/journal/<journal_id>', methods=['GET'])
@jwt_required()
def get_journal_entry(journal_id):
    """Get full journal entry"""
    user_id = get_jwt_identity()
    
    try:
        entry = db.db.journal_entries.find_one({
            '_id': ObjectId(journal_id),
            'student_id': ObjectId(user_id)
        })
    except:
        return jsonify({'error': 'Invalid journal ID'}), 400
    
    if not entry:
        return jsonify({'error': 'Journal entry not found'}), 404
    
    return jsonify({
        'journal_id': str(entry['_id']),
        'mood': entry.get('mood'),
        'content': entry.get('content'),
        'tags': entry.get('tags', []),
        'created_at': entry.get('created_at').isoformat() if entry.get('created_at') else None,
        'updated_at': entry.get('updated_at').isoformat() if entry.get('updated_at') else None
    }), 200


@engagement_bp.route('/journal/<journal_id>', methods=['PATCH'])
@jwt_required()
def update_journal_entry(journal_id):
    """Update journal entry"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    try:
        entry = db.db.journal_entries.find_one({
            '_id': ObjectId(journal_id),
            'student_id': ObjectId(user_id)
        })
    except:
        return jsonify({'error': 'Invalid journal ID'}), 400
    
    if not entry:
        return jsonify({'error': 'Journal entry not found'}), 404
    
    update_data = {}
    if 'content' in data:
        update_data['content'] = data['content']
    if 'mood' in data:
        update_data['mood'] = data['mood']
    if 'tags' in data:
        update_data['tags'] = data['tags']
    
    update_data['updated_at'] = datetime.utcnow()
    
    db.db.journal_entries.update_one(
        {'_id': ObjectId(journal_id)},
        {'$set': update_data}
    )
    
    audit_log(db.db, 'journal', 'update', entity_id=journal_id, old_values={
        'mood': entry.get('mood')
    }, new_values=update_data)

    return jsonify({'message': 'Journal entry updated', 'journal_id': journal_id}), 200


@engagement_bp.route('/journal/<journal_id>', methods=['DELETE'])
@jwt_required()
def delete_journal_entry(journal_id):
    """Delete a journal entry (owner only)"""
    user_id = get_jwt_identity()

    try:
        entry = db.db.journal_entries.find_one({
            '_id': ObjectId(journal_id),
            'student_id': ObjectId(user_id)
        })
    except:
        return jsonify({'error': 'Invalid journal ID'}), 400

    if not entry:
        return jsonify({'error': 'Journal entry not found or not yours'}), 404

    db.db.journal_entries.delete_one({'_id': ObjectId(journal_id)})
    audit_log(db.db, 'journal', 'delete', entity_id=journal_id)

    return jsonify({'message': 'Journal entry deleted'}), 200


# ============ REMINDERS ============

@engagement_bp.route('/reminders', methods=['POST'])
@jwt_required()
def create_reminder():
    """Create reminder (appointment, medication, homework)"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data.get('title') or not data.get('reminder_time'):
        return jsonify({'error': 'Title and reminder_time are required'}), 400
    
    reminder = {
        'user_id': ObjectId(user_id),
        'title': data.get('title'),
        'description': data.get('description', ''),
        'reminder_time': datetime.fromisoformat(data['reminder_time']),
        'reminder_type': data.get('reminder_type', 'general'),  # appointment, medication, homework, etc.
        'is_recurring': data.get('is_recurring', False),
        'recurrence_pattern': data.get('recurrence_pattern'),  # daily, weekly, monthly
        'sent': False,
        'acknowledged': False,
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow()
    }
    
    result = db.db.reminders.insert_one(reminder)
    
    audit_log(db.db, 'reminder', 'create', entity_id=str(result.inserted_id), new_values={
        'title': data.get('title'),
        'reminder_type': data.get('reminder_type')
    })
    
    return jsonify({
        'reminder_id': str(result.inserted_id),
        'title': data.get('title'),
        'reminder_time': data.get('reminder_time'),
        'created_at': datetime.utcnow().isoformat()
    }), 201


@engagement_bp.route('/reminders', methods=['GET'])
@jwt_required()
def list_reminders():
    """List user's reminders"""
    user_id = get_jwt_identity()
    filter_type = request.args.get('type')  # upcoming, past, all
    
    query = {'user_id': ObjectId(user_id)}
    
    if filter_type == 'upcoming':
        query['reminder_time'] = {'$gte': datetime.utcnow()}
    elif filter_type == 'past':
        query['reminder_time'] = {'$lt': datetime.utcnow()}
    
    reminders = list(db.db.reminders.find(query).sort('reminder_time', 1).limit(50))
    
    result_reminders = []
    for reminder in reminders:
        result_reminders.append({
            'reminder_id': str(reminder['_id']),
            'title': reminder.get('title'),
            'description': reminder.get('description'),
            'reminder_time': reminder.get('reminder_time').isoformat() if reminder.get('reminder_time') else None,
            'reminder_type': reminder.get('reminder_type'),
            'sent': reminder.get('sent'),
            'acknowledged': reminder.get('acknowledged')
        })
    
    return jsonify({'reminders': result_reminders}), 200


@engagement_bp.route('/reminders/<reminder_id>/acknowledge', methods=['PATCH'])
@jwt_required()
def acknowledge_reminder(reminder_id):
    """Mark reminder as acknowledged"""
    user_id = get_jwt_identity()
    
    try:
        reminder = db.db.reminders.find_one({
            '_id': ObjectId(reminder_id),
            'user_id': ObjectId(user_id)
        })
    except:
        return jsonify({'error': 'Invalid reminder ID'}), 400
    
    if not reminder:
        return jsonify({'error': 'Reminder not found'}), 404
    
    db.db.reminders.update_one(
        {'_id': ObjectId(reminder_id)},
        {'$set': {'acknowledged': True, 'updated_at': datetime.utcnow()}}
    )
    
    return jsonify({'message': 'Reminder acknowledged', 'reminder_id': reminder_id}), 200


# ============ FEEDBACK COLLECTION ============

@engagement_bp.route('/feedback', methods=['POST'])
@jwt_required()
def submit_feedback():
    """Submit feedback on counseling session or overall experience"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data.get('rating') or not data.get('content'):
        return jsonify({'error': 'Rating and content are required'}), 400
    
    feedback = {
        'user_id': ObjectId(user_id),
        'session_id': ObjectId(data['session_id']) if data.get('session_id') else None,
        'counselor_id': ObjectId(data['counselor_id']) if data.get('counselor_id') else None,
        'rating': data.get('rating'),  # 1-5 scale
        'content': data.get('content'),
        'category': data.get('category', 'general'),  # session, counselor, program, general
        'would_recommend': data.get('would_recommend'),  # yes/no
        'improvements': data.get('improvements', []),
        'anonymous': data.get('anonymous', False),
        'created_at': datetime.utcnow()
    }
    
    result = db.db.feedback.insert_one(feedback)
    
    audit_log(db.db, 'feedback', 'create', entity_id=str(result.inserted_id), new_values={
        'rating': data.get('rating'),
        'category': data.get('category')
    })
    
    return jsonify({
        'feedback_id': str(result.inserted_id),
        'rating': data.get('rating'),
        'created_at': datetime.utcnow().isoformat()
    }), 201


@engagement_bp.route('/feedback', methods=['GET'])
@jwt_required()
def list_feedback():
    """List feedback (admin/counselor view)"""
    user_id = get_jwt_identity()
    user = db.db.users.find_one({'_id': ObjectId(user_id)})
    
    # Only admins, DPOs, and counselors can view feedback
    if user.get('role') not in ['ADMIN', 'DPO', 'PSYCHOLOGIST', 'COUNSELOR']:
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    filter_type = request.args.get('type')  # all, session, counselor, program
    skip = request.args.get('skip', 0, type=int)
    limit = request.args.get('limit', 20, type=int)
    
    query = {}
    if filter_type and filter_type != 'all':
        query['category'] = filter_type
    
    feedback_list = list(db.db.feedback.find(query).sort('created_at', -1).skip(skip).limit(limit))
    
    result_feedback = []
    for fb in feedback_list:
        feedback_user = db.db.users.find_one({'_id': fb.get('user_id')}) if not fb.get('anonymous') else None
        result_feedback.append({
            'feedback_id': str(fb['_id']),
            'rating': fb.get('rating'),
            'category': fb.get('category'),
            'content': fb.get('content')[:200] + '...' if len(fb.get('content', '')) > 200 else fb.get('content'),
            'would_recommend': fb.get('would_recommend'),
            'submitted_by': f"{feedback_user.get('first_name', '')} {feedback_user.get('last_name', '')}" if feedback_user else 'Anonymous',
            'created_at': fb.get('created_at').isoformat() if fb.get('created_at') else None
        })
    
    return jsonify({
        'feedback': result_feedback,
        'total': db.db.feedback.count_documents(query),
        'avg_rating': round(db.db.feedback.aggregate([
            {'$match': query},
            {'$group': {'_id': None, 'avg_rating': {'$avg': '$rating'}}}
        ]).next()['avg_rating'], 2) if db.db.feedback.count_documents(query) > 0 else 0
    }), 200


@engagement_bp.route('/feedback/<feedback_id>', methods=['GET'])
@jwt_required()
def get_feedback(feedback_id):
    """Get full feedback details"""
    user_id = get_jwt_identity()
    user = db.db.users.find_one({'_id': ObjectId(user_id)})
    
    # Only admins, DPOs, counselors can view
    if user.get('role') not in ['ADMIN', 'DPO', 'PSYCHOLOGIST', 'COUNSELOR']:
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        feedback = db.db.feedback.find_one({'_id': ObjectId(feedback_id)})
    except:
        return jsonify({'error': 'Invalid feedback ID'}), 400
    
    if not feedback:
        return jsonify({'error': 'Feedback not found'}), 404
    
    feedback_user = db.db.users.find_one({'_id': feedback.get('user_id')}) if not feedback.get('anonymous') else None
    
    return jsonify({
        'feedback_id': str(feedback['_id']),
        'rating': feedback.get('rating'),
        'category': feedback.get('category'),
        'content': feedback.get('content'),
        'would_recommend': feedback.get('would_recommend'),
        'improvements': feedback.get('improvements', []),
        'submitted_by': f"{feedback_user.get('first_name', '')} {feedback_user.get('last_name', '')}" if feedback_user else 'Anonymous',
        'created_at': feedback.get('created_at').isoformat() if feedback.get('created_at') else None
    }), 200
