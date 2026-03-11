#!/usr/bin/env python3
"""Debug Google Meet JWT token generation"""

import sys
import json
import os
from pathlib import Path

# Load the .env file
env_file = Path('/Users/jeromelouiesantos/CAPSTONE1/.env')
env_vars = {}

with open(env_file) as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#'):
            if '=' in line:
                key, value = line.split('=', 1)
                env_vars[key.strip()] = value.strip()

# Get the credentials
key_str = env_vars.get('GOOGLE_SERVICE_ACCOUNT_KEY', '')
print("=" * 70)
print("DEBUG: Google Service Account JWT Token Generation")
print("=" * 70)

if not key_str:
    print("✗ GOOGLE_SERVICE_ACCOUNT_KEY is empty")
    sys.exit(1)

try:
    key_data = json.loads(key_str)
    print("✓ JSON credentials parsed successfully")
    print(f"  Project: {key_data.get('project_id')}")
    print(f"  Email: {key_data.get('client_email')}")
    print(f"  Private Key Starts With: {key_data.get('private_key', '')[:50]}...")
    
    # Test JWT generation
    import jwt
    from datetime import datetime
    
    iat = int(datetime.utcnow().timestamp())
    exp = iat + 3600
    
    payload = {
        "iss": key_data.get('client_email'),
        "scope": "https://www.googleapis.com/auth/calendar",
        "aud": "https://oauth2.googleapis.com/token",
        "exp": exp,
        "iat": iat,
    }
    
    print(f"\n✓ JWT Payload created:")
    print(f"  Issuer: {payload['iss']}")
    print(f"  Expires: {payload['exp']}")
    
    # Try to sign the token
    token = jwt.encode(payload, key_data.get('private_key'), algorithm='RS256')
    print(f"\n✓ JWT token generated successfully!")
    print(f"  Token length: {len(token)}")
    print(f"  Token preview: {token[:50]}...")
    
    # Now try to exchange for access token
    import requests
    token_data = {
        'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion': token,
    }
    
    print(f"\nAttempting to exchange JWT for access token...")
    response = requests.post('https://oauth2.googleapis.com/token', data=token_data, timeout=10)
    
    print(f"  Response Status: {response.status_code}")
    
    if response.status_code == 200:
        print("✅ Token exchange successful!")
        result = response.json()
        print(f"   Access Token: {result.get('access_token', '')[:30]}...")
    else:
        print(f"✗ Token exchange failed!")
        print(f"   Response: {response.text}")
        
except json.JSONDecodeError as e:
    print(f"✗ Failed to parse JSON credentials: {e}")
    sys.exit(1)
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
