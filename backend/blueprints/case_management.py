"""
CASE MANAGEMENT MODULE
Centralized case management with session versioning, handovers, referral tracking,
case history timeline, enhanced status tracking with audit trails
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from models import db, PermissionType
from utils import audit_log, user_has_permission
from datetime import datetime, timedelta

case_management_bp = Blueprint('case_management', __name__, url_prefix='/api/case-management')


# =======================
# FEATURE 1: SESSION NOTES WITH VERSIONING (6 endpoints)
# =======================

@case_management_bp.route('/session-notes', methods=['POST'])
@jwt_required()
def create_session_note():
    """Create new session note (Feature 1.1)"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_NOTES.value):
        return jsonify({'error': 'Insufficient permissions to create session notes'}), 403
    
    data = request.get_json()
    
    if not data.get('case_id') or not data.get('session_date') or not data.get('session_type'):
        return jsonify({'error': 'case_id, session_date, and session_type are required'}), 400
    
    try:
        case_id = ObjectId(data['case_id'])
        case = db.db.cases.find_one({"_id": case_id})
    except:
        return jsonify({'error': 'Invalid case_id format'}), 400
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    try:
        session_date = datetime.fromisoformat(data['session_date'])
    except ValueError:
        return jsonify({'error': 'Invalid datetime format for session_date'}), 400
    
    user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
    
    note = {
        "case_id": case_id,
        "counselor_id": user_oid,
        "session_date": session_date,
        "session_type": data['session_type'],
        "topics_discussed": data.get('topics_discussed'),
        "interventions": data.get('interventions'),
        "client_response": data.get('client_response'),
        "homework_assigned": data.get('homework_assigned'),
        "mood_rating": data.get('mood_rating'),
        "risk_flagged": data.get('risk_flagged', False),
        "risk_notes": data.get('risk_notes'),
        "is_deleted": False,
        "deleted_at": None,
        "deleted_by": None,
        "current_version": 1,
        "created_at": datetime.utcnow(),
        "created_by": user_oid,
        "edit_history": [],
    }
    
    result = db.db.session_notes.insert_one(note)
    
    audit_log(db.db, 'session_note', 'create', entity_id=str(result.inserted_id), new_values={
        'case_id': str(case_id),
        'session_date': data['session_date']
    })
    
    return jsonify({
        'note_id': str(result.inserted_id),
        'message': 'Session note created successfully',
        'version': 1
    }), 201


@case_management_bp.route('/session-notes/<note_id>', methods=['PUT'])
@jwt_required()
def edit_session_note(note_id):
    """Edit session note and create version (Feature 1.2)"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_NOTES.value):
        return jsonify({'error': 'Insufficient permissions to edit session notes'}), 403
    
    try:
        note_oid = ObjectId(note_id)
        note = db.db.session_notes.find_one({"_id": note_oid})
    except:
        return jsonify({'error': 'Invalid note_id format'}), 400
    
    if not note:
        return jsonify({'error': 'Session note not found'}), 404
    
    if note.get('is_deleted'):
        return jsonify({'error': 'Cannot edit deleted session note'}), 400
    
    data = request.get_json()
    user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
    
    # Store version record
    version_record = {
        "session_note_id": note_oid,
        "version_number": note.get('current_version', 1) + 1,
        "edited_by": user_oid,
        "edited_at": datetime.utcnow(),
        "previous_values": {
            "topics_discussed": note.get('topics_discussed'),
            "interventions": note.get('interventions'),
            "client_response": note.get('client_response'),
            "homework_assigned": note.get('homework_assigned'),
            "mood_rating": note.get('mood_rating'),
            "risk_flagged": note.get('risk_flagged'),
            "risk_notes": note.get('risk_notes'),
        },
        "new_values": {
            "topics_discussed": data.get('topics_discussed'),
            "interventions": data.get('interventions'),
            "client_response": data.get('client_response'),
            "homework_assigned": data.get('homework_assigned'),
            "mood_rating": data.get('mood_rating'),
            "risk_flagged": data.get('risk_flagged'),
            "risk_notes": data.get('risk_notes'),
        },
        "change_reason": data.get('change_reason', 'No reason provided')
    }
    
    version_id = db.db.session_notes_versions.insert_one(version_record).inserted_id
    
    # Update note
    update_data = {
        "topics_discussed": data.get('topics_discussed', note.get('topics_discussed')),
        "interventions": data.get('interventions', note.get('interventions')),
        "client_response": data.get('client_response', note.get('client_response')),
        "homework_assigned": data.get('homework_assigned', note.get('homework_assigned')),
        "mood_rating": data.get('mood_rating', note.get('mood_rating')),
        "risk_flagged": data.get('risk_flagged', note.get('risk_flagged')),
        "risk_notes": data.get('risk_notes', note.get('risk_notes')),
        "current_version": note.get('current_version', 1) + 1,
    }
    
    # Track edit history
    edit_history = note.get('edit_history', [])
    edit_history.append({
        "edited_at": datetime.utcnow(),
        "edited_by": user_oid,
        "change_reason": data.get('change_reason', 'No reason provided'),
        "version_id": version_id
    })
    update_data['edit_history'] = edit_history
    
    db.db.session_notes.update_one({"_id": note_oid}, {"$set": update_data})
    
    audit_log(db.db, 'session_note', 'edit', entity_id=str(note_oid), 
              old_values=version_record['previous_values'],
              new_values=version_record['new_values'])
    
    return jsonify({
        'message': 'Session note updated successfully',
        'version': update_data['current_version'],
        'version_id': str(version_id)
    }), 200


@case_management_bp.route('/session-notes/<note_id>/versions', methods=['GET'])
@jwt_required()
def get_session_note_versions(note_id):
    """View all versions of a session note (Feature 1.3)"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions to view session notes'}), 403
    
    try:
        note_oid = ObjectId(note_id)
        note = db.db.session_notes.find_one({"_id": note_oid})
    except:
        return jsonify({'error': 'Invalid note_id format'}), 400
    
    if not note:
        return jsonify({'error': 'Session note not found'}), 404
    
    versions = list(db.db.session_notes_versions.find(
        {"session_note_id": note_oid}
    ).sort("version_number", -1))
    
    return jsonify({
        'note_id': str(note_oid),
        'total_versions': len(versions),
        'current_version': note.get('current_version', 1),
        'versions': [{
            'version_id': str(v['_id']),
            'version_number': v['version_number'],
            'edited_by': str(v['edited_by']),
            'edited_at': v['edited_at'].isoformat(),
            'change_reason': v['change_reason']
        } for v in versions]
    }), 200


@case_management_bp.route('/session-notes/<note_id>/version/<version_id>', methods=['GET'])
@jwt_required()
def get_session_note_version(note_id, version_id):
    """View specific version of a session note (Feature 1.4)"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        version_oid = ObjectId(version_id)
        version = db.db.session_notes_versions.find_one({"_id": version_oid})
    except:
        return jsonify({'error': 'Invalid version_id format'}), 400
    
    if not version:
        return jsonify({'error': 'Version not found'}), 404
    
    return jsonify({
        'version_id': str(version['_id']),
        'version_number': version['version_number'],
        'edited_by': str(version['edited_by']),
        'edited_at': version['edited_at'].isoformat(),
        'previous_values': version['previous_values'],
        'new_values': version['new_values'],
        'change_reason': version['change_reason']
    }), 200


@case_management_bp.route('/session-notes/<note_id>', methods=['DELETE'])
@jwt_required()
def soft_delete_session_note(note_id):
    """Soft-delete session note (Feature 1.5)"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_NOTES.value):
        return jsonify({'error': 'Insufficient permissions to delete session notes'}), 403
    
    try:
        note_oid = ObjectId(note_id)
        note = db.db.session_notes.find_one({"_id": note_oid})
    except:
        return jsonify({'error': 'Invalid note_id format'}), 400
    
    if not note:
        return jsonify({'error': 'Session note not found'}), 404
    
    user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
    
    db.db.session_notes.update_one(
        {"_id": note_oid},
        {"$set": {
            "is_deleted": True,
            "deleted_at": datetime.utcnow(),
            "deleted_by": user_oid
        }}
    )
    
    audit_log(db.db, 'session_note', 'soft_delete', entity_id=str(note_oid))
    
    return jsonify({'message': 'Session note deleted successfully'}), 200


@case_management_bp.route('/session-notes/<note_id>/restore', methods=['POST'])
@jwt_required()
def restore_session_note(note_id):
    """Restore deleted session note (admin only) (Feature 1.6)"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.ADMIN_ACCESS.value):
        return jsonify({'error': 'Insufficient permissions to restore session notes'}), 403
    
    try:
        note_oid = ObjectId(note_id)
        note = db.db.session_notes.find_one({"_id": note_oid})
    except:
        return jsonify({'error': 'Invalid note_id format'}), 400
    
    if not note:
        return jsonify({'error': 'Session note not found'}), 404
    
    user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
    
    db.db.session_notes.update_one(
        {"_id": note_oid},
        {"$set": {
            "is_deleted": False,
            "deleted_at": None,
            "deleted_by": None
        }}
    )
    
    audit_log(db.db, 'session_note', 'restore', entity_id=str(note_oid))
    
    return jsonify({'message': 'Session note restored successfully'}), 200


# =======================
# FEATURE 2: CASE HANDOVERS WORKFLOW (5 endpoints)
# =======================

@case_management_bp.route('/handovers', methods=['POST'])
@jwt_required()
def initiate_handover():
    """Initiate case handover request (Feature 2.1)"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.MANAGE_HANDOVERS.value):
        return jsonify({'error': 'Insufficient permissions to manage handovers'}), 403
    
    data = request.get_json()
    
    if not data.get('case_id') or not data.get('to_counselor_id') or not data.get('reason'):
        return jsonify({'error': 'case_id, to_counselor_id, and reason are required'}), 400
    
    try:
        case_id = ObjectId(data['case_id'])
        to_counselor_id = ObjectId(data['to_counselor_id'])
        case = db.db.cases.find_one({"_id": case_id})
    except:
        return jsonify({'error': 'Invalid case_id or to_counselor_id format'}), 400
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
    
    handover = {
        "case_id": case_id,
        "from_counselor_id": case.get('assigned_counselor_id'),
        "to_counselor_id": to_counselor_id,
        "initiated_by": user_oid,
        "initiated_at": datetime.utcnow(),
        "status": "INITIATED",
        "reason": data['reason'],
        "notes": data.get('notes'),
        "handover_session_notes": data.get('handover_session_notes', []),
        "status_history": [{
            "status": "INITIATED",
            "changed_at": datetime.utcnow(),
            "changed_by": user_oid
        }],
        "completed_at": None
    }
    
    result = db.db.case_handovers.insert_one(handover)
    
    # Update case status to HANDOVER_IN_PROGRESS
    db.db.cases.update_one(
        {"_id": case_id},
        {"$set": {"status": "HANDOVER_IN_PROGRESS", "last_activity": datetime.utcnow()}}
    )
    
    audit_log(db.db, 'case_handover', 'create', entity_id=str(result.inserted_id), 
              new_values={'case_id': str(case_id), 'reason': data['reason']})
    
    return jsonify({
        'handover_id': str(result.inserted_id),
        'message': 'Handover initiated successfully',
        'status': 'INITIATED'
    }), 201


@case_management_bp.route('/handovers/<case_id>', methods=['GET'])
@jwt_required()
def get_handover_history(case_id):
    """Get handover history for a case (Feature 2.2)"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        case_oid = ObjectId(case_id)
    except:
        return jsonify({'error': 'Invalid case_id format'}), 400
    
    handovers = list(db.db.case_handovers.find({"case_id": case_oid}).sort("initiated_at", -1))
    
    return jsonify({
        'case_id': str(case_oid),
        'handover_count': len(handovers),
        'handovers': [{
            'handover_id': str(h['_id']),
            'status': h['status'],
            'reason': h['reason'],
            'from_counselor_id': str(h.get('from_counselor_id', '')),
            'to_counselor_id': str(h['to_counselor_id']),
            'initiated_at': h['initiated_at'].isoformat(),
            'completed_at': h['completed_at'].isoformat() if h['completed_at'] else None
        } for h in handovers]
    }), 200


@case_management_bp.route('/handovers/<handover_id>/approve', methods=['PUT'])
@jwt_required()
def approve_handover(handover_id):
    """Approve handover request (Feature 2.3)"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.MANAGE_HANDOVERS.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        handover_oid = ObjectId(handover_id)
        handover = db.db.case_handovers.find_one({"_id": handover_oid})
    except:
        return jsonify({'error': 'Invalid handover_id format'}), 400
    
    if not handover:
        return jsonify({'error': 'Handover request not found'}), 404
    
    if handover['status'] != 'INITIATED':
        return jsonify({'error': f'Cannot approve handover with status: {handover["status"]}'}), 400
    
    user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
    
    # Update handover status
    status_history = handover.get('status_history', [])
    status_history.append({
        "status": "PENDING_APPROVAL",
        "changed_at": datetime.utcnow(),
        "changed_by": user_oid
    })
    
    db.db.case_handovers.update_one(
        {"_id": handover_oid},
        {"$set": {
            "status": "PENDING_APPROVAL",
            "status_history": status_history
        }}
    )
    
    audit_log(db.db, 'case_handover', 'approve', entity_id=str(handover_oid))
    
    return jsonify({'message': 'Handover approved', 'status': 'PENDING_APPROVAL'}), 200


@case_management_bp.route('/handovers/<handover_id>/reject', methods=['PUT'])
@jwt_required()
def reject_handover(handover_id):
    """Reject handover request (Feature 2.4)"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.MANAGE_HANDOVERS.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        handover_oid = ObjectId(handover_id)
        handover = db.db.case_handovers.find_one({"_id": handover_oid})
    except:
        return jsonify({'error': 'Invalid handover_id format'}), 400
    
    if not handover:
        return jsonify({'error': 'Handover request not found'}), 404
    
    user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
    
    # Update handover status
    status_history = handover.get('status_history', [])
    status_history.append({
        "status": "REJECTED",
        "changed_at": datetime.utcnow(),
        "changed_by": user_oid
    })
    
    db.db.case_handovers.update_one(
        {"_id": handover_oid},
        {"$set": {
            "status": "REJECTED",
            "status_history": status_history
        }}
    )
    
    # Revert case status back to ACTIVE
    db.db.cases.update_one(
        {"_id": handover['case_id']},
        {"$set": {"status": "ACTIVE"}}
    )
    
    audit_log(db.db, 'case_handover', 'reject', entity_id=str(handover_oid))
    
    return jsonify({'message': 'Handover rejected', 'status': 'REJECTED'}), 200


@case_management_bp.route('/handovers/<handover_id>/complete', methods=['POST'])
@jwt_required()
def complete_handover(handover_id):
    """Mark handover as complete (Feature 2.5)"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.MANAGE_HANDOVERS.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        handover_oid = ObjectId(handover_id)
        handover = db.db.case_handovers.find_one({"_id": handover_oid})
    except:
        return jsonify({'error': 'Invalid handover_id format'}), 400
    
    if not handover:
        return jsonify({'error': 'Handover request not found'}), 404
    
    user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
    
    # Update handover status
    status_history = handover.get('status_history', [])
    status_history.append({
        "status": "COMPLETED",
        "changed_at": datetime.utcnow(),
        "changed_by": user_oid
    })
    
    completed_at = datetime.utcnow()
    
    db.db.case_handovers.update_one(
        {"_id": handover_oid},
        {"$set": {
            "status": "COMPLETED",
            "completed_at": completed_at,
            "status_history": status_history
        }}
    )
    
    # Update case: change assigned counselor and revert status to ACTIVE
    db.db.cases.update_one(
        {"_id": handover['case_id']},
        {"$set": {
            "assigned_counselor_id": handover['to_counselor_id'],
            "status": "ACTIVE",
            "last_activity": datetime.utcnow()
        }}
    )
    
    audit_log(db.db, 'case_handover', 'complete', entity_id=str(handover_oid), 
              new_values={'completed_at': completed_at.isoformat()})
    
    return jsonify({'message': 'Handover completed successfully', 'status': 'COMPLETED'}), 200


# =======================
# FEATURE 3: REFERRAL LOGGING WITH FOLLOW-UP (4 endpoints)
# =======================

@case_management_bp.route('/referrals', methods=['POST'])
@jwt_required()
def log_referral():
    """Log referral with details (Feature 3.1)"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.MANAGE_REFERRALS.value):
        return jsonify({'error': 'Insufficient permissions to create referrals'}), 403
    
    data = request.get_json()
    
    if not data.get('case_id') or not data.get('referral_type') or not data.get('agency_name'):
        return jsonify({'error': 'case_id, referral_type, and agency_name are required'}), 400
    
    try:
        case_id = ObjectId(data['case_id'])
        case = db.db.cases.find_one({"_id": case_id})
    except:
        return jsonify({'error': 'Invalid case_id format'}), 400
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
    
    referral = {
        "case_id": case_id,
        "counselor_id": case.get('assigned_counselor_id'),
        "referral_type": data['referral_type'],
        "agency_name": data['agency_name'],
        "contact_person": data.get('contact_person'),
        "contact_email": data.get('contact_email'),
        "contact_phone": data.get('contact_phone'),
        "created_at": datetime.utcnow(),
        "created_by": user_oid,
        "status": "INITIATED",
        "notes": data.get('notes'),
        "follow_ups": [],
        "outcome": None,
        "outcome_date": None
    }
    
    result = db.db.referral_logs.insert_one(referral)
    
    audit_log(db.db, 'referral', 'create', entity_id=str(result.inserted_id), 
              new_values={'case_id': str(case_id), 'agency_name': data['agency_name']})
    
    return jsonify({
        'referral_id': str(result.inserted_id),
        'message': 'Referral logged successfully',
        'status': 'INITIATED'
    }), 201


@case_management_bp.route('/referrals/<referral_id>/status', methods=['PUT'])
@jwt_required()
def update_referral_status(referral_id):
    """Update referral status (Feature 3.2)"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.MANAGE_REFERRALS.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    data = request.get_json()
    
    if not data.get('status'):
        return jsonify({'error': 'status is required'}), 400
    
    try:
        referral_oid = ObjectId(referral_id)
        referral = db.db.referral_logs.find_one({"_id": referral_oid})
    except:
        return jsonify({'error': 'Invalid referral_id format'}), 400
    
    if not referral:
        return jsonify({'error': 'Referral not found'}), 404
    
    user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
    valid_statuses = ['INITIATED', 'SENT', 'RECEIVED', 'ACCEPTED', 'REJECTED', 
                      'PENDING_RESPONSE', 'PENDING_FOLLOWUP', 'COMPLETED']
    
    if data['status'] not in valid_statuses:
        return jsonify({'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'}), 400
    
    db.db.referral_logs.update_one(
        {"_id": referral_oid},
        {"$set": {"status": data['status']}}
    )
    
    audit_log(db.db, 'referral', 'update_status', entity_id=str(referral_oid), 
              old_values={'status': referral['status']},
              new_values={'status': data['status']})
    
    return jsonify({'message': 'Referral status updated', 'status': data['status']}), 200


@case_management_bp.route('/referrals/<referral_id>/follow-up', methods=['POST'])
@jwt_required()
def log_referral_followup(referral_id):
    """Log referral follow-up action (Feature 3.3)"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.MANAGE_REFERRALS.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    data = request.get_json()
    
    if not data.get('action_taken'):
        return jsonify({'error': 'action_taken is required'}), 400
    
    try:
        referral_oid = ObjectId(referral_id)
        referral = db.db.referral_logs.find_one({"_id": referral_oid})
    except:
        return jsonify({'error': 'Invalid referral_id format'}), 400
    
    if not referral:
        return jsonify({'error': 'Referral not found'}), 404
    
    user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
    
    followup = {
        "logged_at": datetime.utcnow(),
        "logged_by": user_oid,
        "action_taken": data['action_taken'],
        "notes": data.get('notes'),
        "next_followup": data.get('next_followup')
    }
    
    follow_ups = referral.get('follow_ups', [])
    follow_ups.append(followup)
    
    db.db.referral_logs.update_one(
        {"_id": referral_oid},
        {"$set": {"follow_ups": follow_ups}}
    )
    
    audit_log(db.db, 'referral_followup', 'create', entity_id=str(referral_oid), 
              new_values={'action_taken': data['action_taken']})
    
    return jsonify({'message': 'Follow-up logged successfully'}), 201


@case_management_bp.route('/referrals/<case_id>', methods=['GET'])
@jwt_required()
def get_case_referrals(case_id):
    """Get all referrals for a case (Feature 3.4)"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        case_oid = ObjectId(case_id)
    except:
        return jsonify({'error': 'Invalid case_id format'}), 400
    
    referrals = list(db.db.referral_logs.find({"case_id": case_oid}).sort("created_at", -1))
    
    return jsonify({
        'case_id': str(case_oid),
        'referral_count': len(referrals),
        'referrals': [{
            'referral_id': str(r['_id']),
            'referral_type': r['referral_type'],
            'agency_name': r['agency_name'],
            'status': r['status'],
            'created_at': r['created_at'].isoformat(),
            'follow_up_count': len(r.get('follow_ups', []))
        } for r in referrals]
    }), 200


# =======================
# FEATURE 4: CASE HISTORY TIMELINE (1 endpoint)
# =======================

@case_management_bp.route('/cases/<case_id>/timeline', methods=['GET'])
@jwt_required()
def get_case_timeline(case_id):
    """Get complete case event timeline (Feature 4)"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        case_oid = ObjectId(case_id)
        case = db.db.cases.find_one({"_id": case_oid})
    except:
        return jsonify({'error': 'Invalid case_id format'}), 400
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    timeline_events = []
    
    # Case created event
    timeline_events.append({
        'event_type': 'case_created',
        'timestamp': case.get('created_at', datetime.utcnow()).isoformat(),
        'description': f'Case created for {case.get("case_type", "unknown")} type',
        'initiator': str(case.get('created_by', 'system'))
    })
    
    # Status changes from audit log
    status_history = case.get('status_history', [])
    for status_change in status_history:
        timeline_events.append({
            'event_type': 'status_change',
            'timestamp': status_change.get('changed_at', datetime.utcnow()).isoformat(),
            'description': f'Status changed to {status_change.get("status")}',
            'reason': status_change.get('reason', 'No reason provided'),
            'initiator': str(status_change.get('changed_by', 'system'))
        })
    
    # Session notes added
    session_notes = list(db.db.session_notes.find({
        "case_id": case_oid,
        "is_deleted": False
    }).sort("created_at", 1))
    
    for note in session_notes:
        timeline_events.append({
            'event_type': 'session_note_added',
            'timestamp': note.get('created_at', datetime.utcnow()).isoformat(),
            'description': f'Session note created - {note.get("session_type")}',
            'session_date': note.get('session_date', note.get('created_at')).isoformat(),
            'initiator': str(note.get('created_by', 'unknown'))
        })
    
    # Referrals created/updated
    referrals = list(db.db.referral_logs.find({"case_id": case_oid}).sort("created_at", 1))
    
    for referral in referrals:
        timeline_events.append({
            'event_type': 'referral_created',
            'timestamp': referral.get('created_at', datetime.utcnow()).isoformat(),
            'description': f'Referral created to {referral.get("agency_name")}',
            'referral_type': referral.get('referral_type'),
            'status': referral.get('status'),
            'initiator': str(referral.get('created_by', 'unknown'))
        })
    
    # Handovers completed
    handovers = list(db.db.case_handovers.find({
        "case_id": case_oid,
        "status": "COMPLETED"
    }).sort("completed_at", 1))
    
    for handover in handovers:
        timeline_events.append({
            'event_type': 'handover_completed',
            'timestamp': handover.get('completed_at', datetime.utcnow()).isoformat(),
            'description': f'Case handed over to new counselor',
            'from_counselor': str(handover.get('from_counselor_id', 'unknown')),
            'to_counselor': str(handover.get('to_counselor_id', 'unknown')),
            'reason': handover.get('reason')
        })
    
    # Check-ins recorded
    checkins = list(db.db.check_ins.find({"case_id": case_oid}).sort("created_at", 1))
    
    for checkin in checkins:
        timeline_events.append({
            'event_type': 'check_in',
            'timestamp': checkin.get('created_at', datetime.utcnow()).isoformat(),
            'description': f'Check-in recorded - Status: {checkin.get("status")}',
            'initiator': str(checkin.get('created_by', 'unknown'))
        })
    
    # Sort all events by timestamp
    timeline_events.sort(key=lambda x: x['timestamp'], reverse=False)
    
    # Apply filters if provided
    event_type_filter = request.args.get('type')
    from_date = request.args.get('from')
    to_date = request.args.get('to')
    
    if event_type_filter:
        timeline_events = [e for e in timeline_events if e['event_type'] == event_type_filter]
    
    if from_date or to_date:
        try:
            from_dt = datetime.fromisoformat(from_date) if from_date else datetime.min
            to_dt = datetime.fromisoformat(to_date) if to_date else datetime.max
            
            timeline_events = [e for e in timeline_events 
                             if from_dt <= datetime.fromisoformat(e['timestamp']) <= to_dt]
        except ValueError:
            return jsonify({'error': 'Invalid date format in filters'}), 400
    
    return jsonify({
        'case_id': str(case_oid),
        'event_count': len(timeline_events),
        'timeline': timeline_events
    }), 200


# =======================
# FEATURE 5: ENHANCED CASE STATUS TRACKING (2 endpoints)
# =======================

@case_management_bp.route('/cases/<case_id>/status', methods=['POST'])
@jwt_required()
def change_case_status(case_id):
    """Change case status with reason (Feature 5.1)"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions to change case status'}), 403
    
    data = request.get_json()
    
    if not data.get('status'):
        return jsonify({'error': 'status is required'}), 400
    
    try:
        case_oid = ObjectId(case_id)
        case = db.db.cases.find_one({"_id": case_oid})
    except:
        return jsonify({'error': 'Invalid case_id format'}), 400
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
    new_status = data['status']
    reason = data.get('reason', 'Status transition')
    
    # Validate status transitions
    valid_statuses = ['NEW', 'INTAKE_SCHEDULED', 'INTAKE_IN_PROGRESS', 'ACTIVE', 
                     'HANDOVER_IN_PROGRESS', 'MONITORING', 'CLOSED', 'REFERRED', 'ON_HOLD']
    
    if new_status not in valid_statuses:
        return jsonify({'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'}), 400
    
    # Track status history
    status_history = case.get('status_history', [])
    status_history.append({
        "status": new_status,
        "changed_at": datetime.utcnow(),
        "changed_by": user_oid,
        "reason": reason
    })
    
    db.db.cases.update_one(
        {"_id": case_oid},
        {"$set": {
            "status": new_status,
            "status_history": status_history,
            "last_activity": datetime.utcnow()
        }}
    )
    
    audit_log(db.db, 'case', 'status_change', entity_id=str(case_oid),
              old_values={'status': case.get('status')},
              new_values={'status': new_status, 'reason': reason})
    
    return jsonify({
        'message': 'Case status updated successfully',
        'new_status': new_status
    }), 200


@case_management_bp.route('/cases/<case_id>/status-history', methods=['GET'])
@jwt_required()
def get_case_status_history(case_id):
    """Get all status changes for a case (Feature 5.2)"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        case_oid = ObjectId(case_id)
        case = db.db.cases.find_one({"_id": case_oid})
    except:
        return jsonify({'error': 'Invalid case_id format'}), 400
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    status_history = case.get('status_history', [])
    
    return jsonify({
        'case_id': str(case_oid),
        'current_status': case.get('status'),
        'history_count': len(status_history),
        'status_history': [{
            'status': s['status'],
            'changed_at': s['changed_at'].isoformat(),
            'changed_by': str(s['changed_by']),
            'reason': s.get('reason', 'No reason provided')
        } for s in status_history]
    }), 200


# =======================
# FEATURE 6: CASE AUDIT TRAIL (via audit_log function)
# =======================
# Audit trail is automatically created for all operations above using audit_log()
# The following endpoint retrieves the audit log for a case

@case_management_bp.route('/cases/<case_id>/audit-log', methods=['GET'])
@jwt_required()
def get_case_audit_log(case_id):
    """Get complete audit trail for a case (Feature 6)"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        case_oid = ObjectId(case_id)
    except:
        return jsonify({'error': 'Invalid case_id format'}), 400
    
    # Query audit logs for this case
    audit_entries = list(db.db.audit_log.find(
        {"entity_id": str(case_oid)}
    ).sort("timestamp", -1))
    
    # Also get case-specific audit entries
    case_audit = list(db.db.case_audit_log.find(
        {"case_id": case_oid}
    ).sort("changed_at", -1))
    
    combined = audit_entries + [{
        'timestamp': entry.get('changed_at', datetime.utcnow()),
        'action': entry.get('event_type', 'unknown'),
        'entity': 'case',
        'changed_by': str(entry.get('changed_by', 'system')),
        'previous_values': entry.get('previous_values'),
        'new_values': entry.get('new_values'),
        'reason': entry.get('reason')
    } for entry in case_audit]
    
    combined.sort(key=lambda x: x.get('timestamp', datetime.utcnow()), reverse=True)
    
    return jsonify({
        'case_id': str(case_oid),
        'audit_entry_count': len(combined),
        'audit_log': [{
            'timestamp': str(entry.get('timestamp', '')),
            'action': entry.get('action', entry.get('event_type', 'unknown')),
            'entity_type': entry.get('entity', entry.get('entity_type', 'case')),
            'changed_by': entry.get('changed_by', 'system'),
            'previous_values': entry.get('previous_values'),
            'new_values': entry.get('new_values'),
            'reason': entry.get('reason')
        } for entry in combined]
    }), 200
