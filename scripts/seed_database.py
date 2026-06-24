#!/usr/bin/env python3
"""
CPS Counseling System — seed script with real accounts
"""

from pymongo import MongoClient
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta
from bson import ObjectId
import os

MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
MONGODB_DB_NAME = os.getenv('MONGODB_DB_NAME', 'cps_system_dev')

client = MongoClient(MONGODB_URI)
db = client[MONGODB_DB_NAME]

print(f"🔌 Connecting to MongoDB at {MONGODB_URI}")
print(f"📦 Database: {MONGODB_DB_NAME}\n")

try:
    client.admin.command('ping')
    print("✓ MongoDB connection successful\n")
except Exception as e:
    print(f"✗ MongoDB connection failed: {e}")
    exit(1)

collections_to_clear = [
    'users', 'appointments', 'cases', 'intakes', 'assessments',
    'resources', 'check_ins', 'counselor_availability',
]
for col_name in collections_to_clear:
    if col_name in db.list_collection_names():
        db[col_name].delete_many({})
        print(f"🗑️  Cleared: {col_name}")

now = datetime.utcnow()

# ── day_of_week helpers (0=Mon … 6=Sun) ──────────────────────────────────────
MON, TUE, WED, THU, FRI = 0, 1, 2, 3, 4

def sched(days, start, end, method):
    return [{'day_of_week': d, 'start_time': start, 'end_time': end, 'method': method} for d in days]

# ── Users ─────────────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("SEEDING USERS")
print("="*60 + "\n")

# (email, password, first_name, last_name, role, schedule_or_None)
users_data = [
    # ── Admin / System ──────────────────────────────────────────────────────
    ('admin@university.edu',    'admin123', 'Admin',    'System',    'ADMIN',        None),
    ('dpo@university.edu',      'dpo123',   'Data',     'Officer',   'DPO',          None),
    ('staff@university.edu',    'staff123', 'Office',   'Assistant', 'STAFF',        None),

    # ── Case Manager ────────────────────────────────────────────────────────
    ('cm@university.edu',       'cm123',    'Case',     'Manager',   'CASE_MANAGER', None),

    # ── Intake Counselors ────────────────────────────────────────────────────
    # julse — F2F · Mon/Wed/Fri 8am–12pm
    ('julse@university.edu',    'julse123', 'Julse',    '',          'IC',
        sched([MON, WED, FRI], '08:00', '12:00', 'F2F')),

    # archie — F2F · Mon–Thu 1pm–5pm
    ('archie@university.edu',   'archie123','Archie',   '',          'IC',
        sched([MON, TUE, WED, THU], '13:00', '17:00', 'F2F')),

    # mars — Online · Tue/Thu/Fri 9am–3pm
    ('mars@university.edu',     'mars123',  'Mars',     '',          'IC',
        sched([TUE, THU, FRI], '09:00', '15:00', 'Online')),

    # ria — F2F · Mon–Fri 9am–12pm
    ('ria@university.edu',      'ria123',   'Ria',      '',          'IC',
        sched([MON, TUE, WED, THU, FRI], '09:00', '12:00', 'F2F')),

    # cris — F2F · Mon/Wed 10am–2pm + Fri 8am–12pm
    ('cris@university.edu',     'cris123',  'Cris',     '',          'IC',
        sched([MON, WED], '10:00', '14:00', 'F2F') +
        sched([FRI],      '08:00', '12:00', 'F2F')),

    # wil — Online · Mon–Wed 2pm–6pm
    ('wil@university.edu',      'wil123',   'Wil',      '',          'IC',
        sched([MON, TUE, WED], '14:00', '18:00', 'Online')),

    # rose.c — F2F · Tue/Thu 8am–1pm
    ('rose.c@university.edu',   'rosec123', 'Rose',     'C.',        'IC',
        sched([TUE, THU], '08:00', '13:00', 'F2F')),

    # gracie — Online · Mon/Tue/Thu/Fri 10am–2pm
    ('gracie@university.edu',   'gracie123','Gracie',   '',          'IC',
        sched([MON, TUE, THU, FRI], '10:00', '14:00', 'Online')),

    # ── Counselors ───────────────────────────────────────────────────────────
    ('rose.t@university.edu',   'roset123', 'Rose',     'T.',        'COUNSELOR',
        sched([MON, TUE, WED, THU, FRI], '08:00', '12:00', 'F2F')),
    ('bia@university.edu',      'bia123',   'Bia',      '',          'COUNSELOR',
        sched([MON, TUE, WED, THU, FRI], '13:00', '17:00', 'F2F')),
    ('chelly@university.edu',   'chelly123','Chelly',   '',          'COUNSELOR',
        sched([MON, WED, FRI], '09:00', '15:00', 'Online')),
    ('daye@university.edu',     'daye123',  'Daye',     '',          'COUNSELOR',
        sched([TUE, THU], '08:00', '17:00', 'F2F')),
    ('csc@university.edu',      'csc123',   'CSC',      'Counselor', 'COUNSELOR',
        sched([MON, TUE, WED, THU, FRI], '10:00', '16:00', 'Online')),

    # ── Psychologists ────────────────────────────────────────────────────────
    ('daryl@university.edu',    'daryl123', 'Daryl',    '',          'PSYCHOLOGIST',
        sched([MON, TUE, WED, THU, FRI], '08:00', '12:00', 'F2F')),
    ('niko@university.edu',     'niko123',  'Niko',     '',          'PSYCHOLOGIST',
        sched([MON, WED, FRI], '13:00', '17:00', 'F2F')),
    ('bon@university.edu',      'bon123',   'Bon',      '',          'PSYCHOLOGIST',
        sched([TUE, THU], '09:00', '15:00', 'Online')),
    ('shel@university.edu',     'shel123',  'Shel',     '',          'PSYCHOLOGIST',
        sched([MON, TUE, WED, THU, FRI], '13:00', '17:00', 'F2F')),
    ('jenny@university.edu',    'jenny123', 'Jenny',    '',          'PSYCHOLOGIST',
        sched([MON, WED, THU], '08:00', '14:00', 'Online')),
    ('chona@university.edu',    'chona123', 'Chona',    '',          'PSYCHOLOGIST',
        sched([TUE, WED, FRI], '10:00', '16:00', 'F2F')),
    ('csp@university.edu',      'csp123',   'CSP',      'Psych',     'PSYCHOLOGIST', None),

    # ── Students ─────────────────────────────────────────────────────────────
    ('student1@university.edu', 'student123','Emma',    'Johnson',   'STUDENT',      None),
    ('student2@university.edu', 'student456','Mark',    'Smith',     'STUDENT',      None),
    ('student3@university.edu', 'student789','Jessica', 'Davis',     'STUDENT',      None),
]

user_ids = {}
for email, password, first_name, last_name, role, schedule in users_data:
    doc = {
        'email':         email,
        'password_hash': generate_password_hash(password),
        'first_name':    first_name,
        'last_name':     last_name,
        'name':          f"{first_name} {last_name}".strip(),
        'role':          role,
        'is_active':     True,
        'is_verified':   True,
        'created_at':    now,
        'updated_at':    now,
    }
    result = db.users.insert_one(doc)
    uid = result.inserted_id
    user_ids[email] = uid
    print(f"✓ {email:35} ({role:12})")

    # Insert availability for ICs that have a schedule
    if schedule:
        db.counselor_availability.update_one(
            {'counselor_id': uid},
            {'$set': {'counselor_id': uid, 'schedule': schedule, 'updated_at': now}},
            upsert=True,
        )

print(f"\n✅ Created {len(users_data)} users")
print(f"✅ Created availability for ICs with defined schedules\n")

# ── Reference IDs ─────────────────────────────────────────────────────────────
admin_id       = user_ids['admin@university.edu']
counselor1_id  = user_ids['rose.t@university.edu']
psychologist1_id = user_ids['daryl@university.edu']
student1_id    = user_ids['student1@university.edu']
student2_id    = user_ids['student2@university.edu']
student3_id    = user_ids['student3@university.edu']
ic_id          = user_ids['julse@university.edu']

# ── Cases ─────────────────────────────────────────────────────────────────────
print("="*60)
print("SEEDING CASES")
print("="*60 + "\n")

cases = [
    {
        'student_id': student1_id,
        'assigned_counselor_id': counselor1_id,
        'assigned_psychologist_id': psychologist1_id,
        'case_status': 'ACTIVE',
        'status': 'ACTIVE',
        'case_number': 'CPS-2024-001',
        'opening_date': now - timedelta(days=30),
        'chief_complaint': 'Academic stress and time management',
        'risk_level': 'GREEN',
        'treatment_plan': 'Stress management techniques and academic support referrals',
        'progress_notes': [],
        'created_at': now - timedelta(days=30),
        'updated_at': now,
    },
    {
        'student_id': student2_id,
        'assigned_counselor_id': counselor1_id,
        'assigned_psychologist_id': psychologist1_id,
        'case_status': 'ACTIVE',
        'status': 'ACTIVE',
        'case_number': 'CPS-2024-002',
        'opening_date': now - timedelta(days=15),
        'chief_complaint': 'Relationship issues and social anxiety',
        'risk_level': 'YELLOW',
        'treatment_plan': 'CBT for anxiety, social skills training',
        'progress_notes': [],
        'created_at': now - timedelta(days=15),
        'updated_at': now,
    },
]

case_ids = {}
for i, case_data in enumerate(cases):
    result = db.cases.insert_one(case_data)
    case_ids[i] = result.inserted_id
    print(f"✓ Case: {case_data['case_number']} — {case_data['case_status']}")

print(f"\n✅ Created {len(cases)} cases\n")

# ── Intakes ───────────────────────────────────────────────────────────────────
print("="*60)
print("SEEDING INTAKES")
print("="*60 + "\n")

intakes = [
    {
        'student_id': student1_id,
        'client_name': 'Emma Johnson',
        'client_id_number': 'STU-001',
        'ic_id': ic_id,
        'counselor_id': ic_id,
        'case_id': case_ids[0],
        'status': 'COMPLETED',
        'service_requested': 'personal_counseling',
        'chief_complaint': 'Academic stress and time management',
        'source': 'walk_in',
        'created_at': now - timedelta(days=30),
        'updated_at': now,
    },
    {
        'student_id': student2_id,
        'client_name': 'Mark Smith',
        'client_id_number': 'STU-002',
        'ic_id': ic_id,
        'counselor_id': ic_id,
        'case_id': case_ids[1],
        'status': 'IN_PROGRESS',
        'service_requested': 'personal_counseling',
        'chief_complaint': 'Relationship issues and social anxiety',
        'source': 'online',
        'created_at': now - timedelta(days=15),
        'updated_at': now,
    },
    {
        'student_id': student3_id,
        'client_name': 'Jessica Davis',
        'client_id_number': 'STU-003',
        'ic_id': ic_id,
        'counselor_id': ic_id,
        'status': 'NEW',
        'service_requested': 'personal_counseling',
        'chief_complaint': 'Family conflict',
        'source': 'online',
        'created_at': now - timedelta(days=5),
        'updated_at': now,
    },
]

for intake_data in intakes:
    db.intakes.insert_one(intake_data)
    print(f"✓ Intake: {intake_data['chief_complaint'][:45]} — {intake_data['status']}")

print(f"\n✅ Created {len(intakes)} intakes\n")

# ── Appointments ──────────────────────────────────────────────────────────────
print("="*60)
print("SEEDING APPOINTMENTS")
print("="*60 + "\n")

base_date = now.replace(hour=9, minute=0, second=0, microsecond=0)
appointments = [
    {
        'student_id': student1_id,
        'counselor_id': counselor1_id,
        'case_id': case_ids[0],
        'scheduled_start': base_date + timedelta(days=7),
        'scheduled_end':   base_date + timedelta(days=7, minutes=50),
        'status': 'CONFIRMED',
        'appointment_type': 'intake_interview',
        'method': 'F2F',
        'created_at': now - timedelta(days=7),
        'updated_at': now,
    },
    {
        'student_id': student2_id,
        'counselor_id': counselor1_id,
        'case_id': case_ids[1],
        'scheduled_start': base_date + timedelta(days=3),
        'scheduled_end':   base_date + timedelta(days=3, minutes=50),
        'status': 'CONFIRMED',
        'appointment_type': 'counseling_session',
        'method': 'Online',
        'created_at': now - timedelta(days=3),
        'updated_at': now,
    },
    {
        'student_id': student3_id,
        'counselor_id': counselor1_id,
        'scheduled_start': base_date + timedelta(days=1),
        'scheduled_end':   base_date + timedelta(days=1, minutes=50),
        'status': 'REQUESTED',
        'appointment_type': 'intake_interview',
        'method': 'F2F',
        'created_at': now - timedelta(hours=12),
        'updated_at': now,
    },
]

for appt in appointments:
    db.appointments.insert_one(appt)
    print(f"✓ Appointment: {appt['appointment_type']} — {appt['status']}")

print(f"\n✅ Created {len(appointments)} appointments\n")

# ── Resources ─────────────────────────────────────────────────────────────────
print("="*60)
print("SEEDING RESOURCES")
print("="*60 + "\n")

resources = [
    {'title': 'Stress Management Guide',          'category': 'Mental Wellness',    'resource_type': 'PDF'},
    {'title': 'Cognitive Behavioral Therapy Basics','category': 'Therapy Techniques','resource_type': 'Video'},
    {'title': 'Sleep Hygiene Tips',               'category': 'Physical Wellness',  'resource_type': 'Article'},
    {'title': 'Crisis Support Resources',          'category': 'Crisis Support',     'resource_type': 'Reference'},
]

for r in resources:
    r['created_at'] = now - timedelta(days=30)
    db.resources.insert_one(r)
    print(f"✓ Resource: {r['title']}")

print(f"\n✅ Created {len(resources)} resources\n")

# ── Verification ──────────────────────────────────────────────────────────────
print("="*60)
print("VERIFICATION")
print("="*60 + "\n")

print(f"  users:                   {db.users.count_documents({}):>4}")
print(f"  counselor_availability:  {db.counselor_availability.count_documents({}):>4}")
print(f"  cases:                   {db.cases.count_documents({}):>4}")
print(f"  intakes:                 {db.intakes.count_documents({}):>4}")
print(f"  appointments:            {db.appointments.count_documents({}):>4}")
print(f"  resources:               {db.resources.count_documents({}):>4}")

print("""
============================================================
✅ DATABASE SEEDING COMPLETE
============================================================

ADMIN / SYSTEM
  admin@university.edu     admin123    ADMIN
  dpo@university.edu       dpo123      DPO
  staff@university.edu     staff123    STAFF
  cm@university.edu        cm123       CASE_MANAGER

INTAKE COUNSELORS
  julse@university.edu     julse123    F2F  Mon/Wed/Fri 8am–12pm
  archie@university.edu    archie123   F2F  Mon–Thu 1pm–5pm
  mars@university.edu      mars123     Online Tue/Thu/Fri 9am–3pm
  ria@university.edu       ria123      F2F  Mon–Fri 9am–12pm
  cris@university.edu      cris123     F2F  Mon/Wed 10am–2pm, Fri 8am–12pm
  wil@university.edu       wil123      Online Mon–Wed 2pm–6pm
  rose.c@university.edu    rosec123    F2F  Tue/Thu 8am–1pm
  gracie@university.edu    gracie123   Online Mon/Tue/Thu/Fri 10am–2pm

COUNSELORS
  rose.t@university.edu    roset123
  bia@university.edu       bia123
  chelly@university.edu    chelly123
  daye@university.edu      daye123
  csc@university.edu       csc123

PSYCHOLOGISTS
  daryl@university.edu     daryl123
  niko@university.edu      niko123
  bon@university.edu       bon123
  shel@university.edu      shel123
  jenny@university.edu     jenny123
  chona@university.edu     chona123
  csp@university.edu       csp123

STUDENTS
  student1@university.edu  student123
  student2@university.edu  student456
  student3@university.edu  student789
""")
