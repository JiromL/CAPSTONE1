#!/usr/bin/env python3
"""Seed the users collection with admin and various role test accounts."""
import os
from datetime import datetime
from pymongo import MongoClient
from werkzeug.security import generate_password_hash
from bson.objectid import ObjectId


def get_db():
    uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
    db_name = os.getenv('MONGODB_DB_NAME', os.getenv('MONGODB_DB', 'cps_system_dev'))
    client = MongoClient(uri)
    return client[db_name]


def seed():
    db = get_db()
    users = db.users
    
    # Clear existing users (optional; comment out to keep)
    users.delete_many({})
    
    test_users = [
        {
            'email': 'admin@university.edu',
            'password_hash': generate_password_hash('admin123'),
            'first_name': 'Admin',
            'last_name': 'User',
            'role': 'ADMIN',
            'phone': '555-0001',
            'department': 'IT',
            'specializations': [],
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        },
        {
            'email': 'dpo@university.edu',
            'password_hash': generate_password_hash('dpo123'),
            'first_name': 'Dr. Sarah',
            'last_name': 'Director',
            'role': 'DPO',  # Director of Psychological Operations
            'phone': '555-0002',
            'department': 'Counseling',
            'specializations': ['Clinical Psychology', 'Crisis Management'],
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        },
        {
            'email': 'psychologist@university.edu',
            'password_hash': generate_password_hash('psych123'),
            'first_name': 'Dr. James',
            'last_name': 'Therapist',
            'role': 'PSYCHOLOGIST',
            'phone': '555-0003',
            'department': 'Counseling',
            'specializations': ['Depression', 'Anxiety', 'Trauma'],
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        },
        {
            'email': 'counselor1@university.edu',
            'password_hash': generate_password_hash('counsel123'),
            'first_name': 'Maria',
            'last_name': 'Garcia',
            'role': 'PSYCHOLOGIST',  # Licensed counselor
            'phone': '555-0004',
            'department': 'Counseling',
            'specializations': ['Anxiety', 'Eating Disorders'],
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        },
        {
            'email': 'counselor2@university.edu',
            'password_hash': generate_password_hash('counsel456'),
            'first_name': 'Michael',
            'last_name': 'Chen',
            'role': 'PSYCHOLOGIST',  # Licensed counselor
            'phone': '555-0005',
            'department': 'Counseling',
            'specializations': ['ADHD', 'Academic Stress'],
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        },
        {
            'email': 'casemanager@university.edu',
            'password_hash': generate_password_hash('case123'),
            'first_name': 'Lisa',
            'last_name': 'Manager',
            'role': 'CASE_MANAGER',
            'phone': '555-0006',
            'department': 'Counseling',
            'specializations': ['Care Coordination'],
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        },
        {
            'email': 'ic@university.edu',
            'password_hash': generate_password_hash('ic123'),
            'first_name': 'Alex',
            'last_name': 'Intake',
            'role': 'IC',  # Intake Counselor
            'phone': '555-0007',
            'department': 'Counseling',
            'specializations': ['Triage', 'Risk Assessment'],
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        },
        {
            'email': 'csp@university.edu',
            'password_hash': generate_password_hash('csp123'),
            'first_name': 'Jordan',
            'last_name': 'Support',
            'role': 'CSP',  # Counseling Support Person
            'phone': '555-0008',
            'department': 'Counseling',
            'specializations': [],
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        },
        {
            'email': 'student1@university.edu',
            'password_hash': generate_password_hash('student123'),
            'first_name': 'Emma',
            'last_name': 'Johnson',
            'role': 'STUDENT',
            'phone': '555-0101',
            'department': 'Engineering',
            'specializations': [],
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        },
        {
            'email': 'student2@university.edu',
            'password_hash': generate_password_hash('student456'),
            'first_name': 'Liam',
            'last_name': 'Smith',
            'role': 'STUDENT',
            'phone': '555-0102',
            'department': 'Business',
            'specializations': [],
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        },
        {
            'email': 'student3@university.edu',
            'password_hash': generate_password_hash('student789'),
            'first_name': 'Priya',
            'last_name': 'Desai',
            'role': 'STUDENT',
            'phone': '555-0103',
            'department': 'Biology',
            'specializations': [],
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        },
    ]
    
    result = users.insert_many(test_users)
    print(f"\n✅ Inserted {len(result.inserted_ids)} users:\n")
    
    for i, (user, uid) in enumerate(zip(test_users, result.inserted_ids)):
        print(f"  {i+1}. {user['first_name']} {user['last_name']} ({user['role']})")
        print(f"     Email: {user['email']}")
        print(f"     Password: {user['email'].split('@')[0]}123 (see code for full pwd)")
        print()


if __name__ == '__main__':
    seed()
    print("\n💡 Login credentials:")
    print("   admin@university.edu / admin123")
    print("   psychologist@university.edu / psych123")
    print("   ic@university.edu / ic123")
    print("   student1@university.edu / student123")
    print()
