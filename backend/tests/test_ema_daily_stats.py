from datetime import date, datetime, timedelta

from services.ema_daily_stats import _period, day_stats
from services.perma_triage import DEFAULT_SETTINGS

DAY = date(2026, 10, 5)
NOON = datetime(2026, 10, 5, 4, 0)         # 12:00 in Manila
END = datetime(2026, 10, 5, 16, 0)         # Manila midnight after DAY
LINKED = datetime(2026, 9, 1)


def snap(label, at, arrived=None):
    return {'perma_label': label, 'entry_date': at, 'first_seen_at': arrived or at}


def stats(snaps, reviews=None, now=END + timedelta(days=1), students=None):
    students = students or [{'_id': i, 'linked_at': LINKED} for i in snaps]
    return day_stats(students, snaps, reviews or {}, DEFAULT_SETTINGS, DAY, now)


def test_triage_counts_at_end_of_day():
    s = stats({1: [snap('In Crisis', NOON)], 2: [snap('Thriving', NOON)], 3: [snap('Struggling', NOON - timedelta(days=2))]})
    assert s['labels']['In Crisis'] == 1 and s['labels']['Thriving'] == 1 and s['labels']['Struggling'] == 1
    assert s['at_risk'] == 2 and s['pending_review'] == 1
    assert s['checked_in'] == 2 and s['crisis_students'] == 1
    assert not s['partial']


def test_result_that_arrived_next_day_is_not_triage_but_is_activity():
    s = stats({1: [snap('In Crisis', NOON, arrived=END + timedelta(hours=3))]})
    assert s['no_data'] == 1 and s['in_crisis'] == 0       # the team could not see it yet
    assert s['crisis_students'] == 1                       # but it happened that day


def test_review_time_counted_on_review_day():
    crisis = snap('In Crisis', NOON - timedelta(days=1))
    s = stats({1: [crisis]}, reviews={1: [NOON]})
    assert s['review_hours'] == [24.0]
    assert s['pending_review'] == 0 and s['labels']['Struggling'] == 1   # reviewed crisis counts as Struggling


def test_students_linked_later_are_left_out():
    later = [{'_id': 1, 'linked_at': LINKED}, {'_id': 2, 'linked_at': END + timedelta(days=3)}]
    s = stats({1: [snap('Thriving', NOON)], 2: []}, students=later)
    assert s['linked'] == 1


def test_today_is_partial():
    assert stats({1: [snap('Thriving', NOON - timedelta(hours=1))]}, now=NOON)['partial']


def test_small_groups_hide_label_shares():
    row = stats({i: [snap('Struggling', NOON)] for i in range(4)})
    assert _period([row], DAY.isoformat())['at_risk_pct'] is None
    row = stats({i: [snap('Struggling' if i < 2 else 'Thriving', NOON)] for i in range(5)})
    assert _period([row], DAY.isoformat())['at_risk_pct'] == 40.0
