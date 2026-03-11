#!/usr/bin/env python3
from pymongo import MongoClient
from werkzeug.security import generate_password_hash
from bson import ObjectId
from datetime import datetime

client = MongoClient('mongodb://localhost:27017')
db = client['cps_system_dev']

# Office Assistant credentials
office_assistant = {
    'first_name': 'Office',
    'last_name': 'Assistant',
    'email': 'office.assistant@counseling.edu',
    'username': 'office_assistant',
    'password': 'officestaff123',
    'role': 'STAFF',
    'status': 'active',
    'created_at': datetime.utcnow(),
    'updated_at': datetime.utcnow()
}

# Check if office assistant already exists
existing = db.users.find_one({'email': office_assistant['email']})
if existing:
    print(f"Office assistant already exists with ID: {existing['_id']}")
    print(f"Email: {existing.get('email')}")
    print(f"Username: {existing.get('username')}")
else:
    # Create new office assistant
    office_assistant['password_hash'] = generate_password_hash(office_assistant['password'])
    result = db.users.insert_one(office_assistant)
    print(f"✓ Office Assistant created successfully!")
    print(f"ID: {result.inserted_id}")
    print(f"Email: office.assistant@counseling.edu")
    print(f"Username: office_assistant")
    print(f"Password: officestaff123")
    print(f"Role: STAFF")

# List all STAFF users
print("\n" + "="*50)
print("All STAFF users in database:")
print("="*50)
staff_users = list(db.users.find({'role': 'STAFF'}, {'_id': 1, 'first_name': 1, 'last_name': 1, 'email': 1, 'username': 1, 'role': 1}))
for user in staff_users:
    print(f"  {user.get('first_name', '')} {user.get('last_name', '')} ({user.get('email', 'N/A')})")
    print(f"    Username: {user.get('username', 'N/A')}")
    print(f"    Role: {user.get('role')}")
    print()

# Summary of all roles
print("="*50)
print("User Summary by Role:")
print("="*50)
for role in ['ADMIN', 'DPO', 'INTAKE_COUNSELOR', 'PSYCHOLOGIST', 'COUNSELOR', 'STAFF', 'STUDENT']:
    count = db.users.count_documents({'role': role})
    print(f"  {role}: {count} users")
