"""
EMA insights for the analytics page: crisis follow-up, declining students, before/after
counseling, campus PERMA profile, and how many at-risk students a latest-label queue misses.

Privacy: any number describing a group is withheld when the group has fewer than
MIN_GROUP students, so nobody can be singled out from a breakdown. Lists that name
students are only served to the care team (checked by the route).
"""
from collections import defaultdict
from datetime import datetime, timedelta
from statistics import mean, median

from services.perma_triage import LABEL_SCORE, AT_RISK, PERMA_AREAS, daily_scores, monthly_scores, label_for_score, crisis_reviewed

MIN_GROUP = 5
OVERDUE_HOURS = 24
BEFORE_DAYS, AFTER_DAYS = 30, 60
CHANGE_THRESHOLD = 0.5   # half a label level counts as a real change
DECLINE_LEVELS = 1.0     # month-over-month drop that puts a student on the declining list


def _name(u):
    return u.get('name') or f"{u.get('first_name', '')} {u.get('last_name', '')}".strip() or u.get('email', '')


def _latest_case(db, student_id):
    case = db.cases.find_one({'student_id': student_id}, sort=[('created_at', -1)], projection={'_id': 1})
    return str(case['_id']) if case else None


def _students(db):
    return list(db.users.find({'role': 'STUDENT', 'mhbot_username': {'$nin': [None, '']}},
                              {'name': 1, 'first_name': 1, 'last_name': 1, 'email': 1, 'college': 1,
                               'mhbot_username': 1, 'perma_triage': 1, 'perma_triage_label': 1,
                               'perma_latest_label': 1, 'perma_crisis_cleared_at': 1}))


def _snapshots_by_student(db, students, fields=('perma_label', 'entry_date', 'first_seen_at')):
    names = {s['mhbot_username']: s['_id'] for s in students}
    out = defaultdict(list)
    for snap in db.perma_snapshots.find({'mhbot_username': {'$in': list(names)}},
                                        {f: 1 for f in (*fields, 'mhbot_username')}):
        out[names[snap['mhbot_username']]].append(snap)
    return out


def crisis_followup(db, students, snaps, now):
    """Unreviewed crises (longest waiting first) and how long reviews have taken."""
    pending = []
    for s in students:
        t = s.get('perma_triage') or {}
        if not t.get('crisis_pending_review'):
            continue
        cleared = s.get('perma_crisis_cleared_at')
        crises = [x['entry_date'] for x in snaps.get(s['_id'], [])
                  if x.get('perma_label') == 'In Crisis' and not crisis_reviewed(x, cleared)]
        if not crises:
            continue
        first = min(crises)
        hours = (now - first).total_seconds() / 3600
        pending.append({'student_id': str(s['_id']), 'name': _name(s), 'college': s.get('college', ''),
                        'crisis_at': first.isoformat(), 'latest_crisis_at': max(crises).isoformat(),
                        'crisis_count': len(crises), 'hours_waiting': round(hours, 1),
                        'overdue': hours > OVERDUE_HOURS, 'case_id': _latest_case(db, s['_id'])})
    pending.sort(key=lambda p: -p['hours_waiting'])

    # Review time: from the earliest unreviewed crisis before each review to the review itself
    review_hours, last_clear = [], {}
    for r in db.perma_crisis_reviews.find({}, {'student_id': 1, 'cleared_at': 1}).sort('cleared_at', 1):
        sid = r['student_id']
        prev = last_clear.get(sid)
        # The crises this review covered: in CPS by the review, not covered by the one before
        crises = [x['entry_date'] for x in snaps.get(sid, []) if crisis_reviewed(x, r['cleared_at'])
                  and not crisis_reviewed(x, prev)]
        if crises:
            review_hours.append((r['cleared_at'] - min(crises)).total_seconds() / 3600)
        last_clear[sid] = r['cleared_at']
    return {
        'pending': pending,
        'overdue_count': sum(p['overdue'] for p in pending),
        'overdue_hours': OVERDUE_HOURS,
        'reviews_count': len(review_hours),
        'median_review_hours': round(median(review_hours), 1) if review_hours else None,
        'within_24h_pct': round(100 * sum(h <= OVERDUE_HOURS for h in review_hours) / len(review_hours))
                          if review_hours else None,
    }


def declining_students(db, students, snaps):
    """Monthly average fell by at least a full label level versus the month before."""
    out = []
    for s in students:
        months = monthly_scores(snaps.get(s['_id'], []))
        if len(months) < 2:
            continue
        prev, last = months[-2], months[-1]
        drop = prev['score'] - last['score']
        if drop >= DECLINE_LEVELS:
            out.append({'student_id': str(s['_id']), 'name': _name(s), 'college': s.get('college', ''),
                        'from_month': prev['month'], 'from_score': prev['score'], 'from_label': prev['label'],
                        'to_month': last['month'], 'to_score': last['score'], 'to_label': last['label'],
                        'drop': round(drop, 2), 'case_id': _latest_case(db, s['_id'])})
    return sorted(out, key=lambda x: -x['drop'])


def before_after_counseling(db, students, snaps):
    """Each student's average daily score in the 30 days before their first completed session
    versus the 60 days after it. Only students with check-ins in both windows count."""
    rows = []
    for s in students:
        first = db.appointments.find_one({'student_id': s['_id'], 'status': {'$in': ['COMPLETED', 'FOLLOW_UP']},
                                          'scheduled_start': {'$ne': None}}, sort=[('scheduled_start', 1)])
        if not first:
            continue
        t = first['scheduled_start']
        mine = snaps.get(s['_id'], [])
        before = daily_scores([x for x in mine if t - timedelta(days=BEFORE_DAYS) <= x['entry_date'] < t])
        after = daily_scores([x for x in mine if t <= x['entry_date'] <= t + timedelta(days=AFTER_DAYS)])
        if before and after:
            rows.append({'college': s.get('college') or 'Unknown',
                         'before': mean(d['score'] for d in before), 'after': mean(d['score'] for d in after)})
    if len(rows) < MIN_GROUP:
        return {'suppressed': True, 'students': len(rows), 'min_group': MIN_GROUP}

    def summary(group):
        b, a = mean(r['before'] for r in group), mean(r['after'] for r in group)
        return {'students': len(group), 'before': round(b, 2), 'after': round(a, 2), 'change': round(a - b, 2),
                'before_label': label_for_score(b), 'after_label': label_for_score(a)}

    by_college = defaultdict(list)
    for r in rows:
        by_college[r['college']].append(r)
    diffs = [r['after'] - r['before'] for r in rows]
    return {
        'suppressed': False,
        'overall': summary(rows),
        'improved': sum(d >= CHANGE_THRESHOLD for d in diffs),
        'same': sum(abs(d) < CHANGE_THRESHOLD for d in diffs),
        'worse': sum(d <= -CHANGE_THRESHOLD for d in diffs),
        'by_college': sorted(({'college': c, **summary(g)} for c, g in by_college.items() if len(g) >= MIN_GROUP),
                             key=lambda x: -x['change']),
        'colleges_hidden': sum(1 for g in by_college.values() if len(g) < MIN_GROUP),
        'windows': {'before_days': BEFORE_DAYS, 'after_days': AFTER_DAYS},
    }


def perma_profile(db, students, now):
    """Campus average of each PERMA area (EMA's positive scores, last 90 days), one vote per student."""
    names = {s['mhbot_username'] for s in students}
    per_student = defaultdict(lambda: defaultdict(list))
    for snap in db.perma_snapshots.find({'mhbot_username': {'$in': list(names)}, 'perma_score': {'$exists': True},
                                         'entry_date': {'$gte': now - timedelta(days=90)}},
                                        {'mhbot_username': 1, 'perma_score': 1}):
        for key in PERMA_AREAS:
            v = (snap.get('perma_score') or {}).get(f'POS_{key}')
            if isinstance(v, (int, float)):
                per_student[snap['mhbot_username']][key].append(v)
    if len(per_student) < MIN_GROUP:
        return {'suppressed': True, 'students': len(per_student), 'min_group': MIN_GROUP}
    areas = []
    for key, name in PERMA_AREAS.items():
        vals = [mean(v[key]) for v in per_student.values() if v.get(key)]
        if vals:
            areas.append({'key': key, 'area': name, 'score': round(mean(vals), 2)})
    return {'suppressed': False, 'students': len(per_student), 'areas': areas}


def triage_vs_latest(students):
    """Where a queue built on each student's latest label would understate risk: the latest
    label looks less serious than the triage label (e.g. latest Thriving after a morning crisis)."""
    understated = []
    for s in students:
        triage, latest = s.get('perma_triage_label'), s.get('perma_latest_label')
        if triage in LABEL_SCORE and latest in LABEL_SCORE and LABEL_SCORE[triage] < LABEL_SCORE[latest]:
            understated.append({'student_id': str(s['_id']), 'name': _name(s), 'college': s.get('college', ''),
                                'triage_label': triage, 'latest_label': latest,
                                'missed_by_latest': triage in AT_RISK and latest not in AT_RISK,
                                'reason': ((s.get('perma_triage') or {}).get('reasons') or [''])[-1]})
    understated.sort(key=lambda x: (LABEL_SCORE[x['triage_label']], -LABEL_SCORE[x['latest_label']]))
    return {
        'triage_at_risk': sum(1 for s in students if s.get('perma_triage_label') in AT_RISK),
        'latest_at_risk': sum(1 for s in students if s.get('perma_latest_label') in AT_RISK),
        'triage_in_crisis': sum(1 for s in students if s.get('perma_triage_label') == 'In Crisis'),
        'latest_in_crisis': sum(1 for s in students if s.get('perma_latest_label') == 'In Crisis'),
        'understated': understated,
        'missed_count': sum(1 for u in understated if u['missed_by_latest']),
    }


def build_insights(db, now=None):
    now = now or datetime.utcnow()
    students = _students(db)
    snaps = _snapshots_by_student(db, students)
    return {
        'generated_at': now.isoformat(),
        'min_group': MIN_GROUP,
        'crisis_followup': crisis_followup(db, students, snaps, now),
        'declining': declining_students(db, students, snaps),
        'before_after': before_after_counseling(db, students, snaps),
        'perma_profile': perma_profile(db, students, now),
        'triage_vs_latest': triage_vs_latest(students),
    }
