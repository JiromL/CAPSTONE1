"""QR code generation and check-in verification for appointments."""
import base64
import io
import secrets
from datetime import datetime, timedelta

import qrcode
from bson import ObjectId
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from models import db

qr_bp = Blueprint('qr', __name__, url_prefix='/api/qr')

# Token expiry window (minutes the QR code is valid once generated)
QR_EXPIRY_MINUTES = 30


@qr_bp.route('/appointment/<appointment_id>', methods=['GET'])
@jwt_required()
def generate_qr(appointment_id):
    """Generate a QR code image (base64 PNG) for appointment check-in."""
    user_id = get_jwt_identity()
    try:
        appt = db.db.appointments.find_one({'_id': ObjectId(appointment_id)})
    except Exception:
        return jsonify({'error': 'Invalid appointment ID'}), 400

    if not appt:
        return jsonify({'error': 'Appointment not found'}), 404

    # Only the student assigned to this appointment may generate a QR
    if str(appt.get('student_id')) != str(user_id):
        return jsonify({'error': 'Forbidden'}), 403

    if appt.get('status') not in ('CONFIRMED', 'confirmed', 'APPROVED', 'approved'):
        return jsonify({'error': 'Appointment is not confirmed'}), 400

    # Upsert a check-in token (rotate each time this endpoint is called)
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(minutes=QR_EXPIRY_MINUTES)

    db.db.checkin_tokens.update_one(
        {'appointment_id': ObjectId(appointment_id)},
        {'$set': {'token': token, 'expires_at': expires_at, 'used': False}},
        upsert=True,
    )

    # Embed the token in a check-in URL that staff will scan
    checkin_url = f"/check-in?token={token}&appt={appointment_id}"

    img = qrcode.make(checkin_url)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    encoded = base64.b64encode(buf.getvalue()).decode('utf-8')

    return jsonify({
        'qr_image': f'data:image/png;base64,{encoded}',
        'checkin_url': checkin_url,
        'expires_at': expires_at.isoformat(),
        'appointment_id': appointment_id,
    }), 200


@qr_bp.route('/verify', methods=['POST'])
@jwt_required()
def verify_checkin():
    """Staff scans QR → verify token and mark appointment as checked in."""
    data = request.get_json() or {}
    token = data.get('token')
    appointment_id = data.get('appointment_id') or data.get('appt')

    if not token or not appointment_id:
        return jsonify({'error': 'token and appointment_id are required'}), 400

    record = db.db.checkin_tokens.find_one({'token': token})
    if not record:
        return jsonify({'error': 'Invalid QR code'}), 404

    if record.get('used'):
        return jsonify({'error': 'QR code already used'}), 409

    if datetime.utcnow() > record.get('expires_at', datetime.utcnow()):
        return jsonify({'error': 'QR code has expired'}), 410

    if str(record.get('appointment_id')) != str(appointment_id):
        return jsonify({'error': 'Token does not match appointment'}), 400

    # Mark token as used
    db.db.checkin_tokens.update_one(
        {'_id': record['_id']},
        {'$set': {'used': True, 'used_at': datetime.utcnow()}}
    )

    # Mark appointment as checked in
    db.db.appointments.update_one(
        {'_id': ObjectId(appointment_id)},
        {'$set': {'checked_in': True, 'checked_in_at': datetime.utcnow()}}
    )

    appt = db.db.appointments.find_one({'_id': ObjectId(appointment_id)})
    student = db.db.users.find_one({'_id': appt.get('student_id')}) if appt else None
    student_name = f"{student.get('first_name','')} {student.get('last_name','')}".strip() if student else 'Unknown'

    return jsonify({
        'success': True,
        'message': f'{student_name} checked in successfully',
        'appointment_id': appointment_id,
        'checked_in_at': datetime.utcnow().isoformat(),
    }), 200
