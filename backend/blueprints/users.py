"""
Users management blueprint for profile updates and user info
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, UserRole
from bson import ObjectId
from utils import audit_log, server_error
from datetime import datetime, timedelta

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
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        # The email is the login. Changing it here would skip verification, so it stays as is;
        # a change goes through CPS staff.
        current = db.db.users.find_one({'_id': user_id_obj}, {'email': 1}) or {}
        if current.get('email') and email != current['email'].lower():
            return jsonify({'error': 'Your email is your login and cannot be changed here. Please contact CPS to change it.'}), 400

        # Check if email already exists for another user
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

        optional_fields = ['id_number', 'college', 'course', 'major', 'year',
                           'emergency_contact', 'emergency_phone', 'emergency_contact_relationship']
        for field in optional_fields:
            if data.get(field) is not None:
                update_data[field] = data[field]
        if data.get('year'):
            update_data['year_level'] = data['year']   # analytics, seeds and the case page read year_level
        
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
                'phone': updated_user.get('phone') or updated_user.get('contact_number'),
                'role': updated_user.get('role'),
                'id_number': updated_user.get('id_number'),
                'college': updated_user.get('college'),
                'course': updated_user.get('course'),
                'major': updated_user.get('major'),
                'year': updated_user.get('year') or updated_user.get('year_level'),
                'emergency_contact': updated_user.get('emergency_contact'),
                'emergency_phone': updated_user.get('emergency_phone'),
                'emergency_contact_relationship': updated_user.get('emergency_contact_relationship'),
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
            'phone': user.get('phone') or user.get('contact_number'),
            'role': user.get('role'),
            'id_number': user.get('id_number'),
            'college': user.get('college'),
            'course': user.get('course'),
            'major': user.get('major'),
            'year': user.get('year') or user.get('year_level'),
            'emergency_contact': user.get('emergency_contact'),
            'emergency_phone': user.get('emergency_phone'),
            'emergency_contact_relationship': user.get('emergency_contact_relationship'),
            'created_at': user.get('created_at').isoformat() if user.get('created_at') else None,
            'ema_consent_given': user.get('ema_consent_given', False),
            'mhbot_username': user.get('mhbot_username'),
        }), 200
    
    except Exception as e:
        print(f'Error fetching profile: {str(e)}')
        return jsonify({'error': 'Failed to fetch profile'}), 500


@users_bp.route('/all', methods=['GET'])
@jwt_required()
def get_all_users():
    """Get all users with server-side search and pagination (admin/DPO only)."""
    user_id = get_jwt_identity()

    try:
        import re as _re
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        current_user = db.db.users.find_one({'_id': user_id_obj})

        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        if current_user.get('role') not in ('ADMIN', 'DPO'):
            return jsonify({'error': f'Unauthorized - admin access required. Your role: {current_user.get("role")}'}), 403

        # Pagination + search params
        try:
            page  = max(1, int(request.args.get('page', 1)))
            limit = min(100, max(1, int(request.args.get('limit', 25))))
        except ValueError:
            page, limit = 1, 25

        q           = request.args.get('q', '').strip()
        role_filter = request.args.get('role', '').strip().upper()

        query: dict = {}
        if role_filter:
            query['role'] = role_filter
        if q:
            pattern = _re.compile(_re.escape(q), _re.IGNORECASE)
            query['$or'] = [
                {'name': pattern}, {'email': pattern},
                {'first_name': pattern}, {'last_name': pattern},
                {'role': pattern},
            ]

        total = db.db.users.count_documents(query)
        skip  = (page - 1) * limit

        users = list(db.db.users.find(query, {'password_hash': 0}).skip(skip).limit(limit))

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
            'users':       formatted_users,
            'count':       len(formatted_users),
            'total':       total,
            'page':        page,
            'limit':       limit,
            'total_pages': max(1, (total + limit - 1) // limit),
        }), 200

    except Exception as e:
        import traceback; traceback.print_exc()
        return server_error(e, 'Failed to fetch users. Please try again.')


@users_bp.route('', methods=['GET'])
@jwt_required()
def list_users_by_role():
    """List users filtered by role. Accessible to STAFF and ADMIN."""
    user_id = get_jwt_identity()
    try:
        current = db.db.users.find_one({'_id': ObjectId(user_id) if isinstance(user_id, str) else user_id})
    except Exception:
        current = None
    if not current or current.get('role') not in ('STAFF', 'ADMIN', 'PSYCHOLOGIST', 'COUNSELOR', 'IC'):
        return jsonify({'error': 'Insufficient permissions'}), 403

    role  = request.args.get('role')
    roles = request.args.get('roles')  # comma-separated, e.g. roles=COUNSELOR,PSYCHOLOGIST
    q = request.args.get('q', '').strip()
    if roles:
        role_list = [r.strip().upper() for r in roles.split(',') if r.strip()]
        query = {'role': {'$in': role_list}}
    elif role:
        query = {'role': role.upper()}
    else:
        query = {}
    # Only return active accounts
    query['is_active'] = {'$ne': False}
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
    VALID_ROLES = ['ADMIN', 'DPO', 'COUNSELOR', 'PSYCHOLOGIST', 'IC', 'CASE_MANAGER', 'STAFF', 'STUDENT']
    
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
        return server_error(e, 'Failed to update role. Please try again.')


@users_bp.route('/<user_id>/status', methods=['PATCH'])
@jwt_required()
def toggle_user_status(user_id):
    """Activate or deactivate a user account (admin only)"""
    current_user_id = get_jwt_identity()
    data = request.get_json()

    try:
        current_user_id_obj = ObjectId(current_user_id) if isinstance(current_user_id, str) else current_user_id
        current_user = db.db.users.find_one({'_id': current_user_id_obj})

        if not current_user:
            return jsonify({'error': 'Current user not found'}), 404
        if current_user.get('role') != 'ADMIN':
            return jsonify({'error': f'Unauthorized - admin access required. Your role: {current_user.get("role")}'}), 403

        is_active = data.get('is_active')
        if not isinstance(is_active, bool):
            return jsonify({'error': 'is_active must be a boolean'}), 400

        try:
            target_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        except Exception:
            return jsonify({'error': 'Invalid user ID format'}), 400

        # Prevent self-deactivation
        if str(target_id_obj) == str(current_user_id_obj) and not is_active:
            return jsonify({'error': 'Cannot deactivate your own account'}), 400

        # When deactivating a clinical staff member, block if they have upcoming confirmed appointments
        if not is_active:
            target_user = db.db.users.find_one({'_id': target_id_obj})
            if target_user:
                target_role = target_user.get('role', '')
                clinical_roles = [UserRole.COUNSELOR.value, UserRole.PSYCHOLOGIST.value,
                                  UserRole.CASE_MANAGER.value]
                if target_role in clinical_roles:
                    upcoming = db.db.appointments.count_documents({
                        'counselor_id': target_id_obj,
                        'status': {'$in': ['CONFIRMED', 'APPROVED', 'MATCHED', 'CHECKED_IN']},
                        # appointment times are Philippine wall-clock time
                        'scheduled_start': {'$gt': datetime.utcnow() + timedelta(hours=8)},
                    })
                    if upcoming > 0:
                        return jsonify({
                            'error': (
                                f'Cannot deactivate: this user has {upcoming} upcoming confirmed '
                                f'appointment(s). Reassign or cancel them first.'
                            ),
                            'upcoming_appointments': upcoming,
                        }), 409
                    # Open cases would be left with a counselor who can no longer log in
                    open_cases = db.db.cases.count_documents({
                        'assigned_counselor_id': {'$in': [target_id_obj, str(target_id_obj)]},
                        'case_status': {'$in': ['NEW', 'INTAKE_SCHEDULED', 'ACTIVE', 'PENDING_TERMINATION']},
                    })
                    if open_cases > 0:
                        return jsonify({
                            'error': (
                                f'Cannot deactivate: this user still has {open_cases} open case(s). '
                                f'Reassign them to another counselor first.'
                            ),
                            'open_cases': open_cases,
                        }), 409

        result = db.db.users.update_one(
            {'_id': target_id_obj},
            {'$set': {'is_active': is_active, 'updated_at': datetime.utcnow()}}
        )

        if result.matched_count == 0:
            return jsonify({'error': 'User not found'}), 404

        action = 'activate' if is_active else 'deactivate'
        audit_log(db.db, 'users', action, entity_id=str(target_id_obj),
                  new_values={'is_active': is_active})

        return jsonify({
            'message': f'User {"activated" if is_active else "deactivated"} successfully',
            'user_id': str(target_id_obj),
            'is_active': is_active,
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return server_error(e, 'Failed to update user status. Please try again.')
