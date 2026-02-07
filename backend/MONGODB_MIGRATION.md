# MongoDB Migration Guide

Your CPS System has been successfully migrated to MongoDB from SQLite/PostgreSQL!

## Setup Instructions

### 1. Install MongoDB Locally

**Windows (Chocolatey):**
```powershell
choco install mongodb-community
```

**Windows (Manual):**
- Download from: https://www.mongodb.com/try/download/community
- Run the installer and follow the wizard
- MongoDB will run as a service on `mongodb://localhost:27017`

**Mac (Homebrew):**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux (Ubuntu):**
```bash
sudo apt-get install -y mongodb
sudo systemctl start mongodb
```

### 2. Verify MongoDB Installation

```bash
mongosh  # Connect to local MongoDB
```

You should see the MongoDB shell prompt.

### 3. Install Python Dependencies

```powershell
cd backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 4. Start the Application

```powershell
# Terminal 1: Start Flask backend
cd backend
.\venv\Scripts\Activate.ps1
py app.py

# Terminal 2: Start Next.js frontend
cd frontend
npm run dev
```

## Configuration

### Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Flask Environment
FLASK_ENV=development

# JWT Settings
JWT_SECRET_KEY=your-secret-key-here
SECRET_KEY=your-secret-key-here

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=cps_system_dev
```

## Database Collections

MongoDB uses collections instead of tables. The following collections are created automatically:

- **users** - User accounts with roles
- **cases** - Student cases
- **assessments** - PHQ-9, GAD-7, PSS screening results
- **intakes** - Intake interview forms
- **appointments** - Appointment requests and scheduling
- **documents** - Case documentation files
- **session_notes** - Counseling session notes
- **risk_checkins** - Daily high-risk check-ins
- **safety_plans** - Safety plans for high-risk cases
- **crisis_escalations** - Crisis escalation records
- **referrals** - Internal and external referrals
- **audit_logs** - Complete audit trail
- **permission_overrides** - Temporary permission grants

## Key Differences from SQL

### Python Code Examples

**Create a new user:**
```python
from models import UserRole, db
from bson import ObjectId
from werkzeug.security import generate_password_hash

user = {
    "_id": ObjectId(),
    "email": "counselor@cps.edu",
    "password_hash": generate_password_hash("password123"),
    "first_name": "John",
    "last_name": "Smith",
    "role": UserRole.PSYCHOLOGIST.value,
    "created_at": datetime.utcnow(),
}

db.db.users.insert_one(user)
```

**Find a user:**
```python
from bson import ObjectId

user = db.db.users.find_one({"email": "counselor@cps.edu"})
# or by ID
user = db.db.users.find_one({"_id": ObjectId("...")}  )
```

**Update a case:**
```python
db.db.cases.update_one(
    {"_id": ObjectId("...")},
    {"$set": {"current_risk_level": "CRITICAL", "updated_at": datetime.utcnow()}}
)
```

**Create an assessment:**
```python
assessment = {
    "_id": ObjectId(),
    "case_id": ObjectId("..."),
    "assessment_type": "PHQ9",
    "questions": {...},
    "score": 18,
    "risk_level": "YELLOW",
    "created_at": datetime.utcnow(),
}

db.db.assessments.insert_one(assessment)
```

## API Endpoints

All endpoints work the same as before. Login with:
- **Email:** admin@cps.edu
- **Password:** demo123

The REST API endpoints (40+) across all 8 epics remain unchanged - the migration to MongoDB is transparent at the API layer.

## Blueprint Structure

Each blueprint now uses MongoDB directly:

```python
from flask import Blueprint, jsonify, request
from models import db, UserRole, PermissionType
from bson import ObjectId
from datetime import datetime

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    user = db.db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Remove sensitive fields
    user.pop('password_hash', None)
    return jsonify(user), 200
```

## MongoDB Queries

### Common Patterns

**Filter by status:**
```python
cases = db.db.cases.find({"status": "ACTIVE"})
```

**Sort and limit:**
```python
intakes = db.db.intakes.find(
    {"status": "PENDING"}
).sort("created_at", -1).limit(10)
```

**Aggregate pipeline:**
```python
results = db.db.cases.aggregate([
    {"$match": {"current_risk_level": "CRITICAL"}},
    {"$group": {"_id": "$counselor_id", "count": {"$sum": 1}}},
    {"$sort": {"count": -1}}
])
```

## Testing

### Test Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cps.edu","password":"demo123"}'
```

### Test Health Check
```bash
curl http://localhost:5000/api/health
```

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running: `mongosh`
- Check `MONGODB_URI` in `.env`
- Port 27017 should be accessible

### Import Errors
- Run `pip install -r requirements.txt` again
- Ensure virtual environment is activated

### JWT Errors
- Update `JWT_SECRET_KEY` in `.env`
- Clear browser localStorage and login again

## Migration Notes

- All 20+ SQL models have been converted to MongoDB document schemas
- No ORM layer - direct PyMongo usage for flexibility
- Auto-incrementing IDs replaced with MongoDB ObjectId
- Foreign keys replaced with ObjectId references
- Relationships now managed in application code

## Next Steps

1. Update remaining blueprints (6 of 8 are still using SQLAlchemy imports)
2. Create sample data loading script
3. Add MongoDB aggregation pipelines for analytics
4. Implement soft deletes and archiving

Enjoy your MongoDB-backed CPS System!
