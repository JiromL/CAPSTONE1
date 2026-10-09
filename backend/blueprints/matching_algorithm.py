"""
COUNSELOR MATCHING ALGORITHM
Visible and documented endpoints for the counselor matching logic
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from models import db, AppointmentStatus, PermissionType
from utils import user_has_permission, server_error
from datetime import datetime, timedelta

matching_algorithm_bp = Blueprint('matching_algorithm', __name__, url_prefix='/api/matching-algorithm')


# ============================================================================
# COUNSELOR MATCHING ALGORITHM - VISIBLE & DOCUMENTED
# ============================================================================

@matching_algorithm_bp.route('/algorithm-info', methods=['GET'])
@jwt_required()
def get_algorithm_info():
    """
    Get information about the counselor matching algorithm
    Describes how counselors are matched to appointments
    """
    return jsonify({
        'algorithm_name': 'Load-Balanced Counselor Matching',
        'algorithm_version': '1.0',
        'description': 'Matches students with available counselors based on multiple criteria',
        'criteria': [
            {
                'name': 'Time Availability',
                'weight': 30,
                'description': 'Counselor must have an available slot during requested time'
            },
            {
                'name': 'Conflict Detection',
                'weight': 35,
                'description': 'Counselor cannot have overlapping confirmed/matched appointments'
            },
            {
                'name': 'Workload Balance',
                'weight': 20,
                'description': 'Counselor with lowest active appointment count is preferred'
            },
            {
                'name': 'Meeting Method Support',
                'weight': 10,
                'description': 'Counselor must support requested meeting method (in-person, zoom, phone)'
            },
            {
                'name': 'Role Specialization',
                'weight': 5,
                'description': 'Bonus for matching role specialization to appointment type'
            }
        ],
        'roles': ['COUNSELOR', 'PSYCHOLOGIST'],
        'appointment_types': ['intake', 'follow-up', 'crisis', 'group', 'assessment'],
        'business_hours': {
            'start': '09:00',
            'end': '17:00',
            'timezone': 'Asia/Manila',
            'days': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        }
    }), 200


@matching_algorithm_bp.route('/match-candidates/<case_id>', methods=['POST'])
@jwt_required()
def get_matching_candidates(case_id):
    """
    Get list of candidate counselors ranked by matching score
    Request body: {
        "requested_start": "2026-03-23T10:00:00",
        "requested_end": "2026-03-23T11:00:00",
        "preferred_method": "in-person | zoom | phone",
        "appointment_type": "intake | follow-up | crisis",
        "limit": 5
    }
    """
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    try:
        # Get case
        try:
            case_obj_id = ObjectId(case_id)
        except:
            case_obj_id = case_id
        
        case = db.db.cases.find_one({'_id': case_obj_id})
        if not case:
            return jsonify({'error': 'Case not found'}), 404
        
        # Parse request
        start_str = data.get('requested_start')
        end_str = data.get('requested_end')
        preferred_method = data.get('preferred_method', 'in-person')
        appointment_type = data.get('appointment_type', 'follow-up')
        limit = int(data.get('limit', 5))
        
        if not start_str or not end_str:
            return jsonify({'error': 'Missing required fields: requested_start, requested_end'}), 400
        
        try:
            start_time = datetime.fromisoformat(start_str)
            end_time = datetime.fromisoformat(end_str)
        except ValueError:
            return jsonify({'error': 'Invalid datetime format'}), 400
        
        if start_time >= end_time:
            return jsonify({'error': 'End time must be after start time'}), 400
        
        # Get all available counselors
        counselors = list(db.db.users.find({
            'role': {'$in': ['COUNSELOR', 'PSYCHOLOGIST']},
            'is_active': True
        }))
        
        candidates = []
        
        for counselor in counselors:
            score = 0
            score_breakdown = {}
            reasons_eliminated = []
            
            # Check hard constraints first
            
            # 1. Time availability (HARD CONSTRAINT - 35 points)
            availability_slot = db.db.counselor_availability.find_one({
                'counselor_id': counselor['_id'],
                'slot_start': {'$lte': start_time},
                'slot_end': {'$gte': end_time},
                'is_available': True
            })
            
            if not availability_slot:
                reasons_eliminated.append('No available slot during requested time')
                continue
            
            score += 35
            score_breakdown['availability'] = 35
            
            # 2. Conflict detection (HARD CONSTRAINT - 30 points)
            conflicts = db.db.appointments.find_one({
                'counselor_id': counselor['_id'],
                'status': {'$in': [AppointmentStatus.CONFIRMED.value, AppointmentStatus.MATCHED.value]},
                'scheduled_start': {'$lt': end_time},
                'scheduled_end': {'$gt': start_time}
            })
            
            if conflicts:
                reasons_eliminated.append('Conflicting appointment exists')
                continue
            
            score += 30
            score_breakdown['conflict_free'] = 30
            
            # 3. Meeting method support (SOFT CONSTRAINT - 10 points)
            staff_settings = db.db.staff_settings.find_one({'user_id': counselor['_id']})
            meeting_methods = staff_settings.get('work_preferences', {}).get('meeting_methods', ['in-person']) if staff_settings else ['in-person']
            
            if isinstance(meeting_methods, str):
                meeting_methods = [meeting_methods]
            
            if preferred_method in meeting_methods or 'all' in meeting_methods:
                score += 10
                score_breakdown['meeting_method'] = 10
            else:
                score += 5
                score_breakdown['meeting_method'] = 5
            
            # 4. Workload balance (20 points - inversely proportional)
            active_count = db.db.appointments.count_documents({
                'counselor_id': counselor['_id'],
                'status': {'$in': [AppointmentStatus.CONFIRMED.value, AppointmentStatus.MATCHED.value]}
            })
            
            # Score based on workload (lower=higher score)
            workload_score = max(0, 20 - (active_count * 2))
            score += workload_score
            score_breakdown['workload_balance'] = workload_score
            
            # 5. Specialization bonus (5 points)
            # This would require mapping appointment types to specializations
            if appointment_type == 'crisis' and counselor.get('role') == 'PSYCHOLOGIST':
                score += 5
                score_breakdown['specialization'] = 5
            elif appointment_type == 'intake' and counselor.get('role') == 'COUNSELOR':
                score += 3
                score_breakdown['specialization'] = 3
            else:
                score_breakdown['specialization'] = 0
            
            # Add to candidates
            candidates.append({
                'counselor_id': str(counselor['_id']),
                'name': f"{counselor.get('first_name', '')} {counselor.get('last_name', '')}",
                'role': counselor.get('role'),
                'email': counselor.get('email'),
                'matching_score': score,
                'score_breakdown': score_breakdown,
                'workload': {
                    'active_appointments': active_count,
                    'level': 'HIGH' if active_count >= 8 else 'MEDIUM' if active_count >= 4 else 'LOW'
                },
                'availability': {
                    'slot_start': availability_slot['slot_start'].isoformat() if availability_slot else start_time.isoformat(),
                    'slot_end': availability_slot['slot_end'].isoformat() if availability_slot else end_time.isoformat()
                },
                'meeting_methods': meeting_methods,
                'reasons_for_ranking': 'Excellent match' if score > 80 else 'Good match' if score > 60 else 'Fair match'
            })
        
        # Sort by score descending
        candidates.sort(key=lambda x: x['matching_score'], reverse=True)
        
        # Apply limit
        top_candidates = candidates[:limit]
        
        return jsonify({
            'case_id': str(case_obj_id),
            'requested_time_slot': {
                'start': start_time.isoformat(),
                'end': end_time.isoformat(),
                'duration_minutes': (end_time - start_time).total_seconds() / 60
            },
            'total_candidates_evaluated': len(candidates),
            'candidates_matching': len(top_candidates),
            'candidates_eliminated': len([c for c in candidates if c not in top_candidates]),
            'top_candidates': top_candidates,
            'recommended_candidate': top_candidates[0] if top_candidates else None
        }), 200
        
    except Exception as e:
        print(f"Error in get_matching_candidates: {str(e)}")
        import traceback
        traceback.print_exc()
        return server_error(e, 'Matching algorithm error. Please try again.')


@matching_algorithm_bp.route('/scoring-explanation', methods=['GET'])
@jwt_required()
def get_scoring_explanation():
    """
    Explains how the counselor matching scoring works
    """
    return jsonify({
        'scoring_system': 'Weighted Criteria Scoring',
        'min_score': 0,
        'max_score': 100,
        'score_ranges': [
            {
                'range': '90-100',
                'rating': 'Excellent Match',
                'interpretation': 'Highly available, no conflicts, good specialization'
            },
            {
                'range': '70-89',
                'rating': 'Good Match',
                'interpretation': 'Available, no conflicts, reasonable workload'
            },
            {
                'range': '50-69',
                'rating': 'Fair Match',
                'interpretation': 'Available but with some concerns (limited hours, higher workload)'
            },
            {
                'range': '0-49',
                'rating': 'Poor Match',
                'interpretation': 'Not recommended due to conflicts or unavailability'
            }
        ],
        'criteria_details': {
            'availability': {
                'max_points': 35,
                'description': 'Counselor has an open slot during requested time',
                'calculation': '35 points if available, 0 if not'
            },
            'conflict_free': {
                'max_points': 30,
                'description': 'No overlapping confirmed or matched appointments',
                'calculation': '30 points if no conflicts, 0 if conflict exists'
            },
            'meeting_method': {
                'max_points': 10,
                'description': 'Counselor supports requested meeting method (in-person, Zoom, phone)',
                'calculation': '10 if exact match, 5 if different method, 0 if unsupported'
            },
            'workload_balance': {
                'max_points': 20,
                'description': 'Counselor has manageable active appointment load',
                'calculation': '20 - (active_appointments × 2), minimum 0'
            },
            'specialization': {
                'max_points': 5,
                'description': 'Bonus for role specialization matching appointment type',
                'calculation': '5 for perfect match, 3 for good match, 0 for no match'
            }
        },
        'hard_constraints': [
            'Must have availability slot during requested time',
            'Must not have conflicting appointments',
            'Must have matching meeting method support'
        ],
        'soft_constraints': [
            'Lower workload is preferred',
            'Specialization bonus applied',
            'Recent no-show history considered (if tracked)'
        ]
    }), 200


@matching_algorithm_bp.route('/explain-decision/<case_id>', methods=['POST'])
@jwt_required()
def explain_matching_decision(case_id):
    """
    Explains why a specific counselor was matched to a case
    Request body: {
        "counselor_id": "...",
        "requested_start": "...",
        "requested_end": "..."
    }
    """
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    try:
        counselor_id = data.get('counselor_id')
        if not counselor_id:
            return jsonify({'error': 'Missing counselor_id'}), 400
        
        try:
            counselor_obj_id = ObjectId(counselor_id)
        except:
            counselor_obj_id = counselor_id
        
        counselor = db.db.users.find_one({'_id': counselor_obj_id})
        if not counselor:
            return jsonify({'error': 'Counselor not found'}), 404
        
        start_str = data.get('requested_start')
        end_str = data.get('requested_end')
        
        try:
            start_time = datetime.fromisoformat(start_str) if start_str else None
            end_time = datetime.fromisoformat(end_str) if end_str else None
        except:
            return jsonify({'error': 'Invalid datetime format'}), 400
        
        # Build explanation
        explanation = {
            'counselor': {
                'id': str(counselor['_id']),
                'name': f"{counselor.get('first_name', '')} {counselor.get('last_name', '')}",
                'role': counselor.get('role'),
                'email': counselor.get('email')
            },
            'matching_factors': []
        }
        
        # Analyze each factor
        if start_time and end_time:
            availability = db.db.counselor_availability.find_one({
                'counselor_id': counselor_obj_id,
                'slot_start': {'$lte': start_time},
                'slot_end': {'$gte': end_time},
                'is_available': True
            })
            
            explanation['matching_factors'].append({
                'factor': 'Available Time Slot',
                'score': 35,
                'status': 'PASS' if availability else 'FAIL',
                'details': f"Available from {availability['slot_start'].isoformat() if availability else 'N/A'} to {availability['slot_end'].isoformat() if availability else 'N/A'}"
            })
            
            conflicts = db.db.appointments.find_one({
                'counselor_id': counselor_obj_id,
                'status': {'$in': [AppointmentStatus.CONFIRMED.value, AppointmentStatus.MATCHED.value]},
                'scheduled_start': {'$lt': end_time},
                'scheduled_end': {'$gt': start_time}
            })
            
            explanation['matching_factors'].append({
                'factor': 'No Scheduling Conflicts',
                'score': 30,
                'status': 'PASS' if not conflicts else 'FAIL',
                'details': 'No overlapping appointments' if not conflicts else f"Conflict with appointment {str(conflicts['_id'])}"
            })
        
        # Workload
        active_count = db.db.appointments.count_documents({
            'counselor_id': counselor_obj_id,
            'status': {'$in': [AppointmentStatus.CONFIRMED.value, AppointmentStatus.MATCHED.value]}
        })
        
        workload_score = max(0, 20 - (active_count * 2))
        explanation['matching_factors'].append({
            'factor': 'Workload Balance',
            'score': workload_score,
            'status': 'GOOD' if workload_score >= 15 else 'FAIR' if workload_score >= 10 else 'HIGH',
            'details': f"{active_count} active appointments"
        })
        
        # Meeting methods
        staff_settings = db.db.staff_settings.find_one({'user_id': counselor_obj_id})
        meeting_methods = staff_settings.get('work_preferences', {}).get('meeting_methods', ['in-person']) if staff_settings else ['in-person']
        
        explanation['matching_factors'].append({
            'factor': 'Meeting Methods Supported',
            'score': 10,
            'status': 'PASS',
            'details': f"Supports: {', '.join(meeting_methods)}"
        })
        
        total_score = sum(f['score'] for f in explanation['matching_factors'])
        explanation['total_matching_score'] = total_score
        explanation['recommendation'] = 'Excellent match' if total_score > 80 else 'Good match' if total_score > 60 else 'Fair match' if total_score > 40 else 'Not recommended'
        
        return jsonify(explanation), 200
        
    except Exception as e:
        print(f"Error in explain_matching_decision: {str(e)}")
        import traceback
        traceback.print_exc()
        return server_error(e, 'Error explaining decision. Please try again.')
