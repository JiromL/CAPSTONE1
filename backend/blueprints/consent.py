"""Informed consent recording for counseling services."""
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson.objectid import ObjectId
from models import db

consent_bp = Blueprint('consent', __name__, url_prefix='/api/consent')


@consent_bp.route('/submit', methods=['POST'])
@jwt_required()
def submit_consent():
    """Record a student's informed consent with timestamp and IP."""
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    consent_types = data.get('consent_types', [])  # e.g. ['counseling_services', 'data_privacy']
    if not consent_types:
        return jsonify({'error': 'consent_types is required'}), 400

    record = {
        'user_id': ObjectId(user_id) if isinstance(user_id, str) else user_id,
        'consent_types': consent_types,
        'consented_at': datetime.utcnow(),
        'ip_address': request.remote_addr,
        'user_agent': request.headers.get('User-Agent', ''),
        'version': data.get('version', '1.0'),
    }
    db.db.consent_records.insert_one(record)

    now = datetime.utcnow()
    stamp = {
        'consent_given': True,
        'consent_given_at': now,
        'consent_version': data.get('version', '1.0'),
    }
    if 'ema_data_linking' in consent_types:
        stamp['ema_consent_given'] = True
        stamp['ema_consent_given_at'] = now

    db.db.users.update_one(
        {'_id': ObjectId(user_id) if isinstance(user_id, str) else user_id},
        {'$set': stamp}
    )

    return jsonify({'success': True, 'consented_at': record['consented_at'].isoformat()}), 201


@consent_bp.route('/status', methods=['GET'])
@jwt_required()
def get_consent_status():
    """Check whether the current user has given consent."""
    user_id = get_jwt_identity()
    user = db.db.users.find_one(
        {'_id': ObjectId(user_id) if isinstance(user_id, str) else user_id},
        {'consent_given': 1, 'consent_given_at': 1, 'consent_version': 1}
    )
    if not user:
        return jsonify({'error': 'User not found'}), 404

    given = user.get('consent_given', False)
    return jsonify({
        'consent_given': given,
        'consent_given_at': user['consent_given_at'].isoformat() if given and user.get('consent_given_at') else None,
        'consent_version': user.get('consent_version'),
    }), 200
