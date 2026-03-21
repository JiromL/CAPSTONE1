from pymongo import MongoClient
client = MongoClient('mongodb://localhost:27017/')
db = client.cps_system_dev
users = list(db.users.find({}, {'email': 1, 'role': 1, '_id': 0}))
roles = {}
for user in users:
    role = user.get('role', 'UNKNOWN')
    if role not in roles:
        roles[role] = []
    roles[role].append(user.get('email'))

print("Users by role:")
for role, emails in sorted(roles.items()):
    print("{}: {}".format(role, emails[0]))
