# Centralized Case Management Module - Implementation Plan

## Current Status Analysis

### What Already Exists ✅
1. **Cases Blueprint** (`cases.py` - 563 lines)
   - Case CRUD operations
   - Role-based case filtering
   - Case status tracking (NEW, INTAKE_SCHEDULED, ACTIVE, CLOSED, REFERRED)
   - Case assignment to counselors
   - Case type handling

2. **Counseling/Session Notes Blueprint** (`counseling.py` - 503 lines)
   - Session note creation (POST `/api/counseling/case/<case_id>/session-note`)
   - Session note retrieval (GET `/api/counseling/session-note/<note_id>`)
   - Risk flagging during sessions
   - Session topics, interventions, homework tracking

3. **Referrals Blueprint** (`referrals.py`)
   - Referral creation/logging
   - Referral status tracking
   - Referral analytics (via `/api/analytics/referrals/summary`)

4. **Client Tracking** (`client_tracking.py`)
   - Session tracking per client
   - Target vs current sessions
   - Client status tracking

5. **Check-ins Blueprint** (`check_ins.py`)
   - Check-in creation and history
   - Case status updates tied to check-ins

### What's MISSING ❌

#### 1. **Session Notes System** - PARTIALLY IMPLEMENTED
   - ✅ Basic session note creation exists
   - ❌ **Session note versioning/edit history** - Not found
   - ❌ **Note templates** - Not found
   - ❌ **Note archival/soft-delete** - Not found
   - ❌ **Bulk note export/reporting** - Not found

#### 2. **Case Handovers Workflow** - NOT IMPLEMENTED
   - ❌ Handover request creation
   - ❌ Handover approval workflow
   - ❌ Handover history/audit trail
   - ❌ Automatic notification to new counselor
   - ❌ Session note transfer documentation

#### 3. **Referral Logging System** - PARTIALLY INCOMPLETE
   - ✅ Basic referral creation exists
   - ❌ **Referral tracking status** (INITIATED → SENT → RECEIVED → ACCEPTED/REJECTED)
   - ❌ **Referral follow-up reminders**
   - ❌ **Referral outcome tracking**
   - ❌ **External agency integration** (hospital, psychiatry, etc)
   - ❌ **Referral notes/documentation**

#### 4. **Case History Timeline** - NOT FULLY IMPLEMENTED
   - ❌ Complete case event timeline (actions, status changes, notes)
   - ❌ Timeline filtering and sorting
   - ❌ Visual representation/summary

#### 5. **Case Status Tracking** - PARTIALLY IMPLEMENTED
   - ✅ Basic status field exists
   - ❌ **Status transition triggers** (automatic status changes based on events)
   - ❌ **Status change audit trail** (who changed, when, why)
   - ❌ **Case closure workflow** (required documentation before close)
   - ❌ **Case reopening workflow**

#### 6. **Case Notes Versioning/Audit Trail** - NOT IMPLEMENTED
   - ❌ Session note edit history
   - ❌ Version tracking (created, modified, by whom)
   - ❌ Change log of what was modified
   - ❌ Admin ability to view past versions
   - ❌ Soft-delete with recovery option

---

## What I Will Implement

### NEW BLUEPRINT: `case_management.py` (Comprehensive Module)

#### Feature 1: **Session Notes with Versioning**
- `POST /api/case-management/session-notes` - Create new session note
- `PUT /api/case-management/session-notes/<note_id>` - Edit session note (creates version)
- `GET /api/case-management/session-notes/<note_id>/versions` - View all versions of a note
- `GET /api/case-management/session-notes/<note_id>/version/<version_id>` - View specific version
- `DELETE /api/case-management/session-notes/<note_id>` - Soft-delete (admin restore)
- `POST /api/case-management/session-notes/<note_id>/restore` - Restore deleted note (admin)

Database Changes:
- New collection: `session_notes_versions` (tracks all edits with timestamps and user IDs)
- Add fields to `session_notes`: `deleted_at`, `is_deleted`, `current_version_id`

#### Feature 2: **Case Handovers Workflow**
- `POST /api/case-management/handovers` - Initiate handover request
- `GET /api/case-management/handovers/<case_id>` - Get handover history
- `PUT /api/case-management/handovers/<handover_id>/approve` - Approve handover (new counselor)
- `PUT /api/case-management/handovers/<handover_id>/reject` - Reject handover
- `POST /api/case-management/handovers/<handover_id>/complete` - Mark handover complete

States:
- INITIATED → PENDING_APPROVAL → ACCEPTED → IN_PROGRESS → COMPLETED
- Or: INITIATED → REJECTED → CANCELLED

Automatic Notifications:
- New counselor gets email on acceptance
- Old counselor notified on completion
- Case status automatically updates to "HANDOVER_IN_PROGRESS" during process

#### Feature 3: **Referral Logging with Follow-up**
- `POST /api/case-management/referrals` - Log referral with all details
- `PUT /api/case-management/referrals/<referral_id>/status` - Update referral status
- `GET /api/case-management/referrals/<case_id>` - Get all referrals for case
- `POST /api/case-management/referrals/<referral_id>/follow-up` - Log follow-up action
- `GET /api/case-management/referrals/<referral_id>/follow-ups` - Get follow-up history
- `GET /api/case-management/referrals/due-for-followup` - Get overdue follow-ups (staff view)

Referral Statuses:
- INITIATED, SENT, RECEIVED, ACCEPTED, REJECTED, PENDING_RESPONSE, PENDING_FOLLOWUP, COMPLETED

External Agencies:
- Hospital, Psychiatrist, Physical Health, Emergency Services, Welfare, Legal, Other

#### Feature 4: **Case History Timeline**
- `GET /api/case-management/cases/<case_id>/timeline` - Get complete case event timeline
- `GET /api/case-management/cases/<case_id>/timeline?type=status_change` - Filter by event type
- `GET /api/case-management/cases/<case_id>/timeline?from=DATE&to=DATE` - Filter by date range

Timeline Includes:
- Case created
- Status changes (with reason)
- Session notes added
- Referrals created/updated
- Handovers completed
- Check-ins recorded
- Risk flagging events

#### Feature 5: **Enhanced Case Status Tracking**
- `POST /api/case-management/cases/<case_id>/status` - Change case status with reason
- `GET /api/case-management/cases/<case_id>/status-history` - Get all status changes
- `POST /api/case-management/cases/<case_id>/close` - Close case (requires closure documentation)
- `POST /api/case-management/cases/<case_id>/reopen` - Reopen closed case

Status Transitions:
- NEW → INTAKE_SCHEDULED → INTAKE_IN_PROGRESS → ACTIVE → (HANDOVER_IN_PROGRESS) → MONITORING → CLOSED
- ACTIVE → REFERRED (while maintaining primary counselor)
- Any status → ON_HOLD (temporary pause)

Automatic Triggers:
- NEW → INTAKE_SCHEDULED when first appointment booked
- INTAKE_SCHEDULED → ACTIVE when first session note created
- No new sessions for 30 days → Send check-in reminder

#### Feature 6: **Case Notes Versioning with Audit Trail**
- All modifications tracked with:
  - WHO made the change (user_id)
  - WHEN it happened (timestamp)
  - WHAT changed (old values → new values)
  - WHY it changed (reason if provided)

Endpoints:
- `GET /api/case-management/cases/<case_id>/audit-log` - Full audit trail
- `GET /api/case-management/cases/<case_id>/changes?field=status` - Changes to specific field
- Admin dashboard showing who modified what

---

## Database Schema Changes

### New Collections:

1. **`session_notes_versions`**
   ```
   {
     _id: ObjectId,
     session_note_id: ObjectId,
     version_number: int,
     edited_by: ObjectId (user_id),
     edited_at: datetime,
     previous_values: {topics_discussed, interventions, etc},
     new_values: {...},
     change_reason: string (why edited)
   }
   ```

2. **`case_handovers`**
   ```
   {
     _id: ObjectId,
     case_id: ObjectId,
     from_counselor_id: ObjectId,
     to_counselor_id: ObjectId,
     initiated_by: ObjectId (initiating staff),
     initiated_at: datetime,
     status: string (INITIATED, PENDING_APPROVAL, ...),
     reason: string,
     notes: string,
     handover_session_notes: [ObjectId], // transferred notes
     status_history: [{status, changed_at, changed_by}],
     completed_at: datetime
   }
   ```

3. **`referral_logs`** (enhance existing)
   ```
   {
     _id: ObjectId,
     case_id: ObjectId,
     counselor_id: ObjectId,
     referral_type: string (hospital, psychiatrist, etc),
     agency_name: string,
     contact_person: string,
     contact_email: string,
     created_at: datetime,
     status: string (INITIATED, SENT, RECEIVED, ...),
     notes: string,
     follow_ups: [{
       logged_at: datetime,
       logged_by: ObjectId,
       action_taken: string,
       next_followup: datetime
     }],
     outcome: string,
     outcome_date: datetime
   }
   ```

4. **`case_audit_log`**
   ```
   {
     _id: ObjectId,
     case_id: ObjectId,
     event_type: string (status_change, note_added, referral_created, etc),
     changed_by: ObjectId,
     changed_at: datetime,
     previous_values: {...},
     new_values: {...},
     reason: string
   }
   ```

### Modified Collections:

1. **`cases`** - Add fields:
   ```
   status_history: [{status, changed_at, changed_by, reason}]
   last_activity: datetime
   closure_notes: string (required when status=CLOSED)
   closed_at: datetime
   closed_by: ObjectId
   ```

2. **`session_notes`** - Add fields:
   ```
   is_deleted: boolean (soft-delete)
   deleted_at: datetime
   deleted_by: ObjectId
   current_version_id: ObjectId
   edit_history: [{edited_at, edited_by, change_reason}]
   ```

---

## Implementation Scope

**Total New Endpoints:** 18
- Session Notes: 6 endpoints
- Case Handovers: 5 endpoints
- Referral Follow-ups: 4 endpoints
- Case History: 1 endpoint
- Case Status: 2 endpoints

**Estimated Code:** 800-1000 lines for new blueprint

**Permissions Required:**
- EDIT_NOTES (for session note modifications)
- MANAGE_HANDOVERS (for handover requests)
- EDIT_CASE (for status changes)
- VIEW_CASE (for viewing history/audit logs)

---

## What This Achieves

✅ Complete session management with edit tracking
✅ Seamless case handover between counselors
✅ Comprehensive referral tracking with follow-ups
✅ Full audit trail for compliance/legal requirements
✅ Visual timeline of case progression
✅ Automatic status management based on events
✅ Admin oversight and data integrity
✅ Soft-delete with recovery capability
✅ Staff notifications for important events

---

## Ready to Implement?

I will create `/backend/blueprints/case_management.py` with all 6 features above, including:
- All endpoints with full validation
- Database operations with proper indexing
- Permission checks for each operation
- Automatic notifications and status updates
- Complete audit logging
- Comprehensive error handling

**Shall I proceed with the implementation?**
