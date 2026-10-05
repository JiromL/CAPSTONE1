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
    └── seed_announcements.py    # Standalone announcements seed
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

`seed.py` **wipes `cps_system_dev`** and rebuilds it. Run all four scripts in order:

```bash
python3 scripts/seed.py                  # Wipes DB and seeds base data
python3 scripts/enrich_ic_forms.py       # Fills IC interview form fields
python3 scripts/seed_bookings.py         # Adds booking workflow appointments
python3 scripts/seed_structured_soap.py  # Adds structured SOAP session notes
```

After seeding: **64 users, 35 cases, 91 appointments, 40 session notes, 72 PERMA entries**

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
