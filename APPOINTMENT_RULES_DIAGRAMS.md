# Appointment Rules Flow Diagram

## Assessment Scores → Risk Level → Appointment Time → Meeting Link

```
ASSESSMENT SCORES
├─ PHQ-9 (Depression)
├─ GAD-7 (Anxiety)
├─ PSS (Stress)
├─ Academic Stress
├─ Career Readiness
└─ Social Functioning

         ↓
         ↓ (get_risk_level())
         ↓

RISK CALCULATION
├─ RED (Critical):     PHQ-9 > 20 OR GAD-7 > 15 OR PSS > 30
├─ YELLOW (High):      PHQ-9 > 15 OR GAD-7 > 12 OR PSS > 20 OR Acad > 24
└─ GREEN (Standard):   All scores below YELLOW thresholds

         ↓
         ↓ (calculate_appointment_date())
         ↓

APPOINTMENT SCHEDULING
┌──────────────────────────────────────┐
│ 🔴 RED (Critical Emergency)          │
├──────────────────────────────────────┤
│ Appointment:   30 minutes            │
│ Time:          Immediate             │
│ Date:          Today (ASAP)         │
│ Counselor:     Manual assignment     │
│ Contact:       Urgent (phone call)   │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ 🟡 YELLOW (High Priority)            │
├──────────────────────────────────────┤
│ Appointment:   1 business day        │
│ Time:          10:00 AM              │
│ Date:          Tomorrow              │
│ Counselor:     Auto-assigned         │
│ Contact:       Email confirmation    │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ 🟢 GREEN (Standard)                  │
├──────────────────────────────────────┤
│ Appointment:   2-3 business days     │
│ Time:          10:00 AM              │
│ Date:          3 days out            │
│ Counselor:     Auto-assigned         │
│ Contact:       Email confirmation    │
└──────────────────────────────────────┘

         ↓
         ↓ (generate_meeting_link())
         ↓

MEETING LINK GENERATION
┌────────────────────────────────────────────┐
│ 🎥 ZOOM (Server-to-Server OAuth)           │
├────────────────────────────────────────────┤
│ Creates real meeting with:                 │
│  • Topic: CPS Initial Assessment           │
│  • Start: Appointment datetime             │
│  • Duration: 60 minutes                    │
│  • Password: Auto-generated                │
│  • URL: https://zoom.us/wc/join/{id}       │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ 📅 GOOGLE MEET (Calendar API)              │
├────────────────────────────────────────────┤
│ Creates calendar event with:               │
│  • Title: CPS Initial Assessment           │
│  • Start: Appointment datetime             │
│  • Duration: 60 minutes                    │
│  • URL: https://meet.google.com/{code}     │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ 🏢 IN-PERSON                               │
├────────────────────────────────────────────┤
│ Physical location:                         │
│  • Location: CPS Office, Room 101          │
│  • Date: Appointment date                  │
│  • Time: 10:00 AM (or Immediate)           │
│  • Arrive 10 min early                     │
└────────────────────────────────────────────┘

         ↓
         ↓ (Create Appointment Document)
         ↓

DATABASE STORAGE
┌───────────────────────────────────────────────────┐
│ APPOINTMENTS Collection                           │
├───────────────────────────────────────────────────┤
│ {                                                 │
│   "_id": ObjectId(),                              │
│   "case_id": ObjectId(),                          │
│   "risk_level": "RED" | "YELLOW" | "GREEN",      │
│   "requested_start": 2026-03-19T10:00:00Z,       │
│   "requested_end": 2026-03-19T11:00:00Z,         │
│   "appointment_time": "10:00 AM" | "Immediate",  │
│   "meeting_link": "https://...",                  │
│   "meeting_id": "...",                            │
│   "preferred_platform": "zoom|google_meet|in",   │
│   "status": "REQUESTED"                           │
│ }                                                 │
└───────────────────────────────────────────────────┘

         ↓
         ↓ (Send Confirmation Email)
         ↓

EMAIL CONFIRMATION
┌─────────────────────────────────────────┐
│ Subject: Your CPS Appointment Confirmed │
├─────────────────────────────────────────┤
│ Counseling ID: CPS-ABC12345             │
│ Date: Wednesday, March 19, 2026         │
│ Time: 10:00 AM                          │
│ Format: Zoom Video Conference           │
│ Join: https://zoom.us/wc/join/...       │
│ Meeting ID: 123456789                   │
│                                          │
│ Assessment Results:                     │
│ • Depression (PHQ-9): 18/27 (Moderate)  │
│ • Anxiety (GAD-7): 14/21 (Moderate)     │
│                                          │
│ Next Steps:                             │
│ ✓ Check email for meeting link          │
│ ✓ Counselor will confirm appointment    │
│ ✓ Join 5 minutes early                  │
│                                          │
│ Crisis Support: Call 988                │
└─────────────────────────────────────────┘

         ↓
         ↓ (Student/Counselor View)
         ↓

FRONTEND DISPLAY
┌──────────────────────────────────────┐
│     YOUR APPOINTMENT                 │
├──────────────────────────────────────┤
│ 🔴 RISK LEVEL: YELLOW                │
│                                       │
│ SCHEDULED: Wed, Mar 19, 2026         │
│ TIME: 10:00 AM                        │
│ FORMAT: Zoom Video Conference         │
│                                       │
│ 📱 JOIN MEETING                       │
│ [https://zoom.us/wc/join/...]        │
│                                       │
│ ℹ️ High Priority - Next business day │
└──────────────────────────────────────┘
```

## Risk Level Decision Tree

```
START INTAKE FORM
      ↓
  TAKE ASSESSMENTS
      ↓
  CALCULATE SCORES
      ↓
  ┌─────────────────────┐
  │ Check PHQ-9?        │
  │ (Depression)        │
  └────────┬────────────┘
           ↓
      Score > 20?
      ├─ YES → 🔴 RED ✓
      │
      └─ NO: Check GAD-7?
         (Anxiety)
         Score > 15?
         ├─ YES → 🔴 RED ✓
         │
         └─ NO: Check PSS?
            (Stress)
            Score > 30?
            ├─ YES → 🔴 RED ✓
            │
            └─ NO: Check YELLOW?
               ├─ PHQ-9 > 15? → 🟡 YELLOW ✓
               ├─ GAD-7 > 12? → 🟡 YELLOW ✓
               ├─ PSS > 20? → 🟡 YELLOW ✓
               ├─ Acad > 24? → 🟡 YELLOW ✓
               ├─ Social > 24? → 🟡 YELLOW ✓
               │
               └─ NO: 🟢 GREEN ✓
```

## Timeline Comparison

```
CURRENT TIME: Wednesday, March 18, 2026

🔴 RED (Critical Emergency)
   Start: TODAY 14:30 (30 minutes from now)
   End: TODAY 15:30
   Status: 🚨 IMMEDIATE

🟡 YELLOW (High Priority)
   Start: TOMORROW 10:00 AM (March 19)
   End: TOMORROW 11:00 AM
   Status: 🔴 HIGH PRIORITY

🟢 GREEN (Standard)
   Start: FRIDAY 10:00 AM (March 21, 3 days)
   End: FRIDAY 11:00 AM
   Status: ✓ STANDARD
```

## Color Coding System

```
🔴 RED Background:     bg-red-100 / dark:bg-red-900/30
🔴 RED Text:           text-red-700 / dark:text-red-400
🔴 RED Indicator:      Animated pulse ● ● ●

🟡 YELLOW Background:  bg-yellow-100 / dark:bg-yellow-900/30
🟡 YELLOW Text:        text-yellow-700 / dark:text-yellow-400
🟡 YELLOW Indicator:   Priority badge

🟢 GREEN Background:   bg-green-100 / dark:bg-green-900/30
🟢 GREEN Text:         text-green-700 / dark:text-green-400
🟢 GREEN Indicator:    Standard checkmark ✓
```

## Counselor Auto-Assignment

```
                    APPOINTMENT CREATED
                            ↓
                    CHECK RISK LEVEL
                            ↓
            ┌───────────────┴───────────────┐
            │                               │
         RED?                            NOT RED?
            │                               │
            ↓                               ↓
      MANUAL REVIEW          AUTO-ASSIGN COUNSELOR
      (IC Must Review)                ↓
            │                   Check Scores
            │                   ├─ High PHQ-9?
            │                   │  → PSYCHOLOGIST
            │                   │
            │                   ├─ High GAD-7?
            │                   │  → PSYCHOLOGIST/COUNSELOR
            │                   │
            │                   └─ Default
            │                      → COUNSELOR
            │                         (workload check)
            │                         ├─ Available?
            │                         │  → ASSIGN
            │                         │
            │                         └─ Busy?
            │                            → QUEUE
            │
            └─────────────→ APPOINTMENT CONFIRMED
                                    ↓
                            SEND CONFIRMATION EMAIL
```

## Database Relationships

```
STUDENTS
  │
  ├─ 1 → MANY → CASES
  │              │
  │              ├─ 1 → MANY → INTAKES
  │              │              │
  │              │              └─ Assessment Scores
  │              │
  │              └─ 1 → MANY → APPOINTMENTS ← Meeting Links
  │                              │
  │                              ├─ risk_level (RED/YELLOW/GREEN)
  │                              ├─ appointment_time (10:00 AM/Immediate)
  │                              ├─ requested_start (datetime)
  │                              ├─ meeting_link (URL)
  │                              └─ preferred_platform (zoom/gm/in-person)
  │
  └─ 1 → 1 → ASSIGNED COUNSELOR
```
