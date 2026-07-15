"""
Forms blueprint — IC review of submitted intake packets.
Routes: GET /api/forms, POST /api/forms/<id>/approve|revise
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime
from models import db

forms_bp = Blueprint('forms', __name__, url_prefix='/api/forms')


def _packet_to_form(packet, appointments_map=None):
    apt_id = packet.get('appointment_id')
    apt = (appointments_map or {}).get(str(apt_id)) if apt_id else None
    student_name = (
        apt.get('student_name') if apt else None
    ) or packet.get('student_name', 'Unknown Student')
    submitted = packet.get('created_at') or packet.get('updated_at')
    return {
        '_id': str(packet['_id']),
        'student_name': student_name,
        'form_type': packet.get('source', 'intake').replace('_', ' ').title() + ' Packet',
        'submitted_date': submitted.isoformat() if isinstance(submitted, datetime) else submitted,
        'status': packet.get('review_status', 'pending'),
    }


@forms_bp.route('', methods=['GET'])
@jwt_required()
def list_forms():
    status = request.args.get('status', 'pending_review')
    # pending_review maps to the 'pending' review_status (no review_status set yet)
    query = {}
    if status == 'pending_review':
        query['$or'] = [
            {'review_status': {'$exists': False}},
            {'review_status': 'pending'},
        ]
    elif status != 'all':
        query['review_status'] = status

    packets = list(db.db.intake_packets.find(query).sort('created_at', -1).limit(100))
    if not packets:
        return jsonify({'forms': []}), 200

    # Batch-load appointments for student names
    apt_ids = [p['appointment_id'] for p in packets if p.get('appointment_id')]
    apts = db.db.appointments.find({'_id': {'$in': apt_ids}}, {'student_name': 1})
    apt_map = {str(a['_id']): a for a in apts}

    return jsonify({'forms': [_packet_to_form(p, apt_map) for p in packets]}), 200


@forms_bp.route('/<form_id>/approve', methods=['POST'])
@jwt_required()
def approve_form(form_id):
    try:
        oid = ObjectId(form_id)
    except Exception:
        return jsonify({'error': 'Invalid form ID'}), 400
    result = db.db.intake_packets.update_one(
        {'_id': oid},
        {'$set': {'review_status': 'approved', 'reviewed_at': datetime.utcnow()}}
    )
    if result.matched_count == 0:
        return jsonify({'error': 'Form not found'}), 404
    return jsonify({'success': True, 'status': 'approved'}), 200


@forms_bp.route('/<form_id>/revise', methods=['POST'])
@jwt_required()
def revise_form(form_id):
    try:
        oid = ObjectId(form_id)
    except Exception:
        return jsonify({'error': 'Invalid form ID'}), 400
    result = db.db.intake_packets.update_one(
        {'_id': oid},
        {'$set': {'review_status': 'revision', 'reviewed_at': datetime.utcnow()}}
    )
    if result.matched_count == 0:
        return jsonify({'error': 'Form not found'}), 404
    return jsonify({'success': True, 'status': 'revision'}), 200
