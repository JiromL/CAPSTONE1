#!/usr/bin/env python3
"""Verify Google Meet meeting was created in calendar"""

import sys
import json
import requests
import os
from datetime import datetime, timedelta

BASE_URL = 'http://localhost:8000'

print("=" * 70)
print("VERIFY GOOGLE MEET MEETING CREATED")
print("=" * 70)

# Get token
token_result = os.popen('cd /Users/jeromelouiesantos/CAPSTONE1 && python3 get_token.py 2>/dev/null').read().strip()
token = token_result

# Submit intake with Google Meet
intake_payload = {
    "email": "verify@student.dlsu.edu.ph",
    "first_name": "Verify",
    "last_name": "Test",
    "student_id": "VERIFY2024",
    "phone": "09123456789",
    "primary_concern": "personal",
    "concern_description": "Google Meet verification test",
    "consent_given": True,
    "phq9_responses": [
        {"question": 1, "score": 1},
        {"question": 2, "score": 1},
        {"question": 3, "score": 1},
        {"question": 4, "score": 1},
        {"question": 5, "score": 1},
        {"question": 6, "score": 1},
        {"question": 7, "score": 1},
        {"question": 8, "score": 1},
        {"question": 9, "score": 1}
    ],
    "gad7_responses": [],
    "pss_responses": [],
    "acad_responses": [],
    "preferred_platform": "google_meet",
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
        print("\n✓ Intake submitted successfully")
        print(f"\n📋 Full Response:")
        print(json.dumps(data, indent=2, default=str))
        
        appointment = data.get('appointment', {})
        if 'join_url' in appointment and appointment['join_url']:
            print(f"\n✅ GOOGLE MEET MEETING CREATED!")
            print(f"   Join URL: {appointment['join_url']}")
            if appointment['join_url'].startswith('https://meet.google.com'):
                print(f"   ✓ Valid Google Meet URL confirmed!")
        else:
            print(f"\n⚠ No join_url in response")
            print(f"   Appointment data: {appointment}")
    else:
        print(f"\n✗ Failed: {response.status_code}")
        print(f"   {response.text}")
        
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()
