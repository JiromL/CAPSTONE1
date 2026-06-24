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
    COUNSELOR = "COUNSELOR"  # Non-clinical/developmental counselor
    PSYCHOLOGIST = "PSYCHOLOGIST"  # Clinical psychologist
    IC = "IC"  # Intake Counselor
    CASE_MANAGER = "CASE_MANAGER"  # Case manager for Struggling/In Crisis students
    STAFF = "STAFF"  # Office assistant/support staff
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
    OFFICE_ASSISTANT = "OFFICE_ASSISTANT"  # Office assistant/support staff
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
    PENDING_APPROVAL = "PENDING_APPROVAL"  # Waiting for counselor approval
    APPROVED = "APPROVED"                  # Counselor approved, confirmed
    DENIED = "DENIED"                      # Counselor denied, student can resubmit
    MATCHED = "MATCHED"
    CONFIRMED = "CONFIRMED"
    RESCHEDULE_REQUESTED = "RESCHEDULE_REQUESTED"  # Student asked to move a confirmed appointment
    EVALUATION = "EVALUATION"              # Session done, student fills evaluation survey
    FOLLOW_UP = "FOLLOW_UP"               # Follow-up session scheduled by counselor
    REFERRAL = "REFERRAL"                  # Referred to another counselor / service
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"
    CLOSED_AT_INTAKE = "CLOSED_AT_INTAKE"   # IC closed case — no continuing sessions needed
    PENDING_STUDENT_APPROVAL = "PENDING_STUDENT_APPROVAL"  # Counselor proposed schedule, awaiting student confirmation


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


class ClientStatus(str, Enum):
    """Client service status"""
    ACTIVE = "ACTIVE"                          # Currently in active counseling
    INACTIVE = "INACTIVE"                      # Not currently receiving services
    CHECK_IN_ONLY = "CHECK_IN_ONLY"           # Periodic check-ins only, no ongoing counseling
    UNDER_ACCOMMODATION = "UNDER_ACCOMMODATION"  # Under SDFO accommodation
    WITH_MH_CHECK_IN = "WITH_MH_CHECK_IN"     # Collaborating with MH, check-in only
    TERMINATION_PENDING = "TERMINATION_PENDING"  # Being closed/terminated


class TransactionType(str, Enum):
    """Type of client contact/transaction"""
    NEW_INTAKE = "NEW_INTAKE"           # First-time intake
    CHECK_IN = "CHECK_IN"               # Periodic check-in for existing client
    SELF_REFERRED = "SELF_REFERRED"     # Self-referral
    REFERRED = "REFERRED"               # Referred from another department
    WALK_IN = "WALK_IN"                 # Walk-in visit
    FOLLOW_UP = "FOLLOW_UP"             # Follow-up from previous contact


class AssessmentType(str, Enum):
    """Types of assessment tools"""
    PHQ9 = "PHQ9"            # Depression screening
    GAD7 = "GAD7"            # Anxiety screening


# CaseType enum for case classification
class CaseType(str, Enum):
    CLINICAL = "CLINICAL"              # Diagnosis, ongoing psychotherapy (PSYCHOLOGIST)
    DEVELOPMENTAL = "DEVELOPMENTAL"    # Non-clinical counseling (COUNSELOR)
    CHECK_IN = "CHECK_IN"              # Periodic check-ins only


class CaseStatus(str, Enum):
    """Case lifecycle states"""
    NEW = "NEW"                              # New intake received
    INTAKE_SCHEDULED = "INTAKE_SCHEDULED"    # Awaiting intake appointment
    ACTIVE = "ACTIVE"                        # Ongoing sessions
    PENDING_TERMINATION = "PENDING_TERMINATION"  # Client or counselor initiated end
    CLOSED = "CLOSED"                        # Case terminated & documented
    CANCELLED = "CANCELLED"                  # Case never started


class TerminationType(str, Enum):
    """5 pathways of case termination per ACA/APA standards"""
    MUTUAL = "MUTUAL"                                    # Goals met, both agree
    CLIENT_INITIATED_PLANNED = "CLIENT_INITIATED_PLANNED"    # Client ready to stop
    CLIENT_INITIATED_PREMATURE = "CLIENT_INITIATED_PREMATURE"  # Dropout/rupture
    COUNSELOR_INITIATED = "COUNSELOR_INITIATED"          # Ethical necessity / limit of competence
    ADMINISTRATIVE = "ADMINISTRATIVE"                    # 3 no-shows / forced
    CLOSED_AT_INTAKE = "CLOSED_AT_INTAKE"               # No continuing sessions needed after intake
    CLINICAL_REFERRAL = "CLINICAL_REFERRAL"              # Warm handoff to external/higher care


class ResourceUploadRole(str, Enum):
    """Staff roles that can upload wellness resources"""
    PSYCHOLOGIST = "PSYCHOLOGIST"
    COUNSELOR = "COUNSELOR"
    CASE_MANAGER = "CASE_MANAGER"
    IC = "IC"  # Intake Counselor


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
    UserRole.COUNSELOR: {
        PermissionType.VIEW_CASE,
        PermissionType.EDIT_CASE,
        PermissionType.VIEW_ASSESSMENT,
        PermissionType.CREATE_ASSESSMENT,
        PermissionType.VIEW_NOTES,
        PermissionType.EDIT_NOTES,
        PermissionType.VIEW_AUDIT_LOG,
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
    UserRole.IC: {
        PermissionType.VIEW_CASE,
        PermissionType.EDIT_CASE,
        PermissionType.VIEW_ASSESSMENT,
        PermissionType.VIEW_NOTES,
        PermissionType.EDIT_NOTES,
        PermissionType.ASSIGN_CASES,
    },
    UserRole.CASE_MANAGER: {
        PermissionType.VIEW_CASE,
        PermissionType.EDIT_CASE,
        PermissionType.VIEW_ASSESSMENT,
        PermissionType.CREATE_ASSESSMENT,
        PermissionType.VIEW_NOTES,
        PermissionType.EDIT_NOTES,
        PermissionType.ASSIGN_CASES,
        PermissionType.VIEW_RISK_DASHBOARD,
        PermissionType.ESCALATE_CRISIS,
        PermissionType.VIEW_SENSITIVE_FIELDS,
    },
    UserRole.STAFF: {
        PermissionType.VIEW_CASE,
        PermissionType.VIEW_ASSESSMENT,
        PermissionType.VIEW_NOTES,
        PermissionType.ASSIGN_CASES,
    },
    UserRole.STUDENT: {
        PermissionType.VIEW_CASE,
    },
}


class MongoDB:
    @property
    def feedback_submissions(self):
        return self.db.feedback_submissions if self.db is not None else None
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
            self.db.resources.create_index("uploaded_by_user_id")
            self.db.resources.create_index("uploaded_by_role")
            self.db.audit_logs.create_index("user_id")
            self.db.permission_overrides.create_index("user_id")
            # New client tracking collections
            self.db.new_client_intakes.create_index("client_id_number")
            self.db.new_client_intakes.create_index("intake_counselor_id")
            self.db.new_client_intakes.create_index("created_date")
            self.db.non_counseling_clients.create_index("case_number")
            self.db.non_counseling_clients.create_index("counselor_id")
            self.db.non_counseling_clients.create_index("client_id_number")
            self.db.counseling_cases.create_index("case_number")
            self.db.counseling_cases.create_index("counselor_id")
            self.db.counseling_cases.create_index("client_id_number")
            # Add missing collection for C2C referrals
            self.db.counselor_referrals.create_index("case_id")
            self.db.counselor_referrals.create_index("referring_counselor_id")
            self.db.counselor_referrals.create_index("target_counselor_id")
            self.db.counselor_referrals.create_index("specialty_required")
            self.db.counselor_referrals.create_index("urgency")
            # Add missing collection for feedback submissions
            self.db.feedback_submissions.create_index("case_id")
            self.db.feedback_submissions.create_index("session_id")
            self.db.feedback_submissions.create_index("counselor_id")
            self.db.feedback_submissions.create_index("client_id")
            self.db.feedback_submissions.create_index("feedback_type")
            self.db.feedback_submissions.create_index("status")
        except Exception as e:
            print(f"⚠ MongoDB indexes warning: {e}")


db = MongoDB()
