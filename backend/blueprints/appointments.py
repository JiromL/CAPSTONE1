"""
EPIC 4: BOOKING & SCHEDULING SYSTEM
Blueprint for appointment booking with real-time availability and automated confirmations
"""

from flask import Blueprint, request, jsonify, redirect, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from bson import ObjectId
from models import db, AppointmentStatus, PermissionType, CaseStatus, TerminationType
from utils import audit_log, user_has_permission
from datetime import datetime, timedelta
import os
import random
import string
from services.pdf_service import generate_appointment_confirmation_pdf
from services.email_service import EmailService

appointments_bp = Blueprint('appointments', __name__, url_prefix='/api/appointments')


def _cfg(key, default):
    """Read a config value from the Flask app config at request time."""
    return current_app.config.get(key, default)


def _email_footer():
    """HTML footer block for inline emails."""
    uni = _cfg('ORG_UNIVERSITY', 'De La Salle University')
    org = _cfg('ORG_NAME', 'Counseling &amp; Psychological Services')
    return f"{uni} &mdash; {org}"


# ============================================================================
# AUTO-ASSIGNMENT HELPER FUNCTIONS
# ============================================================================

def has_conflicting_appointment(counselor_id, start_time, end_time):
    """Check if a counselor has a conflicting active appointment (confirmed, approved, or matched)."""
    active_statuses = [
        AppointmentStatus.CONFIRMED.value,
        AppointmentStatus.MATCHED.value,
        AppointmentStatus.APPROVED.value,
        AppointmentStatus.CHECKED_IN.value,
    ]
    try:
        # Check both requested_start (for unscheduled) and scheduled_start (for confirmed slots)
        conflict = db.db.appointments.find_one({
            'counselor_id': counselor_id,
            'status': {'$in': active_statuses},
            '$or': [
                {'requested_start':  {'$lt': end_time}, 'requested_end':  {'$gt': start_time}},
                {'scheduled_start':  {'$lt': end_time}, 'scheduled_end':  {'$gt': start_time}},
            ]
        })
        return conflict is not None
    except Exception as e:
        print(f"Error checking conflicts: {str(e)}")
        return True  # Assume conflict if there's an error


def get_counselor_workload(counselor_id):
    """Get the number of active/confirmed appointments for a counselor"""
    try:
        return db.db.appointments.count_documents({
            'counselor_id': counselor_id,
            'status': {'$in': [
                AppointmentStatus.CONFIRMED.value,
                AppointmentStatus.MATCHED.value,
                'SCHEDULED'
            ]}
        })
    except Exception as e:
        print(f"Error getting workload: {str(e)}")
        return float('inf')  # Return high number if error


def find_available_counselor(case_id, requested_start, requested_end, preferred_method=None, purpose=None):
    """
    Find an available counselor for the requested time slot.
    Intake interviews are routed exclusively to IC role; all others go to COUNSELOR/PSYCHOLOGIST.
    """
    try:
        # Get the case to find the assigned counselor (if any)
        case = db.db.cases.find_one({"_id": case_id})
        if not case:
            return None

        # Intake appointments → only IC; everything else → COUNSELOR / PSYCHOLOGIST
        if purpose == 'intake_interview':
            available_roles = ['IC']
        else:
            available_roles = ['COUNSELOR', 'PSYCHOLOGIST']

        counselors = list(db.db.users.find({
            'role': {'$in': available_roles},
            'is_active': True
        }))
        
        if not counselors:
            return None
        
        # Filter counselors with no conflicts and track workload
        best_counselor = None
        best_workload = float('inf')
        
        for counselor in counselors:
            # Check for conflicts
            if has_conflicting_appointment(counselor['_id'], requested_start, requested_end):
                continue
            
            # Check if meeting method is supported (if specified)
            if preferred_method:
                settings = db.db.staff_settings.find_one({'user_id': counselor['_id']})
                meeting_methods = settings.get('work_preferences', {}).get('meeting_methods', ['in-person']) if settings else ['in-person']
                # Normalize method names
                if isinstance(meeting_methods, str):
                    meeting_methods = [meeting_methods]
                if preferred_method not in meeting_methods:
                    continue  # Skip if method not supported
            
            # Get workload
            workload = get_counselor_workload(counselor['_id'])
            
            # Select counselor with lowest workload
            if workload < best_workload:
                best_workload = workload
                best_counselor = counselor
        
        return best_counselor
    except Exception as e:
        print(f"Error finding available counselor: {str(e)}")
        return None


def auto_assign_appointment(appointment_id):
    """
    Auto-assign an appointment to an available counselor and schedule it
    Matches based on time availability and meeting method preference
    Returns: (success: bool, counselor_id: str or None, message: str)
    """
    try:
        apt_id = ObjectId(appointment_id) if isinstance(appointment_id, str) else appointment_id
        appointment = db.db.appointments.find_one({"_id": apt_id})
        
        if not appointment:
            return False, None, "Appointment not found"
        
        # Check if already assigned
        if appointment.get('counselor_id'):
            return False, None, "Appointment already assigned"
        
        # Get the preferred meeting method from the appointment
        preferred_method = appointment.get('preferred_method')
        if not preferred_method:
            preferred_method = 'in-person'  # Default to in-person
        
        # Find available counselor — intake goes to IC only, others to COUNSELOR/PSYCHOLOGIST
        counselor = find_available_counselor(
            appointment['case_id'],
            appointment['requested_start'],
            appointment['requested_end'],
            preferred_method,
            purpose=appointment.get('purpose'),
        )
        
        if not counselor:
            return False, None, f"No available counselors for requested time and method: {preferred_method}"
        
        # Assign and schedule the appointment
        db.db.appointments.update_one(
            {"_id": apt_id},
            {"$set": {
                "counselor_id": counselor['_id'],
                "status": AppointmentStatus.MATCHED.value,
                "scheduled_start": appointment['requested_start'],
                "scheduled_end": appointment['requested_end'],
                "updated_at": datetime.utcnow()
            }}
        )
        
        # Also update the case with the assigned counselor (if not already assigned)
        case = db.db.cases.find_one({"_id": appointment['case_id']})
        if case and not case.get('assigned_counselor_id'):
            db.db.cases.update_one(
                {"_id": appointment['case_id']},
                {"$set": {
                    "assigned_counselor_id": counselor['_id'],
                    "updated_at": datetime.utcnow()
                }}
            )
            print(f"[auto_assign_appointment] Also assigned counselor to case {appointment['case_id']}")
        
        # Audit log
        audit_log(
            db.db,
            'appointments',
            'auto_assigned',
            entity_id=str(apt_id),
            new_values={
                'counselor_id': str(counselor['_id']),
                'counselor_name': f"{counselor.get('first_name', '')} {counselor.get('last_name', '')}",
                'status': AppointmentStatus.MATCHED.value,
                'method_matched': preferred_method
            }
        )
        
        return True, str(counselor['_id']), "Successfully auto-assigned"
    
    except Exception as e:
        print(f"Error in auto_assign_appointment: {str(e)}")
        import traceback
        traceback.print_exc()
        return False, None, f"Auto-assignment failed: {str(e)}"


@appointments_bp.route('', methods=['GET'])
@jwt_required()
def list_appointments():
    """List appointments for a counselor or student's own appointments"""
    user_id = get_jwt_identity()
    
    try:
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        user = db.db.users.find_one({"_id": user_id_obj})
    except Exception as e:
        return jsonify({'error': f'Invalid user ID: {str(e)}'}), 400
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    try:
        # Determine query based on user role
        role = user.get('role', '').upper()
        
        status_filter = request.args.get('status')
        case_id_filter = request.args.get('case_id')
        limit = int(request.args.get('limit', 100))

        if role == 'STUDENT':
            # For students: find appointments through their cases
            student_cases = list(db.db.cases.find({"student_id": user_id_obj}))
            case_ids = [case['_id'] for case in student_cases]
            query = {"case_id": {"$in": case_ids}} if case_ids else {"_id": None}
            if status_filter:
                query["status"] = status_filter
            appointments = list(db.db.appointments.find(query).sort("_id", -1).limit(limit))
        elif role in ('STAFF', 'ADMIN'):
            # Staff/Admin: see all appointments, optionally filtered by status
            query = {}
            if status_filter:
                query["status"] = status_filter
            if case_id_filter:
                try:
                    query["case_id"] = ObjectId(case_id_filter)
                except Exception:
                    pass
            appointments = list(db.db.appointments.find(query).sort("_id", -1).limit(limit))
        else:
            # Counselors: appointments where they are assigned
            query = {"counselor_id": user_id_obj}
            if status_filter:
                query["status"] = status_filter
            if case_id_filter:
                try:
                    query["case_id"] = ObjectId(case_id_filter)
                except Exception:
                    pass
            appointments = list(db.db.appointments.find(query).sort("_id", -1).limit(limit))
        
        # Helper function to convert ObjectIds to strings recursively
        def convert_objectids(obj):
            if isinstance(obj, dict):
                for key, value in obj.items():
                    if isinstance(value, ObjectId):
                        obj[key] = str(value)
                    elif isinstance(value, (dict, list)):
                        obj[key] = convert_objectids(value)
                    elif hasattr(value, 'isoformat'):
                        try:
                            obj[key] = value.isoformat() if not isinstance(value, str) else value
                        except:
                            pass
            elif isinstance(obj, list):
                for i, item in enumerate(obj):
                    if isinstance(item, ObjectId):
                        obj[i] = str(item)
                    elif isinstance(item, (dict, list)):
                        obj[i] = convert_objectids(item)
                    elif hasattr(item, 'isoformat'):
                        try:
                            obj[i] = item.isoformat() if not isinstance(item, str) else item
                        except:
                            pass
            return obj
        
        # Enrich with student name for STAFF/ADMIN view
        if role in ('STAFF', 'ADMIN'):
            for apt in appointments:
                sid = apt.get('student_id')
                if sid:
                    try:
                        student = db.db.users.find_one({'_id': sid if isinstance(sid, ObjectId) else ObjectId(str(sid))},
                                                       {'first_name': 1, 'last_name': 1, 'email': 1, 'id_number': 1})
                        if student:
                            apt['student_name'] = f"{student.get('first_name','')} {student.get('last_name','')}".strip()
                            apt['student_email'] = student.get('email', '')
                            apt['student_id_number'] = student.get('id_number', '')
                    except Exception:
                        pass

        # Convert all appointments; strip sensitive fields from OA view
        for apt in appointments:
            convert_objectids(apt)
            if role == 'STAFF':
                apt.pop('concern', None)

        return jsonify({
            'appointments': appointments,
            'count': len(appointments)
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Error in list_appointments: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': 'Failed to fetch appointments'}), 500


@appointments_bp.route('/my-appointments', methods=['GET'])
@jwt_required()
def get_my_appointments():
    """Get all appointments for the logged-in user (student or counselor)"""
    user_id = get_jwt_identity()
    
    try:
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        user = db.db.users.find_one({"_id": user_id_obj})
    except Exception as e:
        return jsonify({'error': f'Invalid user ID: {str(e)}'}), 400
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    try:
        # Determine query based on user role
        role = user.get('role', '').upper()
        
        if role == 'STUDENT':
            # For students: find appointments through their cases
            student_cases = list(db.db.cases.find({"student_id": user_id_obj}))
            case_ids = [case['_id'] for case in student_cases]
            
            if case_ids:
                appointments = list(db.db.appointments.find(
                    {"case_id": {"$in": case_ids}}
                ).sort("requested_start", -1).limit(100))
            else:
                appointments = []
        else:
            # For counselors/staff: find appointments where they are the counselor
            appointments = list(db.db.appointments.find(
                {"counselor_id": user_id_obj}
            ).sort("requested_start", -1).limit(100))
        
        # Helper function to convert ObjectIds to strings recursively
        def convert_objectids(obj):
            if isinstance(obj, dict):
                for key, value in obj.items():
                    if isinstance(value, ObjectId):
                        obj[key] = str(value)
                    elif isinstance(value, (dict, list)):
                        obj[key] = convert_objectids(value)
                    elif hasattr(value, 'isoformat'):
                        try:
                            obj[key] = value.isoformat() if not isinstance(value, str) else value
                        except:
                            pass
            elif isinstance(obj, list):
                for i, item in enumerate(obj):
                    if isinstance(item, ObjectId):
                        obj[i] = str(item)
                    elif isinstance(item, (dict, list)):
                        obj[i] = convert_objectids(item)
                    elif hasattr(item, 'isoformat'):
                        try:
                            obj[i] = item.isoformat() if not isinstance(item, str) else item
                        except:
                            pass
            return obj
        
        # Convert all appointments
        for apt in appointments:
            convert_objectids(apt)

            # Add counselor name if counselor_id exists
            if apt.get('counselor_id'):
                try:
                    counselor = db.db.users.find_one({"_id": ObjectId(apt['counselor_id'])})
                    if counselor:
                        fn = counselor.get('first_name', '')
                        ln = counselor.get('last_name', '')
                        apt['counselor_name'] = f"{fn} {ln}".strip() or counselor.get('name', 'Unknown Counselor')
                        apt['counselor_email'] = counselor.get('email', '')
                except:
                    pass

            # Add student name for counselor/staff views
            if not apt.get('student_name'):
                if apt.get('student_id'):
                    try:
                        student = db.db.users.find_one({"_id": ObjectId(apt['student_id'])})
                        if student:
                            apt['student_name'] = f"{student.get('first_name','')} {student.get('last_name','')}".strip()
                    except:
                        pass
                if not apt.get('student_name') and apt.get('case_id'):
                    try:
                        case = db.db.cases.find_one({"_id": ObjectId(apt['case_id'])})
                        if case:
                            apt['student_name'] = case.get('student_name', '')
                            apt['student_email'] = apt.get('student_email') or case.get('student_email', '')
                    except:
                        pass
        
        return jsonify({
            'appointments': appointments,
            'count': len(appointments)
        }), 200
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error in get_my_appointments: {str(e)}")
        print(error_trace)
        return jsonify({'error': f'Failed to fetch appointments: {str(e)}'}), 500


@appointments_bp.route('/available-counselors', methods=['GET'])
@jwt_required()
def get_available_counselors():
    """Return active staff eligible to handle an appointment.
    Pass ?purpose=intake_interview to restrict to IC role only."""
    purpose = request.args.get('purpose', '')
    if purpose == 'intake_interview':
        roles = ['IC']
    else:
        roles = ['COUNSELOR', 'PSYCHOLOGIST']
    counselors = list(db.db.users.find(
        {'role': {'$in': roles}, 'is_active': True},
        {'_id': 1, 'first_name': 1, 'last_name': 1, 'role': 1},
    ))
    return jsonify({'users': [
        {'_id': str(c['_id']),
         'first_name': c.get('first_name', ''),
         'last_name': c.get('last_name', ''),
         'role': c.get('role', '')}
        for c in counselors
    ]}), 200


@appointments_bp.route('/my-counselor', methods=['GET'])
@jwt_required()
def get_my_counselor():
    """Return the assigned counselor for the current student's active case."""
    user_id = get_jwt_identity()
    try:
        uid = ObjectId(user_id)
    except Exception:
        return jsonify({'counselor_id': None}), 200

    # Find the most recent case with an assigned counselor
    case = db.db.cases.find_one(
        {'student_id': uid, 'assigned_counselor_id': {'$exists': True, '$ne': None}},
        sort=[('created_at', -1)],
    )

    if not case or not case.get('assigned_counselor_id'):
        return jsonify({'counselor_id': None}), 200

    counselor = db.db.users.find_one({'_id': case['assigned_counselor_id']})
    if not counselor:
        return jsonify({'counselor_id': None}), 200

    return jsonify({
        'counselor_id': str(case['assigned_counselor_id']),
        'counselor_name': f"{counselor.get('first_name', '')} {counselor.get('last_name', '')}".strip(),
        'role': counselor.get('role', ''),
    }), 200


@appointments_bp.route('/active', methods=['GET'])
@jwt_required()
def check_active_appointment():
    """Check if student has an active appointment AND whether they are eligible to self-book.

    Eligibility rules:
      - Student must have an ACTIVE case with an assigned counselor (returning client).
      - OR student has NO case at all AND no prior appointments (truly first-time — redirect to walk-in).
      - A student whose case is NEW or INTAKE_SCHEDULED must wait for the IC to complete intake
        before they can book continuing sessions.
    """
    user_id = get_jwt_identity()

    try:
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        user = db.db.users.find_one({"_id": user_id_obj})
    except Exception as e:
        return jsonify({'error': f'Invalid user ID: {str(e)}'}), 400

    if not user:
        return jsonify({'error': 'User not found'}), 404

    try:
        # ── 1. Active appointment check ────────────────────────────────────
        active_appointment = db.db.appointments.find_one({
            "student_id": user_id_obj,
            "status": {"$in": ["REQUESTED", "PENDING_APPROVAL", "APPROVED", "MATCHED", "CONFIRMED"]},
            "$or": [
                {"scheduled_start": {"$exists": False}},
                {"scheduled_start": {"$gt": datetime.utcnow()}}
            ]
        })

        if active_appointment:
            appointment_time = None
            if active_appointment.get('scheduled_start'):
                appointment_time = active_appointment['scheduled_start'].isoformat()
            elif active_appointment.get('requested_start'):
                appointment_time = active_appointment['requested_start'].isoformat()

            return jsonify({
                'has_active_appointment': True,
                'appointment_id': str(active_appointment['_id']),
                'status': active_appointment.get('status'),
                'appointment_time': appointment_time,
                'appointment_type': active_appointment.get('appointment_type', 'unknown'),
                'counselor_id': str(active_appointment.get('counselor_id', '')) if active_appointment.get('counselor_id') else None,
                'message': 'You already have an active appointment. Please complete or cancel it before booking a new one.',
                'can_self_book': False,
                'booking_gate': 'has_active_appointment',
            }), 200

        # ── 2. Case eligibility check ──────────────────────────────────────
        # Find the student's most recent non-cancelled case
        student_case = db.db.cases.find_one(
            {"student_id": user_id_obj, "status": {"$nin": ["CANCELLED"]}},
            sort=[("created_at", -1)]
        )

        if not student_case:
            # First-time student — allow them to book an intake interview appointment
            return jsonify({
                'has_active_appointment': False,
                'can_self_book': True,
                'booking_gate': 'eligible',
                'message': 'Welcome! Please book an Intake Interview as your first appointment.',
            }), 200

        case_status = student_case.get('status', '')
        assigned_counselor = student_case.get('assigned_counselor_id')

        if case_status in ('NEW', 'INTAKE_SCHEDULED'):
            return jsonify({
                'has_active_appointment': False,
                'can_self_book': False,
                'booking_gate': 'awaiting_intake',
                'message': 'Your intake appointment has not been completed yet. Please attend your scheduled intake session first.',
            }), 200

        if case_status == 'PENDING_TERMINATION':
            return jsonify({
                'has_active_appointment': False,
                'can_self_book': False,
                'booking_gate': 'pending_termination',
                'message': 'Your case is currently pending closure. Please contact the CPS office.',
            }), 200

        if case_status == 'CLOSED':
            # Returning client whose case was closed — they can open a new one via walk-in
            return jsonify({
                'has_active_appointment': False,
                'can_self_book': False,
                'booking_gate': 'case_closed',
                'message': 'Your case is currently closed. If you need continued support, please visit or contact the CPS office and they will reactivate your record.',
            }), 200

        # ACTIVE case with assigned counselor — counselor owns the schedule
        counselor_name = None
        if assigned_counselor:
            try:
                c = db.db.users.find_one({"_id": ObjectId(str(assigned_counselor))})
                if c:
                    counselor_name = f"{c.get('first_name','')} {c.get('last_name','')}".strip()
            except Exception:
                pass

        if case_status == 'ACTIVE' and assigned_counselor:
            return jsonify({
                'has_active_appointment': False,
                'can_self_book': False,
                'booking_gate': 'counselor_owns_scheduling',
                'case_id': str(student_case['_id']),
                'case_status': case_status,
                'assigned_counselor_id': str(assigned_counselor) if assigned_counselor else None,
                'assigned_counselor_name': counselor_name,
                'message': f'You have an active counseling relationship with {counselor_name or "your counselor"}. '
                           'Your counselor will schedule your next session directly.',
            }), 200

        if case_status == 'ACTIVE' and not assigned_counselor:
            # Active case but no counselor assigned yet — send to office, not self-booking
            return jsonify({
                'has_active_appointment': False,
                'can_self_book': False,
                'booking_gate': 'no_active_counselor',
                'case_id': str(student_case['_id']),
                'case_status': case_status,
                'message': 'Your case is active but a counselor has not been assigned yet. '
                           'Please contact the CPS office for assistance.',
            }), 200

        return jsonify({
            'has_active_appointment': False,
            'can_self_book': True,
            'booking_gate': 'eligible',
            'case_id': str(student_case['_id']),
            'case_status': case_status,
            'assigned_counselor_id': str(assigned_counselor) if assigned_counselor else None,
            'assigned_counselor_name': counselor_name,
            'message': 'No active appointment',
        }), 200

    except Exception as e:
        import traceback
        print(f"Error checking active appointment: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': f'Failed to check active appointment: {str(e)}'}), 500


@appointments_bp.route('/request', methods=['POST'])
@jwt_required()
def request_appointment():
    """Student request appointment with preferred date/time and booking details (EPIC 4: Student Appointment Request System)"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    # slot_id path: student picks a real counselor slot → confirmed immediately
    slot_id = data.get('slot_id')

    # Always-required fields regardless of path
    always_required = ['purpose', 'concern', 'referral_type', 'preferred_method']
    missing = [f for f in always_required if not data.get(f)]
    if missing:
        return jsonify({'error': f'Missing required fields: {", ".join(missing)}'}), 400

    if data.get('referral_type') == 'referred' and not data.get('referred_by'):
        return jsonify({'error': 'Please specify who referred you'}), 400

    # Load user early (needed for email notifications)
    try:
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
    except:
        user_id_obj = user_id

    user = db.db.users.find_one({"_id": user_id_obj})
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # --- Slot-based booking (preferred) ---
    booked_slot = None
    slot_counselor_id = None
    if slot_id:
        try:
            slot_oid = ObjectId(slot_id)
        except Exception:
            return jsonify({'error': 'Invalid slot_id'}), 400
        booked_slot = db.db.counselor_availability.find_one_and_update(
            {'_id': slot_oid, 'is_available': True},
            {'$set': {'is_available': False}}
        )
        if not booked_slot:
            return jsonify({'error': 'Slot not found or already booked. Please choose another slot.'}), 409
        requested_start = booked_slot['slot_start']
        requested_end   = booked_slot['slot_end']
        slot_counselor_id = booked_slot['counselor_id']
    else:
        # Open request path (no slot, no specific date) or legacy date/time path
        preferred_date_str = data.get('preferred_date')
        preferred_time_str = data.get('preferred_time')
        if preferred_date_str and preferred_time_str:
            # Block booking on declared holidays
            holiday_doc = db.db.holidays.find_one({'date': preferred_date_str})
            if holiday_doc:
                return jsonify({
                    'error': f"Cannot book on {holiday_doc['name']}. This date is a declared university holiday."
                }), 400
            try:
                datetime_str = f"{preferred_date_str}T{preferred_time_str}:00"
                requested_start = datetime.fromisoformat(datetime_str)
                requested_end = requested_start + timedelta(minutes=_cfg('APPOINTMENT_DURATION_MINUTES', 60))
            except (ValueError, KeyError) as e:
                return jsonify({'error': f'Invalid date/time format: {str(e)}'}), 400
        else:
            # Open request — no specific time; staff will schedule
            requested_start = None
            requested_end = None

    # BUSINESS RULE: Prevent booking appointments in the past (only when a specific time is given)
    if requested_start:
        current_time = datetime.now()
        if requested_start < current_time:
            return jsonify({
                'error': 'Cannot book appointments for dates and times in the past. Please select a future date and time.'
            }), 400
    
    # RESCHEDULE HANDLING: If rescheduling, cancel the old appointment
    reschedule_appointment_id = data.get('reschedule_appointment_id')
    if reschedule_appointment_id:
        try:
            old_appt_id = ObjectId(reschedule_appointment_id) if isinstance(reschedule_appointment_id, str) else reschedule_appointment_id
            old_appointment = db.db.appointments.find_one({'_id': old_appt_id, 'student_id': user_id_obj})
            if old_appointment:
                # Cancel the old appointment; it has been superseded by the new request
                db.db.appointments.update_one(
                    {'_id': old_appt_id},
                    {'$set': {
                        'status': AppointmentStatus.CANCELLED.value,
                        'cancellation_reason': 'Superseded by a new reschedule request.',
                        'cancelled_at': datetime.utcnow(),
                        'updated_at': datetime.utcnow(),
                    }}
                )
                # Remove from Google Calendar
                try:
                    cal_event_id = old_appointment.get('calendar_event_id')
                    if cal_event_id:
                        from blueprints.google_calendar import delete_appointment_from_calendar, SYSTEM_CALENDAR_USER
                        old_counselor_id = old_appointment.get('counselor_id')
                        deleted = old_counselor_id and delete_appointment_from_calendar(str(old_counselor_id), cal_event_id)
                        if not deleted:
                            delete_appointment_from_calendar(SYSTEM_CALENDAR_USER, cal_event_id)
                except Exception:
                    pass
        except:
            pass  # If reschedule_id is invalid, just continue (old appointment stays active)
    
    # BUSINESS RULE: Check if student already has an active appointment
    # Skip time-overlap check for open requests (no specific time); still block duplicate open requests
    if requested_start:
        conflict_query = {
            'student_id': user_id_obj,
            'status': {'$in': [
                AppointmentStatus.REQUESTED.value,
                AppointmentStatus.PENDING_APPROVAL.value,
                AppointmentStatus.APPROVED.value,
                AppointmentStatus.CONFIRMED.value,
                AppointmentStatus.MATCHED.value
            ]},
            'requested_start': {'$lt': requested_end},
            'requested_end': {'$gt': requested_start}
        }
        if reschedule_appointment_id:
            try:
                old_appt_id = ObjectId(reschedule_appointment_id) if isinstance(reschedule_appointment_id, str) else reschedule_appointment_id
                conflict_query['_id'] = {'$ne': old_appt_id}
            except:
                pass
        conflicting_appointment = db.db.appointments.find_one(conflict_query)
        if conflicting_appointment:
            return jsonify({
                'error': 'You already have an active appointment at this time. Please complete, cancel, or reschedule your existing appointment before booking a new one.',
                'existing_appointment': str(conflicting_appointment['_id']),
                'existing_start': conflicting_appointment.get('requested_start', '').isoformat() if isinstance(conflicting_appointment.get('requested_start'), datetime) else str(conflicting_appointment.get('requested_start'))
            }), 409
    else:
        # Open request: block if student already has any active untimed request
        existing_open = db.db.appointments.find_one({
            'student_id': user_id_obj,
            'status': {'$in': [
                AppointmentStatus.REQUESTED.value,
                AppointmentStatus.PENDING_APPROVAL.value,
                AppointmentStatus.APPROVED.value,
                AppointmentStatus.CONFIRMED.value,
                AppointmentStatus.MATCHED.value,
            ]},
        })
        if existing_open:
            return jsonify({
                'error': 'You already have an active appointment or pending request. Please complete or cancel it before submitting a new request.',
                'existing_appointment': str(existing_open['_id']),
            }), 409
    
    # Get or create case for student
    case_id = None
    case = None
    
    if data.get('case_id'):
        # Use provided case_id
        try:
            case_id = ObjectId(data['case_id']) if isinstance(data['case_id'], str) else data['case_id']
            case = db.db.cases.find_one({"_id": case_id})
            if not case:
                return jsonify({'error': 'Case not found'}), 404
        except:
            case = db.db.cases.find_one({"_id": data['case_id']})
            if not case:
                return jsonify({'error': 'Case not found'}), 404
    else:
        # Auto-create case for student if needed
        # Check if student already has a case
        existing_case = db.db.cases.find_one({"student_id": user_id_obj})
        if existing_case:
            case_id = existing_case['_id']
            case = existing_case
        else:
            # Create new case
            case_doc = {
                "_id": ObjectId(),
                "student_id": user_id_obj,
                "student_name": f"{user.get('first_name', '')} {user.get('last_name', '')}",
                "student_email": user.get('email', ''),
                "status": CaseStatus.ACTIVE.value,
                "case_status": CaseStatus.ACTIVE.value,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            result = db.db.cases.insert_one(case_doc)
            case_id = result.inserted_id
            case = case_doc
    
    reference_id = _cfg('REFERENCE_ID_PREFIX', 'CPS-') + ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

    try:
        preferred_counselor_id = None
        if data.get('preferred_counselor_id'):
            try:
                preferred_counselor_id = ObjectId(data['preferred_counselor_id'])
            except Exception:
                pass

        # Weekly-schedule slot booking: counselor_id passed directly from open-slots endpoint
        weekly_slot_counselor_id = None
        if data.get('counselor_id') and not booked_slot:
            try:
                weekly_slot_counselor_id = ObjectId(data['counselor_id'])
            except Exception:
                pass

        # When a specific IC/counselor is pre-selected (either via a reserved slot or the
        # open-slots picker), the time is committed — set it confirmed immediately.
        has_committed_slot = bool(booked_slot or weekly_slot_counselor_id)
        initial_status = AppointmentStatus.CONFIRMED.value if has_committed_slot else AppointmentStatus.REQUESTED.value

        appointment = {
            "student_id": user_id_obj,
            "case_id": case_id,
            "appointment_type": data.get('appointment_type', 'initial'),
            "requested_start": requested_start,
            "requested_end": requested_end,
            "scheduled_start": requested_start if has_committed_slot else None,
            "scheduled_end":   requested_end   if has_committed_slot else None,
            "status": initial_status,
            "reference_id": reference_id,
            "purpose": data.get('purpose'),
            "concern": data.get('concern'),
            "referral_type": data.get('referral_type'),
            "referred_by": data.get('referred_by'),
            "preferred_method": data.get('preferred_method'),
            "preferred_platform": data.get('preferred_platform'),
            "preferred_counselor_id": preferred_counselor_id,
            "created_at": datetime.utcnow()
        }

        # Attach counselor when booking via legacy slot
        if booked_slot and slot_counselor_id:
            appointment["counselor_id"] = slot_counselor_id
            counselor_doc = db.db.users.find_one({"_id": slot_counselor_id})
            if counselor_doc:
                appointment["counselor_name"] = f"{counselor_doc.get('first_name','')} {counselor_doc.get('last_name','')}".strip()

        # Attach counselor when booking via weekly schedule slot
        if weekly_slot_counselor_id:
            appointment["counselor_id"] = weekly_slot_counselor_id
            counselor_doc = db.db.users.find_one({"_id": weekly_slot_counselor_id})
            if counselor_doc:
                appointment["counselor_name"] = f"{counselor_doc.get('first_name','')} {counselor_doc.get('last_name','')}".strip()

        result = db.db.appointments.insert_one(appointment)
        appointment_id = str(result.inserted_id)

        # Record who booked the slot and which appointment owns it
        if booked_slot:
            db.db.counselor_availability.update_one(
                {"_id": booked_slot["_id"]},
                {"$set": {"booked_by": user_id_obj, "appointment_id": result.inserted_id}}
            )

        # Slot-based bookings have a pre-assigned counselor; manual requests stay REQUESTED for IC review
        auto_assigned = bool(booked_slot)
        auto_assigned_counselor_id = str(slot_counselor_id) if booked_slot and slot_counselor_id else None
        auto_assigned_message = "Slot booking — counselor pre-assigned" if booked_slot else "Awaiting IC assignment"

        # Fetch the final appointment state for the email (after any slot-based updates)
        updated_appointment = db.db.appointments.find_one({"_id": result.inserted_id})
        
    except Exception as e:
        print(f"Error creating appointment: {str(e)}")
        return jsonify({'error': f'Error creating appointment: {str(e)}'}), 500
    
    # Send appointment request receipt email
    try:
        student_email = case.get('student_email', '') if case else user.get('email', '')
        student_name = case.get('student_name', 'Student') if case else f"{user.get('first_name', '')} {user.get('last_name', '')}"
        
        email_service = EmailService()
        
        receipt_subject = "Appointment Request Received"
        receipt_html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1B5E20;">Appointment Request Received</h2>
                    
                    <p>Dear {student_name},</p>
                    
                    <p>Thank you for submitting your appointment request with the Counseling and Psychological Services (CPS). We have received your submission and will process it shortly.</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #1B5E20;">
                        <h3 style="color: #1B5E20; margin-top: 0;">Request Details</h3>
                        <p style="margin: 8px 0;"><strong>Request ID:</strong> {appointment_id}</p>
                        <p style="margin: 8px 0;"><strong>Preferred Date:</strong> {data.get('preferred_date')}</p>
                        <p style="margin: 8px 0;"><strong>Purpose:</strong> {data.get('purpose')}</p>
                        <p style="margin: 8px 0;"><strong>Status:</strong> {updated_appointment.get('status', AppointmentStatus.REQUESTED.value)}</p>
                    </div>
                    
                    <p>Our counseling team will review your request and match you with an appropriate counselor. You will receive a confirmation email once your appointment has been scheduled.</p>
                    
                    <p style="color: #666; font-size: 12px;">If you have any questions, please don't hesitate to contact our support team.</p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    
                    <p style="color: #999; font-size: 12px; text-align: center;">
                        {_email_footer()}
                    </p>
                </div>
            </body>
        </html>
        """
        
        email_service._send_email(student_email, receipt_subject, receipt_html)
        print(f"✓ Appointment request receipt sent to {student_email}")
    except Exception as e:
        print(f"⚠ Could not send request receipt email: {e}")

    
    audit_log(db.db, 'appointment', 'request', entity_id=appointment_id, new_values={
        'case_id': str(case_id),
        'preferred_date': data.get('preferred_date'),
        'preferred_time': data.get('preferred_time'),
        'slot_id': data.get('slot_id'),
        'purpose': data.get('purpose'),
        'auto_assigned': auto_assigned,
        'counselor_id': auto_assigned_counselor_id
    })
    
    return jsonify({
        'appointment_id': appointment_id,
        'reference_id': reference_id,
        'status': updated_appointment.get('status', AppointmentStatus.REQUESTED.value),
        'requested_start': requested_start.isoformat() if requested_start else None,
        'requested_end': requested_end.isoformat() if requested_end else None,
        'purpose': data.get('purpose'),
        'concern': data.get('concern'),
        'referral_type': data.get('referral_type'),
        'referred_by': data.get('referred_by'),
        'preferred_method': data.get('preferred_method'),
        'auto_assigned': auto_assigned,
        'counselor_id': auto_assigned_counselor_id,
        'auto_assignment_message': auto_assigned_message
    }), 201


@appointments_bp.route('/<appointment_id>/match-counselor', methods=['POST'])
@jwt_required()
def match_counselor(appointment_id):
    """Match and assign counselor using algorithm or auto-assignment (EPIC 4: Counselor Matching Algorithm)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.ASSIGN_CASES.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        apt_id = ObjectId(appointment_id)
        appointment = db.db.appointments.find_one({"_id": apt_id})
    except:
        appointment = db.db.appointments.find_one({"_id": appointment_id})
    
    if not appointment:
        return jsonify({'error': 'Appointment not found'}), 404
    
    data = request.get_json() or {}
    
    if data.get('counselor_id'):
        # Manual assignment
        try:
            counselor_id = ObjectId(data['counselor_id'])
            counselor = db.db.users.find_one({"_id": counselor_id})
        except:
            counselor = db.db.users.find_one({"_id": data['counselor_id']})
        
        if not counselor:
            return jsonify({'error': 'Counselor not found'}), 404

        # Enforce role restriction: intake_interview → IC only; others → COUNSELOR/PSYCHOLOGIST
        purpose = appointment.get('purpose', '')
        c_role = (counselor.get('role') or '').upper()
        if purpose == 'intake_interview' and c_role != 'IC':
            return jsonify({'error': 'Intake interviews must be assigned to an Intake Counselor (IC).'}), 400
        if purpose != 'intake_interview' and c_role == 'IC':
            return jsonify({'error': 'Intake Counselors can only handle intake interview appointments.'}), 400
    else:
        # Auto-match algorithm - try automatic assignment
        success, counselor_id_str, message = auto_assign_appointment(apt_id)
        if not success:
            return jsonify({'error': f'No available counselors: {message}'}), 409
        
        counselor = db.db.users.find_one({"_id": ObjectId(counselor_id_str)})
    
    # If we get here with manual assignment, update the appointment
    meeting_link = None
    if not data.get('counselor_id'):
        # Already updated by auto_assign_appointment
        pass
    else:
        # Parse scheduled times from request
        scheduled_start = None
        scheduled_end = None
        if data.get('scheduled_start'):
            try:
                scheduled_start = datetime.fromisoformat(
                    data['scheduled_start'].replace('Z', '+00:00')
                ).replace(tzinfo=None)
                if data.get('scheduled_end'):
                    scheduled_end = datetime.fromisoformat(
                        data['scheduled_end'].replace('Z', '+00:00')
                    ).replace(tzinfo=None)
                else:
                    scheduled_end = scheduled_start + timedelta(minutes=_cfg('APPOINTMENT_DURATION_MINUTES', 60))
            except Exception as e:
                print(f"⚠ Could not parse scheduled times: {e}")

        # Auto-create meeting link based on preferred method
        meeting_link = None
        meeting_id_str = None
        meeting_passcode = None
        preferred_method = appointment.get('preferred_method', '')

        if preferred_method == 'zoom' and scheduled_start:
            try:
                from integrations.zoom import ZoomIntegration
                zoom = ZoomIntegration(current_app.config)
                student_doc = db.db.users.find_one({"_id": appointment.get('student_id')})
                s_name = f"{student_doc.get('first_name','')} {student_doc.get('last_name','')}".strip() if student_doc else 'Student'
                c_name = f"{counselor.get('first_name','')} {counselor.get('last_name','')}".strip()
                zoom_result = zoom.create_meeting(
                    topic=f"Counseling Session – {s_name} with {c_name}",
                    start_time=scheduled_start.isoformat()
                )
                meeting_link = zoom_result.get('join_url')
                meeting_id_str = str(zoom_result.get('meeting_id', ''))
                meeting_passcode = zoom_result.get('meeting_passcode')
                print(f"✓ Zoom meeting created: {meeting_link}")
            except Exception as e:
                print(f"⚠ Zoom meeting creation failed: {e}")

        elif preferred_method in ('google_meet', 'google-meet', 'online') and scheduled_start:
            try:
                from blueprints.google_calendar import sync_appointment_to_calendar
                counselor_id_str = str(counselor['_id'])
                # Build a minimal appointment dict for the sync helper
                appt_for_sync = dict(appointment)
                appt_for_sync['scheduled_start'] = scheduled_start
                appt_for_sync['scheduled_end'] = scheduled_end or scheduled_start + timedelta(minutes=60)
                appt_for_sync['counselor_id'] = counselor['_id']
                _, meet_link = sync_appointment_to_calendar(counselor_id_str, appt_for_sync)
                if meet_link:
                    meeting_link = meet_link
                    print(f"✓ Google Meet created: {meeting_link}")
                else:
                    print("⚠ Google Meet: counselor has not connected Google Calendar")
            except Exception as e:
                print(f"⚠ Google Meet creation failed: {e}")

        # Fall back to the student's requested time when no explicit scheduled time is provided
        if not scheduled_start:
            scheduled_start = appointment.get('requested_start')
        if not scheduled_end:
            scheduled_end = appointment.get('requested_end')
            if not scheduled_end and scheduled_start:
                scheduled_end = scheduled_start + timedelta(minutes=_cfg('APPOINTMENT_DURATION_MINUTES', 60))

        # Build update fields
        update_fields = {
            "counselor_id": counselor['_id'],
            "status": AppointmentStatus.CONFIRMED.value,
            "confirmation_sent": True,
            "updated_at": datetime.utcnow()
        }
        if scheduled_start:
            update_fields["scheduled_start"] = scheduled_start
        if scheduled_end:
            update_fields["scheduled_end"] = scheduled_end
        if data.get('office'):
            update_fields["office"] = data['office'].strip()
        if meeting_link:
            update_fields["meeting_link"] = meeting_link
            update_fields["meeting_id"] = meeting_id_str
            update_fields["meeting_passcode"] = meeting_passcode
            update_fields["is_telehealth"] = True

        db.db.appointments.update_one(
            {"_id": appointment['_id']},
            {"$set": update_fields}
        )

        # Auto-create intakes record for intake_interview appointments so IC can see it in their queue
        try:
            if appointment.get('purpose') == 'intake_interview':
                existing_intake = db.db.intakes.find_one({'appointment_id': appointment['_id']})
                if not existing_intake:
                    student_doc = db.db.users.find_one({'_id': appointment.get('student_id')})
                    from datetime import timedelta as _td
                    db.db.intakes.insert_one({
                        'appointment_id': appointment['_id'],
                        'student_id': appointment.get('student_id'),
                        'counselor_id': counselor['_id'],
                        'source': 'online',
                        'status': 'PENDING',
                        'concern': appointment.get('concern', ''),
                        'risk_level': appointment.get('risk_level', 'GREEN'),
                        'is_emergency': False,
                        'responses': {'concern': appointment.get('concern', '')},
                        'created_at': datetime.utcnow(),
                        'deadline': (scheduled_start or datetime.utcnow()) + _td(days=3),
                    })
                    print(f"✓ Auto-created intakes record for intake_interview appointment {appointment['_id']}")
        except Exception as e:
            print(f"⚠ Auto-create intakes record error: {e}")

        # Auto-create 24h and 1h reminder records
        try:
            appt_time = scheduled_start or appointment.get('requested_start')
            if appt_time and isinstance(appt_time, datetime):
                student_doc = db.db.users.find_one({'_id': appointment.get('student_id')})
                s_email = student_doc.get('email', '') if student_doc else ''
                s_name = f"{student_doc.get('first_name','')} {student_doc.get('last_name','')}".strip() if student_doc else ''
                appt_time_str = appt_time.strftime('%B %d, %Y at %I:%M %p') + ' PHT'
                for label, offset in [('24h', timedelta(hours=_cfg('REMINDER_HOURS_24', 24))), ('1h', timedelta(hours=_cfg('REMINDER_HOURS_1', 1)))]:
                    if not db.db.reminders.find_one({'appointment_id': appointment['_id'], 'reminder_type': label}):
                        db.db.reminders.insert_one({
                            'appointment_id': appointment['_id'],
                            'student_id': appointment.get('student_id'),
                            'student_email': s_email,
                            'student_name': s_name,
                            'reminder_type': label,
                            'message': f"Reminder: Your counseling appointment is on {appt_time_str}.",
                            'scheduled_for': appt_time - offset,
                            'status': 'pending',
                            'auto_generated': True,
                            'created_at': datetime.utcnow(),
                        })
        except Exception as e:
            print(f"Auto-reminder creation error: {e}")

        # Send confirmation email
        try:
            student_doc = db.db.users.find_one({'_id': appointment.get('student_id')})
            if student_doc:
                s_email = student_doc.get('email', '')
                s_name = f"{student_doc.get('first_name','')} {student_doc.get('last_name','')}".strip()
                c_name = f"{counselor.get('first_name','')} {counselor.get('last_name','')}".strip()
                appt_display_time = (scheduled_start or appointment.get('requested_start'))
                if appt_display_time:
                    date_str = appt_display_time.strftime('%B %d, %Y')
                    time_str = appt_display_time.strftime('%I:%M %p') + ' PHT'
                else:
                    date_str = 'TBD'
                    time_str = 'TBD'
                preferred_platform_val = appointment.get('preferred_platform', '')
                platform_map = {'zoom': 'Zoom', 'google_meet': 'Google Meet', 'google-meet': 'Google Meet', 'in_person': 'In-Person', 'in-person': 'In-Person', 'phone': 'Phone', 'online': 'Online'}
                if preferred_method == 'online' and preferred_platform_val:
                    platform_label = platform_map.get(preferred_platform_val, preferred_platform_val.replace('-', ' ').title())
                else:
                    platform_label = platform_map.get(preferred_method, preferred_method or 'In-Person')

                meeting_section = ''
                if meeting_link:
                    meeting_section = f"""
                    <p style="margin:8px 0;"><strong>Meeting Link:</strong>
                      <a href="{meeting_link}" style="color:#1B5E20;">{meeting_link}</a></p>"""
                    if meeting_passcode:
                        meeting_section += f'<p style="margin:8px 0;"><strong>Passcode:</strong> {meeting_passcode}</p>'

                confirmation_html = f"""
                <html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
                  <div style="max-width:600px;margin:0 auto;padding:20px;">
                    <h2 style="color:#1B5E20;">Your Appointment is Confirmed</h2>
                    <p>Dear {s_name},</p>
                    <p>Your counseling appointment has been confirmed.</p>
                    <div style="background:#f5f5f5;padding:15px;margin:20px 0;border-radius:5px;border-left:4px solid #1B5E20;">
                      <h3 style="color:#1B5E20;margin-top:0;">Appointment Details</h3>
                      <p style="margin:8px 0;"><strong>Date:</strong> {date_str}</p>
                      <p style="margin:8px 0;"><strong>Time:</strong> {time_str}</p>
                      <p style="margin:8px 0;"><strong>Counselor:</strong> {c_name}</p>
                      <p style="margin:8px 0;"><strong>Format:</strong> {platform_label}</p>
                      {meeting_section}
                    </div>
                    <p>Please log in to the CPS portal to view your appointment details.</p>
                    <hr style="border:none;border-top:1px solid #ddd;margin:20px 0;">
                    <p style="color:#999;font-size:12px;text-align:center;">
                      {_email_footer()}
                    </p>
                  </div>
                </body></html>"""

                email_svc = EmailService()
                email_svc._send_email(s_email, f"CPS Appointment Confirmed — {date_str} at {time_str}", confirmation_html)
                print(f"✓ Confirmation email sent to {s_email}")

                # Notify counselor of new assignment
                c_email = counselor.get('email', '')
                if c_email:
                    counselor_html = f"""
                    <html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
                      <div style="max-width:600px;margin:0 auto;padding:20px;">
                        <h2 style="color:#1B5E20;">New Appointment Assigned</h2>
                        <p>Dear {c_name},</p>
                        <p>A new counseling appointment has been assigned to you.</p>
                        <div style="background:#f5f5f5;padding:15px;margin:20px 0;border-radius:5px;border-left:4px solid #1B5E20;">
                          <h3 style="color:#1B5E20;margin-top:0;">Appointment Details</h3>
                          <p style="margin:8px 0;"><strong>Student:</strong> {s_name}</p>
                          <p style="margin:8px 0;"><strong>Date:</strong> {date_str}</p>
                          <p style="margin:8px 0;"><strong>Time:</strong> {time_str}</p>
                          <p style="margin:8px 0;"><strong>Format:</strong> {platform_label}</p>
                          {meeting_section}
                        </div>
                        <p>Please log in to the CPS portal to view full details.</p>
                        <hr style="border:none;border-top:1px solid #ddd;margin:20px 0;">
                        <p style="color:#999;font-size:12px;text-align:center;">
                          {_email_footer()}
                        </p>
                      </div>
                    </body></html>"""
                    email_svc._send_email(c_email, f"New Appointment — {s_name} on {date_str} at {time_str}", counselor_html)
                    print(f"✓ Counselor notification sent to {c_email}")
        except Exception as e:
            print(f"⚠ Could not send confirmation email: {e}")

    audit_log(db.db, 'appointment', 'assign_counselor', entity_id=str(appointment['_id']), new_values={
        'counselor_id': str(counselor['_id']),
        'status': AppointmentStatus.CONFIRMED.value if data.get('counselor_id') else AppointmentStatus.MATCHED.value
    })

    return jsonify({
        'message': 'Counselor matched',
        'appointment_id': str(appointment['_id']),
        'counselor_id': str(counselor['_id']),
        'counselor_name': f"{counselor.get('first_name', '')} {counselor.get('last_name', '')}",
        'status': AppointmentStatus.CONFIRMED.value if data.get('counselor_id') else AppointmentStatus.MATCHED.value,
        'meeting_link': meeting_link if data.get('counselor_id') else None,
    }), 200


@appointments_bp.route('/<appointment_id>/auto-assign', methods=['POST'])
@jwt_required()
def trigger_auto_assign(appointment_id):
    """Manually trigger auto-assignment for an appointment"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.ASSIGN_CASES.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        apt_id = ObjectId(appointment_id)
        appointment = db.db.appointments.find_one({"_id": apt_id})
    except:
        appointment = db.db.appointments.find_one({"_id": appointment_id})
    
    if not appointment:
        return jsonify({'error': 'Appointment not found'}), 404
    
    # Trigger auto-assignment
    success, counselor_id, message = auto_assign_appointment(apt_id)
    
    if success:
        counselor = db.db.users.find_one({"_id": ObjectId(counselor_id)})
        return jsonify({
            'message': 'Auto-assignment successful',
            'appointment_id': str(apt_id),
            'counselor_id': counselor_id,
            'counselor_name': f"{counselor.get('first_name', '')} {counselor.get('last_name', '')}",
            'status': AppointmentStatus.MATCHED.value
        }), 200
    else:
        return jsonify({'error': message}), 409


@appointments_bp.route('/counselors', methods=['GET'])
@jwt_required()
def list_counselors():
    """Return active counselors and psychologists for student counselor-preference selection."""
    counselors = list(db.db.users.find(
        {'role': {'$in': ['COUNSELOR', 'PSYCHOLOGIST']}, 'is_active': True},
        {'first_name': 1, 'last_name': 1, 'role': 1, 'specialization': 1}
    ))
    result = []
    for c in counselors:
        result.append({
            'counselor_id': str(c['_id']),
            'name': f"{c.get('first_name', '')} {c.get('last_name', '')}".strip(),
            'role': c.get('role', 'COUNSELOR'),
            'specialization': c.get('specialization', ''),
        })
    return jsonify({'counselors': result}), 200


@appointments_bp.route('/open-slots', methods=['GET'])
@jwt_required()
def get_open_slots():
    """Return upcoming available counselor slots grouped by counselor, for student booking."""
    now = datetime.utcnow()
    days_ahead = int(request.args.get('days', 30))
    cutoff = now + timedelta(days=days_ahead)

    raw_slots = list(db.db.counselor_availability.find({
        'slot_start': {'$gt': now, '$lt': cutoff},
        'is_available': True,
    }).sort('slot_start', 1))

    open_slots = []
    for s in raw_slots:
        conflict = db.db.appointments.find_one({
            'counselor_id': s['counselor_id'],
            'status': {'$in': ['CONFIRMED', 'MATCHED', 'CHECKED_IN']},
            'scheduled_start': {'$lt': s['slot_end']},
            'scheduled_end':   {'$gt': s['slot_start']},
        })
        if not conflict:
            open_slots.append(s)

    counselor_map: dict = {}
    for s in open_slots:
        cid = str(s['counselor_id'])
        if cid not in counselor_map:
            counselor = db.db.users.find_one({'_id': s['counselor_id']})
            counselor_map[cid] = {
                'counselor_id': cid,
                'counselor_name': (f"{counselor.get('first_name','')} {counselor.get('last_name','')}".strip()
                                   if counselor else 'Unknown'),
                'slots': [],
            }
        counselor_map[cid]['slots'].append({
            'slot_id':    str(s['_id']),
            'slot_start': s['slot_start'].isoformat(),
            'slot_end':   s['slot_end'].isoformat(),
        })

    return jsonify({
        'counselors': list(counselor_map.values()),
        'total_slots': len(open_slots),
    }), 200


@appointments_bp.route('/availability', methods=['GET'])
@jwt_required()
def get_availability():
    """Get real-time slot availability (EPIC 4: Real-Time Slot Availability Engine)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    counselor_id = request.args.get('counselor_id')
    
    if not start_date or not end_date:
        return jsonify({'error': 'start_date and end_date are required'}), 400
    
    try:
        start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        # Strip timezone info for naive datetime comparison with MongoDB
        start = start.replace(tzinfo=None)
        end = end.replace(tzinfo=None)
    except ValueError:
        return jsonify({'error': 'Invalid datetime format'}), 400
    
    # Query availability slots - find overlapping intervals
    # A slot overlaps if: slot_start < end_date AND slot_end > start_date
    query = {
        "slot_start": {"$lt": end},
        "slot_end": {"$gt": start},
        "is_available": True
    }
    
    if counselor_id:
        try:
            query["counselor_id"] = ObjectId(counselor_id)
        except:
            query["counselor_id"] = counselor_id
    
    slots = list(db.db.counselor_availability.find(query))
    
    result_slots = []
    for s in slots:
        counselor = db.db.users.find_one({"_id": s.get('counselor_id')})
        result_slots.append({
            'slot_id': str(s['_id']),
            'counselor_id': str(s.get('counselor_id')),
            'counselor_name': f"{counselor.get('first_name', '')} {counselor.get('last_name', '')}" if counselor else None,
            'slot_start': s['slot_start'].isoformat() if isinstance(s['slot_start'], datetime) else s['slot_start'],
            'slot_end': s['slot_end'].isoformat() if isinstance(s['slot_end'], datetime) else s['slot_end']
        })
    
    return jsonify({
        'available_slots': result_slots,
        'total_slots': len(slots)
    }), 200


@appointments_bp.route('/validate-slot', methods=['POST'])
@jwt_required()
def validate_slot():
    """Validate if a requested slot conflicts with existing confirmed appointments"""
    user_id = get_jwt_identity()

    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403

    data = request.get_json() or {}
    counselor_id = data.get('counselor_id')
    start = data.get('start')
    end = data.get('end')

    if not counselor_id or not start or not end:
        return jsonify({'error': 'counselor_id, start, and end are required'}), 400

    try:
        start_dt = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end)
    except ValueError:
        return jsonify({'error': 'Invalid datetime format'}), 400

    try:
        cid = ObjectId(counselor_id)
    except:
        cid = counselor_id

    # Find overlapping confirmed appointments for counselor
    overlap_q = {
        'counselor_id': cid,
        'status': {'$in': [AppointmentStatus.CONFIRMED.value, AppointmentStatus.MATCHED.value]}
    }

    appointments = list(db.db.appointments.find(overlap_q))
    conflict = False
    for a in appointments:
        a_start = a.get('requested_start')
        a_end = a.get('requested_end')
        if isinstance(a_start, datetime) and isinstance(a_end, datetime):
            # overlap if start < a_end and end > a_start
            if start_dt < a_end and end_dt > a_start:
                conflict = True
                break

    return jsonify({'available': not conflict}), 200


@appointments_bp.route('/<appointment_id>/confirm', methods=['POST'])
@jwt_required()
def confirm_appointment(appointment_id):
    """Confirm appointment and send confirmation email with PDF (EPIC 4: Automated Appointment Confirmation)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        apt_id = ObjectId(appointment_id)
        appointment = db.db.appointments.find_one({"_id": apt_id})
    except:
        appointment = db.db.appointments.find_one({"_id": appointment_id})
    
    if not appointment:
        return jsonify({'error': 'Appointment not found'}), 404
    
    if not appointment.get('counselor_id'):
        return jsonify({'error': 'Counselor must be assigned before confirmation'}), 400
    
    db.db.appointments.update_one(
        {"_id": appointment['_id']},
        {"$set": {
            "status": AppointmentStatus.CONFIRMED.value,
            "confirmation_sent": True,
            "updated_at": datetime.utcnow()
        }}
    )

    # Auto-create 24h and 1h reminder records on confirmation
    try:
        appt_start = appointment.get('requested_start')
        if appt_start and isinstance(appt_start, datetime):
            student = db.db.users.find_one({'_id': appointment.get('student_id')})
            s_email = student.get('email', '') if student else ''
            s_name = f"{student.get('first_name','')} {student.get('last_name','')}".strip() if student else ''
            appt_time_str = appt_start.strftime('%B %d, %Y at %I:%M %p')
            for label, offset in [('24h', timedelta(hours=_cfg('REMINDER_HOURS_24', 24))), ('1h', timedelta(hours=_cfg('REMINDER_HOURS_1', 1)))]:
                if not db.db.reminders.find_one({'appointment_id': appointment['_id'], 'reminder_type': label}):
                    db.db.reminders.insert_one({
                        'appointment_id': appointment['_id'],
                        'student_id': appointment.get('student_id'),
                        'student_email': s_email,
                        'student_name': s_name,
                        'reminder_type': label,
                        'message': f"Reminder: Your counseling appointment is on {appt_time_str}.",
                        'scheduled_for': appt_start - offset,
                        'status': 'pending',
                        'auto_generated': True,
                        'created_at': datetime.utcnow(),
                    })
    except Exception as e:
        print(f"Auto-reminder creation error: {e}")

    # Prepare appointment data for email and PDF
    try:
        # Get student info
        student_id = appointment.get('student_id')
        student = db.db.users.find_one({"_id": student_id})
        
        # Get counselor info
        counselor_id = appointment.get('counselor_id')
        counselor = db.db.users.find_one({"_id": counselor_id}) if counselor_id else None
        
        # Format appointment details
        student_name = f"{student.get('first_name', '')} {student.get('last_name', '')}"
        student_email = student.get('email', '')
        student_id_str = student.get('student_id', 'N/A')
        student_contact = student.get('phone_number', student_email)
        
        counselor_name = f"{counselor.get('first_name', '')} {counselor.get('last_name', '')}" if counselor else "CPS Staff"
        
        # Format dates/times
        appointment_date = appointment.get('requested_start', datetime.utcnow()).strftime('%B %d, %Y')
        appointment_time = appointment.get('requested_start', datetime.utcnow()).strftime('%I:%M %p')
        
        # Get platform (format properly)
        platform = appointment.get('preferred_method', 'in-person')
        preferred_platform_val = appointment.get('preferred_platform', '')
        platform_map = {
            'in_person': 'In-Person',
            'in-person': 'In-Person',
            'google_meet': 'Google Meet',
            'google-meet': 'Google Meet',
            'zoom': 'Zoom',
            'phone': 'Phone',
            'online': 'Online',
        }
        if platform == 'online' and preferred_platform_val:
            platform = platform_map.get(preferred_platform_val, preferred_platform_val.replace('-', ' ').title())
        else:
            platform = platform_map.get((platform or '').lower(), platform or 'In-Person')
        
        # Prepare appointment data dict
        apt_start_dt = appointment.get('scheduled_start') or appointment.get('requested_start')
        apt_end_dt   = appointment.get('scheduled_end') or (apt_start_dt + timedelta(hours=1) if apt_start_dt else None)
        appointment_data = {
            'student_name': student_name,
            'student_id': student_id_str,
            'student_email': student_email,
            'student_contact': student_contact,
            'reference_id': str(appointment['_id']),
            'appointment_date': appointment_date,
            'appointment_time': appointment_time,
            'platform': platform,
            'counselor_name': counselor_name,
            'concern': appointment.get('concern', ''),
            'meeting_link': appointment.get('meeting_link', ''),
            'screenings_completed': [],
            'start_dt': apt_start_dt,
            'end_dt':   apt_end_dt,
        }
        
        # Try to generate PDF
        pdf_path = None
        try:
            temp_dir = os.path.join(current_app.root_path, 'temp_pdfs')
            os.makedirs(temp_dir, exist_ok=True)
            
            pdf_filename = f"CPS_Appointment_{student_id_str}_{appointment_date.replace(' ', '_').replace(',', '')}.pdf"
            pdf_path = os.path.join(temp_dir, pdf_filename)
            
            generate_appointment_confirmation_pdf(appointment_data, pdf_path)
            print(f"✓ PDF generated for appointment confirmation: {pdf_path}")
        except Exception as e:
            print(f"⚠ Could not generate PDF: {e}")
            pdf_path = None
        
        # Send confirmation email with PDF attachment
        try:
            email_service = EmailService()
            email_service.send_appointment_confirmation_email(
                recipient_email=student_email,
                student_name=student_name,
                appointment_details=appointment_data,
                pdf_file_path=pdf_path
            )
            print(f"✓ Confirmation email sent to {student_email}")
        except Exception as e:
            print(f"⚠ Could not send confirmation email: {e}")
        
        # Clean up PDF after sending (if it exists)
        if pdf_path and os.path.exists(pdf_path):
            try:
                os.remove(pdf_path)
                print(f"✓ Temporary PDF cleaned up: {pdf_path}")
            except:
                pass
    
    except Exception as e:
        print(f"⚠ Error sending confirmation: {e}")
        # Don't fail the appointment confirmation if email sending fails
    
    # Auto-sync to Google Calendar / create Meet link if counselor has calendar connected
    counselor_id = appointment.get('counselor_id')
    if counselor_id:
        try:
            from blueprints.google_calendar import sync_appointment_to_calendar
            calendar_event_id, meet_link = sync_appointment_to_calendar(str(counselor_id), appointment)
            save_fields = {}
            if calendar_event_id:
                save_fields['calendar_event_id'] = calendar_event_id
            if meet_link and not appointment.get('meeting_link'):
                save_fields['meeting_link']  = meet_link
                save_fields['is_telehealth'] = True
                print(f"✓ Google Meet created on confirm: {meet_link}")
            if save_fields:
                db.db.appointments.update_one({"_id": appointment['_id']}, {"$set": save_fields})
        except Exception as e:
            print(f"Calendar sync error: {str(e)}")
    
    audit_log(db.db, 'appointment', 'confirm', entity_id=str(appointment['_id']), new_values={
        'status': AppointmentStatus.CONFIRMED.value
    })
    
    return jsonify({
        'message': 'Appointment confirmed',
        'appointment_id': str(appointment['_id']),
        'status': AppointmentStatus.CONFIRMED.value
    }), 200


@appointments_bp.route('/<appointment_id>/remind', methods=['POST'])
@jwt_required()
def send_reminder(appointment_id):
    """Send appointment reminder (EPIC 4: SMS/Email Reminder System)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        apt_id = ObjectId(appointment_id)
        appointment = db.db.appointments.find_one({"_id": apt_id})
    except:
        appointment = db.db.appointments.find_one({"_id": appointment_id})
    
    if not appointment:
        return jsonify({'error': 'Appointment not found'}), 404
    
    if appointment.get('status') not in [AppointmentStatus.CONFIRMED.value]:
        return jsonify({'error': 'Can only send reminders for confirmed appointments'}), 400
    
    # In production, integrate with SMS/Email service here
    db.db.appointments.update_one(
        {"_id": appointment['_id']},
        {"$set": {"reminder_sent": True, "updated_at": datetime.utcnow()}}
    )
    
    audit_log(db.db, 'appointment', 'reminder_sent', entity_id=str(appointment['_id']))
    
    return jsonify({
        'message': 'Reminder sent',
        'appointment_id': str(appointment['_id'])
    }), 200


@appointments_bp.route('/<appointment_id>/mark-no-show', methods=['POST'])
@jwt_required()
def mark_no_show(appointment_id):
    """Mark appointment as no-show (EPIC 4: Missed Appointment Tracker)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        apt_id = ObjectId(appointment_id)
        appointment = db.db.appointments.find_one({"_id": apt_id})
    except:
        appointment = db.db.appointments.find_one({"_id": appointment_id})
    
    if not appointment:
        return jsonify({'error': 'Appointment not found'}), 404

    # Guard: only active appointments can be marked no-show
    current_status = appointment.get('status', '')
    terminal_statuses = {
        AppointmentStatus.COMPLETED.value,
        AppointmentStatus.CANCELLED.value,
        AppointmentStatus.NO_SHOW.value,
        AppointmentStatus.CLOSED_AT_INTAKE.value,
        AppointmentStatus.DENIED.value,
    }
    if current_status in terminal_statuses:
        return jsonify({'error': f'Cannot mark no-show: appointment is already {current_status}'}), 400

    now = datetime.utcnow()
    db.db.appointments.update_one(
        {"_id": appointment['_id']},
        {"$set": {"status": AppointmentStatus.NO_SHOW.value, "updated_at": now}}
    )

    # ── Consecutive no-show tracking per case ──────────────────────────────
    case_id = appointment.get('case_id')
    consecutive = 0
    auto_terminated = False

    if case_id:
        tracker = db.db.missed_appointment_tracker.find_one({"case_id": case_id})
        if tracker:
            consecutive = tracker.get('consecutive_no_shows', 0) + 1
            db.db.missed_appointment_tracker.update_one(
                {"_id": tracker['_id']},
                {"$inc": {"no_show_count": 1, "consecutive_no_shows": 1},
                 "$set": {"last_no_show_at": now}}
            )
        else:
            consecutive = 1
            db.db.missed_appointment_tracker.insert_one({
                "case_id": case_id,
                "appointment_id": appointment['_id'],
                "no_show_count": 1,
                "consecutive_no_shows": 1,
                "last_no_show_at": now,
                "created_at": now,
            })

        # After 3 consecutive no-shows → administrative termination (per CPS flowchart)
        if consecutive >= 3:
            auto_terminated = True
            try:
                db.db.cases.update_one(
                    {'_id': ObjectId(str(case_id))},
                    {'$set': {
                        'case_status': CaseStatus.PENDING_TERMINATION.value,
                        'termination_type': TerminationType.ADMINISTRATIVE.value,
                        'termination_reason': '3 consecutive no-shows. Administrative termination per CPS protocol.',
                        'admin_termination_flagged_at': now,
                        'updated_at': now,
                    }}
                )
                db.db.notifications.insert_one({
                    'type': 'ADMIN_TERMINATION',
                    'case_id': case_id,
                    'appointment_id': str(appointment['_id']),
                    'message': '3 consecutive no-shows recorded. Case flagged for administrative termination.',
                    'target_user_id': appointment.get('counselor_id'),
                    'read': False,
                    'created_at': now,
                })
            except Exception:
                pass

    # Track total no-show count on student record
    student_id = appointment.get('student_id')
    if student_id:
        db.db.users.update_one({'_id': student_id}, {'$inc': {'no_show_count': 1}})
        updated_student = db.db.users.find_one({'_id': student_id})
        if updated_student and updated_student.get('no_show_count', 0) >= _cfg('NO_SHOW_THRESHOLD', 3):
            db.db.users.update_one({'_id': student_id}, {'$set': {'no_show_flagged': True}})

    audit_log(db.db, 'appointment', 'mark_no_show', entity_id=str(appointment['_id']),
              new_values={'status': AppointmentStatus.NO_SHOW.value, 'consecutive_no_shows': consecutive})

    return jsonify({
        'message': 'Appointment marked as no-show',
        'appointment_id': str(appointment['_id']),
        'consecutive_no_shows': consecutive,
        'auto_terminated': auto_terminated,
        'warning': '3 consecutive no-shows — case flagged for administrative termination.' if auto_terminated else None,
    }), 200


# ---------------------------------------------------------------------------
# Student self-scheduling after IC endorsement
# ---------------------------------------------------------------------------

@appointments_bp.route('/pending-session', methods=['GET'])
@jwt_required()
def get_pending_session():
    """Return the student's endorsed appointment that still needs a time to be scheduled."""
    user_id = get_jwt_identity()
    try:
        user_id_obj = ObjectId(user_id)
    except Exception:
        return jsonify({'error': 'Invalid user'}), 400

    user = db.db.users.find_one({'_id': user_id_obj})
    if not user or user.get('role', '').upper() != 'STUDENT':
        return jsonify({'pending_session': None}), 200

    # Find cases for this student
    cases = list(db.db.cases.find({'student_id': user_id_obj}))
    case_ids = [c['_id'] for c in cases]
    if not case_ids:
        return jsonify({'pending_session': None}), 200

    appt = db.db.appointments.find_one({
        'case_id': {'$in': case_ids},
        'source': 'endorsed',
        'status': AppointmentStatus.REQUESTED.value,
        '$or': [
            {'requested_start': None},
            {'requested_start': {'$exists': False}},
        ],
        'counselor_id': {'$exists': True, '$ne': None},
    })

    if not appt:
        return jsonify({'pending_session': None}), 200

    # Enrich with counselor info
    counselor = db.db.users.find_one({'_id': appt['counselor_id']}) if appt.get('counselor_id') else None
    counselor_name = (
        f"{counselor.get('first_name','')} {counselor.get('last_name','')}".strip()
        if counselor else 'Your Counselor'
    )
    counselor_role = counselor.get('role', 'COUNSELOR') if counselor else 'COUNSELOR'

    return jsonify({
        'pending_session': {
            'appointment_id': str(appt['_id']),
            'counselor_id': str(appt['counselor_id']),
            'counselor_name': counselor_name,
            'counselor_role': counselor_role,
            'concern': appt.get('concern', ''),
            'risk_level': appt.get('risk_level', 'GREEN'),
        }
    }), 200


@appointments_bp.route('/counselor-slots', methods=['GET'])
@jwt_required()
def get_counselor_slots():
    """Return open 1-hour slots for a specific counselor on a given date (for student self-scheduling)."""
    counselor_id_str = request.args.get('counselor_id')
    date_str = request.args.get('date')
    if not counselor_id_str or not date_str:
        return jsonify({'error': 'counselor_id and date are required'}), 400

    try:
        target_date = datetime.strptime(date_str, '%Y-%m-%d')
        counselor_oid = ObjectId(counselor_id_str)
    except Exception:
        return jsonify({'error': 'Invalid counselor_id or date format (YYYY-MM-DD)'}), 400

    counselor = db.db.users.find_one({'_id': counselor_oid})
    if not counselor:
        return jsonify({'error': 'Counselor not found'}), 404

    # Early-exit: declared university holiday
    holiday = db.db.holidays.find_one({'date': date_str})
    if holiday:
        return jsonify({'slots': [], 'date': date_str,
                        'is_holiday': True, 'holiday_name': holiday['name']}), 200

    # Early-exit: counselor has marked this date as leave
    leave = db.db.counselor_leaves.find_one({'counselor_id': counselor_oid, 'date': date_str})
    if leave:
        return jsonify({'slots': [], 'date': date_str, 'is_leave': True}), 200

    SLOT_DURATION = 60  # minutes
    dow = target_date.weekday()

    doc = db.db.counselor_availability.find_one({'counselor_id': counselor_oid})
    if not doc or not doc.get('schedule'):
        return jsonify({'slots': [], 'date': date_str}), 200

    working = next((e for e in doc['schedule'] if e.get('day_of_week') == dow), None)
    if not working:
        return jsonify({'slots': [], 'date': date_str}), 200

    sh, sm = map(int, working['start_time'].split(':'))
    eh, em = map(int, working['end_time'].split(':'))
    cursor = target_date.replace(hour=sh, minute=sm, second=0, microsecond=0)
    day_end = target_date.replace(hour=eh, minute=em, second=0, microsecond=0)

    all_slots = []
    while cursor + timedelta(minutes=SLOT_DURATION) <= day_end:
        all_slots.append(cursor)
        cursor += timedelta(minutes=SLOT_DURATION)

    # Exclude slots in the past
    now = datetime.utcnow()
    all_slots = [s for s in all_slots if s > now]

    # Exclude already-booked slots
    day_start_dt = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end_dt   = target_date.replace(hour=23, minute=59, second=59)
    booked = list(db.db.appointments.find({
        'counselor_id': counselor_oid,
        'status': {'$in': ['REQUESTED', 'CONFIRMED', 'APPROVED', 'MATCHED', 'PENDING_STUDENT_APPROVAL', 'CHECKED_IN']},
        '$or': [
            {'scheduled_start': {'$gte': day_start_dt, '$lte': day_end_dt}},
            {'requested_start':  {'$gte': day_start_dt, '$lte': day_end_dt}},
        ],
    }))

    def is_booked(slot_dt):
        slot_end = slot_dt + timedelta(minutes=SLOT_DURATION)
        for apt in booked:
            apt_start = apt.get('scheduled_start') or apt.get('requested_start')
            if not apt_start:
                continue
            if isinstance(apt_start, str):
                try:
                    apt_start = datetime.fromisoformat(apt_start)
                except Exception:
                    continue
            apt_end = apt_start + timedelta(minutes=SLOT_DURATION)
            if slot_dt < apt_end and slot_end > apt_start:
                return True
        return False

    free_slots = [s.strftime('%H:%M') for s in all_slots if not is_booked(s)]
    return jsonify({'slots': free_slots, 'date': date_str}), 200


@appointments_bp.route('/<appointment_id>/student-pick-slot', methods=['POST'])
@jwt_required()
def student_pick_slot(appointment_id):
    """Student picks a time slot for their endorsed counseling appointment. Auto-confirms."""
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    date_str = data.get('date')   # YYYY-MM-DD
    time_str = data.get('time')   # HH:MM
    if not date_str or not time_str:
        return jsonify({'error': 'date and time are required'}), 400

    try:
        apt_id = ObjectId(appointment_id)
        user_id_obj = ObjectId(user_id)
        scheduled_start = datetime.strptime(f"{date_str} {time_str}", '%Y-%m-%d %H:%M')
        scheduled_end = scheduled_start + timedelta(minutes=60)
    except Exception:
        return jsonify({'error': 'Invalid input'}), 400

    appt = db.db.appointments.find_one({'_id': apt_id})
    if not appt:
        return jsonify({'error': 'Appointment not found'}), 404

    # Verify student owns this appointment via their case
    cases = list(db.db.cases.find({'student_id': user_id_obj}))
    case_ids = [c['_id'] for c in cases]
    if appt.get('case_id') not in case_ids:
        return jsonify({'error': 'Not authorised'}), 403

    if appt.get('status') != AppointmentStatus.REQUESTED.value:
        return jsonify({'error': 'This appointment is no longer available for scheduling'}), 409

    # Check slot is still free for counselor
    counselor_id = appt.get('counselor_id')
    if counselor_id:
        conflict = db.db.appointments.find_one({
            'counselor_id': counselor_id,
            '_id': {'$ne': apt_id},
            'status': {'$in': ['REQUESTED', 'CONFIRMED', 'APPROVED', 'MATCHED', 'CHECKED_IN']},
            '$or': [
                {'scheduled_start': {'$lt': scheduled_end, '$gt': scheduled_start - timedelta(minutes=60)}},
                {'requested_start':  {'$lt': scheduled_end, '$gt': scheduled_start - timedelta(minutes=60)}},
            ],
        })
        if conflict:
            return jsonify({'error': 'That slot was just taken. Please pick another time.'}), 409

    # Re-check conflict one final time immediately before writing (closes TOCTOU window)
    if counselor_id:
        conflict = db.db.appointments.find_one({
            'counselor_id': counselor_id,
            '_id': {'$ne': apt_id},
            'status': {'$in': ['REQUESTED', 'CONFIRMED', 'APPROVED', 'MATCHED', 'CHECKED_IN']},
            '$or': [
                {'scheduled_start': {'$lt': scheduled_end, '$gt': scheduled_start - timedelta(minutes=60)}},
                {'requested_start':  {'$lt': scheduled_end, '$gt': scheduled_start - timedelta(minutes=60)}},
            ],
        })
        if conflict:
            return jsonify({'error': 'That slot was just taken. Please pick another time.'}), 409

    # Conditional update — only modifies the appointment if it is still REQUESTED,
    # acting as an optimistic lock against concurrent picks of the same appointment.
    result = db.db.appointments.update_one(
        {'_id': apt_id, 'status': AppointmentStatus.REQUESTED.value},
        {'$set': {
            'requested_start':  scheduled_start,
            'scheduled_start':  scheduled_start,
            'scheduled_end':    scheduled_end,
            'status':           AppointmentStatus.CONFIRMED.value,
            'scheduled_by':     'student',
            'updated_at':       datetime.utcnow(),
        }}
    )
    if result.matched_count == 0:
        return jsonify({'error': 'This appointment was just claimed by another request. Please try again.'}), 409

    audit_log(db.db, 'appointments', 'student_scheduled', entity_id=str(apt_id),
              new_values={'scheduled_start': scheduled_start.isoformat(), 'scheduled_by': 'student'})

    # Notify counselor
    counselor = db.db.users.find_one({'_id': counselor_id}) if counselor_id else None
    student  = db.db.users.find_one({'_id': user_id_obj})
    if counselor and student:
        try:
            from services.email_service import send_email
            student_name = f"{student.get('first_name','')} {student.get('last_name','')}".strip()
            slot_str = scheduled_start.strftime('%B %d, %Y at %I:%M %p')
            send_email(
                to=counselor.get('email', ''),
                subject=f'New session scheduled — {student_name}',
                body=(
                    f"Dear {counselor.get('first_name','')},\n\n"
                    f"{student_name} has scheduled a counseling session with you on {slot_str}.\n\n"
                    f"Please log in to the CPS portal to view the session details.\n\nCPS System"
                ),
            )
        except Exception as e:
            print(f'[student-pick-slot] email error: {e}')

    return jsonify({
        'message': 'Session scheduled successfully.',
        'scheduled_start': scheduled_start.isoformat(),
        'status': AppointmentStatus.CONFIRMED.value,
    }), 200


@appointments_bp.route('/<appointment_id>/complete', methods=['POST'])
@jwt_required()
def complete_appointment(appointment_id):
    """Mark appointment as completed"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        apt_id = ObjectId(appointment_id)
        appointment = db.db.appointments.find_one({"_id": apt_id})
    except:
        appointment = db.db.appointments.find_one({"_id": appointment_id})
    
    if not appointment:
        return jsonify({'error': 'Appointment not found'}), 404

    # Guard: only sessions that actually took place can be marked completed
    completable = {
        AppointmentStatus.CONFIRMED.value,
        AppointmentStatus.APPROVED.value,
        AppointmentStatus.MATCHED.value,
        AppointmentStatus.CHECKED_IN.value,
        AppointmentStatus.EVALUATION.value,
        AppointmentStatus.FOLLOW_UP.value,
    }
    if appointment.get('status') not in completable:
        return jsonify({'error': f"Cannot complete appointment with status {appointment.get('status')}"}), 400

    actual_start = appointment.get('scheduled_start') or appointment.get('requested_start') or datetime.utcnow()
    actual_end = appointment.get('scheduled_end') or appointment.get('requested_end') or datetime.utcnow()

    now_complete = datetime.utcnow()
    db.db.appointments.update_one(
        {"_id": appointment['_id']},
        {"$set": {
            "status": AppointmentStatus.COMPLETED.value,
            "actual_start": actual_start,
            "actual_end": actual_end,
            "completed_at": now_complete,
            "updated_at": now_complete,
        }}
    )

    # Reset consecutive no-show counter — student attended
    case_id_c = appointment.get('case_id')
    if case_id_c:
        db.db.missed_appointment_tracker.update_one(
            {"case_id": case_id_c},
            {"$set": {"consecutive_no_shows": 0, "last_attended_at": now_complete}},
            upsert=False,
        )

    return jsonify({
        'message': 'Appointment completed',
        'appointment_id': str(appointment['_id']),
        'status': AppointmentStatus.COMPLETED.value
    }), 200


@appointments_bp.route('/<appointment_id>/check-in', methods=['POST'])
@jwt_required()
def check_in_appointment(appointment_id):
    """Mark student as checked-in (arrived at the office). Staff/counselor action."""
    user_id = get_jwt_identity()
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403

    try:
        apt = db.db.appointments.find_one({'_id': ObjectId(appointment_id)})
    except Exception:
        return jsonify({'error': 'Invalid appointment ID'}), 400

    if not apt:
        return jsonify({'error': 'Appointment not found'}), 404

    allowed = {
        AppointmentStatus.CONFIRMED.value,
        AppointmentStatus.APPROVED.value,
        AppointmentStatus.MATCHED.value,
    }
    if apt.get('status') not in allowed:
        return jsonify({'error': f"Cannot check in from status {apt.get('status')}"}), 400

    now = datetime.utcnow()
    db.db.appointments.update_one(
        {'_id': apt['_id']},
        {'$set': {'status': AppointmentStatus.CHECKED_IN.value, 'checked_in_at': now, 'updated_at': now}}
    )

    audit_log(db.db, 'appointment', 'check_in', entity_id=str(apt['_id']),
              new_values={'status': AppointmentStatus.CHECKED_IN.value})

    return jsonify({
        'message': 'Student checked in',
        'appointment_id': str(apt['_id']),
        'status': AppointmentStatus.CHECKED_IN.value,
        'checked_in_at': now.isoformat(),
    }), 200


@appointments_bp.route('/<appointment_id>/set-evaluation', methods=['POST'])
@jwt_required()
def set_evaluation(appointment_id):
    """Staff: session is done — move to EVALUATION so student fills survey."""
    user_id = get_jwt_identity()
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403

    try:
        apt_id = ObjectId(appointment_id)
        apt = db.db.appointments.find_one({'_id': apt_id})
    except Exception:
        apt = db.db.appointments.find_one({'_id': appointment_id})

    if not apt:
        return jsonify({'error': 'Appointment not found'}), 404

    allowed = {AppointmentStatus.CONFIRMED.value, AppointmentStatus.APPROVED.value,
               AppointmentStatus.MATCHED.value}
    if apt.get('status') not in allowed:
        return jsonify({'error': f"Cannot move to evaluation from status {apt.get('status')}"}), 400

    now = datetime.utcnow()
    db.db.appointments.update_one(
        {'_id': apt['_id']},
        {'$set': {'status': AppointmentStatus.COMPLETED.value, 'updated_at': now, 'completed_at': now}}
    )

    # Reset consecutive no-show counter — student attended
    case_id = apt.get('case_id')
    if case_id:
        db.db.missed_appointment_tracker.update_one(
            {"case_id": case_id},
            {"$set": {"consecutive_no_shows": 0, "last_attended_at": now}},
            upsert=False
        )

    return jsonify({'message': 'Session marked complete', 'status': AppointmentStatus.COMPLETED.value}), 200


@appointments_bp.route('/<appointment_id>/set-follow-up', methods=['POST'])
@jwt_required()
def set_follow_up(appointment_id):
    """Counselor/staff: schedule a follow-up session.

    Creates a new CONFIRMED appointment linked to the same case and student,
    pre-assigned to the same counselor. Requires scheduled_start (ISO string).
    Also marks the current appointment as FOLLOW_UP so the record is clear.
    """
    user_id = get_jwt_identity()
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403

    try:
        apt_id = ObjectId(appointment_id)
        apt = db.db.appointments.find_one({'_id': apt_id})
    except Exception:
        apt = db.db.appointments.find_one({'_id': appointment_id})

    if not apt:
        return jsonify({'error': 'Appointment not found'}), 404

    data = request.get_json() or {}

    if not data.get('scheduled_start'):
        return jsonify({'error': 'scheduled_start is required to schedule a follow-up.'}), 400

    try:
        sched_start = datetime.fromisoformat(data['scheduled_start'].replace('Z', '+00:00')).replace(tzinfo=None)
        sched_end = sched_start + timedelta(minutes=60)
    except Exception:
        return jsonify({'error': 'Invalid scheduled_start format. Use ISO 8601.'}), 400

    # Conflict check — ensure the counselor has no overlapping appointment at the requested time
    counselor_id = apt.get('counselor_id')
    if counselor_id and has_conflicting_appointment(counselor_id, sched_start, sched_end):
        return jsonify({
            'error': 'The selected time conflicts with another appointment for this counselor. Please choose a different time.'
        }), 409

    now = datetime.utcnow()

    # Mark the current appointment as COMPLETED (follow-up link is carried on the new appointment)
    db.db.appointments.update_one(
        {'_id': apt['_id']},
        {'$set': {'status': AppointmentStatus.COMPLETED.value, 'updated_at': now,
                  'completed_at': now, 'follow_up_notes': data.get('notes', ''),
                  'follow_up_scheduled_at': now}}
    )

    # Generate counseling_id for new appointment
    import random, string
    new_counseling_id = 'FU-' + ''.join(random.choices(string.digits, k=6))

    # Build new follow-up appointment (same case, student, counselor)
    new_apt = {
        'counseling_id': new_counseling_id,
        'case_id': apt.get('case_id'),
        'student_id': apt.get('student_id'),
        'student_name': apt.get('student_name', ''),
        'student_email': apt.get('student_email', ''),
        'counselor_id': apt.get('counselor_id'),
        'counselor_name': apt.get('counselor_name', ''),
        'status': AppointmentStatus.CONFIRMED.value,
        'purpose': 'follow_up_counselling',
        'concern': data.get('notes', apt.get('concern', '')),
        'preferred_method': apt.get('preferred_method', 'in-person'),
        'preferred_platform': apt.get('preferred_platform'),
        'method': apt.get('preferred_method', 'in-person'),
        'office': data.get('office', apt.get('office', '')),
        'scheduled_start': sched_start,
        'scheduled_end': sched_end,
        'is_follow_up': True,
        'parent_appointment_id': apt['_id'],
        'created_at': now,
        'updated_at': now,
        'confirmation_sent': True,
    }
    result = db.db.appointments.insert_one(new_apt)
    new_apt_id = str(result.inserted_id)
    new_apt['_id'] = result.inserted_id

    # Sync to Google Calendar
    try:
        if apt.get('counselor_id'):
            from blueprints.google_calendar import sync_appointment_to_calendar
            cal_event_id, meet_link = sync_appointment_to_calendar(str(apt['counselor_id']), new_apt)
            if cal_event_id:
                db.db.appointments.update_one({'_id': result.inserted_id}, {'$set': {'calendar_event_id': cal_event_id}})
                if meet_link:
                    db.db.appointments.update_one({'_id': result.inserted_id}, {'$set': {'meeting_link': meet_link}})
    except Exception as cal_err:
        print(f"⚠ Follow-up calendar sync failed: {cal_err}")

    # Email student with follow-up details
    try:
        student_doc = db.db.users.find_one({'_id': apt.get('student_id')})
        counselor_doc = db.db.users.find_one({'_id': apt.get('counselor_id')}) if apt.get('counselor_id') else None
        if student_doc and student_doc.get('email'):
            from services.email_service import EmailService
            pref_method   = apt.get('preferred_method', 'in-person')
            pref_platform = apt.get('preferred_platform', '')
            platform_map  = {'google_meet': 'Google Meet', 'google-meet': 'Google Meet',
                             'zoom': 'Zoom', 'in_person': 'In-Person', 'in-person': 'In-Person'}
            if pref_method == 'online' and pref_platform:
                platform_label = platform_map.get(pref_platform, pref_platform.replace('-', ' ').title())
            else:
                platform_label = platform_map.get(pref_method, pref_method.replace('-', ' ').title())
            c_name = f"{counselor_doc.get('first_name','')} {counselor_doc.get('last_name','')}".strip() if counselor_doc else 'Your Counselor'
            s_name = f"{student_doc.get('first_name','')} {student_doc.get('last_name','')}".strip()
            EmailService().send_appointment_confirmation_email(
                recipient_email=student_doc['email'],
                student_name=s_name,
                appointment_details={
                    'reference_id':      new_counseling_id,
                    'appointment_date':  sched_start.strftime('%B %d, %Y'),
                    'appointment_time':  sched_start.strftime('%I:%M %p') + ' PHT',
                    'platform':          platform_label,
                    'counselor_name':    c_name,
                    'concern':           new_apt.get('concern', ''),
                    'meeting_link':      new_apt.get('meeting_link', ''),
                    'start_dt':          sched_start,
                    'end_dt':            sched_end,
                },
            )
            print(f"✓ Follow-up confirmation email sent to {student_doc['email']}")
    except Exception as email_err:
        print(f"⚠ Follow-up email failed: {email_err}")

    return jsonify({
        'message': 'Follow-up session scheduled.',
        'new_appointment_id': new_apt_id,
        'new_counseling_id': new_counseling_id,
        'scheduled_start': sched_start.isoformat(),
        'status': AppointmentStatus.CONFIRMED.value,
    }), 200


@appointments_bp.route('/<appointment_id>/set-referral', methods=['POST'])
@jwt_required()
def set_referral_status(appointment_id):
    """Staff: mark appointment as referral."""
    user_id = get_jwt_identity()
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403

    try:
        apt_id = ObjectId(appointment_id)
        apt = db.db.appointments.find_one({'_id': apt_id})
    except Exception:
        apt = db.db.appointments.find_one({'_id': appointment_id})

    if not apt:
        return jsonify({'error': 'Appointment not found'}), 404

    data = request.get_json() or {}
    update = {'status': AppointmentStatus.REFERRAL.value, 'updated_at': datetime.utcnow()}
    if data.get('notes'):
        update['referral_notes'] = data['notes']

    db.db.appointments.update_one({'_id': apt['_id']}, {'$set': update})
    return jsonify({'message': 'Marked as referral', 'status': AppointmentStatus.REFERRAL.value}), 200


@appointments_bp.route('/<appointment_id>/submit-evaluation', methods=['POST'])
@jwt_required()
def submit_evaluation(appointment_id):
    """Student submits post-session evaluation survey."""
    user_id = get_jwt_identity()

    try:
        apt_id = ObjectId(appointment_id)
        apt = db.db.appointments.find_one({'_id': apt_id})
    except Exception:
        apt = db.db.appointments.find_one({'_id': appointment_id})

    if not apt:
        return jsonify({'error': 'Appointment not found'}), 404

    if str(apt.get('student_id', '')) != str(user_id):
        return jsonify({'error': 'Not your appointment'}), 403

    allowed_statuses = {AppointmentStatus.EVALUATION.value, AppointmentStatus.COMPLETED.value}
    if apt.get('status') not in allowed_statuses:
        return jsonify({'error': 'Appointment is not in evaluation status'}), 400
    if apt.get('status') == AppointmentStatus.COMPLETED.value and apt.get('evaluation'):
        return jsonify({'error': 'Evaluation already submitted'}), 400

    data = request.get_json() or {}
    ratings = data.get('ratings', {})
    evaluation = {
        'counselor_attitude': int(ratings.get('counselor_attitude', 0)),
        'online_communication': int(ratings.get('online_communication', 0)),
        'counseling_objectives': int(ratings.get('counseling_objectives', 0)),
        'techniques_used': int(ratings.get('techniques_used', 0)),
        'overall_experience': int(ratings.get('overall_experience', 0)),
        'liked_most': data.get('liked_most', '').strip(),
        'to_improve': data.get('to_improve', '').strip(),
        'submitted_at': datetime.utcnow(),
    }

    db.db.appointments.update_one(
        {'_id': apt['_id']},
        {'$set': {
            'evaluation': evaluation,
            'status': AppointmentStatus.COMPLETED.value,
            'completed_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        }}
    )
    return jsonify({'message': 'Evaluation submitted. Thank you!', 'status': AppointmentStatus.COMPLETED.value}), 200


@appointments_bp.route('/<appointment_id>/evaluation', methods=['GET'])
@jwt_required()
def get_evaluation(appointment_id):
    """Get evaluation data for an appointment."""
    user_id = get_jwt_identity()
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403

    try:
        apt_id = ObjectId(appointment_id)
        apt = db.db.appointments.find_one({'_id': apt_id})
    except Exception:
        apt = db.db.appointments.find_one({'_id': appointment_id})

    if not apt:
        return jsonify({'error': 'Appointment not found'}), 404

    return jsonify({'evaluation': apt.get('evaluation'), 'appointment_id': appointment_id}), 200


@appointments_bp.route('/<case_id>/upcoming', methods=['GET'])
@jwt_required()
def get_upcoming_appointments(case_id):
    """Get upcoming appointments for a case"""
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
    
    now = datetime.utcnow()
    appointments = list(db.db.appointments.find({
        "case_id": case['_id'],
        "requested_start": {"$gte": now},
        "status": {"$ne": AppointmentStatus.CANCELLED.value}
    }).sort("requested_start", 1))
    
    result_appointments = []
    for a in appointments:
        counselor = db.db.users.find_one({"_id": a.get('counselor_id')}) if a.get('counselor_id') else None
        result_appointments.append({
            'appointment_id': str(a['_id']),
            'appointment_type': a.get('appointment_type'),
            'counselor': f"{counselor.get('first_name', '')} {counselor.get('last_name', '')}" if counselor else "Not assigned",
            'requested_start': a['requested_start'].isoformat() if isinstance(a['requested_start'], datetime) else a['requested_start'],
            'requested_end': a['requested_end'].isoformat() if isinstance(a['requested_end'], datetime) else a['requested_end'],
            'status': a.get('status')
        })
    
    return jsonify({
        'case_id': str(case['_id']),
        'upcoming_appointments': result_appointments
    }), 200


# ============= GOOGLE CALENDAR INTEGRATION =============

@appointments_bp.route('/google/authorize', methods=['GET'])
@jwt_required()
def get_google_authorization_url():
    """Get Google OAuth authorization URL for staff"""
    from integrations.google import GoogleIntegration
    import secrets
    
    user_id = get_jwt_identity()
    state = secrets.token_urlsafe(32)
    
    # Store state in database for verification
    db.db.oauth_states.insert_one({
        'user_id': ObjectId(user_id),
        'state': state,
        'created_at': datetime.utcnow(),
        'expires_at': datetime.utcnow() + timedelta(minutes=10)
    })
    
    google = GoogleIntegration(current_app.config)
    auth_url = google.get_authorize_url(state=state)
    
    return jsonify({
        'auth_url': auth_url,
        'message': 'Visit this URL to authorize Google Calendar access'
    }), 200


@appointments_bp.route('/google/callback', methods=['GET'])
def google_oauth_callback():
    """Handle Google OAuth callback"""

    from integrations.google import GoogleIntegration
    
    code = request.args.get('code')
    state = request.args.get('state')
    
    if not code or not state:
        return redirect(f'/dashboard/staff-settings?error=Missing+code+or+state')
    
    # Verify state
    oauth_state = db.db.oauth_states.find_one({'state': state})
    if not oauth_state:
        return redirect(f'/dashboard/staff-settings?error=Invalid+state+parameter')
    
    if oauth_state['expires_at'] < datetime.utcnow():
        return redirect(f'/dashboard/staff-settings?error=State+expired')
    
    user_id = oauth_state['user_id']
    
    # Exchange code for tokens
    google = GoogleIntegration(current_app.config)
    try:
        google.exchange_code_and_store(db.db, current_app.config, user_id, code)
        
        # Delete used state
        db.db.oauth_states.delete_one({'state': state})
        
        # Redirect to success page
        return redirect(f'/dashboard/staff-settings?success=Google+Calendar+connected')
    except Exception as e:
        return redirect(f'/dashboard/staff-settings?error={str(e)}')


@appointments_bp.route('/<appointment_id>/sync-to-calendar', methods=['POST'])
@jwt_required()
def sync_appointment_to_calendar(appointment_id):
    """Sync appointment to counselor's Google Calendar"""
    from integrations.google import GoogleIntegration
    from integrations.token_store import get_tokens
    
    user_id = get_jwt_identity()
    user = db.db.users.find_one({'_id': ObjectId(user_id)})
    
    if not user:
        return jsonify({'error': 'User not found'}), 401
    
    try:
        appointment = db.db.appointments.find_one({'_id': ObjectId(appointment_id)})
    except:
        return jsonify({'error': 'Invalid appointment ID'}), 400
    
    if not appointment:
        return jsonify({'error': 'Appointment not found'}), 404
    
    # Check if counselor has Google Calendar connected
    google_tokens = get_tokens(db.db, current_app.config, user_id, 'google')
    if not google_tokens or not google_tokens.get('access_token'):
        return jsonify({
            'error': 'Google Calendar not connected',
            'auth_url': f'/api/appointments/google/authorize'
        }), 400
    
    # Get case and counselor info
    case = db.db.cases.find_one({'_id': appointment['case_id']})
    student = db.db.users.find_one({'_id': case['student_id']})
    
    # Build calendar event
    event = {
        'summary': f'Therapy Session - {student.get("first_name", "Student")} {student.get("last_name", "")}',
        'description': f'Case: {str(case["_id"])}\nPresenting Issue: {case.get("presenting_issue")}',
        'start': {
            'dateTime': appointment['requested_start'].isoformat(),
            'timeZone': 'Asia/Manila'
        },
        'end': {
            'dateTime': appointment['requested_end'].isoformat(),
            'timeZone': 'Asia/Manila'
        },
        'attendees': [
            {'email': user['email'], 'responseStatus': 'accepted'},
            {'email': student.get('email', '')},  # Student gets invite too
        ],
        'reminders': {
            'useDefault': False,
            'overrides': [
                {'method': 'email', 'minutes': 24*60},  # 1 day before
                {'method': 'notification', 'minutes': 15}  # 15 min before
            ]
        }
    }
    
    # Create event on Google Calendar
    google = GoogleIntegration(current_app.config)
    try:
        response = google.create_calendar_event(google_tokens['access_token'], event)
        
        # Store event ID in database for later updates/deletions
        db.db.appointments.update_one(
            {'_id': ObjectId(appointment_id)},
            {'$set': {
                'google_calendar_event_id': response['id'],
                'calendar_synced': True,
                'calendar_last_sync': datetime.utcnow()
            }}
        )
        
        audit_log(db, 'appointment', 'calendar_sync', entity_id=appointment_id,
                  new_values={'google_event_id': response['id']})
        
        return jsonify({
            'success': True,
            'event_id': response['id'],
            'event_url': response.get('htmlLink'),
            'message': 'Appointment synced to Google Calendar'
        }), 201
    except Exception as e:
        return jsonify({'error': f'Failed to sync to calendar: {str(e)}'}), 400


@appointments_bp.route('/<appointment_id>/remove-from-calendar', methods=['DELETE'])
@jwt_required()
def remove_appointment_from_calendar(appointment_id):
    """Remove appointment from Google Calendar"""
    from integrations.google import GoogleIntegration
    from integrations.token_store import get_tokens
    
    user_id = get_jwt_identity()
    
    try:
        appointment = db.db.appointments.find_one({'_id': ObjectId(appointment_id)})
    except:
        return jsonify({'error': 'Invalid appointment ID'}), 400
    
    if not appointment:
        return jsonify({'error': 'Appointment not found'}), 404
    
    if not appointment.get('google_calendar_event_id'):
        return jsonify({'error': 'Appointment not synced to calendar'}), 400
    
    google_tokens = get_tokens(db.db, current_app.config, user_id, 'google')
    if not google_tokens:
        return jsonify({'error': 'Google Calendar not connected'}), 400
    
    google = GoogleIntegration(current_app.config)
    try:
        google.delete_calendar_event(google_tokens['access_token'], 
                                     appointment['google_calendar_event_id'])
        
        # Update database
        db.db.appointments.update_one(
            {'_id': ObjectId(appointment_id)},
            {'$set': {
                'calendar_synced': False,
                'google_calendar_event_id': None
            }}
        )
        
        return jsonify({
            'success': True,
            'message': 'Appointment removed from Google Calendar'
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to remove from calendar: {str(e)}'}), 400


@appointments_bp.route('/google/available-slots', methods=['GET'])
@jwt_required()
def get_available_slots():
    """Get available time slots from counselor's Google Calendar"""
    from integrations.google import GoogleIntegration
    from integrations.token_store import get_tokens
    
    user_id = get_jwt_identity()
    date = request.args.get('date')  # Format: YYYY-MM-DD
    duration = request.args.get('duration', 60, type=int)  # minutes
    
    if not date:
        return jsonify({'error': 'Missing date parameter'}), 400
    
    google_tokens = get_tokens(db.db, current_app.config, user_id, 'google')
    if not google_tokens:
        return jsonify({
            'error': 'Google Calendar not connected',
            'auth_url': '/api/appointments/google/authorize'
        }), 400
    
    google = GoogleIntegration(current_app.config)
    try:
        free_slots = google.get_free_slots(google_tokens['access_token'], date, duration)
        return jsonify({
            'date': date,
            'duration_minutes': duration,
            'available_slots': free_slots,
            'count': len(free_slots)
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to fetch slots: {str(e)}'}), 400


@appointments_bp.route('/google/disconnect', methods=['POST'])
@jwt_required()
def disconnect_google_calendar():
    """Disconnect user's Google Calendar access"""
    user_id = get_jwt_identity()
    
    # Remove the Google tokens
    db.db.token_store.delete_many({
        'user_id': ObjectId(user_id),
        'service': 'google'
    })
    
    return jsonify({
        'success': True,
        'message': 'Google Calendar disconnected successfully'
    }), 200


@appointments_bp.route('/dashboard/calendar', methods=['GET'])
@jwt_required()
def dashboard_calendar():
    """Return appointments for the weekly calendar view, filtered by date range and role."""
    user_id = get_jwt_identity()
    try:
        uid = ObjectId(user_id)
        user = db.db.users.find_one({'_id': uid})
    except Exception:
        return jsonify({'error': 'Invalid user'}), 401
    if not user:
        return jsonify({'error': 'User not found'}), 404

    role = user.get('role', '').upper()
    from_str = request.args.get('from')
    to_str   = request.args.get('to')

    date_filter = {}
    if from_str or to_str:
        date_filter['scheduled_start'] = {}
        if from_str:
            try:
                date_filter['scheduled_start']['$gte'] = datetime.fromisoformat(from_str.replace('Z', '+00:00'))
            except Exception:
                pass
        if to_str:
            try:
                date_filter['scheduled_start']['$lte'] = datetime.fromisoformat(to_str.replace('Z', '+00:00'))
            except Exception:
                pass

    if role in ('STAFF', 'ADMIN', 'DPO'):
        query = {**date_filter}
    elif role == 'STUDENT':
        query = {'student_id': uid, **date_filter}
    else:
        # COUNSELOR, PSYCHOLOGIST, IC, CASE_MANAGER — own assigned appointments
        query = {'counselor_id': uid, **date_filter}

    raw = list(db.db.appointments.find(query).sort('scheduled_start', 1).limit(300))

    # Pre-fetch counselor names in one batch
    counselor_ids = {a.get('counselor_id') for a in raw if a.get('counselor_id')}
    counselor_map: dict = {}
    for cid in counselor_ids:
        try:
            c = db.db.users.find_one({'_id': ObjectId(str(cid))}, {'first_name': 1, 'last_name': 1, 'role': 1})
            if c:
                counselor_map[str(cid)] = {
                    'name': f"{c.get('first_name','')} {c.get('last_name','')}".strip(),
                    'role': c.get('role', ''),
                }
        except Exception:
            pass

    # Pre-fetch student names in one batch
    student_ids = {a.get('student_id') for a in raw if a.get('student_id')}
    student_map: dict = {}
    for sid in student_ids:
        try:
            s = db.db.users.find_one({'_id': ObjectId(str(sid))}, {'first_name': 1, 'last_name': 1})
            if s:
                student_map[str(sid)] = f"{s.get('first_name','')} {s.get('last_name','')}".strip()
        except Exception:
            pass

    results = []
    for a in raw:
        cid  = str(a.get('counselor_id', ''))
        sid  = str(a.get('student_id', ''))
        cinfo = counselor_map.get(cid, {})
        s_start = a.get('scheduled_start')
        s_end   = a.get('scheduled_end')
        results.append({
            'id':             str(a['_id']),
            'student_name':   student_map.get(sid) or a.get('student_name', ''),
            'counselor_name': cinfo.get('name', ''),
            'counselor_id':   cid,
            'counselor_role': cinfo.get('role', ''),
            'scheduled_start': s_start.isoformat() if hasattr(s_start, 'isoformat') else (s_start or ''),
            'scheduled_end':   s_end.isoformat()   if hasattr(s_end,   'isoformat') else (s_end   or ''),
            'status':  a.get('status', ''),
            'purpose': a.get('purpose') or a.get('appointment_type', ''),
            'method':  a.get('preferred_method') or a.get('method', ''),
            'meeting_link': a.get('meeting_link') or a.get('video_link', ''),
            'office': a.get('office', ''),
        })

    return jsonify({'appointments': results}), 200


@appointments_bp.route('/<appointment_id>', methods=['GET'])
@jwt_required()
def get_appointment_details(appointment_id):
    """Get appointment details for a student or counselor"""
    user_id = get_jwt_identity()
    
    try:
        apt_id = ObjectId(appointment_id) if isinstance(appointment_id, str) else appointment_id
        appointment = db.db.appointments.find_one({"_id": apt_id})
    except:
        appointment = db.db.appointments.find_one({"_id": appointment_id})
    
    if not appointment:
        return jsonify({'error': 'Appointment not found'}), 404
    
    # Check permission: student can view their own appointment, counselor can view assigned appointments
    try:
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
    except:
        user_id_obj = user_id
    
    student_id = appointment.get('student_id')
    counselor_id = appointment.get('counselor_id')
    case_id = appointment.get('case_id')
    
    # Permission check: 
    # 1. Student can view their own appointment (if student_id is set)
    # 2. Counselor can view appointments they're assigned to
    # 3. Check case.student_id if appointment.student_id is not set (for backwards compatibility)
    
    has_permission = False
    
    # Check if user is the student
    if student_id and str(user_id_obj) == str(student_id):
        has_permission = True
    
    # Check if user is the counselor
    elif counselor_id and str(user_id_obj) == str(counselor_id):
        has_permission = True
    
    # Check if user is the student via the case (backwards compatibility)
    elif case_id:
        case = db.db.cases.find_one({"_id": case_id})
        if case and case.get('student_id') and str(user_id_obj) == str(case.get('student_id')):
            has_permission = True
    
    if not has_permission:
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        # Get counselor info
        counselor = None
        if counselor_id:
            counselor = db.db.users.find_one({"_id": counselor_id})
        
        # Get case info
        case = None
        if appointment.get('case_id'):
            case = db.db.cases.find_one({"_id": appointment.get('case_id')})
        
        # Helper function to convert ObjectIds to strings recursively
        def convert_objectids(obj):
            if isinstance(obj, dict):
                for key, value in obj.items():
                    if isinstance(value, ObjectId):
                        obj[key] = str(value)
                    elif isinstance(value, (dict, list)):
                        obj[key] = convert_objectids(value)
                    elif hasattr(value, 'isoformat'):
                        try:
                            obj[key] = value.isoformat() if not isinstance(value, str) else value
                        except:
                            pass
            elif isinstance(obj, list):
                for i, item in enumerate(obj):
                    if isinstance(item, ObjectId):
                        obj[i] = str(item)
                    elif isinstance(item, (dict, list)):
                        obj[i] = convert_objectids(item)
                    elif hasattr(item, 'isoformat'):
                        try:
                            obj[i] = item.isoformat() if not isinstance(item, str) else item
                        except:
                            pass
            return obj
        
        # Format response
        response = {
            'id': str(appointment['_id']),
            'type': appointment.get('appointment_type', 'followup'),
            'status': appointment.get('status', 'pending'),
            'preferred_platform': appointment.get('preferred_platform', 'in-person'),
            'meeting_link': appointment.get('meeting_link'),
            'requested_start': appointment.get('requested_start').isoformat() if appointment.get('requested_start') and hasattr(appointment.get('requested_start'), 'isoformat') else appointment.get('requested_start'),
            'requested_end': appointment.get('requested_end').isoformat() if appointment.get('requested_end') and hasattr(appointment.get('requested_end'), 'isoformat') else appointment.get('requested_end'),
            'scheduled_start': appointment.get('scheduled_start').isoformat() if appointment.get('scheduled_start') and hasattr(appointment.get('scheduled_start'), 'isoformat') else appointment.get('scheduled_start'),
            'scheduled_end': appointment.get('scheduled_end').isoformat() if appointment.get('scheduled_end') and hasattr(appointment.get('scheduled_end'), 'isoformat') else appointment.get('scheduled_end'),
            'meeting_id': appointment.get('meeting_id'),
            'meeting_passcode': appointment.get('meeting_passcode'),
            'counselor': {
                'id': str(counselor['_id']),
                'name': f"{counselor.get('first_name', '')} {counselor.get('last_name', '')}",
                'email': counselor.get('email'),
                'role': counselor.get('role')
            } if counselor else None,
            'case': {
                'id': str(case['_id']),
                'student_id': str(case.get('student_id')),
                'status': case.get('status'),
                'risk_level': case.get('risk_level')
            } if case else None,
            'created_at': appointment.get('created_at').isoformat() if appointment.get('created_at') and hasattr(appointment.get('created_at'), 'isoformat') else appointment.get('created_at')
        }
        
        # Convert all remaining ObjectIds
        convert_objectids(response)
        
        return jsonify(response), 200
    
    except Exception as e:
        print(f"Error fetching appointment details: {e}")
        return jsonify({'error': 'Failed to fetch appointment details'}), 500


# ============================================================================
# OFFICE STAFF MANAGEMENT ENDPOINTS
# ============================================================================

@appointments_bp.route('/staff/schedule-for-student', methods=['POST'])
@jwt_required()
def staff_schedule_for_student():
    """Staff/counselor creates an appointment for an existing student (skips intake)."""
    user_id = get_jwt_identity()
    try:
        actor = db.db.users.find_one({'_id': ObjectId(user_id)})
    except Exception:
        actor = None
    allowed = ('STAFF', 'ADMIN', 'COUNSELOR', 'PSYCHOLOGIST', 'IC')
    if not actor or actor.get('role') not in allowed:
        return jsonify({'error': 'Insufficient permissions'}), 403

    data = request.get_json() or {}
    student_id = data.get('student_id')
    purpose = data.get('purpose', 'personal')
    concern = data.get('concern', '')
    preferred_method = data.get('preferred_method', 'in-person')
    counselor_id = data.get('counselor_id')
    slot_id = data.get('slot_id')
    preferred_date = data.get('preferred_date')
    preferred_time = data.get('preferred_time')

    if not student_id:
        return jsonify({'error': 'student_id is required'}), 400

    try:
        student_oid = ObjectId(student_id)
    except Exception:
        return jsonify({'error': 'Invalid student_id'}), 400

    student = db.db.users.find_one({'_id': student_oid})
    if not student or student.get('role') != 'STUDENT':
        return jsonify({'error': 'Student not found'}), 404

    # Find existing case, or create a minimal one
    case = db.db.cases.find_one({'student_id': student_oid}) or \
           db.db.cases.find_one({'student_id': str(student_oid)})
    if not case:
        case_doc = {
            '_id': ObjectId(),
            'student_id': student_oid,
            'student_name': f"{student.get('first_name','')} {student.get('last_name','')}".strip(),
            'student_email': student.get('email', ''),
            'case_status': 'ACTIVE',
            'chief_complaint': concern,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        }
        db.db.cases.insert_one(case_doc)
        case = case_doc

    case_id = case['_id']

    # Resolve timing
    scheduled_start = None
    scheduled_end = None
    booked_slot = None
    counselor_oid = None

    if slot_id:
        try:
            slot_oid = ObjectId(slot_id)
            booked_slot = db.db.counselor_availability.find_one_and_update(
                {'_id': slot_oid, 'is_available': True},
                {'$set': {'is_available': False}}
            )
        except Exception:
            pass
        if booked_slot:
            scheduled_start = booked_slot['slot_start']
            scheduled_end = booked_slot['slot_end']
            counselor_oid = booked_slot['counselor_id']
    elif preferred_date and preferred_time:
        try:
            scheduled_start = datetime.fromisoformat(f"{preferred_date}T{preferred_time}:00")
            scheduled_end = scheduled_start + timedelta(hours=1)
        except ValueError:
            return jsonify({'error': 'Invalid date/time format'}), 400

    if counselor_id and not counselor_oid:
        try:
            counselor_oid = ObjectId(counselor_id)
        except Exception:
            pass

    status = 'CONFIRMED' if (counselor_oid and scheduled_start) else 'REQUESTED'

    apt = {
        '_id': ObjectId(),
        'case_id': case_id,
        'student_id': student_oid,
        'counselor_id': counselor_oid,
        'status': status,
        'purpose': purpose,
        'concern': concern,
        'preferred_method': preferred_method,
        'requested_start': scheduled_start,
        'requested_end': scheduled_end,
        'scheduled_start': scheduled_start,
        'scheduled_end': scheduled_end,
        'referral_type': 'staff_scheduled',
        'referred_by': actor.get('first_name', '') + ' ' + actor.get('last_name', ''),
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow(),
    }
    db.db.appointments.insert_one(apt)
    audit_log(db.db, 'appointment', 'staff_schedule', entity_id=str(apt['_id']))
    return jsonify({'appointment_id': str(apt['_id']), 'status': status}), 201


@appointments_bp.route('/staff/batch-assign', methods=['POST'])
@jwt_required()
def batch_auto_assign():
    """Batch auto-assign all pending appointments within a date range (STAFF ONLY)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.ASSIGN_CASES.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    data = request.get_json() or {}
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    
    if not start_date or not end_date:
        start_date = datetime.utcnow()
        end_date = start_date + timedelta(days=30)
    else:
        try:
            start_date = datetime.fromisoformat(start_date)
            end_date = datetime.fromisoformat(end_date)
        except ValueError:
            return jsonify({'error': 'Invalid datetime format'}), 400
    
    try:
        # Find all REQUESTED appointments in date range without counselor
        pending_appointments = list(db.db.appointments.find({
            'status': AppointmentStatus.REQUESTED.value,
            'counselor_id': {'$exists': False},
            'requested_start': {'$gte': start_date, '$lte': end_date}
        }))
        
        assigned_count = 0
        failed_count = 0
        results = []
        
        for apt in pending_appointments:
            success, counselor_id, message = auto_assign_appointment(apt['_id'])
            if success:
                assigned_count += 1
                counselor = db.db.users.find_one({"_id": ObjectId(counselor_id)})
                results.append({
                    'appointment_id': str(apt['_id']),
                    'success': True,
                    'counselor_name': f"{counselor.get('first_name', '')} {counselor.get('last_name', '')}",
                    'message': message
                })
            else:
                failed_count += 1
                results.append({
                    'appointment_id': str(apt['_id']),
                    'success': False,
                    'message': message
                })
        
        audit_log(
            db.db,
            'appointments',
            'batch_auto_assign',
            entity_id=user_id,
            new_values={
                'total': len(pending_appointments),
                'assigned': assigned_count,
                'failed': failed_count
            }
        )
        
        return jsonify({
            'total_appointments': len(pending_appointments),
            'assigned': assigned_count,
            'failed': failed_count,
            'results': results
        }), 200
    
    except Exception as e:
        print(f"Error in batch_auto_assign: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Batch assignment failed: {str(e)}'}), 500


@appointments_bp.route('/staff/workload-report', methods=['GET'])
@jwt_required()
def get_workload_report():
    """Get workload report for all counselors (STAFF ONLY)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.ASSIGN_CASES.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        # Get all active counselors (users use is_active boolean, not status string)
        counselors = list(db.db.users.find({
            'role': {'$in': ['COUNSELOR', 'PSYCHOLOGIST']},
            'is_active': {'$ne': False}
        }))
        
        workload_data = []
        
        for counselor in counselors:
            # Count by appointment status
            confirmed_count = db.db.appointments.count_documents({
                'counselor_id': counselor['_id'],
                'status': {'$in': [AppointmentStatus.CONFIRMED.value, AppointmentStatus.MATCHED.value, 'SCHEDULED']}
            })
            
            pending_count = db.db.appointments.count_documents({
                'counselor_id': counselor['_id'],
                'status': AppointmentStatus.REQUESTED.value
            })
            
            completed_count = db.db.appointments.count_documents({
                'counselor_id': counselor['_id'],
                'status': AppointmentStatus.COMPLETED.value
            })
            
            # Calculate utilization percentage
            total_active = confirmed_count + pending_count
            
            workload_data.append({
                'counselor_id': str(counselor['_id']),
                'name': f"{counselor.get('first_name', '')} {counselor.get('last_name', '')}",
                'role': counselor.get('role'),
                'active_appointments': total_active,
                'confirmed': confirmed_count,
                'pending': pending_count,
                'completed': completed_count,
                'utilization_level': 'HIGH' if total_active >= 8 else 'MEDIUM' if total_active >= 4 else 'LOW'
            })
        
        # Sort by active appointments descending
        workload_data.sort(key=lambda x: x['active_appointments'], reverse=True)
        
        return jsonify({
            'timestamp': datetime.utcnow().isoformat(),
            'total_counselors': len(counselors),
            'workload': workload_data
        }), 200
    
    except Exception as e:
        print(f"Error in get_workload_report: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to generate report: {str(e)}'}), 500


@appointments_bp.route('/staff/reassignment-suggestions', methods=['GET'])
@jwt_required()
def get_reassignment_suggestions():
    """Suggest cases to reassign based on counselor workload imbalance."""
    user_id = get_jwt_identity()

    if not user_has_permission(db.db, user_id, PermissionType.ASSIGN_CASES.value):
        return jsonify({'error': 'Insufficient permissions'}), 403

    try:
        active_statuses = ['ACTIVE', 'NEW', 'active', 'new']
        active_cases = list(db.db.cases.find(
            {
                '$or': [
                    {'case_status': {'$in': active_statuses}},
                    {'status': {'$in': active_statuses}},
                ],
                'assigned_counselor_id': {'$exists': True, '$ne': None},
            },
            {'_id': 1, 'assigned_counselor_id': 1, 'student_id': 1}
        ))

        if not active_cases:
            return jsonify({'suggestions': []}), 200

        # Count cases per counselor
        from collections import Counter
        workload = Counter(str(c['assigned_counselor_id']) for c in active_cases)
        if not workload:
            return jsonify({'suggestions': []}), 200

        avg = sum(workload.values()) / len(workload)

        # Counselors with below-average load are candidates to receive cases
        counselor_ids = list(workload.keys())
        counselors = {str(d['_id']): d for d in db.db.users.find(
            {'_id': {'$in': [ObjectId(cid) for cid in counselor_ids]},
             'role': {'$in': ['COUNSELOR', 'GUIDANCE_COUNSELOR', 'PSYCHOLOGIST']}},
            {'_id': 1, 'first_name': 1, 'last_name': 1, 'role': 1}
        )}

        low_load = [cid for cid in counselor_ids if workload[cid] < avg and cid in counselors]

        suggestions = []
        for case in active_cases:
            current_cid = str(case['assigned_counselor_id'])
            if workload[current_cid] <= avg or current_cid not in counselors:
                continue
            if not low_load:
                break
            target_cid = min(low_load, key=lambda c: workload[c])
            if current_cid == target_cid:
                continue

            student = db.db.users.find_one({'_id': case.get('student_id')}, {'first_name': 1, 'last_name': 1, 'email': 1})
            student_name = f"{student.get('first_name','')} {student.get('last_name','')}".strip() if student else 'Unknown Student'
            current_c = counselors[current_cid]
            target_c = counselors[target_cid]
            current_name = f"{current_c.get('first_name','')} {current_c.get('last_name','')}".strip()
            target_name = f"{target_c.get('first_name','')} {target_c.get('last_name','')}".strip()

            load_diff = workload[current_cid] - workload[target_cid]
            confidence = min(99, 60 + load_diff * 5)

            suggestions.append({
                'case_id': str(case['_id']),
                'student_name': student_name,
                'current_counselor': current_name,
                'suggested_counselor': target_name,
                'confidence': confidence,
                'reason': (
                    f"{current_name} has {workload[current_cid]} active cases "
                    f"({load_diff} more than {target_name}). Moving this case balances workload."
                ),
            })

            if len(suggestions) >= 10:
                break

        return jsonify({'suggestions': suggestions}), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to generate suggestions: {str(e)}'}), 500

@appointments_bp.route('/<appointment_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_appointment(appointment_id):
    """Cancel an appointment"""
    user_id = get_jwt_identity()
    
    try:
        apt_id = ObjectId(appointment_id) if isinstance(appointment_id, str) else appointment_id
        appointment = db.db.appointments.find_one({"_id": apt_id})
    except:
        appointment = db.db.appointments.find_one({"_id": appointment_id})
    
    if not appointment:
        return jsonify({'error': 'Appointment not found'}), 404
    
    # Check permission: student or counselor can cancel
    try:
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
    except:
        user_id_obj = user_id
    
    student_id   = appointment.get('student_id')
    counselor_id = appointment.get('counselor_id')

    # Student, assigned counselor, or admin/staff can cancel
    user_doc  = db.db.users.find_one({'_id': user_id_obj})
    user_role = (user_doc.get('role') or '') if user_doc else ''
    is_admin_or_staff = user_role in ('ADMIN', 'STAFF', 'DPO')
    is_participant    = str(user_id_obj) in (str(student_id), str(counselor_id))
    if not is_participant and not is_admin_or_staff:
        return jsonify({'error': 'Insufficient permissions to cancel this appointment'}), 403

    # Can't cancel already terminal appointments
    current_status = appointment.get('status', '').upper()
    if current_status in ['COMPLETED', 'CANCELLED', 'NO_SHOW', 'CLOSED_AT_INTAKE']:
        return jsonify({'error': f'Cannot cancel appointment with status {current_status}'}), 400

    try:
        data = request.get_json() or {}
        reason = data.get('reason', 'No reason provided')

        # Cancellation policy: check 24h notice window
        appt_start = appointment.get('requested_start')
        late_cancel = False
        if appt_start and isinstance(appt_start, datetime):
            hours_until = (appt_start - datetime.utcnow()).total_seconds() / 3600
            if hours_until < 24:
                late_cancel = True
                # Track late cancellation on user
                db.db.users.update_one(
                    {'_id': user_id_obj},
                    {'$inc': {'late_cancellation_count': 1}}
                )
                updated_user = db.db.users.find_one({'_id': user_id_obj})
                if updated_user and updated_user.get('late_cancellation_count', 0) >= _cfg('LATE_CANCEL_THRESHOLD', 3):
                    db.db.users.update_one(
                        {'_id': user_id_obj},
                        {'$set': {'late_cancel_flagged': True}}
                    )

        # Update appointment status
        result = db.db.appointments.update_one(
            {"_id": apt_id},
            {
                "$set": {
                    "status": AppointmentStatus.CANCELLED.value,
                    "cancelled_at": datetime.utcnow(),
                    "cancellation_reason": reason,
                    "cancelled_by_user_id": user_id_obj,
                    "late_cancellation": late_cancel,
                }
            }
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'Failed to cancel appointment'}), 500
        
        # Restore the booked availability slot so it can be rebooked
        try:
            db.db.counselor_availability.update_one(
                {'appointment_id': appointment['_id']},
                {'$set': {'is_available': True, 'booked_by': None, 'appointment_id': None}}
            )
        except Exception:
            pass

        # Remove from Google Calendar
        try:
            cal_event_id = appointment.get('calendar_event_id')
            if cal_event_id:
                from blueprints.google_calendar import delete_appointment_from_calendar, SYSTEM_CALENDAR_USER
                # Try counselor's token first (they may have created it), then system account
                deleted = counselor_id and delete_appointment_from_calendar(str(counselor_id), cal_event_id)
                if not deleted:
                    delete_appointment_from_calendar(SYSTEM_CALENDAR_USER, cal_event_id)
                print(f"✓ Removed calendar event {cal_event_id}")
        except Exception as cal_err:
            print(f"⚠ Calendar event deletion failed: {cal_err}")

        # Log audit trail
        audit_log(
            db.db,
            'appointments',
            'cancelled',
            entity_id=str(apt_id),
            old_values={'status': current_status},
            new_values={'status': 'CANCELLED', 'reason': reason}
        )

        # Notify both student and counselor of the cancellation
        try:
            email_svc = EmailService()
            canceller_role = 'student' if str(user_id_obj) == str(student_id) else 'counselor/staff'
            apt_date = appointment.get('scheduled_start') or appointment.get('requested_start')
            date_str = apt_date.strftime('%B %d, %Y at %I:%M %p') if apt_date else 'the scheduled date'
            cancel_subject = 'CPS Appointment Cancelled'
            cancel_body_tpl = (
                '<html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px">'
                '<h2 style="color:#B91C1C;">Appointment Cancelled</h2>'
                '<p>Dear {name},</p>'
                '<p>Your counseling appointment on <strong>{date}</strong> has been cancelled by the {by}.</p>'
                '<p><strong>Reason:</strong> {reason}</p>'
                '<p>If you have questions, please contact the CPS office.</p>'
                '</body></html>'
            )
            # Notify student
            student_doc = db.db.users.find_one({'_id': student_id}) if student_id else None
            if student_doc and student_doc.get('email'):
                sname = f"{student_doc.get('first_name', '')} {student_doc.get('last_name', '')}".strip() or 'Student'
                email_svc._send_email(
                    student_doc['email'], cancel_subject,
                    cancel_body_tpl.format(name=sname, date=date_str, by=canceller_role, reason=reason)
                )
            # Notify counselor
            counselor_doc = db.db.users.find_one({'_id': counselor_id}) if counselor_id else None
            if counselor_doc and counselor_doc.get('email'):
                cname = f"{counselor_doc.get('first_name', '')} {counselor_doc.get('last_name', '')}".strip() or 'Counselor'
                email_svc._send_email(
                    counselor_doc['email'], cancel_subject,
                    cancel_body_tpl.format(name=cname, date=date_str, by=canceller_role, reason=reason)
                )
        except Exception as email_err:
            print(f"⚠ Cancellation email failed: {email_err}")

        resp = {
            'message': 'Appointment cancelled successfully',
            'appointment_id': str(apt_id),
            'status': 'CANCELLED',
        }
        if late_cancel:
            resp['warning'] = 'Late cancellation recorded (less than 24 hours notice). Repeated late cancellations may affect your booking privileges.'
        return jsonify(resp), 200
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error in cancel_appointment: {str(e)}")
        print(error_trace)
        return jsonify({'error': f'Failed to cancel appointment: {str(e)}'}), 500


@appointments_bp.route('/<appointment_id>/approve', methods=['POST'])
@jwt_required()
def approve_appointment(appointment_id):
    """Counselor approves a pending appointment"""
    user_id = get_jwt_identity()
    
    try:
        apt_id = ObjectId(appointment_id) if isinstance(appointment_id, str) else appointment_id
        appointment = db.db.appointments.find_one({"_id": apt_id})
    except:
        appointment = db.db.appointments.find_one({"_id": appointment_id})
    
    if not appointment:
        return jsonify({'error': 'Appointment not found'}), 404
    
    # Check permission: only assigned counselor can approve
    try:
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
    except:
        user_id_obj = user_id
    
    counselor_id = appointment.get('counselor_id')
    
    if str(user_id_obj) != str(counselor_id):
        return jsonify({'error': 'Only assigned counselor can approve appointments'}), 403
    
    # Can only approve pending appointments
    current_status = appointment.get('status', '').upper()
    if current_status not in ['REQUESTED', 'PENDING_APPROVAL']:
        return jsonify({'error': f'Cannot approve appointment with status {current_status}'}), 400
    
    try:
        # Update appointment status to APPROVED
        result = db.db.appointments.update_one(
            {"_id": apt_id},
            {
                "$set": {
                    "status": AppointmentStatus.APPROVED.value,
                    "approved_at": datetime.utcnow(),
                    "approved_by_counselor_id": user_id_obj,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'Failed to approve appointment'}), 500
        
        # Log audit trail
        audit_log(
            db.db, 
            'appointments', 
            'approved',
            entity_id=str(apt_id),
            old_values={'status': current_status},
            new_values={'status': 'APPROVED'}
        )
        
        return jsonify({
            'message': 'Appointment approved successfully',
            'appointment_id': str(apt_id),
            'status': 'APPROVED'
        }), 200
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error in approve_appointment: {str(e)}")
        print(error_trace)
        return jsonify({'error': f'Failed to approve appointment: {str(e)}'}), 500


@appointments_bp.route('/<appointment_id>/deny', methods=['POST'])
@jwt_required()
def deny_appointment(appointment_id):
    """Counselor denies a pending appointment with reason"""
    user_id = get_jwt_identity()
    
    try:
        apt_id = ObjectId(appointment_id) if isinstance(appointment_id, str) else appointment_id
        appointment = db.db.appointments.find_one({"_id": apt_id})
    except:
        appointment = db.db.appointments.find_one({"_id": appointment_id})
    
    if not appointment:
        return jsonify({'error': 'Appointment not found'}), 404
    
    # Check permission: only assigned counselor can deny
    try:
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
    except:
        user_id_obj = user_id
    
    counselor_id = appointment.get('counselor_id')
    
    if str(user_id_obj) != str(counselor_id):
        return jsonify({'error': 'Only assigned counselor can deny appointments'}), 403
    
    # Can only deny pending appointments
    current_status = appointment.get('status', '').upper()
    if current_status not in ['REQUESTED', 'PENDING_APPROVAL']:
        return jsonify({'error': f'Cannot deny appointment with status {current_status}'}), 400
    
    try:
        data = request.get_json() or {}
        denial_reason = data.get('reason', 'No reason provided')
        
        # Update appointment status to DENIED
        result = db.db.appointments.update_one(
            {"_id": apt_id},
            {
                "$set": {
                    "status": AppointmentStatus.DENIED.value,
                    "denied_at": datetime.utcnow(),
                    "denied_by_counselor_id": user_id_obj,
                    "denial_reason": denial_reason,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'Failed to deny appointment'}), 500

        # Notify the student their request was not approved
        try:
            student_doc = db.db.users.find_one({'_id': appointment.get('student_id')})
            if student_doc and student_doc.get('email'):
                sname = f"{student_doc.get('first_name', '')} {student_doc.get('last_name', '')}".strip() or 'Student'
                email_svc = EmailService()
                email_svc._send_email(
                    student_doc['email'],
                    'CPS Appointment Request Not Approved',
                    f"""<html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px">
                    <h2 style="color:#B91C1C;">Appointment Request Not Approved</h2>
                    <p>Dear {sname},</p>
                    <p>We regret to inform you that your appointment request (ID: {apt_id}) could not be approved at this time.</p>
                    <p><strong>Reason:</strong> {denial_reason}</p>
                    <p>You are welcome to submit a new appointment request. If you have urgent concerns,
                    please contact the CPS office directly.</p>
                    <p style="color:#666;font-size:12px;">{_email_footer()}</p>
                    </body></html>"""
                )
        except Exception as email_err:
            print(f"⚠ Denial email failed: {email_err}")

        # Log audit trail
        audit_log(
            db.db,
            'appointments',
            'denied',
            entity_id=str(apt_id),
            old_values={'status': current_status},
            new_values={'status': 'DENIED', 'reason': denial_reason}
        )

        return jsonify({
            'message': 'Appointment denied successfully',
            'appointment_id': str(apt_id),
            'status': 'DENIED',
            'denial_reason': denial_reason
        }), 200
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error in deny_appointment: {str(e)}")
        print(error_trace)
        return jsonify({'error': f'Failed to deny appointment: {str(e)}'}), 500


@appointments_bp.route('/<appointment_id>/reschedule', methods=['POST'])
@jwt_required()
def reschedule_appointment(appointment_id):
    """Reschedule an appointment to a new date/time (student request, requires counselor approval)"""
    user_id = get_jwt_identity()
    
    try:
        apt_id = ObjectId(appointment_id) if isinstance(appointment_id, str) else appointment_id
        appointment = db.db.appointments.find_one({"_id": apt_id})
    except:
        appointment = db.db.appointments.find_one({"_id": appointment_id})
    
    if not appointment:
        return jsonify({'error': 'Appointment not found'}), 404
    
    # Check permission: student or counselor can reschedule
    try:
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
    except:
        user_id_obj = user_id
    
    student_id  = appointment.get('student_id')
    counselor_id = appointment.get('counselor_id')

    user = db.db.users.find_one({"_id": user_id_obj})
    if not user:
        return jsonify({'error': 'User not found'}), 404
    role = user.get('role', '')

    is_student   = str(user_id_obj) == str(student_id)
    is_counselor = role in ('ADMIN', 'STAFF', 'COUNSELOR', 'PSYCHOLOGIST', 'IC') and (
        role in ('ADMIN', 'STAFF') or str(user_id_obj) == str(counselor_id)
    )

    if not is_student and not is_counselor:
        return jsonify({'error': 'You do not have permission to reschedule this appointment'}), 403

    reschedule_requested_by_role = role if not is_student else 'STUDENT'
    
    # Can't reschedule completed or cancelled appointments
    current_status = appointment.get('status', '').upper()
    if current_status in ['COMPLETED', 'CANCELLED']:
        return jsonify({'error': f'Cannot reschedule appointment with status {current_status}'}), 400

    reschedule_count = appointment.get('reschedule_count', 0)

    # 24h notice requirement
    appt_start = appointment.get('scheduled_start') or appointment.get('requested_start')
    if appt_start and isinstance(appt_start, datetime):
        hours_until = (appt_start - datetime.utcnow()).total_seconds() / 3600
        if hours_until < 24:
            return jsonify({'error': 'Appointments cannot be rescheduled within 24 hours of the session. Please contact the CPS office.', 'too_late': True}), 400

    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        
        new_start = data.get('requested_start')
        new_end = data.get('requested_end')
        reason = data.get('reason', 'Rescheduled by user')
        
        if not new_start:
            return jsonify({'error': 'requested_start is required'}), 400
        
        # Parse datetime strings if necessary
        try:
            if isinstance(new_start, str):
                new_start = datetime.fromisoformat(new_start.replace('Z', '+00:00'))
            if isinstance(new_end, str):
                new_end = datetime.fromisoformat(new_end.replace('Z', '+00:00'))
        except:
            return jsonify({'error': 'Invalid datetime format for start/end times'}), 400
        
        # Store old values for audit log
        old_start = appointment.get('requested_start')
        old_end = appointment.get('requested_end')
        old_status = appointment.get('status')
        
        new_end_resolved = new_end or new_start + timedelta(minutes=_cfg('APPOINTMENT_DURATION_MINUTES', 60))

        # Update to RESCHEDULE_REQUESTED — keeps counselor + original confirmed time intact.
        # New requested times stored separately so staff can compare old vs. new.
        result = db.db.appointments.update_one(
            {"_id": apt_id},
            {
                "$set": {
                    "status": AppointmentStatus.RESCHEDULE_REQUESTED.value,
                    "reschedule_requested_start": new_start,
                    "reschedule_requested_end": new_end_resolved,
                    "rescheduled_at": datetime.utcnow(),
                    "reschedule_reason": reason,
                    "rescheduled_by_user_id": user_id_obj,
                    "reschedule_requested_by_role": reschedule_requested_by_role,
                },
                "$inc": {"reschedule_count": 1}
            }
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'Failed to reschedule appointment'}), 500
        
        # Log audit trail
        audit_log(
            db.db,
            'appointments',
            'rescheduled',
            entity_id=str(apt_id),
            old_values={
                'status': old_status,
                'requested_start': str(old_start),
                'requested_end': str(old_end)
            },
            new_values={
                'status': AppointmentStatus.REQUESTED.value,
                'requested_start': str(new_start),
                'requested_end': str(new_end),
                'reason': reason
            }
        )
        
        new_count = reschedule_count + 1
        if new_count >= 2:
            db.db.appointments.update_one({"_id": apt_id}, {"$set": {"reschedule_flagged": True}})

        # Notify the assigned counselor/IC directly
        try:
            counselor_doc = db.db.users.find_one({'_id': appointment.get('counselor_id')}) if appointment.get('counselor_id') else None
            student_doc   = db.db.users.find_one({'_id': user_id_obj})
            if counselor_doc and counselor_doc.get('email') and student_doc:
                from services.email_service import EmailService
                s_name    = f"{student_doc.get('first_name','')} {student_doc.get('last_name','')}".strip()
                c_name    = f"{counselor_doc.get('first_name','')} {counselor_doc.get('last_name','')}".strip()
                old_time  = (appointment.get('scheduled_start') or appointment.get('requested_start'))
                old_str   = old_time.strftime('%B %d, %Y at %I:%M %p PHT') if old_time else 'TBD'
                new_str   = new_start.strftime('%B %d, %Y at %I:%M %p PHT')
                html = f"""<html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
                  <div style="max-width:600px;margin:0 auto;padding:20px;">
                    <h2 style="color:#1B5E20;">Reschedule Request</h2>
                    <p>Dear {c_name},</p>
                    <p><strong>{s_name}</strong> has requested to reschedule their appointment.</p>
                    <div style="background:#f5f5f5;padding:15px;margin:20px 0;border-radius:5px;border-left:4px solid #1B5E20;">
                      <p style="margin:8px 0;"><strong>Current time:</strong> {old_str}</p>
                      <p style="margin:8px 0;"><strong>Requested new time:</strong> {new_str}</p>
                      {'<p style="margin:8px 0;"><strong>Reason:</strong> ' + reason + '</p>' if reason else ''}
                    </div>
                    <p>Please log in to the CPS portal to approve or deny this request.</p>
                    <hr style="border:none;border-top:1px solid #ddd;margin:20px 0;">
                    <p style="color:#999;font-size:12px;text-align:center;">{_email_footer()}</p>
                  </div>
                </body></html>"""
                EmailService()._send_email(
                    counselor_doc['email'],
                    f"Reschedule Request — {s_name}",
                    html,
                )
                print(f"✓ Reschedule notification sent to {counselor_doc['email']}")
        except Exception as notify_err:
            print(f"⚠ Reschedule notification email failed: {notify_err}")

        return jsonify({
            'message': 'Reschedule request submitted successfully',
            'detail': 'Your request has been sent to your counselor for approval.',
            'appointment_id': str(apt_id),
            'status': AppointmentStatus.RESCHEDULE_REQUESTED.value,
            'reschedule_requested_start': new_start.isoformat(),
            'reschedule_requested_end': new_end_resolved.isoformat(),
            'reason': reason,
            'reschedule_count': new_count,
            'flagged': new_count >= 2
        }), 200
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error in reschedule_appointment: {str(e)}")
        print(error_trace)
        return jsonify({'error': f'Failed to reschedule appointment: {str(e)}'}), 500


@appointments_bp.route('/reschedule-requests', methods=['GET'])
@jwt_required()
def list_reschedule_requests():
    """List all pending reschedule requests (appointments rescheduled by students awaiting approval)"""
    user_id = get_jwt_identity()
    user = db.db.users.find_one({"_id": ObjectId(user_id) if isinstance(user_id, str) else user_id})
    if not user or user.get('role') not in ['ADMIN', 'STAFF', 'COUNSELOR', 'PSYCHOLOGIST', 'IC']:
        return jsonify({'error': 'Access denied'}), 403

    role = user.get('role', '')
    user_obj_id = ObjectId(user_id) if isinstance(user_id, str) else user_id
    is_counselor_role = role in ['COUNSELOR', 'PSYCHOLOGIST', 'IC']

    status_filter = request.args.get('status', 'pending')

    if status_filter == 'pending':
        query = {"status": AppointmentStatus.RESCHEDULE_REQUESTED.value}
    elif status_filter == 'approved':
        query = {"reschedule_approved": True}
    elif status_filter == 'denied':
        query = {"reschedule_denied": True}
    else:
        query = {"rescheduled_at": {"$exists": True}}

    # Counselors only see reschedule requests for their own appointments
    if is_counselor_role:
        query["counselor_id"] = user_obj_id

    raw = list(db.db.appointments.find(query).sort("rescheduled_at", -1).limit(100))

    results = []
    for apt in raw:
        # Resolve student name — prefer student_id lookup, fall back to stored fields
        student_name = ''
        sid = apt.get('student_id')
        if sid:
            try:
                s = db.db.users.find_one({"_id": sid if isinstance(sid, ObjectId) else ObjectId(str(sid))},
                                         {"first_name": 1, "last_name": 1})
                if s:
                    student_name = f"{s.get('first_name','')} {s.get('last_name','')}".strip()
            except Exception:
                pass
        if not student_name:
            student_name = apt.get('student_name', '')
        if not student_name and apt.get('student_email'):
            student_name = apt['student_email']
        if not student_name and apt.get('rescheduled_by_user_id'):
            try:
                s = db.db.users.find_one({"_id": apt['rescheduled_by_user_id']})
                if s:
                    student_name = f"{s.get('first_name','')} {s.get('last_name','')}".strip()
            except Exception:
                pass

        def _iso(v):
            return v.isoformat() if isinstance(v, datetime) else (str(v) if v else None)

        results.append({
            '_id': str(apt['_id']),
            'appointment_id': str(apt['_id']),
            'student_name': student_name or 'Unknown',
            'student_email': apt.get('student_email', ''),
            'appointment_type': apt.get('appointment_type', 'General'),
            'current_time': _iso(apt.get('scheduled_start') or apt.get('requested_start')),
            'requested_start': _iso(apt.get('reschedule_requested_start') or apt.get('requested_start')),
            'requested_end': _iso(apt.get('reschedule_requested_end') or apt.get('requested_end')),
            'reason': apt.get('reschedule_reason', ''),
            'status': 'approved' if apt.get('reschedule_approved') else ('denied' if apt.get('reschedule_denied') else 'pending'),
            'created_at': _iso(apt.get('rescheduled_at') or apt.get('created_at')),
        })

    return jsonify({'requests': results, 'total': len(results)}), 200


@appointments_bp.route('/reschedule-requests/<request_id>/approve', methods=['POST'])
@jwt_required()
def approve_reschedule_request(request_id):
    """Approve a reschedule request — moves requested time to scheduled time"""
    user_id = get_jwt_identity()
    user = db.db.users.find_one({"_id": ObjectId(user_id) if isinstance(user_id, str) else user_id})
    if not user:
        return jsonify({'error': 'Access denied'}), 403
    role = user.get('role', '')
    is_staff_side = role in ['ADMIN', 'STAFF', 'COUNSELOR', 'PSYCHOLOGIST', 'IC']
    is_student = role == 'STUDENT'

    try:
        apt_id = ObjectId(request_id)
    except Exception:
        return jsonify({'error': 'Invalid appointment ID'}), 400

    apt = db.db.appointments.find_one({"_id": apt_id})
    if not apt:
        return jsonify({'error': 'Appointment not found'}), 404

    initiated_by = apt.get('reschedule_requested_by_role', 'STUDENT')
    student_approving = is_student and initiated_by != 'STUDENT' and str(user.get('_id')) == str(apt.get('student_id'))
    # Counselors can only approve their own appointments' reschedule requests
    if role in ['COUNSELOR', 'PSYCHOLOGIST', 'IC']:
        if str(apt.get('counselor_id', '')) != str(user_id):
            return jsonify({'error': 'Access denied — not your appointment'}), 403
    if not is_staff_side and not student_approving:
        return jsonify({'error': 'Access denied'}), 403

    new_start = apt.get('reschedule_requested_start') or apt.get('requested_start')
    new_end = apt.get('reschedule_requested_end') or apt.get('requested_end')

    db.db.appointments.update_one(
        {"_id": apt_id},
        {
            "$set": {
                "status": AppointmentStatus.CONFIRMED.value,
                "scheduled_start": new_start,
                "scheduled_end": new_end,
                "requested_start": new_start,
                "requested_end": new_end,
                "reschedule_approved": True,
                "reschedule_approved_at": datetime.utcnow(),
                "reschedule_approved_by": ObjectId(user_id) if isinstance(user_id, str) else user_id,
            },
            "$unset": {
                "reschedule_requested_start": "",
                "reschedule_requested_end": "",
            }
        }
    )
    audit_log(db.db, 'appointments', 'reschedule_approved', entity_id=str(apt_id))

    # Update Google Calendar: delete old event, create new one with the updated time
    try:
        cal_event_id = apt.get('calendar_event_id')
        counselor_id = apt.get('counselor_id')
        if counselor_id:
            from blueprints.google_calendar import delete_appointment_from_calendar, sync_appointment_to_calendar, SYSTEM_CALENDAR_USER
            if cal_event_id:
                deleted = delete_appointment_from_calendar(str(counselor_id), cal_event_id)
                if not deleted:
                    delete_appointment_from_calendar(SYSTEM_CALENDAR_USER, cal_event_id)
            updated_apt = dict(apt)
            updated_apt['scheduled_start'] = new_start
            updated_apt['scheduled_end'] = new_end
            new_event_id, _ = sync_appointment_to_calendar(str(counselor_id), updated_apt)
            if new_event_id:
                db.db.appointments.update_one({'_id': apt_id}, {'$set': {'calendar_event_id': new_event_id}})
                print(f"✓ Calendar event rescheduled: {new_event_id}")
    except Exception as cal_err:
        print(f"⚠ Calendar reschedule update failed: {cal_err}")

    return jsonify({'message': 'Reschedule approved', 'appointment_id': str(apt_id)}), 200


@appointments_bp.route('/reschedule-requests/<request_id>/deny', methods=['POST'])
@jwt_required()
def deny_reschedule_request(request_id):
    """Deny a reschedule request"""
    user_id = get_jwt_identity()
    user = db.db.users.find_one({"_id": ObjectId(user_id) if isinstance(user_id, str) else user_id})
    if not user:
        return jsonify({'error': 'Access denied'}), 403
    role = user.get('role', '')
    is_staff_side = role in ['ADMIN', 'STAFF', 'COUNSELOR', 'PSYCHOLOGIST', 'IC']
    is_student = role == 'STUDENT'

    try:
        apt_id = ObjectId(request_id)
    except Exception:
        return jsonify({'error': 'Invalid appointment ID'}), 400

    apt = db.db.appointments.find_one({"_id": apt_id})
    if not apt:
        return jsonify({'error': 'Appointment not found'}), 404

    initiated_by = apt.get('reschedule_requested_by_role', 'STUDENT')
    student_denying = is_student and initiated_by != 'STUDENT' and str(user.get('_id')) == str(apt.get('student_id'))
    # Counselors can only deny their own appointments' reschedule requests
    if role in ['COUNSELOR', 'PSYCHOLOGIST', 'IC']:
        if str(apt.get('counselor_id', '')) != str(user_id):
            return jsonify({'error': 'Access denied — not your appointment'}), 403
    if not is_staff_side and not student_denying:
        return jsonify({'error': 'Access denied'}), 403

    db.db.appointments.update_one(
        {"_id": apt_id},
        {
            "$set": {
                "status": AppointmentStatus.CONFIRMED.value,
                "reschedule_denied": True,
                "reschedule_denied_at": datetime.utcnow(),
                "reschedule_denied_by": ObjectId(user_id) if isinstance(user_id, str) else user_id,
            },
            "$unset": {
                "reschedule_requested_start": "",
                "reschedule_requested_end": "",
            }
        }
    )
    audit_log(db.db, 'appointments', 'reschedule_denied', entity_id=str(apt_id))
    return jsonify({'message': 'Reschedule request denied. Original appointment remains confirmed.', 'appointment_id': str(apt_id)}), 200


# ── Recurring Appointments (COUNSELOR / PSYCHOLOGIST only) ────────────────────

@appointments_bp.route('/recurring', methods=['POST'])
@jwt_required()
def create_recurring_appointments():
    """Create a series of recurring sessions. Only COUNSELOR/PSYCHOLOGIST/ADMIN."""
    user_id = get_jwt_identity()
    claims = get_jwt()
    role = claims.get('role', '')

    if role not in ['COUNSELOR', 'PSYCHOLOGIST', 'ADMIN']:
        return jsonify({'error': 'Only counselors and psychologists can create recurring appointments'}), 403

    data = request.get_json() or {}
    required = ['student_id', 'start_date', 'time', 'recurrence', 'sessions', 'purpose']
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({'error': f'Missing fields: {", ".join(missing)}'}), 400

    recurrence = data['recurrence']  # 'weekly' | 'biweekly'
    if recurrence not in ('weekly', 'biweekly'):
        return jsonify({'error': 'recurrence must be weekly or biweekly'}), 400

    sessions = int(data['sessions'])
    if not (2 <= sessions <= 24):
        return jsonify({'error': 'sessions must be between 2 and 24'}), 400

    try:
        counselor_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        student_id_obj = ObjectId(data['student_id']) if isinstance(data['student_id'], str) else data['student_id']
    except Exception:
        return jsonify({'error': 'Invalid ID format'}), 400

    try:
        start_dt = datetime.fromisoformat(f"{data['start_date']}T{data['time']}:00")
    except ValueError:
        return jsonify({'error': 'Invalid start_date or time format'}), 400

    if start_dt < datetime.utcnow():
        return jsonify({'error': 'Start date must be in the future'}), 400

    duration = int(data.get('duration_minutes', 60))
    step = timedelta(weeks=1 if recurrence == 'weekly' else 2)
    method = data.get('preferred_method', 'in_person')
    meeting_link = data.get('meeting_link', '')
    is_telehealth = method.lower() in ('zoom', 'google_meet', 'teams')

    # Resolve case_id if provided
    case_id = None
    if data.get('case_id'):
        try:
            case_id = ObjectId(data['case_id'])
        except Exception:
            pass

    created = []
    parent_id = None

    for i in range(sessions):
        slot_start = start_dt + step * i
        slot_end = slot_start + timedelta(minutes=duration)

        doc = {
            'student_id': student_id_obj,
            'counselor_id': counselor_id_obj,
            'case_id': case_id,
            'status': AppointmentStatus.CONFIRMED.value,
            'appointment_type': data.get('appointment_type', 'Counseling Session'),
            'purpose': data['purpose'],
            'concern': data.get('concern', ''),
            'preferred_method': method,
            'is_telehealth': is_telehealth,
            'meeting_link': meeting_link,
            'requested_start': slot_start,
            'requested_end': slot_end,
            'duration_minutes': duration,
            'notes': data.get('notes', ''),
            'recurrence': recurrence,
            'recurrence_index': i + 1,
            'recurrence_total': sessions,
            'is_recurring': True,
            'parent_appointment_id': parent_id,
            'created_by': counselor_id_obj,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        }

        result = db.db.appointments.insert_one(doc)
        new_id = result.inserted_id

        # First session is the parent
        if i == 0:
            parent_id = new_id
            db.db.appointments.update_one({'_id': new_id}, {'$set': {'parent_appointment_id': new_id}})

        created.append({
            'id': str(new_id),
            'session': i + 1,
            'date': slot_start.isoformat(),
        })

        # Auto-create 24h and 1h reminder records
        student = db.db.users.find_one({'_id': student_id_obj})
        student_email = student.get('email', '') if student else ''
        student_name = f"{student.get('first_name','')} {student.get('last_name','')}".strip() if student else ''
        appt_time_str = slot_start.strftime('%B %d, %Y at %I:%M %p')
        for label, offset in [('24h', timedelta(hours=_cfg('REMINDER_HOURS_24', 24))), ('1h', timedelta(hours=_cfg('REMINDER_HOURS_1', 1)))]:
            db.db.reminders.insert_one({
                'appointment_id': new_id,
                'student_id': student_id_obj,
                'student_email': student_email,
                'student_name': student_name,
                'reminder_type': label,
                'message': f"Reminder: Your counseling session #{i+1} is on {appt_time_str}.",
                'scheduled_for': slot_start - offset,
                'status': 'pending',
                'auto_generated': True,
                'created_at': datetime.utcnow(),
            })

    audit_log(db.db, 'appointment', 'create_recurring', new_values={
        'sessions': sessions, 'recurrence': recurrence, 'student_id': str(student_id_obj)
    })

    return jsonify({
        'message': f'Created {sessions} recurring {recurrence} sessions',
        'appointments': created,
        'parent_id': str(parent_id) if parent_id else None,
    }), 201


# ── Set / Update Meeting Link ─────────────────────────────────────────────────

@appointments_bp.route('/<appointment_id>/meeting-link', methods=['PATCH'])
@jwt_required()
def set_meeting_link(appointment_id):
    """Counselor sets or updates the telehealth meeting link for an appointment."""
    user_id = get_jwt_identity()
    claims = get_jwt()
    role = claims.get('role', '')

    if role not in ['COUNSELOR', 'PSYCHOLOGIST', 'STAFF', 'ADMIN']:
        return jsonify({'error': 'Insufficient permissions'}), 403

    try:
        apt_id = ObjectId(appointment_id)
    except Exception:
        return jsonify({'error': 'Invalid appointment ID'}), 400

    data = request.get_json() or {}
    meeting_link = data.get('meeting_link', '').strip()

    appt = db.db.appointments.find_one({'_id': apt_id})
    if not appt:
        return jsonify({'error': 'Appointment not found'}), 404

    db.db.appointments.update_one(
        {'_id': apt_id},
        {'$set': {
            'meeting_link': meeting_link,
            'is_telehealth': bool(meeting_link),
            'updated_at': datetime.utcnow(),
        }}
    )

    # Notify student that the meeting link is ready
    if meeting_link:
        try:
            student = db.db.users.find_one({'_id': appt.get('student_id')})
            if student:
                s_email = student.get('email', '')
                s_name = f"{student.get('first_name','')} {student.get('last_name','')}".strip()
                appt_time = appt.get('scheduled_start') or appt.get('requested_start')
                time_str = appt_time.strftime('%B %d, %Y at %I:%M %p') if isinstance(appt_time, datetime) else 'your scheduled time'
                platform = appt.get('preferred_method', 'online').replace('_', ' ').title()
                email_svc = EmailService()
                html = f"""
                <html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
                  <div style="max-width:560px;margin:0 auto;padding:20px;">
                    <h2 style="color:#1B5E20;">Your Meeting Link is Ready</h2>
                    <p>Dear {s_name},</p>
                    <p>Your {platform} link for the counseling session on <strong>{time_str}</strong> is now available:</p>
                    <div style="text-align:center;margin:24px 0;">
                      <a href="{meeting_link}" style="display:inline-block;background:#1B5E20;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Join Session</a>
                    </div>
                    <p style="font-size:13px;color:#6b7280;">If the button doesn't work, copy and paste this link into your browser:<br>
                    <a href="{meeting_link}" style="color:#1B5E20;">{meeting_link}</a></p>
                    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
                    <p style="color:#999;font-size:12px;text-align:center;">{_email_footer()}</p>
                  </div>
                </body></html>"""
                email_svc._send_email(s_email, f"Meeting Link Ready — {time_str}", html)
        except Exception as e:
            print(f"⚠ Could not send meeting link email: {e}")

    audit_log(db.db, 'appointment', 'set_meeting_link', entity_id=appointment_id)
    return jsonify({'message': 'Meeting link updated', 'meeting_link': meeting_link}), 200


@appointments_bp.route('/<appointment_id>/edit', methods=['PATCH'])
@jwt_required()
def edit_appointment(appointment_id):
    """Staff/admin: correct appointment fields directly without triggering student notifications."""
    user_id = get_jwt_identity()
    if not user_has_permission(db.db, user_id, PermissionType.ASSIGN_CASES.value):
        return jsonify({'error': 'Insufficient permissions'}), 403

    try:
        apt_id = ObjectId(appointment_id)
    except Exception:
        return jsonify({'error': 'Invalid appointment ID'}), 400

    apt = db.db.appointments.find_one({'_id': apt_id})
    if not apt:
        return jsonify({'error': 'Appointment not found'}), 404

    data = request.get_json() or {}
    updates = {'updated_at': datetime.utcnow()}

    # Counselor reassignment
    if data.get('counselor_id'):
        try:
            counselor_doc = db.db.users.find_one({'_id': ObjectId(data['counselor_id'])})
            if not counselor_doc:
                return jsonify({'error': 'Counselor not found'}), 404
            first = counselor_doc.get('first_name', '')
            last = counselor_doc.get('last_name', '')
            updates['counselor_id'] = ObjectId(data['counselor_id'])
            updates['counselor_name'] = f"{last.upper()}, {first}" if last else first
        except Exception:
            return jsonify({'error': 'Invalid counselor ID'}), 400

    # Date / time
    if data.get('date') and data.get('time'):
        try:
            new_start = datetime.fromisoformat(f"{data['date']}T{data['time']}:00")
            updates['scheduled_start'] = new_start
            updates['requested_start'] = new_start
            updates['preferred_date'] = new_start.isoformat()
            updates['preferred_time'] = data['time']
        except Exception:
            return jsonify({'error': 'Invalid date or time format'}), 400

    # Office / room
    if 'office' in data:
        updates['office'] = data['office']

    if len(updates) == 1:
        return jsonify({'error': 'No changes provided'}), 400

    db.db.appointments.update_one({'_id': apt_id}, {'$set': updates})
    audit_log(db.db, 'appointments', 'edited_by_staff', entity_id=str(apt_id))
    return jsonify({'message': 'Appointment updated.'}), 200


@appointments_bp.route('/<appointment_id>/schedule', methods=['PATCH'])
@jwt_required()
def schedule_endorsed_appointment(appointment_id):
    """Counselor/psychologist sets date+time on an endorsed appointment that has no date yet."""
    user_id = get_jwt_identity()
    try:
        apt_id = ObjectId(appointment_id)
    except Exception:
        return jsonify({'error': 'Invalid appointment ID'}), 400

    apt = db.db.appointments.find_one({'_id': apt_id})
    if not apt:
        return jsonify({'error': 'Appointment not found'}), 404

    # Only the assigned counselor may schedule
    if str(apt.get('counselor_id', '')) != str(user_id):
        # Also allow admin / DPO
        user = db.db.users.find_one({'_id': ObjectId(user_id)})
        if not user or user.get('role') not in ('ADMIN', 'DPO'):
            return jsonify({'error': 'Only the assigned counselor can schedule this session'}), 403

    data = request.get_json() or {}
    date_str = data.get('date', '')
    time_str = data.get('time', '')
    office   = data.get('office', '')
    method   = data.get('method', apt.get('method', 'in_person'))

    if not date_str or not time_str:
        return jsonify({'error': 'date and time are required'}), 400

    try:
        scheduled_start = datetime.fromisoformat(f"{date_str}T{time_str}:00")
    except Exception:
        return jsonify({'error': 'Invalid date or time format (use YYYY-MM-DD and HH:MM)'}), 400

    now = datetime.utcnow()
    db.db.appointments.update_one({'_id': apt_id}, {'$set': {
        'scheduled_start':           scheduled_start,
        'preferred_date':            scheduled_start.isoformat(),
        'preferred_time':            time_str,
        'office':                    office,
        'method':                    method,
        'status':                    AppointmentStatus.PENDING_STUDENT_APPROVAL.value,
        'counselor_proposed_at':     now,
        'updated_at':                now,
    }})
    audit_log(db.db, 'appointments', 'counselor_scheduled', entity_id=appointment_id)
    return jsonify({'message': 'Session proposed — awaiting student confirmation.'}), 200


@appointments_bp.route('/<appointment_id>/confirm-schedule', methods=['POST'])
@jwt_required()
def confirm_schedule(appointment_id):
    """Student confirms the counselor-proposed schedule."""
    user_id = get_jwt_identity()
    try:
        apt_id = ObjectId(appointment_id)
    except Exception:
        return jsonify({'error': 'Invalid appointment ID'}), 400

    apt = db.db.appointments.find_one({'_id': apt_id})
    if not apt:
        return jsonify({'error': 'Appointment not found'}), 404

    if str(apt.get('student_id', '')) != str(user_id):
        return jsonify({'error': 'Only the student can confirm this schedule'}), 403

    if apt.get('status') != AppointmentStatus.PENDING_STUDENT_APPROVAL.value:
        return jsonify({'error': 'Appointment is not awaiting confirmation'}), 400

    now = datetime.utcnow()
    db.db.appointments.update_one({'_id': apt_id}, {'$set': {
        'status':       AppointmentStatus.CONFIRMED.value,
        'confirmed_at': now,
        'updated_at':   now,
    }})
    audit_log(db.db, 'appointments', 'student_confirmed_schedule', entity_id=appointment_id)

    # Send confirmation email with calendar invite
    try:
        student   = db.db.users.find_one({'_id': apt.get('student_id')})
        counselor = db.db.users.find_one({'_id': apt.get('counselor_id')}) if apt.get('counselor_id') else None
        scheduled_start = apt.get('scheduled_start')
        if student and scheduled_start:
            from services.email_service import EmailService
            from datetime import timedelta
            end_dt = apt.get('scheduled_end') or (scheduled_start + timedelta(hours=1))
            platform_raw  = apt.get('preferred_method') or apt.get('method') or 'in_person'
            pref_platform = apt.get('preferred_platform', '')
            platform_map  = {'google_meet': 'Google Meet', 'google-meet': 'Google Meet',
                             'zoom': 'Zoom', 'in_person': 'In-Person', 'in-person': 'In-Person'}
            if platform_raw == 'online' and pref_platform:
                platform_label = platform_map.get(pref_platform, pref_platform.replace('-', ' ').title())
            else:
                platform_label = platform_map.get(platform_raw, platform_raw.replace('_', ' ').title())
            counselor_name = (
                f"{counselor.get('first_name','')} {counselor.get('last_name','')}".strip()
                if counselor else 'CPS Counselor'
            )
            EmailService().send_appointment_confirmation_email(
                recipient_email=student.get('email', ''),
                student_name=f"{student.get('first_name','')} {student.get('last_name','')}".strip(),
                appointment_details={
                    'reference_id':      apt.get('reference_id', ''),
                    'appointment_date':  scheduled_start.strftime('%B %d, %Y'),
                    'appointment_time':  scheduled_start.strftime('%I:%M %p'),
                    'platform':          platform_label,
                    'counselor_name':    counselor_name,
                    'concern':           apt.get('concern', ''),
                    'meeting_link':      apt.get('meeting_link', ''),
                    'start_dt':          scheduled_start,
                    'end_dt':            end_dt,
                },
            )
            print(f"✓ Schedule-confirmation email sent to {student.get('email')}")
    except Exception as e:
        print(f"⚠ Schedule-confirmation email failed: {e}")

    return jsonify({'message': 'Schedule confirmed.'}), 200


@appointments_bp.route('/<appointment_id>/confirm-intake', methods=['POST'])
@jwt_required()
def confirm_intake_slot(appointment_id):
    """IC confirms a slot-based booking (REQUESTED → CONFIRMED)."""
    user_id = get_jwt_identity()
    try:
        apt_id = ObjectId(appointment_id)
        uid_obj = ObjectId(user_id)
    except Exception:
        return jsonify({'error': 'Invalid ID'}), 400

    user = db.db.users.find_one({'_id': uid_obj})
    if not user or user.get('role') not in ('IC', 'INTAKE_COUNSELOR', 'ADMIN'):
        return jsonify({'error': 'Only Intake Counselors can confirm slot bookings'}), 403

    apt = db.db.appointments.find_one({'_id': apt_id})
    if not apt:
        return jsonify({'error': 'Appointment not found'}), 404
    if apt.get('status') != AppointmentStatus.REQUESTED.value:
        return jsonify({'error': 'Appointment is not in REQUESTED status'}), 400
    if str(apt.get('counselor_id', '')) != str(uid_obj) and user.get('role') != 'ADMIN':
        return jsonify({'error': 'This slot booking is not assigned to you'}), 403

    now = datetime.utcnow()
    preferred_method = apt.get('preferred_method') or 'in-person'
    scheduled_start  = apt.get('scheduled_start') or apt.get('requested_start')
    scheduled_end    = apt.get('scheduled_end')   or (scheduled_start + timedelta(minutes=_cfg('APPOINTMENT_DURATION_MINUTES', 60)) if scheduled_start else None)

    confirm_fields = {
        'status':       AppointmentStatus.CONFIRMED.value,
        'confirmed_by': uid_obj,
        'confirmed_at': now,
        'updated_at':   now,
    }
    if not apt.get('scheduled_start') and scheduled_start:
        confirm_fields['scheduled_start'] = scheduled_start
    if not apt.get('preferred_method'):
        confirm_fields['preferred_method'] = preferred_method

    # Auto-create Google Meet link only for Google Meet appointments
    meeting_link = apt.get('meeting_link')
    pref_platform = apt.get('preferred_platform', '')
    is_google_meet = preferred_method in ('google_meet', 'google-meet') or pref_platform in ('google-meet', 'google_meet')
    if not meeting_link and is_google_meet and scheduled_start:
        try:
            from blueprints.google_calendar import sync_appointment_to_calendar
            appt_for_sync = dict(apt)
            appt_for_sync['scheduled_start'] = scheduled_start
            appt_for_sync['scheduled_end']   = scheduled_end
            _, meet_link = sync_appointment_to_calendar(str(uid_obj), appt_for_sync)
            if meet_link:
                meeting_link = meet_link
                confirm_fields['meeting_link']  = meet_link
                confirm_fields['is_telehealth'] = True
                print(f"✓ Google Meet created for IC-confirmed appointment: {meet_link}")
            else:
                print("⚠ Google Meet: IC has not connected Google Calendar")
        except Exception as e:
            print(f"⚠ Google Meet creation failed: {e}")

    db.db.appointments.update_one({'_id': apt_id}, {'$set': confirm_fields})

    # Send confirmation email to student
    try:
        student   = db.db.users.find_one({'_id': apt.get('student_id')})
        counselor = db.db.users.find_one({'_id': apt.get('counselor_id')}) if apt.get('counselor_id') else user
        if student and scheduled_start:
            from services.email_service import EmailService
            appt_data = {
                'student_name':    f"{student.get('first_name','')} {student.get('last_name','')}".strip(),
                'student_id':      student.get('student_id', 'N/A'),
                'student_email':   student.get('email', ''),
                'student_contact': student.get('phone_number', student.get('email', '')),
                'reference_id':    apt.get('reference_id', ''),
                'appointment_date': scheduled_start.strftime('%B %d, %Y'),
                'appointment_time': scheduled_start.strftime('%I:%M %p'),
                'platform':        {'google_meet': 'Google Meet', 'google-meet': 'Google Meet', 'zoom': 'Zoom', 'in_person': 'In-Person', 'in-person': 'In-Person'}.get(
                                       pref_platform if preferred_method == 'online' else preferred_method,
                                       (pref_platform or preferred_method or 'In-Person').replace('-', ' ').title()
                                   ),
                'counselor_name':  f"{counselor.get('first_name','')} {counselor.get('last_name','')}".strip() if counselor else 'CPS Intake Counselor',
                'concern':         apt.get('concern', ''),
                'meeting_link':    meeting_link or '',
                'screenings_completed': [],
            }
            appt_data['start_dt'] = scheduled_start
            appt_data['end_dt']   = scheduled_end
            EmailService().send_appointment_confirmation_email(
                recipient_email=student.get('email', ''),
                student_name=appt_data['student_name'],
                appointment_details=appt_data,
            )
            print(f"✓ Confirmation email sent to {student.get('email')}")
    except Exception as e:
        print(f"⚠ Confirmation email failed: {e}")

    audit_log(db.db, 'appointments', 'ic_confirmed_slot_booking', entity_id=appointment_id,
              new_values={'confirmed_by': str(uid_obj), 'meeting_link': meeting_link or ''})
    return jsonify({
        'message': 'Appointment confirmed.',
        'meeting_link': meeting_link or None,
    }), 200


# ─── FLOWCHART-ALIGNED ENDPOINTS ───────────────────────────────────────────

@appointments_bp.route('/<appointment_id>/close-at-intake', methods=['POST'])
@jwt_required()
def close_at_intake(appointment_id):
    """IC closes a case at intake — student does not need continuing sessions."""
    user_id = get_jwt_identity()
    if not user_has_permission(db.db, user_id, PermissionType.ASSIGN_CASES.value):
        return jsonify({'error': 'Only Intake Counselors or Staff can close at intake'}), 403

    data = request.get_json() or {}
    reason = data.get('reason', '').strip()

    try:
        apt = db.db.appointments.find_one({'_id': ObjectId(appointment_id)})
    except Exception:
        apt = db.db.appointments.find_one({'_id': appointment_id})

    if not apt:
        return jsonify({'error': 'Appointment not found'}), 404

    allowed = {
        AppointmentStatus.CONFIRMED.value,
        AppointmentStatus.APPROVED.value,
        AppointmentStatus.MATCHED.value,
        AppointmentStatus.EVALUATION.value,
    }
    if apt.get('status') not in allowed:
        return jsonify({'error': f"Cannot close at intake from status '{apt.get('status')}'"}), 400

    now = datetime.utcnow()

    # Close the appointment
    db.db.appointments.update_one(
        {'_id': apt['_id']},
        {'$set': {
            'status': AppointmentStatus.CLOSED_AT_INTAKE.value,
            'closed_at_intake_reason': reason,
            'closed_at_intake_by': user_id,
            'closed_at_intake_at': now,
            'updated_at': now,
        }}
    )

    # Close the linked case if it exists
    case_id = apt.get('case_id')
    if case_id:
        try:
            db.db.cases.update_one(
                {'_id': ObjectId(str(case_id))},
                {'$set': {
                    'status': CaseStatus.CLOSED.value,
                    'termination_type': TerminationType.CLOSED_AT_INTAKE.value,
                    'termination_reason': reason or 'No continuing sessions required after intake.',
                    'terminated_by': user_id,
                    'terminated_at': now,
                    'updated_at': now,
                }}
            )
        except Exception:
            pass

    audit_log(db.db, 'appointment', 'close_at_intake', entity_id=appointment_id,
              new_values={'reason': reason, 'closed_by': user_id})

    return jsonify({
        'message': 'Case closed at intake successfully.',
        'appointment_id': appointment_id,
        'status': AppointmentStatus.CLOSED_AT_INTAKE.value,
    }), 200


@appointments_bp.route('/<appointment_id>/acknowledge-session', methods=['POST'])
@jwt_required()
def acknowledge_session(appointment_id):
    """CC/CP acknowledges receipt of an endorsed case within 24 hours."""
    user_id = get_jwt_identity()
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403

    try:
        apt = db.db.appointments.find_one({'_id': ObjectId(appointment_id)})
    except Exception:
        apt = db.db.appointments.find_one({'_id': appointment_id})

    if not apt:
        return jsonify({'error': 'Appointment not found'}), 404

    now = datetime.utcnow()
    db.db.appointments.update_one(
        {'_id': apt['_id']},
        {'$set': {'endorsed_acknowledged_at': now, 'endorsed_acknowledged_by': user_id, 'updated_at': now}}
    )

    # Mark on case too
    case_id = apt.get('case_id')
    if case_id:
        try:
            db.db.cases.update_one(
                {'_id': ObjectId(str(case_id))},
                {'$set': {'endorsed_acknowledged_at': now, 'endorsed_acknowledged_by': user_id}}
            )
        except Exception:
            pass

    audit_log(db.db, 'appointment', 'acknowledge_endorsement', entity_id=appointment_id)
    return jsonify({'message': 'Endorsement acknowledged.', 'acknowledged_at': now.isoformat()}), 200


@appointments_bp.route('/<appointment_id>/complete-with-termination', methods=['POST'])
@jwt_required()
def complete_with_termination(appointment_id):
    """Complete an appointment and record a formal termination type (5 pathways)."""
    user_id = get_jwt_identity()
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403

    data = request.get_json() or {}
    termination_type = data.get('termination_type', '').strip()
    notes = data.get('notes', '').strip()

    valid_types = {t.value for t in TerminationType}
    if termination_type and termination_type not in valid_types:
        return jsonify({'error': f'Invalid termination type. Valid: {sorted(valid_types)}'}), 400

    try:
        apt = db.db.appointments.find_one({'_id': ObjectId(appointment_id)})
    except Exception:
        apt = db.db.appointments.find_one({'_id': appointment_id})

    if not apt:
        return jsonify({'error': 'Appointment not found'}), 404

    now = datetime.utcnow()
    db.db.appointments.update_one(
        {'_id': apt['_id']},
        {'$set': {
            'status': AppointmentStatus.COMPLETED.value,
            'termination_type': termination_type,
            'termination_notes': notes,
            'completed_at': now,
            'updated_at': now,
        }}
    )

    # Propagate to case
    case_id = apt.get('case_id')
    if case_id:
        try:
            db.db.cases.update_one(
                {'_id': ObjectId(str(case_id))},
                {'$set': {
                    'status': CaseStatus.CLOSED.value,
                    'termination_type': termination_type,
                    'termination_notes': notes,
                    'terminated_by': user_id,
                    'terminated_at': now,
                    'updated_at': now,
                }}
            )
        except Exception:
            pass

    audit_log(db.db, 'appointment', 'complete_with_termination', entity_id=appointment_id,
              new_values={'termination_type': termination_type, 'notes': notes})

    return jsonify({
        'message': 'Appointment completed and case closed.',
        'termination_type': termination_type,
        'status': AppointmentStatus.COMPLETED.value,
    }), 200


@appointments_bp.route('/walkin-capacity', methods=['GET'])
@jwt_required()
def walkin_capacity():
    """Return today's walk-in capacity for a counselor (or overall CPS)."""
    counselor_id_str = request.args.get('counselor_id')
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end   = datetime.utcnow().replace(hour=23, minute=59, second=59, microsecond=0)

    query = {
        'status': {'$in': ['CONFIRMED', 'APPROVED', 'MATCHED', 'CHECKED_IN']},
        '$or': [
            {'scheduled_start': {'$gte': today_start, '$lte': today_end}},
            {'requested_start':  {'$gte': today_start, '$lte': today_end}},
        ],
    }
    if counselor_id_str:
        try:
            query['counselor_id'] = ObjectId(counselor_id_str)
        except Exception:
            return jsonify({'error': 'Invalid counselor_id'}), 400

    confirmed_today = db.db.appointments.count_documents(query)

    # Max capacity: read from system booking_rules, fall back to defaults
    rules = db.db.booking_rules.find_one({'type': 'system'}) or {}
    if counselor_id_str:
        max_capacity = int(rules.get('max_daily_appointments_per_counselor', 8))
    else:
        max_capacity = int(rules.get('max_daily_walkins', 20))

    return jsonify({
        'confirmed_today': confirmed_today,
        'max_capacity': max_capacity,
        'has_capacity': confirmed_today < max_capacity,
        'slots_remaining': max(0, max_capacity - confirmed_today),
    }), 200
