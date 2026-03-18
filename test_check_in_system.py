#!/usr/bin/env python3
"""
Test script for Check-In system
Demonstrates creating and managing check-ins for existing clients
"""

import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:5001"

# Test credentials
COUNSELOR_EMAIL = "counselor@dlsu.edu.ph"
COUNSELOR_PASSWORD = "password123"

def get_auth_token(email, password):
    """Get JWT token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": email,
        "password": password
    })
    if response.status_code == 200:
        return response.json().get('access_token')
    else:
        print(f"❌ Login failed: {response.text}")
        return None

def make_request(method, endpoint, token, data=None):
    """Make authenticated request"""
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{BASE_URL}{endpoint}"
    
    if method == "GET":
        response = requests.get(url, headers=headers)
    elif method == "POST":
        response = requests.post(url, json=data, headers=headers)
    elif method == "PUT":
        response = requests.put(url, json=data, headers=headers)
    else:
        return None
    
    return response

def test_check_in_workflow():
    """Test complete check-in workflow"""
    
    print("=" * 70)
    print("CLIENT CHECK-IN SYSTEM TEST")
    print("=" * 70)
    print()
    
    # Get token
    token = get_auth_token(COUNSELOR_EMAIL, COUNSELOR_PASSWORD)
    if not token:
        print("Failed to authenticate")
        return
    
    print(f"✓ Authenticated as {COUNSELOR_EMAIL}")
    print()
    
    # Get a case
    print("1. Fetching available case...")
    response = make_request("GET", "/api/cases", token)
    if response.status_code != 200:
        print(f"❌ Failed to fetch cases: {response.text}")
        return
    
    cases = response.json().get('cases', [])
    if not cases:
        print("❌ No cases found")
        return
    
    case_id = cases[0]['_id']
    print(f"✓ Using case: {case_id}")
    print(f"  Status: {cases[0].get('status')}")
    print(f"  Client Status: {cases[0].get('client_status', 'Not set')}")
    print()
    
    # Update client status to CHECK_IN_ONLY
    print("2. Updating client status to CHECK_IN_ONLY...")
    update_data = {
        "client_status": "CHECK_IN_ONLY",
        "primary_concern": "Academic stress management",
        "reason": "Completed active counseling, transitioning to periodic check-ins"
    }
    
    response = make_request("PUT", f"/api/cases/{case_id}/status", token, update_data)
    if response.status_code != 200:
        print(f"❌ Failed to update status: {response.text}")
        return
    
    result = response.json()
    print(f"✓ Client status updated")
    print(f"  New Status: {result['client_status']}")
    print()
    
    # Create first check-in
    print("3. Creating first check-in (STATUS_UPDATE)...")
    check_in_data = {
        "case_id": case_id,
        "check_in_type": "STATUS_UPDATE",
        "contact_method": "IN_PERSON",
        "duration_minutes": 30,
        "notes": "Client reports feeling better with stress management techniques. No new concerns at this time. Academic performance improving.",
        "action_items": [
            {
                "action": "Continue practicing mindfulness exercises",
                "due_date": "2026-04-30"
            },
            {
                "action": "Schedule follow-up appointment",
                "due_date": "2026-06-15"
            }
        ],
        "outcome": "ONGOING",
        "next_check_in_date": "2026-06-15"
    }
    
    response = make_request("POST", "/api/check-ins/create", token, check_in_data)
    if response.status_code != 201:
        print(f"❌ Failed to create check-in: {response.text}")
        return
    
    check_in = response.json()
    check_in_id = check_in['check_in_id']
    print(f"✓ Check-in created: {check_in_id}")
    print(f"  Type: {check_in['check_in_type']}")
    print(f"  Next Check-in: {check_in.get('status_updated')}")
    print()
    
    # Get check-in details
    print("4. Getting check-in details...")
    response = make_request("GET", f"/api/check-ins/{check_in_id}", token)
    if response.status_code == 200:
        details = response.json()
        print(f"✓ Check-in details retrieved")
        print(f"  Checked by: {details['checked_in_by']}")
        print(f"  Duration: {details['duration_minutes']} minutes")
        print(f"  Contact: {details['contact_method']}")
        print(f"  Outcome: {details['outcome']}")
        print(f"  Action Items: {len(details.get('action_items', []))}")
    print()
    
    # Create second check-in (welfare check)
    print("5. Creating second check-in (WELFARE_CHECK)...")
    check_in_data2 = {
        "case_id": case_id,
        "check_in_type": "WELFARE_CHECK",
        "contact_method": "PHONE",
        "duration_minutes": 15,
        "notes": "Brief phone check-in. Client reports good progress. No crisis indicators.",
        "outcome": "ONGOING",
        "next_check_in_date": "2026-09-15"
    }
    
    response = make_request("POST", "/api/check-ins/create", token, check_in_data2)
    if response.status_code != 201:
        print(f"❌ Failed to create second check-in: {response.text}")
        return
    
    check_in2 = response.json()
    print(f"✓ Second check-in created: {check_in2['check_in_id']}")
    print(f"  Type: {check_in2['check_in_type']}")
    print()
    
    # Get check-in history
    print("6. Getting check-in history for case...")
    response = make_request("GET", f"/api/check-ins/{case_id}/history", token)
    if response.status_code == 200:
        history = response.json()
        print(f"✓ Check-in history retrieved")
        print(f"  Total Check-ins: {history['total_check_ins']}")
        print(f"  Current Status: {history['client_current_status']}")
        print(f"  Recent Check-ins:")
        for ci in history['check_ins'][:3]:
            print(f"    - {ci['check_in_type']} by {ci['checked_in_by']} on {ci['created_at']}")
    print()
    
    # Update check-in with additional notes
    print("7. Updating first check-in with additional notes...")
    update_data = {
        "notes": "UPDATED: Client doing exceptionally well. No follow-up concerns.",
        "outcome": "RESOLVED"
    }
    
    response = make_request("PUT", f"/api/check-ins/{check_in_id}", token, update_data)
    if response.status_code == 200:
        print(f"✓ Check-in updated")
        print(f"  New outcome: RESOLVED")
    print()
    
    # Get pending check-ins list
    print("8. Getting pending/overdue check-ins...")
    response = make_request("GET", "/api/check-ins/list", token)
    if response.status_code == 200:
        pending = response.json()
        print(f"✓ Pending check-ins retrieved")
        print(f"  Total pending: {pending['total_pending_check_ins']}")
        print(f"  Overdue: {pending['overdue_count']}")
        if pending['check_ins']:
            print(f"  Recent pending:")
            for p in pending['check_ins'][:3]:
                status = "❌ OVERDUE" if p['is_overdue'] else "⏰ Upcoming"
                print(f"    {status} | {p['student_name']} | {p['client_status']} | {p['days_since_last_check_in']} days")
    print()
    
    # Get check-in summary
    print("9. Getting check-in summary...")
    response = make_request("GET", "/api/check-ins/summary/status", token)
    if response.status_code == 200:
        summary = response.json()
        print(f"✓ Summary retrieved")
        print(f"  Clients by Status:")
        for status, count in summary['clients_by_status'].items():
            if count > 0:
                print(f"    - {status}: {count}")
        print(f"  Check-in Types:")
        for check_type, count in summary['check_in_types_total'].items():
            if count > 0:
                print(f"    - {check_type}: {count}")
        print(f"  Total Cases: {summary['total_cases']}")
        print(f"  Total Check-ins: {summary['total_check_ins']}")
    print()
    
    # Demonstrate status transitions
    print("10. Demonstrating status transitions...")
    print("    Current: CHECK_IN_ONLY")
    
    statuses = ["INACTIVE", "ACTIVE", "UNDER_ACCOMMODATION", "TERMINATION_PENDING"]
    for status in statuses:
        status_data = {
            "client_status": status,
            "reason": f"Transitioning to {status} for demonstration"
        }
        response = make_request("PUT", f"/api/cases/{case_id}/status", token, status_data)
        if response.status_code == 200:
            print(f"    ✓ Transitioned to {status}")
    
    # Return to CHECK_IN_ONLY
    final_status = {
        "client_status": "CHECK_IN_ONLY",
        "reason": "Returning to check-in only status"
    }
    response = make_request("PUT", f"/api/cases/{case_id}/status", token, final_status)
    if response.status_code == 200:
        print(f"    ✓ Final status: CHECK_IN_ONLY")
    
    print()
    print("=" * 70)
    print("✓ CHECK-IN SYSTEM TEST COMPLETED SUCCESSFULLY")
    print("=" * 70)

if __name__ == "__main__":
    test_check_in_workflow()
