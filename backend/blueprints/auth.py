"""
EPIC 1: USER ROLES & ACCESS CONTROL (RBAC)
Blueprint for user authentication, authorization, and permission management
MongoDB-compatible version
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, UserRole, PermissionType, ROLE_PERMISSIONS
from utils import audit_log, user_has_permission
from datetime import datetime
from bson import ObjectId

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    data = request.get_json()
    
    if not data.get('email') or not data.get('password') or not data.get('first_name') or not data.get('last_name'):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Check if email already exists
    existing_user = db.db.users.find_one({"email": data['email']})
    if existing_user:
        return jsonify({'error': 'Email already exists'}), 409
    
    user_doc = {
        "_id": ObjectId(),
        "email": data['email'],
        "password_hash": generate_password_hash(data['password']),
        "first_name": data['first_name'],
        "last_name": data['last_name'],
        "role": data.get('role', UserRole.STUDENT.value),
        "phone": data.get('phone'),
        "department": data.get('department'),
        "specializations": data.get('specializations', []),
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    
    result = db.db.users.insert_one(user_doc)
    
    audit_log(db.db, 'user', 'create', entity_id=str(result.inserted_id), new_values={'email': user_doc['email'], 'role': user_doc['role']})
    
    return jsonify({'message': 'User created', 'user_id': str(result.inserted_id)}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user and return JWT token"""
    data = request.get_json()
    
    if not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing email or password'}), 400
    
    user = db.db.users.find_one({"email": data['email']})
    
    if not user or not check_password_hash(user['password_hash'], data['password']):
        audit_log(db.db, 'access_control', 'failed_login', old_values={'email': data['email']})
        return jsonify({'error': 'Invalid credentials'}), 401
    
    if not user.get('is_active', True):
        return jsonify({'error': 'User account is inactive'}), 403
    
    access_token = create_access_token(identity=str(user['_id']))
    
    audit_log(db.db, 'auth', 'login', entity_id=str(user['_id']))
    
    return jsonify({
        'access_token': access_token,
        'user_id': str(user['_id']),
        'email': user['email'],
        'first_name': user['first_name'],
        'last_name': user['last_name'],
        'role': user['role'],
    }), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_profile():
    """Get current user profile"""
    from integrations.token_store import get_tokens
    
    user_id = get_jwt_identity()
    
    try:
        user = db.db.users.find_one({"_id": ObjectId(user_id)})
    except:
        user = db.db.users.find_one({"_id": user_id})
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    user.pop('password_hash', None)
    user['_id'] = str(user['_id'])
    
    # Check if user has Google Calendar connected
    google_tokens = get_tokens(db.db, user_id, 'google')
    user['google_calendar_connected'] = bool(google_tokens and google_tokens.get('access_token'))
    
    return jsonify(user), 200


@auth_bp.route('/users', methods=['GET'])
@jwt_required()
def list_users():
    """List all users (admin only)"""
    user_id = get_jwt_identity()
    
    try:
        current_user = db.db.users.find_one({"_id": ObjectId(user_id)})
    except:
        current_user = db.db.users.find_one({"_id": user_id})
    
    if not current_user or current_user.get('role') != UserRole.ADMIN.value:
        return jsonify({'error': 'Permission denied'}), 403
    
    users = list(db.db.users.find({}))
    for u in users:
        u.pop('password_hash', None)
        u['_id'] = str(u['_id'])
    
    return jsonify(users), 200


@auth_bp.route('/users/<user_id>/role', methods=['PATCH'])
@jwt_required()
def update_user_role(user_id):
    """Update user role (admin only)"""
    current_user_id = get_jwt_identity()
    
    try:
        current_user = db.db.users.find_one({"_id": ObjectId(current_user_id)})
    except:
        current_user = db.db.users.find_one({"_id": current_user_id})
    
    if not current_user or current_user.get('role') != UserRole.ADMIN.value:
        return jsonify({'error': 'Permission denied'}), 403
    
    data = request.get_json()
    if not data.get('role'):
        return jsonify({'error': 'Missing role'}), 400
    
    try:
        target_user = db.db.users.find_one({"_id": ObjectId(user_id)})
    except:
        target_user = db.db.users.find_one({"_id": user_id})
    
    if not target_user:
        return jsonify({'error': 'User not found'}), 404
    
    old_role = target_user.get('role')
    db.db.users.update_one(
        {"_id": target_user['_id']},
        {"$set": {"role": data['role'], "updated_at": datetime.utcnow()}}
    )
    
    audit_log(db.db, 'user', 'update_role', entity_id=user_id, old_values={'role': old_role}, new_values={'role': data['role']})
    
    return jsonify({'message': 'Role updated'}), 200


@auth_bp.route('/audit-logs', methods=['GET'])
@jwt_required()
def get_audit_logs():
    """Get audit logs (with permission check)"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_AUDIT_LOG.value):
        return jsonify({'error': 'Permission denied'}), 403
    
    logs = list(db.db.audit_logs.find({}).sort("timestamp", -1).limit(50))
    
    for log in logs:
        log['_id'] = str(log['_id'])
        if 'user_id' in log:
            log['user_id'] = str(log['user_id'])
        if 'timestamp' in log:
            log['timestamp'] = log['timestamp'].isoformat()
    
    return jsonify(logs), 200


@auth_bp.route('/roles', methods=['GET'])
def get_roles():
    """Get available roles"""
    roles = [role.value for role in UserRole]
    return jsonify(roles), 200
