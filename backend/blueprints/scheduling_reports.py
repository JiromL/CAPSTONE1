"""
SCHEDULING REPORTS & ANALYTICS
Endpoints for preliminary scheduling reports, capacity planning, and conflict analysis
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from models import db, AppointmentStatus, PermissionType
from utils import user_has_permission
from datetime import datetime, timedelta
from collections import defaultdict

scheduling_reports_bp = Blueprint('scheduling_reports', __name__, url_prefix='/api/scheduling-reports')


# ============================================================================
# PRELIMINARY SCHEDULING REPORTS
# ============================================================================

@scheduling_reports_bp.route('/calendar-capacity', methods=['GET'])
@jwt_required()
def get_calendar_capacity():
    """Get scheduling capacity/utilization for next 30 days (STAFF: ASSIGN_CASES)"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.ASSIGN_CASES.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        # Get query parameters
        days_forward = int(request.args.get('days', 30))
        
        now = datetime.utcnow()
        end_date = now + timedelta(days=days_forward)
        
        # Get all counselors
        counselors = list(db.db.users.find({
            'role': {'$in': ['COUNSELOR', 'PSYCHOLOGIST', 'CSC', 'CSP']},
            'is_active': True
        }))
        
        capacity_report = []
        
        for counselor in counselors:
            # Get availability for this counselor
            available_slots = list(db.db.counselor_availability.find({
                'counselor_id': counselor['_id'],
                'slot_start': {'$gte': now, '$lt': end_date},
                'is_available': True
            }))
            
            # Calculate total available hours
            total_available_minutes = 0
            for slot in available_slots:
                duration = (slot['slot_end'] - slot['slot_start']).total_seconds() / 60
                total_available_minutes += duration
            
            # Get booked appointments
            booked_appointments = list(db.db.appointments.find({
                'counselor_id': counselor['_id'],
                'scheduled_start': {'$gte': now, '$lt': end_date},
                'status': {'$in': [AppointmentStatus.CONFIRMED.value, AppointmentStatus.MATCHED.value]}
            }))
            
            # Calculate booked hours
            total_booked_minutes = 0
            for apt in booked_appointments:
                duration = (apt['scheduled_end'] - apt['scheduled_start']).total_seconds() / 60
                total_booked_minutes += duration
            
            # Calculate utilization %
            utilization = 0
            if total_available_minutes > 0:
                utilization = round((total_booked_minutes / total_available_minutes) * 100, 2)
            
            capacity_report.append({
                'counselor_id': str(counselor['_id']),
                'name': f"{counselor.get('first_name', '')} {counselor.get('last_name', '')}",
                'role': counselor.get('role'),
                'available_slots': len(available_slots),
                'total_available_hours': round(total_available_minutes / 60, 2),
                'booked_appointments': len(booked_appointments),
                'booked_hours': round(total_booked_minutes / 60, 2),
                'utilization_percentage': utilization,
                'status': 'OVERBOOKED' if utilization > 90 else 'HIGH' if utilization > 70 else 'MEDIUM' if utilization > 40 else 'LOW'
            })
        
        # Sort by utilization descending
        capacity_report.sort(key=lambda x: x['utilization_percentage'], reverse=True)
        
        return jsonify({
            'timestamp': datetime.utcnow().isoformat(),
            'period_days': days_forward,
            'period_end': end_date.isoformat(),
            'total_counselors': len(capacity_report),
            'capacity_data': capacity_report,
            'summary': {
                'overbooked_count': len([c for c in capacity_report if c['status'] == 'OVERBOOKED']),
                'high_utilization_count': len([c for c in capacity_report if c['status'] == 'HIGH']),
                'average_utilization': round(sum(c['utilization_percentage'] for c in capacity_report) / len(capacity_report), 2) if capacity_report else 0
            }
        }), 200
        
    except Exception as e:
        print(f"Error in get_calendar_capacity: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to generate capacity report: {str(e)}'}), 500


@scheduling_reports_bp.route('/upcoming-appointments', methods=['GET'])
@jwt_required()
def get_upcoming_appointments_report():
    """Get upcoming appointments scheduled for next N days (STAFF: VIEW_CASE)"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        # Get query parameters
        days_forward = int(request.args.get('days', 14))
        sort_by = request.args.get('sort', 'date')  # date, counselor, student, priority
        
        now = datetime.utcnow()
        end_date = now + timedelta(days=days_forward)
        
        # Get upcoming appointments
        upcoming = list(db.db.appointments.find({
            'scheduled_start': {'$gte': now, '$lte': end_date},
            'status': {'$in': [AppointmentStatus.CONFIRMED.value, AppointmentStatus.MATCHED.value]}
        }))
        
        appointments_report = []
        
        for apt in upcoming:
            # Get student info
            student = db.db.users.find_one({'_id': apt.get('student_id')})
            student_name = f"{student.get('first_name', '')} {student.get('last_name', '')}" if student else 'Unknown'
            
            # Get counselor info
            counselor = db.db.users.find_one({'_id': apt.get('counselor_id')})
            counselor_name = f"{counselor.get('first_name', '')} {counselor.get('last_name', '')}" if counselor else 'Unassigned'
            
            # Get case info for priority/risk level
            case = db.db.cases.find_one({'_id': apt.get('case_id')})
            risk_level = case.get('risk_level', 'GREEN') if case else 'GREEN'
            
            # Calculate time until appointment
            time_diff = apt['scheduled_start'] - now
            hours_until = time_diff.total_seconds() / 3600
            
            appointments_report.append({
                'appointment_id': str(apt['_id']),
                'student_name': student_name,
                'student_id': str(apt.get('student_id')),
                'counselor_name': counselor_name,
                'counselor_id': str(apt.get('counselor_id')) if apt.get('counselor_id') else None,
                'scheduled_start': apt['scheduled_start'].isoformat(),
                'scheduled_end': apt['scheduled_end'].isoformat(),
                'appointment_type': apt.get('appointment_type', 'General'),
                'status': apt.get('status'),
                'modality': apt.get('preferred_method', 'in-person'),
                'risk_level': risk_level,
                'hours_until': round(hours_until, 2),
                'priority': 'URGENT' if risk_level == 'RED' else 'HIGH' if risk_level == 'YELLOW' else 'NORMAL'
            })
        
        # Sort by specified field
        if sort_by == 'date':
            appointments_report.sort(key=lambda x: x['scheduled_start'])
        elif sort_by == 'counselor':
            appointments_report.sort(key=lambda x: x['counselor_name'])
        elif sort_by == 'student':
            appointments_report.sort(key=lambda x: x['student_name'])
        elif sort_by == 'priority':
            priority_order = {'URGENT': 0, 'HIGH': 1, 'NORMAL': 2}
            appointments_report.sort(key=lambda x: priority_order.get(x['priority'], 3))
        
        # Group by date for summary
        by_date = defaultdict(list)
        for apt in appointments_report:
            date_str = apt['scheduled_start'].split('T')[0]
            by_date[date_str].append(apt)
        
        return jsonify({
            'timestamp': datetime.utcnow().isoformat(),
            'period_days': days_forward,
            'period_end': end_date.isoformat(),
            'total_appointments': len(appointments_report),
            'appointments': appointments_report,
            'by_day_summary': {
                date: {
                    'count': len(apts),
                    'urgent': len([a for a in apts if a['priority'] == 'URGENT']),
                    'high': len([a for a in apts if a['priority'] == 'HIGH'])
                }
                for date, apts in by_date.items()
            }
        }), 200
        
    except Exception as e:
        print(f"Error in get_upcoming_appointments_report: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to generate appointments report: {str(e)}'}), 500


@scheduling_reports_bp.route('/resource-allocation', methods=['GET'])
@jwt_required()
def get_resource_allocation_report():
    """Get resource allocation analysis: counselor distribution, appointment types, etc (STAFF: ASSIGN_CASES)"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.ASSIGN_CASES.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        # Get query parameters
        days_forward = int(request.args.get('days', 30))
        
        now = datetime.utcnow()
        end_date = now + timedelta(days=days_forward)
        
        # Get appointments in period
        appointments = list(db.db.appointments.find({
            'scheduled_start': {'$gte': now, '$lte': end_date},
            'status': {'$in': [AppointmentStatus.CONFIRMED.value, AppointmentStatus.MATCHED.value, AppointmentStatus.COMPLETED.value]}
        }))
        
        # Analyze by counselor
        by_counselor = defaultdict(lambda: {'count': 0, 'by_type': defaultdict(int), 'by_risk': defaultdict(int)})
        
        # Analyze by type
        by_type = defaultdict(int)
        
        # Analyze by risk
        by_risk = defaultdict(int)
        
        # Analyze by day of week
        by_weekday = defaultdict(int)
        
        for apt in appointments:
            # By counselor
            counselor_id = str(apt.get('counselor_id', 'unassigned'))
            by_counselor[counselor_id]['count'] += 1
            
            apt_type = apt.get('appointment_type', 'General')
            by_counselor[counselor_id]['by_type'][apt_type] += 1
            
            # Get case risk level
            case = db.db.cases.find_one({'_id': apt.get('case_id')})
            risk = case.get('risk_level', 'GREEN') if case else 'GREEN'
            by_counselor[counselor_id]['by_risk'][risk] += 1
            
            # By type
            by_type[apt_type] += 1
            
            # By risk
            by_risk[risk] += 1
            
            # By weekday
            weekday = apt['scheduled_start'].strftime('%A')
            by_weekday[weekday] += 1
        
        # Convert counselor info to include names
        counselor_data = []
        for counselor_id, data in by_counselor.items():
            if counselor_id != 'unassigned':
                try:
                    c = db.db.users.find_one({'_id': ObjectId(counselor_id)})
                    name = f"{c.get('first_name', '')} {c.get('last_name', '')}" if c else 'Unknown'
                except:
                    name = 'Unknown'
            else:
                name = 'Unassigned'
            
            counselor_data.append({
                'counselor_id': counselor_id,
                'counselor_name': name,
                'total_appointments': data['count'],
                'by_appointment_type': dict(data['by_type']),
                'by_risk_level': dict(data['by_risk'])
            })
        
        # Sort by appointment count
        counselor_data.sort(key=lambda x: x['total_appointments'], reverse=True)
        
        return jsonify({
            'timestamp': datetime.utcnow().isoformat(),
            'period_days': days_forward,
            'period_end': end_date.isoformat(),
            'total_appointments': len(appointments),
            'by_counselor': counselor_data,
            'by_appointment_type': dict(by_type),
            'by_risk_level': dict(by_risk),
            'by_day_of_week': dict(by_weekday),
            'summary': {
                'average_appointments_per_counselor': round(len(appointments) / len([c for c in counselor_data if c['counselor_id'] != 'unassigned']), 2) if len([c for c in counselor_data if c['counselor_id'] != 'unassigned']) > 0 else 0,
                'most_common_type': max(by_type, key=by_type.get) if by_type else 'N/A',
                'highest_risk_count': by_risk.get('RED', 0)
            }
        }), 200
        
    except Exception as e:
        print(f"Error in get_resource_allocation_report: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to generate resource allocation report: {str(e)}'}), 500


@scheduling_reports_bp.route('/gaps-analysis', methods=['GET'])
@jwt_required()
def get_scheduling_gaps():
    """Find scheduling gaps and underutilized time slots (STAFF: ASSIGN_CASES)"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.ASSIGN_CASES.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        # Get query parameters
        days_forward = int(request.args.get('days', 30))
        
        now = datetime.utcnow()
        end_date = now + timedelta(days=days_forward)
        
        gaps_report = []
        
        # Get all counselors
        counselors = list(db.db.users.find({
            'role': {'$in': ['COUNSELOR', 'PSYCHOLOGIST', 'CSC', 'CSP']},
            'is_active': True
        }))
        
        for counselor in counselors:
            # Get this counselor's availability
            available_slots = list(db.db.counselor_availability.find({
                'counselor_id': counselor['_id'],
                'slot_start': {'$gte': now, '$lt': end_date},
                'is_available': True
            }).sort('slot_start', 1))
            
            # Get booked appointments
            booked = list(db.db.appointments.find({
                'counselor_id': counselor['_id'],
                'scheduled_start': {'$gte': now, '$lt': end_date},
                'status': {'$in': [AppointmentStatus.CONFIRMED.value, AppointmentStatus.MATCHED.value]}
            }).sort('scheduled_start', 1))
            
            # Find gaps
            gaps = []
            for slot in available_slots:
                # Check if this slot is completely free of bookings
                slot_has_booking = False
                for booking in booked:
                    if (booking['scheduled_start'] < slot['slot_end'] and 
                        booking['scheduled_end'] > slot['slot_start']):
                        slot_has_booking = True
                        break
                
                if not slot_has_booking:
                    duration_hours = (slot['slot_end'] - slot['slot_start']).total_seconds() / 3600
                    gaps.append({
                        'start': slot['slot_start'].isoformat(),
                        'end': slot['slot_end'].isoformat(),
                        'duration_hours': round(duration_hours, 2)
                    })
            
            if gaps:
                gaps_report.append({
                    'counselor_id': str(counselor['_id']),
                    'counselor_name': f"{counselor.get('first_name', '')} {counselor.get('last_name', '')}",
                    'total_available_slots': len(available_slots),
                    'booked_slots': len(booked),
                    'free_gaps': len(gaps),
                    'gaps': gaps,
                    'total_free_hours': round(sum(g['duration_hours'] for g in gaps), 2)
                })
        
        # Sort by most free hours
        gaps_report.sort(key=lambda x: x['total_free_hours'], reverse=True)
        
        return jsonify({
            'timestamp': datetime.utcnow().isoformat(),
            'period_days': days_forward,
            'period_end': end_date.isoformat(),
            'counselors_with_gaps': len(gaps_report),
            'gaps_by_counselor': gaps_report,
            'summary': {
                'total_free_slot_hours': round(sum(c['total_free_hours'] for c in gaps_report), 2),
                'counselor_with_most_gaps': gaps_report[0]['counselor_name'] if gaps_report else 'N/A',
                'average_free_hours_per_counselor': round(sum(c['total_free_hours'] for c in gaps_report) / len(gaps_report), 2) if gaps_report else 0
            }
        }), 200
        
    except Exception as e:
        print(f"Error in get_scheduling_gaps: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to generate gaps analysis: {str(e)}'}), 500
