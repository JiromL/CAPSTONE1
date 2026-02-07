"""
EPIC 8: REFERRAL & WARM HANDOFF MODULE
Blueprint for internal/external referrals with ROI tracking and warm handoffs
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from models import db, PermissionType
from utils import audit_log, user_has_permission
from datetime import datetime, timedelta

referrals_bp = Blueprint('referrals', __name__, url_prefix='/api/referrals')


@referrals_bp.route('/initiate', methods=['POST'])
@jwt_required()
def initiate_referral():
    """Initiate a referral (EPIC 8: Internal Referral Routing & External Referral Form Builder)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    data = request.get_json()
    
    if not data.get('case_id') or not data.get('referral_type') or not data.get('reason'):
        return jsonify({'error': 'Missing required fields'}), 400
    
    try:
        cid = ObjectId(data['case_id'])
        case = db.db.cases.find_one({"_id": cid})
    except:
        case = db.db.cases.find_one({"_id": data['case_id']})
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    referral_type = data['referral_type'].upper()
    if referral_type not in ['INTERNAL', 'EXTERNAL']:
        return jsonify({'error': 'Invalid referral type'}), 400
    
    referral = {
        "case_id": case['_id'],
        "referring_counselor_id": ObjectId(user_id) if isinstance(user_id, str) else user_id,
        "referral_type": referral_type,
        "reason": data['reason'],
        "recommended_services": data.get('recommended_services'),
        "urgency": data.get('urgency', 'routine'),
        "status": "INITIATED",
        "roi_signed": False,
        "warm_handoff_completed": False,
        "created_at": datetime.utcnow()
    }
    
    # Handle internal vs external
    if referral_type == 'INTERNAL':
        if data.get('receiving_provider_id'):
            try:
                provider_id = ObjectId(data['receiving_provider_id'])
                provider = db.db.users.find_one({"_id": provider_id})
            except:
                provider = db.db.users.find_one({"_id": data['receiving_provider_id']})
            
            if not provider:
                return jsonify({'error': 'Invalid receiving provider'}), 400
            
            referral["receiving_provider_id"] = provider['_id']
    else:  # EXTERNAL
        referral["receiving_provider_name"] = data.get('receiving_provider_name')
        referral["receiving_provider_contact"] = data.get('receiving_provider_contact')
    
    result = db.db.referrals.insert_one(referral)
    
    audit_log(db.db, 'referral', 'initiate', entity_id=str(result.inserted_id), new_values={
        'case_id': str(case['_id']),
        'referral_type': referral_type,
        'reason': data['reason']
    })
    
    return jsonify({
        'referral_id': str(result.inserted_id),
        'case_id': str(case['_id']),
        'status': 'INITIATED',
        'created_at': referral['created_at'].isoformat()
    }), 201


@referrals_bp.route('/<referral_id>/roi-request', methods=['POST'])
@jwt_required()
def request_roi_signature(referral_id):
    """Request ROI (Release of Information) signature (EPIC 8: ROI Upload System)"""
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
    
    db.db.referrals.update_one(
        {"_id": referral['_id']},
        {"$set": {"status": "ROI_PENDING", "updated_at": datetime.utcnow()}}
    )
    
    audit_log(db.db, 'referral', 'roi_requested', entity_id=str(referral['_id']))
    
    return jsonify({
        'message': 'ROI signature requested',
        'referral_id': str(referral['_id']),
        'status': 'ROI_PENDING'
    }), 200


@referrals_bp.route('/<referral_id>/roi-upload', methods=['POST'])
@jwt_required()
def upload_roi(referral_id):
    """Upload signed ROI (EPIC 8: ROI Upload System)"""
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
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # In production, implement secure file upload
    file_path = f'uploads/roi/referral_{referral_id}_{datetime.utcnow().timestamp()}.pdf'
    
    db.db.referrals.update_one(
        {"_id": referral['_id']},
        {"$set": {
            "roi_file_url": file_path,
            "roi_signed": True,
            "roi_signed_at": datetime.utcnow(),
            "roi_expires_at": datetime.utcnow() + timedelta(days=365),
            "status": "ROI_RECEIVED",
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
    """Send referral to receiving provider (EPIC 8: Internal Referral Routing)"""
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
    
    # For external referrals, ROI must be obtained
    if referral.get('referral_type') == 'EXTERNAL' and not referral.get('roi_signed'):
        return jsonify({'error': 'ROI must be signed before external referral'}), 400
    
    db.db.referrals.update_one(
        {"_id": referral['_id']},
        {"$set": {
            "status": "REFERRED",
            "updated_at": datetime.utcnow()
        }}
    )
    
    audit_log(db.db, 'referral', 'sent', entity_id=str(referral['_id']), new_values={'status': 'REFERRED'})
    
    return jsonify({
        'message': 'Referral sent',
        'referral_id': str(referral['_id']),
        'status': 'REFERRED'
    }), 200


@referrals_bp.route('/<referral_id>/acknowledge', methods=['POST'])
@jwt_required()
def acknowledge_referral(referral_id):
    """Acknowledge referral receipt (receiving provider)"""
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
    
    db.db.referrals.update_one(
        {"_id": referral['_id']},
        {"$set": {
            "status": "RECEIVED",
            "updated_at": datetime.utcnow()
        }}
    )
    
    audit_log(db.db, 'referral', 'acknowledged', entity_id=str(referral['_id']))
    
    return jsonify({
        'message': 'Referral acknowledged',
        'referral_id': str(referral['_id']),
        'status': 'RECEIVED'
    }), 200


@referrals_bp.route('/<referral_id>/warm-handoff', methods=['POST'])
@jwt_required()
def complete_warm_handoff(referral_id):
    """Complete warm handoff (EPIC 8: Warm Handoff Status Tracker)"""
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
    
    data = request.get_json()
    
    db.db.referrals.update_one(
        {"_id": referral['_id']},
        {"$set": {
            "warm_handoff_completed": True,
            "handoff_date": datetime.utcnow(),
            "status": "COMPLETED",
            "completion_notes": data.get('completion_notes'),
            "updated_at": datetime.utcnow()
        }}
    )
    
    audit_log(db.db, 'referral', 'warm_handoff_completed', entity_id=str(referral['_id']), new_values={
        'warm_handoff_completed': True,
        'status': 'COMPLETED'
    })
    
    return jsonify({
        'message': 'Warm handoff completed',
        'referral_id': str(referral['_id']),
        'handoff_date': datetime.utcnow().isoformat(),
        'status': 'COMPLETED'
    }), 200


@referrals_bp.route('/<referral_id>', methods=['GET'])
@jwt_required()
def get_referral(referral_id):
    """Get referral details"""
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
    
    receiving_provider = None
    if referral.get('referral_type') == 'INTERNAL' and referral.get('receiving_provider_id'):
        receiving_provider = db.db.users.find_one({"_id": referral.get('receiving_provider_id')})
        receiving_provider = f"{receiving_provider.get('first_name', '')} {receiving_provider.get('last_name', '')}" if receiving_provider else None
    elif referral.get('referral_type') == 'EXTERNAL':
        receiving_provider = referral.get('receiving_provider_name')
    
    return jsonify({
        'referral_id': str(referral['_id']),
        'case_id': str(referral.get('case_id')),
        'referral_type': referral.get('referral_type'),
        'reason': referral.get('reason'),
        'recommended_services': referral.get('recommended_services'),
        'urgency': referral.get('urgency'),
        'status': referral.get('status'),
        'roi_signed': referral.get('roi_signed'),
        'roi_signed_at': referral['roi_signed_at'].isoformat() if isinstance(referral.get('roi_signed_at'), datetime) else referral.get('roi_signed_at'),
        'warm_handoff_completed': referral.get('warm_handoff_completed'),
        'handoff_date': referral['handoff_date'].isoformat() if isinstance(referral.get('handoff_date'), datetime) else referral.get('handoff_date'),
        'completion_notes': referral.get('completion_notes'),
        'created_at': referral['created_at'].isoformat() if isinstance(referral['created_at'], datetime) else referral['created_at']
    }), 200


@referrals_bp.route('/case/<case_id>/history', methods=['GET'])
@jwt_required()
def get_case_referral_history(case_id):
    """Get referral history for a case (EPIC 8: Referral Completion Logging)"""
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
        receiving_provider = None
        if r.get('referral_type') == 'INTERNAL' and r.get('receiving_provider_id'):
            provider = db.db.users.find_one({"_id": r.get('receiving_provider_id')})
            receiving_provider = f"{provider.get('first_name', '')} {provider.get('last_name', '')}" if provider else None
        elif r.get('referral_type') == 'EXTERNAL':
            receiving_provider = r.get('receiving_provider_name')
        
        result_referrals.append({
            'referral_id': str(r['_id']),
            'referral_type': r.get('referral_type'),
            'reason': r.get('reason'),
            'status': r.get('status'),
            'warm_handoff_completed': r.get('warm_handoff_completed'),
            'created_at': r['created_at'].isoformat() if isinstance(r['created_at'], datetime) else r['created_at'],
            'receiving_provider': receiving_provider
        })
    
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
    
    pending_statuses = ['INITIATED', 'ROI_PENDING', 'ROI_RECEIVED', 'REFERRED', 'RECEIVED']
    
    pending = list(db.db.referrals.find({
        "status": {"$in": pending_statuses},
        "warm_handoff_completed": False
    }).sort("created_at", 1))
    
    result_referrals = []
    for r in pending:
        case = db.db.cases.find_one({"_id": r.get('case_id')})
        student = db.db.users.find_one({"_id": case.get('student_id')}) if case else None
        
        receiving_provider = None
        if r.get('referral_type') == 'INTERNAL' and r.get('receiving_provider_id'):
            provider = db.db.users.find_one({"_id": r.get('receiving_provider_id')})
            receiving_provider = f"{provider.get('first_name', '')} {provider.get('last_name', '')}" if provider else None
        elif r.get('referral_type') == 'EXTERNAL':
            receiving_provider = r.get('receiving_provider_name')
        
        days_pending = (datetime.utcnow() - r['created_at']).days if isinstance(r['created_at'], datetime) else 0
        
        result_referrals.append({
            'referral_id': str(r['_id']),
            'case_number': case.get('case_number') if case else None,
            'student_name': f"{student.get('first_name', '')} {student.get('last_name', '')}" if student else None,
            'referral_type': r.get('referral_type'),
            'receiving_provider': receiving_provider,
            'status': r.get('status'),
            'urgency': r.get('urgency'),
            'days_pending': days_pending,
            'roi_signed': r.get('roi_signed')
        })
    
    return jsonify({
        'pending_count': len(pending),
        'referrals': result_referrals
    }), 200


@referrals_bp.route('/case/<case_id>/can-close', methods=['GET'])
@jwt_required()
def check_case_closure_eligibility(case_id):
    """Check if case can be closed (must have completed warm handoff) (EPIC 8)"""
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
    
    # Check if all referrals have been completed with warm handoff
    incomplete_referrals = list(db.db.referrals.find({
        "case_id": case['_id'],
        "status": {"$ne": "COMPLETED"}
    }))
    
    incomplete_handoffs = list(db.db.referrals.find({
        "case_id": case['_id'],
        "warm_handoff_completed": False,
        "status": {"$ne": "REJECTED"}
    }))
    
    can_close = len(incomplete_referrals) == 0 and len(incomplete_handoffs) == 0
    
    return jsonify({
        'case_id': str(case['_id']),
        'can_close': can_close,
        'incomplete_referrals': len(incomplete_referrals),
        'incomplete_handoffs': len(incomplete_handoffs),
        'message': 'Case can be closed' if can_close else f'{len(incomplete_handoffs)} warm handoffs pending'
    }), 200
