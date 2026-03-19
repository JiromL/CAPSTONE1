#!/usr/bin/env python3
from pymongo import MongoClient
from werkzeug.security import generate_password_hash
from datetime import datetime
import os

uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
db_name = os.getenv('MONGODB_DB_NAME', os.getenv('MONGODB_DB', 'cps_system_dev'))
client = MongoClient(uri)
db = client[db_name]
users = db.users

# DLSU domain test users
test_users = [
    {'email': 'admin@dlsu.edu.ph', 'password': 'admin123', 'first_name': 'Admin', 'last_name': 'User', 'role': 'ADMIN'},
    {'email': 'student1@dlsu.edu.ph', 'password': 'student123', 'first_name': 'Emma', 'last_name': 'Johnson', 'role': 'STUDENT'},
    {'email': 'student2@dlsu.edu.ph', 'password': 'student456', 'first_name': 'Mark', 'last_name': 'Smith', 'role': 'STUDENT'},
    {'email': 'counselor@dlsu.edu.ph', 'password': 'counsel123', 'first_name': 'Dr. Jane', 'last_name': 'Doe', 'role': 'COUNSELOR'},
    {'email': 'psychologist@dlsu.edu.ph', 'password': 'psych123', 'first_name': 'Dr. John', 'last_name': 'Brown', 'role': 'PSYCHOLOGIST'},
]

for user_data in test_users:
    doc = {
        'email': user_data['email'],
        'password_hash': generate_password_hash(user_data['password']),
        'first_name': user_data['first_name'],
        'last_name': user_data['last_name'],
        'role': user_data['role'],
        'is_active': True,
        'is_verified': True,
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow(),
    }
    
    result = users.update_one(
        {'email': user_data['email']},
        {'$set': doc},
        upsert=True
    )
    print(f"✓ {user_data['email']} - {user_data['role']}")

print(f"\n✓ Created {len(test_users)} DLSU test accounts")
