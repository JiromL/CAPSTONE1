from pymongo import MongoClient
from datetime import datetime

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client.counseling_system

# List of tables/collections to ensure exist
collections_to_create = [
    'session_notes_versions',
    'case_handovers',
    'referral_logs',
    'case_audit_log'
]

print("📊 Checking MongoDB collections...\n")

for collection_name in collections_to_create:
    if collection_name in db.list_collection_names():
        count = db[collection_name].count_documents({})
        print(f"✅ {collection_name} exists ({count} documents)")
    else:
        db.create_collection(collection_name)
        print(f"✨ Created {collection_name} collection")

# Ensure indexes for performance
print("\n📑 Creating database indexes...\n")

db.session_notes_versions.create_index([("session_note_id", 1)])
db.session_notes_versions.create_index([("edited_at", -1)])
print("✅ session_notes_versions indexes created")

db.case_handovers.create_index([("case_id", 1)])
db.case_handovers.create_index([("initiated_at", -1)])
db.case_handovers.create_index([("status", 1)])
print("✅ case_handovers indexes created")

db.referral_logs.create_index([("case_id", 1)])
db.referral_logs.create_index([("created_at", -1)])
db.referral_logs.create_index([("status", 1)])
print("✅ referral_logs indexes created")

db.case_audit_log.create_index([("case_id", 1)])
db.case_audit_log.create_index([("changed_at", -1)])
print("✅ case_audit_log indexes created")

print("\n🔧 Verifying existing collections...\n")

session_notes_count = db.session_notes.count_documents({})
print(f"✅ session_notes: {session_notes_count} documents")

cases_count = db.cases.count_documents({})
print(f"✅ cases: {cases_count} documents")

print("\n✨ Database setup complete!")
