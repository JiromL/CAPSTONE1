#!/usr/bin/env python3
"""
Diagnostic script for 401 Unauthorized errors on intake submission.
Tests JWT token generation and intake endpoint authentication.
"""

import requests
import json
import sys
from pathlib import Path

def test_login():
    """Test login endpoint and token generation"""
    print("\n" + "="*60)
    print("🔐 Testing Login & Token Generation")
    print("="*60)
    
    try:
        resp = requests.post('http://localhost:8000/api/auth/login', json={
            'email': 'admin@university.edu',
            'password': 'admin123'
        })
        
        print(f"✓ Login Status: {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            token = data.get('access_token')
            print(f"✓ Token generated: {token[:50]}...")
            print(f"  Token length: {len(token)}")
            print(f"  Token type: {type(token).__name__}")
            return token
        else:
            print(f"✗ Login failed: {resp.text}")
            return None
            
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        return None


def test_intake_endpoint(token):
    """Test intake submission with valid token"""
    print("\n" + "="*60)
    print("📝 Testing Intake Endpoint with Valid Token")
    print("="*60)
    
    if not token:
        print("✗ No token provided")
        return False
    
    try:
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            "purpose": "personal",
            "is_emergency": False,
            "is_anonymous": False,
            "consent_given": True,
            "preferred_platform": "zoom",
            "phq9_responses": [{"score": 1}] * 9
        }
        
        print(f"✓ Headers:\n  Authorization: Bearer {token[:30]}...")
        print(f"  Content-Type: application/json")
        print(f"✓ Payload keys: {list(payload.keys())}")
        
        resp = requests.post(
            'http://localhost:8000/api/intake/submit',
            headers=headers,
            json=payload
        )
        
        print(f"\n✓ Response Status: {resp.status_code}")
        
        if resp.status_code in [200, 201]:
            print("✅ SUCCESS: Intake endpoint accepted the request!")
            data = resp.json()
            print(f"\n   Appointment ID: {data.get('appointment_id')}")
            print(f"   Counseling ID: {data.get('counseling_id')}")
            print(f"   Zoom Link: {data.get('appointment', {}).get('join_url', 'Not set')}")
            return True
        elif resp.status_code == 401:
            print("❌ UNAUTHORIZED (401): Token validation failed")
            print(f"   Response: {resp.text}")
            return False
        else:
            print(f"❌ Error {resp.status_code}: {resp.text}")
            return False
            
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        return False


def test_intake_without_token():
    """Test intake endpoint without token to verify auth is required"""
    print("\n" + "="*60)
    print("🔍 Testing Intake Endpoint WITHOUT Token (Should Fail)")
    print("="*60)
    
    try:
        resp = requests.post(
            'http://localhost:8000/api/intake/submit',
            headers={'Content-Type': 'application/json'},
            json={"purpose": "personal", "consent_given": True}
        )
        
        print(f"✓ Response Status: {resp.status_code}")
        
        if resp.status_code == 401:
            print("✅ CORRECT: Endpoint properly requires authentication")
            return True
        else:
            print(f"⚠️  Unexpected status. Expected 401, got {resp.status_code}")
            return False
            
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        return False


def main():
    print("""
╔════════════════════════════════════════════════════════════╗
║     Intake Form 401 Unauthorized - Diagnostic Tool         ║
╚════════════════════════════════════════════════════════════╝

This script tests the authentication flow for intake submissions.
It will verify:
  1. Login and token generation work correctly
  2. Valid tokens are accepted by the intake endpoint
  3. Missing tokens are properly rejected (should be 401)

""")
    
    # Test 1: Login and get token
    token = test_login()
    
    if not token:
        print("\n❌ Cannot proceed: Token generation failed")
        sys.exit(1)
    
    # Test 2: Verify auth is required
    test_intake_without_token()
    
    # Test 3: Test with valid token
    success = test_intake_endpoint(token)
    
    print("\n" + "="*60)
    if success:
        print("✅ ALL TESTS PASSED")
        print("""
Backend authentication is working correctly.
If you're still getting 401 in the frontend:
  1. Make sure you're logged in first
  2. Check browser DevTools > Application > localStorage
     for 'token' key
  3. Log out and log in again to refresh token
  4. Check browser console for error messages
""")
    else:
        print("❌ TESTS FAILED - Backend issue detected")
        print("""
Possible causes:
  1. Backend not running on port 8000
  2. MongoDB connection issues
  3. Zoom/Google Meet credentials problem
  4. JWT secret key not configured
  
Run backend with: PORT=8000 python3 app.py
Check logs for detailed error messages.
""")
    print("="*60)
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
