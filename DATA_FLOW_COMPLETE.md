# Complete Data Flow & Integration Guide

## System Architecture

Your system now has a complete data flow from Database → Backend → Frontend:

### 1. **Database Layer (MongoDB)**
- Location: `data/` directory (MongoDB WiredTiger storage)
- Collections:
  - `intakes` - Student intake submissions with assessments
  - `cases` - Student cases linked to counselors
  - `assessments` - Individual assessment scores
  - `users` - User profiles with roles
  - `appointments` - Scheduled meetings

### 2. **Backend Layer (Flask)**
- Location: `/backend/blueprints/intake.py`
- Key Endpoints:
  - `POST /api/intake/submit` - Student submits intake form
  - `GET /api/intake/assessments/dashboard` - Fetch role-specific dashboard data
  - `GET /api/intake/assessments/urgent` - Fetch urgent assessments
  - `GET /api/intake/assessments/stats` - System-wide statistics

### 3. **Frontend Layer (Next.js + React)**
- Location: `/frontend/src/`
- Updated Components:
  - `StudentDashboard.tsx` - Fetches real intake data
  - `CounselorDashboard.tsx` - Fetches counselor's assigned cases
  - `tasks/page.tsx` - Displays real tasks from backend
- API Helpers: `utils/dashboard-api.ts`

## Data Flow Diagram

```
Student Intake Form
        ↓
POST /api/intake/submit → Backend processes → MongoDB saves
        ↓
Database stores:
- Intake record with counseling_id
- Case record linking student to counselor
- Assessment records with PHQ-9/GAD-7 scores
        ↓
GET /api/intake/assessments/dashboard → Backend queries MongoDB
        ↓
Returns role-specific data:
- For Student: Their own intakes & appointments
- For Counselor: Assigned cases with scores
- For Admin: System-wide metrics
        ↓
Frontend displays in:
- Dashboard component
- Tasks page
- High-risk alerts
```

## Configuration Checklist

### ✓ Frontend Configuration

**API Base URL** (`frontend/src/utils/api.ts`):
```typescript
export function api(path: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:5001';
  return `${base}${path}`;
}
```
- Default: `http://127.0.0.1:5001`
- Override with: `NEXT_PUBLIC_API_BASE` environment variable

**Data Fetching** (all components use):
```typescript
import { fetchDashboardData, formatDate } from '@/utils/dashboard-api';

const data = await fetchDashboardData(token);
```

### ✓ Backend Configuration

**Flask Port** (`backend/app.py`):
```python
port = int(os.environ.get('PORT', 5000))
app.run(port=port, debug=False, threaded=True)
```
- Default: 5000 (can override with PORT env var)
- Frontend calls: 5001

**Intake Endpoints** are registered in `blueprints/intake.py`:
- Blueprint: `intake_bp = Blueprint('intake', __name__, url_prefix='/api/intake')`
- Automatically prefixed with `/api/intake`

**Database Storage** in `student_submit_intake()`:
```python
# Saves to:
- db.intakes.insert_one(intake_doc)
- db.cases.insert_one(case_doc)  # or updates existing
- db.assessments.insert_one(assessment_doc)
```

### ✓ MongoDB Configuration

**Collections** auto-created on first insert:
- `intakes` - Contains complete intake submissions
- `cases` - Links students to assigned counselors
- `assessments` - Individual assessment type scores
- `users` - User profiles
- `appointments` - Scheduled sessions

**Indexes** created by `/api/intake/assessments/init-indexes`:
```python
# Performance optimization indexes
db.db.intakes.create_index([("is_emergency", 1), ("status", 1), ("student_submitted_at", -1)])
db.db.intakes.create_index([("assigned_counselor_id", 1), ("status", 1)])
```

## Testing Data Flow

### 1. **Verify Backend is Running**

```bash
# Check if backend is running
curl http://127.0.0.1:5001/api/health

# Expected response:
{
  "status": "Backend is running",
  "mongodb_status": "connected",
  "epics": [...]
}
```

### 2. **Test Intake Submission**

```bash
curl -X POST http://127.0.0.1:5001/api/intake/submit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "purpose": "personal",
    "concerns": ["anxiety"],
    "is_emergency": false,
    "consent_given": true,
    "phq9_responses": [1,1,2,1,1,1,0,1,1],
    "preferred_platform": "in-person"
  }'

# Expected response:
{
  "message": "Intake submitted successfully",
  "counseling_id": "CPS-ABC12345",
  "case_id": "...",
  "scores": {"phq9": 9}
}
```

### 3. **Test Dashboard Endpoint**

```bash
curl http://127.0.0.1:5001/api/intake/assessments/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected response (varies by user role):
{
  "user_role": "STUDENT",
  "recent_cases": [...],
  "summary": {...},
  "alerts": [...]
}
```

### 4. **Verify Data in MongoDB**

```bash
# Connect to MongoDB
mongosh

# Check intakes collection
db.intakes.find({}).pretty()

# Check specific student's intakes
db.intakes.find({"responses.purpose": "personal"}).pretty()

# Get statistics
db.intakes.countDocuments({"is_emergency": true})
db.intakes.countDocuments({"status": "COMPLETED"})
```

## Frontend Components Updated

### ✓ StudentDashboard.tsx (155 lines)
- **Before**: Hardcoded appointment (March 15, 2026)
- **After**: Fetches student's own intakes from API
- **Data Source**: `GET /api/intake/assessments/dashboard`
- **Displays**: 
  - Counseling ID from database
  - Next appointment date from intake
  - Appointment status

### ✓ CounselorDashboard.tsx (180+ lines)
- **Before**: Hardcoded metrics (4 sessions, 2 notes, 1 alert)
- **After**: Fetches assigned cases from API
- **Data Source**: `GET /api/intake/assessments/dashboard` (role-filtered)
- **Displays**:
  - Assigned cases count (from database)
  - High-risk assessments (calculated from PHQ-9/GAD-7 scores)
  - Recent cases with risk levels

### ✓ Tasks Page (165 lines)
- **Before**: Mock task data
- **After**: Fetches real intakes from API
- **Data Source**: `GET /api/intake/assessments/dashboard`
- **Displays**:
  - Assessment type (from `responses.purpose`)
  - Risk level (calculated on backend)
  - Emergency status (from `is_emergency` flag)
  - Submitted date (from `student_submitted_at`)

### ✓ Dashboard API Helpers (`utils/dashboard-api.ts`)
- **NEW**: Central API functions for all components
- **Functions**:
  - `fetchDashboardData(token)` - Main dashboard query
  - `fetchUrgentAssessments(token)` - High-risk cases
  - `formatDate(dateString)` - Consistent date formatting
  - `getRiskLevelColor(level)` - Risk level styling

## Data Storage Verification

### What Gets Saved to Database

**When Student Submits Intake:**

```javascript
// Document structure in intakes collection:
{
  "_id": ObjectId(...),
  "case_id": ObjectId(...),        // Links to cases collection
  "counseling_id": "CPS-ABC12345", // Unique student ID
  "is_emergency": false,
  "is_anonymous": false,
  "status": "COMPLETED",
  "student_submitted_at": ISODate("2026-03-08T..."),
  "assigned_counselor_id": ObjectId(...),
  
  "responses": {
    "purpose": "personal",
    "concerns": ["anxiety"],
    "phq9_score": 9,
    "phq9_responses": [1,1,2,1,1,1,0,1,1],
    "gad7_score": 5,
    "appointment_date": "2026-03-12",
    "urgency_level": "normal",
    "estimated_appointment_days": "3-5 business days"
  }
}
```

**Assessment Storage:**

```javascript
// Document structure in assessments collection:
{
  "_id": ObjectId(...),
  "case_id": ObjectId(...),
  "assessment_type": "phq9",
  "phq9_score": 9,
  "responses": [1,1,2,1,1,1,0,1,1],
  "created_at": ISODate("2026-03-08T...")
}
```

## Troubleshooting

### Issue: Dashboard shows "No data"
**Solution**: 
1. Verify backend is running: `curl http://127.0.0.1:5001/api/health`
2. Check token is valid: `localStorage.getItem('token')`
3. Check browser console for errors: F12 → Console tab
4. Verify MongoDB is running: `mongosh`

### Issue: Appointments not showing
**Solution**:
1. Submit an intake form to create data
2. Check API response: `GET /api/intake/assessments/dashboard`
3. Verify `appointment_date` field exists in database

### Issue: "Bearer token missing"
**Solution**:
1. Login to get auth token
2. Token is saved in `localStorage['token']`
3. All API calls automatically include it via Dashboard API helpers

## Performance Optimization

**Database Indexes Created:**
```python
# These automatically improve query performance:
- is_emergency + status + student_submitted_at (emergency filtering)
- assigned_counselor_id + status (counselor's cases)
- assessment_type + created_at (assessment queries)
```

**Call Initialization:**
```bash
curl -X POST http://127.0.0.1:5001/api/intake/assessments/init-indexes \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

## Environment Variables

### Backend (.env)
```
FLASK_ENV=development
MONGO_URI=mongodb://localhost:27017/capstone
JWT_SECRET_KEY=your_secret_key
PORT=5001  # Optional, defaults to 5000
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_BASE=http://127.0.0.1:5001
```

## Quick Start Commands

### 1. Start MongoDB
```bash
mongod  # or use Docker: docker run -d -p 27017:27017 mongo
```

### 2. Start Backend
```bash
cd backend
PORT=5001 python app.py
```

### 3. Start Frontend
```bash
cd frontend
npm run dev  # Runs on http://localhost:3000
```

### 4. Test Data Flow
- Navigate to `http://localhost:3000`
- Login with test credentials
- Fill out intake form
- Dashboard should update automatically
- Check MongoDB: `mongosh → db.intakes.findOne()`

## Summary

✓ **Frontend Components** - Updated to fetch real data from API
✓ **Backend Endpoints** - Properly storing and retrieving data
✓ **Database** - MongoDB collections configured and indexed
✓ **API Helpers** - Centralized functions for all components
✓ **Tasks Page** - Displays real intakes from database
✓ **Dashboard** - Fetches role-specific data automatically

**Everything is now connected end-to-end with real data flow!**
