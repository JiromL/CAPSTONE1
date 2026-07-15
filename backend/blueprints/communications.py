"""
Communications blueprint — bulk messaging to students.
Routes: POST /api/communications/bulk-send
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime
from models import db

communications_bp = Blueprint('communications', __name__, url_prefix='/api/communications')


@communications_bp.route('/bulk-send', methods=['POST'])
@jwt_required()
def bulk_send():
    sender_id = get_jwt_identity()
    data = request.get_json() or {}
    recipients = data.get('recipients', [])
    message = (data.get('message') or '').strip()

    if not message:
        return jsonify({'error': 'message is required'}), 400
    if not recipients:
        return jsonify({'error': 'recipients list is required'}), 400

    sender = db.db.users.find_one(
        {'_id': ObjectId(sender_id) if isinstance(sender_id, str) else sender_id},
        {'first_name': 1, 'last_name': 1, 'email': 1, 'role': 1}
    )
    sender_name = (
        f"{sender.get('first_name', '')} {sender.get('last_name', '')}".strip()
        if sender else 'Staff'
    )

    now = datetime.utcnow()
    notifications = []
    sent_count = 0

    for recipient_id in recipients:
        try:
            rid = ObjectId(recipient_id) if isinstance(recipient_id, str) else recipient_id
        except Exception:
            continue
        notifications.append({
            'type': 'BULK_MESSAGE',
            'target_user_id': rid,
            'sender_id': ObjectId(sender_id) if isinstance(sender_id, str) else sender_id,
            'sender_name': sender_name,
            'message': message,
            'read': False,
            'created_at': now,
        })
        sent_count += 1

    if notifications:
        db.db.notifications.insert_many(notifications)

    return jsonify({
        'success': True,
        'sent': sent_count,
        'message': f'Message delivered to {sent_count} student{"s" if sent_count != 1 else ""}.',
    }), 200
