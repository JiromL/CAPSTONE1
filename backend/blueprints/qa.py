"""
QA blueprint — IC follow-up task management.
Routes: GET/POST /api/qa/follow-up, POST /api/qa/follow-up/<id>/log|complete
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime
from models import db

qa_bp = Blueprint('qa', __name__, url_prefix='/api/qa')


def _task_to_dict(task):
    due = task.get('due_date')
    return {
        '_id': str(task['_id']),
        'student_name': task.get('student_name', 'Unknown'),
        'method': task.get('method', 'email'),
        'phone': task.get('phone', ''),
        'email': task.get('email', ''),
        'due_date': due.isoformat() if isinstance(due, datetime) else due,
        'status': task.get('status', 'pending'),
        'notes': task.get('notes', ''),
    }


@qa_bp.route('/follow-up', methods=['GET'])
@jwt_required()
def list_follow_ups():
    status = request.args.get('status')
    query = {}
    if status:
        query['status'] = status
    tasks = list(db.db.qa_follow_ups.find(query).sort('due_date', 1).limit(200))
    return jsonify({'tasks': [_task_to_dict(t) for t in tasks]}), 200


@qa_bp.route('/follow-up', methods=['POST'])
@jwt_required()
def create_follow_up():
    """Create a QA follow-up task manually."""
    data = request.get_json() or {}
    required = ('student_name', 'email')
    for f in required:
        if not data.get(f):
            return jsonify({'error': f'{f} is required'}), 400

    task = {
        'student_name': data['student_name'],
        'method': data.get('method', 'email'),
        'phone': data.get('phone', ''),
        'email': data['email'],
        'due_date': datetime.utcnow(),
        'status': 'pending',
        'notes': data.get('notes', ''),
        'created_at': datetime.utcnow(),
    }
    result = db.db.qa_follow_ups.insert_one(task)
    task['_id'] = str(result.inserted_id)
    return jsonify(_task_to_dict(task)), 201


@qa_bp.route('/follow-up/<task_id>/log', methods=['POST'])
@jwt_required()
def log_follow_up(task_id):
    try:
        oid = ObjectId(task_id)
    except Exception:
        return jsonify({'error': 'Invalid task ID'}), 400
    result = db.db.qa_follow_ups.update_one(
        {'_id': oid},
        {'$set': {'status': 'attempted', 'attempted_at': datetime.utcnow()}}
    )
    if result.matched_count == 0:
        return jsonify({'error': 'Task not found'}), 404
    return jsonify({'success': True, 'status': 'attempted'}), 200


@qa_bp.route('/follow-up/<task_id>/complete', methods=['POST'])
@jwt_required()
def complete_follow_up(task_id):
    try:
        oid = ObjectId(task_id)
    except Exception:
        return jsonify({'error': 'Invalid task ID'}), 400
    result = db.db.qa_follow_ups.update_one(
        {'_id': oid},
        {'$set': {'status': 'completed', 'completed_at': datetime.utcnow()}}
    )
    if result.matched_count == 0:
        return jsonify({'error': 'Task not found'}), 404
    return jsonify({'success': True, 'status': 'completed'}), 200
