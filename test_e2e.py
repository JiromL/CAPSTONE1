#!/usr/bin/env python3
"""End-to-end test of dashboard functionality"""
import requests
import json

BASE_URL = 'http://127.0.0.1:8000'

print("=" * 60)
print("END-TO-END DASHBOARD TEST")
print("=" * 60)

# Step 1: Register/login
print("\n1. Testing authentication...")
login_resp = requests.post(f'{BASE_URL}/api/auth/login', json={
    'email': 'testuser@dlsu.edu.ph',
    'password': 'testpass123'
})

if login_resp.status_code == 200:
    token = login_resp.json()['access_token']
    print(f"   ✓ Login successful")
    print(f"   Token: {token[:50]}...")
else:
    print(f"   ✗ Login failed with {login_resp.status_code}")
    print(f"   Response: {login_resp.text}")
    exit(1)

# Step 2: Test dashboard endpoint
print("\n2. Testing dashboard endpoint...")
dashboard_resp = requests.get(
    f'{BASE_URL}/api/intake/assessments/dashboard',
    headers={'Authorization': f'Bearer {token}'}
)

print(f"   Status: {dashboard_resp.status_code}")
if dashboard_resp.status_code == 200:
    data = dashboard_resp.json()
    print(f"   ✓ Dashboard endpoint working")
    print(f"   User role: {data.get('user_role')}")
    print(f"   Recent cases: {len(data.get('recent_cases', []))}")
    print(f"   Response structure:")
    print(f"   - alerts: {type(data.get('alerts'))}")
    print(f"   - recent_cases: {type(data.get('recent_cases'))}")
    print(f"   - summary: {type(data.get('summary'))}")
    print(f"   - timestamp: {data.get('timestamp')}")
else:
    print(f"   ✗ Dashboard endpoint failed")
    print(f"   Response: {dashboard_resp.text}")

# Step 3: Verify field structure if cases exist
if data.get('recent_cases'):
    print("\n3. Verifying case field structure...")
    case = data['recent_cases'][0]
    print(f"   Case ID: {case.get('counseling_id')}")
    print(f"   Purpose: {case.get('purpose')}")
    print(f"   Risk Level: {case.get('risk_level')}")
else:
    print("\n3. No cases in dashboard (expected for new user)")

print("\n" + "=" * 60)
print("TEST COMPLETE")
print("=" * 60)
