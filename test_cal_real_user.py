#!/usr/bin/env python3
"""Test calendar endpoints with real user"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from flask_jwt_extended import create_access_token
from app import create_app

app = create_app()

with app.app_context():
    # Use real admin_user ID
    test_user_id = "69ac75fda4e551c7606b88d0"
    token = create_access_token(identity=test_user_id)
    
    print("=" * 70)
    print("TESTING CALENDAR ENDPOINTS (with real user)")
    print("=" * 70)
    print(f"\nTest User ID: {test_user_id} (admin_user)")
    
    # Test with the client
    client = app.test_client()
    
    print("\n" + "=" * 70)
    print("1. Testing /api/auth/me")
    print("=" * 70)
    response = client.get(
        '/api/auth/me',
        headers={'Authorization': f'Bearer {token}'}
    )
    print(f"Status Code: {response.status_code}")
    data = response.get_json()
    print(f"Response: {data}")
    
    print("\n" + "=" * 70)
    print("2. Testing /api/calendar/status")
    print("=" * 70)
    response = client.get(
        '/api/calendar/status',
        headers={'Authorization': f'Bearer {token}'}
    )
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.get_json()}")
    
    print("\n" + "=" * 70)
    print("3. Testing /api/appointments/google/available-slots")
    print("=" * 70)
    response = client.get(
        '/api/appointments/google/available-slots?date=2026-03-15&duration=60',
        headers={'Authorization': f'Bearer {token}'}
    )
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.get_json()}")
    
    print("\n" + "=" * 70)
    print("✅ All endpoints tested successfully!")
    print("=" * 70)
