"""
EPIC 8: REFERRAL & WARM HANDOFF MODULE
Blueprint for internal/external referrals with ROI tracking and warm handoffs
Properly handles CPS referrals with investigation workflow
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from models import db, PermissionType
from utils import audit_log, user_has_permission
from datetime import datetime, timedelta

referrals_bp = Blueprint('referrals', __name__, url_prefix='/api/referrals')

# CPS Referral Status Flow
CPS_STATUSES = {
    'SUBMITTED': 'Referral submitted to CPS',
    'ASSIGNED': 'Assigned to investigator',
    'UNDER_INVESTIGATION': 'Investigation in progress',
    'INVESTIGATION_COMPLETE': 'Investigation complete - pending findings',
    'FINDINGS_ISSUED': 'Investigation findings issued',
    'CASE_OPENED': 'Case opened with CPS for services',
    'CASE_CLOSED': 'CPS case closed',
    'REFERRED_TO_SERVICES': 'Referred to other services without substantiation'
}

# External Service Referral Status Flow
EXTERNAL_SERVICE_STATUSES = {
    'SUBMITTED': 'Referral submitted',
    'ACKNOWLEDGED': 'Referral acknowledged by provider',
    'IN_PROGRESS': 'Service in progress',
    'COMPLETED': 'Service completed'
}

# Internal Referral Status Flow
INTERNAL_STATUSES = {
    'SUBMITTED': 'Referral submitted',
    'ACKNOWLEDGED': 'Provider acknowledged',
    'IN_PROGRESS': 'Service in progress',
    'COMPLETED': 'Service completed'
}



@referrals_bp.route('/initiate', methods=['POST'])
@jwt_required()
def initiate_referral():
    """Initiate a referral - handles CPS differently from other external/internal referrals"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    data = request.get_json()
    
    if not data.get('case_id') or not data.get('referral_type'):
        return jsonify({'error': 'Missing required fields: case_id, referral_type'}), 400
    
    try:
        cid = ObjectId(data['case_id'])
        case = db.db.cases.find_one({"_id": cid})
    except:
        case = db.db.cases.find_one({"_id": data['case_id']})
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    referral_type = data['referral_type'].upper()
    if referral_type not in ['INTERNAL', 'EXTERNAL', 'CPS']:
        return jsonify({'error': 'Invalid referral_type. Must be INTERNAL, EXTERNAL, or CPS'}), 400
    
    # Build base referral object
    referral = {
        "case_id": case['_id'],
        "referring_counselor_id": ObjectId(user_id) if isinstance(user_id, str) else user_id,
        "referral_type": referral_type,
        "reason": data.get('reason'),
        "urgency": data.get('urgency', 'routine'),  # URGENT, ROUTINE
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    # Handle different referral types
    if referral_type == 'CPS':
        # CPS referral - special workflow
        if not data.get('reason'):
            return jsonify({'error': 'Reason is required for CPS referral'}), 400
        if not data.get('allegations'):
            return jsonify({'error': 'Allegations are required for CPS referral'}), 400
        
        referral.update({
            "sub_type": "CPS",
            "allegations": data.get('allegations'),  # List of allegations: abuse, neglect, exploitation, etc.
            "reporter_name": data.get('reporter_name'),
            "reporter_relationship": data.get('reporter_relationship'),  # Self, Mandated Reporter, Concerned Person, etc.
            "student_name": f"{case.get('student_id', 'Unknown')}",  # Student's full name for CPS
            "student_dob": data.get('student_dob'),  # Date of birth
            "student_address": data.get('student_address'),  # Current address
            "has_siblings": data.get('has_siblings', False),
            "siblings_info": data.get('siblings_info'),
            
            # CPS-specific fields
            "status": "SUBMITTED",
            "cps_case_number": None,
            "investigator_name": None,
            "investigator_contact": None,
            "investigation_started_date": None,
            "investigation_completed_date": None,
            "investigation_findings": None,  # SUBSTANTIATED, UNSUBSTANTIATED, INCONCLUSIVE
            "investigation_details": None,
            "decision": None,  # CASE_OPENED, CASE_CLOSED, REFERRED_TO_SERVICES
            "case_opened_with_cps": False,
            "roi_signed": False,
            "warm_handoff_completed": False,
            "investigation_notes": []
        })
    
    elif referral_type == 'EXTERNAL':
        # External service referral (non-CPS)
        if not data.get('receiving_provider_name'):
            return jsonify({'error': 'receiving_provider_name required for external referral'}), 400
        
        service_type = data.get('service_type', 'OTHER')  # MEDICAL, MENTAL_HEALTH, SOCIAL_SERVICES, OTHER
        
        referral.update({
            "sub_type": service_type,
            "receiving_provider_name": data.get('receiving_provider_name'),
            "receiving_provider_contact": data.get('receiving_provider_contact'),
            "status": "SUBMITTED",
            "external_case_number": None,
            "roi_signed": False,
            "roi_file_url": None,
            "roi_signed_at": None,
            "roi_expires_at": None,
            "warm_handoff_completed": False,
            "agency_response": None
        })
    
    else:  # INTERNAL
        assigned_to_role = data.get('assigned_to_role')  # e.g. 'COUNSELOR' or 'PSYCHOLOGIST'
        assigned_to_user = data.get('assigned_to_user') or data.get('receiving_provider_id')

        provider = None
        if assigned_to_user:
            try:
                provider = db.db.users.find_one({"_id": ObjectId(assigned_to_user)})
            except Exception:
                provider = db.db.users.find_one({"_id": assigned_to_user})
            if not provider:
                return jsonify({'error': 'Invalid receiving provider'}), 400
            referral["assigned_to_user"] = provider['_id']
            referral["receiving_provider_id"] = provider['_id']
            referral["receiving_provider_name"] = f"{provider.get('first_name', '')} {provider.get('last_name', '')}".strip()

        if assigned_to_role:
            referral["assigned_to_role"] = assigned_to_role.upper()

        # Pool referral: role set but no specific user → PENDING_ACCEPTANCE
        is_pool = bool(assigned_to_role and not provider)
        referral.update({
            "status": "PENDING_ACCEPTANCE" if is_pool else "SUBMITTED",
            "warm_handoff_completed": False,
            "provider_acknowledgment_date": None
        })

        # For specific-user referrals, immediately write assigned_counselor_id onto the case
        # so the Case Details page can display who the IC routed the student to.
        if provider and referral_type == 'INTERNAL':
            db.db.cases.update_one(
                {"_id": case['_id']},
                {"$set": {
                    "assigned_counselor_id": provider['_id'],
                    "endorsed_to_role": assigned_to_role.upper() if assigned_to_role else provider.get('role', ''),
                    "updated_at": datetime.utcnow(),
                }}
            )

    result = db.db.referrals.insert_one(referral)
    
    audit_log(db.db, 'referral', 'initiate', entity_id=str(result.inserted_id), new_values={
        'case_id': str(case['_id']),
        'referral_type': referral_type,
        'reason': data.get('reason'),
        'status': referral.get('status')
    })
    
    return jsonify({
        'referral_id': str(result.inserted_id),
        'case_id': str(case['_id']),
        'referral_type': referral_type,
        'status': referral.get('status'),
        'created_at': referral['created_at'].isoformat()
    }), 201



@referrals_bp.route('/<referral_id>/cps/assign-investigator', methods=['POST'])
@jwt_required()
def assign_cps_investigator(referral_id):
    """Assign CPS investigator to referral (CPS updates this)"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        rid = ObjectId(referral_id)
        referral = db.db.referrals.find_one({"_id": rid})
    except:
        referral = db.db.referrals.find_one({"_id": referral_id})
    
    if not referral:
        return jsonify({'error': 'Referral not found'}), 404
    
    if referral.get('referral_type') != 'CPS':
        return jsonify({'error': 'This endpoint is only for CPS referrals'}), 400
    
    data = request.get_json()
    
    db.db.referrals.update_one(
        {"_id": referral['_id']},
        {"$set": {
            "status": "ASSIGNED",
            "cps_case_number": data.get('cps_case_number'),
            "investigator_name": data.get('investigator_name'),
            "investigator_contact": data.get('investigator_contact'),
            "investigation_started_date": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        "$push": {
            "investigation_notes": {
                "timestamp": datetime.utcnow(),
                "note": f"Assigned to investigator {data.get('investigator_name')}"
            }
        }}
    )
    
    audit_log(db.db, 'referral', 'cps_investigator_assigned', entity_id=str(referral['_id']), new_values={
        'investigator_name': data.get('investigator_name'),
        'cps_case_number': data.get('cps_case_number')
    })
    
    return jsonify({
        'referral_id': str(referral['_id']),
        'status': 'ASSIGNED',
        'investigator_name': data.get('investigator_name'),
        'cps_case_number': data.get('cps_case_number')
    }), 200


@referrals_bp.route('/<referral_id>/cps/start-investigation', methods=['POST'])
@jwt_required()
def start_cps_investigation(referral_id):
    """Start CPS investigation"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        rid = ObjectId(referral_id)
        referral = db.db.referrals.find_one({"_id": rid})
    except:
        referral = db.db.referrals.find_one({"_id": referral_id})
    
    if not referral:
        return jsonify({'error': 'Referral not found'}), 404
    
    if referral.get('referral_type') != 'CPS':
        return jsonify({'error': 'This endpoint is only for CPS referrals'}), 400
    
    db.db.referrals.update_one(
        {"_id": referral['_id']},
        {"$set": {
            "status": "UNDER_INVESTIGATION",
            "updated_at": datetime.utcnow()
        },
        "$push": {
            "investigation_notes": {
                "timestamp": datetime.utcnow(),
                "note": "Investigation started"
            }
        }}
    )
    
    audit_log(db.db, 'referral', 'cps_investigation_started', entity_id=str(referral['_id']))
    
    return jsonify({
        'referral_id': str(referral['_id']),
        'status': 'UNDER_INVESTIGATION'
    }), 200


@referrals_bp.route('/<referral_id>/cps/investigation-findings', methods=['POST'])
@jwt_required()
def submit_cps_investigation_findings(referral_id):
    """Submit CPS investigation findings (substantiated/unsubstantiated)"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        rid = ObjectId(referral_id)
        referral = db.db.referrals.find_one({"_id": rid})
    except:
        referral = db.db.referrals.find_one({"_id": referral_id})
    
    if not referral:
        return jsonify({'error': 'Referral not found'}), 404
    
    if referral.get('referral_type') != 'CPS':
        return jsonify({'error': 'This endpoint is only for CPS referrals'}), 400
    
    data = request.get_json()
    
    findings = data.get('findings')  # SUBSTANTIATED, UNSUBSTANTIATED, INCONCLUSIVE
    if findings not in ['SUBSTANTIATED', 'UNSUBSTANTIATED', 'INCONCLUSIVE']:
        return jsonify({'error': 'Invalid findings. Must be SUBSTANTIATED, UNSUBSTANTIATED, or INCONCLUSIVE'}), 400
    
    investigation_details = data.get('investigation_details')
    
    db.db.referrals.update_one(
        {"_id": referral['_id']},
        {"$set": {
            "status": "FINDINGS_ISSUED",
            "investigation_findings": findings,
            "investigation_details": investigation_details,
            "investigation_completed_date": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        "$push": {
            "investigation_notes": {
                "timestamp": datetime.utcnow(),
                "note": f"Investigation findings: {findings}",
                "details": investigation_details
            }
        }}
    )
    
    audit_log(db.db, 'referral', 'cps_findings_submitted', entity_id=str(referral['_id']), new_values={
        'findings': findings,
        'investigation_details': investigation_details
    })
    
    return jsonify({
        'referral_id': str(referral['_id']),
        'status': 'FINDINGS_ISSUED',
        'findings': findings
    }), 200


@referrals_bp.route('/<referral_id>/cps/decision', methods=['POST'])
@jwt_required()
def submit_cps_decision(referral_id):
    """Submit CPS decision - whether case is opened for services or closed"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        rid = ObjectId(referral_id)
        referral = db.db.referrals.find_one({"_id": rid})
    except:
        referral = db.db.referrals.find_one({"_id": referral_id})
    
    if not referral:
        return jsonify({'error': 'Referral not found'}), 404
    
    if referral.get('referral_type') != 'CPS':
        return jsonify({'error': 'This endpoint is only for CPS referrals'}), 400
    
    data = request.get_json()
    
    decision = data.get('decision')  # CASE_OPENED, CASE_CLOSED, REFERRED_TO_SERVICES
    if decision not in ['CASE_OPENED', 'CASE_CLOSED', 'REFERRED_TO_SERVICES']:
        return jsonify({'error': 'Invalid decision'}), 400
    
    update_data = {
        "decision": decision,
        "updated_at": datetime.utcnow()
    }
    
    if decision == 'CASE_OPENED':
        update_data["case_opened_with_cps"] = True
        update_data["status"] = "CASE_OPENED"
    elif decision == 'CASE_CLOSED':
        update_data["status"] = "CASE_CLOSED"
    else:  # REFERRED_TO_SERVICES
        update_data["status"] = "REFERRED_TO_SERVICES"
    
    db.db.referrals.update_one(
        {"_id": referral['_id']},
        {"$set": update_data,
        "$push": {
            "investigation_notes": {
                "timestamp": datetime.utcnow(),
                "note": f"CPS decision: {decision}",
                "decision_details": data.get('decision_details')
            }
        }}
    )
    
    audit_log(db.db, 'referral', 'cps_decision_submitted', entity_id=str(referral['_id']), new_values={
        'decision': decision,
        'status': update_data.get('status')
    })
    
    return jsonify({
        'referral_id': str(referral['_id']),
        'status': update_data.get('status'),
        'decision': decision
    }), 200


@referrals_bp.route('/<referral_id>/cps/add-note', methods=['POST'])
@jwt_required()
def add_cps_investigation_note(referral_id):
    """Add investigation note/update"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        rid = ObjectId(referral_id)
        referral = db.db.referrals.find_one({"_id": rid})
    except:
        referral = db.db.referrals.find_one({"_id": referral_id})
    
    if not referral:
        return jsonify({'error': 'Referral not found'}), 404
    
    if referral.get('referral_type') != 'CPS':
        return jsonify({'error': 'This endpoint is only for CPS referrals'}), 400
    
    data = request.get_json()
    note = data.get('note')
    
    if not note:
        return jsonify({'error': 'Note is required'}), 400
    
    db.db.referrals.update_one(
        {"_id": referral['_id']},
        {"$push": {
            "investigation_notes": {
                "timestamp": datetime.utcnow(),
                "note": note,
                "added_by": str(user_id)
            }
        },
        "$set": {
            "updated_at": datetime.utcnow()
        }}
    )
    
    return jsonify({
        'referral_id': str(referral['_id']),
        'note_added': note
    }), 200


@referrals_bp.route('/<referral_id>/roi-request', methods=['POST'])
@jwt_required()
def request_roi_signature(referral_id):
    """Request ROI (Release of Information) signature - for external referrals only"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        rid = ObjectId(referral_id)
        referral = db.db.referrals.find_one({"_id": rid})
    except:
        referral = db.db.referrals.find_one({"_id": referral_id})
    
    if not referral:
        return jsonify({'error': 'Referral not found'}), 404
    
    # ROI only applies to external referrals
    if referral.get('referral_type') != 'EXTERNAL':
        return jsonify({'error': 'ROI signature only required for external referrals'}), 400
    
    db.db.referrals.update_one(
        {"_id": referral['_id']},
        {"$set": {
            "status": "SUBMITTED",  # Keep status as submitted until ROI received
            "updated_at": datetime.utcnow()
        }}
    )
    
    audit_log(db.db, 'referral', 'roi_requested', entity_id=str(referral['_id']))
    
    return jsonify({
        'message': 'ROI signature requested from student/guardian',
        'referral_id': str(referral['_id']),
        'status': 'SUBMITTED'
    }), 200


@referrals_bp.route('/<referral_id>/roi-upload', methods=['POST'])
@jwt_required()
def upload_roi(referral_id):
    """Upload signed ROI (Release of Information) - for external referrals only"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        rid = ObjectId(referral_id)
        referral = db.db.referrals.find_one({"_id": rid})
    except:
        referral = db.db.referrals.find_one({"_id": referral_id})
    
    if not referral:
        return jsonify({'error': 'Referral not found'}), 404
    
    # ROI only applies to external referrals
    if referral.get('referral_type') != 'EXTERNAL':
        return jsonify({'error': 'ROI signature only applies to external referrals'}), 400
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    import os
    allowed_extensions = {'pdf', 'png', 'jpg', 'jpeg'}
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in allowed_extensions:
        return jsonify({'error': 'File must be PDF or image (png, jpg, jpeg)'}), 400

    upload_dir = 'uploads/roi'
    os.makedirs(upload_dir, exist_ok=True)
    # Use only the hex ObjectId string (already validated above as ObjectId) to avoid path traversal
    safe_id = str(referral['_id'])
    file_path = os.path.join(upload_dir, f'referral_{safe_id}_{datetime.utcnow().timestamp()}.{ext}')
    file.save(file_path)

    db.db.referrals.update_one(
        {"_id": referral['_id']},
        {"$set": {
            "roi_file_url": file_path,
            "roi_signed": True,
            "roi_signed_at": datetime.utcnow(),
            "roi_expires_at": datetime.utcnow() + timedelta(days=365),
            "updated_at": datetime.utcnow()
        }}
    )
    
    audit_log(db.db, 'referral', 'roi_uploaded', entity_id=str(referral['_id']), new_values={
        'roi_file_url': file_path,
        'roi_signed': True
    })
    
    expires_at = datetime.utcnow() + timedelta(days=365)
    
    return jsonify({
        'message': 'ROI uploaded',
        'referral_id': str(referral['_id']),
        'roi_signed_at': datetime.utcnow().isoformat(),
        'roi_expires_at': expires_at.isoformat()
    }), 201


@referrals_bp.route('/<referral_id>/refer', methods=['POST'])
@jwt_required()
def send_referral(referral_id):
    """Send referral to receiving provider - updates status based on referral type"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        rid = ObjectId(referral_id)
        referral = db.db.referrals.find_one({"_id": rid})
    except:
        referral = db.db.referrals.find_one({"_id": referral_id})
    
    if not referral:
        return jsonify({'error': 'Referral not found'}), 404
    
    ref_type = referral.get('referral_type')
    
    # For external referrals, ROI must be obtained (unless it's CPS)
    if ref_type == 'EXTERNAL' and not referral.get('roi_signed'):
        return jsonify({'error': 'ROI must be signed before external referral can be sent'}), 400
    
    if ref_type == 'CPS':
        return jsonify({'error': 'Use CPS-specific endpoints for CPS referrals'}), 400
    
    # Determine new status based on type
    new_status = 'IN_PROGRESS' if ref_type == 'EXTERNAL' else 'IN_PROGRESS'
    
    db.db.referrals.update_one(
        {"_id": referral['_id']},
        {"$set": {
            "status": new_status,
            "updated_at": datetime.utcnow()
        }}
    )
    
    audit_log(db.db, 'referral', 'sent', entity_id=str(referral['_id']), new_values={'status': new_status})
    
    return jsonify({
        'message': 'Referral sent successfully',
        'referral_id': str(referral['_id']),
        'status': new_status
    }), 200


@referrals_bp.route('/<referral_id>/acknowledge', methods=['POST'])
@jwt_required()
def acknowledge_referral(referral_id):
    """Acknowledge referral receipt - receiving provider acknowledges"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        rid = ObjectId(referral_id)
        referral = db.db.referrals.find_one({"_id": rid})
    except:
        referral = db.db.referrals.find_one({"_id": referral_id})
    
    if not referral:
        return jsonify({'error': 'Referral not found'}), 404
    
    if referral.get('referral_type') == 'CPS':
        return jsonify({'error': 'Use CPS-specific endpoints for CPS referrals'}), 400
    
    # Update status for external/internal referrals
    ref_type = referral.get('referral_type')
    new_status = 'ACKNOWLEDGED'
    
    update_data = {
        "status": new_status,
        "updated_at": datetime.utcnow()
    }
    
    if ref_type == 'INTERNAL':
        update_data["provider_acknowledgment_date"] = datetime.utcnow()
    
    db.db.referrals.update_one(
        {"_id": referral['_id']},
        {"$set": update_data}
    )
    
    audit_log(db.db, 'referral', 'acknowledged', entity_id=str(referral['_id']))
    
    return jsonify({
        'message': 'Referral acknowledged',
        'referral_id': str(referral['_id']),
        'status': new_status
    }), 200


@referrals_bp.route('/<referral_id>/warm-handoff', methods=['POST'])
@jwt_required()
def complete_warm_handoff(referral_id):
    """Complete warm handoff - marks referral as successfully handed off"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        rid = ObjectId(referral_id)
        referral = db.db.referrals.find_one({"_id": rid})
    except:
        referral = db.db.referrals.find_one({"_id": referral_id})
    
    if not referral:
        return jsonify({'error': 'Referral not found'}), 404
    
    data = request.get_json() or {}
    
    ref_type = referral.get('referral_type')
    
    # Determine appropriate status
    if ref_type == 'CPS':
        new_status = 'CASE_CLOSED'  # For CPS, warm handoff means case closed
    else:
        new_status = 'COMPLETED'
    
    update_data = {
        "warm_handoff_completed": True,
        "status": new_status,
        "updated_at": datetime.utcnow()
    }
    
    if 'handoff_date' in data:
        update_data["handoff_date"] = datetime.fromisoformat(data['handoff_date']) if isinstance(data['handoff_date'], str) else data['handoff_date']
    else:
        update_data["handoff_date"] = datetime.utcnow()
    
    if data.get('completion_notes'):
        update_data["completion_notes"] = data.get('completion_notes')
    
    db.db.referrals.update_one(
        {"_id": referral['_id']},
        {"$set": update_data}
    )
    
    audit_log(db.db, 'referral', 'warm_handoff_completed', entity_id=str(referral['_id']), new_values={
        'warm_handoff_completed': True,
        'status': new_status
    })
    
    return jsonify({
        'message': 'Warm handoff completed',
        'referral_id': str(referral['_id']),
        'handoff_date': update_data.get('handoff_date').isoformat(),
        'status': new_status
    }), 200


@referrals_bp.route('/<referral_id>', methods=['GET'])
@jwt_required()
def get_referral(referral_id):
    """Get referral details - returns different fields based on referral type"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        rid = ObjectId(referral_id)
        referral = db.db.referrals.find_one({"_id": rid})
    except:
        referral = db.db.referrals.find_one({"_id": referral_id})
    
    if not referral:
        return jsonify({'error': 'Referral not found'}), 404
    
    audit_log(db.db, 'referral', 'view', entity_id=str(referral['_id']))
    
    # Build response based on referral type
    response = {
        'referral_id': str(referral['_id']),
        'case_id': str(referral.get('case_id')),
        'referral_type': referral.get('referral_type'),
        'status': referral.get('status'),
        'reason': referral.get('reason'),
        'urgency': referral.get('urgency'),
        'created_at': referral['created_at'].isoformat() if isinstance(referral.get('created_at'), datetime) else referral.get('created_at'),
        'updated_at': referral.get('updated_at').isoformat() if isinstance(referral.get('updated_at'), datetime) else referral.get('updated_at')
    }
    
    # Add type-specific fields
    if referral.get('referral_type') == 'CPS':
        response.update({
            'allegations': referral.get('allegations'),
            'reporter_name': referral.get('reporter_name'),
            'reporter_relationship': referral.get('reporter_relationship'),
            'student_dob': referral.get('student_dob'),
            'student_address': referral.get('student_address'),
            'has_siblings': referral.get('has_siblings'),
            'siblings_info': referral.get('siblings_info'),
            'cps_case_number': referral.get('cps_case_number'),
            'investigator_name': referral.get('investigator_name'),
            'investigator_contact': referral.get('investigator_contact'),
            'investigation_started_date': referral.get('investigation_started_date').isoformat() if isinstance(referral.get('investigation_started_date'), datetime) else referral.get('investigation_started_date'),
            'investigation_completed_date': referral.get('investigation_completed_date').isoformat() if isinstance(referral.get('investigation_completed_date'), datetime) else referral.get('investigation_completed_date'),
            'investigation_findings': referral.get('investigation_findings'),  # SUBSTANTIATED, UNSUBSTANTIATED, INCONCLUSIVE
            'investigation_details': referral.get('investigation_details'),
            'decision': referral.get('decision'),  # CASE_OPENED, CASE_CLOSED, REFERRED_TO_SERVICES
            'case_opened_with_cps': referral.get('case_opened_with_cps'),
            'investigation_notes': referral.get('investigation_notes', [])
        })
    
    elif referral.get('referral_type') == 'EXTERNAL':
        response.update({
            'service_type': referral.get('sub_type'),
            'receiving_provider_name': referral.get('receiving_provider_name'),
            'receiving_provider_contact': referral.get('receiving_provider_contact'),
            'external_case_number': referral.get('external_case_number'),
            'roi_signed': referral.get('roi_signed'),
            'roi_signed_at': referral.get('roi_signed_at').isoformat() if isinstance(referral.get('roi_signed_at'), datetime) else referral.get('roi_signed_at'),
            'roi_expires_at': referral.get('roi_expires_at').isoformat() if isinstance(referral.get('roi_expires_at'), datetime) else referral.get('roi_expires_at'),
            'agency_response': referral.get('agency_response')
        })
    
    elif referral.get('referral_type') == 'INTERNAL':
        receiving_provider = None
        if referral.get('receiving_provider_id'):
            provider = db.db.users.find_one({"_id": referral.get('receiving_provider_id')})
            receiving_provider = {
                'provider_id': str(provider.get('_id')),
                'provider_name': f"{provider.get('first_name', '')} {provider.get('last_name', '')}".strip()
            } if provider else None
        
        response.update({
            'receiving_provider': receiving_provider,
            'provider_acknowledgment_date': referral.get('provider_acknowledgment_date').isoformat() if isinstance(referral.get('provider_acknowledgment_date'), datetime) else referral.get('provider_acknowledgment_date')
        })
    
    response['warm_handoff_completed'] = referral.get('warm_handoff_completed')
    
    return jsonify(response), 200


@referrals_bp.route('/case/<case_id>/history', methods=['GET'])
@jwt_required()
def get_case_referral_history(case_id):
    """Get referral history for a case with CPS-specific information"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        cid = ObjectId(case_id)
        case = db.db.cases.find_one({"_id": cid})
    except:
        case = db.db.cases.find_one({"_id": case_id})
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    referrals = list(db.db.referrals.find({"case_id": case['_id']}).sort("created_at", -1))
    
    result_referrals = []
    for r in referrals:
        ref_data = {
            'referral_id': str(r['_id']),
            'referral_type': r.get('referral_type'),
            'status': r.get('status'),
            'reason': r.get('reason'),
            'urgency': r.get('urgency'),
            'created_at': r['created_at'].isoformat() if isinstance(r['created_at'], datetime) else r['created_at'],
            'warm_handoff_completed': r.get('warm_handoff_completed')
        }
        
        # Add type-specific information
        if r.get('referral_type') == 'CPS':
            ref_data.update({
                'allegations': r.get('allegations'),
                'investigator_name': r.get('investigator_name'),
                'investigation_findings': r.get('investigation_findings'),
                'cps_case_number': r.get('cps_case_number'),
                'case_opened_with_cps': r.get('case_opened_with_cps'),
                'decision': r.get('decision')
            })
        elif r.get('referral_type') == 'EXTERNAL':
            ref_data.update({
                'service_type': r.get('sub_type'),
                'receiving_provider': r.get('receiving_provider_name'),
                'external_case_number': r.get('external_case_number')
            })
        elif r.get('referral_type') == 'INTERNAL':
            provider_name = r.get('receiving_provider_name')
            ref_data['receiving_provider'] = provider_name
        
        result_referrals.append(ref_data)
    
    return jsonify({
        'case_id': str(case['_id']),
        'total_referrals': len(referrals),
        'referrals': result_referrals
    }), 200


@referrals_bp.route('/pending-warm-handoffs', methods=['GET'])
@jwt_required()
def get_pending_warm_handoffs():
    """Get referrals pending warm handoff completion (EPIC 8: Zero cases closed without warm handoff completion)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    # Get pending referrals across all types
    pending = list(db.db.referrals.find({
        "status": {"$nin": ["COMPLETED", "CASE_CLOSED", "REJECTED"]},
        "warm_handoff_completed": False
    }).sort("created_at", 1))
    
    result_referrals = []
    for r in pending:
        case = db.db.cases.find_one({"_id": r.get('case_id')})
        student = db.db.users.find_one({"_id": case.get('student_id')}) if case else None
        
        ref_data = {
            'referral_id': str(r['_id']),
            'referral_type': r.get('referral_type'),
            'status': r.get('status'),
            'urgency': r.get('urgency'),
            'case_number': case.get('case_number') if case else None,
            'student_name': f"{student.get('first_name', '')} {student.get('last_name', '')}".strip() if student else None,
            'days_pending': (datetime.utcnow() - r['created_at']).days if isinstance(r['created_at'], datetime) else 0
        }
        
        # Add type-specific information
        if r.get('referral_type') == 'CPS':
            ref_data.update({
                'allegations': r.get('allegations'),
                'investigator_name': r.get('investigator_name'),
                'investigation_findings': r.get('investigation_findings'),
                'cps_case_number': r.get('cps_case_number'),
                'decision': r.get('decision'),
                'case_opened_with_cps': r.get('case_opened_with_cps')
            })
        elif r.get('referral_type') == 'EXTERNAL':
            ref_data.update({
                'service_type': r.get('sub_type'),
                'receiving_provider': r.get('receiving_provider_name'),
                'roi_signed': r.get('roi_signed')
            })
        elif r.get('referral_type') == 'INTERNAL':
            ref_data['receiving_provider'] = r.get('receiving_provider_name')
        
        result_referrals.append(ref_data)
    
    return jsonify({
        'pending_count': len(pending),
        'referrals': result_referrals
    }), 200


@referrals_bp.route('/case/<case_id>/can-close', methods=['GET'])
@jwt_required()
def check_case_closure_eligibility(case_id):
    """Check if case can be closed - must have warm handoff completed or no active referrals"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        cid = ObjectId(case_id)
        case = db.db.cases.find_one({"_id": cid})
    except:
        case = db.db.cases.find_one({"_id": case_id})
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    # Check if all referrals have been completed/closed
    cps_referrals = list(db.db.referrals.find({
        "case_id": case['_id'],
        "referral_type": "CPS",
        "$or": [
            {"status": {"$in": ["SUBMITTED", "ASSIGNED", "UNDER_INVESTIGATION"]}},
            {"decision": {"$in": [None, "CASE_OPENED"]}}
        ]
    }))
    
    active_external_referrals = list(db.db.referrals.find({
        "case_id": case['_id'],
        "referral_type": "EXTERNAL",
        "status": {"$in": ["SUBMITTED", "ACKNOWLEDGED", "IN_PROGRESS"]},
        "warm_handoff_completed": False
    }))
    
    active_internal_referrals = list(db.db.referrals.find({
        "case_id": case['_id'],
        "referral_type": "INTERNAL",
        "status": {"$in": ["SUBMITTED", "ACKNOWLEDGED", "IN_PROGRESS"]},
        "warm_handoff_completed": False
    }))
    
    can_close = len(cps_referrals) == 0 and len(active_external_referrals) == 0 and len(active_internal_referrals) == 0
    
    blockers = []
    if len(cps_referrals) > 0:
        for r in cps_referrals:
            blockers.append(f"CPS case pending: {r.get('status')} (Decision: {r.get('decision', 'Pending')})")
    
    if len(active_external_referrals) > 0:
        blockers.append(f"{len(active_external_referrals)} external service(s) in progress")
    
    if len(active_internal_referrals) > 0:
        blockers.append(f"{len(active_internal_referrals)} internal referral(s) in progress")

    return jsonify({'can_close': can_close, 'blockers': blockers}), 200

@referrals_bp.route('/summary', methods=['GET'])
@jwt_required()
def get_referral_summary():
    """Get summary of all referrals by status"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    all_referrals = list(db.db.referrals.find())
    
    summary = {
        'total_referrals': len(all_referrals),
        'by_type': {
            'CPS': 0,
            'EXTERNAL': 0,
            'INTERNAL': 0
        },
        'cps_status': {
            'SUBMITTED': 0,
            'ASSIGNED': 0,
            'UNDER_INVESTIGATION': 0,
            'FINDINGS_ISSUED': 0,
            'CASE_OPENED': 0,
            'CASE_CLOSED': 0,
            'REFERRED_TO_SERVICES': 0
        },
        'cps_findings': {
            'SUBSTANTIATED': 0,
            'UNSUBSTANTIATED': 0,
            'INCONCLUSIVE': 0
        },
        'pending_warm_handoffs': 0
    }
    
    for r in all_referrals:
        ref_type = r.get('referral_type')
        summary['by_type'][ref_type] = summary['by_type'].get(ref_type, 0) + 1
        
        if ref_type == 'CPS':
            status = r.get('status', 'UNKNOWN')
            if status in summary['cps_status']:
                summary['cps_status'][status] += 1
            
            findings = r.get('investigation_findings')
            if findings in summary['cps_findings']:
                summary['cps_findings'][findings] += 1
        
        if not r.get('warm_handoff_completed'):
            summary['pending_warm_handoffs'] += 1
    
    return jsonify(summary), 200


@referrals_bp.route('/cps/list', methods=['GET'])
@jwt_required()
def list_cps_referrals():
    """List all CPS referrals with investigation status"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    cps_referrals = list(db.db.referrals.find({
        "referral_type": "CPS"
    }).sort("created_at", -1))
    
    result = []
    for r in cps_referrals:
        case = db.db.cases.find_one({"_id": r.get('case_id')})
        student = db.db.users.find_one({"_id": case.get('student_id')}) if case else None
        
        result.append({
            'referral_id': str(r['_id']),
            'cps_case_number': r.get('cps_case_number'),
            'student_name': f"{student.get('first_name', '')} {student.get('last_name', '')}".strip() if student else None,
            'student_dob': r.get('student_dob'),
            'allegations': r.get('allegations'),
            'status': r.get('status'),
            'investigator_name': r.get('investigator_name'),
            'investigation_findings': r.get('investigation_findings'),
            'decision': r.get('decision'),
            'case_opened_with_cps': r.get('case_opened_with_cps'),
            'days_since_submitted': (datetime.utcnow() - r['created_at']).days if isinstance(r['created_at'], datetime) else 0,
            'created_at': r['created_at'].isoformat() if isinstance(r['created_at'], datetime) else r['created_at']
        })
    
    return jsonify({
        'total_cps_referrals': len(result),
        'referrals': result
    }), 200


@referrals_bp.route('/pool', methods=['GET'])
@jwt_required()
def get_pool_referrals():
    """Get pending pool referrals for the current user's role."""
    user_id = get_jwt_identity()

    try:
        me = db.db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        me = db.db.users.find_one({"_id": user_id})

    if not me:
        return jsonify({'error': 'User not found'}), 404

    my_role = me.get('role', '').upper()
    if my_role not in ('COUNSELOR', 'PSYCHOLOGIST'):
        return jsonify({'error': 'Only counselors and psychologists can view pool referrals'}), 403

    pool_refs = list(db.db.referrals.find({
        "referral_type": "INTERNAL",
        "assigned_to_role": my_role,
        "status": "PENDING_ACCEPTANCE",
        "assigned_to_user": {"$exists": False}
    }).sort("created_at", -1))

    result = []
    for r in pool_refs:
        case = db.db.cases.find_one({"_id": r.get('case_id')})
        student = None
        if case:
            student = db.db.users.find_one({"_id": case.get('student_id')})
        referring = db.db.users.find_one({"_id": r.get('referring_counselor_id')})

        result.append({
            'referral_id': str(r['_id']),
            'case_id': str(r['case_id']) if r.get('case_id') else None,
            'student_name': f"{student.get('first_name', '')} {student.get('last_name', '')}".strip() if student else None,
            'student_id': str(student.get('school_id', '')) if student else None,
            'referred_by': f"{referring.get('first_name', '')} {referring.get('last_name', '')}".strip() if referring else None,
            'reason': r.get('reason'),
            'urgency': r.get('urgency', 'routine'),
            'assigned_to_role': r.get('assigned_to_role'),
            'created_at': r['created_at'].isoformat() if isinstance(r.get('created_at'), datetime) else r.get('created_at'),
        })

    return jsonify({'referrals': result, 'total': len(result)}), 200


@referrals_bp.route('/<referral_id>/accept', methods=['POST'])
@jwt_required()
def accept_pool_referral(referral_id):
    """Accept a pool referral — assigns the current user to the case."""
    user_id = get_jwt_identity()

    try:
        me = db.db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        me = db.db.users.find_one({"_id": user_id})

    if not me:
        return jsonify({'error': 'User not found'}), 404

    my_role = me.get('role', '').upper()

    try:
        rid = ObjectId(referral_id)
        referral = db.db.referrals.find_one({"_id": rid})
    except Exception:
        referral = db.db.referrals.find_one({"_id": referral_id})

    if not referral:
        return jsonify({'error': 'Referral not found'}), 404

    if referral.get('referral_type') != 'INTERNAL':
        return jsonify({'error': 'Only internal referrals can be accepted'}), 400

    if referral.get('status') != 'PENDING_ACCEPTANCE':
        return jsonify({'error': 'Referral is no longer available for acceptance'}), 409

    if referral.get('assigned_to_role', '').upper() != my_role:
        return jsonify({'error': 'Your role does not match this referral pool'}), 403

    provider_name = f"{me.get('first_name', '')} {me.get('last_name', '')}".strip()

    db.db.referrals.update_one(
        {"_id": referral['_id'], "status": "PENDING_ACCEPTANCE"},
        {"$set": {
            "assigned_to_user": me['_id'],
            "receiving_provider_id": me['_id'],
            "receiving_provider_name": provider_name,
            "status": "SUBMITTED",
            "accepted_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }}
    )

    # Also update the case's assigned counselor if not already set
    case = db.db.cases.find_one({"_id": referral.get('case_id')})
    if case and not case.get('assigned_counselor_id'):
        db.db.cases.update_one(
            {"_id": case['_id']},
            {"$set": {
                "assigned_counselor_id": me['_id'],
                "updated_at": datetime.utcnow(),
            }}
        )

    audit_log(db.db, 'referral', 'pool_accepted', entity_id=str(referral['_id']), new_values={
        'accepted_by': str(me['_id']),
        'provider_name': provider_name,
    })

    return jsonify({
        'referral_id': str(referral['_id']),
        'status': 'SUBMITTED',
        'accepted_by': provider_name,
    }), 200
