"""
Waitlist Blueprint - Queue students when all counselor slots are full
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from bson import ObjectId
from datetime import datetime
from models import db
from utils import audit_log

waitlist_bp = Blueprint('waitlist', __name__, url_prefix='/api/waitlist')

STAFF_ROLES = ['STAFF', 'ADMIN', 'COUNSELOR', 'PSYCHOLOGIST', 'IC', 'DPO']


def _role():
    return get_jwt().get('role', '')


def _obj(id_str):
    try:
        return ObjectId(id_str)
    except Exception:
        return id_str


# ── Join Waitlist ─────────────────────────────────────────────────────────────

@waitlist_bp.route('/join', methods=['POST'])
@jwt_required()
def join_waitlist():
    """Student joins the waitlist when no slots are available"""
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    user_id_obj = _obj(user_id)
    user = db.db.users.find_one({'_id': user_id_obj})
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Prevent duplicates
    existing = db.db.waitlist.find_one({
        'student_id': user_id_obj,
        'status': 'waiting'
    })
    if existing:
        return jsonify({
            'error': 'You are already on the waitlist',
            'waitlist_id': str(existing['_id']),
            'position': existing.get('position', 1)
        }), 409

    # Get next position
    last = db.db.waitlist.find_one({'status': 'waiting'}, sort=[('position', -1)])
    position = (last['position'] + 1) if last else 1

    entry = {
        'student_id': user_id_obj,
        'student_name': f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
        'student_email': user.get('email', ''),
        'reason': data.get('reason', ''),
        'concern': data.get('concern', ''),
        'preferred_method': data.get('preferred_method', 'in_person'),
        'position': position,
        'status': 'waiting',
        'notes': data.get('notes', ''),
        'joined_at': datetime.utcnow(),
        'updated_at': datetime.utcnow(),
    }

    result = db.db.waitlist.insert_one(entry)
    audit_log(db.db, 'waitlist', 'join', entity_id=str(result.inserted_id))

    return jsonify({
        'message': 'You have been added to the waitlist',
        'waitlist_id': str(result.inserted_id),
        'position': position
    }), 201


# ── Student: my waitlist status ───────────────────────────────────────────────

@waitlist_bp.route('/my-status', methods=['GET'])
@jwt_required()
def my_waitlist_status():
    user_id = get_jwt_identity()
    user_id_obj = _obj(user_id)

    entry = db.db.waitlist.find_one({
        'student_id': user_id_obj,
        'status': 'waiting'
    })

    if not entry:
        return jsonify({'on_waitlist': False}), 200

    # Recalculate live position
    ahead = db.db.waitlist.count_documents({
        'status': 'waiting',
        'joined_at': {'$lt': entry['joined_at']}
    })

    return jsonify({
        'on_waitlist': True,
        'waitlist_id': str(entry['_id']),
        'position': ahead + 1,
        'joined_at': entry['joined_at'].isoformat(),
        'concern': entry.get('concern', ''),
        'preferred_method': entry.get('preferred_method', ''),
    }), 200


# ── List Waitlist (Staff) ─────────────────────────────────────────────────────

@waitlist_bp.route('/', methods=['GET'])
@jwt_required()
def list_waitlist():
    if _role() not in STAFF_ROLES:
        return jsonify({'error': 'Insufficient permissions'}), 403

    status_filter = request.args.get('status', 'waiting')
    query = {}
    if status_filter != 'all':
        query['status'] = status_filter

    entries = list(db.db.waitlist.find(query).sort('position', 1))

    result = []
    for e in entries:
        result.append({
            'id': str(e['_id']),
            'student_id': str(e.get('student_id', '')),
            'student_name': e.get('student_name', 'Unknown'),
            'student_email': e.get('student_email', ''),
            'reason': e.get('reason', ''),
            'concern': e.get('concern', ''),
            'preferred_method': e.get('preferred_method', 'in_person'),
            'position': e.get('position', 0),
            'status': e.get('status', 'waiting'),
            'notes': e.get('notes', ''),
            'joined_at': e['joined_at'].isoformat() if isinstance(e.get('joined_at'), datetime) else str(e.get('joined_at', '')),
            'promoted_at': e['promoted_at'].isoformat() if isinstance(e.get('promoted_at'), datetime) else None,
        })

    return jsonify({'waitlist': result, 'total': len(result)}), 200


# ── Promote (Staff: move student from waitlist → active appointment request) ──

@waitlist_bp.route('/<entry_id>/promote', methods=['POST'])
@jwt_required()
def promote_from_waitlist(entry_id):
    if _role() not in STAFF_ROLES:
        return jsonify({'error': 'Insufficient permissions'}), 403

    entry = db.db.waitlist.find_one({'_id': _obj(entry_id)})
    if not entry:
        return jsonify({'error': 'Waitlist entry not found'}), 404
    if entry.get('status') != 'waiting':
        return jsonify({'error': 'Student is not waiting'}), 400

    data = request.get_json() or {}
    notes = data.get('notes', 'Promoted from waitlist')

    # Mark as promoted
    db.db.waitlist.update_one(
        {'_id': entry['_id']},
        {'$set': {
            'status': 'promoted',
            'promoted_at': datetime.utcnow(),
            'promoted_notes': notes,
            'updated_at': datetime.utcnow(),
        }}
    )

    # Re-number remaining waiting entries
    remaining = list(db.db.waitlist.find({'status': 'waiting'}).sort('joined_at', 1))
    for i, r in enumerate(remaining):
        db.db.waitlist.update_one({'_id': r['_id']}, {'$set': {'position': i + 1}})

    # Notify student (in-app notification record)
    db.db.notifications.insert_one({
        'user_id': entry.get('student_id'),
        'type': 'waitlist_promoted',
        'message': 'A slot is now available for you! Please book your appointment.',
        'read': False,
        'created_at': datetime.utcnow(),
    })

    audit_log(db.db, 'waitlist', 'promote', entity_id=entry_id)
    return jsonify({'message': 'Student promoted from waitlist', 'student_name': entry.get('student_name')}), 200


# ── Remove from Waitlist ──────────────────────────────────────────────────────

@waitlist_bp.route('/<entry_id>', methods=['DELETE'])
@jwt_required()
def remove_from_waitlist(entry_id):
    user_id = get_jwt_identity()
    role = _role()

    entry = db.db.waitlist.find_one({'_id': _obj(entry_id)})
    if not entry:
        return jsonify({'error': 'Waitlist entry not found'}), 404

    # Student can remove themselves; staff can remove anyone
    is_own = str(entry.get('student_id', '')) == str(_obj(user_id))
    if not is_own and role not in STAFF_ROLES:
        return jsonify({'error': 'Insufficient permissions'}), 403

    db.db.waitlist.update_one(
        {'_id': entry['_id']},
        {'$set': {'status': 'removed', 'updated_at': datetime.utcnow()}}
    )

    # Re-number remaining
    remaining = list(db.db.waitlist.find({'status': 'waiting'}).sort('joined_at', 1))
    for i, r in enumerate(remaining):
        db.db.waitlist.update_one({'_id': r['_id']}, {'$set': {'position': i + 1}})

    audit_log(db.db, 'waitlist', 'remove', entity_id=entry_id)
    return jsonify({'message': 'Removed from waitlist'}), 200


# ── Stats ─────────────────────────────────────────────────────────────────────

@waitlist_bp.route('/stats', methods=['GET'])
@jwt_required()
def waitlist_stats():
    if _role() not in STAFF_ROLES:
        return jsonify({'error': 'Insufficient permissions'}), 403

    total_waiting = db.db.waitlist.count_documents({'status': 'waiting'})
    total_promoted = db.db.waitlist.count_documents({'status': 'promoted'})
    total_removed = db.db.waitlist.count_documents({'status': 'removed'})

    return jsonify({
        'waiting': total_waiting,
        'promoted': total_promoted,
        'removed': total_removed,
        'total': total_waiting + total_promoted + total_removed,
    }), 200
