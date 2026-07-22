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
from limiter_instance import limiter
from services.oauth_service import OAuthService
from services.email_service import EmailService
from datetime import datetime, timedelta
from bson import ObjectId
import uuid
import os
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
        if not existing_user.get('is_active', True):
            return jsonify({'error': 'User account is inactive'}), 403

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
        'id_number': existing_user.get('id_number'),
        'phone': existing_user.get('phone'),
        'college': existing_user.get('college'),
        'course': existing_user.get('course'),
        'year': existing_user.get('year'),
        'emergency_contact': existing_user.get('emergency_contact'),
        'emergency_phone': existing_user.get('emergency_phone'),
        'emergency_contact_relationship': existing_user.get('emergency_contact_relationship'),
    }), 200


@auth_bp.route('/register', methods=['POST'])
@limiter.limit("5 per minute; 20 per hour")
def register():
    """Register a new user with email verification"""
    data = request.get_json()
    
    # Validate required fields
    if not data.get('email') or not data.get('password') or not data.get('first_name') or not data.get('last_name'):
        return jsonify({'error': 'Missing required fields: email, password, first_name, last_name'}), 400

    # Validate student ID number (optional at registration, set later via profile)
    id_number = data.get('id_number', '').strip()
    if id_number:
        if not id_number.isdigit() or len(id_number) != 8:
            return jsonify({'error': 'Student ID must be exactly 8 digits (e.g. 11234567)'}), 400
        if db.db.users.find_one({"id_number": id_number}):
            return jsonify({'error': 'Student ID already registered'}), 409

    email = data['email'].lower().strip()

    allowed_domain = current_app.config.get('ALLOWED_EMAIL_DOMAIN', '@dlsu.edu.ph')
    if not email.endswith(allowed_domain):
        return jsonify({'error': f'Only {allowed_domain} email addresses are allowed'}), 400

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
    verification_token = str(uuid.uuid4())
    code_expiry = datetime.utcnow() + timedelta(hours=24)

    user_doc = {
        "_id": ObjectId(),
        "email": email,
        "id_number": id_number,
        "password_hash": generate_password_hash(data['password']),
        "first_name": data['first_name'],
        "last_name": data['last_name'],
        "role": UserRole.STUDENT.value,
        "phone": data.get('phone'),
        "department": data.get('department'),
        "specializations": data.get('specializations', []),
        "is_active": True,
        "is_verified": False,
        "verification_code": verification_code,
        "verification_token": verification_token,
        "verification_code_expires": code_expiry,
        "verification_attempts": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    result = db.db.users.insert_one(user_doc)

    # Build clickable verify URL
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    verify_url = f"{frontend_url}/verify-email?token={verification_token}&email={email}"

    # Send verification email with button + code fallback
    email_service.send_verification_email(
        email,
        data['first_name'],
        verification_code,
        verify_url=verify_url
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


@auth_bp.route('/verify-email-link', methods=['GET'])
def verify_email_link():
    """Verify email via one-click link (token from email button)"""
    token = request.args.get('token', '').strip()
    if not token:
        return jsonify({'error': 'Missing verification token'}), 400

    user = db.db.users.find_one({"verification_token": token})
    if not user:
        return jsonify({'error': 'Invalid or expired verification link'}), 404

    if user.get('is_verified'):
        return jsonify({'message': 'Email already verified. You can log in.'}), 200

    if user.get('verification_code_expires') and user['verification_code_expires'] < datetime.utcnow():
        return jsonify({'error': 'Verification link has expired. Please request a new code.'}), 400

    db.db.users.update_one(
        {"_id": user['_id']},
        {"$set": {
            "is_verified": True,
            "verification_code": None,
            "verification_token": None,
            "verification_code_expires": None,
            "verification_attempts": 0,
            "updated_at": datetime.utcnow(),
        }}
    )

    email_service.send_welcome_email(user['email'], user['first_name'])
    audit_log(db.db, 'user', 'email_verified', entity_id=str(user['_id']), new_values={'is_verified': True, 'method': 'link'})

    return jsonify({'message': 'Email verified successfully. You can now log in.'}), 200


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
    
    # Generate new code and token
    verification_code = EmailService.generate_verification_code()
    verification_token = str(uuid.uuid4())
    code_expiry = datetime.utcnow() + timedelta(hours=24)

    db.db.users.update_one(
        {"_id": user['_id']},
        {"$set": {
            "verification_code": verification_code,
            "verification_token": verification_token,
            "verification_code_expires": code_expiry,
            "verification_attempts": 0,
        }}
    )

    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    verify_url = f"{frontend_url}/verify-email?token={verification_token}&email={email}"

    # Send email with button + code fallback
    email_service.send_verification_email(email, user['first_name'], verification_code, verify_url=verify_url)
    
    audit_log(db.db, 'user', 'resend_code', entity_id=str(user['_id']))
    
    return jsonify({'message': 'Verification code sent to your email'}), 200



@auth_bp.route('/login', methods=['POST'])
@limiter.limit("10 per minute; 50 per hour")
def login():
    """Login user with email or student ID + password, return JWT token"""
    data = request.get_json()

    # Accept 'identifier' (email or student ID) or legacy 'email' field
    identifier = (data.get('identifier') or data.get('email', '')).strip()
    if not identifier or not data.get('password'):
        return jsonify({'error': 'Missing email/student ID or password'}), 400

    # Look up user by email or student ID
    if '@' in identifier:
        user = db.db.users.find_one({"email": identifier.lower()})
    else:
        user = db.db.users.find_one({"id_number": identifier})

    if user:
        pwd_check = check_password_hash(user['password_hash'], data['password']) if user.get('password_hash') else False
        if pwd_check:
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
                'id_number': user.get('id_number', ''),
                'first_name': user['first_name'],
                'last_name': user['last_name'],
                'role': user['role'],
                'phone': user.get('phone', ''),
                'college': user.get('college'),
                'course': user.get('course'),
                'year': user.get('year'),
                'emergency_contact': user.get('emergency_contact'),
                'emergency_phone': user.get('emergency_phone'),
                'emergency_contact_relationship': user.get('emergency_contact_relationship'),
            }), 200

    audit_log(db.db, 'access_control', 'failed_login', old_values={'identifier': identifier})
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
    valid_roles = [r.value for r in UserRole]
    if data.get('role') not in valid_roles:
        return jsonify({'error': f"Invalid role. Must be one of: {valid_roles}"}), 400
    
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

    # Resolve actor names in one batch
    actor_ids = [log['user_id'] for log in logs if log.get('user_id')]
    users_map = {}
    if actor_ids:
        for u in db.db.users.find({'_id': {'$in': actor_ids}}, {'first_name': 1, 'last_name': 1, 'role': 1}):
            users_map[str(u['_id'])] = f"{u.get('first_name', '')} {u.get('last_name', '')}".strip() or str(u['_id'])

    for log in logs:
        log['_id'] = str(log['_id'])
        uid = str(log.get('user_id', '')) if log.get('user_id') else None
        log['user_id'] = uid
        log['actor_name'] = users_map.get(uid, 'System') if uid else 'System'
        if 'timestamp' in log:
            log['timestamp'] = log['timestamp'].isoformat()

    return jsonify(logs), 200


@auth_bp.route('/roles', methods=['GET'])
def get_roles():
    """Get available roles"""
    roles = [role.value for role in UserRole]
    return jsonify(roles), 200


@auth_bp.route('/forgot-password', methods=['POST'])
@limiter.limit("3 per minute; 10 per hour")
def forgot_password():
    """Send password reset link to email"""
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    if not email:
        return jsonify({'error': 'Email is required'}), 400

    user = db.db.users.find_one({'email': email})
    # Always return 200 to avoid user enumeration
    if not user:
        return jsonify({'message': 'If that email is registered, a reset link has been sent'}), 200

    reset_token = str(uuid.uuid4())
    expiry = datetime.utcnow() + timedelta(hours=1)
    db.db.users.update_one(
        {'_id': user['_id']},
        {'$set': {'reset_token': reset_token, 'reset_token_expiry': expiry}}
    )

    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    reset_url = f"{frontend_url}/reset-password?token={reset_token}"
    first_name = user.get('first_name', 'User')

    html_body = f"""<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;background:#f3f4f6;padding:40px 16px;">
  <table width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
    <tr><td style="background:#4f46e5;padding:32px 40px;">
      <p style="margin:0;color:#c7d2fe;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">{current_app.config.get('ORG_UNIVERSITY','De La Salle University')} &mdash; {current_app.config.get('ORG_NAME','Counseling &amp; Psychological Services')}</p>
    </td></tr>
    <tr><td style="padding:36px 40px;">
      <h1 style="margin:0 0 16px;font-size:22px;color:#111827;">Reset your password</h1>
      <p style="color:#4b5563;font-size:14px;line-height:1.6;">Hi {first_name},<br><br>We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.</p>
      <div style="text-align:center;margin:32px 0;">
        <a href="{reset_url}" style="display:inline-block;background:#4f46e5;color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;">Reset Password</a>
      </div>
      <p style="font-size:12px;color:#9ca3af;">If you didn't request this, you can safely ignore this email.</p>
    </td></tr>
  </table>
</body></html>"""

    email_service._send_email(email, f"Reset Your {current_app.config.get('ORG_SHORT','DLSU CPS')} Password", html_body)
    return jsonify({'message': 'If that email is registered, a reset link has been sent'}), 200


@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Change password for a logged-in user (requires current password)"""
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    current_password = data.get('current_password', '').strip()
    new_password = data.get('new_password', '').strip()

    if not current_password or not new_password:
        return jsonify({'error': 'current_password and new_password are required'}), 400
    if len(new_password) < 8:
        return jsonify({'error': 'New password must be at least 8 characters'}), 400

    user = db.db.users.find_one({'_id': ObjectId(user_id)})
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if not user.get('password_hash'):
        return jsonify({'error': 'This account uses Google login — password cannot be changed here'}), 400

    if not check_password_hash(user['password_hash'], current_password):
        return jsonify({'error': 'Current password is incorrect'}), 401

    db.db.users.update_one(
        {'_id': user['_id']},
        {'$set': {'password_hash': generate_password_hash(new_password), 'updated_at': datetime.utcnow()}}
    )
    audit_log(db.db, 'auth', 'change_password', entity_id=user_id)
    return jsonify({'message': 'Password changed successfully'}), 200


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset password using token"""
    data = request.get_json() or {}
    token = data.get('token', '').strip()
    new_password = data.get('password', '').strip()

    if not token or not new_password:
        return jsonify({'error': 'Token and new password are required'}), 400
    if len(new_password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400

    user = db.db.users.find_one({'reset_token': token})
    if not user:
        return jsonify({'error': 'Invalid or expired reset link'}), 400
    if user.get('reset_token_expiry') and datetime.utcnow() > user['reset_token_expiry']:
        return jsonify({'error': 'Reset link has expired. Please request a new one.'}), 400

    db.db.users.update_one(
        {'_id': user['_id']},
        {'$set': {'password_hash': generate_password_hash(new_password)},
         '$unset': {'reset_token': '', 'reset_token_expiry': ''}}
    )
    return jsonify({'message': 'Password reset successfully'}), 200
