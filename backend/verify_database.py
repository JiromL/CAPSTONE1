"""
Test intake data saving to MongoDB
Verify that submitted intake data is properly stored and retrievable
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from models import db as db_module
from datetime import datetime
from bson import ObjectId
import json

# Create test app
app = create_app('development')

def verify_database_connection():
    """Verify MongoDB connection is working"""
    with app.app_context():
        try:
            # Ping the database
            db_module.client.admin.command('ping')
            print("✓ MongoDB connection successful")
            return True
        except Exception as e:
            print(f"✗ MongoDB connection failed: {e}")
            return False

def verify_collections_exist():
    """Verify required collections exist"""
    with app.app_context():
        collections = db_module.db.list_collection_names()
        required = ['users', 'intakes', 'cases', 'assessments']
        
        for collection in required:
            if collection in collections:
                print(f"✓ Collection '{collection}' exists")
            else:
                print(f"✗ Collection '{collection}' missing")
        
        return all(c in collections for c in required)

def verify_intake_data_structure():
    """Verify existing intake data has correct structure"""
    with app.app_context():
        try:
            intake = db_module.db.intakes.find_one()
            if intake:
                expected_fields = ['_id', 'case_id', 'status', 'responses', 'counseling_id']
                missing = [f for f in expected_fields if f not in intake]
                
                if not missing:
                    print(f"✓ Intake data structure is valid")
                    print(f"  Sample intake ID: {intake.get('counseling_id')}")
                    print(f"  Sample risk level: {intake.get('responses', {}).get('urgency_level')}")
                    return True
                else:
                    print(f"✗ Missing fields in intake: {missing}")
                    return False
            else:
                print(f"! No intake records found in database")
                return True  # Not an error, just empty
                
        except Exception as e:
            print(f"✗ Error reading intake data: {e}")
            return False

def verify_assessment_data():
    """Verify assessment data is properly stored"""
    with app.app_context():
        try:
            assessment = db_module.db.assessments.find_one()
            if assessment:
                expected_fields = ['case_id', 'assessment_type']
                missing = [f for f in expected_fields if f not in assessment]
                
                if not missing:
                    print(f"✓ Assessment data structure is valid")
                    print(f"  Assessment types: {assessment.get('assessment_type')}")
                    return True
                else:
                    print(f"✗ Missing fields in assessment: {missing}")
                    return False
            else:
                print(f"! No assessment records found in database")
                return True  # Not an error, just empty
                
        except Exception as e:
            print(f"✗ Error reading assessment data: {e}")
            return False

def verify_case_data():
    """Verify case data is properly stored"""
    with app.app_context():
        try:
            case = db_module.db.cases.find_one()
            if case:
                expected_fields = ['_id', 'student_id', 'case_status']
                missing = [f for f in expected_fields if f not in case]
                
                if not missing:
                    print(f"✓ Case data structure is valid")
                    print(f"  Case status: {case.get('case_status')}")
                    return True
                else:
                    print(f"✗ Missing fields in case: {missing}")
                    return False
            else:
                print(f"! No case records found in database")
                return True  # Not an error, just empty
                
        except Exception as e:
            print(f"✗ Error reading case data: {e}")
            return False

def get_database_stats():
    """Get overview of database contents"""
    with app.app_context():
        try:
            print("\n📊 Database Statistics:")
            print(f"  Intakes: {db_module.db.intakes.count_documents({})}")
            print(f"  Cases: {db_module.db.cases.count_documents({})}")
            print(f"  Assessments: {db_module.db.assessments.count_documents({})}")
            print(f"  Users: {db_module.db.users.count_documents({})}")
            
            # Get risk distribution
            urgent_count = db_module.db.intakes.count_documents({"is_emergency": True})
            completed_count = db_module.db.intakes.count_documents({"status": "COMPLETED"})
            
            print(f"\n  Emergency Intakes: {urgent_count}")
            print(f"  Completed Intakes: {completed_count}")
            
        except Exception as e:
            print(f"✗ Error getting statistics: {e}")

if __name__ == '__main__':
    print("🔍 Verifying Database Integration\n" + "="*50)
    
    success = True
    success &= verify_database_connection()
    success &= verify_collections_exist()
    success &= verify_intake_data_structure()
    success &= verify_assessment_data()
    success &= verify_case_data()
    
    get_database_stats()
    
    print("\n" + "="*50)
    if success:
        print("✓ All database checks passed!")
    else:
        print("✗ Some database checks failed")
    
    sys.exit(0 if success else 1)
