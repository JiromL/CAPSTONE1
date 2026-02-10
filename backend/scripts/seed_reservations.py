#!/usr/bin/env python3
"""Seed the reservations collection with sample data."""
import os
from datetime import datetime, timedelta
from pymongo import MongoClient


def get_db():
    uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
    db_name = os.getenv('MONGODB_DB_NAME', os.getenv('MONGODB_DB', 'cps_system_dev'))
    client = MongoClient(uri)
    return client[db_name]


def seed():
    db = get_db()
    reservations = db.reservations

    sample = [
        {
            'user_id': 'student_001',
            'date': (datetime.utcnow() + timedelta(days=3)).date().isoformat(),
            'time': '09:00',
            'party_size': 1,
            'status': 'confirmed',
            'created_at': datetime.utcnow().isoformat()
        },
        {
            'user_id': 'student_002',
            'date': (datetime.utcnow() + timedelta(days=5)).date().isoformat(),
            'time': '11:30',
            'party_size': 2,
            'status': 'confirmed',
            'created_at': datetime.utcnow().isoformat()
        },
        {
            'user_id': 'student_003',
            'date': (datetime.utcnow() + timedelta(days=7)).date().isoformat(),
            'time': '14:00',
            'party_size': 3,
            'status': 'pending',
            'created_at': datetime.utcnow().isoformat()
        }
    ]

    result = reservations.insert_many(sample)
    print(f"Inserted {len(result.inserted_ids)} reservations")


if __name__ == '__main__':
    seed()
