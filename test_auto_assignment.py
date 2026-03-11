#!/usr/bin/env python3
"""Test auto-assignment feature"""
import requests
import json
from datetime import datetime, timedelta
from pymongo import MongoClient
import os
from bson import ObjectId

# Setup
BACKEND_URL = "http://localhost:8000"
conn_string = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
client = MongoClient(conn_string)
db = client['cps_system_dev']

# Get a student user
user = db.users.find_one({"role": "STUDENT"})
if not user:
    print("ERROR: No student found in database")
    exit(1)

student_id = str(user['_id'])
print(f"Testing with student: {user.get('email')} ({student_id})")

# Get or create a token
auth_response = requests.post(f"{BACKEND_URL}/auth/login", json={
    "email": user.get('email'),
    "password": "test123"
})

if auth_response.status_code != 200:
    print(f"Login failed: {auth_response.status_code}")
    print(auth_response.text)
    exit(1)

token = auth_response.json().get('access_token')
print(f"Token obtained")

headers = {"Authorization": f"Bearer {token}"}

# Get or create a case for testing
case = db.cases.find_one({"student_id": ObjectId(student_id)})
if not case:
    print("ERROR: No case found for student")
    exit(1)

case_id = str(case['_id'])
print(f"Using case: {case_id}")

# Create an appointment request with auto-assignment
now = datetime.utcnow()
requested_start = now + timedelta(hours=2)
requested_end = requested_start + timedelta(hours=1)

appointment_data = {
    "case_id": case_id,
    "appointment_type": "followup",
    "requested_start": requested_start.isoformat(),
    "requested_end": requested_end.isoformat()
}

print(f"Requesting appointment for {requested_start.isoformat()} to {requested_end.isoformat()}")
response = requests.post(
    f"{BACKEND_URL}/api/appointments/request",
    json=appointment_data,
    headers=headers
)

print(f"Response status: {response.status_code}")
result = response.json()
print(json.dumps(result, indent=2))

if response.status_code == 201:
    print(f"\n✓ Appointment created")
    print(f"  - ID: {result.get('appointment_id')}")
    print(f"  - Status: {result.get('status')}")
    print(f"  - Auto-assigned: {result.get('auto_assigned')}")
    if result.get('auto_assigned'):
        print(f"  - Counselor ID: {result.get('counselor_id')}")
        counselor = db.users.find_one({"_id": ObjectId(result.get('counselor_id'))})
        if counselor:
            print(f"  - Counselor Name: {counselor.get('first_name')} {counselor.get('last_name')}")
    print(f"  - Message: {result.get('auto_assignment_message')}")
else:
    print(f"ERROR: Failed to create appointment")
