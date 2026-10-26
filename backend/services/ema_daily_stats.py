"""
Daily EMA totals for the admin overview's trends.

The overview's numbers are live, so without history nobody can tell whether students are doing
better or worse than last month. Once a day's totals are saved here (collection
`ema_daily_stats`, one document per Philippine calendar day) they stay as they were, even after
old snapshots are removed or triage thresholds change.

Each day records two kinds of numbers:

* Triage state at the end of the day (labels, at risk, crises waiting for review), from what
  CPS had *received* by then. That is what the care team could see and act on that day.
* Activity during the day (students who checked in, students with an In Crisis result, crisis
  reviews and how long they took), by the day the check-in happened.

EMA results can reach CPS up to a day late (the sync runs every 6 hours), so the last
RECOMPUTE_DAYS finished days are recomputed on every run. Missing days are backfilled from the
saved snapshots, so the history starts filled even on a new install.

Totals only: no student ids or names are stored.
"""
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from statistics import median

from services.perma_triage import AT_RISK, LABEL_SCORE, MANILA, arrived_at, compute_triage, crisis_reviewed, get_settings
from services.ema_insights import MIN_GROUP, OVERDUE_HOURS

HISTORY_DAYS = 180
RECOMPUTE_DAYS = 2
LABELS = list(LABEL_SCORE)          # Excelling … In Crisis


def _utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def local_today(now):
    return (now + MANILA).date()


def _bounds(day):
    """UTC start and end of a Philippine calendar day."""
    start = datetime(day.year, day.month, day.day) - MANILA
    return start, start + timedelta(days=1)


def day_stats(students, snaps, reviews, settings, day, now):
    """Totals for one Philippine day. students: [{_id, linked_at}], snaps: {student_id: [snapshot]},
    reviews: {student_id: [cleared_at, ...] sorted}. Today is cut off at `now` and marked partial."""
    start, end = _bounds(day)
    partial = end > now
    end = min(end, now)
    labels = {l: 0 for l in LABELS}
    out = {'linked': 0, 'no_data': 0, 'stale': 0, 'pending_review': 0,
           'checked_in': 0, 'crisis_students': 0, 'review_hours': []}

    for s in students:
        if s['linked_at'] > end:
            continue
        out['linked'] += 1
        mine = snaps.get(s['_id'], [])
        cleared = [c for c in reviews.get(s['_id'], []) if c <= end]

        known = [x for x in mine if x['entry_date'] <= end and arrived_at(x) <= end]
        t = compute_triage(known, settings, cleared[-1] if cleared else None, end)
        if t['label'] in labels:
            labels[t['label']] += 1
            out['stale'] += t['stale']
            out['pending_review'] += t['crisis_pending_review']
        else:
            out['no_data'] += 1

        today = [x for x in mine if start <= x['entry_date'] < end and x.get('perma_label') in LABEL_SCORE]
        out['checked_in'] += bool(today)
        out['crisis_students'] += any(x['perma_label'] == 'In Crisis' for x in today)

        # Review time, as in ema_insights.crisis_followup: from the earliest crisis a review covered
        prev = None
        for c in cleared:
            if c >= start:
                covered = [x['entry_date'] for x in mine if crisis_reviewed(x, c) and not crisis_reviewed(x, prev)]
                if covered:
                    out['review_hours'].append(round((c - min(covered)).total_seconds() / 3600, 1))
            prev = c

    out['labels'] = labels
    out['at_risk'] = sum(labels[l] for l in AT_RISK)
    out['in_crisis'] = labels['In Crisis']
    return {'_id': day.isoformat(), 'day': day.isoformat(), 'partial': partial, **out}


def _load(db, only=None):
    """Linked students, their snapshots and crisis reviews. `only`: limit to these student ids."""
    query = {'role': 'STUDENT', 'mhbot_username': {'$nin': [None, '']}}
    if only is not None:
        query['_id'] = {'$in': list(only)}
    students = list(db.users.find(query, {'mhbot_username': 1, 'mhbot_linked_at': 1}))
    by_name = {s['mhbot_username']: s['_id'] for s in students}
    snaps = defaultdict(list)
    for x in db.perma_snapshots.find({'mhbot_username': {'$in': list(by_name)}},
                                     {'perma_label': 1, 'entry_date': 1, 'first_seen_at': 1, 'mhbot_username': 1}):
        if x.get('entry_date'):
            snaps[by_name[x['mhbot_username']]].append(x)
    reviews = defaultdict(list)
    review_query = {} if only is None else {'student_id': {'$in': list(only)}}
    for r in db.perma_crisis_reviews.find(review_query, {'student_id': 1, 'cleared_at': 1}).sort('cleared_at', 1):
        reviews[r['student_id']].append(r['cleared_at'])
    for s in students:
        # Linked before mhbot_linked_at was saved: count from the first result
        first = min((x['entry_date'] for x in snaps[s['_id']]), default=None)
        s['linked_at'] = s.get('mhbot_linked_at') or first or datetime.max
    return students, snaps, reviews


def _first_day(db, today):
    """The first day worth saving: the earliest EMA link or result, at most HISTORY_DAYS back."""
    linked = db.users.find_one({'role': 'STUDENT', 'mhbot_linked_at': {'$ne': None}}, {'mhbot_linked_at': 1},
                               sort=[('mhbot_linked_at', 1)])
    snap = db.perma_snapshots.find_one({}, {'entry_date': 1}, sort=[('entry_date', 1)])
    starts = [x for x in ((linked or {}).get('mhbot_linked_at'), (snap or {}).get('entry_date')) if x]
    return max(local_today(min(starts)), today - timedelta(days=HISTORY_DAYS)) if starts else None


def record_daily_stats(db, now=None, recompute=RECOMPUTE_DAYS) -> int:
    """Save finished days that are missing, plus the last `recompute` finished days. Returns days saved."""
    now = now or _utc_now()
    today = local_today(now)
    first = _first_day(db, today)
    if not first:
        return 0
    have = {d['_id'] for d in db.ema_daily_stats.find({'_id': {'$gte': first.isoformat()}}, {'_id': 1})}
    days = [first + timedelta(days=i) for i in range((today - first).days)]
    todo = [d for d in days if d.isoformat() not in have or (today - d).days <= recompute]
    if not todo:
        return 0   # nothing to do: skip loading every snapshot
    students, snaps, reviews = _load(db)
    settings = get_settings(db)
    for d in todo:
        doc = day_stats(students, snaps, reviews, settings, d, now)
        doc['computed_at'] = now
        db.ema_daily_stats.replace_one({'_id': doc['_id']}, doc, upsert=True)
    return len(todo)


def _week_start(day_iso):
    d = datetime.fromisoformat(day_iso).date()
    return (d - timedelta(days=d.weekday())).isoformat()


def _period(rows, key):
    """One chart point from consecutive days: state from the last day, activity summed or averaged."""
    last = rows[-1]
    hours = [h for r in rows for h in r['review_hours']]
    with_data = last['linked'] - last['no_data']
    point = {
        'start': key, 'end': last['day'], 'days': len(rows), 'partial': last['partial'],
        'linked': last['linked'], 'with_data': with_data,
        'checkin_rate': round(100 * sum(r['checked_in'] for r in rows) / max(1, sum(r['linked'] for r in rows))),
        'crisis_days': sum(r['crisis_students'] for r in rows),
        'reviews': len(hours),
        'median_review_hours': round(median(hours), 1) if hours else None,
        'within_target_pct': round(100 * sum(h <= OVERDUE_HOURS for h in hours) / len(hours)) if hours else None,
        'pending_review': last['pending_review'],
    }
    # Shares need a group big enough that no one can be singled out
    if with_data >= MIN_GROUP:
        point['labels'] = last['labels']
        point['at_risk'] = last['at_risk']
        point['in_crisis'] = last['in_crisis']
        point['at_risk_pct'] = round(100 * last['at_risk'] / with_data, 1)
    else:
        point['labels'] = None
        point['at_risk'] = point['in_crisis'] = point['at_risk_pct'] = None
    return point


def _today_stats(db, today, now):
    """Today so far. Triage is the live state already stored on each student (what the CM Queue
    shows), so only students active today need their snapshots read for the activity numbers."""
    start, _ = _bounds(today)
    linked = list(db.users.find({'role': 'STUDENT', 'mhbot_username': {'$nin': [None, '']}},
                                {'perma_triage': 1, 'mhbot_username': 1, 'mhbot_linked_at': 1}))
    linked = [u for u in linked if (u.get('mhbot_linked_at') or start) <= now]
    labels = {l: 0 for l in LABELS}
    no_data = stale = pending = 0
    for u in linked:
        t = u.get('perma_triage') or {}
        if t.get('label') in labels:
            labels[t['label']] += 1
            stale += bool(t.get('stale'))
            pending += bool(t.get('crisis_pending_review'))
        else:
            no_data += 1
    names = {u['mhbot_username']: u['_id'] for u in linked}
    checked_in, crisis = set(), set()
    for x in db.perma_snapshots.find({'entry_date': {'$gte': start, '$lt': now}}, {'mhbot_username': 1, 'perma_label': 1}):
        sid = names.get(x.get('mhbot_username'))
        if sid and x.get('perma_label') in LABEL_SCORE:
            checked_in.add(sid)
            if x['perma_label'] == 'In Crisis':
                crisis.add(sid)
    # Review times need each reviewed student's earlier crises: read only those students
    reviewed = {r['student_id'] for r in db.perma_crisis_reviews.find({'cleared_at': {'$gte': start}}, {'student_id': 1})}
    hours = day_stats(*_load(db, only=reviewed), get_settings(db), today, now)['review_hours'] if reviewed else []
    activity = {'checked_in': len(checked_in), 'crisis_students': len(crisis), 'review_hours': hours}
    return {'_id': today.isoformat(), 'day': today.isoformat(), 'partial': True, 'linked': len(linked),
            'no_data': no_data, 'stale': stale, 'pending_review': pending, 'labels': labels,
            'at_risk': sum(labels[l] for l in AT_RISK), 'in_crisis': labels['In Crisis'],
            'checked_in': activity['checked_in'], 'crisis_students': activity['crisis_students'],
            'review_hours': activity['review_hours']}


def history(db, days=90, now=None):
    """Chart points for the last `days` days: daily up to 31 days, weekly (Monday start) beyond.
    Missing finished days are filled first; today is computed live."""
    now = now or _utc_now()
    today = local_today(now)
    record_daily_stats(db, now, recompute=0)
    first = today - timedelta(days=days - 1)
    rows = list(db.ema_daily_stats.find({'_id': {'$gte': first.isoformat(), '$lt': today.isoformat()}}, {'computed_at': 0}).sort('_id', 1))
    rows.append(_today_stats(db, today, now))
    rows = [r for r in rows if r['linked']]

    granularity = 'day' if days <= 31 else 'week'
    groups = defaultdict(list)
    for r in rows:
        groups[r['day'] if granularity == 'day' else _week_start(r['day'])].append(r)
    points = [_period(groups[k], k) for k in sorted(groups)]
    hours = [h for r in rows for h in r['review_hours']]
    return {
        'granularity': granularity,
        'days': days,
        'min_group': MIN_GROUP,
        'overdue_hours': OVERDUE_HOURS,
        'points': points,
        'totals': {
            'crisis_days': sum(r['crisis_students'] for r in rows),
            'reviews': len(hours),
            'median_review_hours': round(median(hours), 1) if hours else None,
            'within_target_pct': round(100 * sum(h <= OVERDUE_HOURS for h in hours) / len(hours)) if hours else None,
            'checkin_rate': round(100 * sum(r['checked_in'] for r in rows) / max(1, sum(r['linked'] for r in rows))),
        },
    }
