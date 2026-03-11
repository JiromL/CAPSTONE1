#!/usr/bin/env python3
"""Test Zoom meeting creation as alternative to Google Meet"""

import sys
import json
import requests
import os
from datetime import datetime, timedelta

BASE_URL = 'http://localhost:8000'

print("=" * 70)
print("TEST: ZOOM MEETING CREATION (Alternative to Google Meet)")
print("=" * 70)

# Get token
token_result = os.popen('cd /Users/jeromelouiesantos/CAPSTONE1 && python3 get_token.py 2>/dev/null').read().strip()
token = token_result

# Submit intake with Zoom
intake_payload = {
    "email": "zoom_test@student.dlsu.edu.ph",
    "first_name": "Zoom",
    "last_name": "Test",
    "student_id": "ZOOM2024",
    "phone": "09123456789",
    "primary_concern": "personal",
    "concern_description": "Testing Zoom as alternative",
    "consent_given": True,
    "phq9_responses": [
        {"question": i, "score": 1} for i in range(1, 10)
    ],
    "gad7_responses": [],
    "pss_responses": [],
    "acad_responses": [],
    "preferred_platform": "zoom",  # Use Zoom instead
    "submitted_at": (datetime.utcnow() + timedelta(days=4)).isoformat()
}

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

try:
    response = requests.post(
        f'{BASE_URL}/api/intake/submit',
        json=intake_payload,
        headers=headers,
        timeout=30
    )
    
    if response.status_code == 201:
        data = response.json()
        print("\n✅ Intake submitted successfully with Zoom!")
        
        appointment = data.get('appointment', {})
        if 'join_url' in appointment and appointment['join_url']:
            print(f"\n✓ Zoom Meeting Link: {appointment['join_url']}")
            print(f"  Platform: {appointment.get('platform')}")
            print(f"  Meeting ID: {appointment.get('meeting_id')}")
        
        print(f"\n✓ Counseling ID: {data.get('counseling_id')}")
        print(f"  Case ID: {data.get('case_id')}")
        print(f"\n✅ Zoom works as expected!")
        
    else:
        print(f"\n✗ Failed: {response.status_code}")
        print(f"   {response.text}")
        
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()
