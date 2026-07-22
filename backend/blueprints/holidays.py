from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db
from bson import ObjectId
from utils import audit_log
from datetime import datetime

holidays_bp = Blueprint('holidays', __name__, url_prefix='/api/holidays')


def _is_admin(user_id: str) -> bool:
    try:
        u = db.db.users.find_one({'_id': ObjectId(user_id)})
        return u and u.get('role') == 'ADMIN'
    except Exception:
        return False


def is_holiday(date: datetime) -> dict | None:
    """Return holiday doc if date is a declared holiday, else None."""
    date_str = date.strftime('%Y-%m-%d')
    return db.db.holidays.find_one({'date': date_str})


@holidays_bp.route('', methods=['GET'])
@jwt_required()
def list_holidays():
    year = request.args.get('year')
    query = {}
    if year:
        try:
            y = int(year)
            query['date'] = {'$gte': f'{y}-01-01', '$lte': f'{y}-12-31'}
        except ValueError:
            return jsonify({'error': 'year must be an integer'}), 400

    docs = list(db.db.holidays.find(query).sort('date', 1))
    return jsonify({
        'holidays': [
            {'id': str(d['_id']), 'date': d['date'], 'name': d['name'],
             'description': d.get('description', '')}
            for d in docs
        ]
    }), 200


@holidays_bp.route('/check', methods=['GET'])
@jwt_required()
def check_holiday():
    date_str = request.args.get('date')
    if not date_str:
        return jsonify({'error': 'date is required (YYYY-MM-DD)'}), 400
    doc = db.db.holidays.find_one({'date': date_str})
    if doc:
        return jsonify({'is_holiday': True, 'name': doc['name'],
                        'description': doc.get('description', '')}), 200
    return jsonify({'is_holiday': False}), 200


@holidays_bp.route('', methods=['POST'])
@jwt_required()
def create_holiday():
    user_id = get_jwt_identity()
    if not _is_admin(user_id):
        return jsonify({'error': 'Admin access required'}), 403

    data = request.get_json() or {}
    date_str = data.get('date', '').strip()
    name = data.get('name', '').strip()
    if not date_str or not name:
        return jsonify({'error': 'date and name are required'}), 400
    try:
        datetime.strptime(date_str, '%Y-%m-%d')
    except ValueError:
        return jsonify({'error': 'date must be YYYY-MM-DD'}), 400

    if db.db.holidays.find_one({'date': date_str}):
        return jsonify({'error': f'A holiday already exists on {date_str}'}), 409

    doc = {
        'date': date_str,
        'name': name,
        'description': data.get('description', ''),
        'created_by': user_id,
        'created_at': datetime.utcnow(),
    }
    result = db.db.holidays.insert_one(doc)
    audit_log(db.db, 'holidays', 'create', entity_id=str(result.inserted_id),
              new_values={'date': date_str, 'name': name})
    return jsonify({'id': str(result.inserted_id), 'message': 'Holiday created'}), 201


@holidays_bp.route('/<holiday_id>', methods=['PUT'])
@jwt_required()
def update_holiday(holiday_id):
    user_id = get_jwt_identity()
    if not _is_admin(user_id):
        return jsonify({'error': 'Admin access required'}), 403
    try:
        oid = ObjectId(holiday_id)
    except Exception:
        return jsonify({'error': 'Invalid holiday ID'}), 400

    data = request.get_json() or {}
    updates = {}
    if 'date' in data:
        try:
            datetime.strptime(data['date'], '%Y-%m-%d')
        except ValueError:
            return jsonify({'error': 'date must be YYYY-MM-DD'}), 400
        updates['date'] = data['date']
    if 'name' in data:
        updates['name'] = data['name'].strip()
    if 'description' in data:
        updates['description'] = data['description']
    if not updates:
        return jsonify({'error': 'Nothing to update'}), 400

    result = db.db.holidays.update_one({'_id': oid}, {'$set': updates})
    if result.matched_count == 0:
        return jsonify({'error': 'Holiday not found'}), 404
    audit_log(db.db, 'holidays', 'update', entity_id=holiday_id, new_values=updates)
    return jsonify({'message': 'Holiday updated'}), 200


@holidays_bp.route('/<holiday_id>', methods=['DELETE'])
@jwt_required()
def delete_holiday(holiday_id):
    user_id = get_jwt_identity()
    if not _is_admin(user_id):
        return jsonify({'error': 'Admin access required'}), 403
    try:
        oid = ObjectId(holiday_id)
    except Exception:
        return jsonify({'error': 'Invalid holiday ID'}), 400

    result = db.db.holidays.delete_one({'_id': oid})
    if result.deleted_count == 0:
        return jsonify({'error': 'Holiday not found'}), 404
    audit_log(db.db, 'holidays', 'delete', entity_id=holiday_id)
    return jsonify({'message': 'Holiday deleted'}), 200
