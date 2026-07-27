"""
Seed sample CPS announcements into MongoDB.
Run from repo root:  python scripts/seed_announcements.py
"""
import os
from datetime import datetime, timedelta
from pymongo import MongoClient
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(dotenv_path=Path(__file__).parent.parent / '.env')

MONGO_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
DB_NAME   = os.getenv('MONGODB_DB_NAME', 'cps_system_dev')

client = MongoClient(MONGO_URI)
db     = client[DB_NAME]

now = datetime.utcnow()

SAMPLES = [
    {
        'title':      'Walk-In Consultation Hours — No Appointment Needed',
        'body':       'Students may drop by the CPS office (Room 101, Henry Sy Sr. Hall) from Monday to Friday, 8:00 AM – 12:00 NN for a brief initial consultation with an available IC. No prior booking required.',
        'event_type': 'notice',
        'event_date': None,
        'link':       '',
        'pinned':     True,
        'is_active':  True,
        'created_at': now,
    },
    {
        'title':      'Wellness Wednesday: Stress Relief Art Session',
        'body':       'Take a break from the academic grind! Join us every Wednesday, 2:00–4:00 PM at the CPS Wellness Room for a free guided art journaling session. No art experience needed — just bring yourself.',
        'event_type': 'event',
        'event_date': now + timedelta(days=3),
        'link':       '',
        'pinned':     False,
        'is_active':  True,
        'created_at': now - timedelta(hours=5),
    },
    {
        'title':      'Online Booking Now Open for 2nd Semester',
        'body':       'Students can now schedule their intake appointments directly through the CPS portal. Click "Request a Session" on your dashboard to get started. Slots fill up fast — book early!',
        'event_type': 'notice',
        'event_date': None,
        'link':       '',
        'pinned':     False,
        'is_active':  True,
        'created_at': now - timedelta(days=1),
    },
    {
        'title':      'Talk Series: "You Are Not Alone" — Anxiety & College Life',
        'body':       'CPS psychologist Ms. Jenny Soriano will lead an open talk on managing anxiety in university. Open to all DLSU students. Attendance is free. Light refreshments will be served.',
        'event_type': 'event',
        'event_date': now + timedelta(days=10),
        'link':       '',
        'pinned':     False,
        'is_active':  True,
        'created_at': now - timedelta(days=2),
    },
    {
        'title':      'Reminder: CPS Services are Strictly Confidential',
        'body':       'All consultations and records at the Center for Psychological Services are protected under professional confidentiality. Your information will never be shared without your written consent, except in situations involving risk to life.',
        'event_type': 'info',
        'event_date': None,
        'link':       '',
        'pinned':     False,
        'is_active':  True,
        'created_at': now - timedelta(days=4),
    },
    {
        'title':      'Mindfulness for Finals: Free 3-Day Workshop',
        'body':       'Feeling overwhelmed as finals approach? Join our 3-day mindfulness workshop designed for students. Sessions run Aug 5–7, 5:00–6:00 PM via Zoom. Register through the CPS portal.',
        'event_type': 'webinar',
        'event_date': now + timedelta(days=12),
        'link':       '',
        'pinned':     False,
        'is_active':  True,
        'created_at': now - timedelta(days=5),
    },
]

db.announcements.delete_many({})
result = db.announcements.insert_many(SAMPLES)
print(f'✓ Inserted {len(result.inserted_ids)} announcements into {DB_NAME}.announcements')

client.close()
