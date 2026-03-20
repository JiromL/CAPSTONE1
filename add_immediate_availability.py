#!/usr/bin/env python3
"""
Add today and tomorrow availability for intake counselors
"""
import os
from datetime import datetime, timedelta
from pymongo import MongoClient

# MongoDB connection
uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
db_name = os.getenv('MONGODB_DB_NAME', os.getenv('MONGODB_DB', 'cps_system_dev'))
client = MongoClient(uri)
db = client[db_name]

def add_immediate_availability():
    """Add availability for all weekdays from today through next month"""
    
    # Get all intake counselors
    counselors = list(db.users.find({'role': 'IC', 'is_active': True}))
    
    if not counselors:
        print("❌ No intake counselors found")
        return
    
    print(f"Found {len(counselors)} intake counselors\n")
    
    # Clear existing availability
    deleted = db.counselor_availability.delete_many({})
    print(f"Cleared {deleted.deleted_count} existing availability slots\n")
    
    # Start from a known date (March 20, 2026) and add 60 days of weekday slots
    start_date = datetime(2026, 3, 20, 0, 0, 0)
    
    total_slots = 0
    
    # Create full-day (9 AM - 5 PM) availability for next 60 days on weekdays
    for day_offset in range(0, 60):
        current_date = start_date + timedelta(days=day_offset)
        
        # Skip weekends (Saturday=5, Sunday=6)
        if current_date.weekday() >= 5:
            continue
        
        for counselor in counselors:
            # Create 9 AM - 5 PM slot (full business day)
            start = current_date.replace(hour=9, minute=0)
            end = current_date.replace(hour=17, minute=0)
            
            slot = {
                'counselor_id': counselor['_id'],
                'slot_start': start,
                'slot_end': end,
                'is_available': True,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
            }
            
            db.counselor_availability.insert_one(slot)
            total_slots += 1
    
    print(f"✅ Added {total_slots} availability slots\n")
    
    print("📅 Availability Summary:")
    print("=" * 60)
    print(f"Start date: March 20, 2026")
    print(f"Duration: 60 days (weekdays only)")
    print(f"Daily hours: 9 AM - 5 PM")
    print(f"Counselors: {len(counselors)}")
    print()
    
    for counselor in counselors:
        name = f"{counselor['first_name']} {counselor['last_name']}"
        print(f"• {name}")
    
    print("\n✨ Ready for testing!")
    print("\nTry these dates:")
    print("  • 2026-03-20 (Friday)")
    print("  • 2026-03-21 (Saturday - no availability)")
    print("  • 2026-03-23 (Monday) ")  
    print("  • 2026-03-24 (Tuesday)")

if __name__ == '__main__':
    add_immediate_availability()

if __name__ == '__main__':
    add_immediate_availability()
