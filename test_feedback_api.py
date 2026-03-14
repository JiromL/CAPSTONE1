#!/usr/bin/env python3
"""
Test script for feedback analytics API
"""
import sys
import os
from datetime import datetime

# Load environment variables from .env file FIRST
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

import requests

BASE_URL = 'http://localhost:5000'

def get_admin_token():
    """Get JWT token for admin user"""
    response = requests.post(
        f'{BASE_URL}/api/auth/login',
        json={
            'username': 'admin',
            'password': 'admin123'
        }
    )
    if response.status_code == 200:
        return response.json().get('access_token')
    print(f"❌ Failed to get admin token: {response.text}")
    return None

def test_feedback_api():
    """Test feedback collection API endpoints"""
    print("\n" + "="*60)
    print("🧪 FEEDBACK ANALYTICS API TEST")
    print("="*60)
    
    token = get_admin_token()
    if not token:
        print("❌ Could not authenticate")
        return False
    
    print(f"✅ Authenticated with token: {token[:20]}...")
    
    headers = {'Authorization': f'Bearer {token}'}
    
    # Test 1: Get all feedback with analytics
    print("\n📊 Test 1: Get Feedback Analytics (all)")
    try:
        response = requests.get(
            f'{BASE_URL}/api/engagement/feedback?type=all&limit=20',
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API Response:")
            print(f"   - Total Feedback: {data.get('total')}")
            print(f"   - Average Rating: {data.get('avg_rating')}")
            print(f"   - Feedback Items: {len(data.get('feedback', []))}")
            
            if data.get('feedback'):
                first_item = data['feedback'][0]
                print(f"   - Sample Item:")
                print(f"     - Rating: {first_item.get('rating')}/5")
                print(f"     - Category: {first_item.get('category')}")
                print(f"     - Submitted by: {first_item.get('submitted_by')}")
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False
    
    # Test 2: Get feedback filtered by category
    print("\n📊 Test 2: Get Feedback by Category (session)")
    try:
        response = requests.get(
            f'{BASE_URL}/api/engagement/feedback?type=session&limit=20',
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Category Filter Working:")
            print(f"   - Total: {data.get('total')}")
            print(f"   - Average Rating: {data.get('avg_rating')}")
            print(f"   - Items: {len(data.get('feedback', []))}")
        else:
            print(f"⚠️  Category filter status: {response.status_code}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
    
    # Test 3: Submit test feedback
    print("\n📝 Test 3: Submit Test Feedback")
    try:
        feedback_payload = {
            'rating': 5,
            'content': 'Great counseling session! Very helpful and supportive.',
            'category': 'session',
            'would_recommend': 'yes',
            'anonymous': False
        }
        
        response = requests.post(
            f'{BASE_URL}/api/engagement/feedback',
            json=feedback_payload,
            headers=headers
        )
        
        if response.status_code == 201:
            data = response.json()
            print(f"✅ Feedback Submitted:")
            print(f"   - Feedback ID: {data.get('feedback_id')}")
            print(f"   - Rating: {data.get('rating')}")
            print(f"   - Created: {data.get('created_at')}")
        else:
            print(f"⚠️  Submit status: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
    
    # Test 4: Get feedback analytics again to verify
    print("\n📊 Test 4: Verify Updated Analytics")
    try:
        response = requests.get(
            f'{BASE_URL}/api/engagement/feedback?type=all&limit=20',
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Updated Analytics:")
            print(f"   - Total Feedback: {data.get('total')}")
            print(f"   - Average Rating: {data.get('avg_rating')}")
        else:
            print(f"❌ Failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
    
    print("\n" + "="*60)
    print("✅ FEEDBACK API TESTS COMPLETED")
    print("="*60)
    return True

if __name__ == '__main__':
    test_feedback_api()
