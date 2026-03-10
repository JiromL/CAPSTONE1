#!/usr/bin/env python3
"""
Test Google Meet integration standalone
Verifies that Google Meet service account credentials are properly configured
and can create real calendar events with Google Meet links.
"""

import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / 'backend'))

# Load environment
from dotenv import load_dotenv
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

def test_google_meet():
    """Test Google Meet integration"""
    print("\n" + "="*60)
    print("🧪 Google Meet Integration Test")
    print("="*60)
    
    # Check credentials
    print("\n📋 Checking credentials...")
    service_account_email = os.getenv('GOOGLE_SERVICE_ACCOUNT_EMAIL')
    service_account_key = os.getenv('GOOGLE_SERVICE_ACCOUNT_KEY')
    
    if not service_account_email:
        print("❌ GOOGLE_SERVICE_ACCOUNT_EMAIL not set in .env")
        return False
    if not service_account_key:
        print("❌ GOOGLE_SERVICE_ACCOUNT_KEY not set in .env")
        return False
    
    print(f"✅ Service Account Email: {service_account_email[:40]}...")
    print(f"✅ Service Account Key: {service_account_key[:50]}...")
    
    # Try to import and initialize
    try:
        from backend.integrations import GoogleMeetIntegration
        from backend.config import Config
        
        print("\n🔧 Initializing GoogleMeetIntegration...")
        meet = GoogleMeetIntegration(Config)
        print("✅ GoogleMeetIntegration initialized")
        
    except ImportError as e:
        print(f"❌ Import error: {str(e)}")
        print("   Make sure PyJWT is installed: pip install PyJWT")
        return False
    except Exception as e:
        print(f"❌ Initialization failed: {str(e)}")
        return False
    
    # Try to create a test meeting
    try:
        print("\n📅 Creating test Google Meet meeting...")
        test_time = datetime.utcnow() + timedelta(hours=2)
        
        result = meet.create_meeting(
            title="🧪 Test Google Meet - CPS System",
            start_time=test_time,
            duration_minutes=60,
            description="Testing Google Meet integration for Campus Counseling & Psychology Services"
        )
        
        print("✅ Google Meet Meeting Created Successfully!")
        print(f"\n📊 Meeting Details:")
        print(f"   Platform: {result.get('platform')}")
        print(f"   Meeting ID: {result.get('meeting_id')}")
        print(f"   Join URL: {result.get('join_url')}")
        print(f"   Calendar Event: {result.get('calendar_event')}")
        print(f"   Start Time: {result.get('start_time')}")
        print(f"   End Time: {result.get('end_time')}")
        print(f"   Status: {result.get('status')}")
        
        print("\n🎉 Google Meet integration is working correctly!")
        print(f"\n📌 Join the test meeting at: {result.get('join_url')}")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to create meeting: {str(e)}")
        import traceback
        print("\n📋 Full traceback:")
        traceback.print_exc()
        return False


if __name__ == '__main__':
    success = test_google_meet()
    sys.exit(0 if success else 1)
