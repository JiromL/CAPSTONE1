"""
EPIC 3: INTAKE INTERVIEW & ENDORSEMENT MODULE
MongoDB-compatible version
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, IntakeStatus, PermissionType, AppointmentStatus
from utils import audit_log, user_has_permission
from datetime import datetime, timedelta
from bson import ObjectId
import random
import string
import uuid
from integrations import EmailIntegration, ZoomIntegration, GoogleMeetIntegration

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
    today = datetime.utcnow()
    
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


def generate_meeting_link(preferred_platform: str, appointment_id: str, counseling_id: str, appointment_date: datetime = None, student_email: str = None) -> dict:
    """
    Generate a meeting link based on the preferred platform.
    For Zoom: Creates a real meeting via Zoom API.
    For Google Meet: Creates a real meeting via Google Calendar API.
    For in-person: Returns location info.
    
    Args:
        preferred_platform: 'zoom', 'google_meet', or 'in-person'
        appointment_id: unique appointment ID
        counseling_id: counseling ID
        appointment_date: datetime for appointment
        student_email: student's email for Google Meet attendee
    
    Returns: {'platform': str, 'join_url': str, 'meeting_id': str, ...}
    """
    meeting_id = f"{counseling_id}-{str(appointment_id)[:8]}"
    
    if preferred_platform == 'zoom':
        # Initialize Zoom integration with app config
        zoom = ZoomIntegration(current_app.config)
        
        # Check if credentials are properly configured
        if not zoom.client_id or not zoom.client_secret:
            error_msg = "Zoom credentials not configured. Please contact support."
            print(f"❌ ZOOM: {error_msg}")
            raise ValueError(error_msg)
        
        try:
            # Format start time for Zoom API (ISO 8601 with timezone)
            if appointment_date is None:
                appointment_date = datetime.utcnow() + timedelta(days=3)
            
            # Convert to ISO format: 2026-03-15T10:30:00
            start_time = appointment_date.strftime('%Y-%m-%dT%H:%M:%S')
            
            # Create real Zoom meeting (no fallback)
            meeting_result = zoom.create_meeting(
                topic=f'CPS Initial Assessment - {counseling_id}',
                start_time=start_time,
                duration_minutes=60,
                password=None  # Zoom will generate
            )
            
            print(f"✅ ZOOM: Real meeting created - {meeting_result.get('meeting_id')}")
            return meeting_result
            
        except Exception as e:
            error_msg = f"Failed to create Zoom meeting: {str(e)}"
            print(f"❌ ZOOM: {error_msg}")
            # No fallback - raise the error instead
            raise Exception(error_msg)
            
    elif preferred_platform == 'google_meet':
        # Create real Google Meet meeting via Google Calendar API
        try:
            if appointment_date is None:
                appointment_date = datetime.utcnow() + timedelta(days=3)
            
            google_meet = GoogleMeetIntegration(current_app.config)
            
            # Add student as attendee so they can access the meeting
            attendees = []
            if student_email:
                attendees.append(student_email)
            
            meeting_result = google_meet.create_meeting(
                title=f'CPS Initial Assessment - {counseling_id}',
                start_time=appointment_date,
                duration_minutes=60,
                description=f'Campus Counseling & Psychology Services\nInitial Assessment\nCounseling ID: {counseling_id}',
                attendees_emails=attendees if attendees else None
            )
            
            print(f"✅ GOOGLE MEET: Real meeting created - {meeting_result.get('meeting_id')}")
            return meeting_result
            
        except Exception as e:
            error_msg = f"Failed to create Google Meet: {str(e)}"
            print(f"❌ GOOGLE MEET: {error_msg}")
            raise Exception(error_msg)
            
    else:  # in-person
        return {
            'platform': 'in-person',
            'join_url': None,
            'meeting_id': None,
            'location': 'Counseling & Psychology Services Office'
        }


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
    
    # Calculate scores (extract 'score' from each response dict)
    phq9_score = sum(r.get('score', 0) if isinstance(r, dict) else r for r in phq9_responses) if phq9_responses else None
    gad7_score = sum(r.get('score', 0) if isinstance(r, dict) else r for r in gad7_responses) if gad7_responses else None
    pss_score = sum(r.get('score', 0) if isinstance(r, dict) else r for r in pss_responses) if pss_responses else None
    acad_score = sum(r.get('score', 0) if isinstance(r, dict) else r for r in acad_responses) if acad_responses else None
    career_score = sum(r.get('score', 0) if isinstance(r, dict) else r for r in career_responses) if career_responses else None
    social_score = sum(r.get('score', 0) if isinstance(r, dict) else r for r in social_responses) if social_responses else None
    
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
    
    # CREATE APPOINTMENT WITH MEETING LINK
    preferred_platform = data.get('preferred_platform', 'in-person')
    appointment_id = ObjectId()
    meeting_link_info = generate_meeting_link(preferred_platform, str(appointment_id), counseling_id, appointment_date, student_email=user_email)
    
    appointment_doc = {
        "_id": appointment_id,
        "case_id": case_id,
        "intake_id": intake_id,
        "student_id": user_obj_id,
        "counselor_id": assigned_counselor_id,
        "appointment_type": "initial_assessment",
        "status": AppointmentStatus.REQUESTED.value,
        "preferred_platform": preferred_platform,
        "meeting_link": meeting_link_info.get('join_url'),
        "meeting_id": meeting_link_info.get('meeting_id'),
        "meeting_passcode": meeting_link_info.get('meeting_passcode'),
        "requested_start": appointment_date,
        "requested_end": appointment_date + timedelta(hours=1),
        "counseling_id": counseling_id,
        "is_emergency": is_emergency,
        "urgency_level": urgency_level,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    # Add platform-specific info
    if preferred_platform == 'zoom':
        appointment_doc['zoom_meeting_id'] = meeting_link_info.get('meeting_id')
        appointment_doc['zoom_join_url'] = meeting_link_info.get('join_url')
    elif preferred_platform == 'google_meet':
        appointment_doc['meet_code'] = meeting_link_info.get('meeting_id')
        appointment_doc['meet_join_url'] = meeting_link_info.get('join_url')
    else:  # in-person
        appointment_doc['location'] = meeting_link_info.get('location', 'CPS Office')
    
    db.db.appointments.insert_one(appointment_doc)
    
    # Send email with counseling ID and appointment info
    smtp_host = current_app.config.get('SMTP_HOST')
    print(f"📧 EMAIL CHECK: user_email={user_email}, SMTP_HOST={smtp_host}")
    
    if user_email and smtp_host:
        try:
            print(f"📧 SENDING EMAIL to {user_email}...")
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
            
            # Build appointment info for email
            appointment_info = ""
            if preferred_platform == 'zoom' and meeting_link_info.get('join_url'):
                appointment_info = f"""
Virtual Appointment Details:
- Platform: Zoom Video Conference
- Join URL: {meeting_link_info.get('join_url')}
- Meeting ID: {meeting_link_info.get('meeting_id')}
- Passcode: {meeting_link_info.get('meeting_passcode')}
"""
            elif preferred_platform == 'google_meet' and meeting_link_info.get('join_url'):
                appointment_info = f"""
Virtual Appointment Details:
- Platform: Google Meet
- Join URL: {meeting_link_info.get('join_url')}
- Meeting Code: {meeting_link_info.get('meeting_id')}
"""
            else:
                appointment_info = """
In-Person Appointment:
- Location: Counseling & Psychology Services Office
- Please arrive 10 minutes early
"""
            
            email_body = f"""Dear {user_name},

Thank you for completing your intake form with Counseling & Psychological Services.

{status_msg}

Your Counseling ID: {counseling_id}

Assessment Results:
{score_summary}

Appointment Information:
{appointment_info}

Next Steps: {next_step}
Estimated appointment date: {appointment_date.strftime('%B %d, %Y')}

Please keep your Counseling ID for all future communications and appointments.

Best regards,
Counseling & Psychological Services Team"""
            
            email_integration = EmailIntegration(current_app.config)
            result = email_integration.send_email(
                to_address=user_email if not is_anonymous else None,
                subject=f"Your Counseling ID: {counseling_id}",
                html_body=email_body
            )
            print(f"✅ EMAIL SENT: result={result}")
        except Exception as e:
            print(f"❌ Email send failed: {type(e).__name__}: {str(e)}")
            import traceback
            traceback.print_exc()
    
    audit_log(db.db, 'intake', 'submit', entity_id=str(intake_id), 
              new_values={"is_emergency": is_emergency, "is_anonymous": is_anonymous, "urgency": urgency_level})
    
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
    
    # Build appointment info for response
    appointment_response = {
        'preferred_platform': preferred_platform,
        'appointment_date': appointment_date.isoformat(),
    }
    
    if preferred_platform == 'zoom' and meeting_link_info.get('join_url'):
        appointment_response['platform'] = 'Zoom Video Conference'
        appointment_response['join_url'] = meeting_link_info.get('join_url')
        appointment_response['meeting_id'] = meeting_link_info.get('meeting_id')
        appointment_response['passcode'] = meeting_link_info.get('meeting_passcode')
    elif preferred_platform == 'google_meet' and meeting_link_info.get('join_url'):
        appointment_response['platform'] = 'Google Meet'
        appointment_response['join_url'] = meeting_link_info.get('join_url')
        appointment_response['meeting_code'] = meeting_link_info.get('meeting_id')
    else:
        appointment_response['platform'] = 'In-Person'
        appointment_response['location'] = meeting_link_info.get('location', 'CPS Office')
    
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
        'scores': scores_response,
        'appointment': appointment_response
    }), 201


@intake_bp.route('/calculate-appointment', methods=['POST'])
@jwt_required()
def calculate_appointment():
    """Calculate automatic appointment date based on assessment scores"""
    data = request.get_json()
    
    # Extract assessment responses
    phq9_responses = data.get('phq9_responses', [])
    gad7_responses = data.get('gad7_responses', [])
    pss_responses = data.get('pss_responses', [])
    acad_responses = data.get('acad_responses', [])
    
    # Calculate scores
    phq9_score = sum([int(r.get('score', 0)) for r in phq9_responses if r.get('score')]) if phq9_responses else None
    gad7_score = sum([int(r.get('score', 0)) for r in gad7_responses if r.get('score')]) if gad7_responses else None
    pss_score = sum([int(r.get('score', 0)) for r in pss_responses if r.get('score')]) if pss_responses else None
    acad_score = sum([int(r.get('score', 0)) for r in acad_responses if r.get('score')]) if acad_responses else None
    
    # Determine urgency level (mirrors scoring in student_submit_intake)
    urgency_level = 'normal'
    is_emergency = False
    
    if phq9_score and phq9_score > 20:
        is_emergency = True
    elif phq9_score and phq9_score > 15:
        urgency_level = 'high'
    elif gad7_score and gad7_score > 15:
        is_emergency = True
    elif gad7_score and gad7_score > 12:
        urgency_level = 'high'
    elif acad_score and acad_score > 24:
        urgency_level = 'high'
    
    # Calculate appointment date
    appointment_date, estimated_days = calculate_appointment_date(is_emergency, urgency_level)
    
    # Get minimum selectable date (today for normal, same day for high/emergency consideration)
    today = datetime.utcnow()
    min_date = appointment_date - timedelta(days=1)  # Can select date before auto if within reason
    
    return jsonify({
        'automatic_date': appointment_date.isoformat(),
        'automatic_date_formatted': appointment_date.strftime('%A, %B %d, %Y'),
        'urgency_level': urgency_level,
        'is_emergency': is_emergency,
        'estimated_days': estimated_days,
        'min_selectable_date': min_date.isoformat(),
        'min_selectable_date_formatted': min_date.strftime('%Y-%m-%d'),
        'scores': {
            'phq9': phq9_score,
            'gad7': gad7_score,
            'pss': pss_score,
            'acad': acad_score
        }
    }), 200


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


# ============================================================
# EFFICIENT ROLE-BASED ASSESSMENT ENDPOINTS
# ============================================================

def get_risk_level(phq9_score=None, gad7_score=None, acad_score=None, social_score=None):
    """Calculate risk level based on assessment scores"""
    if not any([phq9_score, gad7_score, acad_score, social_score]):
        return "GREEN"
    
    max_score = 0
    max_possible = 0
    
    if phq9_score is not None:
        max_score += phq9_score
        max_possible += 27
    if gad7_score is not None:
        max_score += gad7_score
        max_possible += 21
    if acad_score is not None:
        max_score += acad_score
        max_possible += 32
    if social_score is not None:
        max_score += social_score
        max_possible += 32
    
    if max_possible == 0:
        return "GREEN"
    
    risk_percentage = (max_score / max_possible) * 100
    
    if risk_percentage >= 75:
        return "CRITICAL"
    elif risk_percentage >= 50:
        return "RED"
    elif risk_percentage >= 25:
        return "YELLOW"
    else:
        return "GREEN"


@intake_bp.route('/assessments/init-indexes', methods=['POST'])
@jwt_required()
def init_indexes():
    """Initialize database indexes for optimal performance"""
    user_id = get_jwt_identity()
    user = db.db.users.find_one({"_id": ObjectId(user_id)})
    
    if not user or user.get('role') not in ['ADMIN', 'DPO']:
        return jsonify({'error': 'Only admins can initialize indexes'}), 403
    
    try:
        # Create efficient database indexes
        db.db.intakes.create_index([("is_emergency", 1), ("status", 1), ("student_submitted_at", -1)])
        db.db.intakes.create_index([("case_id", 1)])
        db.db.intakes.create_index([("assigned_counselor_id", 1), ("status", 1)])
        db.db.intakes.create_index([("urgency_level", 1), ("student_submitted_at", -1)])
        db.db.intakes.create_index([("responses.phq9_score", 1), ("responses.gad7_score", 1)])
        db.db.assessments.create_index([("case_id", 1)])
        db.db.assessments.create_index([("assessment_type", 1), ("created_at", -1)])
        db.db.cases.create_index([("student_id", 1)])
        db.db.cases.create_index([("assigned_counselor_id", 1)])
        db.db.cases.create_index([("case_status", 1)])
        
        return jsonify({
            'status': 'success',
            'message': 'All database indexes created successfully'
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@intake_bp.route('/assessments/dashboard', methods=['GET'])
@jwt_required()
def get_assessment_dashboard():
    """
    Get role-specific assessment dashboard
    Different views for different roles - VERY EFFICIENT
    """
    user_id = get_jwt_identity()
    user = db.db.users.find_one({"_id": ObjectId(user_id)})
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    user_role = user.get('role')
    dashboard_data = {
        'user_role': user_role,
        'timestamp': datetime.utcnow().isoformat(),
        'alerts': [],
        'summary': {},
        'recent_cases': []
    }
    
    try:
        if user_role == 'STUDENT':
            # Student sees only their own assessments
            try:
                case = db.db.cases.find_one({"student_id": ObjectId(user_id)})
                if case:
                    intakes = list(db.db.intakes.find({"case_id": case['_id']}).sort("created_at", -1).limit(5))
                    for intake in intakes:
                        try:
                            scores = intake.get('responses', {})
                            risk = get_risk_level(
                                scores.get('phq9_score'),
                                scores.get('gad7_score'),
                                scores.get('acad_score'),
                                scores.get('social_score')
                            )
                            submitted_at = intake.get('student_submitted_at')
                            dashboard_data['recent_cases'].append({
                                'counseling_id': intake.get('counseling_id'),
                                'submitted_at': submitted_at.isoformat() if submitted_at else None,
                                'appointment_date': intake.get('responses', {}).get('appointment_date'),
                                'risk_level': risk,
                                'scores': {k: v for k, v in scores.items() if k.endswith('_score')}
                            })
                        except Exception as intake_err:
                            print(f"Error processing intake {intake.get('_id')}: {intake_err}")
                            continue
                    
                    dashboard_data['summary'] = {
                        'total_intakes': len(intakes),
                        'my_case_id': str(case['_id'])
                    }
                else:
                    dashboard_data['summary'] = {
                        'total_intakes': 0,
                        'message': 'No case found for this student'
                    }
            except Exception as student_err:
                print(f"Error loading student dashboard: {student_err}")
                dashboard_data['summary'] = {'error': str(student_err)}
        
        elif user_role in ['COUNSELOR', 'CSC', 'CSP']:
            # Counselor sees only their assigned cases
            try:
                cases = list(db.db.cases.find({"assigned_counselor_id": ObjectId(user_id)}).limit(50))
                case_ids = [case['_id'] for case in cases]
                
                if case_ids:
                    # Efficiently get all assessments for assigned cases
                    intakes = list(db.db.intakes.find({
                        "case_id": {"$in": case_ids},
                        "status": "COMPLETED"
                    }).sort("student_submitted_at", -1).limit(20))
                    
                    for intake in intakes:
                        try:
                            scores = intake.get('responses', {})
                            risk = get_risk_level(
                                scores.get('phq9_score'),
                                scores.get('gad7_score')
                            )
                            
                            if risk in ['RED', 'CRITICAL']:
                                dashboard_data['alerts'].append({
                                    'case_id': str(intake['case_id']),
                                    'counseling_id': intake.get('counseling_id'),
                                    'risk_level': risk,
                                    'type': 'high_risk_assessment'
                                })
                            
                            submitted_at = intake.get('student_submitted_at')
                            dashboard_data['recent_cases'].append({
                                'case_id': str(intake['case_id']),
                                'counseling_id': intake.get('counseling_id'),
                                'submitted_at': submitted_at.isoformat() if submitted_at else None,
                                'risk_level': risk,
                                'is_emergency': intake.get('is_emergency')
                            })
                        except Exception as intake_err:
                            print(f"Error processing intake {intake.get('_id')}: {intake_err}")
                            continue
                else:
                    intakes = []
                
                dashboard_data['summary'] = {
                    'assigned_cases': len(cases),
                    'high_risk_alerts': len(dashboard_data['alerts']),
                    'recent_assessments': len(intakes)
                }
            except Exception as counselor_err:
                print(f"Error loading counselor dashboard: {counselor_err}")
                dashboard_data['summary'] = {'error': str(counselor_err)}
        
        elif user_role == 'PSYCHOLOGIST':
            # Psychologists see high-complexity cases (mental health focus)
            intakes = list(db.db.intakes.find({
                "$or": [
                    {"responses.phq9_score": {"$gte": 20}},
                    {"responses.gad7_score": {"$gte": 15}},
                    {"is_emergency": True}
                ]
            }).sort("student_submitted_at", -1).limit(30))
            
            for intake in intakes:
                scores = intake.get('responses', {})
                risk = get_risk_level(
                    scores.get('phq9_score'),
                    scores.get('gad7_score'),
                    scores.get('pss_score')
                )
                
                dashboard_data['recent_cases'].append({
                    'case_id': str(intake['case_id']),
                    'counseling_id': intake.get('counseling_id'),
                    'phq9': scores.get('phq9_score'),
                    'gad7': scores.get('gad7_score'),
                    'pss': scores.get('pss_score'),
                    'risk_level': risk,
                    'is_emergency': intake.get('is_emergency'),
                    'submitted_at': intake.get('student_submitted_at').isoformat() if intake.get('student_submitted_at') else None
                })
            
            dashboard_data['summary'] = {
                'critical_cases': len([c for c in dashboard_data['recent_cases'] if c['risk_level'] == 'CRITICAL']),
                'high_risk_cases': len([c for c in dashboard_data['recent_cases'] if c['risk_level'] == 'RED']),
                'total_reviewed': len(intakes)
            }
        
        elif user_role == 'IC':
            # Intake counselors see all new intakes
            new_intakes = list(db.db.intakes.find({
                "status": "COMPLETED"
            }).sort("student_submitted_at", -1).limit(50))
            
            for intake in new_intakes:
                scores = intake.get('responses', {})
                dashboard_data['recent_cases'].append({
                    'intake_id': str(intake['_id']),
                    'counseling_id': intake.get('counseling_id'),
                    'concern': intake.get('responses', {}).get('purpose'),
                    'is_emergency': intake.get('is_emergency'),
                    'is_anonymous': intake.get('is_anonymous'),
                    'submitted_at': intake.get('student_submitted_at').isoformat() if intake.get('student_submitted_at') else None,
                    'assessments_taken': len([k for k in scores.keys() if k.endswith('_score')])
                })
            
            dashboard_data['summary'] = {
                'total_intakes': len(new_intakes),
                'emergency_count': len([c for c in dashboard_data['recent_cases'] if c['is_emergency']]),
                'anonymous_count': len([c for c in dashboard_data['recent_cases'] if c['is_anonymous']])
            }
        
        elif user_role in ['ADMIN', 'DPO', 'CASE_MANAGER']:
            # Full system view
            all_intakes = list(db.db.intakes.find({"status": "COMPLETED"}).sort("student_submitted_at", -1).limit(100))
            
            risk_distribution = {'GREEN': 0, 'YELLOW': 0, 'RED': 0, 'CRITICAL': 0}
            concern_distribution = {}
            
            for intake in all_intakes:
                scores = intake.get('responses', {})
                risk = get_risk_level(
                    scores.get('phq9_score'),
                    scores.get('gad7_score'),
                    scores.get('acad_score'),
                    scores.get('social_score')
                )
                risk_distribution[risk] += 1
                
                concern = scores.get('purpose', 'unknown')
                concern_distribution[concern] = concern_distribution.get(concern, 0) + 1
                
                if risk in ['RED', 'CRITICAL']:
                    dashboard_data['alerts'].append({
                        'case_id': str(intake['case_id']),
                        'counseling_id': intake.get('counseling_id'),
                        'risk_level': risk,
                        'concern': concern
                    })
            
            for intake in all_intakes[:20]:
                scores = intake.get('responses', {})
                risk = get_risk_level(
                    scores.get('phq9_score'),
                    scores.get('gad7_score'),
                    scores.get('acad_score'),
                    scores.get('social_score')
                )
                dashboard_data['recent_cases'].append({
                    'case_id': str(intake.get('case_id', '')),
                    'counseling_id': intake.get('counseling_id'),
                    'concern': scores.get('purpose', 'General'),
                    'risk_level': risk,
                    'is_emergency': intake.get('is_emergency'),
                    'submitted_at': intake.get('student_submitted_at').isoformat() if intake.get('student_submitted_at') else None
                })
            
            dashboard_data['summary'] = {
                'total_intakes': len(all_intakes),
                'risk_distribution': risk_distribution,
                'concern_distribution': concern_distribution,
                'critical_alerts': len([a for a in dashboard_data['alerts'] if a['risk_level'] == 'CRITICAL'])
            }
        
        else:
            dashboard_data['summary'] = {'message': f'Dashboard data not available for role {user_role}', 'role': user_role}
    
    except Exception as e:
        print(f"Dashboard error for user {user_id}: {str(e)}")
        return jsonify({
            'user_role': user_role,
            'timestamp': datetime.utcnow().isoformat(),
            'alerts': [],
            'summary': {'error': str(e)},
            'recent_cases': []
        }), 200
    
    return jsonify(dashboard_data), 200


@intake_bp.route('/assessments/urgent', methods=['GET'])
@jwt_required()
def get_urgent_assessments():
    """Get all urgent assessments - role-based, very efficient"""
    user_id = get_jwt_identity()
    user = db.db.users.find_one({"_id": ObjectId(user_id)})
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    user_role = user.get('role')
    
    # Build query for urgent cases
    query = {
        "status": "COMPLETED",
        "$or": [
            {"is_emergency": True},
            {"responses.phq9_score": {"$gte": 20}},
            {"responses.gad7_score": {"$gte": 15}},
            {"responses.acad_score": {"$gte": 24}},
            {"responses.social_score": {"$gte": 24}}
        ]
    }
    
    # Role-based filtering
    if user_role == 'COUNSELOR':
        query["assigned_counselor_id"] = ObjectId(user_id)
    elif user_role == 'STUDENT':
        case = db.db.cases.find_one({"student_id": ObjectId(user_id)})
        if case:
            query["case_id"] = case['_id']
        else:
            return jsonify({'urgent_assessments': []}), 200
    elif user_role not in ['ADMIN', 'DPO', 'PSYCHOLOGIST', 'IC', 'CASE_MANAGER']:
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    urgent_intakes = list(db.db.intakes.find(query).sort("student_submitted_at", -1).limit(50))
    
    result = []
    for intake in urgent_intakes:
        scores = intake.get('responses', {})
        risk = get_risk_level(
            scores.get('phq9_score'),
            scores.get('gad7_score'),
            scores.get('acad_score'),
            scores.get('social_score')
        )
        
        result.append({
            'intake_id': str(intake['_id']),
            'case_id': str(intake['case_id']),
            'counseling_id': intake.get('counseling_id'),
            'risk_level': risk,
            'is_emergency': intake.get('is_emergency'),
            'concern': scores.get('purpose'),
            'scores': {k: v for k, v in scores.items() if k.endswith('_score')},
            'submitted_at': intake.get('student_submitted_at').isoformat() if intake.get('student_submitted_at') else None
        })
    
    return jsonify({
        'count': len(result),
        'urgent_assessments': result
    }), 200


@intake_bp.route('/assessments/stats', methods=['GET'])
@jwt_required()
def get_assessment_statistics():
    """Get system-wide assessment statistics (admin only)"""
    user_id = get_jwt_identity()
    user = db.db.users.find_one({"_id": ObjectId(user_id)})
    
    if not user or user.get('role') not in ['ADMIN', 'DPO', 'CASE_MANAGER']:
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        total_intakes = db.db.intakes.count_documents({"status": "COMPLETED"})
        emergency_count = db.db.intakes.count_documents({"is_emergency": True})
        anonymous_count = db.db.intakes.count_documents({"is_anonymous": True})
        
        # Efficient aggregation
        stats_pipeline = [
            {"$match": {"status": "COMPLETED"}},
            {
                "$facet": {
                    "by_concern": [
                        {"$group": {"_id": "$responses.purpose", "count": {"$sum": 1}}},
                        {"$sort": {"count": -1}}
                    ],
                    "by_urgency": [
                        {"$group": {"_id": "$responses.urgency_level", "count": {"$sum": 1}}}
                    ]
                }
            }
        ]
        
        stats = list(db.db.intakes.aggregate(stats_pipeline))[0]
        
        return jsonify({
            'total_intakes': total_intakes,
            'emergency_cases': emergency_count,
            'anonymous_submissions': anonymous_count,
            'statistics': stats
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

