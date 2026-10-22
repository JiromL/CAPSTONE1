"""Encrypted token storage for third-party provider tokens"""
import base64
from cryptography.fernet import Fernet, InvalidToken
from datetime import datetime, timezone
from bson import ObjectId


def _owner(user_id):
    """Token owner key: a user's ObjectId, or a plain string for system accounts such as
    the shared CPS calendar ('__cps_system__')."""
    if isinstance(user_id, ObjectId):
        return user_id
    return ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id


def _get_fernet(config):
    # Handle both Config objects (attribute access) and Flask's current_app.config (dict access)
    if hasattr(config, 'ENCRYPTION_KEY'):
        key = config.ENCRYPTION_KEY
    elif isinstance(config, dict):
        key = config.get('ENCRYPTION_KEY')
    else:
        key = None
    
    if not key:
        raise RuntimeError('ENCRYPTION_KEY not set in config')
    # Allow raw base64 or plain key
    if isinstance(key, str) and len(key) == 44 and key.startswith('g'):  # not strict, best-effort
        bkey = key.encode()
    else:
        bkey = key.encode()
    return Fernet(bkey)


def save_tokens(db, config, user_id, provider, access_token, refresh_token, expires_at=None, scopes=None):
    f = _get_fernet(config)
    enc_access = f.encrypt(access_token.encode()).decode()
    enc_refresh = f.encrypt(refresh_token.encode()).decode() if refresh_token else None

    record = {
        'user_id': _owner(user_id),
        'provider': provider,
        'access_token': enc_access,
        'refresh_token': enc_refresh,
        'scopes': scopes or [],
        'expires_at': expires_at,
        'created_at': datetime.now(timezone.utc).replace(tzinfo=None),
        'last_used_at': None,
    }

    # Upsert by user+provider
    db.tokens.update_one(
        {'user_id': record['user_id'], 'provider': provider},
        {'$set': record},
        upsert=True
    )
    return True


def get_tokens(db, config, user_id, provider):
    f = _get_fernet(config)
    rec = db.tokens.find_one({'user_id': _owner(user_id), 'provider': provider})
    if not rec:
        return None
    try:
        access = f.decrypt(rec['access_token'].encode()).decode()
        refresh = f.decrypt(rec['refresh_token'].encode()).decode() if rec.get('refresh_token') else None
    except InvalidToken:
        raise RuntimeError('Failed to decrypt tokens - invalid ENCRYPTION_KEY')

    # Update last_used_at
    db.tokens.update_one({'_id': rec['_id']}, {'$set': {'last_used_at': datetime.now(timezone.utc).replace(tzinfo=None)}})

    return {
        'access_token': access,
        'refresh_token': refresh,
        'scopes': rec.get('scopes', []),
        'expires_at': rec.get('expires_at')
    }
