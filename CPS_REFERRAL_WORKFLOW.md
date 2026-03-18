# CPS Referral Workflow - Fixed Implementation

## Overview
The referral system has been restructured to properly handle how CPS (Child Protective Services) actually works, distinguishing between CPS referrals and other external services.

## Referral Types

### 1. CPS Referrals (`referral_type: "CPS"`)
Referrals made directly to Child Protective Services for investigation of abuse/neglect allegations.

**CPS Status Workflow:**
```
SUBMITTED 
  ↓
ASSIGNED (to investigator)
  ↓
UNDER_INVESTIGATION
  ↓
FINDINGS_ISSUED (substantiated/unsubstantiated/inconclusive)
  ↓
CASE_OPENED or CASE_CLOSED or REFERRED_TO_SERVICES
  ↓
[Warm handoff process if case opened]
```

**CPS Investigation Outcomes:**
- `SUBSTANTIATED` - Abuse/neglect confirmed
- `UNSUBSTANTIATED` - No evidence of abuse/neglect
- `INCONCLUSIVE` - Insufficient information

**CPS Decisions:**
- `CASE_OPENED` - CPS opens case for services
- `CASE_CLOSED` - Investigation complete, no services needed
- `REFERRED_TO_SERVICES` - No substantiation but referral to other services

### 2. External Service Referrals (`referral_type: "EXTERNAL"`)
Referrals to external providers (medical, mental health, social services, etc.).

**External Status Workflow:**
```
SUBMITTED
  ↓
[ROI signature required for HIPAA compliance]
  ↓
IN_PROGRESS
  ↓
COMPLETED
  ↓
[Warm handoff completion]
```

**External Service Types:**
- `MEDICAL` - Medical referrals
- `MENTAL_HEALTH` - Mental health services
- `SOCIAL_SERVICES` - Social services
- `OTHER` - Other services

### 3. Internal Referrals (`referral_type: "INTERNAL"`)
Referrals to another provider within the organization.

**Internal Status Workflow:**
```
SUBMITTED
  ↓
ACKNOWLEDGED (by provider)
  ↓
IN_PROGRESS
  ↓
COMPLETED
  ↓
[Warm handoff completion]
```

---

## API Endpoints

### Create Referral
**POST** `/api/referrals/initiate`

**For CPS Referrals:**
```json
{
  "case_id": "case_id",
  "referral_type": "CPS",
  "reason": "Student reported abuse",
  "allegations": ["physical abuse", "neglect"],
  "reporter_name": "John Smith",
  "reporter_relationship": "School Counselor",
  "student_dob": "2008-05-15",
  "student_address": "123 Main St, City",
  "has_siblings": true,
  "siblings_info": "Twin sister, age 16",
  "urgency": "URGENT"
}
```

**For External Service Referrals:**
```json
{
  "case_id": "case_id",
  "referral_type": "EXTERNAL",
  "reason": "Student needs psychiatric evaluation",
  "service_type": "MENTAL_HEALTH",
  "receiving_provider_name": "Metro Mental Health Clinic",
  "receiving_provider_contact": "555-0123",
  "urgency": "routine"
}
```

**For Internal Referrals:**
```json
{
  "case_id": "case_id",
  "referral_type": "INTERNAL",
  "reason": "Refer to school psychologist for testing",
  "receiving_provider_id": "provider_id",
  "urgency": "routine"
}
```

---

### CPS-Specific Endpoints

#### Assign Investigator
**POST** `/api/referrals/<referral_id>/cps/assign-investigator`
```json
{
  "cps_case_number": "CPS-2024-001234",
  "investigator_name": "Jane Doe",
  "investigator_contact": "555-0100"
}
```
**Status transitions to:** `ASSIGNED`

#### Start Investigation
**POST** `/api/referrals/<referral_id>/cps/start-investigation`
```json
{}
```
**Status transitions to:** `UNDER_INVESTIGATION`

#### Submit Investigation Findings
**POST** `/api/referrals/<referral_id>/cps/investigation-findings`
```json
{
  "findings": "SUBSTANTIATED",
  "investigation_details": "Physical abuse confirmed through medical examination. Bruising consistent with non-accidental injury. Parents unable to provide satisfactory explanation."
}
```
**Possible findings:** `SUBSTANTIATED`, `UNSUBSTANTIATED`, `INCONCLUSIVE`
**Status transitions to:** `FINDINGS_ISSUED`

#### Submit CPS Decision
**POST** `/api/referrals/<referral_id>/cps/decision`
```json
{
  "decision": "CASE_OPENED",
  "decision_details": "Case opened for protective services. Family to receive in-home counseling and parenting support."
}
```
**Possible decisions:** `CASE_OPENED`, `CASE_CLOSED`, `REFERRED_TO_SERVICES`
**Status transitions to:** Reflects the decision

#### Add Investigation Note
**POST** `/api/referrals/<referral_id>/cps/add-note`
```json
{
  "note": "Home visit conducted. Conditions safe. No immediate danger to child."
}
```

---

### External Service Referral Endpoints

#### Request ROI
**POST** `/api/referrals/<referral_id>/roi-request`
- Request Release of Information signature from parent/guardian
- Only for EXTERNAL referrals

#### Upload ROI
**POST** `/api/referrals/<referral_id>/roi-upload`
- Upload signed ROI document
- Only for EXTERNAL referrals
- ROI expires after 365 days

---

### General Referral Endpoints

#### Get Referral Details
**GET** `/api/referrals/<referral_id>`
- Returns full details including type-specific information

#### Acknowledge Referral
**POST** `/api/referrals/<referral_id>/acknowledge`
- Receiving provider acknowledges referral
- Available for EXTERNAL and INTERNAL types

#### Send Referral
**POST** `/api/referrals/<referral_id>/refer`
- Send referral to receiving provider
- Requires ROI for EXTERNAL referrals

#### Complete Warm Handoff
**POST** `/api/referrals/<referral_id>/warm-handoff`
```json
{
  "completion_notes": "Student successfully transitioned to Metro Mental Health Clinic. Initial appointment scheduled."
}
```
- Marks referral as successfully completed
- For CPS: transitions to `CASE_CLOSED`
- For others: transitions to `COMPLETED`

---

### Case-Level Endpoints

#### Get Referral History for Case
**GET** `/api/referrals/case/<case_id>/history`
- Shows all referrals for a case with type-specific information
- Displays CPS findings and decisions
- Shows external provider information

#### Check Case Closure Eligibility
**GET** `/api/referrals/case/<case_id>/can-close`
- Validates that all referrals are resolved before case closure
- Blocks closure if:
  - CPS investigation is pending or case opened
  - External/internal referrals are in progress
  - Warm handoffs are incomplete

#### Get Pending Warm Handoffs
**GET** `/api/referrals/pending-warm-handoffs`
- Shows all referrals awaiting warm handoff completion
- Prioritizes by urgency and time pending
- Includes CPS status, investigation findings, and external provider info

#### Get Referral Summary
**GET** `/api/referrals/summary`
- Dashboard view of all referrals
- Breakdown by type and status
- CPS findings distribution
- Pending warm handoff count

#### Get CPS Referrals List
**GET** `/api/referrals/cps/list`
- Lists all CPS referrals
- Shows investigation status, findings, and decisions
- Useful for CPS-focused dashboard

---

## Key Differences from Previous Implementation

### Before
- Single referral type (INTERNAL/EXTERNAL)
- Simple status progression (INITIATED → REFERRED → RECEIVED → COMPLETED)
- No investigation tracking
- No outcome recording
- CPS treated like any other external referral

### After
- Three distinct referral types with different workflows
- CPS has investigation-specific statuses and fields
- Investigation findings (SUBSTANTIATED/UNSUBSTANTIATED/INCONCLUSIVE) tracked
- CPS decision (CASE_OPENED/CLOSED/REFERRED_TO_SERVICES) tracked
- Investigation notes logged chronologically
- External services have ROI workflow separate from CPS
- Case closure properly blocked until all referrals resolved

---

## Warm Handoff Requirements

**Warm Handoff Completion Rule:**
Cases cannot be closed until all referrals have completed warm handoffs.

**For CPS Referrals:**
- Warm handoff is complete when CPS case is closed OR referred to other services
- Investigation must be complete with findings issued
- Decision must be documented

**For External Referrals:**
- Warm handoff is complete when service acknowledges and accepts case
- Student has initial appointment confirmed
- Transition notes documented

**For Internal Referrals:**
- Warm handoff is complete when new provider accepts case
- Documentation transferred
- Student briefed on provider change

---

## Example Workflow: CPS Referral

1. **School counselor creates CPS referral**
   - POST `/api/referrals/initiate`
   - Status: `SUBMITTED`

2. **CPS receives and assigns investigator**
   - POST `/api/referrals/<id>/cps/assign-investigator`
   - Status: `ASSIGNED`
   - Counselor notified of case number and investigator

3. **Investigation begins**
   - POST `/api/referrals/<id>/cps/start-investigation`
   - Status: `UNDER_INVESTIGATION`
   - Investigation notes added over time

4. **Investigation complete with findings**
   - POST `/api/referrals/<id>/cps/investigation-findings`
   - Status: `FINDINGS_ISSUED`
   - Findings documented

5. **CPS decision issued**
   - POST `/api/referrals/<id>/cps/decision`
   - Status: `CASE_OPENED` or `CASE_CLOSED`
   - If CASE_OPENED: Service plan details included

6. **Warm handoff completion (if case opened)**
   - POST `/api/referrals/<id>/warm-handoff`
   - Status: `COMPLETED`
   - School continues to monitor as needed

7. **Case can now be closed** once all referrals are complete

---

## Database Schema Updates

### CPS-Specific Fields
```javascript
{
  referral_type: "CPS",
  allegations: ["Type of abuse/neglect"],
  reporter_name: "...",
  reporter_relationship: "...",
  student_dob: "...",
  student_address: "...",
  has_siblings: true/false,
  siblings_info: "...",
  
  cps_case_number: "...",
  investigator_name: "...",
  investigator_contact: "...",
  investigation_started_date: Date,
  investigation_completed_date: Date,
  investigation_findings: "SUBSTANTIATED|UNSUBSTANTIATED|INCONCLUSIVE",
  investigation_details: "...",
  decision: "CASE_OPENED|CASE_CLOSED|REFERRED_TO_SERVICES",
  case_opened_with_cps: true/false,
  investigation_notes: [{
    timestamp: Date,
    note: "...",
    details: "..."
  }]
}
```

### External Service Fields
```javascript
{
  referral_type: "EXTERNAL",
  sub_type: "MEDICAL|MENTAL_HEALTH|SOCIAL_SERVICES|OTHER",
  receiving_provider_name: "...",
  receiving_provider_contact: "...",
  external_case_number: "...",
  roi_signed: true/false,
  roi_file_url: "...",
  roi_signed_at: Date,
  roi_expires_at: Date,
  agency_response: "..."
}
```

---

## Notes for Implementation

- All endpoints require authentication via JWT
- All major actions are audit logged for compliance
- Investigation notes are append-only for audit trail
- Warm handoff completion is required before case closure
- CPS referrals have different status progression than other referrals
- Investigation findings and decisions are recorded separately
- ROI signature valid for 365 days from upload

