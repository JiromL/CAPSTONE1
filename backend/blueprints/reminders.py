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
from utils import audit_log, user_has_permission


# ============ REMINDERS CRUD ============

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
        if not user_has_permission(db.db, user_id, PermissionType.CREATE_REMINDER.value):
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
        return jsonify({"error": str(e)}), 500


@reminders_bp.route('/<reminder_id>', methods=['GET'])
@jwt_required()
def get_reminder(reminder_id):
    """Get a specific reminder by ID."""
    try:
        reminder = db.reminders.find_one({'_id': ObjectId(reminder_id)})
        if not reminder:
            return jsonify({"error": "Reminder not found"}), 404
        
        reminder['_id'] = str(reminder['_id'])
        reminder['case_id'] = str(reminder['case_id'])
        
        return jsonify(reminder), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@reminders_bp.route('/', methods=['GET'])
@jwt_required()
def list_reminders():
    """
    List reminders with optional filters.
    Query params: case_id, status, recipient_id, reminder_type, priority
    """
    try:
        query = {}
        
        if request.args.get('case_id'):
            query['case_id'] = ObjectId(request.args.get('case_id'))
        if request.args.get('status'):
            query['status'] = request.args.get('status')
        if request.args.get('recipient_id'):
            query['recipient_id'] = request.args.get('recipient_id')
        if request.args.get('reminder_type'):
            query['reminder_type'] = request.args.get('reminder_type')
        if request.args.get('priority'):
            query['priority'] = request.args.get('priority')
        
        reminders = list(db.reminders.find(query).sort('scheduled_for', -1).limit(100))
        
        for reminder in reminders:
            reminder['_id'] = str(reminder['_id'])
            reminder['case_id'] = str(reminder['case_id'])
        
        return jsonify(reminders), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@reminders_bp.route('/<reminder_id>', methods=['PATCH'])
@jwt_required()
def update_reminder(reminder_id):
    """Update a reminder (mark as sent, read, etc)."""
    try:
        auth_header = request.headers.get('Authorization', '').replace('Bearer ', '')
        _, user_id = token_required(auth_header)
        
        reminder = db.reminders.find_one({'_id': ObjectId(reminder_id)})
        if not reminder:
            return jsonify({"error": "Reminder not found"}), 404
        
        data = request.json
        updates = {}
        
        if 'status' in data:
            updates['status'] = data['status']
            if data['status'] == 'sent':
                updates['sent_at'] = datetime.utcnow()
            elif data['status'] == 'read':
                updates['read_at'] = datetime.utcnow()
        
        if 'title' in data:
            updates['title'] = data['title']
        if 'message' in data:
            updates['message'] = data['message']
        if 'scheduled_for' in data:
            updates['scheduled_for'] = datetime.fromisoformat(
                data['scheduled_for'].replace('Z', '+00:00')
            )
        
        updates['updated_at'] = datetime.utcnow()
        
        db.reminders.update_one({'_id': ObjectId(reminder_id)}, {'$set': updates})
        
        # Log audit
        log_audit_action(
            collection='reminders',
            action='UPDATE',
            case_id=str(reminder['case_id']),
            user_id=user_id,
            changes=updates,
            reason='Reminder updated'
        )
        
        updated_reminder = db.reminders.find_one({'_id': ObjectId(reminder_id)})
        updated_reminder['_id'] = str(updated_reminder['_id'])
        updated_reminder['case_id'] = str(updated_reminder['case_id'])
        
        return jsonify(updated_reminder), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@reminders_bp.route('/<reminder_id>', methods=['DELETE'])
@jwt_required()
def delete_reminder(reminder_id):
    """Delete a reminder (soft delete)."""
    try:
        auth_header = request.headers.get('Authorization', '').replace('Bearer ', '')
        _, user_id = token_required(auth_header)
        
        reminder = db.reminders.find_one({'_id': ObjectId(reminder_id)})
        if not reminder:
            return jsonify({"error": "Reminder not found"}), 404
        
        db.reminders.update_one(
            {'_id': ObjectId(reminder_id)},
            {'$set': {'status': 'deleted', 'updated_at': datetime.utcnow()}}
        )
        
        # Log audit
        log_audit_action(
            collection='reminders',
            action='DELETE',
            case_id=str(reminder['case_id']),
            user_id=user_id,
            changes={'status': 'deleted'},
            reason='Reminder deleted'
        )
        
        return jsonify({"message": "Reminder deleted successfully"}), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============ REMINDER DELIVERY ============

@reminders_bp.route('/send/<reminder_id>', methods=['POST'])
@jwt_required()
def send_reminder(reminder_id):
    """
    Send a reminder via configured delivery methods.
    Simulates email, SMS, and dashboard notification.
    """
    try:
        auth_header = request.headers.get('Authorization', '').replace('Bearer ', '')
        _, user_id = token_required(auth_header)
        
        reminder = db.reminders.find_one({'_id': ObjectId(reminder_id)})
        if not reminder:
            return jsonify({"error": "Reminder not found"}), 404
        
        if reminder['status'] in ['sent', 'deleted']:
            return jsonify({"error": "Cannot send this reminder"}), 400
        
        delivery_results = {}
        
        # Simulate email delivery
        if 'email' in reminder['delivery_methods'] and reminder['recipient_email']:
            delivery_results['email'] = {
                'status': 'sent',
                'to': reminder['recipient_email'],
                'subject': reminder['title'],
                'timestamp': datetime.utcnow().isoformat()
            }
        
        # Simulate SMS delivery
        if 'sms' in reminder['delivery_methods'] and reminder['recipient_phone']:
            delivery_results['sms'] = {
                'status': 'sent',
                'to': reminder['recipient_phone'],
                'message': reminder['message'][:160],  # SMS char limit
                'timestamp': datetime.utcnow().isoformat()
            }
        
        # Store as dashboard notification
        if 'dashboard' in reminder['delivery_methods']:
            notification_doc = {
                "reminder_id": ObjectId(reminder_id),
                "recipient_id": reminder['recipient_id'],
                "title": reminder['title'],
                "message": reminder['message'],
                "type": reminder['reminder_type'],
                "priority": reminder['priority'],
                "created_at": datetime.utcnow(),
                "read": False
            }
            db.notifications.insert_one(notification_doc)
            delivery_results['dashboard'] = {
                'status': 'stored',
                'timestamp': datetime.utcnow().isoformat()
            }
        
        # Update reminder status
        db.reminders.update_one(
            {'_id': ObjectId(reminder_id)},
            {
                '$set': {
                    'status': 'sent',
                    'sent_at': datetime.utcnow(),
                    'updated_at': datetime.utcnow(),
                    'delivery_results': delivery_results
                }
            }
        )
        
        # Log audit
        log_audit_action(
            collection='reminders',
            action='SEND',
            case_id=str(reminder['case_id']),
            user_id=user_id,
            changes={'delivery_results': delivery_results},
            reason='Reminder sent'
        )
        
        return jsonify({
            "message": "Reminder sent successfully",
            "delivery_results": delivery_results
        }), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============ BULK OPERATIONS ============

@reminders_bp.route('/bulk/mark-sent', methods=['POST'])
@jwt_required()
def mark_reminders_sent():
    """
    Mark multiple reminders as sent (batch operation).
    Body: {"reminder_ids": ["id1", "id2", ...]}
    """
    try:
        auth_header = request.headers.get('Authorization', '').replace('Bearer ', '')
        _, user_id = token_required(auth_header)
        
        data = request.json
        reminder_ids = data.get('reminder_ids', [])
        
        if not reminder_ids:
            return jsonify({"error": "No reminder IDs provided"}), 400
        
        object_ids = [ObjectId(rid) for rid in reminder_ids]
        result = db.reminders.update_many(
            {
                '_id': {'$in': object_ids},
                'status': 'pending'
            },
            {
                '$set': {
                    'status': 'sent',
                    'sent_at': datetime.utcnow(),
                    'updated_at': datetime.utcnow()
                }
            }
        )
        
        return jsonify({
            "message": f"Updated {result.modified_count} reminders",
            "modified_count": result.modified_count
        }), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@reminders_bp.route('/upcoming', methods=['GET'])
@jwt_required()
def get_upcoming_reminders():
    """Get reminders scheduled for the next 24 hours."""
    try:
        now = datetime.utcnow()
        tomorrow = now + timedelta(hours=24)
        
        reminders = list(db.reminders.find({
            'scheduled_for': {'$gte': now, '$lte': tomorrow},
            'status': 'pending'
        }).sort('scheduled_for', 1))
        
        for reminder in reminders:
            reminder['_id'] = str(reminder['_id'])
            reminder['case_id'] = str(reminder['case_id'])
        
        return jsonify(reminders), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
