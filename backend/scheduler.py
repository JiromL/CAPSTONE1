"""
Background scheduler for automated appointment reminders.
Runs in a daemon thread; checks every 5 minutes for due reminders.
"""
import threading
import time
from datetime import datetime, timedelta


def _process_reminders(app):
    """Find upcoming appointments and auto-create/send reminder records."""
    with app.app_context():
        from models import db
        from services.email_service import EmailService
        from services.sms_service import SMSService

        email_svc = EmailService()
        sms_svc = SMSService()
        now = datetime.utcnow()
        window_24h_start = now + timedelta(hours=23, minutes=30)
        window_24h_end   = now + timedelta(hours=24, minutes=30)
        window_1h_start  = now + timedelta(minutes=50)
        window_1h_end    = now + timedelta(hours=1, minutes=10)

        def make_reminder(appt, label, scheduled_for):
            appt_id = appt['_id']
            # Skip if already created
            if db.db.reminders.find_one({'appointment_id': appt_id, 'reminder_type': label}):
                return

            student = db.db.users.find_one({'_id': appt.get('student_id')})
            email = student.get('email', '') if student else ''
            name = f"{student.get('first_name','')} {student.get('last_name','')}".strip() if student else 'Student'
            appt_time = appt.get('scheduled_start') or appt.get('requested_start', now)
            if isinstance(appt_time, datetime):
                appt_time_str = appt_time.strftime('%B %d, %Y at %I:%M %p')
            else:
                appt_time_str = str(appt_time)

            doc = {
                'appointment_id': appt_id,
                'student_id': appt.get('student_id'),
                'student_email': email,
                'student_name': name,
                'reminder_type': label,
                'message': f"Reminder: Your counseling appointment is on {appt_time_str}.",
                'scheduled_for': scheduled_for,
                'status': 'pending',
                'auto_generated': True,
                'created_at': datetime.utcnow(),
            }
            db.db.reminders.insert_one(doc)
            print(f"[Scheduler] Created {label} reminder for {name} ({email})")

        # Active appointment statuses that need reminders
        active = ['CONFIRMED', 'confirmed', 'CHECKED_IN']

        def appt_time(appt):
            """Return the confirmed session time, falling back to the requested time."""
            return appt.get('scheduled_start') or appt.get('requested_start')

        # 24-hour reminders — match on scheduled_start first, fall back to requested_start
        appts_24h = db.db.appointments.find({
            'status': {'$in': active},
            '$or': [
                {'scheduled_start': {'$gte': window_24h_start, '$lte': window_24h_end}},
                {'scheduled_start': {'$exists': False}, 'requested_start': {'$gte': window_24h_start, '$lte': window_24h_end}},
            ],
        })
        for appt in appts_24h:
            t = appt_time(appt)
            if t:
                make_reminder(appt, '24h', t - timedelta(hours=24))

        # 1-hour reminders
        appts_1h = db.db.appointments.find({
            'status': {'$in': active},
            '$or': [
                {'scheduled_start': {'$gte': window_1h_start, '$lte': window_1h_end}},
                {'scheduled_start': {'$exists': False}, 'requested_start': {'$gte': window_1h_start, '$lte': window_1h_end}},
            ],
        })
        for appt in appts_1h:
            t = appt_time(appt)
            if t:
                make_reminder(appt, '1h', t - timedelta(hours=1))

        # Send overdue pending reminders via email
        due = db.db.reminders.find({
            'status': 'pending',
            'auto_generated': True,
            'scheduled_for': {'$lte': now},
        })
        for r in due:
            recipient = r.get('student_email', '')
            name = r.get('student_name', 'Student')
            rtype = r.get('reminder_type', '24h')
            appt_time = r.get('message', '')
            sent = False
            if recipient:
                try:
                    sent = email_svc.send_reminder_email(recipient, name, rtype, appt_time)
                except Exception as e:
                    print(f"[Scheduler] Email error: {e}")
            # Also attempt SMS if student has a phone number
            student = db.db.users.find_one({'_id': r.get('student_id')}) if r.get('student_id') else None
            if student and student.get('phone'):
                try:
                    sms_svc.send_appointment_reminder(student['phone'], name, appt_time, rtype)
                except Exception as e:
                    print(f"[Scheduler] SMS error: {e}")
            db.db.reminders.update_one(
                {'_id': r['_id']},
                {'$set': {'status': 'sent' if sent else 'failed', 'sent_at': now}}
            )
            print(f"[Scheduler] {'Sent' if sent else 'Failed'} reminder to {recipient} ({rtype})")


def _process_assessment_schedules(app):
    """Create due scheduled assessments and advance next_due dates."""
    with app.app_context():
        from models import db
        now = datetime.utcnow()
        due = db.db.assessment_schedules.find({'active': True, 'next_due': {'$lte': now}})
        for sched in due:
            existing = db.db.scheduled_assessments.find_one({
                'schedule_id': sched['_id'],
                'due_date': sched['next_due'],
                'status': {'$in': ['pending', 'completed']},
            })
            if not existing:
                db.db.scheduled_assessments.insert_one({
                    'schedule_id': sched['_id'],
                    'case_id': sched['case_id'],
                    'assessment_type': sched['assessment_type'],
                    'due_date': sched['next_due'],
                    'status': 'pending',
                    'created_at': now,
                })
                print(f"[Scheduler] Created scheduled {sched['assessment_type']} for case {sched['case_id']}")
            # Advance next_due by interval
            next_due = sched['next_due'] + timedelta(days=sched.get('interval_days', 7))
            db.db.assessment_schedules.update_one(
                {'_id': sched['_id']},
                {'$set': {'next_due': next_due}},
            )


PERMA_SYNC_INTERVAL_SECONDS = 6 * 60 * 60  # every 6 hours


def _get_fresh_ema_token():
    """Login to EMA with staff credentials from env and return a fresh dashboard token."""
    import os, requests as req
    base = os.getenv('MHBOT_BASE_URL', 'https://pchrd-ema.dlsu.edu.ph/backend')
    username = os.getenv('EMA_ADMIN_USERNAME', '')
    password = os.getenv('EMA_ADMIN_PASSWORD', '')
    if not username or not password:
        return None
    try:
        r = req.post(f'{base}/api/v1/auth/login',
            data={'grant_type': 'password', 'username': username, 'password': password, 'scope': 'chat dashboard'},
            headers={'accept': 'application/json'}, timeout=10)
        if r.ok:
            return r.json().get('access_token')
    except Exception as e:
        print(f'[Scheduler] EMA login error: {e}')
    return None


def _sync_perma_labels(app):
    """Fetch latest PERMA history from EMA for all linked students and save to DB."""
    with app.app_context():
        from models import db
        from blueprints.mhbot_integration import get_perma_history

        staff_token = _get_fresh_ema_token()
        if not staff_token:
            print('[Scheduler] PERMA sync skipped — EMA login failed (check EMA_ADMIN_USERNAME/EMA_ADMIN_PASSWORD in .env)')
            return

        # Only students who agreed to share EMA data with CPS
        students = list(db.db.users.find(
            {'mhbot_username': {'$exists': True, '$ne': None}, 'role': 'STUDENT', 'ema_consent_given': True},
            {'_id': 1, 'mhbot_username': 1}
        ))

        synced, failed = 0, 0
        for student in students:
            try:
                result = get_perma_history(
                    student['mhbot_username'],
                    staff_token,
                    limit=50,
                    save=True,
                    student_user_id=student['_id'],
                )
                if result['success']:
                    synced += 1
                else:
                    failed += 1
            except Exception as e:
                failed += 1
                print(f"[Scheduler] PERMA sync error for {student['mhbot_username']}: {e}")

        print(f"[Scheduler] PERMA sync complete — {synced} synced, {failed} failed, {len(students)} total students")


EMA_TOKEN_REFRESH_INTERVAL_SECONDS = 6 * 60 * 60  # EMA refresh tokens expire after 24h


def _refresh_ema_chat_tokens(app):
    """Renew every linked student's EMA chat key so the widget stays signed in."""
    with app.app_context():
        from blueprints.mhbot_integration import refresh_all_student_ema_tokens
        r = refresh_all_student_ema_tokens()
        print(f"[Scheduler] EMA chat keys renewed — {r['renewed']} renewed, {r['relink']} need re-link, {r['failed']} failed")


def _refresh_triage(app):
    with app.app_context():
        from models import db
        from services.perma_triage import refresh_all_triage
        print(f"[Scheduler] PERMA triage recomputed for {refresh_all_triage(db.db)} students")


def _claim(app, job, every_seconds):
    """True for exactly one server process per period. A production server runs several
    processes, each with this thread; a lease in MongoDB stops them all sending the same
    reminders and syncing EMA at once. The lease also survives restarts."""
    from pymongo.errors import DuplicateKeyError
    with app.app_context():
        from models import db
        now = datetime.utcnow()
        lease = {'next_run': now + timedelta(seconds=every_seconds), 'last_run': now}
        if db.db.scheduler_runs.find_one_and_update({'_id': job, 'next_run': {'$lte': now}}, {'$set': lease}):
            return True
        try:
            db.db.scheduler_runs.insert_one({'_id': job, **lease})   # first run ever
            return True
        except DuplicateKeyError:
            return False


def _scheduler_loop(app, interval_seconds=300):
    while True:
        try:
            if _claim(app, 'reminders', interval_seconds - 10):
                _process_reminders(app)
                _process_assessment_schedules(app)

            # Run PERMA sync every 6 hours, then recompute triage (its 7-day window
            # moves with time even when no new results arrive)
            if _claim(app, 'perma_sync', PERMA_SYNC_INTERVAL_SECONDS):
                _sync_perma_labels(app)
                _refresh_triage(app)

            # Renew student EMA chat keys every 6 hours
            if _claim(app, 'ema_keys', EMA_TOKEN_REFRESH_INTERVAL_SECONDS):
                _refresh_ema_chat_tokens(app)

        except Exception as e:
            print(f"[Scheduler] Error: {e}")
        time.sleep(interval_seconds)


def start_scheduler(app):
    """Start the background scheduler thread."""
    t = threading.Thread(target=_scheduler_loop, args=(app,), daemon=True)
    t.start()
    print("[Scheduler] Scheduler started (reminders every 5 min, PERMA sync and EMA key renewal every 6 hours)")
