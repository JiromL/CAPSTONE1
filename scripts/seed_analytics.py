"""
Records the admin analytics read, for seeded cases.

The other seeds create cases, appointments and intakes directly, so several analytics charts had
nothing to show. For every seeded case this adds what real use would have produced:

  * an intake packet (the student's intake form: ICF fields, PHQ-4) for each case's intake,
  * PHQ-9 and GAD-7 assessments at intake (the scores the IC's triage recorded) and a monthly
    re-assessment while the case is open, easing slowly as counseling goes on,
  * a student's session rating for about two thirds of completed counseling sessions,
  * the case's source (walk-in, self-referral or referred) where it is missing.

Safe to run again: it only adds what a case or session does not have yet.
    MONGODB_DB_NAME=cps_system_dev python scripts/seed_analytics.py
"""
import os
import random
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from pymongo import MongoClient

db = MongoClient(os.getenv('MONGODB_URI', 'mongodb://localhost:27017'))[os.getenv('MONGODB_DB_NAME', 'cps_system_dev')]
random.seed(11)
NOW = datetime.now(timezone.utc).replace(tzinfo=None)


def phq9_rating(score):
    """Same bands as blueprints/assessments.calculate_phq9_score."""
    if score <= 4:
        return None, 'Minimal'
    if score <= 9:
        return 'GREEN', 'Mild'
    if score <= 14:
        return 'YELLOW', 'Moderate'
    if score <= 19:
        return 'RED', 'Moderately Severe'
    return 'CRITICAL', 'Severe'


def gad7_rating(score):
    """Same bands as blueprints/assessments.calculate_gad7_score."""
    if score <= 4:
        return None, 'Minimal'
    if score <= 9:
        return 'GREEN', 'Mild'
    if score <= 14:
        return 'YELLOW', 'Moderate'
    return 'RED', 'Severe'


def answers(total, items):
    total = max(0, min(total, 3 * items))
    out = [0] * items
    for _ in range(total):
        i = random.choice([j for j in range(items) if out[j] < 3])
        out[i] += 1
    return out


def assessment(case, kind, score, when, by):
    items, max_score = (9, 27) if kind == 'PHQ9' else (7, 21)
    risk, severity = (phq9_rating if kind == 'PHQ9' else gad7_rating)(score)
    return {'case_id': case['_id'], 'assessment_type': kind, 'raw_score': score, 'max_score': max_score,
            'normalized_score': round(score / max_score * 100, 1), 'severity': severity, 'risk_level': risk,
            'responses': {f'q{i + 1}': v for i, v in enumerate(answers(score, items))},
            'created_by': by, 'created_at': when, 'seeded': True}


SERVICES = {'CRITICAL': 'Crisis Intervention', 'RED': 'Individual Counseling', 'YELLOW': 'Individual Counseling',
            'GREEN': 'Individual Counseling'}
LIKED = ['Felt listened to and not judged.', 'The breathing exercise really helped.',
         'My counselor explained things clearly.', 'Practical tips I can use before exams.',
         'Felt safe to talk about my family.', '']
IMPROVE = ['Longer sessions would help.', 'Hard to find a free slot.', 'More online options.',
           'Nothing, it was good.', '', '']


def main():
    users = {u['_id']: u for u in db.users.find({}, {'first_name': 1, 'last_name': 1, 'email': 1, 'student_id': 1,
                                                    'id_number': 1, 'college': 1, 'course': 1, 'year_level': 1,
                                                    'contact_number': 1})}
    packets = assess = sources = 0
    have_packet = {p.get('appointment_id') for p in db.intake_packets.find({}, {'appointment_id': 1})} | \
                  {p.get('case_id') for p in db.intake_packets.find({}, {'case_id': 1})}
    have_assessment = set(db.assessments.distinct('case_id'))
    new_packets, new_assessments, source_ops = [], [], []
    for case in db.cases.find({}):
        intake = db.intakes.find_one({'case_id': case['_id']}) or {}
        student = users.get(case.get('student_id')) or {}
        opened = case.get('created_at') or NOW
        risk = (case.get('risk_level') or 'GREEN').upper()
        source = (case.get('source') or '').upper()
        if not source:
            source = random.choices(['WALK_IN', 'SELF_REFERRAL', 'REFERRED'], [30, 55, 15])[0]
            source_ops.append(({'_id': case['_id']}, {'$set': {'source': source}}))
            sources += 1

        # The intake form the student filled in before the interview
        if case['_id'] not in have_packet and intake.get('appointment_id') not in have_packet:
            phq4 = answers(random.randint(2, 10) if risk in ('RED', 'CRITICAL') else random.randint(0, 6), 4)
            phq2, gad2 = phq4[0] + phq4[1], phq4[2] + phq4[3]
            submitted = opened - timedelta(hours=random.randint(2, 72))
            new_packets.append({
                'source': 'walkin' if source == 'WALK_IN' else 'online',
                'submitted_by_role': 'staff' if source == 'WALK_IN' else 'student',
                'appointment_id': intake.get('appointment_id'), 'case_id': case['_id'], 'student_id': case.get('student_id'),
                'icf': {'first_name': student.get('first_name', ''), 'last_name': student.get('last_name', ''),
                        'email': student.get('email', ''), 'student_id': student.get('student_id') or student.get('id_number', ''),
                        'college': student.get('college', ''), 'program': student.get('course', ''),
                        'year_level': student.get('year_level', ''), 'phone': student.get('contact_number', ''),
                        'referral_source': 'referred' if source == 'REFERRED' else 'self-referred',
                        'service_requested': SERVICES.get(risk, 'Individual Counseling'),
                        'presenting_concern': case.get('concern') or '',
                        'consent_to_service': True, 'consent_to_data': True},
                'spif': {}, 'phq4_responses': phq4,
                'phq4': {'phq2_score': phq2, 'gad2_score': gad2, 'total_score': phq2 + gad2,
                         'depression_risk': phq2 >= 3, 'anxiety_risk': gad2 >= 3},
                'signature': f"{student.get('first_name', '')} {student.get('last_name', '')}".strip(),
                'signed_at': submitted.isoformat(), 'signature_covers': ['accuracy', 'data_privacy_consent', 'counseling_consent'],
                'consent_audit': {'consent_to_service': True, 'consent_to_data': True, 'consent_timestamp': submitted.isoformat(),
                                  'consent_version': '2025-AY', 'submitted_by': 'walkin' if source == 'WALK_IN' else 'online'},
                'created_at': submitted, 'updated_at': submitted, 'seeded': True,
            })
            packets += 1

        # PHQ-9 / GAD-7 at intake, then monthly while the case is open
        if case['_id'] not in have_assessment and intake.get('status') == 'COMPLETED':
            by = case.get('intake_counselor_id')
            start = intake.get('triaged_at') or opened
            end = min(NOW, case.get('updated_at') or NOW) if (case.get('case_status') == 'CLOSED') else NOW
            phq, gad = intake.get('phq9_score'), intake.get('gad7_score')
            if phq is None or gad is None:
                continue
            when, counselor = start, case.get('assigned_counselor_id') or by
            first = True
            while when <= end:
                new_assessments.append(assessment(case, 'PHQ9', int(phq), when, by if first else counselor))
                new_assessments.append(assessment(case, 'GAD7', int(gad), when, by if first else counselor))
                assess += 2
                first = False
                when += timedelta(days=random.randint(26, 34))
                phq = max(0, phq - random.choice([0, 1, 1, 2, 3]) + random.choice([0, 0, 0, 1]))
                gad = max(0, gad - random.choice([0, 1, 1, 2]) + random.choice([0, 0, 0, 1]))

    if new_packets:
        db.intake_packets.insert_many(new_packets)
    if new_assessments:
        db.assessments.insert_many(new_assessments)
    for q, u in source_ops:
        db.cases.update_one(q, u)

    # Students rate about two thirds of their completed counseling sessions, a day or two after
    rated = 0
    for appt in db.appointments.find({'status': 'COMPLETED', 'evaluation': {'$exists': False},
                                      'student_id': {'$ne': None}, 'purpose': {'$in': ['counseling', 'follow_up']},
                                      'scheduled_start': {'$ne': None}}, {'scheduled_start': 1, 'method': 1}):
        if int(str(appt['_id'])[-6:], 16) % 100 >= 65:   # the same two thirds on every run
            continue
        good = random.random() < 0.8
        score = lambda: random.choice([4, 5, 5]) if good else random.choice([2, 3, 3, 4])
        online = 'online' in (appt.get('method') or '') or 'zoom' in (appt.get('method') or '')
        submitted = min(appt['scheduled_start'] - timedelta(hours=8) + timedelta(hours=random.randint(2, 48)), NOW)
        db.appointments.update_one({'_id': appt['_id']}, {'$set': {'evaluation': {
            'counselor_attitude': score(), 'online_communication': score() if online else 0,
            'counseling_objectives': score(), 'techniques_used': score(), 'overall_experience': score(),
            'liked_most': random.choice(LIKED), 'to_improve': random.choice(IMPROVE),
            'submitted_at': submitted, 'seeded': True}}})
        rated += 1

    print(f'Analytics data: {packets} intake packets, {assess} PHQ-9/GAD-7 assessments, '
          f'{rated} session ratings, {sources} case sources filled in')


if __name__ == '__main__':
    main()
