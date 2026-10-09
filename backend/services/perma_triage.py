"""
PERMA triage and trend scoring.

EMA gives each finished check-in one of five labels. A student's *latest* label is a poor
triage signal: a crisis in the morning followed by a good chat in the afternoon would hide
the crisis. So CPS keeps two different numbers:

* Triage label (who needs attention now): the worst label in a recent window. An In Crisis
  result stays flagged until a counselor or case manager clears it, even after the window;
  once reviewed it counts as Struggling, so the student stays monitored for the rest of it.
  Repeated Struggling and big same-day swings add flags without changing the label.
* Trend scores (charts and reports): daily average of that day's check-ins, monthly average
  of the daily scores, so one heavy-use day cannot outweigh the rest of the month.

Students can chat with EMA many times a day, and every finished chat is a result. Rules that
are about *days* (persistent struggle, same-day swings, daily scores) therefore group results
by Philippine calendar day, not by result, so ten chats in one afternoon count as one day.

The thresholds are clinical choices for CPS to confirm, so they live in the `settings`
collection (_id "perma_triage") and fall back to the defaults below.
"""
from collections import defaultdict
from datetime import datetime, timedelta

from bson import ObjectId

LABEL_SCORE = {'Excelling': 5, 'Thriving': 4, 'Surviving': 3, 'Struggling': 2, 'In Crisis': 1}
SCORE_LABEL = {v: k for k, v in LABEL_SCORE.items()}
AT_RISK = ('Struggling', 'In Crisis')
MANILA = timedelta(hours=8)


def local_day(dt):
    """The Philippine calendar day of a UTC timestamp."""
    return (dt + MANILA).date()
PERMA_AREAS = {'P': 'Positive emotion', 'E': 'Engagement', 'R': 'Relationships', 'M': 'Meaning', 'A': 'Accomplishment'}

DEFAULT_SETTINGS = {
    'window_days': 7,              # triage looks at check-ins from this many days back
    'persistent_struggle_count': 2,  # Struggling on this many different days in the window adds a flag
    'unstable_swing_levels': 3,    # same-day gap (e.g. In Crisis 1 -> Thriving 4) that adds a flag
}


def arrived_at(snapshot) -> datetime:
    """When CPS first received this result. EMA results can arrive hours after the check-in
    (the sync runs every 6 hours), so a review covers what had *arrived* when it was made,
    not what had happened by then. Otherwise a late crisis would count as already reviewed."""
    if snapshot.get('first_seen_at'):
        return snapshot['first_seen_at']
    oid = snapshot.get('_id')
    if isinstance(oid, ObjectId):   # saved before first_seen_at existed: the id holds its creation time
        return oid.generation_time.replace(tzinfo=None)
    return snapshot['entry_date']


def crisis_reviewed(snapshot, cleared_at) -> bool:
    """An In Crisis result counts as reviewed only if it was in CPS when the review was made."""
    return (snapshot.get('perma_label') == 'In Crisis' and cleared_at is not None
            and arrived_at(snapshot) <= cleared_at)


def get_settings(db) -> dict:
    stored = db.settings.find_one({'_id': 'perma_triage'}) or {}
    return {k: stored.get(k, v) for k, v in DEFAULT_SETTINGS.items()}


def label_for_score(score):
    """Average scores are rounded down, toward the more concerning label."""
    if score is None:
        return None
    return SCORE_LABEL[max(1, min(5, int(score)))]


def _labeled(snapshots):
    return sorted((s for s in snapshots if s.get('perma_label') in LABEL_SCORE),
                  key=lambda s: s['entry_date'])


def compute_triage(snapshots, settings: dict, crisis_cleared_at=None, now=None) -> dict:
    """Triage result for one student from their saved PERMA snapshots."""
    now = now or datetime.utcnow()
    entries = _labeled(snapshots)
    if not entries:
        return {'label': None, 'flags': [], 'reasons': [], 'checkins_in_window': 0,
                'last_checkin': None, 'stale': False, 'crisis_pending_review': False}

    window_start = now - timedelta(days=settings['window_days'])
    window = [e for e in entries if e['entry_date'] >= window_start]
    latest = entries[-1]
    flags, reasons = [], []

    def reviewed(e):
        return crisis_reviewed(e, crisis_cleared_at)

    def effective(e):
        return LABEL_SCORE['Struggling'] if reviewed(e) else LABEL_SCORE[e['perma_label']]

    if window:
        worst = min(window, key=effective)
        score = effective(worst)
        shown = 'In Crisis (reviewed)' if reviewed(worst) else worst['perma_label']
        reasons.append(f"Worst of {len(window)} check-in{'s' if len(window) != 1 else ''} "
                       f"in the last {settings['window_days']} days: {shown}")
        if any(reviewed(e) for e in window):
            flags.append('crisis_reviewed')
        stale = False
    else:
        # Nothing recent: fall back to the last known label, marked as old
        score = effective(latest)
        reasons.append(f"No check-in in the last {settings['window_days']} days; "
                       f"last result was {latest['perma_label']}")
        stale = True

    # An In Crisis result stays until someone with care responsibility clears it
    crises = [e for e in entries if e['perma_label'] == 'In Crisis' and not reviewed(e)]
    crisis_pending = bool(crises)
    if crisis_pending:
        if score != 1:
            reasons.append(f"In Crisis on {crises[-1]['entry_date']:%b %d} has not been reviewed yet")
        score = 1
        flags.append('crisis_pending_review')

    struggle_days = len({local_day(e['entry_date']) for e in window if e['perma_label'] == 'Struggling'})
    if struggle_days >= settings['persistent_struggle_count']:
        flags.append('persistent_struggle')
        reasons.append(f"Struggling on {struggle_days} different days in the last {settings['window_days']} days")

    by_day = defaultdict(list)
    for e in window:
        by_day[local_day(e['entry_date'])].append(LABEL_SCORE[e['perma_label']])
    swings = [(day, max(v) - min(v)) for day, v in by_day.items() if len(v) > 1]
    big = [s for s in swings if s[1] >= settings['unstable_swing_levels']]
    if big:
        day, gap = max(big, key=lambda s: s[1])
        flags.append('unstable_mood')
        reasons.append(f"Mood swung {gap} levels on {day:%b %d}")

    return {
        'label': SCORE_LABEL[score],
        'flags': flags,
        'reasons': reasons,
        'checkins_in_window': len(window),
        'last_checkin': latest['entry_date'].isoformat(),
        'latest_label': latest['perma_label'],
        'stale': stale,
        'crisis_pending_review': crisis_pending,
    }


def triage_priority(triage: dict) -> tuple:
    """Sort key for queues: In Crisis first, flagged before unflagged, most recent first."""
    score = LABEL_SCORE.get(triage.get('label'), 6)
    flagged = 0 if triage.get('flags') else 1
    recent = -(datetime.fromisoformat(triage['last_checkin']).timestamp()) if triage.get('last_checkin') else 0
    return (score, flagged, recent)


def daily_scores(snapshots) -> list:
    """[{date, score, label, checkins}] — average of each day's check-ins."""
    by_day = defaultdict(list)
    for e in _labeled(snapshots):
        by_day[local_day(e['entry_date'])].append(LABEL_SCORE[e['perma_label']])
    return [{'date': day.isoformat(), 'score': round(sum(v) / len(v), 2),
             'label': label_for_score(sum(v) / len(v)), 'checkins': len(v)}
            for day, v in sorted(by_day.items())]


def monthly_scores(snapshots) -> list:
    """[{month, score, label, days}] — average of the daily scores, so each day counts once."""
    by_month = defaultdict(list)
    for d in daily_scores(snapshots):
        by_month[d['date'][:7]].append(d['score'])
    return [{'month': m, 'score': round(sum(v) / len(v), 2), 'label': label_for_score(sum(v) / len(v)),
             'days': len(v)} for m, v in sorted(by_month.items())]


def weakest_area(snapshots, since=None):
    """Lowest average positive PERMA area from EMA's numeric scores, if any exist."""
    totals = defaultdict(list)
    for e in snapshots:
        if since and e['entry_date'] < since:
            continue
        for key, name in PERMA_AREAS.items():
            v = (e.get('perma_score') or {}).get(f'POS_{key}')
            if isinstance(v, (int, float)):
                totals[key].append(v)
    if not totals:
        return None
    key = min(totals, key=lambda k: sum(totals[k]) / len(totals[k]))
    return {'area': PERMA_AREAS[key], 'score': round(sum(totals[key]) / len(totals[key]), 2),
            'checkins': len(totals[key])}


def refresh_student_triage(db, user_id, now=None) -> dict:
    """Recompute and store a student's triage result on their user record."""
    user = db.users.find_one({'_id': user_id}, {'mhbot_username': 1, 'perma_crisis_cleared_at': 1})
    if not user:
        return {}
    query = {'student_user_id': user_id}
    if user.get('mhbot_username'):
        query = {'$or': [query, {'mhbot_username': user['mhbot_username']}]}
    snapshots = list(db.perma_snapshots.find(query, {'perma_label': 1, 'entry_date': 1, 'first_seen_at': 1}))
    triage = compute_triage(snapshots, get_settings(db), user.get('perma_crisis_cleared_at'), now)
    triage['computed_at'] = (now or datetime.utcnow()).isoformat()
    db.users.update_one({'_id': user_id}, {'$set': {'perma_triage': triage, 'perma_triage_label': triage['label']}})
    return triage


def refresh_all_triage(db, now=None) -> int:
    """The window slides with time, so every linked student is recomputed periodically."""
    count = 0
    for u in db.users.find({'role': 'STUDENT', 'mhbot_username': {'$nin': [None, '']}}, {'_id': 1}):
        refresh_student_triage(db, u['_id'], now)
        count += 1
    return count
