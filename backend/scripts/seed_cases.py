#!/usr/bin/env python3
"""Seed cases, intakes, and appointments for demo/testing."""
import os
from datetime import datetime, timedelta
from pymongo import MongoClient
from bson.objectid import ObjectId


def get_db():
    uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
    db_name = os.getenv('MONGODB_DB_NAME', os.getenv('MONGODB_DB', 'cps_system_dev'))
    client = MongoClient(uri)
    return client[db_name]


def seed():
    db = get_db()
    
    # Get some user IDs from existing data
    users = list(db.users.find({}, {'_id': 1, 'role': 1}))
    admin_id = next((u['_id'] for u in users if u['role'] == 'ADMIN'), None)
    ic_id = next((u['_id'] for u in users if u['role'] == 'IC'), None)
    counselor_ids = [u['_id'] for u in users if u['role'] == 'PSYCHOLOGIST']
    student_ids = [u['_id'] for u in users if u['role'] == 'STUDENT']
    
    if not all([admin_id, ic_id, counselor_ids, student_ids]):
        print("❌ Missing users. Run seed_users.py first!")
        return
    
    print(f"Found {len(counselor_ids)} counselors and {len(student_ids)} students.\n")
    
    # ============ INTAKES ============
    intakes = []
    for i, student_id in enumerate(student_ids):
        intake = {
            'student_id': student_id,
            'demographics': {
                'age': 19 + i,
                'gender': ['Male', 'Female', 'Non-binary'][i % 3],
                'year': ['Freshman', 'Sophomore', 'Junior'][i % 3],
                'major': ['Engineering', 'Business', 'Biology'][i % 3],
            },
            'chief_complaint': [
                'Feeling anxious and overwhelmed with coursework',
                'Struggling with depression and motivation',
                'Sleep issues and stress management',
            ][i % 3],
            'history': {
                'medical': 'No major medical history',
                'psychiatric': 'Previous anxiety episodes',
                'family': 'Family history of depression',
                'substance': 'No current substance use',
            },
            'status': ['PENDING', 'IN_PROGRESS', 'COMPLETED'][i % 3],
            'created_at': datetime.utcnow() - timedelta(days=7-i),
            'updated_at': datetime.utcnow() - timedelta(days=7-i),
        }
        intakes.append(intake)
    
    result_intakes = db.intakes.insert_many(intakes)
    print(f"✅ Inserted {len(result_intakes.inserted_ids)} intakes\n")
    
    # ============ CASES ============
    cases = []
    for i, (intake_id, student_id) in enumerate(zip(result_intakes.inserted_ids, student_ids)):
        case = {
            'student_id': student_id,
            'intake_id': intake_id,
            'assigned_counselor_id': counselor_ids[i % len(counselor_ids)],
            'status': ['NEW', 'IN_PROGRESS', 'PAUSED'][i % 3],
            'risk_level': ['GREEN', 'YELLOW', 'RED'][i % 3],
            'chief_complaint': intakes[i]['chief_complaint'],
            'presenting_issue': 'Academic stress and mental health concerns',
            'treatment_goals': [
                'Develop coping strategies',
                'Improve academic performance',
                'Reduce anxiety symptoms',
            ],
            'created_at': datetime.utcnow() - timedelta(days=7-i),
            'updated_at': datetime.utcnow() - timedelta(days=7-i),
        }
        cases.append(case)
    
    result_cases = db.cases.insert_many(cases)
    print(f"✅ Inserted {len(result_cases.inserted_ids)} cases\n")
    
    # ============ ASSESSMENTS ============
    assessments = []
    for case_id in result_cases.inserted_ids:
        assessment = {
            'case_id': case_id,
            'type': 'PHQ9',  # Depression screening
            'score': 15,  # Moderate depression (0-27 scale)
            'result': 'MODERATE',
            'created_at': datetime.utcnow() - timedelta(days=5),
            'created_by': ic_id,
        }
        assessments.append(assessment)
    
    result_assessments = db.assessments.insert_many(assessments)
    print(f"✅ Inserted {len(result_assessments.inserted_ids)} assessments\n")
    
    # ============ APPOINTMENTS ============
    appointments = []
    for i, case_id in enumerate(result_cases.inserted_ids):
        start = datetime.utcnow() + timedelta(days=3+i, hours=10)
        end = start + timedelta(hours=1)
        appointment = {
            'case_id': case_id,
            'counselor_id': counselor_ids[i % len(counselor_ids)],
            'requested_start': start,
            'requested_end': end,
            'status': ['REQUESTED', 'CONFIRMED', 'COMPLETED'][i % 3],
            'appointment_type': 'initial',
            'location': 'Counseling Center, Room 101',
            'modality': 'in-person',
            'created_at': datetime.utcnow() - timedelta(days=2),
        }
        appointments.append(appointment)
    
    result_appointments = db.appointments.insert_many(appointments)
    print(f"✅ Inserted {len(result_appointments.inserted_ids)} appointments\n")
    
    # ============ SESSION NOTES ============
    session_notes = []
    for appointment_id in result_appointments.inserted_ids[:2]:  # Add notes for first 2 appointments
        note = {
            'appointment_id': appointment_id,
            'case_id': db.appointments.find_one({'_id': appointment_id})['case_id'],
            'counselor_id': counselor_ids[0],
            'content': 'Student reported feeling stressed about midterms. Discussed coping strategies and time management techniques.',
            'interventions': ['Cognitive Behavioral Therapy', 'Relaxation exercises'],
            'next_steps': 'Schedule follow-up appointment in 2 weeks. Practice relaxation techniques daily.',
            'mood': 'Somewhat anxious but engaged',
            'risk_assessment': 'LOW - No imminent risk; stable support system',
            'created_at': datetime.utcnow() - timedelta(days=1),
            'updated_at': datetime.utcnow() - timedelta(days=1),
        }
        session_notes.append(note)
    
    result_notes = db.session_notes.insert_many(session_notes)
    print(f"✅ Inserted {len(result_notes.inserted_ids)} session notes\n")
    
    print("=" * 50)
    print("✅ ALL SEED DATA INSERTED SUCCESSFULLY!")
    print("=" * 50)
    print()


if __name__ == '__main__':
    seed()
