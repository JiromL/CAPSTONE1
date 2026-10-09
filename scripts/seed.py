#!/usr/bin/env python3
"""
CPS Unified Seed — single source of truth.
Wipes cps_system_dev and rebuilds all test data.

Usage:
    python scripts/seed.py
    MONGODB_DB_NAME=cps_system_dev python scripts/seed.py
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
rng       = random.Random(2025)

print(f"🔌 {MONGO_URI}  📦 {DB_NAME}")
try:
    client.admin.command('ping'); print("✓ MongoDB OK\n")
except Exception as e:
    print(f"✗ {e}"); exit(1)

# ── WIPE ───────────────────────────────────────────────────────────────────────
# Every collection that stores a case_id / student_id / user_id reference must be
# wiped here — otherwise a reseed leaves orphaned records pointing at deleted
# cases/users (e.g. referrals with a case_id that no longer exists), which show
# up in the UI as broken rows with null student/case names.
WIPE = [
    'users','appointments','cases','intakes','counselor_availability',
    'counselor_weekly_schedule','session_notes','session_notes_versions','check_ins','safety_plans',
    'perma_snapshots','perma_history','perma_crisis_reviews','missed_appointment_tracker',
    'notifications','announcements','resources','consent_records',
    'reschedule_requests','non_counseling_clients',
    'referrals','referral_logs','counselor_referrals','case_handovers',
    'high_risk_checkins','crisis_escalations','waitlist','feedback',
    'reminders','journal_entries','progress_metrics','video_links',
    'personal_events','intake_drafts','intake_packets','new_client_intakes',
    'documents','document_versions','assessments','assessment_schedules',
    'booking_locks','counseling_cases','oauth_states',
]
for col in WIPE:
    if col in db.list_collection_names():
        db[col].delete_many({}); print(f"  🗑  {col}")
print()

# ── HELPERS ────────────────────────────────────────────────────────────────────
now = datetime.utcnow()
MON, TUE, WED, THU, FRI = 0, 1, 2, 3, 4
_case_seq = [0]

def ph(pw):    return generate_password_hash(pw)
def H(d, h=9, m=0):  return (now - timedelta(days=d)).replace(hour=h, minute=m, second=0, microsecond=0)
def F(d, h=9, m=0):  return (now + timedelta(days=abs(d))).replace(hour=h, minute=m, second=0, microsecond=0)
def ymd(d):   return d.strftime('%Y-%m-%d')
def cnum():
    _case_seq[0] += 1
    return f'CPS-2025-{_case_seq[0]:03d}'

_YR_PFX = {'1st Year': 124, '2nd Year': 123, '3rd Year': 122, '4th Year': 121}

def sid(yr, n):
    return f'{_YR_PFX.get(yr, 120)}{n:05d}'

def make_user(email, pw, first, last, role, **kw):
    return db.users.insert_one({
        'email': email, 'password_hash': ph(pw),
        'first_name': first, 'last_name': last,
        'name': f'{first} {last}'.strip(),
        'role': role, 'is_active': True, 'is_verified': True,
        'created_at': now, 'updated_at': now,
        **kw
    }).inserted_id

# ── STAFF ──────────────────────────────────────────────────────────────────────
admin_id = make_user('admin@dlsu.edu.ph',     'admin123',  'Admin',  'System',  'ADMIN')
dpo_id   = make_user('dpo@dlsu.edu.ph',       'dpo123',    'Sarah',  'Director','DPO')
staff_id = make_user('staff@dlsu.edu.ph',     'staff123',  'Alex',   'Reyes',   'STAFF')
cm_id    = make_user('cm@dlsu.edu.ph',        'cm123',     'Morgan', 'Bautista','CASE_MANAGER')
print("✅ Staff created")

# ── ICs ────────────────────────────────────────────────────────────────────────
ic_julse  = make_user('julse@dlsu.edu.ph',   'julse123',   'Julse',  'Aguilar',  'IC')
ic_archie = make_user('archie@dlsu.edu.ph',  'archie123',  'Archie', 'Fernandez','IC')
ic_mars   = make_user('mars@dlsu.edu.ph',    'mars123',    'Mars',   'Dela Cruz','IC')
ic_ria    = make_user('ria@dlsu.edu.ph',     'ria123',     'Ria',    'Ocampo',   'IC')
ic_cris   = make_user('cris@dlsu.edu.ph',    'cris123',    'Cris',   'Villanueva','IC')
ic_wil    = make_user('wil@dlsu.edu.ph',     'wil123',     'Wil',    'Santos',   'IC')
ic_rose_c = make_user('rose.c@dlsu.edu.ph',  'rosec123',   'Rose',   'Cabrera',  'IC')
ic_gracie = make_user('gracie@dlsu.edu.ph',  'gracie123',  'Gracie', 'Mendoza',  'IC')
ICS = [ic_julse, ic_archie, ic_mars, ic_ria, ic_cris, ic_wil, ic_rose_c, ic_gracie]
IC_NAMES = ['Julse Aguilar','Archie Fernandez','Mars Dela Cruz','Ria Ocampo',
            'Cris Villanueva','Wil Santos','Rose Cabrera','Gracie Mendoza']
print("✅ ICs created")

# ── COUNSELORS ─────────────────────────────────────────────────────────────────
c_rose  = make_user('rose.t@dlsu.edu.ph',  'roset123',  'Rose',   'Tolentino', 'COUNSELOR')
c_bia   = make_user('bia@dlsu.edu.ph',     'bia123',    'Bia',    'Alcantara', 'COUNSELOR')
c_chelly= make_user('chelly@dlsu.edu.ph',  'chelly123', 'Chelly', 'Reyes',     'COUNSELOR')
c_daye  = make_user('daye@dlsu.edu.ph',    'daye123',   'Daye',   'Navarro',   'COUNSELOR')
c_clara = make_user('clara@dlsu.edu.ph',   'clara123',  'Clara',  'Santos',    'COUNSELOR')
COUNSELORS = [c_rose, c_bia, c_chelly, c_daye, c_clara]
print("✅ Counselors created")

# ── PSYCHOLOGISTS ──────────────────────────────────────────────────────────────
p_daryl = make_user('daryl@dlsu.edu.ph',  'daryl123', 'Daryl', 'Bautista', 'PSYCHOLOGIST')
p_niko  = make_user('niko@dlsu.edu.ph',   'niko123',  'Niko',  'Pascual',  'PSYCHOLOGIST')
p_bon   = make_user('bon@dlsu.edu.ph',    'bon123',   'Bon',   'Aquino',   'PSYCHOLOGIST')
p_shel  = make_user('shel@dlsu.edu.ph',   'shel123',  'Shel',  'Macaraeg', 'PSYCHOLOGIST')
p_jenny = make_user('jenny@dlsu.edu.ph',  'jenny123', 'Jenny', 'Soriano',  'PSYCHOLOGIST')
p_chona = make_user('chona@dlsu.edu.ph',  'chona123', 'Chona', 'Lim',      'PSYCHOLOGIST')
p_carl  = make_user('carl@dlsu.edu.ph',   'carl123',  'Carl',  'de Guzman','PSYCHOLOGIST')
PSYCHOLOGISTS = [p_daryl, p_niko, p_bon, p_shel, p_jenny, p_chona, p_carl]
PROVIDERS = COUNSELORS + PSYCHOLOGISTS
print("✅ Psychologists created")

# ── STUDENTS ───────────────────────────────────────────────────────────────────
# (first, last, email, pw, college, course, year_level, id_suffix, phone_sfx, dob)
_student_data = [
    # CCS
    ('Emma',    'Johnson',    'ejohnson@dlsu.edu.ph',   'stu001','CCS',    'BS Computer Science',             '3rd Year','00101','001','2001-03-15'),
    ('Mark',    'Smith',      'msmith@dlsu.edu.ph',     'stu002','CCS',    'BS Information Technology',       '2nd Year','00102','002','2002-07-22'),
    ('Lena',    'Park',       'lpark@dlsu.edu.ph',      'stu003','CCS',    'BS Computer Science',             '2nd Year','00103','003','2002-08-14'),
    ('Alec',    'Bautista',   'abautista@dlsu.edu.ph',  'stu004','CCS',    'BS Information Systems',          '3rd Year','00104','004','2001-05-30'),
    ('Carla',   'Reyes',      'creyes@dlsu.edu.ph',     'stu005','CCS',    'BS Computer Science',             '1st Year','00105','005','2004-11-03'),
    # GCOE
    ('Alex',    'Chen',       'achen@dlsu.edu.ph',      'stu006','GCOE',   'BS Electronics Engineering',      '1st Year','00106','006','2004-05-30'),
    ('Miguel',  'Santos',     'msantos@dlsu.edu.ph',    'stu007','GCOE',   'BS Civil Engineering',            '2nd Year','00107','007','2002-02-18'),
    ('Ella',    'Garcia',     'egarcia@dlsu.edu.ph',    'stu008','GCOE',   'BS Mechanical Engineering',       '3rd Year','00108','008','2001-09-07'),
    ('Fred',    'Tan',        'ftan@dlsu.edu.ph',       'stu009','GCOE',   'BS Industrial Engineering',       '4th Year','00109','009','2000-12-22'),
    ('Harold',  'Santos',     'hsantos@dlsu.edu.ph',    'stu010','GCOE',   'BS Computer Engineering',         '1st Year','00110','010','2004-04-18'),
    # CLA
    ('Jessica', 'Davis',      'jdavis@dlsu.edu.ph',     'stu011','CLA',    'AB Psychology',                   '4th Year','00111','011','2000-11-08'),
    ('Priya',   'Desai',      'pdesai@dlsu.edu.ph',     'stu012','CLA',    'AB Communication',                '3rd Year','00112','012','2001-06-25'),
    ('Rachel',  'Kim',        'rkim@dlsu.edu.ph',       'stu013','CLA',    'AB Political Science',            '3rd Year','00113','013','2001-07-11'),
    ('Iris',    'Dela Rosa',  'idelarosa@dlsu.edu.ph',  'stu014','CLA',    'AB Communication',                '2nd Year','00114','014','2002-10-15'),
    ('Jake',    'Villanueva', 'jvillanueva@dlsu.edu.ph','stu015','CLA',    'AB Philosophy',                   '2nd Year','00115','015','2003-01-28'),
    # RVRCOB
    ('Carlos',  'Diaz',       'cdiaz@dlsu.edu.ph',      'stu016','RVRCOB', 'BS Accountancy',                  '3rd Year','00116','016','2001-01-27'),
    ('Mia',     'Cruz',       'mcruz@dlsu.edu.ph',      'stu017','RVRCOB', 'BS Management of Financial Inst', '2nd Year','00117','017','2002-05-19'),
    ('Leo',     'Aquino',     'laquino@dlsu.edu.ph',    'stu018','RVRCOB', 'BS Accountancy',                  '3rd Year','00118','018','2001-08-31'),
    ('Ola',     'Fernandez',  'ofernandez@dlsu.edu.ph', 'stu019','RVRCOB', 'BS Business Administration',      '4th Year','00119','019','2000-04-07'),
    # CoSc
    ('Amy',     'Torres',     'atorres@dlsu.edu.ph',    'stu020','CoSc',   'BS Biology',                      '4th Year','00120','020','2000-10-03'),
    ('Paz',     'Ramirez',    'pramirez@dlsu.edu.ph',   'stu021','CoSc',   'BS Chemistry',                    '2nd Year','00121','021','2002-11-09'),
    ('Rex',     'Morales',    'rmorales@dlsu.edu.ph',   'stu022','CoSc',   'BS Mathematics',                  '4th Year','00122','022','2000-06-17'),
    # CN
    ('Sofia',   'Martinez',   'smartinez@dlsu.edu.ph',  'stu023','CN',     'BS Nursing',                      '3rd Year','00123','023','2001-09-12'),
    ('Nina',    'Cruz',       'ncruz@dlsu.edu.ph',      'stu024','CN',     'BS Nursing',                      '1st Year','00124','024','2004-09-06'),
    ('Sara',    'Aguilar',    'saguilar@dlsu.edu.ph',   'stu025','CN',     'BS Nursing',                      '3rd Year','00125','025','2001-02-14'),
    ('Tim',     'Mejia',      'tmejia@dlsu.edu.ph',     'stu026','CN',     'BS Nursing',                      '2nd Year','00126','026','2002-03-07'),
    # CED
    ('Grace',   'Aquino',     'gaquino@dlsu.edu.ph',    'stu027','CED',    'BS Education - Science',          '3rd Year','00127','027','2001-04-03'),
    ('Uma',     'Pascual',    'upascual@dlsu.edu.ph',   'stu028','CED',    'BS Education - Math',             '3rd Year','00128','028','2001-08-25'),
    # SOL
    ('Sam',     'Rivera',     'srivera@dlsu.edu.ph',    'stu029','SOL',    'Juris Doctor',                    '1st Year','00129','029','2003-12-01'),
    ('David',   'Tan',        'dtan@dlsu.edu.ph',       'stu030','SOL',    'Juris Doctor',                    '2nd Year','00130','030','2001-03-28'),
    ('Vince',   'Dela Cruz',  'vdelacruz@dlsu.edu.ph',  'stu031','SOL',    'Juris Doctor',                    '3rd Year','00131','031','2001-11-12'),
    # SOM / others
    ('Maria',   'Santos',     'msantos2@dlsu.edu.ph',   'stu032','CoSc',   'BS Biology',                      '4th Year','00132','032','2000-07-14'),
    ('Ethan',   'Lee',        'elee@dlsu.edu.ph',       'stu033','GCOE',   'BS Computer Engineering',         '4th Year','00133','033','2000-12-22'),
    ('Diana',   'Santos',     'dsantos@dlsu.edu.ph',    'stu034','CED',    'BEEd Elementary',                 '4th Year','00134','034','2000-06-17'),
    ('Kevin',   'Lim',        'klim@dlsu.edu.ph',       'stu035','CoSc',   'BS Chemistry',                    '3rd Year','00135','035','2001-08-31'),
    # IC-queue only students (no cases yet — intake in progress)
    ('Anna',    'Ramos',      'aramos@dlsu.edu.ph',     'stu036','CCS',    'BS Computer Science',             '1st Year','00136','036','2004-01-15'),
    ('Ben',     'Santos',     'bsantos@dlsu.edu.ph',    'stu037','GCOE',   'BS Civil Engineering',            '2nd Year','00137','037','2003-06-20'),
    ('Cara',    'Garcia',     'cgarcia@dlsu.edu.ph',    'stu038','CLA',    'AB Psychology',                   '3rd Year','00138','038','2001-09-10'),
    ('Dan',     'Lim',        'dlim@dlsu.edu.ph',       'stu039','RVRCOB', 'BS Accountancy',                  '2nd Year','00139','039','2002-11-05'),
    ('Eva',     'Flores',     'eflores@dlsu.edu.ph',    'stu040','CN',     'BS Nursing',                      '1st Year','00140','040','2004-03-22'),
]

students = []
for first, last, email, pw, college, course, yr, id_sfx, ph_sfx, dob in _student_data:
    _id = make_user(email, pw, first, last, 'STUDENT',
        college=college, course=course, year_level=yr,
        student_id=sid(yr, int(id_sfx)),
        contact_number=f'0917{ph_sfx.zfill(7)}',
        date_of_birth=dob,
        emergency_contact={
            'name': f'{last} Parent',
            'relationship': 'Parent',
            'phone': f'0918{ph_sfx.zfill(7)}',
        },
        consent_given=True,
        consent_given_at=H(rng.randint(30, 180)),
        consent_version='1.0',
        perma_latest_label=None,
    )
    students.append(_id)

# convenience aliases
(s1,s2,s3,s4,s5,         # CCS
 s6,s7,s8,s9,s10,        # GCOE
 s11,s12,s13,s14,s15,    # CLA
 s16,s17,s18,s19,        # RVRCOB
 s20,s21,s22,            # CoSc
 s23,s24,s25,s26,        # CN
 s27,s28,                # CED
 s29,s30,s31,            # SOL
 s32,s33,s34,s35,        # Others
 s36,s37,s38,s39,s40,   # IC queue
) = students

_names = {_id: f'{f} {l}' for (f,l,*_), _id in zip(_student_data, students)}
_emails = {_id: e for (_,_,e,*_), _id in zip(_student_data, students)}

print(f"✅ {len(students)} students created")

# ── SCHEDULES ──────────────────────────────────────────────────────────────────
_ic_scheds = [
    (ic_julse,   'in-person', [(MON,'08:00','12:00'),(WED,'08:00','12:00'),(FRI,'08:00','12:00')]),
    (ic_archie,  'in-person', [(MON,'13:00','17:00'),(TUE,'13:00','17:00'),(WED,'13:00','17:00'),(THU,'13:00','17:00')]),
    (ic_mars,    'online',    [(TUE,'09:00','15:00'),(THU,'09:00','15:00'),(FRI,'09:00','15:00')]),
    (ic_ria,     'in-person', [(MON,'09:00','12:00'),(TUE,'09:00','12:00'),(WED,'09:00','12:00'),(THU,'09:00','12:00'),(FRI,'09:00','12:00')]),
    (ic_cris,    'in-person', [(MON,'10:00','14:00'),(WED,'10:00','14:00'),(FRI,'08:00','12:00')]),
    (ic_wil,     'online',    [(MON,'14:00','18:00'),(TUE,'14:00','18:00'),(WED,'14:00','18:00')]),
    (ic_rose_c,  'in-person', [(TUE,'08:00','13:00'),(THU,'08:00','13:00')]),
    (ic_gracie,  'online',    [(MON,'10:00','14:00'),(TUE,'10:00','14:00'),(THU,'10:00','14:00'),(FRI,'10:00','14:00')]),
]
_coun_scheds = [
    (c_rose,   'F2F',    [(MON,'09:00','15:00'),(WED,'09:00','15:00'),(THU,'09:00','15:00')]),
    (c_bia,    'Online', [(TUE,'10:00','16:00'),(WED,'10:00','16:00'),(FRI,'10:00','16:00')]),
    (c_chelly, 'Online', [(MON,'08:00','14:00'),(TUE,'08:00','14:00'),(THU,'08:00','14:00')]),
    (c_daye,   'F2F',    [(MON,'13:00','17:00'),(WED,'13:00','17:00'),(FRI,'13:00','17:00')]),
    (c_clara,  'F2F',    [(TUE,'09:00','13:00'),(THU,'09:00','13:00'),(FRI,'09:00','13:00')]),
]
_psych_scheds = [
    (p_daryl,  'F2F',    [(MON,'09:00','15:00'),(WED,'09:00','15:00'),(FRI,'09:00','15:00')]),
    (p_niko,   'Online', [(TUE,'10:00','16:00'),(THU,'10:00','16:00')]),
    (p_bon,    'F2F',    [(MON,'08:00','14:00'),(TUE,'08:00','14:00'),(WED,'08:00','14:00')]),
    (p_shel,   'Online', [(TUE,'13:00','17:00'),(THU,'13:00','17:00'),(FRI,'13:00','17:00')]),
    (p_jenny,  'F2F',    [(MON,'10:00','14:00'),(WED,'10:00','14:00'),(FRI,'10:00','14:00')]),
    (p_chona,  'Online', [(TUE,'09:00','13:00'),(WED,'09:00','13:00'),(THU,'09:00','13:00')]),
    (p_carl,   'F2F',    [(MON,'13:00','17:00'),(TUE,'13:00','17:00'),(THU,'13:00','17:00')]),
]
for groups in [_ic_scheds, _coun_scheds, _psych_scheds]:
    for cid, method, slots in groups:
        sched = [{'day_of_week': d, 'start_time': s, 'end_time': e, 'session_method': method} for d,s,e in slots]
        for col in ['counselor_weekly_schedule', 'counselor_availability']:
            db[col].update_one({'counselor_id': cid},
                {'$set': {'counselor_id': cid, 'session_method': method, 'schedule': sched, 'updated_at': now}}, upsert=True)
print("✅ Schedules seeded")

# ── CASES ──────────────────────────────────────────────────────────────────────
def mk_case(sid, counselor_id, ic_id, ic_name_str, status, risk, concern, issue,
            endorsed_to, phq9s, gad7s, triage, days_ago,
            goals=None, diagnoses=None, client_status=None,
            termination_reason=None, termination_date=None, final_notes=None):
    sname  = _names[sid]
    semail = _emails[sid]
    iform  = {
        'type_of_service': 'Intake Interview',
        'presenting_concern': concern,
        'phq9_score': phq9s, 'gad7_score': gad7s,
        'triage_decision': triage, 'risk_level': risk,
        'endorsed_to': endorsed_to,
        'endorsement_notes': f'Endorsed for {endorsed_to.lower()} services.',
        'session_date': H(days_ago).isoformat(),
        'session_method': 'in_person',
        'ic_name': ic_name_str, 'student_name': sname,
    }
    doc = {
        'student_id': sid, 'student_name': sname, 'client_name': sname,
        'student_email': semail,
        'assigned_counselor_id': counselor_id,
        'intake_counselor_id': ic_id,
        'case_status': status, 'risk_level': risk,
        'concern': concern, 'presenting_issue': issue,
        'case_number': cnum(),
        'intake_interview_form': iform,
        'endorsed_to_role': endorsed_to,
        'endorsed_at': H(days_ago),
        'endorsed_by': str(ic_id),
        'source': 'SELF_REFERRAL',
        'check_ins': [],
        'created_at': H(days_ago + 5), 'updated_at': H(rng.randint(0, days_ago)),
    }
    if goals:
        doc['treatment_plan'] = {
            'goals': goals,
            'interventions': ['CBT techniques', 'Psychoeducation', 'Journaling'],
            'progress_summary': 'Treatment ongoing.',
            'estimated_duration': '8–12 sessions',
            'next_review_date': ymd(F(14)),
        }
    if diagnoses:
        doc['diagnoses'] = diagnoses
    if client_status:
        doc['client_status'] = client_status
    if termination_reason:
        doc['termination_reason'] = termination_reason
        doc['termination_date'] = termination_date or ymd(H(rng.randint(5, 30)))
        doc['final_notes'] = final_notes or 'Student met treatment goals. Discharged with follow-up plan.'
    return db.cases.insert_one(doc).inserted_id

_g = lambda *gs: [{'goal': g, 'target_date': ymd(F(30+i*15)), 'status': s} for i,(g,s) in enumerate(gs)]

# ── ACTIVE / HIGH-RISK cases ──
c1  = mk_case(s1,  c_rose,   ic_julse,  IC_NAMES[0], 'ACTIVE',   'YELLOW', 'Academic stress, anxiety',
              'Student presents with anxiety related to academic performance and thesis deadlines.',
              'COUNSELOR', 12, 9, 'COUNSELING', 45,
              goals=_g(('Develop coping strategies for academic stress','in_progress'),('Reduce avoidance behaviors','not_started')),
              diagnoses=['Generalized Anxiety Disorder'])

c2  = mk_case(s2,  c_bia,    ic_archie, IC_NAMES[1], 'ACTIVE',   'RED',    'Depression, suicidal ideation',
              'Student reports persistent low mood, hopelessness, and passive SI. No plan or intent.',
              'PSYCHOLOGIST', 22, 14, 'PSYCHOLOGIST', 30,
              goals=_g(('Establish safety plan','in_progress'),('Reduce depressive symptoms (PHQ-9 < 10)','not_started'),('Build support network','not_started')),
              diagnoses=['Major Depressive Disorder, Moderate'])

c3  = mk_case(s3,  c_chelly, ic_mars,   IC_NAMES[2], 'ACTIVE',   'YELLOW', 'Relationship issues, anxiety',
              'Student experiencing anxiety after a difficult breakup. Reports sleep disturbance and difficulty concentrating.',
              'COUNSELOR', 10, 7, 'COUNSELING', 21,
              goals=_g(('Process relationship grief','in_progress'),('Improve sleep hygiene','not_started')),
              diagnoses=['Adjustment Disorder with Anxious Mood'])

c4  = mk_case(s4,  c_daye,   ic_ria,    IC_NAMES[3], 'ACTIVE',   'GREEN',  'Academic pressure, perfectionism',
              'Student reports excessive self-criticism and fear of failure related to academic demands.',
              'COUNSELOR', 8, 6, 'COUNSELING', 35,
              goals=_g(('Develop realistic self-expectations','in_progress'),('Build resilience','not_started')),
              diagnoses=['Adjustment Disorder'])

c5  = mk_case(s5,  c_clara,  ic_cris,   IC_NAMES[4], 'ACTIVE',   'GREEN',  'Career anxiety, life transition',
              'Student anxious about post-graduation plans. Difficulty making decisions about career path.',
              'COUNSELOR', 6, 4, 'COUNSELING', 28,
              goals=_g(('Clarify career values and goals','in_progress'),('Reduce decision-making anxiety','not_started')))

c6  = mk_case(s6,  p_daryl,  ic_julse,  IC_NAMES[0], 'ACTIVE',   'RED',    'Severe depression, SI with plan',
              'Student presents with SI with a plan. Reports hopelessness, social isolation, and inability to function.',
              'PSYCHOLOGIST', 27, 18, 'PSYCHOLOGIST', 14,
              goals=_g(('Immediate safety — daily check-ins','in_progress'),('Address suicidal cognitions','not_started'),('Family engagement','not_started')),
              diagnoses=['Major Depressive Disorder, Severe'])

c7  = mk_case(s7,  p_niko,   ic_archie, IC_NAMES[1], 'ACTIVE',   'RED',    'Trauma, PTSD symptoms',
              'Student reports flashbacks and nightmares following a motor accident. Avoids driving and public transport.',
              'PSYCHOLOGIST', 18, 12, 'PSYCHOLOGIST', 60,
              goals=_g(('Stabilize trauma symptoms','in_progress'),('Process traumatic event with EMDR','not_started')),
              diagnoses=['Post-Traumatic Stress Disorder'])

c8  = mk_case(s8,  c_rose,   ic_mars,   IC_NAMES[2], 'ACTIVE',   'YELLOW', 'Family conflict, stress',
              'Student experiencing stress due to parental conflict at home. Reports difficulty concentrating on studies.',
              'COUNSELOR', 9, 6, 'COUNSELING', 25,
              goals=_g(('Develop emotional regulation skills','in_progress'),('Improve communication with family','not_started')))

c9  = mk_case(s9,  c_bia,    ic_ria,    IC_NAMES[3], 'ACTIVE',   'GREEN',  'Burnout, academic exhaustion',
              'Student reports feeling overwhelmed by course load and extracurricular commitments.',
              'COUNSELOR', 7, 5, 'COUNSELING', 20,
              goals=_g(('Establish sustainable routines','in_progress'),('Set healthy boundaries','not_started')))

c10 = mk_case(s10, c_chelly, ic_cris,   IC_NAMES[4], 'ACTIVE',   'YELLOW', 'Social anxiety, isolation',
              'Student avoids group settings and social situations. Reports significant distress during class presentations.',
              'COUNSELOR', 14, 10, 'COUNSELING', 40,
              goals=_g(('Gradual exposure to social situations','in_progress'),('Reduce safety behaviors','not_started')),
              diagnoses=['Social Anxiety Disorder'])

c11 = mk_case(s11, p_bon,    ic_wil,    IC_NAMES[5], 'ACTIVE',   'RED',    'Eating disorder, body image',
              'Student presents with restrictive eating, excessive exercise, and significant body image disturbance.',
              'PSYCHOLOGIST', 20, 13, 'PSYCHOLOGIST', 50,
              goals=_g(('Medical stabilization monitoring','in_progress'),('Address cognitive distortions about body','not_started')),
              diagnoses=['Anorexia Nervosa, Restrictive Type'])

c12 = mk_case(s12, c_daye,   ic_rose_c, IC_NAMES[6], 'ACTIVE',   'GREEN',  'Grief, bereavement',
              'Student lost a close family member. Presents with sadness, withdrawal, and academic decline.',
              'COUNSELOR', 8, 5, 'COUNSELING', 33,
              goals=_g(('Process grief healthily','in_progress'),('Return to baseline functioning','not_started')))

c13 = mk_case(s13, c_clara,  ic_gracie, IC_NAMES[7], 'ACTIVE',   'YELLOW', 'OCD symptoms, intrusive thoughts',
              'Student reports distressing intrusive thoughts and compulsive checking behaviors.',
              'COUNSELOR', 15, 10, 'COUNSELING', 55,
              goals=_g(('Psychoeducation on OCD','in_progress'),('ERP therapy initiation','not_started')),
              diagnoses=['Obsessive-Compulsive Disorder'])

c14 = mk_case(s14, p_shel,   ic_julse,  IC_NAMES[0], 'ACTIVE',   'YELLOW', 'ADHD, academic difficulties',
              'Student reports longstanding difficulty sustaining attention, impulsivity, and task completion.',
              'PSYCHOLOGIST', 12, 7, 'PSYCHOLOGIST', 38,
              goals=_g(('Develop organizational systems','in_progress'),('Address executive function deficits','not_started')),
              diagnoses=['Attention-Deficit/Hyperactivity Disorder, Combined Presentation'])

c15 = mk_case(s15, c_rose,   ic_archie, IC_NAMES[1], 'ACTIVE',   'GREEN',  'Stress, time management',
              'Student struggling to balance law school demands with personal life. Reports chronic stress and fatigue.',
              'COUNSELOR', 6, 4, 'COUNSELING', 22,
              goals=_g(('Improve time management skills','in_progress'),('Build self-care routines','not_started')))

c16 = mk_case(s16, p_jenny,  ic_mars,   IC_NAMES[2], 'ACTIVE',   'RED',    'Bipolar disorder, mood instability',
              'Student presents with history of manic episodes and current depressive phase. Referred by psychiatrist.',
              'PSYCHOLOGIST', 24, 15, 'PSYCHOLOGIST', 70,
              goals=_g(('Mood monitoring and psychoeducation','in_progress'),('Medication adherence support','not_started')),
              diagnoses=['Bipolar Disorder, Type I'])

c17 = mk_case(s17, c_bia,    ic_ria,    IC_NAMES[3], 'ACTIVE',   'GREEN',  'Homesickness, adjustment',
              'Freshman student struggling to adjust to university life. Reports loneliness and missing family.',
              'COUNSELOR', 5, 3, 'COUNSELING', 15,
              goals=_g(('Build university social connections','in_progress'),('Develop independence skills','not_started')))

c18 = mk_case(s18, p_chona,  ic_cris,   IC_NAMES[4], 'ACTIVE',   'YELLOW', 'Substance use, alcohol',
              'Student acknowledges problematic alcohol use as a coping mechanism for stress and anxiety.',
              'PSYCHOLOGIST', 16, 10, 'PSYCHOLOGIST', 48,
              goals=_g(('Reduce alcohol use','in_progress'),('Develop healthy coping strategies','not_started')),
              diagnoses=['Alcohol Use Disorder, Mild'])

# ── PENDING TERMINATION cases ──
c19 = mk_case(s19, c_rose,   ic_wil,    IC_NAMES[5], 'PENDING_TERMINATION', 'GREEN', 'Academic stress, mild anxiety',
              'Student reported improvement and expressed readiness to terminate. Goals largely met.',
              'COUNSELOR', 5, 3, 'COUNSELING', 90,
              client_status='PENDING_TERMINATION',
              goals=_g(('Maintain gains post-therapy','completed'),('Develop relapse prevention plan','completed')))

c20 = mk_case(s20, c_chelly, ic_rose_c, IC_NAMES[6], 'PENDING_TERMINATION', 'GREEN', 'Grief, loss of pet/relationship',
              'Student has processed grief. Functioning has returned to baseline.',
              'COUNSELOR', 4, 3, 'COUNSELING', 75,
              client_status='PENDING_TERMINATION')

c21 = mk_case(s21, p_daryl,  ic_gracie, IC_NAMES[7], 'PENDING_TERMINATION', 'YELLOW', 'Depression, mild-moderate',
              'Student shows significant improvement on PHQ-9. Agreed to step down to self-monitoring.',
              'PSYCHOLOGIST', 11, 7, 'PSYCHOLOGIST', 80,
              goals=_g(('Consolidate therapy gains','completed'),('Build relapse prevention skills','in_progress')),
              diagnoses=['Major Depressive Disorder, Mild, In Partial Remission'])

# ── CLOSED cases ──
c22 = mk_case(s22, c_daye,   ic_julse,  IC_NAMES[0], 'CLOSED', 'GREEN', 'Adjustment disorder, transition',
              'Student adjusted successfully to university. Treatment goals met.',
              'COUNSELOR', 4, 3, 'COUNSELING', 120,
              termination_reason='GOALS_MET',
              final_notes='Student demonstrated strong coping. No further intervention needed.')

c23 = mk_case(s23, c_clara,  ic_archie, IC_NAMES[1], 'CLOSED', 'YELLOW', 'Anxiety, panic attacks',
              'Student completed 10-session protocol for panic disorder. Panic-free for 8 weeks.',
              'COUNSELOR', 10, 7, 'COUNSELING', 150,
              diagnoses=['Panic Disorder'],
              termination_reason='GOALS_MET',
              final_notes='Student learned CBT techniques. Discharged with relapse prevention plan.')

c24 = mk_case(s24, p_bon,    ic_mars,   IC_NAMES[2], 'CLOSED', 'RED', 'Suicidal ideation, depression',
              'Student stabilized after crisis intervention. Transferred to outpatient psychiatry for ongoing care.',
              'PSYCHOLOGIST', 25, 16, 'PSYCHOLOGIST', 180,
              diagnoses=['Major Depressive Disorder, Severe'],
              termination_reason='REFERRED_EXTERNALLY',
              final_notes='Referred to NCMH outpatient. CPS services concluded.')

c25 = mk_case(s25, c_rose,   ic_ria,    IC_NAMES[3], 'CLOSED', 'GREEN', 'Stress, mild depression',
              'Student recovered well. PHQ-9 score improved from 14 to 4 over 8 sessions.',
              'COUNSELOR', 8, 5, 'COUNSELING', 130,
              termination_reason='GOALS_MET')

c26 = mk_case(s26, c_bia,    ic_cris,   IC_NAMES[4], 'CLOSED', 'YELLOW', 'Family conflict, self-esteem',
              'Student developed assertiveness and boundary-setting skills. Functioning improved.',
              'COUNSELOR', 9, 6, 'COUNSELING', 100,
              termination_reason='GOALS_MET')

c27 = mk_case(s27, p_shel,   ic_wil,    IC_NAMES[5], 'CLOSED', 'YELLOW', 'Trauma, abuse history',
              'Student completed trauma-focused therapy. Stabilized with strong support network.',
              'PSYCHOLOGIST', 19, 12, 'PSYCHOLOGIST', 200,
              diagnoses=['PTSD, In Remission'],
              termination_reason='GOALS_MET',
              final_notes='Completed 16-session trauma protocol. Significant reduction in PTSD symptoms.')

c28 = mk_case(s28, c_chelly, ic_rose_c, IC_NAMES[6], 'CLOSED', 'GREEN', 'Academic burnout',
              'Student implemented strategies for academic balance. No longer meets criteria for intervention.',
              'COUNSELOR', 5, 3, 'COUNSELING', 90,
              termination_reason='GOALS_MET')

c29 = mk_case(s29, c_daye,   ic_gracie, IC_NAMES[7], 'CLOSED', 'RED', 'Severe anxiety, agoraphobia',
              'Student transferred to psychiatry for medication management. Referred externally.',
              'PSYCHOLOGIST', 22, 14, 'PSYCHOLOGIST', 160,
              diagnoses=['Agoraphobia with Panic Disorder'],
              termination_reason='REFERRED_EXTERNALLY',
              final_notes='Referred to private psychiatrist. Student declined continued CPS services.')

c30 = mk_case(s30, p_jenny,  ic_julse,  IC_NAMES[0], 'CLOSED', 'GREEN', 'Grief, academic decline',
              'Student processed grief over loss of grandparent. Academic performance returned to baseline.',
              'COUNSELOR', 7, 4, 'COUNSELING', 110,
              termination_reason='GOALS_MET')

# ── NEW cases (recently created, not yet fully assigned) ──
c31 = mk_case(s31, c_clara,  ic_archie, IC_NAMES[1], 'NEW', 'YELLOW', 'Anxiety, social withdrawal',
              'Student referred by faculty. Reports significant social anxiety and withdrawal from classes.',
              'COUNSELOR', 11, 7, 'COUNSELING', 5)

c32 = mk_case(s32, p_daryl,  ic_mars,   IC_NAMES[2], 'NEW', 'RED', 'Crisis — self-harm disclosure',
              'Student disclosed recent self-harm to a friend who referred them to CPS.',
              'PSYCHOLOGIST', 24, 16, 'PSYCHOLOGIST', 3)

c33 = mk_case(s33, c_rose,   ic_ria,    IC_NAMES[3], 'NEW', 'GREEN', 'Academic stress, exam anxiety',
              'Student self-referred prior to board exams. Reports test anxiety and sleep difficulties.',
              'COUNSELOR', 8, 5, 'COUNSELING', 7)

c34 = mk_case(s34, c_bia,    ic_cris,   IC_NAMES[4], 'NEW', 'YELLOW', 'Depression, social isolation',
              'Student reports persistent low mood and withdrawal from social activities for the past month.',
              'COUNSELOR', 14, 9, 'COUNSELING', 4)

c35 = mk_case(s35, p_niko,   ic_wil,    IC_NAMES[5], 'NEW', 'RED', 'Eating disorder, restriction',
              'Student referred by school nurse due to significant weight loss and dietary restriction.',
              'PSYCHOLOGIST', 21, 14, 'PSYCHOLOGIST', 6)

print(f"✅ {_case_seq[0]} cases created")

# ── REFERRALS (external / internal service referrals with warm-handoff tracking) ─
def mk_referral(case_id, counselor_id, referral_type, reason, urgency, status,
                receiving_provider_name=None, service_type=None,
                assigned_to_user=None, assigned_to_role=None,
                warm_handoff_completed=False, days_ago=5, acknowledged=False):
    doc = {
        'case_id': case_id,
        'referring_counselor_id': counselor_id,
        'referral_type': referral_type,
        'reason': reason,
        'urgency': urgency,
        'status': status,
        'warm_handoff_completed': warm_handoff_completed,
        'created_at': H(days_ago), 'updated_at': H(max(0, days_ago - 1)),
    }
    if referral_type == 'EXTERNAL':
        doc.update({
            'sub_type': service_type or 'OTHER',
            'receiving_provider_name': receiving_provider_name,
            'receiving_provider_contact': None,
            'external_case_number': None,
            'roi_signed': status in ('ACKNOWLEDGED', 'IN_PROGRESS', 'COMPLETED'),
            'roi_file_url': None, 'roi_signed_at': None, 'roi_expires_at': None,
            'agency_response': 'Accepted — first appointment scheduled.' if status == 'COMPLETED' else None,
        })
    else:  # INTERNAL
        provider = None
        if assigned_to_user:
            provider = db.users.find_one({'_id': assigned_to_user})
        doc.update({
            'assigned_to_user': assigned_to_user,
            'assigned_to_role': assigned_to_role,
            'receiving_provider_id': assigned_to_user,
            'receiving_provider_name': f"{provider.get('first_name','')} {provider.get('last_name','')}".strip() if provider else None,
            'provider_acknowledgment_date': H(days_ago - 1) if acknowledged or status != 'SUBMITTED' else None,
        })
    return db.referrals.insert_one(doc).inserted_id

mk_referral(c1, c_rose, 'EXTERNAL',
            'Needs psychiatric medication evaluation alongside ongoing counseling.', 'urgent', 'ACKNOWLEDGED',
            receiving_provider_name='DLSU Health Services Psychiatry', service_type='MENTAL_HEALTH', days_ago=6)
mk_referral(c2, c_bia, 'INTERNAL',
            'Escalating to psychologist given passive SI and depressive severity.', 'urgent', 'COMPLETED',
            assigned_to_user=p_daryl, assigned_to_role='PSYCHOLOGIST', warm_handoff_completed=True, days_ago=20, acknowledged=True)
mk_referral(c18, p_chona, 'EXTERNAL',
            'Referral to substance-use outpatient program for co-occurring alcohol use.', 'routine', 'SUBMITTED',
            receiving_provider_name='DLSU Wellness — Substance Use Program', service_type='SOCIAL_SERVICES', days_ago=2)
mk_referral(c27, p_shel, 'INTERNAL',
            'Trauma history warrants specialized trauma-informed care.', 'routine', 'SUBMITTED',
            assigned_to_user=c_clara, assigned_to_role='COUNSELOR', days_ago=4)
mk_referral(c29, c_daye, 'EXTERNAL',
            'Agoraphobia symptoms require specialized exposure therapy beyond CPS scope.', 'urgent', 'COMPLETED',
            receiving_provider_name='DLSU Health Services Psychiatry', service_type='MENTAL_HEALTH',
            warm_handoff_completed=True, days_ago=15, acknowledged=True)
mk_referral(c32, p_daryl, 'INTERNAL',
            'High-risk case — routing to case manager for close monitoring.', 'urgent', 'ACKNOWLEDGED',
            assigned_to_user=cm_id, assigned_to_role='CASE_MANAGER', days_ago=1, acknowledged=True)
print("✅ Referrals seeded")

# ── APPOINTMENTS ───────────────────────────────────────────────────────────────
_apts = []

def apt(sid, cid, case_id, start, status, purpose='counseling', method='in_person', mins=50, note=None):
    end = start + timedelta(minutes=mins)
    doc = {
        'student_id': sid, 'counselor_id': cid, 'case_id': case_id,
        'student_name': _names[sid],
        'status': status, 'purpose': purpose, 'method': method,
        'scheduled_start': start, 'scheduled_end': end,
        'created_at': start - timedelta(days=7), 'updated_at': start,
    }
    if note:
        doc['notes'] = note
    _id = db.appointments.insert_one(doc).inserted_id
    _apts.append(_id)
    return _id

# Past completed appointments (for analytics) — mix of counseling + follow_up
for weeks_ago in [24, 20, 16, 12, 8, 4]:
    base = H(weeks_ago * 7)
    apt(s1,  c_rose,   c1,  base.replace(hour=9),  'COMPLETED', 'counseling')
    apt(s2,  c_bia,    c2,  base.replace(hour=10), 'COMPLETED', 'counseling')
    apt(s6,  p_daryl,  c6,  base.replace(hour=11), 'COMPLETED', 'counseling')
    apt(s7,  p_niko,   c7,  base.replace(hour=13), 'COMPLETED', 'counseling')
    apt(s11, p_bon,    c11, base.replace(hour=14), 'COMPLETED', 'counseling')
    apt(s16, p_jenny,  c16, base.replace(hour=15), 'COMPLETED', 'counseling')

# Recent past appointments (2 weeks ago to yesterday)
apt(s3,  c_chelly, c3,  H(14, 9),  'COMPLETED', 'counseling')
apt(s4,  c_daye,   c4,  H(14, 10), 'COMPLETED', 'counseling')
apt(s8,  c_rose,   c8,  H(14, 11), 'COMPLETED', 'counseling')
apt(s9,  c_bia,    c9,  H(14, 13), 'COMPLETED', 'counseling')
apt(s10, c_chelly, c10, H(14, 14), 'COMPLETED', 'follow_up')
apt(s12, c_daye,   c12, H(7,  9),  'COMPLETED', 'counseling')
apt(s13, c_clara,  c13, H(7,  10), 'COMPLETED', 'follow_up')
apt(s14, p_shel,   c14, H(7,  11), 'COMPLETED', 'counseling')
apt(s15, c_rose,   c15, H(7,  13), 'COMPLETED', 'counseling')
apt(s17, c_bia,    c17, H(3,  9),  'COMPLETED', 'counseling')
apt(s18, p_chona,  c18, H(3,  10), 'COMPLETED', 'counseling')
apt(s23, c_clara,  c23, H(5,  14), 'COMPLETED', 'follow_up')
apt(s2,  c_bia,    c2,  H(2,  10), 'COMPLETED', 'counseling')
apt(s6,  p_daryl,  c6,  H(2,  11), 'COMPLETED', 'counseling')

# No-shows
apt(s5,  c_clara,  c5,  H(10, 9),  'NO_SHOW', 'counseling')
apt(s10, c_chelly, c10, H(5,  14), 'NO_SHOW', 'counseling')
apt(s18, p_chona,  c18, H(6,  10), 'NO_SHOW', 'counseling')

# Cancelled
apt(s3,  c_chelly, c3,  H(21, 9),  'CANCELLED', 'counseling')
apt(s9,  c_bia,    c9,  H(21, 13), 'CANCELLED', 'follow_up')

# Currently IN SESSION — started 25 minutes ago (CONFIRMED + start in past + end in future)
_in_session_start = now - timedelta(minutes=25)
apt(s6, p_daryl, c6, _in_session_start, 'CONFIRMED', 'counseling')

# Today's upcoming confirmed appointments (start in future)
apt(s1,  c_rose,  c1,  now.replace(hour=14, minute=0,  second=0, microsecond=0), 'CONFIRMED', 'counseling')
apt(s2,  c_bia,   c2,  now.replace(hour=15, minute=0,  second=0, microsecond=0), 'CONFIRMED', 'counseling')
apt(s7,  p_niko,  c7,  now.replace(hour=16, minute=0,  second=0, microsecond=0), 'CONFIRMED', 'follow_up')
apt(s11, p_bon,   c11, now.replace(hour=17, minute=0,  second=0, microsecond=0), 'CONFIRMED', 'counseling')
apt(s14, p_shel,  c14, now.replace(hour=17, minute=30, second=0, microsecond=0), 'CONFIRMED', 'counseling')

# Upcoming appointments
_upcoming = [
    (s3,  c_chelly, c3,  9,  'counseling'), (s4,  c_daye,   c4,  10, 'counseling'),
    (s8,  c_rose,   c8,  11, 'counseling'), (s9,  c_bia,    c9,  13, 'follow_up'),
    (s10, c_chelly, c10, 14, 'counseling'), (s12, c_daye,   c12, 9,  'counseling'),
    (s13, c_clara,  c13, 10, 'counseling'), (s15, c_rose,   c15, 13, 'others'),
    (s16, p_jenny,  c16, 14, 'counseling'), (s17, c_bia,    c17, 9,  'counseling'),
    (s18, p_chona,  c18, 10, 'counseling'), (s5,  c_clara,  c5,  11, 'follow_up'),
]
for days_ahead, (sv, cov, casev, hr, purp) in enumerate(_upcoming, start=1):
    apt(sv, cov, casev, F(days_ahead, hr), 'CONFIRMED', purp)

# Walk-in intake appointments
apt(s36, ic_julse,  None, now.replace(hour=10, minute=30, second=0, microsecond=0), 'CONFIRMED', 'intake_interview')
apt(s37, ic_archie, None, F(1, 9), 'CONFIRMED', 'intake_interview')
apt(s38, ic_mars,   None, F(2, 10), 'CONFIRMED', 'intake_interview')
apt(s39, ic_ria,    None, F(3, 9), 'CONFIRMED', 'intake_interview')
apt(s40, ic_cris,   None, F(4, 11), 'CONFIRMED', 'intake_interview')

print(f"✅ {len(_apts)} appointments created")

# ── SESSION NOTES ──────────────────────────────────────────────────────────────
def soap(case_id, cid, sid, dt, subj, obj, asmt, plan, mood=5, risk=False):
    db.session_notes.insert_one({
        'case_id': case_id, 'counselor_id': cid, 'student_id': sid,
        'student_name': _names[sid],
        'session_date': dt, 'session_type': 'INDIVIDUAL',
        'note_format': 'SOAP',
        'soap': {'subjective': subj, 'objective': obj, 'assessment': asmt, 'plan': plan},
        'structured_soap': None,
        'mood_rating': mood, 'risk_flagged': risk,
        'risk_notes': 'Monitor closely — elevated risk' if risk else None,
        'is_deleted': False, 'current_version': 1, 'edit_history': [],
        'created_at': dt, 'updated_at': dt,
    })

def narrative(case_id, cid, sid, dt, content, mood=5):
    db.session_notes.insert_one({
        'case_id': case_id, 'counselor_id': cid, 'student_id': sid,
        'student_name': _names[sid],
        'session_date': dt, 'session_type': 'INDIVIDUAL',
        'note_format': 'NARRATIVE', 'note_content': content,
        'mood_rating': mood, 'risk_flagged': False,
        'is_deleted': False, 'current_version': 1, 'edit_history': [],
        'created_at': dt, 'updated_at': dt,
    })

# Emma (c1) — ACTIVE GREEN, counseling sessions
soap(c1, c_rose, s1, H(28,9),
    'Client reports academic stress is still significant. Difficulty sleeping before deadlines. Tried the thought records but found them challenging.',
    'Client appeared tense, fidgety. Engaged well once rapport established. Mood described as 5/10.',
    'Generalized anxiety related to academic performance. Avoidance pattern identified around thesis submission.',
    'Continue thought records. Assign 10-min daily journaling. Explore procrastination triggers next session.', mood=5)
soap(c1, c_rose, s1, H(21,9),
    'Client tried journaling — found it helpful. Submitted thesis draft on time. Reports feeling "less catastrophic" about grades.',
    'Noticeably calmer. Made eye contact throughout. Brought journal to session. Mood 6/10.',
    'Anxiety improving with behavioral strategies. Cognitive restructuring taking hold.',
    'Continue journaling. Introduce progressive muscle relaxation for exam nights. Plan 2 more sessions then review.', mood=6)
soap(c1, c_rose, s1, H(14,9),
    'Client passed midterms. Mood significantly improved. Reports using thought records independently.',
    'Client smiling, engaged. Spontaneous humor. Mood 7/10. Less tension in posture.',
    'Good progress on anxiety management goals. Academic performance stabilizing.',
    'Begin tapering plan. Assign independent stress management protocol. Discuss potential closure in 2 sessions.', mood=7)

# Mark (c2) — ACTIVE RED, depression/SI
soap(c2, c_bia, s2, H(25,10),
    'Client presents with passive SI — "I sometimes wish I wouldn\'t wake up." No plan, no intent. Reports complete social withdrawal.',
    'Client appeared flat, poorly groomed. Spoke in monotone. PHQ-9 administered: score 22.',
    'Major Depressive Disorder, Moderate-Severe (F32.1). Passive SI without plan. High risk of escalation.',
    'Update safety plan. Increase session frequency to twice weekly. Coordinate with psychiatry for medication evaluation.', mood=2, risk=True)
soap(c2, c_bia, s2, H(18,10),
    'Client engaged with safety plan. Has been texting trusted friend daily as agreed. SI thoughts less frequent.',
    'Client slightly more alert. Some affect returning. PHQ-9: 19 — minimal improvement.',
    'Depression remains severe. Safety plan compliance is protective. Medication referral pending.',
    'Follow up on psychiatry referral. Continue safety monitoring. Introduce behavioral activation (2 tasks/day).', mood=3, risk=True)
soap(c2, c_bia, s2, H(11,10),
    'Client started antidepressant 5 days ago. Reports mild nausea but tolerating. Completed 3 behavioral activation tasks.',
    'Client more animated than previous sessions. Some return of affect. PHQ-9: 17.',
    'Depression responding to combined psychotherapy + medication. Behavioral activation showing early results.',
    'Continue behavioral activation. Monitor medication side effects. Explore interpersonal triggers for low mood.', mood=4)
soap(c2, c_bia, s2, H(4,10),
    'Client reports first week in a month without passive SI thoughts. Slept 7 hours two nights in a row.',
    'Client made a joke during session for the first time. Mood 5/10. Posture more open.',
    'Significant improvement. SI remitted. PHQ-9: 14 — moderate range. Medication appears effective.',
    'Continue current treatment plan. Begin cognitive restructuring for hopeless cognitions. Plan for relapse prevention.', mood=5)

# Alex (c6) — ACTIVE RED, SI with plan — CRISIS notes
soap(c6, p_daryl, s6, H(10,11),
    'Client disclosed having a specific plan for suicide (medication overdose). Stated method and identified access. Distressed and tearful.',
    'Client highly distressed. Crying throughout. SI with plan confirmed. Emergency contact notified during session.',
    'ACTIVE SUICIDAL IDEATION WITH PLAN — Crisis level. Mandatory reporting initiated.',
    'Safety plan activated. All medications removed from room. Family briefed. Daily welfare calls initiated. Referred to psychiatric emergency consult.', mood=1, risk=True)
soap(c6, p_daryl, s6, H(7,11),
    'Client reports SI thoughts reduced after family intervention and medication removal. Denies current active planning.',
    'Client calmer than crisis session. Still very low mood. Eye contact maintained. Safety plan reviewed.',
    'Post-crisis stabilization. Acute SI reduced. Passive ideation persists. Requires continued close monitoring.',
    'Continue daily welfare checks. Start pharmacotherapy for depression (coordinated with psychiatry). Next session in 2 days.', mood=2, risk=True)
soap(c6, p_daryl, s6, H(4,11),
    'Client engaged with psychiatrist. Antidepressant started. Reports sleeping better. No active SI thoughts for 48 hours.',
    'Less distressed. Made brief eye contact. Reports feeling "a tiny bit less hopeless."',
    'Post-crisis — significant improvement. Active SI resolved. Passive ideation present but manageable.',
    'Weekly sessions for now. Continue safety monitoring. Work on cognitive distortions around hopelessness.', mood=3, risk=True)

# James/Miguel (c7) — PTSD
soap(c7, p_niko, s7, H(45,13),
    'Client describes recurring nightmares about the accident 3–4 nights per week. Avoids all forms of transport.',
    'Client appeared hypervigilant — sat near door, scanned room on entry. Startled by phone notification.',
    'PTSD (F43.1) — avoidance and hyperarousal clusters prominent.',
    'Psychoeducation on trauma response. Introduce grounding techniques (5-4-3-2-1). No exposure work yet.', mood=3)
soap(c7, p_niko, s7, H(38,13),
    'Client used grounding during a flashback at school. Reports it "stopped the spiral." Still avoiding transport.',
    'Slightly less hypervigilant than intake. Sustained eye contact for longer periods.',
    'PTSD stabilizing. Grounding techniques effective. Avoidance still primary impairment.',
    'Introduce trauma narrative — written format. Begin imaginal exposure preparation.', mood=4)
soap(c7, p_niko, s7, H(31,13),
    'Client began written trauma narrative. Highly distressing but completed. Reports dream frequency reduced to 1–2/week.',
    'Client tearful during narrative review. Contained within session. Mood 5/10 by end of session.',
    'PTSD processing initiated. Good tolerance of distress. Avoidance behaviors beginning to reduce.',
    'Continue trauma narrative processing. Gradual in-vivo exposure to public transport (bus stop only).', mood=5)

# Carlos (c9) — burnout
soap(c9, c_bia, s9, H(15,14),
    'Client reports feeling "empty" and exhausted despite adequate sleep. Dropped extracurricular activities.',
    'Client appeared withdrawn, flat affect. Spoke slowly. Did not initiate any topics.',
    'Academic burnout with early depressive features. No SI. GAD-7: 9.',
    'Validate burnout experience. Introduce behavioral activation log. Reduce demands temporarily.', mood=3)
soap(c9, c_bia, s9, H(8,14),
    'Client completed behavioral activation log. Identified 3 enjoyable activities. Re-engaged with cooking.',
    'Noticeably more animated. Shared photo of a dish they cooked. Mood 6/10.',
    'Burnout recovery initiated. Behavioral activation effective. Academic re-engagement gradual.',
    'Continue activation. Introduce value-based activity scheduling. Discuss academic load redistribution.', mood=6)

# Amy (c11) — eating disorder
soap(c11, p_bon, s11, H(35,9),
    'Client minimizes severity — "I eat when I\'m hungry." BMI: 17.0. Amenorrhea for 2 months. Exercises 3 hours daily.',
    'Client thin, pale. Defensive when nutrition discussed. Denies problem.',
    'Anorexia Nervosa, Restrictive Type (F50.0). Medical risk increasing. Insight poor.',
    'Motivational interviewing approach. Nutritional psychoeducation. Coordinate with physician for medical monitoring.', mood=4)
soap(c11, p_bon, s11, H(28,9),
    'Client admits eating is "controlled." Identifies fear of weight gain. Reluctant but willing to try meal plan.',
    'Slightly more engaged. Acknowledged that fatigue is affecting academics — leverage point identified.',
    'Anorexia — minimal insight but emerging ambivalence. Academic impact may be motivator for change.',
    'Introduce meal plan (1200 kcal minimum). Monitor weight weekly with physician. Target academic functioning as motivator.', mood=4)
soap(c11, p_bon, s11, H(21,9),
    'Client followed meal plan 4 of 7 days. Weight: 45 kg (stable). Reports less fatigue.',
    'Client appeared slightly more energized. Volunteered information without prompting.',
    'Anorexia — early recovery stage. Meal adherence 57%. Medical stability maintained.',
    'Continue meal plan. Address cognitive distortions about food and body. Family session to be scheduled.', mood=5)

# Sofia (c5) — career anxiety
narrative(c5, c_clara, s5, H(20,11),
    'Session focused on career exploration. Sofia identified her core values: creativity, helping others, and financial stability. Acknowledged conflict between expected career path (nursing) and personal interest in arts therapy. No crisis concerns. Mood: 5/10.', mood=5)
narrative(c5, c_clara, s5, H(13,11),
    'Sofia researched arts therapy as a career and brought printed materials. Significantly more animated than previous sessions. Began drafting personal mission statement. Explored family expectations around career. Mood: 7/10.', mood=7)

# Closed cases — historical notes
for i, (casev, cov, sv, dt, content) in enumerate([
    (c22, c_daye,   s22, H(100,9), 'Session 6/6 (Final). Client has successfully adjusted to university. Academic performance improved. Social connections established. Goals fully met. Discharged with follow-up self-monitoring plan. Mood: 8/10.'),
    (c25, c_rose,   s25, H(80,10), 'Termination session. PHQ-9: 4 (was 14 at intake). Client demonstrates consistent use of CBT strategies. Strong support system in place. Excellent treatment outcomes. Mood: 9/10.'),
    (c27, p_shel,   s27, H(120,11),'Final session — PTSD in remission. PCL-5 score: 12 (was 52 at intake). Client has returned to full functioning. No avoidance behaviors. Safety established. Referral to community support group provided. Mood: 8/10.'),
    (c30, c_rose,   s30, H(70,9),  'Termination session for grief counseling. Client successfully processed loss of grandparent. Academic attendance and GPA restored. Has established new routines honoring memory. Mood: 8/10.'),
]):
    narrative(casev, cov, sv, dt, content, mood=8)

print("✅ Session notes seeded")

# ── SAFETY PLANS ───────────────────────────────────────────────────────────────
for sv, casev, cov in [(s2, c2, c_bia), (s6, c6, p_daryl), (s7, c7, p_niko)]:
    db.safety_plans.insert_one({
        'case_id': casev, 'student_id': sv, 'created_by': cov,
        'warning_signs': ['Increased isolation', 'Stopping medication', 'Giving away belongings'],
        'coping_strategies': ['Call a trusted friend', 'Go for a walk', 'Listen to calming music', 'Use breathing exercises'],
        'reasons_for_living': ['Family', 'Future goals', 'Pet'],
        'contacts': [
            {'name': 'Counselor', 'phone': '(02) 8524-4611 ext 420'},
            {'name': 'Crisis Hotline', 'phone': '1553'},
            {'name': 'Trusted Friend', 'phone': '09171234567'},
        ],
        'emergency_contacts': [{'name': 'Parent', 'phone': '09181234567'}],
        'created_at': H(rng.randint(5, 20)), 'updated_at': now,
    })
print("✅ Safety plans seeded")

# ── PERMA SNAPSHOTS (EMA / MHBot linked students) ───────────────────────────────
# Each entry is a label 1-5 score: In Crisis=1, Struggling=2, Surviving=3, Thriving=4, Excelling=5.
# Real EMA check-ins are near-daily with some gaps and gradual drift, not random noise —
# generate a short "walk" per student around a baseline so the trend graph reads naturally.
_LABEL_ORDER = ['In Crisis', 'Struggling', 'Surviving', 'Thriving', 'Excelling']

# (student, baseline label, trend) — trend: 'stable' | 'declining' | 'improving' | 'volatile'
_perma_map = {
    s1:  ('Thriving',   'stable'),      s2:  ('Struggling', 'declining'),
    s3:  ('Surviving',  'improving'),   s4:  ('Thriving',   'stable'),
    s5:  ('Excelling',  'stable'),      s6:  ('In Crisis',  'volatile'),
    s7:  ('Struggling', 'volatile'),    s8:  ('Surviving',  'stable'),
    s9:  ('Thriving',   'improving'),   s10: ('Surviving',  'declining'),
    s11: ('Struggling', 'stable'),      s12: ('Surviving',  'stable'),
    s13: ('Surviving',  'improving'),   s14: ('Thriving',   'stable'),
    s15: ('Thriving',   'volatile'),    s16: ('Struggling', 'declining'),
    s17: ('Thriving',   'stable'),      s18: ('Surviving',  'improving'),
    s19: ('Excelling',  'stable'),      s20: ('Excelling',  'stable'),
    s21: ('Surviving',  'stable'),      s22: ('Thriving',   'improving'),
    s23: ('Thriving',   'stable'),      s24: ('Surviving',  'declining'),
    s25: ('Excelling',  'stable'),      s26: ('Struggling', 'volatile'),
    s27: ('Surviving',  'stable'),      s28: ('Thriving',   'stable'),
    s29: ('Surviving',  'improving'),   s30: ('Thriving',   'stable'),
    s32: ('Excelling',  'stable'),      s33: ('Surviving',  'declining'),
    s34: ('Thriving',   'stable'),      s35: ('Struggling', 'improving'),
}

DAYS_OF_HISTORY = 45

def _next_value(cur, base, trend, progress):
    """Mean-reverting float walk around `base` (0..4). `progress` is 0→1 oldest→newest."""
    pull = (base - cur) * 0.25  # gentle pull back toward baseline so it doesn't wander off
    if trend == 'declining':
        bias, noise_amp = -0.06 * progress * 4, 0.35
    elif trend == 'improving':
        bias, noise_amp = 0.06 * progress * 4, 0.35
    elif trend == 'volatile':
        bias, noise_amp = 0, 0.9
    else:  # stable
        bias, noise_amp = 0, 0.4
    noise = rng.uniform(-noise_amp, noise_amp)
    return max(0.0, min(4.0, cur + pull + bias + noise))

for sv, (baseline, trend) in _perma_map.items():
    base_idx = float(_LABEL_ORDER.index(baseline))
    mhbot_username = _emails[sv].split('@')[0]
    entries = []
    cur_val = base_idx
    for day in range(DAYS_OF_HISTORY, -1, -1):
        # ~75% check-in rate — students don't check in every single day
        if rng.random() > 0.75 and day != 0:
            continue
        cur_val = _next_value(cur_val, base_idx, trend, (DAYS_OF_HISTORY - day) / DAYS_OF_HISTORY)
        label = _LABEL_ORDER[round(cur_val)]
        entry_date = H(day, h=rng.randint(7, 22), m=rng.randint(0, 59))
        entries.append((entry_date, label))
    entries.sort(key=lambda e: e[0])
    for entry_date, label in entries:
        db.perma_snapshots.insert_one({
            'student_user_id': sv,
            'mhbot_username': mhbot_username,
            'perma_label': label,
            'entry_date': entry_date,
            'raw_date': entry_date.isoformat(),
            'saved_at': entry_date,
        })
    latest_date, latest_label = entries[-1]
    db.users.update_one({'_id': sv}, {'$set': {
        'mhbot_username': mhbot_username,
        'perma_latest_label': latest_label,
        'perma_latest_date': latest_date.isoformat(),
        'perma_synced_at': now,
    }})
print(f"✅ PERMA snapshots seeded ({len(_perma_map)} EMA-linked students, ~{DAYS_OF_HISTORY}d history each)")

# ── ANNOUNCEMENTS ──────────────────────────────────────────────────────────────
db.announcements.insert_many([
    {'title': 'CPS Mental Health Awareness Week', 'body': 'Join us from July 28–Aug 1 for free wellness workshops, stress management seminars, and drop-in counseling sessions. Open to all DLSU students.', 'event_type': 'event', 'pinned': False, 'is_active': True, 'created_by': admin_id, 'created_at': H(3), 'updated_at': H(3), 'target_roles': ['STUDENT']},
    {'title': 'Semestral Break Office Hours', 'body': 'CPS will be open for emergency consultations during semestral break (Aug 5–16). Please call ahead to schedule. Regular services resume Aug 19.', 'event_type': 'notice', 'pinned': False, 'is_active': True, 'created_by': admin_id, 'created_at': H(7), 'updated_at': H(7), 'target_roles': ['STUDENT', 'COUNSELOR', 'IC']},
    {'title': 'New: Online Booking Now Available', 'body': 'Students can now book intake appointments directly through the CPS portal. Click "Request a Session" from your dashboard to get started.', 'event_type': 'notice', 'pinned': False, 'is_active': True, 'created_by': admin_id, 'created_at': H(14), 'updated_at': H(14), 'target_roles': ['STUDENT']},
])
print("✅ Announcements seeded")

# ── RESOURCES ──────────────────────────────────────────────────────────────────
db.resources.insert_many([
    {'title': 'Understanding Anxiety', 'description': 'A guide to recognizing and managing anxiety symptoms.', 'category': 'Mental Health', 'type': 'Article', 'url': 'https://www.nimh.nih.gov/health/topics/anxiety-disorders', 'is_active': True, 'created_at': H(30)},
    {'title': 'Managing Academic Stress', 'description': 'Practical tips for university students dealing with academic pressure.', 'category': 'Academic', 'type': 'Guide', 'url': 'https://www.apa.org/topics/stress/stress-student', 'is_active': True, 'created_at': H(30)},
    {'title': 'Mindfulness Exercises', 'description': 'Simple mindfulness practices for everyday stress relief.', 'category': 'Wellness', 'type': 'Exercise', 'url': 'https://www.headspace.com/meditation/mindfulness', 'is_active': True, 'created_at': H(30)},
    {'title': 'Crisis Hotlines Philippines', 'description': 'List of 24/7 crisis hotlines available in the Philippines.', 'category': 'Crisis', 'type': 'Reference', 'is_active': True, 'content': 'NCMH Crisis Hotline: 1553\nDOH Mental Health: (02) 894-26099\nNATASOPH: (02) 8426-6342', 'created_at': H(30)},
])
print("✅ Resources seeded")

# ── NOTIFICATIONS ──────────────────────────────────────────────────────────────
db.notifications.insert_many([
    {'user_id': s1, 'type': 'APPOINTMENT_CONFIRMED', 'title': 'Appointment Confirmed', 'message': 'Your counseling session has been confirmed for today at 9:00 AM.', 'is_read': False, 'created_at': H(1)},
    {'user_id': s2, 'type': 'APPOINTMENT_REMINDER', 'title': 'Upcoming Appointment', 'message': 'Reminder: You have a counseling session tomorrow at 10:00 AM.', 'is_read': False, 'created_at': H(1)},
    {'user_id': c_bia, 'type': 'NEW_CASE', 'title': 'New Case Assigned', 'message': 'A new case has been assigned to you. Please review.', 'is_read': False, 'created_at': H(2)},
    {'user_id': admin_id, 'type': 'HIGH_RISK_ALERT', 'title': 'High Risk Alert', 'message': 'A student has been flagged as CRITICAL risk. Please review.', 'is_read': False, 'created_at': H(1)},
])
print("✅ Notifications seeded")

# ── CHECK-INS ──────────────────────────────────────────────────────────────────
_checkins = [
    (c2, s2, c_bia,   'WELFARE_CHECK',   'STABLE',     H(3,10),  'Phone welfare check. Student confirms following safety plan. SI thoughts absent for past 48 hours. Emergency contact engaged.'),
    (c6, s6, p_daryl, 'WELFARE_CHECK',   'STABILIZING',H(5,11),  'Daily welfare check. Student responded promptly. Denies SI. Family support active. Medication started.'),
    (c6, s6, p_daryl, 'WELFARE_CHECK',   'STABLE',     H(3,11),  'Daily check. Student engaged with behavioral activation. Expressed hope about upcoming session.'),
    (c7, s7, p_niko,  'STATUS_UPDATE',   'IMPROVING',  H(10,13), 'Email check-in. Student reports nightmares reduced. Completed grounding exercise log. Attending classes again.'),
    (c1, s1, c_rose,  'STATUS_UPDATE',   'IMPROVING',  H(7,9),   'Brief email follow-up. Emma confirms journaling consistently. Passed midterms. Less anxious than last session.'),
    (c11, s11, p_bon, 'WELFARE_CHECK',   'STABLE',     H(14,9),  'Phone check-in. Student completed 4/7 meal plan days. Weight stable. Physician cleared no immediate medical emergency.'),
    (c19, s19, c_rose,'STATUS_UPDATE',   'STABLE',     H(5,9),   'Pre-termination check. Student confirms maintaining gains. No relapse. Ready for discharge.'),
    (c21, s21, p_daryl,'STATUS_UPDATE',  'STABLE',     H(7,9),   'Pre-termination check. PHQ-9 administered: score 7 (was 22). Student confident in self-monitoring.'),
]
for casev, sv, cov, ctype, cstatus, dt, note in _checkins:
    ci_id = db.check_ins.insert_one({
        'case_id': casev, 'student_id': sv, 'counselor_id': cov,
        'check_in_type': ctype, 'client_status': cstatus,
        'notes': note, 'contact_method': 'PHONE' if 'Phone' in note else 'EMAIL',
        'created_at': dt, 'updated_at': dt,
    }).inserted_id
    db.cases.update_one({'_id': casev}, {'$push': {'check_ins': {'check_in_id': ci_id, 'date': dt, 'type': ctype}}})
print("✅ Check-ins seeded")

# ── IC INTERVIEW FORM ENRICHMENT ───────────────────────────────────────────────
# Add full 11-section IC documentation to key active cases
_ic_enrichments = {
    c1: {
        'general_appearance': ['Neat and well-groomed – organized, clean, and appropriately dressed', 'Relaxed and open body language – comfortable, natural posture'],
        'communication_style': ['Clear and articulate – expresses thoughts clearly and fluently', 'Emotionally expressive – regularly shows emotion in speech'],
        'general_disposition': ['Cooperative and engaged – participates actively in the session', 'Anxious or apprehensive – visibly nervous or worried during the session'],
        'brief_description_remarks': 'Student presented punctually and was cooperative throughout intake. Visible tension in shoulders. Well-dressed, appropriate for the setting.',
        'presenting_problem': ['Anxiety / worry – persistent anxiety, nervousness, or excessive worry', 'Academic concern – stress, poor performance, or difficulty managing academic load'],
        'presenting_problem_remarks': 'Student reports significant anxiety around thesis submission and upcoming oral defense. Has been experiencing anticipatory dread for approximately 3 weeks.',
        'psychosocial_history': ['Academic or work functioning – level of motivation, performance, or adjustment', 'Coping styles and strategies – ways the client typically manages stress', 'Peer and social relationships – quality of friendships or social supports'],
        'psychosocial_remarks': 'Student has strong academic history. First time seeking counseling. Support from close friend group. No prior mental health history. Coping through avoidance currently.',
        'interaction_relationship': ['Engaged and cooperative – open, responsive, and actively participated', 'Warm and receptive – friendly and comfortable engaging in dialogue'],
        'affect_expression': ['Appropriate to content – emotion matches the topic being discussed', 'Anxious / tense – fidgety, restless, or visibly nervous'],
        'interaction_remarks': 'Student was open and forthcoming. Rapport established quickly. Responded well to normalization of anxiety.',
        'maladaptive_patterns': ['Avoidance behaviors – Tendency to avoid situations, tasks, or conversations that cause discomfort', 'Excessive worry or rumination – Repetitive overthinking, difficulty letting go'],
        'counseling_goal': 'Within 8 sessions, the student will demonstrate consistent use of at least two adaptive coping strategies (thought records, scheduled worry time) to reduce anxiety episodes from daily to 2–3×/week, as measured by weekly GAD-7 reassessment.',
        'predisposing_factors': ['Personality traits (e.g., perfectionism, dependency, impulsivity)'],
        'precipitating_factors': ['Academic or work stress / overload'],
        'perpetuating_factors': ['Maladaptive coping (avoidance, withdrawal, substance use)', 'Negative thinking patterns or self-criticism'],
        'protective_factors': ['Supportive relationships or social network', 'Motivation to improve / willingness to seek help', 'Academic or work engagement'],
        'recommendation': ['Continue Counseling / Psychotherapy – client to engage in ongoing sessions with same counselor/psychologist or team', 'Follow-up Session Scheduled – next session date or frequency confirmed'],
    },
    c2: {
        'general_appearance': ['Disheveled or unkempt – noticeably disorganized or poorly maintained appearance', 'Tired or fatigued – appears sleep-deprived or low energy'],
        'communication_style': ['Hesitant or guarded – pauses frequently or appears reluctant to share', 'Minimal responder – gives short, one-word, or limited responses'],
        'general_disposition': ['Sad or tearful – displays sadness; may cry during session', 'Withdrawn or avoidant – quiet, minimal eye contact, or reluctant to engage'],
        'brief_description_remarks': 'Student appeared visibly fatigued and under-groomed. Slow gait. Sat hunched. Cried briefly when asked about academic performance.',
        'presenting_problem': ['Depression / low mood – persistent sadness, low energy, or hopelessness', 'Self-esteem concern – low confidence, self-doubt, or negative self-image'],
        'presenting_problem_remarks': 'Student reports persistent low mood for 6 weeks, passive suicidal ideation (no plan), social isolation, and inability to experience pleasure. PHQ-9: 22 (Severe).',
        'psychosocial_history': ['Significant past experiences – history of trauma, loss, illness, or major life transitions', 'Family background – quality of family relationships, support, or sources of conflict', 'Coping styles and strategies – ways the client typically manages stress'],
        'psychosocial_remarks': 'Parental divorce during high school. Strained relationship with father. Historically used exercise and social activities as coping — both now abandoned. No prior counseling.',
        'interaction_relationship': ['Guarded or hesitant – cautious, reserved, or limited in responses', 'Calm and composed – steady demeanor and appropriate behavior'],
        'affect_expression': ['Depressed / sad – flat affect, tearful, or downcast tone', 'Flat / restricted – limited range of emotion or monotone tone'],
        'interaction_remarks': 'Student was difficult to engage initially. Opened up gradually when depression was normalized. Expressed relief at being heard.',
        'maladaptive_patterns': ['Avoidance behaviors – Tendency to avoid situations, tasks, or conversations that cause discomfort', 'Negative self-talk or self-criticism – Persistent self-blame, harsh internal dialogue, or low self-worth', 'Emotional suppression – Difficulty expressing or acknowledging emotions'],
        'counseling_goal': 'Within 12 sessions, the student will reduce PHQ-9 score from 22 to below 10, demonstrate active engagement with behavioral activation, and maintain a robust safety plan, with no SI episodes requiring crisis intervention.',
        'predisposing_factors': ['Family history of mental health or relational problems', 'Limited early emotional support or attachment disruption'],
        'precipitating_factors': ['Academic or work stress / overload', 'Traumatic or critical incident'],
        'perpetuating_factors': ['Ongoing stressors (family, financial, workload)', 'Poor self-care or sleep habits', 'Negative thinking patterns or self-criticism'],
        'protective_factors': ['Motivation to improve / willingness to seek help', 'Access to mental health and community resources'],
        'recommendation': ['Crisis Intervention / Safety Plan Initiated – immediate response to safety or suicide risk concerns', 'Referral to Psychiatrist / Physician – for medication evaluation or medical management', 'Continue Counseling / Psychotherapy – client to engage in ongoing sessions with same counselor/psychologist or team'],
    },
    c6: {
        'general_appearance': ['Disheveled or unkempt – noticeably disorganized or poorly maintained appearance', 'Notable physical signs of distress – shaking, nail-biting, or visible signs of anxiety', 'Tired or fatigued – appears sleep-deprived or low energy'],
        'communication_style': ['Minimal responder – gives short, one-word, or limited responses'],
        'general_disposition': ['Sad or tearful – displays sadness; may cry during session', 'Resistant or avoidant – reluctant to engage or discuss certain topics'],
        'brief_description_remarks': 'Student appeared highly distressed. Shaking hands. Spoke barely above a whisper. Admitted to active suicidal ideation with a specific plan — emergency protocol activated mid-session.',
        'presenting_problem': ['Depression / low mood – persistent sadness, low energy, or hopelessness', 'Trauma – distressing experiences affecting daily life'],
        'presenting_problem_remarks': 'Student disclosed SI with a concrete plan (medication overdose). Expressed hopelessness and feeling like a burden. PHQ-9: 27 (Severe). Immediate crisis response initiated.',
        'psychosocial_history': ['Significant past experiences – history of trauma, loss, illness, or major life transitions', 'Family background – quality of family relationships, support, or sources of conflict'],
        'psychosocial_remarks': 'History of depressive episodes. Family conflict ongoing. Lost close friend to suicide one year ago. No prior counseling engagement.',
        'interaction_relationship': ['Withdrawn or avoidant – quiet, minimal eye contact, or reluctant to engage'],
        'affect_expression': ['Depressed / sad – flat affect, tearful, or downcast tone', 'Flat / restricted – limited range of emotion or monotone tone'],
        'interaction_remarks': 'Student was minimally responsive. Disclosure of SI required multiple gentle prompts. Once disclosed, became tearful and expressed relief.',
        'maladaptive_patterns': ['Avoidance behaviors – Tendency to avoid situations, tasks, or conversations that cause discomfort', 'Negative self-talk or self-criticism – Persistent self-blame, harsh internal dialogue, or low self-worth', 'Trauma-related responses – Hypervigilance, emotional numbing, or heightened reactivity'],
        'counseling_goal': 'Immediate safety stabilization. Within 4 sessions: student will demonstrate consistent safety plan adherence, deny active SI, and engage with psychiatric evaluation and medication management.',
        'predisposing_factors': ['Family history of mental health or relational problems', 'Significant past experiences – history of trauma, loss, illness, or major life transitions'],
        'precipitating_factors': ['Recent loss or separation', 'Academic or work stress / overload'],
        'perpetuating_factors': ['Negative thinking patterns or self-criticism', 'Lack of insight or resistance to change', 'Environmental barriers (limited support, unsafe environment)'],
        'protective_factors': ['Motivation to improve / willingness to seek help', 'Access to mental health and community resources'],
        'recommendation': ['Crisis Intervention / Safety Plan Initiated – immediate response to safety or suicide risk concerns', 'Referral to Psychiatrist / Physician – for medication evaluation or medical management'],
    },
}
for case_id, fields in _ic_enrichments.items():
    db.cases.update_one({'_id': case_id}, {'$set': {f'intake_interview_form.{k}': v for k, v in fields.items()}})
print("✅ IC interview forms enriched")

# ── SUMMARY ────────────────────────────────────────────────────────────────────
print()
print("=" * 55)
print("✅ Seed complete!")
print(f"   Users:         {db.users.count_documents({})}")
print(f"   Students:      {db.users.count_documents({'role':'STUDENT'})}")
print(f"   Cases:         {db.cases.count_documents({})}")
print(f"   Appointments:  {db.appointments.count_documents({})}")
print(f"   Session notes: {db.session_notes.count_documents({})}")
print(f"   PERMA entries: {db.perma_snapshots.count_documents({})}")
print("=" * 55)
print()
print("Credentials:")
print("  admin@dlsu.edu.ph       / admin123   (ADMIN)")
print("  dpo@dlsu.edu.ph         / dpo123     (DPO)")
print("  staff@dlsu.edu.ph       / staff123   (STAFF/OA)")
print("  cm@dlsu.edu.ph          / cm123      (CASE_MANAGER)")
print("  julse@dlsu.edu.ph       / julse123   (IC)")
print("  rose.t@dlsu.edu.ph      / roset123   (COUNSELOR)")
print("  daryl@dlsu.edu.ph       / daryl123   (PSYCHOLOGIST)")
print("  ejohnson@dlsu.edu.ph    / stu001     (STUDENT — active case)")
print("  achen@dlsu.edu.ph       / stu006     (STUDENT — CRITICAL risk)")
