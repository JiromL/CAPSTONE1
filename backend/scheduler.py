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
            appt_time = appt.get('requested_start', now)
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
        active = ['CONFIRMED', 'confirmed']

        # 24-hour reminders
        appts_24h = db.db.appointments.find({
            'status': {'$in': active},
            'requested_start': {'$gte': window_24h_start, '$lte': window_24h_end},
        })
        for appt in appts_24h:
            make_reminder(appt, '24h', appt.get('requested_start') - timedelta(hours=24))

        # 1-hour reminders
        appts_1h = db.db.appointments.find({
            'status': {'$in': active},
            'requested_start': {'$gte': window_1h_start, '$lte': window_1h_end},
        })
        for appt in appts_1h:
            make_reminder(appt, '1h', appt.get('requested_start') - timedelta(hours=1))

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


def _scheduler_loop(app, interval_seconds=300):
    while True:
        try:
            _process_reminders(app)
            _process_assessment_schedules(app)
        except Exception as e:
            print(f"[Scheduler] Error: {e}")
        time.sleep(interval_seconds)


def start_scheduler(app):
    """Start the background reminder scheduler thread."""
    t = threading.Thread(target=_scheduler_loop, args=(app,), daemon=True)
    t.start()
    print("[Scheduler] Reminder scheduler started (every 5 min)")
