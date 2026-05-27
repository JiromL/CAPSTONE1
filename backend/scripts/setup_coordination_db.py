"""
Setup script for Reminders, Feedback, and Counselor-to-Counselor Referral collections
"""

from pymongo import MongoClient, ASCENDING, DESCENDING
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
DATABASE_NAME = os.getenv('DATABASE_NAME', 'counseling_system')

def setup_collections():
    """Create collections and indexes for reminders, feedback, and c2c referrals"""
    
    client = MongoClient(MONGODB_URI)
    db = client[DATABASE_NAME]
    
    print(f"🔗 Connected to MongoDB: {DATABASE_NAME}")
    
    # ============ REMINDERS COLLECTION ============
    if 'reminders' not in db.list_collection_names():
        print("📝 Creating reminders collection...")
        db.create_collection('reminders')
    else:
        print("✅ reminders collection already exists")
    
    # Create indexes
    reminders_indexes = [
        ([("case_id", ASCENDING), ("scheduled_for", DESCENDING)], {}),
        ([("recipient_id", ASCENDING), ("status", ASCENDING)], {}),
        ([("created_at", DESCENDING)], {}),
        ([("reminder_type", ASCENDING)], {}),
        ([("priority", ASCENDING)], {})
    ]
    
    for index_fields, options in reminders_indexes:
        try:
            db.reminders.create_index(index_fields, **options)
            print(f"  ✔️  Index created on: {[f[0] for f in index_fields]}")
        except Exception as e:
            print(f"  ⚠️  Index creation failed: {e}")
    
    # ============ NOTIFICATIONS COLLECTION (for dashboard) ============
    if 'notifications' not in db.list_collection_names():
        print("📝 Creating notifications collection...")
        db.create_collection('notifications')
    else:
        print("✅ notifications collection already exists")
    
    # Create indexes
    notifications_indexes = [
        ([("recipient_id", ASCENDING), ("created_at", DESCENDING)], {}),
        ([("read", ASCENDING)], {}),
        ([("created_at", DESCENDING)], {})
    ]
    
    for index_fields, options in notifications_indexes:
        try:
            db.notifications.create_index(index_fields, **options)
            print(f"  ✔️  Index created on: {[f[0] for f in index_fields]}")
        except Exception as e:
            print(f"  ⚠️  Index creation failed: {e}")
    
    # ============ FEEDBACK TEMPLATES COLLECTION ============
    if 'feedback_templates' not in db.list_collection_names():
        print("📝 Creating feedback_templates collection...")
        db.create_collection('feedback_templates')
        
        # Insert default templates
        templates = [
            {
                "_id": "session_feedback",
                "name": "Session Feedback Form",
                "description": "Post-session feedback from client",
                "questions": [
                    {"id": "comfort", "text": "How comfortable did you feel during the session?", "type": "scale", "scale": 5},
                    {"id": "understanding", "text": "Did the counselor understand your concerns?", "type": "scale", "scale": 5},
                    {"id": "helpful", "text": "Did you find the session helpful?", "type": "scale", "scale": 5},
                    {"id": "recommendations", "text": "Do you have any recommendations?", "type": "text"}
                ],
                "created_at": datetime.utcnow()
            },
            {
                "_id": "effectiveness_survey",
                "name": "Counselor Effectiveness Survey",
                "description": "Survey on counselor effectiveness and performance",
                "questions": [
                    {"id": "active_listening", "text": "The counselor demonstrated active listening", "type": "scale", "scale": 5},
                    {"id": "respect", "text": "I felt respected and valued", "type": "scale", "scale": 5},
                    {"id": "guidance", "text": "The guidance provided was practical", "type": "scale", "scale": 5},
                    {"id": "environment", "text": "The counseling environment was comfortable", "type": "scale", "scale": 5}
                ],
                "created_at": datetime.utcnow()
            },
            {
                "_id": "outcome_tracking",
                "name": "Treatment Outcome Tracking",
                "description": "Track client progress and treatment outcomes",
                "questions": [
                    {"id": "client_progress", "text": "Client progress", "type": "choice", "options": ["improved", "stable", "declined"]},
                    {"id": "symptom_reduction", "text": "Symptom reduction", "type": "scale", "scale": 5},
                    {"id": "goal_progress", "text": "Progress toward treatment goals", "type": "scale", "scale": 5},
                    {"id": "follow_up_needed", "text": "Follow-up care needed", "type": "choice", "options": ["yes", "no", "maybe"]}
                ],
                "created_at": datetime.utcnow()
            },
            {
                "_id": "satisfaction_form",
                "name": "Overall Satisfaction Form",
                "description": "General satisfaction with CPS services",
                "questions": [
                    {"id": "satisfaction", "text": "Overall satisfaction with services", "type": "scale", "scale": 5},
                    {"id": "accessibility", "text": "Ease of accessing services", "type": "scale", "scale": 5},
                    {"id": "recommend", "text": "Would you recommend to others", "type": "choice", "options": ["yes", "no", "maybe"]}
                ],
                "created_at": datetime.utcnow()
            }
        ]
        
        db.feedback_templates.insert_many(templates)
        print("  ✔️  4 default feedback templates inserted")
    else:
        print("✅ feedback_templates collection already exists")
    
    # ============ FEEDBACK SUBMISSIONS COLLECTION ============
    if 'feedback_submissions' not in db.list_collection_names():
        print("📝 Creating feedback_submissions collection...")
        db.create_collection('feedback_submissions')
    else:
        print("✅ feedback_submissions collection already exists")
    
    # Create indexes
    feedback_indexes = [
        ([("case_id", ASCENDING), ("created_at", DESCENDING)], {}),
        ([("feedback_type", ASCENDING)], {}),
        ([("counselor_id", ASCENDING)], {}),
        ([("client_id", ASCENDING)], {}),
        ([("created_at", DESCENDING)], {})
    ]
    
    for index_fields, options in feedback_indexes:
        try:
            db.feedback_submissions.create_index(index_fields, **options)
            print(f"  ✔️  Index created on: {[f[0] for f in index_fields]}")
        except Exception as e:
            print(f"  ⚠️  Index creation failed: {e}")
    
    # ============ COUNSELOR REFERRALS COLLECTION ============
    if 'counselor_referrals' not in db.list_collection_names():
        print("📝 Creating counselor_referrals collection...")
        db.create_collection('counselor_referrals')
    else:
        print("✅ counselor_referrals collection already exists")
    
    # Create indexes
    c2c_indexes = [
        ([("case_id", ASCENDING)], {}),
        ([("status", ASCENDING), ("created_at", DESCENDING)], {}),
        ([("target_counselor_id", ASCENDING)], {}),
        ([("referring_counselor_id", ASCENDING)], {}),
        ([("is_rare_case", ASCENDING)], {}),
        ([("specialty_required", ASCENDING)], {}),
        ([("urgency", ASCENDING)], {}),
        ([("created_at", DESCENDING)], {})
    ]
    
    for index_fields, options in c2c_indexes:
        try:
            db.counselor_referrals.create_index(index_fields, **options)
            print(f"  ✔️  Index created on: {[f[0] for f in index_fields]}")
        except Exception as e:
            print(f"  ⚠️  Index creation failed: {e}")
    
    # Verify collections
    print("\n📊 Collection Status:")
    collections = ['reminders', 'notifications', 'feedback_templates', 'feedback_submissions', 'counselor_referrals']
    for collection in collections:
        if collection in db.list_collection_names():
            count = db[collection].count_documents({})
            print(f"  ✅ {collection}: {count} documents")
        else:
            print(f"  ❌ {collection}: NOT FOUND")
    
    print("\n✨ Database setup complete!")
    client.close()

if __name__ == '__main__':
    setup_collections()
