import pytest
from integrations.token_store import save_tokens, get_tokens
from cryptography.fernet import Fernet
from bson import ObjectId


class FakeCollection:
    def __init__(self):
        self.storage = {}

    def update_one(self, query, update, upsert=False):
        # simple upsert by user_id+provider
        key = (str(query.get('user_id')), query.get('provider')) if query.get('provider') else (str(query.get('user_id')),)
        rec = update.get('$set', update)
        # ensure an _id exists to simulate MongoDB behavior
        if rec is None:
            rec = {}
        if '_id' not in rec:
            rec['_id'] = f"fakeid-{len(self.storage) + 1}"
        self.storage[key] = rec

    def find_one(self, query):
        key = (str(query.get('user_id')), query.get('provider')) if query.get('provider') else (str(query.get('user_id')),)
        return self.storage.get(key)


class FakeDB:
    def __init__(self):
        self.tokens = FakeCollection()


class Cfg:
    def __init__(self, key):
        self.ENCRYPTION_KEY = key


def test_save_and_get_tokens():
    key = Fernet.generate_key().decode()
    cfg = Cfg(key)
    db = FakeDB()
    user_id = '000000000000000000000001'
    provider = 'google'
    access = 'access-123'
    refresh = 'refresh-456'

    # Save tokens
    save_tokens(db, cfg, user_id, provider, access, refresh)

    # Retrieve tokens
    tokens = get_tokens(db, cfg, user_id, provider)
    assert tokens['access_token'] == access
    assert tokens['refresh_token'] == refresh
