#!/usr/bin/env python3
from pymongo import MongoClient
from werkzeug.security import check_password_hash

# Connect to DB
client = MongoClient('mongodb://localhost:27017/')
db = client.counseling_system

# Replicate login function logic
email = "student@dlsu.edu.ph".lower().strip()
user = db.users.find_one({"email": email})

print(f"Email: {email}")
print(f"User found: {user is not None}")

if user:
    print(f"Password hash in user: {'password_hash' in user}")
    print(f"Password hash value: {user.get('password_hash')[:30] if user.get('password_hash') else 'None'}...")
    
    password_to_check = "password"
    pwd_check = check_password_hash(user['password_hash'], password_to_check) if 'password_hash' in user else False
    print(f"pwd_check result: {pwd_check}")
    
    if pwd_check:
        print(f"is_verified (default True): {user.get('is_verified', True)}")
        print(f"is_active (default True): {user.get('is_active', True)}")
        
        if not user.get('is_verified', True):
            print("RETURN: Email not verified")
        elif not user.get('is_active', True):
            print("RETURN: User account is inactive")
        else:
            print("SUCCESS: Should return token")
    else:
        print("RETURN: Invalid credentials (pwd_check failed)")
else:
    print("RETURN: Invalid credentials (user not found)")
