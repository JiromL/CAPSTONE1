"""
Additional appointment endpoints for enhanced functionality
- Counselor availability
- Appointment statistics
- Appointment reminders
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from models import db, AppointmentStatus, UserRole
from datetime import datetime, timedelta

appointments_enh_bp = Blueprint('appointments_enh', __name__, url_prefix='/api/appointments')


@appointments_enh_bp.route('/counselor/<counselor_id>/availability', methods=['GET'])
@jwt_required()
def get_counselor_availability(counselor_id):
    """Get counselor's available time slots for the next 30 days"""
    try:
        counselor_id_obj = ObjectId(counselor_id)
        
        # Get counselor info
        counselor = db.db.users.find_one({"_id": counselor_id_obj})
        if not counselor:
            return jsonify({'error': 'Counselor not found'}), 404
        
        # Get existing appointments for this counselor
        existing_apts = list(db.db.appointments.find({
            'counselor_id': counselor_id_obj,
            'status': {'$in': [AppointmentStatus.CONFIRMED.value, AppointmentStatus.MATCHED.value, 'SCHEDULED']},
            'scheduled_start': {'$gte': datetime.utcnow()},
            'scheduled_start': {'$lte': datetime.utcnow() + timedelta(days=30)}
        }))
        
        # Build availability slots (simplified: 9 AM to 5 PM, 1-hour slots)
        available_slots = []
        current_date = datetime.utcnow().date()
        
        for day_offset in range(1, 31):  # Next 30 days
            slot_date = (datetime.utcnow() + timedelta(days=day_offset)).date()
            
            # Skip weekends
            if slot_date.weekday() >= 5:
                continue
            
            for hour in range(9, 17):  # 9 AM to 4 PM
                slot_start = datetime.combine(slot_date, datetime.min.time()).replace(hour=hour)
                slot_end = slot_start + timedelta(hours=1)
                
                # Check if slot conflicts with existing appointments
                conflict = any(
                    apt.get('scheduled_start') and 
                    apt.get('scheduled_end') and
                    apt['scheduled_start'] < slot_end and 
                    apt['scheduled_end'] > slot_start
                    for apt in existing_apts
                )
                
                if not conflict:
                    available_slots.append({
                        'date': slot_date.isoformat(),
                        'time': f"{hour:02d}:00",
                        'start': slot_start.isoformat(),
                        'end': slot_end.isoformat(),
                        'available': True
                    })
        
        return jsonify({
            'counselor_id': str(counselor_id_obj),
            'counselor_name': counselor.get('name', 'Unknown'),
            'available_slots': available_slots[:20],  # Limit to first 20 slots
            'total_available': len(available_slots)
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Error in get_counselor_availability: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': f'Failed to fetch availability: {str(e)}'}), 500


@appointments_enh_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_appointment_stats():
    """Get appointment statistics for dashboard"""
    user_id = get_jwt_identity()
    
    try:
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        user = db.db.users.find_one({"_id": user_id_obj})
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        role = user.get('role', '').upper()
        
        # Build query based on role
        if role == 'STUDENT':
            student_cases = list(db.db.cases.find({"student_id": user_id_obj}))
            case_ids = [case['_id'] for case in student_cases]
            query = {"case_id": {"$in": case_ids}} if case_ids else {"_id": ObjectId("000000000000000000000000")}
        else:
            query = {"counselor_id": user_id_obj}
        
        # Calculate stats
        total = db.db.appointments.count_documents(query)
        upcoming = db.db.appointments.count_documents({
            **query,
            'status': {'$nin': [AppointmentStatus.COMPLETED.value, AppointmentStatus.CANCELLED.value]},
            'scheduled_start': {'$gte': datetime.utcnow()}
        })
        completed = db.db.appointments.count_documents({
            **query,
            'status': AppointmentStatus.COMPLETED.value
        })
        cancelled = db.db.appointments.count_documents({
            **query,
            'status': AppointmentStatus.CANCELLED.value
        })
        
        # Get next appointment
        next_apt = db.db.appointments.find_one(
            {
                **query,
                'scheduled_start': {'$gte': datetime.utcnow()}
            },
            sort=[('scheduled_start', 1)]
        )
        
        return jsonify({
            'total_appointments': total,
            'upcoming': upcoming,
            'completed': completed,
            'cancelled': cancelled,
            'next_appointment': {
                'date': next_apt['scheduled_start'].isoformat() if next_apt and next_apt.get('scheduled_start') else None,
                'time': next_apt.get('appointment_time') if next_apt else None
            } if next_apt else None
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Error in get_appointment_stats: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': f'Failed to fetch stats: {str(e)}'}), 500
