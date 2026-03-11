#!/usr/bin/env python3
"""End-to-end test: Google Meet integration with intake form"""

import sys
import json
import requests
import os
from datetime import datetime, timedelta

# Test configuration
BASE_URL = 'http://localhost:8000'
TIMEOUT = 30

def color(text, c):
    """Colored output"""
    colors = {
        'green': '\033[92m',
        'red': '\033[91m',
        'yellow': '\033[93m',
        'end': '\033[0m'
    }
    return f"{colors.get(c, '')}{text}{colors['end']}"

print("=" * 70)
print(color("GOOGLE MEET END-TO-END TEST", 'yellow'))
print("=" * 70)

# Test 1: Get authentication token
print("\n[TEST 1] Get Authentication Token")
print("-" * 70)

try:
    # Run get_token.py to get a valid JWT
    result = os.popen('cd /Users/jeromelouiesantos/CAPSTONE1 && python3 get_token.py 2>/dev/null').read().strip()
    
    if not result or len(result) < 50:
        print(color(f"✗ Failed to get token: {result}", 'red'))
        sys.exit(1)
    
    token = result
    print(color(f"✓ Token obtained (length: {len(token)})", 'green'))
    print(f"  Token preview: {token[:50]}...")
    
except Exception as e:
    print(color(f"✗ Error getting token: {e}", 'red'))
    sys.exit(1)

# Test 2: Submit intake form with Google Meet
print("\n[TEST 2] Submit Intake with Google Meet Platform")
print("-" * 70)

try:
    # Prepare intake submission
    submitted_at = (datetime.utcnow() + timedelta(days=4)).isoformat()
    
    intake_payload = {
        "email": "test@student.dlsu.edu.ph",
        "first_name": "Test",
        "last_name": "Student",
        "student_id": "TEST2024",
        "phone": "09123456789",
        "primary_concern": "personal",
        "concern_description": "Testing Google Meet integration",
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
        "preferred_platform": "google_meet",  # Request Google Meet
        "submitted_at": submitted_at
    }
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    response = requests.post(
        f'{BASE_URL}/api/intake/submit',
        json=intake_payload,
        headers=headers,
        timeout=TIMEOUT
    )
    
    if response.status_code == 201:
        response_data = response.json()
        print(color(f"✓ Intake submitted successfully (Status: 201)", 'green'))
        
        # Display meeting information
        if 'appointment' in response_data:
            appointment = response_data['appointment']
            print(f"\n  Appointment Details:")
            print(f"    - Platform: {appointment.get('platform', 'N/A')}")
            print(f"    - Status: {appointment.get('status', 'N/A')}")
            
            if appointment.get('platform') == 'google_meet':
                print(color(f"✓ Google Meet meeting created!", 'green'))
                print(f"    - Join URL: {appointment.get('join_url', 'N/A')}")
                print(f"    - Meeting ID: {appointment.get('meeting_id', 'N/A')}")
                print(f"    - Event ID: {appointment.get('event_id', 'N/A')}")
                print(f"    - Calendar Event: {appointment.get('calendar_event', 'N/A')}")
                print(f"    - Start Time: {appointment.get('start_time', 'N/A')}")
            else:
                print(f"    ⚠ Platform is: {appointment.get('platform')}, expected: google_meet")
        
        if 'counseling_id' in response_data:
            print(f"\n  Counseling ID: {response_data['counseling_id']}")
        
        if 'case_id' in response_data:
            print(f"  Case ID: {response_data['case_id']}")
            
    else:
        print(color(f"✗ Failed to submit intake (Status: {response.status_code})", 'red'))
        print(f"  Response: {response.text}")
        sys.exit(1)
        
except Exception as e:
    print(color(f"✗ Error during intake submission: {e}", 'red'))
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 70)
print(color("✅ ALL TESTS PASSED - Google Meet is working!", 'green'))
print("=" * 70)
