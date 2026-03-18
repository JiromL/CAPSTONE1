#!/usr/bin/env python3
from pymongo import MongoClient
from werkzeug.security import generate_password_hash

client = MongoClient('mongodb://localhost:27017')
db = client['cps_system_dev']

# Update all users with correct password hashes
users_to_update = [
    {'username': 'admin_user', 'email': 'admin@example.com', 'password': 'admin123'},
    {'username': 'counselor', 'email': 'counselor@example.com', 'password': 'counsel123'},
    {'username': 'student_user', 'email': 'student@example.com', 'password': 'student123'},
]

for user_data in users_to_update:
    password_hash = generate_password_hash(user_data['password'])
    result = db.users.update_one(
        {'username': user_data['username']},
        {'$set': {'password_hash': password_hash}}
    )
    if result.matched_count > 0:
        print(f"✓ Updated {user_data['username']} with email {user_data['email']}")
    else:
        print(f"✗ User {user_data['username']} not found")

print("\nTest login with these credentials:")
for user_data in users_to_update:
    print(f"  Email: {user_data['email']}, Password: {user_data['password']}")
