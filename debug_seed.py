#!/usr/bin/env python3
"""Debug seed script to understand why users aren't being inserted"""
import os
from datetime import datetime
from pymongo import MongoClient
from werkzeug.security import generate_password_hash
from bson.objectid import ObjectId

def debug_seed():
    uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
    db_name = os.getenv('MONGODB_DB_NAME', os.getenv('MONGODB_DB', 'cps_system_dev'))
    
    print(f"URI: {uri}")
    print(f"DB Name: {db_name}")
    
    client = MongoClient(uri)
    db = client[db_name]
    
    print(f"Connected to Database: {db_name}")
    print(f"Database exists in list: {db_name in client.list_database_names()}")
    
    # Try to clear
    result = db.users.delete_many({})
    print(f"Deleted: {result.deleted_count} users")
    
    # Try to insert
    test_user = {
        'email': 'test@example.com',
        'password_hash': generate_password_hash('test123'),
        'first_name': 'Test',
        'last_name': 'User',
        'role': 'STUDENT',
        'is_active': True,
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow(),
    }
    
    insert_result = db.users.insert_one(test_user)
    print(f"Inserted user ID: {insert_result.inserted_id}")
    
    # Verify it was inserted
    count = db.users.count_documents({})
    print(f"Users count in DB: {count}")
    
    found = db.users.find_one({'email': 'test@example.com'})
    print(f"Found user: {found['email'] if found else 'NOT FOUND'}")

if __name__ == '__main__':
    debug_seed()
