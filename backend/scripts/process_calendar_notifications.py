"""Process calendar notifications stored in MongoDB.

This script can be run periodically (cron/task) to sync calendar changes
into appointment records. It reads `calendar_notifications`, processes
each entry, and updates matching appointments by `gcal_event_id` or `event_id`.
"""
import os
import sys
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from models import db


def process_one(db):
    coll = db.calendar_notifications
    # fetch unprocessed notifications
    docs = list(coll.find({}).limit(100))
    if not docs:
        print('No notifications to process')
        return

    for n in docs:
        payload = n.get('payload') or {}
        # Try common fields
        event_id = None
        if isinstance(payload, dict):
            event_id = payload.get('id') or payload.get('eventId') or payload.get('resourceId')
        # Fallback
        if not event_id and isinstance(payload, str):
            # Try parse minimal json
            try:
                import json
                p = json.loads(payload)
                event_id = p.get('id') or p.get('eventId')
            except Exception:
                pass

        if not event_id:
            print(f"Skipping notification without event id: {n.get('_id')}")
            coll.delete_one({'_id': n['_id']})
            continue

        # Find matching appointment by gcal_event_id or calendar_event_id
        appt = db.appointments.find_one({'gcal_event_id': event_id}) or db.appointments.find_one({'calendar_event_id': event_id})
        if not appt:
            print(f"No appointment matched for event {event_id}, removing notification")
            coll.delete_one({'_id': n['_id']})
            continue

        # Update appointment metadata based on payload
        update = {'last_synced_at': datetime.utcnow(), 'calendar_payload': payload}

        # If payload contains status or summary, map to appointment status
        status = None
        if isinstance(payload, dict):
            status = payload.get('status') or payload.get('eventStatus')
        if status:
            if status in ['cancelled', 'cancelled_by_user']:
                update['status'] = 'CANCELLED'
            elif status in ['confirmed']:
                update['status'] = 'CONFIRMED'

        db.appointments.update_one({'_id': appt['_id']}, {'$set': update})
        print(f"Updated appointment {appt['_id']} from event {event_id}")

        # remove notification
        coll.delete_one({'_id': n['_id']})


if __name__ == '__main__':
    # Simple runner that initializes DB connection like app
    from config import config
    cfg = config.get(os.getenv('FLASK_ENV', 'development'))
    mongodb = db.init_app(type('AppLike', (), {'config': cfg}))
    process_one(mongodb)
