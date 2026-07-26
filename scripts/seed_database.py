#!/usr/bin/env python3
"""
CPS Counseling System — comprehensive seed script v2
10+ appointments per role: counselors, psychologists, ICs, staff
"""
from pymongo import MongoClient
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta
from bson import ObjectId
import os
import random as _random_mod
_rng = _random_mod.Random(2024)

MONGODB_URI     = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
MONGODB_DB_NAME = os.getenv('MONGODB_DB_NAME', 'cps_system_dev')
client = MongoClient(MONGODB_URI)
db = client[MONGODB_DB_NAME]

print(f"🔌 {MONGODB_URI}  📦 {MONGODB_DB_NAME}")
try:
    client.admin.command('ping'); print("✓ MongoDB OK\n")
except Exception as e:
    print(f"✗ {e}"); exit(1)

WIPE = ['users','appointments','cases','intakes','counselor_availability',
        'counselor_weekly_schedule','session_notes','check_ins','safety_plans',
        'perma_snapshots','perma_history','missed_appointment_tracker',
        'notifications','announcements','resources']
for col in WIPE:
    if col in db.list_collection_names():
        db[col].delete_many({}); print(f"🗑  {col}")

now   = datetime.utcnow()
TODAY = now.replace(hour=0, minute=0, second=0, microsecond=0)
def ph(pw):    return generate_password_hash(pw)
def dago(d):   return now - timedelta(days=d)
def dfrom(d):  return now + timedelta(days=d)
def ymd(d):    return d.strftime('%Y-%m-%d')
MON,TUE,WED,THU,FRI = 0,1,2,3,4

# ── USERS ─────────────────────────────────────────────────────────────────────
def make_user(email, pw, first, last, role, **kw):
    return db.users.insert_one({
        'email':email,'password_hash':ph(pw),'first_name':first,'last_name':last,
        'name':f"{first} {last}".strip(),'role':role,'is_active':True,'is_verified':True,
        'created_at':now,'updated_at':now,**kw
    }).inserted_id

admin_id = make_user('admin@university.edu','admin123','Admin','System','ADMIN')
dpo_id   = make_user('dpo@university.edu','dpo123','Sarah','Director','DPO')
staff_id = make_user('staff@university.edu','staff123','Alex','Staff','STAFF')
cm_id    = make_user('cm@university.edu','cm123','Morgan','Manager','CASE_MANAGER')

ic_julse  = make_user('julse@university.edu','julse123','Julse','Aguilar','IC')
ic_archie = make_user('archie@university.edu','archie123','Archie','Fernandez','IC')
ic_mars   = make_user('mars@university.edu','mars123','Mars','Dela Cruz','IC')
ic_ria    = make_user('ria@university.edu','ria123','Ria','Ocampo','IC')
ic_cris   = make_user('cris@university.edu','cris123','Cris','Villanueva','IC')
ic_wil    = make_user('wil@university.edu','wil123','Wil','Santos','IC')
ic_rose_c = make_user('rose.c@university.edu','rosec123','Rose','Cabrera','IC')
ic_gracie = make_user('gracie@university.edu','gracie123','Gracie','Mendoza','IC')
ICS       = [ic_julse,ic_archie,ic_mars,ic_ria,ic_cris,ic_wil,ic_rose_c,ic_gracie]
IC_NAMES  = ['Julse Aguilar','Archie Fernandez','Mars Dela Cruz','Ria Ocampo',
             'Cris Villanueva','Wil Santos','Rose Cabrera','Gracie Mendoza']

c_rose_t = make_user('rose.t@university.edu','roset123','Rose','Tolentino','COUNSELOR')
c_bia    = make_user('bia@university.edu','bia123','Bia','Alcantara','COUNSELOR')
c_chelly = make_user('chelly@university.edu','chelly123','Chelly','Reyes','COUNSELOR')
c_daye   = make_user('daye@university.edu','daye123','Daye','Navarro','COUNSELOR')
c_csc    = make_user('csc@university.edu','csc123','Clara','Santos','COUNSELOR')

p_daryl = make_user('daryl@university.edu','daryl123','Daryl','Bautista','PSYCHOLOGIST')
p_niko  = make_user('niko@university.edu','niko123','Niko','Pascual','PSYCHOLOGIST')
p_bon   = make_user('bon@university.edu','bon123','Bon','Aquino','PSYCHOLOGIST')
p_shel  = make_user('shel@university.edu','shel123','Shel','Macaraeg','PSYCHOLOGIST')
p_jenny = make_user('jenny@university.edu','jenny123','Jenny','Soriano','PSYCHOLOGIST')
p_chona = make_user('chona@university.edu','chona123','Chona','Lim','PSYCHOLOGIST')
p_csp   = make_user('csp@university.edu','csp123','Carl','de Guzman','PSYCHOLOGIST')

# Original 9 students
s1 = make_user('student1@university.edu','student123','Emma','Johnson','STUDENT',
               college='Engineering',course='BS Computer Science',year_level='3rd Year',student_id='12262950',
               contact_number='09171000001',date_of_birth='2001-03-15',
               emergency_contact={'name':'Johnson Parent','relationship':'Parent','phone':'09181000001'})
s2 = make_user('student2@university.edu','student456','Mark','Smith','STUDENT',
               college='Business',course='BS Accountancy',year_level='2nd Year',student_id='12359906',
               contact_number='09171000002',date_of_birth='2002-07-22',
               emergency_contact={'name':'Smith Parent','relationship':'Parent','phone':'09181000002'})
s3 = make_user('student3@university.edu','student789','Jessica','Davis','STUDENT',
               college='Arts',course='BA Psychology',year_level='4th Year',student_id='12136224',
               contact_number='09171000003',date_of_birth='2000-11-08',
               emergency_contact={'name':'Davis Parent','relationship':'Parent','phone':'09181000003'})
s4 = make_user('student4@university.edu','student101','Alex','Chen','STUDENT',
               college='Science',course='BS Biology',year_level='1st Year',student_id='12488569',
               contact_number='09171000004',date_of_birth='2004-05-30',
               emergency_contact={'name':'Chen Parent','relationship':'Parent','phone':'09181000004'})
s5 = make_user('student5@university.edu','student202','Sofia','Martinez','STUDENT',
               college='Nursing',course='BS Nursing',year_level='3rd Year',
               student_id='12233435',mhbot_username='sofia.martinez',
               contact_number='09171000005',date_of_birth='2001-09-12',
               emergency_contact={'name':'Martinez Parent','relationship':'Parent','phone':'09181000005'})
s6 = make_user('student6@university.edu','student303','James','Wilson','STUDENT',
               college='Engineering',course='BS Civil Engineering',year_level='2nd Year',student_id='12340180',
               contact_number='09171000006',date_of_birth='2002-02-18',
               emergency_contact={'name':'Wilson Parent','relationship':'Parent','phone':'09181000006'})
s7 = make_user('student7@university.edu','student404','Priya','Desai','STUDENT',
               college='Education',course='BEEd',year_level='3rd Year',student_id='12242562',
               contact_number='09171000007',date_of_birth='2001-06-25',
               emergency_contact={'name':'Desai Parent','relationship':'Parent','phone':'09181000007'})
s8 = make_user('student8@university.edu','student505','Sam','Rivera','STUDENT',
               college='Law',course='JD',year_level='1st Year',student_id='12427464',
               contact_number='09171000008',date_of_birth='2003-12-01',
               emergency_contact={'name':'Rivera Parent','relationship':'Parent','phone':'09181000008'})
s9 = make_user('student9@university.edu','student606','Maria','Santos','STUDENT',
               college='Business',course='BS Tourism',year_level='4th Year',student_id='12121348',
               contact_number='09171000009',date_of_birth='2000-04-07',
               emergency_contact={'name':'Santos Parent','relationship':'Parent','phone':'09181000009'})

# New students with full cases (s10–s21)
s10 = make_user('student10@university.edu','student10','Lena','Park','STUDENT',
                college='Engineering',course='BS Computer Science',year_level='2nd Year',student_id='12342918',
                contact_number='09171000010',date_of_birth='2002-08-14',
                emergency_contact={'name':'Park Parent','relationship':'Parent','phone':'09181000010'})
s11 = make_user('student11@university.edu','student11','Carlos','Diaz','STUDENT',
                college='Business',course='BS Accountancy',year_level='3rd Year',student_id='12260209',
                contact_number='09171000011',date_of_birth='2001-01-27',
                emergency_contact={'name':'Diaz Parent','relationship':'Parent','phone':'09181000011'})
s12 = make_user('student12@university.edu','student12','Amy','Torres','STUDENT',
                college='Nursing',course='BS Nursing',year_level='4th Year',student_id='12179574',
                contact_number='09171000012',date_of_birth='2000-10-03',
                emergency_contact={'name':'Torres Parent','relationship':'Parent','phone':'09181000012'})
s13 = make_user('student13@university.edu','student13','Miguel','Santos','STUDENT',
                college='Engineering',course='BS Civil Engineering',year_level='2nd Year',student_id='12399693',
                contact_number='09171000013',date_of_birth='2002-05-19',
                emergency_contact={'name':'Santos Parent','relationship':'Parent','phone':'09181000013'})
s14 = make_user('student14@university.edu','student14','Rachel','Kim','STUDENT',
                college='Arts',course='BA Psychology',year_level='3rd Year',student_id='12280599',
                contact_number='09171000014',date_of_birth='2001-07-11',
                emergency_contact={'name':'Kim Parent','relationship':'Parent','phone':'09181000014'})
s15 = make_user('student15@university.edu','student15','David','Tan','STUDENT',
                college='Law',course='JD',year_level='2nd Year',student_id='12321775',
                contact_number='09171000015',date_of_birth='2001-03-28',
                emergency_contact={'name':'Tan Parent','relationship':'Parent','phone':'09181000015'})
s16 = make_user('student16@university.edu','student16','Nina','Cruz','STUDENT',
                college='Nursing',course='BS Nursing',year_level='1st Year',student_id='12491778',
                contact_number='09171000016',date_of_birth='2004-09-06',
                emergency_contact={'name':'Cruz Parent','relationship':'Parent','phone':'09181000016'})
s17 = make_user('student17@university.edu','student17','Ethan','Lee','STUDENT',
                college='Engineering',course='BS Computer Science',year_level='4th Year',student_id='12174130',
                contact_number='09171000017',date_of_birth='2000-12-22',
                emergency_contact={'name':'Lee Parent','relationship':'Parent','phone':'09181000017'})
s18 = make_user('student18@university.edu','student18','Grace','Aquino','STUDENT',
                college='Science',course='BS Biology',year_level='3rd Year',student_id='12236144',
                contact_number='09171000018',date_of_birth='2001-02-14',
                emergency_contact={'name':'Aquino Parent','relationship':'Parent','phone':'09181000018'})
s19 = make_user('student19@university.edu','student19','Leo','Reyes','STUDENT',
                college='Business',course='BS Marketing',year_level='2nd Year',student_id='12365265',
                contact_number='09171000019',date_of_birth='2002-11-09',
                emergency_contact={'name':'Reyes Parent','relationship':'Parent','phone':'09181000019'})
s20 = make_user('student20@university.edu','student20','Kevin','Lim','STUDENT',
                college='Science',course='BS Chemistry',year_level='3rd Year',student_id='12290375',
                contact_number='09171000020',date_of_birth='2001-08-31',
                emergency_contact={'name':'Lim Parent','relationship':'Parent','phone':'09181000020'})
s21 = make_user('student21@university.edu','student21','Diana','Santos','STUDENT',
                college='Education',course='BEEd Elementary',year_level='4th Year',student_id='12187123',
                contact_number='09171000021',date_of_birth='2000-06-17',
                emergency_contact={'name':'Santos Parent','relationship':'Parent','phone':'09181000021'})

# IC queue students (s22–s79): intake appointments only, 7 per IC
_Q_NAMES = [
    'Anna','Ben','Cara','Dan','Ella','Finn','Gina',
    'Hank','Iris','Jake','Kim','Luis','Mia','Neil',
    'Ora','Pete','Quinn','Ryan','Sara','Tara',
    'Uma','Vic','Wendy','Xander','Yara','Zoe','Aiden',
    'Beth','Cole','Drew','Eva','Felix','Gabi','Hugo',
    'Ines','Jorge','Kira','Liam','Mona','Nate',
    'Olive','Paul','Quin','Rose','Sean','Tina','Uri',
    'Vera','Wade','Xena','Yale','Zara','Abel','Bea',
    'Cruz','Dina','Eric','Faye',
]
_Q_SURNAMES = [
    'Reyes','Santos','Garcia','Cruz','Lim','Bautista','Aquino',
    'Ramos','Torres','Dela Cruz','Gonzales','Rivera','Ramirez',
    'Hernandez','Diaz','Villanueva','Navarro','Castillo','Pascual',
    'Aguilar','Mendoza','Flores','Manalo','Soriano','Macaraeg',
    'Domingo','Tolentino','Alcantara','Cabrera','Ocampo','Fernandez',
    'Tan','Co','Uy','Sy','Go','Velasco','Salazar','Miranda','Guerrero',
    'Buenaventura','Macapagal','Medina','Rosales','Santiago','Espiritu',
    'Sarmiento','Evangelista','Catalan','Ilagan','Peralta','Manalang',
    'Ignacio','De Guzman','Chua','Pangilinan','Magbanua','Baluyot',
]
_Q_COLLEGES = [
    'College of Engineering','College of Business','College of Arts and Sciences',
    'College of Nursing','College of Education','College of Law',
    'College of Architecture','College of Science',
]
_Q_COURSES = [
    'BS Computer Science','BS Civil Engineering','BS Electrical Engineering',
    'BS Mechanical Engineering','BS Accountancy','BS Business Administration',
    'BS Marketing','BS Management','BA Psychology','BA Communication',
    'BS Biology','BS Chemistry','BS Nursing','BS Pharmacy',
    'BS Medical Technology','Bachelor of Elementary Education',
    'Bachelor of Secondary Education','AB Political Science',
    'Juris Doctor','BS Architecture',
]
_Q_YEARS = ['1st Year','2nd Year','3rd Year','4th Year']
_YR_TO_PFX = {'1st Year': 124, '2nd Year': 123, '3rd Year': 122, '4th Year': 121}

IC_Q = []
for idx, fname in enumerate(_Q_NAMES):
    n = 22 + idx
    yr_lvl = _Q_YEARS[(idx * 3) % len(_Q_YEARS)]
    pfx    = _YR_TO_PFX[yr_lvl]
    IC_Q.append(make_user(
        f'student{n}@university.edu', f'student{n}',
        fname, _Q_SURNAMES[idx % len(_Q_SURNAMES)], 'STUDENT',
        college=_Q_COLLEGES[idx % len(_Q_COLLEGES)],
        course=_Q_COURSES[idx % len(_Q_COURSES)],
        year_level=yr_lvl,
        student_id=f'{pfx}{n:05d}',
        contact_number=f'0917{n:07d}',
        date_of_birth=f'200{(idx%5)+0}-{(idx%12)+1:02d}-{(idx%28)+1:02d}',
        emergency_contact={'name': f'{_Q_SURNAMES[idx % len(_Q_SURNAMES)]} Parent', 'relationship': 'Parent', 'phone': f'0918{n:07d}'},
    ))

print(f"✅ {len(IC_Q)+21} students created\n")

# ── IC SCHEDULES ──────────────────────────────────────────────────────────────
ic_sched_data = [
    (ic_julse,  'in-person', [(MON,'08:00','12:00'),(WED,'08:00','12:00'),(FRI,'08:00','12:00')]),
    (ic_archie, 'in-person', [(MON,'13:00','17:00'),(TUE,'13:00','17:00'),(WED,'13:00','17:00'),(THU,'13:00','17:00')]),
    (ic_mars,   'online',    [(TUE,'09:00','15:00'),(THU,'09:00','15:00'),(FRI,'09:00','15:00')]),
    (ic_ria,    'in-person', [(MON,'09:00','12:00'),(TUE,'09:00','12:00'),(WED,'09:00','12:00'),(THU,'09:00','12:00'),(FRI,'09:00','12:00')]),
    (ic_cris,   'in-person', [(MON,'10:00','14:00'),(WED,'10:00','14:00'),(FRI,'08:00','12:00')]),
    (ic_wil,    'online',    [(MON,'14:00','18:00'),(TUE,'14:00','18:00'),(WED,'14:00','18:00')]),
    (ic_rose_c, 'in-person', [(TUE,'08:00','13:00'),(THU,'08:00','13:00')]),
    (ic_gracie, 'online',    [(MON,'10:00','14:00'),(TUE,'10:00','14:00'),(THU,'10:00','14:00'),(FRI,'10:00','14:00')]),
]
for ic_id, method, slots in ic_sched_data:
    sched = [{'day_of_week':d,'start_time':s,'end_time':e,'session_method':method} for d,s,e in slots]
    for col in ['counselor_weekly_schedule','counselor_availability']:
        db[col].update_one({'counselor_id':ic_id},
            {'$set':{'counselor_id':ic_id,'session_method':method,'schedule':sched,'updated_at':now}},upsert=True)
print("✅ IC schedules seeded\n")

# ── COUNSELOR & PSYCHOLOGIST SCHEDULES ────────────────────────────────────────
coun_sched_data = [
    (c_rose_t, 'F2F',    [(MON,'09:00','15:00'),(WED,'09:00','15:00'),(THU,'09:00','15:00')]),
    (c_bia,    'Online',  [(TUE,'10:00','16:00'),(WED,'10:00','16:00'),(FRI,'10:00','16:00')]),
    (c_chelly, 'Online',  [(MON,'08:00','14:00'),(TUE,'08:00','14:00'),(THU,'08:00','14:00')]),
    (c_daye,   'F2F',    [(MON,'13:00','17:00'),(WED,'13:00','17:00'),(FRI,'13:00','17:00')]),
    (c_csc,    'F2F',    [(TUE,'09:00','13:00'),(THU,'09:00','13:00'),(FRI,'09:00','13:00')]),
]
psych_sched_data = [
    (p_daryl,  'F2F',    [(MON,'09:00','15:00'),(WED,'09:00','15:00'),(FRI,'09:00','15:00')]),
    (p_niko,   'Online',  [(TUE,'10:00','16:00'),(THU,'10:00','16:00')]),
    (p_bon,    'F2F',    [(MON,'08:00','14:00'),(TUE,'08:00','14:00'),(WED,'08:00','14:00')]),
    (p_shel,   'Online',  [(WED,'13:00','17:00'),(THU,'13:00','17:00'),(FRI,'13:00','17:00')]),
    (p_jenny,  'F2F',    [(MON,'09:00','15:00'),(TUE,'09:00','15:00'),(THU,'09:00','15:00')]),
    (p_chona,  'F2F',    [(TUE,'10:00','14:00'),(WED,'10:00','14:00'),(FRI,'10:00','14:00')]),
    (p_csp,    'Online',  [(MON,'08:00','12:00'),(THU,'08:00','12:00'),(FRI,'08:00','12:00')]),
]

for _cid, _method, _slots in coun_sched_data + psych_sched_data:
    _sched = [{'day_of_week':d,'start_time':s,'end_time':e} for d,s,e in _slots]
    db.counselor_weekly_schedule.update_one({'counselor_id':_cid},
        {'$set':{'counselor_id':_cid,'session_method':_method,'schedule':_sched,'updated_at':now}},upsert=True)
print("✅ Counselor/psychologist weekly schedules seeded\n")

# Generate individual availability slot docs for counselors/psychologists (next 28 days)
# ~45% of slots are pre-booked / blocked so schedule looks realistically occupied
_slot_docs = []
for _cid, _method, _slots in coun_sched_data + psych_sched_data:
    for _day_off in range(1, 29):
        _slot_date = TODAY + timedelta(days=_day_off)
        _dow = _slot_date.weekday()
        for _day_of_week, _start_str, _end_str in _slots:
            if _dow == _day_of_week:
                _sh, _sm = int(_start_str[:2]), int(_start_str[3:])
                _eh, _em = int(_end_str[:2]), int(_end_str[3:])
                _s = _slot_date.replace(hour=_sh, minute=_sm, second=0, microsecond=0)
                _e_lim = _slot_date.replace(hour=_eh, minute=_em, second=0, microsecond=0)
                while _s + timedelta(hours=1) <= _e_lim:
                    _e = _s + timedelta(hours=1)
                    _slot_docs.append({
                        'counselor_id': _cid,
                        'slot_start': _s,
                        'slot_end': _e,
                        'is_available': _rng.random() > 0.45,
                        'created_at': now,
                    })
                    _s = _e
if _slot_docs:
    db.counselor_availability.insert_many(_slot_docs)
print(f"✅ {len(_slot_docs)} individual availability slots seeded for counselors/psychologists\n")

# ── CASES ─────────────────────────────────────────────────────────────────────
def mk_case(sid, sname, semail, counselor_id, ic_id, status, risk, concern, issue,
            cnum, endorsed_to, phq9, phq9s, gad7, gad7s, triage, enotes,
            ic_name, src, days_ago, goals=None, interventions=None, diagnoses=None,
            client_status=None, termination_reason=None, termination_date=None,
            termination_form=None, final_notes=None):
    iform = {
        'type_of_service':'Intake Interview','presenting_concern':concern,
        'phq9_responses':phq9,'phq9_score':phq9s,'gad7_responses':gad7,'gad7_score':gad7s,
        'triage_decision':triage,'risk_level':risk,'endorsed_to':endorsed_to,
        'endorsement_notes':enotes,'session_date':dago(days_ago).isoformat(),
        'session_method':'F2F','ic_name':ic_name,'student_name':sname,
    }
    doc = {
        'student_id':sid,'student_name':sname,'student_email':semail,
        'assigned_counselor_id':counselor_id,'intake_counselor_id':ic_id,
        'case_status':status,'risk_level':risk,'concern':concern,
        'presenting_issue':issue,'case_number':cnum,'check_ins':[],
        'intake_interview_form':iform,
        'endorsed_to_role':endorsed_to,'endorsed_at':dago(days_ago),
        'endorsed_by':str(ic_id),'source':src,
        'created_at':dago(days_ago+5),'updated_at':now,
    }
    if goals:
        doc['treatment_plan'] = {
            'goals':goals,'interventions':interventions or [],
            'progress_summary':'Ongoing treatment.','estimated_duration':'8–12 sessions',
            'next_review_date':ymd(dfrom(14)),
        }
    if diagnoses:
        doc['diagnoses'] = diagnoses
    if client_status:
        doc['client_status'] = client_status
    if termination_reason:
        doc['termination_reason'] = termination_reason
        doc['termination_date'] = termination_date
    if termination_form:
        doc['termination_form'] = termination_form
        doc['final_notes'] = final_notes
    return db.cases.insert_one(doc).inserted_id

# ── Original 8 cases ──
c1 = mk_case(s1,'Emma Johnson','student1@university.edu',c_rose_t,ic_julse,
    'ACTIVE','GREEN',
    'Academic stress and difficulty managing workload during finals','Academic stress',
    'CPS-2025-001','COUNSELOR',[1,1,1,0,1,0,0,1,0],5,[2,1,1,1,0,1,1],7,
    'Endorsed to Counselor','Low PHQ-9, manageable anxiety. Appropriate for non-clinical counseling.',
    'Julse','walk_in',30,
    goals=[{'goal':'Develop effective time-management strategies','target_date':ymd(dfrom(30)),'status':'in_progress'},
           {'goal':'Reduce anxiety symptoms','target_date':ymd(dfrom(60)),'status':'not_started'}],
    interventions=['CBT techniques','Study skills coaching','Relaxation exercises'],
    diagnoses=[{'code':'F43.2','name':'Adjustment Disorder with Anxiety','system':'ICD-10',
                'notes':'Situational; triggered by academic pressure','added_at':dago(25),'added_by':str(c_rose_t)}])

c2 = mk_case(s2,'Mark Smith','student2@university.edu',p_daryl,ic_archie,
    'ACTIVE','YELLOW',
    'Relationship breakdown and social isolation; mild depressive episodes','Depression, relationship issues',
    'CPS-2025-002','PSYCHOLOGIST',[2,2,2,1,2,1,1,2,0],13,[2,2,1,2,1,1,2],11,
    'Endorsed to Psychologist','PHQ-9 of 13 indicates moderate depression. Appropriate for psychologist-level care.',
    'Archie','online',20,
    goals=[{'goal':'Rebuild social support network','target_date':ymd(dfrom(45)),'status':'in_progress'},
           {'goal':'Address depressive cognitions through CBT','target_date':ymd(dfrom(90)),'status':'not_started'}],
    interventions=['Behavioral activation','Interpersonal therapy','Mood monitoring'],
    diagnoses=[{'code':'F32.1','name':'Moderate Depressive Episode','system':'ICD-10',
                'notes':'Onset after relationship loss','added_at':dago(14),'added_by':str(p_daryl)}])

c3 = mk_case(s6,'James Wilson','student6@university.edu',p_daryl,ic_rose_c,
    'ACTIVE','RED',
    'Expressed passive suicidal ideation; severe depressive symptoms','Suicidal ideation, severe depression',
    'CPS-2025-003','PSYCHOLOGIST',[3,3,3,2,3,2,3,3,1],23,[3,3,2,3,3,2,3],19,
    'Endorsed to Psychologist — URGENT','PHQ-9=23 (severe). Passive SI. Immediately escalated.',
    'Rose C.','walk_in',7,
    goals=[{'goal':'Establish safety and crisis coping plan','target_date':ymd(dfrom(7)),'status':'in_progress'}],
    interventions=['Safety planning','Crisis intervention','Weekly psychotherapy'],
    diagnoses=[{'code':'F32.2','name':'Severe Depressive Episode without Psychotic Symptoms','system':'ICD-10',
                'notes':'Passive SI at intake; no active plan','added_at':dago(7),'added_by':str(p_daryl)}])

c4 = mk_case(s7,'Priya Desai','student7@university.edu',c_bia,ic_mars,
    'ACTIVE','GREEN',
    'Family conflict and difficulty adjusting to university','Family conflict, adjustment disorder',
    'CPS-2025-004','COUNSELOR',[1,1,0,1,1,0,0,1,0],5,[1,1,1,0,1,0,0],4,
    'Endorsed to Counselor','Low scores, situational stressor. Counselor level appropriate.',
    'Mars','online',50,
    goals=[{'goal':'Improve family communication skills','target_date':ymd(dfrom(20)),'status':'completed'},
           {'goal':'Build resilience','target_date':ymd(dfrom(45)),'status':'in_progress'}],
    interventions=['Family systems approach','Communication skills training','Journaling'],
    client_status='IMPROVING')

c5 = mk_case(s5,'Sofia Martinez','student5@university.edu',c_chelly,ic_wil,
    'ACTIVE','GREEN',
    'Mild anxiety around clinical practicum performance','Performance anxiety',
    'CPS-2025-005','COUNSELOR',[0,1,0,1,1,0,0,1,0],4,[2,1,1,1,0,0,1],6,
    'Endorsed to Counselor','Subclinical anxiety around performance. Counseling appropriate.',
    'Wil','online',40,
    goals=[{'goal':'Manage performance anxiety during clinical rotations','target_date':ymd(dfrom(30)),'status':'in_progress'}],
    interventions=['Mindfulness-based stress reduction','Positive self-talk training'])

c6 = mk_case(s8,'Sam Rivera','student8@university.edu',p_niko,ic_cris,
    'CLOSED','YELLOW',
    'Academic stress with substance use tendencies','Stress, mild substance use',
    'CPS-2025-006','PSYCHOLOGIST',[2,2,1,2,2,0,1,2,0],12,[2,2,1,2,1,1,1],10,
    'Endorsed to Psychologist','PHQ-9 moderate. Substance use as coping needs psychologist.',
    'Cris','walk_in',65,
    termination_reason='Administrative closure — 3 consecutive no-shows per clinic protocol',
    termination_date=dago(5))

c7 = mk_case(s9,'Maria Santos','student9@university.edu',c_rose_t,ic_julse,
    'CLOSED','GREEN',
    'Grief and loss after losing a grandparent','Grief, bereavement',
    'CPS-2025-007','COUNSELOR',[2,1,1,1,1,0,0,1,0],7,[1,1,1,0,0,0,1],4,
    'Endorsed to Counselor','Normal grief presentation. Counselor appropriate.',
    'Julse','online',100,
    diagnoses=[{'code':'Z63.4','name':'Disappearance or death of family member','system':'ICD-10',
                'notes':'Normal bereavement; no complicated grief','added_at':dago(90),'added_by':str(c_rose_t)}],
    termination_reason='Goals achieved — client reports resolution of grief symptoms',
    termination_date=dago(10),
    termination_form={'goals_met':True,'progress_summary':'Successfully processed grief.','referral_to':[]},
    final_notes='Maria showed remarkable resilience. All goals met.')

c8 = mk_case(s3,'Jessica Davis','student3@university.edu',None,ic_ria,
    'NEW','GREEN',
    'Family conflict and difficulty communicating with parents','Family issues',
    'CPS-2025-008','COUNSELOR',[1,0,1,0,1,0,0,0,0],3,[1,1,0,0,1,0,0],3,
    'Endorsed to Counselor','Minimal symptoms. Family communication issue. Route to counselor.',
    'Ria','walk_in',1)

# ── 12 new cases ──
c9 = mk_case(s10,'Lena Park','student10@university.edu',c_daye,ic_archie,
    'ACTIVE','GREEN',
    'Perfectionism and test anxiety affecting academic performance','Perfectionism, anxiety',
    'CPS-2025-009','COUNSELOR',[1,1,1,1,1,0,0,1,0],6,[2,2,1,1,1,0,1],8,
    'Endorsed to Counselor','Mild-moderate anxiety, perfectionism. Non-clinical counseling appropriate.',
    'Archie','online',35,
    goals=[{'goal':'Reduce perfectionism-driven anxiety','target_date':ymd(dfrom(30)),'status':'in_progress'},
           {'goal':'Build healthy study habits','target_date':ymd(dfrom(60)),'status':'not_started'}],
    interventions=['CBT for perfectionism','Cognitive restructuring','Acceptance-based strategies'],
    diagnoses=[{'code':'F41.1','name':'Generalized Anxiety Disorder','system':'ICD-10',
                'notes':'Predominantly performance context','added_at':dago(30),'added_by':str(c_daye)}])

c10 = mk_case(s11,'Carlos Diaz','student11@university.edu',p_jenny,ic_cris,
    'ACTIVE','YELLOW',
    'Burnout and depression due to CPA board exam pressure','Burnout, depression',
    'CPS-2025-010','PSYCHOLOGIST',[2,2,2,2,2,1,1,2,0],14,[2,2,2,2,1,1,2],12,
    'Endorsed to Psychologist','PHQ-9=14 (moderate-severe). Burnout with depressive features.',
    'Cris','walk_in',42,
    goals=[{'goal':'Develop sustainable study routine','target_date':ymd(dfrom(30)),'status':'in_progress'}],
    interventions=['Burnout recovery protocol','Behavioral activation','Work-life balance coaching'],
    diagnoses=[{'code':'F32.1','name':'Moderate Depressive Episode','system':'ICD-10',
                'notes':'Board exam burnout context','added_at':dago(35),'added_by':str(p_jenny)}])

c11 = mk_case(s12,'Amy Torres','student12@university.edu',p_bon,ic_mars,
    'ACTIVE','RED',
    'Trauma from clinical incident; intrusive memories and hypervigilance','PTSD symptoms',
    'CPS-2025-011','PSYCHOLOGIST',[2,2,3,2,3,2,3,3,0],20,[3,3,2,3,2,2,3],18,
    'Endorsed to Psychologist — URGENT','PHQ-9=20, significant trauma symptoms. Clinical evaluation required.',
    'Mars','walk_in',28,
    goals=[{'goal':'Reduce trauma-related avoidance','target_date':ymd(dfrom(45)),'status':'in_progress'}],
    interventions=['Trauma-focused CBT','EMDR preparation','Grounding techniques'],
    diagnoses=[{'code':'F43.1','name':'Post-Traumatic Stress Disorder','system':'ICD-10',
                'notes':'Onset after clinical incident in 4th year practicum','added_at':dago(20),'added_by':str(p_bon)}])

c12 = mk_case(s13,'Miguel Santos','student13@university.edu',p_shel,ic_wil,
    'ACTIVE','YELLOW',
    'Anxiety and depression exacerbated by thesis deadline pressure','Anxiety, depression',
    'CPS-2025-012','PSYCHOLOGIST',[2,2,1,2,2,1,1,2,0],13,[2,2,2,2,1,1,2],12,
    'Endorsed to Psychologist','Moderate PHQ-9 + GAD. Needs structured psychological support.',
    'Wil','online',32,
    goals=[{'goal':'Manage thesis-related anxiety','target_date':ymd(dfrom(30)),'status':'in_progress'}],
    interventions=['Cognitive restructuring','Time management skills','Relaxation training'],
    diagnoses=[{'code':'F41.2','name':'Mixed Anxiety and Depressive Disorder','system':'ICD-10',
                'notes':'Academic context stressor','added_at':dago(25),'added_by':str(p_shel)}])

c13 = mk_case(s14,'Rachel Kim','student14@university.edu',c_chelly,ic_ria,
    'ACTIVE','GREEN',
    'Academic perfectionism causing chronic stress and self-doubt','Perfectionism, self-esteem',
    'CPS-2025-013','COUNSELOR',[1,1,0,1,1,0,0,1,0],5,[1,2,1,1,0,0,1],6,
    'Endorsed to Counselor','Mild anxiety, perfectionism pattern. Non-clinical appropriate.',
    'Ria','online',22,
    goals=[{'goal':'Develop healthier self-evaluation standards','target_date':ymd(dfrom(30)),'status':'in_progress'}],
    interventions=['Compassion-focused therapy','CBT for perfectionism','Journaling'])

c14 = mk_case(s15,'David Tan','student15@university.edu',p_chona,ic_rose_c,
    'ACTIVE','YELLOW',
    'Severe burnout and depressive symptoms from JD program workload','Burnout, depression',
    'CPS-2025-014','PSYCHOLOGIST',[2,2,2,2,2,1,1,3,0],15,[2,2,2,2,1,1,2],12,
    'Endorsed to Psychologist','PHQ-9=15 indicating moderate-severe depression. Clinical management needed.',
    'Rose C.','walk_in',38,
    goals=[{'goal':'Reduce depressive symptoms (target PHQ-9 < 8)','target_date':ymd(dfrom(60)),'status':'in_progress'}],
    interventions=['Behavioral activation','IPT for depression','Sleep hygiene intervention'],
    diagnoses=[{'code':'F32.1','name':'Moderate Depressive Episode','system':'ICD-10',
                'notes':'Law school burnout context','added_at':dago(30),'added_by':str(p_chona)}])

c15 = mk_case(s16,'Nina Cruz','student16@university.edu',c_csc,ic_julse,
    'ACTIVE','GREEN',
    'Homesickness and difficulty adjusting to university life away from family','Adjustment disorder, homesickness',
    'CPS-2025-015','COUNSELOR',[1,0,1,0,1,0,0,1,0],4,[1,1,1,0,0,0,1],4,
    'Endorsed to Counselor','Mild adjustment symptoms. Non-clinical counseling sufficient.',
    'Julse','walk_in',18,
    goals=[{'goal':'Build social support network at university','target_date':ymd(dfrom(30)),'status':'in_progress'}],
    interventions=['Adjustment counseling','Social skills development','Campus resource linkage'])

c16 = mk_case(s17,'Ethan Lee','student17@university.edu',p_csp,ic_archie,
    'CLOSED','GREEN',
    'Anxiety and social withdrawal during internship search period','Social anxiety, internship anxiety',
    'CPS-2025-016','COUNSELOR',[1,1,1,1,1,0,0,1,0],6,[2,1,1,1,1,0,1],7,
    'Endorsed to Counselor','Mild anxiety, situational. Counseling appropriate.',
    'Archie','online',70,
    termination_reason='Goals achieved — internship secured, anxiety resolved',
    termination_date=dago(12),
    termination_form={'goals_met':True,'progress_summary':'Fully resolved. Internship secured.','referral_to':[]},
    final_notes='Ethan showed excellent progress. Case closed successfully.')

c17 = mk_case(s18,'Grace Aquino','student18@university.edu',c_bia,ic_mars,
    'ACTIVE','GREEN',
    'Difficulty after breakup; processing relationship grief and rebuilding self-worth','Relationship grief, self-esteem',
    'CPS-2025-017','COUNSELOR',[1,1,1,1,1,0,0,1,0],6,[1,1,1,1,0,0,1],5,
    'Endorsed to Counselor','Situational distress, relationship-related. Non-clinical appropriate.',
    'Mars','online',25,
    goals=[{'goal':'Process relationship grief healthily','target_date':ymd(dfrom(20)),'status':'in_progress'}],
    interventions=['Grief counseling','Self-worth exercises','Narrative therapy'])

c18 = mk_case(s19,'Leo Reyes','student19@university.edu',c_rose_t,ic_julse,
    'ACTIVE','GREEN',
    'Academic pressure and time management difficulties in BS Marketing','Academic stress, time management',
    'CPS-2025-018','COUNSELOR',[1,1,1,0,1,0,0,1,0],5,[1,1,1,0,1,0,0],4,
    'Endorsed to Counselor','Mild academic stress. Short-term counseling appropriate.',
    'Julse','walk_in',28,
    goals=[{'goal':'Develop effective time management system','target_date':ymd(dfrom(30)),'status':'in_progress'}],
    interventions=['Study skills coaching','CBT for procrastination','Stress inoculation'])

c19 = mk_case(s20,'Kevin Lim','student20@university.edu',p_daryl,ic_archie,
    'ACTIVE','YELLOW',
    'Panic attacks and high health anxiety interfering with academic life','Panic disorder, health anxiety',
    'CPS-2025-019','PSYCHOLOGIST',[2,2,2,2,2,1,1,2,0],14,[3,3,2,3,2,2,3],18,
    'Endorsed to Psychologist','PHQ-9=14, significant panic symptoms. Clinical evaluation needed.',
    'Archie','walk_in',22,
    goals=[{'goal':'Reduce panic attack frequency','target_date':ymd(dfrom(30)),'status':'in_progress'}],
    interventions=['Panic control therapy','Interoceptive exposure','Psychoeducation on anxiety'],
    diagnoses=[{'code':'F41.0','name':'Panic Disorder without Agoraphobia','system':'ICD-10',
                'notes':'Episodes 2–3×/week at intake','added_at':dago(15),'added_by':str(p_daryl)}])

c20 = mk_case(s21,'Diana Santos','student21@university.edu',p_niko,ic_gracie,
    'ACTIVE','YELLOW',
    'Complicated grief after losing a parent; depressive symptoms and academic decline','Grief, depression',
    'CPS-2025-020','PSYCHOLOGIST',[2,2,2,2,2,1,1,3,0],15,[2,2,2,2,1,1,2],12,
    'Endorsed to Psychologist','PHQ-9=15. Complicated grief with depressive features.',
    'Gracie','online',18,
    goals=[{'goal':'Process grief and restore functioning','target_date':ymd(dfrom(45)),'status':'in_progress'}],
    interventions=['Complicated grief therapy','Behavioral activation','Supportive counseling'],
    diagnoses=[{'code':'F43.21','name':'Adjustment Disorder with Depressed Mood','system':'ICD-10',
                'notes':'Loss of parent 3 months prior','added_at':dago(12),'added_by':str(p_niko)}])

print(f"✅ 20 cases created\n")

# ── INTAKES ───────────────────────────────────────────────────────────────────
def mk_intake(sid, sname, ic_id, case_id, status, concern, src, days_ago):
    db.intakes.insert_one({
        'student_id':sid,'client_name':sname,'ic_id':ic_id,'counselor_id':ic_id,
        'case_id':case_id,'status':status,'chief_complaint':concern,'source':src,
        'service_requested':'personal_counseling','created_at':dago(days_ago),'updated_at':now,
    })

mk_intake(s1,'Emma Johnson',ic_julse,c1,'COMPLETED','Academic stress','walk_in',30)
mk_intake(s2,'Mark Smith',ic_archie,c2,'COMPLETED','Relationship breakdown','online',20)
mk_intake(s6,'James Wilson',ic_rose_c,c3,'COMPLETED','Suicidal ideation','walk_in',7)
mk_intake(s7,'Priya Desai',ic_mars,c4,'COMPLETED','Family conflict','online',50)
mk_intake(s5,'Sofia Martinez',ic_wil,c5,'COMPLETED','Performance anxiety','online',40)
mk_intake(s8,'Sam Rivera',ic_cris,c6,'COMPLETED','Stress, substance use','walk_in',65)
mk_intake(s9,'Maria Santos',ic_julse,c7,'COMPLETED','Grief and bereavement','online',100)
mk_intake(s3,'Jessica Davis',ic_ria,c8,'IN_PROGRESS','Family conflict','walk_in',1)
mk_intake(s4,'Alex Chen',ic_gracie,None,'NEW','First year transition anxiety','online',0)
mk_intake(s10,'Lena Park',ic_archie,c9,'COMPLETED','Perfectionism, anxiety','online',35)
mk_intake(s11,'Carlos Diaz',ic_cris,c10,'COMPLETED','Burnout, depression','walk_in',42)
mk_intake(s12,'Amy Torres',ic_mars,c11,'COMPLETED','PTSD symptoms','walk_in',28)
mk_intake(s13,'Miguel Santos',ic_wil,c12,'COMPLETED','Anxiety, depression','online',32)
mk_intake(s14,'Rachel Kim',ic_ria,c13,'COMPLETED','Perfectionism','online',22)
mk_intake(s15,'David Tan',ic_rose_c,c14,'COMPLETED','Burnout, depression','walk_in',38)
mk_intake(s16,'Nina Cruz',ic_julse,c15,'COMPLETED','Homesickness','walk_in',18)
mk_intake(s17,'Ethan Lee',ic_archie,c16,'COMPLETED','Social anxiety','online',70)
mk_intake(s18,'Grace Aquino',ic_mars,c17,'COMPLETED','Relationship grief','online',25)
mk_intake(s19,'Leo Reyes',ic_julse,c18,'COMPLETED','Academic stress','walk_in',28)
mk_intake(s20,'Kevin Lim',ic_archie,c19,'COMPLETED','Panic disorder','walk_in',22)
mk_intake(s21,'Diana Santos',ic_gracie,c20,'COMPLETED','Complicated grief','online',18)
print(f"✅ Intakes created\n")

# ── APPOINTMENTS ──────────────────────────────────────────────────────────────
def appt(sid, cid, case_id, status, atype, method, start, mins=50, **kw):
    return db.appointments.insert_one({
        'student_id':sid,'counselor_id':cid,'case_id':case_id,'status':status,
        'appointment_type':atype,'method':method,
        'scheduled_start':start,'scheduled_end':start+timedelta(minutes=mins),
        'created_at':start-timedelta(days=7),'updated_at':now,**kw
    }).inserted_id

H = lambda d,h,m=0: dago(d).replace(hour=h,minute=m,second=0,microsecond=0)
F = lambda d,h,m=0: dfrom(d).replace(hour=h,minute=m,second=0,microsecond=0)

print("Seeding appointments...")

# ══════════════════════════════════════════════════════════════════════════════
# COUNSELOR: c_rose_t — Emma (c1) + Maria (c7) + Leo (c18) = 13 items
# ══════════════════════════════════════════════════════════════════════════════
# Emma
appt(s1,ic_julse,c1,'COMPLETED','INTAKE','F2F',H(30,9),completed_at=H(30,10))
a_emma1 = appt(s1,c_rose_t,c1,'COMPLETED','COUNSELING','F2F',H(20,10),completed_at=H(20,11))
a_emma2 = appt(s1,c_rose_t,c1,'COMPLETED','COUNSELING','F2F',H(10,10),completed_at=H(10,11))
appt(s1,c_rose_t,c1,'EVALUATION','COUNSELING','F2F',H(3,10))
appt(s1,c_rose_t,c1,'CONFIRMED','COUNSELING','F2F',F(4,10))
# Maria
appt(s9,ic_julse,c7,'COMPLETED','INTAKE','F2F',H(100,9),completed_at=H(100,10))
appt(s9,c_rose_t,c7,'COMPLETED','COUNSELING','F2F',H(80,9),completed_at=H(80,10))
appt(s9,c_rose_t,c7,'COMPLETED','COUNSELING','F2F',H(65,9),completed_at=H(65,10))
appt(s9,c_rose_t,c7,'COMPLETED','COUNSELING','F2F',H(50,9),completed_at=H(50,10))
a_maria4 = appt(s9,c_rose_t,c7,'COMPLETED','COUNSELING','F2F',H(20,9),completed_at=H(20,10))
# Leo (c18) — fresh case
appt(s19,ic_julse,c18,'COMPLETED','INTAKE','F2F',H(28,11),completed_at=H(28,12))
a_leo1 = appt(s19,c_rose_t,c18,'COMPLETED','COUNSELING','F2F',H(18,10),completed_at=H(18,11))
a_leo2 = appt(s19,c_rose_t,c18,'COMPLETED','COUNSELING','F2F',H(7,10),completed_at=H(7,11))
appt(s19,c_rose_t,c18,'PENDING_STUDENT_APPROVAL','COUNSELING','F2F',F(5,10))
appt(s19,c_rose_t,c18,'CONFIRMED','COUNSELING','F2F',F(12,10))
print("✓ c_rose_t: 15 appointments (Emma×5 + Maria×5 + Leo×5)")

# ══════════════════════════════════════════════════════════════════════════════
# COUNSELOR: c_bia — Priya (c4) + Grace (c17) = 11 items
# ══════════════════════════════════════════════════════════════════════════════
appt(s7,ic_mars,c4,'COMPLETED','INTAKE','Online',H(50,11),completed_at=H(50,12))
a_priya1 = appt(s7,c_bia,c4,'COMPLETED','COUNSELING','Online',H(30,11),completed_at=H(30,12))
a_priya2 = appt(s7,c_bia,c4,'COMPLETED','COUNSELING','Online',H(14,11),completed_at=H(14,12))
appt(s7,c_bia,c4,'CONFIRMED','COUNSELING','Online',F(7,11))
# Grace (c17)
appt(s18,ic_mars,c17,'COMPLETED','INTAKE','Online',H(25,13),completed_at=H(25,14))
a_grace1 = appt(s18,c_bia,c17,'COMPLETED','COUNSELING','Online',H(15,13),completed_at=H(15,14))
a_grace2 = appt(s18,c_bia,c17,'COMPLETED','COUNSELING','Online',H(5,13),completed_at=H(5,14))
appt(s18,c_bia,c17,'EVALUATION','COUNSELING','Online',H(1,13))
appt(s18,c_bia,c17,'PENDING_STUDENT_APPROVAL','COUNSELING','Online',F(6,13))
appt(s18,c_bia,c17,'CONFIRMED','COUNSELING','Online',F(13,13))
appt(s18,c_bia,c17,'FOLLOW_UP','COUNSELING','Online',F(20,13))
print("✓ c_bia: 11 appointments (Priya×4 + Grace×7)")

# ══════════════════════════════════════════════════════════════════════════════
# COUNSELOR: c_chelly — Sofia (c5) + Rachel (c13) = 11 items
# ══════════════════════════════════════════════════════════════════════════════
appt(s5,ic_wil,c5,'COMPLETED','INTAKE','Online',H(40,14),completed_at=H(40,15))
appt(s5,c_chelly,c5,'COMPLETED','COUNSELING','Online',H(25,14),completed_at=H(25,15))
appt(s5,c_chelly,c5,'CONFIRMED','COUNSELING','Online',F(5,14))
# Rachel (c13)
appt(s14,ic_ria,c13,'COMPLETED','INTAKE','Online',H(22,10),completed_at=H(22,11))
a_rachel1 = appt(s14,c_chelly,c13,'COMPLETED','COUNSELING','Online',H(14,10),completed_at=H(14,11))
a_rachel2 = appt(s14,c_chelly,c13,'COMPLETED','COUNSELING','Online',H(6,10),completed_at=H(6,11))
appt(s14,c_chelly,c13,'EVALUATION','COUNSELING','Online',H(1,10))
appt(s14,c_chelly,c13,'CONFIRMED','COUNSELING','Online',F(3,10))
appt(s14,c_chelly,c13,'PENDING_STUDENT_APPROVAL','COUNSELING','Online',F(10,10))
appt(s14,c_chelly,c13,'RESCHEDULE_REQUESTED','COUNSELING','Online',F(17,10),
     reschedule_reason='Student has clinical duty that day')
appt(s14,c_chelly,c13,'FOLLOW_UP','COUNSELING','Online',F(24,10))
print("✓ c_chelly: 11 appointments (Sofia×3 + Rachel×8)")

# ══════════════════════════════════════════════════════════════════════════════
# COUNSELOR: c_daye — Lena (c9) = 11 items
# ══════════════════════════════════════════════════════════════════════════════
appt(s10,ic_archie,c9,'COMPLETED','INTAKE','F2F',H(35,13),completed_at=H(35,14))
a_lena1 = appt(s10,c_daye,c9,'COMPLETED','COUNSELING','F2F',H(27,13),completed_at=H(27,14))
a_lena2 = appt(s10,c_daye,c9,'COMPLETED','COUNSELING','F2F',H(19,13),completed_at=H(19,14))
a_lena3 = appt(s10,c_daye,c9,'COMPLETED','COUNSELING','F2F',H(11,13),completed_at=H(11,14))
appt(s10,c_daye,c9,'EVALUATION','COUNSELING','F2F',H(2,13))
appt(s10,c_daye,c9,'CONFIRMED','COUNSELING','F2F',F(2,13))
appt(s10,c_daye,c9,'CONFIRMED','COUNSELING','F2F',F(9,13))
appt(s10,c_daye,c9,'PENDING_STUDENT_APPROVAL','COUNSELING','F2F',F(16,13))
appt(s10,c_daye,c9,'FOLLOW_UP','COUNSELING','F2F',F(23,13))
appt(s10,c_daye,c9,'RESCHEDULE_REQUESTED','COUNSELING','F2F',F(30,13),
     reschedule_reason='Counselor unavailable — conflict with department meeting')
appt(s10,c_daye,c9,'REFERRAL','COUNSELING','F2F',F(37,13),
     referral_notes='Referred to psychologist for more comprehensive anxiety evaluation')
print("✓ c_daye: 11 appointments (Lena×11)")

# ══════════════════════════════════════════════════════════════════════════════
# COUNSELOR: c_csc — Nina (c15) = 11 items
# ══════════════════════════════════════════════════════════════════════════════
appt(s16,ic_julse,c15,'COMPLETED','INTAKE','F2F',H(18,9),completed_at=H(18,10))
a_nina1 = appt(s16,c_csc,c15,'COMPLETED','COUNSELING','F2F',H(12,9),completed_at=H(12,10))
a_nina2 = appt(s16,c_csc,c15,'COMPLETED','COUNSELING','F2F',H(5,9),completed_at=H(5,10))
appt(s16,c_csc,c15,'EVALUATION','COUNSELING','F2F',H(1,9))
appt(s16,c_csc,c15,'CONFIRMED','COUNSELING','F2F',F(4,9))
appt(s16,c_csc,c15,'CONFIRMED','COUNSELING','F2F',F(11,9))
appt(s16,c_csc,c15,'MATCHED','COUNSELING','F2F',F(18,9))
appt(s16,c_csc,c15,'PENDING_STUDENT_APPROVAL','COUNSELING','F2F',F(25,9))
appt(s16,c_csc,c15,'FOLLOW_UP','COUNSELING','F2F',F(32,9))
appt(s16,c_csc,c15,'RESCHEDULE_REQUESTED','COUNSELING','F2F',F(39,9),
     reschedule_reason='Student requests online session instead')
appt(s16,c_csc,c15,'APPROVED','COUNSELING','F2F',F(46,9))
print("✓ c_csc: 11 appointments (Nina×11)")

# ══════════════════════════════════════════════════════════════════════════════
# PSYCHOLOGIST: p_daryl — Mark (c2) + James (c3) + Kevin (c19) = 13 items
# ══════════════════════════════════════════════════════════════════════════════
appt(s2,ic_archie,c2,'COMPLETED','INTAKE','F2F',H(20,13),completed_at=H(20,14))
a_mark1 = appt(s2,p_daryl,c2,'COMPLETED','COUNSELING','F2F',H(10,9),completed_at=H(10,10))
appt(s2,p_daryl,c2,'CONFIRMED','COUNSELING','F2F',F(2,9))
appt(s2,None,c2,'REQUESTED','COUNSELING','F2F',F(8,13),preferred_method='F2F',
     notes='Follow-up request — mood tracking')
# James
appt(s6,ic_rose_c,c3,'COMPLETED','INTAKE','F2F',H(7,14),completed_at=H(7,15))
a_james1 = appt(s6,p_daryl,c3,'COMPLETED','COUNSELING','F2F',H(3,9),completed_at=H(3,10))
appt(s6,p_daryl,c3,'EVALUATION','COUNSELING','F2F',H(0,9))
appt(s6,p_daryl,c3,'CONFIRMED','COUNSELING','F2F',F(1,9))
appt(s6,p_daryl,c3,'FOLLOW_UP','COUNSELING','F2F',F(8,9))
# Kevin (c19)
appt(s20,ic_archie,c19,'COMPLETED','INTAKE','F2F',H(22,10),completed_at=H(22,11))
a_kevin1 = appt(s20,p_daryl,c19,'COMPLETED','COUNSELING','F2F',H(14,10),completed_at=H(14,11))
a_kevin2 = appt(s20,p_daryl,c19,'COMPLETED','COUNSELING','F2F',H(6,10),completed_at=H(6,11))
appt(s20,p_daryl,c19,'EVALUATION','COUNSELING','F2F',H(1,10))
appt(s20,p_daryl,c19,'CONFIRMED','COUNSELING','F2F',F(3,10))
appt(s20,p_daryl,c19,'CONFIRMED','COUNSELING','F2F',F(10,10))
appt(s20,p_daryl,c19,'PENDING_STUDENT_APPROVAL','COUNSELING','F2F',F(17,10))
print("✓ p_daryl: 16 appointments (Mark×4 + James×5 + Kevin×7)")

# ══════════════════════════════════════════════════════════════════════════════
# PSYCHOLOGIST: p_niko — Sam (c6) + Diana (c20) = 11 items
# ══════════════════════════════════════════════════════════════════════════════
appt(s8,ic_cris,c6,'COMPLETED','INTAKE','F2F',H(65,10),completed_at=H(65,11))
appt(s8,p_niko,c6,'NO_SHOW','COUNSELING','F2F',H(40,13))
appt(s8,p_niko,c6,'NO_SHOW','COUNSELING','F2F',H(26,13))
appt(s8,p_niko,c6,'NO_SHOW','COUNSELING','F2F',H(12,13))
# Diana (c20)
appt(s21,ic_gracie,c20,'COMPLETED','INTAKE','Online',H(18,13),completed_at=H(18,14))
a_diana1 = appt(s21,p_niko,c20,'COMPLETED','COUNSELING','Online',H(11,13),completed_at=H(11,14))
a_diana2 = appt(s21,p_niko,c20,'COMPLETED','COUNSELING','Online',H(4,13),completed_at=H(4,14))
appt(s21,p_niko,c20,'EVALUATION','COUNSELING','Online',H(1,13))
appt(s21,p_niko,c20,'CONFIRMED','COUNSELING','Online',F(4,13))
appt(s21,p_niko,c20,'CONFIRMED','COUNSELING','Online',F(11,13))
appt(s21,p_niko,c20,'FOLLOW_UP','COUNSELING','Online',F(18,13))
appt(s21,p_niko,c20,'PENDING_STUDENT_APPROVAL','COUNSELING','Online',F(25,13))
print("✓ p_niko: 12 appointments (Sam×4 + Diana×8)")

# ══════════════════════════════════════════════════════════════════════════════
# PSYCHOLOGIST: p_bon — Amy (c11) = 11 items
# ══════════════════════════════════════════════════════════════════════════════
appt(s12,ic_mars,c11,'COMPLETED','INTAKE','F2F',H(28,9),completed_at=H(28,10))
a_amy1 = appt(s12,p_bon,c11,'COMPLETED','COUNSELING','F2F',H(20,9),completed_at=H(20,10))
a_amy2 = appt(s12,p_bon,c11,'COMPLETED','COUNSELING','F2F',H(13,9),completed_at=H(13,10))
a_amy3 = appt(s12,p_bon,c11,'COMPLETED','COUNSELING','F2F',H(6,9),completed_at=H(6,10))
appt(s12,p_bon,c11,'EVALUATION','COUNSELING','F2F',H(1,9))
appt(s12,p_bon,c11,'CONFIRMED','COUNSELING','F2F',F(2,9))
appt(s12,p_bon,c11,'CONFIRMED','COUNSELING','F2F',F(9,9))
appt(s12,p_bon,c11,'RESCHEDULE_REQUESTED','COUNSELING','F2F',F(16,9),
     reschedule_reason='Student wants to change session time to afternoon')
appt(s12,p_bon,c11,'FOLLOW_UP','COUNSELING','F2F',F(23,9))
appt(s12,p_bon,c11,'PENDING_STUDENT_APPROVAL','COUNSELING','F2F',F(30,9))
appt(s12,p_bon,c11,'REFERRAL','COUNSELING','F2F',F(37,9),
     referral_notes='Referred to psychiatry for pharmacological evaluation')
print("✓ p_bon: 11 appointments (Amy×11)")

# ══════════════════════════════════════════════════════════════════════════════
# PSYCHOLOGIST: p_shel — Miguel (c12) = 11 items
# ══════════════════════════════════════════════════════════════════════════════
appt(s13,ic_wil,c12,'COMPLETED','INTAKE','Online',H(32,11),completed_at=H(32,12))
a_miguel1 = appt(s13,p_shel,c12,'COMPLETED','COUNSELING','Online',H(24,11),completed_at=H(24,12))
a_miguel2 = appt(s13,p_shel,c12,'COMPLETED','COUNSELING','Online',H(16,11),completed_at=H(16,12))
a_miguel3 = appt(s13,p_shel,c12,'COMPLETED','COUNSELING','Online',H(8,11),completed_at=H(8,12))
appt(s13,p_shel,c12,'EVALUATION','COUNSELING','Online',H(1,11))
appt(s13,p_shel,c12,'CONFIRMED','COUNSELING','Online',F(3,11))
appt(s13,p_shel,c12,'CONFIRMED','COUNSELING','Online',F(10,11))
appt(s13,p_shel,c12,'MATCHED','COUNSELING','Online',F(17,11))
appt(s13,p_shel,c12,'PENDING_STUDENT_APPROVAL','COUNSELING','Online',F(24,11))
appt(s13,p_shel,c12,'RESCHEDULE_REQUESTED','COUNSELING','Online',F(31,11),
     reschedule_reason='Student has thesis defense that week')
appt(s13,p_shel,c12,'FOLLOW_UP','COUNSELING','Online',F(38,11))
print("✓ p_shel: 11 appointments (Miguel×11)")

# ══════════════════════════════════════════════════════════════════════════════
# PSYCHOLOGIST: p_jenny — Carlos (c10) = 11 items
# ══════════════════════════════════════════════════════════════════════════════
appt(s11,ic_cris,c10,'COMPLETED','INTAKE','F2F',H(42,9),completed_at=H(42,10))
a_carlos1 = appt(s11,p_jenny,c10,'COMPLETED','COUNSELING','F2F',H(34,9),completed_at=H(34,10))
a_carlos2 = appt(s11,p_jenny,c10,'COMPLETED','COUNSELING','F2F',H(26,9),completed_at=H(26,10))
a_carlos3 = appt(s11,p_jenny,c10,'COMPLETED','COUNSELING','F2F',H(18,9),completed_at=H(18,10))
a_carlos4 = appt(s11,p_jenny,c10,'COMPLETED','COUNSELING','F2F',H(10,9),completed_at=H(10,10))
appt(s11,p_jenny,c10,'EVALUATION','COUNSELING','F2F',H(2,9))
appt(s11,p_jenny,c10,'CONFIRMED','COUNSELING','F2F',F(5,9))
appt(s11,p_jenny,c10,'CONFIRMED','COUNSELING','F2F',F(12,9))
appt(s11,p_jenny,c10,'FOLLOW_UP','COUNSELING','F2F',F(19,9))
appt(s11,p_jenny,c10,'PENDING_STUDENT_APPROVAL','COUNSELING','F2F',F(26,9))
appt(s11,p_jenny,c10,'RESCHEDULE_REQUESTED','COUNSELING','F2F',F(33,9),
     reschedule_reason='Board exam week — cannot attend')
print("✓ p_jenny: 11 appointments (Carlos×11)")

# ══════════════════════════════════════════════════════════════════════════════
# PSYCHOLOGIST: p_chona — David (c14) = 11 items
# ══════════════════════════════════════════════════════════════════════════════
appt(s15,ic_rose_c,c14,'COMPLETED','INTAKE','F2F',H(38,14),completed_at=H(38,15))
a_david1 = appt(s15,p_chona,c14,'COMPLETED','COUNSELING','F2F',H(29,14),completed_at=H(29,15))
a_david2 = appt(s15,p_chona,c14,'COMPLETED','COUNSELING','F2F',H(20,14),completed_at=H(20,15))
a_david3 = appt(s15,p_chona,c14,'COMPLETED','COUNSELING','F2F',H(11,14),completed_at=H(11,15))
appt(s15,p_chona,c14,'EVALUATION','COUNSELING','F2F',H(2,14))
appt(s15,p_chona,c14,'CONFIRMED','COUNSELING','F2F',F(4,14))
appt(s15,p_chona,c14,'CONFIRMED','COUNSELING','F2F',F(11,14))
appt(s15,p_chona,c14,'MATCHED','COUNSELING','F2F',F(18,14))
appt(s15,p_chona,c14,'FOLLOW_UP','COUNSELING','F2F',F(25,14))
appt(s15,p_chona,c14,'PENDING_STUDENT_APPROVAL','COUNSELING','F2F',F(32,14))
appt(s15,p_chona,c14,'REFERRAL','COUNSELING','F2F',F(39,14),
     referral_notes='Referred to psychiatry for pharmacological evaluation of depression')
print("✓ p_chona: 11 appointments (David×11)")

# ══════════════════════════════════════════════════════════════════════════════
# PSYCHOLOGIST: p_csp — Ethan (c16, CLOSED recently) = 10 historical items
# ══════════════════════════════════════════════════════════════════════════════
appt(s17,ic_archie,c16,'COMPLETED','INTAKE','Online',H(70,10),completed_at=H(70,11))
a_ethan1 = appt(s17,p_csp,c16,'COMPLETED','COUNSELING','Online',H(60,10),completed_at=H(60,11))
a_ethan2 = appt(s17,p_csp,c16,'COMPLETED','COUNSELING','Online',H(50,10),completed_at=H(50,11))
a_ethan3 = appt(s17,p_csp,c16,'COMPLETED','COUNSELING','Online',H(40,10),completed_at=H(40,11))
a_ethan4 = appt(s17,p_csp,c16,'COMPLETED','COUNSELING','Online',H(30,10),completed_at=H(30,11))
a_ethan5 = appt(s17,p_csp,c16,'COMPLETED','COUNSELING','Online',H(22,10),completed_at=H(22,11))
a_ethan6 = appt(s17,p_csp,c16,'COMPLETED','COUNSELING','Online',H(14,10),completed_at=H(14,11))
appt(s17,p_csp,c16,'EVALUATION','COUNSELING','Online',H(13,10))
appt(s17,p_csp,c16,'COMPLETED','COUNSELING','Online',H(7,10),completed_at=H(7,11))
appt(s17,p_csp,c16,'COMPLETED','COUNSELING','Online',H(1,10),completed_at=H(1,11))
print("✓ p_csp: 10 appointments (Ethan×10, closed case)")

# ══════════════════════════════════════════════════════════════════════════════
# UNASSIGNED REQUESTED — visible to STAFF (counselor_id: None)
# ══════════════════════════════════════════════════════════════════════════════
# Existing: Jessica (s3), Alex (s4 x2), Mark follow-up
appt(s3,None,c8,'REQUESTED','COUNSELING','F2F',F(5,10),
     preferred_method='F2F',notes='First counseling session after intake')
appt(s4,None,None,'REQUESTED','INTAKE','F2F',F(3,9),
     preferred_method='F2F',notes='First year — anxious about transition')
appt(s4,None,None,'REQUESTED','INTAKE','Online',F(6,10),
     preferred_method='Online',notes='Backup slot requested')
appt(s2,None,c2,'REQUESTED','COUNSELING','F2F',F(8,13),
     preferred_method='F2F',notes='Follow-up request')
# Additional walk-ins
for idx, (sid, cid, note) in enumerate([
    (s1,c1,'Emma requested additional session'),
    (s7,c4,'Priya — early check-in request'),
    (s5,c5,'Sofia — urgent anxiety flare-up'),
]):
    appt(sid,None,cid,'REQUESTED','COUNSELING','F2F',F(idx+2,11),notes=note)
# Also a cancelled appointment
appt(s1,c_rose_t,c1,'CANCELLED','COUNSELING','F2F',F(12,10),
     cancellation_reason='Student requested reschedule',cancelled_at=dago(2))
print("✓ Staff-visible: 7 REQUESTED (unassigned) + 1 CANCELLED\n")

# ══════════════════════════════════════════════════════════════════════════════
# IC QUEUE APPOINTMENTS — 7 intake appointments per IC, unique pattern per IC
# ══════════════════════════════════════════════════════════════════════════════
print("Seeding IC queue appointments...")
IC_QUEUE_PATTERNS = [
    # Julse Aguilar — heavy walk-in traffic, mornings
    [('REQUESTED','F2F',  -8,  9, 'Walk-in — overwhelmed by midterms, first time seeking help'),
     ('REQUESTED','F2F',  -5, 10, 'Walk-in — reports persistent sadness and low motivation'),
     ('REQUESTED','Online',-2, 11, 'Portal submission — academic stress, multiple deadlines'),
     ('CONFIRMED','F2F',   1,  9, None),
     ('CONFIRMED','Online', 4, 11, None),
     ('EVALUATION','F2F', -3,  9, None),
     ('EVALUATION','Online',-1,15, None)],
    # Archie Fernandez — more confirmed, afternoon slots
    [('REQUESTED','Online',-6, 13, 'Portal — relationship breakdown, difficulty sleeping'),
     ('REQUESTED','F2F',  -3, 14, 'Walk-in, appeared tearful at reception'),
     ('CONFIRMED','F2F',   2, 13, None),
     ('CONFIRMED','Online', 5, 14, None),
     ('CONFIRMED','F2F',   9, 13, None),
     ('EVALUATION','F2F', -4, 14, None),
     ('EVALUATION','Online',-1,13, None)],
    # Mars Dela Cruz — all online, spread across days
    [('REQUESTED','Online',-7,  9, 'Portal — sleep problems and low mood for 3 weeks'),
     ('REQUESTED','Online',-4, 11, 'Portal — social anxiety, avoids group work'),
     ('REQUESTED','Online',-1, 14, 'Urgent portal note — cried during class'),
     ('CONFIRMED','Online', 3,  9, None),
     ('CONFIRMED','Online', 7, 11, None),
     ('EVALUATION','Online',-2, 9, None),
     ('EVALUATION','Online',-1,15, None)],
    # Ria Ocampo — all F2F, full queue
    [('REQUESTED','F2F',  -9,  9, 'Walk-in — first time, referred by adviser'),
     ('REQUESTED','F2F',  -5, 10, 'Walk-in — family conflict affecting studies'),
     ('REQUESTED','F2F',  -1, 11, 'Same-day walk-in, visibly distressed'),
     ('CONFIRMED','F2F',   1,  9, None),
     ('CONFIRMED','F2F',   3, 10, None),
     ('CONFIRMED','F2F',   6,  9, None),
     ('EVALUATION','F2F', -2, 12, None)],
    # Cris Villanueva — lighter load, mixed methods
    [('REQUESTED','F2F',  -5, 10, 'Walk-in — conflict with thesis group members'),
     ('REQUESTED','Online',-2, 14, 'Portal — anxiety about career direction'),
     ('CONFIRMED','F2F',   2, 10, None),
     ('CONFIRMED','Online', 5, 14, None),
     ('CONFIRMED','F2F',  10, 10, None),
     ('EVALUATION','F2F', -3, 10, None),
     ('EVALUATION','Online',-1,14, None)],
    # Wil Santos — all online, afternoon/evening
    [('REQUESTED','Online',-6, 14, 'Portal — burnout from part-time work and studies'),
     ('REQUESTED','Online',-3, 15, 'Second request — first-choice slot was taken'),
     ('REQUESTED','Online',-1, 16, 'Urgent note: panic symptoms before exam'),
     ('CONFIRMED','Online', 2, 14, None),
     ('CONFIRMED','Online', 6, 15, None),
     ('EVALUATION','Online',-4,14, None),
     ('EVALUATION','Online',-2,16, None)],
    # Rose Cabrera — fewer working days, F2F, varied hours
    [('REQUESTED','F2F',  -7,  8, 'Walk-in — grief after loss of grandparent'),
     ('REQUESTED','F2F',  -3,  9, 'Walk-in — family financial stress'),
     ('CONFIRMED','F2F',   1,  8, None),
     ('CONFIRMED','F2F',   5,  9, None),
     ('CONFIRMED','F2F',   8, 10, None),
     ('EVALUATION','F2F', -2,  8, None),
     ('EVALUATION','F2F', -1,  9, None)],
    # Gracie Mendoza — mixed online/F2F, mid-morning
    [('REQUESTED','Online',-5, 10, 'Portal — test anxiety, failing major subjects'),
     ('REQUESTED','F2F',  -3, 11, 'Walk-in, referred by nurse clinic'),
     ('REQUESTED','Online',-1, 14, 'Last-minute portal — roommate conflict'),
     ('CONFIRMED','Online', 2, 10, None),
     ('CONFIRMED','F2F',   4, 11, None),
     ('EVALUATION','Online',-4,10, None),
     ('EVALUATION','F2F', -2, 11, None)],
]
for ic_idx, ic_id in enumerate(ICS):
    ic_name = IC_NAMES[ic_idx]
    pattern = IC_QUEUE_PATTERNS[ic_idx]
    for q_idx, (status, method, day_offset, hour, note) in enumerate(pattern):
        student_idx = ic_idx * 7 + q_idx
        sid = IC_Q[student_idx]
        start = F(day_offset, hour) if day_offset >= 0 else H(-day_offset, hour)
        kw = {}
        if note:
            kw['notes'] = note
        if status == 'EVALUATION':
            kw['completed_at'] = start + timedelta(hours=1)
        appt(sid, ic_id, None, status, 'INTAKE', method, start, mins=60, **kw)
    print(f"  ✓ {ic_name}: 7 intake queue appointments")

print(f"\n✅ All appointments seeded\n")

# ══════════════════════════════════════════════════════════════════════════════
# IC INTAKE RECORDS — "Complete IC Report" + "Completed" stages
# COMPLETED: one per main student already seeded via mk_intake above
# IN_PROGRESS: 2 per IC using the EVALUATION appointment students (session done, report pending)
# ══════════════════════════════════════════════════════════════════════════════
print("Seeding IC intake records for write/done stages...")
for ic_idx, ic_id in enumerate(ICS):
    ic_name = IC_NAMES[ic_idx]
    # Students at q_idx 5 and 6 had EVALUATION appointments — session complete, report pending
    for q_sub in [5, 6]:
        student_idx = ic_idx * 7 + q_sub
        sid = IC_Q[student_idx]
        student = db.users.find_one({'_id': sid})
        sname = student.get('name', f'Student {22+student_idx}') if student else f'Student {22+student_idx}'
        # Minimal case so case_id lookup works
        case_id = db.cases.insert_one({
            'student_id': sid, 'student_name': sname,
            'student_email': student.get('email','') if student else '',
            'intake_counselor_id': ic_id,
            'case_status': 'NEW', 'risk_level': 'GREEN',
            'concern': 'Seeking counseling support', 'presenting_issue': 'General counseling',
            'check_ins': [], 'created_at': dago(2), 'updated_at': now,
        }).inserted_id
        db.intakes.insert_one({
            'student_id': sid, 'client_name': sname,
            'ic_id': ic_id, 'counselor_id': ic_id, 'case_id': case_id,
            'status': 'IN_PROGRESS',
            'chief_complaint': 'Intake session completed — endorsement report in progress',
            'source': 'walk_in', 'service_requested': 'personal_counseling',
            'created_at': dago(1), 'updated_at': now,
        })
    print(f"  ✓ {ic_name}: 2 IN_PROGRESS intake records (write stage)")
print(f"✅ IC intake records seeded\n")

# ── SESSION NOTES ──────────────────────────────────────────────────────────────
def soap_note(case_id, counselor_id, session_date, session_type, subj, obj, asmt, plan, mood, risk=False):
    return db.session_notes.insert_one({
        'case_id':case_id,'counselor_id':counselor_id,'session_date':session_date,
        'session_type':session_type,'note_format':'SOAP',
        'soap':{'subjective':subj,'objective':obj,'assessment':asmt,'plan':plan},
        'structured_soap':None,'mood_rating':mood,'risk_flagged':risk,
        'risk_notes':'Monitor closely' if risk else None,
        'is_deleted':False,'deleted_at':None,'deleted_by':None,
        'current_version':1,'edit_history':[],
        'created_at':session_date,'updated_at':session_date,
    }).inserted_id

# Emma
soap_note(c1,c_rose_t,H(20,10),'INDIVIDUAL',
    "Client reports reduced stress after implementing the study schedule. Sleep improved slightly.",
    "Client appeared calm and engaged. No signs of acute distress. Affect appropriate.",
    "Emma is showing early improvement consistent with Adjustment Disorder (F43.2). PHQ-9 trending down.",
    "Continue CBT-based stress inoculation. Assign journaling exercise focusing on academic wins.",7)
soap_note(c1,c_rose_t,H(10,10),'INDIVIDUAL',
    "Emma says the study schedule is still working. Feels more in control. Sleep 7 hours now.",
    "Client alert and engaged. Positive affect. Less tension than session 1.",
    "Good progress. Academic performance stabilizing. Anxiety significantly reduced.",
    "Begin discussing session tapering. Assign independent stress management plan.",8)

# Mark
soap_note(c2,p_daryl,H(10,9),'INDIVIDUAL',
    "Mark disclosed continued low mood and social withdrawal. Denies active SI but admits passive hopelessness.",
    "Client appeared fatigued, slightly disheveled. Slower speech. Mood described as 4/10.",
    "Moderate depressive episode (F32.1). PHQ-9 at 13. Behavioral activation needed.",
    "Introduce behavioral activation log. Assign 2 social activities per week. PHQ-9 reassessment next session.",4,risk=True)

# James
soap_note(c3,p_daryl,H(3,9),'CRISIS',
    "James reports passive SI thoughts have decreased. Safety plan card in wallet. Mother is aware.",
    "Client alert. Good eye contact. Less constricted affect vs. intake. Safety plan visible.",
    "Severe depression (F32.2) with passive SI, trending toward stabilization. Risk: MODERATE.",
    "Review and reinforce safety plan. Coordinate with university health for psychiatric evaluation.",3,risk=True)

# Priya
soap_note(c4,c_bia,H(30,11),'INDIVIDUAL',
    "Client reports family situation slightly calmer. Had one constructive conversation with mother.",
    "Client engaged and hopeful. Brought written notes from homework exercise.",
    "Adjustment Disorder improving. Communication skills developing.",
    "Continue communication skills practice. Assign family meeting facilitation task.",6)
soap_note(c4,c_bia,H(14,11),'INDIVIDUAL',
    "Priya says home is significantly better. Had a calm dinner conversation with both parents.",
    "Client visibly relieved. Positive affect. Dressed neatly, engaged throughout.",
    "Substantial progress. Goal 1 achieved. Transitioning to consolidation phase.",
    "Begin resilience-building work. Discuss potential closure planning within 3–4 sessions.",8)

# Sofia
soap_note(c5,c_chelly,H(25,14),'INDIVIDUAL',
    "Sofia reports much less anxiety before clinical duties since starting mindfulness practice.",
    "Noticeably more relaxed posture vs. first session. Spoke with confidence.",
    "Performance anxiety responding well to mindfulness. PERMA scores trending Flourishing.",
    "Continue MBSR. Introduce 'confident clinician' visualization. Discuss tapering sessions.",8)

# Maria (full arc)
for i,(d,mood,content) in enumerate([
    (80,4,"Maria processing grief slowly but meaningfully. Discussed early memories of grandmother."),
    (65,5,"Maria began using grief journal. Sharing more openly. Mood starting to lift."),
    (20,7,"Significant shift — Maria was able to smile recounting a positive memory."),
]):
    db.session_notes.insert_one({
        'case_id':c7,'counselor_id':c_rose_t,'session_date':H(d,9),
        'session_type':'INDIVIDUAL','note_format':'NARRATIVE','content':content,
        'mood_rating':mood,'risk_flagged':False,'is_deleted':False,
        'current_version':1,'edit_history':[],'created_at':H(d,9),'updated_at':H(d,9),
    })

# Lena (c9, c_daye)
soap_note(c9,c_daye,H(27,13),'INDIVIDUAL',
    "Lena reports that the cognitive restructuring exercises are helping with perfectionism. Less catastrophizing before exams.",
    "Client engaged, made good eye contact. More relaxed than session 1. Affect appropriate.",
    "Perfectionism-driven anxiety (F41.1) responding well to CBT interventions.",
    "Continue cognitive restructuring. Assign 'good enough' experiment homework.",7)
soap_note(c9,c_daye,H(19,13),'INDIVIDUAL',
    "Lena completed 'good enough' homework. Reports submitting one assignment without excessive revision.",
    "Client appeared proud of herself. Positive affect. Less tension in posture.",
    "Meaningful behavioral change. Perfectionism softening. Anxiety scores dropping.",
    "Introduce values clarification. Discuss academic identity vs. self-worth separation.",8)

# Rachel (c13, c_chelly)
soap_note(c13,c_chelly,H(14,10),'INDIVIDUAL',
    "Rachel reports ongoing self-critical thoughts after receiving a B+ on a quiz she expected to ace.",
    "Client appeared slightly tense. Described thoughts as 'spiraling.' Mood 5/10.",
    "Perfectionism and self-doubt patterns active. CBT framework being applied.",
    "Introduce self-compassion practices. Assign thought records for self-critical episodes.",5)
soap_note(c13,c_chelly,H(6,10),'INDIVIDUAL',
    "Rachel tried the compassion exercise. Reports it felt 'weird but helpful.' B+ no longer feels catastrophic.",
    "Client more relaxed. Laughed at one point discussing her perfectionism. Mood 7/10.",
    "Good progress. Compassion-focused approach gaining traction.",
    "Continue self-compassion work. Identify academic strengths beyond grades.",7)

# Grace (c17, c_bia)
soap_note(c17,c_bia,H(15,13),'INDIVIDUAL',
    "Grace is still processing the breakup. Reports intrusive thoughts about what she 'did wrong.'",
    "Client appeared sad but engaged. Cried briefly at one point. Contained within session.",
    "Relationship grief with self-blame pattern. Narrative therapy approach appropriate.",
    "Assign letter-to-self exercise. Explore events timeline to challenge blame narrative.",4)
soap_note(c17,c_bia,H(5,13),'INDIVIDUAL',
    "Grace has identified that the relationship had early red flags she ignored. Processing with less self-blame.",
    "Client calmer. More objective tone when discussing relationship. Positive forward reference made.",
    "Grief integrating. Self-worth beginning to recover. Reduced self-blame.",
    "Begin future self-visualization. Discuss reconnecting with interests she abandoned during relationship.",7)

# Leo (c18, c_rose_t)
soap_note(c18,c_rose_t,H(18,10),'INDIVIDUAL',
    "Leo reports the time-blocking technique is working for assignments. Missing fewer deadlines.",
    "Client engaged and energized. Came with completed homework. Affect positive.",
    "Academic stress (Adjustment Disorder) responding well to skills-based intervention.",
    "Introduce priority matrix. Assign weekly planning ritual.",7)
soap_note(c18,c_rose_t,H(7,10),'INDIVIDUAL',
    "Leo says he's catching up on late submissions. Feeling less behind. Still has some procrastination triggers.",
    "Client relaxed. Made self-deprecating joke about procrastination — good sign.",
    "Good progress. Time management skills developing. Procrastination triggers identified.",
    "Address procrastination triggers using CBT. Explore avoidance patterns.",8)

# Carlos (c10, p_jenny)
soap_note(c10,p_jenny,H(34,9),'INDIVIDUAL',
    "Carlos describes feeling 'empty' despite studying 12+ hours daily. Grades declining despite effort.",
    "Client appeared exhausted. Dark circles under eyes. Spoke slowly. Mood 3/10.",
    "Severe burnout with depressive features (F32.1). PHQ-9 remains elevated at 14.",
    "Introduce recovery-oriented behavioral scheduling. No study sessions > 4 hours. Sleep hygiene protocol.",3)
soap_note(c10,p_jenny,H(26,9),'INDIVIDUAL',
    "Carlos followed sleep hygiene protocol. Slept 7 hours for first time in months.",
    "Client appeared slightly more rested. Some return of affect. Mood 5/10.",
    "Early positive response to rest intervention. Burnout recovery beginning.",
    "Continue rest protocol. Introduce meaning-based work — reconnect with CPA career motivation.",5)
soap_note(c10,p_jenny,H(18,9),'INDIVIDUAL',
    "Carlos reconnected with why he chose accountancy. Less dread about board exam.",
    "Client engaged, some spontaneous conversation. Mood 6/10.",
    "Burnout recovering. Depression lifting. Purpose narrative re-established.",
    "Begin graduated return to full study schedule. Monitor mood with weekly PHQ-9.",6)
soap_note(c10,p_jenny,H(10,9),'INDIVIDUAL',
    "Carlos feels 'human again.' PHQ-9 dropped to 8. Passed a practice board exam section.",
    "Client smiled throughout most of session. Energy levels returning.",
    "Substantial recovery from burnout and depression. PHQ-9 at 8 (mild range).",
    "Discuss termination planning. 2 more sessions to consolidate gains and plan maintenance.",8)

# Amy (c11, p_bon)
soap_note(c11,p_bon,H(20,9),'INDIVIDUAL',
    "Amy continues to experience intrusive flashbacks to the clinical incident. Avoiding the hospital floor where it occurred.",
    "Client appeared hypervigilant. Sitting near door. Startle response noted twice.",
    "PTSD (F43.1) — active phase. Avoidance behavior prominent. Safety established.",
    "Psychoeducation on trauma response. Begin grounding techniques. No exposure work yet.",4)
soap_note(c11,p_bon,H(13,9),'INDIVIDUAL',
    "Amy successfully used grounding technique during a flashback at school. Reports it 'slowed things down.'",
    "Client appears slightly less hypervigilant. Made sustained eye contact today.",
    "PTSD responding to grounding interventions. Avoidance still present but manageable.",
    "Introduce 5-4-3-2-1 sensory grounding as daily practice. Begin trauma narrative preparation.",5)
soap_note(c11,p_bon,H(6,9),'INDIVIDUAL',
    "Amy returned to the hospital floor with support. Experienced anxiety but did not dissociate.",
    "Client showed visible relief after reporting the exposure. Mood improved during session.",
    "Significant milestone — graduated exposure successful. Processing beginning.",
    "Continue trauma-focused CBT. Begin written trauma narrative. PHQ-9 reassessment next week.",6)

# Miguel (c12, p_shel)
soap_note(c12,p_shel,H(24,11),'INDIVIDUAL',
    "Miguel is paralyzed by thesis anxiety. Cannot write despite having all the data. Avoidance pattern established.",
    "Client appeared dejected and exhausted. Hands shaking slightly. Mood 3/10.",
    "Mixed anxiety-depression (F41.2). Thesis-related procrastination now generalized.",
    "Psychoeducation on anxiety-avoidance cycle. Assign 10-minute writing sessions daily.",3)
soap_note(c12,p_shel,H(16,11),'INDIVIDUAL',
    "Miguel completed 3 of 7 daily writing sessions. Reports they felt 'less terrible than expected.'",
    "Client slightly more engaged. Some humor returned. Mood 5/10.",
    "Behavioral activation working. Avoidance cycle breaking gradually.",
    "Extend sessions to 20 minutes. Add reward schedule. Address perfectionism in thesis writing.",5)
soap_note(c12,p_shel,H(8,11),'INDIVIDUAL',
    "Miguel completed chapter 2 outline. This is the first concrete progress in 3 months.",
    "Client appeared relieved and proud. Mood 7/10. Engaged actively in problem-solving.",
    "Significant behavioral progress. Anxiety-depression improving with increased productivity.",
    "Maintain momentum. Address remaining thesis chapters systematically. Discuss defense timeline.",7)

# David (c14, p_chona)
soap_note(c14,p_chona,H(29,14),'INDIVIDUAL',
    "David reports pulling all-nighters regularly. Feels like he cannot keep up. Law school feels 'designed to break people.'",
    "Client appeared gaunt, fatigued. Described mood as 1/10. No appetite.",
    "Moderate-severe depression (F32.1). Burnout in law school context. PHQ-9=15 at intake.",
    "Crisis assessment — no SI. Immediate: reduce all-nighters. Sleep ≥ 6 hours mandatory.",3)
soap_note(c14,p_chona,H(20,14),'INDIVIDUAL',
    "David followed sleep protocol. Averaged 6.5 hours over last week. Mood improved slightly.",
    "Less gaunt appearance. Some affect returning. Mood 4/10.",
    "Early recovery from burnout-driven depression. Sleep intervention working.",
    "Introduce stress-inoculation for case studies. Address catastrophic thinking about failing.",4)
soap_note(c14,p_chona,H(11,14),'INDIVIDUAL',
    "David passed a major case competition he expected to fail. Starting to question the 'I'm hopeless' narrative.",
    "Client showed surprise and pleasure discussing the achievement. First genuine smile in sessions.",
    "Depression lifting. Cognitive rigidity softening. Behavioral evidence challenging dysfunctional beliefs.",
    "Challenge 'failure identity' schema. Begin building support network within law school cohort.",6)

# Kevin (c19, p_daryl)
soap_note(c19,p_daryl,H(14,10),'INDIVIDUAL',
    "Kevin had 2 panic attacks this week — one during a chemistry lab. Using the emergency room once.",
    "Client appeared anxious even in session. Breathing slightly elevated. Checked watch frequently.",
    "Panic Disorder (F41.0) — active. Interoceptive sensitivity high. Health anxiety complicating.",
    "Psychoeducation on panic cycle. Introduce diaphragmatic breathing. No avoidance of labs.",5)
soap_note(c19,p_daryl,H(6,10),'INDIVIDUAL',
    "Kevin had only 1 panic attack this week. Did not go to ER. Used breathing technique.",
    "Client appeared calmer. Less checking behavior during session. Mood 6/10.",
    "Good early response to panic control therapy. Avoidance decreasing.",
    "Introduce interoceptive exposure. Continue breathing technique. Discuss caffeine and sleep hygiene.",6)

# Diana (c20, p_niko)
soap_note(c20,p_niko,H(11,13),'INDIVIDUAL',
    "Diana finds herself unable to open her father's old photos. Grief is 'frozen.' Academic attendance suffering.",
    "Client tearful throughout most of session. Maintained composure. Mood 3/10.",
    "Complicated grief with depressive features (F43.21). Avoidance of grief-related stimuli.",
    "Normalize complicated grief. Introduce graduated exposure to memory tasks. Assign one family photo.",3)
soap_note(c20,p_niko,H(4,13),'INDIVIDUAL',
    "Diana looked at one photo. Cried, but was able to describe a memory. First step in grief processing.",
    "Client arrived with red eyes — clearly cried before session. During session, stabilized. Mood 5/10.",
    "Grief processing beginning. The photo exercise opened the avoidance pattern.",
    "Continue graduated memory work. Introduce meaning-making — what did her father value? How can she honor that?",5)

# Nina (c15, c_csc)
soap_note(c15,c_csc,H(12,9),'INDIVIDUAL',
    "Nina misses home every weekend. Finds it hard to connect with classmates who seem more 'adjusted.'",
    "Client appeared quietly sad. Spoke softly. Mood 4/10. Homesick presentation.",
    "Adjustment Disorder with homesickness as primary stressor. Social connection deficit.",
    "Assign 3 social contacts this week — no need to be deep friendships. Build exposure to campus life.",4)
soap_note(c15,c_csc,H(5,9),'INDIVIDUAL',
    "Nina joined the nursing student org. Attended one meeting. Felt welcomed.",
    "Client appeared brighter. Initiated conversation topic about her new friends. Mood 7/10.",
    "Excellent progress on social connection goal. Adjustment improving significantly.",
    "Continue campus engagement. Address remaining academic adjustment concerns.",7)

# Ethan (c16, p_csp) — full arc
for i,(d,mood,subj) in enumerate([
    (60,4,"Ethan reports extreme anxiety about internship rejection. Catastrophizing career failure."),
    (50,5,"Ethan applied to 5 internships despite anxiety. Reports it was 'terrifying but done.'"),
    (40,6,"Received one interview invitation. Practiced mock interview in session. Performed well."),
    (30,7,"Got the internship. Still anxious about first day but mood significantly improved."),
    (22,7,"First week at internship completed. Supervisor gave positive feedback. Surprise relief."),
    (14,8,"Internship going well. Anxiety almost gone. Social withdrawal resolved."),
    (7,9,"Ethan feels confident. Ready to close. Goals fully achieved. Excited about future."),
]):
    db.session_notes.insert_one({
        'case_id':c16,'counselor_id':p_csp,'session_date':H(d,10),
        'session_type':'INDIVIDUAL','note_format':'NARRATIVE','content':subj,
        'mood_rating':mood,'risk_flagged':False,'is_deleted':False,
        'current_version':1,'edit_history':[],'created_at':H(d,10),'updated_at':H(d,10),
    })

print(f"✅ Session notes seeded\n")

# ── CHECK-INS ─────────────────────────────────────────────────────────────────
ci1 = db.check_ins.insert_one({
    'case_id':c4,'client_id':s7,'checked_in_by':c_bia,'check_in_type':'STATUS_UPDATE',
    'client_status_before':'IMPROVING','client_status_after':'IMPROVING',
    'concern_before':'Family conflict','concern_after':'Family conflict',
    'notes':'Phone check-in. Client confirms homework tasks completed. Family dynamic manageable.',
    'action_items':[{'action':'Submit journaling exercise','due_date':ymd(dfrom(3))}],
    'referrals_made':[],'contact_method':'PHONE','duration_minutes':15,
    'outcome':'ONGOING','next_check_in_date':dago(14),'created_at':dago(21),'updated_at':dago(21),
}).inserted_id
ci2 = db.check_ins.insert_one({
    'case_id':c4,'client_id':s7,'checked_in_by':c_bia,'check_in_type':'WELFARE_CHECK',
    'client_status_before':'IMPROVING','client_status_after':'STABLE',
    'concern_before':'Family conflict','concern_after':'Family conflict (reduced intensity)',
    'notes':'Email welfare check. Client reports significantly less daily conflict.',
    'action_items':[],'referrals_made':[],'contact_method':'EMAIL','duration_minutes':5,
    'outcome':'ONGOING','next_check_in_date':None,'created_at':dago(7),'updated_at':dago(7),
}).inserted_id
db.cases.update_one({'_id':c4},{'$push':{'check_ins':{'check_in_id':ci1,'check_in_date':dago(21),'type':'STATUS_UPDATE'}}})
db.cases.update_one({'_id':c4},{'$push':{'check_ins':{'check_in_id':ci2,'check_in_date':dago(7),'type':'WELFARE_CHECK'}}})

ci3 = db.check_ins.insert_one({
    'case_id':c1,'client_id':s1,'checked_in_by':c_rose_t,'check_in_type':'STATUS_UPDATE',
    'client_status_before':None,'client_status_after':'IMPROVING',
    'concern_before':'Academic stress','concern_after':'Academic stress (reduced)',
    'notes':'Brief email follow-up. Emma says study schedule is working well.',
    'action_items':[],'referrals_made':[],'contact_method':'EMAIL','duration_minutes':5,
    'outcome':'ONGOING','next_check_in_date':None,'created_at':dago(10),'updated_at':dago(10),
}).inserted_id
db.cases.update_one({'_id':c1},{'$push':{'check_ins':{'check_in_id':ci3,'check_in_date':dago(10),'type':'STATUS_UPDATE'}}})

ci4 = db.check_ins.insert_one({
    'case_id':c3,'client_id':s6,'checked_in_by':p_daryl,'check_in_type':'WELFARE_CHECK',
    'client_status_before':'CRISIS','client_status_after':'STABILIZING',
    'concern_before':'Passive SI, severe depression','concern_after':'Passive SI trending down',
    'notes':'Daily crisis welfare check. James has been responding to messages within 2 hours. Safety plan active.',
    'action_items':[{'action':'Emergency contact confirmed','due_date':ymd(now)}],
    'referrals_made':[],'contact_method':'PHONE','duration_minutes':10,
    'outcome':'ONGOING','next_check_in_date':dfrom(1),'created_at':dago(2),'updated_at':dago(2),
}).inserted_id
db.cases.update_one({'_id':c3},{'$push':{'check_ins':{'check_in_id':ci4,'check_in_date':dago(2),'type':'WELFARE_CHECK'}}})

print("✅ Check-ins seeded\n")

# ── SAFETY PLAN ───────────────────────────────────────────────────────────────
db.safety_plans.insert_one({
    'case_id':c3,'student_id':s6,'created_by':p_daryl,'created_at':dago(7),
    'warning_signs':['Feeling like a burden to others','Increased social withdrawal','Not responding to messages for more than 24 hours'],
    'coping_strategies':['Call crisis hotline: 1-800-273-8255','Text trusted friend (roommate — Marco)','Mindfulness breathing exercise (5-5-5 method)','Go to campus counseling office'],
    'social_supports':['Marco Reyes (roommate) — 09XX-XXX-XXXX','Mother — 09XX-XXX-XXXX','University Counseling Office — local 312'],
    'professional_contacts':['Dr. Daryl (Psychologist) — via university system','Crisis hotline: 1-800-273-8255','Emergency: 911'],
    'safe_environment':'Removed harmful items from dorm room. Roommate is aware and supportive.',
    'reasons_to_live':['Family','Career goals','Close friendships'],'updated_at':dago(7),
})
print("✅ Safety plan seeded\n")

# ── PERMA SNAPSHOTS ───────────────────────────────────────────────────────────
for entry_date,label in [(dago(35),'Struggling'),(dago(28),'Languishing'),(dago(21),'Languishing'),
                          (dago(14),'Flourishing'),(dago(7),'Flourishing'),(dago(1),'Thriving')]:
    db.perma_snapshots.update_one(
        {'mhbot_username':'sofia.martinez','entry_date':entry_date},
        {'$set':{'mhbot_username':'sofia.martinez','perma_label':label,'entry_date':entry_date,
                 'raw_date':entry_date.isoformat(),'student_user_id':s5,'saved_at':now}},upsert=True)
    db.perma_history.insert_one({'username':'sofia.martinez','perma_label':label,'date':entry_date})
db.users.update_one({'_id':s5},{'$set':{'perma_latest_label':'Thriving','perma_latest_date':dago(1).isoformat(),'perma_synced_at':now}})
print("✅ PERMA data seeded\n")

# ── MISSED APPOINTMENT TRACKER ────────────────────────────────────────────────
db.missed_appointment_tracker.insert_one({
    'case_id':c6,'student_id':s8,'consecutive_no_shows':3,'total_no_shows':3,
    'last_no_show':dago(12),'auto_closed':True,'closed_at':dago(5),'updated_at':dago(5),
})
print("✅ Tracker seeded\n")

# ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
notifs = [
    {'target_user_id':str(c_rose_t),'type':'CASE_ASSIGNED','message':'You have been assigned to a new case: Emma Johnson (CPS-2025-001).','case_id':str(c1),'read':True,'created_at':dago(30)},
    {'target_user_id':str(c_rose_t),'type':'APPOINTMENT_UPCOMING','message':'Reminder: Counseling session with Emma Johnson in 4 days.','case_id':str(c1),'read':False,'created_at':dago(1)},
    {'target_user_id':str(c_rose_t),'type':'CASE_ASSIGNED','message':'You have been assigned to a new case: Leo Reyes (CPS-2025-018).','case_id':str(c18),'read':False,'created_at':dago(28)},
    {'target_user_id':str(p_daryl),'type':'CRISIS_ALERT','message':'Code Red/CRITICAL: James Wilson — immediate clinical review required.','case_id':str(c3),'risk_level':'RED','read':False,'created_at':dago(7)},
    {'target_user_id':str(p_daryl),'type':'CASE_ASSIGNED','message':'You have been assigned: Mark Smith (CPS-2025-002).','case_id':str(c2),'read':True,'created_at':dago(20)},
    {'target_user_id':str(p_daryl),'type':'APPOINTMENT_UPCOMING','message':'Session with Mark Smith tomorrow at 9:00 AM.','case_id':str(c2),'read':False,'created_at':dago(1)},
    {'target_user_id':str(c_bia),'type':'CASE_ASSIGNED','message':'You have been assigned: Priya Desai (CPS-2025-004).','case_id':str(c4),'read':True,'created_at':dago(50)},
    {'target_user_id':str(c_daye),'type':'CASE_ASSIGNED','message':'You have been assigned: Lena Park (CPS-2025-009).','case_id':str(c9),'read':False,'created_at':dago(35)},
    {'target_user_id':str(p_bon),'type':'CRISIS_ALERT','message':'Amy Torres (CPS-2025-011) has RED risk level. Review safety assessment.','case_id':str(c11),'risk_level':'RED','read':False,'created_at':dago(28)},
    {'target_user_id':str(s1),'type':'APPOINTMENT_CONFIRMED','message':'Your counseling appointment has been confirmed for 4 days from now at 10:00 AM.','read':False,'created_at':dago(1)},
    {'target_user_id':str(s2),'type':'APPOINTMENT_CONFIRMED','message':'Your appointment with Dr. Daryl has been confirmed.','read':False,'created_at':dago(1)},
    {'target_user_id':str(s3),'type':'APPOINTMENT_REQUESTED','message':'Your counseling appointment request has been received and is under review.','read':False,'created_at':now},
    {'target_user_id':str(s8),'type':'CASE_CLOSED_NO_SHOW','message':'Your counseling case has been closed due to 3 consecutive missed appointments.','read':False,'created_at':dago(5)},
    {'target_user_id':str(staff_id),'type':'APPOINTMENT_REQUESTED','message':'7 new appointment requests are pending assignment.','read':False,'created_at':now},
]
for n in notifs:
    n.setdefault('created_at',now)
    db.notifications.insert_one(n)
print(f"✅ {len(notifs)} notifications seeded\n")

# ── ANNOUNCEMENTS ─────────────────────────────────────────────────────────────
for a in [
    {'title':'Mental Health Awareness Week — Schedule of Activities','body':'Join us this week for free mindfulness sessions, art therapy workshops, and a panel discussion on student wellbeing.','event_type':'event','pinned':True,'is_active':True,'created_by':admin_id,'created_at':dago(3)},
    {'title':'New Online Booking System — Now Available','body':'Students may now book intake appointments online through the CPS portal. Walk-in services remain available Monday–Friday, 8 AM–5 PM.','event_type':'info','pinned':False,'is_active':True,'created_by':admin_id,'created_at':dago(10)},
    {'title':'Clinic Hours Extended for Midterm Season','body':'The CPS counseling clinic will extend operating hours to 7 PM on weekdays from now until the end of the midterm examination period.','event_type':'notice','pinned':False,'is_active':True,'created_by':dpo_id,'created_at':dago(5)},
    {'title':'Upcoming: Psychoeducation on Anxiety Management','body':'A free psychoeducation session on managing academic anxiety will be held next Friday at the Main Hall. Open to all students — no appointment needed.','event_type':'event','pinned':False,'is_active':True,'created_by':p_daryl,'created_at':dago(2)},
]:
    db.announcements.insert_one(a)
print("✅ Announcements seeded\n")

# ── RESOURCES ─────────────────────────────────────────────────────────────────
for r in [
    {'title':'Stress Management Guide','category':'Mental Wellness','resource_type':'PDF','description':'10 evidence-based strategies for managing academic stress'},
    {'title':'Understanding Anxiety — Student Guide','category':'Mental Wellness','resource_type':'Article','description':'What anxiety is, common triggers, and self-help tips'},
    {'title':'PHQ-9 Self-Assessment Tool','category':'Self-Assessment','resource_type':'PDF','description':'Patient Health Questionnaire for depression screening'},
    {'title':'Cognitive Behavioral Therapy Basics','category':'Therapy Techniques','resource_type':'Video','description':'Introduction to CBT principles for students'},
    {'title':'Sleep Hygiene Tips','category':'Physical Wellness','resource_type':'Article','description':'Improve sleep quality with these science-backed strategies'},
    {'title':'Crisis Support Resources','category':'Crisis Support','resource_type':'Reference','description':'Local and national crisis hotlines and emergency contacts'},
    {'title':'Mindfulness & Meditation Exercises','category':'Mindfulness','resource_type':'Video','description':'Guided 5-minute mindfulness sessions for daily use'},
    {'title':'Grief and Loss — Coping Strategies','category':'Mental Wellness','resource_type':'Article','description':'Understanding the grief process and healthy coping strategies'},
]:
    r['created_at'] = dago(30)
    db.resources.insert_one(r)
print("✅ Resources seeded\n")

# ── VERIFICATION ──────────────────────────────────────────────────────────────
print("="*60)
print("VERIFICATION")
print("="*60)
for col in ['users','cases','intakes','appointments','session_notes','check_ins',
            'safety_plans','perma_snapshots','counselor_availability']:
    print(f"  {col:<32} {db[col].count_documents({}):>4}")

print("""
============================================================
✅  DATABASE SEED COMPLETE  (v2 — role-rich)
============================================================

ADMIN / SYSTEM
  admin@university.edu     admin123    ADMIN
  dpo@university.edu       dpo123      DPO
  staff@university.edu     staff123    STAFF
  cm@university.edu        cm123       CASE_MANAGER

INTAKE COUNSELORS (8) — each has 7 active intake appointments (unique patterns)
  julse@university.edu     julse123    Julse Aguilar
  archie@university.edu    archie123   Archie Fernandez
  mars@university.edu      mars123     Mars Dela Cruz
  ria@university.edu       ria123      Ria Ocampo
  cris@university.edu      cris123     Cris Villanueva
  wil@university.edu       wil123      Wil Santos
  rose.c@university.edu    rosec123    Rose Cabrera
  gracie@university.edu    gracie123   Gracie Mendoza

COUNSELORS — each has weekly schedule + availability slots for 28 days
  rose.t@university.edu    roset123    Rose Tolentino  → Emma + Maria + Leo (~15 appts)
  bia@university.edu       bia123      Bia Alcantara   → Priya + Grace (~11 appts)
  chelly@university.edu    chelly123   Chelly Reyes    → Sofia + Rachel (~11 appts)
  daye@university.edu      daye123     Daye Navarro    → Lena (~11 appts)
  csc@university.edu       csc123      Clara Santos    → Nina (~11 appts)

PSYCHOLOGISTS — each has weekly schedule + availability slots for 28 days
  daryl@university.edu     daryl123    Daryl Bautista  → Mark + James + Kevin (~16 appts)
  niko@university.edu      niko123     Niko Pascual    → Sam + Diana (~12 appts)
  bon@university.edu       bon123      Bon Aquino      → Amy (~11 appts)
  shel@university.edu      shel123     Shel Macaraeg   → Miguel (~11 appts)
  jenny@university.edu     jenny123    Jenny Soriano   → Carlos (~11 appts)
  chona@university.edu     chona123    Chona Lim       → David (~11 appts)
  csp@university.edu       csp123      Carl de Guzman  → Ethan — CLOSED case history (~10 appts)

STUDENTS (21 main + 56 IC-queue)
  student1@university.edu  student123  Emma Johnson   — ACTIVE GREEN, treatment plan
  student2@university.edu  student456  Mark Smith     — ACTIVE YELLOW, PHQ-9=13
  student3@university.edu  student789  Jessica Davis  — NEW case, REQUESTED
  student4@university.edu  student101  Alex Chen      — No case, 2 REQUESTED
  student5@university.edu  student202  Sofia Martinez — ACTIVE, PERMA arc
  student6@university.edu  student303  James Wilson   — ACTIVE RED, safety plan
  student7@university.edu  student404  Priya Desai    — ACTIVE, check-ins
  student8@university.edu  student505  Sam Rivera     — CLOSED (3 no-shows)
  student9@university.edu  student606  Maria Santos   — CLOSED (success)
  student10@university.edu student10   Lena Park      — ACTIVE GREEN, c_daye
  student11@university.edu student11   Carlos Diaz    — ACTIVE YELLOW, p_jenny
  student12@university.edu student12   Amy Torres     — ACTIVE RED (PTSD), p_bon
  student13@university.edu student13   Miguel Santos  — ACTIVE YELLOW, p_shel
  student14@university.edu student14   Rachel Kim     — ACTIVE GREEN, c_chelly
  student15@university.edu student15   David Tan      — ACTIVE YELLOW, p_chona
  student16@university.edu student16   Nina Cruz      — ACTIVE GREEN, c_csc
  student17@university.edu student17   Ethan Lee      — CLOSED (success), p_csp
  student18@university.edu student18   Grace Aquino   — ACTIVE GREEN, c_bia
  student19@university.edu student19   Leo Reyes      — ACTIVE GREEN, c_rose_t
  student20@university.edu student20   Kevin Lim      — ACTIVE YELLOW, p_daryl
  student21@university.edu student21   Diana Santos   — ACTIVE YELLOW, p_niko

STAFF dashboard (staff@university.edu)
  → 7 unassigned REQUESTED appointments (walk-ins + online requests)
  → All CONFIRMED/MATCHED appointments from all counselors/psychologists
""")
