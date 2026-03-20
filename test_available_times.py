#!/usr/bin/env python3
"""Test the available times logic directly"""
from pymongo import MongoClient
from datetime import datetime, timedelta
import os

uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
db_name = os.getenv('MONGODB_DB_NAME', os.getenv('MONGODB_DB', 'cps_system_dev'))
client = MongoClient(uri)
db = client[db_name]

# Test with Monday, March 23, 2026
date_str = "2026-03-23"
date_obj = datetime.strptime(date_str, "%Y-%m-%d")

print(f"Testing date: {date_str} ({date_obj.strftime('%A')})\n")

# Get counselors
counselors = list(db.users.find({'role': 'IC', 'is_active': True}))
print(f"Found {len(counselors)} IC counselors\n")

if not counselors:
    print("No counselors found!")
    exit(1)

counselor_ids = [c["_id"] for c in counselors]

# Check availability for 9:00 AM
test_time = date_obj.replace(hour=9, minute=0, second=0, microsecond=0)
slot_end = test_time + timedelta(minutes=30)
day_start = date_obj.replace(hour=0, minute=0, second=0, microsecond=0)
day_end = date_obj.replace(hour=23, minute=59, second=59, microsecond=999999)

print(f"Checking availability for {test_time}\n")

available = []
for counselor_id in counselor_ids[:3]:  # Check first 3
    avail_check = db.counselor_availability.find_one({
        "counselor_id": counselor_id,
        "slot_start": {"$lte": test_time},
        "slot_end": {"$gte": slot_end},
        "is_available": True,
        "$expr": {
            "$and": [
                {"$gte": ["$slot_start", day_start]},
                {"$lte": ["$slot_start", day_end]}
            ]
        }
    })
    
    if avail_check:
        available.append(str(counselor_id))
        print(f"✅ Counselor {counselor_id} is available")
    else:
        print(f"❌ Counselor {counselor_id} is NOT available")

print(f"\nTotal available: {len(available)} out of {len(counselor_ids)}")

# Check raw availability counts
print("\n📊 Raw availability data for test date:")
slots = list(db.counselor_availability.find({
    "slot_start": {"$gte": day_start, "$lte": day_end}
}).limit(5))

for slot in slots:
    print(f"  Start: {slot['slot_start']} | End: {slot['slot_end']} | Counselor: {slot['counselor_id']}")
