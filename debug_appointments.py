#!/usr/bin/env python3

import sys
sys.path.insert(0, '/Users/jeromelouiesantos/CAPSTONE1/backend')

from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime

# Connect to MongoDB
client = MongoClient('localhost', 27017)
db = client['mental_health_counseling']

# Get the most recent appointments
print("=== Most Recent Appointments ===")
appointments = list(db.appointments.find().sort('created_at', -1).limit(3))
for apt in appointments:
    print(f"\nAppointment ID: {apt['_id']}")
    print(f"  student_id: {apt.get('student_id')}")
    print(f"  counselor_id: {apt.get('counselor_id')}")
    print(f"  case_id: {apt.get('case_id')}")
    print(f"  status: {apt.get('status')}")
    print(f"  created_at: {apt.get('created_at')}")
    
    # Check the case
    if apt.get('case_id'):
        case = db.cases.find_one({'_id': apt['case_id']})
        if case:
            print(f"  Case student_id: {case.get('student_id')}")
            student = db.users.find_one({'_id': case.get('student_id')})
            if student:
                print(f"  Student: {student.get('email')} ({student.get('first_name')} {student.get('last_name')})")

print("\n=== Recent Users (Students) ===")
users = list(db.users.find({'role': 'STUDENT'}).sort('created_at', -1).limit(3))
for user in users:
    print(f"\nUser ID: {user['_id']}")
    print(f"  Email: {user.get('email')}")
    print(f"  Name: {user.get('first_name')} {user.get('last_name')}")
    
    # Find their cases and appointments
    cases = list(db.cases.find({'student_id': user['_id']}))
    for case in cases:
        print(f"  Case ID: {case['_id']}")
        apts = list(db.appointments.find({'case_id': case['_id']}))
        print(f"    Appointments: {len(apts)}")
