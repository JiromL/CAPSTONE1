#!/usr/bin/env python3
import requests
import json

# Get token
login_data = {
    'email': 'admin@university.edu',
    'password': 'admin123'
}

response = requests.post('http://localhost:8000/api/auth/login', json=login_data)
token = response.json().get('access_token')
print(f"✓ Login successful: {token[:20]}...")

# Get dashboard to find appointment ID
headers = {'Authorization': f'Bearer {token}'}
dashboard = requests.get('http://localhost:8000/api/intake/assessments/dashboard', headers=headers)
dashboard_data = dashboard.json()

print(f"\nDashboard data keys: {dashboard_data.keys()}")

if dashboard_data.get('recent_cases'):
    print(f"✓ Found {len(dashboard_data['recent_cases'])} cases")
    case = dashboard_data['recent_cases'][0]
    print(f"First case keys: {case.keys()}")
    apt_id = case.get('appointment_id')
    print(f"✓ Found appointment ID: {apt_id}")
    
    if apt_id:
        # Test the appointment detail endpoint
        apt_response = requests.get(f'http://localhost:8000/api/appointments/{apt_id}', headers=headers)
        print(f"✓ Appointment detail status: {apt_response.status_code}")
        if apt_response.status_code == 200:
            apt_data = apt_response.json()
            print(f"✓ Got appointment details:")
            print(f"  - Type: {apt_data.get('type')}")
            print(f"  - Status: {apt_data.get('status')}")
            print(f"  - Platform: {apt_data.get('preferred_platform')}")
            print(f"  - Counselor: {apt_data.get('counselor', {}).get('name', 'N/A')}")
        else:
            print(f"✗ Error: {apt_response.json()}")
    else:
        print("✗ No appointment_id found in dashboard data")
else:
    print("✗ No recent cases in dashboard")
