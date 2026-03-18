#!/usr/bin/env python3
"""
Test script for CPS referral workflow
Shows how to use the new CPS-aware referral system
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
    else:
        return None
    
    return response

def test_cps_referral_workflow():
    """Test complete CPS referral workflow"""
    
    print("=" * 60)
    print("CPS REFERRAL WORKFLOW TEST")
    print("=" * 60)
    
    # Get token
    token = get_auth_token(COUNSELOR_EMAIL, COUNSELOR_PASSWORD)
    if not token:
        print("Failed to get authentication token")
        return
    
    print(f"✓ Authenticated as {COUNSELOR_EMAIL}")
    print()
    
    # Get a case to use
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
    print()
    
    # 1. CREATE CPS REFERRAL
    print("2. Creating CPS referral...")
    cps_referral_data = {
        "case_id": case_id,
        "referral_type": "CPS",
        "reason": "Student disclosed physical abuse at home",
        "allegations": ["physical abuse", "possible neglect"],
        "reporter_name": "Ms. Maria Cruz",
        "reporter_relationship": "School Counselor",
        "student_dob": "2007-08-15",
        "student_address": "456 Mabini St, Manila",
        "has_siblings": True,
        "siblings_info": "1 younger brother, age 14",
        "urgency": "URGENT"
    }
    
    response = make_request("POST", "/api/referrals/initiate", token, cps_referral_data)
    if response.status_code != 201:
        print(f"❌ Failed to create CPS referral: {response.text}")
        return
    
    referral = response.json()
    referral_id = referral['referral_id']
    print(f"✓ CPS referral created: {referral_id}")
    print(f"  Status: {referral['status']}")
    print()
    
    # 2. ASSIGN INVESTIGATOR
    print("3. Assigning CPS investigator...")
    investigator_data = {
        "cps_case_number": "CPS-2024-089765",
        "investigator_name": "Officer Robert Santos",
        "investigator_contact": "(02) 555-6789"
    }
    
    response = make_request("POST", 
        f"/api/referrals/{referral_id}/cps/assign-investigator", 
        token, investigator_data)
    if response.status_code != 200:
        print(f"❌ Failed to assign investigator: {response.text}")
        return
    
    result = response.json()
    print(f"✓ Investigator assigned")
    print(f"  Status: {result['status']}")
    print(f"  Case #: {result['cps_case_number']}")
    print(f"  Investigator: {result['investigator_name']}")
    print()
    
    # 3. START INVESTIGATION
    print("4. Starting investigation...")
    response = make_request("POST", 
        f"/api/referrals/{referral_id}/cps/start-investigation", 
        token, {})
    if response.status_code != 200:
        print(f"❌ Failed to start investigation: {response.text}")
        return
    
    result = response.json()
    print(f"✓ Investigation started")
    print(f"  Status: {result['status']}")
    print()
    
    # 4. ADD INVESTIGATION NOTES
    print("5. Adding investigation notes...")
    
    notes = [
        "Initial home visit conducted on 2024-03-20. Family home appears safe.",
        "Medical examination of student conducted. Bruises on upper arm consistent with grab marks.",
        "Parent interviews completed. Conflicting accounts provided.",
        "Schools records reviewed. Previous incidents noted.",
        "Collateral contacts made with neighbors and teacher."
    ]
    
    for note_text in notes:
        note_data = {"note": note_text}
        response = make_request("POST", 
            f"/api/referrals/{referral_id}/cps/add-note", 
            token, note_data)
        if response.status_code != 200:
            print(f"❌ Failed to add note: {response.text}")
        else:
            print(f"  ✓ Note added")
    
    print()
    
    # 5. SUBMIT FINDINGS
    print("6. Submitting investigation findings...")
    findings_data = {
        "findings": "SUBSTANTIATED",
        "investigation_details": "Physical abuse substantiated. Medical evidence confirms non-accidental injury. Parent unable to provide satisfactory explanation for injuries. Child reported fear of parent."
    }
    
    response = make_request("POST", 
        f"/api/referrals/{referral_id}/cps/investigation-findings", 
        token, findings_data)
    if response.status_code != 200:
        print(f"❌ Failed to submit findings: {response.text}")
        return
    
    result = response.json()
    print(f"✓ Investigation findings submitted")
    print(f"  Status: {result['status']}")
    print(f"  Findings: {result['findings']}")
    print()
    
    # 6. SUBMIT CPS DECISION
    print("7. Submitting CPS decision...")
    decision_data = {
        "decision": "CASE_OPENED",
        "decision_details": "Case opened for child protective services. Family referred to Family Support Program. In-home counseling recommended. Monthly check-ins scheduled. School social worker designated as point of contact."
    }
    
    response = make_request("POST", 
        f"/api/referrals/{referral_id}/cps/decision", 
        token, decision_data)
    if response.status_code != 200:
        print(f"❌ Failed to submit decision: {response.text}")
        return
    
    result = response.json()
    print(f"✓ CPS decision submitted")
    print(f"  Status: {result['status']}")
    print(f"  Decision: {result['decision']}")
    print()
    
    # 7. GET REFERRAL DETAILS
    print("8. Getting full referral details...")
    response = make_request("GET", f"/api/referrals/{referral_id}", token)
    if response.status_code != 200:
        print(f"❌ Failed to get referral: {response.text}")
        return
    
    referral_detail = response.json()
    print(f"✓ Referral details retrieved")
    print(f"  Case Number: {referral_detail.get('cps_case_number')}")
    print(f"  Investigator: {referral_detail.get('investigator_name')}")
    print(f"  Findings: {referral_detail.get('investigation_findings')}")
    print(f"  Decision: {referral_detail.get('decision')}")
    print(f"  Case Opened: {referral_detail.get('case_opened_with_cps')}")
    print(f"  Notes Count: {len(referral_detail.get('investigation_notes', []))}")
    print()
    
    # 8. COMPLETE WARM HANDOFF
    print("9. Completing warm handoff...")
    handoff_data = {
        "completion_notes": "Student successfully connected with CPS Family Support Program. Initial appointment with family counselor scheduled for 2024-04-05. School to continue monitoring and provide supportive services."
    }
    
    response = make_request("POST", 
        f"/api/referrals/{referral_id}/warm-handoff", 
        token, handoff_data)
    if response.status_code != 200:
        print(f"❌ Failed to complete warm handoff: {response.text}")
        return
    
    result = response.json()
    print(f"✓ Warm handoff completed")
    print(f"  Status: {result['status']}")
    print(f"  Handoff Date: {result['handoff_date']}")
    print()
    
    # 9. CHECK CASE CLOSURE ELIGIBILITY
    print("10. Checking case closure eligibility...")
    response = make_request("GET", f"/api/referrals/case/{case_id}/can-close", token)
    if response.status_code == 200:
        closure_info = response.json()
        print(f"✓ Case closure status retrieved")
        print(f"  Can Close: {closure_info['can_close']}")
        if closure_info.get('blockers'):
            print(f"  Blockers: {', '.join(closure_info['blockers'])}")
    print()
    
    # 10. GET CASE REFERRAL HISTORY
    print("11. Getting case referral history...")
    response = make_request("GET", f"/api/referrals/case/{case_id}/history", token)
    if response.status_code == 200:
        history = response.json()
        print(f"✓ Referral history retrieved")
        print(f"  Total Referrals: {history['total_referrals']}")
        for idx, ref in enumerate(history['referrals'], 1):
            print(f"  {idx}. [{ref['referral_type']}] {ref['status']} - {ref['reason'][:50]}...")
    print()
    
    # 11. GET CPS REFERRALS LIST
    print("12. Getting all CPS referrals...")
    response = make_request("GET", "/api/referrals/cps/list", token)
    if response.status_code == 200:
        cps_list = response.json()
        print(f"✓ CPS referrals retrieved")
        print(f"  Total CPS Referrals: {cps_list['total_cps_referrals']}")
        for idx, ref in enumerate(cps_list['referrals'][:3], 1):
            print(f"  {idx}. {ref['student_name']} - {ref['status']}")
            if ref.get('investigation_findings'):
                print(f"     Findings: {ref['investigation_findings']}")
    print()
    
    # 12. GET SUMMARY
    print("13. Getting referral summary...")
    response = make_request("GET", "/api/referrals/summary", token)
    if response.status_code == 200:
        summary = response.json()
        print(f"✓ Summary retrieved")
        print(f"  Total Referrals: {summary['total_referrals']}")
        print(f"  By Type:")
        print(f"    - CPS: {summary['by_type'].get('CPS', 0)}")
        print(f"    - External: {summary['by_type'].get('EXTERNAL', 0)}")
        print(f"    - Internal: {summary['by_type'].get('INTERNAL', 0)}")
        print(f"  CPS Findings:")
        findings = summary.get('cps_findings', {})
        print(f"    - Substantiated: {findings.get('SUBSTANTIATED', 0)}")
        print(f"    - Unsubstantiated: {findings.get('UNSUBSTANTIATED', 0)}")
        print(f"    - Inconclusive: {findings.get('INCONCLUSIVE', 0)}")
        print(f"  Pending Warm Handoffs: {summary['pending_warm_handoffs']}")
    
    print()
    print("=" * 60)
    print("✓ CPS REFERRAL WORKFLOW TEST COMPLETED SUCCESSFULLY")
    print("=" * 60)

if __name__ == "__main__":
    test_cps_referral_workflow()
