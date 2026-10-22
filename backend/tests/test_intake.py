"""Intake triage, through the API (cps_system_test database).

After the intake interview the intake counselor submits the PHQ-9 / GAD-7 answers and a
decision: endorse to a counselor (ENDORSE_CC), to a psychologist (ENDORSE_CP), or close at
intake. Triage sets the risk level, opens or closes the case, and completes the appointment.
"""
from datetime import datetime

import pytest
from bson import ObjectId
from flask_jwt_extended import create_access_token

from app import app
from models import db


def auth(user_id):
    with app.app_context():
        return {'Authorization': f'Bearer {create_access_token(identity=str(user_id))}'}


@pytest.fixture
def world():
    tdb = db.db
    assert tdb.name == 'cps_system_test'
    ids = {}
    for name, role in [('ic', 'IC'), ('counselor', 'COUNSELOR'), ('psych', 'PSYCHOLOGIST'), ('student', 'STUDENT')]:
        ids[name] = tdb.users.insert_one({'email': f'{name}-{ObjectId()}@test.local', 'role': role, 'is_active': True,
                                          'name': name, 'first_name': name.title(), 'last_name': 'Test'}).inserted_id
    ids['appointment'] = tdb.appointments.insert_one({
        'student_id': ids['student'], 'counselor_id': ids['ic'], 'purpose': 'intake_interview',
        'status': 'CONFIRMED', 'scheduled_start': datetime(2026, 10, 20, 9)}).inserted_id
    ids['intake'] = tdb.intakes.insert_one({'student_id': ids['student'], 'appointment_id': ids['appointment'],
                                            'status': 'IN_PROGRESS', 'created_at': datetime.utcnow()}).inserted_id
    yield ids
    people = [ids[k] for k in ('ic', 'counselor', 'psych', 'student')]
    tdb.users.delete_many({'_id': {'$in': people}})
    tdb.appointments.delete_many({'_id': ids['appointment']})
    tdb.intakes.delete_many({'_id': ids['intake']})
    tdb.cases.delete_many({'student_id': ids['student']})
    tdb.reminders.delete_many({'$or': [{'recipient_id': {'$in': [str(p) for p in people]}},
                                       {'student_id': {'$in': people}}]})


@pytest.fixture
def client():
    return app.test_client()


def triage(client, w, who='ic', **body):
    return client.post(f"/api/intake/{w['intake']}/triage", json=body, headers=auth(w[who]))


def test_endorsing_to_a_counselor_opens_the_case_with_the_risk_level(client, world):
    r = triage(client, world, phq9_responses=[3, 3, 3, 3, 3, 3, 3, 2, 0],   # 23: severe
               gad7_responses=[1] * 7, triage_decision='ENDORSE_CC', assigned_counselor_id=str(world['counselor']))
    assert r.status_code == 200, r.get_json()
    case = db.db.cases.find_one({'student_id': world['student']})
    assert case['case_status'] == 'ACTIVE'
    assert case['risk_level'] == 'RED'
    assert case['assigned_counselor_id'] == world['counselor']
    assert db.db.appointments.find_one({'_id': world['appointment']})['status'] == 'COMPLETED'
    assert db.db.intakes.find_one({'_id': world['intake']})['phq9_score'] == 23


def test_the_counselor_can_override_the_calculated_risk(client, world):
    r = triage(client, world, phq9_responses=[0] * 9, triage_decision='ENDORSE_CP',
               risk_override='RED', assigned_counselor_id=str(world['psych']))
    assert r.status_code == 200
    assert db.db.cases.find_one({'student_id': world['student']})['risk_level'] == 'RED'


def test_endorsement_must_go_to_the_matching_role(client, world):
    r = triage(client, world, phq9_responses=[0] * 9, triage_decision='ENDORSE_CC', assigned_counselor_id=str(world['psych']))
    assert r.status_code == 400


def test_closing_at_intake_needs_notes_and_closes_the_case(client, world):
    assert triage(client, world, phq9_responses=[0] * 9, triage_decision='CLOSE_AT_INTAKE').status_code == 400
    r = triage(client, world, phq9_responses=[0] * 9, triage_decision='CLOSE_AT_INTAKE',
               endorsement_notes='Concern resolved; gave resources for study skills.')
    assert r.status_code == 200
    assert db.db.cases.find_one({'student_id': world['student']})['case_status'] == 'CLOSED'


@pytest.mark.parametrize('body', [
    {'phq9_responses': [0] * 8, 'triage_decision': 'ENDORSE_CC'},          # incomplete PHQ-9
    {'phq9_responses': [0] * 9, 'triage_decision': 'SOMETHING_ELSE'},
    {'phq9_responses': [0] * 9},                                           # no decision
])
def test_bad_triage_is_refused(client, world, body):
    assert triage(client, world, **body).status_code == 400


def test_students_and_counselors_cannot_triage(client, world):
    assert triage(client, world, who='student', phq9_responses=[0] * 9, triage_decision='ENDORSE_CC').status_code == 403
    assert triage(client, world, who='counselor', phq9_responses=[0] * 9, triage_decision='ENDORSE_CC').status_code == 403
