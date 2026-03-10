#!/usr/bin/env python3
"""Test Zoom OAuth2 integration through backend"""

from pathlib import Path
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta

# Load dotenv first
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

# Now import after dotenv is loaded
from backend.integrations import ZoomIntegration
from backend.config import Config

# Create zoom integration with config
zoom = ZoomIntegration(Config)

# Test meeting creation
appointment_date = datetime.utcnow() + timedelta(days=3)
start_time = appointment_date.strftime('%Y-%m-%dT%H:%M:%S')

print("=" * 60)
print("🔷 ZOOM OAUTH2 BACKEND INTEGRATION TEST")
print("=" * 60)

print(f"\n📋 Configuration Check:")
print(f"  Account ID: {Config.ZOOM_ACCOUNT_ID}")
print(f"  Client ID: {Config.ZOOM_CLIENT_ID}")
print(f"  Client Secret: {'*' * 20}")

print(f"\n📝 Creating test meeting...")
print(f"  Topic: CPS Initial Assessment Test")
print(f"  Start Time: {start_time}")
print(f"  Duration: 60 minutes")

try:
    result = zoom.create_meeting(
        topic='CPS Initial Assessment Test',
        start_time=start_time,
        duration_minutes=60
    )
    
    print(f"\n✅ SUCCESS!")
    print(f"  Meeting ID: {result['meeting_id']}")
    print(f"  Join URL: {result['join_url']}")
    print(f"  Passcode: {result['meeting_passcode']}")
    print(f"  Status: {result['status']}")
    
except Exception as e:
    print(f"\n❌ FAILED: {str(e)}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
