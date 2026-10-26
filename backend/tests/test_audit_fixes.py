"""Regressions for the October 2026 audit: who may list, read and write what."""
from datetime import datetime, timedelta, timezone

import pytest
from bson import ObjectId
from flask_jwt_extended import create_access_token, create_refresh_token

from app import app
from models import db


def now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


@pytest.fixture(scope='module')
def world():
    tdb = db.db
    assert tdb.name == 'cps_system_test'
    ids = {}
    for name, role in [('student', 'STUDENT'), ('other', 'STUDENT'), ('counselor', 'COUNSELOR'),
                       ('stranger_counselor', 'COUNSELOR'), ('cm', 'CASE_MANAGER'), ('office', 'STAFF')]:
        ids[name] = tdb.users.insert_one({'email': f'{name}-{ObjectId()}@test.local', 'role': role, 'name': name,
                                          'first_name': name, 'last_name': 'Audit', 'is_active': True}).inserted_id
    ids['case'] = tdb.cases.insert_one({'student_id': ids['student'], 'assigned_counselor_id': ids['counselor'],
                                        'case_status': 'ACTIVE', 'client_status': 'CHECK_IN_ONLY', 'created_at': now()}).inserted_id
    ids['other_case'] = tdb.cases.insert_one({'student_id': ids['other'], 'assigned_counselor_id': ids['counselor'],
                                              'case_status': 'ACTIVE', 'client_status': 'CHECK_IN_ONLY', 'created_at': now()}).inserted_id
    ids['note'] = tdb.session_notes.insert_one({'case_id': ids['case'], 'counselor_id': ids['counselor'], 'student_id': ids['student'],
                                                'session_date': now(), 'session_type': 'INDIVIDUAL', 'note_content': 'private',
                                                'created_at': now()}).inserted_id
    ids['appt'] = tdb.appointments.insert_one({'student_id': ids['student'], 'case_id': ids['case'], 'status': 'CONFIRMED',
                                               'scheduled_start': now() + timedelta(hours=2), 'created_at': now()}).inserted_id
    ids['qr'] = tdb.checkin_tokens.insert_one({'appointment_id': ids['appt'], 'token': f'tok-{ObjectId()}', 'used': False,
                                               'expires_at': now() + timedelta(hours=4)}).inserted_id
    yield ids
    tdb.users.delete_many({'_id': {'$in': [ids[k] for k in ('student', 'other', 'counselor', 'stranger_counselor', 'cm', 'office')]}})
    tdb.cases.delete_many({'_id': {'$in': [ids['case'], ids['other_case']]}})
    tdb.session_notes.delete_many({'_id': ids['note']})
    tdb.appointments.delete_many({'$or': [{'_id': ids['appt']}, {'student_id': ids['student']}]})
    tdb.checkin_tokens.delete_many({'_id': ids['qr']})
    tdb.check_ins.delete_many({'case_id': {'$in': [ids['case'], ids['other_case']]}})


@pytest.fixture(scope='module')
def client():
    return app.test_client()


def auth(user_id):
    with app.app_context():
        return {'Authorization': f'Bearer {create_access_token(identity=str(user_id))}'}


@pytest.mark.parametrize('path', [
    '/api/check-ins/list', '/api/check-ins/summary/status', '/api/high-risk/daily-updates-due',
    '/api/referrals/pending-warm-handoffs', '/api/referrals/summary', '/api/referrals/cps/list',
    '/api/counselor-referrals/',
])
def test_students_cannot_list_other_students_records(client, world, path):
    assert client.get(path, headers=auth(world['student'])).status_code == 403


def test_qr_link_alone_does_not_check_a_student_in(client, world):
    token = db.db.checkin_tokens.find_one({'_id': world['qr']})['token']
    body = {'token': token, 'appointment_id': str(world['appt'])}
    assert client.post('/api/qr/verify-public', json=body).status_code == 401
    assert client.post('/api/qr/verify-public', json=body, headers=auth(world['student'])).status_code == 403
    assert client.post('/api/qr/verify', json=body, headers=auth(world['student'])).status_code == 403
    r = client.post('/api/qr/verify-public', json=body, headers=auth(world['office']))
    assert r.status_code == 200 and r.get_json()['success']


def test_session_notes_are_for_the_care_team_only(client, world):
    note = str(world['note'])
    for who in ('office', 'student'):
        assert client.get(f'/api/counseling/session-note/{note}', headers=auth(world[who])).status_code == 403
        assert client.get(f'/api/case-management/session-notes/{note}/versions', headers=auth(world[who])).status_code == 403
    assert client.get(f'/api/counseling/session-note/{note}', headers=auth(world['counselor'])).status_code == 200


def test_counselors_list_only_their_own_cases(client, world):
    ids = {c['_id'] for c in client.get('/api/cases?limit=100', headers=auth(world['stranger_counselor'])).get_json()['cases']}
    assert str(world['case']) not in ids
    ids = {c['_id'] for c in client.get('/api/cases?limit=100', headers=auth(world['counselor'])).get_json()['cases']}
    assert str(world['case']) in ids


def test_counselor_cannot_write_to_a_case_not_assigned_to_them(client, world):
    r = client.post('/api/check-ins/create', headers=auth(world['stranger_counselor']),
                    json={'case_id': str(world['case']), 'check_in_type': 'STATUS_UPDATE', 'notes': 'x'})
    assert r.status_code == 403


def test_operator_in_body_id_is_refused(client, world):
    r = client.post('/api/check-ins/create', headers=auth(world['cm']),
                    json={'case_id': {'$ne': None}, 'check_in_type': 'STATUS_UPDATE'})
    assert r.status_code == 400 and r.get_json()['error'] == 'Invalid case ID'


def test_student_cannot_book_under_another_students_case(client, world):
    r = client.post('/api/appointments/request', headers=auth(world['student']),
                    json={'case_id': str(world['other_case']), 'purpose': 'counseling', 'concern': 'x',
                          'referral_type': 'self', 'preferred_method': 'in-person', 'agreed_to_terms': True})
    assert r.status_code == 403


def test_deactivated_account_tokens_stop_working(client, world):
    h = auth(world['office'])
    with app.app_context():
        refresh = create_refresh_token(identity=str(world['office']), additional_claims={'role': 'STAFF'})
    db.db.users.update_one({'_id': world['office']}, {'$set': {'is_active': False}})
    try:
        assert client.get('/api/auth/me', headers=h).status_code == 401
        assert client.post('/api/auth/refresh', headers={'Authorization': f'Bearer {refresh}'}).status_code == 401
    finally:
        db.db.users.update_one({'_id': world['office']}, {'$set': {'is_active': True}})


def test_refresh_takes_the_role_from_the_database(client, world):
    with app.app_context():
        refresh = create_refresh_token(identity=str(world['student']), additional_claims={'role': 'ADMIN'})
    r = client.post('/api/auth/refresh', headers={'Authorization': f'Bearer {refresh}'})
    assert r.status_code == 200
    from flask_jwt_extended import decode_token
    with app.app_context():
        assert decode_token(r.get_json()['access_token'])['role'] == 'STUDENT'


def test_saved_intake_draft_loads(client, world):
    h = auth(world['student'])
    assert client.post('/api/intake/draft/save', headers=h, json={'concern': 'x'}).status_code in (200, 201)
    r = client.get('/api/intake/draft/load', headers=h)
    assert r.status_code == 200 and r.get_json()['has_draft']
    db.db.intake_drafts.delete_many({'student_id': world['student']})


def test_referral_lists_follow_case_assignment(client, world):
    for path in ('/api/referrals/pending-warm-handoffs', '/api/referrals/cps/list'):
        assert client.get(path, headers=auth(world['office'])).status_code == 403
        assert client.get(path, headers=auth(world['counselor'])).status_code == 200
        assert client.get(path, headers=auth(world['cm'])).status_code == 200


def test_student_can_get_qr_for_confirmed_appointment(client, world):
    db.db.appointments.update_one({'_id': world['appt']}, {'$set': {'status': 'CONFIRMED'}})   # an earlier test checks it in
    r = client.get(f"/api/qr/appointment/{world['appt']}", headers=auth(world['student']))
    assert r.status_code == 200, r.get_json()


def test_admin_add_user_keeps_the_chosen_role_but_public_signup_cannot(client, world):
    admin = db.db.users.insert_one({'email': f'adm-{ObjectId()}@test.local', 'role': 'ADMIN', 'is_active': True}).inserted_id
    emails = [f'staff.{str(ObjectId())[-8:]}@dlsu.edu.ph', f'public.{str(ObjectId())[-8:]}@dlsu.edu.ph']
    try:
        body = {'first_name': 'A', 'last_name': 'B', 'password': 'Passw0rd!1', 'role': 'COUNSELOR'}
        assert client.post('/api/auth/register', json={**body, 'email': emails[0]}, headers=auth(admin)).status_code == 201
        assert client.post('/api/auth/register', json={**body, 'email': emails[1], 'role': 'ADMIN'}).status_code == 201
        made, public = (db.db.users.find_one({'email': e}) for e in emails)
        assert (made['role'], made['is_verified']) == ('COUNSELOR', True)
        assert (public['role'], public['is_verified']) == ('STUDENT', False)
    finally:
        db.db.users.delete_many({'$or': [{'_id': admin}, {'email': {'$in': emails}}]})


def test_walk_in_shows_by_name_in_the_ic_queue(client, world):
    ic = db.db.users.insert_one({'email': f'ic-{ObjectId()}@test.local', 'role': 'IC', 'is_active': True}).inserted_id
    email = f'walk.{str(ObjectId())[-8:]}@dlsu.edu.ph'
    try:
        r = client.post('/api/intake/walkin', headers=auth(world['office']), json={
            'first_name': 'Wanda', 'last_name': 'Walker', 'email': email, 'counselor_id': str(ic), 'scheduled_time': '15:00'})
        assert r.status_code in (200, 201), r.get_json()
        names = [i['student_name'] for i in client.get('/api/intake/list', headers=auth(ic)).get_json()['intakes']]
        assert 'Wanda Walker' in names
    finally:
        b = r.get_json() or {}
        db.db.users.delete_many({'$or': [{'_id': ic}, {'email': email}]})
        db.db.appointments.delete_many({'student_email': email})
        db.db.intakes.delete_many({'_id': ObjectId(b['intake_id'])} if b.get('intake_id') else {'_id': None})
        db.db.cases.delete_many({'_id': ObjectId(b['case_id'])} if b.get('case_id') else {'_id': None})
