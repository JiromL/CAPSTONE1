# Check-In System Documentation

## Overview

The Check-In system handles periodic check-ins for existing clients who don't require active ongoing counseling but need periodic status monitoring. This is separate from the full intake process and supports various interaction types.

---

## Key Concepts

### Client Status (Separate from Case Status)

Each case now tracks **client_status** which can be:

| Status | Meaning | Typical Usage |
|--------|---------|---------------|
| `ACTIVE` | Client actively receiving counseling sessions | Ongoing clients with regular appointments |
| `INACTIVE` | Client not receiving services | Terminated or closed clients |
| `CHECK_IN_ONLY` | Periodic check-ins without active counseling | Monitoring after service completion |
| `WITH_MH_CHECK_IN` | Collaborating with Mental Health, check-in only | Coordinated care arrangements |
| `UNDER_ACCOMMODATION` | Under SDFO accommodation | Students with institutional accommodations |
| `TERMINATION_PENDING` | In process of closing | Cases being finalized |

### Transaction Types

Track the type of client contact that initiated the case/check-in:

| Type | Description |
|------|-------------|
| `NEW_INTAKE` | First-time intake appointment |
| `CHECK_IN` | Periodic check-in for existing client |
| `SELF_REFERRED` | Student self-referred |
| `REFERRED` | Referred from another department |
| `WALK_IN` | Unscheduled walk-in visit |
| `FOLLOW_UP` | Follow-up from previous contact |

### Check-In Types

Categorize the purpose of each check-in:

- `STATUS_UPDATE` - Update on client current status
- `WELFARE_CHECK` - General wellness check
- `REFERRAL_FOLLOW_UP` - Checking on referral progress
- `CRISIS_INTERVENTION` - Urgent crisis response
- `OTHER` - Other purpose

---

## API Endpoints

### Create Check-In

**POST** `/api/check-ins/create`

Create a check-in for an existing client.

**Request:**
```json
{
  "case_id": "case_id",
  "check_in_type": "STATUS_UPDATE",
  "contact_method": "IN_PERSON",
  "duration_minutes": 30,
  "notes": "Client doing well, no new concerns at this time",
  "new_status": "CHECK_IN_ONLY",
  "new_concern": "Academic stress",
  "action_items": [
    {
      "action": "Schedule follow-up meeting",
      "due_date": "2026-04-01"
    }
  ],
  "referrals_made": [],
  "outcome": "ONGOING",
  "next_check_in_date": "2026-05-18"
}
```

**Parameters:**
- `case_id` (required) - Case to check in
- `check_in_type` (required) - Type of check-in
- `contact_method` - How contact was made: IN_PERSON, PHONE, EMAIL, VIDEO
- `duration_minutes` - Length of contact
- `notes` - Notes about the check-in
- `new_status` - Update client status if changed
- `new_concern` - Update primary concern if changed
- `action_items` - List of follow-up actions
- `referrals_made` - Any referrals made during check-in
- `outcome` - RESOLVED, ONGOING, REFERRED, NEEDS_FOLLOWUP
- `next_check_in_date` - When to schedule next check-in

**Response:**
```json
{
  "check_in_id": "check_in_id",
  "case_id": "case_id",
  "check_in_type": "STATUS_UPDATE",
  "status_updated": "CHECK_IN_ONLY",
  "created_at": "2026-03-18T10:30:00"
}
```

---

### Get Check-In History

**GET** `/api/check-ins/<case_id>/history`

Get all check-ins for a specific case.

**Response:**
```json
{
  "case_id": "case_id",
  "total_check_ins": 5,
  "client_current_status": "CHECK_IN_ONLY",
  "check_ins": [
    {
      "check_in_id": "id",
      "check_in_type": "STATUS_UPDATE",
      "checked_in_by": "Jane Smith",
      "contact_method": "IN_PERSON",
      "client_status_before": "ACTIVE",
      "client_status_after": "CHECK_IN_ONLY",
      "concern_before": "Depression",
      "concern_after": "Academic stress",
      "notes": "...",
      "outcome": "ONGOING",
      "next_check_in_date": "2026-04-15",
      "created_at": "2026-03-18T10:30:00"
    }
  ]
}
```

---

### Get Pending Check-Ins

**GET** `/api/check-ins/list`

Get all pending/overdue check-ins across all cases.

**Response:**
```json
{
  "total_pending_check_ins": 12,
  "overdue_count": 3,
  "check_ins": [
    {
      "case_id": "case_id",
      "student_name": "John Doe",
      "student_id": "student_id",
      "client_status": "CHECK_IN_ONLY",
      "primary_concern": "Academic stress",
      "days_since_last_check_in": 45,
      "is_overdue": true,
      "last_check_in_date": "2026-02-01T14:30:00",
      "next_check_in_date": "2026-03-15T00:00:00"
    }
  ]
}
```

---

### Get Check-In Details

**GET** `/api/check-ins/<check_in_id>`

Get detailed information about a specific check-in.

**Response:**
```json
{
  "check_in_id": "id",
  "case_id": "case_id",
  "student_name": "John Doe",
  "checked_in_by": "Jane Smith",
  "check_in_type": "STATUS_UPDATE",
  "contact_method": "IN_PERSON",
  "duration_minutes": 30,
  "client_status": {
    "before": "ACTIVE",
    "after": "CHECK_IN_ONLY"
  },
  "concern": {
    "before": "Depression",
    "after": "Academic stress"
  },
  "notes": "Client doing well...",
  "action_items": [...],
  "referrals_made": [...],
  "outcome": "ONGOING",
  "next_check_in_date": "2026-04-15",
  "created_at": "2026-03-18T10:30:00"
}
```

---

### Update Check-In

**PUT** `/api/check-ins/<check_in_id>`

Update check-in notes and action items.

**Request:**
```json
{
  "notes": "Updated notes",
  "action_items": [...],
  "outcome": "RESOLVED",
  "next_check_in_date": "2026-05-18"
}
```

---

### Update Client Status

**PUT** `/api/cases/<case_id>/status`

Update a client's service status.

**Request:**
```json
{
  "client_status": "CHECK_IN_ONLY",
  "primary_concern": "Academic stress",
  "reason": "Client completed counseling, transitioning to check-in only"
}
```

**Response:**
```json
{
  "success": true,
  "case_id": "case_id",
  "client_status": "CHECK_IN_ONLY",
  "message": "Client status updated to CHECK_IN_ONLY"
}
```

---

### Get Check-In Summary

**GET** `/api/check-ins/summary/status`

Get dashboard summary of check-in statistics.

**Response:**
```json
{
  "clients_by_status": {
    "ACTIVE": 25,
    "INACTIVE": 10,
    "CHECK_IN_ONLY": 15,
    "WITH_MH_CHECK_IN": 5,
    "UNDER_ACCOMMODATION": 8,
    "TERMINATION_PENDING": 2
  },
  "check_in_types_total": {
    "STATUS_UPDATE": 45,
    "WELFARE_CHECK": 12,
    "REFERRAL_FOLLOW_UP": 8,
    "CRISIS_INTERVENTION": 2,
    "OTHER": 3
  },
  "total_cases": 65,
  "total_check_ins": 70
}
```

---

## Workflow Examples

### Example 1: Transitioning from Active to Check-In Only

```
1. Client completes counseling after 8 sessions
2. Counselor updates client status to CHECK_IN_ONLY
   PUT /api/cases/<case_id>/status
   {
     "client_status": "CHECK_IN_ONLY",
     "reason": "Completed counseling, monitoring ongoing"
   }

3. Quarterly check-ins scheduled
   POST /api/check-ins/create
   {
     "case_id": "case_id",
     "check_in_type": "STATUS_UPDATE",
     "contact_method": "PHONE",
     "notes": "Client doing well, managing stress effectively",
     "outcome": "ONGOING",
     "next_check_in_date": "2026-06-15"
   }
```

### Example 2: Check-In for Collaborative Care with Mental Health

```
1. Case set to WITH_MH_CHECK_IN status
2. Regular check-ins to track coordination
   POST /api/check-ins/create
   {
     "case_id": "case_id",
     "check_in_type": "STATUS_UPDATE",
     "notes": "Coordinating with Dr. Silva at Metro Mental Health",
     "referrals_made": ["Dr. Carlos Silva - Metro Mental Health"],
     "outcome": "ONGOING"
   }
```

### Example 3: Overdue Check-In Alert

```
1. Current time: 2026-05-20
2. Last check-in: 2026-02-01 (108 days ago)
3. Next scheduled: 2026-03-15 (overdue)

GET /api/check-ins/list returns:
{
  "is_overdue": true,
  "days_since_last_check_in": 108
}

4. Counselor receives alert in dashboard
5. Creates welfare check
```

---

## Dashboard Integration

The check-in system provides data for counselors to:

1. **See pending check-ins** - Sorted by overdue status
2. **Track client status** - Active vs. Check-in only
3. **Monitor outcomes** - Resolved vs. ongoing concerns
4. **Schedule follow-ups** - Next check-in dates
5. **Audit trail** - Complete history of all interactions

---

## Data Model

### Check-In Document

```javascript
{
  _id: ObjectId,
  case_id: ObjectId,
  client_id: ObjectId,
  checked_in_by: ObjectId,
  
  check_in_type: String,           // STATUS_UPDATE, WELFARE_CHECK, etc.
  contact_method: String,          // IN_PERSON, PHONE, EMAIL, VIDEO
  duration_minutes: Number,
  
  client_status_before: String,    // ACTIVE, CHECK_IN_ONLY, etc.
  client_status_after: String,
  
  concern_before: String,
  concern_after: String,
  
  notes: String,
  action_items: [{
    action: String,
    due_date: Date
  }],
  referrals_made: [String],
  
  outcome: String,                 // RESOLVED, ONGOING, REFERRED, NEEDS_FOLLOWUP
  next_check_in_date: Date,
  
  created_at: Date,
  updated_at: Date
}
```

### Case Updates

```javascript
{
  // Existing fields...
  
  // NEW FIELDS:
  client_status: String,           // ACTIVE, INACTIVE, CHECK_IN_ONLY, etc.
  transaction_type: String,        // NEW_INTAKE, CHECK_IN, SELF_REFERRED, etc.
  primary_concern: String,         // Can differ from presenting_issue
  check_ins: [{                    // Track check-in history
    check_in_id: ObjectId,
    check_in_date: Date,
    type: String
  }],
  status_change_reason: String,    // Why status changed
}
```

---

## Permissions

Check-in operations require:

- **Create check-in**: `EDIT_CASE` permission (Counselor, Psychologist, DPO, Admin)
- **View check-in**: `VIEW_CASE` permission (All roles with case access)
- **Update check-in**: `EDIT_CASE` permission
- **Update client status**: `EDIT_CASE` permission

---

## Use Cases

### 1. Post-Counseling Monitoring
- Student completes 6-8 sessions → Transitioned to CHECK_IN_ONLY
- Quarterly check-ins to monitor well-being
- Re-engage if new issues emerge

### 2. Collaborative Care
- Student referred to external provider + check-ins with school counselor
- Status: WITH_MH_CHECK_IN
- Track coordination between providers

### 3. Accommodation Tracking
- Students under SDFO must be monitored for accommodation compliance
- Status: UNDER_ACCOMMODATION
- Check-ins document interactions

### 4. Crisis Follow-Up
- High-risk student discharged from crisis intervention
- Frequent check-ins for safety monitoring
- Type: CRISIS_INTERVENTION with weekly schedule

### 5. Alumni/Ongoing Support
- Graduated students who want periodic check-ins
- Status: CHECK_IN_ONLY, contact method: PHONE/EMAIL
- Lower-frequency monitoring

---

## Best Practices

1. **Schedule Regularly** - Set next_check_in_date for each check-in
2. **Document Thoroughly** - Clear notes help with continuity
3. **Track Outcomes** - Mark check-ins as RESOLVED or ONGOING
4. **Alert on Overdue** - Dashboard shows overdue check-ins
5. **Easy Transition** - Simple status update when transitioning from active
6. **Concern Tracking** - Capture evolving concerns even without active counseling
7. **Referral Trail** - Document any referrals made during check-in

---

## Transitioning Existing Cases

To transition an existing active case to check-in only:

```bash
PUT /api/cases/<case_id>/status
{
  "client_status": "CHECK_IN_ONLY",
  "reason": "Completed counseling after 8 sessions on 2026-03-15"
}
```

Then schedule first check-in:
```bash
POST /api/check-ins/create
{
  "case_id": "<case_id>",
  "check_in_type": "STATUS_UPDATE",
  "contact_method": "PHONE",
  "next_check_in_date": "2026-06-15"
}
```

