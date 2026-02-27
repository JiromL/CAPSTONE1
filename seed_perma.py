#!/usr/bin/env python3
from pymongo import MongoClient
from datetime import datetime, timedelta

client = MongoClient('mongodb://localhost:27017')
db = client['cps_system_dev']

# Create some PERMA history entries for ema_Yud
perma_entries = [
    {
        'username': 'ema_Yud',
        'date': datetime.utcnow() - timedelta(days=5),
        'perma_label': 'Red - Struggling'
    },
    {
        'username': 'ema_Yud',
        'date': datetime.utcnow() - timedelta(days=3),
        'perma_label': 'Yellow - Surviving'
    },
    {
        'username': 'ema_Yud',
        'date': datetime.utcnow() - timedelta(days=1),
        'perma_label': 'Yellow - Surviving'
    },
    {
        'username': 'ema_Yud',
        'date': datetime.utcnow(),
        'perma_label': 'Green - Thriving'
    }
]

result = db.perma_history.insert_many(perma_entries)
print(f"Inserted {len(result.inserted_ids)} PERMA entries for ema_Yud")

# List what's in perma_history
entries = list(db.perma_history.find({'username': 'ema_Yud'}).sort('date', -1))
print(f"\nCurrent PERMA history for ema_Yud:")
for e in entries:
    print(f"  {e['date']}: {e['perma_label']}")
