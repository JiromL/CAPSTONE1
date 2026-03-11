#!/usr/bin/env python3
import os
from datetime import datetime
from pymongo import MongoClient
from werkzeug.security import generate_password_hash

uri = 'mongodb://localhost:27017'
db_name = 'cps_system'

client = MongoClient(uri)
db = client[db_name]

print(f"Connecting to {uri}/{db_name}")
print(f"Database exists: {db_name in client.list_database_names()}")

# Clear and insert one user
db.users.delete_many({})
print(f"Cleared users: {db.users.count_documents({})} users remaining")

test_user = {
    'email': 'test@university.edu',
    'password_hash': generate_password_hash('test123'),
    'first_name': 'Test',
    'last_name': 'User',
    'role': 'STUDENT',
    'is_active': True,
    'created_at': datetime.utcnow(),
    'updated_at': datetime.utcnow(),
}

result = db.users.insert_one(test_user)
print(f"Inserted user: {result.inserted_id}")
print(f"Users now: {db.users.count_documents({})}")

# Try to find it
found = db.users.find_one({'email': 'test@university.edu'})
print(f"Found user: {found['email'] if found else 'NOT FOUND'}")
