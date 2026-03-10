#!/usr/bin/env python3
"""
Comprehensive test to verify meeting link flow from API to database
"""
import requests
import json
from pymongo import MongoClient

BASE_URL = 'http://localhost:8000'
MONGO_URL = 'mongodb://localhost:27017'

def test_complete_flow():
    """Test complete intake submission flow with meeting links"""
    
    print("\n" + "="*60)
    print("TESTING APPOINTMENT MEETING LINK FLOW")
    print("="*60)
    
    # 1. Login
    print("\n1️⃣ STEP 1: Login")
    login = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={
            "email": "student1@university.edu",
            "password": "test123"
        }
    )
    
    if not login.ok:
        print(f"❌ Login failed: {login.status_code}")
        return
    
    token = login.json()['access_token']
    print(f"✅ Login successful, Token: {token[:20]}...")
    
    # 2. Submit intake
    print("\n2️⃣ STEP 2: Submit Intake with Zoom")
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
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
    }
    
    response = requests.post(
        f"{BASE_URL}/api/intake/submit",
        json=intake_payload,
        headers=headers
    )
    
    if not response.ok:
        print(f"❌ Intake submission failed: {response.status_code}")
        print(response.text)
        return
    
    data = response.json()
    counseling_id = data['counseling_id']
    appointment_data = data.get('appointment', {})
    
    print(f"✅ Intake submitted successfully!")
    print(f"   Counseling ID: {counseling_id}")
    print(f"   API Response appointment data:")
    print(json.dumps(appointment_data, indent=4))
    
    # 3. Check database
    print("\n3️⃣ STEP 3: Verify in Database")
    client = MongoClient(MONGO_URL)
    db = client['cps_system_dev']
    
    appointment = db.appointments.find_one(
        {"counseling_id": counseling_id}
    )
    
    if appointment:
        print(f"✅ Appointment found in database!")
        print(f"   Meeting link (from DB): {appointment.get('meeting_link', 'NOT SET')}")
        print(f"   Meeting ID (from DB): {appointment.get('meeting_id', 'NOT SET')}")
        print(f"   Zoom Meeting ID (from DB): {appointment.get('zoom_meeting_id', 'NOT SET')}")
        print(f"   Zoom Join URL (from DB): {appointment.get('zoom_join_url', 'NOT SET')}")
        print(f"\n   Full appointment doc:")
        print(json.dumps({k: str(v) if hasattr(v, '__dict__') else v 
                         for k, v in list(appointment.items())[:10]}, indent=4))
    else:
        print(f"❌ Appointment NOT found in database!")
        print(f"   Searching for: counseling_id = {counseling_id}")
    
    # 4. Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    
    if appointment_data.get('join_url'):
        print(f"✅ Meeting link present in API response!")
        print(f"   URL: {appointment_data['join_url']}")
    else:
        print(f"⚠️ Meeting link NOT in API response")
        print(f"   Response keys: {list(appointment_data.keys())}")
    
    if appointment and appointment.get('zoom_join_url'):
        print(f"✅ Meeting link stored in database!")
    else:
        print(f"⚠️ Meeting link NOT stored in database")
    
    print("\n")

if __name__ == '__main__':
    test_complete_flow()
