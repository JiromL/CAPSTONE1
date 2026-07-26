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

    """Log data access for audit trail (EPIC 1: Implement Audit Log)"""
    audit_log(entity_type, 'access', entity_id=entity_id)


def get_user_ip():
    """Get user's IP address"""
    if request.environ.get('HTTP_X_FORWARDED_FOR'):
        return request.environ.get('HTTP_X_FORWARDED_FOR').split(',')[0]
    return request.remote_addr
