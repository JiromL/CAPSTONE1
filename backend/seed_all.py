#!/usr/bin/env python3
"""
CPS Counseling System — single consolidated seed entry point.

Runs all seed data in one command:
  1. Unified seed  (users, schedules, cases, appointments, session
     notes, safety plans, PERMA snapshots, announcements, resources)
  2. Staff sample data  (reschedule-request appointments,
     non_counseling_clients collection, check-in-only cases)

Usage (from repo root):
    python backend/seed_all.py
or:
    cd backend && python seed_all.py
"""
import os
import sys
import subprocess
import random
from datetime import datetime, timedelta

from bson import ObjectId
from pymongo import MongoClient

# ── Step 1: unified seed ──────────────────────────────────────────────────────
HERE = os.path.dirname(os.path.abspath(__file__))
MAIN_SEED = os.path.join(HERE, '..', 'scripts', 'seed.py')

print("=" * 60)
print("STEP 1 / 2 — Unified seed")
print("  users · schedules · cases · appointments · session notes")
print("  safety plans · PERMA snapshots · announcements · resources")
print("=" * 60)

result = subprocess.run([sys.executable, MAIN_SEED], check=False)
if result.returncode != 0:
    print(f"\n❌  Seed failed (exit {result.returncode}). Aborting.")
    sys.exit(result.returncode)

# ── Connect ───────────────────────────────────────────────────────────────────
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
MONGODB_DB = os.getenv('MONGODB_DB_NAME', 'cps_system_dev')
db = MongoClient(MONGODB_URI)[MONGODB_DB]

now = datetime.utcnow()

print()
print("=" * 60)
print("STEP 2 / 2 — Staff sample data")
print("  reschedule appointments · non_counseling_clients · check-in cases")
print("=" * 60)

# Wipe staff-specific collections so re-runs are idempotent
db.non_counseling_clients.delete_many({})
print("🗑  non_counseling_clients")


# ── Helpers ───────────────────────────────────────────────────────────────────
def _future(lo=1, hi=14):
    return now + timedelta(days=random.randint(lo, hi), hours=random.randint(8, 16))

def _past(lo=1, hi=30):
    return now - timedelta(days=random.randint(lo, hi), hours=random.randint(8, 16))


STUDENT_NAMES = [
    ('Juan', 'dela Cruz'), ('Maria', 'Santos'), ('Carlo', 'Reyes'),
    ('Andrea', 'Lim'), ('Miguel', 'Garcia'), ('Sofia', 'Torres'),
    ('Luis', 'Mendoza'), ('Carla', 'Villanueva'), ('Mark', 'Aquino'),
    ('Nicole', 'Bautista'),
]

RESCHEDULE_REASONS = [
    'Family emergency on that day',
    'Doctor appointment conflicts with session',
    'Class exam rescheduled to same time',
    'Transportation issue',
    'Work shift changed unexpectedly',
]

NC_CONCERNS = [
    'under accommodation',
    'with SDFO case',
    'Under LCIDWELL Collab',
    'with MH but needs check-in only',
]

COUNSELING_CONCERNS = [
    'Academic Concerns', 'Mental Health', 'Personal Issues',
    'Relationship Issues', 'Career Counseling', 'Crisis Support',
]

COLLEGES = ['CCS', 'CLA', 'SOE', 'COB', 'GCOE', 'CED']


# ── 1. Reschedule-request appointments ───────────────────────────────────────
reschedule_docs = []
for first, last in STUDENT_NAMES[:6]:
    orig_start = _future(3, 10)
    req_start = _future(7, 20)
    reschedule_docs.append({
        '_id': ObjectId(),
        'student_name': f'{first} {last}',
        'student_email': f'{first.lower()}.{last.lower().replace(" ", "")}@dlsu.edu.ph',
        'appointment_type': random.choice(['INITIAL_CONSULTATION', 'FOLLOW_UP', 'COUNSELING_SESSION']),
        'scheduled_start': orig_start,
        'scheduled_end': orig_start + timedelta(hours=1),
        'requested_start': req_start,
        'requested_end': req_start + timedelta(hours=1),
        'reschedule_reason': random.choice(RESCHEDULE_REASONS),
        'rescheduled_at': _past(1, 3),
        'rescheduled_by_user_id': ObjectId(),
        'status': 'REQUESTED',
        'created_at': _past(5, 14),
        'is_walkin': False,
        'risk_level': 'GREEN',
        'reschedule_approved': False,
        'reschedule_denied': False,
    })

db.appointments.insert_many(reschedule_docs)
print(f"✅  {len(reschedule_docs)} reschedule-request appointments added")


# ── 2. Non-counseling check-in clients ───────────────────────────────────────
nc_docs = []
for i, (first, last) in enumerate(STUDENT_NAMES):
    created = _past(10, 90)
    nc_docs.append({
        '_id': ObjectId(),
        'case_number': f'NC-2025-{1000 + i:04d}',
        'client_name': f'{first} {last}',
        'client_id_number': f'{random.randint(20, 24)}-{random.randint(10000, 99999)}',
        'college_unit': random.choice(COLLEGES),
        'concern': random.choice(NC_CONCERNS),
        'counselor_id': str(ObjectId()),
        'status': random.choice(['Active', 'Active', 'Active', 'Inactive']),
        'created_date': created,
        'updated_date': created + timedelta(days=random.randint(1, 10)),
    })

db.non_counseling_clients.insert_many(nc_docs)
print(f"✅  {len(nc_docs)} non-counseling clients seeded")


# ── 3. Check-in-only counseling cases ────────────────────────────────────────
checkin_docs = []
for i, (first, last) in enumerate(STUDENT_NAMES):
    created = _past(30, 120)
    checkin_docs.append({
        '_id': ObjectId(),
        'counseling_id': f'CPS-2025-{2000 + i:04d}',
        'student_id': ObjectId(),
        'student_name': f'{first} {last}',
        'student_email': f'{first.lower()}.{last.lower().replace(" ", "")}@dlsu.edu.ph',
        'status': 'ACTIVE',
        'client_status': random.choice(['CHECK_IN_ONLY', 'WITH_MH_CHECK_IN']),
        'primary_concern': random.choice(COUNSELING_CONCERNS),
        'risk_level': 'GREEN',
        'intake_source': 'ONLINE',
        'created_at': created,
        'updated_at': created + timedelta(days=random.randint(5, 30)),
    })

db.cases.insert_many(checkin_docs)
print(f"✅  {len(checkin_docs)} check-in-only cases seeded")


# ── Summary ───────────────────────────────────────────────────────────────────
print()
print("=" * 60)
print("✅  ALL SEEDS COMPLETE")
print("=" * 60)
print(f"""
Collections seeded:
  users                  {db.users.count_documents({}):>4}
  cases                  {db.cases.count_documents({}):>4}
  intakes                {db.intakes.count_documents({}):>4}
  appointments           {db.appointments.count_documents({}):>4}
  session_notes          {db.session_notes.count_documents({}):>4}
  announcements          {db.announcements.count_documents({}):>4}
  resources              {db.resources.count_documents({}):>4}
  non_counseling_clients {db.non_counseling_clients.count_documents({}):>4}

Key credentials (password = same as username prefix):
  admin@university.edu / admin123
  dpo@university.edu   / dpo123
  staff@university.edu / staff123
  student1@university.edu / student123
  daryl@university.edu / daryl123   (psychologist)
  rose.t@university.edu / roset123  (counselor)
  julse@university.edu / julse123   (IC)
""")
