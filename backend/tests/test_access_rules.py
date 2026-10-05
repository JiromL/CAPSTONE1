"""Access and crash regressions, run against the cps_system_test database (see conftest.py)."""
from datetime import datetime, timedelta

import pytest
from bson import ObjectId
from flask_jwt_extended import create_access_token

from app import app
from models import db


@pytest.fixture(scope='module')
def world():
    tdb = db.db
    assert tdb.name == 'cps_system_test'
    ids = {}
    for name, role in [('student', 'STUDENT'), ('other', 'STUDENT'), ('counselor', 'COUNSELOR'),
                       ('stranger_counselor', 'COUNSELOR'), ('cm', 'CASE_MANAGER'), ('admin', 'ADMIN')]:
        ids[name] = tdb.users.insert_one({'email': f'{name}-{ObjectId()}@test.local', 'role': role,
                                          'name': name, 'is_active': True}).inserted_id
    ids['case'] = tdb.cases.insert_one({'student_id': ids['student'], 'assigned_counselor_id': ids['counselor'],
                                        'case_status': 'CLOSED', 'status': 'CLOSED',
                                        'created_at': datetime.utcnow()}).inserted_id
    ids['other_case'] = tdb.cases.insert_one({'student_id': ids['other'], 'assigned_counselor_id': ids['counselor'],
                                              'case_status': 'ACTIVE', 'created_at': datetime.utcnow()}).inserted_id
    ids['reminder'] = tdb.reminders.insert_one({'recipient_id': str(ids['student']), 'created_by': str(ids['cm']),
                                                'title': 'Session tomorrow', 'message': 'See you', 'status': 'pending',
                                                'delivery_methods': ['dashboard'],
                                                'scheduled_for': datetime.utcnow() + timedelta(hours=2)}).inserted_id
    yield ids
    tdb.users.delete_many({'_id': {'$in': [ids[k] for k in ('student', 'other', 'counselor', 'stranger_counselor', 'cm', 'admin')]}})
    tdb.cases.delete_many({'_id': {'$in': [ids['case'], ids['other_case']]}})
    tdb.reminders.delete_many({'_id': ids['reminder']})
    tdb.notifications.delete_many({'reminder_id': ids['reminder']})


@pytest.fixture(scope='module')
def client():
    return app.test_client()


def auth(user_id):
    with app.app_context():
        return {'Authorization': f'Bearer {create_access_token(identity=str(user_id))}'}


# ── Students must not see other students ─────────────────────────────────────

@pytest.mark.parametrize('path', [
    '/api/mhbot/cm-queue', '/api/mhbot/analytics/summary', '/api/mhbot/analytics/attention',
    '/api/mhbot/analytics/college', '/api/mhbot/students/pending', '/api/mhbot/triage-settings',
    '/api/scheduling-reports/upcoming-appointments', '/api/feedback/', '/api/feedback/analytics/summary',
])
def test_staff_routes_refuse_students(client, world, path):
    assert client.get(path, headers=auth(world['student'])).status_code == 403


def test_case_manager_can_open_queue(client, world):
    assert client.get('/api/mhbot/cm-queue', headers=auth(world['cm'])).status_code == 200


def test_case_data_follows_case_page_rules(client, world):
    other = world['other_case']
    assert client.get(f'/api/cases/{other}/session-count', headers=auth(world['student'])).status_code == 403
    assert client.get(f'/api/intake/case/{other}', headers=auth(world['student'])).status_code == 403
    assert client.get(f'/api/cases/{other}/session-count', headers=auth(world['stranger_counselor'])).status_code == 403
    assert client.get(f'/api/cases/{world["case"]}/session-count', headers=auth(world['student'])).status_code == 200


def test_removed_open_routes_are_gone(client):
    for path in ('/api/email/send', '/api/zoom/create', '/api/qr/generate', '/webhooks/virus-scan'):
        assert client.post(path, json={}).status_code == 404


def test_ema_webhook_refuses_without_secret(client):
    assert client.post('/api/mhbot/webhook/perma', json={'perma_label': 'Thriving'}).status_code == 503


# ── Reminders: no crashes, owner and staff rules ─────────────────────────────

def test_reminder_recipient_can_view_and_mark_read_only(client, world):
    rid, student = world['reminder'], world['student']
    assert client.get(f'/api/reminders/{rid}', headers=auth(student)).status_code == 200
    assert client.patch(f'/api/reminders/{rid}', json={'title': 'changed'}, headers=auth(student)).status_code == 403
    r = client.patch(f'/api/reminders/{rid}', json={'status': 'read'}, headers=auth(student))
    assert r.status_code == 200 and r.get_json()['status'] == 'read'
    assert client.delete(f'/api/reminders/{rid}', headers=auth(student)).status_code == 403


def test_other_student_cannot_see_reminder(client, world):
    assert client.get(f'/api/reminders/{world["reminder"]}', headers=auth(world['other'])).status_code == 403


def test_staff_can_send_reminder_and_list_upcoming(client, world):
    rid = world['reminder']
    db.db.reminders.update_one({'_id': rid}, {'$set': {'status': 'pending'}})
    assert client.post(f'/api/reminders/send/{rid}', headers=auth(world['student'])).status_code == 403
    r = client.post(f'/api/reminders/send/{rid}', headers=auth(world['cm']))
    assert r.status_code == 200 and 'dashboard' in r.get_json()['delivery_results']
    assert client.get('/api/reminders/upcoming', headers=auth(world['cm'])).status_code == 200
    mine = client.get('/api/reminders/upcoming', headers=auth(world['other'])).get_json()
    assert all(x.get('recipient_id') != str(world['student']) for x in mine)


# ── Previously crashing routes ───────────────────────────────────────────────

def test_feedback_works_for_staff(client, world):
    assert client.get('/api/feedback/', headers=auth(world['admin'])).status_code == 200
    assert client.get('/api/feedback/templates', headers=auth(world['student'])).status_code == 200


def test_reopen_case_returns_success(client, world):
    r = client.post(f'/api/cases/{world["case"]}/reopen', json={'reason': 'Student asked to continue'},
                    headers=auth(world['admin']))
    assert r.status_code == 200, r.get_json()
    assert db.db.cases.find_one({'_id': world['case']})['case_status'] == 'ACTIVE'
