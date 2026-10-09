# CPS Operations Plan

What the system does on its own, and what CPS staff decide and do. Items marked
**Decision needed** must be confirmed by the CPS office before going live.

## 1. Crisis results outside office hours

**What the system does**
- Every new In Crisis result from EMA alerts, in the app, every case manager and the student's
  own counselor or psychologist (bell icon, marked Urgent, linking to the queue or the case).
- It also emails them. The email names no student; it only asks them to open CPS.
- One alert per student per 12 hours, so many crisis chats in one night are one alert.
- The crisis stays at the top of the CM Queue until someone reviews it and writes a note.
- Students always see the NCMH Crisis Hotline (1553, free, 24/7) on their dashboard.

**Decision needed**
- Who is on call nights, weekends and holidays, and how they are reached (phone, not only email).
- The expected response time (the analytics treat over 24 hours as overdue).
- What the on-call person does: call the student, contact their emergency contact, or call
  emergency services, and when each applies.
- Whether EMA's webhook is turned on (`EMA_WEBHOOK_SECRET`). Without it, results arrive with the
  6-hourly sync, so an alert can come up to 6 hours after the chat.

## 2. Data retention and deletion

**What the system does now**
- Keeps all records. Nothing is deleted automatically.
- Students can disconnect EMA in Profile; CPS stops receiving new results.
- Deletion requests go to the Data Privacy Officer by email (stated in the EMA privacy notice).

**Decision needed** (RA 10173 requires a stated retention period)
- How long closed cases, session notes, EMA results, journals and audit logs are kept
  (the project one-pager proposes 7 years after case closure).
- Whether old records are deleted or anonymized when the period ends, and who approves it.
- How the DPO handles a deletion request and how long it may take.

Until decided, nothing should be deleted automatically.

## 3. Staff leaving or going on leave

**What the system does**
- An admin cannot deactivate a counselor, psychologist or case manager who still has upcoming
  appointments or open cases. They must be reassigned first.

**Decision needed**
- Who reassigns cases, and how the student is told about their new counselor.
- A handover note: what the leaving counselor writes for the next one.

## 4. Google Calendar and meeting links

**What the system does**
- Online sessions get a link on the platform the student chose (Zoom or Google Meet). If that
  platform is unavailable, the other one is used, so the student always gets a link.
- Zoom works with the CPS Zoom account in `.env`.
- Google Meet needs a Google Calendar connection, which no one has made yet.

**Decision needed**
- Connect a CPS-wide Google account (admin) or each counselor's own calendar.
- Who owns the Zoom and Google accounts and their passwords.

## 5. Running in production

- Run the backend with gunicorn, not `python app.py` (see README, "Production build").
- Production refuses to start without its own `SECRET_KEY` and `JWT_SECRET_KEY`.
- Change every seeded account password; the README lists them publicly.

**Decision needed**
- Where it is hosted, who has server access, and HTTPS (required for login tokens).
- Backups: how often MongoDB is backed up, where backups are kept, and a tested restore.

## 6. Known cleanup (no decision needed, planned work)

- Several features store the same kind of data in two places (`cases` and `counseling_cases`,
  four intake collections, availability saved twice, two reminder APIs, two feedback stores).
  They should be merged into one each, with a migration.
- 20 appointment statuses overlap (APPROVED and CONFIRMED, PENDING and REQUESTED and
  PENDING_APPROVAL, REFERRAL and REFERRED). They should be reduced to one clear lifecycle.
- `appointments_backup_before_pht_fix` (91 records) is a leftover backup from an old time-zone
  fix. Delete it once nobody needs it.
- Tests cover triage, EMA, access rules and meeting links. Booking, intake and session notes
  still need tests.
