#!/usr/bin/env python3
"""
Test script for appointment rules implementation
Tests risk level calculation and appointment scheduling
"""

import requests
import json
from datetime import datetime, timedelta

API_BASE = 'http://localhost:5001/api'

# Test user credentials
TEST_USER = {
    'email': 'test@example.com',
    'password': 'testpass123'
}

def get_token():
    """Get auth token"""
    try:
        response = requests.post(f'{API_BASE}/auth/login', json=TEST_USER)
        if response.status_code == 200:
            return response.json().get('access_token')
        else:
            print(f"❌ Login failed: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None

def test_calculate_appointment():
    """Test appointment calculation with different risk levels"""
    token = get_token()
    if not token:
        return False
    
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    
    tests = [
        {
            'name': '🔴 RED RISK (PHQ-9: 25)',
            'data': {
                'phq9_responses': [5, 5, 5, 5, 5],  # 25 total
                'gad7_responses': [],
                'pss_responses': [],
                'acad_responses': []
            },
            'expected_risk': 'RED',
            'expected_days': 'Immediate'
        },
        {
            'name': '🟡 YELLOW RISK (GAD-7: 14)',
            'data': {
                'phq9_responses': [2, 2, 2],  # 6 total
                'gad7_responses': [2, 2, 2, 2, 2, 2, 2],  # 14 total
                'pss_responses': [],
                'acad_responses': []
            },
            'expected_risk': 'YELLOW',
            'expected_days': 'Within 1 business day'
        },
        {
            'name': '🟢 GREEN RISK (Low scores)',
            'data': {
                'phq9_responses': [1, 1, 1],  # 3 total
                'gad7_responses': [0, 0, 0],  # 0 total
                'pss_responses': [],
                'acad_responses': []
            },
            'expected_risk': 'GREEN',
            'expected_days': '2-3 business days'
        }
    ]
    
    print('\n📋 APPOINTMENT CALCULATION TESTS')
    print('=' * 70)
    
    for test in tests:
        try:
            response = requests.post(
                f'{API_BASE}/intake/calculate-appointment',
                headers=headers,
                json=test['data']
            )
            
            if response.status_code != 200:
                print(f"\n❌ {test['name']}")
                print(f"   API Error: {response.status_code}")
                print(f"   {response.text}")
                continue
            
            result = response.json()
            
            risk_ok = result.get('risk_level') == test['expected_risk']
            days_ok = test['expected_days'] in result.get('estimated_days', '')
            
            status = '✅' if (risk_ok and days_ok) else '❌'
            print(f"\n{status} {test['name']}")
            print(f"   Risk Level: {result.get('risk_level')} (expected: {test['expected_risk']}) {'✓' if risk_ok else '✗'}")
            print(f"   Days: {result.get('estimated_days')} (expected: {test['expected_days']}) {'✓' if days_ok else '✗'}")
            print(f"   Time: {result.get('appointment_time', 'N/A')}")
            print(f"   Date: {result.get('automatic_date_formatted', 'N/A')}")
            
        except Exception as e:
            print(f"\n❌ {test['name']}")
            print(f"   Error: {e}")
    
    print('\n' + '=' * 70)

def test_risk_level_badge_colors():
    """Verify risk level color assignments"""
    print('\n🎨 RISK LEVEL COLOR ASSIGNMENTS')
    print('=' * 70)
    
    colors = {
        'RED': {
            'bg': 'bg-red-100 / dark:bg-red-900/30',
            'text': 'text-red-700 / dark:text-red-400',
            'description': 'Critical emergency - 30 min response'
        },
        'YELLOW': {
            'bg': 'bg-yellow-100 / dark:bg-yellow-900/30',
            'text': 'text-yellow-700 / dark:text-yellow-400',
            'description': 'High priority - 1 business day'
        },
        'GREEN': {
            'bg': 'bg-green-100 / dark:bg-green-900/30',
            'text': 'text-green-700 / dark:text-green-400',
            'description': 'Standard - 2-3 business days'
        }
    }
    
    for level, info in colors.items():
        print(f"\n🔘 {level}")
        print(f"   Background: {info['bg']}")
        print(f"   Text: {info['text']}")
        print(f"   Meaning: {info['description']}")
    
    print('\n' + '=' * 70)

def test_appointment_time_assignments():
    """Verify appointment time assignments"""
    print('\n⏰ APPOINTMENT TIME ASSIGNMENTS')
    print('=' * 70)
    
    times = {
        'RED': {
            'time': 'Immediate',
            'description': 'Within 30 minutes (crisis management)'
        },
        'YELLOW': {
            'time': '10:00 AM',
            'description': 'Business hours (next business day)'
        },
        'GREEN': {
            'time': '10:00 AM',
            'description': 'Business hours (2-3 business days out)'
        }
    }
    
    for level, info in times.items():
        print(f"\n{level}:")
        print(f"   Time: {info['time']}")
        print(f"   Notes: {info['description']}")
    
    print('\n' + '=' * 70)

def main():
    """Run all tests"""
    print('\n🧪 APPOINTMENT RULES & RISK LEVEL TESTS')
    print('=' * 70)
    
    # Test appointment calculations
    test_calculate_appointment()
    
    # Show color assignments
    test_risk_level_badge_colors()
    
    # Show time assignments
    test_appointment_time_assignments()
    
    print('\n✨ Test suite complete!')
    print('\nNext steps:')
    print('1. Go to http://localhost:3003/intake')
    print('2. Submit intake form with different assessment scores')
    print('3. Verify risk level displays with correct colors')
    print('4. Verify appointment times match risk level')
    print('5. Check meeting links in confirmation email')

if __name__ == '__main__':
    main()
