#!/usr/bin/env python
"""
Integration test: Frontend to Database
Tests the complete intake form submission flow
"""
import os
import sys
import json
import requests
from datetime import datetime

# Configuration
BASE_URL = "http://127.0.0.1:5002/api"
TEST_EMAIL = "student_test@example.com"
TEST_PASSWORD = "TestPassword123!"
TEST_NAME = "Test Student"

def print_section(title):
    """Print a formatted section"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")

def test_health():
    """Test backend health check"""
    print_section("1. Testing Backend Health")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Status: {response.status_code}")
        if response.ok:
            data = response.json()
            print(f"✅ Backend is running")
            print(f"   Database: {data.get('database')}")
            print(f"   MongoDB Status: {data.get('mongodb_status')}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to backend: {e}")
        return False

def test_register():
    """Test user registration"""
    print_section("2. Testing User Registration")
    payload = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "first_name": "Test",
        "last_name": "Student"
    }
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=payload)
        print(f"Status: {response.status_code}")
        if response.ok:
            data = response.json()
            print(f"✅ Registration successful")
            print(f"   User ID: {data.get('user_id')}")
            return data.get('user_id')
        elif response.status_code == 400 and "already exists" in response.text:
            print(f"⚠️  User already exists (that's okay for retesting)")
            return None  # Will need to login instead
        else:
            print(f"❌ Registration failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Registration error: {e}")
        return None

def test_login():
    """Test user login"""
    print_section("3. Testing User Login")
    payload = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    }
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=payload)
        print(f"Status: {response.status_code}")
        if response.ok:
            data = response.json()
            print(f"✅ Login successful")
            token = data.get('access_token')
            print(f"   Token received: {token[:20]}..." if token else "   No token")
            return token
        else:
            print(f"❌ Login failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None

def test_intake_submission(token):
    """Test intake form submission"""
    print_section("4. Testing Intake Form Submission")
    
    if not token:
        print("❌ Cannot test intake without valid token")
        return False
    
    # Prepare intake payload matching frontend structure
    payload = {
        "purpose": "personal",  # selectedConcern
        "is_emergency": False,  # isUrgent
        "emergency_notes": "",  # urgencyNotes
        "is_anonymous": False,  # isAnonymous
        "consent_given": True,  # required field
        "preferred_platform": "in-person",  # communicationMethod
        "appointment_date": datetime.now().isoformat(),  # appointmentDate
        "appointment_time": "14:00",  # appointmentTime
        # Add some assessment responses
        "phq9_responses": [0, 1, 2, 1, 0, 1, 2, 1, 0],  # 9 responses
        "gad7_responses": [0, 1, 1, 0, 1, 1, 0],  # 7 responses
    }
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/intake/submit",
            json=payload,
            headers=headers
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:200]}...")
        
        if response.ok:
            data = response.json()
            print(f"✅ Intake submission successful")
            counseling_id = data.get('counseling_id')
            print(f"   Counseling ID: {counseling_id}")
            if data.get('responses'):
                print(f"   Assessment scores recorded")
            return True
        else:
            print(f"❌ Intake submission failed: {response.status_code}")
            print(f"   Full response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Intake submission error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all integration tests"""
    print("\n" + "="*60)
    print("  INTAKE MANAGEMENT SYSTEM - INTEGRATION TEST")
    print("="*60)
    
    # Test health
    if not test_health():
        print("\n❌ Backend is not running. Please start it with:")
        print("   cd backend && python app.py")
        sys.exit(1)
    
    # Test registration (or skip if user exists)
    user_id = test_register()
    
    # Test login
    token = test_login()
    if not token:
        print("\n❌ Could not obtain authentication token")
        sys.exit(1)
    
    # Test intake submission
    success = test_intake_submission(token)
    
    print_section("SUMMARY")
    if success:
        print("✅ All integration tests passed!")
        print("\nFrontend-Database Integration Status: WORKING")
    else:
        print("❌ Some tests failed - see above for details")
        sys.exit(1)

if __name__ == "__main__":
    main()
