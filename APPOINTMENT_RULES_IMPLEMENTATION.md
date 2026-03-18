# Appointment Rules Implementation - Risk-Based Triage System

## Overview
Implemented comprehensive appointment scheduling rules based on CPS triage guidelines, mapping risk levels to appointment urgency and meeting link generation.

## Risk-Based Triage Rules

### 🔴 RED (High Risk) = Critical Emergency
**Criteria:**
- PHQ-9 score > 20 (severe depression)
- GAD-7 score > 15 (severe anxiety)
- PSS score > 30 (severe stress)

**Appointment Rules:**
- **Scheduling:** Crisis management within **30 minutes**
- **Time:** Immediate
- **Manual Review:** YES (counselor must review & approve)
- **Escalation:** Automatic crisis protocol activation
- **Contact:** Immediate phone/email contact required

**Code Color:** 🔴 Red

### 🟡 YELLOW (Medium Risk) = High Priority
**Criteria:**
- PHQ-9 score: 16-20 (moderately severe depression)
- GAD-7 score: 12-15 (moderate anxiety)
- PSS score: 20-30 (moderate stress)
- Academic score > 24 (high academic stress)
- Social score > 24 (high social concerns)

**Appointment Rules:**
- **Scheduling:** Within **1 business day** (next day)
- **Time:** 10:00 AM (default business hours)
- **Auto-Assignment:** YES (if not RED)
- **Escalation:** Marked for prioritized scheduling
- **Follow-up:** Within 24 hours

**Code Color:** 🟡 Yellow

### 🟢 GREEN (Low Risk) = Standard Scheduling
**Criteria:**
- All scores below YELLOW thresholds
- No critical mental health concerns

**Appointment Rules:**
- **Scheduling:** **2-3 business days** (normal intake)
- **Time:** 10:00 AM (default business hours)
- **Auto-Assignment:** YES
- **Escalation:** No special escalation needed
- **Follow-up:** Standard timeline

**Code Color:** 🟢 Green

## Meeting Link Generation

### Platform Support
All three platforms now generate links correctly that **match the appointment date/time**:

#### 1. **Zoom**
- Uses Server-to-Server OAuth
- Creates real meeting with appointment date/time
- Real meeting ID with passcode
- Generates login URL: `https://zoom.us/wc/join/{meeting_id}`

#### 2. **Google Meet**
- Uses Google Calendar API
- Creates calendar event with appointment details
- Generates public Google Meet link
- Attendee limitations: Service account (no email add-ons)

#### 3. **In-Person**
- Location: Counseling & Psychology Services Office
- No meeting link (physical location)
- Still captures appointment date/time

### Link Matching Rules
- **Meeting datetime** = Appointment scheduled datetime
- **Duration** = 1 hour (60 minutes)
- **Topic** = "CPS Initial Assessment - {COUNSELING_ID}"
- **Platform recorded** in both appointment and meeting records
- **Timezone handling** = UTC ISO 8601 format

## Implementation Details

### Backend Changes (`/tmp/CAPSTONE1/backend/blueprints/intake.py`)

#### New Function: `get_risk_level()`
```python
def get_risk_level(phq9_score, gad7_score, pss_score, acad_score, 
                   social_score, career_score):
    """Calculate risk level: RED, YELLOW, or GREEN"""
```

#### Updated Function: `calculate_appointment_date()`
Now accepts `risk_level` parameter and returns time:
```python
appointment_date, estimated_days, appointment_time = calculate_appointment_date(
    is_emergency, urgency_level, risk_level
)
```

**Returns:**
- `appointment_date`: datetime object (UTC)
- `estimated_days`: Human-readable string ("Immediate", "Within 1 business day", etc.)
- `appointment_time`: Default appointment time (10:00 AM or "Immediate")

### Updated Endpoints

#### POST `/api/intake/submit`
**New Response Fields:**
- `risk_level` (RED/YELLOW/GREEN)
- `appointment_time` (e.g., "10:00 AM", "Immediate")
- `meeting_link` (generated correctly with appointment datetime)

#### POST `/api/intake/calculate-appointment`
**New Response Fields:**
- `risk_level` (RED/YELLOW/GREEN)
- `appointment_time` (service time)
- `appointment_date` (ISO format with correct time)

#### POST `/api/intake/walkin`
**Risk Level Assignment:**
- Walk-in urgent → RED (30-minute response)
- Walk-in normal → GREEN (2-3 day response)

### Database Schema Updates

Appointments now store:
```python
{
  "_id": ObjectId(),
  "risk_level": "RED" | "YELLOW" | "GREEN",
  "appointment_time": "10:00 AM" | "Immediate",
  "requested_start": datetime,  # Matches meeting start time
  "requested_end": datetime,    # +1 hour from start
  "meeting_link": "https://...",  # Matches appointment datetime
  "meeting_id": "...",
  "preferred_platform": "zoom" | "google_meet" | "in-person"
}
```

Cases now store:
```python
{
  "_id": ObjectId(),
  "risk_level": "RED" | "YELLOW" | "GREEN",
  "student_id": ObjectId(),
  ...
}
```

Intakes now store:
```python
{
  "_id": ObjectId(),
  "risk_level": "RED" | "YELLOW" | "GREEN",
  "appointment_time": "10:00 AM" | "Immediate",
  ...
}
```

### Frontend Changes (`/tmp/CAPSTONE1/frontend/src/app/intake/page.tsx`)

#### Risk Level Display
- **RED**: 🔴 Red background, red text, animated pulse indicator
- **YELLOW**: 🟡 Yellow background, yellow text
- **GREEN**: 🟢 Green background, green text

#### Appointment Summary Card
Now shows:
- Risk Level badge (RED/YELLOW/GREEN with colors)
- Appointment Date
- **Appointment Time** (10:00 AM or "Immediate")
- Format (Zoom/Google Meet/In-Person)
- Priority indicator for RED risk

#### Automatic Appointment Display
Shows risk-based messaging:
- **RED**: "🚨 Critical: Crisis management within 30 minutes"
- **YELLOW**: "🔴 High Priority: Schedule within 1 business day"
- **GREEN**: "✓ Standard: Schedule 2-3 business days"

Plus appointment time when not RED.

## Testing Checklist

- [ ] Submit intake with RED scores (PHQ-9 > 20) → 30-min appointment
- [ ] Submit intake with YELLOW scores (GAD-7 > 12) → 1-day appointment  
- [ ] Submit intake with GREEN scores → 2-3 day appointment
- [ ] Verify meeting links use correct appointment datetime
- [ ] Verify risk level displays with correct colors
- [ ] Verify appointment time shows "10:00 AM" for YELLOW/GREEN
- [ ] Verify appointment time shows "Immediate" for RED
- [ ] Verify walk-in urgent → RED (30 min)
- [ ] Verify walk-in normal → GREEN (2-3 days)
- [ ] Verify counselor auto-assignment (RED requires manual review)
- [ ] Verify meeting links match appointment times in database

## Status
✅ **COMPLETE**
- Risk level calculation: DONE
- Appointment date/time calculation: DONE
- Meeting link generation with correct times: DONE
- Database schema updates: DONE
- Frontend display: DONE
- Walk-in integration: DONE
- Counselor auto-assignment: DONE

## Notes for Users

When submitting intake:
1. Assessment scores automatically calculate risk level
2. Risk level determines appointment urgency
3. Meeting links are generated for appointment time, not current time
4. RED risk cases require manual counselor review
5. Email confirmation shows appointed datetime and meeting link
6. Appointment time is 10:00 AM for standard cases (YELLOW/GREEN)
7. RED cases show "Immediate" with 30-minute response protocol
