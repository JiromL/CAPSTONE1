#!/usr/bin/env python3
"""
Test script for Coordination & Referral Module
Tests all reminders, feedback, CPS referrals, video links, and journaling endpoints
"""

import requests
import json
from datetime import datetime, timedelta
from bson import ObjectId

BASE_URL = "http://localhost:8000/api"

# Test user credentials (should have valid JWT)
TEST_USER_TOKEN = None
TEST_ADMIN_TOKEN = None
TEST_STUDENT_ID = None
TEST_CASE_ID = None

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_section(title):
    print(f"\n{Colors.BLUE}{'='*60}\n{title}\n{'='*60}{Colors.END}")

def print_pass(msg):
    print(f"{Colors.GREEN}✅ PASS: {msg}{Colors.END}")

def print_fail(msg, response=None):
    print(f"{Colors.RED}❌ FAIL: {msg}{Colors.END}")
    if response:
        print(f"   Response: {response.status_code}")
        try:
            print(f"   Body: {json.dumps(response.json(), indent=2)}")
        except:
            print(f"   Body: {response.text}")

def print_warn(msg):
    print(f"{Colors.YELLOW}⚠️  WARN: {msg}{Colors.END}")

def setup_test_data():
    """Get real test user and setup IDs"""
    global TEST_USER_TOKEN, TEST_ADMIN_TOKEN, TEST_STUDENT_ID, TEST_CASE_ID
    
    print_section("SETUP: Getting Test Credentials")
    
    # Login as student
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "student@dlsu.edu.ph",
        "password": "password"
    })
    
    if response.status_code == 200:
        data = response.json()
        TEST_USER_TOKEN = data.get('access_token')
        TEST_STUDENT_ID = data.get('user_id')
        print_pass(f"Student login: token={TEST_USER_TOKEN[:20]}..., user_id={TEST_STUDENT_ID}")
    else:
        print_fail("Student login failed", response)
        return False
    
    # Login as admin/counselor for CPS tests
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "counselor2@dlsu.edu.ph",
        "password": "password"
    })
    
    if response.status_code == 200:
        data = response.json()
        TEST_ADMIN_TOKEN = data.get('access_token')
        print_pass(f"Counselor login: token={TEST_ADMIN_TOKEN[:20]}...")
    else:
        print_fail("Counselor login failed", response)
    
    # Get a case for testing
    response = requests.get(
        f"{BASE_URL}/cases",
        headers={"Authorization": f"Bearer {TEST_ADMIN_TOKEN}"}
    )
    
    if response.status_code == 200:
        cases = response.json().get('cases', [])
        if cases:
            TEST_CASE_ID = cases[0]['_id']
            print_pass(f"Found test case: {TEST_CASE_ID}")
        else:
            print_warn("No cases found for testing")
    
    return True

# ============ REMINDERS TESTS ============

def test_reminders():
    """Test reminders endpoints"""
    print_section("TEST 1: REMINDERS SYSTEM")
    
    headers = {"Authorization": f"Bearer {TEST_USER_TOKEN}"}
    reminder_id = None
    
    # Test 1.1: Create reminder
    print("\n1.1 Creating reminder...")
    future_time = (datetime.utcnow() + timedelta(days=1)).isoformat()
    response = requests.post(
        f"{BASE_URL}/engagement/reminders",
        headers=headers,
        json={
            "title": "Test Appointment Reminder",
            "reminder_time": future_time,
            "reminder_type": "appointment",
            "description": "Test reminder for counseling session"
        }
    )
    
    if response.status_code == 201:
        data = response.json()
        reminder_id = data.get('reminder_id')
        print_pass(f"Created reminder: {reminder_id}")
    else:
        print_fail(f"Failed to create reminder", response)
        return False
    
    # Test 1.2: List reminders
    print("\n1.2 Listing reminders...")
    response = requests.get(
        f"{BASE_URL}/engagement/reminders?type=upcoming",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        count = len(data.get('reminders', []))
        print_pass(f"Listed {count} upcoming reminders")
    else:
        print_fail("Failed to list reminders", response)
        return False
    
    # Test 1.3: Acknowledge reminder
    if reminder_id:
        print("\n1.3 Acknowledging reminder...")
        response = requests.patch(
            f"{BASE_URL}/engagement/reminders/{reminder_id}/acknowledge",
            headers=headers
        )
        
        if response.status_code == 200:
            print_pass(f"Acknowledged reminder")
        else:
            print_fail("Failed to acknowledge reminder", response)
    
    return True

# ============ FEEDBACK TESTS ============

def test_feedback():
    """Test feedback collection endpoints"""
    print_section("TEST 2: FEEDBACK COLLECTION SYSTEM")
    
    headers = {"Authorization": f"Bearer {TEST_USER_TOKEN}"}
    feedback_id = None
    
    # Test 2.1: Submit feedback
    print("\n2.1 Submitting feedback...")
    response = requests.post(
        f"{BASE_URL}/engagement/feedback",
        headers=headers,
        json={
            "rating": 5,
            "content": "Excellent counseling session, very helpful advice",
            "category": "session",
            "would_recommend": True,
            "improvements": ["longer session time"]
        }
    )
    
    if response.status_code == 201:
        data = response.json()
        feedback_id = data.get('feedback_id')
        print_pass(f"Submitted feedback: {feedback_id}, rating={data.get('rating')}")
    else:
        print_fail("Failed to submit feedback", response)
        return False
    
    # Test 2.2: List feedback (admin only, use admin token)
    print("\n2.2 Listing feedback (admin)...")
    admin_headers = {"Authorization": f"Bearer {TEST_ADMIN_TOKEN}"}
    response = requests.get(
        f"{BASE_URL}/engagement/feedback?type=all&skip=0&limit=10",
        headers=admin_headers
    )
    
    if response.status_code == 200:
        data = response.json()
        count = len(data.get('feedback', []))
        avg_rating = data.get('avg_rating')
        print_pass(f"Listed {count} feedback entries, avg rating: {avg_rating}")
    else:
        print_fail("Failed to list feedback", response)
    
    # Test 2.3: Get specific feedback
    if feedback_id:
        print("\n2.3 Getting specific feedback...")
        response = requests.get(
            f"{BASE_URL}/engagement/feedback/{feedback_id}",
            headers=admin_headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print_pass(f"Retrieved feedback with rating: {data.get('rating')}")
        else:
            print_fail("Failed to get feedback", response)
    
    return True

# ============ JOURNAL TESTS ============

def test_journaling():
    """Test journaling endpoints"""
    print_section("TEST 3: JOURNALING SYSTEM")
    
    headers = {"Authorization": f"Bearer {TEST_USER_TOKEN}"}
    journal_id = None
    
    # Test 3.1: Create journal entry
    print("\n3.1 Creating journal entry...")
    response = requests.post(
        f"{BASE_URL}/engagement/journal",
        headers=headers,
        json={
            "content": "Today was a good day. I managed to handle my anxiety better.",
            "mood": 4,
            "tags": ["anxiety", "progress", "coping"],
            "is_private": True
        }
    )
    
    if response.status_code == 201:
        data = response.json()
        journal_id = data.get('journal_id')
        print_pass(f"Created journal entry: {journal_id}, mood={data.get('mood')}")
    else:
        print_fail("Failed to create journal entry", response)
        return False
    
    # Test 3.2: List journal entries
    print("\n3.2 Listing journal entries...")
    response = requests.get(
        f"{BASE_URL}/engagement/journal?skip=0&limit=5",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        count = len(data.get('entries', []))
        total = data.get('total', 0)
        print_pass(f"Listed {count} entries (total: {total})")
    else:
        print_fail("Failed to list journal entries", response)
        return False
    
    # Test 3.3: Get full journal entry
    if journal_id:
        print("\n3.3 Getting full journal entry...")
        response = requests.get(
            f"{BASE_URL}/engagement/journal/{journal_id}",
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print_pass(f"Retrieved entry with tags: {data.get('tags')}")
        else:
            print_fail("Failed to get journal entry", response)
    
    # Test 3.4: Update journal entry
    if journal_id:
        print("\n3.4 Updating journal entry...")
        response = requests.patch(
            f"{BASE_URL}/engagement/journal/{journal_id}",
            headers=headers,
            json={
                "mood": 5,
                "content": "Updated: Actually had a great day!"
            }
        )
        
        if response.status_code == 200:
            print_pass("Updated journal entry")
        else:
            print_fail("Failed to update journal entry", response)
    
    return True

# ============ VIDEO LINKS TESTS ============

def test_video_links():
    """Test video link endpoints"""
    print_section("TEST 4: VIDEO LINKS SYSTEM")
    
    headers = {"Authorization": f"Bearer {TEST_ADMIN_TOKEN}"}
    
    # First, create a test session
    print("\n4.0 Creating test session...")
    session_response = requests.post(
        f"{BASE_URL}/case-management/session-notes",
        headers=headers,
        json={
            "case_id": TEST_CASE_ID,
            "session_date": datetime.utcnow().isoformat(),
            "session_type": "INITIAL",
            "session_notes": "Test session for video link testing"
        }
    )
    
    session_id = None
    if session_response.status_code == 201:
        session_id = session_response.json().get('session_note_id')
        print_pass(f"Created test session: {session_id}")
    else:
        print_warn("Could not create test session, skipping video link tests")
        return True
    
    # Test 4.1: Create video link
    print("\n4.1 Creating video link...")
    response = requests.post(
        f"{BASE_URL}/engagement/session/{session_id}/video-link",
        headers=headers,
        json={
            "platform": "zoom",
            "link_url": "https://zoom.us/j/123456789",
            "password": "abc123",
            "start_time": datetime.utcnow().isoformat()
        }
    )
    
    if response.status_code == 201:
        data = response.json()
        print_pass(f"Created video link: {data.get('video_link_id')}, platform={data.get('platform')}")
    else:
        print_fail("Failed to create video link", response)
        return False
    
    # Test 4.2: Get video link
    print("\n4.2 Retrieving video link...")
    response = requests.get(
        f"{BASE_URL}/engagement/session/{session_id}/video-link",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        print_pass(f"Retrieved video link: platform={data.get('platform')}, url={data.get('link_url')[:30]}...")
    else:
        print_fail("Failed to get video link", response)
        return False
    
    return True

# ============ CPS REFERRAL TESTS ============

def test_cps_referrals():
    """Test CPS referral workflow"""
    print_section("TEST 5: CPS REFERRAL WORKFLOW")
    
    if not TEST_CASE_ID:
        print_warn("No test case available, skipping CPS referral tests")
        return True
    
    headers = {"Authorization": f"Bearer {TEST_ADMIN_TOKEN}"}
    referral_id = None
    
    # Test 5.1: Initiate CPS referral
    print("\n5.1 Initiating CPS referral...")
    response = requests.post(
        f"{BASE_URL}/referrals/initiate",
        headers=headers,
        json={
            "case_id": TEST_CASE_ID,
            "referral_type": "CPS",
            "reason": "Student disclosed potential abuse situation",
            "allegations": ["physical abuse", "emotional neglect"],
            "reporter_name": "Test Counselor",
            "reporter_relationship": "Mandated Reporter",
            "student_dob": "2006-05-15",
            "student_address": "123 Main Street, City, State 12345",
            "has_siblings": False
        }
    )
    
    if response.status_code == 201:
        data = response.json()
        referral_id = data.get('referral_id')
        print_pass(f"Initiated CPS referral: {referral_id}, status={data.get('status')}")
    else:
        print_fail("Failed to initiate CPS referral", response)
        return False
    
    # Test 5.2: Assign investigator
    if referral_id:
        print("\n5.2 Assigning CPS investigator...")
        response = requests.post(
            f"{BASE_URL}/referrals/{referral_id}/cps/assign-investigator",
            headers=headers,
            json={
                "investigator_name": "Jane Smith",
                "investigator_contact": "555-0123",
                "cps_case_number": "CPS-2026-00123"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            print_pass(f"Assigned investigator: {data.get('investigator_name')}, status={data.get('status')}")
        else:
            print_fail("Failed to assign investigator", response)
    
    # Test 5.3: Start investigation
    if referral_id:
        print("\n5.3 Starting investigation...")
        response = requests.post(
            f"{BASE_URL}/referrals/{referral_id}/cps/start-investigation",
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print_pass(f"Investigation started, status={data.get('status')}")
        else:
            print_fail("Failed to start investigation", response)
    
    # Test 5.4: Submit investigation findings
    if referral_id:
        print("\n5.4 Submitting investigation findings...")
        response = requests.post(
            f"{BASE_URL}/referrals/{referral_id}/cps/investigation-findings",
            headers=headers,
            json={
                "investigation_findings": "SUBSTANTIATED",
                "investigation_details": "Evidence supports allegations of physical abuse"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            print_pass(f"Findings submitted, status={data.get('status')}")
        else:
            print_fail("Failed to submit findings", response)
    
    # Test 5.5: Record case decision
    if referral_id:
        print("\n5.5 Recording case decision...")
        response = requests.post(
            f"{BASE_URL}/referrals/{referral_id}/cps/case-decision",
            headers=headers,
            json={
                "decision": "CASE_OPENED",
                "roi_signed": True
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            print_pass(f"Decision recorded, status={data.get('status')}")
        else:
            print_fail("Failed to record decision", response)
    
    # Test 5.6: Get referral status
    if referral_id:
        print("\n5.6 Retrieving referral status...")
        response = requests.get(
            f"{BASE_URL}/referrals/{referral_id}",
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print_pass(f"Retrieved referral: status={data.get('status')}, type={data.get('referral_type')}")
        else:
            print_fail("Failed to get referral", response)
    
    return True

# ============ MAIN TEST RUNNER ============

def main():
    print(f"\n{Colors.BLUE}{'*'*60}")
    print("COORDINATION & REFERRAL MODULE - COMPREHENSIVE TEST SUITE")
    print(f"{'*'*60}{Colors.END}\n")
    
    # Setup
    if not setup_test_data():
        print_fail("Could not setup test data")
        return
    
    test_results = {
        "Reminders": test_reminders(),
        "Feedback": test_feedback(),
        "Journaling": test_journaling(),
        "Video Links": test_video_links(),
        "CPS Referrals": test_cps_referrals()
    }
    
    # Summary
    print_section("TEST SUMMARY")
    passed = sum(1 for v in test_results.values() if v)
    total = len(test_results)
    
    for feature, result in test_results.items():
        status = f"{Colors.GREEN}✅ PASS{Colors.END}" if result else f"{Colors.RED}❌ FAIL{Colors.END}"
        print(f"{feature:20} {status}")
    
    print(f"\n{Colors.BLUE}Total: {passed}/{total} features passed{Colors.END}\n")
    
    if passed == total:
        print(f"{Colors.GREEN}🎉 ALL TESTS PASSED!{Colors.END}\n")
    else:
        print(f"{Colors.YELLOW}⚠️  Some tests failed - review output above{Colors.END}\n")

if __name__ == "__main__":
    main()
