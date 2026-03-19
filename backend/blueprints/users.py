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
            'updated_at': datetime.utcnow()
        }
        
        if phone:
            update_data['phone'] = phone
        
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
            'created_at': user.get('created_at').isoformat() if user.get('created_at') else None,
        }), 200
    
    except Exception as e:
        print(f'Error fetching profile: {str(e)}')
        return jsonify({'error': 'Failed to fetch profile'}), 500
