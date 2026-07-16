"""
Case Management Blueprint
Handles case CRUD, assignment, session tracking, and role-based access
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from bson.objectid import ObjectId
from models import db, UserRole, CaseStatus, CaseType, RiskLevel, PermissionType, ROLE_PERMISSIONS, TerminationType
from utils import serialize_doc

cases_bp = Blueprint('cases', __name__, url_prefix='/api/cases')


def has_permission(user_role, permission):
    """Check if user role has permission"""
    return permission in ROLE_PERMISSIONS.get(user_role, set())



def get_cases_for_user(user_id, user_role):
    """Get cases filtered by role"""
    if user_role in [UserRole.DPO, UserRole.ADMIN, UserRole.CASE_MANAGER]:
        # These roles see all cases
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
    
    # Apply simple key filters
    if request.args.get('case_type'):
        query['case_type'] = request.args.get('case_type')
    if request.args.get('risk_level'):
        query['risk_level'] = request.args.get('risk_level')

    # Status filter: walk-in cases store in case_status, triage cases store in status
    if request.args.get('status'):
        status_val = request.args.get('status')
        status_cond = {'$or': [{'case_status': status_val}, {'status': status_val}]}
        if '$or' in query:
            # Safely combine with existing $or (e.g. IC role filter)
            existing_and = query.pop('$and', [])
            existing_and.append({'$or': query.pop('$or')})
            existing_and.append(status_cond)
            query['$and'] = existing_and
        else:
            query.update(status_cond)
    
    # Get cases
    cases = [serialize_doc(case) for case in db.db.cases.find(query).sort('created_at', -1)]

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
    
    if not user or user.get('role') not in [UserRole.COUNSELOR, UserRole.PSYCHOLOGIST, UserRole.IC, UserRole.CASE_MANAGER, UserRole.ADMIN, UserRole.DPO]:
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
        'case_status': CaseStatus.ACTIVE.value,
        'client_status': data['client_status'],
        'presenting_issue': data['concern'],
        'primary_concern': data.get('primary_concern', data['concern']),
        'case_type': CaseType.DEVELOPMENTAL.value,
        'risk_level': RiskLevel.GREEN.value,
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

    # Prevent duplicate active cases — a student can only have one non-closed case at a time
    existing_active = db.db.cases.find_one({
        'student_id': student_id,
        '$or': [
            {'case_status': {'$nin': [CaseStatus.CLOSED.value, CaseStatus.CANCELLED.value]}},
            {'status':      {'$nin': [CaseStatus.CLOSED.value, CaseStatus.CANCELLED.value]}},
        ]
    })
    if existing_active:
        return jsonify({
            'error': 'Student already has an active case',
            'existing_case_id': str(existing_active['_id']),
        }), 409

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
    elif user_role in [UserRole.PSYCHOLOGIST, UserRole.COUNSELOR, UserRole.IC, UserRole.CASE_MANAGER, UserRole.ADMIN, UserRole.DPO]:
        pass  # clinical staff and oversight roles can view any case
    
    # Serialize all ObjectId and datetime fields safely (including nested structures)
    raw_student_id = case.get('student_id')
    serialized = {k: serialize_doc(v) for k, v in case.items()}

    # Embed student details so the frontend can show name/email without a second request
    if raw_student_id:
        student_doc = db.db.users.find_one(
            {'_id': raw_student_id},
            {'name': 1, 'email': 1, 'student_id': 1, 'id_number': 1, 'mhbot_username': 1,
             'college': 1, 'course': 1, 'program': 1, 'year_level': 1, 'first_name': 1, 'last_name': 1}
        )
        if student_doc:
            full_name = (student_doc.get('name') or
                         f"{student_doc.get('first_name','')} {student_doc.get('last_name','')}".strip())
            serialized['student'] = {
                'name': full_name,
                'email': student_doc.get('email', ''),
                'school_id': (student_doc.get('student_id') or student_doc.get('id_number') or ''),
                'mhbot_username': student_doc.get('mhbot_username', ''),
                'college': student_doc.get('college', ''),
                'course': student_doc.get('course', '') or student_doc.get('program', ''),
            }

    # Embed assigned counselor name
    assigned_cid = case.get('assigned_counselor_id')
    if assigned_cid:
        try:
            c_doc = db.db.users.find_one({'_id': ObjectId(str(assigned_cid))}, {'first_name': 1, 'last_name': 1, 'name': 1})
            if c_doc:
                serialized['counselor_name'] = (
                    f"{c_doc.get('last_name','').upper()}, {c_doc.get('first_name','')}"
                    if c_doc.get('last_name') else c_doc.get('name', '')
                )
        except Exception:
            pass

    # Embed intake counselor name (the IC who conducted the intake interview)
    ic_id = case.get('intake_counselor_id')
    if ic_id:
        try:
            ic_doc = db.db.users.find_one({'_id': ObjectId(str(ic_id))}, {'first_name': 1, 'last_name': 1, 'name': 1})
            if ic_doc:
                serialized['intake_counselor_name'] = (
                    f"{ic_doc.get('first_name','')} {ic_doc.get('last_name','')}".strip()
                    or ic_doc.get('name', '')
                )
        except Exception:
            pass

    # Embed appointment info for IC Interview Documentation Section 1.
    # Online intake appointments are created BEFORE the case exists, so they have
    # no case_id. After triage, only the FOLLOW_UP appointment carries case_id.
    # Strategy: use case.intake_id → intake.appointment_id to find the original
    # intake appointment directly; fall back to student_id query excluding FOLLOW_UP.
    case_obj_id = case.get('_id')
    appt = None
    intake_doc_for_appt = None

    intake_ref = case.get('intake_id')
    if intake_ref:
        try:
            intake_oid = intake_ref if isinstance(intake_ref, ObjectId) else ObjectId(str(intake_ref))
            intake_doc_for_appt = db.db.intakes.find_one(
                {'_id': intake_oid},
                {'appointment_id': 1, 'appointment_date': 1, 'preferred_platform': 1}
            )
        except Exception:
            pass

    if intake_doc_for_appt and intake_doc_for_appt.get('appointment_id'):
        try:
            appt_oid = intake_doc_for_appt['appointment_id']
            if not isinstance(appt_oid, ObjectId):
                appt_oid = ObjectId(str(appt_oid))
            appt = db.db.appointments.find_one({'_id': appt_oid})
        except Exception:
            pass

    # Fallback: case_id query excluding follow-up endorsement appointments
    if not appt:
        appt = db.db.appointments.find_one(
            {'case_id': case_obj_id, 'purpose': {'$ne': 'FOLLOW_UP'}},
            sort=[('created_at', -1)]
        )
    if not appt:
        appt = db.db.appointments.find_one(
            {'case_id': case_obj_id},
            sort=[('created_at', -1)]
        )
    if not appt and raw_student_id:
        appt = db.db.appointments.find_one(
            {'student_id': raw_student_id, 'purpose': {'$ne': 'FOLLOW_UP'}},
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
            'method': (appt.get('method') or appt.get('appointment_method') or
                       appt.get('preferred_method') or appt.get('preferred_platform') or ''),
            'appointment_id': str(appt.get('_id', '')),
        }
    elif intake_doc_for_appt and intake_doc_for_appt.get('appointment_date'):
        # Last resort: build from intake document directly
        serialized['appointment_info'] = {
            'date': intake_doc_for_appt['appointment_date'],
            'method': intake_doc_for_appt.get('preferred_platform', ''),
            'appointment_id': '',
        }

    # Embed consecutive no-show count from tracker
    tracker = db.db.missed_appointment_tracker.find_one({'case_id': case.get('_id')})
    serialized['consecutive_no_shows'] = tracker.get('consecutive_no_shows', 0) if tracker else 0

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
    
    # Notify student who their counselor is
    try:
        student_doc = db.db.users.find_one({'_id': case.get('student_id')})
        if student_doc and student_doc.get('email'):
            sname = f"{student_doc.get('first_name', '')} {student_doc.get('last_name', '')}".strip() or 'Student'
            cname = f"{counselor['first_name']} {counselor['last_name']}".strip()
            from services.email_service import EmailService
            email_svc = EmailService()
            email_svc._send_email(
                student_doc['email'],
                'Your CPS Counselor Has Been Assigned',
                f"""<html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px">
                <h2 style="color:#1B5E20;">Your Counselor Has Been Assigned</h2>
                <p>Dear {sname},</p>
                <p>We are pleased to inform you that your case has been assigned to
                <strong>{cname}</strong>.</p>
                <p>Your counselor will be in touch shortly to confirm your first session.
                If you have any questions in the meantime, please contact the CPS office.</p>
                </body></html>"""
            )
        # In-app notification
        if student_doc:
            db.db.notifications.insert_one({
                'type': 'CASE_ASSIGNED',
                'case_id': case.get('_id'),
                'message': f'Your case has been assigned to {counselor["first_name"]} {counselor["last_name"]}.',
                'target_user_id': case.get('student_id'),
                'read': False,
                'created_at': datetime.utcnow(),
            })
    except Exception as notif_err:
        print(f"⚠ Case assignment notification failed: {notif_err}")

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
    elif user_role not in [UserRole.CASE_MANAGER, UserRole.DPO, UserRole.ADMIN]:
        return jsonify({'error': 'Insufficient permissions'}), 403

    data = request.get_json()

    termination_form = {
        # Basic
        'mode_of_session':          data.get('mode_of_session'),
        'session_count':            data.get('session_count'),
        # Termination
        'reasons':                  data.get('reasons', []),
        'reasons_other':            data.get('reasons_other'),
        'summary':                  data.get('summary'),
        'presenting_problem':       data.get('presenting_problem'),
        'interventions_used':       data.get('interventions_used', []),
        'interventions_other':      data.get('interventions_other'),
        # Client reflections
        'client_progress':          data.get('client_progress'),
        'client_learnings':         data.get('client_learnings'),
        'client_readiness':         data.get('client_readiness'),
        # Counselor impression
        'overall_progress':         data.get('overall_progress'),
        'strengths':                data.get('strengths'),
        'remaining_concerns':       data.get('remaining_concerns'),
        'prognosis':                data.get('prognosis'),
        # Relapse prevention
        'warning_signs':            data.get('warning_signs'),
        'coping_strategies':        data.get('coping_strategies'),
        'crisis_plan':              data.get('crisis_plan'),
        'crisis_contact':           data.get('crisis_contact'),
        # Referral & follow-up
        'referral_to':              data.get('referral_to', []),
        'referral_details':         data.get('referral_details'),
        'follow_up_recommendations':data.get('follow_up_recommendations'),
        'follow_up_schedule':       data.get('follow_up_schedule'),
    }

    db.db.cases.update_one(
        {'_id': ObjectId(case_id)},
        {'$set': {
            'case_status': CaseStatus.CLOSED.value,
            'termination_reason': data.get('termination_reason') or (', '.join(data.get('reasons', [])) if data.get('reasons') else None),
            'termination_date': datetime.utcnow(),
            'final_notes': data.get('final_notes') or data.get('summary'),
            'termination_form': termination_form,
            'updated_at': datetime.utcnow()
        }}
    )

    return jsonify({
        'success': True,
        'message': 'Case closed'
    }), 200


@cases_bp.route('/<case_id>/confirm-no-show-termination', methods=['POST'])
@jwt_required()
def confirm_no_show_termination(case_id):
    """Counselor confirms administrative termination after 3 consecutive no-shows"""
    user_id = get_jwt_identity()
    user = db.db.users.find_one({'_id': ObjectId(user_id)})

    if not user:
        return jsonify({'error': 'User not found'}), 401

    user_role = user.get('role')
    if user_role not in [UserRole.COUNSELOR, UserRole.PSYCHOLOGIST, UserRole.CASE_MANAGER, UserRole.ADMIN, UserRole.DPO]:
        return jsonify({'error': 'Insufficient permissions'}), 403

    try:
        case = db.db.cases.find_one({'_id': ObjectId(case_id)})
    except Exception:
        return jsonify({'error': 'Invalid case ID'}), 400

    if not case:
        return jsonify({'error': 'Case not found'}), 404

    if case.get('case_status') != CaseStatus.PENDING_TERMINATION.value:
        return jsonify({'error': 'Case is not pending termination'}), 400

    if case.get('termination_type') != TerminationType.ADMINISTRATIVE.value:
        return jsonify({'error': 'Case termination type is not administrative'}), 400

    now = datetime.utcnow()
    student_id = case.get('student_id')

    db.db.cases.update_one(
        {'_id': ObjectId(case_id)},
        {'$set': {
            'case_status': CaseStatus.CLOSED.value,
            'termination_type': TerminationType.ADMINISTRATIVE.value,
            'termination_reason': 'Administrative termination: 3 consecutive no-shows per CPS protocol.',
            'termination_date': now,
            'confirmed_by': user_id,
            'confirmed_at': now,
            'updated_at': now,
        }}
    )

    # Auto-generate a case note documenting the closure
    db.db.session_notes.insert_one({
        'case_id': ObjectId(case_id),
        'note_type': 'TERMINATION',
        'note_format': 'NARRATIVE',
        'content': (
            'Case administratively terminated due to 3 consecutive no-shows per clinic protocol. '
            'Student was unresponsive to scheduled sessions. '
            'Case closed and student notified.'
        ),
        'authored_by': user_id,
        'authored_by_name': user.get('name', ''),
        'session_date': now,
        'created_at': now,
        'updated_at': now,
    })

    # Notify student
    if student_id:
        db.db.notifications.insert_one({
            'type': 'CASE_CLOSED_NO_SHOW',
            'case_id': case.get('_id'),
            'message': (
                'Your counseling case has been closed due to 3 consecutive missed appointments. '
                'Please contact the counseling office if you wish to resume services.'
            ),
            'target_user_id': student_id,
            'read': False,
            'created_at': now,
        })

    return jsonify({
        'success': True,
        'message': 'Case closed due to 3 consecutive no-shows.',
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




@cases_bp.route('/<case_id>/reopen', methods=['POST'])
@jwt_required()
def reopen_case(case_id):
    """Reopen a CLOSED case for a returning client. Only IC/COUNSELOR/ADMIN/DPO may reopen."""
    user_id = get_jwt_identity()
    user = db.db.users.find_one({'_id': ObjectId(user_id) if isinstance(user_id, str) else user_id})
    if not user or user.get('role') not in (
        UserRole.IC, UserRole.COUNSELOR, UserRole.PSYCHOLOGIST,
        UserRole.CASE_MANAGER, UserRole.ADMIN, UserRole.DPO
    ):
        return jsonify({'error': 'Insufficient permissions to reopen a case'}), 403

    try:
        case = db.db.cases.find_one({'_id': ObjectId(case_id)})
    except Exception:
        return jsonify({'error': 'Invalid case ID'}), 400

    if not case:
        return jsonify({'error': 'Case not found'}), 404

    closeable_statuses = {CaseStatus.CLOSED.value, CaseStatus.CANCELLED.value}
    current_status = case.get('case_status') or case.get('status', '')
    if current_status not in closeable_statuses:
        return jsonify({'error': f'Case is not closed (current status: {current_status})'}), 400

    data = request.get_json() or {}
    reason = data.get('reason', 'Returning client — case reopened.')
    now = datetime.utcnow()

    db.db.cases.update_one(
        {'_id': ObjectId(case_id)},
        {'$set': {
            'case_status': CaseStatus.ACTIVE.value,
            'status':      CaseStatus.ACTIVE.value,
            'reopened_at': now,
            'reopened_by': user_id,
            'reopen_reason': reason,
            'updated_at': now,
        }}
    )

    # Reset the consecutive no-show tracker so a returning client starts fresh
    db.db.missed_appointment_tracker.update_one(
        {'case_id': ObjectId(case_id)},
        {'$set': {'consecutive_no_shows': 0}},
        upsert=False,
    )

    # Notify student that their case is active again
    try:
        student_doc = db.db.users.find_one({'_id': case.get('student_id')})
        if student_doc:
            db.db.notifications.insert_one({
                'type': 'CASE_REOPENED',
                'case_id': ObjectId(case_id),
                'message': 'Your counseling case has been reopened. Please contact CPS to schedule your next session.',
                'target_user_id': case.get('student_id'),
                'read': False,
                'created_at': now,
            })
    except Exception:
        pass

    audit_log(db.db, 'case', 'reopen', entity_id=case_id,
              old_values={'case_status': current_status},
              new_values={'case_status': CaseStatus.ACTIVE.value, 'reason': reason})

    return jsonify({
        'success': True,
        'message': 'Case reopened successfully',
        'case_id': case_id,
        'case_status': CaseStatus.ACTIVE.value,
    }), 200


@cases_bp.route('/<case_id>/reassign', methods=['POST'])
@jwt_required()
def reassign_case(case_id):
    """Reassign a case to a different counselor by name."""
    from utils import audit_log
    get_jwt_identity()
    data = request.get_json() or {}
    counselor_name = (data.get('counselor_name') or '').strip()
    if not counselor_name:
        return jsonify({'error': 'counselor_name required'}), 400

    try:
        case_obj_id = ObjectId(case_id)
    except Exception:
        return jsonify({'error': 'Invalid case ID'}), 400

    case = db.db.cases.find_one({'_id': case_obj_id})
    if not case:
        return jsonify({'error': 'Case not found'}), 404

    # Find counselor by full name (first + last)
    parts = counselor_name.split()
    if len(parts) >= 2:
        counselor = db.db.users.find_one({
            'first_name': parts[0], 'last_name': ' '.join(parts[1:]),
            'role': {'$in': ['COUNSELOR', 'GUIDANCE_COUNSELOR', 'PSYCHOLOGIST']}
        })
    else:
        counselor = db.db.users.find_one({
            '$or': [{'first_name': counselor_name}, {'last_name': counselor_name}],
            'role': {'$in': ['COUNSELOR', 'GUIDANCE_COUNSELOR', 'PSYCHOLOGIST']}
        })

    if not counselor:
        return jsonify({'error': f'Counselor "{counselor_name}" not found'}), 404

    old_cid = case.get('assigned_counselor_id')
    db.db.cases.update_one({'_id': case_obj_id}, {'$set': {'assigned_counselor_id': counselor['_id']}})

    audit_log(db.db, 'case', 'reassign', entity_id=case_id,
              old_values={'assigned_counselor_id': str(old_cid) if old_cid else None},
              new_values={'assigned_counselor_id': str(counselor['_id'])})

    return jsonify({'success': True, 'message': f'Case reassigned to {counselor_name}'}), 200
