#!/usr/bin/env python3
"""Test email sending on intake submission"""
import requests
import json
from datetime import datetime, timedelta

BASE_URL = 'http://localhost:8000'

print("\n" + "="*70)
print("TESTING EMAIL FUNCTIONALITY ON INTAKE SUBMISSION")
print("="*70)

# Step 1: Login
print("\n1️⃣ Logging in...")
login_resp = requests.post(f'{BASE_URL}/api/auth/login', json={
    'email': 'student1@university.edu',
    'password': 'test123'
})

if login_resp.status_code != 200:
    print(f"❌ Login failed: {login_resp.status_code}")
    print(login_resp.text)
    exit(1)

token = login_resp.json().get('access_token')
print(f"✅ Login successful")
print(f"   Token: {token[:30]}...")

# Step 2: Submit intake with email testing
print("\n2️⃣ Submitting intake form (email will be triggered)...")

tomorrow = (datetime.now() + timedelta(days=1)).isoformat()

payload = {
    "purpose": "anxiety",
    "is_emergency": False,
    "emergency_notes": "",
    "is_anonymous": False,  # Important: set to False so email gets sent
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
print(f"   Response status: {resp.status_code}")

if resp.status_code != 201:
    print(f"❌ Intake submission failed!")
    print(resp.text)
    exit(1)

data = resp.json()
print(f"✅ Intake submitted successfully!")
print(f"   Counseling ID: {data.get('counseling_id')}")
print(f"   Appointment Date: {data.get('appointment_date')}")

# Step 3: Check for email send confirmation
print("\n3️⃣ EMAIL SEND RESULT:")
print(f"   Check the backend logs for email send confirmation:")
print(f"   $ tail -50 /tmp/flask.log | grep -i email")
print(f"\n   💡 If successful, you should see lines like:")
print(f"   ✅ 'Email sent to student1@university.edu'")
print(f"\n   📧 Check your email inbox (sjer394@gmail.com) for:")
print(f"   - Counseling ID: {data.get('counseling_id')}")
print(f"   - Assessment results")
print(f"   - Meeting link (Zoom)")
print(f"   - Appointment date: {data.get('appointment_date_formatted', 'TBD')}")

print("\n" + "="*70)
print("TEST COMPLETE")
print("="*70 + "\n")
