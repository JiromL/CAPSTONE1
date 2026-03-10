#!/usr/bin/env python3
"""Test the intake endpoint with Zoom meeting creation"""

import requests
import json

# Get token
print("Getting auth token...")
token_response = requests.post('http://localhost:8000/api/auth/login', json={
    'email': 'admin@university.edu',
    'password': 'admin123'
})

if token_response.status_code != 200:
    print(f"❌ Login failed: {token_response.text}")
    exit(1)

token = token_response.json()['access_token']
print(f"✅ Got token: {token[:50]}...")

# Test intake endpoint
test_data = {
    'phq9_responses': [{'score': 2}, {'score': 1}, {'score': 3}, {'score': 2}, {'score': 1}, {'score': 1}, {'score': 2}, {'score': 1}, {'score': 2}],
    'gad7_responses': [],
    'pss_responses': [],
    'acad_responses': [],
    'concern': 'personal',
    'preferred_platform': 'zoom'
}

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

print("\n📝 Testing /api/intake/calculate-appointment endpoint...")
response = requests.post(
    'http://localhost:8000/api/intake/calculate-appointment',
    json=test_data,
    headers=headers,
    timeout=15
)

print(f"Status: {response.status_code}")
print(f"\nResponse:")
try:
    result = response.json()
    print(json.dumps(result, indent=2))
    
    if response.status_code == 200:
        print("\n✅ Intake calculation successful!")
        if 'meeting' in result and result['meeting']:
            print(f"\n🔗 Zoom Meeting Details:")
            print(f"   ID: {result['meeting'].get('meeting_id')}")
            print(f"   Join URL: {result['meeting'].get('join_url')}")
            print(f"   Passcode: {result['meeting'].get('meeting_passcode')}")
    else:
        print(f"\n❌ Request failed: {response.status_code}")
except Exception as e:
    print(f"Error: {e}")
    print(f"Raw response: {response.text[:500]}")
