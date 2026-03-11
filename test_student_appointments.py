#!/usr/bin/env python3
import requests
import json

print("Testing student appointments endpoint...")
try:
    # Login
    response = requests.post('http://localhost:8000/api/auth/login', json={
        'email': 'student1@university.edu',
        'password': 'student123'
    })
    if response.status_code != 200:
        print(f"Login failed: {response.json()}")
        exit(1)
    
    token = response.json().get('access_token')
    print(f"✓ Logged in")
    
    # Try appointments endpoint
    headers = {'Authorization': f'Bearer {token}'}
    apt_resp = requests.get('http://localhost:8000/api/appointments', headers=headers)
    print(f"Appointments status: {apt_resp.status_code}")
    
    if apt_resp.status_code == 200:
        data = apt_resp.json()
        print(f"Found {data['count']} appointments")
        if data['appointments']:
            apt = data['appointments'][0]
            print(f"\nFirst appointment:")
            print(f"  ID: {apt.get('_id')}")
            print(f"  Type: {apt.get('appointment_type')}")
            print(f"  Status: {apt.get('status')}")
            print(f"  Case ID: {apt.get('case_id')}")
    else:
        print(f"Error: {apt_resp.json()}")
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
