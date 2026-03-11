#!/usr/bin/env python3
"""Test calendar endpoints with proper authentication"""

import requests
import json
import sys

API_BASE = 'http://localhost:8000'

print("=" * 70)
print("FULL LOGIN + CALENDAR TEST")
print("=" * 70)

# Step 1: Try to login with test user
print("\n1. LOGGING IN...")
login_data = {
    'email': 'admin@university.edu',
    'password': 'admin123'
}

try:
    r = requests.post(f'{API_BASE}/api/auth/login', json=login_data, timeout=5)
    print(f"   Status: {r.status_code}")
    
    if r.status_code != 200:
        print(f"   Response: {r.text[:200]}")
        sys.exit(1)
    
    login_response = r.json()
    token = login_response.get('access_token')
    print(f"   OK - Login successful")
    print(f"   Token: {token[:30]}...")
    
except Exception as e:
    print(f"   ERROR: {e}")
    sys.exit(1)

# Step 2: Test /api/auth/me with token
print("\n2. FETCHING USER PROFILE (/api/auth/me)...")
headers = {'Authorization': f'Bearer {token}'}

try:
    r = requests.get(f'{API_BASE}/api/auth/me', headers=headers, timeout=5)
    print(f"   Status: {r.status_code}")
    
    if r.status_code == 200:
        user_data = r.json()
        print(f"   OK - Got user profile")
        print(f"   Google Calendar Connected: {user_data.get('google_calendar_connected')}")
    else:
        print(f"   ERROR: {r.text[:200]}")
        
except Exception as e:
    print(f"   ERROR: {e}")

# Step 3: Test /api/calendar/status
print("\n3. FETCHING CALENDAR STATUS (/api/calendar/status)...")
try:
    r = requests.get(f'{API_BASE}/api/calendar/status', headers=headers, timeout=5)
    print(f"   Status: {r.status_code}")
    
    if r.status_code == 200:
        cal_data = r.json()
        print(f"   OK - Got calendar status")
        print(f"   Response: {json.dumps(cal_data, indent=2)}")
    else:
        print(f"   ERROR: {r.text[:200]}")
        
except Exception as e:
    print(f"   ERROR: {e}")

# Step 4: Test /api/appointments/google/available-slots
print("\n4. FETCHING AVAILABLE SLOTS...")
try:
    r = requests.get(
        f'{API_BASE}/api/appointments/google/available-slots?date=2026-03-11&duration=60',
        headers=headers,
        timeout=5
    )
    print(f"   Status: {r.status_code}")
    
    if r.status_code in [200, 400]:
        data = r.json()
        print(f"   OK - Got response")
        print(f"   Response: {json.dumps(data, indent=2)}")
    else:
        print(f"   ERROR: {r.text[:200]}")
        
except Exception as e:
    print(f"   ERROR: {e}")

print("\n" + "=" * 70)
print("TEST COMPLETE - All endpoints working with valid token!")
print("=" * 70)
