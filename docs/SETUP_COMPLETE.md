# Complete Setup Guide for CPS System (All 8 Epics)

## Prerequisites

- Python 3.9+
- Node.js 18+
- SQLite3 (included with Python)
- Git

## Quick Start (5 minutes)

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start Flask server
python app.py
# Server runs on http://localhost:5000 (configurable via PORT env var)
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start Next.js development server
npm run dev
# Frontend runs on http://localhost:3000
```

### 3. Access the System

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000/api/health
- **Demo Credentials**: admin@cps.edu / demo123

---

## Detailed Backend Setup

### Step 1: Environment Setup

```bash
cd backend

# Create Python virtual environment
python -m venv venv

# Activate virtual environment
# On Linux/Mac:
source venv/bin/activate

# On Windows:
venv\Scripts\activate

# Verify activation (you should see (venv) in your prompt)
```

### Step 2: Install Dependencies

```bash
# Install from requirements.txt
pip install -r requirements.txt

# Verify installation
pip list | grep -E "flask|sqlalchemy|jwt"
```

### Step 3: Database Initialization

The database will auto-create on first run with `app.py`, but you can manually initialize:

```bash
python

# In Python shell:
from app import app, db
from models import User, UserRole
from werkzeug.security import generate_password_hash

with app.app_context():
    # Create all tables
    db.create_all()
    
    # Create admin user
    admin = User(
        email='admin@cps.edu',
        password_hash=generate_password_hash('demo123'),
        first_name='Admin',
        last_name='User',
        role=UserRole.ADMIN
    )
    db.session.add(admin)
    db.session.commit()
    print("Database initialized with admin user!")

exit()
```

### Step 4: Run Development Server

```bash
# Option A: Direct Python
python app.py

# Option B: Flask CLI (more features)
export FLASK_APP=app.py
export FLASK_ENV=development
flask run

# Server will start on port 5000
```

### Step 5: Verify Backend

```bash
# In another terminal, test the health endpoint
curl http://localhost:5000/api/health

# Expected response:
{
  "status": "Backend is running",
  "version": "1.0.0",
  "epics": [...]
}
```

---

## Detailed Frontend Setup

### Step 1: Node.js Verification

```bash
node --version  # Should be 18+
npm --version   # Should be 9+
```

### Step 2: Install Dependencies

```bash
cd frontend

# Install npm packages
npm install

# This creates node_modules/ and updates package-lock.json
```

### Step 3: Environment Configuration

Create `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:5000  # update if you run backend on a different port, e.g. 5001
```

### Step 4: Build Assets

```bash
# Development mode (with hot reload)
npm run dev

# Production mode (for testing)
npm run build
npm run start
```

### Step 5: Verify Frontend

Open http://localhost:3000 in your browser. You should see:
- Redirect to login if not authenticated
- Demo credentials: admin@cps.edu / demo123
- Dashboard with 8 Epic cards after login

---

## Testing the System

### Manual API Testing with cURL

```bash
# 1. Login to get JWT token
TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cps.edu","password":"demo123"}' \
  | jq -r '.access_token')

echo $TOKEN

# 2. Use token to access protected endpoints
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/auth/me

# 3. Create a test case
curl -X POST http://localhost:5000/api/cases \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"student_id":1,"status":"open"}'
```

### Manual Testing via Frontend

1. **Login**: http://localhost:3000/login
2. **Dashboard**: http://localhost:3000/dashboard
3. **Assessments** (EPIC 2): http://localhost:3000/assessments
4. **High-Risk** (EPIC 7): http://localhost:3000/high-risk
5. [Additional epic pages...]

### Automated Testing

```bash
# Backend tests
cd backend
pytest tests/

# Frontend tests
cd frontend
npm test
```

---

## Database Schema

### Create Users

```python
from models import User, UserRole
from werkzeug.security import generate_password_hash

# Create different role users
users = [
    User(email='psych@cps.edu', first_name='Dr.', last_name='Smith', role=UserRole.PSYCHOLOGIST),
    User(email='csc@cps.edu', first_name='Coordinator', last_name='Lee', role=UserRole.CSC),
    User(email='counselor@cps.edu', first_name='Jane', last_name='Doe', role=UserRole.CSP),
    User(email='student@cps.edu', first_name='John', last_name='Student', role=UserRole.STUDENT),
]

for user in users:
    user.password_hash = generate_password_hash('password123')
    db.session.add(user)

db.session.commit()
```

### Create Test Case

```python
from models import Case, CaseDocument, Assessment
from datetime import datetime

# Create case
case = Case(
    case_number='CPS-2026-001',
    student_id=1,  # Must reference existing user
    status='open',
    created_by_id=1,  # Admin user
)
db.session.add(case)
db.session.commit()

# Add assessment
assessment = Assessment(
    case_id=case.id,
    assessment_type='phq9',
    questions={...},
    auto_scored=True
)
db.session.add(assessment)
db.session.commit()
```

---

## Troubleshooting

### Backend Issues

**Port 5000 already in use:**

*(You can start the backend on a different port with `PORT=5001 python app.py` or similar. In development set `NEXT_PUBLIC_API_BASE` accordingly.)*
```bash
# Find process using port
lsof -i :5000  # Mac/Linux
netstat -ano | findstr :5000  # Windows

# Kill process or use different port
export FLASK_PORT=5001
python app.py
```

**Module not found errors:**
```bash
# Ensure venv is activated
source venv/bin/activate

# Reinstall dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

**Database errors:**
```bash
# Reset database
rm backend/cps.db

# Reinitialize
python app.py
```

### Frontend Issues

**Port 3000 already in use:**
```bash
# Kill process or use different port
npm run dev -- -p 3001
```

**CORS errors (Frontend can't reach Backend):**
```bash
# Verify CORS is enabled in backend/app.py:
# CORS(app, resources={r"/api/*": {"origins": ["http://localhost:3000"]}})

# Ensure backend is running on port 5000 (or another port you chose)
```

**Blank page after login:**
```bash
# Check browser console for errors (F12)
# Verify token is stored in localStorage
# Check .env.local has correct API_URL
```

---

## EPIC-by-EPIC Setup

### EPIC 1: RBAC (User Roles & Access Control)
- Run: `python app.py`
- Test: POST /api/auth/login, GET /api/auth/me
- Demo: Login with admin account, view roles

### EPIC 2: Triage & Early Detection
- Test: POST /api/assessments/{case_id}/triage
- Demo: Create assessment, see auto-scoring
- Templates: GET /api/assessments/phq9/template

### EPIC 3: Intake Interview
- Test: POST /api/intake/start/{case_id}
- Demo: Fill intake form, auto-generate summary
- Verify: GET /api/intake/{id}/summary

### EPIC 4: Booking & Scheduling
- Setup: Add counselor availability slots
- Test: POST /api/appointments/request
- Demo: Book appointment, match counselor

### EPIC 5: Documentation Hub
- Test: POST /api/documentation/case/{id}/documents
- Demo: Upload file, view version history
- Search: GET /api/documentation/case/{id}/search

### EPIC 6: Counseling Module
- Test: POST /api/counseling/case/{id}/session-note
- Demo: Create session note, track progress
- Dashboard: GET /api/counseling/high-risk-dashboard

### EPIC 7: High-Risk Monitoring
- Test: POST /api/high-risk/case/{id}/checkin
- Demo: Daily check-in, safety plan upload
- Dashboard: GET /api/high-risk/monitoring-dashboard

### EPIC 8: Referral & Warm Handoff
- Test: POST /api/referrals/initiate
- Demo: Create referral, upload ROI
- Tracking: GET /api/referrals/pending-warm-handoffs

---

## Performance Optimization

### Frontend

```bash
# Build optimized production bundle
npm run build

# Analyze bundle size
npm run build -- --analyze
```

### Backend

```bash
# Use Gunicorn for production
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### Database

```bash
# Create indexes for common queries
from sqlalchemy import create_engine

# Query optimization
# Use lazy loading where appropriate
# Paginate large result sets (50 items default)
```

---

## Advanced Configuration

### JWT Configuration

Edit `backend/config.py`:

```python
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secure-key')
JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)  # Token validity
JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
```

### Database URL

```bash
# Development (SQLite)
DATABASE_URL=sqlite:///cps.db

# Production (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost/cps_prod
```

### CORS Configuration

```python
# In app.py - modify allowed origins
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:3000",
            "https://yourdomain.com"
        ]
    }
})
```

---

## Monitoring & Logging

### Enable Debug Logging

```bash
export FLASK_ENV=development
export FLASK_DEBUG=1
python app.py
```

### View Audit Logs

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/auth/audit-logs?action=create&entity_type=case"
```

### Database Query Logging

```python
# In app.py, add:
app.config['SQLALCHEMY_ECHO'] = True  # Log all SQL queries
```

---

## Docker Setup (Optional)

### Dockerfile (Backend)

```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
```

### Dockerfile (Frontend)

```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package*.json ./
RUN npm install --production
CMD ["npm", "run", "start"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      DATABASE_URL: sqlite:///cps.db
  
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

---

## Next Steps

1. **Review [EPICS.md](./EPICS.md)** - Detailed feature documentation
2. **Review [ARCHITECTURE.md](./ARCHITECTURE.md)** - System design
3. **Review [API.md](./API.md)** - Complete endpoint reference
4. **Configure email/SMS** - For appointment reminders (optional)
5. **Set up monitoring** - Sentry, DataDog, or similar
6. **Deploy to production** - Vercel (frontend), Heroku/AWS (backend)

---

**Setup Guide Version:** 1.0.0  
**Last Updated:** February 2026  
**For support:** See README.md
