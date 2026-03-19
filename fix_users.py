#!/usr/bin/env python3
"""Fix test users with proper password hashes and required fields"""
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash

client = MongoClient('mongodb://localhost:27017')
db = client['cps_system_dev']

# Update all test users with proper password hashing and required fields
test_users = [
    {'email': 'student@test.com', 'first_name': 'Test', 'last_name': 'Student'},
    {'email': 'counselor@test.com', 'first_name': 'Maria', 'last_name': 'Counselor'},
    {'email': 'psychologist@test.com', 'first_name': 'Jose', 'last_name': 'Psychologist'},
    {'email': 'ic@test.com', 'first_name': 'IC', 'last_name': 'Coordinator'},
    {'email': 'dpo@test.com', 'first_name': 'DPO', 'last_name': 'Officer'},
    {'email': 'csc@test.com', 'first_name': 'CSC', 'last_name': 'Writer'},
    {'email': 'csp@test.com', 'first_name': 'CSP', 'last_name': 'Support'},
    {'email': 'staff@test.com', 'first_name': 'Staff', 'last_name': 'Member'},
    {'email': 'admin@test.com', 'first_name': 'Admin', 'last_name': 'User'},
]

password_hash = generate_password_hash('password123')

for user_data in test_users:
    db.users.update_one(
        {'email': user_data['email']},
        {'$set': {
            'password_hash': password_hash,
            'first_name': user_data['first_name'],
            'last_name': user_data['last_name'],
            'is_verified': True,
            'is_active': True
        },
        '$unset': {'password': ''}
        }
    )

print("✓ Updated all users with correct fields")

# Test login
print("\nTesting login with student@test.com...")

user = db.users.find_one({'email': 'student@test.com'})
if user and check_password_hash(user['password_hash'], 'password123'):
    print("✓ Password check successful!")
    print(f"  - Has first_name: {user.get('first_name')}")
    print(f"  - Has last_name: {user.get('last_name')}")
    print(f"  - is_verified: {user.get('is_verified')}")
    print(f"  - is_active: {user.get('is_active')}")
else:
    print("✗ Password check failed")
