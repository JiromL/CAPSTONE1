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
        # ADMIN & MANAGEMENT
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
            'role': 'DPO',
            'phone': '555-0002',
            'department': 'Counseling',
            'specializations': ['Clinical Psychology', 'Crisis Management'],
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        },
        # INTAKE COUNSELORS (IC) - Triage/Intake
        {
            'email': 'julse@university.edu',
            'password_hash': generate_password_hash('julse123'),
            'first_name': 'Julse',
            'last_name': 'Onsite',
            'role': 'IC',
            'phone': '555-0010',
            'department': 'Counseling',
            'specializations': ['Triage', 'Initial Assessment'],
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        },
        {
            'email': 'archie@university.edu',
            'password_hash': generate_password_hash('archie123'),
            'first_name': 'Archie',
            'last_name': 'Intake',
            'role': 'IC',
            'phone': '555-0011',
            'department': 'Counseling',
            'specializations': ['Triage', 'Risk Assessment'],
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        },
        {
            'email': 'mars@university.edu',
            'password_hash': generate_password_hash('mars123'),
            'first_name': 'Mars',
            'last_name': 'Online',
            'role': 'IC',
            'phone': '555-0012',
            'department': 'Counseling',
            'specializations': ['Online Triage', 'Virtual Assessment'],
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        },
        {
            'email': 'ria@university.edu',
            'password_hash': generate_password_hash('ria123'),
            'first_name': 'Ria',
            'last_name': 'Counselor',
            'role': 'IC',
            'phone': '555-0013',
            'department': 'Counseling',
            'specializations': ['Intake Interview', 'Documentation'],
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        },
        {
            'email': 'cris@university.edu',
            'password_hash': generate_password_hash('cris123'),
            'first_name': 'Cris',
            'last_name': 'Intake',
            'role': 'IC',
            'phone': '555-0014',
            'department': 'Counseling',
            'specializations': ['Triage', 'Client Screening'],
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        },
        {
            'email': 'wil@university.edu',
            'password_hash': generate_password_hash('wil123'),
            'first_name': 'Wil',
            'last_name': 'Midshift',
            'role': 'IC',
            'phone': '555-0015',
            'department': 'Counseling',
            'specializations': ['Evening Intake', 'Midshift Coverage'],
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        },
        {
            'email': 'rose.c@university.edu',
            'password_hash': generate_password_hash('rosec123'),
            'first_name': 'Rose',
            'last_name': 'C',
            'role': 'IC',
            'phone': '555-0016',
            'department': 'Counseling',
            'specializations': ['Morning Intake', 'Client Orientation'],
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        },
        {
            'email': 'gracie@university.edu',
            'password_hash': generate_password_hash('gracie123'),
            'first_name': 'Gracie',
            'last_name': 'Midshift',
            'role': 'IC',
            'phone': '555-0017',
            'department': 'Counseling',
            'specializations': ['Evening Triage', 'After-hours Coverage'],
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        },
        # CONTINUING SESSION PSYCHOLOGISTS (Clinical)
        {
            'email': 'daryl@university.edu',
            'password_hash': generate_password_hash('daryl123'),
            'first_name': 'Daryl',
            'last_name': 'Psychologist',
            'role': 'PSYCHOLOGIST',
            'phone': '555-0020',
            'department': 'Counseling',
            'specializations': ['Clinical Psychology', 'Psychotherapy'],
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        },
        {
            'email': 'niko@university.edu',
            'password_hash': generate_password_hash('niko123'),
            'first_name': 'Niko',
            'last_name': 'Marco',
            'role': 'PSYCHOLOGIST',
            'phone': '555-0021',
            'department': 'Counseling',
            'specializations': ['Trauma', 'Crisis Intervention'],
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        },
        {
            'email': 'bon@university.edu',
            'password_hash': generate_password_hash('bon123'),
            'first_name': 'Bon',
            'last_name': 'Homme',
            'role': 'PSYCHOLOGIST',
            'phone': '555-0022',
            'department': 'Counseling',
            'specializations': ['Long-term Therapy', 'Behavioral Health'],
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        },
        {
            'email': 'shel@university.edu',
            'password_hash': generate_password_hash('shel123'),
            'first_name': 'Shel',
            'last_name': 'Onsite',
            'role': 'PSYCHOLOGIST',
            'phone': '555-0023',
            'department': 'Counseling',
            'specializations': ['Clinical Assessment', 'Diagnosis'],
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        },
        {
            'email': 'jenny@university.edu',
            'password_hash': generate_password_hash('jenny123'),
            'first_name': 'Jenny',
            'last_name': 'Online',
            'role': 'PSYCHOLOGIST',
            'phone': '555-0024',
            'department': 'Counseling',
            'specializations': ['Virtual Therapy', 'Telepsychology'],
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        },
        {
            'email': 'chona@university.edu',
            'password_hash': generate_password_hash('chona123'),
            'first_name': 'Chona',
            'last_name': 'Psychologist',
            'role': 'PSYCHOLOGIST',
            'phone': '555-0025',
            'department': 'Counseling',
            'specializations': ['Anxiety Disorders', 'DBT'],
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        },
        # CONTINUING SESSION COUNSELORS (Non-clinical)
        {
            'email': 'rose.t@university.edu',
            'password_hash': generate_password_hash('roset123'),
            'first_name': 'Rose',
            'last_name': 'T',
            'role': 'COUNSELOR',
            'phone': '555-0030',
            'department': 'Counseling',
            'specializations': ['Academic Counseling', 'Adjustment Support'],
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        },
        {
            'email': 'bia@university.edu',
            'password_hash': generate_password_hash('bia123'),
            'first_name': 'Bia',
            'last_name': 'Counselor',
            'role': 'COUNSELOR',
            'phone': '555-0031',
            'department': 'Counseling',
            'specializations': ['Peer Support', 'Life Coaching'],
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        },
        {
            'email': 'chelly@university.edu',
            'password_hash': generate_password_hash('chelly123'),
            'first_name': 'Chelly',
            'last_name': 'Counselor',
            'role': 'COUNSELOR',
            'phone': '555-0032',
            'department': 'Counseling',
            'specializations': ['Developmental Counseling', 'Healthy Relationships'],
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        },
        {
            'email': 'daye@university.edu',
            'password_hash': generate_password_hash('daye123'),
            'first_name': 'Daye',
            'last_name': 'Counselor',
            'role': 'COUNSELOR',
            'phone': '555-0033',
            'department': 'Counseling',
            'specializations': ['Student Success', 'Motivation'],
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        },
        # CASE MANAGER
        {
            'email': 'casemanager@university.edu',
            'password_hash': generate_password_hash('casemanager123'),
            'first_name': 'Morgan',
            'last_name': 'Case',
            'role': 'CASE_MANAGER',
            'phone': '555-0045',
            'department': 'Counseling',
            'specializations': [],
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        },
        # STAFF (Office Assistant / Scheduler)
        {
            'email': 'staff@university.edu',
            'password_hash': generate_password_hash('staff123'),
            'first_name': 'Alex',
            'last_name': 'Staff',
            'role': 'STAFF',
            'phone': '555-0040',
            'department': 'Counseling',
            'specializations': [],
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        },
        # Additional Counselor
        {
            'email': 'csc@university.edu',
            'password_hash': generate_password_hash('csc123'),
            'first_name': 'Dana',
            'last_name': 'Reyes',
            'role': 'COUNSELOR',
            'phone': '555-0041',
            'department': 'Counseling',
            'specializations': ['Supervision', 'Case Management'],
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        },
        # Additional Psychologist
        {
            'email': 'csp@university.edu',
            'password_hash': generate_password_hash('csp123'),
            'first_name': 'Morgan',
            'last_name': 'Santos',
            'role': 'PSYCHOLOGIST',
            'phone': '555-0042',
            'department': 'Counseling',
            'specializations': ['Clinical Supervision', 'Psychotherapy'],
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        },
        # TEST STUDENTS
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


def seed_availability():
    """Seed counselor_availability for all IC accounts."""
    db = get_db()
    db.counselor_availability.delete_many({})
    db.counselor_weekly_schedule.delete_many({})

    # IC email → { session_method, schedule: [(dow, start, end), ...] }
    # dow: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri
    ic_schedules = [
        {
            'email': 'julse@university.edu',
            'session_method': 'in-person',
            # Morning shift F2F — Mon/Wed/Fri 8am–12pm
            'schedule': [
                {'day_of_week': 0, 'start_time': '08:00', 'end_time': '12:00'},
                {'day_of_week': 2, 'start_time': '08:00', 'end_time': '12:00'},
                {'day_of_week': 4, 'start_time': '08:00', 'end_time': '12:00'},
            ],
        },
        {
            'email': 'archie@university.edu',
            'session_method': 'in-person',
            # Afternoon shift F2F — Mon–Thu 1pm–5pm
            'schedule': [
                {'day_of_week': 0, 'start_time': '13:00', 'end_time': '17:00'},
                {'day_of_week': 1, 'start_time': '13:00', 'end_time': '17:00'},
                {'day_of_week': 2, 'start_time': '13:00', 'end_time': '17:00'},
                {'day_of_week': 3, 'start_time': '13:00', 'end_time': '17:00'},
            ],
        },
        {
            'email': 'mars@university.edu',
            'session_method': 'online',
            # Online — Tue/Thu/Fri 9am–3pm
            'schedule': [
                {'day_of_week': 1, 'start_time': '09:00', 'end_time': '15:00'},
                {'day_of_week': 3, 'start_time': '09:00', 'end_time': '15:00'},
                {'day_of_week': 4, 'start_time': '09:00', 'end_time': '15:00'},
            ],
        },
        {
            'email': 'ria@university.edu',
            'session_method': 'in-person',
            # Full-day F2F — Mon–Fri 9am–12pm
            'schedule': [
                {'day_of_week': 0, 'start_time': '09:00', 'end_time': '12:00'},
                {'day_of_week': 1, 'start_time': '09:00', 'end_time': '12:00'},
                {'day_of_week': 2, 'start_time': '09:00', 'end_time': '12:00'},
                {'day_of_week': 3, 'start_time': '09:00', 'end_time': '12:00'},
                {'day_of_week': 4, 'start_time': '09:00', 'end_time': '12:00'},
            ],
        },
        {
            'email': 'cris@university.edu',
            'session_method': 'in-person',
            # Split shift F2F — Mon/Wed 10am–2pm, Fri 8am–12pm
            'schedule': [
                {'day_of_week': 0, 'start_time': '10:00', 'end_time': '14:00'},
                {'day_of_week': 2, 'start_time': '10:00', 'end_time': '14:00'},
                {'day_of_week': 4, 'start_time': '08:00', 'end_time': '12:00'},
            ],
        },
        {
            'email': 'wil@university.edu',
            'session_method': 'online',
            # Online afternoon — Mon–Wed 2pm–6pm
            'schedule': [
                {'day_of_week': 0, 'start_time': '14:00', 'end_time': '18:00'},
                {'day_of_week': 1, 'start_time': '14:00', 'end_time': '18:00'},
                {'day_of_week': 2, 'start_time': '14:00', 'end_time': '18:00'},
            ],
        },
        {
            'email': 'rose.c@university.edu',
            'session_method': 'in-person',
            # Morning F2F — Tue/Thu 8am–1pm
            'schedule': [
                {'day_of_week': 1, 'start_time': '08:00', 'end_time': '13:00'},
                {'day_of_week': 3, 'start_time': '08:00', 'end_time': '13:00'},
            ],
        },
        {
            'email': 'gracie@university.edu',
            'session_method': 'online',
            # Online — Mon/Tue/Thu/Fri 10am–2pm
            'schedule': [
                {'day_of_week': 0, 'start_time': '10:00', 'end_time': '14:00'},
                {'day_of_week': 1, 'start_time': '10:00', 'end_time': '14:00'},
                {'day_of_week': 3, 'start_time': '10:00', 'end_time': '14:00'},
                {'day_of_week': 4, 'start_time': '10:00', 'end_time': '14:00'},
            ],
        },
    ]

    inserted = 0
    for entry in ic_schedules:
        ic = db.users.find_one({'email': entry['email']})
        if not ic:
            print(f"  ⚠️  IC not found: {entry['email']} — skipped")
            continue
        schedule_with_method = [
            {**slot, 'method': entry['session_method']}
            for slot in entry['schedule']
        ]
        db.counselor_availability.insert_one({
            'counselor_id': ic['_id'],
            'session_method': entry['session_method'],
            'schedule': schedule_with_method,
            'updated_at': datetime.utcnow(),
        })
        days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
        day_labels = ', '.join(days[e['day_of_week']] for e in entry['schedule'])
        print(f"  ✅ {ic['first_name']} {ic['last_name']} — {entry['session_method'].upper()} — {day_labels}")
        inserted += 1

    print(f"\n  {inserted} availability schedules seeded.\n")


if __name__ == '__main__':
    seed()
    print("\n💡 Test Credentials by Role:")
    print("\n   ADMIN:")
    print("   └─ admin@university.edu / admin123")
    print("\n   DPO (Director):")
    print("   └─ dpo@university.edu / dpo123")
    print("\n   INTAKE COUNSELORS (Triage/Intake):")
    print("   └─ julse@university.edu / julse123")
    print("   └─ archie@university.edu / archie123")
    print("   └─ mars@university.edu / mars123")
    print("\n   PSYCHOLOGISTS (Clinical/Continuing Sessions):")
    print("   └─ daryl@university.edu / daryl123")
    print("   └─ niko@university.edu / niko123")
    print("   └─ jenny@university.edu / jenny123")
    print("\n   COUNSELORS (Non-clinical/Continuing Sessions):")
    print("   └─ rose.t@university.edu / roset123")
    print("   └─ bia@university.edu / bia123")
    print("   └─ chelly@university.edu / chelly123")
    print("\n   STAFF (Office Assistant/Scheduler):")
    print("   └─ staff@university.edu / staff123")
    print("\n   COUNSELOR (additional):")
    print("   └─ csc@university.edu / csc123")
    print("\n   PSYCHOLOGIST (additional):")
    print("   └─ csp@university.edu / csp123")
    print("\n   STUDENTS:")
    print("   └─ student1@university.edu / student123")
    print("   └─ student2@university.edu / student456")
    print("   └─ student3@university.edu / student789")
    print()

    print("\n📅 Seeding IC availability schedules…\n")
    seed_availability()

    print("IC Availability Summary:")
    print("  F2F  — julse (Mon/Wed/Fri 8–12), archie (Mon–Thu 1–5),")
    print("         ria (Mon–Fri 9–12), cris (Mon/Wed 10–2, Fri 8–12),")
    print("         rose.c (Tue/Thu 8–1)")
    print("  Online — mars (Tue/Thu/Fri 9–3), wil (Mon–Wed 2–6),")
    print("           gracie (Mon/Tue/Thu/Fri 10–2)")
    print()
