"""
Analytics Blueprint - DPO Dashboard Analytics and Reporting
Provides comprehensive metrics for Directors and Program Administrators
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime, timedelta
from models import db, PermissionType
from utils import audit_log, user_has_permission

analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')


def dpo_admin_only(f):
    """Verify user is DPO or ADMIN"""
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        from flask_jwt_extended import get_jwt
        claims = get_jwt()
        role = claims.get('role')
        if role not in ['DPO', 'ADMIN']:
            return jsonify({'error': 'Only DPO and ADMIN can access analytics'}), 403
        return f(*args, **kwargs)
    return decorated


@analytics_bp.route('/summary', methods=['GET'])
@jwt_required()
@dpo_admin_only
def get_analytics_summary():
    """Get overall analytics summary"""
    user_id = get_jwt_identity()
    
    try:
        # Total cases
        total_cases = db.db.cases.count_documents({})
        active_cases = db.db.cases.count_documents({'status': 'active'})
        closed_cases = db.db.cases.count_documents({'status': 'closed'})
        
        # High-risk cases
        high_risk_cases = db.db.cases.count_documents({'risk_level': {'$in': ['RED', 'CRITICAL']}})
        
        # Students
        total_students = db.db.users.count_documents({'role': 'STUDENT'})
        
        # Staff
        total_counselors = db.db.users.count_documents({'role': 'COUNSELOR'})
        total_psychologists = db.db.users.count_documents({'role': 'PSYCHOLOGIST'})
        
        # Appointments this week (use requested_start — the actual datetime field)
        week_start = datetime.utcnow() - timedelta(days=7)
        week_appointments = db.db.appointments.count_documents({
            'requested_start': {'$gte': week_start},
            'status': {'$in': ['COMPLETED', 'completed']}
        })

        # Appointments pending/requested (waiting to be confirmed)
        pending_appointments = db.db.appointments.count_documents({
            'status': {'$in': ['REQUESTED', 'requested', 'PENDING_APPROVAL']}
        })

        # Assessments this month
        month_start = datetime.utcnow() - timedelta(days=30)
        month_assessments = db.db.assessments.count_documents({
            'created_at': {'$gte': month_start}
        })
        
        audit_log(db.db, 'analytics', 'view_summary')
        
        return jsonify({
            'total_cases': total_cases,
            'active_cases': active_cases,
            'closed_cases': closed_cases,
            'high_risk_cases': high_risk_cases,
            'total_students': total_students,
            'total_counselors': total_counselors,
            'total_psychologists': total_psychologists,
            'week_appointments': week_appointments,
            'pending_appointments': pending_appointments,
            'month_assessments': month_assessments,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    
    except Exception as e:
        return jsonify({'error': f'Failed to get analytics: {str(e)}'}), 500


@analytics_bp.route('/cases/trends', methods=['GET'])
@jwt_required()
@dpo_admin_only
def get_case_trends():
    """Get case creation trends over time"""
    user_id = get_jwt_identity()
    days = request.args.get('days', default=30, type=int)
    
    try:
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get cases created in the period
        pipeline = [
            {'$match': {'created_at': {'$gte': start_date}}},
            {'$group': {
                '_id': {
                    '$dateToString': {'format': '%Y-%m-%d', 'date': '$created_at'}
                },
                'count': {'$sum': 1},
                'avg_risk_level': {'$avg': {'$cond': [
                    {'$eq': ['$risk_level', 'CRITICAL']}, 3,
                    {'$cond': [
                        {'$eq': ['$risk_level', 'RED']}, 2,
                        {'$cond': [
                            {'$eq': ['$risk_level', 'YELLOW']}, 1, 0
                        ]}
                    ]}
                ]}}
            }},
            {'$sort': {'_id': 1}}
        ]
        
        trends = list(db.db.cases.aggregate(pipeline))
        
        audit_log(db.db, 'analytics', 'view_case_trends')
        
        return jsonify({
            'period_days': days,
            'trends': trends,
            'total_new_cases': sum(t['count'] for t in trends)
        }), 200
    
    except Exception as e:
        return jsonify({'error': f'Failed to get case trends: {str(e)}'}), 500


@analytics_bp.route('/assessments/distribution', methods=['GET'])
@jwt_required()
@dpo_admin_only
def get_assessment_distribution():
    """Get assessment type distribution and risk levels"""
    user_id = get_jwt_identity()
    
    try:
        # Assessment counts by type
        pipeline = [
            {'$group': {
                '_id': '$assessment_type',
                'count': {'$sum': 1},
                'avg_score': {'$avg': '$raw_score'},
                'risk_distribution': {'$push': '$risk_level'}
            }},
            {'$sort': {'count': -1}}
        ]
        
        assessment_dist = list(db.db.assessments.aggregate(pipeline))
        
        # Calculate risk breakdowns
        for assessment in assessment_dist:
            risk_counts = {}
            for risk in assessment.get('risk_distribution', []):
                risk_counts[risk] = risk_counts.get(risk, 0) + 1
            assessment['risk_breakdown'] = risk_counts
            del assessment['risk_distribution']
        
        # Overall risk distribution
        all_risks = db.db.assessments.aggregate([
            {'$group': {
                '_id': '$risk_level',
                'count': {'$sum': 1}
            }}
        ])
        
        risk_summary = {item['_id']: item['count'] for item in all_risks}
        
        audit_log(db.db, 'analytics', 'view_assessment_distribution')
        
        return jsonify({
            'assessment_types': assessment_dist,
            'overall_risk_distribution': risk_summary,
            'total_assessments': db.db.assessments.count_documents({})
        }), 200
    
    except Exception as e:
        return jsonify({'error': f'Failed to get assessment distribution: {str(e)}'}), 500


@analytics_bp.route('/staff/workload', methods=['GET'])
@jwt_required()
@dpo_admin_only
def get_staff_workload():
    """Get counselor/psychologist workload metrics"""
    user_id = get_jwt_identity()
    
    try:
        # Get all staff
        staff = list(db.db.users.find(
            {'role': {'$in': ['COUNSELOR', 'PSYCHOLOGIST', 'CSC', 'CSP', 'IC']}},
            {'_id': 1, 'first_name': 1, 'last_name': 1, 'name': 1, 'role': 1}
        ))

        workload_data = []

        for staff_member in staff:
            staff_id = staff_member['_id']
            fn = staff_member.get('first_name', '')
            ln = staff_member.get('last_name', '')
            display_name = f"{fn} {ln}".strip() or staff_member.get('name', 'Unknown')

            # Active cases assigned (try both field names)
            cases_assigned = db.db.cases.count_documents({
                '$or': [
                    {'counselor_id': staff_id},
                    {'assigned_counselor_id': staff_id},
                ],
                'status': {'$in': ['active', 'ACTIVE']}
            })

            # Total appointments
            appointments = db.db.appointments.count_documents({
                'counselor_id': staff_id,
                'status': {'$in': ['MATCHED', 'CONFIRMED', 'COMPLETED', 'completed']}
            })

            # Completed this week
            week_start = datetime.utcnow() - timedelta(days=7)
            week_completed = db.db.appointments.count_documents({
                'counselor_id': staff_id,
                'status': {'$in': ['COMPLETED', 'completed']},
                'requested_start': {'$gte': week_start}
            })

            workload_data.append({
                'staff_id': str(staff_id),
                'name': display_name,
                'role': staff_member.get('role'),
                'active_cases': cases_assigned,
                'total_appointments': appointments,
                'week_completed': week_completed
            })
        
        # Sort by workload
        workload_data.sort(key=lambda x: x['active_cases'], reverse=True)
        
        audit_log(db.db, 'analytics', 'view_staff_workload')
        
        return jsonify({
            'staff_workload': workload_data,
            'total_staff': len(staff),
            'avg_cases_per_counselor': sum(w['active_cases'] for w in workload_data) / len(workload_data) if workload_data else 0
        }), 200
    
    except Exception as e:
        return jsonify({'error': f'Failed to get staff workload: {str(e)}'}), 500


@analytics_bp.route('/appointments/statistics', methods=['GET'])
@jwt_required()
@dpo_admin_only
def get_appointment_statistics():
    """Get appointment completion and scheduling statistics"""
    user_id = get_jwt_identity()
    days = request.args.get('days', default=30, type=int)
    
    try:
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Appointment stats
        pipeline = [
            {'$match': {'created_at': {'$gte': start_date}}},
            {'$group': {
                '_id': '$status',
                'count': {'$sum': 1}
            }}
        ]
        
        status_counts = {}
        for item in db.db.appointments.aggregate(pipeline):
            status_counts[item['_id']] = item['count']
        
        # No-show rate
        total = sum(status_counts.values())
        no_show_count = status_counts.get('no_show', 0)
        cancelled_count = status_counts.get('cancelled', 0)
        completed_count = status_counts.get('completed', 0)
        
        no_show_rate = (no_show_count / total * 100) if total > 0 else 0
        completion_rate = (completed_count / total * 100) if total > 0 else 0
        
        # Average wait time (days from case creation to first appointment)
        pipeline_wait = [
            {'$lookup': {
                'from': 'cases',
                'localField': 'case_id',
                'foreignField': '_id',
                'as': 'case_info'
            }},
            {'$match': {'case_info': {'$ne': []}, 'requested_start': {'$exists': True}}},
            {'$project': {
                'case_created': {'$arrayElemAt': ['$case_info.created_at', 0]},
                'requested_start': 1
            }},
            {'$project': {
                'wait_days': {
                    '$divide': [
                        {'$subtract': ['$requested_start', '$case_created']},
                        86400000
                    ]
                }
            }},
            {'$group': {
                '_id': None,
                'avg_wait_days': {'$avg': '$wait_days'},
                'min_wait': {'$min': '$wait_days'},
                'max_wait': {'$max': '$wait_days'}
            }}
        ]
        
        wait_stats = list(db.db.appointments.aggregate(pipeline_wait))
        avg_wait = wait_stats[0]['avg_wait_days'] if wait_stats else 0
        
        audit_log(db.db, 'analytics', 'view_appointment_stats')
        
        return jsonify({
            'period_days': days,
            'status_breakdown': status_counts,
            'total_appointments': total,
            'completion_rate': round(completion_rate, 2),
            'no_show_rate': round(no_show_rate, 2),
            'avg_wait_days': round(avg_wait, 2) if avg_wait else 0,
            'completed': completed_count,
            'no_shows': no_show_count,
            'cancelled': cancelled_count
        }), 200
    
    except Exception as e:
        return jsonify({'error': f'Failed to get appointment statistics: {str(e)}'}), 500


@analytics_bp.route('/risk/trends', methods=['GET'])
@jwt_required()
@dpo_admin_only
def get_risk_trends():
    """Get risk level trends over time"""
    user_id = get_jwt_identity()
    days = request.args.get('days', default=30, type=int)
    
    try:
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Risk trends by day
        pipeline = [
            {'$match': {'created_at': {'$gte': start_date}}},
            {'$group': {
                '_id': {
                    'date': {'$dateToString': {'format': '%Y-%m-%d', 'date': '$created_at'}},
                    'risk_level': '$risk_level'
                },
                'count': {'$sum': 1}
            }},
            {'$sort': {'_id.date': 1}}
        ]
        
        trends = list(db.db.cases.aggregate(pipeline))
        
        # Format for chart
        formatted_trends = {}
        for item in trends:
            date = item['_id']['date']
            risk = item['_id']['risk_level']
            if date not in formatted_trends:
                formatted_trends[date] = {}
            formatted_trends[date][risk] = item['count']
        
        # Current risk distribution
        current_distribution = {}
        for item in db.db.cases.aggregate([
            {'$match': {'status': 'active'}},
            {'$group': {'_id': '$risk_level', 'count': {'$sum': 1}}}
        ]):
            current_distribution[item['_id']] = item['count']
        
        audit_log(db.db, 'analytics', 'view_risk_trends')
        
        return jsonify({
            'period_days': days,
            'daily_trends': formatted_trends,
            'current_risk_distribution': current_distribution,
            'total_active_cases': sum(current_distribution.values())
        }), 200
    
    except Exception as e:
        return jsonify({'error': f'Failed to get risk trends: {str(e)}'}), 500


@analytics_bp.route('/referrals/summary', methods=['GET'])
@jwt_required()
@dpo_admin_only
def get_referral_summary():
    """Get referral statistics"""
    user_id = get_jwt_identity()
    
    try:
        # Referral status breakdown
        pipeline = [
            {'$group': {
                '_id': '$status',
                'count': {'$sum': 1}
            }}
        ]
        
        status_counts = {}
        for item in db.db.referrals.aggregate(pipeline):
            status_counts[item['_id']] = item['count']
        
        # Referral types
        type_pipeline = [
            {'$group': {
                '_id': '$referral_type',
                'count': {'$sum': 1}
            }},
            {'$sort': {'count': -1}}
        ]
        
        type_counts = [
            {'type': item['_id'], 'count': item['count']}
            for item in db.db.referrals.aggregate(type_pipeline)
        ]
        
        total = sum(status_counts.values())
        
        audit_log(db.db, 'analytics', 'view_referral_summary')
        
        return jsonify({
            'status_breakdown': status_counts,
            'referral_types': type_counts,
            'total_referrals': total,
            'pending': status_counts.get('pending', 0),
            'completed': status_counts.get('completed', 0)
        }), 200
    
    except Exception as e:
        return jsonify({'error': f'Failed to get referral summary: {str(e)}'}), 500


@analytics_bp.route('/intake/conversion', methods=['GET'])
@jwt_required()
@dpo_admin_only
def get_intake_conversion():
    """Get intake funnel and conversion metrics"""
    user_id = get_jwt_identity()
    
    try:
        # Total users who started intake
        intake_started = db.db.intakes.count_documents({'status': {'$ne': None}})
        
        # Completed intakes
        intake_completed = db.db.intakes.count_documents({'status': 'completed'})
        
        # Cases created from completed intakes
        cases_from_intake = db.db.cases.count_documents({'source': 'intake'})
        
        # Conversion rates
        intake_conversion = (intake_completed / intake_started * 100) if intake_started > 0 else 0
        case_conversion = (cases_from_intake / intake_completed * 100) if intake_completed > 0 else 0
        
        audit_log(db.db, 'analytics', 'view_intake_conversion')
        
        return jsonify({
            'intake_started': intake_started,
            'intake_completed': intake_completed,
            'cases_created': cases_from_intake,
            'intake_completion_rate': round(intake_conversion, 2),
            'case_creation_rate': round(case_conversion, 2)
        }), 200
    
    except Exception as e:
        return jsonify({'error': f'Failed to get intake conversion: {str(e)}'}), 500


@analytics_bp.route('/appointments/monthly', methods=['GET'])
@jwt_required()
@dpo_admin_only
def get_appointments_monthly():
    """Get monthly appointment counts for the last 6 months"""
    try:
        result = []
        now = datetime.utcnow()

        for i in range(5, -1, -1):
            # Build month boundaries
            year = now.year
            month = now.month - i
            while month <= 0:
                month += 12
                year -= 1
            month_start = datetime(year, month, 1)
            if month == 12:
                month_end = datetime(year + 1, 1, 1)
            else:
                month_end = datetime(year, month + 1, 1)

            query_range = {'created_at': {'$gte': month_start, '$lt': month_end}}
            total = db.db.appointments.count_documents(query_range)
            completed = db.db.appointments.count_documents({**query_range, 'status': {'$in': ['completed', 'COMPLETED']}})
            cancelled = db.db.appointments.count_documents({**query_range, 'status': {'$in': ['cancelled', 'CANCELLED']}})
            no_show = db.db.appointments.count_documents({**query_range, 'status': {'$in': ['no_show', 'NO_SHOW']}})

            result.append({
                'month': month_start.strftime('%Y-%m'),
                'label': month_start.strftime('%b %Y'),
                'short': month_start.strftime('%b'),
                'total': total,
                'completed': completed,
                'cancelled': cancelled,
                'no_show': no_show,
            })

        return jsonify({'months': result}), 200

    except Exception as e:
        return jsonify({'error': f'Failed to get monthly appointments: {str(e)}'}), 500


@analytics_bp.route('/cases/monthly', methods=['GET'])
@jwt_required()
@dpo_admin_only
def get_cases_monthly():
    """Get monthly new case and closure counts for the last 6 months"""
    try:
        result = []
        now = datetime.utcnow()

        for i in range(5, -1, -1):
            year = now.year
            month = now.month - i
            while month <= 0:
                month += 12
                year -= 1
            month_start = datetime(year, month, 1)
            if month == 12:
                month_end = datetime(year + 1, 1, 1)
            else:
                month_end = datetime(year, month + 1, 1)

            new_cases = db.db.cases.count_documents({'created_at': {'$gte': month_start, '$lt': month_end}})
            closed_cases = db.db.cases.count_documents({
                'updated_at': {'$gte': month_start, '$lt': month_end},
                'status': {'$in': ['closed', 'CLOSED']}
            })
            high_risk = db.db.cases.count_documents({
                'created_at': {'$gte': month_start, '$lt': month_end},
                'risk_level': {'$in': ['RED', 'CRITICAL']}
            })

            result.append({
                'month': month_start.strftime('%Y-%m'),
                'label': month_start.strftime('%b %Y'),
                'short': month_start.strftime('%b'),
                'new_cases': new_cases,
                'closed_cases': closed_cases,
                'high_risk': high_risk,
            })

        return jsonify({'months': result}), 200

    except Exception as e:
        return jsonify({'error': f'Failed to get monthly cases: {str(e)}'}), 500


@analytics_bp.route('/concerns/distribution', methods=['GET'])
@jwt_required()
@dpo_admin_only
def get_concern_distribution():
    """Breakdown of concern types across intakes using categorical purpose field"""
    try:
        LABEL_MAP = {
            'personal': 'Personal / Mental Health',
            'mental_health': 'Personal / Mental Health',
            'academic': 'Academic',
            'career': 'Career',
            'relationship': 'Relationships',
            'social': 'Social / Relationships',
            'crisis': 'Crisis',
            'family': 'Family',
            'other': 'Other',
            'others': 'Other',
        }

        # Use responses.purpose from intakes (categorical dropdown, not free-text)
        intake_pipeline = [
            {'$match': {'responses.purpose': {'$exists': True, '$ne': None, '$ne': ''}}},
            {'$group': {'_id': '$responses.purpose', 'count': {'$sum': 1}}},
            {'$sort': {'count': -1}}
        ]
        combined = {}
        for item in db.db.intakes.aggregate(intake_pipeline):
            raw = (item['_id'] or '').lower().strip()
            label = LABEL_MAP.get(raw, raw.replace('_', ' ').title() if raw else 'Other')
            combined[label] = combined.get(label, 0) + item['count']

        result = [{'concern': k, 'count': v} for k, v in sorted(combined.items(), key=lambda x: -x[1])]

        return jsonify({
            'concerns': result,
            'total': sum(r['count'] for r in result)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@analytics_bp.route('/assessments/score-trends', methods=['GET'])
@jwt_required()
@dpo_admin_only
def get_assessment_score_trends():
    """Monthly average PHQ-9 and GAD-7 scores for the last 6 months"""
    try:
        now = datetime.utcnow()
        result = []

        for i in range(5, -1, -1):
            year, month = now.year, now.month - i
            while month <= 0:
                month += 12
                year -= 1
            month_start = datetime(year, month, 1)
            month_end = datetime(year, month + 1, 1) if month < 12 else datetime(year + 1, 1, 1)

            row = {
                'short': month_start.strftime('%b'),
                'label': month_start.strftime('%b %Y'),
            }

            for key, types in [('phq9', ['phq9', 'PHQ9', 'PHQ-9']), ('gad7', ['gad7', 'GAD7', 'GAD-7'])]:
                agg = list(db.db.assessments.aggregate([
                    {'$match': {
                        'assessment_type': {'$in': types},
                        'created_at': {'$gte': month_start, '$lt': month_end},
                        'raw_score': {'$exists': True, '$type': 'number'}
                    }},
                    {'$group': {'_id': None, 'avg': {'$avg': '$raw_score'}, 'count': {'$sum': 1}}}
                ]))
                row[key] = round(agg[0]['avg'], 1) if agg else None
                row[f'{key}_count'] = agg[0]['count'] if agg else 0

            result.append(row)

        return jsonify({'months': result}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@analytics_bp.route('/appointments/by-day', methods=['GET'])
@jwt_required()
@dpo_admin_only
def get_appointments_by_day():
    """Appointment volume by day of week and top booking hours"""
    try:
        days_back = int(request.args.get('days', 90))
        start_date = datetime.utcnow() - timedelta(days=days_back)

        # By day of week (0=Sunday in $dayOfWeek)
        day_pipeline = [
            {'$match': {'requested_start': {'$gte': start_date, '$exists': True}}},
            {'$group': {
                '_id': {'$dayOfWeek': '$requested_start'},
                'count': {'$sum': 1}
            }},
            {'$sort': {'_id': 1}}
        ]
        day_map = {1: 'Sun', 2: 'Mon', 3: 'Tue', 4: 'Wed', 5: 'Thu', 6: 'Fri', 7: 'Sat'}
        by_day_raw = {item['_id']: item['count'] for item in db.db.appointments.aggregate(day_pipeline)}
        by_day = [{'day': day_map[d], 'count': by_day_raw.get(d, 0)} for d in range(1, 8)]

        # By hour
        hour_pipeline = [
            {'$match': {'requested_start': {'$gte': start_date, '$exists': True}}},
            {'$group': {
                '_id': {'$hour': '$requested_start'},
                'count': {'$sum': 1}
            }},
            {'$sort': {'_id': 1}}
        ]
        hour_raw = {item['_id']: item['count'] for item in db.db.appointments.aggregate(hour_pipeline)}
        # PHT = UTC+8, only show 9-17
        by_hour = []
        for h_utc in range(1, 10):  # 1-9 UTC = 9AM-5PM PHT
            h_pht = h_utc + 8
            label = f"{h_pht % 12 or 12}{'AM' if h_pht < 12 else 'PM'}"
            by_hour.append({'hour': label, 'count': hour_raw.get(h_utc, 0)})

        return jsonify({
            'by_day': by_day,
            'by_hour': by_hour,
            'period_days': days_back
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
