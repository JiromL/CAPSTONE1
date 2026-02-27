#!/usr/bin/env python3
from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017')
db = client['cps_system_dev']

# Get first ADMIN user and set a username + password
admin = db.users.find_one({'role': 'ADMIN'})
if admin:
    db.users.update_one(
        {'_id': admin['_id']},
        {'$set': {'username': 'admin_user', 'password': 'admin123'}}
    )
    print(f"Updated ADMIN: admin_user")

# Get first CASE_MANAGER
cm = db.users.find_one({'role': 'CASE_MANAGER'})
if cm:
    db.users.update_one(
        {'_id': cm['_id']},
        {'$set': {'username': 'case_manager', 'password': 'cmpass123'}}
    )
    print(f"Updated CASE_MANAGER: case_manager")

# Get first PSYCHOLOGIST
psych = db.users.find_one({'role': 'PSYCHOLOGIST'})
if psych:
    db.users.update_one(
        {'_id': psych['_id']},
        {'$set': {'username': 'psychologist', 'password': 'psych123'}}
    )
    print(f"Updated PSYCHOLOGIST: psychologist")

# List updated users
updated = list(db.users.find({}, {'username': 1, 'role': 1}).limit(5))
print("\nUpdated users:")
for u in updated:
    if u.get('username'):
        print(f"  {u.get('username')} - {u.get('role')}")
