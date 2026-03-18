"""Zoom integration for creating real Zoom meetings via API"""

import requests
import base64
import time
from datetime import datetime, timedelta


class ZoomIntegration:
    """
    Real Zoom API integration for creating meetings.
    Uses Server-to-Server OAuth2 with account credentials flow.
    """

    ZOOM_API_BASE = "https://api.zoom.us/v2"
    ZOOM_OAUTH_TOKEN_URL = "https://zoom.us/oauth/token"
    TOKEN_EXPIRY_BUFFER = 300  # 5 minute buffer before expiry

    def __init__(self, config):
        # Handle both Config class and Flask config dict
        if hasattr(config, 'ZOOM_ACCOUNT_ID'):
            # Direct Config class
            self.account_id = config.ZOOM_ACCOUNT_ID
            self.client_id = config.ZOOM_CLIENT_ID
            self.client_secret = config.ZOOM_CLIENT_SECRET
        else:
            # Flask config (dict-like)
            self.account_id = config.get('ZOOM_ACCOUNT_ID')
            self.client_id = config.get('ZOOM_CLIENT_ID')
            self.client_secret = config.get('ZOOM_CLIENT_SECRET')
        
        self._access_token = None
        self._token_expiry = None

    def _get_oauth_token(self):
        """
        Get OAuth access token using account credentials flow.
        This authenticates with Zoom using Client ID and Secret.
        """
        # Check if current token is still valid (with buffer)
        if self._access_token and self._token_expiry:
            time_remaining = (self._token_expiry - datetime.utcnow()).total_seconds()
            if time_remaining > self.TOKEN_EXPIRY_BUFFER:
                return self._access_token

        # Create Basic Auth header
        auth_string = f"{self.client_id}:{self.client_secret}"
        auth_bytes = auth_string.encode('utf-8')
        auth_b64 = base64.b64encode(auth_bytes).decode('utf-8')

        headers = {
            "Authorization": f"Basic {auth_b64}",
            "Content-Type": "application/x-www-form-urlencoded"
        }

        data = {
            "grant_type": "account_credentials",
            "account_id": self.account_id
        }

        try:
            response = requests.post(
                self.ZOOM_OAUTH_TOKEN_URL,
                headers=headers,
                data=data,
                timeout=10
            )
            response.raise_for_status()

            token_data = response.json()
            self._access_token = token_data.get('access_token')
            expires_in = token_data.get('expires_in', 3600)
            self._token_expiry = datetime.utcnow() + timedelta(seconds=expires_in)

            return self._access_token

        except requests.exceptions.RequestException as e:
            error_msg = f"Failed to get Zoom OAuth token: {str(e)}"
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_data = e.response.json()
                    error_msg = f"Zoom OAuth error: {error_data}"
                except:
                    error_msg = f"Zoom OAuth error: {e.response.text}"
            raise Exception(error_msg)

    def _get_headers(self):
        """Get authorization headers with OAuth access token"""
        token = self._get_oauth_token()
        return {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

    def create_meeting(self, topic, start_time, duration_minutes=60, password=None):
        """
        Create a real Zoom meeting via the API.

        Args:
            topic: Meeting topic/title
            start_time: ISO format datetime string (e.g., '2026-03-15T10:30:00')
            duration_minutes: Meeting duration in minutes
            password: Optional meeting password

        Returns:
            dict: Meeting info including join_url, meeting_id, passcode
            or raises Exception if API call fails
        """
        if not self.client_id or not self.client_secret or not self.account_id:
            raise ValueError("Zoom Account ID, Client ID and Secret are required")

        # Use /users/me/meetings - OAuth token authenticates to the account
        url = f"{self.ZOOM_API_BASE}/users/me/meetings"

        # Generate password if not provided
        if not password:
            password = ''.join(
                str(i % 10) for i in range(int(time.time()) % 1000, int(time.time()) % 1000 + 6)
            )

        payload = {
            'topic': topic,
            'type': 2,  # 2 = Scheduled meeting
            'start_time': start_time,
            'duration': duration_minutes,
            'password': password,
            'timezone': 'UTC',
            'settings': {
                'host_video': True,
                'participant_video': True,
                'join_before_host': False,
                'mute_upon_entry': False,
                'waiting_room': False,
                'audio': 'both',
                'auto_recording': 'none'
            }
        }

        print(f"🔷 ZOOM DEBUG: Creating meeting")
        print(f"   Topic: {topic}")
        print(f"   Start time: {start_time}")
        print(f"   Duration: {duration_minutes} min")
        print(f"   Password: {password}")
        print(f"   Payload: {payload}")

        try:
            response = requests.post(
                url,
                json=payload,
                headers=self._get_headers(),
                timeout=10
            )
            
            print(f"🔷 ZOOM RESPONSE: Status {response.status_code}")
            print(f"   Response: {response.text[:500]}")
            
            response.raise_for_status()

            meeting_data = response.json()

            return {
                'platform': 'zoom',
                'meeting_id': meeting_data.get('id'),
                'join_url': meeting_data.get('join_url'),
                'meeting_passcode': password,
                'start_time': meeting_data.get('start_time'),
                'duration': meeting_data.get('duration'),
                'topic': meeting_data.get('topic'),
                'status': 'successfully_created'
            }

        except requests.exceptions.RequestException as e:
            error_msg = str(e)
            if hasattr(e, 'response') and hasattr(e.response, 'text'):
                error_msg = e.response.text
            print(f"❌ ZOOM ERROR: {error_msg}")
            raise Exception(f"Failed to create Zoom meeting: {error_msg}")

    def get_meeting(self, meeting_id):
        """Get details of an existing Zoom meeting"""
        if not self.client_id or not self.client_secret:
            raise ValueError("Zoom Client ID and Secret are required")

        url = f"{self.ZOOM_API_BASE}/meetings/{meeting_id}"

        try:
            response = requests.get(
                url,
                headers=self._get_headers(),
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to get Zoom meeting: {str(e)}")

    def delete_meeting(self, meeting_id):
        """Delete a Zoom meeting"""
        if not self.client_id or not self.client_secret:
            raise ValueError("Zoom Client ID and Secret are required")

        url = f"{self.ZOOM_API_BASE}/meetings/{meeting_id}"

        try:
            response = requests.delete(
                url,
                headers=self._get_headers(),
                timeout=10
            )
            response.raise_for_status()
            return {'status': 'deleted', 'meeting_id': meeting_id}
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to delete Zoom meeting: {str(e)}")
