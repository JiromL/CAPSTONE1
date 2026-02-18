"""Zoom integration stub"""
class ZoomIntegration:
    def __init__(self, config):
        self.client_id = config.ZOOM_CLIENT_ID
        self.client_secret = config.ZOOM_CLIENT_SECRET

    def create_meeting(self, access_token, topic, start_time, duration_minutes=60):
        # Real integration would call Zoom's API to create a meeting
        return {
            'id': 'zoom-meeting-stub-123',
            'join_url': 'https://zoom.us/j/zoom-meeting-stub-123',
            'start_time': start_time,
            'duration': duration_minutes,
        }
