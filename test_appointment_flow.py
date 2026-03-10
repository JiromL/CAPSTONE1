#!/usr/bin/env python3
"""
Test appointment creation with meeting links
"""
import requests
import json
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

BASE_URL = os.getenv('API_URL', 'http://localhost:8000')

def test_intake_with_appointment():
    """Test intake submission with appointment meeting links"""
    
    # 1. Get auth token
    print("\n1️⃣ Getting auth token...")
    login_response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={
            "email": "student1@university.edu",
            "password": "test123"
        }
    )
    
    if not login_response.ok:
        print(f"❌ Login failed: {login_response.status_code}")
        print(login_response.text)
        return
    
    token = login_response.json().get('access_token')
    print(f"✅ Got token: {token[:20]}...")
    
    # 2. Submit intake with Zoom preference
    print("\n2️⃣ Submitting intake with Zoom preference...")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    intake_payload = {
        "purpose": "personal",
        "is_emergency": False,
        "is_anonymous": False,
        "consent_given": True,
        "preferred_platform": "zoom",
        "appointment_date": "2026-03-15",
        "appointment_time": "10:00",
        "phq9_responses": [1, 1, 2, 1, 1, 1, 0, 1, 1],
        "gad7_responses": [0, 1, 1, 0, 1, 1, 0],
        "pss_responses": [1, 2, 1, 1, 1, 1, 1, 1, 1, 1]
    }
    
    response = requests.post(
        f"{BASE_URL}/api/intake/submit",
        json=intake_payload,
        headers=headers
    )
    
    print(f"Status: {response.status_code}")
    
    if response.ok:
        data = response.json()
        print(f"\n✅ Intake submitted successfully!")
        print(f"\n📋 Response Data:")
        print(json.dumps(data, indent=2))
        
        # Check if appointment data is present
        if 'appointment' in data:
            appt = data['appointment']
            print(f"\n✅ Appointment data present!")
            print(f"   Platform: {appt.get('platform', appt.get('preferred_platform', 'N/A'))}")
            print(f"   Join URL: {appt.get('join_url', 'N/A')}")
            print(f"   Meeting ID: {appt.get('meeting_id', 'N/A')}")
            
            if appt.get('join_url'):
                print(f"\n🎉 MEETING LINK FOUND!")
                print(f"   Full URL: {appt['join_url']}")
            else:
                print(f"\n⚠️  Meeting link is missing!")
        else:
            print(f"\n⚠️  No appointment data in response!")
            print(f"Response keys: {list(data.keys())}")
    else:
        print(f"❌ Failed: {response.status_code}")
        print(response.text)

if __name__ == '__main__':
    test_intake_with_appointment()
