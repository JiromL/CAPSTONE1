"""
EPIC 3: INTAKE INTERVIEW & ENDORSEMENT MODULE
MongoDB-compatible version
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, IntakeStatus, PermissionType, AppointmentStatus
from utils import audit_log, user_has_permission, serialize_doc
from datetime import datetime, timedelta, date as date_type
from bson import ObjectId
import random
import string
import uuid
from integrations import EmailIntegration, ZoomIntegration, GoogleMeetIntegration

intake_bp = Blueprint('intake', __name__, url_prefix='/api/intake')


def generate_case_number():
    now = datetime.utcnow()
    return f"CPS-{now.year}-{uuid.uuid4().hex[:3].upper()}"


def generate_counseling_id():
    """Generate a unique counseling ID in format CPS-XXXXXXXX"""
    random_string = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"CPS-{random_string}"


def get_available_intake_counselors(exclude_ids: list = None):
    """
    Get list of available intake counselors (Role: IC - Intake Counselor).
    
    Returns: List of counselor documents
    """
    if exclude_ids is None:
        exclude_ids = []
    
    query = {
        "role": {"$in": ["IC", "INTAKE_COUNSELOR"]},
        "is_active": True,
        "_id": {"$nin": [ObjectId(id) if isinstance(id, str) else id for id in exclude_ids]}
    }
    
    counselors = list(db.db.users.find(query))
    return counselors


def find_next_available_slot(risk_level: str = 'GREEN', max_wait_minutes: int = 30):
    """
    Find the next available appointment slot for an intake counselor based on risk level.
    
    Scheduling Rules:
    - RED/CRITICAL (High Risk): Within 30 mins to end of business day (MANDATORY - no user choice)
      * Must be first available counselor slot
      * Can wait up to 30 mins if needed
    
    - YELLOW (Medium Risk): Same day or next day (LIMITED user choice)
      * Try to fit within business day if slots available
      * Otherwise next day morning
      * User can choose from available slots within window
    
    - GREEN (Low Risk): Starting tomorrow onwards (FLEXIBLE user choice)
      * User can pick any time from tomorrow+
      * Can choose from upcoming available slots
    
    Args:
        risk_level: 'RED', 'YELLOW', 'GREEN', or 'CRITICAL'
        max_wait_minutes: Maximum wait time in minutes (for RED/CRITICAL priority)
    
    Returns: (appointment_datetime, urgency_text, availability_status, is_user_selectable)
    """
    now = datetime.utcnow() + timedelta(hours=8)  # PHT = UTC+8
    business_hours_start = 9   # 9 AM PHT
    business_hours_end = 17    # 5 PM PHT
    
    # Determine scheduling window based on risk level
    if risk_level in ['RED', 'CRITICAL']:
        # High Risk: Mandatory within 30 mins to end of business day
        # NO USER CHOICE - auto-schedule to first available
        end_of_day = now.replace(hour=business_hours_end, minute=0, second=0, microsecond=0)
        
        # If it's after business hours, schedule for start of next day
        if now.hour >= business_hours_end:
            appointment_date = (now + timedelta(days=1)).replace(hour=business_hours_start, minute=0, second=0, microsecond=0)
            urgency_text = "URGENT: First available slot (start of business day)"
            status = "urgent_next_day"
        else:
            # Try to fit within end of day, allowing some wait time
            appointment_date = min(now + timedelta(minutes=max_wait_minutes), end_of_day)
            urgency_text = f"URGENT: Must be scheduled within {max_wait_minutes} minutes or by end of business day"
            status = "urgent_same_day"
        
        is_user_selectable = False  # No choice for RED - auto-assigned
    
    elif risk_level == 'YELLOW':
        # Medium Risk: Same day or next day
        # LIMITED USER CHOICE - can pick from available slots within window
        if now.hour < business_hours_end - 1:  # If we have at least 1 hour left today
            # Try for same day (user can pick from slots)
            appointment_date = now.replace(hour=now.hour + 1, minute=0, second=0, microsecond=0)
            urgency_text = "High Priority: Available slots today or tomorrow"
            status = "high_priority_same_day"
        else:
            # Schedule for next business day (user picks time)
            appointment_date = (now + timedelta(days=1)).replace(hour=business_hours_start, minute=0, second=0, microsecond=0)
            urgency_text = "High Priority: Available slots tomorrow"
            status = "high_priority_next_day"
        
        is_user_selectable = True  # User can pick from available slots
    
    else:  # GREEN
        # Low Risk: Starting tomorrow onwards
        # FULL USER CHOICE - user picks any available time from tomorrow onwards
        days_ahead = 1  # Start from tomorrow, not today
        appointment_date = (now + timedelta(days=days_ahead)).replace(hour=business_hours_start, minute=0, second=0, microsecond=0)
        
        # Skip weekends if needed
        while appointment_date.weekday() > 4:  # 5 = Saturday, 6 = Sunday
            appointment_date += timedelta(days=1)
        
        urgency_text = "Standard: Choose your preferred time starting tomorrow"
        status = "standard_user_choice"
        is_user_selectable = True  # Full user choice
    
    # Check appointments to find actual available times
    counselors = get_available_intake_counselors()
    counselor_ids = [c["_id"] for c in counselors]
    
    if not counselor_ids:
        # No counselors available, return default time anyway
        return appointment_date, urgency_text + " (no counselors available)", "no_counselors", is_user_selectable
    
    # Find existing appointments for these counselors during the target time window
    existing_appts = list(db.db.appointments.find({
        "counselor_id": {"$in": counselor_ids},
        "scheduled_start": {"$gte": appointment_date, "$lt": appointment_date + timedelta(hours=8)},
        "status": {"$in": ["MATCHED", "CONFIRMED", "REQUESTED"]}
    }))
    
    occupied_times = {appt["scheduled_start"] for appt in existing_appts if appt.get("scheduled_start")}
    
    # Find first available 30-min slot
    current_slot = appointment_date
    slot_duration = timedelta(minutes=30)
    max_slots_to_check = 20  # Check up to 20 slots
    
    for _ in range(max_slots_to_check):
        if current_slot not in occupied_times:
            return current_slot, urgency_text, status, is_user_selectable
        current_slot += slot_duration
    
    # If no slots found, return next available
    return current_slot, urgency_text + " (optimized for availability)", status, is_user_selectable


def get_available_slots_for_risk(risk_level: str = 'GREEN', num_days: int = 7):
    """
    Get multiple available appointment slots that users can choose from,
    based on their risk level.
    
    For GREEN: Returns slots from tomorrow through 7 days out
    For YELLOW: Returns slots from today/tomorrow through 3 days out
    For RED: Returns immediate slots (no choice - just shows first 3)
    
    Returns: List of available time slots
    """
    now = datetime.utcnow() + timedelta(hours=8)  # PHT = UTC+8
    business_hours_start = 9
    business_hours_end = 17

    # Determine starting point based on risk level
    if risk_level in ['RED', 'CRITICAL']:
        start_date = now
        num_days = 1  # Only look for immediate (same day/next day)
    elif risk_level == 'YELLOW':
        start_date = now
        num_days = 3  # Look ahead 3 days
    else:  # GREEN
        start_date = (now + timedelta(days=1)).replace(hour=business_hours_start, minute=0, second=0, microsecond=0)
        num_days = 7  # User can pick from up to 7 days out
    
    # Get available counselors
    counselors = get_available_intake_counselors()
    if not counselors:
        return []
    
    counselor_ids = [c["_id"] for c in counselors]
    
    # Get all existing appointments for these counselors
    search_end = start_date + timedelta(days=num_days, hours=8)
    existing_appts = list(db.db.appointments.find({
        "counselor_id": {"$in": counselor_ids},
        "scheduled_start": {"$gte": start_date, "$lt": search_end},
        "status": {"$in": ["MATCHED", "CONFIRMED", "REQUESTED"]}
    }))
    
    occupied_times = {appt["scheduled_start"] for appt in existing_appts if appt.get("scheduled_start")}
    
    available_slots = []
    current_date = start_date
    end_date = start_date + timedelta(days=num_days)
    
    while current_date < end_date:
        # Skip weekends
        if current_date.weekday() <= 4:  # Monday-Friday
            # Generate 30-min slots for this day
            slot_time = current_date.replace(hour=business_hours_start, minute=0, second=0, microsecond=0)
            end_of_day = current_date.replace(hour=business_hours_end, minute=0, second=0, microsecond=0)
            
            while slot_time < end_of_day:
                if slot_time not in occupied_times:
                    available_slots.append({
                        'datetime': slot_time.isoformat(),
                        'date': slot_time.strftime("%Y-%m-%d"),
                        'time': slot_time.strftime("%I:%M %p"),
                        'day_of_week': slot_time.strftime("%A"),
                        'is_today': slot_time.date() == now.date(),
                        'is_tomorrow': slot_time.date() == (now + timedelta(days=1)).date()
                    })
                
                slot_time += timedelta(minutes=30)
        
        current_date += timedelta(days=1)
    
    return available_slots[:20]  # Return up to 20 slots


def calculate_appointment_date(is_emergency: bool, urgency_level: str = 'normal', risk_level: str = 'GREEN'):
    """
    Calculate appointment date based on risk level (CPS triage system).
    
    Risk-Based Triage Rules:
    - RED/CRITICAL (High Risk): Mandatory within 30 minutes to end of day
      * No user choice - auto-scheduled to first available
    
    - YELLOW (Medium Risk): Same day or next day
      * User can choose from available slots within the window
    
    - GREEN (Low Risk): Tomorrow or later
      * User has full choice - can pick any time from tomorrow onwards
    
    Returns (appointment_date, estimated_days_string, appointment_time)
    """
    # Map different risk naming conventions
    normalized_risk = risk_level
    if normalized_risk in ['CRITICAL', 'emergency']:
        normalized_risk = 'RED'
    elif is_emergency:
        normalized_risk = 'RED'
    elif urgency_level == 'high':
        normalized_risk = 'YELLOW'
    elif urgency_level == 'emergency':
        normalized_risk = 'RED'
    
    # Find next available appointment slot
    appointment_dt, urgency_text, status, is_user_selectable = find_next_available_slot(normalized_risk)
    appointment_time_str = appointment_dt.strftime("%I:%M %p") if normalized_risk != 'RED' else "ASAP"
    
    return appointment_dt, urgency_text, appointment_time_str


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
        if not zoom.client_id or not zoom.client_secret or not zoom.account_id:
            # For testing: generate mock Zoom link
            print(f"⚠️ ZOOM: Credentials not configured. Generating mock link for testing.")
            return {
                'platform': 'zoom',
                'join_url': f'https://zoom.us/wc/join/mock-{meeting_id}',
                'meeting_id': meeting_id,
                'meeting_passcode': '123456'
            }
        
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
            google_meet = GoogleMeetIntegration(current_app.config)
            
            # Check if credentials are configured
            if not google_meet.service_account_email or not google_meet.service_account_key_str:
                # For testing: generate mock Google Meet link
                print(f"⚠️ GOOGLE MEET: Credentials not configured. Generating mock link for testing.")
                return {
                    'platform': 'google_meet',
                    'join_url': f'https://meet.google.com/{meeting_id}',
                    'meeting_id': meeting_id
                }
            
            if appointment_date is None:
                appointment_date = datetime.utcnow() + timedelta(days=3)
            
            # Note: Service accounts cannot add attendees without domain-wide delegation
            # The public Google Meet link is sufficient for students to join
            meeting_result = google_meet.create_meeting(
                title=f'CPS Initial Assessment - {counseling_id}',
                start_time=appointment_date,
                duration_minutes=60,
                description=f'Campus Counseling & Psychology Services\nInitial Assessment\nCounseling ID: {counseling_id}',
                attendees_emails=None  # Service account limitation: cannot add attendees
            )
            
            return meeting_result
            
        except Exception as e:
            error_msg = f"Failed to create Google Meet: {str(e)}"
            print(f"⚠️ GOOGLE MEET: {error_msg} - Falling back to in-person")
            # Fallback to in-person on error
            return {
                'platform': 'in-person',
                'join_url': None,
                'meeting_id': None,
                'location': 'Counseling & Psychology Services Office'
            }
            
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
        try:
            intake = db.db.intakes.find_one({"appointment_id": ObjectId(intake_id)})
        except Exception:
            pass

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


@intake_bp.route('/<intake_id>/triage', methods=['POST'])
@jwt_required()
def submit_triage(intake_id):
    """IC submits PHQ-9 / GAD-7 scores and makes triage decision after conducting the intake session.

    Body:
      phq9_responses  — list of 9 ints (0-3 each)
      gad7_responses  — list of 7 ints (0-3 each)
      risk_override   — optional: 'GREEN' | 'YELLOW' | 'RED' | 'CRITICAL' (IC can override)
      triage_decision — 'ENDORSE_CC' | 'ENDORSE_CP' | 'CLOSE_AT_INTAKE'
      endorsement_notes — optional free text
    """
    user_id = get_jwt_identity()
    user = db.db.users.find_one({'_id': ObjectId(user_id)}) if user_id else None
    if not user or user.get('role') not in ('IC', 'STAFF', 'ADMIN', 'PSYCHOLOGIST', 'DPO'):
        return jsonify({'error': 'Only Intake Counselors can submit triage.'}), 403

    try:
        intake = db.db.intakes.find_one({'_id': ObjectId(intake_id)})
    except Exception:
        intake = db.db.intakes.find_one({'_id': intake_id})
    if not intake:
        try:
            intake = db.db.intakes.find_one({'appointment_id': ObjectId(intake_id)})
        except Exception:
            pass
    if not intake:
        return jsonify({'error': 'Intake not found'}), 404

    data = request.get_json() or {}
    phq9 = data.get('phq9_responses', [])
    gad7 = data.get('gad7_responses', [])
    decision = data.get('triage_decision', '')
    notes = data.get('endorsement_notes', '')
    assigned_counselor_id = data.get('assigned_counselor_id', '')

    if not decision:
        return jsonify({'error': 'triage_decision is required.'}), 400
    if decision not in ('ENDORSE_CC', 'ENDORSE_CP', 'CLOSE_AT_INTAKE'):
        return jsonify({'error': 'triage_decision must be ENDORSE_CC, ENDORSE_CP, or CLOSE_AT_INTAKE.'}), 400
    if decision == 'CLOSE_AT_INTAKE' and not notes.strip():
        return jsonify({'error': 'Closure notes are required when closing at intake. Please document the reason, any resources provided, and follow-up plan.'}), 400
    if phq9 and len(phq9) != 9:
        return jsonify({'error': 'phq9_responses must have exactly 9 items.'}), 400
    if gad7 and len(gad7) != 7:
        return jsonify({'error': 'gad7_responses must have exactly 7 items.'}), 400

    phq9_score = sum(int(x) for x in phq9) if phq9 else None
    gad7_score = sum(int(x) for x in gad7) if gad7 else None

    # Calculate risk from scores, then allow IC override
    calculated_risk = get_risk_level(phq9_score=phq9_score, gad7_score=gad7_score)
    risk_level = data.get('risk_override') or calculated_risk

    now = datetime.utcnow()

    # Update intake document
    db.db.intakes.update_one(
        {'_id': intake['_id']},
        {'$set': {
            'status': IntakeStatus.COMPLETED.value,
            'phq9_responses': phq9,
            'phq9_score': phq9_score,
            'gad7_responses': gad7,
            'gad7_score': gad7_score,
            'calculated_risk': calculated_risk,
            'risk_level': risk_level,
            'triage_decision': decision,
            'endorsement_notes': notes,
            'triaged_by': user_id,
            'triaged_at': now,
            'updated_at': now,
        }}
    )

    # Mark the linked intake_interview appointment as COMPLETED so the
    # IC dashboard no longer shows a "Conduct Intake" button for it.
    if intake.get('appointment_id'):
        try:
            db.db.appointments.update_one(
                {'_id': ObjectId(str(intake['appointment_id']))},
                {'$set': {'status': AppointmentStatus.COMPLETED.value, 'updated_at': now}}
            )
        except Exception:
            pass

    # Resolve case — create one if intake has no case_id
    from models import CaseStatus, TerminationType
    case_id = intake.get('case_id')

    # Normalise student_id to ObjectId once
    student_id = intake.get('student_id')
    if student_id and not isinstance(student_id, ObjectId):
        try: student_id = ObjectId(student_id)
        except Exception: pass

    student_doc = db.db.users.find_one({'_id': student_id}) if student_id else None

    if not case_id:
        # Reuse any existing open case for this student to prevent duplicates
        existing_student_case = db.db.cases.find_one({
            'student_id': student_id,
            'case_status': {'$nin': ['CLOSED', 'CANCELLED']},
        }) if student_id else None

        if existing_student_case:
            case_id = existing_student_case['_id']
            db.db.intakes.update_one({'_id': intake['_id']}, {'$set': {'case_id': case_id}})
        else:
            student_name = f"{student_doc.get('first_name','')} {student_doc.get('last_name','')}" if student_doc else ''
            student_email = student_doc.get('email', '') if student_doc else ''
            new_case = {
                'student_id': student_id,
                'student_name': student_name,
                'student_email': student_email,
                'intake_counselor_id': ObjectId(user_id),
                'assigned_counselor_id': None,
                'case_number': generate_case_number(),
                'status': CaseStatus.NEW.value,
                'case_status': CaseStatus.NEW.value,
                'risk_level': risk_level,
                'concern': intake.get('concern', ''),
                'intake_id': intake['_id'],
                'is_minor': intake.get('is_minor', False),
                'created_at': now,
                'updated_at': now,
            }
            case_result = db.db.cases.insert_one(new_case)
            case_id = case_result.inserted_id
            db.db.intakes.update_one({'_id': intake['_id']}, {'$set': {'case_id': case_id}})

    if decision == 'CLOSE_AT_INTAKE':
        db.db.cases.update_one(
            {'_id': case_id},
            {'$set': {
                'status': CaseStatus.CLOSED.value,
                'case_status': CaseStatus.CLOSED.value,
                'termination_type': TerminationType.CLOSED_AT_INTAKE.value,
                'risk_level': risk_level,
                'closed_at': now,
                'closed_by': user_id,
                'closure_notes': notes,
                'updated_at': now,
            }}
        )
    else:
        # ENDORSE_CC or ENDORSE_CP — case becomes active, assign counselor
        endorsed_role = 'COUNSELOR' if decision == 'ENDORSE_CC' else 'PSYCHOLOGIST'

        counselor_obj_id = None
        counselor_name = None
        if assigned_counselor_id:
            try:
                counselor_obj_id = ObjectId(assigned_counselor_id)
                c = db.db.users.find_one({'_id': counselor_obj_id})
                if not c:
                    return jsonify({'error': 'Assigned user not found.'}), 400
                actual_role = c.get('role', '')
                if endorsed_role == 'COUNSELOR' and actual_role != 'COUNSELOR':
                    return jsonify({'error': f'ENDORSE_CC requires a Counselor. Selected user has role: {actual_role}.'}), 400
                if endorsed_role == 'PSYCHOLOGIST' and actual_role != 'PSYCHOLOGIST':
                    return jsonify({'error': f'ENDORSE_CP requires a Psychologist. Selected user has role: {actual_role}.'}), 400
                if not c.get('is_active', True):
                    return jsonify({'error': 'Selected user account is deactivated.'}), 400
                counselor_name = f"{c.get('last_name','').upper()}, {c.get('first_name','')}"
            except Exception:
                pass

        db.db.cases.update_one(
            {'_id': case_id},
            {'$set': {
                'status': CaseStatus.ACTIVE.value,
                'case_status': CaseStatus.ACTIVE.value,
                'risk_level': risk_level,
                'endorsed_to_role': endorsed_role,
                'endorsed_at': now,
                'endorsed_by': user_id,
                'endorsement_notes': notes,
                'assigned_counselor_id': counselor_obj_id,
                'updated_at': now,
            }}
        )

        # Notify assigned counselor of new case
        if counselor_obj_id:
            try:
                db.db.reminders.insert_one({
                    'user_id': counselor_obj_id,
                    'title': 'New Case Assigned',
                    'message': f'A new student ({student_name}) has been endorsed to you. Please review their intake and await their session booking.',
                    'type': 'case_assigned',
                    'acknowledged': False,
                    'created_at': now,
                })
            except Exception:
                pass

        # Notify student via in-app reminder to book their first session
        try:
            role_label = 'counselor' if decision == 'ENDORSE_CC' else 'psychologist'
            counselor_display = counselor_name if counselor_name else f'a {role_label}'
            db.db.reminders.insert_one({
                'user_id': student_id,
                'title': 'Intake Complete — Book Your First Session',
                'message': (
                    f'Your intake interview is complete. '
                    f'You have been assigned to {counselor_display}. '
                    'Please log in and book your first counseling session.'
                ),
                'type': 'triage_complete',
                'acknowledged': False,
                'is_read': False,
                'created_at': now,
            })
        except Exception:
            pass

    audit_log(db.db, 'intake', 'triage', entity_id=intake_id,
              new_values={'risk_level': risk_level, 'triage_decision': decision})

    # Email student: intake done, counselor assigned, book your session
    if decision in ('ENDORSE_CC', 'ENDORSE_CP') and student_doc and student_doc.get('email'):
        try:
            from services.email_service import send_email
            role_label   = 'Counselor' if decision == 'ENDORSE_CC' else 'Psychologist'
            student_first = student_doc.get('first_name', 'Student')
            counselor_display = counselor_name if counselor_name else f'a {role_label}'
            send_email(
                to=student_doc['email'],
                subject='Your intake is complete — book your first counseling session',
                body=(
                    f"Hi {student_first},\n\n"
                    f"Your intake interview has been completed and you have been assigned to "
                    f"{counselor_display}.\n\n"
                    f"Your next step is to book your first counseling session. "
                    f"Please log in to the CPS portal and go to Book a Session:\n"
                    f"https://cps.dlsu.edu.ph/book-appointment\n\n"
                    f"If you have any questions, please contact the CPS office directly.\n\n"
                    f"CPS Management System\nDe La Salle University"
                ),
            )
        except Exception as _e:
            pass  # Email failure must not block triage submission

    return jsonify({
        'message': 'Triage submitted.',
        'phq9_score': phq9_score,
        'gad7_score': gad7_score,
        'calculated_risk': calculated_risk,
        'risk_level': risk_level,
        'triage_decision': decision,
        'case_id': str(case_id) if case_id else None,
    }), 200


@intake_bp.route('/<intake_id>', methods=['GET'])
@jwt_required()
def get_intake(intake_id):
    """Get intake details — accepts intakes _id OR appointment_id"""
    user_id = get_jwt_identity()

    intake = None
    # Try as intakes._id first
    try:
        intake = db.db.intakes.find_one({"_id": ObjectId(intake_id)})
    except Exception:
        intake = db.db.intakes.find_one({"_id": intake_id})

    # Fall back: look up by appointment_id (for online-booked intake_interview appointments)
    if not intake:
        try:
            intake = db.db.intakes.find_one({"appointment_id": ObjectId(intake_id)})
        except Exception:
            pass
        if not intake:
            # Also try looking up from appointments collection directly
            try:
                appt = db.db.appointments.find_one({"_id": ObjectId(intake_id)})
            except Exception:
                appt = None
            if appt:
                # Auto-create a real intake record so triage/submit endpoints can reference it
                new_doc = {
                    'appointment_id': appt['_id'],
                    'student_id': appt.get('student_id'),
                    'counselor_id': appt.get('counselor_id'),
                    'source': 'online',
                    'status': 'PENDING',
                    'concern': appt.get('concern', ''),
                    'purpose': appt.get('purpose', ''),
                    'risk_level': appt.get('risk_level', 'GREEN'),
                    'is_emergency': appt.get('is_emergency', False),
                    'method': appt.get('preferred_method', ''),
                    'responses': {'concern': appt.get('concern', '')},
                    'created_at': datetime.utcnow(),
                    'updated_at': datetime.utcnow(),
                    # NOTE: case_id intentionally omitted — set later when endorsement creates a case
                }
                try:
                    result = db.db.intakes.insert_one(new_doc)
                    new_doc['_id'] = result.inserted_id
                    intake = new_doc
                except Exception:
                    # Race condition: another request created it first — fetch it
                    intake = db.db.intakes.find_one({'appointment_id': appt['_id']})

    if not intake:
        return jsonify({'error': 'Intake not found'}), 404

    # Serialize all ObjectId and datetime fields
    serialized = {}
    for k, v in intake.items():
        if isinstance(v, ObjectId):
            serialized[k] = str(v)
        elif hasattr(v, 'isoformat'):
            serialized[k] = v.isoformat()
        else:
            serialized[k] = v

    # Enrich with appointment's preferred_method if not already stored on intake
    if not serialized.get('method') and serialized.get('appointment_id'):
        try:
            appt = db.db.appointments.find_one({'_id': ObjectId(serialized['appointment_id'])})
            if appt and appt.get('preferred_method'):
                serialized['method'] = appt['preferred_method']
        except Exception:
            pass

    # Enrich with student's school ID and college/department
    if serialized.get('student_id'):
        try:
            student = db.db.users.find_one({'_id': ObjectId(serialized['student_id'])})
            if student:
                serialized['student_school_id'] = (
                    student.get('id_number') or student.get('school_id') or ''
                )
                serialized['student_college'] = (
                    student.get('college') or student.get('department') or
                    student.get('course') or ''
                )
                if not serialized.get('student_name'):
                    first = student.get('first_name', '')
                    last  = student.get('last_name', '')
                    serialized['student_name'] = f"{first} {last}".strip() or student.get('email', '')
                if not serialized.get('student_email'):
                    serialized['student_email'] = student.get('email', '')
        except Exception:
            pass

    return jsonify(serialized), 200


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

    serialized = {k: serialize_doc(v) for k, v in intake.items()}
    return jsonify(serialized), 200


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
    career_responses = data.get('career_responses', [])
    social_responses = data.get('social_responses', [])
    
    # Calculate scores - handle both dict and int formats
    def extract_score(item):
        """Extract score from item, handling both dict with 'score' key and plain integers"""
        if isinstance(item, dict):
            return int(item.get('score', 0)) if item.get('score') else 0
        elif isinstance(item, (int, float)):
            return int(item)
        return 0
    
    phq9_score = sum([extract_score(r) for r in phq9_responses]) if phq9_responses else None
    gad7_score = sum([extract_score(r) for r in gad7_responses]) if gad7_responses else None
    pss_score = sum([extract_score(r) for r in pss_responses]) if pss_responses else None
    acad_score = sum([extract_score(r) for r in acad_responses]) if acad_responses else None
    career_score = sum([extract_score(r) for r in career_responses]) if career_responses else None
    social_score = sum([extract_score(r) for r in social_responses]) if social_responses else None
    
    # Calculate risk level based on scores
    risk_level = get_risk_level(phq9_score, gad7_score, pss_score, acad_score, career_score, social_score)
    
    # Determine urgency level for backward compatibility
    urgency_level = 'normal'
    is_emergency = False
    if risk_level == 'RED':
        is_emergency = True
        urgency_level = 'emergency'
    elif risk_level == 'YELLOW':
        urgency_level = 'high'
    
    # Calculate appointment date
    appointment_date, estimated_days, appointment_time = calculate_appointment_date(is_emergency, urgency_level, risk_level)

    # Get minimum selectable date (use PHT for today reference)
    today = datetime.utcnow() + timedelta(hours=8)
    min_date = appointment_date - timedelta(days=1)
    
    return jsonify({
        'automatic_date': appointment_date.isoformat(),
        'automatic_date_formatted': appointment_date.strftime('%A, %B %d, %Y'),
        'risk_level': risk_level,
        'urgency_level': urgency_level,
        'is_emergency': is_emergency,
        'estimated_days': estimated_days,
        'appointment_time': appointment_time,
        'min_selectable_date': min_date.isoformat(),
        'min_selectable_date_formatted': min_date.strftime('%Y-%m-%d'),
        'scores': {
            'phq9': phq9_score,
            'gad7': gad7_score,
            'pss': pss_score,
            'acad': acad_score,
            'career': career_score,
            'social': social_score
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
            'student_name': f"{student.get('first_name','')} {student.get('last_name','')}".strip() or 'Unknown',
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
              new_values={'assigned_to': counselor_id, 'scheduled': f'{appointment_date} {appointment_time}'})
    
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

def get_risk_level(phq9_score=None, gad7_score=None, pss_score=None, acad_score=None, 
                   social_score=None, career_score=None):
    """
    Calculate risk level (RED/YELLOW/GREEN) based on assessment scores.
    
    Risk Thresholds:
    - RED (Critical): PHQ-9 > 20 OR GAD-7 > 15 OR PSS > 30
    - YELLOW (High): PHQ-9 > 15 OR GAD-7 > 12 OR PSS > 20 OR Acad > 24 OR Social > 24
    - GREEN (Low): Below YELLOW thresholds
    
    Returns: 'RED', 'YELLOW', or 'GREEN'
    """
    # RED = Critical risk
    if (phq9_score and phq9_score > 20) or \
       (gad7_score and gad7_score > 15) or \
       (pss_score and pss_score > 30):
        return 'RED'
    
    # YELLOW = High risk
    if (phq9_score and phq9_score > 15) or \
       (gad7_score and gad7_score > 12) or \
       (pss_score and pss_score > 20) or \
       (acad_score and acad_score > 24) or \
       (social_score and social_score > 24):
        return 'YELLOW'
    
    # GREEN = Low risk (default)
    return 'GREEN'


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
                            
                            # Get associated appointment
                            appointment = db.db.appointments.find_one({"case_id": case['_id']}) if case else None
                            appointment_id = str(appointment['_id']) if appointment else None
                            
                            dashboard_data['recent_cases'].append({
                                'counseling_id': intake.get('counseling_id'),
                                'appointment_id': appointment_id,
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
        
        elif user_role in ['COUNSELOR', 'PSYCHOLOGIST']:
            # Counselor sees only their assigned cases
            try:
                cases = list(db.db.cases.find({"assigned_counselor_id": ObjectId(user_id)}).limit(50))
                case_ids = [case['_id'] for case in cases]

                # Build lookup maps to avoid N+1 queries
                case_map = {str(c['_id']): c for c in cases}
                student_ids = [c['student_id'] for c in cases if c.get('student_id')]
                student_docs = list(db.db.users.find(
                    {"_id": {"$in": student_ids}},
                    {"first_name": 1, "last_name": 1, "email": 1}
                )) if student_ids else []
                student_map = {str(s['_id']): s for s in student_docs}

                # Also fetch the current user's name for alerts
                me = db.db.users.find_one({"_id": ObjectId(user_id)}, {"first_name": 1, "last_name": 1})
                counselor_name = f"{me.get('first_name', '')} {me.get('last_name', '')}".strip() if me else ''

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

                            # Resolve student name for this intake
                            case_doc = case_map.get(str(intake.get('case_id', '')))
                            student_doc = student_map.get(str(case_doc.get('student_id', ''))) if case_doc else None
                            if student_doc:
                                student_name = f"{student_doc.get('first_name', '')} {student_doc.get('last_name', '')}".strip() or student_doc.get('email', '')
                            else:
                                student_name = None
                            case_status = case_doc.get('status') if case_doc else None

                            if risk in ['RED', 'CRITICAL']:
                                dashboard_data['alerts'].append({
                                    'case_id': str(intake['case_id']),
                                    'counseling_id': intake.get('counseling_id'),
                                    'student_name': student_name,
                                    'counselor_name': counselor_name,
                                    'risk_level': risk,
                                    'type': 'high_risk_assessment'
                                })

                            submitted_at = intake.get('student_submitted_at')
                            dashboard_data['recent_cases'].append({
                                'case_id': str(intake['case_id']),
                                'counseling_id': intake.get('counseling_id'),
                                'student_name': student_name,
                                'status': case_status,
                                'submitted_at': submitted_at.isoformat() if submitted_at else None,
                                'risk_level': risk,
                                'is_emergency': intake.get('is_emergency')
                            })
                        except Exception as intake_err:
                            print(f"Error processing intake {intake.get('_id')}: {intake_err}")
                            continue
                else:
                    intakes = []

                # If no completed intakes, fall back to showing cases directly
                if not dashboard_data['recent_cases'] and cases:
                    for c in cases[:6]:
                        student_doc = student_map.get(str(c.get('student_id', '')))
                        if student_doc:
                            sname = f"{student_doc.get('first_name', '')} {student_doc.get('last_name', '')}".strip() or student_doc.get('email', '')
                        else:
                            sname = None
                        dashboard_data['recent_cases'].append({
                            'case_id': str(c['_id']),
                            'counseling_id': c.get('counseling_id'),
                            'student_name': sname,
                            'status': c.get('status'),
                            'risk_level': c.get('current_risk_level', 'GREEN'),
                            'is_emergency': False
                        })

                dashboard_data['summary'] = {
                    'assigned_cases': len(cases),
                    'high_risk_alerts': len(dashboard_data['alerts']),
                    'recent_assessments': len(intakes)
                }
            except Exception as counselor_err:
                print(f"Error loading counselor dashboard: {counselor_err}")
                dashboard_data['summary'] = {'error': str(counselor_err)}
        
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
                    'submitted_at': intake.get('student_submitted_at').isoformat() if intake.get('student_submitted_at') else None,
                    'assessments_taken': len([k for k in scores.keys() if k.endswith('_score')])
                })
            
            dashboard_data['summary'] = {
                'total_intakes': len(new_intakes),
                'emergency_count': len([c for c in dashboard_data['recent_cases'] if c['is_emergency']])
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
            'statistics': stats
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@intake_bp.route('/available-times-for-date', methods=['GET'])
@jwt_required()
def get_available_times_for_date():
    """
    Get available time slots for a specific date with counselor availability count.
    Checks both counselor_availability schedule and existing appointments.
    
    Query params:
    - date: Date in YYYY-MM-DD format (required)
    
    Returns list of available times with how many counselors are available.
    """
    try:
        date_str = request.args.get('date')
        if not date_str:
            return jsonify({'error': 'date parameter is required (format: YYYY-MM-DD)'}), 400
        
        try:
            # Parse the date string
            date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
        
        # Get available intake counselors
        counselors = get_available_intake_counselors()
        if not counselors:
            return jsonify({'error': 'No intake counselors available'}), 503
        
        counselor_ids = [c["_id"] for c in counselors]
        
        # Generate time slots for the day (9 AM to 5 PM, 30-min intervals)
        business_hours_start = 9
        business_hours_end = 17
        slot_duration_minutes = 30
        
        available_times = []
        
        # Create start and end times for the day
        day_start = date_obj.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = date_obj.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        # Start from business hours
        current_time = date_obj.replace(hour=business_hours_start, minute=0, second=0, microsecond=0)
        end_of_day = date_obj.replace(hour=business_hours_end, minute=0, second=0, microsecond=0)
        
        print(f"Checking availability for date: {date_str}")
        print(f"Business hours: {current_time} to {end_of_day}")
        
        while current_time < end_of_day:
            slot_end_time = current_time + timedelta(minutes=slot_duration_minutes)
            available_counselor_list = []
            available_counselor_details = []
            
            # Check each counselor
            for counselor_id in counselor_ids:
                # Check explicit unavailability (blocked slots) — if counselor marked themselves
                # unavailable at this time, skip. Otherwise default to available during business hours.
                blocked = db.db.counselor_availability.find_one({
                    "counselor_id": counselor_id,
                    "slot_start": {"$lte": current_time},
                    "slot_end": {"$gte": slot_end_time},
                    "is_available": False,
                })
                if blocked:
                    continue

                # Check if counselor already has an appointment at this time
                existing_appt = db.db.appointments.find_one({
                    "counselor_id": counselor_id,
                    "scheduled_start": current_time,
                    "status": {"$in": ["MATCHED", "CONFIRMED", "REQUESTED"]}
                })

                if not existing_appt:
                    counselor_obj = db.db.users.find_one({"_id": counselor_id})
                    counselor_name = f"{counselor_obj.get('first_name', '')} {counselor_obj.get('last_name', '')}" if counselor_obj else "Unknown"
                    available_counselor_list.append(str(counselor_id))
                    available_counselor_details.append({
                        'counselor_id': str(counselor_id),
                        'counselor_name': counselor_name
                    })
            
            # Add time slot if at least one counselor is available
            if available_counselor_list:
                count = len(available_counselor_list)
                available_times.append({
                    'time': current_time.strftime("%I:%M %p"),
                    'datetime': current_time.isoformat(),
                    'available_counselors': count,
                    'counselor_ids': available_counselor_list,
                    'counselor_details': available_counselor_details,
                    'counselor_availability_text': f"{count} intake counselor{'s' if count > 1 else ''} available"
                })
            
            current_time += timedelta(minutes=slot_duration_minutes)
        
        print(f"Found {len(available_times)} available time slots for {date_str}")
        
        return jsonify({
            'date': date_str,
            'available_times': available_times,
            'total_slots': len(available_times),
            'counselors_available': len(counselor_ids)
        }), 200
    
    except Exception as e:
        print(f"Error getting available times for date: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@intake_bp.route('/available-dates', methods=['GET'])
@jwt_required()
def get_available_dates():
    """
    Get list of dates that have at least one available appointment slot.
    This filters out dates with no availability so frontend doesn't show empty dates.
    
    Query params:
    - days: how many days to check from today (default: 30)
    
    Returns list of dates with available slots.
    """
    try:
        days_to_check = min(int(request.args.get('days', 30)), 90)  # Max 90 days
        
        # Get available intake counselors
        counselors = get_available_intake_counselors()
        if not counselors:
            return jsonify({
                'available_dates': [],
                'message': 'No intake counselors available'
            }), 200
        
        counselor_ids = [c["_id"] for c in counselors]
        
        available_dates = []
        current_date = (datetime.utcnow() + timedelta(hours=8)).replace(hour=0, minute=0, second=0, microsecond=0)
        business_hours_start = 9
        business_hours_end = 17
        
        # Check each day for available slots
        for day_offset in range(days_to_check):
            check_date = current_date + timedelta(days=day_offset)
            
            # Skip weekends (Monday=0, Sunday=6)
            if check_date.weekday() >= 5:  # Saturday and Sunday
                continue
            
            day_start = check_date.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = check_date.replace(hour=23, minute=59, second=59, microsecond=999999)
            
            has_available_slot = False
            slot_duration_minutes = 30
            current_time = check_date.replace(hour=business_hours_start, minute=0, second=0, microsecond=0)
            end_of_day = check_date.replace(hour=business_hours_end, minute=0, second=0, microsecond=0)
            
            # Check each time slot for this day
            while current_time < end_of_day and not has_available_slot:
                slot_end_time = current_time + timedelta(minutes=slot_duration_minutes)
                
                # Check if any counselor is available at this time
                for counselor_id in counselor_ids:
                    # Skip if counselor explicitly marked this slot unavailable
                    blocked = db.db.counselor_availability.find_one({
                        "counselor_id": counselor_id,
                        "slot_start": {"$lte": current_time},
                        "slot_end": {"$gte": slot_end_time},
                        "is_available": False,
                    })
                    if blocked:
                        continue

                    # Check if counselor already has an appointment at this time
                    existing_appt = db.db.appointments.find_one({
                        "counselor_id": counselor_id,
                        "scheduled_start": current_time,
                        "status": {"$in": ["MATCHED", "CONFIRMED", "REQUESTED"]}
                    })

                    if not existing_appt:
                        has_available_slot = True
                        break
                
                current_time += timedelta(minutes=slot_duration_minutes)
            
            # Add this date to available list if it has slots
            if has_available_slot:
                available_dates.append({
                    'date': check_date.strftime("%Y-%m-%d"),
                    'day_name': check_date.strftime("%A"),
                    'formatted': check_date.strftime("%B %d, %Y")
                })
        
        return jsonify({
            'available_dates': available_dates,
            'total_available_dates': len(available_dates)
        }), 200
    
    except Exception as e:
        print(f"Error getting available dates: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@intake_bp.route('/available-slots', methods=['GET'])
@jwt_required()
def get_available_appointment_slots():
    """
    Get available appointment slots based on risk level.
    
    Query params:
    - risk_level: 'RED', 'YELLOW', or 'GREEN' (default: GREEN)
    - count: number of slots to return (default: 5)
    
    Returns list of available appointment times with counselor availability info.
    - RED: Limited selection (no user choice) - auto-assigned to first available
    - YELLOW: Medium selection (user picks from available slots)
    - GREEN: Full selection (user can choose any time from tomorrow onwards)
    """
    try:
        risk_level = request.args.get('risk_level', 'GREEN')
        count = min(int(request.args.get('count', 5)), 10)  # Max 10 slots
        
        # Get available slots based on risk level
        slots = get_available_slots_for_risk(risk_level, num_days=7)
        
        # Limit to requested count
        slots = slots[:count]
        
        # Get statistics
        counselors = get_available_intake_counselors()
        stats = _get_priority_queue_stats()
        
        # Determine user selectability based on risk level
        is_user_choice = risk_level != 'RED'
        choice_message = {
            'RED': '❌ Auto-assigned to first available (urgent)',
            'YELLOW': '✓ Choose from available slots (high priority)',
            'GREEN': '✓ Full choice - select your preferred time'
        }.get(risk_level, '')
        
        return jsonify({
            'available_slots': slots,
            'total_slots_available': len(slots),
            'risk_level': risk_level,
            'is_user_choice': is_user_choice,
            'choice_message': choice_message,
            'counselors_available': len(counselors),
            'counselor_names': [f"{c.get('first_name', '')} {c.get('last_name', '')}" for c in counselors[:3]],
            'priority_queues': stats
        }), 200
    
    except Exception as e:
        print(f"Error getting available slots: {str(e)}")
        return jsonify({'error': str(e)}), 500


@intake_bp.route('/select-appointment-time', methods=['POST'])
@jwt_required()
def select_appointment_time():
    """
    User selects a specific appointment time for their intake.
    Only available for YELLOW (medium risk) and GREEN (low risk).
    RED (high risk) appointments are auto-assigned.
    
    Request body:
    {
        "appointment_datetime": "2026-03-21T10:00:00",
        "risk_level": "GREEN" or "YELLOW"
    }
    """
    user_id = get_jwt_identity()
    
    try:
        data = request.get_json()
        appointment_datetime_str = data.get('appointment_datetime')
        risk_level = data.get('risk_level', 'GREEN')
        
        if not appointment_datetime_str:
            return jsonify({'error': 'appointment_datetime is required'}), 400
        
        # RED risk users cannot choose - must be auto-assigned
        if risk_level == 'RED':
            return jsonify({'error': 'High-risk intakes are auto-assigned. No user selection allowed.'}), 403
        
        # Parse the appointment datetime
        appointment_dt = datetime.fromisoformat(appointment_datetime_str.replace('Z', '+00:00'))
        
        # Validate the appointment time
        # GREEN: Must be tomorrow or later
        # YELLOW: Must be today or tomorrow
        now = datetime.utcnow()
        min_hours_ahead = 24 if risk_level == 'GREEN' else 0
        hours_ahead = (appointment_dt - now).total_seconds() / 3600
        
        if hours_ahead < min_hours_ahead:
            min_label = 'tomorrow' if risk_level == 'GREEN' else 'today'
            return jsonify({'error': f'For {risk_level} risk, appointment must be {min_label} or later'}), 400
        
        # Check if appointment is during business hours
        if appointment_dt.hour < 9 or appointment_dt.hour >= 17:
            return jsonify({'error': 'Appointment must be during business hours (9 AM - 5 PM)'}), 400
        
        # Check if slot is actually available
        counselors = get_available_intake_counselors()
        counselor_ids = [c["_id"] for c in counselors]
        
        if not counselor_ids:
            return jsonify({'error': 'No intake counselors available for this time'}), 503
        
        existing_appts = db.db.appointments.count_documents({
            "counselor_id": {"$in": counselor_ids},
            "scheduled_start": appointment_dt,
            "status": {"$in": ["MATCHED", "CONFIRMED", "REQUESTED"]}
        })
        
        if existing_appts > 0:
            return jsonify({'error': 'This time slot is no longer available. Please select another.'}), 409
        
        # Store selected appointment time in user session or return for next step
        return jsonify({
            'success': True,
            'selected_appointment': {
                'datetime': appointment_dt.isoformat(),
                'date': appointment_dt.strftime("%Y-%m-%d"),
                'time': appointment_dt.strftime("%I:%M %p"),
                'risk_level': risk_level,
                'counselors_available': len(counselor_ids)
            },
            'message': f'Appointment scheduled for {appointment_dt.strftime("%B %d at %I:%M %p")}'
        }), 200
    
    except ValueError as e:
        return jsonify({'error': f'Invalid datetime format: {str(e)}'}), 400
    except Exception as e:
        print(f"Error selecting appointment time: {str(e)}")
        return jsonify({'error': str(e)}), 500


def _get_priority_queue_stats():
    """
    Get current queue statistics by priority level.
    Shows how many intakes are waiting at each priority level.
    """
    try:
        stats = {
            'urgent_red': db.db.intakes.count_documents({
                'status': IntakeStatus.COMPLETED.value,
                'responses.risk_level': 'RED',
                'assigned_counselor_id': None
            }),
            'high_priority_yellow': db.db.intakes.count_documents({
                'status': IntakeStatus.COMPLETED.value,
                'responses.risk_level': 'YELLOW',
                'assigned_counselor_id': None
            }),
            'standard_green': db.db.intakes.count_documents({
                'status': IntakeStatus.COMPLETED.value,
                'responses.risk_level': 'GREEN',
                'assigned_counselor_id': None
            })
        }
        return stats
    except:
        return {}


@intake_bp.route('/priority-queue', methods=['GET'])
@jwt_required()
def get_priority_queue():
    """
    Get the current priority queue of intakes waiting for scheduling.
    Shows intakes ordered by:
    1. Risk level (RED > YELLOW > GREEN)
    2. Submission time (older = higher priority within same risk level)
    
    Returns: List of intakes in priority order with scheduling info
    """
    user_id = get_jwt_identity()
    user = db.db.users.find_one({"_id": ObjectId(user_id)})
    
    # Only admin, DPO, IC staff can view priority queue
    if not user or user.get('role') not in ['ADMIN', 'DPO', 'IC', 'CASE_MANAGER']:
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        # Get unassigned intakes ordered by priority
        priority_order = {'RED': 1, 'YELLOW': 2, 'GREEN': 3}
        
        pipeline = [
            {
                '$match': {
                    'status': IntakeStatus.COMPLETED.value,
                    'assigned_counselor_id': None
                }
            },
            {
                '$addFields': {
                    'priority_score': {
                        '$cond': [
                            {'$eq': ['$responses.risk_level', 'RED']}, 1,
                            {'$cond': [
                                {'$eq': ['$responses.risk_level', 'YELLOW']}, 2, 3
                            ]}
                        ]
                    }
                }
            },
            {
                '$sort': {'priority_score': 1, 'student_submitted_at': 1}
            },
            {'$limit': 50}
        ]
        
        queue_intakes = list(db.db.intakes.aggregate(pipeline))
        
        result = []
        for intake in queue_intakes:
            scores = intake.get('responses', {})
            risk_level = scores.get('risk_level', 'GREEN')
            
            # Calculate wait time
            submitted = intake.get('student_submitted_at')
            if submitted:
                wait_minutes = int((datetime.utcnow() - submitted).total_seconds() / 60)
            else:
                wait_minutes = 0
            
            result.append({
                'intake_id': str(intake['_id']),
                'case_id': str(intake.get('case_id', '')),
                'counseling_id': intake.get('counseling_id'),
                'risk_level': risk_level,
                'urgency_icon': '🚨' if risk_level == 'RED' else ('⚠️' if risk_level == 'YELLOW' else '📋'),
                'student_name': intake.get('responses', {}).get('student_name', 'Unknown'),
                'concern': scores.get('purpose', 'Unknown'),
                'phq9_score': scores.get('phq9_score'),
                'gad7_score': scores.get('gad7_score'),
                'is_emergency': intake.get('is_emergency', False),
                'submitted_at': submitted.isoformat() if submitted else None,
                'wait_time_minutes': wait_minutes,
                'wait_time_formatted': f"{wait_minutes} mins" if wait_minutes < 60 else f"{wait_minutes // 60}h {wait_minutes % 60}m",
                'queue_position': len(result) + 1
            })
        
        # Get statistics
        stats = _get_priority_queue_stats()
        
        return jsonify({
            'priority_queue': result,
            'total_in_queue': len(result),
            'queue_statistics': stats,
            'available_counselors': len(get_available_intake_counselors()),
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    
    except Exception as e:
        print(f"Error getting priority queue: {str(e)}")
        return jsonify({'error': str(e)}), 500


@intake_bp.route('/walkin', methods=['POST'])
@jwt_required()
def create_walkin_intake():
    """
    Create a walk-in intake record for a student visiting the office.
    Staff submits student info and the system creates an intake record.
    
    Request body:
    {
        "first_name": str,
        "last_name": str,
        "email": str,
        "student_id": str (optional),
        "phone": str (optional),
        "concern": str (academic, mental_health, personal, relationship, career, crisis, other),
        "is_urgent": bool,
        "notes": str (optional)
    }
    """
    user_id = get_jwt_identity()
    user = db.db.users.find_one({"_id": ObjectId(user_id)})
    
    # Verify user has permission (STAFF/office assistant can create walk-ins)
    if not user or user.get('role') not in ['ADMIN', 'STAFF', 'IC']:
        return jsonify({'error': 'Insufficient permissions to create walk-in intake'}), 403
    
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['first_name', 'last_name', 'email']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Email validation
        if '@' not in data.get('email', ''):
            return jsonify({'error': 'Invalid email address'}), 400
        
        # Generate IDs
        counseling_id = generate_counseling_id()
        
        # Determine risk level and appointment date based on urgency
        is_urgent = data.get('is_urgent', False)
        risk_level = 'RED' if is_urgent else 'GREEN'
        urgency_level = 'emergency' if is_urgent else 'normal'

        # OA-assigned counselor/IC and optional time slot (walk-in manual assignment)
        assigned_ic_id = None
        assigned_ic_obj = None
        if data.get('counselor_id'):
            try:
                assigned_ic_id = ObjectId(data['counselor_id'])
                assigned_ic_obj = db.db.users.find_one({'_id': assigned_ic_id})
            except Exception:
                pass
        if data.get('counselor_id') and data.get('scheduled_time'):
            try:
                h, m = map(int, data['scheduled_time'].split(':'))
                appointment_date = datetime.utcnow().replace(hour=h, minute=m, second=0, microsecond=0)
                days_string = 'today'
                appointment_time = data['scheduled_time']
            except Exception:
                appointment_date, days_string, appointment_time = calculate_appointment_date(is_urgent, urgency_level, risk_level)
        else:
            appointment_date, days_string, appointment_time = calculate_appointment_date(is_urgent, urgency_level, risk_level)
        
        # CHECK: If a student_id is provided, verify they don't already have an active appointment
        if data.get('student_id'):
            try:
                student_id_obj = ObjectId(data['student_id']) if isinstance(data['student_id'], str) else data['student_id']
                existing_active = db.db.appointments.find_one({
                    "student_id": student_id_obj,
                    "status": {"$in": ["REQUESTED", "PENDING_APPROVAL", "APPROVED", "MATCHED", "CONFIRMED"]},
                    "$or": [
                        {"requested_start": {"$exists": False}},
                        {"requested_start": {"$gt": datetime.utcnow()}}
                    ]
                })
                
                if existing_active:
                    appointment_time_str = "Unknown"
                    if existing_active.get('requested_start'):
                        appointment_time_str = existing_active['requested_start'].strftime('%B %d, %Y at %I:%M %p').lstrip('0').replace(' 0', ' ')
                    
                    return jsonify({
                        'error': 'Student already has an active appointment.',
                        'message': f'This student cannot have multiple active appointments. Current appointment: {appointment_time_str}',
                        'existing_appointment_id': str(existing_active['_id']),
                        'status': 409
                    }), 409
            except Exception as id_error:
                print(f"Warning: Could not validate student_id for walk-in: {str(id_error)}")
                # Continue anyway - walk-in might be for non-enrolled student
        
        # Reuse existing open case for this student — prevents duplicate case records
        walkin_student_id = data.get('student_id', '')
        existing_walkin_case = None
        if walkin_student_id:
            try:
                _wid = ObjectId(walkin_student_id) if isinstance(walkin_student_id, str) else walkin_student_id
                existing_walkin_case = db.db.cases.find_one({
                    'student_id': _wid,
                    'case_status': {'$nin': ['CLOSED', 'CANCELLED']},
                })
            except Exception:
                pass

        if existing_walkin_case:
            case_id = existing_walkin_case['_id']
            db.db.cases.update_one({'_id': case_id}, {'$set': {'updated_at': datetime.utcnow()}})
        else:
            case_id = ObjectId()
            case_data = {
                '_id': case_id,
                'counseling_id': counseling_id,
                'student_id': walkin_student_id,
                'student_email': data.get('email'),
                'student_name': f"{data.get('first_name')} {data.get('last_name')}",
                'phone': data.get('phone', ''),
                'case_status': 'ACTIVE',
                'status': 'ACTIVE',
                'risk_level': risk_level,
                'created_at': datetime.utcnow(),
                'created_by': user_id,
                'intake_source': 'WALKIN',
                'notes': data.get('notes', ''),
            }
            db.db.cases.insert_one(case_data)
        
        # Create intake record
        concern = data.get('concern', 'other')
        
        intake_data = {
            '_id': ObjectId(),
            'case_id': case_id,
            'counseling_id': counseling_id,
            'status': IntakeStatus.PENDING,
            'student_name': f"{data.get('first_name')} {data.get('last_name')}",
            'student_email': data.get('email'),
            'student_id': data.get('student_id', ''),
            'phone': data.get('phone', ''),
            'is_emergency': is_urgent,
            'risk_level': risk_level,
            'urgency_level': urgency_level,
            'is_walkin': True,
            'walkin_notes': data.get('notes', ''),
            'created_at': datetime.utcnow(),
            'created_by': user_id,
            'created_by_role': user.get('role'),
            'responses': {
                'purpose': concern,
                'concern_details': f"Walk-in: {data.get('notes', '')}",
            },
            'appointment_date': appointment_date,
            'appointment_time': appointment_time,
            'estimated_appointment_days': days_string,
        }
        result = db.db.intakes.insert_one(intake_data)
        
        # Create initial appointment record
        purpose = data.get('purpose', 'intake_interview')
        _type_map = {
            'intake_interview': 'INTAKE',
            'counseling':       'COUNSELING',
            'follow_up':        'FOLLOW_UP',
            'others':           'OTHER',
        }
        appointment_data = {
            '_id': ObjectId(),
            'counseling_id': counseling_id,
            'case_id': case_id,
            'student_name': f"{data.get('first_name')} {data.get('last_name')}",
            'student_email': data.get('email'),
            'status': AppointmentStatus.CONFIRMED if assigned_ic_id else AppointmentStatus.REQUESTED,
            'appointment_type': _type_map.get(purpose, 'INTAKE'),
            'purpose': purpose,
            'scheduled_date': appointment_date,
            'scheduled_start': appointment_date,
            'appointment_time': appointment_time,
            'risk_level': risk_level,
            'is_walkin': True,
            'created_at': datetime.utcnow(),
            'created_by': 'WALKIN_SYSTEM',
        }
        if assigned_ic_id:
            appointment_data['counselor_id'] = assigned_ic_id
            appointment_data['method'] = data.get('scheduled_method', 'in-person')
            if assigned_ic_obj:
                appointment_data['counselor_name'] = f"{assigned_ic_obj.get('first_name','')} {assigned_ic_obj.get('last_name','')}".strip()
        db.db.appointments.insert_one(appointment_data)

        # Also record IC assignment on intake and case
        if assigned_ic_id:
            db.db.intakes.update_one({'_id': result.inserted_id}, {'$set': {'counselor_id': assigned_ic_id, 'status': 'ASSIGNED'}})
            db.db.cases.update_one({'_id': case_id}, {'$set': {'counselor_id': assigned_ic_id}})
        
        # Audit log
        audit_log(db.db, 'intake', 'CREATE_WALKIN_INTAKE', entity_id=str(result.inserted_id),
                  new_values={'student': f"{data.get('first_name')} {data.get('last_name')}", 'email': data.get('email'), 'is_urgent': is_urgent})
        
        return jsonify({
            'success': True,
            'intake_id': str(result.inserted_id),
            'appointment_id': str(appointment_data['_id']),
            'case_id': str(case_id),
            'counseling_id': counseling_id,
            'message': f'Walk-in intake created. Estimated appointment in {days_string}.',
            'appointment_date': appointment_date.isoformat(),
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Error creating walk-in intake: {str(e)}")
        return jsonify({'error': str(e)}), 500


@intake_bp.route('/self-checkin', methods=['POST'])
def student_self_checkin():
    """
    Public endpoint — no auth required.
    Student fills ICF + SPIF-IF + PHQ-4 on their own device (walk-in self-service).
    Creates case + intake + appointment (REQUESTED) + intake_packet.
    Returns reference number (counseling_id) for the student to show at the desk.
    """
    data = request.get_json() or {}

    # ── Validate required fields ──────────────────────────────────────────────
    required = ['first_name', 'last_name', 'email']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'Missing required field: {field}'}), 400

    email = data.get('email', '').strip().lower()
    if '@' not in email:
        return jsonify({'error': 'Invalid email address'}), 400
    if not email.endswith('@dlsu.edu.ph'):
        return jsonify({'error': 'Only DLSU email addresses (@dlsu.edu.ph) are accepted for walk-in check-in'}), 400

    # Prevent duplicate same-day check-ins for the same email
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    existing_today = db.db.appointments.find_one({
        'student_email': email,
        'intake_source': 'SELF_CHECKIN',
        'created_at': {'$gte': today_start},
    })
    if existing_today:
        return jsonify({'error': 'You already have a check-in submitted today. Please approach the CPS desk directly.'}), 409

    icf  = data.get('icf', {})
    spif = data.get('spif', {})
    phq4 = data.get('phq4_responses', [])

    if phq4 and len(phq4) != 4:
        return jsonify({'error': 'phq4_responses must have exactly 4 items'}), 400
    for val in phq4:
        if not isinstance(val, int) or val < 0 or val > 3:
            return jsonify({'error': 'Each PHQ-4 response must be an integer 0-3'}), 400

    try:
        counseling_id = generate_counseling_id()
        now = datetime.utcnow()

        # BR-9: derive initial risk level from PHQ-4 total score
        phq4_total = sum(phq4) if phq4 else None
        if phq4_total is None:
            initial_risk = 'GREEN'
        elif phq4_total >= 9:
            initial_risk = 'RED'
        elif phq4_total >= 3:
            initial_risk = 'YELLOW'
        else:
            initial_risk = 'GREEN'

        # ── Case ──────────────────────────────────────────────────────────────
        case_id = ObjectId()
        db.db.cases.insert_one({
            '_id': case_id,
            'counseling_id': counseling_id,
            'student_email': data['email'],
            'student_name': f"{data['first_name']} {data['last_name']}",
            'phone': data.get('phone', ''),
            'case_status': 'ACTIVE',
            'status': 'ACTIVE',
            'risk_level': initial_risk,
            'intake_source': 'SELF_CHECKIN',
            'created_at': now,
        })

        # ── Appointment (REQUESTED — shows up in OA/IC dashboard) ─────────────
        apt_id = ObjectId()
        db.db.appointments.insert_one({
            '_id': apt_id,
            'counseling_id': counseling_id,
            'case_id': case_id,
            'student_name': f"{data['first_name']} {data['last_name']}",
            'student_email': data['email'],
            'status': AppointmentStatus.REQUESTED.value,
            'appointment_type': 'INITIAL_CONSULTATION',
            'is_walkin': True,
            'intake_source': 'SELF_CHECKIN',
            'intake_packet_submitted': True,
            'created_at': now,
            'created_by': 'SELF_CHECKIN',
        })

        # ── Intake record ─────────────────────────────────────────────────────
        db.db.intakes.insert_one({
            '_id': ObjectId(),
            'case_id': case_id,
            'appointment_id': apt_id,
            'counseling_id': counseling_id,
            'status': IntakeStatus.PENDING,
            'student_name': f"{data['first_name']} {data['last_name']}",
            'student_email': data['email'],
            'phone': data.get('phone', ''),
            'is_walkin': True,
            'intake_source': 'SELF_CHECKIN',
            'responses': {'purpose': icf.get('service_requested', 'counseling')},
            'created_at': now,
        })

        # ── PHQ-4 scoring ─────────────────────────────────────────────────────
        phq2_score = sum(phq4[:2]) if phq4 else None
        gad2_score = sum(phq4[2:]) if phq4 else None
        total_phq4 = sum(phq4) if phq4 else None

        # ── Intake packet (ICF + SPIF + PHQ-4) ───────────────────────────────
        db.db.intake_packets.insert_one({
            '_id': ObjectId(),
            'source': 'walkin',
            'submitted_by_role': 'student',
            'appointment_id': apt_id,
            'counseling_id': counseling_id,
            'icf': icf,
            'spif': spif,
            'phq4_responses': phq4,
            'consent_audit': {
                'consent_to_service': icf.get('consent_to_service', False),
                'consent_to_data': icf.get('consent_to_data', False),
                'consent_timestamp': now.isoformat(),
                'consent_version': '2025-AY',
                'submitted_by': 'student_self',
            },
            'phq4': {
                'phq2_score': phq2_score,
                'gad2_score': gad2_score,
                'total_score': total_phq4,
                'depression_risk': phq2_score is not None and phq2_score >= 3,
                'anxiety_risk':    gad2_score  is not None and gad2_score  >= 3,
            } if phq4 else None,
            'created_at': now,
            'updated_at': now,
        })

        # Update appointment with packet link
        db.db.appointments.update_one(
            {'_id': apt_id},
            {'$set': {'intake_packet_submitted': True}}
        )

        return jsonify({
            'success': True,
            'counseling_id': counseling_id,
            'appointment_id': str(apt_id),
            'case_id': str(case_id),
            'message': 'Check-in submitted. Please show your reference number at the desk.',
        }), 201

    except Exception as e:
        current_app.logger.error(f'Error in self-checkin: {str(e)}')
        return jsonify({'error': str(e)}), 500


@intake_bp.route('/draft/save', methods=['POST'])
@jwt_required()
def save_intake_draft():
    """Save intake form as draft for later completion"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    try:
        user_obj_id = ObjectId(user_id) if isinstance(user_id, str) else user_id
    except:
        user_obj_id = user_id
    
    # Check if draft already exists for this user
    existing_draft = db.db.intake_drafts.find_one({"student_id": user_obj_id})
    
    draft_doc = {
        "student_id": user_obj_id,
        "current_step": data.get('current_step', 'personal_info'),
        "form_data": {
            "personalInfo": data.get('personalInfo', {}),
            "concern": data.get('concern', ''),
            "selectedAssessments": data.get('selectedAssessments', []),
            "assessmentResponses": data.get('assessmentResponses', {}),
            "assessmentScores": data.get('assessmentScores', {}),
            "isUrgent": data.get('isUrgent'),
            "urgencyNotes": data.get('urgencyNotes', ''),
            "consentGiven": data.get('consentGiven', False),
            "appointmentDate": data.get('appointmentDate', ''),
            "appointmentTime": data.get('appointmentTime', ''),
            "communicationMethod": data.get('communicationMethod', 'in_person'),
            "automaticAppointmentInfo": data.get('automaticAppointmentInfo', {}),
        },
        "updated_at": datetime.utcnow(),
        "created_at": datetime.utcnow() if not existing_draft else existing_draft.get('created_at', datetime.utcnow())
    }
    
    if existing_draft:
        result = db.db.intake_drafts.update_one(
            {"_id": existing_draft['_id']},
            {"$set": draft_doc}
        )
        return jsonify({
            'message': 'Draft saved successfully',
            'draft_id': str(existing_draft['_id']),
            'current_step': draft_doc['current_step'],
            'last_saved': draft_doc['updated_at'].isoformat()
        }), 200
    else:
        draft_doc['_id'] = ObjectId()
        result = db.db.intake_drafts.insert_one(draft_doc)
        return jsonify({
            'message': 'Draft created successfully',
            'draft_id': str(result.inserted_id),
            'current_step': draft_doc['current_step'],
            'created_at': draft_doc['created_at'].isoformat()
        }), 201


@intake_bp.route('/draft/load', methods=['GET'])
@jwt_required()
def load_intake_draft():
    """Load saved intake draft for resume"""
    user_id = get_jwt_identity()
    
    try:
        user_obj_id = ObjectId(user_id) if isinstance(user_id, str) else user_id
    except:
        user_obj_id = user_id
    
    draft = db.db.intake_drafts.find_one({"student_id": user_obj_id})
    
    if not draft:
        return jsonify({'message': 'No draft found', 'has_draft': False}), 200
    
    draft['_id'] = str(draft['_id'])
    draft['created_at'] = draft['created_at'].isoformat()
    draft['updated_at'] = draft['updated_at'].isoformat()
    
    return jsonify({
        'has_draft': True,
        'draft': draft,
        'message': 'Draft loaded successfully'
    }), 200


@intake_bp.route('/draft/<draft_id>', methods=['DELETE'])
@jwt_required()
def delete_intake_draft(draft_id):
    """Delete a saved intake draft"""
    user_id = get_jwt_identity()
    
    try:
        user_obj_id = ObjectId(user_id) if isinstance(user_id, str) else user_id
        draft_obj_id = ObjectId(draft_id)
    except:
        return jsonify({'error': 'Invalid draft ID'}), 400
    
    # Verify ownership
    draft = db.db.intake_drafts.find_one({"_id": draft_obj_id, "student_id": user_obj_id})
    
    if not draft:
        return jsonify({'error': 'Draft not found or not owned by user'}), 404
    
    result = db.db.intake_drafts.delete_one({"_id": draft_obj_id})
    
    return jsonify({
        'message': 'Draft deleted successfully',
        'deleted': result.deleted_count > 0
    }), 200


@intake_bp.route('/my-status', methods=['GET'])
@jwt_required()
def get_my_intake_status():
    """Return intake/appointment status for the current student to drive smart routing."""
    user_id = get_jwt_identity()

    try:
        user_obj_id = ObjectId(user_id) if isinstance(user_id, str) else user_id
    except Exception:
        user_obj_id = user_id

    active_appointment = db.db.appointments.find_one({
        "student_id": user_obj_id,
        "status": {"$in": ["REQUESTED", "PENDING", "PENDING_APPROVAL", "APPROVED", "MATCHED", "CONFIRMED"]},
    })

    pending_intake = db.db.intakes.find_one({
        "student_id": user_obj_id,
        "status": {"$in": ["PENDING", "IN_PROGRESS"]},
    })

    completed_intake = db.db.intakes.find_one({
        "student_id": user_obj_id,
        "status": {"$in": ["COMPLETED", "ENDORSED"]},
    })

    # Walk-in students have appointments created by staff with no digital intake.
    # A completed appointment means they've been seen before and can book directly.
    completed_appointment = db.db.appointments.find_one({
        "student_id": user_obj_id,
        "status": {"$in": ["COMPLETED"]},
    })

    draft = db.db.intake_drafts.find_one({"student_id": user_obj_id})

    has_been_seen = completed_intake is not None or completed_appointment is not None

    appt_info = None
    if active_appointment:
        appt_info = {
            "id": str(active_appointment["_id"]),
            "status": active_appointment.get("status"),
            "scheduled_at": active_appointment["requested_start"].isoformat() if active_appointment.get("requested_start") else None,
        }

    return jsonify({
        "has_active_appointment": active_appointment is not None,
        "appointment": appt_info,
        "has_pending_intake": pending_intake is not None,
        "pending_intake_status": pending_intake.get("status") if pending_intake else None,
        "has_completed_intake": has_been_seen,
        "has_draft": draft is not None,
        "draft_id": str(draft["_id"]) if draft else None,
    }), 200


@intake_bp.route('/list', methods=['GET'])
@jwt_required()
def list_intakes():
    """IC/Staff: List intake-interview appointments awaiting IC session"""
    from datetime import timedelta
    user_id = get_jwt_identity()
    user = db.db.users.find_one({'_id': ObjectId(user_id)}) if user_id else None
    allowed_roles = {'IC', 'STAFF', 'ADMIN', 'DPO', 'PSYCHOLOGIST', 'COUNSELOR'}
    if not user or user.get('role') not in allowed_roles:
        return jsonify({'error': 'Unauthorized'}), 403

    status_param = request.args.get('status', 'pending').upper()
    OVERDUE_DAYS = 3
    now = datetime.utcnow()

    # Build appointment query — appointments of intake type that haven't been conducted yet
    base_appt_types = ['intake_interview', 'initial', 'triage_interview', 'initial_interview']

    active_statuses = ['REQUESTED', 'CONFIRMED', 'PENDING', 'IN_PROGRESS', 'SCHEDULED']

    if status_param == 'COMPLETED':
        appt_statuses = ['COMPLETED', 'DONE']
        deadline_filter = {}
    elif status_param == 'OVERDUE':
        appt_statuses = active_statuses
        deadline_filter = {'created_at': {'$lte': now - timedelta(days=OVERDUE_DAYS)}}
    elif status_param == 'IN_PROGRESS':
        appt_statuses = active_statuses
        deadline_filter = {'created_at': {'$gt': now - timedelta(days=OVERDUE_DAYS)}}
    else:
        appt_statuses = active_statuses
        deadline_filter = {}

    user_role = user.get('role', '')
    appt_query = {
        '$or': [
            {'purpose': {'$in': base_appt_types}},
            {'appointment_type': {'$in': base_appt_types}},
        ],
        'status': {'$in': appt_statuses},
        **deadline_filter,
    }

    # IC only sees their own assigned intakes — unassigned queue belongs to OA
    if user_role == 'IC':
        appt_query['counselor_id'] = ObjectId(user_id)

    appointments = list(db.db.appointments.find(appt_query).sort('created_at', -1).limit(200))
    result = []
    for appt in appointments:
        student_id = appt.get('student_id')
        student = None
        if student_id:
            try:
                student = db.db.users.find_one({'_id': ObjectId(str(student_id))})
            except Exception:
                pass
        student_name = f"{student.get('first_name', '')} {student.get('last_name', '')}".strip() if student else 'Unknown'

        # Check if student pre-submitted an intake packet
        packet = db.db.intake_packets.find_one({'appointment_id': appt['_id']})

        created_at = appt.get('created_at', now)
        deadline = created_at + timedelta(days=OVERDUE_DAYS)

        # Grab concern from appointment directly, or from the packet ICF if available
        concern = appt.get('concern', '')
        if not concern and packet:
            concern = (packet.get('icf') or {}).get('presenting_concern', '')

        result.append({
            '_id': str(appt['_id']),
            'student_id': str(student_id) if student_id else '',
            'student_name': student_name,
            'student_email': student.get('email', '') if student else '',
            'status': appt.get('status', ''),
            'verification_status': appt.get('verification_status', 'pending'),
            'appointment_type': appt.get('appointment_type', ''),
            'scheduled_start': appt.get('scheduled_start', ''),
            'concern': concern,
            'risk_level': appt.get('risk_level', 'GREEN'),
            'is_emergency': appt.get('is_emergency', False),
            'intake_packet_submitted': bool(packet),
            'created_at': created_at.isoformat() if hasattr(created_at, 'isoformat') else str(created_at),
            'deadline': deadline.isoformat() if hasattr(deadline, 'isoformat') else str(deadline),
        })

    return jsonify({'intakes': result, 'total': len(result), 'status_filter': status_param}), 200


# ============================================================================
# INTAKE PACKET  (ICF + SPIF-IF + PHQ-4)
# Submitted by student (online) or OA (walk-in) before IC triage
# Collection: intake_packets
# ============================================================================

PHQ4_QUESTIONS = [
    'Little interest or pleasure in doing things',
    'Feeling down, depressed, or hopeless',
    'Feeling nervous, anxious, or on edge',
    'Not being able to stop or control worrying',
]

@intake_bp.route('/packet', methods=['POST'])
@jwt_required()
def submit_intake_packet():
    """Submit ICF + SPIF-IF + PHQ-4 packet.

    Authenticated. A student may only submit against their own appointment; staff
    (OA/IC/ADMIN/COUNSELOR/PSYCHOLOGIST) may submit on behalf of others, including
    walk-ins with no appointment.
    Body:
      source            – 'online' | 'walkin'
      submitted_by_role – 'student' | 'oa'
      appointment_id    – optional, links to an existing appointment
      icf               – ICF fields dict
      spif              – SPIF-IF fields dict
      phq4_responses    – list of 4 ints (0-3)
    """
    data = request.get_json() or {}

    # Authorization: verify the submitter may write this packet.
    current_user_id = get_jwt_identity()
    try:
        current_uid = ObjectId(current_user_id) if isinstance(current_user_id, str) else current_user_id
    except Exception:
        current_uid = current_user_id
    current_user = db.db.users.find_one({'_id': current_uid}) or {}
    current_role = current_user.get('role', '')
    staff_roles = {'STAFF', 'IC', 'ADMIN', 'COUNSELOR', 'PSYCHOLOGIST', 'DPO'}
    is_staff = current_role in staff_roles

    source = data.get('source', 'online')
    appointment_id = data.get('appointment_id')

    # A student may only submit against their own appointment.
    if not is_staff:
        if not appointment_id:
            return jsonify({'error': 'An appointment is required to submit your intake packet.'}), 400
        try:
            owner_apt = db.db.appointments.find_one({'_id': ObjectId(appointment_id)})
        except Exception:
            owner_apt = None
        if not owner_apt:
            return jsonify({'error': 'Appointment not found.'}), 404
        if str(owner_apt.get('student_id')) != str(current_uid):
            return jsonify({'error': 'You can only submit your own intake packet.'}), 403
    icf  = data.get('icf', {})
    spif = data.get('spif', {})
    phq4 = data.get('phq4_responses', [])
    signature = data.get('signature')  # base64 PNG data URL

    # Validate PHQ-4
    if phq4 and len(phq4) != 4:
        return jsonify({'error': 'phq4_responses must have exactly 4 items (0-3 each)'}), 400
    for val in phq4:
        if not isinstance(val, int) or val < 0 or val > 3:
            return jsonify({'error': 'Each PHQ-4 response must be an integer 0-3'}), 400

    phq2_score = sum(phq4[:2]) if phq4 else None
    gad2_score = sum(phq4[2:]) if phq4 else None
    total_phq4 = sum(phq4) if phq4 else None

    # Resolve appointment ObjectId
    apt_obj_id = None
    if appointment_id:
        try:
            apt_obj_id = ObjectId(appointment_id)
        except Exception:
            pass

    # Upsert — one packet per appointment (or per email for walk-ins without appointment)
    match_key = {'appointment_id': apt_obj_id} if apt_obj_id else {'icf.email': icf.get('email', ''), 'source': 'walkin'}

    packet = {
        'source': source,
        'submitted_by_role': data.get('submitted_by_role', 'student'),
        'appointment_id': apt_obj_id,
        'icf': icf,
        'spif': spif,
        'phq4_responses': phq4,
        'signature': signature,
        'signed_at': datetime.utcnow().isoformat() if signature else None,
        'signature_covers': ['accuracy', 'data_privacy_consent', 'counseling_consent'] if signature else [],
        # Consent audit trail (RA 10173 compliance)
        'consent_audit': {
            'consent_to_service': icf.get('consent_to_service', False),
            'consent_to_data': icf.get('consent_to_data', False),
            'consent_timestamp': datetime.utcnow().isoformat(),
            'consent_version': '2025-AY',
            'submitted_by': source,
        },
        'phq4': {
            'phq2_score': phq2_score,
            'gad2_score': gad2_score,
            'total_score': total_phq4,
            'depression_risk': phq2_score is not None and phq2_score >= 3,
            'anxiety_risk':    gad2_score  is not None and gad2_score  >= 3,
        } if phq4 else None,
        'updated_at': datetime.utcnow(),
    }

    existing = db.db.intake_packets.find_one(match_key)
    if existing:
        db.db.intake_packets.update_one({'_id': existing['_id']}, {'$set': packet})
        packet_id = str(existing['_id'])
    else:
        packet['created_at'] = datetime.utcnow()
        res = db.db.intake_packets.insert_one(packet)
        packet_id = str(res.inserted_id)

    # If linked to an appointment, flag it as having intake packet
    if apt_obj_id:
        db.db.appointments.update_one(
            {'_id': apt_obj_id},
            {'$set': {'intake_packet_submitted': True, 'intake_packet_id': ObjectId(packet_id)}}
        )
        # BR-9: auto-apply risk level to linked case from PHQ-4 total
        if total_phq4 is not None:
            phq4_risk = 'RED' if total_phq4 >= 9 else ('YELLOW' if total_phq4 >= 3 else 'GREEN')
            appt = db.db.appointments.find_one({'_id': apt_obj_id})
            if appt and appt.get('case_id'):
                db.db.cases.update_one(
                    {'_id': ObjectId(appt['case_id'])},
                    {'$set': {'risk_level': phq4_risk}}
                )

    return jsonify({
        'message': 'Intake packet submitted',
        'packet_id': packet_id,
        'phq4_summary': packet.get('phq4'),
    }), 201


@intake_bp.route('/packet/<appointment_id>', methods=['GET'])
@jwt_required()
def get_intake_packet(appointment_id):
    """Get intake packet for an appointment (IC/staff only)."""
    uid = get_jwt_identity()
    try:
        uid_obj = ObjectId(uid)
    except Exception:
        return jsonify({'error': 'Invalid token'}), 401

    user = db.db.users.find_one({'_id': uid_obj})
    user_role = user.get('role') if user else None
    # OA can see ICF/SPIF only (not PHQ-4 scores — those are clinical data)
    # IC, Director, Admin see everything
    # STUDENT can check submitted status for their own appointment (returns only submitted flag)
    ALLOWED = {'IC', 'INTAKE_COUNSELOR', 'COUNSELOR', 'PSYCHOLOGIST', 'CASE_MANAGER',
               'ADMIN', 'STAFF', 'DIRECTOR', 'DPO', 'STUDENT'}
    if not user or user_role not in ALLOWED:
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        apt_obj_id = ObjectId(appointment_id)
    except Exception:
        return jsonify({'error': 'Invalid appointment_id'}), 400

    packet = db.db.intake_packets.find_one({'appointment_id': apt_obj_id})
    if not packet:
        return jsonify({'submitted': False}), 200

    # Students can view what they submitted (read-only) — RA 10173 Right to Access
    # Raw PHQ-4 responses (answers) are returned but not computed scores/risk labels
    if user_role == 'STUDENT':
        return jsonify({
            'submitted': True,
            'read_only': True,
            'icf': packet.get('icf'),
            'spif': packet.get('spif'),
            'phq4_responses': packet.get('phq4_responses'),
            'submitted_by_role': packet.get('submitted_by_role'),
        }), 200

    # Flatten — convert ObjectIds, rename phq4 → phq4_summary
    result = {k: v for k, v in packet.items()}
    result['_id'] = str(result.get('_id', ''))
    if result.get('appointment_id'):
        result['appointment_id'] = str(result['appointment_id'])
    result['submitted'] = True
    result['phq4_summary'] = result.pop('phq4', None)

    # OA role: strip clinical screening scores (data minimization — RA 10173)
    if user_role == 'STAFF':
        result.pop('phq4_summary', None)
        result.pop('phq4_responses', None)

    return jsonify(result), 200


@intake_bp.route('/packet/by-email/<email>', methods=['GET'])
@jwt_required()
def get_intake_packet_by_email(email):
    """Get latest walk-in intake packet by student email (IC/OA only)."""
    uid = get_jwt_identity()
    try:
        uid_obj = ObjectId(uid)
    except Exception:
        return jsonify({'error': 'Invalid token'}), 401

    user = db.db.users.find_one({'_id': uid_obj})
    if not user or user.get('role') not in {'IC', 'INTAKE_COUNSELOR', 'ADMIN', 'STAFF'}:
        return jsonify({'error': 'Unauthorized'}), 403

    packet = db.db.intake_packets.find_one(
        {'icf.email': email},
        sort=[('created_at', -1)]
    )
    if not packet:
        return jsonify({'packet': None, 'submitted': False}), 200

    packet['_id'] = str(packet['_id'])
    if packet.get('appointment_id'):
        packet['appointment_id'] = str(packet['appointment_id'])

    return jsonify({'packet': packet, 'submitted': True}), 200


@intake_bp.route('/<intake_id>/verify', methods=['POST'])
@jwt_required()
def verify_intake(intake_id):
    """IC: Approve or reject a completed intake record for QA verification."""
    user_id = get_jwt_identity()
    user = db.db.users.find_one({'_id': ObjectId(user_id)}) if user_id else None
    if not user or user.get('role') not in {'IC', 'STAFF', 'ADMIN', 'DPO'}:
        return jsonify({'error': 'Unauthorized'}), 403

    data = request.get_json() or {}
    action = data.get('action', '').lower()
    if action not in ('approve', 'reject'):
        return jsonify({'error': 'action must be "approve" or "reject"'}), 400

    try:
        iid = ObjectId(intake_id)
    except Exception:
        return jsonify({'error': 'Invalid intake ID'}), 400

    verification_status = 'approved' if action == 'approve' else 'rejected'
    result = db.db.appointments.update_one(
        {'_id': iid},
        {'$set': {
            'verification_status': verification_status,
            'verified_by': ObjectId(user_id),
            'verified_at': datetime.utcnow(),
        }}
    )
    if result.matched_count == 0:
        return jsonify({'error': 'Intake record not found'}), 404

    return jsonify({'success': True, 'verification_status': verification_status}), 200
