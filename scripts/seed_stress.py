"""
Stress seed: the CPS office at the busiest point of the term.

Builds a separate database (cps_system_stress by default) so the normal demo data is untouched:

  1. runs seed_all.py into it (staff accounts, demo students and their stories), then
  2. adds a heavy layer by cloning those seeded records as templates, so every document has the
     shape the app expects:
       * ~1,500 extra students, most linked to EMA
       * cases for most of them, piled unevenly onto counselors (a few are badly overloaded)
       * every clinician's weekly schedule ~95% booked for the coming weeks, and months of past
         sessions (completed, no-shows, cancellations), many still waiting for their session note
       * a backlog of unassigned requests, walk-ins waiting for an IC and a waitlist
       * ~4 months of EMA check-ins (~75,000 results) with crises, late reviews and some still
         waiting for review
       * referrals waiting for a warm handoff, journal entries, crisis alerts

Usage (from the project root, with the backend venv):
    backend/venv/bin/python scripts/seed_stress.py                    # worst case, ~1-2 minutes
    backend/venv/bin/python scripts/seed_stress.py --students 400     # lighter
    DEV_DB_NAME=cps_system_stress backend/venv/bin/python backend/app.py   # run the app on it

Every stress student logs in with password stress123 (e.g. one listed at the end).
"""
import argparse
import copy
import os
import random
import subprocess
import sys
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from pymongo import InsertOne, MongoClient, UpdateOne
from werkzeug.security import generate_password_hash

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'backend'))

ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
ap.add_argument('--db', default='cps_system_stress', help='database to (re)build; never the dev or production one')
ap.add_argument('--students', type=int, default=1500, help='extra students on top of the demo ones')
ap.add_argument('--weeks-back', type=int, default=16, help='weeks of past sessions')
ap.add_argument('--weeks-ahead', type=int, default=4, help='weeks of booked future sessions')
ap.add_argument('--fill', type=float, default=0.95, help='share of future clinician slots that are taken')
ap.add_argument('--ema-days', type=int, default=120, help='days of EMA history')
ap.add_argument('--seed', type=int, default=2026, help='random seed, for repeatable data')
ap.add_argument('--skip-base', action='store_true', help='do not rerun seed_all.py first')
args = ap.parse_args()

if args.db in ('cps_system', 'cps_system_dev', 'cps_system_test'):
    sys.exit(f'Refusing to fill {args.db}: the stress seed wipes its target. Use the default cps_system_stress.')

random.seed(args.seed)
URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
db = MongoClient(URI)[args.db]
UTC_NOW = datetime.now(timezone.utc).replace(tzinfo=None)
PH_NOW = UTC_NOW + timedelta(hours=8)          # appointment times are Philippine wall-clock time
TODAY = PH_NOW.replace(hour=0, minute=0, second=0, microsecond=0)
t0 = time.time()


def step(msg):
    print(f'[{time.time() - t0:6.1f}s] {msg}', flush=True)


def bulk(coll, ops):
    for i in range(0, len(ops), 5000):
        db[coll].bulk_write(ops[i:i + 5000], ordered=False)


# ── 1. Base seed ────────────────────────────────────────────────────────────────
if not args.skip_base:
    step(f'Running seed_all.py into {args.db} (wipes it first)')
    env = {**os.environ, 'MONGODB_DB_NAME': args.db}
    r = subprocess.run([sys.executable, os.path.join(HERE, 'seed_all.py')], env=env,
                       stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
    if r.returncode != 0:
        sys.exit(f'seed_all.py failed:\n{r.stderr[-2000:]}')

# ── 2. Templates from the base seed ─────────────────────────────────────────────
step('Loading templates')
T = {
    'student': db.users.find_one({'role': 'STUDENT', 'mhbot_username': {'$nin': [None, '']}}),
    'case': db.cases.find_one({'case_status': 'ACTIVE', 'intake_interview_form': {'$exists': True}}),
    'confirmed': db.appointments.find_one({'status': 'CONFIRMED', 'purpose': 'counseling'}),
    'requested': db.appointments.find_one({'status': 'REQUESTED', 'requested_start': {'$ne': None}}),
    'intake': db.appointments.find_one({'purpose': 'intake_interview'}),
    'note': db.session_notes.find_one({'soap': {'$exists': True}}),
    'referral': db.referrals.find_one({'referral_type': 'EXTERNAL'}),
    'journal': db.journal_entries.find_one(),
}
missing = [k for k, v in T.items() if not v]
if missing:
    sys.exit(f'Base seed is missing templates: {missing}. Run without --skip-base.')
for k in ('student',):
    for f in ('perma_triage', 'perma_triage_label', 'perma_latest_label', 'perma_latest_date', 'perma_crisis_cleared_at'):
        T[k].pop(f, None)

staff = {r: list(db.users.find({'role': r, 'is_active': {'$ne': False}})) for r in
         ('COUNSELOR', 'PSYCHOLOGIST', 'IC', 'CASE_MANAGER', 'STAFF')}
clinicians = staff['COUNSELOR'] + staff['PSYCHOLOGIST']
cm = staff['CASE_MANAGER'][0]
schedules = {a['counselor_id']: a['schedule'] for a in db.counselor_availability.find({'schedule': {'$exists': True}})}

# ── 3. Students ────────────────────────────────────────────────────────────────
FIRST = ('Miguel Andrea Paolo Bea Carlo Danica Enzo Faye Gab Hannah Ivan Jasmine Kyle Lara Marco Nicole Owen Pia '
         'Rafael Sofia Tristan Ursula Vince Wena Xavier Yna Zach Alyssa Bryan Camille Diego Elise Franco Gia Hans '
         'Isabel Jomar Kaye Luis Mika Nathan Olivia Patrick Queenie Renzo Sam Tala Uriel Vina Wil').split()
LAST = ('Reyes Santos Cruz Bautista Ocampo Garcia Mendoza Torres Flores Villanueva Ramos Castillo Aquino Navarro '
        'DelaCruz Gonzales Lim Tan Uy Sy Chua Go Ong Lopez Rivera Domingo Salazar Pascual Mercado Fernandez '
        'Morales Valdez Soriano Manalo Dizon Agustin Ignacio Rosales Tolentino Bernardo').split()
COLLEGES = {'CCS': 'BS Computer Science', 'GCOE': 'BS Electronics Engineering', 'RVR-COB': 'BS Accountancy',
            'CLA': 'AB Psychology', 'COS': 'BS Biology', 'SOE': 'BS Economics', 'BAGCED': 'BS Education'}
YEARS = ('1st Year', '2nd Year', '3rd Year', '4th Year')
PW_HASH = generate_password_hash('stress123')

step(f'Creating {args.students} students')
students = []
used_ids = {u.get('student_id') for u in db.users.find({}, {'student_id': 1})}
for i in range(args.students):
    fn, ln = random.choice(FIRST), random.choice(LAST)
    sid = None
    while not sid or sid in used_ids:
        sid = f"12{random.randint(100000, 499999)}"
    used_ids.add(sid)
    col = random.choice(list(COLLEGES))
    u = copy.deepcopy(T['student'])
    linked = random.random() < 0.8
    joined = UTC_NOW - timedelta(days=random.randint(5, args.ema_days + 60))
    u.update({
        '_id': ObjectId(), 'email': f'{fn.lower()}.{ln.lower()}.s{i:04d}@dlsu.edu.ph',
        'first_name': fn, 'last_name': ln, 'name': f'{fn} {ln}', 'password_hash': PW_HASH,
        'student_id': sid, 'id_number': sid, 'college': col, 'course': COLLEGES[col],
        'year_level': random.choice(YEARS), 'contact_number': f'0917{random.randint(1000000, 9999999)}',
        'created_at': joined, 'updated_at': joined, 'failed_login_attempts': 0, 'locked_until': None,
        'stress_seed': True,
    })
    if linked:
        u.update({'mhbot_username': f'stress{i:04d}', 'ema_consent_given': True,
                  'ema_consent_given_at': joined, 'mhbot_linked_at': joined})
    else:
        for f in ('mhbot_username', 'ema_consent_given', 'ema_consent_given_at', 'mhbot_linked_at', 'perma_synced_at'):
            u.pop(f, None)
    students.append(u)
db.users.insert_many(students)

# ── 4. Cases, piled unevenly onto clinicians ────────────────────────────────────
CASE_CONCERNS = ['Academic stress and anxiety', 'Low mood and loss of motivation', 'Family conflict at home',
                 'Grief after a family death', 'Relationship breakup', 'Panic attacks before exams',
                 'Social isolation in the dorm', 'Burnout from org and class load', 'Sleep problems and worry',
                 'Self-esteem and body image', 'Thoughts of dropping out', 'Adjustment to college life']
# PHQ-9 / GAD-7 ranges that match each risk level under intake.get_risk_level
SCORE_BANDS = {'GREEN': ((2, 14), (1, 11)), 'YELLOW': ((16, 20), (9, 14)), 'RED': ((21, 25), (12, 18)),
               'CRITICAL': ((23, 27), (16, 21))}
step('Creating cases')
weights = [random.paretovariate(1.3) for _ in clinicians]          # a few clinicians get far more
cases, case_of = [], {}
n = db.cases.count_documents({})
for s in students:
    if random.random() > 0.78:
        continue                                                    # not (yet) a CPS client
    n += 1
    status = random.choices(['ACTIVE', 'CLOSED', 'PENDING_TERMINATION', 'NEW', 'INTAKE_SCHEDULED'],
                            [58, 24, 5, 8, 5])[0]
    risk = random.choices(['GREEN', 'YELLOW', 'RED', 'CRITICAL'], [45, 33, 18, 4])[0]
    counselor = random.choices(clinicians, weights)[0] if status not in ('NEW', 'INTAKE_SCHEDULED') else None
    opened = s['created_at'] + timedelta(days=random.randint(0, 30))
    c = copy.deepcopy(T['case'])
    concern = random.choice(CASE_CONCERNS)
    ic = random.choice(staff['IC'])
    c.update({
        '_id': ObjectId(), 'student_id': s['_id'], 'student_name': s['name'], 'client_name': s['name'],
        'concern': concern, 'presenting_issue': f'Student presents with {concern.lower()}.',
        'student_email': s['email'], 'assigned_counselor_id': counselor['_id'] if counselor else None,
        'intake_counselor_id': ic['_id'], 'case_status': status, 'status': status,
        'risk_level': risk, 'case_number': f'CPS-S{n:05d}', 'created_at': min(opened, UTC_NOW),
        'updated_at': min(opened, UTC_NOW), 'endorsed_to_role': counselor['role'] if counselor else None,
        'check_ins': [], 'stress_seed': True,
    })
    if counselor:
        # Interviewed and endorsed: the IC form is this student's own (template text, their details)
        (p_lo, p_hi), (g_lo, g_hi) = SCORE_BANDS[risk]
        form = c.get('intake_interview_form') or {}
        form.update({'student_name': s['name'], 'presenting_concern': concern, 'risk_level': risk,
                     'phq9_score': random.randint(p_lo, p_hi), 'gad7_score': random.randint(g_lo, g_hi),
                     'endorsed_to': counselor['role'], 'triage_decision': 'PSYCHOTHERAPY' if counselor['role'] == 'PSYCHOLOGIST' else 'COUNSELING',
                     'endorsement_notes': f"Endorsed for {'psychologist' if counselor['role'] == 'PSYCHOLOGIST' else 'counselor'} services.",
                     'ic_name': f"{ic.get('first_name', '')} {ic.get('last_name', '')}".strip(),
                     'session_date': c['created_at'].isoformat()})
        c.update({'intake_interview_form': form, 'endorsed_at': c['created_at'] + timedelta(days=random.randint(1, 4)),
                  'endorsed_by': ic['_id']})
    else:
        # Still waiting for the intake interview: nothing clinical recorded yet
        for f in ('intake_interview_form', 'treatment_plan', 'diagnoses', 'endorsed_at', 'endorsed_by'):
            c.pop(f, None)
    cases.append(c)
    case_of[s['_id']] = c
db.cases.insert_many(cases)
by_counselor = defaultdict(list)
for c in cases:
    if c['assigned_counselor_id'] and c['case_status'] in ('ACTIVE', 'PENDING_TERMINATION'):
        by_counselor[c['assigned_counselor_id']].append(c)
# Intake interviews: each case has exactly one. Past IC slots go to cases that were interviewed,
# future ones to cases still waiting, then to first-time students with no case yet.
interviewed = [c for c in cases if c['assigned_counselor_id']]
waiting = [c for c in cases if not c['assigned_counselor_id']]
newcomers = [s for s in students if s['_id'] not in case_of]
random.shuffle(interviewed); random.shuffle(waiting); random.shuffle(newcomers)
scheduled_intake = {}

# ── 5. The schedule: months of past sessions, the coming weeks almost full ───────
step('Filling every clinician schedule')
by_id = {s['_id']: s for s in students}
appts, notes = [], []
taken = defaultdict(set)                                            # counselor -> slot starts already used
for a in db.appointments.find({'status': {'$in': ['REQUESTED', 'CONFIRMED', 'APPROVED', 'MATCHED', 'CHECKED_IN']}},
                              {'counselor_id': 1, 'scheduled_start': 1, 'requested_start': 1}):
    for f in ('scheduled_start', 'requested_start'):
        if a.get('counselor_id') and a.get(f):
            taken[a['counselor_id']].add(a[f])

def appointment(tpl, student, case, counselor, start, status, purpose):
    a = copy.deepcopy(T[tpl])
    a.update({'_id': ObjectId(), 'student_id': student['_id'], 'student_name': student['name'],
              'student_email': student['email'], 'case_id': case['_id'] if case else None,
              'counselor_id': counselor['_id'], 'counselor_name': f"{counselor.get('first_name', '')} {counselor.get('last_name', '')}".strip(),
              'status': status, 'purpose': purpose, 'scheduled_start': start, 'scheduled_end': start + timedelta(minutes=50),
              'requested_start': start, 'requested_end': start + timedelta(minutes=50),
              'reference_id': f'CPS-{str(ObjectId())[-8:].upper()}', 'stress_seed': True,
              'created_at': start - timedelta(hours=8) - timedelta(days=random.randint(2, 14)),
              'updated_at': min(start - timedelta(hours=8), UTC_NOW)})
    if status in ('REQUESTED', 'PENDING_STUDENT_APPROVAL'):
        a['scheduled_start'] = a['scheduled_end'] = None if status == 'REQUESTED' else a['scheduled_start']
    return a

days = range(-args.weeks_back * 7, args.weeks_ahead * 7 + 1)
booked_future = total_future = 0
for counselor in clinicians + staff['IC']:
    blocks = schedules.get(counselor['_id']) or []
    is_ic = counselor['role'] == 'IC'
    own = by_counselor.get(counselor['_id']) or []
    for off in days:
        day = TODAY + timedelta(days=off)
        for b in (b for b in blocks if b.get('day_of_week') == day.weekday()):
            h0, h1 = int(b['start_time'][:2]), int(b['end_time'][:2])
            for h in range(h0, h1):
                start = day.replace(hour=h)
                future = start >= PH_NOW - timedelta(minutes=50)
                total_future += future
                if start in taken[counselor['_id']]:
                    booked_future += future
                    continue
                if random.random() > (args.fill if future else 0.85):
                    continue
                if is_ic:
                    if not future:
                        if not interviewed:
                            continue
                        case = interviewed.pop()
                    elif waiting:
                        case = waiting.pop()
                        scheduled_intake[case['_id']] = start
                    elif newcomers:
                        case = None
                    else:
                        continue
                    student = by_id.get(case['student_id']) if case else newcomers.pop()
                    purpose = 'intake_interview'
                else:
                    pool = own or [c for c in cases if c['case_status'] == 'ACTIVE']
                    case = random.choice(pool)
                    student = by_id.get(case['student_id'])
                    purpose = random.choices(['counseling', 'follow_up'], [70, 30])[0]
                if not student:
                    continue
                if future:
                    status = 'CHECKED_IN' if start.date() == PH_NOW.date() and start < PH_NOW else \
                        random.choices(['CONFIRMED', 'REQUESTED', 'PENDING_STUDENT_APPROVAL'], [86, 9, 5])[0]
                    booked_future += 1
                else:
                    status = random.choices(['COMPLETED', 'NO_SHOW', 'CANCELLED'], [85, 7, 8])[0]
                a = appointment('intake' if is_ic else 'confirmed', student, case, counselor, start, status, purpose)
                appts.append(a)
                taken[counselor['_id']].add(start)
                # Most past sessions have their note; the rest pile up as "pending notes"
                if status == 'COMPLETED' and not is_ic and case and random.random() < 0.82:
                    nt = copy.deepcopy(T['note'])
                    nt.update({'_id': ObjectId(), 'case_id': case['_id'], 'counselor_id': counselor['_id'],
                               'student_id': student['_id'], 'student_name': student['name'], 'appointment_id': a['_id'],
                               'session_date': start, 'mood_rating': random.randint(2, 9),
                               'risk_flagged': case['risk_level'] in ('RED', 'CRITICAL') and random.random() < 0.3,
                               'created_at': start - timedelta(hours=8) + timedelta(hours=random.randint(1, 72)),
                               'updated_at': start - timedelta(hours=8) + timedelta(hours=random.randint(1, 72)),
                               'stress_seed': True})
                    notes.append(nt)
# Cases now booked for their interview say so; the past interview dates the endorsement
bulk('cases', [UpdateOne({'_id': cid}, {'$set': {'case_status': 'INTAKE_SCHEDULED', 'status': 'INTAKE_SCHEDULED'}})
               for cid in scheduled_intake])
bulk('cases', [UpdateOne({'_id': a['case_id']}, {'$set': {
    'endorsed_at': a['scheduled_start'] - timedelta(hours=8) + timedelta(days=1),
    'intake_interview_form.session_date': a['scheduled_start'].isoformat()}})
    for a in appts if a['purpose'] == 'intake_interview' and a['case_id'] and a['status'] == 'COMPLETED'])
step(f'  {len(appts):,} appointments, {len(notes):,} session notes; '
     f'future capacity used {booked_future}/{total_future} ({100 * booked_future // max(1, total_future)}%)')
db.appointments.insert_many(appts)
db.session_notes.insert_many(notes)

# ── 6. Backlogs: unassigned requests, walk-ins waiting for an IC, the waitlist ──
step('Adding request backlog, walk-ins and waitlist')
backlog = []
concerns = ['Cannot sleep before exams', 'Breakup and feeling lost', 'Family pressure about grades',
            'Panic attacks in class', 'Feeling isolated in the dorm', 'Thinking of dropping out',
            'Grief after losing my lola', 'Burnout from org work', 'Low mood for weeks']
for s in random.sample(students, min(len(students), 260)):
    a = copy.deepcopy(T['requested'])
    pref = TODAY + timedelta(days=random.randint(1, 20), hours=random.choice([9, 10, 11, 13, 14, 15]))
    a.update({'_id': ObjectId(), 'student_id': s['_id'], 'student_name': s['name'], 'student_email': s['email'],
              'case_id': case_of[s['_id']]['_id'] if s['_id'] in case_of else None, 'counselor_id': None,
              'counselor_name': None, 'status': 'REQUESTED', 'concern': random.choice(concerns),
              'preferred_date': pref.strftime('%Y-%m-%d'), 'preferred_time': pref.strftime('%H:%M'),
              'requested_start': None, 'requested_end': None, 'reference_id': f'APT-{str(ObjectId())[-8:].upper()}',
              'created_at': UTC_NOW - timedelta(hours=random.randint(1, 240)), 'stress_seed': True})
    a['updated_at'] = a['created_at']
    backlog.append(a)
for s in random.sample(students, min(len(students), 120)):
    a = copy.deepcopy(T['intake'])
    a.update({'_id': ObjectId(), 'student_id': s['_id'], 'student_name': s['name'], 'student_email': s['email'],
              'case_id': None, 'counselor_id': None, 'status': 'REQUESTED', 'purpose': 'intake_interview',
              'is_walkin': True, 'scheduled_start': None, 'scheduled_end': None,
              'created_at': UTC_NOW - timedelta(hours=random.randint(1, 120)), 'stress_seed': True})
    a['updated_at'] = a['created_at']
    backlog.append(a)
db.appointments.insert_many(backlog)
wait = []
for pos, s in enumerate(random.sample(students, min(len(students), 150)), start=1):
    wait.append({'student_id': s['_id'], 'student_name': s['name'], 'student_email': s['email'],
                 'reason': 'No open slot this week', 'concern': random.choice(concerns),
                 'preferred_method': random.choice(['in_person', 'online']), 'position': pos, 'status': 'waiting',
                 'notes': '', 'joined_at': UTC_NOW - timedelta(hours=pos * 3), 'updated_at': UTC_NOW, 'stress_seed': True})
db.waitlist.insert_many(wait)

# ── 7. Referrals waiting for a warm handoff ─────────────────────────────────────
refs = []
for c in random.sample([c for c in cases if c['case_status'] == 'ACTIVE'], k=min(140, len(cases) // 8)):
    r = copy.deepcopy(T['referral'])
    r.update({'_id': ObjectId(), 'case_id': c['_id'], 'referring_counselor_id': c['assigned_counselor_id'],
              'status': random.choice(['SUBMITTED', 'ACKNOWLEDGED', 'IN_PROGRESS']), 'warm_handoff_completed': False,
              'urgency': random.choice(['routine', 'urgent']), 'created_at': UTC_NOW - timedelta(days=random.randint(1, 40)),
              'stress_seed': True})
    r['updated_at'] = r['created_at']
    refs.append(r)
db.referrals.insert_many(refs)

# ── 8. EMA: months of check-ins, crises, reviews (some late, some still waiting) ─
step('Generating EMA history')
LABELS = ['In Crisis', 'Struggling', 'Surviving', 'Thriving', 'Excelling']
linked = [s for s in students if s.get('mhbot_username')]
snaps, reviews, alerts, journal = [], [], [], []
crisis_students = 0
for s in linked:
    profile = random.choices(['steady', 'declining', 'volatile', 'crisis_prone', 'improving'], [45, 15, 15, 8, 17])[0]
    level = {'steady': 3.4, 'declining': 3.6, 'volatile': 2.9, 'crisis_prone': 2.2, 'improving': 2.3}[profile]
    rate = random.choice([0.15, 0.3, 0.6, 1.0, 1.6])                 # check-ins per day
    start_day = max(s['mhbot_linked_at'], UTC_NOW - timedelta(days=args.ema_days))
    pending_crisis = None
    used = set()
    day = start_day
    while day < UTC_NOW:
        drift = {'declining': -0.012, 'improving': 0.012}.get(profile, 0.0)
        level = min(4.6, max(0.6, level + drift + random.gauss(0, 0.08)))
        for _ in range(int(rate) + (random.random() < rate % 1)):
            spread = 0.9 if profile == 'volatile' else 0.6
            score = level + random.gauss(0, spread) - (1.2 if profile == 'crisis_prone' and random.random() < 0.04 else 0)
            label = LABELS[int(min(4, max(0, round(score))))]
            at = (day + timedelta(minutes=random.randint(7 * 60, 23 * 60))).replace(second=0, microsecond=0)
            if at in used or at > UTC_NOW:
                continue
            used.add(at)
            arrived = at + timedelta(minutes=random.choice([5, 30, 90, 240, 360]))
            snaps.append({'student_user_id': s['_id'], 'mhbot_username': s['mhbot_username'], 'perma_label': label,
                          'entry_date': at, 'raw_date': at.isoformat(), 'saved_at': arrived,
                          'first_seen_at': min(arrived, UTC_NOW), 'stress_seed': True})
            if label == 'In Crisis':
                pending_crisis = pending_crisis or at
                if at > UTC_NOW - timedelta(days=30):
                    alerts.append({'target_user_id': cm['_id'], 'type': 'EMA_CRISIS', 'student_id': s['_id'], 'link': '/mhbot',
                                   'title': 'Urgent: In Crisis result on EMA', 'message': f"{s['name']} had an In Crisis result on EMA",
                                   'read': at < UTC_NOW - timedelta(days=2), 'created_at': arrived, 'stress_seed': True})
        # The care team reviews crises: usually within a day, sometimes late, recent ones may still wait
        if pending_crisis:
            delay = timedelta(hours=random.choices([random.uniform(1, 20), random.uniform(24, 70), random.uniform(72, 200)], [78, 16, 6])[0])
            cleared = pending_crisis + delay + timedelta(hours=6)
            if cleared < UTC_NOW:
                reviews.append({'student_id': s['_id'], 'cleared_by': cm['_id'], 'cleared_by_role': 'CASE_MANAGER',
                                'note': 'Called the student; safe, plan reviewed.', 'cleared_at': cleared, 'stress_seed': True})
                pending_crisis = None
        day += timedelta(days=1)
    if pending_crisis:
        crisis_students += 1
    for _ in range(random.randint(0, 6)):
        j = copy.deepcopy(T['journal'])
        when = UTC_NOW - timedelta(days=random.randint(0, 90), minutes=random.randint(0, 1440))
        j.update({'_id': ObjectId(), 'student_id': s['_id'], 'mood': random.randint(1, 5), 'created_at': when,
                  'updated_at': when, 'stress_seed': True})
        journal.append(j)
step(f'  {len(snaps):,} EMA results, {len(reviews):,} crisis reviews, {crisis_students} students with an unreviewed crisis')
bulk('perma_snapshots', [InsertOne(x) for x in snaps])
if reviews:
    db.perma_crisis_reviews.insert_many(reviews)
if alerts:
    db.notifications.insert_many(alerts)
if journal:
    db.journal_entries.insert_many(journal)
last_review = {}
for r in reviews:
    last_review[r['student_id']] = max(last_review.get(r['student_id'], r['cleared_at']), r['cleared_at'])
bulk('users', [UpdateOne({'_id': sid}, {'$set': {'perma_crisis_cleared_at': at}}) for sid, at in last_review.items()])

# ── 9. Triage and the saved daily totals, exactly as the scheduler computes them ──
step('Computing EMA triage for every linked student')
from services.perma_triage import refresh_student_triage      # noqa: E402
latest = {}
for x in snaps:
    if x['mhbot_username'] not in latest or x['entry_date'] > latest[x['mhbot_username']]['entry_date']:
        latest[x['mhbot_username']] = x
bulk('users', [UpdateOne({'_id': s['_id']}, {'$set': {'perma_latest_label': latest[s['mhbot_username']]['perma_label'],
                                                      'perma_latest_date': latest[s['mhbot_username']]['entry_date'].isoformat(),
                                                      'perma_synced_at': UTC_NOW}})
               for s in linked if s['mhbot_username'] in latest])
for s in linked:
    refresh_student_triage(db, s['_id'])
step('Creating intake records for every case')
subprocess.run([sys.executable, os.path.join(HERE, 'seed_intakes.py')], env={**os.environ, 'MONGODB_DB_NAME': args.db}, check=True)
step('Saving EMA daily totals (admin trends)')
from services.ema_daily_stats import record_daily_stats     # noqa: E402
days_saved = record_daily_stats(db)

# ── Summary ───────────────────────────────────────────────────────────────────
counts = {c: db[c].estimated_document_count() for c in
          ('users', 'cases', 'appointments', 'session_notes', 'perma_snapshots', 'perma_crisis_reviews',
           'referrals', 'waitlist', 'notifications', 'journal_entries', 'ema_daily_stats')}
triage = defaultdict(int)
for u in db.users.find({'role': 'STUDENT', 'perma_triage.label': {'$exists': True}}, {'perma_triage': 1}):
    triage[u['perma_triage']['label']] += 1
pending = db.users.count_documents({'perma_triage.crisis_pending_review': True})
loads = sorted(((len(v), k) for k, v in by_counselor.items()), reverse=True)
names = {u['_id']: f"{u.get('first_name', '')} {u.get('last_name', '')}".strip() for u in clinicians}
print('\n' + '=' * 64)
print(f'Stress database ready: {args.db}  ({time.time() - t0:.0f}s, {days_saved} days of EMA totals)')
print('=' * 64)
for k, v in counts.items():
    print(f'  {k:22} {v:>9,}')
print(f"  EMA triage now        {dict(triage)}  · {pending} crises waiting for review")
print(f"  Heaviest caseloads    {', '.join(f'{names.get(k, k)} {n}' for n, k in loads[:3])}")
print(f'  Future slots booked   {booked_future}/{total_future} ({100 * booked_future // max(1, total_future)}%)')
print(f"\nStaff log in as usual (README). Any stress student: {students[0]['email']} / stress123")
print(f'Run the app on it:  DEV_DB_NAME={args.db} backend/venv/bin/python backend/app.py')
