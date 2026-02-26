"""
EPIC 3: INTAKE INTERVIEW & ENDORSEMENT MODULE
MongoDB-compatible version
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, IntakeStatus, PermissionType
from utils import audit_log, user_has_permission
from datetime import datetime
from bson import ObjectId
import random
import string
from integrations import EmailIntegration

intake_bp = Blueprint('intake', __name__, url_prefix='/api/intake')


def generate_counseling_id():
    """Generate a unique counseling ID in format CPS-XXXXXXXX"""
    random_string = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"CPS-{random_string}"


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
    """Student direct intake submission - creates case and intake with anonymous counseling ID"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    try:
        user_obj_id = ObjectId(user_id) if isinstance(user_id, str) else user_id
    except:
        user_obj_id = user_id
    
    # Get user info for email
    user = db.db.users.find_one({"_id": user_obj_id})
    user_email = user.get('email', '') if user else ''
    
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
    
    # Generate unique counseling ID
    counseling_id = generate_counseling_id()
    
    # Calculate GAD-7 score
    gad7_score = sum(data.get('gad7_responses', []))
    
    # Build intake responses with new simplified fields
    intake_responses = {
        "counseling_id": counseling_id,
        "purpose": data.get('purpose'),
        "purpose_other": data.get('purpose_other', ''),
        "concerns": data.get('concerns'),
        "preferred_date": data.get('preferred_date'),
        "preferred_time": data.get('preferred_time'),
        "platform": data.get('platform'),
        "counselor": data.get('counselor', ''),
        "gad7_responses": data.get('gad7_responses', []),
        "gad7_score": gad7_score,
        "consent": data.get('consent', False),
    }
    
    # Update intake with responses and counseling ID
    db.db.intakes.update_one(
        {"_id": intake_id},
        {
            "$set": {
                "responses": intake_responses,
                "counseling_id": counseling_id,
                "status": IntakeStatus.COMPLETED.value,
                "student_submitted_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # Create assessment record for GAD-7
    assessment_doc = {
        "_id": ObjectId(),
        "case_id": case_id,
        "assessment_type": "gad7",
        "gad7_score": gad7_score,
        "created_at": datetime.utcnow()
    }
    db.db.assessments.insert_one(assessment_doc)
    
    # Send email with counseling ID
    if user_email:
        try:
            email_body = f"""Dear Student,

Thank you for completing your intake form. Your counseling has been registered with us.

Your Counseling ID: {counseling_id}

Please keep this ID for your records. You'll use this ID for all future counseling communications and appointments.

Preferred Appointment Details:
- Date: {data.get('preferred_date', 'To be scheduled')}
- Time: {data.get('preferred_time', 'To be scheduled')}
- Platform: {data.get('platform', 'To be confirmed')}

If you have any questions or need to reschedule, please reference your Counseling ID when contacting us.

Best regards,
Counseling & Psychological Services"""
            
            email_integration = EmailIntegration(current_app.config)
            email_integration.send_email(
                to_address=user_email,
                subject=f"Your Counseling ID: {counseling_id}",
                html_body=email_body
            )
        except Exception as e:
            print(f"Error sending email: {e}")
            # Don't fail the intake if email sending fails
    
    audit_log(db.db, 'intake', 'submit', entity_id=str(intake_id))
    
    return jsonify({
        'message': 'Intake form submitted successfully',
        'counseling_id': counseling_id,
        'intake_id': str(intake_id),
        'case_id': str(case_id),
        'gad7_score': gad7_score
    }), 201

