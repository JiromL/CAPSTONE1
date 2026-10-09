"""
Reminders System Blueprint
Handles appointment reminders, referral follow-ups, and session booking reminders
via email, SMS, and dashboard notifications.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from bson.objectid import ObjectId
import os
from dotenv import load_dotenv

load_dotenv()

reminders_bp = Blueprint('reminders', __name__, url_prefix='/api/reminders')

# Import database and utilities
from models import db, PermissionType
from utils import audit_log, user_has_permission, server_error


# ============ REMINDERS CRUD ============

def _serialize(doc):
    out = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, datetime):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out


def _can_manage(user_id):
    """Staff (every role with VIEW_NOTES; never students) can view, change and send any reminder."""
    return user_has_permission(db.db, user_id, PermissionType.VIEW_NOTES.value)


def _is_own(reminder, user_id):
    """The recipient or the person who created it."""
    return str(user_id) in {str(reminder.get(k)) for k in ('recipient_id', 'student_id', 'created_by')}


def _find_reminder(reminder_id):
    try:
        return db.db.reminders.find_one({'_id': ObjectId(reminder_id)})
    except Exception:
        return None


def _audit(action, reminder_id, user_id, changes):
    audit_log(db.db, 'reminder', action, entity_id=str(reminder_id), new_values={'by': str(user_id), **changes})


@reminders_bp.route('/', methods=['POST'])
@jwt_required()
def create_reminder():
    """
    Create a new reminder for appointment, referral follow-up, or session booking.
    
    Body:
    {
        "case_id": "string",
        "reminder_type": "appointment|referral_followup|session_booking",
        "scheduled_for": "ISO datetime",
        "recipient_id": "string (counselor/client ID)",
        "recipient_type": "counselor|client",
        "recipient_email": "string (optional for email)",
        "recipient_phone": "string (optional for SMS)",
        "title": "string",
        "message": "string",
        "delivery_methods": ["email", "sms", "dashboard"],
        "priority": "low|medium|high",
        "metadata": {}
    }
    """
    try:
        user_id = get_jwt_identity()
        
        # Check permission
        if not user_has_permission(db.db, user_id, PermissionType.VIEW_NOTES.value):
            return jsonify({"error": "Insufficient permissions"}), 403
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['case_id', 'reminder_type', 'scheduled_for', 'recipient_id', 
                          'recipient_type', 'title', 'message', 'delivery_methods']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing field: {field}"}), 400
        
        if data['reminder_type'] not in ['appointment', 'referral_followup', 'session_booking']:
            return jsonify({"error": "Invalid reminder_type"}), 400
        
        if data['recipient_type'] not in ['counselor', 'client']:
            return jsonify({"error": "Invalid recipient_type"}), 400
        
        # Parse scheduled datetime
        try:
            scheduled_for = datetime.fromisoformat(data['scheduled_for'].replace('Z', '+00:00'))
        except ValueError:
            return jsonify({"error": "Invalid datetime format"}), 400
        
        reminder_doc = {
            "case_id": ObjectId(data['case_id']),
            "reminder_type": data['reminder_type'],
            "scheduled_for": scheduled_for,
            "recipient_id": data['recipient_id'],
            "recipient_type": data['recipient_type'],
            "recipient_email": data.get('recipient_email', ''),
            "recipient_phone": data.get('recipient_phone', ''),
            "title": data['title'],
            "message": data['message'],
            "delivery_methods": data['delivery_methods'],
            "priority": data.get('priority', 'medium'),
            "status": "pending",
            "sent_at": None,
            "read_at": None,
            "created_by": user_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "metadata": data.get('metadata', {})
        }
        
        result = db.db.reminders.insert_one(reminder_doc)
        reminder_doc['_id'] = str(result.inserted_id)
        reminder_doc['case_id'] = str(reminder_doc['case_id'])
        
        # Log audit
        audit_log.log(
            level='INFO',
            action='CREATE_REMINDER',
            user_id=user_id,
            resource_id=str(result.inserted_id),
            details=f"Reminder created: {data['reminder_type']}"
        )
        
        return jsonify(reminder_doc), 201
    
    except Exception as e:
        return server_error(e)


@reminders_bp.route('/<reminder_id>', methods=['GET'])
@jwt_required()
def get_reminder(reminder_id):
    """Get a specific reminder by ID (its recipient, its creator, or reminder staff)."""
    user_id = get_jwt_identity()
    reminder = _find_reminder(reminder_id)
    if not reminder:
        return jsonify({"error": "Reminder not found"}), 404
    if not (_is_own(reminder, user_id) or _can_manage(user_id)):
        return jsonify({"error": "You can only view your own reminders"}), 403
    return jsonify(_serialize(reminder)), 200


@reminders_bp.route('/', methods=['GET'])
@jwt_required()
def list_reminders():
    """List the current user's own reminders (powers the notification bell).

    Always scoped to the requesting user so no one sees another person's
    notifications. Matches on either recipient_id or student_id, since reminders
    are written with different recipient keys across the system.
    """
    try:
        user_id = get_jwt_identity()
        try:
            uid = ObjectId(user_id) if isinstance(user_id, str) else user_id
        except Exception:
            uid = user_id
        recipient_values = [v for v in {uid, str(user_id)} if v is not None]

        query = {
            'status': {'$ne': 'deleted'},
            '$or': [
                {'recipient_id': {'$in': recipient_values}},
                {'student_id': {'$in': recipient_values}},
            ],
        }
        docs = list(db.db.reminders.find(query).sort('created_at', -1).limit(50))

        reminders = []
        for r in docs:
            item = {}
            for k, v in r.items():
                if isinstance(v, ObjectId):
                    item[k] = str(v)
                elif isinstance(v, datetime):
                    item[k] = v.isoformat()
                else:
                    item[k] = v
            reminders.append(item)

        return jsonify({'reminders': reminders}), 200

    except Exception as e:
        print(f"⚠ list_reminders error: {e}")
        return jsonify({'reminders': []}), 200


@reminders_bp.route('/<reminder_id>', methods=['PATCH'])
@jwt_required()
def update_reminder(reminder_id):
    """Update a reminder. Recipients may only mark it read; creators and staff may edit it."""
    user_id = get_jwt_identity()
    reminder = _find_reminder(reminder_id)
    if not reminder:
        return jsonify({"error": "Reminder not found"}), 404
    manager = _can_manage(user_id) or str(reminder.get('created_by')) == str(user_id)
    if not (manager or _is_own(reminder, user_id)):
        return jsonify({"error": "You can only change your own reminders"}), 403

    data = request.get_json() or {}
    if not manager and set(data) - {'status'}:
        return jsonify({"error": "You can only mark this reminder as read"}), 403
    updates = {}
    if 'status' in data:
        allowed = ('pending', 'sent', 'read') if manager else ('read',)
        if data['status'] not in allowed:
            return jsonify({"error": f"status must be one of: {', '.join(allowed)}"}), 400
        updates['status'] = data['status']
        if data['status'] == 'sent':
            updates['sent_at'] = datetime.utcnow()
        elif data['status'] == 'read':
            updates['read_at'] = datetime.utcnow()
            updates['is_read'] = True
    for field in ('title', 'message'):
        if field in data:
            updates[field] = data[field]
    if 'scheduled_for' in data:
        try:
            updates['scheduled_for'] = datetime.fromisoformat(data['scheduled_for'].replace('Z', '+00:00'))
        except (AttributeError, ValueError):
            return jsonify({"error": "Invalid datetime format"}), 400
    updates['updated_at'] = datetime.utcnow()

    db.db.reminders.update_one({'_id': reminder['_id']}, {'$set': updates})
    _audit('update', reminder_id, user_id, {k: v for k, v in updates.items() if k in ('status', 'title')})
    return jsonify(_serialize(db.db.reminders.find_one({'_id': reminder['_id']}))), 200


@reminders_bp.route('/<reminder_id>', methods=['DELETE'])
@jwt_required()
def delete_reminder(reminder_id):
    """Soft-delete a reminder (its creator or reminder staff)."""
    user_id = get_jwt_identity()
    reminder = _find_reminder(reminder_id)
    if not reminder:
        return jsonify({"error": "Reminder not found"}), 404
    if not (_can_manage(user_id) or str(reminder.get('created_by')) == str(user_id)):
        return jsonify({"error": "Only the person who created this reminder or reminder staff can delete it"}), 403
    db.db.reminders.update_one({'_id': reminder['_id']},
                               {'$set': {'status': 'deleted', 'updated_at': datetime.utcnow()}})
    _audit('delete', reminder_id, user_id, {'status': 'deleted'})
    return jsonify({"message": "Reminder deleted successfully"}), 200


# ============ REMINDER DELIVERY ============

@reminders_bp.route('/send/<reminder_id>', methods=['POST'])
@jwt_required()
def send_reminder(reminder_id):
    """
    Send a reminder via its delivery methods (reminder staff only).
    Email and SMS are simulated; dashboard delivery stores a notification.
    """
    user_id = get_jwt_identity()
    if not _can_manage(user_id):
        return jsonify({"error": "Insufficient permissions"}), 403
    reminder = _find_reminder(reminder_id)
    if not reminder:
        return jsonify({"error": "Reminder not found"}), 404
    if reminder.get('status') in ('sent', 'deleted'):
        return jsonify({"error": "Cannot send this reminder"}), 400

    now = datetime.utcnow()
    methods = reminder.get('delivery_methods') or ['dashboard']
    delivery_results = {}
    if 'email' in methods and reminder.get('recipient_email'):
        delivery_results['email'] = {'status': 'sent', 'to': reminder['recipient_email'],
                                     'subject': reminder.get('title', ''), 'timestamp': now.isoformat()}
    if 'sms' in methods and reminder.get('recipient_phone'):
        delivery_results['sms'] = {'status': 'sent', 'to': reminder['recipient_phone'],
                                   'message': (reminder.get('message') or '')[:160], 'timestamp': now.isoformat()}
    if 'dashboard' in methods:
        db.db.notifications.insert_one({
            "reminder_id": reminder['_id'],
            "recipient_id": reminder.get('recipient_id') or reminder.get('student_id'),
            "title": reminder.get('title', 'Reminder'),
            "message": reminder.get('message', ''),
            "type": reminder.get('reminder_type'),
            "priority": reminder.get('priority', 'medium'),
            "created_at": now,
            "read": False,
        })
        delivery_results['dashboard'] = {'status': 'stored', 'timestamp': now.isoformat()}

    db.db.reminders.update_one({'_id': reminder['_id']}, {'$set': {
        'status': 'sent', 'sent_at': now, 'updated_at': now, 'delivery_results': delivery_results}})
    _audit('send', reminder_id, user_id, {'methods': list(delivery_results)})
    return jsonify({"message": "Reminder sent successfully", "delivery_results": delivery_results}), 200


# ============ BULK OPERATIONS ============

@reminders_bp.route('/bulk/mark-sent', methods=['POST'])
@jwt_required()
def mark_reminders_sent():
    """
    Mark multiple reminders as sent (reminder staff only).
    Body: {"reminder_ids": ["id1", "id2", ...]}
    """
    user_id = get_jwt_identity()
    if not _can_manage(user_id):
        return jsonify({"error": "Insufficient permissions"}), 403
    reminder_ids = (request.get_json() or {}).get('reminder_ids', [])
    if not reminder_ids:
        return jsonify({"error": "No reminder IDs provided"}), 400
    try:
        object_ids = [ObjectId(rid) for rid in reminder_ids]
    except Exception:
        return jsonify({"error": "Invalid reminder ID"}), 400
    now = datetime.utcnow()
    result = db.db.reminders.update_many({'_id': {'$in': object_ids}, 'status': 'pending'},
                                         {'$set': {'status': 'sent', 'sent_at': now, 'updated_at': now}})
    return jsonify({"message": f"Updated {result.modified_count} reminders",
                    "modified_count": result.modified_count}), 200


@reminders_bp.route('/mark-all-read', methods=['POST'])
@jwt_required()
def mark_all_reminders_read():
    """Mark all of the current user's unread notifications as read."""
    user_id = get_jwt_identity()
    try:
        from bson import ObjectId
        uid = ObjectId(user_id) if isinstance(user_id, str) else user_id
        result = db.db.reminders.update_many(
            {'$or': [{'recipient_id': {'$in': [uid, str(user_id)]}},
                     {'student_id': {'$in': [uid, str(user_id)]}}]},
            {'$set': {'is_read': True, 'acknowledged': True}},
        )
        return jsonify({'updated': result.modified_count}), 200
    except Exception as e:
        return server_error(e)


@reminders_bp.route('/upcoming', methods=['GET'])
@jwt_required()
def get_upcoming_reminders():
    """Reminders scheduled for the next 24 hours: all for reminder staff, otherwise only your own."""
    user_id = get_jwt_identity()
    now = datetime.utcnow()
    query = {'scheduled_for': {'$gte': now, '$lte': now + timedelta(hours=24)}, 'status': 'pending'}
    if not _can_manage(user_id):
        try:
            mine = [ObjectId(user_id), str(user_id)]
        except Exception:
            mine = [str(user_id)]
        query['$or'] = [{'recipient_id': {'$in': mine}}, {'student_id': {'$in': mine}}]
    reminders = db.db.reminders.find(query).sort('scheduled_for', 1)
    return jsonify([_serialize(r) for r in reminders]), 200

