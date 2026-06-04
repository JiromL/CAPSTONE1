"""
Users management blueprint for profile updates and user info
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db
from bson import ObjectId
from utils import audit_log
from datetime import datetime

users_bp = Blueprint('users', __name__, url_prefix='/api/users')


@users_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update user profile (name, email, phone)"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    # Validate required fields
    first_name = data.get('first_name', '').strip()
    last_name = data.get('last_name', '').strip()
    email = data.get('email', '').strip().lower()
    phone = data.get('phone', '').strip()
    
    if not first_name:
        return jsonify({'error': 'First name is required'}), 400
    
    if not last_name:
        return jsonify({'error': 'Last name is required'}), 400
    
    if not email or '@' not in email:
        return jsonify({'error': 'Valid email is required'}), 400
    
    try:
        # Check if email already exists for another user
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        existing_user = db.db.users.find_one({
            'email': email,
            '_id': {'$ne': user_id_obj}
        })
        
        if existing_user:
            return jsonify({'error': 'Email already in use by another user'}), 409
        
        # Update user profile
        update_data = {
            'first_name': first_name,
            'last_name': last_name,
            'email': email,
            'phone': phone,
            'updated_at': datetime.utcnow()
        }

        optional_fields = ['id_number', 'course', 'major', 'year',
                           'emergency_contact', 'emergency_phone']
        for field in optional_fields:
            if data.get(field) is not None:
                update_data[field] = data[field]
        
        result = db.db.users.update_one(
            {'_id': user_id_obj},
            {'$set': update_data}
        )
        
        if result.matched_count == 0:
            return jsonify({'error': 'User not found'}), 404
        
        # Audit log
        audit_log(db.db, 'users', 'profile_updated', entity_id=user_id)
        
        # Return updated user data
        updated_user = db.db.users.find_one({'_id': user_id_obj})
        
        return jsonify({
            'message': 'Profile updated successfully',
            'user': {
                '_id': str(updated_user['_id']),
                'first_name': updated_user.get('first_name'),
                'last_name': updated_user.get('last_name'),
                'email': updated_user.get('email'),
                'phone': updated_user.get('phone'),
                'role': updated_user.get('role'),
                'id_number': updated_user.get('id_number'),
                'course': updated_user.get('course'),
                'major': updated_user.get('major'),
                'year': updated_user.get('year'),
                'emergency_contact': updated_user.get('emergency_contact'),
                'emergency_phone': updated_user.get('emergency_phone'),
            }
        }), 200
    
    except Exception as e:
        print(f'Error updating profile: {str(e)}')
        return jsonify({'error': 'Failed to update profile'}), 500


@users_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """Get current user profile"""
    user_id = get_jwt_identity()
    
    try:
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        user = db.db.users.find_one(
            {'_id': user_id_obj},
            {'password_hash': 0}
        )
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            '_id': str(user['_id']),
            'first_name': user.get('first_name'),
            'last_name': user.get('last_name'),
            'email': user.get('email'),
            'phone': user.get('phone'),
            'role': user.get('role'),
            'id_number': user.get('id_number'),
            'course': user.get('course'),
            'major': user.get('major'),
            'year': user.get('year'),
            'emergency_contact': user.get('emergency_contact'),
            'emergency_phone': user.get('emergency_phone'),
            'created_at': user.get('created_at').isoformat() if user.get('created_at') else None,
        }), 200
    
    except Exception as e:
        print(f'Error fetching profile: {str(e)}')
        return jsonify({'error': 'Failed to fetch profile'}), 500


@users_bp.route('/all', methods=['GET'])
@jwt_required()
def get_all_users():
    """Get all users (admin only)"""
    user_id = get_jwt_identity()
    
    try:
        # Check if user is admin
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        current_user = db.db.users.find_one({'_id': user_id_obj})
        
        print(f'[Users/All] Current user: {current_user.get("email") if current_user else "NOT FOUND"}, Role: {current_user.get("role") if current_user else "NONE"}')
        
        if not current_user:
            return jsonify({'error': 'User not found', 'user_id': str(user_id_obj)}), 404
        
        if current_user.get('role') != 'ADMIN':
            return jsonify({'error': f'Unauthorized - admin access required. Your role: {current_user.get("role")}'}), 403
        
        # Get all users
        users = list(db.db.users.find(
            {},
            {'password_hash': 0}  # Exclude passwords
        ))
        
        print(f'[Users/All] Found {len(users)} users')
        
        # Format user data
        formatted_users = []
        for user in users:
            formatted_users.append({
                '_id': str(user['_id']),
                'name': user.get('name') or f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
                'email': user.get('email'),
                'role': user.get('role', 'STUDENT'),
                'is_active': user.get('is_active', True),
                'created_at': user.get('created_at').isoformat() if user.get('created_at') else None,
                'department': user.get('department', ''),
            })
        
        return jsonify({
            'users': formatted_users,
            'count': len(formatted_users)
        }), 200
    
    except Exception as e:
        print(f'[Users/All] Error fetching all users: {str(e)}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to fetch users: {str(e)}'}), 500


@users_bp.route('', methods=['GET'])
@jwt_required()
def list_users_by_role():
    """List users filtered by role. Accessible to STAFF and ADMIN."""
    user_id = get_jwt_identity()
    try:
        current = db.db.users.find_one({'_id': ObjectId(user_id) if isinstance(user_id, str) else user_id})
    except Exception:
        current = None
    if not current or current.get('role') not in ('STAFF', 'ADMIN', 'CSP', 'CSC', 'PSYCHOLOGIST', 'COUNSELOR', 'IC'):
        return jsonify({'error': 'Insufficient permissions'}), 403

    role = request.args.get('role')
    q = request.args.get('q', '').strip()
    query = {'role': role} if role else {}
    if q:
        import re
        pattern = re.compile(re.escape(q), re.IGNORECASE)
        query['$or'] = [
            {'first_name': {'$regex': pattern}},
            {'last_name': {'$regex': pattern}},
            {'email': {'$regex': pattern}},
        ]
    users = list(db.db.users.find(query, {'password_hash': 0}).limit(50))
    result = []
    for u in users:
        result.append({
            '_id': str(u['_id']),
            'first_name': u.get('first_name', ''),
            'last_name': u.get('last_name', ''),
            'email': u.get('email', ''),
            'role': u.get('role', ''),
        })
    return jsonify({'users': result, 'count': len(result)}), 200


@users_bp.route('/<user_id>/role', methods=['PUT'])
@jwt_required()
def update_user_role(user_id):
    """Update user role (admin only)"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    # Valid roles
    VALID_ROLES = ['ADMIN', 'DPO', 'COUNSELOR', 'PSYCHOLOGIST', 'CSC', 'CSP', 'IC', 'STAFF', 'STUDENT']
    
    try:
        # Check if current user is admin
        current_user_id_obj = ObjectId(current_user_id) if isinstance(current_user_id, str) else current_user_id
        current_user = db.db.users.find_one({'_id': current_user_id_obj})
        
        print(f'[Users/Role] Admin: {current_user.get("email") if current_user else "NOT FOUND"}, Role: {current_user.get("role") if current_user else "NONE"}')
        
        if not current_user:
            return jsonify({'error': 'Current user not found'}), 404
        
        if current_user.get('role') != 'ADMIN':
            return jsonify({'error': f'Unauthorized - admin access required. Your role: {current_user.get("role")}'}), 403
        
        # Validate new role
        new_role = data.get('role', '').strip().upper()
        if not new_role or new_role not in VALID_ROLES:
            return jsonify({'error': f'Invalid role. Valid roles: {", ".join(VALID_ROLES)}'}), 400
        
        # Get target user
        try:
            target_user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        except:
            return jsonify({'error': 'Invalid user ID format'}), 400
        
        target_user = db.db.users.find_one({'_id': target_user_id_obj})
        
        if not target_user:
            return jsonify({'error': 'Target user not found'}), 404
        
        old_role = target_user.get('role', 'STUDENT')
        
        # Prevent self-demotion from ADMIN (optional safety check)
        if str(target_user_id_obj) == str(current_user_id_obj) and new_role != 'ADMIN':
            return jsonify({'error': 'Cannot demote yourself from admin role'}), 400
        
        # Update role
        result = db.db.users.update_one(
            {'_id': target_user_id_obj},
            {'$set': {
                'role': new_role,
                'updated_at': datetime.utcnow()
            }}
        )
        
        if result.matched_count == 0:
            return jsonify({'error': 'Failed to update user role'}), 500
        
        # Audit log
        audit_log(db.db, 'users', 'role_updated', entity_id=str(target_user_id_obj), 
                  old_values={'role': old_role}, new_values={'role': new_role})
        
        print(f'[Users/Role] Updated {target_user.get("email")} role from {old_role} to {new_role}')
        
        # Return updated user
        updated_user = db.db.users.find_one({'_id': target_user_id_obj})
        
        return jsonify({
            'message': 'Role updated successfully',
            'user': {
                '_id': str(updated_user['_id']),
                'name': updated_user.get('name') or f"{updated_user.get('first_name', '')} {updated_user.get('last_name', '')}".strip(),
                'email': updated_user.get('email'),
                'role': updated_user.get('role'),
                'old_role': old_role
            }
        }), 200
    
    except Exception as e:
        print(f'[Users/Role] Error updating role: {str(e)}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to update role: {str(e)}'}), 500
