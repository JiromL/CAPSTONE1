from datetime import datetime, timedelta

import services.meeting_links as ml

START = datetime(2026, 10, 12, 2, 0)
COUNSELOR = {'_id': 'c1', 'first_name': 'Rose', 'last_name': 'Tolentino'}


def test_platform_follows_what_the_student_booked():
    assert ml.platform_for({'preferred_method': 'online', 'preferred_platform': 'zoom'}) == 'zoom'
    assert ml.platform_for({'preferred_method': 'online', 'preferred_platform': 'google-meet'}) == 'google-meet'
    assert ml.platform_for({'preferred_method': 'online'}) == 'google-meet'
    assert ml.platform_for({'preferred_method': 'in-person'}) is None
    assert ml.platform_for({'method': 'in_person'}) is None


def test_zoom_booking_gets_a_zoom_link(monkeypatch):
    monkeypatch.setattr(ml, '_zoom', lambda *a: {'meeting_link': 'https://zoom.us/j/1', 'meeting_platform': 'zoom'})
    monkeypatch.setattr(ml, '_meet', lambda *a: {'meeting_link': 'https://meet.google.com/x', 'meeting_platform': 'google-meet'})
    out = ml.create_meeting_link({'preferred_method': 'online', 'preferred_platform': 'zoom'}, COUNSELOR, {}, START, None, {})
    assert out['meeting_link'] == 'https://zoom.us/j/1' and out['is_telehealth']


def test_meet_falls_back_to_zoom_when_no_calendar_is_connected(monkeypatch):
    monkeypatch.setattr(ml, '_meet', lambda *a: None)
    monkeypatch.setattr(ml, '_zoom', lambda *a: {'meeting_link': 'https://zoom.us/j/2', 'meeting_platform': 'zoom'})
    out = ml.create_meeting_link({'preferred_method': 'online', 'preferred_platform': 'google-meet'}, COUNSELOR, {}, START,
                                 START + timedelta(minutes=50), {})
    assert out['meeting_platform'] == 'zoom'


def test_no_link_for_in_person_or_without_a_time(monkeypatch):
    monkeypatch.setattr(ml, '_zoom', lambda *a: {'meeting_link': 'x', 'meeting_platform': 'zoom'})
    assert ml.create_meeting_link({'preferred_method': 'in-person'}, COUNSELOR, {}, START, None, {}) is None
    assert ml.create_meeting_link({'preferred_method': 'online', 'preferred_platform': 'zoom'}, COUNSELOR, {}, None, None, {}) is None
