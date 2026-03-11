#!/usr/bin/env python3
from pymongo import MongoClient

# Connect to MongoDB
client = MongoClient('localhost', 27017)
db = client['counseling_db']

# Get all users
users = list(db.users.find({}, {'_id': 1, 'email': 1, 'role': 1}).limit(10))
print(f"Found {len(users)} users:")
for user in users:
    print(f"  - {user.get('email')} (role: {user.get('role')})")

# Get the first student
student = db.users.find_one({'role': 'STUDENT'})
if student:
    print(f"\n✓ Using student: {student['email']}")
    
    # Get their case
    case = db.cases.find_one({'student_id': student['_id']})
    if case:
        print(f"✓ Case ID: {case['_id']}")
        
        # Get appointments for this case
        appointments = list(db.appointments.find({'case_id': case['_id']}))
        print(f"✓ Found {len(appointments)} appointments for this case")
        
        if appointments:
            for apt in appointments:
                print(f"  - Appointment {apt['_id']}: status={apt.get('status')}")
    else:
        print("✗ No case found for this student")
else:
    print("✗ No students found in database!")
    
    # Check if there are any cases
    cases = list(db.cases.find({}).limit(5))
    print(f"\nFound {len(cases)} cases in database")
    if cases:
        print(f"First case: student_id={cases[0].get('student_id')}, _id={cases[0]['_id']}")
