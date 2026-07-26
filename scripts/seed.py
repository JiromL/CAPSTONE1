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
WIPE = [
    'users','appointments','cases','intakes','counselor_availability',
    'counselor_weekly_schedule','session_notes','check_ins','safety_plans',
    'perma_snapshots','perma_history','missed_appointment_tracker',
    'notifications','announcements','resources','consent_records',
    'reschedule_requests','non_counseling_clients',
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
def F(d, h=9, m=0):  return (now + timedelta(days=d)).replace(hour=h, minute=m, second=0, microsecond=0)
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
        'session_method': 'F2F',
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

c6  = mk_case(s6,  p_daryl,  ic_julse,  IC_NAMES[0], 'ACTIVE',   'CRITICAL','Severe depression, SI with plan',
              'Student presents with SI with a plan. Reports hopelessness, social isolation, and inability to function.',
              'PSYCHOLOGIST', 27, 18, 'PSYCHOLOGIST', 14,
              goals=_g(('Immediate safety — daily check-ins','in_progress'),('Address suicidal cognitions','not_started'),('Family engagement','not_started')),
              diagnoses=['Major Depressive Disorder, Severe with Psychotic Features'])

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
              client_status='PENDING_DISCHARGE',
              goals=_g(('Maintain gains post-therapy','completed'),('Develop relapse prevention plan','completed')))

c20 = mk_case(s20, c_chelly, ic_rose_c, IC_NAMES[6], 'PENDING_TERMINATION', 'GREEN', 'Grief, loss of pet/relationship',
              'Student has processed grief. Functioning has returned to baseline.',
              'COUNSELOR', 4, 3, 'COUNSELING', 75,
              client_status='PENDING_DISCHARGE')

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

# ── APPOINTMENTS ───────────────────────────────────────────────────────────────
_apts = []

def apt(sid, cid, case_id, start, status, purpose='counseling', method='F2F', mins=50, note=None):
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

# Today's appointments
apt(s1,  c_rose,   c1,  now.replace(hour=9,  minute=0,  second=0, microsecond=0), 'CONFIRMED', 'counseling')
apt(s2,  c_bia,    c2,  now.replace(hour=10, minute=0,  second=0, microsecond=0), 'CONFIRMED', 'counseling')
apt(s6,  p_daryl,  c6,  now.replace(hour=11, minute=0,  second=0, microsecond=0), 'CONFIRMED', 'counseling')
apt(s7,  p_niko,   c7,  now.replace(hour=13, minute=0,  second=0, microsecond=0), 'CONFIRMED', 'follow_up')
apt(s11, p_bon,    c11, now.replace(hour=14, minute=0,  second=0, microsecond=0), 'CONFIRMED', 'counseling')
apt(s14, p_shel,   c14, now.replace(hour=15, minute=0,  second=0, microsecond=0), 'CONFIRMED', 'counseling')

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
    apt(sv, cov, casev, F(days_ahead, hr), 'SCHEDULED', purp)

# Walk-in intake appointments
apt(s36, ic_julse,  None, now.replace(hour=10, minute=30, second=0, microsecond=0), 'CONFIRMED', 'intake_interview')
apt(s37, ic_archie, None, F(1, 9), 'SCHEDULED', 'intake_interview')
apt(s38, ic_mars,   None, F(2, 10), 'SCHEDULED', 'intake_interview')
apt(s39, ic_ria,    None, F(3, 9), 'SCHEDULED', 'intake_interview')
apt(s40, ic_cris,   None, F(4, 11), 'SCHEDULED', 'intake_interview')

print(f"✅ {len(_apts)} appointments created")

# ── SESSION NOTES ──────────────────────────────────────────────────────────────
_soap_active = [
    (s1, c1, c_rose,   'Student reports moderate improvement in managing thesis-related anxiety. Practiced breathing exercises. Mood: 6/10.',
     'Anxiety related to academic performance and upcoming deadlines.', 'Used CBT thought-challenging techniques. Reviewed homework on thought records.', 'Continue CBT for anxiety management. Explore time-management strategies next session.'),
    (s2, c2, c_bia,    'Student denies active SI this session. Reports mood has stabilized slightly with support from roommate. PHQ-9: 18.',
     'Passive SI (no plan/intent), social isolation, hopelessness.', 'Reviewed safety plan. Explored social support options. Provided psychoeducation on depression.', 'Monitor SI closely. Schedule more frequent check-ins. Consider referral to psychiatry for medication evaluation.'),
    (s3, c3, c_chelly, 'Student processing breakup. Identifies progress in reducing rumination. Sleep still disrupted.',
     'Adjustment disorder following relationship ending. Sleep disturbance, concentration difficulty.', 'Applied CBT for rumination. Sleep hygiene psychoeducation.', 'Continue grief processing. Follow up on sleep hygiene implementation.'),
    (s6, c6, p_daryl,  'Student in acute distress. SI with plan disclosed (overdose). Safety plan activated. Emergency contact notified.',
     'Active SI with plan. Severe hopelessness. Social isolation.', 'Crisis intervention protocol initiated. Safety plan updated. Family contacted.', 'Daily monitoring. Coordinate with psychiatry for emergency consult.'),
    (s7, c7, p_niko,   'Student reports 3 nightmares this week. Avoidance behaviors still present. Grounding techniques practiced.',
     'PTSD — flashbacks, nightmares, hypervigilance following road accident.', 'Grounding techniques (5-4-3-2-1). Psychoeducation on trauma response.', 'Begin EMDR preparation phase next session.'),
    (s11, c11, p_bon,  'Student reports restricting to 600 kcal/day. BMI: 17.2. Denies SI. Body dysmorphia significant.',
     'Anorexia Nervosa — restrictive eating, excessive exercise, body image disturbance.', 'Motivational interviewing. Nutritional psychoeducation. Meal plan review.', 'Coordinate with physician. Consider higher level of care if BMI continues to drop.'),
    (s16, c16, p_jenny,'Student presents in depressive phase. Reports sleeping 14+ hours daily. Missed 3 classes this week.',
     'Bipolar Disorder Type I — current depressive episode.', 'Mood monitoring, behavioral activation. Reviewed medication adherence.', 'Behavioral activation homework. Coordinate with psychiatrist.'),
]
for sv, casev, cov, s_note, o_note, a_note, p_note in _soap_active:
    db.session_notes.insert_one({
        'case_id': casev, 'counselor_id': cov, 'student_id': sv,
        'student_name': _names[sv],
        'session_date': H(rng.randint(1, 7)),
        'session_type': 'INDIVIDUAL',
        'method': 'F2F',
        'subjective': s_note, 'objective': o_note,
        'assessment': a_note, 'plan': p_note,
        'mood_rating': rng.randint(3, 7),
        'created_at': H(rng.randint(1, 7)), 'updated_at': now,
    })
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

# ── PERMA SNAPSHOTS ────────────────────────────────────────────────────────────
_perma_map = {
    s1: 'Thriving', s2: 'Struggling', s3: 'Surviving', s4: 'Thriving',
    s5: 'Excelling', s6: 'In Crisis', s7: 'Struggling', s8: 'Surviving',
    s9: 'Thriving',  s10: 'Surviving', s11: 'Struggling', s12: 'Surviving',
    s13: 'Surviving', s14: 'Thriving', s15: 'Thriving', s16: 'Struggling',
    s17: 'Thriving', s18: 'Surviving', s19: 'Excelling', s20: 'Excelling',
    s23: 'Thriving', s25: 'Excelling', s27: 'Surviving', s30: 'Thriving',
}
for sv, label in _perma_map.items():
    for i in range(3):
        entry_date = H(i * 30 + rng.randint(0, 7))
        db.perma_snapshots.insert_one({
            'student_user_id': sv,
            'perma_label': label if i == 0 else rng.choice(['Excelling','Thriving','Surviving','Struggling']),
            'entry_date': entry_date,
            'saved_at': entry_date,
        })
    db.users.update_one({'_id': sv}, {'$set': {'perma_latest_label': label}})
print("✅ PERMA snapshots seeded")

# ── ANNOUNCEMENTS ──────────────────────────────────────────────────────────────
db.announcements.insert_many([
    {'title': 'CPS Mental Health Awareness Week', 'content': 'Join us from July 28–Aug 1 for free wellness workshops, stress management seminars, and drop-in counseling sessions. Open to all DLSU students.', 'is_active': True, 'created_by': admin_id, 'created_at': H(3), 'updated_at': H(3), 'target_roles': ['STUDENT']},
    {'title': 'Semestral Break Office Hours', 'content': 'CPS will be open for emergency consultations during semestral break (Aug 5–16). Please call ahead to schedule. Regular services resume Aug 19.', 'is_active': True, 'created_by': admin_id, 'created_at': H(7), 'updated_at': H(7), 'target_roles': ['STUDENT', 'COUNSELOR', 'IC']},
    {'title': 'New: Online Booking Now Available', 'content': 'Students can now book intake appointments directly through the CPS portal. Click "Request a Session" from your dashboard to get started.', 'is_active': True, 'created_by': admin_id, 'created_at': H(14), 'updated_at': H(14), 'target_roles': ['STUDENT']},
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
