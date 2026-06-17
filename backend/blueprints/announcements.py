"""
Announcements Blueprint - CPS posts events, webinars, and important notices
Staff create announcements; all authenticated users can read them.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt
from functools import wraps
from bson import ObjectId
from datetime import datetime
from models import db

announcements_bp = Blueprint('announcements', __name__, url_prefix='/api/announcements')

ALL_STAFF_ROLES  = {'COUNSELOR','PSYCHOLOGIST','IC','INTAKE_COUNSELOR','SUPPORT_STAFF','STAFF','ADMIN','DPO'}
POSTER_ROLES     = {'PSYCHOLOGIST','ADMIN','DPO'}   # only these can create/delete

EVENT_TYPES = {'webinar', 'event', 'notice', 'info'}


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            verify_jwt_in_request()
            return f(*args, **kwargs)
        except Exception:
            return jsonify({'error': 'Unauthorized'}), 401
    return decorated


def poster_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get('role', '').upper() not in POSTER_ROLES:
                return jsonify({'error': 'Only psychologists or admins can manage announcements'}), 403
            return f(*args, **kwargs)
        except Exception:
            return jsonify({'error': 'Unauthorized'}), 401
    return decorated


def _serialize(doc: dict) -> dict:
    doc['id'] = str(doc.pop('_id'))
    if doc.get('event_date'):
        doc['event_date'] = doc['event_date'].isoformat()
    if doc.get('created_at'):
        doc['created_at'] = doc['created_at'].isoformat()
    doc.pop('created_by', None)
    return doc


@announcements_bp.route('/can-post', methods=['GET'])
@token_required
def can_post():
    """Returns whether the current user can create announcements."""
    claims = get_jwt()
    allowed = claims.get('role', '').upper() in POSTER_ROLES
    return jsonify({'can_post': allowed}), 200


@announcements_bp.route('', methods=['GET'])
@token_required
def list_announcements():
    """Return active announcements, newest first. Optionally limit with ?limit=N"""
    try:
        limit = min(int(request.args.get('limit', 10)), 50)
    except (ValueError, TypeError):
        limit = 10

    cursor = db.db.announcements.find(
        {'is_active': True},
        sort=[('pinned', -1), ('created_at', -1)],
    ).limit(limit)

    items = [_serialize(doc) for doc in cursor]
    return jsonify({'announcements': items, 'total': len(items)}), 200


@announcements_bp.route('', methods=['POST'])
@poster_required
def create_announcement():
    """Staff creates a new announcement."""
    data = request.get_json() or {}
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({'error': 'Title is required'}), 400

    event_type = data.get('event_type', 'info')
    if event_type not in EVENT_TYPES:
        event_type = 'info'

    event_date = None
    if data.get('event_date'):
        try:
            event_date = datetime.fromisoformat(data['event_date'].replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            pass

    claims    = get_jwt()
    user_id_s = claims.get('sub')
    try:
        user_oid = ObjectId(user_id_s)
    except Exception:
        user_oid = None

    doc = {
        'title':      title,
        'body':       (data.get('body') or '').strip(),
        'event_type': event_type,
        'event_date': event_date,
        'link':       (data.get('link') or '').strip(),
        'pinned':     bool(data.get('pinned', False)),
        'is_active':  True,
        'created_by': user_oid,
        'created_at': datetime.utcnow(),
    }

    result = db.db.announcements.insert_one(doc)
    doc['_id'] = result.inserted_id
    return jsonify({'announcement': _serialize(doc), 'message': 'Created'}), 201


@announcements_bp.route('/<announcement_id>', methods=['DELETE'])
@poster_required
def delete_announcement(announcement_id: str):
    """Soft-delete an announcement."""
    try:
        oid = ObjectId(announcement_id)
    except Exception:
        return jsonify({'error': 'Invalid id'}), 400

    result = db.db.announcements.update_one({'_id': oid}, {'$set': {'is_active': False}})
    if result.matched_count == 0:
        return jsonify({'error': 'Not found'}), 404
    return jsonify({'message': 'Deleted'}), 200
