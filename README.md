# CPS — Counseling and Psychological Services System

A full-stack web application for managing student counseling at De La Salle University. Handles the full counseling workflow: student booking, intake interviews, case management, session notes, PERMA wellbeing tracking, analytics, and reporting.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS v4 |
| Backend | Python 3.12, Flask 3.1 |
| Database | MongoDB (pymongo 4.7) |
| Auth | JWT (flask-jwt-extended) |
| Wellbeing chatbot | EMA (DLSU PCHRD) through its API: chat inside CPS and PERMA results |

## Project Structure

```
CAPSTONE1/
├── frontend/               # Next.js App Router application
│   └── src/
│       ├── app/            # Route pages (dashboard, staff, auth)
│       └── components/     # Shared UI components
├── backend/                # Flask API
│   ├── app.py              # Entry point (also applies the case-record access rule)
│   ├── blueprints/         # Route handlers by domain
│   ├── services/           # perma_triage.py: EMA triage and trend scoring
│   ├── scheduler.py        # Reminders, EMA sync, triage refresh, EMA key renewal
│   ├── tests/              # pytest suite (uses the cps_system_test database)
│   └── requirements.txt
└── scripts/                # Seed scripts
    ├── seed.py                  # Main seed (run first)
    ├── enrich_ic_forms.py       # IC interview form data for all 35 cases
    ├── seed_bookings.py         # REQUESTED + PENDING_APPROVAL appointments
    ├── seed_structured_soap.py  # Structured SOAP session notes
    ├── seed_all.py              # Single-command seed runner (calls all scripts)
    ├── seed_announcements.py    # Announcements (title, body, type, pinned)
    └── seed_ema.py              # EMA consent, triage scenarios, crisis reviews, journals
```

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.12+
- MongoDB running locally on port 27017. With Homebrew on macOS, `brew services` may not work for
  `mongodb-community`; run `mongod --config /opt/homebrew/etc/mongod.conf` in its own terminal instead.

### Environment

The backend reads the project-root `.env` first, then `backend/.env`. Neither is committed.

| Variable | Purpose |
|----------|---------|
| `FLASK_ENV` | `development` uses the **`cps_system_dev`** database (where the seed data lives); `production` uses `cps_system` |
| `SECRET_KEY`, `JWT_SECRET_KEY` | Flask and login token secrets |
| `MHBOT_BASE_URL`, `EMA_ADMIN_USERNAME`, `EMA_ADMIN_PASSWORD` | Shared EMA staff account used to read PERMA results |
| `EMA_TOKEN_KEY` | Encrypts each student's saved EMA sign-in key. Keep it stable: changing it makes every student link EMA again |
| `EMA_WEBHOOK_SECRET` | Shared secret for EMA's push webhook. Until it is set the webhook is off and results arrive through the 6-hourly sync |
| `SMTP_*`, `GOOGLE_*`, `ZOOM_*` | Email, Google Calendar and Zoom integrations |
| `frontend/.env.local` → `NEXT_PUBLIC_API_BASE` | Backend URL, normally `http://localhost:5001` |

### Frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
PORT=5001 python app.py
# Runs on http://localhost:5001
# Note: port 5000 is occupied by macOS AirPlay Receiver
```

### Seeding the Database

`seed_all.py` **wipes `cps_system_dev`** and rebuilds it in one command:

```bash
backend/venv/bin/python scripts/seed_all.py
```

It runs, in order: `seed.py` (base data), `enrich_ic_forms.py`, `seed_bookings.py`, `seed_structured_soap.py`,
`seed_announcements.py`, `seed_ema.py` and the staff sample data.

`seed_ema.py` makes the EMA data follow the app's triage rules: EMA consent for every linked student, when each
result reached CPS, about 4 months of history, crisis reviews with notes, journal entries (some saved from EMA),
and triage labels computed with `backend/services/perma_triage.py`. It also scripts one student per triage
situation. Log in as the case manager (`cm@dlsu.edu.ph`) and open the CM Queue to see them:

| Student | Situation | Expected label |
|---------|-----------|----------------|
| Maria Santos (`msantos2@`) | Crisis 2 hours ago, not reviewed | In Crisis |
| Alex Chen (`achen@`) | Crisis 2 days ago, not reviewed (overdue) | In Crisis |
| Mark Smith (`msmith@`) | Crisis reviewed 3 days ago | Struggling, crisis reviewed |
| Carlos Diaz (`cdiaz@`) | Reviewed 8 days ago, in crisis again yesterday | In Crisis (red in Recently reviewed) |
| Miguel Santos (`msantos@`) | Crisis that reached CPS after a review | In Crisis, not counted as reviewed |
| Harold Santos (`hsantos@`) | Struggling 3 times in 7 days | Struggling, persistent struggle |
| Jake Villanueva (`jvillanueva@`) | Struggling and Excelling on the same day | Struggling, unstable mood |
| Nina Cruz (`ncruz@`) | No check-in for 12 days | Struggling, marked stale |

After seeding: **64 users, 45 cases, about 2,500 EMA results, about 130 crisis reviews, about 55 journal entries**

### Tests

```bash
cd backend
venv/bin/python -m pytest tests -q
```

Tests run against the separate `cps_system_test` database with the background scheduler off, so they never
touch development data or call EMA. They cover the triage rules and the access rules (students only see
their own records; counselors only cases assigned to them).

### Production build

```bash
cd frontend && npm run build && npm start
```

Backend in production: use a real server, not `python app.py` (Flask's development server):

```bash
cd backend
FLASK_ENV=production SECRET_KEY=... JWT_SECRET_KEY=... MONGODB_URI=... \
  venv/bin/gunicorn -w 4 -b 0.0.0.0:5001 "app:app"
```

- Production refuses to start without its own `SECRET_KEY` and `JWT_SECRET_KEY` (the built-in
  defaults are public in this repository).
- Background jobs (reminders, EMA sync, triage, EMA key renewal) run in every server process,
  but a lease in the `scheduler_runs` collection lets only one process run each job per period.
- Set `EMAIL_DISABLED=1` in development: seeded accounts use real-looking `@dlsu.edu.ph`
  addresses, and with SMTP settings present the app really sends email.

### Time conventions

- Appointment times (`scheduled_start`, `requested_start`, ...) are stored as **Philippine
  wall-clock time without a timezone**. Compare them with `utcnow() + 8 hours`, never `utcnow()`.
- Everything else (`created_at`, EMA results' `entry_date`, reviews) is **UTC**.
- In the frontend, use `todayPH()` and `ymd()` from `utils/dateUtils.ts` for calendar dates.
  `toISOString()` converts to UTC, which in the Philippines turns local midnight into the
  previous day.
- EMA rules that are about days group results by Philippine calendar day.

Design mockups under `/design` are available in development only and return 404 in production builds.

## Test Accounts

> These seeded accounts and passwords are public in this README. Change them before putting the app on
> the internet (for example through ngrok).

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@dlsu.edu.ph | admin123 |
| DPO | dpo@dlsu.edu.ph | dpo123 |
| Staff | staff@dlsu.edu.ph | staff123 |
| Case Manager | cm@dlsu.edu.ph | cm123 |
| IC | julse@dlsu.edu.ph | julse123 |
| Counselor | rose.t@dlsu.edu.ph | roset123 |
| Psychologist | daryl@dlsu.edu.ph | daryl123 |
| Student (active case) | ejohnson@dlsu.edu.ph | stu001 |
| Student (active RED case) | achen@dlsu.edu.ph | stu006 |

All `@dlsu.edu.ph` accounts — full list in `scripts/seed.py`.

## User Roles

| Role | Description |
|------|-------------|
| `ADMIN` | Full system access, user management |
| `DPO` | Data privacy officer, audit logs |
| `STAFF` | Appointment requests, walk-in intake |
| `CASE_MANAGER` | Case oversight, reports |
| `IC` | Intake Coordinator — conducts initial interviews |
| `COUNSELOR` | Manages assigned cases and sessions |
| `PSYCHOLOGIST` | Manages assigned cases and sessions (clinical) |
| `STUDENT` | Books appointments, views own case |

## Workflow

```
Student books → REQUESTED
Staff assigns counselor + time → PENDING_APPROVAL
Counselor confirms → CONFIRMED
Session occurs → COMPLETED
```

Walk-in path: Student arrives → IC conducts intake interview → Case created → Endorsed to counselor/psychologist

## Key Features

- **Appointment booking** — student self-book with consent capture, staff assign workflow
- **IC Interview Wizard** — 11-step structured intake form (4Ps, risk assessment, recommendations)
- **Case management** — case lifecycle (NEW → INTAKE_SCHEDULED → ACTIVE → PENDING_TERMINATION → CLOSED)
- **Session notes** — free-form SOAP, structured SOAP form (checkboxes), and narrative formats
- **Safety plans** — crisis safety plan creation and tracking
- **PERMA tracker** — wellbeing snapshots across Positive Emotion, Engagement, Relationships, Meaning, Accomplishment
- **EMA chatbot inside CPS** — students link their EMA account once; the chat widget then opens already
  signed in. CPS keeps only an encrypted EMA refresh token (never the password) and renews it every 6 hours.
  Students can save their EMA journal to their private CPS journal.
- **EMA triage** — the Case Manager queue uses the *worst* EMA result in the last 7 days, not the latest.
  An In Crisis result stays until a counselor or case manager marks it reviewed (with a note). Flags:
  crisis not yet reviewed, persistent struggle, unstable mood. Thresholds are admin settings.
- **Analytics dashboard** — appointments, case trends, risk distribution, PERMA daily/monthly averages
- **Reports** — exportable case and session reports

## Risk Levels

`GREEN` · `YELLOW` · `RED`

## Case Statuses

`NEW` · `INTAKE_SCHEDULED` · `ACTIVE` · `PENDING_TERMINATION` · `CLOSED` · `CANCELLED`

## Appointment Statuses

`REQUESTED` · `PENDING_APPROVAL` · `CONFIRMED` · `COMPLETED` · `NO_SHOW` · `CANCELLED` · `SCHEDULED`
