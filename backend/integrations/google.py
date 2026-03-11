"""Google integration: OAuth, Calendar, and Google Meet meeting creation"""
import os
import json
from urllib.parse import urlencode
import requests
from datetime import datetime, timedelta
from email.utils import parsedate_to_datetime
from .token_store import save_tokens, get_tokens


class GoogleMeetIntegration:
    """
    Create real Google Meet meetings via Google Calendar API.
    Requires Google OAuth access token (either service account or user-delegated).
    """

    CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3"
    _real_time_cache = None

    def __init__(self, config):
        """
        Initialize with config. For real meet creation, provide:
        - GOOGLE_SERVICE_ACCOUNT_EMAIL (service account)
        - GOOGLE_SERVICE_ACCOUNT_KEY (service account JSON key)
        OR
        - A user's OAuth access token for Google Calendar
        """
        self.config = config
        self.service_account_email = os.getenv('GOOGLE_SERVICE_ACCOUNT_EMAIL')
        self.service_account_key_str = os.getenv('GOOGLE_SERVICE_ACCOUNT_KEY')
    
    @staticmethod
    def _get_real_time():
        """
        Get real current time from HTTP response headers.
        Workaround for environments where system clock is incorrect.
        Extracts server time from Google API response Date header.
        """
        # Return cached time if available (valid for ~1 second)
        if GoogleMeetIntegration._real_time_cache:
            cached_time, cached_timestamp = GoogleMeetIntegration._real_time_cache
            if datetime.now().timestamp() - cached_timestamp < 1:
                return cached_time
        
        try:
            # Make HEAD request to get server time from response header
            response = requests.head('https://www.google.com', timeout=5)
            if 'date' in response.headers:
                # Parse RFC 2822 date format from HTTP header
                server_time = parsedate_to_datetime(response.headers['date'])
                timestamp = int(server_time.timestamp())
                # Cache the result
                GoogleMeetIntegration._real_time_cache = (timestamp, datetime.now().timestamp())
                return timestamp
        except Exception:
            pass
        
        # Fallback: use system time (may be incorrect but better than nothing)
        return int(datetime.utcnow().timestamp())
        
    def _get_service_account_token(self):
        """
        Get OAuth token for service account using JWT grant.
        Needed for calendar.insert scope with service account.
        Uses real current time from server (workaround for incorrect system clocks).
        """
        if not self.service_account_key_str:
            raise ValueError("GOOGLE_SERVICE_ACCOUNT_KEY not configured")
        
        try:
            import jwt
        except ImportError:
            raise ImportError("PyJWT required for service account authentication. Install: pip install PyJWT")
        
        key_data = json.loads(self.service_account_key_str)
        
        # Get real current time from server (handles clock skew)
        iat = self._get_real_time()
        exp = iat + 3600
        
        payload = {
            "iss": key_data.get('client_email'),
            "scope": "https://www.googleapis.com/auth/calendar",
            "aud": "https://oauth2.googleapis.com/token",
            "exp": exp,
            "iat": iat,
        }
        
        token = jwt.encode(payload, key_data.get('private_key'), algorithm='RS256')
        
        # Exchange JWT for access token
        token_data = {
            'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion': token,
        }
        
        response = requests.post('https://oauth2.googleapis.com/token', data=token_data, timeout=10)
        response.raise_for_status()
        
        return response.json().get('access_token')

    def create_meeting(self, title, start_time, duration_minutes=60, description=None, attendees_emails=None):
        """
        Create a Google Meet meeting via Calendar API.
        
        Args:
            title: Meeting title
            start_time: datetime object or ISO string
            duration_minutes: Meeting duration
            description: Meeting description
            attendees_emails: List of email addresses to invite
            
        Returns:
            dict: Meeting info with conferenceData including Google Meet link
            or raises Exception if creation fails
        """
        try:
            access_token = self._get_service_account_token()
        except Exception as e:
            raise Exception(f"Failed to get Google service account token: {str(e)}")
        
        # Parse start_time if it's a string
        if isinstance(start_time, str):
            start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        else:
            start_dt = start_time
        
        end_dt = start_dt + timedelta(minutes=duration_minutes)
        
        # Build event payload
        event = {
            'summary': title,
            'description': description or 'Counseling & Psychology Services Appointment',
            'start': {
                'dateTime': start_dt.isoformat(),
                'timeZone': 'America/New_York',
            },
            'end': {
                'dateTime': end_dt.isoformat(),
                'timeZone': 'America/New_York',
            },
            'conferenceData': {
                'createRequest': {
                    'requestId': f"meet-{int(datetime.utcnow().timestamp())}",
                    'conferenceSolution': {
                        'key': {
                            'type': 'hangoutsMeet',
                        },
                    },
                },
            },
        }
        
        # Force conference creation by adding service account as attendee
        # However, service accounts without domain-wide delegation can't add attendees
        # So as a workaround, we'll create the event without attendees and generate a Meet URL
        attendees_list = list(attendees_emails) if attendees_emails else []
        
        if attendees_list:
            event['attendees'] = [{'email': email, 'responseStatus': 'needsAction'} for email in attendees_list]
        
        # Create calendar event with Google Meet
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json',
        }
        
        params = {
            'conferenceDataVersion': 1,
            'sendUpdates': 'all' if attendees_list else 'none',
        }
        
        try:
            response = requests.post(
                f'{self.CALENDAR_API_BASE}/calendars/primary/events',
                json=event,
                headers=headers,
                params=params,
                timeout=10
            )
            response.raise_for_status()
            
            event_data = response.json()
            
            # The calendar event contains the Google Meet link
            # Students access the meeting through the calendar invite
            calendar_link = event_data.get('htmlLink')
            
            return {
                'platform': 'google_meet',
                'meeting_id': event_data.get('id'),
                'join_url': calendar_link,  # Calendar invite link that contains the Meet
                'event_id': event_data.get('id'),
                'calendar_event': calendar_link,
                'start_time': event_data.get('start', {}).get('dateTime'),
                'end_time': event_data.get('end', {}).get('dateTime'),
                'status': 'successfully_created',
            }
            
        except requests.exceptions.RequestException as e:
            error_msg = str(e)
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_msg = e.response.json()
                except:
                    error_msg = e.response.text
            raise Exception(f"Failed to create Google Meet: {error_msg}")


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
