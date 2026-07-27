#!/usr/bin/env python3
"""
Seed realistic booking workflow appointments:
  REQUESTED  — student submitted, no counselor/time assigned yet
  PENDING_APPROVAL — staff assigned counselor + time, awaiting counselor confirmation
"""
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime, timedelta
import random, re

db = MongoClient()['cps_system_dev']
now = datetime.utcnow()

def F(days, h=9, m=0):
    return (now + timedelta(days=days)).replace(hour=h, minute=m, second=0, microsecond=0)

def H(days, h=9, m=0):
    return (now - timedelta(days=days)).replace(hour=h, minute=m, second=0, microsecond=0)

def ref_id():
    return 'APT-' + ''.join(random.choices('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', k=8))

# ── Look up users and cases ───────────────────────────────────────────────────
def u(email):
    doc = db.users.find_one({'email': email}, {'_id': 1})
    assert doc, f"User not found: {email}"
    return doc['_id']

def case(num):
    doc = db.cases.find_one({'case_number': num}, {'_id': 1, 'assigned_counselor_id': 1})
    assert doc, f"Case not found: {num}"
    return doc

# Students
s1   = u('ejohnson@dlsu.edu.ph')       # Emma   — ACTIVE c1, counselor: rose
s3   = u('lpark@dlsu.edu.ph')          # Lena   — ACTIVE c3, counselor: chelly
s8   = u('egarcia@dlsu.edu.ph')        # Ella   — ACTIVE c8, counselor: rose
s10  = u('hsantos@dlsu.edu.ph')        # Harold — ACTIVE c10, counselor: chelly
s13  = u('rkim@dlsu.edu.ph')           # Rachel — ACTIVE c13, counselor: clara
s31  = u('vdelacruz@dlsu.edu.ph')      # Vince  — NEW case c31
s32  = u('msantos2@dlsu.edu.ph')       # Maria  — NEW case c32
s33  = u('elee@dlsu.edu.ph')           # Ethan  — NEW case c33
s34  = u('dsantos@dlsu.edu.ph')        # Diana  — NEW case c34
s35  = u('klim@dlsu.edu.ph')           # Kevin  — NEW case c35

# Cases
c1  = case('CPS-2025-001')
c3  = case('CPS-2025-003')
c8  = case('CPS-2025-008')
c10 = case('CPS-2025-010')
c13 = case('CPS-2025-013')
c31 = case('CPS-2025-031')
c32 = case('CPS-2025-032')
c33 = case('CPS-2025-033')
c34 = case('CPS-2025-034')
c35 = case('CPS-2025-035')

# Counselors / psychologists
c_rose   = u('rose.t@dlsu.edu.ph')
c_bia    = u('bia@dlsu.edu.ph')
c_chelly = u('chelly@dlsu.edu.ph')
c_daye   = u('daye@dlsu.edu.ph')
c_clara  = u('clara@dlsu.edu.ph')
p_daryl  = u('daryl@dlsu.edu.ph')
p_niko   = u('niko@dlsu.edu.ph')
p_bon    = u('bon@dlsu.edu.ph')
p_shel   = u('shel@dlsu.edu.ph')

def name(uid):
    doc = db.users.find_one({'_id': uid}, {'first_name': 1, 'last_name': 1})
    return f"{doc['first_name']} {doc['last_name']}"

def cname(uid):
    if not uid:
        return 'Not Assigned'
    doc = db.users.find_one({'_id': uid}, {'first_name': 1, 'last_name': 1})
    return f"{doc['first_name']} {doc['last_name']}" if doc else 'Not Assigned'

# ── Insert helpers ────────────────────────────────────────────────────────────
inserted = []

def req(student_id, case_doc, counselor_id, purpose, concern, referral_type,
        preferred_method, preferred_date_dt, preferred_time_str,
        referred_by=None, notes=None, days_ago=1):
    """REQUESTED — student submitted booking, no time/counselor assigned yet."""
    pref_start = preferred_date_dt.replace(
        hour=int(preferred_time_str.split(':')[0]),
        minute=int(preferred_time_str.split(':')[1]),
        second=0, microsecond=0
    )
    pref_end = pref_start + timedelta(minutes=50)
    doc = {
        'student_id':           student_id,
        'student_name':         name(student_id),
        'case_id':              case_doc['_id'],
        'counselor_id':         counselor_id,
        'counselor_name':       cname(counselor_id),
        'appointment_type':     'continuing',
        'status':               'REQUESTED',
        'purpose':              purpose,
        'concern':              concern,
        'referral_type':        referral_type,
        'referred_by':          referred_by,
        'preferred_method':     preferred_method,
        'preferred_platform':   'google_meet' if preferred_method == 'online' else None,
        'preferred_date':       preferred_date_dt.strftime('%Y-%m-%d'),
        'preferred_time':       preferred_time_str,
        'requested_start':      pref_start,
        'requested_end':        pref_end,
        'scheduled_start':      None,
        'scheduled_end':        None,
        'method':               preferred_method,
        'reference_id':         ref_id(),
        'notes':                notes,
        'consent_given':        True,
        'consent_version':      '1.0',
        'created_at':           H(days_ago),
        'updated_at':           H(days_ago),
    }
    oid = db.appointments.insert_one(doc).inserted_id
    inserted.append(oid)
    return oid

def pend(student_id, case_doc, counselor_id, purpose, concern, referral_type,
         preferred_method, scheduled_dt, preferred_time_str,
         referred_by=None, notes=None, days_ago=2):
    """PENDING_APPROVAL — staff assigned counselor + time, counselor hasn't confirmed."""
    sched_start = scheduled_dt.replace(
        hour=int(preferred_time_str.split(':')[0]),
        minute=int(preferred_time_str.split(':')[1]),
        second=0, microsecond=0
    )
    sched_end = sched_start + timedelta(minutes=50)
    doc = {
        'student_id':           student_id,
        'student_name':         name(student_id),
        'case_id':              case_doc['_id'],
        'counselor_id':         counselor_id,
        'counselor_name':       cname(counselor_id),
        'appointment_type':     'continuing',
        'status':               'PENDING_APPROVAL',
        'purpose':              purpose,
        'concern':              concern,
        'referral_type':        referral_type,
        'referred_by':          referred_by,
        'preferred_method':     preferred_method,
        'preferred_platform':   'google_meet' if preferred_method == 'online' else None,
        'preferred_date':       scheduled_dt.strftime('%Y-%m-%d'),
        'preferred_time':       preferred_time_str,
        'requested_start':      scheduled_dt.replace(
                                    hour=int(preferred_time_str.split(':')[0]),
                                    minute=int(preferred_time_str.split(':')[1]),
                                    second=0, microsecond=0),
        'requested_end':        sched_end,
        'scheduled_start':      sched_start,
        'scheduled_end':        sched_end,
        'method':               preferred_method,
        'reference_id':         ref_id(),
        'notes':                notes,
        'consent_given':        True,
        'consent_version':      '1.0',
        'created_at':           H(days_ago),
        'updated_at':           H(1),
        'assigned_by':          str(db.users.find_one({'role': 'STAFF'}, {'_id': 1})['_id']),
        'assigned_at':          H(1),
    }
    oid = db.appointments.insert_one(doc).inserted_id
    inserted.append(oid)
    return oid

# ═══════════════════════════════════════════════════════════════════
# REQUESTED — student submitted, waiting for staff to assign/confirm
# ═══════════════════════════════════════════════════════════════════

# Vince (s31, c31) — NEW case, social anxiety, booking first counseling session
req(s31, c31, c_clara, 'counseling',
    concern='My anxiety in class has gotten really bad. I\'ve been avoiding recitations and group work. I need help managing this before finals.',
    referral_type='self',
    preferred_method='in-person',
    preferred_date_dt=F(5), preferred_time_str='10:00',
    notes='Preferred morning slot. Anxious about first session.',
    days_ago=1)

# Maria (s32, c32) — NEW case, self-harm referral, booking first counseling session
req(s32, c32, p_bon, 'counseling',
    concern='I was referred by a friend. I have been going through a really difficult time and have been hurting myself. I want to get help.',
    referral_type='peer_referral',
    referred_by='Close friend (anonymous)',
    preferred_method='in-person',
    preferred_date_dt=F(3), preferred_time_str='14:00',
    days_ago=1)

# Ethan (s33, c33) — NEW case, exam anxiety, books urgently (board exams in 8 weeks)
req(s33, c33, c_daye, 'counseling',
    concern='Board exams are in 8 weeks and my anxiety during practice exams is severe. My mind goes completely blank. I need strategies urgently.',
    referral_type='self',
    preferred_method='in-person',
    preferred_date_dt=F(2), preferred_time_str='09:00',
    notes='Urgent — board exam timeline. Prefers earliest available slot.',
    days_ago=1)

# Diana (s34, c34) — NEW case, depression, first counseling booking
req(s34, c34, c_bia, 'counseling',
    concern='I have been feeling very low and disconnected for the past month. Hard to get out of bed. Academic attendance is suffering.',
    referral_type='self',
    preferred_method='online',
    preferred_date_dt=F(4), preferred_time_str='15:00',
    days_ago=2)

# Kevin (s35, c35) — NEW case, eating disorder, medical + psych coordination needed
req(s35, c35, p_shel, 'counseling',
    concern='The school nurse referred me. I have been restricting my eating and exercising a lot. I know it is not healthy but I don\'t know how to stop.',
    referral_type='faculty_staff',
    referred_by='School Nurse — Ms. Perez',
    preferred_method='in-person',
    preferred_date_dt=F(3), preferred_time_str='11:00',
    days_ago=2)

# Emma (s1, c1) — ACTIVE, wants additional session outside regular schedule
req(s1, c1, c_rose, 'counseling',
    concern='Thesis defense is coming up and the anxiety is spiking again. Would like to schedule an extra session this week if possible.',
    referral_type='self',
    preferred_method='in-person',
    preferred_date_dt=F(6), preferred_time_str='10:00',
    notes='Supplementary session request — thesis defense prep.',
    days_ago=1)

# Harold (s10, c10) — ACTIVE, social anxiety, missed last session and wants to rebook
req(s10, c10, c_chelly, 'counseling',
    concern='I missed my last session — I panicked and couldn\'t make myself go. I want to try again. I am ready to work on this.',
    referral_type='self',
    preferred_method='online',
    preferred_date_dt=F(4), preferred_time_str='14:00',
    notes='No-show rebook. Prefers online to reduce exposure anxiety for initial re-engagement.',
    days_ago=1)

# ═══════════════════════════════════════════════════════════════════
# PENDING_APPROVAL — staff matched counselor + time, counselor reviews
# ═══════════════════════════════════════════════════════════════════

# Lena (s3, c3) — ACTIVE, staff assigned follow-up slot, waiting for Clara to confirm
pend(s3, c3, c_chelly, 'follow_up',
     concern='Anxiety and sleep issues continue after the breakup. Would like a follow-up before the next scheduled session.',
     referral_type='self',
     preferred_method='in-person',
     scheduled_dt=F(7), preferred_time_str='09:00',
     days_ago=3)

# Ella (s8, c8) — ACTIVE, family conflict/stress, staff assigned slot with Rose
pend(s8, c8, c_rose, 'counseling',
     concern='Things at home have escalated this week. Parents are fighting more. Struggling to focus on studies. Need to talk.',
     referral_type='self',
     preferred_method='in-person',
     scheduled_dt=F(5), preferred_time_str='11:00',
     notes='Student requested urgent slot. Staff assigned earliest available.',
     days_ago=4)

# Rachel (s13, c13) — ACTIVE, OCD/anxiety, staff assigned with Clara
pend(s13, c13, c_clara, 'counseling',
     concern='The rituals are taking 3 hours a day now. I barely slept last night checking the stove. Please schedule me as soon as possible.',
     referral_type='self',
     preferred_method='online',
     scheduled_dt=F(4), preferred_time_str='13:00',
     days_ago=4)

# Vince Dela Cruz (s31, c31) — NEW, separate PENDING_APPROVAL to show state variety
# (Imagine this is an earlier request that was already assigned but not yet confirmed)
pend(s31, c31, c_clara, 'counseling',
     concern='I keep avoiding class participation and it is hurting my grade. I need help with my social anxiety.',
     referral_type='faculty_referral',
     referred_by='Prof. Mendoza (Faculty Adviser)',
     preferred_method='in-person',
     scheduled_dt=F(8), preferred_time_str='10:00',
     notes='Faculty referred. Assigned to Clara Santos (F2F). Awaiting counselor confirmation.',
     days_ago=5)

# Ethan (s33, c33) — separate earlier PENDING_APPROVAL (before the REQUESTED above was submitted)
pend(s33, c33, c_daye, 'counseling',
     concern='Test anxiety causing blanking during practice board exams. GAD-7: 13. Board exams in 8 weeks.',
     referral_type='self',
     preferred_method='in-person',
     scheduled_dt=F(6), preferred_time_str='14:00',
     notes='Urgent scheduling request. Assigned to Navarro. Awaiting counselor acknowledgment.',
     days_ago=6)

# Diana (s34, c34) — PENDING_APPROVAL, online, assigned to Bia
pend(s34, c34, c_bia, 'counseling',
     concern='Persistent low mood and social withdrawal for 4 weeks. PHQ-9: 14. Declining attendance.',
     referral_type='self',
     preferred_method='online',
     scheduled_dt=F(5), preferred_time_str='15:00',
     notes='Assigned to Alcantara. Google Meet link to be generated on confirmation.',
     days_ago=5)

print(f"✅ {len(inserted)} booking workflow appointments inserted")
print(f"   REQUESTED:        {db.appointments.count_documents({'status': 'REQUESTED'})}")
print(f"   PENDING_APPROVAL: {db.appointments.count_documents({'status': 'PENDING_APPROVAL'})}")
print(f"   CONFIRMED:        {db.appointments.count_documents({'status': 'CONFIRMED'})}")
print(f"   COMPLETED:        {db.appointments.count_documents({'status': 'COMPLETED'})}")
print(f"   NO_SHOW:          {db.appointments.count_documents({'status': 'NO_SHOW'})}")
print(f"   CANCELLED:        {db.appointments.count_documents({'status': 'CANCELLED'})}")
print(f"   Total:            {db.appointments.count_documents({})}")
