"""
MHBot Integration Blueprint
Per-user authentication — each counselor logs in with their own MHBot account.
Token is stored in the user's MongoDB record and used for all MHBot API calls.
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
import requests
import hmac
import hashlib
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
    """Convert JWT identity string to ObjectId for MongoDB lookups."""
    try:
        return ObjectId(user_id)
    except Exception:
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

def _save_perma_snapshots(mhbot_username: str, history: list, student_user_id=None):
    """Upsert PERMA entries into perma_snapshots collection."""
    if not history:
        return
    now = datetime.utcnow()
    for entry in history:
        label = entry.get('perma_label')
        date_str = entry.get('date')
        if not label or not date_str:
            continue
        try:
            entry_date = datetime.fromisoformat(date_str.replace('Z', ''))
        except Exception:
            continue
        db.db.perma_snapshots.update_one(
            {'mhbot_username': mhbot_username, 'entry_date': entry_date},
            {'$set': {
                'mhbot_username': mhbot_username,
                'perma_label': label,
                'entry_date': entry_date,
                'raw_date': date_str,
                'saved_at': now,
                **(({'student_user_id': student_user_id}) if student_user_id else {}),
            }},
            upsert=True,
        )
    # Update the quick-access fields on the user record
    if student_user_id and history:
        latest = history[0]
        db.db.users.update_one(
            {'_id': student_user_id},
            {'$set': {
                'perma_latest_label': latest.get('perma_label'),
                'perma_latest_date': latest.get('date'),
                'perma_synced_at': now,
            }},
        )


def get_perma_history(username: str, token: str, limit: int = 5, save: bool = False, student_user_id=None) -> dict:
    if not token:
        return {'success': False, 'error': 'Not connected to MHBot. Please log in first.', 'data': []}

    url = f"{MHBOT_BASE_URL}/api/v1/dashboard/user_perma_history/{username}"
    try:
        resp = requests.get(url, headers=_auth_headers(token), params={'offset': 0, 'limit': limit}, timeout=10)
        if resp.status_code == 200:
            history = resp.json()
            if save and history:
                _save_perma_snapshots(username, history, student_user_id)
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
    ema_identifier = data.get('ema_identifier', '').strip() or None

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

    uid = _resolve_user_id(user_id)
    # Use ema_identifier for history if provided, otherwise fall back to login username
    history_username = ema_identifier or username
    db.db.users.update_one(
        {'_id': uid},
        {'$set': {
            'mhbot_token': token,
            'mhbot_token_expires_at': expires_at,
            'mhbot_username': history_username,
            'mhbot_login_username': username,
            'mhbot_linked_at': datetime.utcnow(),
        }}
    )

    # Immediately recover all past PERMA history and save to DB
    history_result = get_perma_history(history_username, token, limit=200, save=True, student_user_id=uid)
    recovered = len(history_result.get('data', []))
    latest_label = history_result.get('latest_label')

    return jsonify({
        'success': True,
        'mhbot_username': username,
        'recovered': recovered,
        'latest_label': latest_label,
    }), 200


@mhbot_bp.route('/auth/set-identifier', methods=['POST'])
@jwt_required()
def set_ema_identifier():
    """Store the user's EMA internal identifier (ema_XXX) after login is verified."""
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    identifier = data.get('identifier', '').strip()
    if not identifier:
        return jsonify({'error': 'identifier is required'}), 400

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
        return jsonify({'error': 'Not connected to MHBot. Please log in via the MHBot page.'}), 503

    limit = min(request.args.get('limit', 5, type=int), 100)
    # Resolve student user_id for denormalized save
    student = db.db.users.find_one({'mhbot_username': username}, {'_id': 1})
    student_uid = student['_id'] if student else None
    result = get_perma_history(username, token, limit, save=True, student_user_id=student_uid)

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
        return jsonify({'error': 'Not connected to MHBot. Please log in via the MHBot page.'}), 503

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
        return jsonify({'error': 'Not connected to MHBot'}), 503

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
        return jsonify({'error': 'Not connected to MHBot. Please log in via the MHBot page.'}), 503

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
        return jsonify({'error': 'Not connected to MHBot. Please log in via the MHBot page.'}), 503

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


@mhbot_bp.route('/cm-queue', methods=['GET'])
@jwt_required()
def get_cm_queue():
    """Return students with Struggling or In Crisis EMA labels for the Case Manager queue."""
    user_id = get_jwt_identity()
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403

    token = _get_user_token(user_id)
    if not token:
        return jsonify({'error': 'Not connected to EMA. Please log in via the EMA page.'}), 503

    try:
        flagged_labels = {'Struggling', 'In Crisis'}
        results = []

        for student in db.db.users.find({'mhbot_username': {'$exists': True, '$ne': None}, 'role': 'STUDENT'}):
            mhbot_un = student.get('mhbot_username')
            r = get_perma_history(mhbot_un, token, limit=3)
            if not r['success']:
                continue
            label = r['latest_label']
            if label not in flagged_labels:
                continue

            # Find their most recent case
            case = db.db.cases.find_one({'student_id': student['_id']}, sort=[('created_at', -1)])
            results.append({
                'student_id':   str(student['_id']),
                'student_name': student.get('name') or f"{student.get('first_name', '')} {student.get('last_name', '')}".strip(),
                'student_email': student.get('email', ''),
                'school_id':    student.get('student_id', ''),
                'college':      student.get('college', ''),
                'mhbot_username': mhbot_un,
                'latest_label': label,
                'latest_date':  r['latest_date'],
                'case_id':      str(case['_id']) if case else None,
                'case_status':  case.get('status') if case else None,
            })

        # Sort: In Crisis first, then Struggling
        results.sort(key=lambda x: 0 if x['latest_label'] == 'In Crisis' else 1)
        return jsonify({'total': len(results), 'students': results}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@mhbot_bp.route('/stats/perma-distribution', methods=['GET'])
@jwt_required()
def get_perma_distribution():
    user_id = get_jwt_identity()
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403

    token = _get_user_token(user_id)
    if not token:
        return jsonify({'error': 'Not connected to MHBot. Please log in via the MHBot page.'}), 503

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
    result = get_perma_history(mhbot_username, token, limit, save=True, student_user_id=_resolve_user_id(user_id))

    return jsonify({
        'connected': True,
        'mhbot_username': mhbot_username,
        'latest_label': result.get('latest_label'),
        'latest_date': result.get('latest_date'),
        'history': result.get('data', []),
        'fetch_error': None if result['success'] else result['error'],
    }), 200



@mhbot_bp.route('/my-snapshots', methods=['GET'])
@jwt_required()
def get_my_snapshots():
    """Return saved PERMA snapshots for the logged-in student."""
    user_id = get_jwt_identity()
    uid = _resolve_user_id(user_id)
    user = db.db.users.find_one({'_id': uid})
    if not user:
        return jsonify({'error': 'User not found'}), 404

    limit = min(request.args.get('limit', 50, type=int), 200)
    snapshots = list(db.db.perma_snapshots.find(
        {'student_user_id': uid},
        {'_id': 0, 'student_user_id': 0}
    ).sort('entry_date', -1).limit(limit))

    for s in snapshots:
        if 'entry_date' in s and hasattr(s['entry_date'], 'isoformat'):
            s['entry_date'] = s['entry_date'].isoformat()
        if 'saved_at' in s and hasattr(s['saved_at'], 'isoformat'):
            s['saved_at'] = s['saved_at'].isoformat()

    return jsonify({
        'latest_label': user.get('perma_latest_label'),
        'latest_date': user.get('perma_latest_date'),
        'snapshots': snapshots,
        'total': len(snapshots),
    }), 200


@mhbot_bp.route('/stats/perma-trends', methods=['GET'])
@jwt_required()
def get_perma_trends():
    """Return monthly PERMA label distribution for the last 6 months."""
    user_id = get_jwt_identity()
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403

    token = _get_user_token(user_id)
    if not token:
        return jsonify({'error': 'Not connected to MHBot'}), 503

    from datetime import datetime as dt
    labels = ['Excelling', 'Thriving', 'Surviving', 'Struggling', 'In Crisis']
    now = dt.utcnow()

    # Build last 6 months (oldest first)
    months = []
    for i in range(5, -1, -1):
        m = now.month - i
        y = now.year
        while m <= 0:
            m += 12
            y -= 1
        months.append((y, m))

    # Collect all PERMA history for linked students
    students = list(db.db.users.find(
        {'mhbot_username': {'$exists': True, '$ne': None}},
        {'mhbot_username': 1}
    ))

    monthly = {}
    for y, m in months:
        key = f"{y}-{str(m).zfill(2)}"
        monthly[key] = {l: 0 for l in labels}
        monthly[key]['No Data'] = 0

    for student in students:
        r = get_perma_history(student['mhbot_username'], token, limit=50)
        if not r['success']:
            continue
        for entry in r['data']:
            try:
                d = dt.fromisoformat(entry['date'].replace('Z', ''))
                key = f"{d.year}-{str(d.month).zfill(2)}"
                label = entry.get('perma_label')
                if key in monthly:
                    if label in labels:
                        monthly[key][label] += 1
                    else:
                        monthly[key]['No Data'] += 1
            except Exception:
                continue

    return jsonify({
        'months': [f"{y}-{str(m).zfill(2)}" for y, m in months],
        'monthly': monthly,
    }), 200


@mhbot_bp.route('/sync', methods=['POST'])
@jwt_required()
def sync_all_perma():
    """Staff: pull latest PERMA history from EMA for all linked students and save to DB."""
    user_id = get_jwt_identity()
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403

    token = _get_user_token(user_id)
    if not token:
        return jsonify({'error': 'Not connected to EMA. Please log in first.'}), 503

    limit = min(request.args.get('limit', 50, type=int), 200)
    students = list(db.db.users.find(
        {'mhbot_username': {'$exists': True, '$ne': None}, 'role': 'STUDENT'},
        {'_id': 1, 'mhbot_username': 1}
    ))

    synced, failed = 0, 0
    for student in students:
        uid = student['_id']
        username = student['mhbot_username']
        result = get_perma_history(username, token, limit=limit, save=True, student_user_id=uid)
        if result['success']:
            synced += 1
        else:
            failed += 1
            logger.warning('PERMA sync failed for %s: %s', username, result.get('error'))

    return jsonify({
        'synced': synced,
        'failed': failed,
        'total': len(students),
        'synced_at': datetime.utcnow().isoformat(),
    }), 200


@mhbot_bp.route('/snapshots/<mhbot_username>', methods=['GET'])
@jwt_required()
def get_perma_snapshots(mhbot_username):
    """Return saved PERMA snapshots from DB for a given EMA username."""
    user_id = get_jwt_identity()
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403

    limit = min(request.args.get('limit', 30, type=int), 200)
    docs = list(
        db.db.perma_snapshots
        .find({'mhbot_username': mhbot_username}, {'_id': 0, 'mhbot_username': 0, 'student_user_id': 0})
        .sort('entry_date', -1)
        .limit(limit)
    )
    for d in docs:
        if 'entry_date' in d:
            d['entry_date'] = d['entry_date'].isoformat()
        if 'saved_at' in d:
            d['saved_at'] = d['saved_at'].isoformat()

    return jsonify({'mhbot_username': mhbot_username, 'snapshots': docs, 'count': len(docs)}), 200


@mhbot_bp.route('/my-snapshots', methods=['GET'])
@jwt_required()
def get_my_perma_snapshots():
    """Student: return their own saved PERMA snapshots from DB."""
    user_id = get_jwt_identity()
    user = db.db.users.find_one({'_id': _resolve_user_id(user_id)})
    if not user:
        return jsonify({'error': 'User not found'}), 404

    mhbot_username = user.get('mhbot_username')
    if not mhbot_username:
        return jsonify({'snapshots': [], 'count': 0, 'connected': False}), 200

    limit = min(request.args.get('limit', 30, type=int), 200)
    docs = list(
        db.db.perma_snapshots
        .find({'mhbot_username': mhbot_username}, {'_id': 0, 'mhbot_username': 0, 'student_user_id': 0})
        .sort('entry_date', -1)
        .limit(limit)
    )
    for d in docs:
        if 'entry_date' in d:
            d['entry_date'] = d['entry_date'].isoformat()
        if 'saved_at' in d:
            d['saved_at'] = d['saved_at'].isoformat()

    return jsonify({
        'mhbot_username': mhbot_username,
        'snapshots': docs,
        'count': len(docs),
        'connected': True,
        'latest_label': user.get('perma_latest_label'),
        'latest_date': user.get('perma_latest_date'),
    }), 200


@mhbot_bp.route('/webhook/perma', methods=['POST'])
def ema_webhook():
    """
    Webhook receiver for EMA PERMA label events.

    EMA calls this endpoint when a student completes an assessment.
    Give the EMA team:
      URL:    POST https://<your-domain>/api/mhbot/webhook/perma
      Secret: the value of EMA_WEBHOOK_SECRET in .env (used for signature verification)

    Expected payload from EMA:
      {
        "mhbot_username": "ema_vHS",   // or "username" — whichever EMA uses
        "perma_label": "Thriving",
        "date": "2026-06-26T10:00:00Z",
        "email": "student@dlsu.edu.ph"  // optional — used as fallback to find the student
      }

    EMA should send the signature as:
      X-EMA-Signature: sha256=<hmac_hex>
    where hmac_hex = HMAC-SHA256(secret, raw_request_body)
    """
    # ── Signature verification (skip if no secret configured) ─────────────
    secret = current_app.config.get('EMA_WEBHOOK_SECRET', '')
    if secret:
        sig_header = request.headers.get('X-EMA-Signature', '')
        mac = hmac.new(secret.encode(), request.get_data(), hashlib.sha256)
        expected = 'sha256=' + mac.hexdigest()
        if not hmac.compare_digest(sig_header, expected):
            logger.warning('EMA webhook: invalid signature')
            return jsonify({'error': 'Invalid signature'}), 401

    data = request.get_json(silent=True) or {}
    mhbot_username = (data.get('mhbot_username') or data.get('username', '')).strip()
    perma_label    = (data.get('perma_label') or data.get('label', '')).strip()
    date_str       = data.get('date') or datetime.utcnow().isoformat()
    email          = (data.get('email') or '').strip().lower()

    valid_labels = {'Excelling', 'Thriving', 'Surviving', 'Struggling', 'In Crisis'}
    if not perma_label or perma_label not in valid_labels:
        return jsonify({'error': f'Invalid perma_label. Must be one of: {", ".join(valid_labels)}'}), 400

    if not mhbot_username and not email:
        return jsonify({'error': 'mhbot_username or email is required'}), 400

    # ── Find student in CPS ────────────────────────────────────────────────
    student = None
    if mhbot_username:
        student = db.db.users.find_one({'mhbot_username': mhbot_username, 'role': 'STUDENT'})
    if not student and email:
        student = db.db.users.find_one({'email': email, 'role': 'STUDENT'})
        # If found by email and we have a username, link it now
        if student and mhbot_username and not student.get('mhbot_username'):
            db.db.users.update_one(
                {'_id': student['_id']},
                {'$set': {'mhbot_username': mhbot_username, 'mhbot_linked_at': datetime.utcnow()}}
            )

    # ── Parse date ─────────────────────────────────────────────────────────
    try:
        entry_date = datetime.fromisoformat(date_str.replace('Z', ''))
    except Exception:
        entry_date = datetime.utcnow()

    # ── Save snapshot ──────────────────────────────────────────────────────
    now = datetime.utcnow()
    db.db.perma_snapshots.update_one(
        {
            'mhbot_username': mhbot_username or (student.get('mhbot_username') if student else None),
            'entry_date': entry_date,
        },
        {'$set': {
            'mhbot_username': mhbot_username or '',
            'perma_label': perma_label,
            'entry_date': entry_date,
            'raw_date': date_str,
            'saved_at': now,
            'source': 'webhook',
            **(({'student_user_id': student['_id']}) if student else {}),
        }},
        upsert=True,
    )

    # ── Update user quick-access fields ────────────────────────────────────
    if student:
        db.db.users.update_one(
            {'_id': student['_id']},
            {'$set': {
                'perma_latest_label': perma_label,
                'perma_latest_date': date_str,
                'perma_synced_at': now,
            }}
        )
        logger.info('EMA webhook: saved %s label for student %s', perma_label, str(student['_id']))
    else:
        logger.warning('EMA webhook: no CPS student found for mhbot_username=%s email=%s — snapshot saved without user link', mhbot_username, email)

    return jsonify({'received': True, 'label': perma_label, 'student_found': student is not None}), 200


# ── Analytics endpoints (DB-backed, no live EMA API calls) ──────────────────

@mhbot_bp.route('/analytics/summary', methods=['GET'])
@jwt_required()
def get_ema_analytics_summary():
    """Key EMA metrics from DB — total tracked, active, at-risk, completion rate."""
    user_id = get_jwt_identity()
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403

    now = datetime.utcnow()
    cutoff_30d = now - timedelta(days=30)
    cutoff_14d = now - timedelta(days=14)

    labels = ['Excelling', 'Thriving', 'Surviving', 'Struggling', 'In Crisis']
    students = list(db.db.users.find(
        {'mhbot_username': {'$exists': True, '$ne': None}, 'role': 'STUDENT'},
        {'_id': 1, 'perma_latest_label': 1, 'perma_latest_date': 1}
    ))

    total = len(students)
    by_label = {l: 0 for l in labels}
    by_label['No Data'] = 0
    active_30d = 0
    inactive_14d = 0

    for s in students:
        label = s.get('perma_latest_label')
        date_str = s.get('perma_latest_date')

        if label in by_label:
            by_label[label] += 1
        else:
            by_label['No Data'] += 1

        if date_str:
            try:
                d = datetime.fromisoformat(str(date_str).replace('Z', ''))
                if d > cutoff_30d:
                    active_30d += 1
                if d < cutoff_14d:
                    inactive_14d += 1
            except Exception:
                inactive_14d += 1
        else:
            inactive_14d += 1

    at_risk = by_label.get('Struggling', 0) + by_label.get('In Crisis', 0)
    completion_rate = round(active_30d / total * 100, 1) if total > 0 else 0

    return jsonify({
        'total_tracked': total,
        'active_last_30d': active_30d,
        'inactive_14d': inactive_14d,
        'at_risk_count': at_risk,
        'completion_rate': completion_rate,
        'by_label': by_label,
    }), 200


@mhbot_bp.route('/analytics/trend', methods=['GET'])
@jwt_required()
def get_ema_analytics_trend():
    """Monthly PERMA check-in counts from DB snapshots (last N months)."""
    user_id = get_jwt_identity()
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403

    months_back = min(request.args.get('months', 6, type=int), 12)
    now = datetime.utcnow()
    labels = ['Excelling', 'Thriving', 'Surviving', 'Struggling', 'In Crisis']

    months = []
    for i in range(months_back - 1, -1, -1):
        m = now.month - i
        y = now.year
        while m <= 0:
            m += 12
            y -= 1
        months.append(f"{y}-{str(m).zfill(2)}")

    result = {key: {l: 0 for l in labels} for key in months}

    start_dt = datetime(now.year - 1, now.month, 1) if months_back > 1 else datetime(now.year, now.month, 1)

    pipeline = [
        {'$match': {'entry_date': {'$gte': start_dt}}},
        {'$group': {
            '_id': {
                'year': {'$year': '$entry_date'},
                'month': {'$month': '$entry_date'},
                'label': '$perma_label',
            },
            'count': {'$sum': 1},
        }},
    ]

    for row in db.db.perma_snapshots.aggregate(pipeline):
        y = row['_id']['year']
        m = row['_id']['month']
        label = row['_id'].get('label')
        key = f"{y}-{str(m).zfill(2)}"
        if key in result and label in labels:
            result[key][label] += row['count']

    return jsonify({'months': months, 'data': result}), 200


@mhbot_bp.route('/analytics/college', methods=['GET'])
@jwt_required()
def get_ema_analytics_college():
    """EMA label distribution grouped by student college."""
    user_id = get_jwt_identity()
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403

    labels = ['Excelling', 'Thriving', 'Surviving', 'Struggling', 'In Crisis']
    students = list(db.db.users.find(
        {'mhbot_username': {'$exists': True, '$ne': None}, 'role': 'STUDENT'},
        {'college': 1, 'perma_latest_label': 1}
    ))

    college_data: dict = {}
    for s in students:
        college = (s.get('college') or 'Unknown').strip() or 'Unknown'
        label = s.get('perma_latest_label') or 'No Data'
        if college not in college_data:
            college_data[college] = {l: 0 for l in labels}
            college_data[college]['No Data'] = 0
        target = label if label in college_data[college] else 'No Data'
        college_data[college][target] += 1

    result = []
    for college, counts in sorted(college_data.items(), key=lambda x: -sum(x[1].values())):
        total_c = sum(counts.values())
        at_risk_c = counts.get('Struggling', 0) + counts.get('In Crisis', 0)
        result.append({'college': college, 'total': total_c, 'at_risk': at_risk_c, **counts})

    return jsonify({'colleges': result}), 200


@mhbot_bp.route('/analytics/attention', methods=['GET'])
@jwt_required()
def get_ema_analytics_attention():
    """Students needing EMA attention: at-risk labels + long-inactive check-ins."""
    user_id = get_jwt_identity()
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403

    inactive_days = request.args.get('inactive_days', 14, type=int)
    now = datetime.utcnow()
    inactive_cutoff = now - timedelta(days=inactive_days)

    students = list(db.db.users.find(
        {'mhbot_username': {'$exists': True, '$ne': None}, 'role': 'STUDENT'},
        {'_id': 1, 'name': 1, 'email': 1, 'student_id': 1, 'college': 1,
         'year_level': 1, 'perma_latest_label': 1, 'perma_latest_date': 1}
    ))

    attention = []
    for s in students:
        label = s.get('perma_latest_label')
        date_str = s.get('perma_latest_date')

        reason = None
        if label in ['Struggling', 'In Crisis']:
            reason = 'at_risk'
        elif not date_str:
            reason = 'no_checkin'
        else:
            try:
                d = datetime.fromisoformat(str(date_str).replace('Z', ''))
                if d < inactive_cutoff:
                    reason = 'inactive'
            except Exception:
                reason = 'inactive'

        if not reason:
            continue

        case = db.db.cases.find_one(
            {'student_id': s['_id']},
            sort=[('created_at', -1)],
            projection={'status': 1},
        )
        attention.append({
            'student_id': str(s['_id']),
            'name': s.get('name', ''),
            'email': s.get('email', ''),
            'school_id': str(s.get('student_id', '')),
            'college': s.get('college', ''),
            'year_level': str(s.get('year_level', '')),
            'label': label,
            'last_checkin': date_str,
            'reason': reason,
            'case_id': str(case['_id']) if case else None,
            'case_status': case.get('status') if case else None,
        })

    priority_map = {'at_risk': 0, 'inactive': 1, 'no_checkin': 2}
    label_map = {'In Crisis': 0, 'Struggling': 1}
    attention.sort(key=lambda x: (
        priority_map.get(x['reason'], 99),
        label_map.get(x['label'] or '', 99),
    ))

    return jsonify({'students': attention, 'total': len(attention)}), 200


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
