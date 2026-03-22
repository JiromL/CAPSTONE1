"""
Counselor-to-Counselor Internal Referral Blueprint
Handles rare case scenarios where intake counselors refer to other counselors
within CPS (different from case handovers).
This is for specialized treatment needs that require different counselor expertise.
"""

from flask import Blueprint, request, jsonify
from datetime import datetime
from functools import wraps
from bson.objectid import ObjectId

c2c_referral_bp = Blueprint('c2c_referral', __name__, url_prefix='/api/counselor-referrals')


# Import database and utilities
from models import db, PermissionType
from utils import audit_log, user_has_permission
from flask_jwt_extended import jwt_required, get_jwt_identity

# Permission decorators

def require_permission(required_permission):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            token_data = request.headers.get('Authorization', '').replace('Bearer ', '')
            _, user_id = token_required(token_data)
            if not user_id:
                return jsonify({"error": "Unauthorized"}), 401
            
            permissions = user_has_permission(user_id)
            if required_permission not in permissions and 'ADMIN_ACCESS' not in permissions:
                return jsonify({"error": "Insufficient permissions"}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


# ============ COUNSELOR REFERRAL CRUD ============

@c2c_referral_bp.route('/', methods=['POST'])
@require_permission('CREATE_C2C_REFERRAL')
def create_c2c_referral():
    """
    Create a counselor-to-counselor internal referral for rare/specialty cases.
    
    Body:
    {
        "case_id": "string",
        "client_id": "string",
        "referring_counselor_id": "string (intake counselor)",
        "target_counselor_id": "string (receiving counselor)",
        "specialty_required": "trauma|eating_disorder|substance_abuse|crisis|grief|relationship|other",
        "reason": "string (clinical reason for referral)",
        "urgency": "low|medium|high|critical",
        "clinical_notes": "string",
        "recommendation": "string (what they should focus on)",
        "is_rare_case": true,
        "rare_case_justification": "string (explain why this is rare/exceptional)"
    }
    """
    try:
        auth_header = request.headers.get('Authorization', '').replace('Bearer ', '')
        _, user_id = token_required(auth_header)
        
        data = request.json
        
        # Validate required fields
        required_fields = ['case_id', 'client_id', 'referring_counselor_id', 'target_counselor_id', 
                          'specialty_required', 'reason', 'urgency']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing field: {field}"}), 400
        
        valid_specialties = ['trauma', 'eating_disorder', 'substance_abuse', 'crisis', 'grief', 'relationship', 'other']
        if data['specialty_required'] not in valid_specialties:
            return jsonify({"error": f"Invalid specialty. Must be one of: {', '.join(valid_specialties)}"}), 400
        
        valid_urgencies = ['low', 'medium', 'high', 'critical']
        if data['urgency'] not in valid_urgencies:
            return jsonify({"error": f"Invalid urgency. Must be one of: {', '.join(valid_urgencies)}"}), 400
        
        # Rare case validation
        if data.get('is_rare_case') and not data.get('rare_case_justification'):
            return jsonify({"error": "Rare case justification required"}), 400
        
        referral_doc = {
            "case_id": ObjectId(data['case_id']),
            "client_id": data['client_id'],
            "referring_counselor_id": data['referring_counselor_id'],
            "target_counselor_id": data['target_counselor_id'],
            "specialty_required": data['specialty_required'],
            "reason": data['reason'],
            "urgency": data['urgency'],
            "clinical_notes": data.get('clinical_notes', ''),
            "recommendation": data.get('recommendation', ''),
            "is_rare_case": data.get('is_rare_case', False),
            "rare_case_justification": data.get('rare_case_justification', ''),
            "status": "pending_acceptance",  # pending_acceptance, accepted, declined, completed
            "created_by": user_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "accepted_at": None,
            "acceptance_notes": "",
            "declined_at": None,
            "decline_reason": "",
            "completed_at": None,
            "completion_notes": "",
            "follow_up_sessions": []
        }
        
        result = db.db.counselor_referrals.insert_one(referral_doc)
        referral_doc['_id'] = str(result.inserted_id)
        referral_doc['case_id'] = str(referral_doc['case_id'])
        
        # Log audit
        audit_log(db.db, 'counselor_referrals', 'CREATE', entity_id=str(result.inserted_id),
                  old_values=None,
                  new_values={
                      'specialty': data['specialty_required'],
                      'is_rare_case': data.get('is_rare_case', False),
                      'created_by': user_id
                  })
        
        return jsonify(referral_doc), 201
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@c2c_referral_bp.route('/<referral_id>', methods=['GET'])
def get_c2c_referral(referral_id):
    """Get a specific counselor referral."""
    try:
        referral = db.db.counselor_referrals.find_one({'_id': ObjectId(referral_id)})
        if not referral:
            return jsonify({"error": "Referral not found"}), 404
        
        referral['_id'] = str(referral['_id'])
        referral['case_id'] = str(referral['case_id'])
        
        return jsonify(referral), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@c2c_referral_bp.route('/', methods=['GET'])
def list_c2c_referrals():
    """
    List counselor-to-counselor referrals.
    Query params: case_id, status, specialty_required, urgency, rare_cases_only
    """
    try:
        query = {}
        
        if request.args.get('case_id'):
            query['case_id'] = ObjectId(request.args.get('case_id'))
        if request.args.get('status'):
            query['status'] = request.args.get('status')
        if request.args.get('specialty_required'):
            query['specialty_required'] = request.args.get('specialty_required')
        if request.args.get('urgency'):
            query['urgency'] = request.args.get('urgency')
        if request.args.get('rare_cases_only') == 'true':
            query['is_rare_case'] = True
        
        referrals = list(db.db.counselor_referrals.find(query).sort('created_at', -1).limit(100))
        
        for referral in referrals:
            referral['_id'] = str(referral['_id'])
            referral['case_id'] = str(referral['case_id'])
        
        return jsonify(referrals), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============ REFERRAL WORKFLOW ============

@c2c_referral_bp.route('/<referral_id>/accept', methods=['POST'])
@require_permission('ACCEPT_C2C_REFERRAL')
def accept_c2c_referral(referral_id):
    """
    Accept a counselor-to-counselor referral.
    Counselor accepting the referral confirms they will take the case.
    """
    try:
        auth_header = request.headers.get('Authorization', '').replace('Bearer ', '')
        _, user_id = token_required(auth_header)
        
        referral = db.db.counselor_referrals.find_one({'_id': ObjectId(referral_id)})
        if not referral:
            return jsonify({"error": "Referral not found"}), 404
        
        if referral['status'] != 'pending_acceptance':
            return jsonify({"error": "Referral cannot be accepted in current status"}), 400
        
        data = request.json or {}
        
        updates = {
            'status': 'accepted',
            'accepted_at': datetime.utcnow(),
            'acceptance_notes': data.get('acceptance_notes', ''),
            'updated_at': datetime.utcnow()
        }
        
        db.db.counselor_referrals.update_one({'_id': ObjectId(referral_id)}, {'$set': updates})
        
        # Log audit
        log_audit_action(
            collection='counselor_referrals',
            action='UPDATE',
            case_id=str(referral['case_id']),
            user_id=user_id,
            changes={'status': 'accepted'},
            reason='C2C referral accepted'
        )
        
        updated_referral = db.db.counselor_referrals.find_one({'_id': ObjectId(referral_id)})
        updated_referral['_id'] = str(updated_referral['_id'])
        updated_referral['case_id'] = str(updated_referral['case_id'])
        
        return jsonify(updated_referral), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@c2c_referral_bp.route('/<referral_id>/decline', methods=['POST'])
@require_permission('ACCEPT_C2C_REFERRAL')
def decline_c2c_referral(referral_id):
    """
    Decline a counselor-to-counselor referral.
    Counselor can decline if they're unable to take the case.
    """
    try:
        auth_header = request.headers.get('Authorization', '').replace('Bearer ', '')
        _, user_id = token_required(auth_header)
        
        referral = db.db.counselor_referrals.find_one({'_id': ObjectId(referral_id)})
        if not referral:
            return jsonify({"error": "Referral not found"}), 404
        
        if referral['status'] != 'pending_acceptance':
            return jsonify({"error": "Referral cannot be declined in current status"}), 400
        
        data = request.json
        if not data or 'decline_reason' not in data:
            return jsonify({"error": "decline_reason is required"}), 400
        
        updates = {
            'status': 'declined',
            'declined_at': datetime.utcnow(),
            'decline_reason': data['decline_reason'],
            'updated_at': datetime.utcnow()
        }
        
        db.db.counselor_referrals.update_one({'_id': ObjectId(referral_id)}, {'$set': updates})
        
        # Log audit
        log_audit_action(
            collection='counselor_referrals',
            action='UPDATE',
            case_id=str(referral['case_id']),
            user_id=user_id,
            changes={'status': 'declined'},
            reason=f"C2C referral declined: {data['decline_reason']}"
        )
        
        updated_referral = db.db.counselor_referrals.find_one({'_id': ObjectId(referral_id)})
        updated_referral['_id'] = str(updated_referral['_id'])
        updated_referral['case_id'] = str(updated_referral['case_id'])
        
        return jsonify(updated_referral), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@c2c_referral_bp.route('/<referral_id>/complete', methods=['POST'])
@require_permission('ACCEPT_C2C_REFERRAL')
def complete_c2c_referral(referral_id):
    """
    Mark a referral as completed.
    Called when the target counselor has resolved the specialty need.
    """
    try:
        auth_header = request.headers.get('Authorization', '').replace('Bearer ', '')
        _, user_id = token_required(auth_header)
        
        referral = db.counselor_referrals.find_one({'_id': ObjectId(referral_id)})
        if not referral:
            return jsonify({"error": "Referral not found"}), 404
        
        if referral['status'] != 'accepted':
            return jsonify({"error": "Can only complete accepted referrals"}), 400
        
        data = request.json or {}
        
        updates = {
            'status': 'completed',
            'completed_at': datetime.utcnow(),
            'completion_notes': data.get('completion_notes', ''),
            'updated_at': datetime.utcnow()
        }
        
        db.counselor_referrals.update_one({'_id': ObjectId(referral_id)}, {'$set': updates})
        
        # Log audit
        log_audit_action(
            collection='counselor_referrals',
            action='UPDATE',
            case_id=str(referral['case_id']),
            user_id=user_id,
            changes={'status': 'completed'},
            reason='C2C referral completed'
        )
        
        updated_referral = db.counselor_referrals.find_one({'_id': ObjectId(referral_id)})
        updated_referral['_id'] = str(updated_referral['_id'])
        updated_referral['case_id'] = str(updated_referral['case_id'])
        
        return jsonify(updated_referral), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============ FOLLOW-UP AND TRACKING ============

@c2c_referral_bp.route('/<referral_id>/follow-up', methods=['POST'])
@require_permission('ACCEPT_C2C_REFERRAL')
def log_follow_up(referral_id):
    """
    Log a follow-up note in the referral workflow.
    Used to track ongoing communication and progress.
    """
    try:
        auth_header = request.headers.get('Authorization', '').replace('Bearer ', '')
        _, user_id = token_required(auth_header)
        
        referral = db.counselor_referrals.find_one({'_id': ObjectId(referral_id)})
        if not referral:
            return jsonify({"error": "Referral not found"}), 404
        
        data = request.json
        if not data or 'note' not in data:
            return jsonify({"error": "note is required"}), 400
        
        follow_up_entry = {
            'logged_by': user_id,
            'note': data['note'],
            'logged_at': datetime.utcnow(),
            'session_summary': data.get('session_summary', '')
        }
        
        db.counselor_referrals.update_one(
            {'_id': ObjectId(referral_id)},
            {
                '$push': {'follow_up_sessions': follow_up_entry},
                '$set': {'updated_at': datetime.utcnow()}
            }
        )
        
        # Log audit
        log_audit_action(
            collection='counselor_referrals',
            action='UPDATE',
            case_id=str(referral['case_id']),
            user_id=user_id,
            changes={'follow_up_logged': True},
            reason='Follow-up note logged'
        )
        
        updated_referral = db.counselor_referrals.find_one({'_id': ObjectId(referral_id)})
        updated_referral['_id'] = str(updated_referral['_id'])
        updated_referral['case_id'] = str(updated_referral['case_id'])
        
        return jsonify(updated_referral), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============ ANALYTICS ============

@c2c_referral_bp.route('/analytics/rare-cases', methods=['GET'])
def get_rare_cases_analytics():
    """
    Get analytics on rare case referrals.
    Shows acceptance rate, specialty breakdown, and urgency distribution.
    """
    try:
        all_referrals = list(db.db.counselor_referrals.find({'is_rare_case': True}))
        
        if not all_referrals:
            return jsonify({
                "total_rare_cases": 0,
                "acceptance_rate": 0,
                "specialty_breakdown": {},
                "urgency_distribution": {}
            }), 200
        
        accepted = len([r for r in all_referrals if r['status'] == 'accepted'])
        completed = len([r for r in all_referrals if r['status'] == 'completed'])
        
        specialty_breakdown = {}
        urgency_distribution = {}
        
        for referral in all_referrals:
            specialty = referral.get('specialty_required', 'unknown')
            urgency = referral.get('urgency', 'unknown')
            
            specialty_breakdown[specialty] = specialty_breakdown.get(specialty, 0) + 1
            urgency_distribution[urgency] = urgency_distribution.get(urgency, 0) + 1
        
        acceptance_rate = (accepted / len(all_referrals)) * 100 if all_referrals else 0
        
        return jsonify({
            "total_rare_cases": len(all_referrals),
            "accepted": accepted,
            "completed": completed,
            "acceptance_rate": round(acceptance_rate, 2),
            "completion_rate": round((completed / len(all_referrals)) * 100, 2),
            "specialty_breakdown": specialty_breakdown,
            "urgency_distribution": urgency_distribution
        }), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@c2c_referral_bp.route('/counselor/<counselor_id>/specializations', methods=['GET'])
def get_counselor_specializations(counselor_id):
    """
    Get specializations a counselor handles based on referrals they've accepted.
    """
    try:
        accepted_referrals = list(db.db.counselor_referrals.find({
            'target_counselor_id': counselor_id,
            'status': {'$in': ['accepted', 'completed']}
        }))
        
        specializations = {}
        for referral in accepted_referrals:
            specialty = referral.get('specialty_required')
            specializations[specialty] = specializations.get(specialty, 0) + 1
        
        return jsonify({
            "counselor_id": counselor_id,
            "specializations": specializations,
            "total_referrals": len(accepted_referrals)
        }), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
