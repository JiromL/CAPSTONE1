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
                       ('stranger_counselor', 'COUNSELOR'), ('cm', 'CASE_MANAGER'), ('admin', 'ADMIN'),
                       ('office', 'STAFF')]:
        ids[name] = tdb.users.insert_one({'email': f'{name}-{ObjectId()}@test.local', 'role': role,
                                          'name': name, 'is_active': True}).inserted_id
    ids['case'] = tdb.cases.insert_one({'student_id': ids['student'], 'assigned_counselor_id': ids['counselor'],
                                        'case_status': 'CLOSED', 'status': 'CLOSED',
                                        'created_at': datetime.utcnow()}).inserted_id
    ids['other_case'] = tdb.cases.insert_one({'student_id': ids['other'], 'assigned_counselor_id': ids['counselor'],
                                              'case_status': 'ACTIVE', 'created_at': datetime.utcnow()}).inserted_id
    oc = ids['other_case']
    ids['plan'] = tdb.safety_plans.insert_one({'case_id': oc, 'warning_signs': 'private'}).inserted_id
    ids['checkin'] = tdb.check_ins.insert_one({'case_id': oc, 'notes': 'private', 'created_at': datetime.utcnow()}).inserted_id
    ids['referral'] = tdb.referrals.insert_one({'case_id': oc, 'provider': 'private', 'created_at': datetime.utcnow()}).inserted_id
    ids['reminder'] = tdb.reminders.insert_one({'recipient_id': str(ids['student']), 'created_by': str(ids['cm']),
                                                'title': 'Session tomorrow', 'message': 'See you', 'status': 'pending',
                                                'delivery_methods': ['dashboard'],
                                                'scheduled_for': datetime.utcnow() + timedelta(hours=2)}).inserted_id
    yield ids
    tdb.users.delete_many({'_id': {'$in': [ids[k] for k in ('student', 'other', 'counselor', 'stranger_counselor', 'cm', 'admin', 'office')]}})
    tdb.consent_records.delete_many({'user_id': {'$in': [ids['student'], ids['other']]}})
    tdb.cases.delete_many({'_id': {'$in': [ids['case'], ids['other_case']]}})
    tdb.reminders.delete_many({'_id': ids['reminder']})
    tdb.safety_plans.delete_many({'_id': ids['plan']})
    tdb.check_ins.delete_many({'_id': ids['checkin']})
    tdb.referrals.delete_many({'_id': ids['referral']})
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


# ── Central rule: every URL naming a case or a record inside one ─────────────

def case_record_paths(w):
    oc = w['other_case']
    return [f'/api/high-risk/case/{oc}/safety-plan', f'/api/check-ins/{oc}/history', f'/api/check-ins/{w["checkin"]}',
            f'/api/referrals/{w["referral"]}', f'/api/referrals/case/{oc}/history', f'/api/cases/{oc}/diagnoses',
            f'/api/case-management/cases/{oc}/timeline', f'/api/case-management/cases/{oc}/audit-log']


def test_students_cannot_open_another_students_case_records(client, world):
    for path in case_record_paths(world):
        assert client.get(path, headers=auth(world['student'])).status_code == 403, path


def test_unassigned_counselor_cannot_open_case_records(client, world):
    for path in case_record_paths(world):
        assert client.get(path, headers=auth(world['stranger_counselor'])).status_code == 403, path


def test_assigned_counselor_and_case_manager_still_can(client, world):
    for who in ('counselor', 'cm'):
        for path in case_record_paths(world):
            assert client.get(path, headers=auth(world[who])).status_code != 403, (who, path)


def test_rule_also_covers_changes(client, world):
    oc = world['other_case']
    r = client.post(f'/api/high-risk/case/{oc}/safety-plan', json={'warning_signs': 'overwritten'},
                    headers=auth(world['student']))
    assert r.status_code == 403
    assert db.db.safety_plans.find_one({'_id': world['plan']})['warning_signs'] == 'private'


# ── EMA data: who sees it, and consent ───────────────────────────────────────

def test_office_assistants_cannot_see_ema_data(client, world):
    for path in ('/api/mhbot/cm-queue', '/api/mhbot/analytics/attention', '/api/mhbot/students/pending'):
        assert client.get(path, headers=auth(world['office'])).status_code == 403, path
    r = client.post('/api/mhbot/batch-labels', json={'usernames': ['x']}, headers=auth(world['office']))
    assert r.status_code == 403


def test_linking_ema_requires_consent_before_contacting_ema(client, world):
    r = client.post('/api/mhbot/link-username', json={'username': 'someone', 'password': 'pw'},
                    headers=auth(world['student']))
    assert r.status_code == 403 and r.get_json().get('consent_required')


def test_staff_cannot_link_ema_for_student_without_consent(client, world):
    db.db.users.update_one({'_id': world['other']}, {'$unset': {'ema_consent_given': ''}})
    r = client.post(f'/api/mhbot/case/{world["other_case"]}/link-mhbot', json={'mhbot_username': 'someone'},
                    headers=auth(world['cm']))
    assert r.status_code == 409
    assert not db.db.users.find_one({'_id': world['other']}).get('mhbot_username')


def test_disconnecting_withdraws_consent(client, world):
    db.db.users.update_one({'_id': world['student']}, {'$set': {'ema_consent_given': True, 'mhbot_username': 'x-test'}})
    assert client.post('/api/mhbot/auth/logout', headers=auth(world['student'])).status_code == 200
    u = db.db.users.find_one({'_id': world['student']})
    assert u.get('ema_consent_given') is False and 'mhbot_username' not in u


def test_insights_are_care_team_only(client, world):
    assert client.get('/api/mhbot/analytics/insights', headers=auth(world['student'])).status_code == 403
    assert client.get('/api/mhbot/analytics/insights', headers=auth(world['office'])).status_code == 403
    r = client.get('/api/mhbot/analytics/insights', headers=auth(world['cm']))
    assert r.status_code == 200 and r.get_json()['min_group'] == 5
