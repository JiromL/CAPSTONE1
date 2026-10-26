"""
Intake records for seeded cases.

The case page's Intake tab reads the `intakes` collection (GET /api/intake/case/<id>), which the IC's
triage fills in real use. The other seeds create cases directly, so without this every seeded case
said "No intake record found". For each case that has no intake yet:

  * endorsed or closed cases get a COMPLETED intake with the IC's triage: PHQ-9 / GAD-7 answers that
    match the case (the IC form's scores when it has them, otherwise scores in the case's risk band),
    the decision (endorsed to a counselor or psychologist, or closed at intake) and when it was made;
  * cases still waiting for their interview (NEW / INTAKE_SCHEDULED, nobody assigned) get a PENDING one.

Safe to run again: cases that already have an intake are left alone.
    MONGODB_DB_NAME=cps_system_dev python scripts/seed_intakes.py
"""
import os
import random
from datetime import datetime, timedelta, timezone

from pymongo import MongoClient

db = MongoClient(os.getenv('MONGODB_URI', 'mongodb://localhost:27017'))[os.getenv('MONGODB_DB_NAME', 'cps_system_dev')]
random.seed(7)
NOW = datetime.now(timezone.utc).replace(tzinfo=None)

# Score bands that land in each risk level under intake.get_risk_level
# (RED: PHQ-9 > 20 or GAD-7 > 15; YELLOW: PHQ-9 > 15 or GAD-7 > 12; GREEN otherwise)
BANDS = {'GREEN': ((2, 14), (1, 11)), 'YELLOW': ((16, 20), (9, 14)), 'RED': ((21, 25), (12, 18)),
         'CRITICAL': ((23, 27), (16, 21))}


def answers(total, items):
    """`items` answers of 0-3 that add up to `total`."""
    total = max(0, min(total, 3 * items))
    out = [0] * items
    for _ in range(total):
        i = random.choice([j for j in range(items) if out[j] < 3])
        out[i] += 1
    return out


def risk_for(phq9, gad7):
    if phq9 > 20 or gad7 > 15:
        return 'RED'
    if phq9 > 15 or gad7 > 12:
        return 'YELLOW'
    return 'GREEN'


def main():
    have = set(db.intakes.distinct('case_id'))
    users = {u['_id']: u for u in db.users.find({'role': {'$ne': 'STUDENT'}}, {'role': 1})}
    made = {'COMPLETED': 0, 'PENDING': 0}
    for case in db.cases.find({'_id': {'$nin': list(have)}}):
        form = case.get('intake_interview_form') or {}
        status = case.get('case_status') or case.get('status')
        counselor = users.get(case.get('assigned_counselor_id'))
        role = case.get('endorsed_to_role') or (counselor or {}).get('role')
        waiting = status in ('NEW', 'INTAKE_SCHEDULED') and not counselor and not form
        risk = (case.get('risk_level') or 'GREEN').upper()
        (p_lo, p_hi), (g_lo, g_hi) = BANDS.get(risk, BANDS['GREEN'])
        phq9_score = form.get('phq9_score') if isinstance(form.get('phq9_score'), int) else random.randint(p_lo, p_hi)
        gad7_score = form.get('gad7_score') if isinstance(form.get('gad7_score'), int) else random.randint(g_lo, g_hi)
        appt = db.appointments.find_one({'student_id': case['student_id'], 'purpose': 'intake_interview'},
                                        sort=[('scheduled_start', -1)])
        opened = case.get('created_at') or NOW
        doc = {
            'case_id': case['_id'], 'student_id': case['student_id'],
            'appointment_id': appt['_id'] if appt else None,
            'counselor_id': case.get('intake_counselor_id') or (appt or {}).get('counselor_id'),
            'source': 'walk_in' if (case.get('source') or '').upper() == 'WALK_IN' else 'online',
            'concern': case.get('concern') or form.get('presenting_concern') or '',
            'purpose': 'intake_interview', 'method': (appt or {}).get('method', 'in_person'),
            'is_emergency': risk == 'CRITICAL', 'responses': {},
            'created_at': opened, 'updated_at': opened, 'seeded': True,
        }
        if waiting:
            doc.update({'status': 'PENDING', 'risk_level': risk})
            made['PENDING'] += 1
        else:
            closed_at_intake = status in ('CLOSED', 'CANCELLED') and not counselor
            decision = 'CLOSE_AT_INTAKE' if closed_at_intake else ('ENDORSE_CP' if role == 'PSYCHOLOGIST' else 'ENDORSE_CC')
            when = form.get('session_date')
            if isinstance(when, str):
                try:
                    when = datetime.fromisoformat(when.replace('Z', ''))
                except ValueError:
                    when = None
            triaged_at = min(case.get('endorsed_at') or when or opened + timedelta(days=random.randint(1, 5)), NOW)
            doc.update({
                'status': 'COMPLETED',
                'phq9_responses': answers(phq9_score, 9), 'phq9_score': phq9_score,
                'gad7_responses': answers(gad7_score, 7), 'gad7_score': gad7_score,
                'calculated_risk': risk_for(phq9_score, gad7_score), 'risk_level': risk,
                'triage_decision': decision,
                'endorsement_notes': form.get('endorsement_notes') or (
                    'Concerns addressed at intake; no further sessions needed.' if closed_at_intake else
                    f"Endorsed to {'a psychologist' if decision == 'ENDORSE_CP' else 'a counselor'} for continuing sessions."),
                'triaged_by': str(case.get('intake_counselor_id') or ''),
                'triaged_at': triaged_at, 'updated_at': triaged_at,
            })
            made['COMPLETED'] += 1
        result = db.intakes.insert_one(doc)
        db.cases.update_one({'_id': case['_id']}, {'$set': {'intake_id': result.inserted_id}})
    print(f"Intake records: {made['COMPLETED']} completed, {made['PENDING']} waiting for interview "
          f"({len(have)} cases already had one)")


if __name__ == '__main__':
    main()
