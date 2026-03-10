from pymongo import MongoClient
from werkzeug.security import generate_password_hash

client = MongoClient('mongodb://localhost:27017')
db = client['cps_system_dev']
users = db['users']

# Check and update the student1 user
user = users.find_one({'email': 'student1@university.edu'})
if user:
    print("User found:", user.get('email'))
    
    # Update password to 'test123'
    hash_pass = generate_password_hash('test123')
    users.update_one(
        {'email': 'student1@university.edu'},
        {'$set': {'password_hash': hash_pass}}
    )
    print("✅ Password updated to 'test123'")
else:
    print("User not found, creating...")
    users.insert_one({
        'email': 'student1@university.edu',
        'password_hash': generate_password_hash('test123'),
        'name': 'Test Student',
        'is_verified': True,
        'is_active': True,
        'role': 'STUDENT'
    })
    print("✅ User created with password 'test123'")
