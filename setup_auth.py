#!/usr/bin/env python3
from pymongo import MongoClient
from werkzeug.security import generate_password_hash

client = MongoClient('mongodb://localhost:27017')
db = client['cps_system_dev']

# Update test users with emails and hashed passwords
credentials = [
    {'role': 'ADMIN', 'email': 'admin@counseling.edu', 'password': 'admin123'},
    {'role': 'COUNSELOR', 'email': 'counselor@counseling.edu', 'password': 'counsel123'},
    {'role': 'PSYCHOLOGIST', 'email': 'psych@counseling.edu', 'password': 'psych123'}
]

for cred in credentials:
    user = db.users.find_one({'role': cred['role']})
    if user:
        db.users.update_one(
            {'_id': user['_id']},
            {'$set': {
                'email': cred['email'],
                'password_hash': generate_password_hash(cred['password']),
                'username': cred['email'].split('@')[0]
            }}
        )
        print(f"Updated {cred['role']}:")
        print(f"  Email: {cred['email']}")
        print(f"  Password: {cred['password']}")
        print()
