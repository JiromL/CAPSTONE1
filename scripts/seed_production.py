#!/usr/bin/env python3
"""
seed_production.py — Production-grade CPS seed for demo/UAT/thesis defense
Run after seed_database.py and seed_extended.py.

What this adds:
  1. Fixes 119 null-scheduled_start appointments (from seed_extended schema mismatch)
  2. Patches 20 ext_students with DLSU college/course/id data
  3. 30 new DLSU students (proper schema, all colleges represented)
  4. 10 months of historical appointments (AY 2025-2026) for analytics charts
  5. Today's appointments + next 14 days for dashboards
  6. Every appointment status type + walk-in, cancelled, referral scenarios
  7. Online/F2F distribution for chart filters
  8. Referrals (counselor_referrals + referrals collections)
  9. Monthly PERMA/EMA snapshots for 12-month trend charts
 10. All notification types present and unread
 11. More announcements, screening assessments, consent records, reminders
 12. Edge cases: counselor with 6 appointments today, student with 4 cancellations
"""

import os, random
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash

# ── CONNECTION ─────────────────────────────────────────────────────────────────
MONGO_URI = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017')
DB_NAME   = os.environ.get('MONGODB_DB_NAME', 'cps_system_dev')
client    = MongoClient(MONGO_URI)
db        = client[DB_NAME]

rng = random.Random(2025)

# All datetimes are naive (no tz) consistent with existing seed data
def dt(year, month, day, hour=9, minute=0):
    return datetime(year, month, day, hour, minute, 0)

def H(days_ago, hour=9, minute=0):
    now = datetime.utcnow()
    return (now - timedelta(days=days_ago)).replace(hour=hour, minute=minute, second=0, microsecond=0)

def F(days_ahead, hour=9, minute=0):
    now = datetime.utcnow()
    return (now + timedelta(days=days_ahead)).replace(hour=hour, minute=minute, second=0, microsecond=0)

def TODAY(hour=9, minute=0):
    return datetime.utcnow().replace(hour=hour, minute=minute, second=0, microsecond=0)

def ymd(d): return d.strftime('%Y-%m-%d')

def uid(email):
    u = db.users.find_one({'email': email}, {'_id': 1})
    if not u: raise ValueError(f"Not found: {email}")
    return u['_id']

# ── PROVIDER IDs ───────────────────────────────────────────────────────────────
c_rose_t = uid('rose.t@university.edu')
c_bia    = uid('bia@university.edu')
c_chelly = uid('chelly@university.edu')
c_daye   = uid('daye@university.edu')
c_csc    = uid('csc@university.edu')
p_daryl  = uid('daryl@university.edu')
p_niko   = uid('niko@university.edu')
p_bon    = uid('bon@university.edu')
p_shel   = uid('shel@university.edu')
p_jenny  = uid('jenny@university.edu')
p_chona  = uid('chona@university.edu')
p_csp    = uid('csp@university.edu')
ic_julse  = uid('julse@university.edu')
ic_archie = uid('archie@university.edu')
ic_mars   = uid('mars@university.edu')
ic_ria    = uid('ria@university.edu')
ic_cris   = uid('cris@university.edu')
ic_wil    = uid('wil@university.edu')
ic_rose_c = uid('rose.c@university.edu')
ic_gracie = uid('gracie@university.edu')
admin_id  = uid('admin@university.edu')
staff_id  = uid('staff@university.edu')
cm_id     = uid('cm@university.edu')
dpo_id    = uid('dpo@university.edu')

COUNSELORS    = [c_rose_t, c_bia, c_chelly, c_daye, c_csc]
PSYCHOLOGISTS = [p_daryl, p_niko, p_bon, p_shel, p_jenny, p_chona, p_csp]
ICS           = [ic_julse, ic_archie, ic_mars, ic_ria, ic_cris, ic_wil, ic_rose_c, ic_gracie]
PROVIDERS     = COUNSELORS + PSYCHOLOGISTS

print("✅ Provider IDs loaded\n")

# ══════════════════════════════════════════════════════════════════════════════
# STEP 1 — Fix null scheduled_start from seed_extended.py
# ══════════════════════════════════════════════════════════════════════════════
broken = list(db.appointments.find({'scheduled_start': {'$exists': False}, 'appointment_datetime': {'$exists': True}}))
fixed = 0
for a in broken:
    start = a['appointment_datetime']
    end   = start + timedelta(minutes=50)
    # Map old fields to new schema
    method = 'F2F'
    if a.get('session_type') == 'ONLINE':
        method = 'Online'
    atype = 'COUNSELING'
    if a.get('booking_method') == 'INTAKE':
        atype = 'INTAKE'
    update = {
        '$set': {
            'scheduled_start': start,
            'scheduled_end': end,
            'method': method,
            'appointment_type': atype,
        },
        '$unset': {
            'appointment_date': '',
            'appointment_time': '',
            'appointment_datetime': '',
            'booking_method': '',
            'session_type': '',
            'is_walk_in': '',
        }
    }
    db.appointments.update_one({'_id': a['_id']}, update)
    fixed += 1

print(f"✅ Fixed {fixed} null-scheduled_start appointments\n")

# ══════════════════════════════════════════════════════════════════════════════
# STEP 2 — Patch ext_students with proper DLSU college/course/id data
# ══════════════════════════════════════════════════════════════════════════════
_ext_patches = [
    ('ext_student1@university.edu',  'GCOE', 'BS Computer Engineering',      '4th Year', '12110101'),
    ('ext_student2@university.edu',  'CN',   'BS Nursing',                   '3rd Year', '12210102'),
    ('ext_student3@university.edu',  'CoSc', 'BS Biology',                   '4th Year', '12110103'),
    ('ext_student4@university.edu',  'SOL',  'Juris Doctor',                 '2nd Year', '12310104'),
    ('ext_student5@university.edu',  'CCS',  'BS Computer Science',          '3rd Year', '12210105'),
    ('ext_student6@university.edu',  'CLA',  'BS Architecture',              '4th Year', '12110106'),
    ('ext_student7@university.edu',  'RVRCOB','BS Accountancy',              '3rd Year', '12210107'),
    ('ext_student8@university.edu',  'CLA',  'AB Psychology',                '3rd Year', '12210108'),
    ('ext_student9@university.edu',  'RVRCOB','Master in Business Admin',    '2nd Year', '12310109'),
    ('ext_student10@university.edu', 'CoSc', 'BS Medical Technology',        '4th Year', '12110110'),
    ('ext_student11@university.edu', 'CED',  'BS Education - Math',          '2nd Year', '12310111'),
    ('ext_student12@university.edu', 'CLA',  'AB Liberal Arts',              '3rd Year', '12210112'),
    ('ext_student13@university.edu', 'CN',   'BS Nursing',                   '2nd Year', '12310113'),
    ('ext_student14@university.edu', 'GCOE', 'BS Computer Engineering',      '1st Year', '12410114'),
    ('ext_student15@university.edu', 'RVRCOB','BS Business Administration',  '2nd Year', '12310115'),
    ('ext_student16@university.edu', 'CN',   'BS Nursing',                   '2nd Year', '12310116'),
    ('ext_student17@university.edu', 'CCS',  'BS Computer Science',          '4th Year', '12110117'),
    ('ext_student18@university.edu', 'CED',  'BS Education - English',       '3rd Year', '12210118'),
    ('ext_student19@university.edu', 'CoSc', 'BS Marine Biology',            '2nd Year', '12310119'),
    ('ext_student20@university.edu', 'CLA',  'BS Architecture',              '3rd Year', '12210120'),
]
for email, college, course, year_level, sid in _ext_patches:
    db.users.update_one({'email': email}, {'$set': {
        'college': college,
        'course': course,
        'year': year_level,
        'year_level': year_level,
        'student_id': sid,
        'id_number': f'1{rng.randint(19, 24):02d}{rng.randint(10000, 99999)}',
        'phone': f'09{rng.randint(100000000,999999999)}',
        'emergency_contact': 'Parent',
        'emergency_contact_relationship': 'Parent',
        'emergency_phone': f'09{rng.randint(100000000,999999999)}',
        'consent_given': True,
        'consent_given_at': H(90),
        'consent_version': '1.0',
    }})
print(f"✅ Patched {len(_ext_patches)} ext_students with DLSU college data\n")

# ══════════════════════════════════════════════════════════════════════════════
# STEP 3 — 30 new production students (full DLSU schema, all colleges)
# ══════════════════════════════════════════════════════════════════════════════
_prod_students = [
    # (first, last, email, pw, college, course, year_level, sid_suffix)
    # CCS
    ('Alec',    'Bautista', 'abautista25@dlsu.edu.ph',  'prod001', 'CCS',    'BS Information Systems',        '3rd Year', '12210201'),
    ('Carla',   'Reyes',    'creyes25@dlsu.edu.ph',     'prod002', 'CCS',    'BS Computer Science',           '2nd Year', '12310202'),
    ('Donnie',  'Sy',       'dsy25@dlsu.edu.ph',        'prod003', 'CCS',    'BS Information Technology',     '4th Year', '12110203'),
    # GCOE
    ('Ella',    'Garcia',   'egarcia25@dlsu.edu.ph',    'prod004', 'GCOE',   'BS Electronics Engineering',    '3rd Year', '12210204'),
    ('Fred',    'Tan',      'ftan25@dlsu.edu.ph',       'prod005', 'GCOE',   'BS Industrial Engineering',     '2nd Year', '12310205'),
    ('Gina',    'Lim',      'glim25@dlsu.edu.ph',       'prod006', 'GCOE',   'BS Civil Engineering',          '4th Year', '12110206'),
    ('Harold',  'Santos',   'hsantos25@dlsu.edu.ph',    'prod007', 'GCOE',   'BS Mechanical Engineering',     '1st Year', '12410207'),
    # CLA
    ('Iris',    'Dela Rosa','idelarosa25@dlsu.edu.ph',  'prod008', 'CLA',    'AB Communication',              '3rd Year', '12210208'),
    ('Jake',    'Villanueva','jvillanueva25@dlsu.edu.ph','prod009', 'CLA',   'AB Political Science',          '2nd Year', '12310209'),
    ('Kim',     'Ocampo',   'kocampo25@dlsu.edu.ph',   'prod010', 'CLA',    'AB Philosophy',                 '4th Year', '12110210'),
    # RVRCOB
    ('Leo',     'Aquino',   'laquino25@dlsu.edu.ph',   'prod011', 'RVRCOB', 'BS Accountancy',                '3rd Year', '12210211'),
    ('Mia',     'Cruz',     'mcruz25@dlsu.edu.ph',     'prod012', 'RVRCOB', 'BS Management of Financial Inst','2nd Year','12310212'),
    ('Neil',    'Navarro',  'nnavarro25@dlsu.edu.ph',  'prod013', 'RVRCOB', 'BS Business Administration',    '3rd Year', '12210213'),
    ('Ola',     'Fernandez','ofernandez25@dlsu.edu.ph','prod014', 'RVRCOB', 'BS Accountancy',                '4th Year', '12110214'),
    # CoSc
    ('Paz',     'Ramirez',  'pramirez25@dlsu.edu.ph',  'prod015', 'CoSc',   'BS Biology',                    '2nd Year', '12310215'),
    ('Quinn',   'Torres',   'qtorres25@dlsu.edu.ph',   'prod016', 'CoSc',   'BS Chemistry',                  '3rd Year', '12210216'),
    ('Rex',     'Morales',  'rmorales25@dlsu.edu.ph',  'prod017', 'CoSc',   'BS Mathematics',                '4th Year', '12110217'),
    # CN (College of Nursing)
    ('Sara',    'Aguilar',  'saguilar25@dlsu.edu.ph',  'prod018', 'CN',     'BS Nursing',                    '3rd Year', '12210218'),
    ('Tim',     'Mejia',    'tmejia25@dlsu.edu.ph',    'prod019', 'CN',     'BS Nursing',                    '2nd Year', '12310219'),
    # CED
    ('Uma',     'Pascual',  'upascual25@dlsu.edu.ph',  'prod020', 'CED',    'BS Education - Science',        '3rd Year', '12210220'),
    # SOL (School of Law)
    ('Vince',   'Dela Cruz','vdelacruz25@dlsu.edu.ph', 'prod021', 'SOL',    'Juris Doctor',                  '3rd Year', '12210221'),
    # SOM (School of Medicine)
    ('Wendy',   'Soriano',  'wsoriano25@dlsu.edu.ph',  'prod022', 'SOM',    'Doctor of Medicine',            '2nd Year', '12310222'),
    # More CCS/GCOE/CLA for diversity in searches
    ('Xander',  'Ong',      'xong25@dlsu.edu.ph',      'prod023', 'CCS',    'BS Computer Science',           '1st Year', '12410223'),
    ('Yasmin',  'Flores',   'yflores25@dlsu.edu.ph',   'prod024', 'CCS',    'BS Information Technology',     '3rd Year', '12210224'),
    ('Zach',    'Mendoza',  'zmendoza25@dlsu.edu.ph',  'prod025', 'GCOE',   'BS Chemical Engineering',       '2nd Year', '12310225'),
    # Students with similar names (for search filter testing)
    ('Juan',    'Santos',   'jsantos_a@dlsu.edu.ph',   'prod026', 'CCS',    'BS Computer Science',           '2nd Year', '12310226'),
    ('Juan',    'Santos',   'jsantos_b@dlsu.edu.ph',   'prod027', 'GCOE',   'BS Civil Engineering',          '3rd Year', '12210227'),
    ('Maria',   'Reyes',    'mreyes_a@dlsu.edu.ph',    'prod028', 'CN',     'BS Nursing',                    '4th Year', '12110228'),
    ('Maria',   'Reyes',    'mreyes_b@dlsu.edu.ph',    'prod029', 'CED',    'BS Education - Math',           '2nd Year', '12310229'),
    # Inactive/old student (soft-deleted style)
    ('Inactive','Account',  'inactive_old@dlsu.edu.ph','prod030', 'CCS',    'BS Information Systems',        '2nd Year', '12310230'),
]

sP = []
for first, last, email, pw, college, course, year_level, sid in _prod_students:
    is_active = (email != 'inactive_old@dlsu.edu.ph')
    sid_obj = db.users.insert_one({
        'email': email,
        'password_hash': generate_password_hash(pw),
        'role': 'STUDENT',
        'first_name': first, 'last_name': last,
        'name': f'{first} {last}',
        'student_id': sid,
        'id_number': f'1{rng.randint(19, 24):02d}{rng.randint(10000, 99999)}',
        'college': college,
        'course': course,
        'year': year_level,
        'year_level': year_level,
        'phone': f'09{rng.randint(100000000,999999999)}',
        'emergency_contact': f'{last} Parent',
        'emergency_contact_relationship': 'Parent',
        'emergency_phone': f'09{rng.randint(100000000,999999999)}',
        'is_active': is_active,
        'is_verified': is_active,
        'consent_given': is_active,
        'consent_given_at': H(rng.randint(30, 200)) if is_active else None,
        'consent_version': '1.0',
        'perma_latest_label': None,
        'created_at': H(rng.randint(20, 200)),
        'updated_at': H(rng.randint(1, 10)),
    }).inserted_id
    sP.append(sid_obj)

print(f"✅ {len(sP)} production students created\n")

# ── Re-assign name aliases ─────────────────────────────────────────────────────
(sP_alec, sP_carla, sP_donnie, sP_ella, sP_fred, sP_gina, sP_harold,
 sP_iris, sP_jake, sP_kim, sP_leo, sP_mia, sP_neil, sP_ola,
 sP_paz, sP_quinn, sP_rex, sP_sara, sP_tim, sP_uma, sP_vince,
 sP_wendy, sP_xander, sP_yasmin, sP_zach, sP_juan_a, sP_juan_b,
 sP_maria_a, sP_maria_b, sP_inactive) = sP

# ── Consent records for new students ──────────────────────────────────────────
for sid_obj in sP[:-1]:  # all except inactive
    db.consent_records.insert_one({
        'user_id': sid_obj,
        'consent_types': ['counseling_services', 'data_privacy'],
        'consented_at': H(rng.randint(20, 200)),
        'ip_address': f'192.168.1.{rng.randint(2, 254)}',
        'user_agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'version': '1.0',
    })
print(f"✅ Consent records for production students\n")

# ══════════════════════════════════════════════════════════════════════════════
# STEP 4 — Historical appointment bulk (AY 2025-2026 academic year)
# For analytics charts: appointments per month trending over a full year
# ══════════════════════════════════════════════════════════════════════════════

# Get all student IDs (for bulk historical appointments)
all_students = [u['_id'] for u in db.users.find({'role': 'STUDENT', 'is_active': True}, {'_id': 1})]

def bulk_appt(s_id, p_id, year, month, day, hour, status='COMPLETED', method='F2F', atype='COUNSELING', notes=None, is_walk_in=False):
    start = dt(year, month, day, hour)
    end   = start + timedelta(minutes=50)
    doc = {
        'student_id': s_id,
        'counselor_id': p_id,
        'case_id': None,
        'status': status,
        'appointment_type': atype,
        'method': method,
        'scheduled_start': start,
        'scheduled_end': end,
        'created_at': start - timedelta(days=7),
        'updated_at': end if status == 'COMPLETED' else start,
        'is_walk_in': is_walk_in,
    }
    if notes: doc['notes'] = notes
    if status == 'COMPLETED': doc['completed_at'] = end
    return doc

# Monthly distribution — realistic AY 2025-2026 counseling centre volume
# (year, month): list of (day, hour, status, method) tuples
# F2F=75%, Online=25%; COMPLETED=80%, CANCELLED=10%, NO_SHOW=5%, FOLLOW_UP=5%

def gen_month(year, month, num_appts, complete_pct=0.80, cancel_pct=0.10, noshow_pct=0.05):
    """Generate appointment docs for a given month."""
    docs = []
    # Determine max day
    import calendar
    max_day = calendar.monthrange(year, month)[1]

    for _ in range(num_appts):
        day  = rng.randint(1, min(max_day, 28))
        hour = rng.choice([9, 10, 11, 13, 14, 15, 16])
        method = rng.choice(['F2F','F2F','F2F','Online'])
        provider = rng.choice(PROVIDERS)
        student  = rng.choice(all_students)

        roll = rng.random()
        if roll < complete_pct:
            status = 'COMPLETED'
        elif roll < complete_pct + cancel_pct:
            status = 'CANCELLED'
        elif roll < complete_pct + cancel_pct + noshow_pct:
            status = 'NO_SHOW'
        else:
            status = 'FOLLOW_UP'

        atype = rng.choice(['COUNSELING', 'COUNSELING', 'COUNSELING', 'INTAKE'])
        docs.append(bulk_appt(student, provider, year, month, day, hour, status, method, atype))
    return docs

# Academic year monthly targets (realistic counseling centre volume)
monthly_plan = [
    (2025, 8,  42),   # Term 1 start — new students, adjustment concerns
    (2025, 9,  55),   # Midterm season — peak referrals
    (2025, 10, 38),
    (2025, 11, 60),   # Pre-finals — highest stress period
    (2025, 12, 16),   # Finals + holiday break — reduced
    (2026, 1,  48),   # Term 2 start — new wave
    (2026, 2,  40),   # Valentine's, relationship issues
    (2026, 3,  50),   # Midterm 2
    (2026, 4,  62),   # Finals/thesis — peak demand
    (2026, 5,  22),   # Break
]

all_bulk_docs = []
for year, month, count in monthly_plan:
    all_bulk_docs.extend(gen_month(year, month, count))

if all_bulk_docs:
    db.appointments.insert_many(all_bulk_docs)
total_hist = sum(c for _, _, c in monthly_plan)
print(f"✅ {total_hist} historical appointments inserted (AY 2025-2026)\n")

# ══════════════════════════════════════════════════════════════════════════════
# STEP 5 — Today's appointments (dashboards must not be empty)
# ══════════════════════════════════════════════════════════════════════════════

# Get specific existing student IDs for today's sessions
def stu(email):
    u = db.users.find_one({'email': email}, {'_id': 1})
    return u['_id'] if u else rng.choice(all_students)

s1 = stu('student1@university.edu')   # Emma Johnson
s2 = stu('student2@university.edu')   # Mark Smith
s5 = stu('student5@university.edu')   # Sofia Martinez
s6 = stu('student6@university.edu')   # James Wilson (RED risk)
s12 = stu('student12@university.edu') # Amy Torres (PTSD)
s19 = stu('student19@university.edu') # Leo Reyes
ext1 = stu('ext_student1@university.edu')  # Marco Reyes
ext4 = stu('ext_student4@university.edu')  # Bea Cruz

today_appts = [
    # 9:00 AM — IC intake (walk-in)
    {'student_id': sP_ella, 'counselor_id': ic_julse, 'case_id': None,
     'status': 'CONFIRMED', 'appointment_type': 'INTAKE', 'method': 'F2F',
     'scheduled_start': TODAY(9, 0), 'scheduled_end': TODAY(9, 50),
     'is_walk_in': True, 'notes': 'Walk-in student. First contact.',
     'created_at': TODAY(8, 55), 'updated_at': TODAY(8, 55)},

    # 9:00 AM — Counselor session (completed — morning slot)
    {'student_id': s1, 'counselor_id': c_rose_t, 'case_id': None,
     'status': 'COMPLETED', 'appointment_type': 'COUNSELING', 'method': 'F2F',
     'scheduled_start': TODAY(9, 0), 'scheduled_end': TODAY(9, 50),
     'completed_at': TODAY(9, 52), 'is_walk_in': False,
     'notes': 'Session completed this morning. Good progress.',
     'created_at': H(7), 'updated_at': TODAY(9, 52)},

    # 10:00 AM — Psychologist RED risk session
    {'student_id': s6, 'counselor_id': p_daryl, 'case_id': None,
     'status': 'CONFIRMED', 'appointment_type': 'COUNSELING', 'method': 'F2F',
     'scheduled_start': TODAY(10, 0), 'scheduled_end': TODAY(10, 50),
     'is_walk_in': False, 'notes': 'HIGH PRIORITY — James Wilson. Red risk follow-up.',
     'created_at': H(7), 'updated_at': H(1)},

    # 10:00 AM — Counselor session online
    {'student_id': s19, 'counselor_id': c_bia, 'case_id': None,
     'status': 'CONFIRMED', 'appointment_type': 'COUNSELING', 'method': 'Online',
     'scheduled_start': TODAY(10, 0), 'scheduled_end': TODAY(10, 50),
     'is_walk_in': False, 'notes': 'Online session via Zoom.',
     'created_at': H(7), 'updated_at': H(1)},

    # 11:00 AM — PTSD session
    {'student_id': s12, 'counselor_id': p_bon, 'case_id': None,
     'status': 'CONFIRMED', 'appointment_type': 'COUNSELING', 'method': 'F2F',
     'scheduled_start': TODAY(11, 0), 'scheduled_end': TODAY(11, 50),
     'is_walk_in': False, 'notes': 'Amy Torres — PTSD session 9. Trauma narrative.',
     'created_at': H(7), 'updated_at': H(1)},

    # 11:00 AM — IC intake (scheduled)
    {'student_id': sP_fred, 'counselor_id': ic_archie, 'case_id': None,
     'status': 'CONFIRMED', 'appointment_type': 'INTAKE', 'method': 'F2F',
     'scheduled_start': TODAY(11, 0), 'scheduled_end': TODAY(11, 50),
     'is_walk_in': False, 'notes': 'First intake. Self-referred for anxiety.',
     'created_at': H(3), 'updated_at': H(1)},

    # 1:00 PM — Crisis follow-up (Marco Reyes RED)
    {'student_id': ext1, 'counselor_id': p_daryl, 'case_id': None,
     'status': 'CONFIRMED', 'appointment_type': 'COUNSELING', 'method': 'F2F',
     'scheduled_start': TODAY(13, 0), 'scheduled_end': TODAY(13, 50),
     'is_walk_in': False, 'notes': 'Marco Reyes — RED risk. PHQ-9 follow-up.',
     'created_at': H(7), 'updated_at': H(1)},

    # 1:00 PM — Counselor session
    {'student_id': s5, 'counselor_id': c_chelly, 'case_id': None,
     'status': 'CONFIRMED', 'appointment_type': 'COUNSELING', 'method': 'Online',
     'scheduled_start': TODAY(13, 0), 'scheduled_end': TODAY(13, 50),
     'is_walk_in': False, 'notes': 'Sofia Martinez — check-in session.',
     'created_at': H(7), 'updated_at': H(1)},

    # 2:00 PM — Bipolar monitoring session
    {'student_id': ext4, 'counselor_id': p_chona, 'case_id': None,
     'status': 'CONFIRMED', 'appointment_type': 'COUNSELING', 'method': 'F2F',
     'scheduled_start': TODAY(14, 0), 'scheduled_end': TODAY(14, 50),
     'is_walk_in': False, 'notes': 'Bea Cruz — Bipolar II monitoring. Medication compliance check.',
     'created_at': H(7), 'updated_at': H(1)},

    # 2:00 PM — Counselor session
    {'student_id': s2, 'counselor_id': c_daye, 'case_id': None,
     'status': 'CONFIRMED', 'appointment_type': 'COUNSELING', 'method': 'F2F',
     'scheduled_start': TODAY(14, 0), 'scheduled_end': TODAY(14, 50),
     'is_walk_in': False, 'notes': 'Mark Smith — Depression session.',
     'created_at': H(7), 'updated_at': H(1)},

    # 3:00 PM — Walk-in (no prior appointment)
    {'student_id': sP_harold, 'counselor_id': ic_mars, 'case_id': None,
     'status': 'CONFIRMED', 'appointment_type': 'INTAKE', 'method': 'F2F',
     'scheduled_start': TODAY(15, 0), 'scheduled_end': TODAY(15, 50),
     'is_walk_in': True, 'notes': 'Walk-in. 1st year student in distress. Homesickness + failure anxiety.',
     'created_at': TODAY(14, 50), 'updated_at': TODAY(14, 50)},

    # 3:00 PM — Online psych session
    {'student_id': sP_leo, 'counselor_id': p_shel, 'case_id': None,
     'status': 'CONFIRMED', 'appointment_type': 'COUNSELING', 'method': 'Online',
     'scheduled_start': TODAY(15, 0), 'scheduled_end': TODAY(15, 50),
     'is_walk_in': False, 'notes': 'Leo Aquino — OCD follow-up session (online).',
     'created_at': H(7), 'updated_at': H(1)},

    # 4:00 PM — IC walk-in (late afternoon)
    {'student_id': sP_tim, 'counselor_id': ic_wil, 'case_id': None,
     'status': 'REQUESTED', 'appointment_type': 'INTAKE', 'method': 'F2F',
     'scheduled_start': TODAY(16, 0), 'scheduled_end': TODAY(16, 50),
     'is_walk_in': True, 'notes': 'Walk-in. Nursing student — clinical rotation stress.',
     'created_at': TODAY(15, 45), 'updated_at': TODAY(15, 45)},
]

db.appointments.insert_many(today_appts)
print(f"✅ {len(today_appts)} today's appointments inserted\n")

# ══════════════════════════════════════════════════════════════════════════════
# STEP 6 — Upcoming appointments (next 14 days)
# ══════════════════════════════════════════════════════════════════════════════

upcoming = []
# Next 14 days — realistic schedule
schedule = [
    # (days_ahead, hour, student, provider, method, type)
    (1,  9,  sP_iris,   c_rose_t,  'F2F',    'COUNSELING'),
    (1,  10, sP_kim,    p_niko,    'F2F',    'COUNSELING'),
    (1,  11, sP_mia,    c_bia,     'Online', 'COUNSELING'),
    (1,  13, sP_neil,   p_jenny,   'F2F',    'COUNSELING'),
    (1,  14, sP_ola,    c_csc,     'F2F',    'COUNSELING'),
    (2,  9,  sP_paz,    p_daryl,   'F2F',    'COUNSELING'),
    (2,  10, sP_quinn,  c_chelly,  'Online', 'COUNSELING'),
    (2,  11, sP_rex,    p_shel,    'F2F',    'COUNSELING'),
    (2,  14, sP_sara,   c_daye,    'F2F',    'COUNSELING'),
    (3,  9,  sP_uma,    p_bon,     'F2F',    'COUNSELING'),
    (3,  10, sP_vince,  p_chona,   'Online', 'COUNSELING'),
    (3,  11, sP_wendy,  p_csp,     'F2F',    'COUNSELING'),
    (4,  9,  sP_xander, ic_gracie, 'F2F',    'INTAKE'),
    (4,  10, sP_yasmin, c_rose_t,  'F2F',    'COUNSELING'),
    (4,  13, sP_zach,   p_daryl,   'F2F',    'COUNSELING'),
    (5,  9,  sP_alec,   c_bia,     'Online', 'COUNSELING'),
    (5,  10, sP_carla,  ic_ria,    'F2F',    'INTAKE'),
    (5,  11, sP_donnie, p_niko,    'F2F',    'COUNSELING'),
    (7,  9,  sP_ella,   c_chelly,  'F2F',    'COUNSELING'),
    (7,  10, sP_fred,   p_bon,     'Online', 'COUNSELING'),
    (7,  11, sP_gina,   c_csc,     'F2F',    'COUNSELING'),
    (7,  14, sP_harold, ic_julse,  'F2F',    'INTAKE'),
    (8,  9,  sP_juan_a, p_shel,    'F2F',    'COUNSELING'),
    (8,  10, sP_juan_b, c_daye,    'Online', 'COUNSELING'),
    (9,  9,  sP_maria_a, p_jenny,  'F2F',    'COUNSELING'),
    (9,  10, sP_maria_b, c_rose_t, 'Online', 'COUNSELING'),
    (10, 9,  sP_leo,    p_csp,     'F2F',    'COUNSELING'),
    (10, 10, sP_tim,    c_bia,     'F2F',    'COUNSELING'),
    (12, 9,  sP_uma,    p_chona,   'Online', 'COUNSELING'),
    (14, 9,  sP_vince,  p_daryl,   'F2F',    'COUNSELING'),
]
for days, hour, student, provider, method, atype in schedule:
    start = F(days, hour)
    upcoming.append({
        'student_id': student, 'counselor_id': provider, 'case_id': None,
        'status': 'CONFIRMED', 'appointment_type': atype, 'method': method,
        'scheduled_start': start, 'scheduled_end': start + timedelta(minutes=50),
        'is_walk_in': False, 'created_at': H(rng.randint(1, 7)), 'updated_at': H(1),
    })

db.appointments.insert_many(upcoming)
print(f"✅ {len(upcoming)} upcoming appointments (next 14 days)\n")

# ══════════════════════════════════════════════════════════════════════════════
# STEP 7 — All appointment statuses / edge cases
# ══════════════════════════════════════════════════════════════════════════════

# Edge case 1: Student with 4 cancellations (sP_donnie)
for i, (days_ago, reason) in enumerate([
    (45, 'Student cancelled — conflicting part-time work schedule'),
    (30, 'Student cancelled — family emergency'),
    (20, 'Student cancelled — not feeling well'),
    (10, 'Student cancelled — lost motivation to continue'),
]):
    start = H(days_ago, 10)
    db.appointments.insert_one({
        'student_id': sP_donnie, 'counselor_id': c_csc, 'case_id': None,
        'status': 'CANCELLED', 'appointment_type': 'COUNSELING', 'method': 'F2F',
        'scheduled_start': start, 'scheduled_end': start + timedelta(minutes=50),
        'cancellation_reason': reason, 'cancelled_by': sP_donnie, 'cancelled_at': start - timedelta(hours=2),
        'is_walk_in': False, 'created_at': start - timedelta(days=7), 'updated_at': start - timedelta(hours=2),
    })

# Edge case 2: Staff-cancelled appointments
for i, (days_ago, reason) in enumerate([
    (25, 'Counsellor on emergency leave. Session rescheduled.'),
    (15, 'Office closed for University Foundation Day.'),
    (5,  'Counsellor conflict. Please book another available slot.'),
]):
    start = H(days_ago, 13)
    db.appointments.insert_one({
        'student_id': rng.choice(all_students), 'counselor_id': rng.choice(COUNSELORS), 'case_id': None,
        'status': 'CANCELLED', 'appointment_type': 'COUNSELING', 'method': rng.choice(['F2F', 'Online']),
        'scheduled_start': start, 'scheduled_end': start + timedelta(minutes=50),
        'cancellation_reason': reason, 'cancelled_by': staff_id, 'cancelled_at': start - timedelta(hours=1),
        'is_walk_in': False, 'created_at': start - timedelta(days=7), 'updated_at': start - timedelta(hours=1),
    })

# Edge case 3: REQUESTED (unassigned) — staff dashboard queue
requested_students = [sP_gina, sP_harold, sP_iris, sP_jake, sP_kim, sP_paz, sP_quinn]
for i, student in enumerate(requested_students):
    start = F(rng.randint(3, 10), rng.choice([9, 10, 11, 13, 14]))
    db.appointments.insert_one({
        'student_id': student, 'counselor_id': None, 'case_id': None,
        'status': 'REQUESTED', 'appointment_type': 'INTAKE', 'method': rng.choice(['F2F', 'Online']),
        'scheduled_start': start, 'scheduled_end': start + timedelta(minutes=50),
        'is_walk_in': False, 'notes': 'Student self-referred. Awaiting staff assignment.',
        'created_at': H(rng.randint(1, 3)), 'updated_at': H(rng.randint(1, 2)),
    })

# Edge case 4: MATCHED appointments (staff assigned, waiting confirmation)
for student in [sP_rex, sP_sara, sP_tim]:
    start = F(rng.randint(5, 12), rng.choice([10, 11, 14]))
    db.appointments.insert_one({
        'student_id': student, 'counselor_id': rng.choice(COUNSELORS + PSYCHOLOGISTS), 'case_id': None,
        'status': 'MATCHED', 'appointment_type': 'INTAKE', 'method': 'F2F',
        'scheduled_start': start, 'scheduled_end': start + timedelta(minutes=50),
        'is_walk_in': False, 'notes': 'Counsellor matched. Awaiting student confirmation.',
        'created_at': H(rng.randint(1, 2)), 'updated_at': H(1),
    })

# Edge case 5: APPROVED appointments
for student in [sP_uma, sP_vince]:
    start = F(rng.randint(3, 7), rng.choice([9, 10, 13]))
    db.appointments.insert_one({
        'student_id': student, 'counselor_id': rng.choice(COUNSELORS), 'case_id': None,
        'status': 'APPROVED', 'appointment_type': 'COUNSELING', 'method': 'Online',
        'scheduled_start': start, 'scheduled_end': start + timedelta(minutes=50),
        'is_walk_in': False, 'notes': 'Appointment approved. Zoom link will be sent.',
        'created_at': H(2), 'updated_at': H(1),
    })

# Edge case 6: EVALUATION appointments (in progress)
for student in [sP_wendy, sP_xander, sP_yasmin]:
    start = H(rng.randint(1, 3), rng.choice([9, 10, 11, 14]))
    db.appointments.insert_one({
        'student_id': student, 'counselor_id': rng.choice(PROVIDERS), 'case_id': None,
        'status': 'EVALUATION', 'appointment_type': 'COUNSELING', 'method': 'F2F',
        'scheduled_start': start, 'scheduled_end': start + timedelta(minutes=50),
        'is_walk_in': False, 'notes': 'Ongoing evaluation — case assignment pending.',
        'created_at': H(10), 'updated_at': H(1),
    })

# Edge case 7: FOLLOW_UP appointments (scheduled post-case-closure)
for student in [sP_zach, sP_juan_a, sP_maria_a]:
    start = F(rng.randint(7, 21), rng.choice([10, 11, 14]))
    db.appointments.insert_one({
        'student_id': student, 'counselor_id': rng.choice(COUNSELORS), 'case_id': None,
        'status': 'FOLLOW_UP', 'appointment_type': 'COUNSELING', 'method': rng.choice(['F2F', 'Online']),
        'scheduled_start': start, 'scheduled_end': start + timedelta(minutes=50),
        'is_walk_in': False, 'notes': 'Post-closure follow-up appointment. Student doing well.',
        'created_at': H(5), 'updated_at': H(1),
    })

print("✅ All appointment status edge cases inserted\n")

# ══════════════════════════════════════════════════════════════════════════════
# STEP 8 — Referrals (counselor_referrals + referrals collections)
# ══════════════════════════════════════════════════════════════════════════════
_case_ids = {c['case_number']: c['_id'] for c in db.cases.find({'case_number': {'$exists': True}})}

def get_case(num): return _case_ids.get(f'CPS-2025-{num:03d}')

referral_records = [
    {
        'case_id': get_case(21),
        'student_id': stu('ext_student1@university.edu'),
        'referring_counselor_id': p_daryl,
        'referred_to_id': None,
        'referred_to_type': 'PSYCHIATRY',
        'referral_type': 'EXTERNAL',
        'reason': 'Severe MDD with passive SI. Medication evaluation required. PHQ-9=20. Psychiatric consultation recommended before next session.',
        'status': 'ACCEPTED',
        'urgency': 'urgent',
        'warm_handoff_completed': True,
        'provider_acknowledgment_date': H(20),
        'notes': 'University Health Center psychiatrist confirmed appointment. Medication started.',
        'created_at': H(40), 'updated_at': H(20),
    },
    {
        'case_id': get_case(22),
        'student_id': stu('ext_student2@university.edu'),
        'referring_counselor_id': p_bon,
        'referred_to_id': None,
        'referred_to_type': 'NUTRITIONIST',
        'referral_type': 'INTERNAL',
        'reason': 'Anorexia Nervosa — BMI 16.2. Nutritional rehabilitation plan needed. Coordinated care required.',
        'status': 'ACCEPTED',
        'urgency': 'urgent',
        'warm_handoff_completed': True,
        'provider_acknowledgment_date': H(55),
        'notes': 'Nutritionist team confirmed intake. Weekly BMI monitoring in place.',
        'created_at': H(60), 'updated_at': H(55),
    },
    {
        'case_id': get_case(30),
        'student_id': stu('ext_student10@university.edu'),
        'referring_counselor_id': c_rose_t,
        'referred_to_id': p_jenny,
        'referred_to_type': 'PSYCHOLOGIST',
        'referral_type': 'INTERNAL',
        'reason': 'PHQ-9=13, GAD-7=14. Imposter syndrome escalating to moderate depression. Exceeds scope of counseling services. Warm handoff to psychology.',
        'status': 'ACCEPTED',
        'urgency': 'routine',
        'warm_handoff_completed': True,
        'provider_acknowledgment_date': H(44),
        'notes': 'Dr. Jenny Soriano accepted case. Intake completed July 2026.',
        'created_at': H(47), 'updated_at': H(44),
    },
    {
        'case_id': get_case(24),
        'student_id': stu('ext_student4@university.edu'),
        'referring_counselor_id': p_chona,
        'referred_to_id': None,
        'referred_to_type': 'PSYCHIATRY',
        'referral_type': 'EXTERNAL',
        'reason': 'Bipolar II confirmed. Mood stabilizer needed. Lamotrigine prescription requires psychiatric monitoring.',
        'status': 'ACCEPTED',
        'urgency': 'urgent',
        'warm_handoff_completed': True,
        'provider_acknowledgment_date': H(45),
        'notes': 'Psychiatrist Dr. [Name] confirmed. Lamotrigine 25mg started. Monthly monitoring ongoing.',
        'created_at': H(52), 'updated_at': H(45),
    },
    {
        'case_id': None,
        'student_id': sP_wendy,
        'referring_counselor_id': p_csp,
        'referred_to_id': None,
        'referred_to_type': 'PSYCHIATRY',
        'referral_type': 'EXTERNAL',
        'reason': 'Medical student with severe anxiety and burnout. Referral for evaluation of possible ADHD + anxiety disorder. Medication consideration.',
        'status': 'SUBMITTED',
        'urgency': 'routine',
        'warm_handoff_completed': False,
        'provider_acknowledgment_date': None,
        'notes': None,
        'created_at': H(3), 'updated_at': H(3),
    },
    {
        'case_id': None,
        'student_id': sP_sara,
        'referring_counselor_id': c_daye,
        'referred_to_id': p_bon,
        'referred_to_type': 'PSYCHOLOGIST',
        'referral_type': 'INTERNAL',
        'reason': 'Nursing student presenting with test anxiety and panic attacks ahead of NLE. Escalating to psychology services for CBT + medication evaluation.',
        'status': 'SUBMITTED',
        'urgency': 'routine',
        'warm_handoff_completed': False,
        'provider_acknowledgment_date': None,
        'notes': 'Awaiting Dr. Bon Aquino availability.',
        'created_at': H(5), 'updated_at': H(5),
    },
    {
        'case_id': None,
        'student_id': sP_leo,
        'referring_counselor_id': c_bia,
        'referred_to_id': p_shel,
        'referred_to_type': 'PSYCHOLOGIST',
        'referral_type': 'INTERNAL',
        'reason': 'Accountancy student referred from counseling. PHQ-9 increased to 14. Persistent burnout symptoms not responding to counseling interventions alone.',
        'status': 'ACCEPTED',
        'urgency': 'routine',
        'warm_handoff_completed': True,
        'provider_acknowledgment_date': H(10),
        'notes': 'Dr. Shel Macaraeg accepted. First psych session scheduled.',
        'created_at': H(15), 'updated_at': H(10),
    },
    {
        'case_id': None,
        'student_id': sP_vince,
        'referring_counselor_id': p_csp,
        'referred_to_id': None,
        'referred_to_type': 'LEGAL_AID',
        'referral_type': 'EXTERNAL',
        'reason': 'Law student dealing with academic integrity case proceedings. Referral to university legal aid for student rights guidance alongside psychological support.',
        'status': 'SUBMITTED',
        'urgency': 'routine',
        'warm_handoff_completed': False,
        'provider_acknowledgment_date': None,
        'notes': None,
        'created_at': H(7), 'updated_at': H(7),
    },
]
db.referrals.insert_many(referral_records)
print(f"✅ {len(referral_records)} referral records inserted\n")

# ══════════════════════════════════════════════════════════════════════════════
# STEP 9 — Monthly PERMA/EMA snapshots (12 months for trend analytics)
# ══════════════════════════════════════════════════════════════════════════════

# Students with PERMA tracking across the academic year
_perma_students = [
    (s1,        'ema_emma',   ['Languishing','Surviving','Surviving','Flourishing','Thriving','Flourishing','Thriving']),
    (s2,        'ema_mark',   ['Struggling','Struggling','Languishing','Surviving','Surviving','Flourishing','Surviving']),
    (s5,        'ema_sofia',  ['Struggling','Languishing','Languishing','Surviving','Flourishing','Flourishing','Thriving']),
    (s6,        'ema_james',  ['Struggling','Struggling','Struggling','Languishing','Languishing','Surviving','Surviving']),
    (sP_leo,    'ema_leo_aq', ['Struggling','Surviving','Surviving','Flourishing','Flourishing','Thriving']),
    (sP_ella,   'ema_ella',   ['Languishing','Surviving','Surviving','Flourishing','Flourishing']),
    (sP_mia,    'ema_mia',    ['Surviving','Flourishing','Thriving']),
    (sP_alec,   'ema_alec',   ['Languishing','Surviving','Flourishing']),
    (sP_carla,  'ema_carla',  ['Struggling','Languishing','Surviving','Flourishing']),
    (sP_iris,   'ema_iris',   ['Surviving','Flourishing','Thriving']),
    (sP_jake,   'ema_jake',   ['Surviving','Surviving','Flourishing']),
    (sP_kim,    'ema_kim',    ['Languishing','Surviving','Thriving']),
    (sP_neil,   'ema_neil',   ['Flourishing','Thriving','Thriving']),
    (sP_ola,    'ema_ola',    ['Struggling','Languishing','Surviving','Surviving']),
    (sP_paz,    'ema_paz',    ['Surviving','Surviving','Flourishing']),
    (sP_quinn,  'ema_quinn',  ['Languishing','Surviving','Flourishing','Thriving']),
    (sP_rex,    'ema_rex',    ['Surviving','Flourishing']),
    (sP_sara,   'ema_sara',   ['Struggling','Languishing','Surviving']),
    (sP_tim,    'ema_tim',    ['Languishing','Surviving','Flourishing']),
    (sP_uma,    'ema_uma',    ['Surviving','Flourishing','Thriving']),
]

# Spread entries across the academic year (Aug 2025 - Jul 2026)
_perma_months = [
    (2025, 8), (2025, 9), (2025, 10), (2025, 11), (2025, 12),
    (2026, 1), (2026, 2), (2026, 3), (2026, 4), (2026, 5), (2026, 6), (2026, 7),
]

perma_bulk = []
for student_id, username, labels in _perma_students:
    n = len(labels)
    # Space labels across the last n months
    months_for_student = _perma_months[-n:]
    for (yr, mo), label in zip(months_for_student, labels):
        entry_dt = dt(yr, mo, rng.randint(1, 25), 8)
        perma_bulk.append({
            'mhbot_username': username,
            'perma_label': label,
            'entry_date': entry_dt,
            'raw_date': entry_dt.isoformat(),
            'student_user_id': student_id,
            'saved_at': datetime.utcnow(),
        })
        db.perma_history.insert_one({'username': username, 'perma_label': label, 'date': entry_dt})

    # Update user's latest PERMA
    if labels:
        db.users.update_one({'_id': student_id}, {'$set': {
            'perma_latest_label': labels[-1],
            'perma_latest_date': months_for_student[-1] and dt(months_for_student[-1][0], months_for_student[-1][1], 15).isoformat(),
            'perma_synced_at': datetime.utcnow(),
        }})

if perma_bulk:
    db.perma_snapshots.insert_many(perma_bulk)

print(f"✅ {len(perma_bulk)} PERMA/EMA snapshots inserted\n")

# ══════════════════════════════════════════════════════════════════════════════
# STEP 10 — All notification types (unread + read mix)
# ══════════════════════════════════════════════════════════════════════════════

def notif(target, ntype, msg, case_id=None, risk=None, read=False, days_ago=0):
    doc = {
        'target_user_id': str(target),
        'type': ntype,
        'message': msg,
        'read': read,
        'created_at': H(days_ago) if days_ago else datetime.utcnow(),
        'updated_at': H(days_ago) if days_ago else datetime.utcnow(),
    }
    if case_id: doc['case_id'] = str(case_id)
    if risk:    doc['risk_level'] = risk
    db.notifications.insert_one(doc)

# Admin/DPO — system notifications
notif(admin_id, 'SYSTEM_ANNOUNCEMENT', 'CPS system updated to version 2.1.0. New analytics dashboard available.', read=True, days_ago=30)
notif(admin_id, 'SYSTEM_ANNOUNCEMENT', 'Scheduled maintenance tonight 11 PM–1 AM. Save your work.', read=True, days_ago=7)
notif(dpo_id,   'SYSTEM_ANNOUNCEMENT', 'Monthly data audit report is ready for download.', read=False, days_ago=1)
notif(dpo_id,   'SYSTEM_ANNOUNCEMENT', 'Data retention policy review required — 3 cases exceed retention period.', read=False, days_ago=3)

# Staff — pending requests
notif(staff_id, 'APPOINTMENT_REQUESTED', '7 new intake appointment requests are pending assignment.', read=False, days_ago=0)
notif(staff_id, 'APPOINTMENT_REQUESTED', f'Walk-in student registered at the front desk. Intake queue.', read=False, days_ago=0)
notif(staff_id, 'CASE_ASSIGNED',         'New case CPS-2025-039 (Josh Santos) assigned to counselor.', read=True, days_ago=15)
notif(staff_id, 'NO_SHOW_ALERT',         'Andre Villanueva (CPS-2025-025) — third consecutive no-show. Auto-close protocol initiated.', read=True, days_ago=32, case_id=get_case(25))

# Counselors — case and appointment notifications
notif(c_rose_t, 'APPOINTMENT_UPCOMING',  'Reminder: Iris Dela Rosa — tomorrow at 9:00 AM.', read=False, days_ago=0)
notif(c_rose_t, 'CASE_ASSIGNED',         'New case assigned: Lia Flores (CPS-2025-040).', read=True, days_ago=14, case_id=get_case(40))
notif(c_bia,    'APPOINTMENT_UPCOMING',  'Reminder: Migs Fernandez — today at 1:00 PM. Closure session.', read=False, days_ago=0)
notif(c_bia,    'RESCHEDULE_REQUESTED',  'Migs Fernandez requested to reschedule appointment (presentation conflict).', read=True, days_ago=22, case_id=get_case(29))
notif(c_chelly, 'APPOINTMENT_UPCOMING',  'Tomorrow: Trisha Morales session at 10:00 AM.', read=False, days_ago=0)
notif(c_chelly, 'RESCHEDULE_PROPOSED',   'You proposed a new time for Pau Aguilar. Awaiting student approval.', read=True, days_ago=14)
notif(c_daye,   'APPOINTMENT_UPCOMING',  'JC Reyes — reschedule approval pending. Session proposed for 3 days from now.', read=False, days_ago=1)
notif(c_csc,    'CASE_ASSIGNED',         'New case: Kaye Lim (CPS-2025-031). ADHD + anxiety. Review intake notes.', read=True, days_ago=40, case_id=get_case(31))
notif(c_csc,    'APPOINTMENT_UPCOMING',  'Kaye Lim — tomorrow 9:00 AM. ADHD psych eval feedback session.', read=False, days_ago=0)

# Psychologists — high-risk and referral notifications
notif(p_daryl, 'CRISIS_ALERT',           'CRITICAL: Marco Reyes (CPS-2025-021) — PHQ-9=20. Passive SI. Safety plan active. Immediate review.', read=True, days_ago=62, case_id=get_case(21), risk='RED')
notif(p_daryl, 'APPOINTMENT_UPCOMING',   'Marco Reyes — today at 1:00 PM. RED risk follow-up.', read=False, days_ago=0)
notif(p_daryl, 'NO_SHOW_ALERT',          'Hannah Dela Cruz — 2nd consecutive no-show. Warning issued. (CPS-2025-028)', read=True, days_ago=33, case_id=get_case(28))
notif(p_bon,   'CRISIS_ALERT',           'RED: Jasmine Torres (CPS-2025-022) — Anorexia + MDD. Medical monitoring active.', read=True, days_ago=60, case_id=get_case(22), risk='RED')
notif(p_bon,   'REFERRAL_RECEIVED',      'Referral received: Sara Aguilar — test anxiety + panic attacks. Accept or reassign.', read=False, days_ago=5)
notif(p_shel,  'CASE_ASSIGNED',          'New case: Ryan Santos (CPS-2025-023). Severe OCD. Review ERP plan.', read=True, days_ago=55, case_id=get_case(23))
notif(p_shel,  'REFERRAL_RECEIVED',      'Referral received from Counsellor Bia Alcantara: Leo Aquino — burnout + depression.', read=False, days_ago=10)
notif(p_jenny, 'REFERRAL_RECEIVED',      'Warm handoff complete: Ina Santos (CPS-2025-030) from Rose Tolentino. Review attached case notes.', read=True, days_ago=47, case_id=get_case(30))
notif(p_jenny, 'APPOINTMENT_UPCOMING',   'Ina Santos — tomorrow at 10:00 AM. Consolidation session.', read=False, days_ago=0)
notif(p_chona, 'CRISIS_ALERT',           'RED: Bea Cruz (CPS-2025-024) — Bipolar II post-hypomanic episode. Safety plan active.', read=True, days_ago=52, case_id=get_case(24), risk='RED')
notif(p_chona, 'APPOINTMENT_UPCOMING',   'Bea Cruz — today at 2:00 PM. Mood monitoring session.', read=False, days_ago=0)
notif(p_niko,  'NO_SHOW_ALERT',          'Andre Villanueva — 3rd consecutive no-show. Case auto-closed per CPS protocol.', read=True, days_ago=37, case_id=get_case(25))
notif(p_csp,   'REFERRAL_COMPLETED',     'Referral to Legal Aid submitted for Vince Dela Cruz.', read=False, days_ago=7)

# IC — intake notifications
notif(ic_julse,  'APPOINTMENT_UPCOMING', 'Walk-in intake — this morning at 9:00 AM. Ella Garcia.', read=False, days_ago=0)
notif(ic_archie, 'APPOINTMENT_UPCOMING', 'Fred Tan intake — today at 11:00 AM.', read=False, days_ago=0)
notif(ic_mars,   'APPOINTMENT_UPCOMING', 'Walk-in student — this afternoon at 3:00 PM. Harold Santos.', read=False, days_ago=0)

# Students
notif(s1,        'APPOINTMENT_CONFIRMED', 'Your counseling appointment with Rose Tolentino is confirmed for today at 9:00 AM.', read=True, days_ago=1)
notif(s6,        'APPOINTMENT_UPCOMING',  'Reminder: Your appointment with Dr. Daryl Bautista is TODAY at 10:00 AM.', read=False, days_ago=0)
notif(s12,       'APPOINTMENT_UPCOMING',  'Your session with Dr. Bon Aquino is TODAY at 11:00 AM.', read=False, days_ago=0)
notif(sP_ella,   'APPOINTMENT_CONFIRMED', 'Your intake appointment at CPS is confirmed for today at 9:00 AM. Please arrive 5 minutes early.', read=False, days_ago=0)
notif(sP_fred,   'APPOINTMENT_CONFIRMED', 'Your intake appointment with Archie Fernandez is confirmed for today at 11:00 AM.', read=False, days_ago=0)
notif(sP_harold, 'APPOINTMENT_CONFIRMED', 'Walk-in intake registered. Your appointment is at 3:00 PM today.', read=False, days_ago=0)
notif(sP_donnie, 'APPOINTMENT_CANCELLED', 'Your appointment has been cancelled per your request. You may rebook anytime.', read=True, days_ago=10)
notif(sP_iris,   'APPOINTMENT_UPCOMING',  'Reminder: Your counseling session with Rose Tolentino is tomorrow at 9:00 AM.', read=False, days_ago=0)
notif(sP_mia,    'APPOINTMENT_UPCOMING',  'Your online session with Bia Alcantara is tomorrow at 11:00 AM.', read=False, days_ago=0)
notif(stu('ext_student5@university.edu'), 'CASE_CLOSED_NO_SHOW',
      'Your CPS case has been closed due to 3 consecutive missed appointments. Contact CPS at local 312 to re-open.', read=False, days_ago=37, case_id=get_case(25))

print("✅ All notification types inserted\n")

# ══════════════════════════════════════════════════════════════════════════════
# STEP 11 — Announcements (monthly schedule, events, notices)
# ══════════════════════════════════════════════════════════════════════════════
more_announcements = [
    {'title': 'CPS August 2026 Schedule — Back to School Counseling Blitz',
     'body': 'The CPS office will offer extended counseling hours (7 AM – 7 PM) during the first two weeks of August 2026 to accommodate first-year student intake appointments. Walk-ins welcome.',
     'event_type': 'notice', 'pinned': True, 'is_active': True,
     'created_by': admin_id, 'created_at': H(2)},

    {'title': 'Free Mental Health Screening — PHQ-9 & GAD-7 Walk-In',
     'body': 'No appointment needed. Visit the CPS office any weekday from 9 AM – 12 PM to complete a free confidential mental health screening. Results provided immediately.',
     'event_type': 'event', 'pinned': False, 'is_active': True,
     'created_by': admin_id, 'created_at': H(5)},

    {'title': 'Counseling Session Reminder: Online Platform Migration',
     'body': 'Effective August 1, all online sessions will migrate to Google Meet (from Zoom). Links will be sent automatically 24 hours before your session.',
     'event_type': 'info', 'pinned': False, 'is_active': True,
     'created_by': dpo_id, 'created_at': H(8)},

    {'title': 'Thesis Defense Season — Priority Scheduling Available',
     'body': 'Students defending their thesis between July–September 2026 may request priority counseling scheduling through the online portal or by visiting the CPS office.',
     'event_type': 'notice', 'pinned': True, 'is_active': True,
     'created_by': admin_id, 'created_at': H(12)},

    {'title': 'Crisis Hotline Numbers — Save These Contacts',
     'body': 'In Touch Crisis Line: 0917-899-8727 (24/7). HOPELINE: 02-8804-4673. Natasha Goulbourn Foundation: 0917-558-4673. University CPS Emergency Portal: cps.dlsu.edu.ph/emergency',
     'event_type': 'info', 'pinned': True, 'is_active': True,
     'created_by': admin_id, 'created_at': H(15)},

    {'title': 'New: Online Consent Form — Complete Before Your Appointment',
     'body': 'Students must complete the online consent form before their first appointment. Visit the student portal to complete it in 5 minutes.',
     'event_type': 'info', 'pinned': False, 'is_active': True,
     'created_by': admin_id, 'created_at': H(20)},

    {'title': 'Peer Supporter Program — Applications Open',
     'body': 'CPS is recruiting student peer supporters. Responsibilities include facilitating peer wellness circles and making referrals. Apply through the student affairs office by July 31.',
     'event_type': 'event', 'pinned': False, 'is_active': True,
     'created_by': dpo_id, 'created_at': H(25)},

    {'title': '[PAST EVENT] Anxiety Management Psychoeducation Session Recap',
     'body': '87 students attended last month\'s psychoeducation session on managing academic anxiety. Recording available on the CPS portal under Resources.',
     'event_type': 'info', 'pinned': False, 'is_active': True,
     'created_by': admin_id, 'created_at': H(40)},
]
db.announcements.insert_many(more_announcements)
print(f"✅ {len(more_announcements)} announcements inserted\n")

# ══════════════════════════════════════════════════════════════════════════════
# STEP 12 — Screening assessments for new students
# ══════════════════════════════════════════════════════════════════════════════
# Risk distribution for realistic analytics: ~15% RED, 30% YELLOW, 55% GREEN
_assessment_students = [
    (sP_ella,  'RED',    0.78, {'phq1':{'score':3},'phq2':{'score':3},'gad1':{'score':2},'gad2':{'score':3}}),
    (sP_fred,  'YELLOW', 0.52, {'phq1':{'score':2},'phq2':{'score':1},'gad1':{'score':2},'gad2':{'score':2}}),
    (sP_gina,  'GREEN',  0.25, {'phq1':{'score':1},'phq2':{'score':0},'gad1':{'score':1},'gad2':{'score':1}}),
    (sP_harold,'RED',    0.80, {'phq1':{'score':3},'phq2':{'score':3},'gad1':{'score':3},'gad2':{'score':2}}),
    (sP_iris,  'GREEN',  0.20, {'phq1':{'score':0},'phq2':{'score':1},'gad1':{'score':1},'gad2':{'score':1}}),
    (sP_jake,  'YELLOW', 0.48, {'phq1':{'score':2},'phq2':{'score':1},'gad1':{'score':1},'gad2':{'score':2}}),
    (sP_kim,   'GREEN',  0.18, {'phq1':{'score':1},'phq2':{'score':0},'gad1':{'score':0},'gad2':{'score':1}}),
    (sP_leo,   'YELLOW', 0.55, {'phq1':{'score':2},'phq2':{'score':2},'gad1':{'score':2},'gad2':{'score':1}}),
    (sP_mia,   'GREEN',  0.22, {'phq1':{'score':1},'phq2':{'score':1},'gad1':{'score':0},'gad2':{'score':0}}),
    (sP_neil,  'GREEN',  0.15, {'phq1':{'score':0},'phq2':{'score':0},'gad1':{'score':1},'gad2':{'score':0}}),
    (sP_ola,   'RED',    0.71, {'phq1':{'score':3},'phq2':{'score':2},'gad1':{'score':2},'gad2':{'score':3}}),
    (sP_paz,   'YELLOW', 0.45, {'phq1':{'score':2},'phq2':{'score':1},'gad1':{'score':2},'gad2':{'score':1}}),
    (sP_quinn, 'GREEN',  0.28, {'phq1':{'score':1},'phq2':{'score':1},'gad1':{'score':1},'gad2':{'score':1}}),
    (sP_rex,   'YELLOW', 0.50, {'phq1':{'score':2},'phq2':{'score':2},'gad1':{'score':1},'gad2':{'score':1}}),
    (sP_sara,  'RED',    0.72, {'phq1':{'score':3},'phq2':{'score':2},'gad1':{'score':3},'gad2':{'score':2}}),
]
assessment_docs = []
for student_id, risk, raw_score, responses in _assessment_students:
    assessment_docs.append({
        'student_id': student_id,
        'assigned_ic_id': rng.choice(ICS),
        'case_id': None,
        'risk_level': risk,
        'raw_score': raw_score,
        'responses': responses,
        'status': 'SUBMITTED',
        'ic_notes': None,
        'created_at': H(rng.randint(5, 30)),
        'updated_at': H(rng.randint(1, 5)),
    })
db.screening_assessments.insert_many(assessment_docs)
print(f"✅ {len(assessment_docs)} screening assessments inserted\n")

# ══════════════════════════════════════════════════════════════════════════════
# STEP 13 — Reminders for upcoming appointments
# ══════════════════════════════════════════════════════════════════════════════
upcoming_appts = list(db.appointments.find({
    'status': 'CONFIRMED',
    'scheduled_start': {'$gte': datetime.utcnow(), '$lte': F(3)},
}).limit(20))

reminder_docs = []
for a in upcoming_appts:
    reminder_docs.append({
        'appointment_id': a['_id'],
        'student_id': a['student_id'],
        'counselor_id': a.get('counselor_id'),
        'reminder_type': '24_HOUR',
        'send_at': a['scheduled_start'] - timedelta(hours=24),
        'sent': False,
        'channel': rng.choice(['EMAIL', 'SMS', 'PORTAL']),
        'created_at': H(1),
        'updated_at': H(1),
    })
    # Add 1-hour reminder too
    reminder_docs.append({
        'appointment_id': a['_id'],
        'student_id': a['student_id'],
        'counselor_id': a.get('counselor_id'),
        'reminder_type': '1_HOUR',
        'send_at': a['scheduled_start'] - timedelta(hours=1),
        'sent': False,
        'channel': 'PORTAL',
        'created_at': H(1),
        'updated_at': H(1),
    })

if reminder_docs:
    db.reminders.insert_many(reminder_docs)
print(f"✅ {len(reminder_docs)} reminders inserted for upcoming appointments\n")

# ══════════════════════════════════════════════════════════════════════════════
# STEP 14 — Cases for production students (to fill dashboards and reports)
# ══════════════════════════════════════════════════════════════════════════════
# Get current max case counter
existing_nums = []
for c in db.cases.find({'case_number': {'$exists': True}}, {'case_number': 1}):
    try: existing_nums.append(int(c['case_number'].split('-')[-1]))
    except: pass
case_ctr = [max(existing_nums) if existing_nums else 40]

def new_case(student_id, counselor_id, risk, status, phq9, gad7, diagnoses, plan, concern, days_ago=30, closed_days=None):
    case_ctr[0] += 1
    doc = {
        'case_number': f'CPS-2025-{case_ctr[0]:03d}',
        'student_id': student_id, 'counselor_id': counselor_id,
        'status': status, 'risk_level': risk,
        'primary_concern': concern, 'diagnoses': diagnoses, 'treatment_plan': plan,
        'phq9_score': phq9, 'gad7_score': gad7,
        'phq9_date': H(days_ago + 2).strftime('%Y-%m-%d'),
        'gad7_date': H(days_ago + 2).strftime('%Y-%m-%d'),
        'session_count': rng.randint(2, 8),
        'check_ins': [], 'referrals': [],
        'created_at': H(days_ago), 'updated_at': H(rng.randint(1, 7)),
        'closed_at': H(closed_days) if closed_days else None,
        'closure_reason': 'Goals achieved. Mutual agreement to close.' if closed_days else None,
    }
    return db.cases.insert_one(doc).inserted_id

# Active cases for new students (fills counselor workload analytics)
new_case(sP_ella,  p_daryl,  'RED',    'ACTIVE', 18, 15, ['F32.2 Major Depressive Disorder', 'F41.1 GAD'],
         'CBT + safety plan. Psychiatric eval pending.', 'Severe depression and anxiety. Engineering first-year adjustment failure.', 14)
new_case(sP_fred,  c_csc,    'YELLOW', 'ACTIVE', 10, 13, ['F41.1 Generalized Anxiety Disorder'],
         'CBT for GAD. Worry postponement. Academic skills coaching.', 'GAD with academic performance anxiety ahead of engineering board exams.', 20)
new_case(sP_gina,  c_chelly, 'GREEN',  'ACTIVE',  6,  8, ['F43.20 Adjustment Disorder'],
         'Supportive counseling. Engineering studio workload management.', 'Adjustment difficulties first semester — heavy workload, sleep issues.', 25)
new_case(sP_harold,p_daryl,  'RED',    'ACTIVE', 19, 14, ['F32.2 MDD Severe', 'Z91.5 Self-Harm History'],
         'Safety plan active. Weekly sessions. Parental notification with consent.', 'Severe depression + self-harm history disclosed at walk-in. First-year. Crisis protocol.', 0)
new_case(sP_iris,  c_rose_t, 'GREEN',  'ACTIVE',  5,  6, ['F43.20 Adjustment Disorder'],
         'Communication skills and social confidence building.', 'Shyness and difficulty adjusting to university social environment.', 22)
new_case(sP_jake,  p_niko,   'YELLOW', 'ACTIVE',  9, 11, ['F40.10 Social Anxiety Disorder'],
         'CBT for social anxiety. Exposure hierarchy for class recitations.', 'Social anxiety affecting participation in law school recitations and moot court.', 18)
new_case(sP_kim,   c_daye,   'GREEN',  'ACTIVE',  4,  5, ['Z55.3 Academic Underachievement'],
         'Study skills. Philosophy thesis writing support.', 'Philosophy major struggling with thesis writing — existential anxiety about topic.', 15)
new_case(sP_leo,   p_shel,   'YELLOW', 'ACTIVE', 13, 10, ['F43.10 PTSD', 'F32.0 MDD Mild'],
         'EMDR therapy for financial trauma. Depression management.', 'Accountancy student. Father\'s business collapsed. Financial trauma + survivor guilt.', 12)
new_case(sP_mia,   c_bia,    'GREEN',  'ACTIVE',  6,  7, ['F43.23 Adjustment Disorder'],
         'Supportive therapy. MFI career anxiety management.', 'Business student — anxiety about future in finance after seeing seniors struggle.', 18)
new_case(sP_neil,  c_rose_t, 'GREEN',  'CLOSED',  3,  4, ['F43.20 Adjustment Disorder'],
         'Brief supportive counseling. Goals achieved.', 'Mild adjustment difficulty — resolved within 4 sessions.', 40, closed_days=8)
new_case(sP_ola,   p_jenny,  'RED',    'ACTIVE', 16, 12, ['F32.1 MDD Moderate', 'F41.1 GAD'],
         'CBT + anti-depressant referral. Weekly sessions. Accountancy board prep stress.', 'Moderate depression. Accountancy 4th year. Failing mock board exams despite studying.', 16)
new_case(sP_paz,   c_daye,   'YELLOW', 'ACTIVE',  8, 11, ['F41.1 GAD', 'G47.00 Insomnia'],
         'CBT-I for insomnia. Anxiety management for biology lab coursework.', 'Biology student. Anxiety and insomnia. Pre-med track stress is overwhelming.', 20)
new_case(sP_quinn, p_csp,    'YELLOW', 'ACTIVE', 10,  9, ['F41.2 Mixed Anxiety-Depression'],
         'Chemistry thesis panic. CBT. Writing exposure therapy.', 'Chemistry 3rd year. Thesis writer\'s block. Mixed anxiety-depression.', 18)
new_case(sP_rex,   c_bia,    'GREEN',  'ACTIVE',  5,  7, ['F43.20 Adjustment Disorder'],
         'Career counseling. Math major anxiety about job market.', 'Math graduate transitioning to data science. Adjustment and direction anxiety.', 14)
new_case(sP_sara,  c_chelly, 'YELLOW', 'ACTIVE',  9, 14, ['F40.218 Test Anxiety', 'F41.1 GAD'],
         'CBT for test anxiety. NLE preparation coping plan.', 'Nursing student — severe NLE performance anxiety. Blanking on mock exams.', 15)
new_case(sP_tim,   c_csc,    'GREEN',  'ACTIVE',  6,  6, ['F43.20 Adjustment Disorder'],
         'Nursing workload management. Study skills.',  'Nursing 2nd year. Heavy clinical load. Feeling overwhelmed.', 10)
new_case(sP_uma,   p_bon,    'YELLOW', 'ACTIVE', 11, 13, ['F41.1 GAD', 'Z73.0 Burnout'],
         'CBT for teacher anxiety. Classroom management confidence building.', 'Education student. Teaching practicum anxiety — fear of losing control of classroom.', 12)
new_case(sP_vince, p_csp,    'YELLOW', 'ACTIVE', 12, 10, ['F43.10 PTSD', 'F32.0 MDD Mild'],
         'Trauma-informed therapy. Resilience building. Legal proceedings support.', 'Law student. Academic misconduct proceeding (false accusation). PTSD from the process.', 14)
new_case(sP_wendy, p_jenny,  'YELLOW', 'ACTIVE', 11, 14, ['F41.1 GAD', 'F45.20 Burnout'],
         'Medical school burnout therapy. ADHD eval referral. Mindfulness.', 'Medicine 2nd year. Extreme study demands. Possible ADHD. Burnout and GAD.', 10)
new_case(sP_xander,ic_mars,  'GREEN',  'ACTIVE',  3,  4, ['Z55.3 Academic Underachievement'],
         'Freshman orientation counseling. Study habits.', 'CS 1st year. Struggling with first college exams. High school to university transition.', 8)

print(f"✅ Production student cases created (total now: {db.cases.count_documents({})})\n")

# ══════════════════════════════════════════════════════════════════════════════
# STEP 15 — Update session counts on all cases
# ══════════════════════════════════════════════════════════════════════════════
for row in db.appointments.aggregate([
    {'$match': {'status': {'$in': ['COMPLETED', 'CONFIRMED', 'FOLLOW_UP']}, 'case_id': {'$ne': None}}},
    {'$group': {'_id': '$case_id', 'count': {'$sum': 1}}},
]):
    if row['_id']:
        db.cases.update_one({'_id': row['_id']}, {'$set': {'session_count': row['count']}})
print("✅ Session counts refreshed\n")

# ══════════════════════════════════════════════════════════════════════════════
# FINAL VERIFICATION
# ══════════════════════════════════════════════════════════════════════════════
print("=" * 65)
print("PRODUCTION SEED — FINAL DATABASE STATE")
print("=" * 65)

for col in ['users', 'cases', 'intakes', 'appointments', 'session_notes',
            'safety_plans', 'referrals', 'notifications', 'announcements',
            'perma_snapshots', 'screening_assessments', 'missed_appointment_tracker',
            'consent_records', 'reminders']:
    print(f"  {col:<36} {db[col].count_documents({}):>5}")

# Analytics readiness checks
from bson.son import SON
print()
print("─" * 65)
print("ANALYTICS READINESS")
print("─" * 65)

monthly = list(db.appointments.aggregate([
    {'$match': {'scheduled_start': {'$exists': True}}},
    {'$group': {'_id': {'$dateToString': {'format': '%Y-%m', 'date': '$scheduled_start'}}, 'count': {'$sum': 1}}},
    {'$sort': SON([('_id', 1)])},
]))
print(f"\nAppointments by month ({len(monthly)} months with data):")
for m in monthly:
    bar = '█' * min(m['count'] // 3, 25)
    print(f"  {m['_id']}  {bar:25s}  {m['count']:3d}")

print()
statuses = list(db.appointments.aggregate([
    {'$group': {'_id': '$status', 'count': {'$sum': 1}}},
    {'$sort': SON([('count', -1)])},
]))
print("Appointment statuses:")
for s in statuses: print(f"  {s['_id']:<30} {s['count']:>5}")

print()
methods = list(db.appointments.aggregate([
    {'$match': {'method': {'$exists': True}}},
    {'$group': {'_id': '$method', 'count': {'$sum': 1}}},
]))
print("Methods (F2F vs Online):")
for m in methods: print(f"  {m['_id']:<20} {m['count']:>5}")

print()
colleges = list(db.users.aggregate([
    {'$match': {'role': 'STUDENT', 'college': {'$exists': True, '$ne': None}}},
    {'$group': {'_id': '$college', 'count': {'$sum': 1}}},
    {'$sort': SON([('count', -1)])},
]))
print("Students by college:")
for c in colleges: print(f"  {c['_id']:<30} {c['count']:>4}")

print()
perma = list(db.perma_snapshots.aggregate([
    {'$group': {'_id': '$perma_label', 'count': {'$sum': 1}}},
    {'$sort': SON([('count', -1)])},
]))
print("PERMA/EMA label distribution:")
for p in perma: print(f"  {p['_id']:<20} {p['count']:>4}")

today_count = db.appointments.count_documents({
    'scheduled_start': {'$gte': datetime.utcnow().replace(hour=0, minute=0, second=0),
                        '$lte': datetime.utcnow().replace(hour=23, minute=59, second=59)},
})
upcoming_count = db.appointments.count_documents({
    'status': 'CONFIRMED',
    'scheduled_start': {'$gte': datetime.utcnow()},
})
notif_unread = db.notifications.count_documents({'read': False})

print(f"""
─────────────────────────────────────────────────────────────────
DASHBOARD READINESS
  Today's appointments:     {today_count:>4}
  Upcoming confirmed:       {upcoming_count:>4}
  Unread notifications:     {notif_unread:>4}
  Active cases:             {db.cases.count_documents({'status': 'ACTIVE'}):>4}
  RED risk cases:           {db.cases.count_documents({'risk_level': 'RED'}):>4}
  Pending referrals:        {db.referrals.count_documents({'status': 'SUBMITTED'}):>4}
  REQUESTED appointments:   {db.appointments.count_documents({'status': 'REQUESTED'}):>4}
─────────────────────────────────────────────────────────────────
ROLE LOGIN GUIDE
  admin@university.edu      admin123    → Admin dashboard, full analytics
  dpo@university.edu        dpo123      → DPO analytics, data reports
  staff@university.edu      staff123    → Appointment queue, requests
  cm@university.edu         cm123       → Case manager view
  rose.t@university.edu     roset123    → Counselor — 5 active cases
  daryl@university.edu      daryl123    → Psychologist — RED risk cases
  julse@university.edu      julse123    → IC — intake queue, today walk-in
  student1@university.edu   student123  → Student — Emma Johnson (active case)
  student6@university.edu   student303  → Student — James Wilson (RED risk)
  ext_student1@university.edu ext101    → Student — Marco Reyes (MDD+PTSD, safety plan)
  ext_student4@university.edu ext104    → Student — Bea Cruz (Bipolar II)
  prod001 (abautista25)     prod001     → New student (no appointments)
  inactive_old@dlsu.edu.ph  prod030     → Inactive/disabled account
═════════════════════════════════════════════════════════════════
✅  PRODUCTION SEED COMPLETE — SYSTEM READY FOR DEMO / UAT
═════════════════════════════════════════════════════════════════
""")
