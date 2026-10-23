#!/usr/bin/env python3
"""
CPS Demo Seed — simple, predictable accounts for demonstrations.

Creates easy-to-remember demo accounts (Demo1234!) without wiping the
database. Safe to re-run — all inserts are upserted by email.

Usage:
    python3 scripts/seed_demo.py

Demo credentials (all passwords: Demo1234!):
    admin@dlsu.edu.ph        ADMIN
    dpo@dlsu.edu.ph          DPO
    ic1@dlsu.edu.ph          IC (Intake Counselor)
    ic2@dlsu.edu.ph          IC
    counselor1@dlsu.edu.ph   COUNSELOR
    counselor2@dlsu.edu.ph   COUNSELOR
    counselor3@dlsu.edu.ph   COUNSELOR
    casemanager@dlsu.edu.ph  CASE_MANAGER
    staff@dlsu.edu.ph        STAFF
    psych@dlsu.edu.ph        PSYCHOLOGIST
    student1@dlsu.edu.ph     STUDENT (active case, stable)
    student2@dlsu.edu.ph     STUDENT (active case, declining)
    student3@dlsu.edu.ph     STUDENT (crisis case, high-risk)
    student4@dlsu.edu.ph     STUDENT (improving / recovery)
    student5@dlsu.edu.ph     STUDENT (completed case)
    student6@dlsu.edu.ph     STUDENT (new intake pending)
    student7@dlsu.edu.ph     STUDENT (no case yet)
    student8@dlsu.edu.ph     STUDENT (no case yet)
"""

import os, sys, random
from datetime import datetime, timedelta
from pathlib import Path
import bcrypt
from pymongo import MongoClient
from bson import ObjectId

# ── Load .env manually (no Flask needed) ─────────────────────────────────────
env_path = Path(__file__).parent.parent / 'backend' / '.env'
if env_path.exists():
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            os.environ.setdefault(k.strip(), v.strip())

MONGO_URI = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017')
DB_NAME   = os.environ.get('MONGODB_DB_NAME', 'cps_system_dev')

client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
try:
    client.admin.command('ping')
    print(f"✓ MongoDB OK  ({MONGO_URI}  /  {DB_NAME})\n")
except Exception as e:
    print(f"✗ MongoDB connection failed: {e}")
    sys.exit(1)

db  = client[DB_NAME]
rng = random.Random(42)
now = datetime.utcnow()

DEMO_PW = bcrypt.hashpw(b'Demo1234!', bcrypt.gensalt()).decode()

def H(days, h=9, m=0):
    """Past datetime, weekday-safe."""
    dt = (now - timedelta(days=days)).replace(hour=h, minute=m, second=0, microsecond=0)
    while dt.weekday() >= 5:
        dt -= timedelta(days=1)
    return dt

def F(days, h=9, m=0):
    """Future datetime, weekday-safe."""
    dt = (now + timedelta(days=days)).replace(hour=h, minute=m, second=0, microsecond=0)
    while dt.weekday() >= 5:
        dt += timedelta(days=1)
    return dt

# ── Upsert user ───────────────────────────────────────────────────────────────
def upsert_user(email, first, last, role, **extra):
    doc = {
        'email': email,
        'password_hash': DEMO_PW,
        'first_name': first, 'last_name': last,
        'name': f'{first} {last}',
        'role': role,
        'is_active': True, 'is_verified': True,
        'created_at': now, 'updated_at': now,
        **extra,
    }
    result = db.users.update_one({'email': email}, {'$setOnInsert': doc}, upsert=True)
    user = db.users.find_one({'email': email})
    created = result.upserted_id is not None
    return user['_id'], created

def sid(yr_label, n):
    pfx = {'1st Year': 124, '2nd Year': 123, '3rd Year': 122, '4th Year': 121}.get(yr_label, 120)
    return f'{pfx}{n:05d}'

# ── Staff / clinical accounts ─────────────────────────────────────────────────
staff_accounts = [
    ('admin@dlsu.edu.ph',       'Admin',    'Demo',      'ADMIN'),
    ('dpo@dlsu.edu.ph',         'Diana',    'Protector', 'DPO'),
    ('ic1@dlsu.edu.ph',         'Ingrid',   'Cruz',      'IC'),
    ('ic2@dlsu.edu.ph',         'Ivan',     'Reyes',     'IC'),
    ('counselor1@dlsu.edu.ph',  'Clara',    'Santos',    'COUNSELOR'),
    ('counselor2@dlsu.edu.ph',  'Carlos',   'Navarro',   'COUNSELOR'),
    ('counselor3@dlsu.edu.ph',  'Camille',  'Dela Cruz', 'COUNSELOR'),
    ('casemanager@dlsu.edu.ph', 'Marco',    'Bautista',  'CASE_MANAGER'),
    ('staff@dlsu.edu.ph',       'Sandra',   'Flores',    'STAFF'),
    ('psych@dlsu.edu.ph',       'Pablo',    'Aquino',    'PSYCHOLOGIST'),
]

staff_ids = {}
created_count = 0
for email, first, last, role in staff_accounts:
    _id, created = upsert_user(email, first, last, role)
    staff_ids[email] = _id
    if created:
        created_count += 1

admin_id  = staff_ids['admin@dlsu.edu.ph']
ic1_id    = staff_ids['ic1@dlsu.edu.ph']
ic2_id    = staff_ids['ic2@dlsu.edu.ph']
c1_id     = staff_ids['counselor1@dlsu.edu.ph']
c2_id     = staff_ids['counselor2@dlsu.edu.ph']
c3_id     = staff_ids['counselor3@dlsu.edu.ph']
cm_id     = staff_ids['casemanager@dlsu.edu.ph']
psych_id  = staff_ids['psych@dlsu.edu.ph']

# ── Student accounts ──────────────────────────────────────────────────────────
students_data = [
    # email,                  first,     last,        college, course,               year,       id_n
    ('student1@dlsu.edu.ph', 'Maria',   'Reyes',    'CCS',   'BS Computer Science',         '3rd Year', 1),
    ('student2@dlsu.edu.ph', 'Juan',    'Santos',   'GCOE',  'BS Civil Engineering',        '2nd Year', 2),
    ('student3@dlsu.edu.ph', 'Ana',     'Garcia',   'CLA',   'AB Psychology',               '4th Year', 3),
    ('student4@dlsu.edu.ph', 'Miguel',  'Cruz',     'CCS',   'BS Information Technology',   '1st Year', 4),
    ('student5@dlsu.edu.ph', 'Sofia',   'Dela Rosa','RVRCOB','BS Accountancy',              '3rd Year', 5),
    ('student6@dlsu.edu.ph', 'Diego',   'Lim',      'COS',   'BS Biology',                  '2nd Year', 6),
    ('student7@dlsu.edu.ph', 'Isabel',  'Tan',      'CLA',   'AB Communication',            '1st Year', 7),
    ('student8@dlsu.edu.ph', 'Rafael',  'Morales',  'GCOE',  'BS Electronics Engineering',  '2nd Year', 8),
]

student_ids = {}
for email, first, last, college, course, year, n in students_data:
    _id, created = upsert_user(email, first, last, 'STUDENT',
        college=college, course=course, year_level=year,
        student_id=sid(year, n),
        contact_number=f'0917000000{n}',
        date_of_birth=f'200{n}-0{n}-1{n}',
        consent_given=True,
        consent_given_at=H(60),
        consent_version='1.0',
    )
    student_ids[email] = _id
    if created:
        created_count += 1

s = {i+1: student_ids[f'student{i+1}@dlsu.edu.ph'] for i in range(8)}
s_name = {
    s[1]: 'Maria Reyes',    s[2]: 'Juan Santos',   s[3]: 'Ana Garcia',
    s[4]: 'Miguel Cruz',    s[5]: 'Sofia Dela Rosa',s[6]: 'Diego Lim',
    s[7]: 'Isabel Tan',     s[8]: 'Rafael Morales',
}
s_email = {s[i]: f'student{i}@dlsu.edu.ph' for i in range(1, 9)}

print(f"✅ Users: {created_count} new, {len(staff_accounts)+len(students_data)-created_count} already existed")

# ── Counselor availability (Mon–Fri, 9am–5pm, next 2 weeks) ──────────────────
avail_created = 0
for cid, days in [
    (c1_id, [0,1,2,3,4]), (c2_id, [0,2,4]), (c3_id, [1,3]),
    (psych_id, [0,1,2,3,4]),
]:
    for offset in range(14):
        slot_date = now.date() + timedelta(days=offset)
        if slot_date.weekday() not in days:
            continue
        slot_dt = datetime.combine(slot_date, datetime.min.time())
        for hour in range(9, 17):
            start = slot_dt.replace(hour=hour)
            end   = start + timedelta(hours=1)
            existing = db.counselor_availability.find_one({
                'counselor_id': cid, 'start_time': start,
            })
            if not existing:
                db.counselor_availability.insert_one({
                    'counselor_id': cid,
                    'date': slot_date.isoformat(),
                    'start_time': start, 'end_time': end,
                    'is_available': True,
                    'session_method': 'in_person',
                    'created_at': now,
                })
                avail_created += 1

print(f"✅ Availability: {avail_created} new slots created")

# ── Case creation helper ──────────────────────────────────────────────────────
_case_n = [0]
def make_case(student_id, counselor_id, ic_id, status, risk, concern, issue,
              endorsed_to, days_ago, diagnoses=None):
    _case_n[0] += 1
    num = f'CPS-DEMO-{_case_n[0]:03d}'
    # Check for existing demo case for this student
    existing = db.cases.find_one({'student_id': student_id, 'case_number': {'$regex': '^CPS-DEMO-'}})
    if existing:
        return existing['_id'], False
    sname = s_name[student_id]
    doc = {
        'student_id': student_id,
        'student_name': sname,
        'client_name': sname,
        'student_email': s_email[student_id],
        'assigned_counselor_id': counselor_id,
        'intake_counselor_id': ic_id,
        'case_status': status,
        'risk_level': risk,
        'concern': concern,
        'presenting_issue': issue,
        'case_number': num,
        'endorsed_to_role': endorsed_to,
        'endorsed_at': H(days_ago),
        'endorsed_by': str(ic_id),
        'source': 'SELF_REFERRAL',
        'check_ins': [],
        'intake_interview_form': {
            'type_of_service': 'Intake Interview',
            'presenting_concern': concern,
            'triage_decision': endorsed_to,
            'risk_level': risk,
            'session_date': H(days_ago).isoformat(),
            'session_method': 'in_person',
        },
        'created_at': H(days_ago + 5),
        'updated_at': H(rng.randint(1, days_ago)),
    }
    if diagnoses:
        doc['diagnoses'] = diagnoses
    case_id = db.cases.insert_one(doc).inserted_id
    return case_id, True

cases_created = 0

# Case 1 — Maria (s1): Academic stress, stable/improving
case1_id, c1_new = make_case(s[1], c1_id, ic1_id, 'ACTIVE', 'YELLOW',
    'Academic stress, anxiety',
    'Student presents with exam anxiety and thesis deadline stress. Difficulty sleeping.',
    'COUNSELOR', 45)
if c1_new: cases_created += 1

# Case 2 — Juan (s2): Depression, declining
case2_id, c2_new = make_case(s[2], c2_id, ic1_id, 'ACTIVE', 'RED',
    'Depression, persistent low mood',
    'Student reports low mood for 6 weeks, social withdrawal, passive suicidal ideation without plan.',
    'PSYCHOLOGIST', 30, diagnoses=['Major Depressive Disorder, Moderate'])
if c2_new: cases_created += 1

# Case 3 — Ana (s3): CRISIS, high-risk
case3_id, c3_new = make_case(s[3], psych_id, ic2_id, 'ACTIVE', 'CRITICAL',
    'Suicidal ideation with plan',
    'Student disclosed active SI with specific plan. Crisis intervention initiated.',
    'PSYCHOLOGIST', 14, diagnoses=['Major Depressive Disorder, Severe'])
if c3_new: cases_created += 1

# Case 4 — Miguel (s4): Anxiety, improving
case4_id, c4_new = make_case(s[4], c1_id, ic1_id, 'ACTIVE', 'GREEN',
    'Social anxiety, adjustment',
    'First-year student experiencing social anxiety and difficulty adjusting to university life.',
    'COUNSELOR', 21)
if c4_new: cases_created += 1

# Case 5 — Sofia (s5): Completed
case5_id, c5_new = make_case(s[5], c2_id, ic2_id, 'CLOSED', 'GREEN',
    'Academic burnout',
    'Student reported burnout and exhaustion. Goals met after 8 sessions.',
    'COUNSELOR', 90)
if c5_new: cases_created += 1

# Case 6 — Diego (s6): New intake pending
case6_id, c6_new = make_case(s[6], c3_id, ic2_id, 'NEW', 'YELLOW',
    'Relationship issues, anxiety',
    'Student self-referred after difficult breakup. Reports sleep disturbance.',
    'COUNSELOR', 3)
if c6_new: cases_created += 1

print(f"✅ Cases: {cases_created} new")

# ── Session notes ─────────────────────────────────────────────────────────────
def soap_note(case_id, counselor_id, student_id, dt, subj, obj, asmt, plan, mood, risk=False):
    existing = db.session_notes.find_one({'case_id': case_id, 'session_date': dt})
    if existing:
        return
    db.session_notes.insert_one({
        'case_id': case_id, 'counselor_id': counselor_id, 'student_id': student_id,
        'student_name': s_name[student_id],
        'session_date': dt, 'session_type': 'INDIVIDUAL',
        'note_format': 'SOAP',
        'soap': {'subjective': subj, 'objective': obj, 'assessment': asmt, 'plan': plan},
        'mood_rating': mood, 'risk_flagged': risk,
        'risk_notes': 'Elevated risk — monitor closely' if risk else None,
        'is_deleted': False, 'current_version': 1, 'edit_history': [],
        'created_at': dt, 'updated_at': dt,
    })

# Maria (case1) — stable, improving
soap_note(case1_id, c1_id, s[1], H(35, 9),
    'Student reports high anxiety around upcoming thesis defense. Difficulty sleeping 3–4 nights/week.',
    'Appeared tense, fidgety. Mood 4/10. GAD-7: 14.',
    'Generalized anxiety, academic stressor. No SI.',
    'Introduce thought records. Assign sleep hygiene protocol. Review in 1 week.', 4)
soap_note(case1_id, c1_id, s[1], H(28, 9),
    'Tried thought records — found them helpful. Submitted chapter draft on time.',
    'Visibly calmer. Made eye contact. Mood 6/10. GAD-7: 10.',
    'Anxiety improving. Cognitive restructuring effective.',
    'Continue thought records. Add progressive muscle relaxation. Plan 3 more sessions.', 6)
soap_note(case1_id, c1_id, s[1], H(14, 9),
    'Passed midterms. Reports using thought records independently. Mood improving.',
    'Smiling, relaxed posture. Mood 7/10. GAD-7: 7.',
    'Good progress. Academic performance stabilizing.',
    'Begin tapering plan. Assign self-monitoring protocol. Discuss closure in 2 sessions.', 7)

# Juan (case2) — declining, high risk
soap_note(case2_id, c2_id, s[2], H(25, 10),
    'Reports "not seeing the point" of things. Passive SI — no plan. Stopped attending most classes.',
    'Poorly groomed, monotone speech. Mood 2/10. PHQ-9: 21.',
    'MDD moderate-severe. Passive SI. High escalation risk.',
    'Safety plan updated. Increase to twice-weekly sessions. Refer to psychiatry.', 2, risk=True)
soap_note(case2_id, c2_id, s[2], H(18, 10),
    'SI less frequent since safety plan. Has been texting trusted friend as agreed.',
    'Slightly more alert. PHQ-9: 18.',
    'Depression severe but safety plan compliance protective.',
    'Follow up psychiatry referral. Continue behavioral activation.', 3, risk=True)
soap_note(case2_id, c2_id, s[2], H(11, 10),
    'Started antidepressant 5 days ago. Mild nausea but tolerating. Completed 2 BA tasks.',
    'More animated. PHQ-9: 16.',
    'Depression responding to combined treatment.',
    'Continue BA. Monitor medication effects. Explore interpersonal triggers.', 4)

# Ana (case3) — crisis
soap_note(case3_id, psych_id, s[3], H(12, 11),
    'Disclosed active SI with specific plan (medication overdose). Distressed and tearful.',
    'Highly distressed, crying. PHQ-9: 27. SI with plan confirmed.',
    'ACTIVE SUICIDAL IDEATION WITH PLAN — Crisis level. Mandatory reporting initiated.',
    'Safety plan activated. All medications removed. Family briefed. Daily welfare calls.', 1, risk=True)
soap_note(case3_id, psych_id, s[3], H(9, 11),
    'SI thoughts reduced after family intervention. Denies active planning.',
    'Calmer. Safety plan reviewed. PHQ-9: 23.',
    'Post-crisis stabilization. Acute SI reduced. Passive ideation persists.',
    'Continue daily welfare checks. Pharmacotherapy started. Session in 2 days.', 2, risk=True)
soap_note(case3_id, psych_id, s[3], H(6, 11),
    'No active SI thoughts for 48 hours. Starting to feel "a little less hopeless."',
    'Less distressed. Brief eye contact. PHQ-9: 19.',
    'Post-crisis improvement. Active SI resolved. Monitor closely.',
    'Weekly sessions. Continue safety monitoring. Address hopelessness cognitions.', 3, risk=True)

# Miguel (case4) — improving
soap_note(case4_id, c1_id, s[4], H(18, 14),
    'Reports anxiety in group settings and during class presentations. Avoids social events.',
    'Quiet, limited eye contact. GAD-7: 12. Mood 4/10.',
    'Social anxiety disorder. Adjustment to university life.',
    'Psychoeducation on social anxiety. Assign social exposure hierarchy.', 4)
soap_note(case4_id, c1_id, s[4], H(11, 14),
    'Attended one social event — uncomfortable but stayed 30 min. Considers it a win.',
    'More animated. Smiled when describing the event. GAD-7: 9.',
    'Social anxiety reducing with gradual exposure.',
    'Continue exposure hierarchy. Add positive self-talk practice.', 6)

print('✅ Session notes seeded')

# ── Appointments ──────────────────────────────────────────────────────────────
def make_apt(student_id, counselor_id, case_id, start, status, purpose='counseling', method='in_person'):
    existing = db.appointments.find_one({'student_id': student_id, 'scheduled_start': start})
    if existing:
        return existing['_id']
    end = start + timedelta(minutes=50)
    apt_id = db.appointments.insert_one({
        'student_id': student_id, 'counselor_id': counselor_id,
        'case_id': case_id,
        'student_name': s_name[student_id],
        'status': status, 'purpose': purpose, 'method': method,
        'scheduled_start': start, 'scheduled_end': end,
        'created_at': start - timedelta(days=7), 'updated_at': start,
    }).inserted_id
    return apt_id

# Past completed
make_apt(s[1], c1_id, case1_id, H(35, 9),  'COMPLETED')
make_apt(s[1], c1_id, case1_id, H(28, 9),  'COMPLETED')
make_apt(s[1], c1_id, case1_id, H(14, 9),  'COMPLETED')
make_apt(s[2], c2_id, case2_id, H(25, 10), 'COMPLETED')
make_apt(s[2], c2_id, case2_id, H(18, 10), 'COMPLETED')
make_apt(s[3], psych_id, case3_id, H(12, 11), 'COMPLETED')
make_apt(s[3], psych_id, case3_id, H(9,  11), 'COMPLETED')
make_apt(s[4], c1_id, case4_id, H(18, 14), 'COMPLETED')
make_apt(s[4], c1_id, case4_id, H(11, 14), 'COMPLETED')
make_apt(s[5], c2_id, case5_id, H(90, 10), 'COMPLETED')

# Upcoming confirmed
make_apt(s[1], c1_id,    case1_id, F(2, 9),  'CONFIRMED')
make_apt(s[2], c2_id,    case2_id, F(3, 10), 'CONFIRMED')
make_apt(s[3], psych_id, case3_id, F(1, 11), 'CONFIRMED')
make_apt(s[4], c1_id,    case4_id, F(5, 14), 'CONFIRMED')

# Pending approval requests
make_apt(s[7], c3_id, None, F(4, 9),  'PENDING_APPROVAL', 'intake_interview')
make_apt(s[8], c3_id, None, F(6, 10), 'PENDING_APPROVAL', 'intake_interview')

print('✅ Appointments seeded')

# ── PERMA snapshots ───────────────────────────────────────────────────────────
LABELS = ['In Crisis', 'Struggling', 'Surviving', 'Thriving', 'Excelling']

perma_config = {
    # (student_id, base_label, trend)
    s[1]: ('Thriving',   'stable'),    # Maria — stable
    s[2]: ('Surviving',  'declining'), # Juan — declining (triggers triage)
    s[3]: ('In Crisis',  'volatile'),  # Ana — crisis/volatile
    s[4]: ('Surviving',  'improving'), # Miguel — improving (recovery arc)
    s[5]: ('Excelling',  'stable'),    # Sofia — discharged, doing well
    s[6]: ('Struggling', 'declining'), # Diego — new intake, getting worse
}

def perma_score():
    """Random 0–10 score for one PERMA dimension."""
    return round(rng.uniform(0, 10), 1)

snap_created = 0
for sv, (base_label, trend) in perma_config.items():
    base_idx = float(LABELS.index(base_label))
    mhbot_username = s_email[sv].split('@')[0]
    # Check if demo snapshots already exist
    existing_count = db.perma_snapshots.count_documents({
        'student_user_id': sv,
        'mhbot_username': mhbot_username,
    })
    if existing_count > 10:
        continue  # already seeded

    cur_val = base_idx
    entries = []
    for day in range(28, -1, -1):
        if rng.random() > 0.78 and day != 0:
            continue  # ~78% check-in rate
        progress = (28 - day) / 28

        # Drift logic
        pull = (base_idx - cur_val) * 0.2
        if trend == 'declining':
            bias = -0.07 * progress * 4
        elif trend == 'improving':
            bias = 0.07 * progress * 4
        elif trend == 'volatile':
            bias = rng.choice([-0.3, 0.3])
        else:
            bias = 0
        noise = rng.uniform(-0.4, 0.4)
        cur_val = max(0.0, min(4.0, cur_val + pull + bias + noise))
        label = LABELS[round(cur_val)]

        entry_dt = H(day, h=rng.randint(7, 22), m=rng.randint(0, 59))

        # Build dimension scores matching the label
        dim_base = round(cur_val) * 2  # 0, 2, 4, 6, 8 mapped from label index
        dims = {
            'd_positive_emotion': min(10, max(0, dim_base + rng.uniform(-1.5, 1.5))),
            'd_engagement':       min(10, max(0, dim_base + rng.uniform(-1.5, 1.5))),
            'd_relationships':    min(10, max(0, dim_base + rng.uniform(-1.5, 1.5))),
            'd_meaning':          min(10, max(0, dim_base + rng.uniform(-1.5, 1.5))),
            'd_accomplishment':   min(10, max(0, dim_base + rng.uniform(-1.5, 1.5))),
        }
        entries.append((entry_dt, label, dims))

    entries.sort(key=lambda e: e[0])
    for entry_dt, label, dims in entries:
        try:
            db.perma_snapshots.insert_one({
                'student_user_id': sv,
                'mhbot_username': mhbot_username,
                'perma_label': label,
                'entry_date': entry_dt,
                'raw_date': entry_dt.isoformat(),
                'saved_at': entry_dt,
                **dims,
            })
            snap_created += 1
        except Exception:
            pass  # skip duplicate dates

    if entries:
        latest_dt, latest_label, _ = entries[-1]
        db.users.update_one({'_id': sv}, {'$set': {
            'mhbot_username': mhbot_username,
            'perma_latest_label': latest_label,
            'perma_latest_date': latest_dt.isoformat(),
            'perma_synced_at': now,
        }})

print(f'✅ PERMA snapshots: {snap_created} new entries for {len(perma_config)} students')

# ── Crisis escalation for Ana (s3) ────────────────────────────────────────────
existing_crisis = db.crisis_escalations.find_one({'case_id': case3_id})
if not existing_crisis:
    db.crisis_escalations.insert_one({
        'case_id': case3_id,
        'student_id': s[3],
        'reported_by': psych_id,
        'risk_level': 'CRITICAL',
        'escalation_type': 'SUICIDAL_IDEATION_WITH_PLAN',
        'description': 'Student disclosed active SI with specific plan during intake session. Mandatory reporting initiated. Family contacted. Medications secured.',
        'actions_taken': ['Safety plan activated', 'Family notified', 'Medications removed', 'Psychiatric consult arranged', 'Daily welfare calls initiated'],
        'status': 'ACTIVE',
        'created_at': H(12, 11),
        'updated_at': H(6, 11),
    })
    print('✅ Crisis escalation record created for Ana (student3)')

# ── Audit logs ────────────────────────────────────────────────────────────────
audit_entries = [
    (admin_id,   'ADMIN',        'USER_CREATED',     f'Created demo user accounts for system demonstration', H(1)),
    (ic1_id,     'IC',           'INTAKE_COMPLETED',  'Completed intake interview for Maria Reyes — endorsed to COUNSELOR', H(45)),
    (ic2_id,     'IC',           'INTAKE_COMPLETED',  'Completed intake interview for Ana Garcia — crisis protocol activated', H(14)),
    (c1_id,      'COUNSELOR',    'SESSION_NOTE',      'Added SOAP note for Maria Reyes — session 3 of 8', H(14)),
    (psych_id,   'PSYCHOLOGIST', 'CRISIS_ESCALATION', 'Crisis escalation filed for Ana Garcia — active SI with plan', H(12)),
    (cm_id,      'CASE_MANAGER', 'CASE_REVIEW',       'Reviewed high-risk queue — 1 critical case flagged for daily monitoring', H(10)),
    (c2_id,      'COUNSELOR',    'SESSION_NOTE',      'Added SOAP note for Juan Santos — PHQ-9 improving', H(11)),
    (admin_id,   'ADMIN',        'USER_ROLE_UPDATED',  'Updated role for demo counselor accounts', H(5)),
    (psych_id,   'PSYCHOLOGIST', 'SAFETY_PLAN',       'Updated safety plan for Ana Garcia — post-crisis stabilization', H(6)),
    (c1_id,      'COUNSELOR',    'APPOINTMENT_CONFIRMED', 'Confirmed upcoming session for Maria Reyes on ' + F(2, 9).strftime('%Y-%m-%d'), H(2)),
]

audit_created = 0
for user_id, role, action, desc, dt in audit_entries:
    existing = db.audit_logs.find_one({'user_id': user_id, 'action': action, 'timestamp': dt})
    if not existing:
        db.audit_logs.insert_one({
            'user_id': user_id,
            'role': role,
            'action': action,
            'description': desc,
            'timestamp': dt,
            'ip_address': '127.0.0.1',
        })
        audit_created += 1

print(f'✅ Audit logs: {audit_created} new entries')

# ── Summary ───────────────────────────────────────────────────────────────────
print()
print('=' * 60)
print('✅  Demo seed complete')
print(f'   Total users in DB:        {db.users.count_documents({})}')
print(f'   Total cases in DB:        {db.cases.count_documents({})}')
print(f'   Total appointments in DB: {db.appointments.count_documents({})}')
print(f'   Total session notes:      {db.session_notes.count_documents({})}')
print(f'   Total PERMA snapshots:    {db.perma_snapshots.count_documents({})}')
print('=' * 60)
print()
print('Demo credentials (password for all: Demo1234!)')
print('  admin@dlsu.edu.ph          ADMIN')
print('  dpo@dlsu.edu.ph            DPO')
print('  ic1@dlsu.edu.ph            IC (Intake Counselor)')
print('  ic2@dlsu.edu.ph            IC')
print('  counselor1@dlsu.edu.ph     COUNSELOR')
print('  counselor2@dlsu.edu.ph     COUNSELOR')
print('  counselor3@dlsu.edu.ph     COUNSELOR')
print('  casemanager@dlsu.edu.ph    CASE_MANAGER')
print('  staff@dlsu.edu.ph          STAFF')
print('  psych@dlsu.edu.ph          PSYCHOLOGIST')
print('  student1@dlsu.edu.ph       STUDENT — active case, stable (Maria Reyes)')
print('  student2@dlsu.edu.ph       STUDENT — active case, declining (Juan Santos)')
print('  student3@dlsu.edu.ph       STUDENT — CRISIS case (Ana Garcia)')
print('  student4@dlsu.edu.ph       STUDENT — improving / recovery (Miguel Cruz)')
print('  student5@dlsu.edu.ph       STUDENT — completed case (Sofia Dela Rosa)')
print('  student6@dlsu.edu.ph       STUDENT — new intake (Diego Lim)')
print('  student7@dlsu.edu.ph       STUDENT — no case yet (Isabel Tan)')
print('  student8@dlsu.edu.ph       STUDENT — no case yet (Rafael Morales)')
print()
print('Run the full seed for 40+ students and 35+ cases:')
print('  python3 scripts/seed_all.py')
