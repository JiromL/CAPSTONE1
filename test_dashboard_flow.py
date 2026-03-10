#!/usr/bin/env python3
import requests
import json
from datetime import datetime, timedelta

# Login
login_resp = requests.post('http://localhost:8000/api/auth/login', 
    json={'email': 'student1@university.edu', 'password': 'student123'})

if login_resp.status_code != 200:
    print(f"Login failed: {login_resp.status_code}")
    exit(1)

token = login_resp.json()['access_token']
print("✅ Logged in\n")

# Submit intake with assessments
intake_payload = {
    'purpose': 'academic_stress',
    'is_emergency': False,
    'emergency_notes': '',
    'is_anonymous': False,
    'consent_given': True,
    'preferred_platform': 'zoom',
    'appointment_date': (datetime.now() + timedelta(days=3)).strftime('%Y-%m-%d'),
    'appointment_time': '10:00',
    'phq9_responses': [{'score': 2}, {'score': 1}, {'score': 3}, {'score': 2}, {'score': 1}],
}

submit_resp = requests.post('http://localhost:8000/api/intake/submit',
    headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
    json=intake_payload
)

print(f"Intake status: {submit_resp.status_code}")
if submit_resp.status_code != 201:
    print(f"Error: {submit_resp.json()}")
else:
    print("✅ Intake submitted\n")

# Now fetch dashboard
dashboard_resp = requests.get('http://localhost:8000/api/intake/assessments/dashboard',
    headers={'Authorization': f'Bearer {token}'}
)

data = dashboard_resp.json()
print(f"Dashboard recent_cases: {len(data.get('recent_cases', []))}")
if data.get('recent_cases'):
    case = data['recent_cases'][0]
    print(f"Keys: {list(case.keys())}")
    print(json.dumps(case, indent=2, default=str))
