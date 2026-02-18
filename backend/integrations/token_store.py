"""Encrypted token storage for third-party provider tokens"""
import base64
from cryptography.fernet import Fernet, InvalidToken
from datetime import datetime
from bson import ObjectId


def _get_fernet(config):
    key = config.ENCRYPTION_KEY
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
        'user_id': ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id,
        'provider': provider,
        'access_token': enc_access,
        'refresh_token': enc_refresh,
        'scopes': scopes or [],
        'expires_at': expires_at,
        'created_at': datetime.utcnow(),
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
    rec = db.tokens.find_one({'user_id': ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id, 'provider': provider})
    if not rec:
        return None
    try:
        access = f.decrypt(rec['access_token'].encode()).decode()
        refresh = f.decrypt(rec['refresh_token'].encode()).decode() if rec.get('refresh_token') else None
    except InvalidToken:
        raise RuntimeError('Failed to decrypt tokens - invalid ENCRYPTION_KEY')

    # Update last_used_at
    db.tokens.update_one({'_id': rec['_id']}, {'$set': {'last_used_at': datetime.utcnow()}})

    return {
        'access_token': access,
        'refresh_token': refresh,
        'scopes': rec.get('scopes', []),
        'expires_at': rec.get('expires_at')
    }
