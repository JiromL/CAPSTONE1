#!/usr/bin/env python3
"""
Test script for role-based assessment endpoints
Verifies all database integration features work correctly
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:5001"

# Test tokens (replace with actual tokens from your auth system)
TEST_TOKENS = {
    'admin': 'YOUR_ADMIN_TOKEN',
    'student': 'YOUR_STUDENT_TOKEN',
    'counselor': 'YOUR_COUNSELOR_TOKEN',
    'psychologist': 'YOUR_PSYCHOLOGIST_TOKEN',
    'ic': 'YOUR_IC_TOKEN',
}

def print_result(title, status, response):
    """Pretty print test results"""
    status_icon = "✅" if status == 200 else "❌"
    print(f"\n{status_icon} {title}")
    print(f"   Status: {status}")
    print(f"   Response: {json.dumps(response, indent=2)[:200]}...")

def test_init_indexes(token):
    """Test database index initialization"""
    print("\n" + "="*60)
    print("TEST 1: Initialize Database Indexes")
    print("="*60)
    
    response = requests.post(
        f"{BASE_URL}/assessments/init-indexes",
        headers={'Authorization': f'Bearer {token}'}
    )
    
    print_result("Initialize Indexes", response.status_code, response.json())
    
    expected = "All database indexes created successfully" in response.text
    print(f"   Expected 'success': {expected}")
    return response.status_code == 200

def test_student_dashboard(token):
    """Test student dashboard endpoint"""
    print("\n" + "="*60)
    print("TEST 2: Student Dashboard (Own Assessments)")
    print("="*60)
    
    response = requests.get(
        f"{BASE_URL}/assessments/dashboard",
        headers={'Authorization': f'Bearer {token}'}
    )
    
    data = response.json()
    print_result("Student Dashboard", response.status_code, data)
    
    if response.status_code == 200:
        print(f"   User Role: {data.get('user_role')}")
        print(f"   Cases Count: {len(data.get('recent_cases', []))}")
        print(f"   Summary: {data.get('summary')}")
    
    return response.status_code == 200

def test_counselor_dashboard(token):
    """Test counselor dashboard with alerts"""
    print("\n" + "="*60)
    print("TEST 3: Counselor Dashboard (Assigned Cases)")
    print("="*60)
    
    response = requests.get(
        f"{BASE_URL}/assessments/dashboard",
        headers={'Authorization': f'Bearer {token}'}
    )
    
    data = response.json()
    print_result("Counselor Dashboard", response.status_code, data)
    
    if response.status_code == 200:
        print(f"   Assigned Cases: {data.get('summary', {}).get('assigned_cases', 0)}")
        print(f"   High-Risk Alerts: {data.get('summary', {}).get('high_risk_alerts', 0)}")
        print(f"   Alert Examples: {data.get('alerts', [])[:3]}")
    
    return response.status_code == 200

def test_urgent_assessments(token):
    """Test urgent assessment retrieval"""
    print("\n" + "="*60)
    print("TEST 4: Urgent Assessments (RED/CRITICAL Cases)")
    print("="*60)
    
    response = requests.get(
        f"{BASE_URL}/assessments/urgent",
        headers={'Authorization': f'Bearer {token}'}
    )
    
    data = response.json()
    print_result("Urgent Assessments", response.status_code, data)
    
    if response.status_code == 200:
        count = data.get('count', 0)
        print(f"   Urgent Cases Found: {count}")
        if count > 0:
            example = data['urgent_assessments'][0]
            print(f"   Example Risk Level: {example.get('risk_level')}")
            print(f"   Example Is Emergency: {example.get('is_emergency')}")
    
    return response.status_code == 200

def test_admin_statistics(token):
    """Test admin-only statistics endpoint"""
    print("\n" + "="*60)
    print("TEST 5: System Statistics (Admin Only)")
    print("="*60)
    
    response = requests.get(
        f"{BASE_URL}/assessments/stats",
        headers={'Authorization': f'Bearer {token}'}
    )
    
    data = response.json()
    print_result("Assessment Statistics", response.status_code, data)
    
    if response.status_code == 200:
        print(f"   Total Intakes: {data.get('total_intakes', 0)}")
        print(f"   Emergency Cases: {data.get('emergency_cases', 0)}")
        print(f"   Anonymous: {data.get('anonymous_submissions', 0)}")
        stats = data.get('statistics', {})
        print(f"   By Concern: {stats.get('by_concern', [])[:3]}")
    
    return response.status_code == 200

def test_access_control():
    """Test role-based access control"""
    print("\n" + "="*60)
    print("TEST 6: Access Control (Role-Based)")
    print("="*60)
    
    # Students should not access stats
    response = requests.get(
        f"{BASE_URL}/assessments/stats",
        headers={'Authorization': f'Bearer {TEST_TOKENS["student"]}'}
    )
    
    student_denied = response.status_code == 403
    print(f"✅ Student cannot access stats: {student_denied} (Status: {response.status_code})")
    
    # Counselors should not access init-indexes
    response = requests.post(
        f"{BASE_URL}/assessments/init-indexes",
        headers={'Authorization': f'Bearer {TEST_TOKENS["counselor"]}'}
    )
    
    counselor_denied = response.status_code == 403
    print(f"✅ Counselor cannot init indexes: {counselor_denied} (Status: {response.status_code})")
    
    return student_denied and counselor_denied

def performance_test():
    """Test query performance with timing"""
    print("\n" + "="*60)
    print("TEST 7: Performance Benchmarks")
    print("="*60)
    
    import time
    
    headers = {'Authorization': f'Bearer {TEST_TOKENS["counselor"]}'}
    
    # Time dashboard query
    start = time.time()
    requests.get(f"{BASE_URL}/assessments/dashboard", headers=headers)
    dashboard_time = (time.time() - start) * 1000
    
    # Time urgent query
    start = time.time()
    requests.get(f"{BASE_URL}/assessments/urgent", headers=headers)
    urgent_time = (time.time() - start) * 1000
    
    print(f"Dashboard Query: {dashboard_time:.0f}ms (target: <200ms) {'✅' if dashboard_time < 200 else '⚠️'}")
    print(f"Urgent Query: {urgent_time:.0f}ms (target: <100ms) {'✅' if urgent_time < 100 else '⚠️'}")
    
    return dashboard_time < 500 and urgent_time < 500

def run_all_tests():
    """Run all tests"""
    print("\n" + "="*60)
    print("ROLE-BASED ASSESSMENT SYSTEM - INTEGRATION TESTS")
    print("="*60)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"Base URL: {BASE_URL}")
    
    results = {
        'Initialize Indexes': False,
        'Student Dashboard': False,
        'Counselor Dashboard': False,
        'Urgent Assessments': False,
        'Admin Statistics': False,
        'Access Control': False,
        'Performance': False,
    }
    
    # Run tests with available tokens
    try:
        if TEST_TOKENS['admin'] != 'YOUR_ADMIN_TOKEN':
            results['Initialize Indexes'] = test_init_indexes(TEST_TOKENS['admin'])
        
        if TEST_TOKENS['student'] != 'YOUR_STUDENT_TOKEN':
            results['Student Dashboard'] = test_student_dashboard(TEST_TOKENS['student'])
        
        if TEST_TOKENS['counselor'] != 'YOUR_COUNSELOR_TOKEN':
            results['Counselor Dashboard'] = test_counselor_dashboard(TEST_TOKENS['counselor'])
            results['Urgent Assessments'] = test_urgent_assessments(TEST_TOKENS['counselor'])
        
        if TEST_TOKENS['admin'] != 'YOUR_ADMIN_TOKEN':
            results['Admin Statistics'] = test_admin_statistics(TEST_TOKENS['admin'])
        
        results['Access Control'] = test_access_control()
        results['Performance'] = performance_test()
    
    except requests.exceptions.ConnectionError:
        print(f"\n❌ ERROR: Cannot connect to {BASE_URL}")
        print("   Make sure backend is running: python app.py")
        return
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        return
    
    # Print summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "⏭️  SKIP"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests {'passed' if passed == total else 'run'}")
    
    if passed == total:
        print("\n🎉 All tests passed! System is ready for production.")
    else:
        print("\n⚠️  Some tests were skipped. Update TEST_TOKENS with real auth tokens.")

if __name__ == '__main__':
    print("\n📋 To run these tests:")
    print("1. Replace TEST_TOKENS with real auth tokens from your system")
    print("2. Ensure backend is running: python app.py")
    print("3. Run: python3 test_assessment_endpoints.py")
    
    # Uncomment to run:
    # run_all_tests()
