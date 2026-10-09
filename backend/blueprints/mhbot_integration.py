"""
MHBot Integration Blueprint
Shared admin account — one EMA staff account reads PERMA data on behalf of all users.
Students link their own EMA account once; CPS keeps their encrypted refresh token so the
chat widget can talk to EMA as them without a second login.
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
import requests
import hmac
import hashlib
import threading
from datetime import datetime, timedelta
from bson import ObjectId
from models import db, PermissionType
from utils import user_has_permission, audit_log, case_access_error, server_error
from services.perma_triage import (refresh_student_triage, triage_priority, daily_scores, monthly_scores,
                                   weakest_area, get_settings, DEFAULT_SETTINGS, AT_RISK, LABEL_SCORE,
                                   label_for_score, SCORE_LABEL)
import os
import base64
import logging
from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger(__name__)

mhbot_bp = Blueprint('mhbot', __name__, url_prefix='/api/mhbot')

MHBOT_BASE_URL = os.getenv('MHBOT_BASE_URL', 'https://pchrd-ema.dlsu.edu.ph/backend')


# ── Shared admin token (cached in memory) ─────────────────────────────────────

_token_cache = {'token': '', 'expires_at': None}
_token_lock  = threading.Lock()

def _get_shared_ema_token() -> str:
    """Return a valid shared EMA admin token, logging in / refreshing as needed."""
    with _token_lock:
        cache = _token_cache
        if cache['token'] and cache['expires_at'] and datetime.utcnow() < cache['expires_at']:
            return cache['token']
        username = os.getenv('EMA_ADMIN_USERNAME', '')
        password = os.getenv('EMA_ADMIN_PASSWORD', '')
        if not username or not password:
            logger.warning('EMA_ADMIN_USERNAME / EMA_ADMIN_PASSWORD not set')
            return ''
        try:
            resp = requests.post(
                f"{MHBOT_BASE_URL}/api/v1/auth/login",
                data={'grant_type': 'password', 'username': username, 'password': password, 'scope': 'dashboard'},
                headers={'accept': 'application/json'},
                timeout=10,
            )
            if resp.ok:
                payload = resp.json()
                token = payload.get('access_token', '')
                expires_in = int(payload.get('expires_in', 1800))
                cache['token'] = token
                cache['expires_at'] = datetime.utcnow() + timedelta(seconds=expires_in - 120)
                return token
            logger.warning('EMA admin login failed: %s', resp.text[:200])
        except Exception as e:
            logger.warning('EMA admin token refresh error: %s', e)
        return ''


def _resolve_user_id(user_id):
    """Convert JWT identity string to ObjectId for MongoDB lookups."""
    try:
        return ObjectId(user_id)
    except Exception:
        return user_id


# Roles that may open EMA staff routes at all. *Which* students each role sees is narrower and
# lives in services/ema_access.py: counselors/psychologists/ICs only students in their care,
# case managers everyone, admins and the DPO totals only. The consent notice states this.
EMA_DATA_ROLES = ('COUNSELOR', 'PSYCHOLOGIST', 'CASE_MANAGER', 'IC', 'ADMIN', 'DPO')


def _ema_scope():
    """The caller's EMA scope: who they may see (services/ema_access.py, matches the privacy notice)."""
    from services.ema_access import ema_scope
    return ema_scope(db.db, get_jwt_identity())


def _visible_student(mode, own, mhbot_username):
    """The CPS student with this EMA username if the caller may see them, else None. Usernames
    that belong to no CPS student are never looked up: the shared EMA account is for CPS students."""
    from services.ema_access import can_see_student
    student = db.db.users.find_one({'mhbot_username': mhbot_username, 'role': 'STUDENT'}, {'_id': 1})
    return student if student and can_see_student(mode, own, student['_id']) else None


NOT_IN_CARE_ERROR = 'You can only see EMA results of students in your care.'
NAMES_HIDDEN_ERROR = 'Your role sees EMA totals only, not individual students.'


def _staff_access_denied(user_id) -> bool:
    """EMA staff routes show other students' wellbeing data. VIEW_CASE alone is not enough:
    students hold it for their own case, and office assistants hold it for scheduling."""
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return True
    user = db.db.users.find_one({'_id': _resolve_user_id(user_id)}, {'role': 1})
    return not user or user.get('role') not in EMA_DATA_ROLES


def _record_ema_consent(uid):
    """Store the student's EMA consent the same way /api/consent/submit does."""
    now = datetime.utcnow()
    db.db.consent_records.insert_one({
        'user_id': uid, 'consent_types': ['ema_data_linking'], 'consented_at': now,
        'ip_address': request.remote_addr, 'user_agent': request.headers.get('User-Agent', ''),
        'version': EMA_CONSENT_VERSION,
    })
    db.db.users.update_one({'_id': uid}, {'$set': {'ema_consent_given': True, 'ema_consent_given_at': now},
                                          '$unset': {'ema_consent_withdrawn_at': ''}})


EMA_CONSENT_VERSION = '2.1'   # bump when the EMA consent wording changes
CONSENT_REQUIRED_ERROR = 'Please read and agree to the EMA data privacy notice before linking your account.'


def _auth_headers(token: str) -> dict:
    return {'accept': 'application/json', 'Authorization': f'Bearer {token}'}


# ── Core PERMA fetch (token passed in explicitly) ─────────────────────────────

def _save_perma_snapshots(mhbot_username: str, history: list, student_user_id=None, source: str = 'sync'):
    """Upsert PERMA entries into perma_snapshots collection."""
    if not history:
        return
    now = datetime.utcnow()
    for entry in history:
        _norm = {'Flourishing': 'Excelling'}
        label = _norm.get(entry.get('perma_label'), entry.get('perma_label'))
        date_str = entry.get('date')
        if not label or not date_str:
            continue
        try:
            entry_date = datetime.fromisoformat(date_str.replace('Z', ''))
        except Exception:
            continue
        res = db.db.perma_snapshots.update_one(
            {'mhbot_username': mhbot_username, 'entry_date': entry_date},
            {'$set': {
                'mhbot_username': mhbot_username,
                'perma_label': label,
                'entry_date': entry_date,
                'raw_date': date_str,
                'saved_at': now,
                'source': source,
                **(({'perma_score': entry['perma_score']}) if entry.get('perma_score') else {}),
                **(({'student_user_id': student_user_id}) if student_user_id else {}),
            },
             '$setOnInsert': {'first_seen_at': now}},
            upsert=True,
        )
        if res.upserted_id and label == 'In Crisis':     # a crisis CPS had not seen before
            from services.crisis_alerts import alert_new_crisis
            sid = student_user_id or (db.db.users.find_one({'mhbot_username': mhbot_username, 'role': 'STUDENT'}, {'_id': 1}) or {}).get('_id')
            alert_new_crisis(db.db, sid, entry_date)
    # Update the quick-access fields on the user record. Unfinished conversations come back
    # with no label, so use the newest entry that has one.
    latest = _latest_labeled(history)
    if student_user_id:
        refresh_student_triage(db.db, student_user_id)
    if student_user_id and latest:
        db.db.users.update_one(
            {'_id': student_user_id},
            {'$set': {
                'perma_latest_label': latest.get('perma_label'),
                'perma_latest_date': latest.get('date'),
                'perma_synced_at': now,
            }},
        )


def _latest_labeled(history: list):
    return next((h for h in history or [] if h.get('perma_label')), None)


def get_perma_history(username: str, token: str = None, limit: int = 5, save: bool = False, student_user_id=None,
                      source: str = 'sync') -> dict:
    if not token:
        token = _get_shared_ema_token()
    if not token:
        return {'success': False, 'error': 'EMA service unavailable', 'data': []}

    url = f"{MHBOT_BASE_URL}/api/v1/dashboard/user_perma_history/{username}"
    try:
        # EMA returns at most 100 entries per request
        resp = requests.get(url, headers=_auth_headers(token), params={'offset': 0, 'limit': min(limit, 100)}, timeout=10)
        if resp.status_code == 200:
            history = resp.json()
            if save and history:
                _save_perma_snapshots(username, history, student_user_id, source)
            latest = _latest_labeled(history)
            return {
                'success': True,
                'data': history,
                'latest_label': latest['perma_label'] if latest else None,
                'latest_date': latest['date'] if latest else None,
            }
        return {'success': False, 'error': f'MHBot API error: {resp.status_code}', 'data': []}
    except requests.exceptions.Timeout:
        return {'success': False, 'error': 'MHBot server not responding (timeout)', 'data': []}
    except requests.exceptions.ConnectionError:
        return {'success': False, 'error': 'Cannot connect to MHBot server', 'data': []}
    except Exception as e:
        return {'success': False, 'error': str(e), 'data': []}


# ── Per-student EMA chat tokens ───────────────────────────────────────────────
# Linking logs in once as the student (scope "chat") and keeps only their EMA refresh
# token, encrypted. EMA refresh tokens last 24h and every refresh returns a new one,
# so the scheduler renews them well inside that window to keep students linked.

EMA_ACCESS_TOKEN_TTL = timedelta(minutes=50)   # EMA access tokens last 60 min

_student_access_cache = {}   # str(user _id) -> (access_token, expires_at)


class EmaRelinkRequired(Exception):
    """The student's saved EMA key is missing or was rejected; they must link again."""


def _token_cipher() -> Fernet:
    key = os.getenv('EMA_TOKEN_KEY', '')
    if not key:
        secret = current_app.config.get('JWT_SECRET_KEY') or current_app.config.get('SECRET_KEY') or ''
        key = base64.urlsafe_b64encode(hashlib.sha256(f'ema-token:{secret}'.encode()).digest()).decode()
    return Fernet(key.encode())


def _ema_student_login(username: str, password: str):
    """Log in to EMA as the student with chat scope. Returns EMA's token dict, or None if rejected."""
    resp = requests.post(
        f"{MHBOT_BASE_URL}/api/v1/auth/login",
        data={'grant_type': 'password', 'username': username, 'password': password, 'scope': 'chat'},
        headers={'accept': 'application/json'},
        timeout=10,
    )
    return resp.json() if resp.ok else None


def _store_student_tokens(uid, tokens: dict, extra: dict = None):
    db.db.users.update_one(
        {'_id': uid},
        {'$set': {
            'ema_refresh_token': _token_cipher().encrypt(tokens['refresh_token'].encode()).decode(),
            'ema_token_updated_at': datetime.utcnow(),
            **(extra or {}),
        },
         '$unset': {'ema_chat_needs_relink': ''}},
    )
    _student_access_cache[str(uid)] = (tokens['access_token'], datetime.utcnow() + EMA_ACCESS_TOKEN_TTL)


def _mark_student_relink(uid):
    _student_access_cache.pop(str(uid), None)
    db.db.users.update_one(
        {'_id': uid},
        {'$set': {'ema_chat_needs_relink': True}, '$unset': {'ema_refresh_token': ''}},
    )


def _refresh_student_tokens(user: dict) -> str:
    """Trade the student's saved refresh token for new tokens. Returns a fresh access token."""
    encrypted = user.get('ema_refresh_token')
    if not encrypted:
        raise EmaRelinkRequired()
    try:
        refresh_token = _token_cipher().decrypt(encrypted.encode()).decode()
    except InvalidToken:
        _mark_student_relink(user['_id'])
        raise EmaRelinkRequired()
    resp = requests.post(f"{MHBOT_BASE_URL}/api/v1/auth/refresh",
                         json={'refresh_token': refresh_token}, timeout=10)
    if resp.status_code in (400, 401, 403, 422):
        _mark_student_relink(user['_id'])
        raise EmaRelinkRequired()
    resp.raise_for_status()
    tokens = resp.json()
    _store_student_tokens(user['_id'], tokens)
    return tokens['access_token']


def get_student_ema_access_token(user: dict) -> str:
    cached = _student_access_cache.get(str(user['_id']))
    if cached and cached[1] > datetime.utcnow():
        return cached[0]
    return _refresh_student_tokens(user)


def refresh_all_student_ema_tokens() -> dict:
    """Scheduler job: renew every linked student's EMA key so links never lapse."""
    renewed = relink = failed = 0
    for user in db.db.users.find({'ema_refresh_token': {'$exists': True}}, {'ema_refresh_token': 1}):
        try:
            _refresh_student_tokens(user)
            renewed += 1
        except EmaRelinkRequired:
            relink += 1
        except Exception as e:
            failed += 1
            logger.warning('EMA token refresh failed for %s: %s', user['_id'], e)
    return {'renewed': renewed, 'relink': relink, 'failed': failed}


def _ema_account_taken(uid, ema_username: str, ema_user_id=None) -> bool:
    """An EMA account may be linked to only one CPS account."""
    match = [{'mhbot_username': ema_username}]
    if ema_user_id:
        match.append({'ema_user_id': ema_user_id})
    return db.db.users.find_one({'_id': {'$ne': uid}, '$or': match}, {'_id': 1}) is not None


ACCOUNT_TAKEN_ERROR = 'This EMA account is already linked to another CPS account. Disconnect it there first.'


# ── Auth endpoints ─────────────────────────────────────────────────────────────

@mhbot_bp.route('/link-username', methods=['POST'])
@jwt_required()
def link_ema_username():
    """Student signs in to EMA once. CPS keeps their encrypted EMA refresh token (never the
    password) so the chat widget stays signed in; PERMA syncs still use the shared admin token."""
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    ema_username = data.get('username', '').strip()
    ema_password = data.get('password', '').strip()
    if not ema_username or not ema_password:
        return jsonify({'error': 'EMA username and password are required'}), 400
    # Consent first: no credentials go to EMA unless the student agreed (now or earlier)
    if data.get('consent') is not True and not (db.db.users.find_one(
            {'_id': _resolve_user_id(user_id)}, {'ema_consent_given': 1}) or {}).get('ema_consent_given'):
        return jsonify({'error': CONSENT_REQUIRED_ERROR, 'consent_required': True}), 403

    try:
        tokens = _ema_student_login(ema_username, ema_password)
        if not tokens:
            return jsonify({'error': 'EMA username or password is incorrect.'}), 400
        me = requests.get(f"{MHBOT_BASE_URL}/api/v1/auth/me",
                          headers=_auth_headers(tokens['access_token']), timeout=10)
        me.raise_for_status()
        me = me.json()
    except requests.exceptions.RequestException as e:
        logger.warning('EMA link error: %s', e)
        return jsonify({'error': 'EMA service is currently unavailable'}), 503

    ema_username = me.get('username') or ema_username
    uid = _resolve_user_id(user_id)
    if _ema_account_taken(uid, ema_username, me.get('id')):
        return jsonify({'error': ACCOUNT_TAKEN_ERROR}), 409
    if data.get('consent') is True:
        _record_ema_consent(uid)
    _store_student_tokens(uid, tokens, {
        'mhbot_username': ema_username,
        'mhbot_linked_at': datetime.utcnow(),
        'ema_user_id': me.get('id'),
    })

    token = _get_shared_ema_token()
    full = get_perma_history(ema_username, token, limit=100, save=True, student_user_id=uid, source='link') if token else {}

    return jsonify({
        'success': True,
        'mhbot_username': ema_username,
        'latest_label': full.get('latest_label'),
        'latest_date': full.get('latest_date'),
        'recovered': len(full.get('data') or []),
    }), 200


@mhbot_bp.route('/auth/logout', methods=['POST'])
@jwt_required()
def mhbot_logout():
    """Unlink the student's EMA account from CPS and delete their saved EMA key. PERMA results
    already saved stay in perma_snapshots as part of the counseling record; syncing them stops."""
    uid = _resolve_user_id(get_jwt_identity())
    _student_access_cache.pop(str(uid), None)
    db.db.users.update_one({'_id': uid}, {'$set': {'ema_consent_given': False,
                                                  'ema_consent_withdrawn_at': datetime.utcnow()}})
    db.db.users.update_one(
        {'_id': uid},
        {'$unset': {'mhbot_username': '', 'mhbot_linked_at': '', 'ema_user_id': '',
                    'ema_refresh_token': '', 'ema_token_updated_at': '', 'ema_chat_needs_relink': '',
                    'ema_chat_conversation_id': '', 'ema_chat_state': '', 'ema_chat_rating': ''}}
    )
    return jsonify({'success': True}), 200


@mhbot_bp.route('/auth/status', methods=['GET'])
@jwt_required()
def mhbot_auth_status():
    """Return whether the current user has EMA access.
    Students: must have mhbot_username linked.
    Staff/admin: always connected (use shared admin token for analytics).
    """
    user_id = get_jwt_identity()
    user = db.db.users.find_one({'_id': _resolve_user_id(user_id)})
    if not user:
        return jsonify({'connected': False}), 200
    role = user.get('role', '')
    mhbot_username = user.get('mhbot_username', '')
    is_student = role == 'STUDENT'
    return jsonify({
        'connected': bool(mhbot_username) if is_student else True,
        'mhbot_username': mhbot_username,
        # chat_ready: the widget can chat as this student without another EMA sign-in
        'chat_ready': bool(user.get('ema_refresh_token')) if is_student else False,
        'needs_relink': bool(mhbot_username) and not user.get('ema_refresh_token') if is_student else False,
    }), 200


# ── Student chat (CPS relays messages to EMA as the student) ──────────────────

def _chat_student():
    """Return the calling student's user record, or an error response tuple."""
    user = db.db.users.find_one({'_id': _resolve_user_id(get_jwt_identity())})
    if not user or user.get('role') != 'STUDENT':
        return None, (jsonify({'error': 'Only students can chat with EMA here'}), 403)
    if not user.get('ema_refresh_token') or not user.get('ema_user_id'):
        return None, (jsonify({'error': 'Link your EMA account to start chatting.', 'needs_relink': True}), 409)
    return user, None


def _clean_messages(messages: list) -> list:
    """Keep only what the chat view renders; EMA also returns large internal debug events."""
    keep = ('sender', 'type', 'date_sent', 'content', 'journal', 'activities')
    return [{k: m[k] for k in keep if k in m} for m in (messages or [])]


def _ema_chat_call(user: dict, method: str, path: str, **kwargs):
    token = get_student_ema_access_token(user)
    return requests.request(method, f"{MHBOT_BASE_URL}/api/v1{path}",
                            headers=_auth_headers(token), **kwargs)


def _chat_error(e: Exception):
    if isinstance(e, EmaRelinkRequired):
        return jsonify({'error': 'Your EMA link expired. Sign in to EMA again to keep chatting.', 'needs_relink': True}), 409
    logger.warning('EMA chat error: %s', e)
    return jsonify({'error': 'EMA is not responding right now. Please try again in a moment.'}), 503


def _sync_after_session(user: dict):
    """Pull the new PERMA label in the background once a chat session ends."""
    def run():
        token = _get_shared_ema_token()
        if token and user.get('mhbot_username'):
            get_perma_history(user['mhbot_username'], token, limit=5, save=True, student_user_id=user['_id'])
    threading.Thread(target=run, daemon=True).start()


@mhbot_bp.route('/chat/session', methods=['GET'])
@jwt_required()
def chat_session():
    """The student's unfinished conversation, if any, so the widget can pick up where they left off."""
    user, err = _chat_student()
    if err:
        return err
    cid = user.get('ema_chat_conversation_id')
    if not cid or user.get('ema_chat_state') == 'end':
        return jsonify({'conversation': None}), 200
    try:
        resp = _ema_chat_call(user, 'GET', f"/users/{user['ema_user_id']}/conversations/{cid}", timeout=15)
    except Exception as e:
        return _chat_error(e)
    if not resp.ok:
        db.db.users.update_one({'_id': user['_id']}, {'$unset': {'ema_chat_conversation_id': '', 'ema_chat_state': ''}})
        return jsonify({'conversation': None}), 200
    return jsonify({'conversation': {
        'id': cid,
        'messages': _clean_messages(resp.json().get('chat_history')),
        'graph_state': user.get('ema_chat_state') or 'wait_input',
    }}), 200


@mhbot_bp.route('/chat/start', methods=['POST'])
@jwt_required()
def chat_start():
    """Start a new EMA conversation with the student's 1-5 check-in rating and return Ema's greeting."""
    user, err = _chat_student()
    if err:
        return err
    try:
        rating = int((request.get_json() or {}).get('rating', 0))
    except (TypeError, ValueError):
        rating = 0
    if not 1 <= rating <= 5:
        return jsonify({'error': 'Choose how you feel from 1 to 5'}), 400
    try:
        conv = _ema_chat_call(user, 'POST', '/conversations/', timeout=15,
                              json={'user_id': user['ema_user_id'], 'initial_check_in_rating': rating})
        if conv.status_code == 409:
            # EMA allows one unfinished conversation per account (it may have been started
            # in EMA's own app). Reopen the most recent one instead of starting a new one.
            listing = _ema_chat_call(user, 'GET', f"/users/{user['ema_user_id']}/conversations/", timeout=20)
            listing.raise_for_status()
            ongoing = max(listing.json(), key=lambda c: c.get('date_created') or '')
            db.db.users.update_one({'_id': user['_id']}, {'$set': {
                'ema_chat_conversation_id': ongoing['id'], 'ema_chat_state': 'wait_input', 'ema_chat_rating': None}})
            return jsonify({'conversation_id': ongoing['id'], 'resumed': True,
                            'messages': _clean_messages(ongoing.get('chat_history')),
                            'graph_state': 'wait_input'}), 200
        conv.raise_for_status()
        cid = conv.json()['id']
        first = _ema_chat_call(user, 'POST', '/messages/send_message', timeout=90,
                               json={'conversation_id': cid, 'user_id': user['ema_user_id'], 'content': None})
        first.raise_for_status()
        body = first.json()
    except Exception as e:
        return _chat_error(e)
    db.db.users.update_one({'_id': user['_id']}, {'$set': {
        'ema_chat_conversation_id': cid, 'ema_chat_state': body.get('graph_state'), 'ema_chat_rating': rating}})
    return jsonify({'conversation_id': cid, 'messages': _clean_messages(body.get('messages')),
                    'graph_state': body.get('graph_state')}), 200


@mhbot_bp.route('/chat/message', methods=['POST'])
@jwt_required()
def chat_message():
    """Send the student's message (or chosen activity) to EMA and return Ema's reply."""
    user, err = _chat_student()
    if err:
        return err
    data = request.get_json() or {}
    cid = data.get('conversation_id')
    if not cid or cid != user.get('ema_chat_conversation_id'):
        return jsonify({'error': 'This conversation is no longer active. Start a new check-in.'}), 409
    content = data.get('content')
    content = content.strip()[:4000] if isinstance(content, str) and content.strip() else None
    try:
        resp = _ema_chat_call(user, 'POST', '/messages/send_message', timeout=90,
                              json={'conversation_id': cid, 'user_id': user['ema_user_id'], 'content': content})
        resp.raise_for_status()
        body = resp.json()
    except Exception as e:
        return _chat_error(e)
    state = body.get('graph_state')
    db.db.users.update_one({'_id': user['_id']}, {'$set': {'ema_chat_state': state}})

    # The message answering a journal prompt is the final journal text; copy it into the
    # student's private CPS journal when they chose to.
    journal_saved = False
    if user.get('ema_chat_state') == 'wait_journal' and content and data.get('save_to_cps_journal'):
        journal_saved = _save_ema_journal(user, cid, content, data.get('journal_label'))

    if state == 'end':
        _sync_after_session(user)
    return jsonify({'messages': _clean_messages(body.get('messages')), 'graph_state': state,
                    'cps_journal_saved': journal_saved}), 200


LABEL_MOOD = {'Excelling': 5, 'Thriving': 4, 'Surviving': 3, 'Struggling': 2, 'In Crisis': 1}


def _save_ema_journal(user: dict, conversation_id: str, text: str, label) -> bool:
    """One private CPS journal entry per EMA conversation, tagged with the EMA label."""
    label = label if label in LABEL_MOOD else None
    if db.db.journal_entries.find_one({'student_id': user['_id'], 'ema_conversation_id': conversation_id}):
        return True
    now = datetime.utcnow()
    result = db.db.journal_entries.insert_one({
        'student_id': user['_id'],
        # The check-in rating is how the student said they felt; fall back to the EMA label
        'mood': user.get('ema_chat_rating') or LABEL_MOOD.get(label, 3),
        'content': text,
        'tags': [label] if label else [],
        'is_private': True,
        'attachments': [],
        'source': 'ema',
        'ema_conversation_id': conversation_id,
        'created_at': now,
        'updated_at': now,
    })
    audit_log(db.db, 'journal', 'create', entity_id=str(result.inserted_id), new_values={
        'student_id': str(user['_id']), 'source': 'ema'})
    return True


# ── Data endpoints (use caller's token) ───────────────────────────────────────

@mhbot_bp.route('/perma/<username>', methods=['GET'])
@jwt_required()
def get_user_perma(username):
    user_id = get_jwt_identity()
    if _staff_access_denied(user_id):
        return jsonify({'error': 'Insufficient permissions'}), 403

    mode, own = _ema_scope()
    student = _visible_student(mode, own, username)
    if not student:
        return jsonify({'error': NOT_IN_CARE_ERROR}), 403

    token = _get_shared_ema_token()
    if not token:
        return jsonify({'error': 'EMA service is currently unavailable'}), 503

    limit = min(request.args.get('limit', 5, type=int), 100)
    student_uid = student['_id']
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
    if _staff_access_denied(user_id):
        return jsonify({'error': 'Insufficient permissions'}), 403

    data = request.get_json() or {}
    username = data.get('username', '').strip()
    if not username:
        return jsonify({'error': 'Username required'}), 400
    mode, own = _ema_scope()
    if not _visible_student(mode, own, username):
        return jsonify({'error': NOT_IN_CARE_ERROR}), 403

    token = _get_shared_ema_token()
    if not token:
        return jsonify({'error': 'EMA service is currently unavailable'}), 503

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
    if _staff_access_denied(user_id):
        return jsonify({'error': 'Insufficient permissions'}), 403

    token = _get_shared_ema_token()
    if not token:
        return jsonify({'error': 'EMA service is currently unavailable'}), 503

    data = request.get_json() or {}
    usernames = data.get('usernames', [])
    if not usernames:
        return jsonify({'labels': {}}), 200

    mode, own = _ema_scope()
    labels = {}
    for username in usernames[:50]:  # cap at 50 to avoid abuse
        if not username:
            continue
        if not _visible_student(mode, own, username):
            labels[username] = None
            continue
        r = get_perma_history(username, token, limit=1)
        labels[username] = r['latest_label'] if r['success'] else None

    return jsonify({'labels': labels}), 200


@mhbot_bp.route('/students/pending', methods=['GET'])
@jwt_required()
def get_pending_students_with_perma():
    user_id = get_jwt_identity()
    if _staff_access_denied(user_id):
        return jsonify({'error': 'Insufficient permissions'}), 403

    token = _get_shared_ema_token()
    if not token:
        return jsonify({'error': 'EMA service is currently unavailable'}), 503

    from services.ema_access import can_see_student
    mode, own = _ema_scope()
    try:
        pending = db.db.appointments.find({'status': {'$in': ['REQUESTED', 'PENDING_APPROVAL']}}).sort('requested_start', -1)
        results = []
        for apt in pending:
            case = db.db.cases.find_one({'_id': apt.get('case_id')})
            if not case:
                continue
            student = db.db.users.find_one({'_id': case.get('student_id')})
            if not student or not can_see_student(mode, own, student['_id']):
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
        return server_error(e)


@mhbot_bp.route('/case/<case_id>/link-mhbot', methods=['POST'])
@jwt_required()
def link_case_to_mhbot(case_id):
    user_id = get_jwt_identity()
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403

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

    if _ema_account_taken(case.get('student_id'), mhbot_username):
        return jsonify({'error': ACCOUNT_TAKEN_ERROR}), 409
    student = db.db.users.find_one({'_id': case.get('student_id')}, {'ema_consent_given': 1}) or {}
    if not student.get('ema_consent_given'):
        return jsonify({'error': "This student hasn't agreed to share EMA data with CPS yet. "
                                 "Ask them to link EMA from their own account (Profile or the Talk to EMA button)."}), 409

    token = _get_shared_ema_token()
    if not token:
        return jsonify({'error': 'EMA service is currently unavailable'}), 503

    perma_result = get_perma_history(mhbot_username, token, limit=1)
    if not perma_result['success']:
        return jsonify({'error': 'Invalid MHBot username', 'mhbot_error': perma_result['error']}), 400

    db.db.users.update_one(
        {'_id': case.get('student_id')},
        {'$set': {'mhbot_username': mhbot_username, 'mhbot_linked_at': datetime.utcnow()}}
    )
    get_perma_history(mhbot_username, token, limit=100, save=True, student_user_id=case.get('student_id'), source='link')

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
    if _staff_access_denied(user_id):
        return jsonify({'error': 'Insufficient permissions'}), 403

    from services.ema_access import student_filter, TOTALS
    mode, own = _ema_scope()
    if mode == TOTALS:
        return jsonify({'error': NAMES_HIDDEN_ERROR}), 403

    # Triage label (worst recent result, unreviewed crises kept) is stored on each student
    # whenever results arrive and every 6 hours — the same source as /analytics/summary, so
    # the queue and the badge always agree and a failed live EMA lookup never hides anyone.
    # Counselors and psychologists see their own students only.
    try:
        results = []
        for student in db.db.users.find({
            'mhbot_username': {'$exists': True, '$ne': None},
            'role': 'STUDENT',
            'perma_triage_label': {'$in': list(AT_RISK)},
            **student_filter(mode, own),
        }):
            triage = student.get('perma_triage') or {}
            case = db.db.cases.find_one({'student_id': student['_id']}, sort=[('created_at', -1)])
            results.append({
                'student_id':   str(student['_id']),
                'student_name': student.get('name') or f"{student.get('first_name', '')} {student.get('last_name', '')}".strip(),
                'student_email': student.get('email', ''),
                'school_id':    student.get('student_id', ''),
                'college':      student.get('college', ''),
                'mhbot_username': student.get('mhbot_username'),
                'triage_label': student.get('perma_triage_label'),
                'flags':        triage.get('flags', []),
                'reasons':      triage.get('reasons', []),
                'crisis_pending_review': triage.get('crisis_pending_review', False),
                'latest_label': student.get('perma_latest_label'),
                'latest_date':  student.get('perma_latest_date'),
                'case_id':      str(case['_id']) if case else None,
                'case_status':  (case.get('case_status') or case.get('status')) if case else None,
                '_sort':        triage_priority(triage),
            })

        # In Crisis first, flagged students before unflagged, most recent check-in first
        results.sort(key=lambda x: x.pop('_sort'))
        return jsonify({'total': len(results), 'students': results}), 200
    except Exception as e:
        return server_error(e)


@mhbot_bp.route('/cm-queue/recent-reviews', methods=['GET'])
@jwt_required()
def get_recent_crisis_reviews():
    """Crisis reviews from the last N days across all students, newest first, so case managers
    can follow up on everyone who was recently in crisis. Review notes are clinical, so only
    case managers see this list."""
    user_id = get_jwt_identity()
    caller = db.db.users.find_one({'_id': _resolve_user_id(user_id)}, {'role': 1})
    if not caller or caller.get('role') != 'CASE_MANAGER':
        return jsonify({'error': 'Only case managers can see recent crisis reviews'}), 403

    days = max(1, min(request.args.get('days', 14, type=int), 90))
    since = datetime.utcnow() - timedelta(days=days)
    reviews = list(db.db.perma_crisis_reviews.find({'cleared_at': {'$gte': since}}).sort('cleared_at', -1).limit(200))

    people = {u['_id']: u for u in db.db.users.find(
        {'_id': {'$in': list({r['student_id'] for r in reviews} | {r['cleared_by'] for r in reviews})}},
        {'name': 1, 'first_name': 1, 'last_name': 1, 'email': 1, 'student_id': 1, 'college': 1,
         'perma_triage': 1, 'perma_triage_label': 1})}

    def name_of(u):
        if not u:
            return ''
        return u.get('name') or f"{u.get('first_name', '')} {u.get('last_name', '')}".strip() or u.get('email', '')

    results = []
    for r in reviews:
        student = people.get(r['student_id'])
        triage = (student or {}).get('perma_triage') or {}
        case = db.db.cases.find_one({'student_id': r['student_id']}, sort=[('created_at', -1)], projection={'_id': 1})
        results.append({
            'review_id':     str(r['_id']),
            'student_id':    str(r['student_id']),
            'student_name':  name_of(student) or 'Unknown student',
            'school_id':     (student or {}).get('student_id', ''),
            'college':       (student or {}).get('college', ''),
            'reviewed_at':   r['cleared_at'].isoformat(),
            'reviewed_by':   name_of(people.get(r['cleared_by'])) or 'Staff',
            'reviewed_by_role': r.get('cleared_by_role'),
            'note':          r.get('note', ''),
            # Where the student stands now, so a new crisis after the review stands out
            'current_label': (student or {}).get('perma_triage_label'),
            'in_crisis_again': bool(triage.get('crisis_pending_review')),
            'case_id':       str(case['_id']) if case else None,
        })
    return jsonify({'days': days, 'total': len(results), 'reviews': results}), 200


@mhbot_bp.route('/stats/perma-distribution', methods=['GET'])
@jwt_required()
def get_perma_distribution():
    user_id = get_jwt_identity()
    if _staff_access_denied(user_id):
        return jsonify({'error': 'Insufficient permissions'}), 403

    token = _get_shared_ema_token()
    if not token:
        return jsonify({'error': 'EMA service is currently unavailable'}), 503

    try:
        labels = ['Excelling', 'Thriving', 'Surviving', 'Struggling', 'In Crisis']
        counts = {l: 0 for l in labels}
        counts['No Data'] = 0
        total = 0

        from services.ema_access import student_filter
        mode, own = _ema_scope()
        for student in db.db.users.find({'mhbot_username': {'$exists': True, '$ne': None}, 'role': 'STUDENT',
                                         **student_filter(mode, own)}):
            total += 1
            r = get_perma_history(student['mhbot_username'], token, limit=1)
            label = r['latest_label'] if r['success'] else None
            if label in counts:
                counts[label] += 1
            else:
                counts['No Data'] += 1

        return jsonify({'total_students_tracked': total, 'distribution': counts}), 200
    except Exception as e:
        return server_error(e)


@mhbot_bp.route('/my-perma', methods=['GET'])
@jwt_required()
def get_my_perma():
    """Student endpoint — fetch their own PERMA history using their stored token."""
    user_id = get_jwt_identity()
    user = db.db.users.find_one({'_id': _resolve_user_id(user_id)})
    if not user:
        return jsonify({'error': 'User not found'}), 404

    mhbot_username = user.get('mhbot_username', '')
    if not mhbot_username:
        return jsonify({'connected': False, 'mhbot_username': ''}), 200

    limit = min(request.args.get('limit', 10, type=int), 100)
    result = get_perma_history(mhbot_username, limit=limit, save=True, student_user_id=_resolve_user_id(user_id))

    if result['success']:
        return jsonify({
            'connected': True,
            'mhbot_username': mhbot_username,
            'latest_label': result.get('latest_label'),
            'latest_date': result.get('latest_date'),
            'history': result.get('data', []),
            'fetch_error': None,
        }), 200

    # Live EMA server unreachable (e.g. demo/offline environment) — fall back to
    # the last locally-saved snapshots for this student, if any, instead of a bare error.
    resolved_id = _resolve_user_id(user_id)
    local = list(db.db.perma_snapshots.find(
        {'student_user_id': resolved_id}
    ).sort('entry_date', -1).limit(limit))
    if not local:
        local = list(db.db.perma_snapshots.find(
            {'mhbot_username': mhbot_username}
        ).sort('entry_date', -1).limit(limit))

    if local:
        history = [{'perma_label': s.get('perma_label'), 'date': s.get('raw_date') or s['entry_date'].isoformat()} for s in local]
        return jsonify({
            'connected': True,
            'mhbot_username': mhbot_username,
            'latest_label': history[0]['perma_label'],
            'latest_date': history[0]['date'],
            'history': history,
            'fetch_error': None,
            'from_cache': True,
        }), 200

    return jsonify({
        'connected': True,
        'mhbot_username': mhbot_username,
        'latest_label': None,
        'latest_date': None,
        'history': [],
        'fetch_error': result['error'],
    }), 200





@mhbot_bp.route('/stats/perma-trends', methods=['GET'])
@jwt_required()
def get_perma_trends():
    """Return monthly PERMA label distribution for the last 6 months."""
    user_id = get_jwt_identity()
    if _staff_access_denied(user_id):
        return jsonify({'error': 'Insufficient permissions'}), 403

    token = _get_shared_ema_token()
    if not token:
        return jsonify({'error': 'EMA service is currently unavailable'}), 503

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
    from services.ema_access import student_filter
    mode, own = _ema_scope()
    students = list(db.db.users.find(
        {'mhbot_username': {'$exists': True, '$ne': None}, 'role': 'STUDENT', **student_filter(mode, own)},
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
    if _staff_access_denied(user_id):
        return jsonify({'error': 'Insufficient permissions'}), 403

    token = _get_shared_ema_token()
    if not token:
        return jsonify({'error': 'Not connected to EMA. Please log in first.'}), 503

    limit = min(request.args.get('limit', 50, type=int), 200)
    students = list(db.db.users.find(
        {'mhbot_username': {'$exists': True, '$ne': None}, 'role': 'STUDENT', 'ema_consent_given': True},
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
    if _staff_access_denied(user_id):
        return jsonify({'error': 'Insufficient permissions'}), 403

    mode, own = _ema_scope()
    if not _visible_student(mode, own, mhbot_username):
        return jsonify({'error': NOT_IN_CARE_ERROR}), 403

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
    # ── Signature verification ────────────────────────────────────────────
    # Without a shared secret anyone could post fake PERMA labels, so the webhook stays
    # off until EMA_WEBHOOK_SECRET is set. The 6-hourly sync still pulls labels meanwhile.
    secret = current_app.config.get('EMA_WEBHOOK_SECRET', '')
    if not secret:
        return jsonify({'error': 'EMA webhook is not configured'}), 503
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
    saved = db.db.perma_snapshots.update_one(
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
            **(({'perma_score': data['perma_score']}) if isinstance(data.get('perma_score'), dict) else {}),
            **(({'student_user_id': student['_id']}) if student else {}),
        },
         '$setOnInsert': {'first_seen_at': now}},
        upsert=True,
    )
    if saved.upserted_id and perma_label == 'In Crisis' and student:
        from services.crisis_alerts import alert_new_crisis
        alert_new_crisis(db.db, student['_id'], entry_date)

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
        refresh_student_triage(db.db, student['_id'])
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
    if _staff_access_denied(user_id):
        return jsonify({'error': 'Insufficient permissions'}), 403

    now = datetime.utcnow()
    cutoff_30d = now - timedelta(days=30)
    cutoff_14d = now - timedelta(days=14)

    labels = ['Excelling', 'Thriving', 'Surviving', 'Struggling', 'In Crisis']
    from services.ema_access import student_filter
    mode, own = _ema_scope()
    students = list(db.db.users.find(
        {'mhbot_username': {'$exists': True, '$ne': None}, 'role': 'STUDENT', **student_filter(mode, own)},
        {'_id': 1, 'perma_triage_label': 1, 'perma_latest_label': 1, 'perma_latest_date': 1}
    ))

    total = len(students)
    by_label = {l: 0 for l in labels}
    by_label['No Data'] = 0
    active_30d = 0
    inactive_14d = 0

    for s in students:
        label = s.get('perma_triage_label') or s.get('perma_latest_label')
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
    """PERMA check-in counts from DB snapshots, bucketed by day/week/month."""
    user_id = get_jwt_identity()
    if _staff_access_denied(user_id):
        return jsonify({'error': 'Insufficient permissions'}), 403

    granularity = request.args.get('granularity', 'month')
    if granularity not in ('day', 'week', 'month'):
        granularity = 'month'
    now = datetime.utcnow() + timedelta(hours=8)   # buckets are Philippine days, weeks and months
    labels = ['Excelling', 'Thriving', 'Surviving', 'Struggling', 'In Crisis']

    if granularity == 'day':
        points = min(request.args.get('points', 14, type=int), 60)
        buckets = []
        for i in range(points - 1, -1, -1):
            d = now - timedelta(days=i)
            buckets.append(d.strftime('%Y-%m-%d'))
        start_dt = now - timedelta(days=points)

        def bucket_key(dt):
            return dt.strftime('%Y-%m-%d')

    elif granularity == 'week':
        points = min(request.args.get('points', 12, type=int), 26)
        buckets = []
        for i in range(points - 1, -1, -1):
            d = now - timedelta(weeks=i)
            iso_year, iso_week, _ = d.isocalendar()
            buckets.append(f"{iso_year}-W{str(iso_week).zfill(2)}")
        start_dt = now - timedelta(weeks=points)

        def bucket_key(dt):
            iso_year, iso_week, _ = dt.isocalendar()
            return f"{iso_year}-W{str(iso_week).zfill(2)}"

    else:  # month
        points = min(request.args.get('points', request.args.get('months', 6, type=int), type=int), 12)
        buckets = []
        for i in range(points - 1, -1, -1):
            m = now.month - i
            y = now.year
            while m <= 0:
                m += 12
                y -= 1
            buckets.append(f"{y}-{str(m).zfill(2)}")
        start_dt = datetime(now.year - 1, now.month, 1) if points > 1 else datetime(now.year, now.month, 1)

        def bucket_key(dt):
            return f"{dt.year}-{str(dt.month).zfill(2)}"

    result = {key: {l: 0 for l in labels} for key in buckets}

    from services.ema_access import OWN
    mode, own = _ema_scope()
    snap_filter = {'entry_date': {'$gte': start_dt - timedelta(hours=8)}}   # stored in UTC
    if mode == OWN:
        names = [u['mhbot_username'] for u in db.db.users.find({'_id': {'$in': list(own)}, 'mhbot_username': {'$nin': [None, '']}},
                                                                 {'mhbot_username': 1})]
        snap_filter['$or'] = [{'student_user_id': {'$in': list(own)}}, {'mhbot_username': {'$in': names}}]
    snapshots = db.db.perma_snapshots.find(
        snap_filter,
        {'entry_date': 1, 'perma_label': 1, 'student_user_id': 1, 'mhbot_username': 1},
    )
    # Students chat with EMA many times a day. Each student counts once per Philippine day:
    # the label bars use that day's hardest result, the average uses that day's mean.
    day_scores = {}   # (bucket, student, day) -> scores
    checkins = {key: 0 for key in buckets}
    for snap in snapshots:
        entry_date = snap.get('entry_date')
        label = snap.get('perma_label')
        if not entry_date or label not in labels:
            continue
        local = entry_date + timedelta(hours=8)
        key = bucket_key(local)
        if key in result:
            checkins[key] += 1
            who = snap.get('student_user_id') or snap.get('mhbot_username')
            day_scores.setdefault((key, who, local.date()), []).append(LABEL_SCORE[label])
    for (key, _, _), v in day_scores.items():
        result[key][SCORE_LABEL[min(v)]] += 1

    # Average score per bucket: mean of each student's daily average (1 = In Crisis … 5 = Excelling)
    per_bucket = {}
    for (key, _, _), v in day_scores.items():
        per_bucket.setdefault(key, []).append(sum(v) / len(v))
    scores = {}
    for key in buckets:
        v = per_bucket.get(key)
        scores[key] = {'avg': round(sum(v) / len(v), 2), 'label': label_for_score(sum(v) / len(v)),
                       'student_days': len(v)} if v else None

    return jsonify({'granularity': granularity, 'buckets': buckets, 'months': buckets, 'data': result, 'checkins': checkins, 'counting': 'student_days',
                    'scores': scores}), 200


@mhbot_bp.route('/analytics/college', methods=['GET'])
@jwt_required()
def get_ema_analytics_college():
    """EMA label distribution grouped by student college."""
    user_id = get_jwt_identity()
    if _staff_access_denied(user_id):
        return jsonify({'error': 'Insufficient permissions'}), 403

    labels = ['Excelling', 'Thriving', 'Surviving', 'Struggling', 'In Crisis']
    from services.ema_access import student_filter
    mode, own = _ema_scope()
    students = list(db.db.users.find(
        {'mhbot_username': {'$exists': True, '$ne': None}, 'role': 'STUDENT', **student_filter(mode, own)},
        {'college': 1, 'perma_triage_label': 1, 'perma_latest_label': 1}
    ))

    college_data: dict = {}
    for s in students:
        college = (s.get('college') or 'Unknown').strip() or 'Unknown'
        label = s.get('perma_triage_label') or s.get('perma_latest_label') or 'No Data'
        if college not in college_data:
            college_data[college] = {l: 0 for l in labels}
            college_data[college]['No Data'] = 0
        target = label if label in college_data[college] else 'No Data'
        college_data[college][target] += 1

    # Colleges with fewer than MIN_GROUP students are combined so no one can be singled out
    from services.ema_insights import MIN_GROUP
    other = {l: 0 for l in labels}
    other['No Data'] = 0
    merged = 0
    result = []
    for college, counts in sorted(college_data.items(), key=lambda x: -sum(x[1].values())):
        total_c = sum(counts.values())
        if total_c < MIN_GROUP:
            merged += 1
            for k, v in counts.items():
                other[k] += v
            continue
        at_risk_c = counts.get('Struggling', 0) + counts.get('In Crisis', 0)
        result.append({'college': college, 'total': total_c, 'at_risk': at_risk_c, **counts})
    other_total = sum(other.values())
    if merged and other_total >= MIN_GROUP:
        result.append({'college': 'Other colleges', 'total': other_total,
                       'at_risk': other.get('Struggling', 0) + other.get('In Crisis', 0), **other})

    return jsonify({'colleges': result, 'min_group': MIN_GROUP, 'merged_colleges': merged,
                    'hidden_students': other_total if merged and other_total < MIN_GROUP else 0}), 200


@mhbot_bp.route('/analytics/insights', methods=['GET'])
@jwt_required()
def get_ema_insights():
    """Crisis follow-up, declining students, before/after counseling, PERMA profile and the
    triage-vs-latest comparison (see services/ema_insights.py). Care team only."""
    if _staff_access_denied(get_jwt_identity()):
        return jsonify({'error': 'Insufficient permissions'}), 403
    from services.ema_insights import build_insights
    from services.ema_access import OWN, TOTALS
    mode, own = _ema_scope()
    return jsonify(build_insights(db.db, student_ids=own if mode == OWN else None,
                                  hide_names=mode == TOTALS, scope=mode)), 200


@mhbot_bp.route('/analytics/attention', methods=['GET'])
@jwt_required()
def get_ema_analytics_attention():
    """Students needing EMA attention: at-risk labels + long-inactive check-ins."""
    user_id = get_jwt_identity()
    if _staff_access_denied(user_id):
        return jsonify({'error': 'Insufficient permissions'}), 403

    from services.ema_access import student_filter, TOTALS
    mode, own = _ema_scope()
    inactive_days = request.args.get('inactive_days', 14, type=int)
    now = datetime.utcnow()
    inactive_cutoff = now - timedelta(days=inactive_days)

    students = list(db.db.users.find(
        {'mhbot_username': {'$exists': True, '$ne': None}, 'role': 'STUDENT', **student_filter(mode, own)},
        {'_id': 1, 'name': 1, 'email': 1, 'student_id': 1, 'college': 1,
         'year_level': 1, 'perma_triage_label': 1, 'perma_triage': 1, 'perma_latest_label': 1, 'perma_latest_date': 1}
    ))

    attention = []
    for s in students:
        label = s.get('perma_triage_label') or s.get('perma_latest_label')
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
            projection={'case_status': 1},
        )
        attention.append({
            'student_id': str(s['_id']),
            'name': s.get('name', ''),
            'email': s.get('email', ''),
            'school_id': str(s.get('student_id', '')),
            'college': s.get('college', ''),
            'year_level': str(s.get('year_level', '')),
            'label': label,
            'flags': (s.get('perma_triage') or {}).get('flags', []),
            'last_checkin': date_str,
            'reason': reason,
            'case_id': str(case['_id']) if case else None,
            'case_status': case.get('case_status') if case else None,
        })

    priority_map = {'at_risk': 0, 'inactive': 1, 'no_checkin': 2}
    label_map = {'In Crisis': 0, 'Struggling': 1}
    attention.sort(key=lambda x: (
        priority_map.get(x['reason'], 99),
        label_map.get(x['label'] or '', 99),
    ))

    if mode == TOTALS:   # admins and the DPO: how many, not who
        return jsonify({'students': [], 'total': len(attention), 'names_hidden': True}), 200
    return jsonify({'students': attention, 'total': len(attention)}), 200


# ── Triage: crisis review, per-student trend, thresholds ─────────────────────

CRISIS_REVIEW_ROLES = ('CASE_MANAGER', 'COUNSELOR', 'PSYCHOLOGIST')   # the care team, not admins


def _student_case_denied(user_id, student_oid):
    """Per-student EMA details follow the EMA scope: the student's own clinician or intake
    counselor, or a case manager. Admins and the DPO see totals only."""
    from services.ema_access import ema_scope, can_see_student
    mode, own = ema_scope(db.db, user_id)
    if not can_see_student(mode, own, student_oid):
        return (NOT_IN_CARE_ERROR, 403)
    return None


@mhbot_bp.route('/students/<student_id>/clear-crisis', methods=['POST'])
@jwt_required()
def clear_crisis_flag(student_id):
    """Mark the student's In Crisis results as reviewed. A later In Crisis flags them again."""
    user_id = get_jwt_identity()
    caller = db.db.users.find_one({'_id': _resolve_user_id(user_id)}, {'role': 1, 'name': 1})
    if not caller or caller.get('role') not in CRISIS_REVIEW_ROLES:
        return jsonify({'error': 'Only counselors, psychologists or case managers can clear a crisis flag'}), 403
    try:
        student_oid = ObjectId(student_id)
    except Exception:
        return jsonify({'error': 'Invalid student ID'}), 400
    denied = _student_case_denied(user_id, student_oid)
    if denied:
        return jsonify({'error': denied[0]}), denied[1]

    note = ((request.get_json() or {}).get('note') or '').strip()
    if len(note) < 10:
        return jsonify({'error': 'Write a short note (at least 10 characters) on how the crisis was followed up'}), 400

    student = db.db.users.find_one({'_id': student_oid, 'role': 'STUDENT'}, {'perma_triage': 1})
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    if not (student.get('perma_triage') or {}).get('crisis_pending_review'):
        return jsonify({'error': 'This student has no crisis flag waiting for review'}), 409

    now = datetime.utcnow()
    db.db.perma_crisis_reviews.insert_one({
        'student_id': student_oid, 'cleared_by': _resolve_user_id(user_id), 'cleared_by_role': caller.get('role'),
        'note': note[:2000], 'cleared_at': now,
    })
    db.db.users.update_one({'_id': student_oid}, {'$set': {'perma_crisis_cleared_at': now}})
    audit_log(db.db, 'perma_triage', 'clear_crisis', entity_id=student_id, new_values={'cleared_by': user_id})
    triage = refresh_student_triage(db.db, student_oid)
    return jsonify({'success': True, 'triage': triage}), 200


@mhbot_bp.route('/students/<student_id>/perma-trend', methods=['GET'])
@jwt_required()
def student_perma_trend(student_id):
    """Triage result, daily and monthly scores, weakest PERMA area and crisis reviews for one student."""
    user_id = get_jwt_identity()
    if _staff_access_denied(user_id):
        return jsonify({'error': 'Insufficient permissions'}), 403
    try:
        student_oid = ObjectId(student_id)
    except Exception:
        return jsonify({'error': 'Invalid student ID'}), 400
    denied = _student_case_denied(user_id, student_oid)
    if denied:
        return jsonify({'error': denied[0]}), denied[1]

    student = db.db.users.find_one({'_id': student_oid}, {'mhbot_username': 1, 'perma_triage': 1})
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    days = min(request.args.get('days', 90, type=int), 365)
    since = datetime.utcnow() - timedelta(days=days)
    query = {'student_user_id': student_oid}
    if student.get('mhbot_username'):
        query = {'$or': [query, {'mhbot_username': student['mhbot_username']}]}
    snaps = list(db.db.perma_snapshots.find(query, {'perma_label': 1, 'entry_date': 1, 'perma_score': 1}))
    recent = [x for x in snaps if x['entry_date'] >= since]
    reviews = list(db.db.perma_crisis_reviews.find({'student_id': student_oid}).sort('cleared_at', -1).limit(10))
    reviewers = {u['_id']: u.get('name') or u.get('email') for u in db.db.users.find(
        {'_id': {'$in': [r['cleared_by'] for r in reviews]}}, {'name': 1, 'email': 1})}
    return jsonify({
        'triage': student.get('perma_triage'),
        'daily': daily_scores(recent),
        'monthly': monthly_scores(snaps),
        'weakest_area': weakest_area(snaps, since=datetime.utcnow() - timedelta(days=30)),
        'crisis_reviews': [{'cleared_at': r['cleared_at'].isoformat(), 'note': r.get('note'),
                            'cleared_by': reviewers.get(r['cleared_by'], 'Staff')} for r in reviews],
    }), 200


@mhbot_bp.route('/triage-settings', methods=['GET', 'PUT'])
@jwt_required()
def triage_settings():
    """Triage thresholds. Anyone with case access can read them; only ADMIN can change them."""
    user_id = get_jwt_identity()
    if _staff_access_denied(user_id):
        return jsonify({'error': 'Insufficient permissions'}), 403
    if request.method == 'GET':
        return jsonify({'settings': get_settings(db.db), 'defaults': DEFAULT_SETTINGS}), 200

    caller = db.db.users.find_one({'_id': _resolve_user_id(user_id)}, {'role': 1})
    if (caller or {}).get('role') != 'ADMIN':
        return jsonify({'error': 'Only ADMIN can change triage settings'}), 403
    data = request.get_json() or {}
    limits = {'window_days': (1, 60), 'persistent_struggle_count': (2, 10), 'unstable_swing_levels': (2, 4)}
    update = {}
    for key, (lo, hi) in limits.items():
        if key in data:
            try:
                v = int(data[key])
            except (TypeError, ValueError):
                return jsonify({'error': f'{key} must be a whole number'}), 400
            if not lo <= v <= hi:
                return jsonify({'error': f'{key} must be between {lo} and {hi}'}), 400
            update[key] = v
    db.db.settings.update_one({'_id': 'perma_triage'}, {'$set': {**update, 'updated_at': datetime.utcnow(),
                                                                'updated_by': user_id}}, upsert=True)
    audit_log(db.db, 'perma_triage', 'update_settings', entity_id='perma_triage', new_values=update)
    from services.perma_triage import refresh_all_triage
    refresh_all_triage(db.db)
    return jsonify({'settings': get_settings(db.db)}), 200


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
