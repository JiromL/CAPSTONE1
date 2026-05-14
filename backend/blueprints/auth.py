"""
EPIC 1: USER ROLES & ACCESS CONTROL (RBAC)
Blueprint for user authentication, authorization, and permission management
MongoDB-compatible version with Google OAuth2.0 and Email Verification
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, UserRole, PermissionType, ROLE_PERMISSIONS
from utils import audit_log, user_has_permission
from services.oauth_service import OAuthService
from services.email_service import EmailService
from datetime import datetime, timedelta
from bson import ObjectId
from integrations.token_store import get_tokens

# Initialize services
oauth_service = OAuthService()
email_service = EmailService()

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/oauth/google/client-id', methods=['GET'])
def get_google_client_id():
    """Get Google Client ID for frontend"""
    return jsonify({
        'client_id': oauth_service.get_google_client_id()
    }), 200


@auth_bp.route('/oauth/google/callback', methods=['POST'])
def google_oauth_callback():
    """Handle Google OAuth callback with ID token"""
    data = request.get_json()
    
    if not data.get('token'):
        return jsonify({'error': 'Missing token'}), 400
    
    token = data['token']
    
    # Verify Google token
    user_info = oauth_service.verify_token(token)
    
    if user_info is None:
        return jsonify({'error': 'Invalid token'}), 401
    
    if isinstance(user_info, dict) and user_info.get('error'):
        # Domain restriction error
        return jsonify(user_info), 403
    
    email = user_info['email']
    
    # Find or create user
    existing_user = db.db.users.find_one({"email": email})
    
    if existing_user:
        # User exists - update oauth info if not already linked
        if not existing_user.get('oauth_provider'):
            db.db.users.update_one(
                {"_id": existing_user['_id']},
                {"$set": {
                    "oauth_provider": "google",
                    "oauth_id": user_info.get('sub'),
                    "picture": user_info.get('picture', ''),
                    "is_verified": True,  # OAuth emails are verified
                    "updated_at": datetime.utcnow()
                }}
            )
        
        audit_log(db.db, 'auth', 'oauth_login', entity_id=str(existing_user['_id']))
    else:
        # Create new user via OAuth
        user_doc = {
            "_id": ObjectId(),
            "email": email,
            "password_hash": None,  # OAuth users don't have passwords
            "first_name": user_info.get('first_name', ''),
            "last_name": user_info.get('last_name', ''),
            "picture": user_info.get('picture', ''),
            "oauth_id": user_info.get('sub'),  # Google user ID
            "oauth_provider": "google",
            "role": UserRole.STUDENT.value,
            "phone": None,
            "department": None,
            "specializations": [],
            "is_active": True,
            "is_verified": True,  # OAuth users are automatically verified
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        
        result = db.db.users.insert_one(user_doc)
        existing_user = user_doc
        existing_user['_id'] = result.inserted_id
        
        audit_log(db.db, 'user', 'create', entity_id=str(result.inserted_id), new_values={
            'email': user_doc['email'],
            'role': user_doc['role'],
            'oauth_provider': 'google',
            'is_verified': True
        })
    
    # Create JWT token
    access_token = create_access_token(
        identity=str(existing_user['_id']),
        additional_claims={'role': existing_user.get('role', '')}
    )
    
    return jsonify({
        'access_token': access_token,
        'user_id': str(existing_user['_id']),
        'email': existing_user['email'],
        'first_name': existing_user.get('first_name', ''),
        'last_name': existing_user.get('last_name', ''),
        'picture': existing_user.get('picture', ''),
        'role': existing_user.get('role', UserRole.STUDENT.value),
    }), 200


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user with email verification"""
    data = request.get_json()
    
    # Validate required fields
    if not data.get('email') or not data.get('password') or not data.get('first_name') or not data.get('last_name'):
        return jsonify({'error': 'Missing required fields: email, password, first_name, last_name'}), 400
    
    email = data['email'].lower().strip()
    
    # Validate DLSU email domain
    if not email.endswith('@dlsu.edu.ph'):
        return jsonify({'error': 'Only DLSU email addresses (@dlsu.edu.ph) are allowed'}), 400
    
    # Check if email already exists
    existing_user = db.db.users.find_one({"email": email})
    if existing_user:
        if existing_user.get('is_verified'):
            return jsonify({'error': 'Email already registered'}), 409
        else:
            # User exists but not verified, send new code
            verification_code = EmailService.generate_verification_code()
            code_expiry = datetime.utcnow() + timedelta(hours=24)
            
            db.db.users.update_one(
                {"_id": existing_user['_id']},
                {"$set": {
                    "verification_code": verification_code,
                    "verification_code_expires": code_expiry,
                    "verification_attempts": 0
                }}
            )
            
            # Send verification email
            email_service.send_verification_email(
                email,
                data['first_name'],
                verification_code
            )
            
            return jsonify({
                'message': 'Verification code sent to your email',
                'email': email,
                'user_id': str(existing_user['_id'])
            }), 200
    
    # Create unverified user account
    verification_code = EmailService.generate_verification_code()
    code_expiry = datetime.utcnow() + timedelta(hours=24)
    
    user_doc = {
        "_id": ObjectId(),
        "email": email,
        "password_hash": generate_password_hash(data['password']),
        "first_name": data['first_name'],
        "last_name": data['last_name'],
        "role": data.get('role', UserRole.STUDENT.value),
        "phone": data.get('phone'),
        "department": data.get('department'),
        "specializations": data.get('specializations', []),
        "is_active": True,
        "is_verified": False,
        "verification_code": verification_code,
        "verification_code_expires": code_expiry,
        "verification_attempts": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    
    result = db.db.users.insert_one(user_doc)
    
    # Send verification email
    email_service.send_verification_email(
        email,
        data['first_name'],
        verification_code
    )
    
    audit_log(db.db, 'user', 'create', entity_id=str(result.inserted_id), new_values={
        'email': user_doc['email'],
        'role': user_doc['role'],
        'is_verified': False
    })
    
    return jsonify({
        'message': 'Account created. Please check your email for verification code.',
        'email': email,
        'user_id': str(result.inserted_id)
    }), 201


@auth_bp.route('/verify-email', methods=['POST'])
def verify_email():
    """Verify email with verification code"""
    data = request.get_json()
    
    if not data.get('email') or not data.get('code'):
        return jsonify({'error': 'Missing email or verification code'}), 400
    
    email = data['email'].lower().strip()
    code = data['code'].strip()
    
    user = db.db.users.find_one({"email": email})
    
    if not user:
        return jsonify({'error': 'Email not found'}), 404
    
    if user.get('is_verified'):
        return jsonify({'error': 'Email already verified'}), 400
    
    # Check code expiry
    if not user.get('verification_code_expires'):
        return jsonify({'error': 'No verification code requested'}), 400
    
    if user['verification_code_expires'] < datetime.utcnow():
        return jsonify({'error': 'Verification code expired. Please request a new code.'}), 400
    
    # Check attempts
    attempts = user.get('verification_attempts', 0)
    if attempts >= 5:
        return jsonify({'error': 'Too many failed attempts. Please request a new code.'}), 429
    
    # Verify code
    if user.get('verification_code') != code:
        db.db.users.update_one(
            {"_id": user['_id']},
            {"$inc": {"verification_attempts": 1}}
        )
        return jsonify({'error': 'Invalid verification code'}), 401
    
    # Verify successful - activate account
    db.db.users.update_one(
        {"_id": user['_id']},
        {"$set": {
            "is_verified": True,
            "verification_code": None,
            "verification_code_expires": None,
            "verification_attempts": 0,
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Send welcome email
    email_service.send_welcome_email(email, user['first_name'])
    
    audit_log(db.db, 'user', 'email_verified', entity_id=str(user['_id']), new_values={'is_verified': True})
    
    return jsonify({'message': 'Email verified successfully. You can now login.'}), 200


@auth_bp.route('/resend-code', methods=['POST'])
def resend_code():
    """Resend verification code"""
    data = request.get_json()
    
    if not data.get('email'):
        return jsonify({'error': 'Missing email'}), 400
    
    email = data['email'].lower().strip()
    user = db.db.users.find_one({"email": email})
    
    if not user:
        return jsonify({'error': 'Email not found'}), 404
    
    if user.get('is_verified'):
        return jsonify({'error': 'Email already verified'}), 400
    
    # Generate new code
    verification_code = EmailService.generate_verification_code()
    code_expiry = datetime.utcnow() + timedelta(hours=24)
    
    db.db.users.update_one(
        {"_id": user['_id']},
        {"$set": {
            "verification_code": verification_code,
            "verification_code_expires": code_expiry,
            "verification_attempts": 0
        }}
    )
    
    # Send email
    email_service.send_code_reminder_email(email, user['first_name'], verification_code)
    
    audit_log(db.db, 'user', 'resend_code', entity_id=str(user['_id']))
    
    return jsonify({'message': 'Verification code sent to your email'}), 200



@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user with email/password and return JWT token"""
    data = request.get_json()
    
    if not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing email or password'}), 400
    
    email = data['email'].lower().strip()
    user = db.db.users.find_one({"email": email})
    
    if user:
        pwd_check = check_password_hash(user['password_hash'], data['password']) if 'password_hash' in user else False
        if pwd_check:
            # Password is valid
            if not user.get('is_verified', True):
                return jsonify({
                    'error': 'Email not verified. Please check your email for verification code.',
                    'user_id': str(user['_id']),
                    'email': user['email']
                }), 403
            
            if not user.get('is_active', True):
                return jsonify({'error': 'User account is inactive'}), 403
            
            access_token = create_access_token(
                identity=str(user['_id']),
                additional_claims={'role': user.get('role', '')}
            )
            audit_log(db.db, 'auth', 'login', entity_id=str(user['_id']))
            
            return jsonify({
                'access_token': access_token,
                'user_id': str(user['_id']),
                'email': user['email'],
                'first_name': user['first_name'],
                'last_name': user['last_name'],
                'role': user['role'],
            }), 200
    
    # Invalid credentials - user not found or password wrong
    audit_log(db.db, 'access_control', 'failed_login', old_values={'email': email})
    return jsonify({'error': 'Invalid credentials'}), 401



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
    google_tokens = get_tokens(db.db, current_app.config, user_id, 'google')
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
