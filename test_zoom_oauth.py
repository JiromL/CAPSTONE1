#!/usr/bin/env python3
"""
Test Zoom Server-to-Server OAuth2 authentication
This uses the OAuth token endpoint instead of JWT
"""

import os
import sys
import requests
import base64
from dotenv import load_dotenv
from pathlib import Path

# Load .env from project root
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

# Get credentials
ZOOM_ACCOUNT_ID = os.getenv('ZOOM_ACCOUNT_ID')
ZOOM_CLIENT_ID = os.getenv('ZOOM_CLIENT_ID')
ZOOM_CLIENT_SECRET = os.getenv('ZOOM_CLIENT_SECRET')

print("=" * 60)
print("🔷 ZOOM SERVER-TO-SERVER OAUTH2 TEST")
print("=" * 60)

# Check credentials
print("\n📋 Credentials Check:")
print(f"  Account ID: {'✅ Set' if ZOOM_ACCOUNT_ID else '❌ Missing'}")
print(f"  Client ID: {'✅ Set' if ZOOM_CLIENT_ID else '❌ Missing'}")
print(f"  Client Secret: {'✅ Set' if ZOOM_CLIENT_SECRET else '❌ Missing'}")

if not all([ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET]):
    print("\n❌ Missing required credentials in .env")
    sys.exit(1)

# Step 1: Get OAuth access token
print("\n📝 Step 1: Getting OAuth Access Token...")
print(f"   Using Account ID: {ZOOM_ACCOUNT_ID}")
print(f"   Using Client ID: {ZOOM_CLIENT_ID}")

token_url = "https://zoom.us/oauth/token"

# Create basic auth header
auth_string = f"{ZOOM_CLIENT_ID}:{ZOOM_CLIENT_SECRET}"
auth_bytes = auth_string.encode('utf-8')
auth_b64 = base64.b64encode(auth_bytes).decode('utf-8')

headers = {
    "Authorization": f"Basic {auth_b64}",
    "Content-Type": "application/x-www-form-urlencoded"
}

data = {
    "grant_type": "account_credentials",
    "account_id": ZOOM_ACCOUNT_ID
}

try:
    response = requests.post(token_url, headers=headers, data=data, timeout=10)
    print(f"   Response Status: {response.status_code}")
    
    if response.status_code == 200:
        token_data = response.json()
        access_token = token_data.get('access_token')
        token_type = token_data.get('token_type')
        expires_in = token_data.get('expires_in')
        
        print(f"   ✅ Token obtained successfully")
        print(f"      Token Type: {token_type}")
        print(f"      Expires In: {expires_in} seconds")
        print(f"      Token: {access_token[:50]}...")
        
        # Step 2: Test API call with access token
        print(f"\n📝 Step 2: Testing API with access token...")
        
        # Create a test meeting
        meeting_url = "https://api.zoom.us/v2/users/me/meetings"
        
        api_headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        meeting_data = {
            "topic": "Test Meeting from CPS",
            "type": 1,
            "settings": {
                "host_video": False,
                "participant_video": False
            }
        }
        
        api_response = requests.post(meeting_url, headers=api_headers, json=meeting_data, timeout=10)
        
        if api_response.status_code == 201:
            meeting_info = api_response.json()
            print(f"   ✅ MEETING CREATED SUCCESSFULLY!")
            print(f"      Meeting ID: {meeting_info.get('id')}")
            print(f"      Join URL: {meeting_info.get('join_url')}")
            print(f"      Start Time: {meeting_info.get('start_time')}")
        else:
            print(f"   ❌ FAILED TO CREATE MEETING")
            print(f"      Status: {api_response.status_code}")
            print(f"      Response: {api_response.json()}")
            
    else:
        print(f"   ❌ FAILED TO GET TOKEN")
        print(f"      Status: {response.status_code}")
        print(f"      Response: {response.json()}")
        sys.exit(1)

except Exception as e:
    print(f"   ❌ Error: {str(e)}")
    sys.exit(1)

print("\n" + "=" * 60)
print("✅ ZOOM OAUTH2 TEST COMPLETED")
print("=" * 60)
