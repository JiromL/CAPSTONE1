"""
Utility functions for authentication, authorization, and audit logging
"""

from functools import wraps
from flask import request, jsonify, g
from flask_jwt_extended import get_jwt_identity
from datetime import datetime
from bson import ObjectId


def serialize_doc(v):
    """Recursively convert ObjectId/datetime in nested dicts and lists to JSON-safe types."""
    if isinstance(v, ObjectId):
        return str(v)
    if isinstance(v, datetime):
        # Append Z so JavaScript parses as UTC, not local time
        return v.isoformat() + 'Z' if not v.isoformat().endswith('+00:00') else v.isoformat()
    if isinstance(v, dict):
        return {k: serialize_doc(val) for k, val in v.items()}
    if isinstance(v, list):
        return [serialize_doc(item) for item in v]
    return v


def audit_log(db, entity_type, action, entity_id=None, old_values=None, new_values=None):
    """Create an audit log entry in MongoDB (EPIC 1: Implement Audit Log)"""
    try:
        try:
            user_id = get_jwt_identity()
        except:
            # No JWT context (e.g., during login), use None
            user_id = None
        
        ip_address = request.remote_addr
        
        log_entry = {
            "user_id": ObjectId(user_id) if isinstance(user_id, str) else user_id,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "old_values": old_values or {},
            "new_values": new_values or {},
            "ip_address": ip_address,
            "timestamp": datetime.utcnow()
        }
        
        db.audit_logs.insert_one(log_entry)
    except Exception as e:
        print(f"Error creating audit log: {e}")


def user_has_permission(db, user_id, permission):
    """Check if user has a specific permission"""
    from models import ROLE_PERMISSIONS, PermissionType
    
    try:
        user = db.users.find_one({"_id": ObjectId(user_id) if isinstance(user_id, str) else user_id})
        if not user:
            return False
        
        user_role = user.get("role")
        permissions = ROLE_PERMISSIONS.get(user_role, set())
        
        # Check direct permissions
        if permission in permissions:
            return True
        
        # Check temporary permission overrides
        override = db.permission_overrides.find_one({
            "user_id": ObjectId(user_id) if isinstance(user_id, str) else user_id,
            "permission": permission,
            "expires_at": {"$gt": datetime.utcnow()}
        })
        
        return override is not None
    except Exception as e:
        print(f"Error checking permission: {e}")
        return False


def require_permission(permission):
    """Decorator to require specific permissions (EPIC 1: Develop Role-Based Access Rules)"""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            from models import db as mongodb
            
            user_id = get_jwt_identity()
            if not user_id:
                return jsonify({'error': 'Unauthorized'}), 401
            
            try:
                user = mongodb.db.users.find_one({"_id": ObjectId(user_id) if isinstance(user_id, str) else user_id})
            except:
                user = mongodb.db.users.find_one({"_id": user_id})
            
            if not user:
                return jsonify({'error': 'User not found'}), 401
            
            perm_value = permission.value if hasattr(permission, 'value') else permission
            if not user_has_permission(mongodb.db, user_id, perm_value):
                audit_log(mongodb.db, 'access_control', 'unauthorized_access_attempt', entity_id=user_id)
                return jsonify({'error': f'Permission denied: {perm_value}'}), 403
            
            g.user = user
            return fn(*args, **kwargs)
        
        return wrapper
    return decorator


def require_role(*roles):
    """Decorator to require specific roles"""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            from models import db as mongodb, UserRole
            
            user_id = get_jwt_identity()
            if not user_id:
                return jsonify({'error': 'Unauthorized'}), 401
            
            try:
                user = mongodb.db.users.find_one({"_id": ObjectId(user_id) if isinstance(user_id, str) else user_id})
            except:
                user = mongodb.db.users.find_one({"_id": user_id})
            
            if not user:
                return jsonify({'error': 'User not found'}), 401
            
            user_role = user.get("role")
            allowed_roles = [role.value if hasattr(role, 'value') else role for role in roles]
            
            if user_role not in allowed_roles:
                audit_log(mongodb.db, 'access_control', 'role_restricted_access', entity_id=user_id)
                return jsonify({'error': 'Role not authorized'}), 403
            
            g.user = user
            return fn(*args, **kwargs)
        
        return wrapper
    return decorator


def get_current_user(db, user_id):
    """Get the current authenticated user from MongoDB"""
    try:
        return db.users.find_one({"_id": ObjectId(user_id) if isinstance(user_id, str) else user_id})
    except:
        return db.users.find_one({"_id": user_id})


def get_user_ip():
    """Get user's IP address"""
    if request.environ.get('HTTP_X_FORWARDED_FOR'):
        return request.environ.get('HTTP_X_FORWARDED_FOR').split(',')[0]
    return request.remote_addr


def case_access_error(db, user_id, case_id):
    """Apply the same viewing rules as GET /api/cases/<id> to routes that expose case data.

    Returns (error_message, status) when the caller may not see the case, or None if allowed.
    Students see only their own case; counselors and psychologists only cases assigned to them.
    """
    try:
        case = db.cases.find_one({'_id': ObjectId(case_id)}, {'student_id': 1, 'assigned_counselor_id': 1})
    except Exception:
        return 'Invalid case ID', 400
    if not case:
        return 'Case not found', 404
    user = db.users.find_one({'_id': ObjectId(user_id)}, {'role': 1})
    if not user:
        return 'User not found', 401
    role = user.get('role')
    if role == 'STUDENT' and str(case.get('student_id')) != str(user_id):
        return 'Cannot view other student cases', 403
    if role in ('COUNSELOR', 'PSYCHOLOGIST') and str(case.get('assigned_counselor_id')) != str(user_id):
        return 'Case not assigned to you', 403
    return None


def is_staff(db, user_id):
    """True for any CPS staff role. Students hold VIEW_CASE for their own case, so
    VIEW_CASE alone must not gate routes that list other students' data."""
    try:
        user = db.users.find_one({'_id': ObjectId(user_id)}, {'role': 1})
    except Exception:
        return False
    return bool(user) and user.get('role') not in (None, 'STUDENT')


# Route parameters that point at a record belonging to a case, and where that record lives.
_CASE_RECORD_PARAMS = {
    'appointment_id': 'appointments', 'note_id': 'session_notes', 'session_id': 'session_notes',
    'check_in_id': 'check_ins', 'checkin_id': 'check_ins', 'referral_id': 'referrals',
    'plan_id': 'safety_plans', 'safety_plan_id': 'safety_plans', 'intake_id': 'intakes',
    'document_id': 'documents', 'escalation_id': 'crisis_escalations', 'assessment_id': 'assessments',
}
_OWN_RECORD_ERROR = ('You can only open records from your own case', 403)


def record_access_error(db, user_id, view_args):
    """Central rule for every route with a case or case-record ID in its URL: apply the case
    page's viewing rules (case_access_error). Returns (message, status) or None.

    A counselor or psychologist named on the record itself (e.g. the appointment's counselor)
    may open that record even when the case is assigned to someone else.
    """
    if not view_args:
        return None
    try:
        user = db.users.find_one({'_id': ObjectId(user_id)}, {'role': 1})
    except Exception:
        return None
    if not user:
        return None
    role, uid = user.get('role'), str(user_id)

    if role == 'STUDENT':
        for key in ('student_id', 'client_id'):
            if key in view_args and str(view_args[key]) != uid:
                return _OWN_RECORD_ERROR

    case_ids = [view_args['case_id']] if 'case_id' in view_args else []
    for key, collection in _CASE_RECORD_PARAMS.items():
        if key not in view_args:
            continue
        try:
            doc = db[collection].find_one({'_id': ObjectId(view_args[key])})
        except Exception:
            doc = None
        if not doc:
            continue
        involved = {str(v) for k, v in doc.items() if k.endswith('_id') and k not in ('_id', 'case_id')}
        if role == 'STUDENT':
            if doc.get('student_id') is not None and str(doc['student_id']) != uid:
                return _OWN_RECORD_ERROR
        elif uid in involved:
            continue
        if doc.get('case_id'):
            case_ids.append(doc['case_id'])

    for case_id in case_ids:
        err = case_access_error(db, user_id, case_id)
        if err and err[1] == 403:
            return err
    return None
