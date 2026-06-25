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
        return {'assigned_counselor_id': ObjectId(user_id)}
    elif user_role == UserRole.IC:
        # IC sees new/pending intake cases (query both field names for compatibility)
        return {'$or': [
            {'case_status': {'$in': [CaseStatus.NEW.value, CaseStatus.INTAKE_SCHEDULED.value]}},
            {'status': {'$in': [CaseStatus.NEW.value, CaseStatus.INTAKE_SCHEDULED.value]}},
        ]}
    elif user_role == UserRole.STUDENT:
        # STUDENT sees only their own case
        return {'student_id': ObjectId(user_id)}
    else:
        return None  # No access


@cases_bp.route('/my-current', methods=['GET'])
@jwt_required()
def get_student_current_case():
    """Get current case for student (student view only)"""
    user_id = get_jwt_identity()
    user = db.db.users.find_one({'_id': ObjectId(user_id)})
    
    if not user or user.get('role') != 'STUDENT':
        return jsonify({'error': 'Students only'}), 403
    
    # Find student's case
    case = db.db.cases.find_one({'student_id': ObjectId(user_id)})
    
    if not case:
        return jsonify({
            'case': None,
            'message': 'No case found for this student'
        }), 200
    
    # Get assigned counselor name if any
    counselor_name = None
    if case.get('assigned_counselor_id'):
        counselor = db.db.users.find_one({'_id': ObjectId(case['assigned_counselor_id'])})
        counselor_name = counselor.get('name') if counselor else None
    
    return jsonify({
        'case': {
            '_id': str(case['_id']),
            'case_number': case.get('case_number'),
            'student_id': str(case.get('student_id')),
            'status': case.get('status'),
            'case_status': case.get('case_status'),
            'client_status': case.get('client_status'),  # ACTIVE, CHECK_IN_ONLY, etc
            'concern': case.get('presenting_issue') or case.get('primary_concern'),  # Concern/issue
            'case_type': case.get('case_type'),
            'assigned_counselor_id': str(case['assigned_counselor_id']) if case.get('assigned_counselor_id') else None,
            'counselor_name': counselor_name,
            'created_at': case.get('created_at').isoformat() if case.get('created_at') else None
        }
    }), 200


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
        filters['case_status'] = request.args.get('status')
    if request.args.get('case_type'):
        filters['case_type'] = request.args.get('case_type')
    if request.args.get('risk_level'):
        filters['risk_level'] = request.args.get('risk_level')
    
    query.update(filters)
    
    # Get cases
    cases = []
    for case in db.db.cases.find(query).sort('created_at', -1):
        serialized = {}
        for k, v in case.items():
            if isinstance(v, ObjectId):
                serialized[k] = str(v)
            elif isinstance(v, datetime):
                serialized[k] = v.isoformat()
            else:
                serialized[k] = v
        cases.append(serialized)
    
    return jsonify({
        'count': len(cases),
        'role': user_role,
        'cases': cases
    }), 200


@cases_bp.route('/checkin/create', methods=['POST'])
@jwt_required()
def create_checkin_case():
    """Create CHECK_IN_ONLY case for non-counseling referred students (Staff only)"""
    user_id = get_jwt_identity()
    user = db.db.users.find_one({'_id': ObjectId(user_id)})
    
    if not user or user.get('role') not in [UserRole.COUNSELOR, UserRole.PSYCHOLOGIST, UserRole.IC, UserRole.ADMIN, UserRole.DPO]:
        return jsonify({'error': 'Staff only'}), 403
    
    data = request.get_json()
    
    # Validate required fields
    if not data.get('student_id'):
        return jsonify({'error': 'student_id is required'}), 400
    if not data.get('concern'):
        return jsonify({'error': 'concern is required'}), 400
    if not data.get('client_status'):
        return jsonify({'error': 'client_status is required'}), 400
    
    # Get student
    try:
        student_obj_id = ObjectId(data['student_id'])
    except:
        return jsonify({'error': 'Invalid student_id format'}), 400
    
    student = db.db.users.find_one({'_id': student_obj_id})
    if not student or student.get('role') != UserRole.STUDENT:
        return jsonify({'error': 'Student not found'}), 404
    
    # Check if student already has active case
    existing_case = db.db.cases.find_one({'student_id': student_obj_id})
    if existing_case:
        return jsonify({'error': 'Student already has an active case'}), 409
    
    # Get counselor if assigned
    assigned_counselor_id = None
    if data.get('assigned_counselor_id'):
        try:
            assigned_counselor_id = ObjectId(data['assigned_counselor_id'])
            counselor = db.db.users.find_one({'_id': assigned_counselor_id})
            if not counselor or counselor.get('role') not in [UserRole.COUNSELOR, UserRole.PSYCHOLOGIST]:
                return jsonify({'error': 'Invalid counselor selected'}), 400
        except:
            return jsonify({'error': 'Invalid counselor_id format'}), 400
    
    # Valid client statuses for non-counseling
    valid_statuses = ['CHECK_IN_ONLY', 'WITH_MH_CHECK_IN', 'UNDER_ACCOMMODATION', 'ACTIVE', 'INACTIVE', 'TERMINATION_PENDING']
    if data['client_status'] not in valid_statuses:
        return jsonify({'error': f'Invalid client_status. Must be one of: {", ".join(valid_statuses)}'}), 400
    
    # Create case
    case_doc = {
        '_id': ObjectId(),
        'student_id': student_obj_id,
        'assigned_counselor_id': assigned_counselor_id,
        'case_status': CaseStatus.ACTIVE.value,  # Case itself is active
        'client_status': data['client_status'],  # Type of client (CHECK_IN_ONLY, etc)
        'presenting_issue': data['concern'],
        'primary_concern': data.get('primary_concern', data['concern']),
        'case_type': CaseType.DEVELOPMENTAL.value,  # Non-counseling cases are DEVELOPMENTAL type
        'risk_level': RiskLevel.GREEN.value,  # Default GREEN for check-in only
        'case_status': 'open',
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow(),
        'created_by': ObjectId(user_id) if isinstance(user_id, str) else user_id,
        'notes': data.get('notes', '')
    }
    
    result = db.db.cases.insert_one(case_doc)
    
    # Audit log
    from utils import audit_log
    audit_log(db.db, 'case', 'create_checkin', entity_id=str(result.inserted_id), user_id=user_id)
    
    return jsonify({
        'case_id': str(result.inserted_id),
        'student_id': data['student_id'],
        'student_name': student.get('name', 'Unknown'),
        'concern': data['concern'],
        'client_status': data['client_status'],
        'assigned_counselor_id': str(assigned_counselor_id) if assigned_counselor_id else None,
        'message': 'Check-in case created successfully'
    }), 201


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
        'case_status': CaseStatus.NEW.value,
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

    # Feature 5: capture initial PERMA label at case creation
    try:
        student_id_for_perma = student_id if student_id else ObjectId(user_id)
        student_doc = db.db.users.find_one({'_id': student_id_for_perma}, {'mhbot_username': 1})
        if student_doc and student_doc.get('mhbot_username'):
            from blueprints.mhbot_integration import get_perma_history, _get_user_token
            perma_token = _get_user_token(str(user_id))
            if perma_token:
                perma_result = get_perma_history(student_doc['mhbot_username'], perma_token, limit=1)
                if perma_result['success'] and perma_result['latest_label']:
                    db.db.cases.update_one(
                        {'_id': result.inserted_id},
                        {'$set': {
                            'initial_perma_label': perma_result['latest_label'],
                            'initial_perma_date': datetime.utcnow(),
                        }}
                    )
    except Exception:
        pass  # PERMA capture is best-effort

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
        pass  # clinical staff can view any case
    elif user_role == UserRole.IC:
        pass  # IC can view any case — they need full context during and after intake
    
    # Serialize all ObjectId and datetime fields safely
    raw_student_id = case.get('student_id')
    serialized = {}
    for k, v in case.items():
        if isinstance(v, ObjectId):
            serialized[k] = str(v)
        elif isinstance(v, datetime):
            serialized[k] = v.isoformat()
        else:
            serialized[k] = v

    # Embed student details so the frontend can show name/email without a second request
    if raw_student_id:
        student_doc = db.db.users.find_one(
            {'_id': raw_student_id},
            {'name': 1, 'email': 1, 'student_id': 1, 'mhbot_username': 1, 'college': 1, 'course': 1, 'program': 1, 'year_level': 1}
        )
        if student_doc:
            serialized['student'] = {
                'name': student_doc.get('name', ''),
                'email': student_doc.get('email', ''),
                'school_id': student_doc.get('student_id', ''),
                'mhbot_username': student_doc.get('mhbot_username', ''),
                'college': student_doc.get('college', ''),
                'course': student_doc.get('course', '') or student_doc.get('program', ''),
            }

    # Embed most recent appointment info (date, time, method) for IC form pre-fill.
    # Pre-intake appointments don't have case_id yet, so fall back to student_id.
    case_obj_id = case.get('_id')
    appt = db.db.appointments.find_one(
        {'case_id': case_obj_id},
        sort=[('created_at', -1)]
    )
    if not appt and raw_student_id:
        appt = db.db.appointments.find_one(
            {'student_id': raw_student_id},
            sort=[('created_at', -1)]
        )
    if appt:
        appt_start = appt.get('scheduled_start') or appt.get('requested_start') or appt.get('scheduled_date')
        serialized['appointment_info'] = {
            'date': appt_start.isoformat() if isinstance(appt_start, datetime) else appt_start,
            'method': appt.get('method') or appt.get('appointment_method') or appt.get('preferred_method') or '',
            'appointment_id': str(appt.get('_id', '')),
        }

    return jsonify(serialized), 200


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
        updates['case_status'] = data['status']
    if 'risk_level' in data:
        updates['risk_level'] = data['risk_level']
        # Crisis notification: if escalated to CRITICAL or RED, alert psychologists immediately
        new_risk = data['risk_level']
        old_risk = case.get('risk_level', '')
        if new_risk in ('CRITICAL', 'RED') and old_risk not in ('CRITICAL', 'RED'):
            psych_users = list(db.db.users.find({'role': {'$in': ['PSYCHOLOGIST', 'ADMIN']}, 'is_active': {'$ne': False}}, {'_id': 1}))
            now_ts = datetime.utcnow()
            student_name = case.get('student_name', 'Unknown student')
            for pu in psych_users:
                db.db.notifications.insert_one({
                    'type': 'CRISIS_ALERT',
                    'case_id': case_id,
                    'message': f'Code Red/CRITICAL: {student_name} — immediate clinical review required.',
                    'risk_level': new_risk,
                    'target_user_id': str(pu['_id']),
                    'read': False,
                    'created_at': now_ts,
                })
    if 'presenting_issue' in data:
        updates['presenting_issue'] = data['presenting_issue']
    if 'target_sessions' in data:
        updates['target_sessions'] = data['target_sessions']
    if 'next_appointment' in data:
        updates['next_appointment'] = data['next_appointment']
    if 'treatment_plan' in data:
        updates['treatment_plan'] = data['treatment_plan']
    if 'notes' in data:
        updates['notes'] = data['notes']
    
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
            'case_status': CaseStatus.ACTIVE.value,
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
            'case_status': CaseStatus.CLOSED.value,
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


# ── DSM-5 / ICD-10 Diagnosis endpoints ──────────────────────────────────────

@cases_bp.route('/<case_id>/intake-form', methods=['PUT'])
@jwt_required()
def save_intake_form(case_id):
    """Save IC Interview intake form for a case"""
    user_id = get_jwt_identity()
    user = db.db.users.find_one({'_id': ObjectId(user_id)})

    if not user or user.get('role') not in ('IC', 'COUNSELOR', 'PSYCHOLOGIST', 'ADMIN', 'DPO'):
        return jsonify({'error': 'Forbidden'}), 403

    try:
        cid = ObjectId(case_id)
    except Exception:
        return jsonify({'error': 'Invalid case ID'}), 400

    case = db.db.cases.find_one({'_id': cid})
    if not case:
        return jsonify({'error': 'Case not found'}), 404

    data = request.get_json() or {}

    db.db.cases.update_one(
        {'_id': cid},
        {'$set': {
            'intake_interview_form': data,
            'intake_form_updated_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        }}
    )

    return jsonify({'success': True}), 200


@cases_bp.route('/<case_id>/diagnoses', methods=['GET'])
@jwt_required()
def get_diagnoses(case_id):
    """Get all diagnoses for a case."""
    try:
        cid = ObjectId(case_id)
    except Exception:
        return jsonify({'error': 'Invalid case ID'}), 400
    case = db.db.cases.find_one({'_id': cid})
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    diagnoses = case.get('diagnoses', [])
    return jsonify({'diagnoses': diagnoses}), 200


@cases_bp.route('/<case_id>/diagnoses', methods=['POST'])
@jwt_required()
def add_diagnosis(case_id):
    """Add a diagnosis (DSM-5 or ICD-10) to a case."""
    user_id = get_jwt_identity()
    user = db.db.users.find_one({'_id': ObjectId(user_id) if isinstance(user_id, str) else user_id})
    if not user or user.get('role') not in ('COUNSELOR', 'PSYCHOLOGIST', 'IC', 'ADMIN'):
        return jsonify({'error': 'Forbidden'}), 403

    data = request.get_json() or {}
    code = data.get('code', '').strip()
    description = data.get('description', '').strip()
    if not code or not description:
        return jsonify({'error': 'code and description are required'}), 400

    diagnosis = {
        'code': code,
        'description': description,
        'type': data.get('type', 'primary'),         # primary | secondary | rule_out
        'system': data.get('system', 'DSM-5'),       # DSM-5 | ICD-10
        'added_by': str(user_id),
        'added_at': datetime.utcnow().isoformat(),
    }
    try:
        db.db.cases.update_one(
            {'_id': ObjectId(case_id)},
            {'$push': {'diagnoses': diagnosis}, '$set': {'updated_at': datetime.utcnow()}}
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    return jsonify({'success': True, 'diagnosis': diagnosis}), 201


@cases_bp.route('/<case_id>/diagnoses/<int:index>', methods=['DELETE'])
@jwt_required()
def remove_diagnosis(case_id, index):
    """Remove a diagnosis by its index in the array."""
    user_id = get_jwt_identity()
    user = db.db.users.find_one({'_id': ObjectId(user_id) if isinstance(user_id, str) else user_id})
    if not user or user.get('role') not in ('COUNSELOR', 'PSYCHOLOGIST', 'IC', 'ADMIN'):
        return jsonify({'error': 'Forbidden'}), 403
    try:
        case = db.db.cases.find_one({'_id': ObjectId(case_id)})
        if not case:
            return jsonify({'error': 'Case not found'}), 404
        diagnoses = case.get('diagnoses', [])
        if index < 0 or index >= len(diagnoses):
            return jsonify({'error': 'Index out of range'}), 400
        diagnoses.pop(index)
        db.db.cases.update_one(
            {'_id': ObjectId(case_id)},
            {'$set': {'diagnoses': diagnoses, 'updated_at': datetime.utcnow()}}
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    return jsonify({'success': True}), 200


