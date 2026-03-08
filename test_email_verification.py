#!/usr/bin/env python3
"""
Test script for email verification system
Tests the complete registration → verification → login flow
"""

import sys
import requests
import json
from datetime import datetime

# Configuration
API_BASE_URL = "http://127.0.0.1:8000"
TEST_EMAIL = "test.verification@dlsu.edu.ph"
TEST_PASSWORD = "TestPassword123!"
TEST_FIRST_NAME = "Test"
TEST_LAST_NAME = "User"

# ANSI colors
GREEN = '\033[92m'
RED = '\033[91m'
BLUE = '\033[94m'
YELLOW = '\033[93m'
RESET = '\033[0m'

def print_header(msg):
    print(f"\n{BLUE}{'='*60}")
    print(f"  {msg}")
    print(f"{'='*60}{RESET}\n")

def print_success(msg):
    print(f"{GREEN}✓ {msg}{RESET}")

def print_error(msg):
    print(f"{RED}✗ {msg}{RESET}")

def print_info(msg):
    print(f"{YELLOW}ℹ {msg}{RESET}")

def test_registration():
    """Test user registration"""
    print_header("TEST 1: User Registration")
    
    payload = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "first_name": TEST_FIRST_NAME,
        "last_name": TEST_LAST_NAME
    }
    
    print(f"Registering user: {TEST_EMAIL}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/auth/register",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"\nStatus Code: {response.status_code}")
        
        if response.status_code == 201:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            print_success(f"User registered. User ID: {data.get('user_id')}")
            print_info(f"Verification code should be displayed in backend console")
            return data.get('user_id'), data.get('email')
        else:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            # Check if user already exists
            if response.status_code == 200 and "already" not in data.get('error', '').lower():
                print_success("User already exists (not verified). Getting verification code from console...")
                return None, TEST_EMAIL
            else:
                print_error(f"Registration failed: {data.get('error', 'Unknown error')}")
                return None, None
    except Exception as e:
        print_error(f"Request failed: {e}")
        return None, None

def test_invalid_domain():
    """Test DLSU domain validation"""
    print_header("TEST 2: DLSU Domain Validation")
    
    # Try to register with non-DLSU email
    payload = {
        "email": "hacker@gmail.com",
        "password": TEST_PASSWORD,
        "first_name": "Hacker",
        "last_name": "Person"
    }
    
    print(f"Attempting registration with invalid domain: {payload['email']}")
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/auth/register",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 400:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            if "dlsu" in data.get('error', '').lower():
                print_success("Domain validation working correctly")
                return True
            else:
                print_error(f"Wrong error message: {data.get('error')}")
                return False
        else:
            print_error(f"Expected 400, got {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Request failed: {e}")
        return False

def test_missing_fields():
    """Test missing field validation"""
    print_header("TEST 3: Missing Fields Validation")
    
    payload = {
        "email": TEST_EMAIL,
        # Missing password, first_name, last_name
    }
    
    print(f"Attempting registration with missing fields")
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/auth/register",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 400:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            print_success("Field validation working correctly")
            return True
        else:
            print_error(f"Expected 400, got {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Request failed: {e}")
        return False

def test_verify_email_invalid_code():
    """Test email verification with invalid code"""
    print_header("TEST 4: Invalid Verification Code")
    
    payload = {
        "email": TEST_EMAIL,
        "code": "000000"  # Invalid code
    }
    
    print(f"Attempting email verification with invalid code")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/auth/verify-email",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if response.status_code == 401:
            print_success("Invalid code rejection working correctly")
            return True
        else:
            print_info(f"Got status {response.status_code}: {data.get('error')}")
            return False
    except Exception as e:
        print_error(f"Request failed: {e}")
        return False

def test_login_unverified():
    """Test login attempt with unverified email"""
    print_header("TEST 5: Login with Unverified Email")
    
    payload = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    }
    
    print(f"Attempting login with unverified email")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/auth/login",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if response.status_code == 403 and "verified" in data.get('error', '').lower():
            print_success("Unverified email login blocked correctly")
            return True
        else:
            print_info(f"Got status {response.status_code}: {data.get('error')}")
            return False
    except Exception as e:
        print_error(f"Request failed: {e}")
        return False

def test_resend_code():
    """Test resend verification code"""
    print_header("TEST 6: Resend Verification Code")
    
    payload = {
        "email": TEST_EMAIL
    }
    
    print(f"Requesting code resend for: {TEST_EMAIL}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/auth/resend-code",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if response.status_code == 200:
            print_success("Code resend working correctly")
            print_info("New verification code should be displayed in backend console")
            return True
        else:
            print_error(f"Resend failed: {data.get('error')}")
            return False
    except Exception as e:
        print_error(f"Request failed: {e}")
        return False

def main():
    print(f"\n{BLUE}{'='*60}")
    print(f"  EMAIL VERIFICATION SYSTEM TEST SUITE")
    print(f"  API Base URL: {API_BASE_URL}")
    print(f"  Test Email: {TEST_EMAIL}")
    print(f"  Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}{RESET}")
    
    results = {}
    
    # Run tests
    results['domain_validation'] = test_invalid_domain()
    results['missing_fields'] = test_missing_fields()
    
    user_id, email = test_registration()
    results['registration'] = email is not None
    
    results['invalid_code'] = test_verify_email_invalid_code()
    results['login_unverified'] = test_login_unverified()
    results['resend_code'] = test_resend_code()
    
    # Summary
    print_header("TEST SUMMARY")
    
    for test_name, result in results.items():
        status = "PASS" if result else "FAIL"
        symbol = "✓" if result else "✗"
        color = GREEN if result else RED
        print(f"{color}{symbol} {test_name.replace('_', ' ').title()}: {status}{RESET}")
    
    total = len(results)
    passed = sum(1 for r in results.values() if r)
    
    print(f"\n{BLUE}Total: {passed}/{total} tests passed{RESET}")
    
    if passed == total:
        print(f"\n{GREEN}All tests passed!{RESET}")
        print(f"\n{YELLOW}Next Step: {RESET}")
        print(f"1. Open backend console to find the verification code")
        print(f"2. Use the /verify-email endpoint with the code to activate the account")
        print(f"3. Then login should work")
        return 0
    else:
        print(f"\n{RED}Some tests failed!{RESET}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
