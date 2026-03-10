#!/usr/bin/env python3
import requests
import sys

resp = requests.post('http://localhost:8000/api/auth/login', json={
    'email': 'admin@university.edu',
    'password': 'admin123'
})

if resp.status_code == 200:
    token = resp.json()['access_token']
    print(token)
else:
    print(f"Login failed: {resp.status_code}", file=sys.stderr)
    print(f"Response: {resp.text}", file=sys.stderr)
    sys.exit(1)
