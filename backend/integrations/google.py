"""Google integration stubs: OAuth, Calendar hooks"""
import os
from urllib.parse import urlencode
import requests
from datetime import datetime, timedelta
from .token_store import save_tokens, get_tokens


class GoogleIntegration:
    def __init__(self, config):
        self.client_id = config.GOOGLE_CLIENT_ID
        self.client_secret = config.GOOGLE_CLIENT_SECRET
        self.redirect_uri = os.getenv('GOOGLE_OAUTH_REDIRECT', 'http://localhost:5000/api/oauth/callback/google')
        self.scope = 'openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.send'

    def get_authorize_url(self, state=None):
        params = {
            'client_id': self.client_id,
            'response_type': 'code',
            'scope': self.scope,
            'redirect_uri': self.redirect_uri,
            'access_type': 'offline',
            'prompt': 'consent'
        }
        if state:
            params['state'] = state
        return 'https://accounts.google.com/o/oauth2/v2/auth?' + urlencode(params)

    def exchange_code(self, code):
        # Exchange authorization code for tokens
        token_url = 'https://oauth2.googleapis.com/token'
        data = {
            'code': code,
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'redirect_uri': self.redirect_uri,
            'grant_type': 'authorization_code'
        }
        resp = requests.post(token_url, data=data, timeout=10)
        resp.raise_for_status()
        return resp.json()

    def exchange_code_and_store(self, db, config, user_id, code):
        tokens = self.exchange_code(code)
        access = tokens.get('access_token')
        refresh = tokens.get('refresh_token')
        expires_in = tokens.get('expires_in')
        expires_at = None
        if expires_in:
            expires_at = datetime.utcnow() + timedelta(seconds=int(expires_in))
        save_tokens(db, config, user_id, 'google', access, refresh, expires_at=expires_at, scopes=self.scope.split())
        return tokens

    def create_calendar_event(self, access_token, event):
        # event: {summary, start: {dateTime, timeZone}, end: {...}, attendees: []}
        url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
        headers = {'Authorization': f'Bearer {access_token}', 'Content-Type': 'application/json'}
        resp = requests.post(url, json=event, headers=headers, timeout=10)
        resp.raise_for_status()
        return resp.json()
