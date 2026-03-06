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
        """Create calendar event (therapy session/appointment)
        event: {
            'summary': 'Therapy Session - John Doe',
            'description': 'Clinical assessment and treatment planning',
            'start': {'dateTime': '2026-03-15T14:00:00', 'timeZone': 'America/New_York'},
            'end': {'dateTime': '2026-03-15T15:00:00', 'timeZone': 'America/New_York'},
            'attendees': [{'email': 'counselor@university.edu'}, {'email': 'student@university.edu'}],
            'reminders': {'useDefault': False, 'overrides': [{'method': 'email', 'minutes': 24*60}]}
        }
        """
        url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
        headers = {'Authorization': f'Bearer {access_token}', 'Content-Type': 'application/json'}
        resp = requests.post(url, json=event, headers=headers, timeout=10)
        resp.raise_for_status()
        return resp.json()

    def update_calendar_event(self, access_token, event_id, event):
        """Update existing calendar event"""
        url = f'https://www.googleapis.com/calendar/v3/calendars/primary/events/{event_id}'
        headers = {'Authorization': f'Bearer {access_token}', 'Content-Type': 'application/json'}
        resp = requests.patch(url, json=event, headers=headers, timeout=10)
        resp.raise_for_status()
        return resp.json()

    def delete_calendar_event(self, access_token, event_id):
        """Delete calendar event"""
        url = f'https://www.googleapis.com/calendar/v3/calendars/primary/events/{event_id}'
        headers = {'Authorization': f'Bearer {access_token}'}
        resp = requests.delete(url, headers=headers, timeout=10)
        resp.raise_for_status()
        return {'success': True}

    def get_calendar_events(self, access_token, time_min, time_max, max_results=10):
        """Get calendar events for a time range"""
        url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
        headers = {'Authorization': f'Bearer {access_token}'}
        params = {
            'timeMin': time_min,
            'timeMax': time_max,
            'maxResults': max_results,
            'singleEvents': True,
            'orderBy': 'startTime'
        }
        resp = requests.get(url, headers=headers, params=params, timeout=10)
        resp.raise_for_status()
        return resp.json()

    def get_free_slots(self, access_token, date, duration_minutes=60):
        """Find available time slots on a given date"""
        from datetime import datetime, timedelta
        
        # Get all events for the day
        day_start = f"{date}T00:00:00Z"
        day_end = f"{date}T23:59:59Z"
        events = self.get_calendar_events(access_token, day_start, day_end, max_results=50)
        
        # Business hours: 9am - 5pm
        busy_times = []
        for event in events.get('items', []):
            start = event['start'].get('dateTime', event['start'].get('date'))
            end = event['end'].get('dateTime', event['end'].get('date'))
            busy_times.append((start, end))
        
        # Calculate free slots
        free_slots = []
        current = datetime.fromisoformat(f"{date}T09:00:00")
        end_of_day = datetime.fromisoformat(f"{date}T17:00:00")
        
        while current + timedelta(minutes=duration_minutes) <= end_of_day:
            slot_end = current + timedelta(minutes=duration_minutes)
            # Check if slot overlaps with any busy time
            is_free = True
            for busy_start, busy_end in busy_times:
                if isinstance(busy_start, str):
                    busy_start = datetime.fromisoformat(busy_start.replace('Z', '+00:00'))
                    busy_end = datetime.fromisoformat(busy_end.replace('Z', '+00:00'))
                
                if current < busy_end and slot_end > busy_start:
                    is_free = False
                    break
            
            if is_free:
                free_slots.append({
                    'start': current.isoformat(),
                    'end': slot_end.isoformat()
                })
            
            current += timedelta(minutes=30)  # 30-min increment
        
        return free_slots
