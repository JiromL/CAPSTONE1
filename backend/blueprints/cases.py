"""
Case Management Blueprint
Handles case CRUD, assignment, session tracking, and role-based access
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from bson.objectid import ObjectId
from models import db, UserRole, CaseStatus, CaseType, RiskLevel, PermissionType, ROLE_PERMISSIONS

cases_bp = Blueprint('cases', __name__, url_prefix='/api/cases')


def has_permission(user_role, permission):
    """Check if user role has permission"""
    return permission in ROLE_PERMISSIONS.get(user_role, set())


def get_cases_for_user(user_id, user_role):
    """Get cases filtered by role"""
    if user_role == UserRole.DPO or user_role == UserRole.ADMIN:
        # DPO and ADMIN see all cases
        return {}
    elif user_role in [UserRole.PSYCHOLOGIST, UserRole.COUNSELOR]:
        # PSYCHOLOGIST/COUNSELOR see only cases assigned to them
        return {'assigned_counselor_id': ObjectId(user_id)}
    elif user_role == UserRole.IC:
        # IC sees new/pending intake cases
        return {'status': {'$in': [CaseStatus.NEW.value, CaseStatus.INTAKE_SCHEDULED.value]}}
    elif user_role == UserRole.STUDENT:
        # STUDENT sees only their own case
        return {'student_id': ObjectId(user_id)}
    else:
        return None  # No access


@cases_bp.route('', methods=['GET'])
@jwt_required()
def get_cases():
    """Get cases based on role"""
    user_id = get_jwt_identity()
    user = db.db.users.find_one({'_id': ObjectId(user_id)})
    
    if not user:
        return jsonify({'error': 'User not found'}), 401
    
    user_role = user.get('role')
    query = get_cases_for_user(user_id, user_role)
    
    if query is None:
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    # Apply filters
    filters = {}
    if request.args.get('status'):
        filters['status'] = request.args.get('status')
    if request.args.get('case_type'):
        filters['case_type'] = request.args.get('case_type')
    if request.args.get('risk_level'):
        filters['risk_level'] = request.args.get('risk_level')
    
    query.update(filters)
    
    # Get cases
    cases = []
    for case in db.db.cases.find(query).sort('created_at', -1):
        case['_id'] = str(case['_id'])
        if case.get('student_id'):
            case['student_id'] = str(case['student_id'])
        if case.get('assigned_counselor_id'):
            case['assigned_counselor_id'] = str(case['assigned_counselor_id'])
        if case.get('intake_counselor_id'):
            case['intake_counselor_id'] = str(case['intake_counselor_id'])
        cases.append(case)
    
    return jsonify({
        'count': len(cases),
        'role': user_role,
        'cases': cases
    }), 200


@cases_bp.route('', methods=['POST'])
@jwt_required()
def create_case():
    """Create new case (New Client Intake)"""
    user_id = get_jwt_identity()
    user = db.db.users.find_one({'_id': ObjectId(user_id)})
    
    if not user or user.get('role') != UserRole.STUDENT:
        # Students request their own intake; IC can create for referrals
        if user and user.get('role') != UserRole.IC:
            return jsonify({'error': 'Only students and IC can create cases'}), 403
    
    data = request.get_json()
    
    # Validate required fields
    if not data.get('student_id'):
        student_id = ObjectId(user_id) if user.get('role') == UserRole.STUDENT else None
        if not student_id and not data.get('student_id'):
            return jsonify({'error': 'student_id required'}), 400
    else:
        student_id = ObjectId(data['student_id'])
    
    # Create case
    new_case = {
        'student_id': student_id,
        'intake_counselor_id': ObjectId(user_id) if user.get('role') == UserRole.IC else None,
        'assigned_counselor_id': None,  # Assigned after intake
        'status': CaseStatus.NEW.value,
        'case_type': data.get('case_type', CaseType.DEVELOPMENTAL.value),
        'presenting_issue': data.get('presenting_issue', ''),
        'risk_level': data.get('risk_level', RiskLevel.GREEN.value),
        
        # NEW: Client status and transaction tracking
        'client_status': data.get('client_status', 'ACTIVE'),  # ACTIVE, INACTIVE, CHECK_IN_ONLY, etc.
        'transaction_type': data.get('transaction_type', 'NEW_INTAKE'),  # NEW_INTAKE, CHECK_IN, SELF_REFERRED, etc.
        'primary_concern': data.get('presenting_issue', ''),  # Can differ from presenting issue
        
        'session_count': 0,
        'target_sessions': data.get('target_sessions'),
        'sessions': [],
        'check_ins': [],  # Track check-in history
        'last_session_date': None,
        'next_appointment': data.get('next_appointment'),
        'notes': [],
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow(),
    }
    
    result = db.db.cases.insert_one(new_case)
    
    return jsonify({
        'success': True,
        'case_id': str(result.inserted_id),
        'message': 'Case created successfully'
    }), 201


@cases_bp.route('/<case_id>', methods=['GET'])
@jwt_required()
def get_case(case_id):
    """Get case details"""
    user_id = get_jwt_identity()
    user = db.db.users.find_one({'_id': ObjectId(user_id)})
    
    if not user:
        return jsonify({'error': 'User not found'}), 401
    
    try:
        case = db.db.cases.find_one({'_id': ObjectId(case_id)})
    except:
        return jsonify({'error': 'Invalid case ID'}), 400
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    # Check access
    user_role = user.get('role')
    if user_role == UserRole.STUDENT and str(case['student_id']) != user_id:
        return jsonify({'error': 'Cannot view other student cases'}), 403
    elif user_role in [UserRole.PSYCHOLOGIST, UserRole.COUNSELOR]:
        if case.get('assigned_counselor_id') and str(case['assigned_counselor_id']) != user_id:
            return jsonify({'error': 'Case not assigned to you'}), 403
    elif user_role == UserRole.IC and case['status'] not in [CaseStatus.NEW.value, CaseStatus.INTAKE_SCHEDULED.value]:
        return jsonify({'error': 'IC can only view new/pending cases'}), 403
    
    # Format response
    case['_id'] = str(case['_id'])
    case['student_id'] = str(case['student_id'])
    if case.get('assigned_counselor_id'):
        case['assigned_counselor_id'] = str(case['assigned_counselor_id'])
    if case.get('intake_counselor_id'):
        case['intake_counselor_id'] = str(case['intake_counselor_id'])
    
    return jsonify(case), 200


@cases_bp.route('/<case_id>', methods=['PUT'])
@jwt_required()
def update_case(case_id):
    """Update case"""
    user_id = get_jwt_identity()
    user = db.db.users.find_one({'_id': ObjectId(user_id)})
    
    if not user:
        return jsonify({'error': 'User not found'}), 401
    
    try:
        case = db.db.cases.find_one({'_id': ObjectId(case_id)})
    except:
        return jsonify({'error': 'Invalid case ID'}), 400
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    # Check permissions
    user_role = user.get('role')
    if not has_permission(user_role, PermissionType.EDIT_CASE):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    # Verify access
    if user_role in [UserRole.PSYCHOLOGIST, UserRole.COUNSELOR]:
        if str(case.get('assigned_counselor_id')) != user_id:
            return jsonify({'error': 'Case not assigned to you'}), 403
    
    data = request.get_json()
    
    # Update allowed fields
    updates = {}
    if 'status' in data:
        updates['status'] = data['status']
    if 'risk_level' in data:
        updates['risk_level'] = data['risk_level']
    if 'presenting_issue' in data:
        updates['presenting_issue'] = data['presenting_issue']
    if 'target_sessions' in data:
        updates['target_sessions'] = data['target_sessions']
    if 'next_appointment' in data:
        updates['next_appointment'] = data['next_appointment']
    
    updates['updated_at'] = datetime.utcnow()
    
    db.db.cases.update_one({'_id': ObjectId(case_id)}, {'$set': updates})
    
    return jsonify({
        'success': True,
        'message': 'Case updated'
    }), 200


@cases_bp.route('/<case_id>/assign', methods=['PUT'])
@jwt_required()
def assign_case(case_id):
    """Assign case to counselor (IC/DPO only)"""
    user_id = get_jwt_identity()
    user = db.db.users.find_one({'_id': ObjectId(user_id)})
    
    if not user or user.get('role') not in [UserRole.IC, UserRole.DPO, UserRole.ADMIN]:
        return jsonify({'error': 'Only IC/DPO can assign cases'}), 403
    
    try:
        case = db.db.cases.find_one({'_id': ObjectId(case_id)})
    except:
        return jsonify({'error': 'Invalid case ID'}), 400
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    data = request.get_json()
    counselor_id = data.get('assigned_counselor_id')
    case_type = data.get('case_type', case.get('case_type'))
    
    if not counselor_id:
        return jsonify({'error': 'assigned_counselor_id required'}), 400
    
    # Verify counselor exists
    counselor = db.db.users.find_one({'_id': ObjectId(counselor_id)})
    if not counselor or counselor.get('role') not in [UserRole.PSYCHOLOGIST, UserRole.COUNSELOR]:
        return jsonify({'error': 'Invalid counselor'}), 400
    
    # Update case
    db.db.cases.update_one(
        {'_id': ObjectId(case_id)},
        {'$set': {
            'assigned_counselor_id': ObjectId(counselor_id),
            'case_type': case_type,
            'status': CaseStatus.ACTIVE.value,
            'updated_at': datetime.utcnow()
        }}
    )
    
    return jsonify({
        'success': True,
        'message': f'Case assigned to {counselor["first_name"]} {counselor["last_name"]}'
    }), 200


@cases_bp.route('/<case_id>/sessions', methods=['POST'])
@jwt_required()
def add_session(case_id):
    """Add session record"""
    user_id = get_jwt_identity()
    user = db.db.users.find_one({'_id': ObjectId(user_id)})
    
    if not user:
        return jsonify({'error': 'User not found'}), 401
    
    try:
        case = db.db.cases.find_one({'_id': ObjectId(case_id)})
    except:
        return jsonify({'error': 'Invalid case ID'}), 400
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    # Verify access
    if str(case.get('assigned_counselor_id')) != user_id:
        return jsonify({'error': 'Case not assigned to you'}), 403
    
    data = request.get_json()
    
    session = {
        'date': data.get('date', datetime.utcnow().isoformat()),
        'duration_minutes': data.get('duration_minutes'),
        'notes': data.get('notes', ''),
        'created_at': datetime.utcnow()
    }
    
    # Increment session count and add session
    db.db.cases.update_one(
        {'_id': ObjectId(case_id)},
        {
            '$inc': {'session_count': 1},
            '$push': {'sessions': session},
            '$set': {
                'last_session_date': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }
        }
    )
    
    return jsonify({
        'success': True,
        'session_count': case.get('session_count', 0) + 1,
        'message': 'Session recorded'
    }), 201


@cases_bp.route('/<case_id>/close', methods=['PUT'])
@jwt_required()
def close_case(case_id):
    """Close/terminate case"""
    user_id = get_jwt_identity()
    user = db.db.users.find_one({'_id': ObjectId(user_id)})
    
    if not user:
        return jsonify({'error': 'User not found'}), 401
    
    try:
        case = db.db.cases.find_one({'_id': ObjectId(case_id)})
    except:
        return jsonify({'error': 'Invalid case ID'}), 400
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    # Check permissions
    user_role = user.get('role')
    if user_role in [UserRole.PSYCHOLOGIST, UserRole.COUNSELOR]:
        if str(case.get('assigned_counselor_id')) != user_id:
            return jsonify({'error': 'Case not assigned to you'}), 403
    elif user_role not in [UserRole.DPO, UserRole.ADMIN]:
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    data = request.get_json()
    
    db.db.cases.update_one(
        {'_id': ObjectId(case_id)},
        {'$set': {
            'status': CaseStatus.CLOSED.value,
            'termination_reason': data.get('termination_reason'),
            'termination_date': datetime.utcnow(),
            'final_notes': data.get('final_notes'),
            'updated_at': datetime.utcnow()
        }}
    )
    
    return jsonify({
        'success': True,
        'message': 'Case closed'
    }), 200


@cases_bp.route('/<case_id>/status', methods=['PUT'])
@jwt_required()
def update_client_status(case_id):
    """Update client status (ACTIVE, INACTIVE, CHECK_IN_ONLY, etc.)"""
    user_id = get_jwt_identity()
    user = db.db.users.find_one({'_id': ObjectId(user_id)})
    
    if not user:
        return jsonify({'error': 'User not found'}), 401
    
    # Check permission
    if not has_permission(user.get('role'), PermissionType.EDIT_CASE):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        case = db.db.cases.find_one({'_id': ObjectId(case_id)})
    except:
        return jsonify({'error': 'Invalid case ID'}), 400
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    data = request.get_json()
    
    new_status = data.get('client_status')
    if not new_status:
        return jsonify({'error': 'client_status is required'}), 400
    
    # Validate status
    valid_statuses = ['ACTIVE', 'INACTIVE', 'CHECK_IN_ONLY', 'WITH_MH_CHECK_IN', 
                      'UNDER_ACCOMMODATION', 'TERMINATION_PENDING']
    if new_status not in valid_statuses:
        return jsonify({'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'}), 400
    
    update_fields = {
        'client_status': new_status,
        'updated_at': datetime.utcnow()
    }
    
    # Also update primary concern if provided
    if data.get('primary_concern'):
        update_fields['primary_concern'] = data['primary_concern']
    
    # Add reason/notes if provided
    if data.get('reason'):
        update_fields['status_change_reason'] = data['reason']
    
    db.db.cases.update_one(
        {'_id': ObjectId(case_id)},
        {'$set': update_fields}
    )
    
    return jsonify({
        'success': True,
        'case_id': str(case['_id']),
        'client_status': new_status,
        'message': f'Client status updated to {new_status}'
    }), 200

