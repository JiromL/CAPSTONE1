#!/usr/bin/env python3
"""
seed_extended.py — Extended CPS seed data (v1)
Run AFTER seed_database.py:
  python scripts/seed_database.py && python scripts/seed_extended.py

Adds 20 new students with comprehensive realistic scenarios:
  • 5 RED/CRITICAL risk cases (SI, eating disorder, OCD, bipolar, substance use)
  • 8 YELLOW/moderate risk cases (GAD, PTSD, grief, burnout, ADHD, etc.)
  • 7 GREEN/low risk cases (adjustment, breakup, career anxiety, etc.)
  • 80+ appointments total
  • Full reschedule chains (RESCHEDULE_REQUESTED → PENDING_STUDENT_APPROVAL → rescheduled)
  • 3-no-show termination protocol demonstrated (2 students)
  • 2-no-show warning (1 student)
  • Counselor→psychologist referral arc (1 student)
  • 4 safety plans for high-risk cases
  • Realistic SOAP session notes for all active cases
"""

import os, random
from pymongo import MongoClient

rng = random.Random(77)
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from werkzeug.security import generate_password_hash

# ── CONNECTION ─────────────────────────────────────────────────────────────────
MONGO_URI   = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017')
DB_NAME     = os.environ.get('MONGODB_DB_NAME', 'cps_system_dev')
client = MongoClient(MONGO_URI)
db = client[DB_NAME]

now = datetime.now(timezone.utc)

def H(days_ago, hour=9, minute=0):
    """Datetime n days in the past at the given hour."""
    t = now - timedelta(days=days_ago)
    return t.replace(hour=hour, minute=minute, second=0, microsecond=0)

def F(days_ahead, hour=9, minute=0):
    """Datetime n days in the future at the given hour."""
    t = now + timedelta(days=days_ahead)
    return t.replace(hour=hour, minute=minute, second=0, microsecond=0)

def ymd(d):
    return d.date().isoformat()

def hashed(pw):
    return generate_password_hash(pw)

def uid(email):
    u = db.users.find_one({'email': email}, {'_id': 1})
    if not u:
        raise ValueError(f"User not found: {email} — run seed_database.py first.")
    return u['_id']

# ── EXISTING PROVIDER IDs ──────────────────────────────────────────────────────
c_rose_t  = uid('rose.t@university.edu')
c_bia     = uid('bia@university.edu')
c_chelly  = uid('chelly@university.edu')
c_daye    = uid('daye@university.edu')
c_csc     = uid('csc@university.edu')
p_daryl   = uid('daryl@university.edu')
p_niko    = uid('niko@university.edu')
p_bon     = uid('bon@university.edu')
p_shel    = uid('shel@university.edu')
p_jenny   = uid('jenny@university.edu')
p_chona   = uid('chona@university.edu')
p_csp     = uid('csp@university.edu')
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

print("✅ Provider IDs loaded\n")

# ── NEW STUDENTS ───────────────────────────────────────────────────────────────
_student_specs = [
    # (first, last, program, year, pw, dob)
    ('Marco',   'Reyes',     'BS Computer Engineering',      4, 'ext101', '2001-06-12'),
    ('Jasmine', 'Torres',    'BS Nursing',                   3, 'ext102', '2002-09-03'),
    ('Ryan',    'Santos',    'BS Biology (Pre-Med Track)',    4, 'ext103', '2001-03-21'),
    ('Bea',     'Cruz',      'Juris Doctor',                 2, 'ext104', '2000-11-08'),
    ('Andre',   'Villanueva','BS Computer Science',          3, 'ext105', '2002-04-17'),
    ('Trisha',  'Morales',   'BS Architecture',              4, 'ext106', '2001-08-30'),
    ('JC',      'Reyes',     'BS Accountancy',               3, 'ext107', '2002-02-14'),
    ('Hannah',  'Dela Cruz', 'BS Psychology',                3, 'ext108', '2002-07-05'),
    ('Migs',    'Fernandez', 'Master in Business Admin',     2, 'ext109', '1999-12-22'),
    ('Ina',     'Santos',    'BS Medical Technology',        4, 'ext110', '2001-05-10'),
    ('Kaye',    'Lim',       'BS Education',                 2, 'ext111', '2003-01-28'),
    ('Gab',     'Cruz',      'AB Liberal Arts',              3, 'ext112', '2002-10-15'),
    ('Pau',     'Aguilar',   'BS Nursing',                   2, 'ext113', '2003-03-07'),
    ('Mae',     'Santos',    'BS Computer Engineering',      1, 'ext114', '2005-06-19'),
    ('Eli',     'Tan',       'BS Business Administration',   2, 'ext115', '2003-08-25'),
    ('Cris',    'Reyes',     'BS Nursing',                   2, 'ext116', '2003-11-12'),
    ('Jan',     'Navarro',   'BS Computer Science',          4, 'ext117', '2001-04-03'),
    ('Ara',     'Ocampo',    'BS Education',                 3, 'ext118', '2002-09-20'),
    ('Josh',    'Santos',    'BS Marine Biology',            2, 'ext119', '2003-07-14'),
    ('Lia',     'Flores',    'BS Architecture',              3, 'ext120', '2002-12-01'),
]

sE = []  # sE[0..19] → maps to specs above
for i, (first, last, prog, yr, pw, dob) in enumerate(_student_specs):
    n = i + 101
    sid = db.users.insert_one({
        'email': f'ext_student{i+1}@university.edu',
        'password': hashed(pw),
        'role': 'STUDENT',
        'first_name': first, 'last_name': last,
        'name': f'{first} {last}',
        'student_id': f'1{26 - yr:02d}{rng.randint(10000, 99999)}',
        'program': prog, 'year_level': yr,
        'date_of_birth': dob,
        'contact_number': f'0917{n:07d}',
        'emergency_contact': {
            'name': f'{last} Parent',
            'relationship': 'Parent',
            'phone': '09190000001',
        },
        'is_active': True,
        'created_at': H(90), 'updated_at': H(90),
        'perma_latest_label': None,
    }).inserted_id
    sE.append(sid)

# convenience aliases
(s_marco, s_jasmine, s_ryan, s_bea, s_andre,
 s_trisha, s_jc, s_hannah, s_migs, s_ina,
 s_kaye, s_gab, s_pau, s_mae, s_eli,
 s_cris, s_jan, s_ara, s_josh, s_lia) = sE

print(f"✅ {len(sE)} new students created\n")

# ── HELPERS ────────────────────────────────────────────────────────────────────
_case_counter = [20]  # seed_database.py created 001–020

def mk_intake(student_id, ic_id, days_ago, endorse_to='COUNSELOR', status='COMPLETED'):
    return db.intakes.insert_one({
        'student_id': student_id,
        'ic_id': ic_id,
        'status': status,
        'intake_date': ymd(H(days_ago)),
        'presenting_concerns': 'Student self-referred. Completed intake assessment.',
        'endorsement_type': endorse_to,
        'endorsement_notes': f'Endorsed for {endorse_to.lower()} services.',
        'created_at': H(days_ago),
        'updated_at': H(days_ago - 1),
    }).inserted_id

def mk_case(student_id, counselor_id, risk, status, phq9, gad7, diagnoses,
            treatment_plan, concern, created_days_ago=60, closed_at=None,
            closure_reason=None):
    _case_counter[0] += 1
    doc = {
        'case_number': f'CPS-2025-{_case_counter[0]:03d}',
        'student_id': student_id,
        'counselor_id': counselor_id,
        'status': status,
        'risk_level': risk,
        'primary_concern': concern,
        'diagnoses': diagnoses,
        'treatment_plan': treatment_plan,
        'phq9_score': phq9,
        'gad7_score': gad7,
        'phq9_date': ymd(H(created_days_ago - 2)),
        'gad7_date': ymd(H(created_days_ago - 2)),
        'session_count': 0,
        'check_ins': [],
        'referrals': [],
        'created_at': H(created_days_ago),
        'updated_at': H(2),
        'closed_at': closed_at,
        'closure_reason': closure_reason,
    }
    return db.cases.insert_one(doc).inserted_id

def appt(student_id, provider_id, case_id, appt_dt, status,
         session_type='INDIVIDUAL', notes=None,
         reschedule_reason=None, reschedule_requested_by=None,
         reschedule_requested_at=None, proposed_new_time=None,
         proposed_by=None, rescheduled_from_id=None, rescheduled_to_id=None,
         no_show_reason=None, original_scheduled_time=None,
         is_walk_in=False, booking_method='ONLINE'):
    doc = {
        'student_id': student_id,
        'counselor_id': provider_id,
        'case_id': case_id,
        'appointment_date': ymd(appt_dt),
        'appointment_time': appt_dt.strftime('%H:%M'),
        'appointment_datetime': appt_dt,
        'session_type': session_type,
        'status': status,
        'notes': notes,
        'booking_method': booking_method,
        'is_walk_in': is_walk_in,
        'created_at': appt_dt - timedelta(days=7),
        'updated_at': appt_dt,
    }
    if reschedule_reason:        doc['reschedule_reason'] = reschedule_reason
    if reschedule_requested_by:  doc['reschedule_requested_by'] = reschedule_requested_by
    if reschedule_requested_at:  doc['reschedule_requested_at'] = reschedule_requested_at
    if proposed_new_time:        doc['proposed_new_time'] = proposed_new_time
    if proposed_by:              doc['proposed_by'] = proposed_by
    if rescheduled_from_id:      doc['rescheduled_from_id'] = rescheduled_from_id
    if rescheduled_to_id:        doc['rescheduled_to_id'] = rescheduled_to_id
    if original_scheduled_time:  doc['original_scheduled_time'] = original_scheduled_time
    if no_show_reason:           doc['no_show_reason'] = no_show_reason
    if status == 'NO_SHOW':
        doc['no_show_recorded_at'] = appt_dt + timedelta(hours=1)
    return db.appointments.insert_one(doc).inserted_id

def soap(case_id, counselor_id, session_dt, subj, obj, asmt, plan,
         mood, risk=False, session_type='INDIVIDUAL'):
    db.session_notes.insert_one({
        'case_id': case_id, 'counselor_id': counselor_id,
        'session_date': session_dt, 'session_type': session_type,
        'note_format': 'SOAP',
        'soap': {'subjective': subj, 'objective': obj, 'assessment': asmt, 'plan': plan},
        'structured_soap': None, 'mood_rating': mood, 'risk_flagged': risk,
        'risk_notes': 'URGENT: Monitor closely. Immediate follow-up required.' if risk else None,
        'is_deleted': False, 'deleted_at': None, 'deleted_by': None,
        'current_version': 1, 'edit_history': [],
        'created_at': session_dt, 'updated_at': session_dt,
    })

def notif(target_id, ntype, message, case_id=None, risk_level=None, read=False, days_ago=1):
    doc = {
        'target_user_id': str(target_id), 'type': ntype, 'message': message,
        'read': read, 'created_at': H(days_ago), 'updated_at': H(days_ago),
    }
    if case_id:    doc['case_id'] = str(case_id)
    if risk_level: doc['risk_level'] = risk_level
    db.notifications.insert_one(doc)

print("✅ Helpers defined\n")

# ══════════════════════════════════════════════════════════════════════════════
# INTAKES
# ══════════════════════════════════════════════════════════════════════════════
mk_intake(s_marco,   ic_julse,  70, 'PSYCHOLOGIST')
mk_intake(s_jasmine, ic_archie, 68, 'PSYCHOLOGIST')
mk_intake(s_ryan,    ic_mars,   65, 'PSYCHOLOGIST')
mk_intake(s_bea,     ic_ria,    62, 'PSYCHOLOGIST')
mk_intake(s_andre,   ic_cris,   75, 'PSYCHOLOGIST')
mk_intake(s_trisha,  ic_wil,    58, 'COUNSELOR')
mk_intake(s_jc,      ic_rose_c, 55, 'COUNSELOR')
mk_intake(s_hannah,  ic_gracie, 60, 'PSYCHOLOGIST')
mk_intake(s_migs,    ic_julse,  52, 'COUNSELOR')
mk_intake(s_ina,     ic_archie, 50, 'COUNSELOR')
mk_intake(s_kaye,    ic_mars,   45, 'COUNSELOR')
mk_intake(s_gab,     ic_ria,    48, 'PSYCHOLOGIST')
mk_intake(s_pau,     ic_cris,   40, 'COUNSELOR')
mk_intake(s_mae,     ic_wil,    35, 'COUNSELOR')
mk_intake(s_eli,     ic_rose_c, 30, 'COUNSELOR')
mk_intake(s_cris,    ic_gracie, 28, 'COUNSELOR')
mk_intake(s_jan,     ic_julse,  25, 'COUNSELOR')
mk_intake(s_ara,     ic_archie, 22, 'COUNSELOR')
mk_intake(s_josh,    ic_mars,   20, 'COUNSELOR')
mk_intake(s_lia,     ic_ria,    18, 'COUNSELOR')

print("✅ Extended intakes seeded\n")

# ══════════════════════════════════════════════════════════════════════════════
# CASES 021–040
# ══════════════════════════════════════════════════════════════════════════════

# ── Case 021: Marco Reyes — RED/CRITICAL, Severe MDD + passive SI + PTSD ────
c21 = mk_case(
    s_marco, p_daryl, 'RED', 'ACTIVE',
    phq9=20, gad7=14,
    diagnoses=['F32.2 Major Depressive Disorder, Severe', 'F43.1 Post-Traumatic Stress Disorder'],
    treatment_plan='Trauma-focused CBT. Weekly individual sessions. Safety plan active. Coordination with university health for psychiatric evaluation. Crisis protocol in place.',
    concern='Severe depression with passive suicidal ideation and PTSD symptoms following fraternity hazing incident during 3rd year.',
    created_days_ago=65,
)

# ── Case 022: Jasmine Torres — RED, Anorexia Nervosa + Major Depression ─────
c22 = mk_case(
    s_jasmine, p_bon, 'RED', 'ACTIVE',
    phq9=19, gad7=12,
    diagnoses=['F50.01 Anorexia Nervosa, Restricting Type', 'F32.2 Major Depressive Disorder, Severe'],
    treatment_plan='Coordinated care: individual psychotherapy (CBT-E for eating disorders) + referral to university nutritionist + medical monitoring. BMI and vital signs tracked weekly. Safety plan active.',
    concern='Severely restricted eating, significant weight loss, body dysmorphia, and severe depression in the context of nursing clinical rotations.',
    created_days_ago=63,
)

# ── Case 023: Ryan Santos — YELLOW→RED, Severe OCD with functional impairment
c23 = mk_case(
    s_ryan, p_shel, 'RED', 'ACTIVE',
    phq9=15, gad7=18,
    diagnoses=['F42.2 Obsessive-Compulsive Disorder, Severe', 'F41.1 Generalized Anxiety Disorder'],
    treatment_plan='ERP (Exposure and Response Prevention). Weekly sessions. Hierarchy of contamination fears developed. Gradual exposure protocol. Monitor academic impact — lab clearance risk.',
    concern='Severe contamination OCD preventing full participation in biology laboratory requirements. Washing rituals consuming 4–6 hours daily. At risk of failing clinical requirements.',
    created_days_ago=58,
)

# ── Case 024: Bea Cruz — RED, Bipolar II + recent hypomanic episode ──────────
c24 = mk_case(
    s_bea, p_chona, 'RED', 'ACTIVE',
    phq9=17, gad7=11,
    diagnoses=['F31.81 Bipolar II Disorder', 'F41.1 Generalized Anxiety Disorder'],
    treatment_plan='Mood stabilization support. Psychoeducation on bipolar cycle. Sleep hygiene and routine regulation critical. Medication compliance monitoring (referred to psychiatrist). Crisis plan active.',
    concern='Bipolar II disorder with recent hypomanic episode characterized by impulsivity, decreased sleep, and academic misconduct incident. Currently in depressive phase.',
    created_days_ago=55,
)

# ── Case 025: Andre Villanueva — RED, Cannabis Use + Severe Depression (CLOSED)
c25 = mk_case(
    s_andre, p_niko, 'RED', 'CLOSED',
    phq9=18, gad7=10,
    diagnoses=['F12.20 Cannabis Use Disorder, Moderate', 'F32.2 Major Depressive Disorder, Severe'],
    treatment_plan='Motivational enhancement + CBT for substance use. Social reintegration plan. Academic support coordination.',
    concern='Severe social isolation, daily cannabis use to cope with depression, failing 3 subjects. Missed all scheduled sessions.',
    created_days_ago=75,
    closed_at=H(32),
    closure_reason='Case closed per CPS protocol: 3 consecutive missed appointments without contact. Student was notified via email. Re-referral available upon student request.',
)

# ── Case 026: Trisha Morales — YELLOW, Sleep disorder + depressive features ──
c26 = mk_case(
    s_trisha, c_chelly, 'YELLOW', 'ACTIVE',
    phq9=11, gad7=13,
    diagnoses=['G47.00 Insomnia Disorder', 'F32.0 Major Depressive Disorder, Mild'],
    treatment_plan='CBT-I (Cognitive Behavioral Therapy for Insomnia). Sleep hygiene protocol. Mood monitoring. Academic workload assessment.',
    concern='Chronic insomnia (averaging 3–4 hours/night) with depressive features. Architecture studio deadlines driving sleep deprivation cycle.',
    created_days_ago=53,
)

# ── Case 027: JC Reyes — YELLOW, GAD with somatic symptoms ──────────────────
c27 = mk_case(
    s_jc, c_daye, 'YELLOW', 'ACTIVE',
    phq9=9, gad7=15,
    diagnoses=['F41.1 Generalized Anxiety Disorder', 'F45.1 Undifferentiated Somatoform Disorder'],
    treatment_plan='CBT for GAD. Somatic grounding techniques. Worry postponement. Medical clearance obtained for somatic symptoms.',
    concern='Persistent worry, muscle tension, GI symptoms (medically cleared), and difficulty concentrating. Affecting CPA board review preparation.',
    created_days_ago=50,
)

# ── Case 028: Hannah Dela Cruz — YELLOW, Vicarious trauma + 2 no-shows ──────
c28 = mk_case(
    s_hannah, p_daryl, 'YELLOW', 'ACTIVE',
    phq9=12, gad7=9,
    diagnoses=['F43.10 Post-Traumatic Stress Disorder, Unspecified', 'F32.0 Major Depressive Disorder, Mild'],
    treatment_plan='Trauma-informed therapy. Vicarious trauma psychoeducation. Self-care protocol. Academic accommodations recommended.',
    concern='Vicarious trauma from community immersion practicum involving poverty exposure and child abuse cases. Intrusive imagery and emotional numbing.',
    created_days_ago=58,
)

# ── Case 029: Migs Fernandez — YELLOW, MBA perfectionism + burnout ───────────
c29 = mk_case(
    s_migs, c_bia, 'YELLOW', 'ACTIVE',
    phq9=10, gad7=12,
    diagnoses=['F43.10 Adjustment Disorder with Mixed Anxiety and Depressed Mood', 'Z73.0 Burnout'],
    treatment_plan='Perfectionism-focused CBT. Values clarification. Boundaries in MBA culture. Behavioral activation.',
    concern='MBA program perfectionism spiral — working 16-hour days, unable to delegate, panic attacks before presentations, first time seeking help.',
    created_days_ago=48,
)

# ── Case 030: Ina Santos — YELLOW, Imposter syndrome → referred to psych ─────
c30 = mk_case(
    s_ina, p_jenny, 'YELLOW', 'ACTIVE',
    phq9=13, gad7=14,
    diagnoses=['F41.1 Generalized Anxiety Disorder', 'F32.0 Major Depressive Disorder, Mild'],
    treatment_plan='Cognitive restructuring for imposter syndrome. Schema work on achievement identity. Self-compassion training. Originally started with counselor Rose Tolentino; escalated to psychology due to PHQ-9 elevation and occupational impairment.',
    concern='Severe imposter syndrome in medical technology program causing paralysis during clinical practicum. Escalated from counseling to psychology services after initial assessment showed moderate depression.',
    created_days_ago=47,
)

# ── Case 031: Kaye Lim — YELLOW, Undiagnosed ADHD + anxiety ─────────────────
c31 = mk_case(
    s_kaye, c_csc, 'YELLOW', 'ACTIVE',
    phq9=8, gad7=13,
    diagnoses=['F90.9 Attention-Deficit/Hyperactivity Disorder, Unspecified (provisional)', 'F41.1 Generalized Anxiety Disorder'],
    treatment_plan='ADHD psychoeducation. Study skills and organizational scaffolding. Anxiety management. Referral to psychiatry for formal ADHD evaluation and possible medication.',
    concern='Long-standing academic struggles despite high intelligence. Difficulty sustaining attention, time blindness, emotional dysregulation, and significant anxiety around academic performance.',
    created_days_ago=42,
)

# ── Case 032: Gab Cruz — YELLOW, Complicated grief (sibling loss) ────────────
c32 = mk_case(
    s_gab, p_niko, 'YELLOW', 'ACTIVE',
    phq9=14, gad7=8,
    diagnoses=['F43.21 Prolonged Grief Disorder', 'F32.0 Major Depressive Disorder, Mild'],
    treatment_plan='Grief-focused therapy (Prolonged Grief Disorder protocol). Memory integration work. Meaning reconstruction. Monitor for depression escalation.',
    concern='Loss of younger sister in road accident 8 months ago. Complicated grief with guilt (survivor guilt, was driving), anniversary reactions approaching, academic withdrawal.',
    created_days_ago=45,
)

# ── Case 033: Pau Aguilar — YELLOW, Performance anxiety (nursing boards) ─────
c33 = mk_case(
    s_pau, c_chelly, 'YELLOW', 'ACTIVE',
    phq9=9, gad7=14,
    diagnoses=['F40.218 Specific Phobia, Other Type (Evaluation/Test Anxiety)', 'F41.1 Generalized Anxiety Disorder'],
    treatment_plan='CBT for test anxiety. Exposure to simulated exam scenarios. Relaxation techniques. Pre-exam coping plan. Mock NLE practice with anxiety monitoring.',
    concern='Severe test anxiety ahead of nursing licensure exam (NLE). Blanking during mock exams despite strong classroom performance. Anticipatory anxiety affecting study.',
    created_days_ago=38,
)

# ── Case 034: Mae Santos — GREEN, Freshmen adjustment (CLOSED success) ───────
c34 = mk_case(
    s_mae, c_rose_t, 'GREEN', 'CLOSED',
    phq9=5, gad7=6,
    diagnoses=['F43.20 Adjustment Disorder with Anxious Mood'],
    treatment_plan='Supportive counseling. Social skills building. Campus resource navigation.',
    concern='First-year adjustment difficulties — homesickness, difficulty making friends, academic transition anxiety.',
    created_days_ago=32,
    closed_at=H(5),
    closure_reason='Goals achieved. Student has successfully adjusted to university life. Discharge by mutual agreement.',
)

# ── Case 035: Eli Tan — GREEN, Relationship breakup ─────────────────────────
c35 = mk_case(
    s_eli, c_bia, 'GREEN', 'ACTIVE',
    phq9=7, gad7=5,
    diagnoses=['F43.20 Adjustment Disorder with Depressed Mood'],
    treatment_plan='Grief processing for relationship loss. Self-worth building. Social reconnection.',
    concern='3-year relationship ended 5 weeks ago. Low mood, social withdrawal, difficulty concentrating on coursework.',
    created_days_ago=28,
)

# ── Case 036: Cris Reyes — GREEN, Mild academic stress ──────────────────────
c36 = mk_case(
    s_cris, c_daye, 'GREEN', 'ACTIVE',
    phq9=6, gad7=7,
    diagnoses=['Z55.3 Underachievement in School'],
    treatment_plan='Study skills coaching. Stress inoculation. Time management.',
    concern='Feeling overwhelmed by second-year nursing coursework, study habits not adapting from high school.',
    created_days_ago=25,
)

# ── Case 037: Jan Navarro — GREEN, Career anxiety (senior year) ──────────────
c37 = mk_case(
    s_jan, c_csc, 'GREEN', 'ACTIVE',
    phq9=5, gad7=8,
    diagnoses=['F43.23 Adjustment Disorder with Mixed Anxiety and Depressed Mood'],
    treatment_plan='Career counseling integration. Anxiety management. Values and strengths clarification.',
    concern='Senior-year career anxiety — fear of not finding tech employment post-graduation, impostor feelings in industry applications.',
    created_days_ago=22,
)

# ── Case 038: Ara Ocampo — GREEN, Identity/coming out concerns ───────────────
c38 = mk_case(
    s_ara, p_csp, 'GREEN', 'ACTIVE',
    phq9=6, gad7=7,
    diagnoses=['F66 Psychological and Behavioural Disorders Associated with Sexual Development and Orientation'],
    treatment_plan='Affirmative therapy. Identity exploration. Family communication planning. Social support mapping.',
    concern='LGBTQ+ identity exploration and coming-out concerns. Fear of family and community rejection. Social anxiety in campus environments.',
    created_days_ago=20,
)

# ── Case 039: Josh Santos — GREEN, Family financial stress ───────────────────
c39 = mk_case(
    s_josh, c_chelly, 'GREEN', 'ACTIVE',
    phq9=7, gad7=6,
    diagnoses=['Z59.6 Low Income', 'F43.20 Adjustment Disorder with Anxious Mood'],
    treatment_plan='Stress management. Scholarship and financial aid navigation. Reframing financial stressors. Resilience building.',
    concern='Family breadwinner (father) lost job. Student carrying part-time work while maintaining full academic load. Financial anxiety affecting study.',
    created_days_ago=18,
)

# ── Case 040: Lia Flores — GREEN, Mild social anxiety ───────────────────────
c40 = mk_case(
    s_lia, c_rose_t, 'GREEN', 'ACTIVE',
    phq9=4, gad7=9,
    diagnoses=['F40.10 Social Anxiety Disorder (Social Phobia)'],
    treatment_plan='CBT for social anxiety. Graduated exposure to social situations. Architecture studio presentations as in-vivo exposure target.',
    concern='Social anxiety manifesting as extreme distress during architecture studio critiques and group presentations. Avoidance developing.',
    created_days_ago=16,
)

print(f"✅ Cases 021–040 seeded (current counter: {_case_counter[0]})\n")

# ══════════════════════════════════════════════════════════════════════════════
# APPOINTMENTS — WITH FULL RESCHEDULE CHAINS
# ══════════════════════════════════════════════════════════════════════════════

# ────────────────────────────────────────────────────────────────────────────
# Case 021: Marco Reyes — p_daryl — RED, crisis + active sessions
# ────────────────────────────────────────────────────────────────────────────
appt(s_marco, p_daryl, c21, H(62, 14), 'COMPLETED',
     notes='Initial assessment. PHQ-9=20. Disclosed passive SI — no plan or intent. Safety plan initiated.')
appt(s_marco, p_daryl, c21, H(55, 14), 'COMPLETED', session_type='CRISIS',
     notes='Crisis session — student sent distress message via portal. Hazing incident disclosed in detail. Safety plan reviewed and reinforced.')
appt(s_marco, p_daryl, c21, H(48, 14), 'COMPLETED',
     notes='Follow-up post-crisis. SI reduced. PTSD symptoms active — hypervigilance, nightmares. Trauma narrative begun.')
appt(s_marco, p_daryl, c21, H(41, 14), 'COMPLETED',
     notes='Trauma-focused CBT session 2. Processing hazing incident. Support network mapped.')
appt(s_marco, p_daryl, c21, H(34, 14), 'COMPLETED',
     notes='Grounding techniques introduced. PHQ-9 retake=16. Slight improvement. SI remains passive.')
appt(s_marco, p_daryl, c21, H(27, 14), 'COMPLETED',
     notes='Mother notified with student consent. Coordination with university health for psychiatric evaluation referral.')
appt(s_marco, p_daryl, c21, H(20, 14), 'COMPLETED',
     notes='Psychiatric evaluation feedback integrated. Medication started by psychiatrist. Mood improving.')
appt(s_marco, p_daryl, c21, H(13, 14), 'COMPLETED',
     notes='PHQ-9=12. Good response to medication. PTSD still active but less intrusive. Exposure hierarchy created.')
appt(s_marco, p_daryl, c21, F(5, 14), 'CONFIRMED',
     notes='Upcoming: review trauma exposure progress. Safety plan reassessment.')

# ────────────────────────────────────────────────────────────────────────────
# Case 022: Jasmine Torres — p_bon — RED, anorexia + depression
# ────────────────────────────────────────────────────────────────────────────
appt(s_jasmine, p_bon, c22, H(60, 11), 'COMPLETED',
     notes='Initial session. BMI 16.2. Denied restricting at first, then disclosed skipping all meals on clinical days.')
appt(s_jasmine, p_bon, c22, H(53, 11), 'COMPLETED',
     notes='CBT-E psychoeducation on eating disorder maintenance cycle. Body checking behaviors mapped.')
appt(s_jasmine, p_bon, c22, H(46, 11), 'COMPLETED',
     notes='Nutritionist coordination. Meal plan introduced. Student resistant but agreed to try.')
appt(s_jasmine, p_bon, c22, H(39, 11), 'NO_SHOW',
     no_show_reason='Student did not attend. No prior notice. Welfare check message sent.')
appt(s_jasmine, p_bon, c22, H(35, 11), 'COMPLETED',
     notes='Returned after no-show. Disclosed she had been too ashamed to attend. Body image work begun.')
appt(s_jasmine, p_bon, c22, H(28, 11), 'COMPLETED',
     notes='PHQ-9 retake=15 (from 19). Mood improving with nutritional recovery. BMI 17.0. Continue.')
appt(s_jasmine, p_bon, c22, H(21, 11), 'COMPLETED',
     notes='Explored connection between nursing identity and body control. Key schema insight session.')
appt(s_jasmine, p_bon, c22, H(14, 11), 'COMPLETED',
     notes='BMI 17.5. Mood 6/10. Less body checking. Peer relationships improving.')
appt(s_jasmine, p_bon, c22, H(7, 11), 'COMPLETED',
     notes='Progress review. Still some restriction but major improvement. PHQ-9=10.')
appt(s_jasmine, p_bon, c22, F(7, 11), 'CONFIRMED',
     notes='Upcoming: maintenance planning and relapse prevention.')

# ────────────────────────────────────────────────────────────────────────────
# Case 023: Ryan Santos — p_shel — RED, severe OCD
# ────────────────────────────────────────────────────────────────────────────
appt(s_ryan, p_shel, c23, H(55, 10), 'COMPLETED',
     notes='Initial ERP assessment. Y-BOCS=32 (severe). Primary obsession: contamination. Daily rituals=5.5 hours.')
appt(s_ryan, p_shel, c23, H(48, 10), 'COMPLETED',
     notes='ERP psychoeducation. Anxiety hierarchy constructed. Top feared: touching lab specimens bare-handed.')
appt(s_ryan, p_shel, c23, H(41, 10), 'COMPLETED',
     notes='ERP session 1. Touched door handles without washing. SUD peaked at 85, reduced to 40 in 30 min.')
appt(s_ryan, p_shel, c23, H(34, 10), 'COMPLETED',
     notes='ERP session 2. Touched lab coat without washing for 20 minutes. Progress noted.')
appt(s_ryan, p_shel, c23, H(27, 10), 'COMPLETED',
     notes='ERP session 3. Y-BOCS retake=24 (moderate-severe). Rituals now 3 hours/day. Lab requirement cleared.')
appt(s_ryan, p_shel, c23, H(20, 10), 'COMPLETED',
     notes='ERP progressing. Student completing lab requirements with reduced ritual use.')
appt(s_ryan, p_shel, c23, H(13, 10), 'COMPLETED',
     notes='Y-BOCS=18 (moderate). Rituals 1.5 hours/day. Still significant but functional.')
appt(s_ryan, p_shel, c23, F(3, 10), 'CONFIRMED',
     notes='Upcoming: ERP intensification — biohazard item hierarchy.')

# ────────────────────────────────────────────────────────────────────────────
# Case 024: Bea Cruz — p_chona — RED, Bipolar II
# ────────────────────────────────────────────────────────────────────────────
appt(s_bea, p_chona, c24, H(52, 13), 'COMPLETED',
     notes='Initial assessment. Recent hypomanic episode resolved — now in depressive phase. PHQ-9=17. Mood log started.')
appt(s_bea, p_chona, c24, H(45, 13), 'COMPLETED',
     notes='Bipolar psychoeducation. Mood regulation strategies. Sleep-wake cycle stabilization protocol introduced.')
appt(s_bea, p_chona, c24, H(38, 13), 'COMPLETED',
     notes='Coordination with psychiatrist confirmed. Lamotrigine started. Student monitoring side effects.')
appt(s_bea, p_chona, c24, H(31, 13), 'NO_SHOW',
     no_show_reason='Student message received 30 minutes before — "not feeling stable enough to leave dorm." Welfare check made. Student safe.')

# Reschedule after no-show: staff rescheduled within the week
_bea_orig_a4 = appt(s_bea, p_chona, c24, H(28, 13), 'CANCELLED',
    reschedule_reason='Session rescheduled by staff after student missed previous appointment due to depressive episode.',
    reschedule_requested_by=staff_id,
    reschedule_requested_at=H(31, 16),
    original_scheduled_time=H(31, 13))
_bea_a4b = appt(s_bea, p_chona, c24, H(25, 13), 'COMPLETED',
    rescheduled_from_id=_bea_orig_a4,
    notes='Rescheduled session. Student attended. Mood 4/10. Medication adjustments reviewed.')
db.appointments.update_one({'_id': _bea_orig_a4}, {'$set': {'rescheduled_to_id': _bea_a4b}})

appt(s_bea, p_chona, c24, H(18, 13), 'COMPLETED',
     notes='Mood 5/10. Sleep improving with medication. Less impulsivity. Academic advisor meeting attended.')
appt(s_bea, p_chona, c24, H(11, 13), 'COMPLETED',
     notes='PHQ-9=11 (from 17). Mood trending up. Safety plan updated. Recognizing hypomanic prodrome signs.')
appt(s_bea, p_chona, c24, F(7, 13), 'CONFIRMED',
     notes='Upcoming: mood pattern review and relapse prevention planning.')

# ────────────────────────────────────────────────────────────────────────────
# Case 025: Andre Villanueva — p_niko — RED, 3 NO_SHOWS → CLOSED
# ────────────────────────────────────────────────────────────────────────────
appt(s_andre, p_niko, c25, H(70, 14), 'NO_SHOW',
     no_show_reason='Student did not attend intake session. No contact. SMS and email sent.')
appt(s_andre, p_niko, c25, H(57, 14), 'NO_SHOW',
     no_show_reason='Second missed session. Phone call attempted twice — no answer. Home visit request submitted to case manager.')
appt(s_andre, p_niko, c25, H(44, 14), 'NO_SHOW',
     no_show_reason='Third consecutive missed session. Case manager was unable to make contact. Case termination protocol initiated per CPS guidelines.')

db.missed_appointment_tracker.insert_one({
    'case_id': c25, 'student_id': s_andre,
    'consecutive_no_shows': 3, 'total_no_shows': 3,
    'no_show_dates': [ymd(H(70)), ymd(H(57)), ymd(H(44))],
    'last_no_show': H(44), 'auto_closed': True,
    'closed_at': H(37), 'closed_by': cm_id,
    'closure_note': 'Three consecutive missed appointments per CPS protocol. Student emailed at registered address. Case available for re-referral upon student request.',
    'updated_at': H(37),
})
db.cases.update_one({'_id': c25}, {'$set': {
    'status': 'CLOSED', 'closed_at': H(37),
    'closure_reason': 'Case closed per CPS protocol: 3 consecutive missed appointments. Student not responsive to outreach.',
}})

# ────────────────────────────────────────────────────────────────────────────
# Case 026: Trisha Morales — c_chelly — YELLOW, triple reschedule chain
# ────────────────────────────────────────────────────────────────────────────
# Cycle 1: Student requests reschedule (midterm conflict)
_tr_a1_orig = appt(s_trisha, c_chelly, c26, H(50, 10), 'CANCELLED',
    reschedule_reason='Student has conflicting midterm examination schedule for the Architecture board.',
    reschedule_requested_by=s_trisha,
    reschedule_requested_at=H(52, 19),
    original_scheduled_time=H(50, 10))
_tr_a1_new = appt(s_trisha, c_chelly, c26, H(45, 10), 'COMPLETED',
    rescheduled_from_id=_tr_a1_orig,
    notes='Rescheduled initial session. CBT-I introduced. Sleep diary assigned.')
db.appointments.update_one({'_id': _tr_a1_orig}, {'$set': {'rescheduled_to_id': _tr_a1_new}})

# Cycle 2: Counselor requests reschedule (emergency duty)
_tr_a2_orig = appt(s_trisha, c_chelly, c26, H(38, 10), 'CANCELLED',
    reschedule_reason='Counselor has emergency clinic duty conflict. Apologize for inconvenience.',
    reschedule_requested_by=c_chelly,
    reschedule_requested_at=H(40, 16),
    proposed_new_time=H(35, 10),
    proposed_by=c_chelly,
    original_scheduled_time=H(38, 10))
_tr_a2_new = appt(s_trisha, c_chelly, c26, H(35, 10), 'COMPLETED',
    rescheduled_from_id=_tr_a2_orig,
    notes='CBT-I session 2. Sleep compression protocol started. Trisha averaging 5 hours now — up from 3.5.')
db.appointments.update_one({'_id': _tr_a2_orig}, {'$set': {'rescheduled_to_id': _tr_a2_new}})

# Regular completed sessions
appt(s_trisha, c_chelly, c26, H(28, 10), 'COMPLETED',
     notes='Sleep efficiency improving (72% → 81%). Depressive symptoms lightening. Continues studio deadlines management.')
appt(s_trisha, c_chelly, c26, H(21, 10), 'COMPLETED',
     notes='Sleep now 6+ hours. Mood 6/10. PHQ-9 retake=7. Consider stepping down to biweekly sessions.')

# Current pending reschedule: student requested again (thesis deadline)
appt(s_trisha, c_chelly, c26, H(7, 10), 'RESCHEDULE_REQUESTED',
    reschedule_reason='Student has thesis manuscript submission deadline — same day as session. Requests to move by 2 days.',
    reschedule_requested_by=s_trisha,
    reschedule_requested_at=H(9, 20),
    original_scheduled_time=H(7, 10))

# ────────────────────────────────────────────────────────────────────────────
# Case 027: JC Reyes — c_daye — YELLOW, NO_SHOW → reschedule → current pending
# ────────────────────────────────────────────────────────────────────────────
# First appointment: no-show (student forgot)
_jc_a1 = appt(s_jc, c_daye, c27, H(48, 9), 'NO_SHOW',
    no_show_reason='Student forgot the appointment. Texted apology same day and provided medical certificate for a fever that week.')

# Rescheduled after no-show
_jc_a1b = appt(s_jc, c_daye, c27, H(42, 9), 'COMPLETED',
    rescheduled_from_id=_jc_a1,
    notes='Rescheduled session after no-show. GAD assessment completed — GAD-7=15. Worry time technique introduced.')
db.appointments.update_one({'_id': _jc_a1}, {'$set': {
    'rescheduled_to_id': _jc_a1b,
    'reschedule_reason': 'No-show — student provided medical excuse. Session rescheduled by mutual agreement.',
    'reschedule_requested_by': s_jc,
    'reschedule_requested_at': H(47, 14),
}})

appt(s_jc, c_daye, c27, H(35, 9), 'COMPLETED',
     notes='Somatic symptoms (GI) medically cleared. Psychoeducation on mind-body connection in anxiety. Relaxation protocol started.')
appt(s_jc, c_daye, c27, H(28, 9), 'COMPLETED',
     notes='GAD-7 retake=11. Worry postponement working well. CPA board study schedule restructured with counselor.')
appt(s_jc, c_daye, c27, H(21, 9), 'COMPLETED',
     notes='Mock board exam performance improved. GI symptoms significantly reduced. Mood 7/10.')

# Current: counselor proposed reschedule, waiting for student approval
_jc_a5 = appt(s_jc, c_daye, c27, H(7, 9), 'PENDING_STUDENT_APPROVAL',
    reschedule_reason='Counselor is attending a required CPS training seminar on session date.',
    reschedule_requested_by=c_daye,
    reschedule_requested_at=H(10, 15),
    proposed_new_time=F(3, 9),
    proposed_by=c_daye,
    original_scheduled_time=H(7, 9))

# ────────────────────────────────────────────────────────────────────────────
# Case 028: Hannah Dela Cruz — p_daryl — YELLOW, 2 no-shows → warning
# ────────────────────────────────────────────────────────────────────────────
appt(s_hannah, p_daryl, c28, H(55, 11), 'COMPLETED',
     notes='Initial trauma assessment. Presented with emotional numbing post-immersion. PTSD Checklist (PCL-5)=38.')
appt(s_hannah, p_daryl, c28, H(48, 11), 'COMPLETED',
     notes='Vicarious trauma psychoeducation. Compassion fatigue introduced as framework. Self-care planning.')
appt(s_hannah, p_daryl, c28, H(41, 11), 'NO_SHOW',
     no_show_reason='No contact prior to session. After-session welfare check: student says she could not bring herself to leave campus. Warning note added to case.')
appt(s_hannah, p_daryl, c28, H(34, 11), 'NO_SHOW',
     no_show_reason='Second consecutive no-show. Student texted 2 hours after: "Sorry I just can\'t right now." Counselor responded with supportive outreach. Case manager notified.')

db.missed_appointment_tracker.insert_one({
    'case_id': c28, 'student_id': s_hannah,
    'consecutive_no_shows': 2, 'total_no_shows': 2,
    'no_show_dates': [ymd(H(41)), ymd(H(34))],
    'last_no_show': H(34), 'auto_closed': False,
    'warning_issued': True, 'warning_issued_at': H(33),
    'warning_message': 'Second consecutive missed appointment. One more missed appointment will result in case closure per CPS protocol. Supportive outreach made.',
    'updated_at': H(33),
})

# Student responded to outreach and returned
appt(s_hannah, p_daryl, c28, H(25, 11), 'COMPLETED',
     notes='Returned after 2 no-shows. Student tearful but engaged. Avoidance of therapy normalized as trauma response. Agreed to continue. Consecutive no-show count reset.')
appt(s_hannah, p_daryl, c28, H(18, 11), 'COMPLETED',
     notes='PCL-5 retake=28. Avoidance decreasing. Processing beginning. Academic accommodations letter provided.')
appt(s_hannah, p_daryl, c28, F(5, 11), 'CONFIRMED',
     notes='Upcoming: trauma narrative session 1.')

# ────────────────────────────────────────────────────────────────────────────
# Case 029: Migs Fernandez — c_bia — YELLOW, MBA burnout arc
# ────────────────────────────────────────────────────────────────────────────
appt(s_migs, c_bia, c29, H(45, 13), 'COMPLETED',
     notes='MBA perfectionism assessment. GAD-7=12, PHQ-9=10. Works 16h/day. First time seeking help — "breaking point."')
appt(s_migs, c_bia, c29, H(38, 13), 'COMPLETED',
     notes='Values clarification exercise. Discovered core driver is fear of failure, not genuine passion for excellence.')
appt(s_migs, c_bia, c29, H(31, 13), 'COMPLETED',
     notes='Delegation exercise. Assigned 1 task/week to delegate to team. Catastrophizing challenges about outcomes.')

# Reschedule: student had a client presentation (legitimate conflict)
_migs_a4_orig = appt(s_migs, c_bia, c29, H(24, 13), 'CANCELLED',
    reschedule_reason='Student has a high-stakes MBA case presentation that cannot be moved — agreed on rescheduling during session.',
    reschedule_requested_by=s_migs,
    reschedule_requested_at=H(26, 10),
    proposed_new_time=H(21, 13),
    proposed_by=c_bia,
    original_scheduled_time=H(24, 13))
_migs_a4_new = appt(s_migs, c_bia, c29, H(21, 13), 'COMPLETED',
    rescheduled_from_id=_migs_a4_orig,
    notes='Rescheduled. Presentation went well. First time Migs reported authentic pride rather than relief from not failing.')
db.appointments.update_one({'_id': _migs_a4_orig}, {'$set': {'rescheduled_to_id': _migs_a4_new}})

appt(s_migs, c_bia, c29, H(14, 13), 'COMPLETED',
     notes='GAD-7=7 (from 12). Panic attacks ceased. Boundaries set in 2 group projects. Sleep improving.')
appt(s_migs, c_bia, c29, H(7, 13), 'COMPLETED',
     notes='PHQ-9=5. Values-based action plan for career post-MBA. Begin closure planning for next month.')
appt(s_migs, c_bia, c29, F(10, 13), 'CONFIRMED',
     notes='Upcoming: relapse prevention and formal closure session.')

# ────────────────────────────────────────────────────────────────────────────
# Case 030: Ina Santos — started c_rose_t → referred to p_jenny
# ────────────────────────────────────────────────────────────────────────────
# Initial 2 counseling sessions with Rose Tolentino
appt(s_ina, c_rose_t, c30, H(44, 10), 'COMPLETED',
     notes='Initial counseling session. Imposter syndrome presentation. PHQ-9=13, GAD-7=14. CBT referral frame set.')
appt(s_ina, c_rose_t, c30, H(37, 10), 'COMPLETED',
     notes='Session 2. Anxiety worsening during practicum. PHQ-9 elevated — clinically significant depression now present. Referral to psychologist indicated.')

# Referral appointment
appt(s_ina, c_rose_t, c30, H(35, 10), 'REFERRAL',
     notes='Referral session: Counselor Rose Tolentino formally refers Ina Santos to Psychology Services (Jenny Soriano) due to PHQ-9 elevation (13) and functional impairment in clinical practicum exceeding scope of counseling. Warm handoff completed.')

# New sessions with psychologist p_jenny
appt(s_ina, p_jenny, c30, H(28, 10), 'COMPLETED',
     notes='First psych session post-referral. Background reviewed. Schema mode assessment. Core belief: "I will be exposed as incompetent."')
appt(s_ina, p_jenny, c30, H(21, 10), 'COMPLETED',
     notes='Schema work session. Historical evidence log for "competence" constructed. PHQ-9 retake=10.')
appt(s_ina, p_jenny, c30, H(14, 10), 'COMPLETED',
     notes='Practicum performance improving. Supervisor gave positive feedback. Student unable to internalize it — continued work needed.')
appt(s_ina, p_jenny, c30, H(7, 10), 'COMPLETED',
     notes='PHQ-9=7. GAD-7=9. Significant improvement. Imposter thoughts present but less controlling. Proud moment: led a procedure successfully.')
appt(s_ina, p_jenny, c30, F(7, 10), 'CONFIRMED',
     notes='Upcoming: consolidation session and tapering discussion.')

# ────────────────────────────────────────────────────────────────────────────
# Case 031: Kaye Lim — c_csc — YELLOW, ADHD + anxiety
# ────────────────────────────────────────────────────────────────────────────
appt(s_kaye, c_csc, c31, H(40, 9), 'COMPLETED',
     notes='Initial assessment. ADHD Adult Rating Scale elevated. Time blindness, task initiation problems, emotional dysregulation reported since childhood.')
appt(s_kaye, c_csc, c31, H(33, 9), 'COMPLETED',
     notes='ADHD psychoeducation — life-changing for student. "I thought I was just lazy." External scaffolding systems introduced.')
appt(s_kaye, c_csc, c31, H(26, 9), 'COMPLETED',
     notes='Study skills restructuring. Pomodoro technique adapted for ADHD profile. Planner system introduced.')
appt(s_kaye, c_csc, c31, H(19, 9), 'COMPLETED',
     notes='GAD-7=9 (from 13). Anxiety reducing as ADHD strategies take hold. Referral letter to psychiatry for formal evaluation written.')
appt(s_kaye, c_csc, c31, H(12, 9), 'COMPLETED',
     notes='Psychiatric evaluation scheduled. Emotional regulation strategies introduced (TIPP from DBT). Student engaged and hopeful.')
appt(s_kaye, c_csc, c31, F(5, 9), 'CONFIRMED',
     notes='Upcoming: feedback integration from psychiatric evaluation.')

# ────────────────────────────────────────────────────────────────────────────
# Case 032: Gab Cruz — p_niko — YELLOW, complicated grief
# ────────────────────────────────────────────────────────────────────────────
appt(s_gab, p_niko, c32, H(42, 10), 'COMPLETED',
     notes='Initial grief assessment. Loss of sister 8 months ago in road accident. Gab was driving. Survivor guilt prominent. PHQ-9=14.')
appt(s_gab, p_niko, c32, H(35, 10), 'COMPLETED',
     notes='Complicated grief protocol introduced. Distinguishing grief from guilt. Memory sharing — first session Gab described sister positively without immediately self-blaming.')
appt(s_gab, p_niko, c32, H(28, 10), 'COMPLETED',
     notes='Guilt-focused CBT. "Responsibility pie chart" exercise. Gab assigned 35% responsibility (down from 100%).')

# Reschedule: anniversary reaction week
_gab_a4_orig = appt(s_gab, p_niko, c32, H(21, 10), 'CANCELLED',
    reschedule_reason='Student reached out — this week is the anniversary of the accident. Requests to move session to earlier in the week when they feel less overwhelmed.',
    reschedule_requested_by=s_gab,
    reschedule_requested_at=H(23, 8),
    proposed_new_time=H(22, 10),
    proposed_by=p_niko,
    original_scheduled_time=H(21, 10))
_gab_a4_new = appt(s_gab, p_niko, c32, H(22, 10), 'COMPLETED',
    rescheduled_from_id=_gab_a4_orig,
    notes='Rescheduled anniversary session. Most emotionally intense session to date. Gab visited sister\'s grave for first time. Meaning-making work begun.')
db.appointments.update_one({'_id': _gab_a4_orig}, {'$set': {'rescheduled_to_id': _gab_a4_new}})

appt(s_gab, p_niko, c32, H(14, 10), 'COMPLETED',
     notes='Post-anniversary processing. PHQ-9=9 (from 14). Significant shift — grief integrating rather than festering.')
appt(s_gab, p_niko, c32, H(7, 10), 'COMPLETED',
     notes='Legacy project introduced: scrapbook in memory of sister. Academic engagement returning.')
appt(s_gab, p_niko, c32, F(7, 10), 'CONFIRMED',
     notes='Upcoming: meaning reconstruction and academic reintegration planning.')

# ────────────────────────────────────────────────────────────────────────────
# Case 033: Pau Aguilar — c_chelly — YELLOW, NLE performance anxiety
# ────────────────────────────────────────────────────────────────────────────
appt(s_pau, c_chelly, c33, H(35, 14), 'COMPLETED',
     notes='Initial assessment. GAD-7=14. Blanking on mock NLE despite strong classroom grades. Anxiety symptoms during simulation exams.')
appt(s_pau, c_chelly, c33, H(28, 14), 'COMPLETED',
     notes='CBT for test anxiety. Physiological arousal explanation. Controlled breathing introduced for pre-exam use.')
appt(s_pau, c_chelly, c33, H(21, 14), 'COMPLETED',
     notes='Simulated mock NLE in session with anxiety monitoring. SUD peaked at 78. Grounding used in-session.')

# Reschedule: student had a review center exam
_pau_a4_orig = appt(s_pau, c_chelly, c33, H(14, 14), 'CANCELLED',
    reschedule_reason='Student has mandatory review center examination that overlaps with session. Counselor approved rescheduling.',
    reschedule_requested_by=s_pau,
    reschedule_requested_at=H(16, 9),
    proposed_new_time=H(12, 14),
    proposed_by=c_chelly,
    original_scheduled_time=H(14, 14))
_pau_a4_new = appt(s_pau, c_chelly, c33, H(12, 14), 'COMPLETED',
    rescheduled_from_id=_pau_a4_orig,
    notes='Rescheduled. Review center exam performance improved — passed two sections. Confidence building. GAD-7=9.')
db.appointments.update_one({'_id': _pau_a4_orig}, {'$set': {'rescheduled_to_id': _pau_a4_new}})

appt(s_pau, c_chelly, c33, H(5, 14), 'COMPLETED',
     notes='Confidence visualization for NLE day. Coping card created. Test anxiety significantly reduced.')
appt(s_pau, c_chelly, c33, F(9, 14), 'CONFIRMED',
     notes='Upcoming: final pre-NLE session and celebration of progress.')

# ────────────────────────────────────────────────────────────────────────────
# Case 034: Mae Santos — c_rose_t — GREEN, freshmen adjustment (CLOSED)
# ────────────────────────────────────────────────────────────────────────────
appt(s_mae, c_rose_t, c34, H(30, 9), 'COMPLETED',
     notes='Initial session. Homesickness and academic transition difficulties. PHQ-9=5, GAD-7=6. Supportive approach.')
appt(s_mae, c_rose_t, c34, H(23, 9), 'COMPLETED',
     notes='Made 2 friends from block. Joined engineering organization. Mood 7/10. Goals mostly achieved.')
appt(s_mae, c_rose_t, c34, H(16, 9), 'COMPLETED',
     notes='PHQ-9=2. Fully adjusted. Closure planned. Student confident moving forward independently.')

# ────────────────────────────────────────────────────────────────────────────
# Case 035: Eli Tan — c_bia — GREEN, relationship breakup
# ────────────────────────────────────────────────────────────────────────────
appt(s_eli, c_bia, c35, H(25, 11), 'COMPLETED',
     notes='Relationship loss processing. PHQ-9=7. Student articulate about feelings. Supportive counseling begun.')
appt(s_eli, c_bia, c35, H(18, 11), 'COMPLETED',
     notes='Reconnecting with identity outside relationship. Sports and music interests rediscovered. Mood improving.')
appt(s_eli, c_bia, c35, H(11, 11), 'COMPLETED',
     notes='PHQ-9=3. Student feeling more like themselves. Social life re-emerging. Tapering to closure.')
appt(s_eli, c_bia, c35, F(4, 11), 'CONFIRMED',
     notes='Upcoming: final closure session.')

# ────────────────────────────────────────────────────────────────────────────
# Case 036: Cris Reyes — c_daye — GREEN, mild academic stress
# ────────────────────────────────────────────────────────────────────────────
appt(s_cris, c_daye, c36, H(22, 9), 'COMPLETED',
     notes='Study habits and academic transition difficulties. Study skills assessment. Time management strategies introduced.')
appt(s_cris, c_daye, c36, H(15, 9), 'COMPLETED',
     notes='Pomodoro and Cornell note method introduced. First quiz after session: improved. Mood 7/10.')
appt(s_cris, c_daye, c36, F(6, 9), 'CONFIRMED',
     notes='Upcoming: progress review and possible closure.')

# ────────────────────────────────────────────────────────────────────────────
# Case 037: Jan Navarro — c_csc — GREEN, senior career anxiety
# ────────────────────────────────────────────────────────────────────────────
appt(s_jan, c_csc, c37, H(20, 10), 'COMPLETED',
     notes='Career anxiety in final year. GAD-7=8. Strengths inventory completed. Catastrophizing about job market.')
appt(s_jan, c_csc, c37, H(13, 10), 'COMPLETED',
     notes='Job application support. Portfolio review suggested. First tech application submitted this week.')
appt(s_jan, c_csc, c37, H(6, 10), 'COMPLETED',
     notes='Received first interview invitation. Anxiety shifted to excitement. Resume polished. Mock interview scheduled.')
appt(s_jan, c_csc, c37, F(8, 10), 'CONFIRMED',
     notes='Upcoming: post-interview debrief and further career planning.')

# ────────────────────────────────────────────────────────────────────────────
# Case 038: Ara Ocampo — p_csp — GREEN, identity/coming out
# ────────────────────────────────────────────────────────────────────────────
appt(s_ara, p_csp, c38, H(18, 13), 'COMPLETED',
     notes='Affirmative initial session. LGBTQ+ identity concerns. PHQ-9=6. Safe space established. No self-harm risk. Exploration begun.')
appt(s_ara, p_csp, c38, H(11, 13), 'COMPLETED',
     notes='Identity timeline activity. Values clarification around authenticity. Coming-out readiness assessment. Not yet ready — okay.')
appt(s_ara, p_csp, c38, F(3, 13), 'CONFIRMED',
     notes='Upcoming: family communication planning and social support mapping.')

# ────────────────────────────────────────────────────────────────────────────
# Case 039: Josh Santos — c_chelly — GREEN, family financial stress
# ────────────────────────────────────────────────────────────────────────────
appt(s_josh, c_chelly, c39, H(16, 11), 'COMPLETED',
     notes='Financial stress assessment. Father job loss context. Working 20h/week on top of full academic load. PHQ-9=7, GAD-7=6.')
appt(s_josh, c_chelly, c39, H(9, 11), 'COMPLETED',
     notes='Stress management strategies. Scholarship application assistance navigation with registrar. Resilience reframe — Josh has been managing exceptionally.')
appt(s_josh, c_chelly, c39, F(5, 11), 'CONFIRMED',
     notes='Upcoming: check-in on scholarship application and stress levels.')

# ────────────────────────────────────────────────────────────────────────────
# Case 040: Lia Flores — c_rose_t — GREEN, mild social anxiety
# ────────────────────────────────────────────────────────────────────────────
appt(s_lia, c_rose_t, c40, H(14, 10), 'COMPLETED',
     notes='Social anxiety assessment. Fear of negative evaluation in studio critiques. GAD-7=9. Avoidance behaviors mapped.')
appt(s_lia, c_rose_t, c40, H(7, 10), 'COMPLETED',
     notes='Cognitive restructuring for performance fears. Behavioral experiment: asked one question in class. Went fine. Mood 6/10.')
appt(s_lia, c_rose_t, c40, F(7, 10), 'CONFIRMED',
     notes='Upcoming: graduated exposure — participate in one studio critique this week.')

print("✅ All appointments seeded (80+ with full reschedule chains)\n")

# ══════════════════════════════════════════════════════════════════════════════
# SESSION NOTES
# ══════════════════════════════════════════════════════════════════════════════

# Marco Reyes — RED, severe MDD + PTSD
soap(c21, p_daryl, H(62, 14),
    "Marco discloses sustained low mood, inability to concentrate, and recurring nightmares about the hazing incident. Reports passive SI: 'I sometimes think it would be easier not to be here,' but denies any plan.",
    "Client appeared disheveled, avoided eye contact initially. Slumped posture. Voice flat. PHQ-9=20 (severe). GAD-7=14.",
    "Severe MDD (F32.2) with passive SI and PTSD (F43.1) stemming from fraternity hazing. Functional impairment: academic, social. Risk: HIGH — safety plan required.",
    "Initiate safety plan today. Schedule crisis contact check-in within 48 hours. Consult p_daryl supervisor. Refer for psychiatric evaluation. Do not leave session without signed safety plan.",
    3, risk=True)
soap(c21, p_daryl, H(55, 14),
    "Marco reached out via portal: 'I can\'t stop seeing what they did.' Crisis session requested. Hazing details disclosed in full — severe physical and psychological abuse over 2 weeks.",
    "Crisis presentation. Hypervigilant. Trauma dissociation episode at start of session, grounded using 5-4-3-2-1. Safety plan reviewed and reaffirmed.",
    "PTSD acute phase. Trauma fully disclosed for first time. Risk temporarily elevated during disclosure — contained. Safety plan active. Risk: MODERATE after session.",
    "Daily check-in for 3 days. Mother notified with consent. University Health coordination for psychiatry referral within 7 days. Trauma narrative begins next session.",
    3, risk=True, session_type='CRISIS')
soap(c21, p_daryl, H(48, 14),
    "SI thoughts decreased from daily to 2–3 times/week. Still having nightmares 4–5 nights/week. Safety plan card carried in wallet.",
    "Less hypervigilant than crisis session. Maintained eye contact. Safety plan visible in phone notes. Mood 4/10.",
    "Stabilizing post-crisis. PTSD active but manageable. PHQ-9=17 (down from 20). Safety plan functioning.",
    "Begin trauma narrative structured exercise. Coordinate with psychiatrist re: SSRI. Continue weekly sessions.",
    4, risk=True)
soap(c21, p_daryl, H(13, 14),
    "PHQ-9=12. Nightmares now 2 nights/week. Returning to regular class attendance. SI absent for 3 weeks.",
    "Client engaged, made eye contact throughout. Some humor returned — described a positive moment with friends. Mood 6/10.",
    "Significant improvement in depression and PTSD symptoms. Medication response positive. Functional recovery occurring.",
    "Continue trauma-focused CBT. Begin gradual social reintegration. PHQ-9 and safety plan reassessment next session.",
    6)

# Jasmine Torres — RED, eating disorder + depression
soap(c22, p_bon, H(60, 11),
    "Jasmine initially denied any eating concerns, then disclosed skipping all meals on clinical rotation days 'because I feel disgusting in the uniform.'",
    "Client appeared guarded. BMI 16.2 flagged by university nurse. Denied purging. Body checking confirmed.",
    "Anorexia Nervosa, Restricting Type (F50.01). PHQ-9=19 — severe depression concurrent. Medical stabilization priority.",
    "Nutritionist referral today. Medical monitoring weekly (vitals + BMI). Safety plan for medical crisis. CBT-E psychoeducation next session.",
    3, risk=True)
soap(c22, p_bon, H(28, 11),
    "Jasmine following meal plan 70% of the time. BMI now 17.0. Mood improved since last session — 'I slept 7 hours last night for the first time in months.'",
    "Less guarded. More eye contact. Posture slightly more open. Body checking discussion less defensive.",
    "Early nutritional recovery correlating with mood improvement. PHQ-9=15. Anorexia responding to CBT-E.",
    "Continue CBT-E phase 2: addressing dietary rules. Introduce mirror exposure at level 1 (face only).",
    5)
soap(c22, p_bon, H(7, 11),
    "Jasmine reports she ate lunch with her clinical groupmates this week. 'First time I ate in front of them.' BMI 17.5.",
    "Client visibly lighter emotionally. Smiled several times. PHQ-9=10.",
    "Major behavioral progress: social eating achieved. Dietary rules softening. Recovery trajectory clear.",
    "Transition to relapse prevention phase in 2–3 sessions. Address weight restoration goals and body image schema.",
    7)

# Ryan Santos — RED, OCD
soap(c23, p_shel, H(55, 10),
    "Ryan describes rituals consuming his entire mornings — cannot leave the house until he has washed hands 30+ times. Y-BOCS=32. Failing lab attendance requirement.",
    "Client appeared exhausted. Hands visibly reddened from washing. Ashamed to share initially.",
    "Severe OCD (F42.2) with contamination obsessions. Y-BOCS=32 — severe. Academic functional impairment at critical level.",
    "ERP psychoeducation today. Build anxiety hierarchy. No avoidance encouragement. Lab accommodation letter to registrar.",
    3)
soap(c23, p_shel, H(27, 10),
    "Ryan completed 3 of 5 assigned ERP tasks. Reports peak SUD of 78 but tolerance developing. Ritual time now 3 hours/day (down from 5.5).",
    "Client appeared more energized. Pride visible when describing successful ERP completion. Y-BOCS retake=24.",
    "OCD responding to ERP. Significant reduction in ritual time. Functional improvement — lab requirements now met.",
    "ERP session 3 targeting higher hierarchy items. Continue ritual prevention protocols.",
    6)

# Bea Cruz — RED, Bipolar II
soap(c24, p_chona, H(52, 13),
    "Bea presents in depressive phase following what she describes as 'two weeks of feeling invincible' (hypomanic episode now resolved). Academic misconduct incident during hypomanic phase — still being adjudicated.",
    "Client appeared low-energy, slowed speech. PHQ-9=17. Insightful about mood pattern when depressed.",
    "Bipolar II (F31.81) confirmed. Depressive phase active. GAD-7=11. Academic and legal stressors compounding.",
    "Immediate mood log implementation. Referral to Dr. [Psychiatry] for medication evaluation. Sleep stabilization protocol. Psychoeducation on bipolar cycle.",
    3, risk=True)
soap(c24, p_chona, H(11, 13),
    "Bea reports recognizing 3 early warning signs of hypomania this month and successfully used the intervention plan. No episode. Sleep averaged 7.5 hours.",
    "Client significantly more energized and engaged vs. initial sessions. PHQ-9=11. Humor present.",
    "Bipolar management skills developing well. Safety plan updated. Medication compliance maintained.",
    "Relapse prevention focus. Map seasonal patterns. Prepare for law school exam season stress.",
    7)

# Trisha Morales — YELLOW, insomnia + depression
soap(c26, c_chelly, H(45, 10),
    "Trisha averaging 3.5 hours of sleep per night for 4 months. Studio deadlines extend past midnight daily. Reports crying 'for no reason' most evenings. PHQ-9=11.",
    "Client appeared fatigued — dark circles, slightly slurred speech. Nodded off briefly during psychoeducation. Engaged once talking.",
    "Insomnia Disorder (G47.00) with secondary depressive features (F32.0). Architecture studio schedule as primary stressor.",
    "CBT-I week 1: Sleep diary assigned. Sleep restriction protocol introduced. No naps during day.",
    4)
soap(c26, c_chelly, H(28, 10),
    "Following sleep compression protocol — now averaging 5.5 hours but with higher sleep efficiency. 'I actually feel more rested at 5 hours than I did at 3 fragmented.'",
    "Client more alert than any previous session. Less prominent dark circles. Mood 5/10.",
    "CBT-I working. Sleep efficiency improving. Depressive symptoms correlating with sleep improvement.",
    "Sleep window expansion begins. PHQ-9 reassessment next session. Studio schedule restructuring discussed.",
    5)
soap(c26, c_chelly, H(21, 10),
    "PHQ-9=7 (from 11). Sleep now 6–6.5 hours regularly. Crying episodes stopped. Feeling 'functional' for the first time in months.",
    "Client visibly healthier. Good eye contact. Appropriate affect. Mentioned reconnecting with her design passion.",
    "CBT-I substantially successful. Depressive symptoms in mild range. Sleep pattern normalized.",
    "Consolidate CBT-I gains. Consider stepping down to biweekly sessions. Relapse prevention plan for studio crunch periods.",
    7)

# JC Reyes — YELLOW, GAD + somatic
soap(c27, c_daye, H(42, 9),
    "JC describes constant 'background hum of worry' about the CPA board exams, family expectations, and finances. GI symptoms (bloating, nausea) — medically cleared 2 weeks ago. GAD-7=15.",
    "Client physically tense — shoulders hunched, leg bouncing. Speaks quickly. PHQ-9=9.",
    "GAD (F41.1) with somatic expression (F45.1). Academic-pressure context. Medical causes ruled out.",
    "Worry postponement technique introduced. Somatic grounding protocol assigned daily. Worry diary started.",
    5)
soap(c27, c_daye, H(28, 9),
    "JC used worry postponement consistently — 'It actually works, I just push it to 6 PM and by then it seems less urgent.' GI symptoms 70% improved.",
    "Client noticeably less tense. Leg not bouncing during session. GAD-7 retake=11.",
    "Significant GAD improvement. Somatization reducing as anxiety better regulated. CPA board study on track.",
    "Introduce acceptance-based strategies for residual worry. CPA study schedule coaching.",
    7)

# Hannah Dela Cruz — YELLOW, vicarious trauma
soap(c28, p_daryl, H(55, 11),
    "Hannah describes being unable to stop seeing the faces of children she met during immersion. 'I just keep thinking what kind of country lets children live like that.' Intrusive imagery almost daily.",
    "Client appeared emotionally numb — flat affect, slow responses. PCL-5=38. No SI.",
    "Vicarious trauma / PTSD (F43.10) from immersion practicum. Emotional numbing dominant. PHQ-9=12.",
    "Vicarious trauma psychoeducation. Compassion fatigue framework. Self-care protocol. Academic accommodations letter.",
    4)
soap(c28, p_daryl, H(25, 11),
    "Hannah returned after 2 missed sessions. Says she 'couldn't make herself come.' Understands now that avoidance was part of the trauma response, not weakness.",
    "Client tearful initially, then engaged. More affect present than before. Expressed relief at returning.",
    "Avoidance response understood and normalized. PCL-5 retake=28. Therapeutic alliance maintained despite no-shows. Good prognosis.",
    "Continue trauma processing. Address academic backlog with coordinator. Weekly check-in scheduled.",
    5)

# Migs Fernandez — YELLOW, MBA burnout
soap(c29, c_bia, H(45, 13),
    "Migs describes working 16-hour days, reviewing MBA materials at 2 AM, and being unable to trust teammates. 'If I don\'t do it myself, it won\'t be done right.' First panic attack last week during a pitch.",
    "Client appeared exhausted but articulate. Perfectionism defenses high. PHQ-9=10, GAD-7=12.",
    "Perfectionism-driven burnout (Z73.0) with GAD features. MBA culture reinforcing maladaptive coping. Panic attacks emerging.",
    "Values clarification exercise. Identify cost of perfectionism schema. Behavioral experiment: delegate one task this week.",
    5)
soap(c29, c_bia, H(7, 13),
    "Migs passed a major project to a teammate for the first time. Team delivered well. 'It was actually better in some ways because I wasn't obsessing over every word.' PHQ-9=5, GAD-7=7.",
    "Client relaxed — first session without leg bouncing or checking phone. Authentic positive affect.",
    "Major progress. Perfectionism schema challenged by behavioral evidence. Burnout recovery well advanced.",
    "Closure planning for next session. Maintenance plan — early warning signs and self-care protocols.",
    8)

# Ina Santos — YELLOW, imposter syndrome (psych sessions)
soap(c30, p_jenny, H(28, 10),
    "Ina describes freezing during a routine blood extraction in clinical practicum — 'My hands stopped working because I kept thinking everyone was watching me fail.' PHQ-9=13, GAD-7=14.",
    "Client visibly anxious in session. Fidgets with sleeve. Bright student — detailed self-awareness about imposter pattern.",
    "Imposter syndrome with moderate depression and GAD. Schema: 'I will be exposed as incompetent.' Referral from counselor appropriate given PHQ-9 level.",
    "Schema mapping. Begin historical evidence log for competence. Cognitive restructuring of imposter beliefs.",
    4)
soap(c30, p_jenny, H(7, 10),
    "Ina led a venipuncture procedure this week. Supervisor said 'excellent technique.' Ina's first response: 'She was just being nice.' Then caught herself: 'Wait — I\'m doing that thing.'",
    "Client smiled several times. PHQ-9=7. Metacognitive awareness of imposter pattern now functional.",
    "Substantial recovery. Imposter schema weakening under behavioral evidence. PHQ-9 in mild range.",
    "Consolidation phase. Tapering to biweekly. Identify 3 'evidence vault' achievements for maintenance.",
    7)

# Kaye Lim — YELLOW, ADHD + anxiety
soap(c31, c_csc, H(40, 9),
    "Kaye describes failing to start assignments until hours before deadlines, losing track of time, forgetting important dates, and 'feeling like I live in chaos.' Has been compensating since grade school.",
    "Client engaged but distracted — checked phone twice before notice. High verbal fluency. GAD-7=13.",
    "ADHD pattern strong — time blindness, executive dysfunction, emotional dysregulation. Secondary anxiety from years of academic struggle.",
    "ADHD psychoeducation. External scaffolding systems. Referral to psychiatry for formal evaluation pending.",
    5)

# Gab Cruz — YELLOW, complicated grief
soap(c32, p_niko, H(42, 10),
    "Gab speaks about his sister in the past tense, then corrects himself each time — 'She was — I mean, she was always...' Survivor guilt: 'If I had driven slower, if I had seen the truck sooner.'",
    "Client tearful throughout. PHQ-9=14. Delayed grief response — functioning well externally but emotionally frozen.",
    "Prolonged Grief Disorder (F43.21) with survivor guilt. Complicated by role as driver at time of accident.",
    "Grief-focused protocol. Distinguish between grief and guilt. Memory sharing exercise. Timeline of relationship with sister.",
    3)
soap(c32, p_niko, H(14, 10),
    "Gab visited his sister's grave with a friend last week — first time since the funeral. Cried for an hour. 'But I felt lighter after. Like I finally let myself miss her instead of just blaming myself.'",
    "Client appeared lighter emotionally. PHQ-9=9. Appropriate grief affect — crying during session but contained.",
    "Grief integrating well. Survivor guilt markedly reduced. Memory and meaning-making work productive.",
    "Legacy project: scrapbook and letter to sister. Academic re-engagement plan. Begin closure timeline in 4–6 sessions.",
    6)

# Pau Aguilar — YELLOW, NLE anxiety
soap(c33, c_chelly, H(35, 14),
    "Pau describes her mind 'going blank' during mock NLE even on questions she knows. 'I studied for weeks and then I just see the question and everything disappears.' GAD-7=14.",
    "Client anxious in session — fidgeting, short sentences. PHQ-9=9. History of performing well in class.",
    "Test anxiety with GAD features. Exam performance significantly below knowledge level due to anxiety-driven interference.",
    "CBT for test anxiety. Physiological arousal techniques. Thought records for pre-exam catastrophizing.",
    5)
soap(c33, c_chelly, H(12, 14),
    "Pau passed two review center sections this week. 'I used the breathing and the thought challenging and I actually finished before time ran out.' GAD-7=9.",
    "Client visibly more confident. Less fidgeting. Smiled when discussing the exam results.",
    "Significant improvement. Test anxiety reducing. Performance aligning with actual knowledge level.",
    "Pre-NLE coping card and simulation exposure. Finalize session arc — 2 more sessions then closure.",
    7)

print("✅ Extended session notes seeded\n")

# ══════════════════════════════════════════════════════════════════════════════
# SAFETY PLANS
# ══════════════════════════════════════════════════════════════════════════════
db.safety_plans.insert_one({
    'case_id': c21, 'student_id': s_marco, 'created_by': p_daryl,
    'created_at': H(62), 'updated_at': H(20),
    'warning_signs': [
        'Increased social withdrawal and isolation',
        'Not responding to messages for more than 12 hours',
        'Drinking alcohol alone in the dorm',
        'Intrusive images of the hazing incident becoming more frequent',
    ],
    'coping_strategies': [
        'Call Crisis Line: 0917-899-8727',
        'Use 5-4-3-2-1 grounding technique',
        'Text trusted roommate (Carlo)',
        'Go to the 24-hour convenience store near campus — get out of the room',
        'Message Dr. Daryl via CPS portal emergency',
    ],
    'social_supports': [
        'Carlo Navarro (roommate) — 09XXXXXXXXX',
        'Mother — 09XXXXXXXXX',
        'University Counseling Office — local 312',
    ],
    'professional_contacts': [
        'Dr. Daryl Bautista (Psychologist) — via CPS portal',
        'University Psychiatry — local 320',
        'Crisis hotline: 0917-899-8727',
        'Emergency: 911',
    ],
    'safe_environment': 'Roommate aware of safety plan. No harmful items in room.',
    'reasons_to_live': ['Family — especially younger brother', 'Engineering thesis project', 'Friends who care'],
    'revision_notes': 'Updated at session 8 — SI absent for 3 consecutive weeks. Risk level downgraded to MODERATE.',
})

db.safety_plans.insert_one({
    'case_id': c22, 'student_id': s_jasmine, 'created_by': p_bon,
    'created_at': H(60), 'updated_at': H(60),
    'warning_signs': [
        'Skipping all meals for more than 1 day',
        'BMI below 16.0',
        'Fainting or dizziness episodes',
        'Withdrawing from clinical groupmates',
    ],
    'coping_strategies': [
        'Call or text Mom immediately',
        'Eat at least one safe food (banana or crackers)',
        'Contact university nurse for vital sign check',
        'Text Dr. Bon via CPS portal',
    ],
    'social_supports': [
        'Mother — 09XXXXXXXXX',
        'Clinical groupmate: Andrea — 09XXXXXXXXX',
        'University Nurse Station — local 105',
    ],
    'professional_contacts': [
        'Dr. Bon Aquino (Psychologist)',
        'University Nutritionist — local 210',
        'University Nurse — local 105',
    ],
    'safe_environment': 'Nutritionist and nurse aware. Medical monitoring protocol active.',
    'reasons_to_live': ['Becoming a nurse', 'Family', 'Clinical groupmates'],
    'revision_notes': 'Initial safety plan. Medical focus. Psychiatric clearance for outpatient management obtained.',
})

db.safety_plans.insert_one({
    'case_id': c24, 'student_id': s_bea, 'created_by': p_chona,
    'created_at': H(52), 'updated_at': H(11),
    'warning_signs': [
        'Sleeping less than 4 hours for 2 consecutive nights',
        'Feeling "invincible" or unusually energetic',
        'Racing thoughts or rapid speech',
        'Impulsive spending or decisions',
        'Mood rating of 9–10 without clear reason',
    ],
    'coping_strategies': [
        'Activate Sleep Protocol immediately (no screens, melatonin, fixed bedtime)',
        'Call psychiatrist\'s office for urgent consultation',
        'Text parent or roommate',
        'Delay all major decisions by 24 hours',
    ],
    'social_supports': [
        'Mother — 09XXXXXXXXX',
        'Roommate in law dorm',
        'University Counseling CPS portal',
    ],
    'professional_contacts': [
        'Dr. Chona Lim (Psychologist)',
        'Psychiatrist Dr. [Name] — university referral contact',
        'Crisis Line: 0917-899-8727',
    ],
    'safe_environment': 'Medication stored safely. Psychiatrist on call agreement for hypomanic emergence.',
    'reasons_to_live': ['Law career', 'Family honor', 'Friends in law school'],
    'revision_notes': 'Updated session 7 — hypomanic warning signs identified and role-played in session.',
})

db.safety_plans.insert_one({
    'case_id': c23, 'student_id': s_ryan, 'created_by': p_shel,
    'created_at': H(55), 'updated_at': H(55),
    'warning_signs': [
        'Ritual time exceeding 4 hours in a day',
        'Inability to attend a lab session',
        'Contamination fears spreading to new objects (generalization)',
        'Refusing to eat in the cafeteria',
    ],
    'coping_strategies': [
        'Response prevention: delay washing by 10 minutes then reassess',
        'Call CPS for crisis ERP booster session',
        'Use ERP hierarchy card — identify current fear level',
        'Text study group for support',
    ],
    'social_supports': [
        'Study group members (aware of OCD, supportive)',
        'Parents — informed with consent',
    ],
    'professional_contacts': [
        'Dr. Shel Macaraeg (Psychologist)',
        'CPS emergency portal',
    ],
    'safe_environment': 'Lab equipment accommodation in place. Academic advisor briefed.',
    'reasons_to_live': ['Medical school goal', 'Research aspirations', 'Family'],
    'revision_notes': 'Functional impairment safety plan — not SI-focused. Lab accommodation letter attached.',
})

print("✅ 4 safety plans seeded\n")

# ══════════════════════════════════════════════════════════════════════════════
# PERMA SNAPSHOTS (additional students)
# ══════════════════════════════════════════════════════════════════════════════
_perma_data = [
    (s_marco,   'ext_student1',  [
        (H(60), 'Struggling'), (H(45), 'Languishing'), (H(30), 'Languishing'),
        (H(15), 'Surviving'),  (H(3),  'Surviving'),
    ]),
    (s_migs,    'ext_student9', [
        (H(45), 'Languishing'), (H(30), 'Surviving'), (H(14), 'Thriving'),
        (H(3),  'Flourishing'),
    ]),
    (s_mae,     'ext_student14', [
        (H(30), 'Languishing'), (H(20), 'Surviving'), (H(10), 'Flourishing'),
        (H(3),  'Thriving'),
    ]),
    (s_eli,     'ext_student15', [
        (H(25), 'Struggling'), (H(14), 'Surviving'), (H(5), 'Flourishing'),
    ]),
]
for uid_s, uname, entries in _perma_data:
    for entry_dt, label in entries:
        db.perma_snapshots.update_one(
            {'mhbot_username': uname, 'entry_date': entry_dt},
            {'$set': {
                'mhbot_username': uname, 'perma_label': label,
                'entry_date': entry_dt, 'raw_date': entry_dt.isoformat(),
                'student_user_id': uid_s, 'saved_at': now,
            }}, upsert=True)
        db.perma_history.insert_one({'username': uname, 'perma_label': label, 'date': entry_dt})
    # Set latest
    latest_label = entries[-1][1]
    db.users.update_one({'_id': uid_s}, {'$set': {
        'perma_latest_label': latest_label,
        'perma_latest_date': entries[-1][0].isoformat(),
        'perma_synced_at': now,
    }})

print("✅ Extended PERMA data seeded\n")

# ══════════════════════════════════════════════════════════════════════════════
# NOTIFICATIONS
# ══════════════════════════════════════════════════════════════════════════════
_notifs = [
    # RED risk alerts
    (p_daryl,  'CRISIS_ALERT',          'Code RED: Marco Reyes (CPS-2025-021) — passive SI disclosed. Safety plan initiated. Immediate review required.', c21, 'RED', False, 62),
    (p_bon,    'CRISIS_ALERT',          'Code RED: Jasmine Torres (CPS-2025-022) — medical risk (Anorexia, BMI 16.2). Coordinated care protocol active.', c22, 'RED', False, 63),
    (p_shel,   'CRISIS_ALERT',          'Code RED: Ryan Santos (CPS-2025-023) — severe OCD causing lab requirement failure. Academic intervention needed.', c23, 'RED', False, 55),
    (p_chona,  'CRISIS_ALERT',          'Code RED: Bea Cruz (CPS-2025-024) — Bipolar II, post-hypomanic episode. Medication referral urgent.', c24, 'RED', False, 52),
    # Case assignments
    (p_daryl,  'CASE_ASSIGNED',         'New case assigned: Marco Reyes (CPS-2025-021) — Severe MDD + PTSD, RED risk.', c21, None, True, 65),
    (p_bon,    'CASE_ASSIGNED',         'New case assigned: Jasmine Torres (CPS-2025-022) — Anorexia + MDD, RED risk.', c22, None, True, 63),
    (p_shel,   'CASE_ASSIGNED',         'New case assigned: Ryan Santos (CPS-2025-023) — Severe OCD, RED risk.', c23, None, True, 58),
    (p_chona,  'CASE_ASSIGNED',         'New case assigned: Bea Cruz (CPS-2025-024) — Bipolar II, RED risk.', c24, None, True, 55),
    (p_niko,   'CASE_ASSIGNED',         'New case assigned: Andre Villanueva (CPS-2025-025) — Cannabis Use + MDD, RED risk.', c25, None, True, 75),
    (c_chelly, 'CASE_ASSIGNED',         'New case assigned: Trisha Morales (CPS-2025-026) — Insomnia + Depression, YELLOW risk.', c26, None, True, 53),
    (c_daye,   'CASE_ASSIGNED',         'New case assigned: JC Reyes (CPS-2025-027) — GAD + somatic, YELLOW risk.', c27, None, True, 50),
    (p_daryl,  'CASE_ASSIGNED',         'New case assigned: Hannah Dela Cruz (CPS-2025-028) — Vicarious trauma, YELLOW risk.', c28, None, True, 58),
    (c_bia,    'CASE_ASSIGNED',         'New case assigned: Migs Fernandez (CPS-2025-029) — Burnout + perfectionism, YELLOW risk.', c29, None, True, 48),
    (p_jenny,  'CASE_ASSIGNED',         'New case assigned (referral from Rose Tolentino): Ina Santos (CPS-2025-030) — Imposter syndrome + MDD, YELLOW.', c30, None, False, 47),
    # No-show warnings
    (p_niko,   'NO_SHOW_ALERT',         'Andre Villanueva (CPS-2025-025) missed their 3rd consecutive appointment. Case auto-closed per CPS protocol.', c25, None, False, 37),
    (cm_id,    'NO_SHOW_ALERT',         'Case CPS-2025-025 (Andre Villanueva) has been closed: 3 consecutive no-shows. Student outreach attempted.', c25, None, False, 37),
    (p_daryl,  'NO_SHOW_ALERT',         'Hannah Dela Cruz (CPS-2025-028) has missed 2 consecutive appointments. One more will trigger case closure.', c28, None, False, 33),
    # Reschedule notifications
    (c_chelly, 'RESCHEDULE_REQUESTED',  'Trisha Morales has requested to reschedule her appointment: conflicting thesis deadline.', c26, None, False, 9),
    (c_daye,   'APPOINTMENT_UPCOMING',  'Reminder: Proposed new time for JC Reyes pending student approval. Response due within 48 hours.', c27, None, False, 5),
    # Referral notification
    (p_jenny,  'REFERRAL_RECEIVED',     'Referral from Counselor Rose Tolentino: Ina Santos (CPS-2025-030). PHQ-9=13, imposter syndrome escalating. See case notes.', c30, None, False, 47),
    (c_rose_t, 'REFERRAL_COMPLETED',    'Warm handoff to Dr. Jenny Soriano completed for Ina Santos (CPS-2025-030). Referral appointment logged.', c30, None, True, 35),
    # Upcoming appointments
    (p_daryl,  'APPOINTMENT_UPCOMING',  'Upcoming session: Marco Reyes in 5 days at 2:00 PM. Latest PHQ-9=12. Review trauma exposure progress.', c21, None, False, 1),
    (p_bon,    'APPOINTMENT_UPCOMING',  'Upcoming session: Jasmine Torres in 7 days at 11:00 AM. BMI 17.5. Maintenance phase.', c22, None, False, 1),
    # Student notifications
    (s_marco,  'APPOINTMENT_CONFIRMED', 'Your next appointment with Dr. Daryl Bautista is confirmed for 5 days from now at 2:00 PM.', None, None, False, 1),
    (s_andre,  'CASE_CLOSED_NO_SHOW',   'Your CPS case has been closed due to 3 consecutive missed appointments per university protocol. To re-open, contact CPS at local 312.', c25, None, False, 37),
    (s_trisha, 'RESCHEDULE_PENDING',    'Your reschedule request has been received. Counselor Chelly Reyes will propose a new time within 48 hours.', c26, None, False, 9),
    (s_jc,     'RESCHEDULE_PROPOSED',   'Counselor Daye Navarro has proposed a new appointment time for you. Please log in to approve or decline.', c27, None, False, 5),
    (s_bea,    'APPOINTMENT_CONFIRMED', 'Your appointment with Dr. Chona Lim is confirmed for 7 days from now at 1:00 PM.', None, None, False, 1),
]

for row in _notifs:
    target_id, ntype, message, case_id, risk_level, read, days_ago = row
    notif(target_id, ntype, message, case_id=case_id, risk_level=risk_level, read=read, days_ago=days_ago)

print(f"✅ {len(_notifs)} extended notifications seeded\n")

# ══════════════════════════════════════════════════════════════════════════════
# UPDATE CASE SESSION COUNTS
# ══════════════════════════════════════════════════════════════════════════════
_case_appt_counts = db.appointments.aggregate([
    {'$match': {'status': {'$in': ['COMPLETED', 'CONFIRMED']}}},
    {'$group': {'_id': '$case_id', 'count': {'$sum': 1}}},
])
for row in _case_appt_counts:
    if row['_id']:
        db.cases.update_one({'_id': row['_id']}, {'$set': {'session_count': row['count']}})

print("✅ Case session counts updated\n")

# ══════════════════════════════════════════════════════════════════════════════
# VERIFICATION
# ══════════════════════════════════════════════════════════════════════════════
print("=" * 60)
print("EXTENDED SEED VERIFICATION")
print("=" * 60)
for col in ['users', 'cases', 'intakes', 'appointments', 'session_notes',
            'safety_plans', 'missed_appointment_tracker', 'notifications',
            'perma_snapshots', 'check_ins']:
    print(f"  {col:<34} {db[col].count_documents({}):>4}")

new_students = db.users.count_documents({'role': 'STUDENT', 'email': {'$regex': '^ext_student'}})
new_cases = db.cases.count_documents({'case_number': {'$regex': 'CPS-2025-0[2-4]'}})
reschedule_appts = db.appointments.count_documents({'reschedule_reason': {'$exists': True}})
rescheduled_from = db.appointments.count_documents({'rescheduled_from_id': {'$exists': True}})
pending_approval = db.appointments.count_documents({'status': 'PENDING_STUDENT_APPROVAL'})
reschedule_requested = db.appointments.count_documents({'status': 'RESCHEDULE_REQUESTED'})
no_show_count = db.appointments.count_documents({'status': 'NO_SHOW', 'student_id': {'$in': sE}})
red_cases = db.cases.count_documents({'risk_level': 'RED'})
yellow_cases = db.cases.count_documents({'risk_level': 'YELLOW'})
green_cases = db.cases.count_documents({'risk_level': 'GREEN'})
closed_cases = db.cases.count_documents({'status': 'CLOSED'})

print(f"""
EXTENDED SEED SUMMARY
{"=" * 60}
  New students created:          {new_students:>4}
  Reschedule chains (total):     {reschedule_appts:>4} appts with reschedule data
  Rescheduled-from references:   {rescheduled_from:>4} (completed reschedule cycles)
  Currently RESCHEDULE_REQUESTED:{reschedule_requested:>4} (pending counselor response)
  Currently PENDING_STUDENT_APPROVAL: {pending_approval:>3} (counselor proposed new time)
  No-shows (new students):       {no_show_count:>4}
  RED risk cases (total DB):     {red_cases:>4}
  YELLOW risk cases (total DB):  {yellow_cases:>4}
  GREEN risk cases (total DB):   {green_cases:>4}
  Closed cases (total DB):       {closed_cases:>4}
  Safety plans (total DB):       {db.safety_plans.count_documents({}):>4}
  No-show trackers (total DB):   {db.missed_appointment_tracker.count_documents({}):>4}
{"=" * 60}

NEW STUDENT ACCOUNTS (ext_student1 … ext_student20)
  ext_student1@university.edu   ext101  Marco Reyes      — RED, MDD+PTSD, active safety plan
  ext_student2@university.edu   ext102  Jasmine Torres   — RED, Anorexia+MDD, medical monitoring
  ext_student3@university.edu   ext103  Ryan Santos      — RED, Severe OCD, ERP in progress
  ext_student4@university.edu   ext104  Bea Cruz         — RED, Bipolar II, medication managed
  ext_student5@university.edu   ext105  Andre Villanueva — RED, CLOSED (3 no-shows, terminated)
  ext_student6@university.edu   ext106  Trisha Morales   — YELLOW, 2 completed reschedule cycles + 1 pending
  ext_student7@university.edu   ext107  JC Reyes         — YELLOW, NO_SHOW→reschedule + PENDING_APPROVAL
  ext_student8@university.edu   ext108  Hannah Dela Cruz — YELLOW, 2 no-shows (warning), returned
  ext_student9@university.edu   ext109  Migs Fernandez   — YELLOW, MBA burnout arc, nearing closure
  ext_student10@university.edu  ext110  Ina Santos       — YELLOW, counselor→psych referral arc
  ext_student11@university.edu  ext111  Kaye Lim         — YELLOW, ADHD+anxiety, psych eval pending
  ext_student12@university.edu  ext112  Gab Cruz         — YELLOW, complicated grief, anniversary session
  ext_student13@university.edu  ext113  Pau Aguilar      — YELLOW, NLE anxiety, reschedule completed
  ext_student14@university.edu  ext114  Mae Santos       — GREEN, CLOSED (success, freshman adjustment)
  ext_student15@university.edu  ext115  Eli Tan          — GREEN, breakup, nearing closure
  ext_student16@university.edu  ext116  Cris Reyes       — GREEN, academic stress, 2 sessions
  ext_student17@university.edu  ext117  Jan Navarro      — GREEN, career anxiety, first interview received
  ext_student18@university.edu  ext118  Ara Ocampo       — GREEN, LGBTQ+ identity/coming out
  ext_student19@university.edu  ext119  Josh Santos      — GREEN, financial stress, scholarship nav
  ext_student20@university.edu  ext120  Lia Flores       — GREEN, mild social anxiety, exposure therapy

KEY RESCHEDULE SCENARIOS DEMONSTRATED
  CPS-2025-026 (Trisha)    — 2 COMPLETED reschedule cycles + 1 active RESCHEDULE_REQUESTED
  CPS-2025-027 (JC)        — NO_SHOW rescheduled + PENDING_STUDENT_APPROVAL
  CPS-2025-024 (Bea)       — NO_SHOW → staff reschedule → completed cycle
  CPS-2025-029 (Migs)      — student-requested reschedule (presentation conflict) → completed
  CPS-2025-032 (Gab)       — anniversary-triggered reschedule → completed
  CPS-2025-033 (Pau)       — review center conflict reschedule → completed

NO-SHOW PROTOCOLS
  CPS-2025-025 (Andre)     — 3 consecutive no-shows → AUTO-CLOSED, tracker entry
  CPS-2025-028 (Hannah)    — 2 consecutive no-shows → WARNING, returned to therapy
  CPS-2025-022 (Jasmine)   — 1 no-show mid-treatment, returned same week

REFERRAL CHAIN
  CPS-2025-030 (Ina)       — COUNSELOR (Rose Tolentino) → REFERRAL appt → PSYCHOLOGIST (Jenny Soriano)

{"=" * 60}
✅  EXTENDED DATABASE SEED COMPLETE
{"=" * 60}
""")
