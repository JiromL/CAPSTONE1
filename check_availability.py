#!/usr/bin/env python3
from pymongo import MongoClient
from datetime import datetime
import os

uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
db_name = os.getenv('MONGODB_DB_NAME', os.getenv('MONGODB_DB', 'cps_system_dev'))
client = MongoClient(uri)
db = client[db_name]

# Check what availability dates we have
slots = list(db.counselor_availability.find({}).limit(10).sort('slot_start', 1))

print("📅 Available Slots in Database:")
print("=" * 70)
for slot in slots:
    start = slot['slot_start']
    end = slot['slot_end']
    print(f"Start: {start} | End: {end}")

print("\n📊 Counts by date:")
pipeline = [
    {
        "$group": {
            "_id": {
                "$dateToString": {"format": "%Y-%m-%d", "date": "$slot_start"}
            },
            "count": {"$sum": 1}
        }
    },
    {"$sort": {"_id": 1}}
]

results = list(db.counselor_availability.aggregate(pipeline))
for result in results:
    print(f"  {result['_id']}: {result['count']} slots")
