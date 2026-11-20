#!/usr/bin/env python3
"""
Realism pass: makes the seeded appointments and analytics look like a real counseling office.
Run after the other seeds (seed_all.py does this for you).

What it does:
  * fills in each case's session history: weekly to fortnightly sessions, more often for higher risk,
    fewer during term breaks and more around midterms and finals (DLSU trimester calendar)
  * realistic outcomes: about 82% completed, 10% no-show, 8% cancelled; no-shows update the
    missed-appointment tracker the same way the app does
  * a session note for every completed session, with mood improving gradually over the case
  * session ratings from about 55% of completed sessions, mostly 4-5 with some 3s and the odd 2
  * about a third of students meet online (per student, not per session); one spelling for in-person
  * case sources: self, faculty, walk-in, peer and parent referrals

Usage:
    python scripts/seed_realism.py
"""
import copy
import os
import random
import uuid
from collections import Counter
from datetime import datetime, timedelta

from pymongo import MongoClient

MONGO_URI = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('MONGODB_DB_NAME', 'cps_system_dev')
db = MongoClient(MONGO_URI)[DB_NAME]
rng = random.Random(7)
now = datetime.utcnow().replace(second=0, microsecond=0)
print(f"🔌 {MONGO_URI}  📦 {DB_NAME}")

# Share of weeks a student keeps their session, by month (DLSU: Term 3 May-Aug, break late Aug,
# Term 1 from September with midterms in October and finals in December)
SEASON = {1: 0.8, 2: 0.95, 3: 1.0, 4: 0.85, 5: 0.75, 6: 0.85, 7: 0.9, 8: 0.6, 9: 0.85, 10: 1.1, 11: 1.15, 12: 0.7}
CADENCE = {'RED': 0.9, 'YELLOW': 0.65, 'GREEN': 0.45}          # chance of a session in a given week
TARGET = {'RED': (7, 10), 'YELLOW': (5, 8), 'GREEN': (3, 5)}     # sessions over a case
MOOD_START = {'RED': 3, 'YELLOW': 4, 'GREEN': 5}                # 1-10 session mood rating
HOURS = [9, 10, 11, 13, 14, 15, 16]
LIKED = ['The breathing exercise really helped.', 'I felt listened to.', 'Clear next steps for the week.',
         'My counselor remembered what we talked about last time.', 'It was easier to talk than I expected.']
IMPROVE = ['Nothing, it was good.', 'Sessions could be a bit longer.', 'Sometimes hard to find a quiet room for online.',
           'Starting on time.', '']
CANCEL_REASONS = ['Exam schedule conflict', 'Feeling unwell', 'Class make-up session', 'Family matter']

# ── 0. Each case keeps a regular weekday ───────────────────────────────────────
# seed.py places sessions "N weeks ago", which all land on the weekday the seed runs. Real clients keep
# a standing slot, so move each past session to its case's own weekday in the same week (notes and
# ratings move with it).
standing = {}
moved = 0
for a in db.appointments.find({'scheduled_start': {'$lt': now - timedelta(days=3)}, 'case_id': {'$ne': None}}):
    day = standing.setdefault(a['case_id'], rng.choices(range(5), weights=[10, 12, 12, 12, 8])[0])
    old = a['scheduled_start']
    new = old + timedelta(days=day - old.weekday())
    if new == old or new >= now - timedelta(days=1) or db.appointments.find_one(
            {'counselor_id': a.get('counselor_id'), 'scheduled_start': new, '_id': {'$ne': a['_id']}}):
        continue
    delta = new - old
    upd = {'scheduled_start': new, 'scheduled_end': (a.get('scheduled_end') or old) + delta,
           'created_at': (a.get('created_at') or old) + delta, 'updated_at': (a.get('updated_at') or old) + delta}
    if (a.get('evaluation') or {}).get('submitted_at'):
        upd['evaluation.submitted_at'] = a['evaluation']['submitted_at'] + delta
    db.appointments.update_one({'_id': a['_id']}, {'$set': upd})
    for n in db.session_notes.find({'case_id': a['case_id'], 'session_date': old}):
        db.session_notes.update_one({'_id': n['_id']}, {'$set': {
            'session_date': new, 'created_at': n['created_at'] + delta, 'updated_at': n['updated_at'] + delta}})
    moved += 1
print(f"✅ {moved} past sessions moved to each case's regular weekday")

# ── 1. One spelling for in-person, and fill gaps ───────────────────────────────
db.appointments.update_many({'method': {'$in': ['in-person', 'IN_PERSON', 'F2F', 'f2f', 'face-to-face']}},
                            {'$set': {'method': 'in_person'}})
db.appointments.update_many({'$or': [{'method': None}, {'method': {'$exists': False}}]}, {'$set': {'method': 'in_person'}})
db.appointments.update_many({'$or': [{'purpose': None}, {'purpose': {'$exists': False}}]}, {'$set': {'purpose': 'counseling'}})

# ── 2. About a third of students meet online, consistently ─────────────────────
students = list(db.users.find({'role': 'STUDENT'}, {'_id': 1}))
online_students = {s['_id'] for s in students if rng.random() < 0.2}    # ~a third of sessions
db.appointments.update_many({'student_id': {'$in': list(online_students)}, 'purpose': {'$ne': 'intake_interview'}},
                            {'$set': {'method': 'online', 'preferred_method': 'online', 'preferred_platform': 'google_meet'}})

# ── 3. Case sources ────────────────────────────────────────────────────────────
SOURCES = ['SELF_REFERRAL'] * 11 + ['FACULTY_REFERRAL'] * 4 + ['WALK_IN'] * 2 + ['PEER_REFERRAL'] * 2 + ['PARENT_GUARDIAN']
for c in db.cases.find({}, {'_id': 1}):
    db.cases.update_one({'_id': c['_id']}, {'$set': {'source': rng.choice(SOURCES)}})


# ── 4. Session history per case ────────────────────────────────────────────────
def evaluation(online, end):
    overall = rng.choices([5, 4, 3, 2], weights=[55, 33, 9, 3])[0]
    near = lambda: max(1, min(5, overall + rng.choice([0, 0, 0, 1, -1])))
    return {'counselor_attitude': near(), 'online_communication': near() if online else 0,
            'counseling_objectives': near(), 'techniques_used': near(), 'overall_experience': overall,
            'liked_most': rng.choice(LIKED), 'to_improve': rng.choice(IMPROVE),
            'submitted_at': min(now, end + timedelta(hours=rng.randint(1, 48))), 'seeded': True}


def busy(counselor_id, start):
    return db.appointments.find_one({'counselor_id': counselor_id, 'scheduled_start': start,
                                     'status': {'$nin': ['CANCELLED']}}) is not None


any_note = db.session_notes.find_one({'structured_soap': {'$exists': True}})
added, notes, no_shows = Counter(), 0, 0
for case in db.cases.find({'case_status': {'$in': ['ACTIVE', 'PENDING_TERMINATION', 'CLOSED']},
                           'assigned_counselor_id': {'$ne': None}}):
    risk = case.get('risk_level') or 'GREEN'
    start = case.get('endorsed_at') or case.get('created_at')
    end = now - timedelta(hours=2)
    if case.get('case_status') == 'CLOSED' and case.get('termination_date'):
        end = min(end, datetime.strptime(case['termination_date'], '%Y-%m-%d'))
    if not start or start >= end:
        continue
    existing = list(db.appointments.find({'case_id': case['_id']}).sort('scheduled_start', 1))
    template = next((a for a in existing if a.get('purpose') in ('counseling', 'follow_up')), None)
    if not template:
        continue
    template = {k: v for k, v in template.items() if k not in ('_id', 'evaluation', 'cancellation_reason', 'cancelled_at')}
    note_template = db.session_notes.find_one({'case_id': case['_id']}) or any_note
    online = case['student_id'] in online_students
    target = rng.randint(*TARGET.get(risk, (3, 5)))
    done = sum(1 for a in existing if a.get('status') == 'COMPLETED')
    taken = [a['scheduled_start'] for a in existing if a.get('scheduled_start')]
    mood = MOOD_START.get(risk, 5) + rng.uniform(-0.5, 0.5)
    week = start + timedelta(days=7)
    while week < end and done < target:
        if rng.random() < CADENCE.get(risk, 0.5) * SEASON[week.month] and \
                not any(abs((t - week).days) < 5 for t in taken):
            day = week - timedelta(days=week.weekday()) + timedelta(days=rng.randint(0, 4))
            when = day.replace(hour=rng.choice(HOURS), minute=0)
            if when < end and when >= start and not busy(case['assigned_counselor_id'], when):
                status = rng.choices(['COMPLETED', 'NO_SHOW', 'CANCELLED'], weights=[82, 10, 8])[0]
                appt = copy.deepcopy(template)
                appt.update({'status': status, 'purpose': 'follow_up' if done else 'counseling',
                             'method': 'online' if online else 'in_person',
                             'scheduled_start': when, 'scheduled_end': when + timedelta(minutes=50),
                             'created_at': when - timedelta(days=rng.randint(2, 10)), 'updated_at': when + timedelta(minutes=50),
                             'reference_id': 'APT-' + uuid.UUID(int=rng.getrandbits(128)).hex[:8].upper(), 'seeded': True})
                if online:
                    appt.update({'preferred_method': 'online', 'preferred_platform': 'google_meet'})
                if status == 'CANCELLED':
                    appt.update({'cancellation_reason': rng.choice(CANCEL_REASONS),
                                 'cancelled_at': when - timedelta(days=rng.randint(1, 3))})
                if status == 'COMPLETED' and rng.random() < 0.55:
                    appt['evaluation'] = evaluation(online, when + timedelta(minutes=50))
                appt_id = db.appointments.insert_one(appt).inserted_id
                taken.append(when)
                added[status] += 1
                if status == 'COMPLETED':
                    done += 1
                    mood = min(9.0, mood + rng.uniform(0.2, 0.9))     # gradual improvement, with ups and downs
                    if note_template:
                        note = {k: v for k, v in note_template.items() if k != '_id'}
                        rating = max(1, min(10, round(mood + rng.uniform(-1, 1))))
                        note.update({'case_id': case['_id'], 'counselor_id': case['assigned_counselor_id'],
                                     'student_id': case['student_id'], 'student_name': appt.get('student_name'),
                                     'session_date': when, 'mood_rating': rating,
                                     'risk_flagged': risk == 'RED' and rating <= 3 and rng.random() < 0.5,
                                     'created_at': when + timedelta(hours=rng.randint(1, 20)),
                                     'updated_at': when + timedelta(hours=rng.randint(1, 20)), 'edit_history': []})
                        db.session_notes.insert_one(note)
                        notes += 1
                elif status == 'NO_SHOW':
                    no_shows += 1
                    tracker = db.missed_appointment_tracker.find_one({'case_id': case['_id']})
                    if tracker:
                        db.missed_appointment_tracker.update_one({'_id': tracker['_id']}, {
                            '$inc': {'no_show_count': 1, 'consecutive_no_shows': 1}, '$set': {'last_no_show_at': when}})
                    else:
                        db.missed_appointment_tracker.insert_one({
                            'case_id': case['_id'], 'appointment_id': appt_id, 'no_show_count': 1,
                            'consecutive_no_shows': 1, 'last_no_show_at': when, 'created_at': when})
        week += timedelta(days=7)
    # A session attended after a no-show resets the consecutive count, as it does in the app
    last = db.appointments.find_one({'case_id': case['_id'], 'status': {'$in': ['COMPLETED', 'NO_SHOW']}},
                                    sort=[('scheduled_start', -1)])
    if last and last['status'] == 'COMPLETED':
        db.missed_appointment_tracker.update_many({'case_id': case['_id']}, {'$set': {'consecutive_no_shows': 0}})

print(f"✅ {sum(added.values())} past sessions added ({dict(added)}), {notes} session notes")

# ── 5. About 55% of completed sessions get rated ───────────────────────────────
completed = db.appointments.count_documents({'status': 'COMPLETED'})
missing = round(completed * 0.55) - db.appointments.count_documents({'status': 'COMPLETED', 'evaluation': {'$exists': True}})
unrated = list(db.appointments.find({'status': 'COMPLETED', 'evaluation': {'$exists': False}},
                                    {'method': 1, 'scheduled_end': 1, 'scheduled_start': 1}))
for a in rng.sample(unrated, max(0, min(missing, len(unrated)))):
    db.appointments.update_one({'_id': a['_id']}, {'$set': {'evaluation': evaluation(
        a.get('method') == 'online', a.get('scheduled_end') or a['scheduled_start'])}})
if missing < 0:                                     # earlier seeds rated more than students usually do
    rated = list(db.appointments.find({'status': 'COMPLETED', 'evaluation': {'$exists': True}}, {'_id': 1}))
    drop = [a['_id'] for a in rng.sample(rated, -missing)]
    db.appointments.update_many({'_id': {'$in': drop}}, {'$unset': {'evaluation': ''}})

# ── 6. About 10% no-shows ──────────────────────────────────────────────────────
# Only sessions this pass added, so their note and rating can go with them; never the last 3 days
past = {'scheduled_start': {'$lt': now - timedelta(days=3)}}
outcomes = db.appointments.count_documents({**past, 'status': {'$in': ['COMPLETED', 'NO_SHOW', 'CANCELLED']}})
extra = round(outcomes * 0.10) - db.appointments.count_documents({**past, 'status': 'NO_SHOW'})
pool = list(db.appointments.find({**past, 'status': 'COMPLETED', 'seeded': True}))
for a in rng.sample(pool, max(0, min(extra, len(pool)))):
    db.appointments.update_one({'_id': a['_id']}, {'$set': {'status': 'NO_SHOW'}, '$unset': {'evaluation': ''}})
    db.session_notes.delete_many({'case_id': a['case_id'], 'session_date': a['scheduled_start']})
    db.missed_appointment_tracker.update_one(
        {'case_id': a['case_id']},
        {'$inc': {'no_show_count': 1}, '$max': {'last_no_show_at': a['scheduled_start']},
         '$setOnInsert': {'appointment_id': a['_id'], 'consecutive_no_shows': 0, 'created_at': a['scheduled_start']}},
        upsert=True)
    no_shows += 1
print(f"✅ {db.appointments.count_documents({**past, 'status': 'NO_SHOW'})} no-shows of {outcomes} past sessions")

print(f"✅ {db.appointments.count_documents({'evaluation': {'$exists': True}})} of {completed} completed sessions rated")
print(f"✅ online {db.appointments.count_documents({'method': 'online'})} / in person "
      f"{db.appointments.count_documents({'method': 'in_person'})}; case sources mixed")
