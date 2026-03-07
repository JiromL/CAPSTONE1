"""
EPIC 3: INTAKE INTERVIEW & ENDORSEMENT MODULE
MongoDB-compatible version
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, IntakeStatus, PermissionType
from utils import audit_log, user_has_permission
from datetime import datetime, timedelta
from bson import ObjectId
import random
import string
from integrations import EmailIntegration

intake_bp = Blueprint('intake', __name__, url_prefix='/api/intake')


def generate_counseling_id():
    """Generate a unique counseling ID in format CPS-XXXXXXXX"""
    random_string = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"CPS-{random_string}"


def calculate_appointment_date(is_emergency: bool, urgency_level: str = 'normal'):
    """
    Calculate appointment date based on urgency (CPS operations schedule).
    - emergency: 1-2 business days
    - high: 2-3 business days  
    - normal: 3-5 business days
    Returns (appointment_date, estimated_days_string)
    """
    today = datetime.utcnow().date()
    
    if is_emergency or urgency_level == 'emergency':
        # 1-2 business days for emergency
        days_out = 2
        urgency_text = "1-2 business days"
    elif urgency_level == 'high':
        # 2-3 business days for high urgency
        days_out = 3
        urgency_text = "2-3 business days"
    else:
        # 3-5 business days for normal
        days_out = 4
        urgency_text = "3-5 business days"
    
    appointment_date = today + timedelta(days=days_out)
    return appointment_date, urgency_text


def get_allowed_assessments_for_concern(concern: str) -> list:
    """
    Return the list of assessments allowed for a given concern type.
    Mapping based on clinical best practices.
    """
    concern_mapping = {
        'personal': ['phq9', 'gad7', 'pss'],           # Mental health focus
        'academic': ['acad', 'phq9', 'gad7'],          # Academic + optional mental health
        'career': ['career', 'phq9'],                   # Career + optional anxiety
        'social': ['social', 'gad7'],                   # Social + optional anxiety
        'other': ['phq9', 'gad7', 'pss', 'acad', 'career', 'social']  # All available
    }
    return concern_mapping.get(concern, ['phq9', 'gad7', 'pss'])


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
    """Enhanced intake submission with consent, emergency flagging, and auto-assignment"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    # Validate consent
    if not data.get('consent_given'):
        return jsonify({'error': 'Consent is required to proceed'}), 400
    
    try:
        user_obj_id = ObjectId(user_id) if isinstance(user_id, str) else user_id
    except:
        user_obj_id = user_id
    
    # Get user info
    user = db.db.users.find_one({"_id": user_obj_id})
    user_email = user.get('email', '') if user else ''
    user_name = user.get('name', 'Student') if user else 'Student'
    
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
    
    # Generate unique counseling ID (never repeats)
    while True:
        counseling_id = generate_counseling_id()
        if not db.db.intakes.find_one({"counseling_id": counseling_id}):
            break
    
    # Validate and get assessments based on concern type
    concern = data.get('purpose', 'personal')
    allowed_assessments = get_allowed_assessments_for_concern(concern)
    
    # Get all assessment responses (optional - only calculate if provided)
    phq9_responses = data.get('phq9_responses', [])
    gad7_responses = data.get('gad7_responses', [])
    pss_responses = data.get('pss_responses', [])
    acad_responses = data.get('acad_responses', [])
    career_responses = data.get('career_responses', [])
    social_responses = data.get('social_responses', [])
    
    # Validate submitted assessments match the concern
    submitted_assessments = []
    if phq9_responses:
        submitted_assessments.append('phq9')
    if gad7_responses:
        submitted_assessments.append('gad7')
    if pss_responses:
        submitted_assessments.append('pss')
    if acad_responses:
        submitted_assessments.append('acad')
    if career_responses:
        submitted_assessments.append('career')
    if social_responses:
        submitted_assessments.append('social')
    
    # Check that only allowed assessments were submitted
    for assessment in submitted_assessments:
        if assessment not in allowed_assessments:
            return jsonify({
                'error': f'Assessment {assessment} is not available for {concern} concerns. Allowed: {", ".join(allowed_assessments)}'
            }), 400
    
    # Calculate scores
    phq9_score = sum(phq9_responses) if phq9_responses else None
    gad7_score = sum(gad7_responses) if gad7_responses else None
    pss_score = sum(pss_responses) if pss_responses else None
    acad_score = sum(acad_responses) if acad_responses else None
    career_score = sum(career_responses) if career_responses else None
    social_score = sum(social_responses) if social_responses else None
    
    # Determine urgency level based on available scores
    urgency_level = 'normal'
    if phq9_score and phq9_score > 20:
        urgency_level = 'high'  # Very high depression
    if gad7_score and gad7_score > 15:
        urgency_level = 'high'  # Very high anxiety
    if acad_score and acad_score > 24:
        urgency_level = 'high'  # Very high academic stress
    if social_score and social_score > 24:
        urgency_level = 'high'  # Very high social concerns
    
    # Determine if emergency based on scores or explicit flag
    is_emergency = data.get('is_emergency', False) or \
                   (phq9_score and phq9_score > 20) or \
                   (gad7_score and gad7_score > 15)
    
    # Determine if anonymous
    is_anonymous = data.get('is_anonymous', False)
    
    # Calculate appointment date based on urgency
    appointment_date, estimated_days = calculate_appointment_date(is_emergency, urgency_level)
    
    # Auto-assign counselor if NOT emergency (emergency requires manual review)
    assigned_counselor_id = None
    if not is_emergency:
        # Smart assignment based on assessment scores (if available)
        if phq9_score and phq9_score > 15:
            # High depression → Psychologist
            counselor = db.db.users.find_one({"role": "PSYCHOLOGIST"})
        elif gad7_score and gad7_score > 12:
            # High anxiety → Psychologist or Counselor
            counselor = db.db.users.find_one({"role": {"$in": ["PSYCHOLOGIST", "COUNSELOR"]}})
        else:
            # Default to Counselor
            counselor = db.db.users.find_one({"role": "COUNSELOR"})
        
        if counselor:
            assigned_counselor_id = counselor['_id']
            db.db.cases.update_one(
                {"_id": case_id},
                {"$set": {"assigned_counselor_id": assigned_counselor_id}}
            )
    
    # Build intake responses (handle optional assessments)
    intake_responses = {
        "counseling_id": counseling_id,
        "is_anonymous": is_anonymous,
        "student_name": None if is_anonymous else user_name,
        "is_emergency": is_emergency,
        "urgency_level": urgency_level,
        "estimated_appointment_days": estimated_days,
        "appointment_date": appointment_date.isoformat(),
        "emergency_notes": data.get('emergency_notes', ''),
        "purpose": data.get('purpose'),
        "purpose_other": data.get('purpose_other', ''),
        "concerns": data.get('concerns'),
        "preferred_platform": data.get('preferred_platform', 'in-person'),
        "consent_given": True,
    }
    
    # Only include assessment responses if they were taken
    if phq9_responses:
        intake_responses["phq9_responses"] = phq9_responses
        intake_responses["phq9_score"] = phq9_score
    if gad7_responses:
        intake_responses["gad7_responses"] = gad7_responses
        intake_responses["gad7_score"] = gad7_score
    if pss_responses:
        intake_responses["pss_responses"] = pss_responses
        intake_responses["pss_score"] = pss_score
    if acad_responses:
        intake_responses["acad_responses"] = acad_responses
        intake_responses["acad_score"] = acad_score
    if career_responses:
        intake_responses["career_responses"] = career_responses
        intake_responses["career_score"] = career_score
    if social_responses:
        intake_responses["social_responses"] = social_responses
        intake_responses["social_score"] = social_score
    
    # Update intake document
    update_payload = {
        "$set": {
            "responses": intake_responses,
            "counseling_id": counseling_id,
            "is_anonymous": is_anonymous,
            "is_emergency": is_emergency,
            "assigned_counselor_id": assigned_counselor_id,
            "status": IntakeStatus.COMPLETED.value,
            "student_submitted_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    }
    
    db.db.intakes.update_one({"_id": intake_id}, update_payload)
    
    # Create assessment records (only for assessments that were taken)
    for assessment_type, score, responses in [
        ("phq9", phq9_score, phq9_responses),
        ("gad7", gad7_score, gad7_responses),
        ("pss", pss_score, pss_responses),
        ("acad", acad_score, acad_responses),
        ("career", career_score, career_responses),
        ("social", social_score, social_responses)
    ]:
        if responses:  # Only create if responses provided
            assessment_doc = {
                "_id": ObjectId(),
                "case_id": case_id,
                "assessment_type": assessment_type,
                f"{assessment_type}_score": score,
                "responses": responses,
                "created_at": datetime.utcnow()
            }
            db.db.assessments.insert_one(assessment_doc)
    
    # Send email with counseling ID and appointment info
    if user_email and current_app.config.get('SMTP_HOST'):
        try:
            if is_emergency:
                status_msg = "Your intake has been flagged for priority review."
                next_step = f"You should receive an appointment confirmation within {estimated_days}."
            elif is_anonymous:
                status_msg = "Your intake has been submitted anonymously."
                next_step = f"You'll receive communication using your Counseling ID. Expected first appointment within {estimated_days}."
            else:
                status_msg = "Your intake has been received and reviewed."
                counselor_name = db.db.users.find_one({"_id": assigned_counselor_id}).get('name', 'A counselor') if assigned_counselor_id else 'A counselor'
                next_step = f"You've been assigned to {counselor_name}. Expected first appointment within {estimated_days}."
            
            # Build score summary (only show scores for assessments taken)
            score_summary = ""
            if phq9_score is not None:
                score_summary += f"- Depression (PHQ-9): {phq9_score}/27\n"
            if gad7_score is not None:
                score_summary += f"- Anxiety (GAD-7): {gad7_score}/21\n"
            if pss_score is not None:
                score_summary += f"- Stress (PSS): {pss_score}/40\n"
            if acad_score is not None:
                score_summary += f"- Academic Stress: {acad_score}/32\n"
            if career_score is not None:
                score_summary += f"- Career Readiness: {career_score}/32\n"
            if social_score is not None:
                score_summary += f"- Social Functioning: {social_score}/32\n"
            
            if not score_summary:
                score_summary = "No assessments taken with this submission."
            
            email_body = f"""Dear {user_name},

Thank you for completing your intake form with Counseling & Psychological Services.

{status_msg}

Your Counseling ID: {counseling_id}

Assessment Results:
{score_summary}

Next Steps: {next_step}
Estimated appointment date: {appointment_date.strftime('%B %d, %Y')}

Please keep your Counseling ID for all future communications and appointments.

Best regards,
Counseling & Psychological Services Team"""
            
            email_integration = EmailIntegration(current_app.config)
            email_integration.send_email(
                to_address=user_email if not is_anonymous else None,
                subject=f"Your Counseling ID: {counseling_id}",
                html_body=email_body
            )
        except Exception as e:
            print(f"Warning - Email send failed: {e}")
    
    audit_log(db.db, 'intake', 'submit', entity_id=str(intake_id), 
              details=f"is_emergency={is_emergency}, is_anonymous={is_anonymous}, urgency={urgency_level}")
    
    # Build response with scores only if available
    scores_response = {}
    if phq9_score is not None:
        scores_response['phq9'] = phq9_score
    if gad7_score is not None:
        scores_response['gad7'] = gad7_score
    if pss_score is not None:
        scores_response['pss'] = pss_score
    if acad_score is not None:
        scores_response['acad'] = acad_score
    if career_score is not None:
        scores_response['career'] = career_score
    if social_score is not None:
        scores_response['social'] = social_score
    
    return jsonify({
        'message': 'Intake submitted successfully',
        'counseling_id': counseling_id,
        'intake_id': str(intake_id),
        'case_id': str(case_id),
        'is_emergency': is_emergency,
        'is_anonymous': is_anonymous,
        'urgency_level': urgency_level,
        'assigned_counselor': str(assigned_counselor_id) if assigned_counselor_id else None,
        'appointment_date': appointment_date.isoformat(),
        'estimated_days': estimated_days,
        'scores': scores_response
    }), 201


@intake_bp.route('/emergency', methods=['GET'])
@jwt_required()
def get_emergency_intakes():
    """Get all emergency intakes for counselor review (Counselor/Psychologist only)"""
    from models import UserRole
    user_id = get_jwt_identity()
    user = db.db.users.find_one({"_id": ObjectId(user_id)})
    
    if not user or user.get('role') not in ['PSYCHOLOGIST', 'COUNSELOR', 'CASE_MANAGER']:
        return jsonify({'error': 'Only counseling staff can view emergency intakes'}), 403
    
    emergency_intakes = list(db.db.intakes.find({
        "is_emergency": True,
        "status": "COMPLETED",
        "emergency_reviewed_by": {"$exists": False}  # Not yet reviewed
    }).sort("student_submitted_at", -1))
    
    result = []
    for intake in emergency_intakes:
        case = db.db.cases.find_one({"_id": intake['case_id']})
        student = db.db.users.find_one({"_id": case['student_id']}) if case else None
        
        result.append({
            'intake_id': str(intake['_id']),
            'counseling_id': intake.get('counseling_id'),
            'student_name': 'Anonymous' if intake.get('is_anonymous') else student.get('name', 'Unknown'),
            'emergency_notes': intake.get('responses', {}).get('emergency_notes', ''),
            'phq9_score': intake.get('responses', {}).get('phq9_score'),
            'gad7_score': intake.get('responses', {}).get('gad7_score'),
            'submitted_at': intake.get('student_submitted_at').isoformat() if intake.get('student_submitted_at') else None,
            'case_id': str(intake['case_id'])
        })
    
    return jsonify({'emergency_intakes': result, 'count': len(result)}), 200


@intake_bp.route('/emergency/<intake_id>/assign', methods=['POST'])
@jwt_required()
def assign_emergency_appointment(intake_id):
    """Counselor assigns appointment for emergency intake"""
    from models import UserRole
    user_id = get_jwt_identity()
    user = db.db.users.find_one({"_id": ObjectId(user_id)})
    
    if not user or user.get('role') not in ['PSYCHOLOGIST', 'COUNSELOR', 'CASE_MANAGER', 'ADMIN']:
        return jsonify({'error': 'Not authorized'}), 403
    
    data = request.get_json()
    counselor_id = data.get('counselor_id')
    appointment_date = data.get('appointment_date')
    appointment_time = data.get('appointment_time')
    notes = data.get('notes', '')
    
    if not all([counselor_id, appointment_date, appointment_time]):
        return jsonify({'error': 'Missing required fields: counselor_id, appointment_date, appointment_time'}), 400
    
    try:
        intake = db.db.intakes.find_one({"_id": ObjectId(intake_id)})
    except:
        intake = db.db.intakes.find_one({"_id": intake_id})
    
    if not intake:
        return jsonify({'error': 'Intake not found'}), 404
    
    # Update intake with assignment
    db.db.intakes.update_one(
        {"_id": intake['_id']},
        {
            "$set": {
                "emergency_reviewed_by": ObjectId(user_id),
                "emergency_assigned_at": datetime.utcnow(),
                "assigned_counselor_id": ObjectId(counselor_id),
                "emergency_appointment_date": appointment_date,
                "emergency_appointment_time": appointment_time,
                "emergency_assignment_notes": notes
            }
        }
    )
    
    # Update case with assigned counselor
    case = db.db.cases.find_one({"_id": intake['case_id']})
    if case:
        db.db.cases.update_one(
            {"_id": case['_id']},
            {"$set": {"assigned_counselor_id": ObjectId(counselor_id)}}
        )
    
    audit_log(db.db, 'intake', 'emergency_assigned', entity_id=intake_id,
              details=f"assigned_to={counselor_id}, scheduled={appointment_date} {appointment_time}")
    
    return jsonify({
        'message': 'Emergency intake assigned',
        'intake_id': intake_id,
        'counselor_id': counselor_id,
        'appointment_date': appointment_date,
        'appointment_time': appointment_time
    }), 200

