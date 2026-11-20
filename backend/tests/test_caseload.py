"""Severity- and specialty-aware counselor recommendation for IC routing (cps_system_test database)."""
from datetime import datetime, timezone

import pytest
from bson import ObjectId
from flask_jwt_extended import create_access_token

from app import app
from models import db
from services.caseload import specialties_for, matched_specialties, pick_recommended


# ── Pure helpers ─────────────────────────────────────────────────────────────

def test_specialties_for_maps_concern_and_service():
    assert 'Academic Performance' in specialties_for('academic')
    assert specialties_for('career_guidance') == ['Career Counseling']
    assert specialties_for('', None, 'unknown') == []
    both = specialties_for('academic', 'academic_concerns')
    assert len(both) == len(set(both))


def test_specialties_for_free_text_concern():
    got = specialties_for('Academic stress, anxiety')
    assert 'Academic Performance' in got and 'Stress and Anxiety' in got
    assert specialties_for('just wants to talk') == []


def test_matched_specialties_is_case_insensitive():
    assert matched_specialties(['career counseling'], ['Career Counseling']) == ['Career Counseling']
    assert matched_specialties(None, ['Career Counseling']) == []


def _row(cid, score=0, high=0, match=False, name='x'):
    return {'counselor_id': cid, '_score': score, 'high_risk_cases': high,
            'matched_specialties': ['A'] if match else [], 'last_name': name}


def test_specialist_beats_lighter_workload():
    rows = [_row('light', score=1), _row('spec', score=6, match=True)]
    assert pick_recommended(rows, 'GREEN') == 'spec'


def test_red_intake_prefers_fewer_high_risk_cases():
    rows = [_row('busy_red', score=2, high=4), _row('calm', score=5, high=0)]
    assert pick_recommended(rows, 'RED') == 'calm'
    # Not urgent: high-risk count is not a tiebreaker, workload is
    assert pick_recommended(rows, 'GREEN') == 'busy_red'


def test_pick_recommended_empty():
    assert pick_recommended([], 'RED') is None


# ── Endpoint ─────────────────────────────────────────────────────────────────

@pytest.fixture(scope='module')
def world():
    tdb = db.db
    assert tdb.name == 'cps_system_test'
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    ids = {'ic': tdb.users.insert_one({'email': f'ic-{ObjectId()}@test.local', 'role': 'IC',
                                       'first_name': 'I', 'last_name': 'C', 'is_active': True}).inserted_id}
    for name in ('busy', 'calm'):
        ids[name] = tdb.users.insert_one({'email': f'{name}-{ObjectId()}@test.local', 'role': 'PSYCHOLOGIST',
                                          'first_name': name, 'last_name': name, 'is_active': True}).inserted_id
    tdb.staff_settings.insert_one({'user_id': ids['calm'], 'specialty_areas': ['Stress and Anxiety']})
    case_ids = []
    for risk in ('RED', 'RED', 'CRITICAL', 'GREEN'):
        case_ids.append(tdb.cases.insert_one({'assigned_counselor_id': ids['busy'], 'case_status': 'ACTIVE',
                                              'risk_level': risk, 'created_at': now}).inserted_id)
    case_ids.append(tdb.cases.insert_one({'assigned_counselor_id': ids['busy'], 'case_status': 'CLOSED',
                                          'risk_level': 'RED', 'created_at': now}).inserted_id)
    yield ids
    tdb.users.delete_many({'_id': {'$in': [ids['ic'], ids['busy'], ids['calm']]}})
    tdb.staff_settings.delete_many({'user_id': ids['calm']})
    tdb.cases.delete_many({'_id': {'$in': case_ids}})


def test_workload_endpoint_reports_high_risk_and_specialty(world):
    client = app.test_client()
    with app.app_context():
        headers = {'Authorization': f'Bearer {create_access_token(identity=str(world["ic"]))}'}
    r = client.get('/api/appointments/ic-counselor-workload?role=PSYCHOLOGIST&risk_level=RED&concern=personal',
                   headers=headers)
    assert r.status_code == 200
    body = r.get_json()
    by_id = {c['counselor_id']: c for c in body['counselors']}
    busy, calm = by_id[str(world['busy'])], by_id[str(world['calm'])]
    assert busy['high_risk_cases'] == 3          # closed RED case not counted
    assert busy['active_cases'] == 4
    assert calm['high_risk_cases'] == 0
    assert calm['matched_specialties'] == ['Stress and Anxiety']
    assert busy['matched_specialties'] == []
    assert body['high_risk_warning_threshold'] == 3
