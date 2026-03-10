#!/usr/bin/env python3
import requests
import json
from datetime import datetime, timedelta

BASE_URL = 'http://localhost:8000'
USER_LOGIN = {'email': 'student1@university.edu', 'password': 'test123'}

# Step 1: Login
print("1️⃣ Logging in...")
resp = requests.post(f'{BASE_URL}/api/auth/login', json=USER_LOGIN)
if resp.status_code != 200:
    print(f"❌ Login failed: {resp.status_code}")
    print(resp.text)
    exit(1)

token = resp.json().get('access_token')
print(f"✅ Got token: {token[:20]}...")

# Step 2: Submit intake
print("\n2️⃣ Submitting intake form...")

tomorrow = (datetime.now() + timedelta(days=1)).isoformat()

payload = {
    "purpose": "anxiety",
    "is_emergency": False,
    "emergency_notes": "",
    "is_anonymous": False,
    "consent_given": True,
    "preferred_platform": "zoom",
    "appointment_date": tomorrow,
    "appointment_time": "14:00",
    "gad7_responses": [1, 2, 1, 0, 1, 0, 1],
    "phq9_responses": [0, 1, 1, 0, 0, 0, 0, 0, 0],
    "pss_responses": [1, 1, 0, 1, 0, 0, 0, 0, 0, 1]
}

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

resp = requests.post(f'{BASE_URL}/api/intake/submit', json=payload, headers=headers)
print(f"Status: {resp.status_code}")

if resp.status_code != 201:
    print(f"❌ Intake submission failed!")
    print(resp.text)
    exit(1)

data = resp.json()
print(f"✅ Intake submitted successfully!")

# Step 3: Check for appointment
print("\n3️⃣ Checking appointment data...")
if 'appointment' in data:
    appt = data['appointment']
    print(f"✅ Appointment object found!")
    print(f"   - Has join_url: {('join_url' in appt)}")
    print(f"   - URL: {appt.get('join_url', 'MISSING')}")
    print(f"   - meeting_id: {appt.get('meeting_id', 'MISSING')}")
    print(f"   - passcode: {appt.get('passcode', 'MISSING')}")
    print(f"   - platform: {appt.get('platform', 'MISSING')}")
    print(f"   - preferred_platform: {appt.get('preferred_platform', 'MISSING')}")
    
    print(f"\n📋 Full appointment object:")
    print(json.dumps(appt, indent=2))
else:
    print(f"❌ No 'appointment' key in response!")
    print(f"Response keys: {list(data.keys())}")

print(f"\n🎉 Test complete! Meeting link: {data['appointment'].get('join_url', 'NOT FOUND')}")
