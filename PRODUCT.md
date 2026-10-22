# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Two audiences, weighted equally. Design for each in its own mode rather than averaging them.

- **Students** of De La Salle University. They book counseling appointments, take assessments, check in with the EMA wellbeing chatbot, keep a private journal and follow their own case. Many arrive stressed, anxious or in crisis, often on a phone.
- **CPS staff**, each with their own role:
  - **Intake counselors (IC)** run the 11-step intake interview and endorse cases.
  - **Counselors and psychologists** manage their assigned cases, write SOAP session notes and keep safety plans.
  - **Case managers** watch the triage queue and oversee cases.
  - **Office staff** handle appointment requests and walk-ins.
  - **The DPO** reviews audit logs.
  - **Admins** manage users and settings.

  Staff use CPS all day at a desk, moving through many cases quickly.

## Product Purpose
CPS (Counseling and Psychological Services System) runs the whole counseling workflow for the DLSU CPS office in one place:
1. A student books an appointment or walks in.
2. An intake counselor interviews them and the case is created.
3. A counselor or psychologist holds sessions and documents them.
4. The case goes to a referral when needed, then closes.

It replaces paper intake and scattered tools, and helps staff reach at-risk students sooner. Success means students find help quickly, and staff can see at a glance who needs attention next.

## Positioning
- **EMA integration.** EMA is DLSU PCHRD's wellbeing chatbot.
  - Students use it inside CPS, already signed in.
  - Their PERMA wellbeing results feed CPS triage.
  - Their EMA journals can be copied to a private CPS journal.
- **Early risk detection.**
  - Triage uses a student's *worst* EMA result from the last 7 days, not the latest one.
  - An In Crisis result stays flagged until a counselor or case manager marks it reviewed, with a note.
  - Cases carry a RED, YELLOW or GREEN risk level.
- **One end-to-end workflow**, from booking and intake through sessions, referrals and closure.
- **Privacy by design.**
  - Access depends on role: students see only their own records, and counselors see only their assigned cases.
  - Consent is recorded.
  - The DPO can review audit logs.
  - Journals are private.

## Operating Context
- Built for the actual DLSU Counseling and Psychological Services office as a BS-IT capstone project.
- Students are the general DLSU population. Staff accounts use `@dlsu.edu.ph` emails.
- Connects to EMA (pchrd-ema.dlsu.edu.ph), Google Calendar, Zoom and email.
- Appointment statuses: REQUESTED → PENDING_APPROVAL → CONFIRMED → COMPLETED. Appointments can also end as NO_SHOW or CANCELLED.
- Case statuses: NEW → INTAKE_SCHEDULED → ACTIVE → PENDING_TERMINATION → CLOSED.

## Capabilities and Constraints
- **Stack:** Next.js 16, React 19 and Tailwind CSS v4 for the frontend; Flask and MongoDB for the backend; JWT for login.
- **Roles:** ADMIN, DPO, STAFF (office assistant), CASE_MANAGER, IC, COUNSELOR, PSYCHOLOGIST, STUDENT.
- **Clinical terms:** SOAP notes, PERMA (Positive Emotion, Engagement, Relationships, Meaning, Accomplishment), PHQ-9 and GAD-7, safety plans, warm handoff referrals, intake endorsement.
- **Sensitive data.** Never show one student's information to another. Never put clinical details where staff without access could see them.
- **Crisis states must be visible.** Never hide or soften them for the sake of looks.

## Brand Commitments
- **Name:** CPS, De La Salle University.
- **Logo:** the archer (`frontend/public/cps-logo.png`).
- **DLSU assets:** `frontend/public/dlsu-logo.svg` and `frontend/public/dlsu-seal.svg`.
- **EMA** is DLSU PCHRD's product. Present it as a partner service inside CPS, not as CPS's own.

## Evidence on Hand
- **Seed data** (`scripts/seed.py` and related scripts): 64 users, 35 cases, 91 appointments, 40 session notes and 72 PERMA entries. It is test data, not real students.
- **Documentation:** `docs/`. There are no real testimonials, usage numbers or outcome data. Do not make any up.

## Product Principles
1. **Safety first.** Risk and crisis signals are never hidden behind looks or extra clicks.
2. **Two modes, one system.** The student side feels calm, warm and private. The staff side is fast, dense and easy to scan.
3. **Privacy is visible.** Users can always tell who can see what, and when consent applies.
4. **One workflow.** Each screen knows where a case or appointment is in its lifecycle and shows the next step.
5. **EMA belongs, but stays credited.** It is woven into CPS while staying clearly a DLSU PCHRD service.

## Accessibility & Inclusion
Students may be distressed, on a phone, or using assistive technology. Use plain, kind language on student screens. No specific standard (such as WCAG AA) has been decided yet.
