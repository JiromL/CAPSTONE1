"""
Reservations blueprint
Provides simple endpoints to list and create reservations.
"""

from flask import Blueprint, request, jsonify
from bson.objectid import ObjectId
from models import db
from datetime import datetime

reservations_bp = Blueprint('reservations', __name__, url_prefix='/api/reservations')


@reservations_bp.route('', methods=['GET'])
def list_reservations():
    docs = list(db.db.reservations.find().sort('created_at', -1).limit(100))
    def serialize(d):
        return {
            'id': str(d.get('_id')),
            'user_id': d.get('user_id'),
            'date': d.get('date'),
            'time': d.get('time'),
            'party_size': d.get('party_size'),
            'status': d.get('status', 'confirmed'),
            'created_at': d.get('created_at')
        }

    return jsonify({'reservations': [serialize(d) for d in docs]}), 200


@reservations_bp.route('/<reservation_id>', methods=['GET'])
def get_reservation(reservation_id):
    try:
        doc = db.db.reservations.find_one({'_id': ObjectId(reservation_id)})
    except Exception:
        doc = db.db.reservations.find_one({'_id': reservation_id})

    if not doc:
        return jsonify({'error': 'Not found'}), 404

    return jsonify({
        'id': str(doc.get('_id')),
        'user_id': doc.get('user_id'),
        'date': doc.get('date'),
        'time': doc.get('time'),
        'party_size': doc.get('party_size'),
        'status': doc.get('status', 'confirmed'),
        'created_at': doc.get('created_at')
    }), 200


@reservations_bp.route('', methods=['POST'])
def create_reservation():
    data = request.get_json() or {}
    required = ['user_id', 'date', 'time', 'party_size']
    if not all(k in data for k in required):
        return jsonify({'error': f'Missing fields, required: {required}'}), 400

    doc = {
        'user_id': data.get('user_id'),
        'date': data.get('date'),
        'time': data.get('time'),
        'party_size': data.get('party_size'),
        'status': data.get('status', 'confirmed'),
        'created_at': datetime.utcnow().isoformat()
    }

    res = db.db.reservations.insert_one(doc)
    doc['_id'] = res.inserted_id

    return jsonify({'message': 'Reservation created', 'data': {
        'id': str(doc.get('_id')),
        'user_id': doc.get('user_id'),
        'date': doc.get('date'),
        'time': doc.get('time'),
        'party_size': doc.get('party_size'),
        'status': doc.get('status'),
        'created_at': doc.get('created_at')
    }}), 201
