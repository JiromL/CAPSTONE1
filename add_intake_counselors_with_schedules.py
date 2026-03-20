#!/usr/bin/env python3
"""
Add Intake Counselor users with their schedules/availability
"""
import os
from datetime import datetime, timedelta
from pymongo import MongoClient
from werkzeug.security import generate_password_hash
from bson.objectid import ObjectId

# MongoDB connection
uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
db_name = os.getenv('MONGODB_DB_NAME', os.getenv('MONGODB_DB', 'cps_system_dev'))
client = MongoClient(uri)
db = client[db_name]

# Intake Counselors with their schedules
intake_counselors = [
    {
        'email': 'intake1@university.edu',
        'password': 'intake1123',
        'first_name': 'Maria',
        'last_name': 'Garcia',
        'phone': '555-0050',
        'specializations': ['Triage', 'Initial Assessment'],
        # Monday-Friday 9 AM - 12 PM (Morning slot)
        'schedule': {
            'days': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            'start_time': '09:00',
            'end_time': '12:00',
        }
    },
    {
        'email': 'intake2@university.edu',
        'password': 'intake2123',
        'first_name': 'John',
        'last_name': 'Smith',
        'phone': '555-0051',
        'specializations': ['Triage', 'Risk Assessment'],
        # Monday-Friday 12 PM - 3 PM (Afternoon slot)
        'schedule': {
            'days': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            'start_time': '12:00',
            'end_time': '15:00',
        }
    },
    {
        'email': 'intake3@university.edu',
        'password': 'intake3123',
        'first_name': 'Anna',
        'last_name': 'Rodriguez',
        'phone': '555-0052',
        'specializations': ['Intake Interview', 'Documentation'],
        # Monday, Wednesday, Friday 9 AM - 5 PM (Full day)
        'schedule': {
            'days': ['Monday', 'Wednesday', 'Friday'],
            'start_time': '09:00',
            'end_time': '17:00',
        }
    },
    {
        'email': 'intake4@university.edu',
        'password': 'intake4123',
        'first_name': 'Michael',
        'last_name': 'Chen',
        'phone': '555-0053',
        'specializations': ['Online Triage', 'Virtual Assessment'],
        # Tuesday, Thursday 2 PM - 5 PM (Evening slot)
        'schedule': {
            'days': ['Tuesday', 'Thursday'],
            'start_time': '14:00',
            'end_time': '17:00',
        }
    },
    {
        'email': 'intake5@university.edu',
        'password': 'intake5123',
        'first_name': 'Sarah',
        'last_name': 'Johnson',
        'phone': '555-0054',
        'specializations': ['Triage', 'Client Screening'],
        # Monday-Friday 10 AM - 1 PM (Morning/mid-day)
        'schedule': {
            'days': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            'start_time': '10:00',
            'end_time': '13:00',
        }
    },
]

# Days of week
DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
DAY_TO_NUM = {day: i for i, day in enumerate(DAYS_OF_WEEK)}


def time_to_hours_mins(time_str):
    """Convert HH:MM to tuple (hours, minutes)"""
    parts = time_str.split(':')
    return int(parts[0]), int(parts[1])


def get_next_occurrence(day_name, hours, minutes):
    """Get the next occurrence of a specific day and time"""
    today = datetime.now().replace(hour=hours, minute=minutes, second=0, microsecond=0)
    day_num = DAY_TO_NUM[day_name]
    today_num = today.weekday()  # Monday=0, Sunday=6
    
    # Calculate days to add
    days_ahead = day_num - today_num
    if days_ahead <= 0:  # Target day already happened this week
        days_ahead += 7
    
    return today + timedelta(days=days_ahead)


def add_intake_counselor_with_schedule(counselor_data):
    """Add an intake counselor and set their availability"""
    users = db.users
    availability = db.counselor_availability
    
    # Check if user exists
    existing = users.find_one({'email': counselor_data['email']})
    
    if existing:
        user_id = existing['_id']
        print(f"✓ Found existing user: {counselor_data['email']}")
    else:
        # Create new user
        user_doc = {
            'email': counselor_data['email'],
            'password_hash': generate_password_hash(counselor_data['password']),
            'first_name': counselor_data['first_name'],
            'last_name': counselor_data['last_name'],
            'role': 'IC',  # Intake Counselor
            'phone': counselor_data.get('phone', ''),
            'department': 'Counseling',
            'specializations': counselor_data.get('specializations', []),
            'is_active': True,
            'is_verified': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        }
        
        result = users.insert_one(user_doc)
        user_id = result.inserted_id
        print(f"✓ Created user: {counselor_data['email']}")
    
    # Delete existing availability for this user
    existing_slots = availability.delete_many({'counselor_id': user_id})
    if existing_slots.deleted_count > 0:
        print(f"  - Removed {existing_slots.deleted_count} existing availability slots")
    
    # Add availability slots for next 4 weeks
    schedule = counselor_data['schedule']
    start_hours, start_mins = time_to_hours_mins(schedule['start_time'])
    end_hours, end_mins = time_to_hours_mins(schedule['end_time'])
    
    slots_created = 0
    for week in range(4):
        for day_name in schedule['days']:
            start_dt = get_next_occurrence(day_name, start_hours, start_mins)
            end_dt = start_dt.replace(hour=end_hours, minute=end_mins)
            
            # Move to next week if needed
            start_dt += timedelta(weeks=week)
            end_dt += timedelta(weeks=week)
            
            slot_doc = {
                'counselor_id': user_id,
                'slot_start': start_dt,
                'slot_end': end_dt,
                'is_available': True,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
            }
            
            availability.insert_one(slot_doc)
            slots_created += 1
    
    print(f"  - Added {slots_created} availability slots (4 weeks)")
    print()
    
    return user_id


def main():
    print("=" * 70)
    print("Adding Intake Counselors with Schedules")
    print("=" * 70)
    print()
    
    created_users = []
    
    for counselor in intake_counselors:
        user_id = add_intake_counselor_with_schedule(counselor)
        created_users.append({
            'email': counselor['email'],
            'name': f"{counselor['first_name']} {counselor['last_name']}",
            'user_id': str(user_id),
            'schedule': counselor['schedule']
        })
    
    print("=" * 70)
    print("✅ Intake Counselors Successfully Added")
    print("=" * 70)
    print()
    
    # Display summary
    for user in created_users:
        print(f"📌 {user['name']}")
        print(f"   Email: {user['email']}")
        print(f"   Schedule: {', '.join(user['schedule']['days'])}")
        print(f"   Time: {user['schedule']['start_time']} - {user['schedule']['end_time']}")
        print()
    
    print("=" * 70)
    print("Test Credentials (All password format: email's first part + 123)")
    print("=" * 70)
    for counselor in intake_counselors:
        print(f"Email: {counselor['email']}")
        print(f"Password: {counselor['password']}")
        print()


if __name__ == '__main__':
    main()
