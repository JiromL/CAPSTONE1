"""
Seed sample CPS announcements into MongoDB.
Run from the backend directory:  python seed_announcements.py
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
        'title':      'Mental Health Awareness Week — June 9–13',
        'body':       'CPS will be holding a series of drop-in sessions, relaxation booths, and resource fairs across campus. All students are welcome.',
        'event_type': 'event',
        'event_date': now + timedelta(days=2),
        'link':       '',
        'pinned':     True,
        'is_active':  True,
        'created_at': now,
    },
    {
        'title':      'Free Webinar: Managing Academic Stress',
        'body':       'Join our psychologist, Dr. Santos, for a live session on practical techniques for managing exam pressure and burnout. Registration link below.',
        'event_type': 'webinar',
        'event_date': now + timedelta(days=7),
        'link':       'https://meet.google.com/example-link',
        'pinned':     False,
        'is_active':  True,
        'created_at': now - timedelta(hours=3),
    },
    {
        'title':      'CPS Office Hours Update — June',
        'body':       'Our walk-in hours are Mon–Fri, 8AM–5PM. No appointment needed for initial consultations. Closed on June 12 (Independence Day).',
        'event_type': 'notice',
        'event_date': None,
        'link':       '',
        'pinned':     False,
        'is_active':  True,
        'created_at': now - timedelta(days=1),
    },
    {
        'title':      'Peer Support Circle — Every Wednesday, 3PM',
        'body':       'A safe, student-led space to share experiences and support one another. Facilitated by a CPS counselor. Room 205, Br. Andrew Gonzalez Hall.',
        'event_type': 'event',
        'event_date': now + timedelta(days=3),
        'link':       '',
        'pinned':     False,
        'is_active':  True,
        'created_at': now - timedelta(days=2),
    },
    {
        'title':      'Grief & Loss Support Group — New Cycle Starting',
        'body':       'A 6-week closed support group for students experiencing grief or loss. Limited slots. Contact CPS to register.',
        'event_type': 'info',
        'event_date': now + timedelta(days=14),
        'link':       '',
        'pinned':     False,
        'is_active':  True,
        'created_at': now - timedelta(days=3),
    },
]

# Avoid duplicate seeding
existing = db.announcements.count_documents({'is_active': True})
if existing >= len(SAMPLES):
    print(f'Skipped: {existing} announcements already exist in {DB_NAME}.')
else:
    db.announcements.delete_many({})   # clear old seeds
    result = db.announcements.insert_many(SAMPLES)
    print(f'✓ Inserted {len(result.inserted_ids)} sample announcements into {DB_NAME}.announcements')

client.close()
