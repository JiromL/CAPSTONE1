"""
CHECK-IN MODULE
Handles periodic check-ins for existing clients who don't need full counseling
Tracks client status updates, concerns, and interactions
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from models import db, PermissionType, ClientStatus, TransactionType
from utils import audit_log, user_has_permission
from datetime import datetime, timedelta

check_ins_bp = Blueprint('check_ins', __name__, url_prefix='/api/check-ins')


@check_ins_bp.route('/create', methods=['POST'])
@jwt_required()
def create_check_in():
    """Create a check-in for an existing client (non-counseling contact)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    data = request.get_json()
    
    if not data.get('case_id'):
        return jsonify({'error': 'case_id is required'}), 400
    
    if not data.get('check_in_type'):
        return jsonify({'error': 'check_in_type is required (STATUS_UPDATE, WELFARE_CHECK, REFERRAL_FOLLOW_UP)'}), 400
    
    # Validate check-in type
    valid_types = ['STATUS_UPDATE', 'WELFARE_CHECK', 'REFERRAL_FOLLOW_UP', 'CRISIS_INTERVENTION', 'OTHER']
    if data['check_in_type'] not in valid_types:
        return jsonify({'error': f'Invalid check_in_type. Must be one of: {", ".join(valid_types)}'}), 400
    
    try:
        case_id = ObjectId(data['case_id'])
        case = db.db.cases.find_one({"_id": case_id})
    except:
        case = db.db.cases.find_one({"_id": data['case_id']})
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    # Create check-in record
    check_in = {
        "case_id": case['_id'],
        "client_id": case.get('student_id'),
        "checked_in_by": ObjectId(user_id) if isinstance(user_id, str) else user_id,
        "check_in_type": data['check_in_type'],  # STATUS_UPDATE, WELFARE_CHECK, REFERRAL_FOLLOW_UP
        
        # Current client status
        "client_status_before": case.get('client_status'),
        "client_status_after": data.get('new_status'),  # Can update status
        
        # Concern tracking
        "concern_before": case.get('primary_concern'),
        "concern_after": data.get('new_concern'),  # Can update concern
        
        # Check-in details
        "notes": data.get('notes', ''),
        "action_items": data.get('action_items', []),  # [{"action": "", "due_date": ""}]
        "referrals_made": data.get('referrals_made', []),  # List of referrals from this check-in
        
        # Contact info
        "contact_method": data.get('contact_method', 'IN_PERSON'),  # IN_PERSON, PHONE, EMAIL, VIDEO
        "duration_minutes": data.get('duration_minutes'),  # Length of contact
        
        # Outcome
        "outcome": data.get('outcome'),  # RESOLVED, ONGOING, REFERRED, NEEDS_FOLLOWUP
        "next_check_in_date": data.get('next_check_in_date'),  # When to check in again
        
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = db.db.check_ins.insert_one(check_in)
    
    # Update case if new status provided
    if data.get('new_status'):
        update_fields = {
            "client_status": data['new_status'],
            "updated_at": datetime.utcnow()
        }
        
        # Also update primary concern if provided
        if data.get('new_concern'):
            update_fields["primary_concern"] = data['new_concern']
        
        db.db.cases.update_one(
            {"_id": case['_id']},
            {"$set": update_fields}
        )
    
    # Add to case check-in history
    db.db.cases.update_one(
        {"_id": case['_id']},
        {
            "$push": {
                "check_ins": {
                    "check_in_id": result.inserted_id,
                    "check_in_date": check_in['created_at'],
                    "type": check_in['check_in_type']
                }
            }
        }
    )
    
    audit_log(db.db, 'check_in', 'create', entity_id=str(result.inserted_id), new_values={
        'case_id': str(case['_id']),
        'check_in_type': check_in['check_in_type'],
        'client_status': data.get('new_status'),
        'notes': data.get('notes', '')[:100]
    })
    
    return jsonify({
        'check_in_id': str(result.inserted_id),
        'case_id': str(case['_id']),
        'check_in_type': check_in['check_in_type'],
        'status_updated': data.get('new_status') if data.get('new_status') else None,
        'created_at': check_in['created_at'].isoformat()
    }), 201


@check_ins_bp.route('/<case_id>/history', methods=['GET'])
@jwt_required()
def get_check_in_history(case_id):
    """Get check-in history for a case"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        cid = ObjectId(case_id)
        case = db.db.cases.find_one({"_id": cid})
    except:
        case = db.db.cases.find_one({"_id": case_id})
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    # Get all check-ins for this case
    check_ins = list(db.db.check_ins.find({"case_id": case['_id']}).sort("created_at", -1))
    
    result_check_ins = []
    for ci in check_ins:
        # Get counselor name
        counselor = db.db.users.find_one({"_id": ci.get('checked_in_by')})
        counselor_name = f"{counselor.get('first_name', '')} {counselor.get('last_name', '')}".strip() if counselor else "Unknown"
        
        result_check_ins.append({
            'check_in_id': str(ci['_id']),
            'check_in_type': ci.get('check_in_type'),
            'checked_in_by': counselor_name,
            'contact_method': ci.get('contact_method'),
            'client_status_before': ci.get('client_status_before'),
            'client_status_after': ci.get('client_status_after'),
            'concern_before': ci.get('concern_before'),
            'concern_after': ci.get('concern_after'),
            'notes': ci.get('notes'),
            'action_items': ci.get('action_items'),
            'referrals_made': ci.get('referrals_made'),
            'outcome': ci.get('outcome'),
            'next_check_in_date': ci.get('next_check_in_date').isoformat() if isinstance(ci.get('next_check_in_date'), datetime) else ci.get('next_check_in_date'),
            'duration_minutes': ci.get('duration_minutes'),
            'created_at': ci['created_at'].isoformat() if isinstance(ci['created_at'], datetime) else ci['created_at']
        })
    
    return jsonify({
        'case_id': str(case['_id']),
        'total_check_ins': len(result_check_ins),
        'client_current_status': case.get('client_status'),
        'check_ins': result_check_ins
    }), 200


@check_ins_bp.route('/list', methods=['GET'])
@jwt_required()
def get_pending_check_ins():
    """Get all pending/overdue check-ins across cases"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    now = datetime.utcnow()
    
    # Find cases with overdue check-ins
    # 1. Cases with CHECK_IN_ONLY or WITH_MH_CHECK_IN status
    check_in_only_cases = list(db.db.cases.find({
        "client_status": {"$in": ["CHECK_IN_ONLY", "WITH_MH_CHECK_IN"]}
    }))
    
    pending_checkups = []
    
    for case in check_in_only_cases:
        # Get last check-in
        last_check_in = db.db.check_ins.find_one(
            {"case_id": case['_id']},
            sort=[("created_at", -1)]
        )
        
        student = db.db.users.find_one({"_id": case.get('student_id')})
        if student:
            student_name = f"{student.get('first_name', '')} {student.get('last_name', '')}".strip()
        else:
            student_name = case.get('student_name') or "Unknown"
        
        # Determine if overdue
        days_since_last_check_in = None
        is_overdue = False
        
        if last_check_in:
            days_since = (now - last_check_in['created_at']).days
            days_since_last_check_in = days_since
            
            # If next_check_in_date passed or more than 30 days since last check-in
            if last_check_in.get('next_check_in_date'):
                is_overdue = now > last_check_in['next_check_in_date']
            elif days_since > 30:
                is_overdue = True
        else:
            # No check-in recorded yet
            days_since_last_check_in = (now - case['created_at']).days
            is_overdue = days_since_last_check_in > 14  # 2 weeks grace period for new cases
        
        pending_checkups.append({
            'case_id': str(case['_id']),
            'student_name': student_name,
            'student_id': str(case.get('student_id')),
            'client_status': case.get('client_status'),
            'primary_concern': case.get('primary_concern'),
            'days_since_last_check_in': days_since_last_check_in,
            'is_overdue': is_overdue,
            'last_check_in_date': last_check_in['created_at'].isoformat() if last_check_in and isinstance(last_check_in['created_at'], datetime) else None,
            'next_check_in_date': last_check_in.get('next_check_in_date').isoformat() if last_check_in and isinstance(last_check_in.get('next_check_in_date'), datetime) else None
        })
    
    # Sort by overdue first, then by days since check-in
    pending_checkups.sort(key=lambda x: (not x['is_overdue'], -x['days_since_last_check_in']))
    
    overdue_count = sum(1 for x in pending_checkups if x['is_overdue'])
    
    return jsonify({
        'total_pending_check_ins': len(pending_checkups),
        'overdue_count': overdue_count,
        'check_ins': pending_checkups
    }), 200


@check_ins_bp.route('/<check_in_id>', methods=['GET'])
@jwt_required()
def get_check_in_details(check_in_id):
    """Get details of a specific check-in"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        cid = ObjectId(check_in_id)
        check_in = db.db.check_ins.find_one({"_id": cid})
    except:
        check_in = db.db.check_ins.find_one({"_id": check_in_id})
    
    if not check_in:
        return jsonify({'error': 'Check-in not found'}), 404
    
    # Get names
    counselor = db.db.users.find_one({"_id": check_in.get('checked_in_by')})
    counselor_name = f"{counselor.get('first_name', '')} {counselor.get('last_name', '')}".strip() if counselor else "Unknown"
    
    student = db.db.users.find_one({"_id": check_in.get('client_id')})
    student_name = f"{student.get('first_name', '')} {student.get('last_name', '')}".strip() if student else "Unknown"
    
    return jsonify({
        'check_in_id': str(check_in['_id']),
        'case_id': str(check_in.get('case_id')),
        'student_name': student_name,
        'checked_in_by': counselor_name,
        'check_in_type': check_in.get('check_in_type'),
        'contact_method': check_in.get('contact_method'),
        'duration_minutes': check_in.get('duration_minutes'),
        'client_status': {
            'before': check_in.get('client_status_before'),
            'after': check_in.get('client_status_after')
        },
        'concern': {
            'before': check_in.get('concern_before'),
            'after': check_in.get('concern_after')
        },
        'notes': check_in.get('notes'),
        'action_items': check_in.get('action_items'),
        'referrals_made': check_in.get('referrals_made'),
        'outcome': check_in.get('outcome'),
        'next_check_in_date': check_in.get('next_check_in_date').isoformat() if isinstance(check_in.get('next_check_in_date'), datetime) else check_in.get('next_check_in_date'),
        'created_at': check_in['created_at'].isoformat() if isinstance(check_in['created_at'], datetime) else check_in['created_at'],
        'updated_at': check_in.get('updated_at').isoformat() if isinstance(check_in.get('updated_at'), datetime) else check_in.get('updated_at')
    }), 200


@check_ins_bp.route('/<check_in_id>', methods=['PUT'])
@jwt_required()
def update_check_in(check_in_id):
    """Update check-in (add notes, update action items)"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        cid = ObjectId(check_in_id)
        check_in = db.db.check_ins.find_one({"_id": cid})
    except:
        check_in = db.db.check_ins.find_one({"_id": check_in_id})
    
    if not check_in:
        return jsonify({'error': 'Check-in not found'}), 404
    
    data = request.get_json()
    
    update_fields = {"updated_at": datetime.utcnow()}
    
    if 'notes' in data:
        update_fields['notes'] = data['notes']
    
    if 'action_items' in data:
        update_fields['action_items'] = data['action_items']
    
    if 'outcome' in data:
        update_fields['outcome'] = data['outcome']
    
    if 'next_check_in_date' in data:
        update_fields['next_check_in_date'] = data['next_check_in_date']
    
    db.db.check_ins.update_one(
        {"_id": check_in['_id']},
        {"$set": update_fields}
    )
    
    audit_log(db.db, 'check_in', 'update', entity_id=str(check_in['_id']), new_values=update_fields)
    
    return jsonify({
        'check_in_id': str(check_in['_id']),
        'message': 'Check-in updated',
        'updated_at': update_fields['updated_at'].isoformat()
    }), 200


@check_ins_bp.route('/summary/status', methods=['GET'])
@jwt_required()
def get_check_in_summary():
    """Get summary of check-in statuses"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    # Count cases by client status
    client_status_summary = {}
    for status in ['ACTIVE', 'INACTIVE', 'CHECK_IN_ONLY', 'WITH_MH_CHECK_IN', 'UNDER_ACCOMMODATION', 'TERMINATION_PENDING']:
        count = db.db.cases.count_documents({"client_status": status})
        client_status_summary[status] = count
    
    # Check-in types
    check_in_types = {}
    for check_in_type in ['STATUS_UPDATE', 'WELFARE_CHECK', 'REFERRAL_FOLLOW_UP', 'CRISIS_INTERVENTION', 'OTHER']:
        count = db.db.check_ins.count_documents({"check_in_type": check_in_type})
        check_in_types[check_in_type] = count
    
    return jsonify({
        'clients_by_status': client_status_summary,
        'check_in_types_total': check_in_types,
        'total_cases': db.db.cases.count_documents({}),
        'total_check_ins': db.db.check_ins.count_documents({})
    }), 200


@check_ins_bp.route('/student/self-checkin', methods=['POST'])
@jwt_required()
def student_self_checkin():
    """
    Student self-initiated check-in (for non-counseling clients)
    Students who are referred but only need periodic check-ins can submit their status
    """
    user_id = get_jwt_identity()
    
    try:
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        user = db.db.users.find_one({'_id': user_id_obj})
    except:
        user = db.db.users.find_one({'_id': user_id})
    
    if not user or user.get('role') != 'STUDENT':
        return jsonify({'error': 'Only students can submit self check-ins'}), 403
    
    data = request.get_json()

    # Allow check-ins tied to an appointment (no case required yet)
    appointment_id = data.get('appointment_id')
    appointment_id_obj = None
    if appointment_id:
        try:
            appointment_id_obj = ObjectId(appointment_id)
        except:
            return jsonify({'error': 'Invalid appointment_id'}), 400

    # Try to find an existing case (optional) — student_id may be stored as ObjectId or string
    case = db.db.cases.find_one({'student_id': user_id_obj}) or \
           db.db.cases.find_one({'student_id': str(user_id_obj)})
    if not case and not appointment_id_obj:
        return jsonify({
            'error': 'No active case or appointment found',
            'message': 'Provide an appointment_id or complete your intake first'
        }), 404

    # Create student self check-in record
    check_in = {
        "case_id": case['_id'] if case else None,
        "appointment_id": appointment_id_obj,
        "client_id": user_id_obj,
        "checked_in_by": user_id_obj,  # Student self-checkin
        "is_self_checkin": True,
        "check_in_type": "SELF_STATUS_UPDATE",
        
        # Student-reported status
        "reported_status": data.get('status'),  # How they're doing: DOING_WELL, MANAGING, STRUGGLING, IN_CRISIS
        "reported_concern": data.get('concern'),  # Any current concerns
        
        # Wellness check
        "wellness_rating": data.get('wellness_rating'),  # 1-10 scale of how they're feeling
        "mood": data.get('mood'),  # Current mood descriptor
        
        # Self-reported support needs
        "needs_support": data.get('needs_support', False),  # Do they need support?
        "support_type": data.get('support_type'),  # COUNSELING, RESOURCES, REFERRAL, OTHER
        "support_details": data.get('support_details'),  # Details about what they need
        
        # Check-in details
        "notes": data.get('notes', ''),  # Any additional notes from student
        "action_items": data.get('action_items', []),  # Self-identified action items
        
        # Contact info
        "contact_method": "SELF_REPORTED",
        "duration_minutes": 0,
        
        # Outcome
        "outcome": "SUBMITTED_FOR_REVIEW",  # Will be reviewed by counselor
        "reviewed_by": None,  # Will be filled when staff reviews
        "staff_notes": None,  # Staff response/notes
        
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = db.db.check_ins.insert_one(check_in)

    audit_log(db.db, 'check_ins', 'student_self_checkin',
              entity_id=str(result.inserted_id),
              new_values={'related_id': str(case['_id']) if case else str(appointment_id_obj or '')})

    return jsonify({
        'message': 'Check-in submitted successfully',
        'check_in_id': str(result.inserted_id),
        'case_id': str(case['_id']) if case else None,
        'status': 'SUBMITTED_FOR_REVIEW',
        'timestamp': datetime.utcnow().isoformat()
    }), 201


@check_ins_bp.route('/student/my-checkins', methods=['GET'])
@jwt_required()
def get_student_checkins():
    """Get student's submitted check-ins and responses"""
    user_id = get_jwt_identity()
    
    try:
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
    except:
        user_id_obj = user_id
    
    # Get student's check-ins
    checkins = list(db.db.check_ins.find({
        'client_id': user_id_obj,
        'is_self_checkin': True
    }).sort('created_at', -1).limit(50))
    
    # Format response
    formatted_checkins = []
    for checkin in checkins:
        formatted_checkins.append({
            '_id': str(checkin['_id']),
            'case_id': str(checkin.get('case_id')),
            'submitted_at': checkin.get('created_at').isoformat() if checkin.get('created_at') else None,
            'status': checkin.get('reported_status'),
            'wellness_rating': checkin.get('wellness_rating'),
            'mood': checkin.get('mood'),
            'concern': checkin.get('reported_concern'),
            'outcome': checkin.get('outcome'),
            'staff_notes': checkin.get('staff_notes'),
            'reviewed_at': checkin.get('updated_at').isoformat() if checkin.get('updated_at') and checkin.get('reviewed_by') else None
        })
    
    return jsonify({
        'check_ins': formatted_checkins,
        'total': len(formatted_checkins)
    }), 200


@check_ins_bp.route('/for-appointment/<appointment_id>', methods=['GET'])
@jwt_required()
def get_checkins_for_appointment(appointment_id):
    """Get all check-ins for a specific appointment (student or CPS staff)"""
    user_id = get_jwt_identity()
    try:
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        appt_id_obj = ObjectId(appointment_id)
    except:
        return jsonify({'error': 'Invalid ID'}), 400

    user = db.db.users.find_one({'_id': user_id_obj})
    if not user:
        return jsonify({'error': 'Unauthorized'}), 403

    role = user.get('role', '')
    # Students can only see their own; staff/counselors can see any
    query = {'appointment_id': appt_id_obj}
    if role == 'STUDENT':
        query['client_id'] = user_id_obj

    checkins = list(db.db.check_ins.find(query).sort('created_at', -1).limit(50))
    result = []
    for c in checkins:
        result.append({
            '_id': str(c['_id']),
            'submitted_at': c.get('created_at').isoformat() if c.get('created_at') else None,
            'status': c.get('reported_status'),
            'wellness_rating': c.get('wellness_rating'),
            'mood': c.get('mood'),
            'notes': c.get('notes', ''),
            'needs_support': c.get('needs_support', False),
            'staff_notes': c.get('staff_notes'),
        })
    return jsonify({'check_ins': result, 'total': len(result)}), 200


@check_ins_bp.route('/student/pending-checkins', methods=['GET'])
@jwt_required()
def get_pending_student_checkins():
    """Get due/pending check-ins for this student"""
    user_id = get_jwt_identity()
    
    try:
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
    except:
        user_id_obj = user_id
    
    # Find student's case to get next check-in date
    case = db.db.cases.find_one({'student_id': str(user_id_obj)})
    if not case:
        return jsonify({'pending_checkins': []}), 200
    
    # Get last check-in
    last_checkin = db.db.check_ins.find_one({
        'case_id': case['_id'],
        'is_self_checkin': True
    }, sort=[('created_at', -1)])
    
    pending = []
    
    # If case has next_check_in_date and it's in the past, it's due
    next_checkin_date = case.get('next_check_in_date')
    if next_checkin_date and next_checkin_date <= datetime.utcnow():
        pending.append({
            'case_id': str(case['_id']),
            'due_date': next_checkin_date.isoformat(),
            'days_overdue': (datetime.utcnow() - next_checkin_date).days,
            'message': 'Your periodic check-in is due'
        })
    elif last_checkin:
        # Estimate next check-in (30 days after last one by default)
        next_est = last_checkin['created_at'] + timedelta(days=30)
        if datetime.utcnow() >= next_est:
            pending.append({
                'case_id': str(case['_id']),
                'due_date': next_est.isoformat(),
                'days_overdue': (datetime.utcnow() - next_est).days,
                'message': 'Your periodic check-in is due'
            })
    else:
        # First check-in encouraged
        pending.append({
            'case_id': str(case['_id']),
            'message': 'Please submit your initial check-in to help us support you better'
        })
    
    return jsonify({'pending_checkins': pending}), 200
