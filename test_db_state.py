#!/usr/bin/env python3
from pymongo import MongoClient
import json

client = MongoClient('mongodb://localhost:27017/')
db = client['cps_system_dev']

print('=== DATABASE STATE ===')
print(f'Users: {db.users.count_documents({})}')
print(f'Cases: {db.cases.count_documents({})}')
print(f'Appointments: {db.appointments.count_documents({})}')
print(f'Intakes: {db.intakes.count_documents({})}')

print('\n=== SAMPLE APPOINTMENT ===')
apt = db.appointments.find_one()
if apt:
    print('_id:', apt.get('_id'))
    print('case_id:', apt.get('case_id'))
    print('counselor_id:', apt.get('counselor_id'))
    print('status:', apt.get('status'))
    print('appointment_type:', apt.get('appointment_type'))
else:
    print('No appointments found')

print('\n=== SAMPLE CASE ===')
case = db.cases.find_one()
if case:
    print('_id:', case.get('_id'))
    print('student_id:', case.get('student_id'))
    print('status:', case.get('status'))
else:
    print('No cases found')

print('\n=== SAMPLE USER ===')
user = db.users.find_one()
if user:
    print('_id:', user.get('_id'))
    print('email:', user.get('email'))
    print('role:', user.get('role'))
else:
    print('No users found')
