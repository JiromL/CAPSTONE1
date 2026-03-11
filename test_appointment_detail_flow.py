#!/usr/bin/env python3
import requests
import json

print("=== Testing Appointment Detail Endpoint ===\n")

# Step 1: Login as student
print("1. Login as student...")
response = requests.post('http://localhost:8000/api/auth/login', json={
    'email': 'student2@university.edu',
    'password': 'student456'
})
token = response.json().get('access_token')
headers = {'Authorization': f'Bearer {token}'}
print(f"✓ Logged in")

# Step 2: Fetch appointments
print("\n2. Fetching appointments...")
response = requests.get('http://localhost:8000/api/appointments', headers=headers)
if response.status_code != 200:
    print(f"❌ Failed to fetch appointments: {response.json()}")
    exit(1)

data = response.json()
if not data['appointments']:
    print("❌ No appointments found")
    exit(1)

appointment_id = data['appointments'][0]['_id']
print(f"✓ Found appointment: {appointment_id}")

# Step 3: Fetch appointment details
print(f"\n3. Fetching appointment details...")
response = requests.get(f'http://localhost:8000/api/appointments/{appointment_id}', headers=headers)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    detail = response.json()
    print(f"✓ Got appointment details:")
    print(f"  Type: {detail.get('type')}")
    print(f"  Status: {detail.get('status')}")
    print(f"  Platform: {detail.get('preferred_platform')}")
    print(f"  Counselor: {detail.get('counselor', {}).get('name') if detail.get('counselor') else 'Not assigned'}")
    print(f"  Case ID: {detail.get('case', {}).get('id') if detail.get('case') else 'No case'}")
else:
    print(f"❌ Error: {response.json()}")

print("\n✓ All tests passed!")
