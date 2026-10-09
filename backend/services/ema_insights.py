"""
EMA insights for the analytics page: crisis follow-up, declining students, before/after
counseling, campus PERMA profile, how many at-risk students a latest-label queue misses, and
closing the loop (at-risk students who went quiet or are not in care, crisis to session time),
and patterns (repeat crises, when students struggle, recovery time, year level, engagement).

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
QUIET_DAYS = 7           # an at-risk student with no check-in for this long has gone quiet
SEEN_WITHIN_DAYS = 3     # target: seen in a session within this many days of a crisis
LOOP_WINDOW_DAYS = 90    # crisis-to-session looks at crises from this far back
OPEN_CASE = ('NEW', 'INTAKE_SCHEDULED', 'ACTIVE', 'PENDING_TERMINATION')
BOOKED = ('REQUESTED', 'PENDING_APPROVAL', 'CONFIRMED', 'SCHEDULED', 'MATCHED', 'RESCHEDULE_REQUESTED')
SESSION_DONE = ('COMPLETED', 'FOLLOW_UP')
REPEAT_DAYS = 30         # another crisis within this many days of a review counts as a repeat
PATTERN_DAYS = 90        # heatmap and recovery look this far back
MIN_CELL = 10            # heatmap cells with fewer check-ins show no rate
ENGAGEMENT_WEEKS = 12
MANILA = timedelta(hours=8)
WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
TIME_BANDS = [(0, 6, 'Late night', '12–6 AM'), (6, 10, 'Morning', '6–10 AM'), (10, 14, 'Midday', '10 AM–2 PM'),
              (14, 18, 'Afternoon', '2–6 PM'), (18, 21, 'Evening', '6–9 PM'), (21, 24, 'Night', '9 PM–12 AM')]
YEAR_ORDER = ['1st Year', '2nd Year', '3rd Year', '4th Year']


def _name(u):
    return u.get('name') or f"{u.get('first_name', '')} {u.get('last_name', '')}".strip() or u.get('email', '')


def _latest_case(db, student_id):
    case = db.cases.find_one({'student_id': student_id}, sort=[('created_at', -1)], projection={'_id': 1})
    return str(case['_id']) if case else None


def _students(db):
    return list(db.users.find({'role': 'STUDENT', 'mhbot_username': {'$nin': [None, '']}},
                              {'name': 1, 'first_name': 1, 'last_name': 1, 'email': 1, 'college': 1,
                               'mhbot_username': 1, 'perma_triage': 1, 'perma_triage_label': 1,
                               'perma_latest_label': 1, 'perma_crisis_cleared_at': 1,
                               'year_level': 1, 'mhbot_linked_at': 1}))


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


def _start(appt):
    """Appointment start: seeded and staff-made ones use scheduled_start, student bookings requested_start."""
    t = appt.get('scheduled_start') or appt.get('requested_start')
    if isinstance(t, str):
        try:
            t = datetime.fromisoformat(t.replace('Z', ''))
        except ValueError:
            return None
    return t


def _case_status(case):
    return ((case or {}).get('case_status') or (case or {}).get('status') or '').upper()


def went_quiet(db, students, snaps, now):
    """At-risk students whose last check-in is a week or more old: silence after a bad result
    is a warning sign, and triage can only repeat their last known label."""
    out = []
    for s in students:
        label = (s.get('perma_triage') or {}).get('label')
        mine = snaps.get(s['_id'], [])
        if label not in AT_RISK or not mine:
            continue
        last = max(mine, key=lambda x: x['entry_date'])
        days = (now - last['entry_date']).days
        if days < QUIET_DAYS:
            continue
        out.append({'student_id': str(s['_id']), 'name': _name(s), 'college': s.get('college', ''),
                    'triage_label': label, 'last_label': last['perma_label'],
                    'last_checkin': last['entry_date'].isoformat(), 'days_silent': days,
                    'case_id': _latest_case(db, s['_id'])})
    out.sort(key=lambda r: (LABEL_SCORE[r['triage_label']], -r['days_silent']))
    return out


def at_risk_not_in_care(db, students, now):
    """At-risk students with no open case and nothing booked: the outreach list."""
    out = []
    for s in students:
        label = (s.get('perma_triage') or {}).get('label')
        if label not in AT_RISK:
            continue
        case = db.cases.find_one({'student_id': s['_id']}, sort=[('created_at', -1)])
        if _case_status(case) in OPEN_CASE:
            continue
        booked = [a for a in db.appointments.find({'student_id': s['_id'], 'status': {'$in': list(BOOKED)}})
                  if _start(a) is None or _start(a) >= now - timedelta(hours=1)]
        if booked:
            continue
        out.append({'student_id': str(s['_id']), 'name': _name(s), 'college': s.get('college', ''),
                    'triage_label': label,
                    'reason': 'Never had a case' if not case else f"Case {_case_status(case).replace('_', ' ').lower()}",
                    'case_id': str(case['_id']) if case else None})
    out.sort(key=lambda r: LABEL_SCORE[r['triage_label']])
    return out


def crisis_to_session(db, students, snaps, now):
    """From each reviewed crisis to the student's next completed counseling session. A review
    only marks the alert as handled; this shows whether the student was actually seen."""
    by_id = {s['_id']: s for s in students}
    since = now - timedelta(days=LOOP_WINDOW_DAYS)
    days_to_session, not_seen, last_clear = [], [], {}
    for r in db.perma_crisis_reviews.find({}, {'student_id': 1, 'cleared_at': 1}).sort('cleared_at', 1):
        sid, prev = r['student_id'], last_clear.get(r['student_id'])
        last_clear[sid] = r['cleared_at']
        covered = [x['entry_date'] for x in snaps.get(sid, [])
                   if crisis_reviewed(x, r['cleared_at']) and not crisis_reviewed(x, prev)]
        if not covered or min(covered) < since or sid not in by_id:
            continue
        crisis_at = min(covered)
        sessions = [t for t in (_start(a) for a in db.appointments.find(
            {'student_id': sid, 'status': {'$in': list(SESSION_DONE)}})) if t and t >= crisis_at]
        if sessions:
            days_to_session.append((min(sessions) - crisis_at).total_seconds() / 86400)
        elif (now - crisis_at).days >= SEEN_WITHIN_DAYS:
            s = by_id[sid]
            not_seen.append({'student_id': str(sid), 'name': _name(s), 'college': s.get('college', ''),
                             'crisis_at': crisis_at.isoformat(), 'reviewed_at': r['cleared_at'].isoformat(),
                             'days_since': (now - crisis_at).days, 'case_id': _latest_case(db, sid)})
    # One row per student: their most recent crisis without a session
    latest = {}
    for row in not_seen:
        if row['student_id'] not in latest or row['crisis_at'] > latest[row['student_id']]['crisis_at']:
            latest[row['student_id']] = row
    return {
        'window_days': LOOP_WINDOW_DAYS,
        'target_days': SEEN_WITHIN_DAYS,
        'crises': len(days_to_session) + len(not_seen),
        'seen': len(days_to_session),
        'median_days': round(median(days_to_session), 1) if days_to_session else None,
        'within_target_pct': round(100 * sum(d <= SEEN_WITHIN_DAYS for d in days_to_session) / len(days_to_session))
                             if days_to_session else None,
        'not_seen': sorted(latest.values(), key=lambda r: r['crisis_at'], reverse=True),
    }


def _review_episodes(db, snaps):
    """(student_id, first crisis covered, review time) for every crisis review, oldest first."""
    episodes, last_clear = [], {}
    for r in db.perma_crisis_reviews.find({}, {'student_id': 1, 'cleared_at': 1}).sort('cleared_at', 1):
        sid, prev = r['student_id'], last_clear.get(r['student_id'])
        last_clear[sid] = r['cleared_at']
        covered = [x['entry_date'] for x in snaps.get(sid, [])
                   if crisis_reviewed(x, r['cleared_at']) and not crisis_reviewed(x, prev)]
        if covered:
            episodes.append((sid, min(covered), r['cleared_at']))
    return episodes


def repeat_crises(db, snaps, now):
    """Share of reviewed crises followed by another In Crisis result within 30 days of the
    review. Only reviews at least 30 days old count, so every one had the full 30 days."""
    rows = []
    for sid, _, reviewed in _review_episodes(db, snaps):
        if not (now - timedelta(days=PATTERN_DAYS + REPEAT_DAYS) <= reviewed <= now - timedelta(days=REPEAT_DAYS)):
            continue
        again = any(x['perma_label'] == 'In Crisis' and reviewed < x['entry_date'] <= reviewed + timedelta(days=REPEAT_DAYS)
                    for x in snaps.get(sid, []))
        rows.append((sid, again))
    students = len({sid for sid, _ in rows})
    if students < MIN_GROUP:
        return {'suppressed': True, 'students': students, 'min_group': MIN_GROUP, 'window_days': REPEAT_DAYS}
    repeated = sum(again for _, again in rows)
    return {'suppressed': False, 'window_days': REPEAT_DAYS, 'crises': len(rows), 'students': students,
            'repeated': repeated, 'pct': round(100 * repeated / len(rows))}


def struggle_times(students, snaps, now):
    """Weekday × time-of-day grid (Manila time): share of check-ins that were Struggling or
    In Crisis. A rate, not a count, so busy times don't look worse just for being busy.
    Each student counts once per day and time slot (at risk if any chat in it was), so one
    student chatting ten times in an evening cannot outweigh everyone else."""
    since = now - timedelta(days=PATTERN_DAYS)
    slots = {}   # (student, date, band) -> at risk in that slot
    for s in students:
        for x in snaps.get(s['_id'], []):
            if x['entry_date'] < since:
                continue
            local = x['entry_date'] + MANILA
            band = next(i for i, (a, b, *_) in enumerate(TIME_BANDS) if a <= local.hour < b)
            key = (s['_id'], local.date(), band)
            slots[key] = slots.get(key, False) or x['perma_label'] in AT_RISK
    cells = defaultdict(lambda: {'total': 0, 'at_risk': 0, 'students': set()})
    for (sid, day, band), risky in slots.items():
        c = cells[(day.weekday(), band)]
        c['total'] += 1
        c['at_risk'] += risky
        c['students'].add(sid)
    grid, shown = [], 0
    for d in range(7):
        row = []
        for b in range(len(TIME_BANDS)):
            c = cells.get((d, b))
            ok = c and c['total'] >= MIN_CELL and len(c['students']) >= MIN_GROUP
            row.append({'checkins': c['total'] if c else 0,
                        'pct': round(100 * c['at_risk'] / c['total']) if ok else None})
            shown += bool(ok)
        grid.append(row)
    overall = [c for c in cells.values()]
    total = sum(c['total'] for c in overall)
    return {'days': PATTERN_DAYS, 'min_cell': MIN_CELL, 'weekdays': WEEKDAYS,
            'bands': [{'name': n, 'hours': h} for *_, n, h in TIME_BANDS], 'grid': grid,
            'overall_pct': round(100 * sum(c['at_risk'] for c in overall) / total) if total else None,
            'suppressed': shown == 0}


def _hardest_per_day(mine):
    """One entry per Philippine day: that day's hardest result, at the time of its first chat."""
    days = {}
    for x in sorted(mine, key=lambda x: x['entry_date']):
        d = (x['entry_date'] + MANILA).date()
        if d not in days:
            days[d] = dict(x)
        elif LABEL_SCORE[x['perma_label']] < LABEL_SCORE[days[d]['perma_label']]:
            days[d]['perma_label'] = x['perma_label']
    return [days[d] for d in sorted(days)]


def recovery_time(db, students, snaps, now):
    """Days from a Struggling or In Crisis result back to Surviving or better, split by whether
    the student had a completed counseling session in between. Episodes start in the last 90 days.
    Works on each day's hardest result, so a bad chat at 1 PM and a good one at 3 PM is not a
    two-hour recovery: the student counts as recovered on the first day with no at-risk result."""
    since = now - timedelta(days=PATTERN_DAYS)
    groups = {'with_session': {'days': [], 'open': 0, 'students': set()},
              'without_session': {'days': [], 'open': 0, 'students': set()}}
    for s in students:
        mine = _hardest_per_day(snaps.get(s['_id'], []))
        sessions = sorted(t for t in (_start(a) for a in db.appointments.find(
            {'student_id': s['_id'], 'status': {'$in': list(SESSION_DONE)}}, {'scheduled_start': 1, 'requested_start': 1})) if t)
        start = None
        for i, x in enumerate(mine):
            bad = x['perma_label'] in AT_RISK
            if bad and start is None and (i == 0 or mine[i - 1]['perma_label'] not in AT_RISK):
                start = x['entry_date']
            elif not bad and start is not None:
                if start >= since:
                    seen = any(start <= t <= x['entry_date'] for t in sessions)
                    g = groups['with_session' if seen else 'without_session']
                    g['days'].append((x['entry_date'] - start).total_seconds() / 86400)
                    g['students'].add(s['_id'])
                start = None
        if start is not None and start >= since:          # still at risk: not recovered yet
            seen = any(t >= start for t in sessions)
            g = groups['with_session' if seen else 'without_session']
            g['open'] += 1
            g['students'].add(s['_id'])
    out = {'days': PATTERN_DAYS, 'min_group': MIN_GROUP}
    for key, g in groups.items():
        if len(g['students']) < MIN_GROUP or not g['days']:
            out[key] = {'suppressed': True, 'students': len(g['students'])}
        else:
            out[key] = {'suppressed': False, 'median_days': round(median(g['days']), 1), 'episodes': len(g['days']),
                        'not_recovered': g['open'], 'students': len(g['students'])}
    return out


def year_level_breakdown(students):
    """Share of linked students at risk (triage Struggling or In Crisis) per year level.
    Years with fewer than 5 linked students are combined, as in the college breakdown."""
    by_year = defaultdict(list)
    for s in students:
        y = s.get('year_level') if s.get('year_level') in YEAR_ORDER else 'Other'
        by_year[y].append((s.get('perma_triage') or {}).get('label') in AT_RISK)
    rows, other = [], []
    for y in YEAR_ORDER + ['Other']:
        flags = by_year.get(y, [])
        if not flags:
            continue
        if len(flags) >= MIN_GROUP and y != 'Other':
            rows.append({'year': y, 'students': len(flags), 'at_risk': sum(flags), 'pct': round(100 * sum(flags) / len(flags))})
        else:
            other += flags
    hidden = 0
    if len(other) >= MIN_GROUP:
        rows.append({'year': 'Other years', 'students': len(other), 'at_risk': sum(other),
                     'pct': round(100 * sum(other) / len(other))})
    else:
        hidden = len(other)
    return {'rows': rows, 'hidden_students': hidden, 'min_group': MIN_GROUP}


def engagement(students, snaps, now):
    """How many linked students check in: last 7 and 30 days, and per week for 12 weeks
    (share of students linked by that week with at least one check-in in it)."""
    def linked_at(s):
        if s.get('mhbot_linked_at'):
            return s['mhbot_linked_at']
        mine = snaps.get(s['_id'], [])
        return min(x['entry_date'] for x in mine) if mine else now

    def active_share(a, b):
        pool = [s for s in students if linked_at(s) <= b]
        if not pool:
            return None, 0
        active = sum(any(a <= x['entry_date'] < b for x in snaps.get(s['_id'], [])) for s in pool)
        return round(100 * active / len(pool)), len(pool)

    week_end = (now + MANILA).replace(hour=0, minute=0, second=0, microsecond=0) - MANILA
    week_end -= timedelta(days=(week_end + MANILA).weekday())          # start of this week (Mon, Manila)
    weeks = []
    for i in range(ENGAGEMENT_WEEKS, 0, -1):
        a, b = week_end - timedelta(weeks=i), week_end - timedelta(weeks=i - 1)
        pct, pool = active_share(a, b)
        if pct is not None:
            weeks.append({'week_start': (a + MANILA).date().isoformat(), 'pct': pct, 'students': pool})
    last7, linked = active_share(now - timedelta(days=7), now)
    last30, _ = active_share(now - timedelta(days=30), now)
    return {'linked': linked, 'last7_pct': last7, 'last30_pct': last30, 'weeks': weeks}


def build_insights(db, now=None, student_ids=None, hide_names=False, scope='all'):
    """student_ids: limit to these students (a counselor's own caseload).
    hide_names: totals only, for admins and the DPO; named lists become counts."""
    now = now or datetime.utcnow()
    students = _students(db)
    if student_ids is not None:
        keep = {str(i) for i in student_ids}
        students = [s for s in students if str(s['_id']) in keep]
    snaps = _snapshots_by_student(db, students)
    out = {
        'generated_at': now.isoformat(),
        'min_group': MIN_GROUP,
        'scope': scope,
        'names_hidden': hide_names,
        'students_in_scope': len(students),
        'crisis_followup': crisis_followup(db, students, snaps, now),
        'declining': declining_students(db, students, snaps),
        'before_after': before_after_counseling(db, students, snaps),
        'perma_profile': perma_profile(db, students, now),
        'triage_vs_latest': triage_vs_latest(students),
        'went_quiet': went_quiet(db, students, snaps, now),
        'not_in_care': at_risk_not_in_care(db, students, now),
        'crisis_to_session': crisis_to_session(db, students, snaps, now),
        'repeat_crises': repeat_crises(db, snaps, now),
        'struggle_times': struggle_times(students, snaps, now),
        'recovery': recovery_time(db, students, snaps, now),
        'year_levels': year_level_breakdown(students),
        'engagement': engagement(students, snaps, now),
    }
    out['counts'] = {
        'pending_crises': len(out['crisis_followup']['pending']),
        'declining': len(out['declining']),
        'understated': len(out['triage_vs_latest']['understated']),
        'went_quiet': len(out['went_quiet']),
        'not_in_care': len(out['not_in_care']),
        'not_seen': len(out['crisis_to_session']['not_seen']),
    }
    if hide_names:
        # Same numbers, no students: every list that names someone is emptied
        out['crisis_followup']['pending'] = []
        out['declining'] = []
        out['triage_vs_latest']['understated'] = []
        out['went_quiet'] = []
        out['not_in_care'] = []
        out['crisis_to_session']['not_seen'] = []
    return out
