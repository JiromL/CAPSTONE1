#!/usr/bin/env python3
"""Seed test users for all 9 roles"""
from pymongo import MongoClient
from datetime import datetime

client = MongoClient('mongodb://localhost:27017')
db = client['cps_system_dev']

# Clear existing non-student users
db.users.delete_many({'role': {'$ne': 'STUDENT'}})

test_users = [
    {'email': 'student@test.com', 'username': 'student', 'password': 'password123', 'role': 'STUDENT', 'name': 'Test Student', 'id_number': 'STU001'},
    {'email': 'counselor@test.com', 'username': 'counselor', 'password': 'password123', 'role': 'COUNSELOR', 'name': 'Dr. Maria Counselor', 'employee_id': 'COUN001'},
    {'email': 'psychologist@test.com', 'username': 'psychologist', 'password': 'password123', 'role': 'PSYCHOLOGIST', 'name': 'Dr. Jose Psychologist', 'employee_id': 'PSY001'},
    {'email': 'ic@test.com', 'username': 'ic', 'password': 'password123', 'role': 'IC', 'name': 'IC Coordinator', 'employee_id': 'IC001'},
    {'email': 'dpo@test.com', 'username': 'dpo', 'password': 'password123', 'role': 'DPO', 'name': 'DPO Officer', 'employee_id': 'DPO001'},
    {'email': 'csc@test.com', 'username': 'csc', 'password': 'password123', 'role': 'CSC', 'name': 'CSC Writer', 'employee_id': 'CSC001'},
    {'email': 'csp@test.com', 'username': 'csp', 'password': 'password123', 'role': 'CSP', 'name': 'CSP Support', 'employee_id': 'CSP001'},
    {'email': 'staff@test.com', 'username': 'staff', 'password': 'password123', 'role': 'STAFF', 'name': 'Staff Member', 'employee_id': 'STAFF001'},
    {'email': 'admin@test.com', 'username': 'admin', 'password': 'password123', 'role': 'ADMIN', 'name': 'Administrator', 'employee_id': 'ADMIN001'},
]

inserted = []
for user_data in test_users:
    existing = db.users.find_one({'email': user_data['email']})
    if not existing:
        user_data['created_at'] = datetime.utcnow()
        db.users.insert_one(user_data)
        inserted.append(user_data['email'])

print(f"Created {len(inserted)} new users:")
for email in inserted:
    print(f"  ✓ {email}")

# List all users
print(f"\nAll Users in Database ({db.users.count_documents({})} total):")
print(f"{'Email':<35} | {'Username':<15} | {'Role':<15}")
print("-" * 67)
for user in db.users.find({}).sort('role', 1):
    print(f"{user.get('email', 'N/A'):<35} | {user.get('username', 'N/A'):<15} | {user.get('role', 'N/A'):<15}")

print("\n✓ All test users seeded successfully!")
print("\nCredentials (all have password 'password123'):")
for user in test_users:
    print(f"  {user['email']:<35} | {user['role']:<15}")
