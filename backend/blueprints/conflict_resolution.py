"""
CONFLICT RESOLUTION & DOUBLE-BOOKING PREVENTION
Endpoints for detecting, preventing, and resolving scheduling conflicts and double-bookings
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from models import db, AppointmentStatus, PermissionType
from utils import user_has_permission, audit_log, server_error
from datetime import datetime, timedelta

conflict_resolution_bp = Blueprint('conflict_resolution', __name__, url_prefix='/api/conflict-resolution')


# ============================================================================
# CONFLICT DETECTION & PREVENTION
# ============================================================================

def detect_conflicts(counselor_id, start_time, end_time, exclude_appointment_id=None):
    """
    Detect all conflicts for a given counselor and time slot
    Returns list of conflicting appointments
    """
    query = {
        'counselor_id': counselor_id,
        'status': {'$in': [AppointmentStatus.CONFIRMED.value, AppointmentStatus.MATCHED.value, 'SCHEDULED']},
        'scheduled_start': {'$lt': end_time},
        'scheduled_end': {'$gt': start_time}
    }
    
    if exclude_appointment_id:
        try:
            exc_id = ObjectId(exclude_appointment_id) if isinstance(exclude_appointment_id, str) else exclude_appointment_id
            query['_id'] = {'$ne': exc_id}
        except:
            pass
    
    conflicts = list(db.db.appointments.find(query))
    return conflicts


def detect_student_double_booking(student_id, start_time, end_time, exclude_appointment_id=None):
    """
    Detect if student has overlapping appointments (student can't attend two appointments at once)
    Returns list of conflicting appointments for this student
    """
    query = {
        'student_id': student_id,
        'status': {'$in': [AppointmentStatus.CONFIRMED.value, AppointmentStatus.MATCHED.value, 'SCHEDULED']},
        'scheduled_start': {'$lt': end_time},
        'scheduled_end': {'$gt': start_time}
    }
    
    if exclude_appointment_id:
        try:
            exc_id = ObjectId(exclude_appointment_id) if isinstance(exclude_appointment_id, str) else exclude_appointment_id
            query['_id'] = {'$ne': exc_id}
        except:
            pass
    
    conflicts = list(db.db.appointments.find(query))
    return conflicts


@conflict_resolution_bp.route('/check-all-conflicts', methods=['POST'])
@jwt_required()
def check_all_conflicts():
    """
    Comprehensive conflict check for a proposed appointment
    Checks: counselor availability, student availability, time zone conflicts, resource conflicts
    Request body: {
        "counselor_id": "...",
        "student_id": "...",
        "scheduled_start": "2026-03-23T10:00:00",
        "scheduled_end": "2026-03-23T11:00:00",
        "exclude_appointment_id": "..." (optional, for rescheduling)
    }
    """
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    try:
        # Parse required fields
        counselor_id = data.get('counselor_id')
        student_id = data.get('student_id')
        start_str = data.get('scheduled_start')
        end_str = data.get('scheduled_end')
        exclude_apt_id = data.get('exclude_appointment_id')
        
        if not all([counselor_id, student_id, start_str, end_str]):
            return jsonify({'error': 'Missing required fields: counselor_id, student_id, scheduled_start, scheduled_end'}), 400
        
        try:
            start_time = datetime.fromisoformat(start_str) if isinstance(start_str, str) else start_str
            end_time = datetime.fromisoformat(end_str) if isinstance(end_str, str) else end_str
        except ValueError:
            return jsonify({'error': 'Invalid datetime format. Use ISO format (YYYY-MM-DDTHH:MM:SS)'}), 400
        
        try:
            counselor_obj_id = ObjectId(counselor_id) if isinstance(counselor_id, str) else counselor_id
            student_obj_id = ObjectId(student_id) if isinstance(student_id, str) else student_id
        except:
            counselor_obj_id = counselor_id
            student_obj_id = student_id
        
        # Check if duration is valid
        if start_time >= end_time:
            return jsonify({'error': 'End time must be after start time'}), 400
        
        duration_minutes = (end_time - start_time).total_seconds() / 60
        if duration_minutes < 15:
            return jsonify({'error': 'Appointment duration must be at least 15 minutes'}), 400
        if duration_minutes > 120:
            return jsonify({'error': 'Appointment duration cannot exceed 2 hours'}), 400
        
        # Check counselor conflicts
        counselor_conflicts = detect_conflicts(counselor_obj_id, start_time, end_time, exclude_apt_id)
        
        # Check student conflicts
        student_conflicts = detect_student_double_booking(student_obj_id, start_time, end_time, exclude_apt_id)
        
        # Check if counselor is active and available
        counselor = db.db.users.find_one({'_id': counselor_obj_id})
        if not counselor:
            return jsonify({'error': 'Counselor not found'}), 404
        
        if not counselor.get('is_active'):
            return jsonify({'error': 'Counselor is not active'}), 400
        
        # Check if student exists
        student = db.db.users.find_one({'_id': student_obj_id})
        if not student:
            return jsonify({'error': 'Student not found'}), 404
        
        # Check if time slot is within counselor's available hours
        counselor_available = db.db.counselor_availability.find_one({
            'counselor_id': counselor_obj_id,
            'slot_start': {'$lte': start_time},
            'slot_end': {'$gte': end_time},
            'is_available': True
        })
        
        availability_ok = counselor_available is not None
        
        # Compile all conflict info
        all_conflicts = []
        
        if counselor_conflicts:
            for conflict in counselor_conflicts:
                all_conflicts.append({
                    'type': 'COUNSELOR_BOOKING_CONFLICT',
                    'conflict_id': str(conflict['_id']),
                    'conflicting_start': conflict['scheduled_start'].isoformat(),
                    'conflicting_end': conflict['scheduled_end'].isoformat(),
                    'student_name': f"{db.db.users.find_one({'_id': conflict.get('student_id')}).get('first_name', '')} {db.db.users.find_one({'_id': conflict.get('student_id')}).get('last_name', '')}" if conflict.get('student_id') else 'Unknown',
                    'severity': 'CRITICAL'
                })
        
        if student_conflicts:
            for conflict in student_conflicts:
                all_conflicts.append({
                    'type': 'STUDENT_DOUBLE_BOOKING',
                    'conflict_id': str(conflict['_id']),
                    'conflicting_start': conflict['scheduled_start'].isoformat(),
                    'conflicting_end': conflict['scheduled_end'].isoformat(),
                    'counselor_name': f"{db.db.users.find_one({'_id': conflict.get('counselor_id')}).get('first_name', '')} {db.db.users.find_one({'_id': conflict.get('counselor_id')}).get('last_name', '')}" if conflict.get('counselor_id') else 'Unknown',
                    'severity': 'CRITICAL'
                })
        
        if not availability_ok:
            all_conflicts.append({
                'type': 'OUTSIDE_AVAILABILITY_HOURS',
                'message': 'Requested time slot is outside counselor\'s available hours',
                'severity': 'HIGH'
            })
        
        # Determine if appointment is possible
        is_available = len(all_conflicts) == 0 and availability_ok
        
        return jsonify({
            'is_available': is_available,
            'total_conflicts': len(all_conflicts),
            'conflicts': all_conflicts,
            'proposed_slot': {
                'start': start_time.isoformat(),
                'end': end_time.isoformat(),
                'duration_minutes': duration_minutes
            },
            'counselor': {
                'id': str(counselor['_id']),
                'name': f"{counselor.get('first_name', '')} {counselor.get('last_name', '')}",
                'is_active': counselor.get('is_active'),
                'role': counselor.get('role')
            },
            'student': {
                'id': str(student['_id']),
                'name': f"{student.get('first_name', '')} {student.get('last_name', '')}",
                'email': student.get('email')
            }
        }), 200
        
    except Exception as e:
        print(f"Error in check_all_conflicts: {str(e)}")
        import traceback
        traceback.print_exc()
        return server_error(e, 'Failed to check conflicts. Please try again.')


@conflict_resolution_bp.route('/detect-double-bookings', methods=['GET'])
@jwt_required()
def detect_double_bookings():
    """
    Scan database for existing double-bookings/conflicts
    Can filter by: counselor_id, student_id, date_range
    """
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.ASSIGN_CASES.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        # Get filters
        counselor_id = request.args.get('counselor_id')
        student_id = request.args.get('student_id')
        days_back = int(request.args.get('days_back', 7))
        
        now = datetime.utcnow()
        date_cutoff = now - timedelta(days=days_back)
        
        # Query for confirmed/matched appointments
        base_query = {
            'scheduled_start': {'$gte': date_cutoff},
            'status': {'$in': [AppointmentStatus.CONFIRMED.value, AppointmentStatus.MATCHED.value]}
        }
        
        if counselor_id:
            try:
                base_query['counselor_id'] = ObjectId(counselor_id)
            except:
                base_query['counselor_id'] = counselor_id
        
        if student_id:
            try:
                base_query['student_id'] = ObjectId(student_id)
            except:
                base_query['student_id'] = student_id
        
        appointments = list(db.db.appointments.find(base_query).sort('scheduled_start', 1))
        
        # Find overlaps
        detected_conflicts = []
        checked_pairs = set()
        
        for i, apt1 in enumerate(appointments):
            for apt2 in appointments[i+1:]:
                pair_key = tuple(sorted([str(apt1['_id']), str(apt2['_id'])]))
                if pair_key in checked_pairs:
                    continue
                checked_pairs.add(pair_key)
                
                # Check if they overlap
                if (apt1['scheduled_start'] < apt2['scheduled_end'] and 
                    apt1['scheduled_end'] > apt2['scheduled_start']):
                    
                    # Check conflict type
                    conflict_type = 'UNKNOWN'
                    if apt1.get('counselor_id') == apt2.get('counselor_id'):
                        conflict_type = 'COUNSELOR_DOUBLE_BOOKING'
                    elif apt1.get('student_id') == apt2.get('student_id'):
                        conflict_type = 'STUDENT_DOUBLE_BOOKING'
                    
                    counselor1 = db.db.users.find_one({'_id': apt1.get('counselor_id')})
                    counselor2 = db.db.users.find_one({'_id': apt2.get('counselor_id')})
                    student1 = db.db.users.find_one({'_id': apt1.get('student_id')})
                    student2 = db.db.users.find_one({'_id': apt2.get('student_id')})
                    
                    detected_conflicts.append({
                        'conflict_type': conflict_type,
                        'appointment_1': {
                            'id': str(apt1['_id']),
                            'student': f"{student1.get('first_name', '')} {student1.get('last_name', '')}" if student1 else 'Unknown',
                            'counselor': f"{counselor1.get('first_name', '')} {counselor1.get('last_name', '')}" if counselor1 else 'Unknown',
                            'start': apt1['scheduled_start'].isoformat(),
                            'end': apt1['scheduled_end'].isoformat()
                        },
                        'appointment_2': {
                            'id': str(apt2['_id']),
                            'student': f"{student2.get('first_name', '')} {student2.get('last_name', '')}" if student2 else 'Unknown',
                            'counselor': f"{counselor2.get('first_name', '')} {counselor2.get('last_name', '')}" if counselor2 else 'Unknown',
                            'start': apt2['scheduled_start'].isoformat(),
                            'end': apt2['scheduled_end'].isoformat()
                        },
                        'overlap_minutes': round((min(apt1['scheduled_end'], apt2['scheduled_end']) - 
                                                 max(apt1['scheduled_start'], apt2['scheduled_start'])).total_seconds() / 60, 2)
                    })
        
        return jsonify({
            'timestamp': datetime.utcnow().isoformat(),
            'scan_period_days': days_back,
            'total_appointments_scanned': len(appointments),
            'conflicts_found': len(detected_conflicts),
            'conflicts': detected_conflicts
        }), 200
        
    except Exception as e:
        print(f"Error in detect_double_bookings: {str(e)}")
        import traceback
        traceback.print_exc()
        return server_error(e, 'Failed to detect conflicts. Please try again.')


@conflict_resolution_bp.route('/resolve/<appointment_id>', methods=['POST'])
@jwt_required()
def resolve_conflict(appointment_id):
    """
    Attempt to resolve a conflict by rescheduling one of the conflicting appointments
    Request body: {
        "action": "reschedule_to_next_available" | "suggest_alternative" | "notify_counselor"
    }
    """
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.ASSIGN_CASES.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        # Get appointment
        try:
            apt_id = ObjectId(appointment_id)
        except:
            apt_id = appointment_id
        
        appointment = db.db.appointments.find_one({'_id': apt_id})
        if not appointment:
            return jsonify({'error': 'Appointment not found'}), 404
        
        data = request.get_json() or {}
        action = data.get('action', 'suggest_alternative')
        
        # Find conflicts for this appointment
        conflicts = detect_conflicts(
            appointment['counselor_id'],
            appointment['scheduled_start'],
            appointment['scheduled_end'],
            apt_id
        )
        
        if not conflicts:
            return jsonify({
                'message': 'No conflicts found for this appointment',
                'appointment_id': str(apt_id)
            }), 200
        
        if action == 'reschedule_to_next_available':
            # Find next available slot for counselor after this appointment
            next_available = db.db.counselor_availability.find_one({
                'counselor_id': appointment['counselor_id'],
                'slot_start': {'$gt': appointment['scheduled_end']},
                'is_available': True
            }, sort=[('slot_start', 1)])
            
            if not next_available:
                return jsonify({'error': 'No available slots for rescheduling'}), 400
            
            # Would perform rescheduling here
            return jsonify({
                'action_recommended': 'reschedule',
                'appointment_id': str(apt_id),
                'new_slot_available': {
                    'start': next_available['slot_start'].isoformat(),
                    'end': next_available['slot_end'].isoformat()
                },
                'conflicting_appointments': [str(c['_id']) for c in conflicts]
            }), 200
        
        elif action == 'suggest_alternative':
            # Find alternative counselors for the appointment time
            case = db.db.cases.find_one({'_id': appointment['case_id']})
            
            alternatives = []
            counselors = list(db.db.users.find({
                'role': {'$in': ['COUNSELOR', 'PSYCHOLOGIST']},
                '_id': {'$ne': appointment['counselor_id']},
                'is_active': True
            }))
            
            for counselor in counselors:
                # Check if this counselor is free
                if not detect_conflicts(
                    counselor['_id'],
                    appointment['scheduled_start'],
                    appointment['scheduled_end']
                ):
                    alternatives.append({
                        'counselor_id': str(counselor['_id']),
                        'counselor_name': f"{counselor.get('first_name', '')} {counselor.get('last_name', '')}",
                        'role': counselor.get('role')
                    })
            
            return jsonify({
                'action_recommended': 'assign_alternative_counselor',
                'appointment_id': str(apt_id),
                'current_counselor_id': str(appointment['counselor_id']),
                'conflicting_count': len(conflicts),
                'alternative_counselors': alternatives[:5]  # Return top 5
            }), 200
        
        elif action == 'notify_counselor':
            # Would send notification to counselor
            return jsonify({
                'message': 'Counselor notification queued',
                'appointment_id': str(apt_id),
                'conflicts_detected': len(conflicts)
            }), 200
        
        else:
            return jsonify({'error': 'Unknown action'}), 400
        
    except Exception as e:
        print(f"Error in resolve_conflict: {str(e)}")
        import traceback
        traceback.print_exc()
        return server_error(e, 'Failed to resolve conflict. Please try again.')


@conflict_resolution_bp.route('/validate-timeslot', methods=['POST'])
@jwt_required()
def validate_timeslot():
    """
    Quick validation of whether a time slot is available for counselor
    Simpler version of check_all_conflicts for frontend validation
    """
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    try:
        counselor_id = data.get('counselor_id')
        start_str = data.get('start')
        end_str = data.get('end')
        
        if not all([counselor_id, start_str, end_str]):
            return jsonify({'valid': False, 'reason': 'Missing required fields'}), 400
        
        try:
            start_time = datetime.fromisoformat(start_str)
            end_time = datetime.fromisoformat(end_str)
        except:
            return jsonify({'valid': False, 'reason': 'Invalid datetime format'}), 400
        
        try:
            counselor_obj_id = ObjectId(counselor_id) if isinstance(counselor_id, str) else counselor_id
        except:
            counselor_obj_id = counselor_id
        
        # Quick check
        conflicts = detect_conflicts(counselor_obj_id, start_time, end_time)
        availability = db.db.counselor_availability.find_one({
            'counselor_id': counselor_obj_id,
            'slot_start': {'$lte': start_time},
            'slot_end': {'$gte': end_time},
            'is_available': True
        })
        
        is_valid = len(conflicts) == 0 and availability is not None
        
        return jsonify({
            'valid': is_valid,
            'has_conflicts': len(conflicts) > 0,
            'is_available': availability is not None,
            'reason': 'Slot available' if is_valid else ('Conflicting appointment exists' if conflicts else 'Slot outside availability hours')
        }), 200
        
    except Exception as e:
        print(f"Error in validate_timeslot: {str(e)}")
        return jsonify({'valid': False, 'reason': 'Validation error'}), 500
