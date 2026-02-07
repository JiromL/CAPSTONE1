"""
MongoDB Models for Campus Counseling & Psychology Services (CPS) System
Complete data models for all 8 epics using PyMongo
"""

from enum import Enum
from datetime import datetime, timedelta
from typing import Optional, Dict, List
from bson import ObjectId
import pytz

# Enumerations for Roles, Permissions, and Status

class UserRole(str, Enum):
    """9-tier role hierarchy"""
    ADMIN = "ADMIN"
    DPO = "DPO"  # Director of Psychological Operations
    PSYCHOLOGIST = "PSYCHOLOGIST"
    CASE_MANAGER = "CASE_MANAGER"
    CSC = "CSC"  # Counseling Support Case worker
    CSP = "CSP"  # Counseling Support Person
    IC = "IC"  # Intake Coordinator
    STAFF = "STAFF"
    STUDENT = "STUDENT"


class PermissionType(str, Enum):
    """14 permission types for RBAC"""
    VIEW_CASE = "VIEW_CASE"
    EDIT_CASE = "EDIT_CASE"
    VIEW_ASSESSMENT = "VIEW_ASSESSMENT"
    CREATE_ASSESSMENT = "CREATE_ASSESSMENT"
    VIEW_NOTES = "VIEW_NOTES"
    EDIT_NOTES = "EDIT_NOTES"
    VIEW_SENSITIVE_FIELDS = "VIEW_SENSITIVE_FIELDS"
    MANAGE_USERS = "MANAGE_USERS"
    MANAGE_ROLES = "MANAGE_ROLES"
    VIEW_AUDIT_LOG = "VIEW_AUDIT_LOG"
    EXPORT_DATA = "EXPORT_DATA"
    ASSIGN_CASES = "ASSIGN_CASES"
    VIEW_RISK_DASHBOARD = "VIEW_RISK_DASHBOARD"
    ESCALATE_CRISIS = "ESCALATE_CRISIS"


class RiskLevel(str, Enum):
    """Risk classification levels"""
    GREEN = "GREEN"      # 0-25%
    YELLOW = "YELLOW"    # 25-50%
    RED = "RED"           # 50-75%
    CRITICAL = "CRITICAL"  # 75%+


class IntakeStatus(str, Enum):
    """Intake workflow states"""
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    ENDORSED = "ENDORSED"


class AppointmentStatus(str, Enum):
    """Appointment workflow states"""
    REQUESTED = "REQUESTED"
    MATCHED = "MATCHED"
    CONFIRMED = "CONFIRMED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"


class ReferralStatus(str, Enum):
    """Referral workflow states"""
    PENDING = "PENDING"
    REFERRED = "REFERRED"
    ROI_REQUESTED = "ROI_REQUESTED"
    ROI_SIGNED = "ROI_SIGNED"
    WARM_HANDOFF_COMPLETE = "WARM_HANDOFF_COMPLETE"
    COMPLETED = "COMPLETED"


class ReferralType(str, Enum):
    """Type of referral"""
    INTERNAL = "INTERNAL"
    EXTERNAL = "EXTERNAL"


class AssessmentType(str, Enum):
    """Types of assessment tools"""
    PHQ9 = "PHQ9"            # Depression screening
    GAD7 = "GAD7"            # Anxiety screening
    PSS = "PSS"              # Perceived Stress Scale


# RBAC Permission Matrix
ROLE_PERMISSIONS = {
    UserRole.ADMIN: set(PermissionType),
    UserRole.DPO: {
        PermissionType.VIEW_CASE,
        PermissionType.EDIT_CASE,
        PermissionType.VIEW_ASSESSMENT,
        PermissionType.CREATE_ASSESSMENT,
        PermissionType.VIEW_NOTES,
        PermissionType.EDIT_NOTES,
        PermissionType.VIEW_SENSITIVE_FIELDS,
        PermissionType.MANAGE_USERS,
        PermissionType.MANAGE_ROLES,
        PermissionType.VIEW_AUDIT_LOG,
        PermissionType.EXPORT_DATA,
        PermissionType.ASSIGN_CASES,
        PermissionType.VIEW_RISK_DASHBOARD,
        PermissionType.ESCALATE_CRISIS,
    },
    UserRole.PSYCHOLOGIST: {
        PermissionType.VIEW_CASE,
        PermissionType.EDIT_CASE,
        PermissionType.VIEW_ASSESSMENT,
        PermissionType.CREATE_ASSESSMENT,
        PermissionType.VIEW_NOTES,
        PermissionType.EDIT_NOTES,
        PermissionType.VIEW_SENSITIVE_FIELDS,
        PermissionType.VIEW_AUDIT_LOG,
        PermissionType.VIEW_RISK_DASHBOARD,
        PermissionType.ESCALATE_CRISIS,
    },
    UserRole.CASE_MANAGER: {
        PermissionType.VIEW_CASE,
        PermissionType.EDIT_CASE,
        PermissionType.VIEW_ASSESSMENT,
        PermissionType.VIEW_NOTES,
        PermissionType.EDIT_NOTES,
        PermissionType.VIEW_AUDIT_LOG,
        PermissionType.ASSIGN_CASES,
        PermissionType.VIEW_RISK_DASHBOARD,
    },
    UserRole.CSC: {
        PermissionType.VIEW_CASE,
        PermissionType.EDIT_CASE,
        PermissionType.CREATE_ASSESSMENT,
        PermissionType.VIEW_NOTES,
        PermissionType.EDIT_NOTES,
        PermissionType.VIEW_RISK_DASHBOARD,
    },
    UserRole.CSP: {
        PermissionType.VIEW_CASE,
        PermissionType.CREATE_ASSESSMENT,
        PermissionType.VIEW_NOTES,
        PermissionType.VIEW_RISK_DASHBOARD,
    },
    UserRole.IC: {
        PermissionType.VIEW_CASE,
        PermissionType.EDIT_CASE,
        PermissionType.VIEW_ASSESSMENT,
        PermissionType.VIEW_NOTES,
    },
    UserRole.STAFF: {
        PermissionType.VIEW_CASE,
        PermissionType.VIEW_ASSESSMENT,
        PermissionType.VIEW_NOTES,
    },
    UserRole.STUDENT: {
        PermissionType.VIEW_CASE,
    },
}


class MongoDB:
    """MongoDB connection and database manager"""
    def __init__(self):
        self.client = None
        self.db = None
    
    def init_app(self, app):
        """Initialize MongoDB with Flask app"""
        from pymongo import MongoClient
        
        uri = app.config.get("MONGODB_URI")
        db_name = app.config.get("MONGODB_DB_NAME", "cps_system")
        
        try:
            self.client = MongoClient(uri, serverSelectionTimeoutMS=3000)
            self.db = self.client[db_name]
            # Test connection
            self.client.admin.command('ping')
            # Create indexes if connection successful
            self._create_indexes()
        except Exception as e:
            print(f"⚠ MongoDB connection warning: {e}")
            print("⚠ Backend will start but MongoDB features will be unavailable until MongoDB is running")
            print("⚠ To start MongoDB locally, run: mongod --dbpath <your-data-path>")
            # Still initialize client even if connection fails
            self.client = MongoClient(uri)
            self.db = self.client[db_name]
        
        return self.db
    
    def _create_indexes(self):
        """Create database indexes"""
        if self.db is None:
            return
        
        try:
            self.db.users.create_index("email", unique=True)
            self.db.cases.create_index("student_id")
            self.db.cases.create_index("assigned_counselor_id")
            self.db.assessments.create_index("case_id")
            self.db.intakes.create_index("case_id", unique=True)
            self.db.appointments.create_index("case_id")
            self.db.documents.create_index("case_id")
            self.db.session_notes.create_index("case_id")
            self.db.session_notes.create_index("counselor_id")
            self.db.risk_checkins.create_index("case_id")
            self.db.crisis_escalations.create_index("case_id")
            self.db.referrals.create_index("case_id")
            self.db.audit_logs.create_index("user_id")
            self.db.permission_overrides.create_index("user_id")
        except Exception as e:
            print(f"⚠ MongoDB indexes warning: {e}")


db = MongoDB()
