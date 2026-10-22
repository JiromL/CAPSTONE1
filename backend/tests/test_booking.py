"""Booking and intake confirmation, end to end through the API (cps_system_test database).

The flow a first-time student takes: pick a mode, see the intake counselors' free times for
that mode, book one, and the intake counselor confirms it, which creates the meeting link.
Appointment times are Philippine wall-clock times, stored without a timezone.
"""
from datetime import datetime, timedelta, timezone

import pytest
from bson import ObjectId
from flask_jwt_extended import create_access_token

from app import app
from models import db

PH = timedelta(hours=8)


def auth(user_id):
    with app.app_context():
        return {'Authorization': f'Bearer {create_access_token(identity=str(user_id))}'}


def next_weekday(days_ahead):
    d = (datetime.now(timezone.utc).replace(tzinfo=None) + PH).date() + timedelta(days=days_ahead)
    while d.weekday() >= 5:
        d += timedelta(days=1)
    return d


def next_saturday():
    d = (datetime.now(timezone.utc).replace(tzinfo=None) + PH).date() + timedelta(days=2)
    while d.weekday() != 5:
        d += timedelta(days=1)
    return d


@pytest.fixture
def world():
    tdb = db.db
    assert tdb.name == 'cps_system_test'
    day = next_weekday(3)
    ids = {'day': day}
    for name, role in [('online_ic', 'IC'), ('inperson_ic', 'IC'), ('rex', 'STUDENT'), ('ana', 'STUDENT')]:
        ids[name] = tdb.users.insert_one({
            'email': f'{name}-{ObjectId()}@test.local', 'role': role, 'is_active': True,
            'name': name, 'first_name': name.title(), 'last_name': 'Test'}).inserted_id
    for ic, method in (('online_ic', 'online'), ('inperson_ic', 'in-person')):
        tdb.counselor_weekly_schedule.insert_one({
            'counselor_id': ids[ic], 'session_method': method,
            'schedule': [{'day_of_week': day.weekday(), 'start_time': '09:00', 'end_time': '11:00', 'session_method': method}]})
    yield ids
    people = [ids[k] for k in ('online_ic', 'inperson_ic', 'rex', 'ana')]
    tdb.users.delete_many({'_id': {'$in': people}})
    tdb.counselor_weekly_schedule.delete_many({'counselor_id': {'$in': people}})
    tdb.appointments.delete_many({'$or': [{'student_id': {'$in': people}}, {'counselor_id': {'$in': people}}]})
    tdb.booking_locks.delete_many({'counselor_id': {'$in': people}})
    tdb.cases.delete_many({'student_id': {'$in': people}})
    tdb.consent_records.delete_many({'user_id': {'$in': people}})
    tdb.notifications.delete_many({'target_user_id': {'$in': [str(p) for p in people]}})


@pytest.fixture
def client():
    return app.test_client()


def open_slots(client, w, method):
    r = client.get(f"/api/availability/open-slots?date={w['day']:%Y-%m-%d}&method={method}", headers=auth(w['rex']))
    assert r.status_code == 200
    return r.get_json()['slots']


def book(client, student, day, time, counselor, method='online', **extra):
    body = {'purpose': 'intake_interview', 'concern': 'Feeling overwhelmed with classes', 'referral_type': 'self',
            'preferred_method': method, 'preferred_platform': 'zoom' if method == 'online' else None,
            'agreed_to_terms': True, 'preferred_date': f'{day:%Y-%m-%d}', 'preferred_time': time,
            'counselor_id': str(counselor), **extra}
    return client.post('/api/appointments/request', json=body, headers=auth(student))


# ── Finding a time ───────────────────────────────────────────────────────────

def test_open_slots_match_the_chosen_mode(client, world):
    online = open_slots(client, world, 'online')
    in_person = open_slots(client, world, 'in-person')
    assert online and in_person
    assert {s['counselor_id'] for s in online} == {str(world['online_ic'])}
    assert {s['counselor_id'] for s in in_person} == {str(world['inperson_ic'])}
    assert '09:00' in [s['time'] for s in online]


# ── Booking ──────────────────────────────────────────────────────────────────

def test_booking_is_saved_with_the_counselor_and_philippine_time(client, world):
    r = book(client, world['rex'], world['day'], '09:00', world['online_ic'])
    assert r.status_code == 201, r.get_json()
    apt = db.db.appointments.find_one({'_id': ObjectId(r.get_json()['appointment_id'])})
    assert apt['counselor_id'] == world['online_ic']
    assert apt['requested_start'] == datetime.combine(world['day'], datetime.min.time()).replace(hour=9)
    assert apt['status'] == 'REQUESTED'


def test_a_booked_time_disappears_and_cannot_be_taken_twice(client, world):
    assert book(client, world['rex'], world['day'], '09:00', world['online_ic']).status_code == 201
    assert '09:00' not in [s['time'] for s in open_slots(client, world, 'online')]
    r = book(client, world['ana'], world['day'], '09:00', world['online_ic'])
    assert r.status_code == 409


def test_student_cannot_hold_two_bookings_at_the_same_time(client, world):
    assert book(client, world['rex'], world['day'], '09:00', world['online_ic']).status_code == 201
    r = book(client, world['rex'], world['day'], '09:00', world['inperson_ic'], method='in-person')
    assert r.status_code == 409


@pytest.mark.parametrize('when, why', [
    (lambda: next_saturday(), 'weekend'),
    (lambda: (datetime.now(timezone.utc).replace(tzinfo=None) + PH).date() - timedelta(days=1), 'past'),
    (lambda: (datetime.now(timezone.utc).replace(tzinfo=None) + PH).date() + timedelta(days=200), 'too far ahead'),
])
def test_bookings_outside_the_rules_are_refused(client, world, when, why):
    r = book(client, world['rex'], when(), '09:00', world['online_ic'])
    assert r.status_code == 400, why


def test_booking_needs_consent(client, world):
    r = book(client, world['rex'], world['day'], '09:00', world['online_ic'], agreed_to_terms=False)
    assert r.status_code == 400


# ── The intake counselor confirms ────────────────────────────────────────────

def test_confirming_an_intake_creates_the_meeting_link(client, world, monkeypatch):
    calls = []

    def fake_link(appointment, counselor, student, start, end, config):
        calls.append((start, end))
        return {'meeting_link': 'https://zoom.us/j/123', 'meeting_platform': 'zoom', 'zoom_meeting_id': '123'}
    monkeypatch.setattr('services.meeting_links.create_meeting_link', fake_link)

    apt_id = book(client, world['rex'], world['day'], '09:00', world['online_ic']).get_json()['appointment_id']
    r = client.post(f'/api/appointments/{apt_id}/confirm-intake', headers=auth(world['online_ic']))
    assert r.status_code == 200, r.get_json()

    apt = db.db.appointments.find_one({'_id': ObjectId(apt_id)})
    assert apt['status'] == 'CONFIRMED'
    assert apt['meeting_link'] == 'https://zoom.us/j/123'
    assert apt['scheduled_start'].hour == 9 and apt['scheduled_end'] > apt['scheduled_start']
    assert calls and calls[0][0] == apt['scheduled_start']


def test_another_intake_counselor_cannot_confirm_it(client, world):
    apt_id = book(client, world['rex'], world['day'], '09:00', world['online_ic']).get_json()['appointment_id']
    r = client.post(f'/api/appointments/{apt_id}/confirm-intake', headers=auth(world['inperson_ic']))
    assert r.status_code == 403
    r = client.post(f'/api/appointments/{apt_id}/confirm-intake', headers=auth(world['ana']))
    assert r.status_code == 403


@pytest.mark.parametrize('time, method, counselor', [
    ('15:00', 'online', 'online_ic'),        # outside the counselor's hours (9 to 11)
    ('09:00', 'online', 'inperson_ic'),      # an in-person counselor booked for an online session
])
def test_only_the_counselors_real_free_times_can_be_booked(client, world, time, method, counselor):
    r = book(client, world['rex'], world['day'], time, world[counselor], method=method)
    assert r.status_code == 409


def test_confirming_an_intake_emails_the_student(client, world, monkeypatch):
    sent = []
    monkeypatch.setattr('services.meeting_links.create_meeting_link', lambda *a, **k: {})
    monkeypatch.setattr('services.email_service.EmailService.send_appointment_confirmation_email',
                        lambda self, **kw: sent.append(kw))
    apt_id = book(client, world['rex'], world['day'], '09:00', world['online_ic']).get_json()['appointment_id']
    assert client.post(f'/api/appointments/{apt_id}/confirm-intake', headers=auth(world['online_ic'])).status_code == 200
    assert len(sent) == 1
    assert sent[0]['appointment_details']['platform'] == 'Zoom'
