#!/usr/bin/env python3
"""Direct test of Google Meet integration"""
import sys
sys.path.insert(0, '/Users/jeromelouiesantos/CAPSTONE1/backend')

import os
from dotenv import load_dotenv

# Load .env files
load_dotenv('/Users/jeromelouiesantos/CAPSTONE1/backend/.env')
load_dotenv('/Users/jeromelouiesantos/CAPSTONE1/.env')

print(f"GOOGLE_SERVICE_ACCOUNT_KEY env: {bool(os.getenv('GOOGLE_SERVICE_ACCOUNT_KEY'))}")

from integrations.google import GoogleMeetIntegration
from datetime import datetime, timedelta
from config import Config

# Test the Google Meet integration directly
config = Config()
google_meet = GoogleMeetIntegration(config)

print(f"service_account_key_str: {bool(google_meet.service_account_key_str)}")

# Test meeting creation
try:
    print("=" * 60)
    print("Testing Google Meet Creation")
    print("=" * 60)
    
    appointment_date = datetime.utcnow() + timedelta(days=3)
    
    result = google_meet.create_meeting(
        title="Test Meeting",
        start_time=appointment_date,
        duration_minutes=60,
        description="Test Description",
        attendees_emails=None
    )
    
    print("\n✅ SUCCESS!")
    print(f"\nFull result:\n{result}")
    print(f"\nJoin URL: {result.get('join_url')}")
    print(f"Meeting ID: {result.get('meeting_id')}")
    print(f"Hangout Link: {result.get('hangoutLink')}")
    
except Exception as e:
    print(f"\n❌ ERROR: {e}")
    import traceback
    traceback.print_exc()
