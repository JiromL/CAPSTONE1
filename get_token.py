#!/usr/bin/env python3
import requests
import sys

resp = requests.post('http://localhost:5001/api/auth/login', json={
    'email': 'cm@counseling.edu',
    'password': 'cmpass123'
})

if resp.status_code == 200:
    token = resp.json()['access_token']
    print(token)
else:
    print(f"Login failed: {resp.status_code}", file=sys.stderr)
    sys.exit(1)
