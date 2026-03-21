#!/usr/bin/env python3
from pymongo import MongoClient
from werkzeug.security import check_password_hash, generate_password_hash

client = MongoClient('mongodb://localhost:27017/')
db = client.counseling_system

emails = ['student@dlsu.edu.ph', 'counselor@dlsu.edu.ph', 'admin@dlsu.edu.ph']
users = db.users.find({'email': {'$in': emails}})

print("=== CHECKING PASSWORD HASHES ===\n")
for user in users:
    print(f"Email: {user['email']}")
    print(f"  password_hash exists: {'password_hash' in user}")
    pwd_hash = user.get('password_hash')
    print(f"  password_hash value: {pwd_hash}")
    
    if pwd_hash:
        try:
            check_result = check_password_hash(pwd_hash, 'password')
            print(f"  ✓ check_password_hash('password') = {check_result}")
        except Exception as e:
            print(f"  ✗ Error: {e}")
    else:
        print(f"  ⚠ password_hash is None or missing!")
    print()

print("\n=== FIXING PASSWORDS IF NEEDED ===\n")
for user in db.users.find({'email': {'$in': emails}}):
    if not user.get('password_hash'):
        new_hash = generate_password_hash('password', method='scrypt')
        db.users.update_one({'_id': user['_id']}, {'$set': {'password_hash': new_hash}})
        print(f"✓ Fixed {user['email']} - set new password_hash")
    else:
        print(f"✓ {user['email']} already has password_hash")

print("\n=== VERIFICATION ===\n")
for user in db.users.find({'email': {'$in': emails}}):
    pwd_hash = user.get('password_hash')
    if pwd_hash:
        check_result = check_password_hash(pwd_hash, 'password')
        print(f"{user['email']}: {'✓ PASS' if check_result else '✗ FAIL'}")
    else:
        print(f"{user['email']}: ✗ NO HASH")
