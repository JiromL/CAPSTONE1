#!/usr/bin/env python3
"""
Comprehensive MongoDB seed script for CPS Counseling System
Creates all necessary collections and sample data for testing
"""

from pymongo import MongoClient
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta
from bson import ObjectId
import os

# Configuration
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
MONGODB_DB_NAME = os.getenv('MONGODB_DB_NAME', 'cps_system_dev')

client = MongoClient(MONGODB_URI)
db = client[MONGODB_DB_NAME]

print(f"🔌 Connecting to MongoDB at {MONGODB_URI}")
print(f"📦 Database: {MONGODB_DB_NAME}\n")

# Test connection
try:
    client.admin.command('ping')
    print("✓ MongoDB connection successful\n")
except Exception as e:
    print(f"✗ MongoDB connection failed: {e}")
    exit(1)

# Clear existing collections for fresh seed
collections_to_clear = ['users', 'appointments', 'cases', 'intakes', 'assessments', 'resources', 'check_ins', 'counselor_availability']
for col_name in collections_to_clear:
    if col_name in db.list_collection_names():
        db[col_name].delete_many({})
        print(f"🗑️  Cleared collection: {col_name}")

print("\n" + "="*60)
print("SEEDING USERS")
print("="*60 + "\n")

# Users collection
now = datetime.utcnow()
test_users = [
    # Admin
    {'email': 'admin@dlsu.edu.ph', 'password': 'admin123', 'first_name': 'Admin', 'last_name': 'User', 'role': 'ADMIN'},
    
    # DPO
    {'email': 'dpo@dlsu.edu.ph', 'password': 'dpo123', 'first_name': 'Dr. Maria', 'last_name': 'Garcia', 'role': 'DPO'},
    
    # Psychologists
    {'email': 'psychologist1@dlsu.edu.ph', 'password': 'psych123', 'first_name': 'Dr. John', 'last_name': 'Brown', 'role': 'PSYCHOLOGIST'},
    {'email': 'psychologist2@dlsu.edu.ph', 'password': 'psych456', 'first_name': 'Dr. Sarah', 'last_name': 'Wilson', 'role': 'PSYCHOLOGIST'},
    
    # Counselors  
    {'email': 'counselor1@dlsu.edu.ph', 'password': 'counsel123', 'first_name': 'Jane', 'last_name': 'Doe', 'role': 'COUNSELOR'},
    {'email': 'counselor2@dlsu.edu.ph', 'password': 'counsel456', 'first_name': 'Robert', 'last_name': 'Johnson', 'role': 'COUNSELOR'},
    
    # CSC/CSP
    {'email': 'csc@dlsu.edu.ph', 'password': 'csc123', 'first_name': 'Amanda', 'last_name': 'Lee', 'role': 'CSC'},
    {'email': 'csp@dlsu.edu.ph', 'password': 'csp123', 'first_name': 'Dr. Michael', 'last_name': 'Chen', 'role': 'CSP'},
    
    # IC (Intake Counselor)
    {'email': 'ic@dlsu.edu.ph', 'password': 'ic123', 'first_name': 'Lisa', 'last_name': 'Martinez', 'role': 'IC'},
    
    # Staff
    {'email': 'staff@dlsu.edu.ph', 'password': 'staff123', 'first_name': 'Carlos', 'last_name': 'Santos', 'role': 'STAFF'},
    
    # Students
    {'email': 'student1@dlsu.edu.ph', 'password': 'student123', 'first_name': 'Emma', 'last_name': 'Johnson', 'role': 'STUDENT'},
    {'email': 'student2@dlsu.edu.ph', 'password': 'student456', 'first_name': 'Mark', 'last_name': 'Smith', 'role': 'STUDENT'},
    {'email': 'student3@dlsu.edu.ph', 'password': 'student789', 'first_name': 'Jessica', 'last_name': 'Davis', 'role': 'STUDENT'},
]

user_ids = {}
for user_data in test_users:
    doc = {
        'email': user_data['email'],
        'password_hash': generate_password_hash(user_data['password']),
        'first_name': user_data['first_name'],
        'last_name': user_data['last_name'],
        'role': user_data['role'],
        'is_active': True,
        'is_verified': True,
        'created_at': now,
        'updated_at': now,
    }
    
    result = db.users.insert_one(doc)
    user_ids[user_data['email']] = result.inserted_id
    print(f"✓ {user_data['email']:30} ({user_data['role']:12})")

print(f"\n✅ Created {len(test_users)} users\n")

# Store IDs for later use
admin_id = user_ids['admin@dlsu.edu.ph']
counselor1_id = user_ids['counselor1@dlsu.edu.ph']
psychologist1_id = user_ids['psychologist1@dlsu.edu.ph']
student1_id = user_ids['student1@dlsu.edu.ph']
student2_id = user_ids['student2@dlsu.edu.ph']
student3_id = user_ids['student3@dlsu.edu.ph']
ic_id = user_ids['ic@dlsu.edu.ph']

print("="*60)
print("SEEDING CASES")
print("="*60 + "\n")

# Create cases first (since intakes ref case_id)
cases = [
    {
        'student_id': student1_id,
        'assigned_counselor_id': counselor1_id,
        'assigned_psychologist_id': psychologist1_id,
        'case_status': 'ACTIVE',
        'case_number': 'CPS-2024-001',
        'opening_date': now - timedelta(days=30),
        'chief_complaint': 'Academic stress and time management',
        'risk_level': 'GREEN',
        'treatment_plan': 'Provide stress management techniques and academic support referrals',
        'progress_notes': [],
        'created_at': now - timedelta(days=30),
        'updated_at': now,
    },
    {
        'student_id': student2_id,
        'assigned_counselor_id': counselor1_id,
        'assigned_psychologist_id': psychologist1_id,
        'case_status': 'ACTIVE',
        'case_number': 'CPS-2024-002',
        'opening_date': now - timedelta(days=15),
        'chief_complaint': 'Relationship issues and social anxiety',
        'risk_level': 'YELLOW',
        'treatment_plan': 'Cognitive behavioral therapy for anxiety, social skills training',
        'progress_notes': [],
        'created_at': now - timedelta(days=15),
        'updated_at': now,
    },
]

case_ids = {}
for i, case_data in enumerate(cases):
    result = db.cases.insert_one(case_data)
    case_ids[i] = result.inserted_id
    print(f"✓ Case: {case_data['case_number']} - {case_data['case_status']}")

print(f"\n✅ Created {len(cases)} cases\n")

print("="*60)
print("SEEDING INTAKES")
print("="*60 + "\n")

# Intakes collection (now with case_id from cases created above)
intakes = [
    {
        'student_id': student1_id,
        'ic_id': ic_id,
        'case_id': case_ids[0],
        'status': 'COMPLETED',
        'chief_complaint': 'Academic stress and time management',
        'background': 'First year student, struggling with workload',
        'risk_level': 'GREEN',
        'mental_health_history': 'No prior history',
        'substance_abuse_history': 'Denies',
        'suicidal_ideation': False,
        'created_at': now - timedelta(days=30),
        'updated_at': now,
    },
    {
        'student_id': student2_id,
        'ic_id': ic_id,
        'case_id': case_ids[1],
        'status': 'IN_PROGRESS',
        'chief_complaint': 'Relationship issues and social anxiety',
        'background': 'Sophomore, reports difficulty maintaining relationships',
        'risk_level': 'YELLOW',
        'mental_health_history': 'Mild anxiety reported',
        'substance_abuse_history': 'Social drinking only',
        'suicidal_ideation': False,
        'created_at': now - timedelta(days=15),
        'updated_at': now,
    },
    {
        'student_id': student3_id,
        'ic_id': ic_id,
        'status': 'PENDING',
        'chief_complaint': 'Family conflict',
        'background': 'Junior, recently moved away from family',
        'risk_level': 'GREEN',
        'mental_health_history': 'No prior history',
        'substance_abuse_history': 'Denies',
        'suicidal_ideation': False,
        'created_at': now - timedelta(days=5),
        'updated_at': now,
    },
]

for intake_data in intakes:
    db.intakes.insert_one(intake_data)
    print(f"✓ Intake: {intake_data['chief_complaint'][:40]}... - {intake_data['status']}")

print(f"\n✅ Created {len(intakes)} intakes\n")

print("="*60)
print("SEEDING APPOINTMENTS")
print("="*60 + "\n")

# Appointments collection (now with case_id)
base_date = now.replace(hour=9, minute=0, second=0, microsecond=0)
appointments = [
    {
        'student_id': student1_id,
        'counselor_id': counselor1_id,
        'case_id': case_ids[0],
        'datetime': base_date + timedelta(days=7),
        'duration_minutes': 50,
        'status': 'CONFIRMED',
        'appointment_type': 'Initial Consultation',
        'notes': 'First appointment - intake completed',
        'location': 'Counseling Center Room 101',
        'created_at': now - timedelta(days=7),
        'updated_at': now,
    },
    {
        'student_id': student2_id,
        'counselor_id': counselor1_id,
        'case_id': case_ids[1],
        'datetime': base_date + timedelta(days=3),
        'duration_minutes': 50,
        'status': 'APPROVED',
        'appointment_type': 'Follow-up',
        'notes': 'Discussion on anxiety management techniques',
        'location': 'Counseling Center Room 102',
        'created_at': now - timedelta(days=3),
        'updated_at': now,
    },
    {
        'student_id': student3_id,
        'counselor_id': counselor1_id,
        'datetime': base_date + timedelta(days=1),
        'duration_minutes': 50,
        'status': 'PENDING_APPROVAL',
        'appointment_type': 'Initial Consultation',
        'notes': 'Awaiting counselor approval',
        'location': 'Counseling Center Room 101',
        'created_at': now - timedelta(hours=12),
        'updated_at': now,
    },
    {
        'student_id': student1_id,
        'counselor_id': counselor1_id,
        'case_id': case_ids[0],
        'datetime': base_date - timedelta(days=7),
        'duration_minutes': 50,
        'status': 'COMPLETED',
        'appointment_type': 'Follow-up',
        'notes': 'Discussed progress and next steps',
        'location': 'Counseling Center Room 101',
        'created_at': now - timedelta(days=14),
        'updated_at': now - timedelta(days=7),
    },
]

for appt_data in appointments:
    db.appointments.insert_one(appt_data)
    print(f"✓ Appointment: {appt_data['appointment_type']} - {appt_data['status']}")

print(f"\n✅ Created {len(appointments)} appointments\n")

print("="*60)
print("SEEDING CHECK-INS")
print("="*60 + "\n")

# Check-ins collection
check_ins = [
    {
        'student_id': student1_id,
        'counselor_id': counselor1_id,
        'check_in_date': now - timedelta(days=2),
        'mood': 'Improved',
        'notes': 'Student reported feeling better after implementing stress management techniques',
        'status': 'COMPLETED',
        'created_at': now - timedelta(days=2),
    },
    {
        'student_id': student2_id,
        'counselor_id': counselor1_id,
        'check_in_date': now - timedelta(days=1),
        'mood': 'Stable',
        'notes': 'Continuing therapy sessions, showing progress with anxiety management',
        'status': 'COMPLETED',
        'created_at': now - timedelta(days=1),
    },
]

for check_in_data in check_ins:
    db.check_ins.insert_one(check_in_data)
    print(f"✓ Check-in: {check_in_data['mood']} - {check_in_data['status']}")

print(f"\n✅ Created {len(check_ins)} check-ins\n")

print("="*60)
print("SEEDING RESOURCES")
print("="*60 + "\n")

# Resources collection
resources = [
    {
        'title': 'Stress Management Guide',
        'description': 'Comprehensive guide on managing academic and personal stress',
        'resource_type': 'PDF',
        'url': 'https://example.com/stress-guide.pdf',
        'category': 'Mental Wellness',
        'created_at': now - timedelta(days=60),
    },
    {
        'title': 'Cognitive Behavioral Therapy Basics',
        'description': 'Introduction to CBT techniques for anxiety and depression',
        'resource_type': 'Video',
        'url': 'https://example.com/cbt-video.mp4',
        'category': 'Therapy Techniques',
        'created_at': now - timedelta(days=45),
    },
    {
        'title': 'Sleep Hygiene Tips',
        'description': 'Best practices for improving sleep quality',
        'resource_type': 'Article',
        'url': 'https://example.com/sleep-tips.html',
        'category': 'Physical Wellness',
        'created_at': now - timedelta(days=30),
    },
    {
        'title': 'Crisis Support Resources',
        'description': 'Emergency contact numbers and crisis resources',
        'resource_type': 'Reference',
        'url': 'https://example.com/crisis-resources.html',
        'category': 'Crisis Support',
        'created_at': now - timedelta(days=15),
    },
]

for resource_data in resources:
    db.resources.insert_one(resource_data)
    print(f"✓ Resource: {resource_data['title']} ({resource_data['category']})")

print(f"\n✅ Created {len(resources)} resources\n")

print("="*60)
print("VERIFICATION")
print("="*60 + "\n")

# Verify all collections
collections = db.list_collection_names()
print(f"✓ Total collections: {len(collections)}")

for col_name in ['users', 'intakes', 'appointments', 'cases', 'check_ins', 'resources']:
    count = db[col_name].count_documents({})
    print(f"  • {col_name}: {count} documents")

print("\n" + "="*60)
print("✅ DATABASE SEEDING COMPLETE")
print("="*60)
print("\n📋 TEST LOGIN CREDENTIALS:")
print("-" * 60)
for user in test_users[:8]:  # Show first 8 users
    print(f"  Email: {user['email']}")
    print(f"  Password: {user['password']}")
    print(f"  Role: {user['role']}\n")

print("\n✨ Your system is ready with seed data!")
