#!/usr/bin/env python3
"""
Comprehensive test of Zoom OAuth2 integration
"""

import requests
import json
from datetime import datetime

print("=" * 70)
print("🔷 CPS ZOOM OAUTH2 INTEGRATION TEST")
print("=" * 70)

# Step 1: Verify services are running
print("\n✓ Step 1: Checking services...")
try:
    response = requests.get('http://localhost:8000/api/auth/status', timeout=2)
    print("  ✅ Backend on port 8000")
except:
    print("  ❌ Backend NOT running on port 8000")
    exit(1)

# Step 2: Authenticate 
print("\n✓ Step 2: Getting authentication token...")
auth_response = requests.post('http://localhost:8000/api/auth/login', 
    json={'email': 'admin@university.edu', 'password': 'admin123'},
    timeout=5
)
if auth_response.status_code != 200:
    print(f"  ❌ Login failed: {auth_response.status_code}")
    print(f"     {auth_response.json()}")
    exit(1)

token = auth_response.json()['access_token']
print(f"  ✅ Got JWT token")

headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

# Step 3: Test intake calculation (pre-meeting)
print("\n✓ Step 3: Calculate appointment date...")
calc_response = requests.post('http://localhost:8000/api/intake/calculate-appointment',
    json={
        'phq9_responses': [{'score': 2}] * 9,
        'gad7_responses': [],
        'pss_responses': [],
        'acad_responses': [],
        'concern': 'personal',
        'preferred_platform': 'zoom'
    },
    headers=headers,
    timeout=15
)

if calc_response.status_code != 200:
    print(f"  ❌ Failed: {calc_response.status_code}")
    print(f"     {calc_response.json()}")
else:
    result = calc_response.json()
    print(f"  ✅ Appointment calculated")
    print(f"     Urgency: {result.get('urgency_level')}")
    print(f"     Estimated date: {result.get('automatic_date_formatted')}")

# Step 4: Direct Zoom test   
print("\n✓ Step 4: Direct Zoom API test...")
from backend.integrations import ZoomIntegration
from backend.config import Config
from datetime import datetime, timedelta

try:
    zoom = ZoomIntegration(Config)
    appointment_date = datetime.utcnow() + timedelta(days=3)
    start_time = appointment_date.strftime('%Y-%m-%dT%H:%M:%S')
    
    result = zoom.create_meeting(
        topic='CPS Test Meeting',
        start_time=start_time,
        duration_minutes=60
    )
    
    print(f"  ✅ Zoom meeting created!")
    print(f"     Meeting ID: {result['meeting_id']}")
    print(f"     Join URL: {result['join_url']}")
    print(f"     Passcode: {result['meeting_passcode']}")
    
except Exception as e:
    print(f"  ❌ Failed: {str(e)}")

print("\n" + "=" * 70)
print("✓ TEST COMPLETE")
print("=" * 70)
