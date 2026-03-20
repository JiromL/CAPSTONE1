"""
Appointments Dashboard Endpoints
Role-based appointment request viewing for different user types
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from bson import ObjectId
from datetime import datetime
from models import db, AppointmentStatus

appointments_dashboard_bp = Blueprint('appointments_dashboard', __name__, url_prefix='/api/appointments/dashboard')

@appointments_dashboard_bp.route('/role-view', methods=['GET'])
@jwt_required()
def get_role_based_dashboard():
    """Get appointments view based on user role - efficient and simple"""
    user_id = get_jwt_identity()
    
    try:
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        user = db.db.users.find_one({"_id": user_id_obj})
    except:
        user = db.db.users.find_one({"_id": user_id})
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    role = user.get('role', '').upper()
    user_name = f"{user.get('first_name', '')} {user.get('last_name', '')}"
    
    try:
        # Build data based on role
        if role == 'STUDENT':
            return get_student_appointments(user_id_obj, user_name)
        elif role in ['COUNSELOR', 'PSYCHOLOGIST']:
            return get_counselor_appointments(user_id_obj, user_name)
        elif role == 'ADMIN':
            return get_admin_dashboard(user_id_obj, user_name)
        elif role == 'IC':  # Intake Coordinator
            return get_intake_coordinator_requests(user_id_obj, user_name)
        elif role == 'CSC':  # Case Study Coordinator
            return get_case_coordinator_requests(user_id_obj, user_name)
        else:
            return get_generic_dashboard(user_id_obj, user_name)
    
    except Exception as e:
        return jsonify({'error': f'Failed to fetch dashboard: {str(e)}'}), 500

def get_student_appointments(user_id_obj, user_name):
    """STUDENT: View only their own appointments"""
    try:
        # Find all cases for this student
        student_cases = list(db.db.cases.find({"student_id": user_id_obj}))
        case_ids = [case['_id'] for case in student_cases]
        
        if case_ids:
            appointments = list(db.db.appointments.find({
                "case_id": {"$in": case_ids}
            }).sort("created_at", -1))
        else:
            appointments = []
        
        # Count by status
        status_counts = db.db.appointments.aggregate([
            {"$match": {"case_id": {"$in": case_ids}}} if case_ids else {"$match": {}},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ]) if case_ids else []
        
        status_map = {item['_id']: item['count'] for item in status_counts}
        
        return jsonify({
            'role': 'STUDENT',
            'user_name': user_name,
            'view_type': 'personal_appointments',
            'appointments': format_appointments(appointments),
            'summary': {
                'total': len(appointments),
                'by_status': status_map
            },
            'can_edit': True,
            'can_delete': True
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_counselor_appointments(user_id_obj, user_name):
    """COUNSELOR/PSYCHOLOGIST: View their assigned appointments"""
    try:
        # Get appointments assigned to this counselor
        appointments = list(db.db.appointments.find({
            "counselor_id": user_id_obj
        }).sort("requested_start", 1))
        
        # Separate by status
        pending_approval = [a for a in appointments if a.get('status') == AppointmentStatus.PENDING_APPROVAL.value]
        confirmed = [a for a in appointments if a.get('status') == AppointmentStatus.CONFIRMED.value]
        completed = [a for a in appointments if a.get('status') == AppointmentStatus.COMPLETED.value]
        
        return jsonify({
            'role': 'COUNSELOR',
            'user_name': user_name,
            'view_type': 'assigned_appointments',
            'appointments': {
                'pending_approval': format_appointments(pending_approval),
                'confirmed': format_appointments(confirmed),
                'completed': format_appointments(completed)
            },
            'summary': {
                'pending_approval': len(pending_approval),
                'confirmed': len(confirmed),
                'completed': len(completed),
                'total': len(appointments)
            },
            'can_approve': True,
            'can_reschedule': True
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_admin_dashboard(user_id_obj, user_name):
    """ADMIN: View all appointments with detailed statistics"""
    try:
        # Get all appointments
        all_appointments = list(db.db.appointments.find({}))
        
        # Count by status
        status_pipeline = [
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ]
        status_stats = list(db.db.appointments.aggregate(status_pipeline))
        status_map = {item['_id']: item['count'] for item in status_stats}
        
        # Count by counselor
        counselor_pipeline = [
            {"$group": {"_id": "$counselor_id", "count": {"$sum": 1}}}
        ]
        counselor_stats = list(db.db.appointments.aggregate(counselor_pipeline))
        
        # Get counselor names
        counselor_data = []
        for stat in counselor_stats:
            if stat['_id']:
                counselor = db.db.users.find_one({"_id": ObjectId(stat['_id'])})
                counselor_data.append({
                    'counselor_id': str(stat['_id']),
                    'counselor_name': f"{counselor.get('first_name', '')} {counselor.get('last_name', '')}" if counselor else 'Unknown',
                    'appointment_count': stat['count']
                })
        
        return jsonify({
            'role': 'ADMIN',
            'user_name': user_name,
            'view_type': 'all_appointments_admin',
            'appointments': format_appointments(all_appointments[:50]),  # Last 50 for efficiency
            'summary': {
                'total_appointments': len(all_appointments),
                'by_status': status_map,
                'by_counselor': counselor_data
            },
            'can_assign': True,
            'can_view_all': True
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_intake_coordinator_requests(user_id_obj, user_name):
    """IC: View pending appointment requests that need assignment"""
    try:
        # Get REQUESTED status appointments (not yet assigned to counselor)
        pending_requests = list(db.db.appointments.find({
            "status": AppointmentStatus.REQUESTED.value
        }).sort("created_at", -1))
        
        # Also get PENDING_APPROVAL for review
        pending_approval = list(db.db.appointments.find({
            "status": AppointmentStatus.PENDING_APPROVAL.value
        }).sort("created_at", -1))
        
        return jsonify({
            'role': 'IC',
            'user_name': user_name,
            'view_type': 'pending_requests',
            'pending_requests': format_appointments(pending_requests),
            'pending_approval': format_appointments(pending_approval),
            'summary': {
                'unassigned_requests': len(pending_requests),
                'awaiting_approval': len(pending_approval),
                'action_required': len(pending_requests) + len(pending_approval)
            },
            'can_assign_counselor': True,
            'can_approve': True
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_case_coordinator_requests(user_id_obj, user_name):
    """CSC: View case-related appointment requests"""
    try:
        # Get all appointments (similar to admin but focused on cases)
        appointments = list(db.db.appointments.find({}))
        
        # Group by case for better overview
        cases = list(db.db.cases.find({}))
        
        case_appointment_map = {}
        for case in cases:
            case_appts = [a for a in appointments if str(a.get('case_id')) == str(case['_id'])]
            if case_appts:
                case_appointment_map[str(case['_id'])] = {
                    'case_name': case.get('student_name', 'Unknown'),
                    'student_id': str(case.get('student_id')),
                    'appointments': format_appointments(case_appts),
                    'count': len(case_appts)
                }
        
        return jsonify({
            'role': 'CSC',
            'user_name': user_name,
            'view_type': 'case_appointments',
            'cases_with_appointments': case_appointment_map,
            'summary': {
                'total_cases': len(case_appointment_map),
                'total_appointments': len(appointments)
            },
            'can_manage_cases': True
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_generic_dashboard(user_id_obj, user_name):
    """Generic view for other roles"""
    try:
        appointments = list(db.db.appointments.find({}).limit(20))
        
        return jsonify({
            'role': 'OTHER_STAFF',
            'user_name': user_name,
            'view_type': 'generic',
            'appointments': format_appointments(appointments),
            'summary': {
                'total': len(appointments)
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def format_appointments(appointments):
    """Convert appointments to JSON-friendly format"""
    formatted = []
    for apt in appointments:
        try:
            # Get student info
            if apt.get('student_id'):
                student = db.db.users.find_one({"_id": ObjectId(apt['student_id'])})
            else:
                student = None
            
            # Get counselor info
            if apt.get('counselor_id'):
                counselor = db.db.users.find_one({"_id": ObjectId(apt['counselor_id'])})
            else:
                counselor = None
            
            formatted.append({
                'appointment_id': str(apt.get('_id')),
                'student_name': f"{student.get('first_name', '')} {student.get('last_name', '')}" if student else 'Unknown',
                'student_email': student.get('email') if student else '',
                'counselor_name': f"{counselor.get('first_name', '')} {counselor.get('last_name', '')}" if counselor else 'Not Assigned',
                'status': apt.get('status', 'UNKNOWN'),
                'purpose': apt.get('purpose', ''),
                'concern': apt.get('concern', ''),
                'preferred_date': apt.get('requested_start', ''),
                'preferred_time': apt.get('requested_start', ''),
                'method': apt.get('preferred_method', 'in-person'),
                'referral_type': apt.get('referral_type', ''),
                'created_at': apt.get('created_at', '').isoformat() if hasattr(apt.get('created_at'), 'isoformat') else str(apt.get('created_at', ''))
            })
        except Exception as e:
            print(f"Error formatting appointment: {e}")
            continue
    
    return formatted
