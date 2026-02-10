"""
EPIC 3: INTAKE INTERVIEW & ENDORSEMENT MODULE
MongoDB-compatible version
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, IntakeStatus, PermissionType
from utils import audit_log, user_has_permission
from datetime import datetime
from bson import ObjectId

intake_bp = Blueprint('intake', __name__, url_prefix='/api/intake')


@intake_bp.route('/start/<case_id>', methods=['POST'])
@jwt_required()
def start_intake(case_id):
    """Start intake interview"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.CREATE_ASSESSMENT.value):
        return jsonify({'error': 'Permission denied'}), 403
    
    try:
        case = db.db.cases.find_one({"_id": ObjectId(case_id)})
    except:
        case = db.db.cases.find_one({"_id": case_id})
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    existing = db.db.intakes.find_one({"case_id": ObjectId(case_id) if isinstance(case_id, str) else case_id})
    if existing:
        return jsonify({'error': 'Intake already exists'}), 409
    
    intake_doc = {
        "_id": ObjectId(),
        "case_id": ObjectId(case_id) if isinstance(case_id, str) else case_id,
        "status": IntakeStatus.IN_PROGRESS.value,
        "initiated_by": ObjectId(user_id) if isinstance(user_id, str) else user_id,
        "responses": {},
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = db.db.intakes.insert_one(intake_doc)
    audit_log(db.db, 'intake', 'create', entity_id=str(result.inserted_id))
    
    return jsonify({
        'intake_id': str(result.inserted_id),
        'case_id': case_id,
        'status': IntakeStatus.IN_PROGRESS.value
    }), 201


@intake_bp.route('/<intake_id>/submit', methods=['POST'])
@jwt_required()
def submit_intake(intake_id):
    """Submit intake responses"""
    user_id = get_jwt_identity()
    
    try:
        intake = db.db.intakes.find_one({"_id": ObjectId(intake_id)})
    except:
        intake = db.db.intakes.find_one({"_id": intake_id})
    
    if not intake:
        return jsonify({'error': 'Intake not found'}), 404
    
    data = request.get_json()
    
    db.db.intakes.update_one(
        {"_id": intake['_id']},
        {
            "$set": {
                "responses": data.get('responses', {}),
                "status": IntakeStatus.COMPLETED.value,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    audit_log(db.db, 'intake', 'submit', entity_id=intake_id)
    
    return jsonify({'message': 'Intake submitted'}), 200


@intake_bp.route('/<intake_id>', methods=['GET'])
@jwt_required()
def get_intake(intake_id):
    """Get intake details"""
    user_id = get_jwt_identity()
    
    try:
        intake = db.db.intakes.find_one({"_id": ObjectId(intake_id)})
    except:
        intake = db.db.intakes.find_one({"_id": intake_id})
    
    if not intake:
        return jsonify({'error': 'Intake not found'}), 404
    
    intake['_id'] = str(intake['_id'])
    intake['case_id'] = str(intake['case_id'])
    intake['created_at'] = intake['created_at'].isoformat()
    intake['updated_at'] = intake['updated_at'].isoformat()
    
    return jsonify(intake), 200


@intake_bp.route('/case/<case_id>', methods=['GET'])
@jwt_required()
def get_case_intake(case_id):
    """Get intake for a case"""
    user_id = get_jwt_identity()
    
    try:
        intake = db.db.intakes.find_one({"case_id": ObjectId(case_id)})
    except:
        intake = db.db.intakes.find_one({"case_id": case_id})
    
    if not intake:
        return jsonify({'error': 'No intake found'}), 404
    
    intake['_id'] = str(intake['_id'])
    intake['case_id'] = str(intake['case_id'])
    intake['created_at'] = intake['created_at'].isoformat()
    intake['updated_at'] = intake['updated_at'].isoformat()
    
    return jsonify(intake), 200


@intake_bp.route('/submit', methods=['POST'])
@jwt_required()
def student_submit_intake():
    """Student direct intake submission - creates case and intake if needed"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    try:
        user_obj_id = ObjectId(user_id) if isinstance(user_id, str) else user_id
    except:
        user_obj_id = user_id
    
    # Check if user has an existing case
    existing_case = db.db.cases.find_one({"student_id": user_obj_id})
    
    if existing_case:
        case_id = existing_case['_id']
    else:
        # Create new case for student
        case_doc = {
            "_id": ObjectId(),
            "student_id": user_obj_id,
            "assigned_counselor_id": None,
            "case_status": "open",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        case_result = db.db.cases.insert_one(case_doc)
        case_id = case_result.inserted_id
    
    # Check if intake exists for this case
    existing_intake = db.db.intakes.find_one({"case_id": case_id})
    
    if existing_intake:
        intake_id = existing_intake['_id']
    else:
        # Create intake
        intake_doc = {
            "_id": ObjectId(),
            "case_id": case_id,
            "status": IntakeStatus.IN_PROGRESS.value,
            "initiated_by": user_obj_id,
            "responses": {},
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        intake_result = db.db.intakes.insert_one(intake_doc)
        intake_id = intake_result.inserted_id
    
    # Store intake responses
    phq9_score = sum(data.get('phq9_responses', []))
    gad7_score = sum(data.get('gad7_responses', []))
    
    intake_responses = {
        "email": data.get('email'),
        "presenting_concerns": data.get('presenting_concerns'),
        "medical_conditions": data.get('medical_conditions'),
        "current_medications": data.get('current_medications'),
        "substance_use": data.get('substance_use'),
        "family_mental_health_history": data.get('family_mental_health_history'),
        "phq9_responses": data.get('phq9_responses', []),
        "phq9_score": phq9_score,
        "gad7_responses": data.get('gad7_responses', []),
        "gad7_score": gad7_score,
        "sleep_patterns": data.get('sleep_patterns'),
        "support_systems": data.get('support_systems'),
        "previous_counseling": data.get('previous_counseling', False),
        "notes": data.get('notes'),
    }
    
    # Update intake with responses
    db.db.intakes.update_one(
        {"_id": intake_id},
        {
            "$set": {
                "responses": intake_responses,
                "status": IntakeStatus.COMPLETED.value,
                "student_submitted_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # Create assessment records for PHQ-9 and GAD-7
    assessment_doc = {
        "_id": ObjectId(),
        "case_id": case_id,
        "assessment_type": "phq9_gad7",
        "phq9_score": phq9_score,
        "gad7_score": gad7_score,
        "created_at": datetime.utcnow()
    }
    db.db.assessments.insert_one(assessment_doc)
    
    audit_log(db.db, 'intake', 'submit', entity_id=str(intake_id))
    
    return jsonify({
        'message': 'Intake form submitted successfully',
        'intake_id': str(intake_id),
        'case_id': str(case_id),
        'phq9_score': phq9_score,
        'gad7_score': gad7_score
    }), 201
