"""Wellness resources: staff share files or links, files are stored and served, and students only
get what was shared with them."""
import io

import pytest
from bson import ObjectId
from flask_jwt_extended import create_access_token

from app import app
from models import db

PDF = b'%PDF-1.4\n%%EOF'


@pytest.fixture(scope='module')
def people():
    tdb = db.db
    assert tdb.name == 'cps_system_test'
    ids = {}
    for name, role in [('student', 'STUDENT'), ('other', 'STUDENT'), ('counselor', 'COUNSELOR'),
                       ('stranger', 'COUNSELOR'), ('admin', 'ADMIN'), ('office', 'STAFF')]:
        ids[name] = (tdb.users.insert_one({'email': f'{name}-{ObjectId()}@test.local', 'role': role, 'name': name,
                                           'is_active': True}).inserted_id, role)
    cases = [tdb.cases.insert_one({'student_id': ids['student'][0], 'assigned_counselor_id': ids['counselor'][0],
                                   'case_status': 'ACTIVE'}).inserted_id,
             tdb.cases.insert_one({'student_id': ids['other'][0], 'assigned_counselor_id': ids['stranger'][0],
                                   'case_status': 'ACTIVE'}).inserted_id]
    yield ids
    uploaded = list(tdb.resources.find({'uploaded_by_user_id': {'$in': [v[0] for v in ids.values()]}}))
    for r in uploaded:
        if r.get('file_id'):
            tdb.resource_files.files.delete_one({'_id': r['file_id']})
            tdb.resource_files.chunks.delete_many({'files_id': r['file_id']})
    tdb.resources.delete_many({'_id': {'$in': [r['_id'] for r in uploaded]}})
    tdb.users.delete_many({'_id': {'$in': [v[0] for v in ids.values()]}})
    tdb.cases.delete_many({'_id': {'$in': cases}})


@pytest.fixture(scope='module')
def client():
    return app.test_client()


def auth(person):
    user_id, role = person
    with app.app_context():
        return {'Authorization': f'Bearer {create_access_token(identity=str(user_id), additional_claims={"role": role})}'}


def share(client, person, **form):
    data = {'title': form.pop('title', 'Guide'), **form}
    if 'file' in data:
        data['file'] = (io.BytesIO(data['file'][1]), data['file'][0])
    return client.post('/api/resources/upload', headers=auth(person), data=data, content_type='multipart/form-data')


def titles(client, person):
    return {r['title'] for r in client.get('/api/resources/student', headers=auth(person)).get_json()['resources']}


def test_counselor_file_reaches_only_their_students(client, people):
    r = share(client, people['counselor'], title='Sleep guide', file=('sleep.pdf', PDF))
    assert r.status_code == 201 and r.get_json()['has_file']
    rid = r.get_json()['_id']
    assert 'Sleep guide' in titles(client, people['student'])
    assert 'Sleep guide' not in titles(client, people['other'])
    got = client.get(f'/api/resources/{rid}/file', headers=auth(people['student']))
    assert got.status_code == 200 and got.data == PDF and got.mimetype == 'application/pdf'
    assert client.get(f'/api/resources/{rid}/file', headers=auth(people['other'])).status_code == 403


def test_admin_shares_with_every_student(client, people):
    r = share(client, people['admin'], title='CPS hotline', url='https://www.dlsu.edu.ph', audience='my_students')
    assert r.status_code == 201 and r.get_json()['audience'] == 'all'
    assert 'CPS hotline' in titles(client, people['other'])


def test_who_can_share_and_what(client, people):
    assert share(client, people['student'], url='https://a.example').status_code == 403
    assert share(client, people['office'], url='https://a.example').status_code == 403
    assert share(client, people['counselor'], file=('tool.exe', b'MZ')).status_code == 400
    assert share(client, people['counselor'], url='javascript:alert(1)').status_code == 400


def test_only_uploader_or_admin_deletes(client, people):
    rid = share(client, people['counselor'], title='Temp', file=('t.txt', b'hi')).get_json()['_id']
    assert client.delete(f'/api/resources/{rid}', headers=auth(people['stranger'])).status_code == 403
    file_id = db.db.resources.find_one({'_id': ObjectId(rid)})['file_id']
    assert client.delete(f'/api/resources/{rid}', headers=auth(people['counselor'])).status_code == 200
    assert db.db.resource_files.chunks.count_documents({'files_id': file_id}) == 0
