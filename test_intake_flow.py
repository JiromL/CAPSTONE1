#!/usr/bin/env python3
import requests
import json

print("=== Testing Intake → Appointments Flow ===\n")

# Step 1: Login as student
print("1. Login as student...")
response = requests.post('http://localhost:8000/api/auth/login', json={
    'email': 'student2@university.edu',
    'password': 'student456'
})
if response.status_code != 200:
    print(f"❌ Login failed: {response.json()}")
    exit(1)

token = response.json().get('access_token')
user_id = response.json().get('user_id')
print(f"✓ Logged in as student2, user_id: {user_id}")
headers = {'Authorization': f'Bearer {token}'}

# Step 2: Try to fetch appointments
print("\n2. Fetching appointments...")
response = requests.get('http://localhost:8000/api/appointments', headers=headers)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"✓ Found {data['count']} appointments")
    if data['appointments']:
        print(f"  First appointment: {data['appointments'][0].get('_id')}")
else:
    print(f"❌ Error: {response.json()}")
    
# Step 3: Check for case/intake data
print("\n3. Checking for cases...")
response = requests.get('http://localhost:8000/api/cases', headers=headers)
if response.status_code == 200:
    print(f"✓ Found cases: {response.json()}")
else:
    print(f"   No cases endpoint or error: {response.status_code}")

print("\nDone!")
