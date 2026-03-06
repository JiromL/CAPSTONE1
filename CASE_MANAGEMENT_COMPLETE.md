# Case Management System - Complete Implementation

## Overview
The three-dashboard case management system is now fully implemented, allowing intake counselors, clinical staff, and administrators to manage cases with proper role-based access control.

## System Architecture

```
Intake Counselor (IC) → Reviews new cases → Assigns to PSYCHOLOGIST (clinical) or COUNSELOR (non-clinical)
              ↓
Assigned Staff (PSYCHOLOGIST/COUNSELOR) → Records sessions → Updates status  
              ↓
DPO/Admin → Reviews all cases → Reassigns → Generates reports
```

## Three Dashboards

### 1. **Intake Queue** (`/dashboard/intake/queue`)
**For: Intake Counselors (IC)**

**Purpose:** Manage new client referrals and assign to appropriate clinical staff

**Features:**
- Filter by status: NEW, INTAKE_SCHEDULED
- View case details: presenting issue, risk level, creation date
- Color-coded risk badges: CRITICAL (red), RED (orange), YELLOW (yellow), GREEN (green)
- Right-side assignment panel:
  - Select counselor (dropdown fetches PSYCHOLOGIST/COUNSELOR users)
  - Select case type: CLINICAL, DEVELOPMENTAL, CHECK_IN
  - Click case to highlight → Assign button assigns case
  - Real-time refresh after assignment
  
**Workflow:**
1. IC views new cases in queue
2. IC clicks case to review presenting issue
3. IC selects appropriate PSYCHOLOGIST (clinical) or COUNSELOR (non-clinical)
4. IC clicks "Assign" → case status changes to INTAKE_SCHEDULED, assigned_counselor_id updated
5. Case disappears from IC's queue, appears in counselor's caseload

**File:** `/frontend/src/app/(dashboard)/intake/queue/page.tsx` (210 lines)

### 2. **Caseload Dashboard** (`/dashboard/cases/caseload`)
**For: Psychologists & Counselors (PSYCHOLOGIST, COUNSELOR roles)**

**Purpose:** Manage assigned cases, record sessions, track progress

**Features:**
- Top stats: Active cases, Pending Termination, High-Risk count, Total Sessions recorded
- Filter by status: ACTIVE, PENDING_TERMINATION, CLOSED
- Case grid (2 columns): Shows all cases assigned to logged-in user
  - Each card displays: Case ID, student name, status badge, risk level badge, session counter (current/target), last session date
  - Click card to expand detail panel
- Session recording panel:
  - Duration (minutes) and notes inputs
  - "Add Session" button: increments session_count, posts to /api/cases/{id}/sessions
  - Auto-update of session counter
- Status management buttons:
  - Active (green)
  - Pending Termination (yellow) 
  - Closed (gray)
  - Clicking changes case.status and auto-updates UI
- Risk level quick-change buttons: GREEN/YELLOW/RED/CRITICAL
  - Updates case.risk_level on backend

**Workflow:**
1. PSYCHOLOGIST/COUNSELOR logs in
2. Sees all assigned cases (filtered by assigned_counselor_id on backend)
3. Clicks case to open detail panel
4. Can:
   - Record session: enter duration → increments counter, saves to database
   - Update risk level: click CRITICAL/RED/YELLOW/GREEN → updates case
   - Change status: ACTIVE → PENDING_TERMINATION → CLOSED
5. Stats aggregation shows total active, high-risk, and session metrics

**File:** `/frontend/src/app/(dashboard)/cases/caseload/page.tsx` (282 lines)

### 3. **Case Manager** (`/dashboard/cases/manager`)
**For: Director/DPO & Administrators (DPO, ADMIN roles)**

**Purpose:** Global case oversight, team reassignment, reporting

**Features:**
- Top statistics (5-column card grid):
  - Total Cases (all records)
  - Active (count where status=ACTIVE)
  - Unassigned (count where assigned_counselor_id is null)
  - High Risk (count where risk_level=CRITICAL or RED)
  - Total Sessions (sum of all session_count)

- Search & filter toolbar:
  - Text search: case ID or presenting issue
  - Status filter buttons: ACTIVE, NEW, PENDING_TERMINATION, CLOSED
  - Bulk assign button (only enabled when cases selected)
  - CSV export button: downloads case report

- Bulk reassignment workflow:
  - Click case checkboxes to select multiple
  - Click "Bulk Assign (N)" button
  - Select counselor from dropdown
  - Click "Assign" → all selected cases reassigned in batch
  
- Cases table with columns:
  - Checkbox (for bulk selection)
  - Case ID (last 4 digits with # prefix)
  - Assigned To (shows "Assigned" or yellow "Unassigned" badge)
  - Status (NEW, ACTIVE, PENDING_TERMINATION, CLOSED)
  - Risk Level (color-coded badge)
  - Sessions (current/target format)
  - Created (date case was added to system)
  
- Export CSV: Downloads "cases-report-YYYY-MM-DD.csv" with all case data

**Workflow:**
1. DPO logs in
2. Sees all cases from entire organization (no role-based filtering)
3. Can:
   - Search by case ID or issue
   - Filter by status to focus on active/new/terminating/closed cases
   - View unassigned cases needing assignment
   - Bulk reassign multiple cases in one operation
   - Export to CSV for reporting/analysis
   - See high-risk cases at a glance with color coding
4. Stats help identify workload distribution and high-risk trends

**File:** `/frontend/src/app/(dashboard)/cases/manager/page.tsx` (295 lines)

## Backend API Endpoints

All endpoints located at: `/api/cases`

### Role-Based Filtering
```python
# DPO/ADMIN: See ALL cases
# IC: See NEW + INTAKE_SCHEDULED cases only  
# PSYCHOLOGIST/COUNSELOR: See only cases assigned to them
# STUDENT: See only their own cases
```

### Endpoints:

**GET /api/cases?status=ACTIVE&type=CLINICAL**
- Filters by status, type, role
- Returns array of cases visible to user's role

**POST /api/cases**
- Create new case
- Body: `{ student_id, intake_counselor_id, presenting_issue, case_type, risk_level, target_sessions }`
- Returns created case object

**GET /api/cases/<id>**
- Get single case details
- Role-based access control: user must have permission to view

**PUT /api/cases/<id>**
- Update case fields
- Body: `{ status, risk_level, presenting_issue, target_sessions, next_appointment }`

**PUT /api/cases/<id>/assign**
- Assign case to counselor
- Body: `{ assigned_counselor_id, case_type }`
- IC/DPO/ADMIN only

**POST /api/cases/<id>/sessions**
- Record session
- Body: `{ duration_minutes, notes }`
- Auto-increments session_count

**PUT /api/cases/<id>/close**
- Terminate case
- Body: `{ termination_reason, outcome_notes }`

## Database Models

### Case Collection
```javascript
{
  _id: ObjectId,
  student_id: ObjectId,                  // FK to student
  intake_counselor_id: ObjectId,         // IC who received referral
  assigned_counselor_id: ObjectId,       // PSYCH/COUNSELOR on case
  status: "NEW" | "INTAKE_SCHEDULED" | "ACTIVE" | "PENDING_TERMINATION" | "CLOSED" | "CANCELLED",
  case_type: "CLINICAL" | "DEVELOPMENTAL" | "CHECK_IN",
  presenting_issue: string,              // Initial concern
  risk_level: "GREEN" | "YELLOW" | "RED" | "CRITICAL",
  session_count: 0,                      // Auto-increment on sessions
  target_sessions: 10,                   // Goal for case
  sessions: [
    { date, duration_minutes, notes, counselor_id }
  ],
  created_at: timestamp,
  updated_at: timestamp
}
```

## Staff Roles (23 Users Seeded)

- **Admin (1)**: System administrator
- **DPO (1)**: Director, case manager access
- **IC/Intake Counselor (8)**: Screen new referrals, assign to staff
  - julse@, archie@, mars@, ria@, cris@, wil@, rose.c@, gracie@
- **Psychologist (6)**: Clinical case management (CLINICAL type cases)
  - daryl@, niko@, bon@, shel@, jenny@, chona@
- **Counselor (4)**: Non-clinical case management (DEVELOPMENTAL/CHECK_IN type cases)
  - rose.t@, bia@, chelly@, daye@
- **Student (3)**: Can create cases for themselves

## Security Features

✅ **JWT Authentication**: All endpoints require valid token
✅ **Role-Based Access Control**: Backend filters queries by user role
✅ **Permission Matrix**: ROLE_PERMISSIONS dict in auth blueprint
✅ **Field-Level Access**: Users cannot access fields outside their role
✅ **Audit Trail**: created_at, updated_at timestamps on all records
✅ **Bulk Operations Validation**: Each case in bulk assign is checked for permissions

## Testing Workflows

### Test 1: IC Assignment Workflow
1. Login as: julse@ (IC)
2. Go to `/dashboard/intake/queue`
3. See NEW cases
4. Click case to select
5. Choose counselor (e.g., daryl@ PSYCHOLOGIST for clinical)
6. Click Assign
7. Case status changes to INTAKE_SCHEDULED
8. Case disappears from IC queue

### Test 2: Counselor Session Recording
1. Login as: daryl@ (PSYCHOLOGIST)
2. Go to `/dashboard/cases/caseload`
3. See assigned cases
4. Click case card
5. Enter session duration (60 min) + notes ("Patient presenting with...")
6. Click "Add Session"
7. Session counter increments: 0/10 → 1/10
8. Last session date updates

### Test 3: DPO Bulk Reassignment
1. Login as: dpo@ (DPO)
2. Go to `/dashboard/cases/manager`
3. Check multiple cases
4. Click "Bulk Assign (N)"
5. Select new counselor
6. Click Assign
7. All checked cases reassigned to new counselor
8. Click Export CSV to download report

## File Summary

| File | Purpose | Lines |
|------|---------|-------|
| `/backend/blueprints/cases.py` | Case API endpoints | 350 |
| `/backend/models.py` | CaseStatus/CaseType enums | +10 |
| `/frontend/.../intake/queue/page.tsx` | IC dashboard | 210 |
| `/frontend/.../cases/caseload/page.tsx` | PSYCH/COUNSELOR dashboard | 282 |
| `/frontend/.../cases/manager/page.tsx` | DPO/Admin dashboard | 295 |

**Total Implementation: ~1,200 lines of new code across full stack**

## Next Steps (Optional Enhancements)

### Priority Features:
1. **Check-in Tracking**: Separate endpoint for brief check-ins (< 30 min) vs full sessions
2. **Appointment Scheduling**: Integration with Zoom/Calendar for next_appointment
3. **Auto-reminders**: Email/SMS when appointment approaching
4. **Bulk Status Updates**: Change multiple cases from ACTIVE → PENDING_TERMINATION
5. **Reports**: Caseload PDF, session trends, risk distribution charts

### Database Optimizations:
1. Add indexes on: assigned_counselor_id, status, risk_level
2. Archive closed cases to separate collection for performance
3. Add case_history collection for audit trail of all status changes

### UI Improvements:
1. Kanban board view: Drag cases between status columns
2. Calendar view: See appointments and sessions per counselor
3. Risk dashboard: Heat map of high-risk cases by counselor
4. Auto-save: Session notes save while typing instead of submit button

## Deployment Checklist

- ✅ Backend API endpoints tested and working
- ✅ Role-based filtering verified at database level
- ✅ Frontend dashboards created for all three roles
- ✅ Bulk operations implemented
- ✅ CSV export working
- ✅ Error handling on all forms
- ✅ Dark mode support on all dashboards
- ✅ Responsive design (mobile/tablet compatible)

## Support

For API documentation, see `/docs/API.md`
For system architecture details, see `/docs/ARCHITECTURE_DETAILED.md`

---

**Status: ✅ COMPLETE AND READY FOR PRODUCTION**
