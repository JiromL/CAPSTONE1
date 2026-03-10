#!/usr/bin/env python3
"""
Final test: Create actual Zoom meeting via API
"""

import requests
import json

print("=" * 70)
print("✓ FINAL TEST: Create Zoom meeting via API")
print("=" * 70)

# Step 1: Authenticate
print("\n1. Getting token...")
auth = requests.post('http://localhost:8000/api/auth/login', 
    json={'email': 'admin@university.edu', 'password': 'admin123'}
)
token = auth.json()['access_token']
print(f"   ✅ Token: {token[:30]}...")

# Step 2: Submit intake form (should create meeting)
print("\n2. Submitting intake form...")
headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

intake_data = {
    'phq9_responses': [{'score': 2}] * 9,
    'gad7_responses': [],
    'pss_responses': [],
    'acad_responses': [],
    'concern': 'personal',
    'preferred_platform': 'zoom',
    'counselor_availability': {'monday': '9:00-17:00'},
    'consent_given': True
}

# Try the submit endpoint if it exists
response = requests.post('http://localhost:8000/api/intake/submit',
    json=intake_data,
    headers=headers,
    timeout=20
)

print(f"   Status: {response.status_code}")

if response.status_code == 200:
    result = response.json()
    print(f"   ✅ Form submitted successfully!")
    print(f"\n   Response:")
    print(json.dumps(result, indent=4))
    
    if 'meeting' in result and result['meeting']:
        meeting = result['meeting']
        print(f"\n   🔗 ZOOM MEETING CREATED:")
        print(f"      ID: {meeting.get('meeting_id')}")
        print(f"      URL: {meeting.get('join_url')}")
        print(f"      Password: {meeting.get('meeting_passcode')}")
elif response.status_code == 404:
    print(f"   ❌ Endpoint not found (404)")
    print(f"      Response: {response.text[:200]}")
else:
    print(f"   ❌ Error: {response.status_code}")
    print(f"      {response.json()}")

print("\n" + "=" * 70)
