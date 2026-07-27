# CPS — Counseling and Psychological Services System

A full-stack web application for managing student counseling at De La Salle University. Handles the full counseling workflow: student booking, intake interviews, case management, session notes, PERMA wellbeing tracking, analytics, and reporting.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS v4 |
| Backend | Python 3.12, Flask 3.1 |
| Database | MongoDB (pymongo 4.7) |
| Auth | JWT (flask-jwt-extended) |
| AI | OpenAI API (MHBot chatbot) |

## Project Structure

```
CAPSTONE1/
├── frontend/               # Next.js App Router application
│   └── src/
│       ├── app/            # Route pages (dashboard, staff, auth)
│       └── components/     # Shared UI components
├── backend/                # Flask API
│   ├── app.py              # Entry point
│   ├── blueprints/         # Route handlers by domain
│   └── requirements.txt
└── scripts/                # Seed scripts
    ├── seed.py                  # Main seed (run first)
    ├── enrich_ic_forms.py       # IC interview form data for all 35 cases
    ├── seed_bookings.py         # REQUESTED + PENDING_APPROVAL appointments
    └── seed_structured_soap.py  # Structured SOAP session notes
```

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.12+
- MongoDB running locally on port 27017

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

Run all four scripts in order:

```bash
python3 scripts/seed.py                  # Wipes DB and seeds base data
python3 scripts/enrich_ic_forms.py       # Fills IC interview form fields
python3 scripts/seed_bookings.py         # Adds booking workflow appointments
python3 scripts/seed_structured_soap.py  # Adds structured SOAP session notes
```

After seeding: **64 users, 35 cases, 91 appointments, 40 session notes, 72 PERMA entries**

## Test Accounts

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
- **MHBot** — AI-powered mental health chatbot for students
- **Analytics dashboard** — appointments, case trends, risk distribution, PERMA insights
- **Reports** — exportable case and session reports

## Risk Levels

`GREEN` · `YELLOW` · `RED`

## Case Statuses

`NEW` · `INTAKE_SCHEDULED` · `ACTIVE` · `PENDING_TERMINATION` · `CLOSED` · `CANCELLED`

## Appointment Statuses

`REQUESTED` · `PENDING_APPROVAL` · `CONFIRMED` · `COMPLETED` · `NO_SHOW` · `CANCELLED` · `SCHEDULED`
