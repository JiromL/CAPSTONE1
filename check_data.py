#!/usr/bin/env python3
from pymongo import MongoClient
from bson import ObjectId

client = MongoClient('mongodb://localhost:27017/')
db = client['cps_system_dev']

# Get first case with student_id
case = db.cases.find_one()
if case:
    print(f"Sample case:")
    print(f"  _id: {case['_id']}")
    print(f"  student_id: {case.get('student_id')}")
    print(f"  status: {case.get('status')}")
    
    # Get the student
    student_id = case.get('student_id')
    if student_id:
        student = db.users.find_one({"_id": ObjectId(student_id)})
        if student:
            print(f"\n  Student: {student.get('email')} ({student.get('role')})")
    
    # Get appointments for this case
    apts = list(db.appointments.find({"case_id": case['_id']}))
    print(f"\n  Appointments for this case: {len(apts)}")
    if apts:
        apt = apts[0]
        print(f"    First apt ID: {apt['_id']}")
        print(f"    Type: {apt.get('appointment_type')}")
        print(f"    Status: {apt.get('status')}")
