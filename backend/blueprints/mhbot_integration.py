"""
MHBot Integration Blueprint
Per-user authentication — each counselor logs in with their own MHBot account.
Token is stored in the user's MongoDB record and used for all MHBot API calls.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import requests
from datetime import datetime, timedelta
from bson import ObjectId
from models import db, PermissionType
from utils import user_has_permission
import os
import logging

logger = logging.getLogger(__name__)

mhbot_bp = Blueprint('mhbot', __name__, url_prefix='/api/mhbot')

MHBOT_BASE_URL = os.getenv('MHBOT_BASE_URL', 'https://pchrd-ema.dlsu.edu.ph/backend')


# ── Per-user token helpers ────────────────────────────────────────────────────

def _resolve_user_id(user_id):
    """Return user_id in the form stored in the DB (_id is a plain string here)."""
    return user_id


def _get_user_token(user_id) -> str:
    """Return stored MHBot token for the CPS user, or '' if missing/expired."""
    user = db.db.users.find_one({'_id': _resolve_user_id(user_id)})
    if not user:
        return ''
    token = user.get('mhbot_token', '')
    expires_at = user.get('mhbot_token_expires_at')
    if not token:
        return ''
    if expires_at and datetime.utcnow() > expires_at:
        return ''
    return token


def _auth_headers(token: str) -> dict:
    return {'accept': 'application/json', 'Authorization': f'Bearer {token}'}


# ── Core PERMA fetch (token passed in explicitly) ─────────────────────────────

def get_perma_history(username: str, token: str, limit: int = 5) -> dict:
    if not token:
        return {'success': False, 'error': 'Not connected to MHBot. Please log in first.', 'data': []}

    url = f"{MHBOT_BASE_URL}/api/v1/dashboard/user_perma_history/{username}"
    try:
        resp = requests.get(url, headers=_auth_headers(token), params={'offset': 0, 'limit': limit}, timeout=10)
        if resp.status_code == 200:
            history = resp.json()
            return {
                'success': True,
                'data': history,
                'latest_label': history[0]['perma_label'] if history and history[0].get('perma_label') else None,
                'latest_date': history[0]['date'] if history else None,
            }
        return {'success': False, 'error': f'MHBot API error: {resp.status_code}', 'data': []}
    except requests.exceptions.Timeout:
        return {'success': False, 'error': 'MHBot server not responding (timeout)', 'data': []}
    except requests.exceptions.ConnectionError:
        return {'success': False, 'error': 'Cannot connect to MHBot server', 'data': []}
    except Exception as e:
        return {'success': False, 'error': str(e), 'data': []}


# ── Auth endpoints ─────────────────────────────────────────────────────────────

@mhbot_bp.route('/auth/login', methods=['POST'])
@jwt_required()
def mhbot_login():
    """Exchange MHBot username/password for a token and store it on the user record."""
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400

    url = f"{MHBOT_BASE_URL}/api/v1/auth/login"
    try:
        resp = requests.post(url, data={
            'grant_type': 'password',
            'username': username,
            'password': password,
            'scope': 'dashboard',
        }, headers={'accept': 'application/json'}, timeout=10)
    except requests.exceptions.Timeout:
        return jsonify({'error': 'MHBot server not responding'}), 504
    except requests.exceptions.ConnectionError:
        return jsonify({'error': 'Cannot connect to MHBot server'}), 503
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    if resp.status_code != 200:
        try:
            detail = resp.json().get('detail', resp.text[:100])
        except Exception:
            detail = resp.text[:100]
        return jsonify({'error': f'MHBot login failed: {detail}'}), 401

    payload = resp.json()
    token = payload.get('access_token', '')
    expires_in = int(payload.get('expires_in', 1800))
    expires_at = datetime.utcnow() + timedelta(seconds=expires_in - 60)

    db.db.users.update_one(
        {'_id': _resolve_user_id(user_id)},
        {'$set': {
            'mhbot_token': token,
            'mhbot_token_expires_at': expires_at,
            'mhbot_username': username,
            'mhbot_linked_at': datetime.utcnow(),
        }}
    )

    return jsonify({'success': True, 'mhbot_username': username}), 200


@mhbot_bp.route('/auth/set-identifier', methods=['POST'])
@jwt_required()
def set_ema_identifier():
    """Store the user's EMA internal identifier (ema_XXX) after login is verified."""
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    identifier = data.get('identifier', '').strip()
    if not identifier:
        return jsonify({'error': 'identifier is required'}), 400

    # Make sure the user has a valid MHBot token first (i.e. they completed step 1)
    user = db.db.users.find_one({'_id': _resolve_user_id(user_id)}, {'mhbot_token': 1, 'mhbot_token_expires_at': 1})
    if not user or not user.get('mhbot_token'):
        return jsonify({'error': 'Complete EMA login first'}), 401

    db.db.users.update_one(
        {'_id': _resolve_user_id(user_id)},
        {'$set': {'mhbot_username': identifier}}
    )
    return jsonify({'success': True, 'mhbot_username': identifier}), 200


@mhbot_bp.route('/auth/logout', methods=['POST'])
@jwt_required()
def mhbot_logout():
    """Clear the stored MHBot token for the current user."""
    user_id = get_jwt_identity()
    db.db.users.update_one(
        {'_id': _resolve_user_id(user_id)},
        {'$unset': {'mhbot_token': '', 'mhbot_token_expires_at': ''}}
    )
    return jsonify({'success': True}), 200


@mhbot_bp.route('/auth/status', methods=['GET'])
@jwt_required()
def mhbot_auth_status():
    """Return whether the current user has a valid MHBot session."""
    user_id = get_jwt_identity()
    user = db.db.users.find_one({'_id': _resolve_user_id(user_id)})
    if not user:
        return jsonify({'connected': False}), 200

    token = user.get('mhbot_token', '')
    expires_at = user.get('mhbot_token_expires_at')

    if not token:
        return jsonify({'connected': False}), 200
    if expires_at and datetime.utcnow() > expires_at:
        return jsonify({'connected': False, 'expired': True}), 200

    return jsonify({
        'connected': True,
        'mhbot_username': user.get('mhbot_username', ''),
    }), 200


# ── Data endpoints (use caller's token) ───────────────────────────────────────

@mhbot_bp.route('/perma/<username>', methods=['GET'])
@jwt_required()
def get_user_perma(username):
    user_id = get_jwt_identity()
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403

    token = _get_user_token(user_id)
    if not token:
        return jsonify({'error': 'Not connected to MHBot. Please log in via the MHBot page.'}), 401

    limit = min(request.args.get('limit', 5, type=int), 100)
    result = get_perma_history(username, token, limit)

    if result['success']:
        return jsonify({
            'username': username,
            'latest_label': result['latest_label'],
            'latest_date': result['latest_date'],
            'history': result['data'],
        }), 200
    return jsonify({'error': result['error'], 'username': username}), 400


@mhbot_bp.route('/lookup', methods=['POST'])
@jwt_required()
def lookup_perma_by_username():
    user_id = get_jwt_identity()
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403

    token = _get_user_token(user_id)
    if not token:
        return jsonify({'error': 'Not connected to MHBot. Please log in via the MHBot page.'}), 401

    data = request.get_json() or {}
    username = data.get('username', '').strip()
    if not username:
        return jsonify({'error': 'Username required'}), 400

    result = get_perma_history(username, token, limit=10)
    if result['success']:
        return jsonify({
            'username': username,
            'success': True,
            'latest_label': result['latest_label'],
            'latest_date': result['latest_date'],
            'history': result['data'],
        }), 200
    return jsonify({'username': username, 'success': False, 'error': result['error']}), 400


@mhbot_bp.route('/batch-labels', methods=['POST'])
@jwt_required()
def batch_perma_labels():
    """Return latest PERMA label for a list of mhbot usernames.
    Used by staff views to enrich lists without N individual requests."""
    user_id = get_jwt_identity()
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403

    token = _get_user_token(user_id)
    if not token:
        return jsonify({'error': 'Not connected to MHBot'}), 401

    data = request.get_json() or {}
    usernames = data.get('usernames', [])
    if not usernames:
        return jsonify({'labels': {}}), 200

    labels = {}
    for username in usernames[:50]:  # cap at 50 to avoid abuse
        if not username:
            continue
        r = get_perma_history(username, token, limit=1)
        labels[username] = r['latest_label'] if r['success'] else None

    return jsonify({'labels': labels}), 200


@mhbot_bp.route('/students/pending', methods=['GET'])
@jwt_required()
def get_pending_students_with_perma():
    user_id = get_jwt_identity()
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403

    token = _get_user_token(user_id)
    if not token:
        return jsonify({'error': 'Not connected to MHBot. Please log in via the MHBot page.'}), 401

    try:
        pending = db.db.appointments.find({'status': {'$in': ['REQUESTED', 'PENDING_APPROVAL']}}).sort('requested_start', -1)
        results = []
        for apt in pending:
            case = db.db.cases.find_one({'_id': apt.get('case_id')})
            if not case:
                continue
            student = db.db.users.find_one({'_id': case.get('student_id')})
            if not student:
                continue

            perma_data = None
            mhbot_un = student.get('mhbot_username')
            if mhbot_un:
                r = get_perma_history(mhbot_un, token, limit=1)
                if r['success']:
                    perma_data = {'label': r['latest_label'], 'date': r['latest_date']}

            results.append({
                'appointment_id': str(apt['_id']),
                'case_id': str(case['_id']),
                'student_id': str(student['_id']),
                'student_name': f"{student.get('first_name', '')} {student.get('last_name', '')}".strip(),
                'student_email': student.get('email'),
                'mhbot_username': mhbot_un,
                'requested_start': apt.get('requested_start'),
                'requested_end': apt.get('requested_end'),
                'appointment_type': apt.get('appointment_type'),
                'perma_status': perma_data,
                'case_status': case.get('status'),
            })

        return jsonify({'total': len(results), 'students': results}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@mhbot_bp.route('/case/<case_id>/link-mhbot', methods=['POST'])
@jwt_required()
def link_case_to_mhbot(case_id):
    user_id = get_jwt_identity()
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403

    token = _get_user_token(user_id)
    if not token:
        return jsonify({'error': 'Not connected to MHBot. Please log in via the MHBot page.'}), 401

    data = request.get_json() or {}
    mhbot_username = data.get('mhbot_username', '').strip()
    if not mhbot_username:
        return jsonify({'error': 'MHBot username required'}), 400

    try:
        case = db.db.cases.find_one({'_id': ObjectId(case_id)})
    except Exception:
        case = db.db.cases.find_one({'_id': case_id})
    if not case:
        return jsonify({'error': 'Case not found'}), 404

    perma_result = get_perma_history(mhbot_username, token, limit=1)
    if not perma_result['success']:
        return jsonify({'error': 'Invalid MHBot username', 'mhbot_error': perma_result['error']}), 400

    db.db.users.update_one(
        {'_id': case.get('student_id')},
        {'$set': {'mhbot_username': mhbot_username, 'mhbot_linked_at': datetime.utcnow()}}
    )

    return jsonify({
        'success': True,
        'message': 'MHBot username linked successfully',
        'case_id': str(case['_id']),
        'mhbot_username': mhbot_username,
        'latest_perma_label': perma_result['latest_label'],
    }), 200


@mhbot_bp.route('/case/<case_id>/unlink-mhbot', methods=['POST'])
@jwt_required()
def unlink_case_from_mhbot(case_id):
    user_id = get_jwt_identity()
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403

    try:
        case = db.db.cases.find_one({'_id': ObjectId(case_id)})
    except Exception:
        case = db.db.cases.find_one({'_id': case_id})
    if not case:
        return jsonify({'error': 'Case not found'}), 404

    student = db.db.users.find_one({'_id': case.get('student_id')})
    old_username = student.get('mhbot_username') if student else None

    db.db.users.update_one(
        {'_id': case.get('student_id')},
        {'$unset': {'mhbot_username': '', 'mhbot_linked_at': ''}}
    )

    return jsonify({'success': True, 'removed_username': old_username}), 200


@mhbot_bp.route('/stats/perma-distribution', methods=['GET'])
@jwt_required()
def get_perma_distribution():
    user_id = get_jwt_identity()
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403

    token = _get_user_token(user_id)
    if not token:
        return jsonify({'error': 'Not connected to MHBot. Please log in via the MHBot page.'}), 401

    try:
        labels = ['Excelling', 'Thriving', 'Surviving', 'Struggling', 'In Crisis']
        counts = {l: 0 for l in labels}
        counts['No Data'] = 0
        total = 0

        for student in db.db.users.find({'mhbot_username': {'$exists': True, '$ne': None}}):
            total += 1
            r = get_perma_history(student['mhbot_username'], token, limit=1)
            label = r['latest_label'] if r['success'] else None
            if label in counts:
                counts[label] += 1
            else:
                counts['No Data'] += 1

        return jsonify({'total_students_tracked': total, 'distribution': counts}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@mhbot_bp.route('/my-perma', methods=['GET'])
@jwt_required()
def get_my_perma():
    """Student endpoint — fetch their own PERMA history using their stored token."""
    user_id = get_jwt_identity()
    user = db.db.users.find_one({'_id': _resolve_user_id(user_id)})
    if not user:
        return jsonify({'error': 'User not found'}), 404

    token = user.get('mhbot_token', '')
    expires_at = user.get('mhbot_token_expires_at')
    mhbot_username = user.get('mhbot_username', '')

    if not token:
        return jsonify({'connected': False, 'error': 'Not connected to MHBot'}), 200
    if expires_at and datetime.utcnow() > expires_at:
        return jsonify({'connected': False, 'expired': True, 'error': 'MHBot session expired'}), 200
    if not mhbot_username:
        return jsonify({'connected': False, 'error': 'No MHBot username on record'}), 200

    limit = min(request.args.get('limit', 10, type=int), 100)
    result = get_perma_history(mhbot_username, token, limit)

    return jsonify({
        'connected': True,
        'mhbot_username': mhbot_username,
        'latest_label': result.get('latest_label'),
        'latest_date': result.get('latest_date'),
        'history': result.get('data', []),
        'fetch_error': None if result['success'] else result['error'],
    }), 200


@mhbot_bp.route('/health', methods=['GET'])
def check_mhbot_health():
    """Ping MHBot server — no auth required."""
    try:
        resp = requests.get(f"{MHBOT_BASE_URL}/ping", timeout=5)
        if resp.status_code == 200:
            return jsonify({'status': 'healthy', 'mhbot_server': MHBOT_BASE_URL}), 200
        return jsonify({'status': 'unhealthy', 'mhbot_server': MHBOT_BASE_URL, 'error': f'HTTP {resp.status_code}'}), 503
    except requests.exceptions.Timeout:
        return jsonify({'status': 'timeout', 'mhbot_server': MHBOT_BASE_URL, 'error': 'Server not responding'}), 503
    except requests.exceptions.ConnectionError as e:
        return jsonify({'status': 'error', 'mhbot_server': MHBOT_BASE_URL, 'error': str(e)[:100]}), 503
    except Exception as e:
        return jsonify({'status': 'error', 'mhbot_server': MHBOT_BASE_URL, 'error': str(e)}), 500
