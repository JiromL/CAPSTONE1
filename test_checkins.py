#!/usr/bin/env python3
import requests
import json

# Get token
login_res = requests.post('http://localhost:8000/api/auth/login', json={
    'email': 'student1@dlsu.edu.ph',
    'password': 'password123'
})

if login_res.status_code == 200:
    data = login_res.json()
    token = data.get('token') or data.get('access_token')
    print(f"✓ Token obtained")
    
    # Test pending-checkins
    pending_res = requests.get(
        'http://localhost:8000/api/check-ins/student/pending-checkins',
        headers={'Authorization': f'Bearer {token}'}
    )
    print(f"✓ pending-checkins: {pending_res.status_code}")
    if pending_res.status_code == 200:
        print(f"  Data: {json.dumps(pending_res.json(), indent=2)[:300]}")
    else:
        print(f"  Error: {pending_res.text[:200]}")
    
    # Test my-checkins
    my_res = requests.get(
        'http://localhost:8000/api/check-ins/student/my-checkins',
        headers={'Authorization': f'Bearer {token}'}
    )
    print(f"\n✓ my-checkins: {my_res.status_code}")
    if my_res.status_code == 200:
        print(f"  Data: {json.dumps(my_res.json(), indent=2)[:300]}")
    else:
        print(f"  Error: {my_res.text[:200]}")
        
else:
    print(f"✗ Login failed: {login_res.status_code}")
    print(f"  Error: {login_res.text[:200]}")
