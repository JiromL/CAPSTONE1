#!/usr/bin/env python3
import requests
import json

print("Testing appointment calculation endpoint...")
resp = requests.post('http://localhost:8000/api/auth/login', json={
    'email': 'student1@university.edu',
    'password': 'student123'
})

if resp.status_code == 200:
    token = resp.json()['access_token']
    print(f"✅ Login successful\n")
    
    test_resp = requests.post('http://localhost:8000/api/intake/calculate-appointment',
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
        json={
            'phq9_responses': [{'score': 2}, {'score': 1}, {'score': 3}, {'score': 2}, {'score': 1}, {'score': 1}, {'score': 2}, {'score': 1}, {'score': 2}],
            'gad7_responses': [],
            'pss_responses': [],
            'acad_responses': []
        }
    )
    
    print(f"Status: {test_resp.status_code}")
    if test_resp.status_code == 200:
        print("✅ Endpoint works!\n")
        print(json.dumps(test_resp.json(), indent=2))
    else:
        print(f"❌ Error: {test_resp.status_code}")
        print(test_resp.text[:300])
else:
    print(f"Login failed: {resp.status_code}")
    print(json.dumps(resp.json(), indent=2))
