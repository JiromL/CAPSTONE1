"""
Seed sample data for STAFF role pages:
- Reschedule requests (pending appointments with rescheduled_at set)
- Non-counseling check-in clients
- Counseling cases with CHECK_IN_ONLY status
"""

from pymongo import MongoClient
from datetime import datetime, timedelta
from bson import ObjectId
import random

client = MongoClient('mongodb://localhost:27017')
db = client['cps_system_dev']

now = datetime.utcnow()

# ── Helper ──────────────────────────────────────────────────────────────────

def rand_future(days_min=1, days_max=14):
    return now + timedelta(days=random.randint(days_min, days_max),
                           hours=random.randint(8, 16))

def rand_past(days_min=1, days_max=30):
    return now - timedelta(days=random.randint(days_min, days_max),
                           hours=random.randint(8, 16))

CONCERNS = ['Academic Concerns', 'Mental Health', 'Personal Issues',
            'Relationship Issues', 'Career Counseling', 'Crisis Support']

STUDENT_NAMES = [
    ('Juan', 'dela Cruz'), ('Maria', 'Santos'), ('Carlo', 'Reyes'),
    ('Andrea', 'Lim'), ('Miguel', 'Garcia'), ('Sofia', 'Torres'),
    ('Luis', 'Mendoza'), ('Carla', 'Villanueva'), ('Mark', 'Aquino'),
    ('Nicole', 'Bautista'),
]

REASONS = [
    'Family emergency on that day',
    'Doctor appointment conflicts with session',
    'Class exam rescheduled to same time',
    'Transportation issue',
    'Work shift changed unexpectedly',
]

# ── 1. Reschedule Requests ───────────────────────────────────────────────────

print("Seeding reschedule requests...")

reschedule_samples = []
for i, (first, last) in enumerate(STUDENT_NAMES[:6]):
    original_start = rand_future(3, 10)
    requested_start = rand_future(7, 20)
    reschedule_samples.append({
        '_id': ObjectId(),
        'student_name': f'{first} {last}',
        'student_email': f'{first.lower()}.{last.lower().replace(" ", "")}@dlsu.edu.ph',
        'appointment_type': random.choice(['INITIAL_CONSULTATION', 'FOLLOW_UP', 'COUNSELING_SESSION']),
        'scheduled_start': original_start,
        'scheduled_end': original_start + timedelta(hours=1),
        'requested_start': requested_start,
        'requested_end': requested_start + timedelta(hours=1),
        'reschedule_reason': random.choice(REASONS),
        'rescheduled_at': rand_past(1, 3),
        'rescheduled_by_user_id': ObjectId(),
        'status': 'REQUESTED',
        'created_at': rand_past(5, 14),
        'is_walkin': False,
        'risk_level': 'GREEN',
        'reschedule_approved': False,
        'reschedule_denied': False,
    })

db.appointments.insert_many(reschedule_samples)
print(f"  Inserted {len(reschedule_samples)} reschedule requests")


# ── 2. Non-Counseling Check-In Clients ──────────────────────────────────────

print("Seeding non-counseling check-in clients...")

nc_concerns = [
    'under accommodation',
    'with SDFO case',
    'Under LCIDWELL Collab',
    'with MH but needs check-in only',
]

nc_samples = []
for i, (first, last) in enumerate(STUDENT_NAMES):
    created = rand_past(10, 90)
    nc_samples.append({
        '_id': ObjectId(),
        'case_number': f'NC-2025-{1000 + i:04d}',
        'client_name': f'{first} {last}',
        'client_id_number': f'{random.randint(20,24)}-{random.randint(10000,99999)}',
        'college_unit': random.choice(['CCS', 'CLA', 'SOE', 'COB', 'GCOE', 'CED']),
        'concern': random.choice(nc_concerns),
        'counselor_id': str(ObjectId()),
        'status': random.choice(['Active', 'Active', 'Active', 'Inactive']),
        'created_date': created,
        'updated_date': created + timedelta(days=random.randint(1, 10)),
    })

db.non_counseling_clients.insert_many(nc_samples)
print(f"  Inserted {len(nc_samples)} non-counseling clients")


# ── 3. Counseling Cases with CHECK_IN_ONLY status ───────────────────────────

print("Seeding counseling check-in only cases...")

checkin_statuses = ['CHECK_IN_ONLY', 'WITH_MH_CHECK_IN']
checkin_cases = []

for i, (first, last) in enumerate(STUDENT_NAMES):
    created = rand_past(30, 120)
    checkin_cases.append({
        '_id': ObjectId(),
        'counseling_id': f'CPS-2025-{2000 + i:04d}',
        'student_id': ObjectId(),
        'student_name': f'{first} {last}',
        'student_email': f'{first.lower()}.{last.lower().replace(" ", "")}@dlsu.edu.ph',
        'status': 'ACTIVE',
        'client_status': random.choice(checkin_statuses),
        'primary_concern': random.choice(CONCERNS),
        'risk_level': 'GREEN',
        'intake_source': 'ONLINE',
        'created_at': created,
        'updated_at': created + timedelta(days=random.randint(5, 30)),
    })

db.cases.insert_many(checkin_cases)
print(f"  Inserted {len(checkin_cases)} counseling check-in cases")


# ── Summary ──────────────────────────────────────────────────────────────────

print("\nDone! Summary:")
print(f"  appointments (reschedule):       {db.appointments.count_documents({'rescheduled_at': {'$exists': True}})}")
print(f"  non_counseling_clients:          {db.non_counseling_clients.count_documents({})}")
print(f"  cases (check-in only):           {db.cases.count_documents({'client_status': {'$in': ['CHECK_IN_ONLY', 'WITH_MH_CHECK_IN']}})}")

client.close()
