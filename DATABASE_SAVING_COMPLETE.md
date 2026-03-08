# Database Saving & Dashboard Display - Complete Implementation

## Problem Statement
Students and counselors were seeing hardcoded data in dashboards instead of real data from the database. Tasks weren't loading from actual intake forms.

## Solution Implemented

### Phase 1: API Communication Layer ✓
Created `frontend/src/utils/dashboard-api.ts` with reusable functions:
- `fetchDashboardData()` - Role-specific data retrieval
- `fetchUrgentAssessments()` - High-risk case queries
- `fetchAssessmentStats()` - System-wide statistics
- `formatDate()` - Consistent date formatting
- Error handling for all API calls

### Phase 2: Frontend Component Updates ✓

**StudentDashboard.tsx** Changes:
- Loading: Now shows spinner while fetching data
- Real Data: Displays actual counseling ID from localStorage
- Next Appointment: Shows real date from `responses.appointment_date`
- Fallback: "No appointments scheduled" when none exist
- Menu Badge: Updated to show actual task count

**CounselorDashboard.tsx** Changes:
- Metrics: Calculated from actual database counts
- Assigned Cases: Real number from `db.cases` query
- High-Risk Alerts: Calculated from assessment scores
- Risk Levels: Color-coded (GREEN/YELLOW/RED/CRITICAL)
- Emergency Alerts: Shows counseling_id + risk level

**Tasks Page (tasks/page.tsx)** Changes:
- Data Source: Fetches real intakes from API
- Task Type: Uses `responses.purpose` (personal/academic/career/etc)
- Risk Level: Calculated from PHQ-9/GAD-7 scores
- Status: Shows emergency flag, pending, scheduled, completed
- Filtering: Tabs organize tasks by status
- Empty State: Shows message when no tasks

### Phase 3: Backend Verification ✓

**Intake Submission Endpoint** (`/api/intake/submit`):
- Saves to `db.intakes` with counseling_id, scores, appointment_date
- Creates case record in `db.cases`
- Creates assessment records in `db.assessments`
- Returns counseling_id for display

**Dashboard Endpoint** (`/api/intake/assessments/dashboard`):
- Role-based filtering:
  - Student: Returns their own intakes
  - Counselor: Returns assigned cases with scores
  - Admin: Returns system-wide metrics
- Calculates risk levels on backend
- Includes alerts for high-risk cases

**Data Structure** Saved to MongoDB:
```javascript
// Intake document
{
  counseling_id: "CPS-ABC12345",
  case_id: ObjectId(...),
  status: "COMPLETED",
  is_emergency: false,
  responses: {
    appointment_date: "2026-03-12",
    phq9_score: 9,
    gad7_score: 5,
    urgency_level: "normal",
    purpose: "personal"
  },
  student_submitted_at: ISODate(...)
}
```

## Current Data Flow

```
1. Student fills intake form
   ↓
2. Submits: POST /api/intake/submit
   ↓
3. Backend validates and saves:
   - db.intakes.insert_one(intake_doc)
   - db.cases.insert_one/update(case_doc)
   - db.assessments.insert_one(assessment_doc)
   ↓
4. Responds with counseling_id
   ↓
5. Frontend saves counseling_id to localStorage
   ↓
6. Dashboard queries: GET /api/intake/assessments/dashboard
   ↓
7. Backend queries MongoDB and returns role-specific data
   ↓
8. Frontend displays real data in components:
   - StudentDashboard shows their intake
   - CounselorDashboard shows assigned cases
   - Tasks page shows all assessments
```

## Data Verification

### What Gets Saved
When a student submits the intake form:
- ✓ `db.intakes` - Complete intake with all responses and scores
- ✓ `db.cases` - Links student to assigned counselor
- ✓ `db.assessments` - 1 record per assessment type taken (PHQ-9, GAD-7, etc)
- ✓ `counseling_id` - Unique ID generated and stored
- ✓ `appointment_date` - Calculated based on urgency

### What Gets Displayed
Dashboard automatically shows:
- ✓ Real counseling IDs (from `counseling_id` field)
- ✓ Actual appointment dates (from `responses.appointment_date`)
- ✓ Risk levels (calculated from scores in `responses`)
- ✓ Emergency indicators (from `is_emergency` flag)
- ✓ Assessment types (from `responses.purpose`)
- ✓ Student names (unless anonymous)
- ✓ Case assignments (counselor names)

## Testing the Implementation

### 1. Test Intake Submission
```bash
# Create test user account
# Fill out intake form with all assessments
# Submit form
# Check browser console: should see counseling_id
```

### 2. Verify Dashboard
```bash
# Login as same student
# Go to Dashboard
# Should show:
  - ✓ Counseling ID (from localStorage)
  - ✓ Next appointment date (from dashboard API)
  - ✓ Appointment status
# Go to Tasks
# Should show:
  - ✓ Assessment submitted
  - ✓ Risk level
  - ✓ Submitted date
```

### 3. Check MongoDB
```bash
mongosh
use capstone
db.intakes.findOne({})
# Should see all fields populated with real data
```

### 4. Test Counselor View
```bash
# Login as counselor
# Go to Dashboard
# Should show:
  - ✓ Number of assigned cases
  - ✓ High-risk alert count
  - ✓ List of recent cases
  - ✓ Risk levels for each case
```

## Performance Features

### Database Indexes
Automatically created for fast queries:
- `(is_emergency, status, student_submitted_at)` - Emergency filtering
- `(assigned_counselor_id, status)` - Counselor's cases
- `(assessment_type, created_at)` - Assessment queries

### API Optimization
- ✓ Role-based filtering on backend
- ✓ MongoDB aggregation for statistics
- ✓ Sorted by most recent first
- ✓ Limited results to prevent overload

### Frontend Optimization
- ✓ Reusable API functions (avoid duplication)
- ✓ Error handling (never crashes)
- ✓ Loading states (user feedback)
- ✓ Memoization (prevent unnecessary re-renders)

## Error Handling

All components now handle:
1. **Network Errors**: Shows error message + retry option
2. **No Data**: Shows empty state message
3. **Loading**: Shows spinner while fetching
4. **Invalid Token**: Redirects to login
5. **Server Errors**: Displays error from API

## Configuration

### Frontend API Base
`frontend/src/utils/api.ts`:
```typescript
const base = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:5001';
```
- Local development: `http://127.0.0.1:5001`
- Production: Set via environment variable

### Backend Port
`backend/app.py`:
```python
port = int(os.environ.get('PORT', 5000))
```
- Can be overridden: `PORT=5001 python app.py`

### Database
- MongoDB local: Default connection on localhost:27017
- Database: `capstone`
- Collections: Auto-created on first insert

## Files Modified

**New Files** (2):
- `frontend/src/utils/dashboard-api.ts` - API helpers
- `backend/verify_database.py` - Database verification

**Updated Files** (4):
- `frontend/src/components/StudentDashboard.tsx`
- `frontend/src/components/CounselorDashboard.tsx`
- `frontend/src/app/(dashboard)/tasks/page.tsx`
- (Backend intake.py unchanged - already has proper saving)

**Documentation** (2):
- `DATA_FLOW_COMPLETE.md` - Comprehensive integration guide
- `DATA_FLOW_IMPLEMENTATION_SUMMARY.md` - This summary

## What's Working Now

✓ **Data Saving**:
- All intake form data saved to MongoDB
- Each field stored in appropriate collection
- Counseling IDs generated and stored
- Assessments score calculated and saved

✓ **Data Retrieval**:
- Dashboard fetches real data from API
- Role-based filtering works
- Risk levels calculated on backend
- Emergency cases flagged

✓ **Display**:
- StudentDashboard shows real appointments
- CounselorDashboard shows real cases
- Tasks page shows real intakes
- All components have loading/error states
- Menu badges show actual counts

✓ **Consistency**:
- Dates formatted consistently
- Risk levels color-coded consistently
- All components use same API functions
- No hardcoded data remains

## Known Limitations & Future Work

**Current**:
- Appointment scheduling is on backend only
- Real-time updates require page refresh
- No notification system yet

**Future Enhancements**:
- WebSocket for real-time updates
- Appointment calendar view
- Email notifications
- Export assessment data
- Data analytics dashboard

## Deployment Ready

To deploy:
1. Set `NEXT_PUBLIC_API_BASE` to production API URL
2. Set MongoDB URI to production database
3. Set `JWT_SECRET_KEY` for security
4. Run database index initialization
5. Enable CORS for production domain

## Summary

✅ **Complete data flow implemented**:
- Form submission → Database save → API retrieval → Real dashboard display
- All hardcoded data replaced with API calls
- Proper error handling throughout
- Performance optimized with indexes
- Fully functional end-to-end system

**Result**: Students and counselors now see real data from the database in their dashboards and task lists!
