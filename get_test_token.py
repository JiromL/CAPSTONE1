#!/usr/bin/env python3
"""
Generate a valid JWT token for testing
Usage: python3 get_test_token.py
"""

import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from pymongo import MongoClient
from flask_jwt_extended import create_access_token
from bson import ObjectId
import json

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['cps_system_dev']

# Find a test user
user = db.users.find_one({'email': 'test@example.com'})

if not user:
    print("❌ No test user found with email 'test@example.com'")
    print("Run 'python3 debug_seed.py' first to create test users")
    sys.exit(1)

# Initialize Flask to get JWT config
from config import config as flask_config
from app import create_app

app = create_app('development')

with app.app_context():
    # Create token for the user
    access_token = create_access_token(identity=str(user['_id']))
    
    print("\n✅ Generated JWT Token:")
    print(f"\nToken: {access_token}\n")
    print(f"User: {user.get('email', 'N/A')}")
    print(f"Name: {user.get('name', 'N/A')}")
    print(f"Role: {user.get('role', 'N/A')}")
    print(f"User ID: {user['_id']}\n")
    
    # Output as JSON for easy copying
    print("📋 Copy this to localStorage (in browser console):")
    print(f"""
localStorage.setItem('token', '{access_token}');
localStorage.setItem('user', {json.dumps({
    'id': str(user['_id']),
    'email': user.get('email'),
    'name': user.get('name'),
    'role': user.get('role')
})});
location.reload();
    """)
