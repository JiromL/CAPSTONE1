#!/usr/bin/env python3
"""
EMA seed: makes the seeded EMA data follow the app's real triage rules.
Run after seed.py (seed_all.py does this for you).

What it adds:
  * EMA consent for every linked student (CPS never links an EMA account without it)
  * first_seen_at on every EMA result: results reach CPS minutes (webhook) to hours (6-hourly sync)
    after the check-in, and crisis reviews only cover results that had arrived
  * older history (up to ~4 months) so monthly trends have data
  * one student for each triage situation (see SCENARIOS below)
  * crisis reviews with notes, by the student's own clinician or the case manager, for crises
    that staff would already have handled; the newest crises are left for the queue
  * journal entries, including copies saved from EMA check-ins
  * triage labels computed with the app's own rules (backend/services/perma_triage.py)

Usage:
    python scripts/seed_ema.py
"""
import os
import random
import sys
import uuid
from datetime import datetime, timedelta

from pymongo import MongoClient

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend'))
from services.perma_triage import LABEL_SCORE, refresh_all_triage  # noqa: E402

MONGO_URI = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('MONGODB_DB_NAME', 'cps_system_dev')
db = MongoClient(MONGO_URI)[DB_NAME]
rng = random.Random(2026)
now = datetime.utcnow().replace(second=0, microsecond=0)
LABELS = ['In Crisis', 'Struggling', 'Surviving', 'Thriving', 'Excelling']
EMA_CONSENT_VERSION = '2.1'   # matches backend/blueprints/mhbot_integration.py

print(f"🔌 {MONGO_URI}  📦 {DB_NAME}")


def user(email):
    u = db.users.find_one({'email': email})
    if not u:
        sys.exit(f"✗ {email} not found. Run scripts/seed.py first.")
    return u


def case_of(student_id):
    return db.cases.find_one({'student_id': student_id}, sort=[('created_at', -1)])


def ago(hours=0, days=0):
    return now - timedelta(days=days, hours=hours)


def arrival(entry_date):
    """Most results come in by webhook within minutes; some wait for the next 6-hourly sync."""
    if rng.random() < 0.7:
        return entry_date + timedelta(minutes=rng.randint(1, 15))
    next_sync = entry_date.replace(minute=0) + timedelta(hours=6 - entry_date.hour % 6)
    return next_sync + timedelta(minutes=rng.randint(0, 10))


if db.perma_snapshots.find_one({'first_seen_at': {'$exists': True}}):
    sys.exit("✗ EMA seed already applied. Run scripts/seed_all.py to rebuild everything from scratch.")

cm = user('cm@dlsu.edu.ph')
linked = list(db.users.find({'role': 'STUDENT', 'mhbot_username': {'$nin': [None, '']}}))
if not linked:
    sys.exit("✗ No EMA-linked students. Run scripts/seed.py first.")

db.perma_crisis_reviews.delete_many({})
db.users.update_many({'role': 'STUDENT'}, {'$unset': {'perma_crisis_cleared_at': '', 'perma_triage': '',
                                                      'perma_triage_label': ''}})

# ── 1. Older history so monthly trends have more than one month ─────────────────
older = 0
for s in linked:
    snaps = list(db.perma_snapshots.find({'student_user_id': s['_id']}).sort('entry_date', 1))
    if not snaps:
        continue
    first = snaps[0]['entry_date']
    base = sum(LABEL_SCORE[x['perma_label']] for x in snaps) / len(snaps) - 1   # 0..4
    cur = base
    for day in range(120, (now - first).days, -1):
        if rng.random() > 0.5:          # older check-ins are sparser
            continue
        cur = max(0.0, min(4.0, cur + (base - cur) * 0.3 + rng.uniform(-0.6, 0.6)))
        when = ago(days=day).replace(hour=rng.randint(7, 22), minute=rng.randint(0, 59))
        db.perma_snapshots.insert_one({
            'student_user_id': s['_id'], 'mhbot_username': s['mhbot_username'],
            'perma_label': LABELS[round(cur)], 'entry_date': when, 'raw_date': when.isoformat(),
            'saved_at': when, 'source': 'sync',
        })
        older += 1
print(f"✅ {older} older EMA results added (history now reaches ~4 months)")

# ── 1b. Make the history realistic ──────────────────────────────────────────────
# seed.py writes check-in hours as Philippine time, but the app stores UTC: shift them back
# 8 hours. Some check-ins happen late at night, and hard moments more often, so a share of
# results move to 9 PM–2 AM (more of the at-risk ones).
for snap in db.perma_snapshots.find({}, {'entry_date': 1, 'perma_label': 1}):
    when = snap['entry_date'] - timedelta(hours=8)
    late = 0.35 if snap['perma_label'] in ('Struggling', 'In Crisis') else 0.12   # some students write at night anyway
    if rng.random() < late:
        local_hour = rng.choice([21, 22, 23, 0, 1])
        manila = (when + timedelta(hours=8)).replace(hour=local_hour, minute=rng.randint(0, 59))
        when = manila - timedelta(hours=8)
    when = min(when, now - timedelta(minutes=5))
    db.perma_snapshots.update_one({'_id': snap['_id']}, {'$set': {
        'entry_date': when, 'raw_date': when.isoformat(), 'saved_at': when}})

# A crisis almost every day is not realistic: most bad days are Struggling, not In Crisis
for snap in db.perma_snapshots.find({'perma_label': 'In Crisis'}, {'_id': 1}):
    if rng.random() < 0.75:
        db.perma_snapshots.update_one({'_id': snap['_id']}, {'$set': {'perma_label': 'Struggling'}})

# Students skip weeks and some stop checking in
scenario_emails = {'msantos2', 'achen', 'msmith', 'cdiaz', 'msantos', 'hsantos', 'jvillanueva', 'ncruz'}
others = [s for s in linked if s['email'].split('@')[0] not in scenario_emails]
rng.shuffle(others)
for s in others[:10]:                      # a 2–4 week break somewhere in the past
    start = ago(days=rng.randint(30, 110))
    db.perma_snapshots.delete_many({'student_user_id': s['_id'], 'entry_date': {
        '$gte': start, '$lt': start + timedelta(days=rng.randint(14, 28))}})
for s in others[10:14]:                    # stopped checking in 2–3 weeks ago
    db.perma_snapshots.delete_many({'student_user_id': s['_id'], 'entry_date': {'$gte': ago(days=rng.randint(14, 21))}})
print("✅ History made realistic (Philippine times, fewer crises, gaps and drop-offs)")

# Students chat with EMA many times on some days: every finished chat is its own result.
# About a third of days get 1–5 more chats a few hours apart, mostly a similar result.
extra = 0
for snap in list(db.perma_snapshots.find({'entry_date': {'$gte': ago(days=90)}})):
    if rng.random() > 0.33:
        continue
    base = LABELS.index(snap['perma_label'])
    when = snap['entry_date']
    for _ in range(rng.randint(1, 5)):
        when = when + timedelta(minutes=rng.randint(20, 240))
        if when > now - timedelta(minutes=5) or (when + timedelta(hours=8)).date() != (snap['entry_date'] + timedelta(hours=8)).date():
            break                                          # stay on the same Philippine day
        step = rng.choices([0, 1, -1], weights=[6, 2, 2])[0]
        label = LABELS[max(1 if base else 0, min(4, base + step))]   # extra chats rarely add a new crisis
        db.perma_snapshots.insert_one({
            'student_user_id': snap.get('student_user_id'), 'mhbot_username': snap['mhbot_username'],
            'perma_label': label, 'entry_date': when, 'raw_date': when.isoformat(), 'saved_at': when, 'source': 'webhook'})
        extra += 1
print(f"✅ {extra} extra same-day chats (students using EMA several times a day)")

# ── 2. One student per triage situation ─────────────────────────────────────────
# Each scenario replaces the student's last 10 days with a scripted sequence.
# (label, hours ago it happened, hours ago it reached CPS or None = within minutes)
SCENARIOS = {
    # Fresh crisis, nobody has reviewed it yet: top of the CM Queue
    'msantos2@dlsu.edu.ph': ('Unreviewed crisis (2 hours ago)', [
        ('Struggling', 5 * 24, None), ('Struggling', 3 * 24, None), ('In Crisis', 2, None)]),
    # Crisis waiting for review for more than a day: overdue in follow-up stats
    'achen@dlsu.edu.ph': ('Unreviewed crisis, overdue (2 days)', [
        ('Struggling', 6 * 24, None), ('In Crisis', 2 * 24 + 3, None), ('Struggling', 30, None),
        ('Surviving', 6, None)]),
    # Crisis reviewed 3 days ago: counts as Struggling for the rest of the 7 days
    'msmith@dlsu.edu.ph': ('Reviewed crisis, now Struggling', [
        ('Struggling', 6 * 24, None), ('In Crisis', 3 * 24 + 4, None), ('Surviving', 2 * 24, None),
        ('Thriving', 20, None)]),
    # Reviewed, then in crisis again: back on top, red in "Recently reviewed"
    'cdiaz@dlsu.edu.ph': ('Reviewed, then in crisis again', [
        ('In Crisis', 9 * 24, None), ('Struggling', 7 * 24, None), ('Surviving', 4 * 24, None),
        ('In Crisis', 20, None)]),
    # A crisis that reached CPS after a review must not count as reviewed
    'msantos@dlsu.edu.ph': ('Late-arriving crisis stays unreviewed', [
        ('In Crisis', 4 * 24, None), ('Struggling', 2 * 24, None),
        ('In Crisis', 30, 24)]),      # happened 30h ago, synced in 24h ago, after the 28h-ago review
    # 3 Struggling results in 7 days: persistent_struggle flag, label stays Struggling
    'hsantos@dlsu.edu.ph': ('Persistent struggle', [
        ('Surviving', 8 * 24, None), ('Struggling', 6 * 24, None), ('Struggling', 4 * 24, None),
        ('Surviving', 3 * 24, None), ('Struggling', 26, None)]),
    # Same-day swing of 3 levels: unstable_mood flag
    'jvillanueva@dlsu.edu.ph': ('Unstable mood (same-day swing)', [
        ('Thriving', 5 * 24, None), ('Struggling', 'swing-am', None), ('Excelling', 'swing-pm', None),
        ('Thriving', 12, None)]),
    # No check-in for 12 days: label falls back to the last result, marked stale
    'ncruz@dlsu.edu.ph': ('No recent check-in (stale)', [
        ('Surviving', 15 * 24, None), ('Struggling', 12 * 24, None)]),
}
SWING_DAY = ago(days=2).replace(minute=0)
AT = {'swing-am': SWING_DAY.replace(hour=1), 'swing-pm': SWING_DAY.replace(hour=11)}   # same UTC day


def at(h):
    return AT[h] if isinstance(h, str) else ago(hours=h)


scenario_ids, window_start = {}, {}
for email, (title, seq) in SCENARIOS.items():
    s = user(email)
    scenario_ids[s['_id']] = title
    start = min(at(h) for _, h, _ in seq) - timedelta(days=1)
    window_start[s['_id']] = start
    db.perma_snapshots.delete_many({'student_user_id': s['_id'], 'entry_date': {'$gte': start}})
    for label, h, arrived_h in seq:
        when = at(h)
        db.perma_snapshots.insert_one({
            'student_user_id': s['_id'], 'mhbot_username': s['mhbot_username'], 'perma_label': label,
            'entry_date': when, 'raw_date': when.isoformat(), 'saved_at': when,
            'source': 'sync' if arrived_h else 'webhook',
            'first_seen_at': ago(hours=arrived_h) if arrived_h else when + timedelta(minutes=rng.randint(1, 10)),
        })
print(f"✅ {len(SCENARIOS)} triage scenario students scripted")

# ── 3. When each result reached CPS ─────────────────────────────────────────────
for snap in db.perma_snapshots.find({'first_seen_at': {'$exists': False}}, {'entry_date': 1}):
    db.perma_snapshots.update_one({'_id': snap['_id']}, {'$set': {'first_seen_at': arrival(snap['entry_date'])}})

# ── 4. EMA consent: CPS only links students who agreed ──────────────────────────
for s in linked:
    first = db.perma_snapshots.find_one({'student_user_id': s['_id']}, sort=[('entry_date', 1)])
    linked_at = (first['entry_date'] if first else now) - timedelta(days=1)
    db.consent_records.insert_one({
        'user_id': s['_id'], 'consent_types': ['ema_data_linking'], 'consented_at': linked_at,
        'ip_address': '127.0.0.1', 'user_agent': 'seed', 'version': EMA_CONSENT_VERSION,
    })
    db.users.update_one({'_id': s['_id']}, {'$set': {
        'ema_consent_given': True, 'ema_consent_given_at': linked_at, 'mhbot_linked_at': linked_at}})
print(f"✅ EMA consent recorded for {len(linked)} linked students")

# ── 5. Crisis reviews ───────────────────────────────────────────────────────────
NOTES = [
    'Called the student within the hour. Safe and with a roommate. Reviewed the safety plan and moved the next session up to tomorrow.',
    'Reached the student by phone. Denies current intent. Parent informed with the student\'s consent. Next session confirmed.',
    'Student came in for a walk-in check. Safety plan updated and coping steps rehearsed. Agreed to daily EMA check-ins this week.',
    'Texted, then called. Hard night after an exam; settled by the end of the call. Follow-up booked for Thursday.',
    'Welfare check done with the residence hall adviser. Student safe. Will check in again after the weekend.',
]


def reviewer_for(student_id):
    """The student's own clinician on an open case, otherwise the case manager."""
    c = case_of(student_id)
    if c and (c.get('case_status') or c.get('status')) not in ('CLOSED', 'CANCELLED') and c.get('assigned_counselor_id'):
        clinician = db.users.find_one({'_id': c['assigned_counselor_id']}, {'role': 1})
        if clinician and clinician.get('role') in ('COUNSELOR', 'PSYCHOLOGIST') and rng.random() < 0.7:
            return clinician['_id'], clinician['role']
    return cm['_id'], 'CASE_MANAGER'


def add_review(student_id, at, note=None):
    by, role = reviewer_for(student_id)
    db.perma_crisis_reviews.insert_one({'student_id': student_id, 'cleared_by': by, 'cleared_by_role': role,
                                        'note': note or rng.choice(NOTES), 'cleared_at': at})
    db.users.update_one({'_id': student_id}, {'$max': {'perma_crisis_cleared_at': at}})


# Scripted reviews for the scenario students
add_review(user('msmith@dlsu.edu.ph')['_id'], ago(hours=3 * 24 + 1))
add_review(user('cdiaz@dlsu.edu.ph')['_id'], ago(hours=8 * 24 + 2))
add_review(user('msantos@dlsu.edu.ph')['_id'], ago(hours=28),
           'Followed up on Monday\'s crisis by phone. Student safe; safety plan reviewed and session set for Friday.')

# Crises older than 3 days were handled by staff; newer ones wait in the queue. For scenario
# students only the history before their scripted week is reviewed here.
# One review covers every crisis that had reached CPS by then, as in the app.
reviews = 3
for s in linked:
    cutoff = window_start[s['_id']] - timedelta(hours=12) if s['_id'] in scenario_ids else ago(days=3)
    covered_until = None
    for snap in db.perma_snapshots.find({'student_user_id': s['_id'], 'perma_label': 'In Crisis'}).sort('first_seen_at', 1):
        if covered_until and snap['first_seen_at'] <= covered_until:
            continue
        reviewed_at = snap['first_seen_at'] + timedelta(hours=rng.uniform(0.5, 20))
        if reviewed_at > cutoff:
            break
        add_review(s['_id'], reviewed_at)
        covered_until = reviewed_at
        reviews += 1
print(f"✅ {reviews} crisis reviews with follow-up notes")

# ── 5b. Follow-up sessions after reviewed crises ────────────────────────────────
# A review handles the alert; the clinician then sees the student. Most students with an open
# case get a completed session 1–4 days after the crisis. Carlos Diaz is left without one so
# the "not seen yet" list in EMA analytics has a real example.
no_session = {user('cdiaz@dlsu.edu.ph')['_id']}
sessions = 0
for r in db.perma_crisis_reviews.find().sort('cleared_at', 1):
    case = case_of(r['student_id'])
    if (r['student_id'] in no_session or not case or not case.get('assigned_counselor_id')
            or (case.get('case_status') or '') not in ('NEW', 'INTAKE_SCHEDULED', 'ACTIVE', 'PENDING_TERMINATION')
            or rng.random() > 0.8):
        continue
    start = (r['cleared_at'] + timedelta(days=rng.randint(1, 3))).replace(hour=rng.choice([9, 10, 11, 13, 14, 15]), minute=0)
    while start.weekday() >= 5:                      # CPS sessions run Monday to Friday
        start += timedelta(days=1)
    if start > now - timedelta(hours=2):
        continue
    if db.appointments.find_one({'student_id': r['student_id'], 'scheduled_start': {'$gte': start - timedelta(days=1),
                                                                                    '$lte': start + timedelta(days=1)}}):
        continue                                     # already has a session around then
    student = db.users.find_one({'_id': r['student_id']}, {'name': 1})
    db.appointments.insert_one({
        'student_id': r['student_id'], 'counselor_id': case['assigned_counselor_id'], 'case_id': case['_id'],
        'student_name': student['name'], 'status': 'COMPLETED', 'purpose': 'follow_up', 'method': 'in_person',
        'scheduled_start': start, 'scheduled_end': start + timedelta(minutes=50),
        'notes': 'Follow-up after an EMA crisis alert.',
        'created_at': r['cleared_at'], 'updated_at': start + timedelta(minutes=50),
    })
    sessions += 1
print(f"✅ {sessions} completed follow-up sessions after reviewed crises")

# ── 6. Journal entries (private to each student) ────────────────────────────────
JOURNAL = [
    (4, ['school'], 'Finished the problem set early for once. Took a walk after instead of scrolling.'),
    (3, ['school', 'sleep'], 'Slept late again. The thesis feels big, but I wrote two pages, so that counts.'),
    (2, ['family'], 'Another argument at home. I stayed in my room and tried the breathing exercise. It helped a little.'),
    (4, ['friends'], 'Lunch with the org friends. I talked more than usual and it felt okay.'),
    (3, ['stress'], 'Quiz tomorrow. Made a short plan: review notes, sleep by 12. Writing it down makes it smaller.'),
    (5, ['gratitude'], 'Three good things: coffee with Mia, a decent quiz score, and the rain stopped before class.'),
]
LABEL_MOOD = {'Excelling': 5, 'Thriving': 4, 'Surviving': 3, 'Struggling': 2, 'In Crisis': 1}
EMA_TEXT = {
    'Struggling': 'Today was heavy. Ema helped me name what was weighing on me: the deadline and feeling behind. One small step for tomorrow: email my adviser.',
    'Surviving': 'Getting through the week. I noticed I feel better on days I eat breakfast and get outside, even briefly.',
    'Thriving': 'Good day overall. I want to keep the routine that is working: study block in the morning, gym after class.',
    'Excelling': 'I felt proud of how I handled the presentation. Writing this down to remember it on harder days.',
}
journal_count = 0
for s in rng.sample(linked, min(14, len(linked))):
    for _ in range(rng.randint(2, 4)):
        mood, tags, text = rng.choice(JOURNAL)
        when = ago(days=rng.randint(1, 30)).replace(hour=rng.randint(19, 23), minute=rng.randint(0, 59))
        db.journal_entries.insert_one({'student_id': s['_id'], 'mood': mood, 'content': text, 'tags': tags,
                                       'is_private': True, 'attachments': [], 'created_at': when, 'updated_at': when})
        journal_count += 1
    # A copy saved from an EMA check-in (the "Also save to my CPS journal" box), never for In Crisis
    snap = db.perma_snapshots.find_one({'student_user_id': s['_id'], 'perma_label': {'$in': list(EMA_TEXT)},
                                        'entry_date': {'$gte': ago(days=21)}}, sort=[('entry_date', -1)])
    if snap:
        at = snap['first_seen_at'] + timedelta(minutes=2)
        db.journal_entries.insert_one({
            'student_id': s['_id'], 'mood': LABEL_MOOD[snap['perma_label']], 'content': EMA_TEXT[snap['perma_label']],
            'tags': [snap['perma_label']], 'is_private': True, 'attachments': [], 'source': 'ema',
            'ema_conversation_id': str(uuid.UUID(int=rng.getrandbits(128))), 'created_at': at, 'updated_at': at})
        journal_count += 1
print(f"✅ {journal_count} journal entries (some saved from EMA check-ins)")

# ── 7. Latest result + triage labels, computed with the app's rules ─────────────
for s in linked:
    last = db.perma_snapshots.find_one({'student_user_id': s['_id']}, sort=[('entry_date', -1)])
    if last:
        db.users.update_one({'_id': s['_id']}, {'$set': {
            'perma_latest_label': last['perma_label'], 'perma_latest_date': last['entry_date'].isoformat()}})
refresh_all_triage(db)

# ── 8. The crisis alerts the app would have sent (in-app only; seeding never emails) ──
from services.crisis_alerts import _recipients, ALERT_TYPE   # noqa: E402
alerts = 0
for s in db.users.find({'role': 'STUDENT', 'perma_triage.crisis_pending_review': True}, {'name': 1, 'perma_triage': 1}):
    crisis = db.perma_snapshots.find_one({'student_user_id': s['_id'], 'perma_label': 'In Crisis'}, sort=[('entry_date', -1)])
    if not crisis:
        continue
    at = crisis['first_seen_at'] + timedelta(minutes=1)
    when = (crisis['entry_date'] + timedelta(hours=8)).strftime('%b %d, %I:%M %p')
    for user_id, _, link in _recipients(db, s['_id']):
        db.notifications.insert_one({
            'target_user_id': str(user_id), 'type': ALERT_TYPE, 'student_id': s['_id'], 'link': link,
            'title': 'Urgent: In Crisis result on EMA',
            'message': f"{s['name']} had an In Crisis result on EMA ({when}). Please review and follow up.",
            'read': False, 'created_at': at})
        alerts += 1
print(f"✅ {alerts} crisis alerts (in-app) for unreviewed crises")

print()
print("EMA triage scenarios (log in as cm@dlsu.edu.ph / cm123 → CM Queue):")
for sid_, title in scenario_ids.items():
    u = db.users.find_one({'_id': sid_}, {'name': 1, 'email': 1, 'perma_triage': 1})
    t = u.get('perma_triage') or {}
    flags = ', '.join(t.get('flags', [])) or 'no flags'
    print(f"  {u['name']:<16} {title:<40} → {t.get('label')} ({flags})")
print()
print(f"   EMA results:     {db.perma_snapshots.count_documents({})}")
print(f"   Crisis reviews:  {db.perma_crisis_reviews.count_documents({})}")
print(f"   Journal entries: {db.journal_entries.count_documents({})}")
