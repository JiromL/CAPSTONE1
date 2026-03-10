"""Zoom integration for creating real Zoom meetings via API"""

import jwt
import requests
import time
from datetime import datetime, timedelta


class ZoomIntegration:
    """
    Real Zoom API integration for creating meetings.
    Creates JWT tokens and makes API calls to Zoom's meeting endpoint.
    """

    ZOOM_API_BASE = "https://api.zoom.us/v2"
    TOKEN_EXPIRY_SECONDS = 3600  # 1 hour

    def __init__(self, config):
        self.client_id = config.ZOOM_CLIENT_ID
        self.client_secret = config.ZOOM_CLIENT_SECRET
        self._jwt_token = None
        self._token_expiry = None

    def _generate_jwt_token(self):
        """
        Generate a JWT token for Zoom API authentication.
        This is the Server-to-Server OAuth token generation.
        """
        if self._jwt_token and self._token_expiry and datetime.utcnow() < self._token_expiry:
            return self._jwt_token

        payload = {
            'iss': self.client_id,
            'exp': int(time.time()) + self.TOKEN_EXPIRY_SECONDS
        }

        self._jwt_token = jwt.encode(payload, self.client_secret, algorithm='HS256')
        self._token_expiry = datetime.utcnow() + timedelta(seconds=self.TOKEN_EXPIRY_SECONDS - 60)
        return self._jwt_token

    def _get_headers(self):
        """Get authorization headers with JWT token"""
        token = self._generate_jwt_token()
        return {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

    def create_meeting(self, user_id, topic, start_time, duration_minutes=60, password=None):
        """
        Create a real Zoom meeting via the API.

        Args:
            user_id: Zoom user ID (usually "me" for the account owner)
            topic: Meeting topic/title
            start_time: ISO format datetime string (e.g., '2026-03-15T10:30:00')
            duration_minutes: Meeting duration in minutes
            password: Optional meeting password

        Returns:
            dict: Meeting info including join_url, meeting_id, passcode
            or raises Exception if API call fails
        """
        if not self.client_id or not self.client_secret:
            raise ValueError("Zoom Client ID and Secret are required")

        url = f"{self.ZOOM_API_BASE}/users/{user_id}/meetings"

        # Use default password if not provided
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

        try:
            response = requests.post(
                url,
                json=payload,
                headers=self._get_headers(),
                timeout=10
            )
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
            if hasattr(e.response, 'text'):
                error_msg = e.response.text
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
