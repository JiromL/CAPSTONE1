# MongoDB Setup for CPS System

## Quick Start (5 minutes)

### Step 1: Install MongoDB
Download and run: https://www.mongodb.com/try/download/community

### Step 2: Install Dependencies
```powershell
cd backend
pip install -r requirements.txt
```

### Step 3: Configure Environment
Create `.env` in the `backend/` folder:
```
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=cps_system_dev
JWT_SECRET_KEY=your-secret-key
SECRET_KEY=your-secret-key
```

### Step 4: Run the Application
```powershell
# Terminal 1
cd backend
py app.py

# Terminal 2
cd frontend
npm run dev
```

Visit: http://localhost:3001

**Login:**
- Email: `admin@cps.edu`
- Password: `demo123`

---

## What Changed?

✅ **SQLAlchemy ORM** → **PyMongo (MongoDB client)**
✅ **SQLite/PostgreSQL** → **MongoDB**
✅ **SQL tables** → **MongoDB collections**
✅ **Auto-increment IDs** → **MongoDB ObjectId**
✅ **Foreign keys** → **ObjectId references**

---

## MongoDB Collections

| Collection | Purpose |
|------------|---------|
| users | User accounts (admin, counselors, students) |
| cases | Student counseling cases |
| assessments | PHQ-9, GAD-7, PSS triage screenings |
| intakes | Structured intake interview forms |
| appointments | Appointment scheduling |
| documents | Case documentation hub |
| session_notes | Counseling session notes |
| risk_checkins | Daily high-risk monitoring |
| crisis_escalations | Crisis escalation records |
| referrals | Internal/external referrals |
| audit_logs | Complete audit trail |
| permission_overrides | Temporary permission grants |

---

## Features

✅ 9 User Roles with complete RBAC
✅ 14 Permission Types
✅ 40+ REST API Endpoints
✅ Full Audit Logging
✅ 8 Complete Epics
✅ MongoDB Indexes for Performance
✅ JWT Authentication
✅ Crisis Escalation System
✅ Document Versioning
✅ High-Risk Monitoring

---

## Blueprints Status

- ✅ models.py - MongoDB implementation complete
- ✅ config.py - MongoDB configuration ready
- ✅ utils.py - MongoDB helper functions
- ✅ app.py - Flask + MongoDB initialized
- 🟡 blueprints/ - Updating to use MongoDB (8 files)
  - auth.py - Next
  - assessments.py
  - intake.py
  - appointments.py
  - documentation.py
  - counseling.py
  - high_risk.py
  - referrals.py

---

## Need Help?

See `MONGODB_MIGRATION.md` for detailed guide on:
- MongoDB queries and patterns
- Blueprint migration examples
- Common troubleshooting issues
- Testing and verification

---

**Ready to go!** The system is configured for MongoDB.
All 8 epics are ready to be updated for the new database layer.
