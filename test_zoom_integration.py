#!/usr/bin/env python3
"""
Test script for Zoom integration
Tests basic functionality without needing a full intake submission
"""

import sys
import os
from datetime import datetime, timedelta, timezone

# Load environment variables from .env file FIRST
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from config import Config
from integrations import ZoomIntegration

def test_zoom_integration():
    """Test Zoom meeting creation"""
    
    print("=" * 60)
    print("🔷 ZOOM INTEGRATION TEST")
    print("=" * 60)
    
    # Load config
    config = Config()
    
    print(f"\n📋 Credentials Check:")
    print(f"  Client ID: {'✅ Set' if config.ZOOM_CLIENT_ID else '❌ Missing'}")
    print(f"  Client Secret: {'✅ Set' if config.ZOOM_CLIENT_SECRET else '❌ Missing'}")
    
    if not config.ZOOM_CLIENT_ID or not config.ZOOM_CLIENT_SECRET:
        print("\n⚠️  ZOOM credentials not configured.")
        print("   Set ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET in .env file")
        print("   See ZOOM_SETUP.md for instructions")
        return False
    
    # Initialize Zoom integration
    try:
        zoom = ZoomIntegration(config)
        print("\n✅ ZoomIntegration initialized successfully")
    except Exception as e:
        print(f"\n❌ Failed to initialize: {str(e)}")
        return False
    
    # Get OAuth token
    try:
        token = zoom._get_oauth_token()
        print(f"✅ OAuth Token generated: {token[:20]}...")
        print(f"   Token length: {len(token)}")
        print(f"   Token expires at: {zoom._token_expiry}")
            
    except Exception as e:
        print(f"❌ Failed to generate OAuth token: {str(e)}")
        return False
    
    # Try to create a test meeting
    try:
        print("\n📝 Attempting to create test Zoom meeting...")
        
        start_time = (datetime.now(timezone.utc) + timedelta(days=3)).strftime('%Y-%m-%dT%H:%M:%S')
        
        meeting_result = zoom.create_meeting(
            topic='CPS Test Meeting - Integration Test',
            start_time=start_time,
            duration_minutes=60
        )
        
        print(f"\n✅ MEETING CREATED SUCCESSFULLY!")
        print(f"   Meeting ID: {meeting_result.get('meeting_id')}")
        print(f"   Join URL: {meeting_result.get('join_url')}")
        print(f"   Passcode: {meeting_result.get('meeting_passcode')}")
        print(f"   Status: {meeting_result.get('status')}")
        
        # Try to retrieve the meeting
        try:
            print(f"\n🔍 Retrieving meeting details...")
            details = zoom.get_meeting(meeting_result.get('meeting_id'))
            print(f"✅ Meeting retrieved successfully")
            print(f"   Topic: {details.get('topic')}")
            print(f"   Start Time: {details.get('start_time')}")
            print(f"   Duration: {details.get('duration')} minutes")
        except Exception as e:
            print(f"⚠️  Could not retrieve meeting: {str(e)}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ FAILED TO CREATE MEETING")
        print(f"   Error: {str(e)}")
        print(f"\n   This could mean:")
        print(f"   - Wrong credentials")
        print(f"   - Zoom account not authorized for this app")
        print(f"   - API scopes not configured (need meeting:write)")
        print(f"   - Network/firewall issue")
        return False

if __name__ == '__main__':
    success = test_zoom_integration()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ ZOOM INTEGRATION TEST PASSED")
        print("   Ready to create real Zoom meetings!")
    else:
        print("❌ ZOOM INTEGRATION TEST FAILED")
        print("   See errors above for details")
    print("=" * 60)
    
    sys.exit(0 if success else 1)
