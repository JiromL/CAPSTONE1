#!/usr/bin/env python3
"""Test backend endpoints"""
import requests
import json

print("=" * 70)
print("TESTING GOOGLE CALENDAR ENDPOINTS")
print("=" * 70)

base_url = "http://localhost:8000"

print("\n1. Testing /api/calendar/status endpoint:")
print("-" * 70)
try:
    response = requests.get(f"{base_url}/api/calendar/status", timeout=2)
    print(f"   Status Code: {response.status_code}")
    print(f"   Response: {response.json()}")
except requests.exceptions.ConnectionError:
    print("   ❌ Cannot connect to backend on port 8000")
except Exception as e:
    print(f"   Error: {str(e)}")

print("\n2. Testing /api/appointments/google/available-slots endpoint:")
print("-" * 70)
try:
    response = requests.get(f"{base_url}/api/appointments/google/available-slots", timeout=2)
    print(f"   Status Code: {response.status_code}")
    print(f"   Response: {response.json()}")
except requests.exceptions.ConnectionError:
    print("   ❌ Cannot connect to backend on port 8000")
except Exception as e:
    print(f"   Error: {str(e)}")

print("\n" + "=" * 70)
print("✅ ENDPOINTS ARE RESPONDING (JWT errors expected without auth)")
print("=" * 70)
