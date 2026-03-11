#!/usr/bin/env python3
"""Test Google Meet meeting creation end-to-end"""

import sys
import json
import os
sys.path.insert(0, '/Users/jeromelouiesantos/CAPSTONE1/backend')
sys.path.insert(0, '/Users/jeromelouiesantos/CAPSTONE1')

# Load environment
from dotenv import load_dotenv
load_dotenv('/Users/jeromelouiesantos/CAPSTONE1/backend/.env')

# Test 1: Verify credentials are loaded
print("=" * 60)
print("TEST 1: Verify Google Credentials Loaded")
print("=" * 60)

email = os.getenv('GOOGLE_SERVICE_ACCOUNT_EMAIL')
key_str = os.getenv('GOOGLE_SERVICE_ACCOUNT_KEY')

if email:
    print(f"✓ Google Service Account Email: {email}")
else:
    print("✗ GOOGLE_SERVICE_ACCOUNT_EMAIL not set")
    sys.exit(1)

if key_str:
    try:
        key_json = json.loads(key_str)
        print(f"✓ Google Service Account Key: Valid JSON")
        print(f"  - Project ID: {key_json.get('project_id')}")
        print(f"  - Client Email: {key_json.get('client_email')}")
    except Exception as e:
        print(f"✗ Error parsing Google key: {e}")
        sys.exit(1)
else:
    print("✗ GOOGLE_SERVICE_ACCOUNT_KEY not set")
    sys.exit(1)

# Test 2: Import and test GoogleMeetIntegration class
print("\n" + "=" * 60)
print("TEST 2: Test GoogleMeetIntegration Class")
print("=" * 60)

try:
    from backend.integrations.google import GoogleMeetIntegration
    print("✓ Successfully imported GoogleMeetIntegration")
    
    # Initialize the integration
    gm = GoogleMeetIntegration()
    print("✓ Successfully initialized GoogleMeetIntegration")
    
    # Test creating a meeting
    print("\nTesting meeting creation...")
    meeting_result = gm.create_meeting(
        title="CPS Counseling Session - Test",
        description="Test meeting for CPS intake form",
        start_time="2026-03-12T14:00:00",
        end_time="2026-03-12T14:30:00",
        attendees=["test@example.com"],
        timezone="Asia/Manila"
    )
    
    if meeting_result and 'meet_url' in meeting_result:
        print(f"✅ Google Meet Link Generated: {meeting_result['meet_url']}")
        print(f"   Calendar Event: {meeting_result.get('event_id', 'N/A')}")
    else:
        print(f"✗ Failed to create meeting: {meeting_result}")
        sys.exit(1)
        
except ImportError as e:
    print(f"✗ Import error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"✗ Error during testing: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 60)
print("✅ ALL TESTS PASSED - Google Meet is ready!")
print("=" * 60)
