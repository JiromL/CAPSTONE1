# Coordination & Referral Module - Status Report

## Current Status by Feature

### ✅ 1. REMINDERS SYSTEM
**Status**: FULLY IMPLEMENTED  
**Endpoints**: 3 operational  
**Blueprint**: `/backend/blueprints/engagement.py` (Lines 218-275)

#### Endpoints:
- `POST /api/engagement/reminders` - Create reminder
  - Required: `title`, `reminder_time` (ISO format)
  - Optional: `description`, `reminder_type` (appointment/medication/homework/general), `is_recurring`, `recurrence_pattern`
  - Response: `reminder_id`, `created_at`

- `GET /api/engagement/reminders?type=upcoming|past|all` - List reminders
  - Filters: `type` parameter for upcoming/past/all
  - Response: array of reminders with `reminder_id`, `title`, `reminder_time`, `reminder_type`, `sent`, `acknowledged`

- `PATCH /api/engagement/reminders/<reminder_id>/acknowledge` - Mark as acknowledged
  - Response: confirmation message

**Database Collection**: `reminders`
**Fields**: user_id, title, description, reminder_time, reminder_type, is_recurring, recurrence_pattern, sent, acknowledged, created_at, updated_at

**Testing Status**: ⚠️ NOT TESTED - Needs verification
**Frontend Integration**: ⚠️ NOT IMPLEMENTED

---

### ✅ 2. FEEDBACK COLLECTION SYSTEM
**Status**: FULLY IMPLEMENTED  
**Endpoints**: 3 operational  
**Blueprint**: `/backend/blueprints/engagement.py` (Lines 287-380)

#### Endpoints:
- `POST /api/engagement/feedback` - Submit feedback
  - Required: `rating` (1-5), `content`
  - Optional: `session_id`, `counselor_id`, `category` (session/counselor/program/general), `would_recommend` (yes/no), `improvements` (array), `anonymous` (boolean)
  - Response: `feedback_id`, `rating`, `created_at`

- `GET /api/engagement/feedback?type=all|session|counselor|program&skip=0&limit=20` - List feedback (Admin/Counselor/DPO only)
  - Filters: `type` (category filter), pagination with `skip` and `limit`
  - Response: array of feedback, `total` count, `avg_rating`
  - Permission check: ADMIN, DPO, PSYCHOLOGIST, COUNSELOR roles only

- `GET /api/engagement/feedback/<feedback_id>` - Get full feedback details (Admin/Counselor/DPO only)
  - Response: complete feedback with all fields including `submitted_by`, `created_at`

**Database Collection**: `feedback`
**Fields**: user_id, session_id, counselor_id, rating, content, category, would_recommend, improvements, anonymous, created_at

**Testing Status**: ⚠️ NOT TESTED - Needs verification
**Frontend Integration**: ⚠️ NOT IMPLEMENTED

---

### ✅ 3. CPS-SPECIFIC REFERRAL SYSTEM
**Status**: FULLY IMPLEMENTED  
**Endpoints**: 12+ operational (CPS-specific)  
**Blueprint**: `/backend/blueprints/referrals.py` (Lines 1-400+)

#### Key CPS Workflow Endpoints:
- `POST /api/referrals/initiate` - Create CPS referral
  - Required: `case_id`, `referral_type` ("CPS"), `reason`, `allegations` (array), `student_dob`, `student_address`
  - Optional: `reporter_name`, `reporter_relationship`, `has_siblings`, `siblings_info`
  - Creates: CPS referral in SUBMITTED status

- `POST /api/referrals/<referral_id>/cps/assign-investigator` - Assign CPS investigator
  - Required: `investigator_name`, `investigator_contact`, `cps_case_number`
  - Updates status: SUBMITTED → ASSIGNED
  - Stores: investigator details, case number

- `POST /api/referrals/<referral_id>/cps/start-investigation` - Begin investigation
  - Updates status: ASSIGNED → UNDER_INVESTIGATION
  - Records: investigation_started_date

- `POST /api/referrals/<referral_id>/cps/investigation-findings` - Submit findings
  - Required: `investigation_findings` (SUBSTANTIATED/UNSUBSTANTIATED/INCONCLUSIVE), `investigation_details`
  - Updates status: UNDER_INVESTIGATION → INVESTIGATION_COMPLETE
  - Stores: detailed findings, notes

- `POST /api/referrals/<referral_id>/cps/case-decision` - Record final decision
  - Required: `decision` (CASE_OPENED/CASE_CLOSED/REFERRED_TO_SERVICES)
  - Updates: case_opened_with_cps, decision field
  - Supports warm handoff tracking

- `GET /api/referrals/<referral_id>` - View referral status
- `GET /api/referrals/case/<case_id>` - List all referrals for case
- `PUT /api/referrals/<referral_id>/warm-handoff` - Track warm handoff completion
- `GET /api/referrals/<referral_id>/investigation-timeline` - View investigation history

#### CPS Status Flow:
```
SUBMITTED → ASSIGNED → UNDER_INVESTIGATION → INVESTIGATION_COMPLETE → FINDINGS_ISSUED → 
CASE_OPENED or CASE_CLOSED or REFERRED_TO_SERVICES
```

**Database Collection**: `referrals`
**Fields**: case_id, referral_type, referring_counselor_id, allegations, cps_case_number, investigator_name, investigator_details, investigation_findings, decision, roi_signed, warm_handoff_completed, investigation_notes (array), etc.

**Testing Status**: ⚠️ NOT TESTED - Needs end-to-end verification
**Frontend Integration**: ⚠️ NOT IMPLEMENTED

---

### ✅ 4. VIDEO LINKS FOR SESSIONS
**Status**: FULLY IMPLEMENTED  
**Endpoints**: 2 operational  
**Blueprint**: `/backend/blueprints/engagement.py` (Lines 16-64)

#### Endpoints:
- `POST /api/engagement/session/<session_id>/video-link` - Create video link
  - Required: `link_url`
  - Optional: `platform` (zoom/google_meet/teams), `password`, `start_time`
  - Response: `video_link_id`, `platform`, `link_url`, `created_at`

- `GET /api/engagement/session/<session_id>/video-link` - Retrieve video link
  - Response: `video_link_id`, `platform`, `link_url`, `password`, `start_time`, `created_at`

**Database Collection**: `video_links`
**Fields**: session_id, case_id, counselor_id, platform, link_url, password, start_time, created_at

**Testing Status**: ⚠️ NOT TESTED - Needs verification
**Frontend Integration**: ⚠️ NOT IMPLEMENTED

---

### ✅ 5. JOURNALING SYSTEM
**Status**: FULLY IMPLEMENTED  
**Endpoints**: 4 operational  
**Blueprint**: `/backend/blueprints/engagement.py` (Lines 79-168)

#### Endpoints:
- `POST /api/engagement/journal` - Create journal entry
  - Required: `content`
  - Optional: `mood` (1-5), `tags` (array), `is_private` (boolean), `attachments` (array)
  - Response: `journal_id`, `created_at`, `mood`

- `GET /api/engagement/journal?skip=0&limit=20` - List student's entries
  - Pagination: `skip`, `limit`
  - Response: array of entries, `total` count

- `GET /api/engagement/journal/<journal_id>` - Get full entry
  - Response: complete journal entry with all fields

- `PATCH /api/engagement/journal/<journal_id>` - Update entry
  - Updateable: `content`, `mood`, `tags`
  - Response: confirmation

**Database Collection**: `journal_entries`
**Fields**: student_id, mood (1-5), content, tags, is_private, attachments, created_at, updated_at

**Testing Status**: ✅ TESTED - Just added in recent implementation
**Frontend Integration**: ⚠️ PARTIAL - Sidebar UI exists but API connection needs verification

---

## Missing Features Analysis

### ❌ 1. Intake Counselor-to-Counselor Referral (CPS-Specific)
**What's Missing**: Specific workflow for intake counselor referring to case counselor when CPS involvement is likely

**Proposed Implementation**:
```python
POST /api/referrals/initiate-counselor-handoff
- Required: case_id, receiving_counselor_id, reason
- Special: Marks case as "CPS_PENDING_ASSIGNMENT"
- Creates: Internal referral with urgent flag
- Notifies: Receiving counselor
- Status: SUBMITTED → ACKNOWLEDGED → IN_PROGRESS → COMPLETED (with CPS case)
```

---

## Testing Required

### Test 1: Reminders System
```bash
# Create reminder
POST /api/engagement/reminders
{
  "title": "Follow-up call with student",
  "reminder_time": "2026-03-25T10:00:00",
  "reminder_type": "appointment",
  "description": "Check on medication compliance"
}

# List upcoming
GET /api/engagement/reminders?type=upcoming

# Acknowledge
PATCH /api/engagement/reminders/{reminder_id}/acknowledge
```

### Test 2: Feedback Collection
```bash
# Submit feedback
POST /api/engagement/feedback
{
  "rating": 5,
  "content": "Excellent support and guidance",
  "category": "session",
  "would_recommend": true,
  "improvements": ["more flexible scheduling"]
}

# List feedback (admin only)
GET /api/engagement/feedback?type=session&skip=0&limit=20

# Get specific feedback
GET /api/engagement/feedback/{feedback_id}
```

### Test 3: CPS Referral Workflow
```bash
# 1. Initiate CPS referral
POST /api/referrals/initiate
{
  "case_id": "{case_id}",
  "referral_type": "CPS",
  "reason": "Student disclosed abuse",
  "allegations": ["physical abuse", "neglect"],
  "student_dob": "2008-05-15",
  "student_address": "123 Main St, City",
  "reporter_name": "Counselor Name",
  "reporter_relationship": "Mandated Reporter"
}
→ Response: referral_id

# 2. Assign investigator
POST /api/referrals/{referral_id}/cps/assign-investigator
{
  "investigator_name": "John Doe",
  "investigator_contact": "555-1234",
  "cps_case_number": "CPS-2026-00123"
}
→ Status: ASSIGNED

# 3. Start investigation
POST /api/referrals/{referral_id}/cps/start-investigation
→ Status: UNDER_INVESTIGATION

# 4. Submit findings
POST /api/referrals/{referral_id}/cps/investigation-findings
{
  "investigation_findings": "SUBSTANTIATED",
  "investigation_details": "Evidence supports allegations of neglect"
}
→ Status: INVESTIGATION_COMPLETE

# 5. Record decision
POST /api/referrals/{referral_id}/cps/case-decision
{
  "decision": "CASE_OPENED",
  "roi_signed": true
}
→ Status changes accordingly
```

### Test 4: Video Links
```bash
# Create video link
POST /api/engagement/session/{session_id}/video-link
{
  "platform": "zoom",
  "link_url": "https://zoom.us/j/...",
  "password": "123456",
  "start_time": "2026-03-25T09:00:00"
}

# Get video link
GET /api/engagement/session/{session_id}/video-link
```

---

## Frontend Integration Checklist

### Required Components:

#### 1. Reminders Widget
- [ ] Create reminder form (title, time, type, description)
- [ ] Display upcoming reminders
- [ ] Mark as acknowledged
- [ ] Show reminder count badge

#### 2. Feedback Form
- [ ] Collect 5-star rating
- [ ] Open-ended comment field
- [ ] Category selector
- [ ] "Would recommend?" toggle
- [ ] Submit with error handling

#### 3. CPS Referral Workflow UI
- [ ] CPS referral initiation form (allegations, student info)
- [ ] Status timeline showing:
  - SUBMITTED
  - ASSIGNED (show investigator name)
  - UNDER_INVESTIGATION
  - INVESTIGATION_COMPLETE
  - Decision (CASE_OPENED/CLOSED/REFERRED)
- [ ] Investigation timeline viewer
- [ ] Warm handoff tracking

#### 4. Video Link Management
- [ ] Link generator/selector
- [ ] Display in session prep area
- [ ] Show platform-specific instructions

#### 5. Journal Entry UI (PARTIALLY EXISTS)
- [ ] ✅ Entry creation form (exists)
- [ ] ✅ Mood selector (1-5)
- [ ] ✅ Tag selector
- [ ] ✅ Sidebar with entry history
- [ ] [ ] Full entry viewer with navigation

---

## Database Collection Status

| Collection | Status | Indexes | Records |
|-----------|--------|---------|---------|
| reminders | ✅ Auto-created | user_id, reminder_time | TBD |
| feedback | ✅ Auto-created | category, user_id | TBD |
| video_links | ✅ Auto-created | session_id, case_id | TBD |
| journal_entries | ✅ Auto-created | student_id, created_at | TBD |
| referrals | ✅ Auto-created | case_id, referral_type | TBD |

**Note**: All collections are auto-created by MongoDB on first insert. No manual setup required.

---

## Next Steps (Priority Order)

### IMMEDIATE (This Session)
1. **Test all endpoints** with provided test scripts
2. **Verify database connections** - ensure collections are created
3. **Create integration setup script** for frontend developers
4. **Document API responses** with real examples

### SHORT TERM (Next 2 Days)
1. **Frontend: Implement reminder widget** (simplest, high value)
2. **Frontend: Implement feedback form** (small form, good UX)
3. **Frontend: Journal integration** (already has UI, just connect API)

### MEDIUM TERM (Next Week)
1. **Frontend: CPS referral workflow UI** (complex, multi-step)
2. **Testing: End-to-end CPS flow** (critical for compliance)
3. **Testing: Permission-based access** (verify role restrictions)

### LONG TERM (After Launch)
1. **Implement counselor-to-counselor handoff** endpoint
2. **Add reminder scheduling/notifications** (email/SMS)
3. **Add feedback analytics dashboard**
4. **Add CPS investigation timeline visualization**

---

## Key Integration Points

### Authentication
- All endpoints require JWT Bearer token in `Authorization` header
- Use existing auth service: `getJWT()` or local token storage

### Permissions
- Feedback listing requires role: ADMIN, DPO, PSYCHOLOGIST, COUNSELOR
- CPS referrals require: EDIT_CASE permission
- Reminders are user-specific (each user sees own reminders)
- Journal entries are private to each student

### Error Handling
```typescript
// Standard error responses
400: Missing required fields
403: Insufficient permissions
404: Resource not found
500: Server error
```

---

## Success Criteria

✅ **REMINDERS MODULE**
- [ ] Create reminder - returns reminder_id
- [ ] List upcoming reminders - shows next 10
- [ ] Acknowledge reminder - marks as acknowledged

✅ **FEEDBACK MODULE**
- [ ] Submit feedback - records in database
- [ ] Retrieve feedback list - admin can view all
- [ ] Calculate average rating - shows on dashboard

✅ **CPS REFERRAL MODULE**
- [ ] Initiate referral - creates in SUBMITTED status
- [ ] Track through investigation phases - all 6+ statuses
- [ ] Record findings and decision - complete workflow
- [ ] View investigation timeline - shows all events with timestamps

✅ **VIDEO LINKS**
- [ ] Create link - stores platform and URL
- [ ] Retrieve link - shows before session

✅ **JOURNALING**
- [ ] Create entry - saves content
- [ ] List entries - shows with mood indicator
- [ ] View full entry - shows all fields
- [ ] Update entry - allows editing

---

## Reference Documentation

### See Also
- `/backend/blueprints/engagement.py` - Video, journal, reminder, feedback endpoints
- `/backend/blueprints/referrals.py` - CPS and all referral types
- `/backend/blueprints/case_management.py` - General referral tracking (different from CPS-specific)

### API Base URLs
- Development: `http://localhost:8000/api`
- Engagement endpoints: `/api/engagement/*`
- Referral endpoints: `/api/referrals/*`

### Testing Scripts Available
- None yet - need to create test_coordination_referral.py
