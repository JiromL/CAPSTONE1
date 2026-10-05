from datetime import datetime, timedelta

from services.perma_triage import (DEFAULT_SETTINGS, compute_triage, daily_scores, monthly_scores,
                                   label_for_score, weakest_area, triage_priority)

NOW = datetime(2026, 10, 5, 12, 0)


def snap(label, days_ago=0, hour=12, score=None):
    s = {'perma_label': label, 'entry_date': (NOW - timedelta(days=days_ago)).replace(hour=hour)}
    if score:
        s['perma_score'] = score
    return s


def triage(snaps, cleared_at=None):
    return compute_triage(snaps, DEFAULT_SETTINGS, cleared_at, NOW)


def test_crisis_is_not_hidden_by_a_later_good_check_in():
    t = triage([snap('In Crisis', 0, 9), snap('Thriving', 0, 15)])
    assert t['label'] == 'In Crisis'
    assert t['latest_label'] == 'Thriving'
    assert 'unstable_mood' in t['flags']


def test_worst_label_in_window_wins():
    t = triage([snap('Struggling', 3), snap('Thriving', 1), snap('Excelling', 0)])
    assert t['label'] == 'Struggling'
    assert t['checkins_in_window'] == 3


def test_results_older_than_window_do_not_count():
    t = triage([snap('Struggling', 10), snap('Thriving', 2)])
    assert t['label'] == 'Thriving'


def test_crisis_stays_after_window_until_cleared():
    snaps = [snap('In Crisis', 20), snap('Thriving', 1)]
    t = triage(snaps)
    assert t['label'] == 'In Crisis'
    assert t['crisis_pending_review']

    cleared = triage(snaps, cleared_at=NOW - timedelta(days=5))
    assert cleared['label'] == 'Thriving'
    assert not cleared['crisis_pending_review']


def test_reviewed_crisis_in_window_counts_as_struggling():
    t = triage([snap('In Crisis', 2), snap('Thriving', 1)], cleared_at=NOW - timedelta(days=1))
    assert t['label'] == 'Struggling'
    assert 'crisis_reviewed' in t['flags']
    assert not t['crisis_pending_review']


def test_new_crisis_after_clearing_flags_again():
    t = triage([snap('In Crisis', 20), snap('In Crisis', 1)], cleared_at=NOW - timedelta(days=5))
    assert t['label'] == 'In Crisis'
    assert t['crisis_pending_review']


def test_repeated_struggle_is_flagged_but_not_relabelled_as_crisis():
    t = triage([snap('Struggling', 4), snap('Struggling', 1), snap('Thriving', 0)])
    assert t['label'] == 'Struggling'
    assert 'persistent_struggle' in t['flags']


def test_no_recent_check_in_falls_back_to_last_label_marked_stale():
    t = triage([snap('Surviving', 15)])
    assert t['label'] == 'Surviving'
    assert t['stale']


def test_no_labelled_results():
    assert triage([{'perma_label': None, 'entry_date': NOW}])['label'] is None


def test_daily_average_and_monthly_counts_each_day_once():
    snaps = [snap('In Crisis', 0, 9), snap('Thriving', 0, 15)] + [snap('Excelling', d) for d in (1, 2)]
    daily = daily_scores(snaps)
    assert daily[-1]['score'] == 2.5 and daily[-1]['label'] == 'Struggling'   # rounds down
    month = monthly_scores(snaps)[-1]
    assert month['days'] == 3
    assert month['score'] == round((2.5 + 5 + 5) / 3, 2)


def test_label_for_score_rounds_toward_concern():
    assert label_for_score(3.99) == 'Surviving'
    assert label_for_score(1.2) == 'In Crisis'
    assert label_for_score(None) is None


def test_weakest_area_uses_positive_scores():
    s = {f'POS_{k}': 4.0 for k in 'PERMA'}
    s['POS_M'] = 2.1
    assert weakest_area([snap('Thriving', 1, score=s)])['area'] == 'Meaning'
    assert weakest_area([snap('Thriving', 1)]) is None


def test_queue_priority_crisis_then_flags_then_recency():
    crisis = triage([snap('In Crisis', 2)])
    flagged = triage([snap('Struggling', 3), snap('Struggling', 2)])
    plain_recent = triage([snap('Struggling', 0)])
    order = sorted([plain_recent, flagged, crisis], key=triage_priority)
    assert order == [crisis, flagged, plain_recent]
