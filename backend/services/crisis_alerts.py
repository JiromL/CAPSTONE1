"""
Alerts for new In Crisis EMA results.

Without these, a crisis was only seen when someone happened to open the CM Queue. Each new
In Crisis result now notifies, in the app, every case manager and the student's own
counselor or psychologist, and sends them a short email.

* The email names no student and gives no detail: email is less private than CPS. It only
  says to open CPS, where the in-app alert has the name and a link.
* One alert per student per ALERT_COOLDOWN: ten crisis chats in one night are one alert.
* Old results that arrive late (for example a student's history when they first link EMA)
  do not alert; only crises from the last RECENT_HOURS do.
"""
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

ALERT_TYPE = 'EMA_CRISIS'
ALERT_COOLDOWN = timedelta(hours=12)
RECENT_HOURS = 48
OPEN_CASE = ('NEW', 'INTAKE_SCHEDULED', 'ACTIVE', 'PENDING_TERMINATION')


def _recipients(db, student_id):
    """Every active case manager, plus the clinician on the student's open case."""
    out = [(u['_id'], u.get('email'), '/case-manager/queue')
           for u in db.users.find({'role': 'CASE_MANAGER', 'is_active': {'$ne': False}}, {'email': 1})]
    case = db.cases.find_one({'student_id': student_id}, sort=[('created_at', -1)])
    status = ((case or {}).get('case_status') or (case or {}).get('status') or '').upper()
    if case and status in OPEN_CASE and case.get('assigned_counselor_id'):
        clinician = db.users.find_one({'_id': case['assigned_counselor_id'], 'is_active': {'$ne': False}},
                                      {'email': 1, 'role': 1})
        if clinician and clinician.get('role') in ('COUNSELOR', 'PSYCHOLOGIST'):
            out.append((clinician['_id'], clinician.get('email'), f"/cases/{case['_id']}"))
    seen, unique = set(), []
    for r in out:
        if r[0] not in seen:
            seen.add(r[0])
            unique.append(r)
    return unique


def alert_new_crisis(db, student_id, entry_date, now=None):
    """Call when a new In Crisis result is saved. Returns how many people were alerted."""
    now = now or datetime.utcnow()
    if not student_id or not entry_date or now - entry_date > timedelta(hours=RECENT_HOURS):
        return 0
    if db.notifications.find_one({'type': ALERT_TYPE, 'student_id': student_id,
                                  'created_at': {'$gte': now - ALERT_COOLDOWN}}):
        return 0
    student = db.users.find_one({'_id': student_id}, {'name': 1, 'first_name': 1, 'last_name': 1})
    if not student:
        return 0
    name = student.get('name') or f"{student.get('first_name', '')} {student.get('last_name', '')}".strip()
    when = (entry_date + timedelta(hours=8)).strftime('%b %d, %I:%M %p')
    recipients = _recipients(db, student_id)
    for user_id, email, link in recipients:
        db.notifications.insert_one({
            'target_user_id': str(user_id), 'type': ALERT_TYPE, 'student_id': student_id, 'link': link,
            'title': 'Urgent: In Crisis result on EMA',
            'message': f"{name} had an In Crisis result on EMA ({when}). Please review and follow up.",
            'read': False, 'created_at': now,
        })
        if email:
            try:
                from services.email_service import send_email
                send_email(email, 'CPS: urgent EMA result needs review',
                           'A student in your care has an urgent wellbeing result on EMA.\n\n'
                           'Please sign in to CPS to see who it is and follow up. '
                           'For privacy, this email does not include the student\'s name or details.')
            except Exception as e:      # an email problem must never block the in-app alert
                logger.warning('Crisis alert email failed: %s', e)
    return len(recipients)
