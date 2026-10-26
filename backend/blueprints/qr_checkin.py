"""QR code generation and check-in verification for appointments."""
import base64
import io
import os
import secrets
from datetime import datetime, timedelta, timezone

import qrcode
from bson import ObjectId
from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import get_jwt_identity, jwt_required

from models import db

qr_bp = Blueprint('qr', __name__, url_prefix='/api/qr')

# The QR code is shown to the student, so the link alone must not check them in: whoever
# scans it has to be signed in as CPS staff. Otherwise a student could check in from home.
CHECKIN_ROLES = ('STAFF', 'IC', 'COUNSELOR', 'PSYCHOLOGIST', 'CASE_MANAGER', 'ADMIN')


def _not_staff():
    try:
        uid = ObjectId(get_jwt_identity())
    except Exception:
        return True
    user = db.db.users.find_one({'_id': uid}, {'role': 1})
    return not user or user.get('role') not in CHECKIN_ROLES


def _qr_expiry_minutes():
    return current_app.config.get('QR_EXPIRY_MINUTES', 30)


@qr_bp.route('/appointment/<appointment_id>', methods=['GET'])
@jwt_required()
def generate_qr(appointment_id):
    """Return a stable QR code for appointment check-in.

    Reuses the existing token if it is still valid and unused.
    Only mints a new token when the old one is expired, used, or missing.
    Expiry is set to the end of the appointment day so the QR stays valid
    for the whole day rather than a rolling 30-minute window.
    """
    user_id = get_jwt_identity()
    try:
        appt = db.db.appointments.find_one({'_id': ObjectId(appointment_id)})
    except Exception:
        return jsonify({'error': 'Invalid appointment ID'}), 400

    if not appt:
        return jsonify({'error': 'Appointment not found'}), 404

    if str(appt.get('student_id')) != str(user_id):
        return jsonify({'error': 'Forbidden'}), 403

    if appt.get('status') not in ('CONFIRMED', 'confirmed', 'APPROVED', 'approved'):
        return jsonify({'error': 'Appointment is not confirmed'}), 400

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # Expiry = end of the appointment's scheduled day (midnight UTC+8 → UTC)
    scheduled = appt.get('scheduled_start') or appt.get('requested_start')
    if scheduled and hasattr(scheduled, 'date'):
        appt_date = scheduled.date()
        # scheduled_start is Philippine wall-clock time; the PH midnight that ends that day is 16:00 UTC on the same date
        expires_at = datetime(appt_date.year, appt_date.month, appt_date.day, 16, 0, 0)
    else:
        expires_at = now + timedelta(hours=24)

    # Reuse existing token if still valid and unused
    existing = db.db.checkin_tokens.find_one({'appointment_id': ObjectId(appointment_id)})
    if existing and not existing.get('used') and existing.get('expires_at', now) > now:
        token = existing['token']
        expires_at = existing['expires_at']
    else:
        token = secrets.token_urlsafe(32)
        db.db.checkin_tokens.update_one(
            {'appointment_id': ObjectId(appointment_id)},
            {'$set': {'token': token, 'expires_at': expires_at, 'used': False}},
            upsert=True,
        )

    frontend_base = (
        os.environ.get('FRONTEND_URL')
        or request.headers.get('Origin')
        or request.headers.get('Referer', '').rstrip('/').rsplit('/', 1)[0]
        or 'http://localhost:3000'
    ).rstrip('/')
    checkin_url = f"{frontend_base}/check-in?token={token}&appt={appointment_id}"

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
    if _not_staff():
        return jsonify({'error': 'Only CPS staff can check students in. Please show this QR code at the CPS desk.'}), 403
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

    if datetime.now(timezone.utc).replace(tzinfo=None) > record.get('expires_at', datetime.now(timezone.utc).replace(tzinfo=None)):
        return jsonify({'error': 'QR code has expired'}), 410

    if str(record.get('appointment_id')) != str(appointment_id):
        return jsonify({'error': 'Token does not match appointment'}), 400

    # Mark token as used
    db.db.checkin_tokens.update_one(
        {'_id': record['_id']},
        {'$set': {'used': True, 'used_at': datetime.now(timezone.utc).replace(tzinfo=None)}}
    )

    # Mark appointment as checked in and update status
    db.db.appointments.update_one(
        {'_id': ObjectId(appointment_id)},
        {'$set': {'checked_in': True, 'checked_in_at': datetime.now(timezone.utc).replace(tzinfo=None), 'status': 'CHECKED_IN'}}
    )

    appt = db.db.appointments.find_one({'_id': ObjectId(appointment_id)})
    student = db.db.users.find_one({'_id': appt.get('student_id')}) if appt else None
    student_name = f"{student.get('first_name','')} {student.get('last_name','')}".strip() if student else 'Unknown'

    return jsonify({
        'success': True,
        'message': f'{student_name} checked in successfully',
        'student_name': student_name,
        'appointment_id': appointment_id,
        'checked_in_at': datetime.now(timezone.utc).replace(tzinfo=None).isoformat(),
    }), 200


@qr_bp.route('/verify-public', methods=['POST'])
@jwt_required()
def verify_checkin_public():
    """The check-in page a scanned QR code opens (/check-in). Staff only, see CHECKIN_ROLES."""
    if _not_staff():
        return jsonify({'error': 'Only CPS staff can check students in. Please show this QR code at the CPS desk.'}), 403
    data = request.get_json() or {}
    token = data.get('token')
    appointment_id = data.get('appointment_id') or data.get('appt')

    if not token or not appointment_id:
        return jsonify({'error': 'token and appointment_id are required'}), 400

    record = db.db.checkin_tokens.find_one({'token': token})
    if not record:
        return jsonify({'error': 'Invalid QR code'}), 404
    if record.get('used'):
        return jsonify({'error': 'This QR code has already been used'}), 409
    if datetime.now(timezone.utc).replace(tzinfo=None) > record.get('expires_at', datetime.now(timezone.utc).replace(tzinfo=None)):
        return jsonify({'error': 'QR code has expired. Ask the student to generate a new one.'}), 410
    if str(record.get('appointment_id')) != str(appointment_id):
        return jsonify({'error': 'QR code does not match this appointment'}), 400

    # Mark token as used
    db.db.checkin_tokens.update_one(
        {'_id': record['_id']},
        {'$set': {'used': True, 'used_at': datetime.now(timezone.utc).replace(tzinfo=None)}}
    )

    # Mark appointment as checked in and update status
    db.db.appointments.update_one(
        {'_id': ObjectId(appointment_id)},
        {'$set': {'checked_in': True, 'checked_in_at': datetime.now(timezone.utc).replace(tzinfo=None), 'status': 'CHECKED_IN'}}
    )

    appt = db.db.appointments.find_one({'_id': ObjectId(appointment_id)})
    student = db.db.users.find_one({'_id': appt.get('student_id')}) if appt else None
    counselor = db.db.users.find_one({'_id': appt.get('counselor_id')}) if appt and appt.get('counselor_id') else None

    student_name = f"{student.get('first_name','')} {student.get('last_name','')}".strip() if student else 'Unknown'
    counselor_name = f"{counselor.get('first_name','')} {counselor.get('last_name','')}".strip() if counselor else 'Not Assigned'

    scheduled = appt.get('scheduled_start') or appt.get('requested_start') if appt else None
    scheduled_str = scheduled.isoformat() if hasattr(scheduled, 'isoformat') else str(scheduled or '')

    return jsonify({
        'success': True,
        'student_name': student_name,
        'student_id_number': student.get('id_number', '') if student else '',
        'counselor_name': counselor_name,
        'appointment_type': appt.get('appointment_type', '') if appt else '',
        'purpose': appt.get('purpose', '') if appt else '',
        'scheduled_start': scheduled_str,
        'reference_id': appt.get('reference_id', '') if appt else '',
        'method': appt.get('preferred_method', 'in_person') if appt else '',
        'checked_in_at': datetime.now(timezone.utc).replace(tzinfo=None).isoformat(),
    }), 200


@qr_bp.route('/appointment-info/<appointment_id>', methods=['GET'])
@jwt_required()
def get_appointment_info(appointment_id):
    """Return full appointment details for the printable slip."""
    user_id = get_jwt_identity()
    try:
        appt = db.db.appointments.find_one({'_id': ObjectId(appointment_id)})
    except Exception:
        return jsonify({'error': 'Invalid appointment ID'}), 400

    if not appt:
        return jsonify({'error': 'Appointment not found'}), 404

    if str(appt.get('student_id')) != str(user_id):
        return jsonify({'error': 'Forbidden'}), 403

    student = db.db.users.find_one({'_id': appt.get('student_id')})
    counselor = db.db.users.find_one({'_id': appt.get('counselor_id')}) if appt.get('counselor_id') else None

    scheduled = appt.get('scheduled_start') or appt.get('requested_start')
    scheduled_str = scheduled.isoformat() if hasattr(scheduled, 'isoformat') else str(scheduled or '')

    return jsonify({
        'appointment_id': str(appt['_id']),
        'reference_id': appt.get('reference_id', f"CPS-{str(appt['_id'])[-8:].upper()}"),
        'student_name': f"{student.get('first_name','')} {student.get('last_name','')}".strip() if student else 'Unknown',
        'student_id_number': student.get('id_number', '') if student else '',
        'student_email': student.get('email', '') if student else '',
        'student_college': student.get('college', '') if student else '',
        'counselor_name': f"{counselor.get('first_name','')} {counselor.get('last_name','')}".strip() if counselor else 'To be assigned',
        'appointment_type': appt.get('appointment_type', ''),
        'purpose': appt.get('purpose', ''),
        'concern': appt.get('concern', ''),
        'scheduled_start': scheduled_str,
        'method': appt.get('preferred_method', 'in_person'),
        'status': appt.get('status', ''),
        'created_at': appt.get('created_at').isoformat() if hasattr(appt.get('created_at'), 'isoformat') else '',
    }), 200
