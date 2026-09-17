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
        active_cases = db.db.cases.count_documents({'$or': [{'case_status': {'$in': ['ACTIVE', 'active']}}, {'status': {'$in': ['ACTIVE', 'active']}}]})
        closed_cases = db.db.cases.count_documents({'case_status': {'$in': ['CLOSED', 'closed']}})

        # High-risk cases still open (excludes closed cases — matches "active" framing in the UI)
        high_risk_cases = db.db.cases.count_documents({
            'risk_level': {'$in': ['RED', 'CRITICAL']},
            'case_status': {'$nin': ['CLOSED', 'closed']},
        })

        # Students
        total_students = db.db.users.count_documents({'role': 'STUDENT'})

        # Staff
        total_counselors = db.db.users.count_documents({'role': 'COUNSELOR'})
        total_psychologists = db.db.users.count_documents({'role': 'PSYCHOLOGIST'})

        # Appointments this week (confirmed or completed)
        week_start = datetime.utcnow() - timedelta(days=7)
        week_appointments = db.db.appointments.count_documents({
            'scheduled_start': {'$gte': week_start},
            'status': {'$in': ['COMPLETED', 'completed', 'CONFIRMED', 'confirmed']}
        })

        # Appointments pending/requested (waiting to be confirmed)
        pending_appointments = db.db.appointments.count_documents({
            'status': {'$in': ['REQUESTED', 'requested', 'PENDING_APPROVAL', 'PENDING_STUDENT_APPROVAL']}
        })

        # Assessments this month (check intake_packets with phq4)
        month_start = datetime.utcnow() - timedelta(days=30)
        month_assessments = db.db.intake_packets.count_documents({
            'created_at': {'$gte': month_start},
            'phq4_responses': {'$ne': None}
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
            {'role': {'$in': ['COUNSELOR', 'PSYCHOLOGIST', 'IC']}},
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
                '$and': [
                    {'$or': [{'counselor_id': staff_id}, {'assigned_counselor_id': staff_id}]},
                    {'$or': [{'case_status': {'$in': ['ACTIVE', 'active']}}, {'status': {'$in': ['ACTIVE', 'active']}}]},
                ]
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
                'scheduled_start': {'$gte': week_start}
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
        
        # No-show rate — DB stores uppercase statuses
        total = sum(status_counts.values())
        no_show_count  = status_counts.get('NO_SHOW',   0) + status_counts.get('no_show',   0)
        cancelled_count= status_counts.get('CANCELLED', 0) + status_counts.get('cancelled', 0)
        completed_count= status_counts.get('COMPLETED', 0) + status_counts.get('completed', 0)
        
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
            {'$match': {'case_info': {'$ne': []}, 'scheduled_start': {'$exists': True}}},
            {'$project': {
                'case_created': {'$arrayElemAt': ['$case_info.created_at', 0]},
                'scheduled_start': 1
            }},
            {'$project': {
                'wait_days': {
                    '$divide': [
                        {'$subtract': ['$scheduled_start', '$case_created']},
                        86400000
                    ]
                }
            }},
            {'$match': {'wait_days': {'$gte': 0}}},
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
            {'$match': {'$or': [{'case_status': {'$in': ['ACTIVE', 'active']}}, {'status': {'$in': ['ACTIVE', 'active']}}]}},
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
            'pending':   status_counts.get('PENDING',   0) + status_counts.get('pending',   0),
            'completed': status_counts.get('COMPLETED', 0) + status_counts.get('completed', 0)
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
        # Total intake packets submitted
        intake_started = db.db.intake_packets.count_documents({})

        # Completed = has ICF data (first_name filled in)
        intake_completed = db.db.intake_packets.count_documents({'icf.first_name': {'$exists': True, '$ne': ''}})

        # Cases created (any case in DB)
        cases_from_intake = db.db.cases.count_documents({})

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
    """Get monthly appointment counts (default last 6 months, configurable via ?months=N)"""
    try:
        num_months = min(int(request.args.get('months', 6)), 24)
        result = []
        now = datetime.utcnow()

        for i in range(num_months - 1, -1, -1):
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
    """Get monthly new case and closure counts (default last 6 months, configurable via ?months=N)"""
    try:
        num_months = min(int(request.args.get('months', 6)), 24)
        result = []
        now = datetime.utcnow()

        for i in range(num_months - 1, -1, -1):
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
                'case_status': {'$in': ['closed', 'CLOSED']}
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

        # Use icf.service_requested from intake_packets
        intake_pipeline = [
            {'$match': {'icf.service_requested': {'$exists': True, '$ne': None, '$ne': ''}}},
            {'$group': {'_id': '$icf.service_requested', 'count': {'$sum': 1}}},
            {'$sort': {'count': -1}}
        ]
        combined = {}
        for item in db.db.intake_packets.aggregate(intake_pipeline):
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
            {'$match': {'scheduled_start': {'$gte': start_date}}},
            {'$group': {
                '_id': {'$dayOfWeek': '$scheduled_start'},
                'count': {'$sum': 1}
            }},
            {'$sort': {'_id': 1}}
        ]
        day_map = {1: 'Sun', 2: 'Mon', 3: 'Tue', 4: 'Wed', 5: 'Thu', 6: 'Fri', 7: 'Sat'}
        by_day_raw = {item['_id']: item['count'] for item in db.db.appointments.aggregate(day_pipeline)}
        by_day = [{'day': day_map[d], 'count': by_day_raw.get(d, 0)} for d in range(1, 8)]

        # By hour
        hour_pipeline = [
            {'$match': {'scheduled_start': {'$gte': start_date}}},
            {'$group': {
                '_id': {'$hour': '$scheduled_start'},
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


@analytics_bp.route('/appointments/breakdown', methods=['GET'])
@jwt_required()
@dpo_admin_only
def get_appointments_breakdown():
    """Session mode (F2F/Online) and type (INTAKE/COUNSELING) breakdown + monthly method trend."""
    try:
        days_back = int(request.args.get('days', 180))
        start_date = datetime.utcnow() - timedelta(days=days_back)

        # Method distribution (all-time)
        method_agg = list(db.db.appointments.aggregate([
            {'$group': {'_id': '$method', 'count': {'$sum': 1}}}
        ]))
        method_dist = {item['_id']: item['count'] for item in method_agg if item['_id']}

        # Purpose distribution (all-time) — use canonical 4 types
        PURPOSE_LABELS = {
            'intake_interview': 'Intake Interview',
            'counseling':       'Continuing Counseling',
            'follow_up':        'Follow-Up Session',
            'others':           'Other / Specified',
        }
        purpose_agg = list(db.db.appointments.aggregate([
            {'$group': {'_id': '$purpose', 'count': {'$sum': 1}}}
        ]))
        type_dist = {
            PURPOSE_LABELS.get(item['_id'], item['_id'] or 'Unspecified'): item['count']
            for item in purpose_agg if item['_id']
        }

        # Monthly breakdown (period)
        now = datetime.utcnow()
        num_months = min(int(request.args.get('months', 6)), 12)
        monthly = []
        for i in range(num_months - 1, -1, -1):
            yr, mo = now.year, now.month - i
            while mo <= 0:
                mo += 12; yr -= 1
            ms = datetime(yr, mo, 1)
            me = datetime(yr, mo + 1, 1) if mo < 12 else datetime(yr + 1, 1, 1)
            qr = {'created_at': {'$gte': ms, '$lt': me}}
            f2f    = db.db.appointments.count_documents({**qr, 'method': {'$in': ['F2F', 'f2f', 'face-to-face']}})
            online = db.db.appointments.count_documents({**qr, 'method': {'$in': ['Online', 'online', 'ONLINE', 'virtual', 'VIRTUAL']}})
            intake  = db.db.appointments.count_documents({**qr, 'purpose': 'intake_interview'})
            counsel = db.db.appointments.count_documents({**qr, 'purpose': 'counseling'})
            monthly.append({
                'short': ms.strftime('%b'), 'label': ms.strftime('%b %Y'),
                'f2f': f2f, 'online': online, 'intake': intake, 'counseling': counsel,
            })

        return jsonify({
            'method_distribution': method_dist,
            'type_distribution': type_dist,
            'monthly': monthly,
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@analytics_bp.route('/students/demographics', methods=['GET'])
@jwt_required()
@dpo_admin_only
def get_student_demographics():
    """College and year-level distribution of students who have ever had an appointment."""
    try:
        # Students who have had at least one appointment
        student_ids = db.db.appointments.distinct('student_id')

        college_agg = list(db.db.users.aggregate([
            {'$match': {'_id': {'$in': student_ids}, 'role': 'STUDENT'}},
            {'$group': {'_id': '$college', 'count': {'$sum': 1}}},
            {'$sort': {'count': -1}},
        ]))
        year_agg = list(db.db.users.aggregate([
            {'$match': {'_id': {'$in': student_ids}, 'role': 'STUDENT'}},
            {'$group': {'_id': '$year_level', 'count': {'$sum': 1}}},
            {'$sort': {'count': -1}},
        ]))

        # All registered students for comparison
        total_students = db.db.users.count_documents({'role': 'STUDENT'})
        served_students = len(student_ids)

        college_data = [{'college': item['_id'] or 'Unspecified', 'count': item['count']} for item in college_agg]
        year_data    = [{'year_level': item['_id'] or 'Unspecified', 'count': item['count']} for item in year_agg]

        return jsonify({
            'college_distribution': college_data,
            'year_level_distribution': year_data,
            'total_students': total_students,
            'students_served': served_students,
            'utilization_rate': round(served_students / total_students * 100, 1) if total_students else 0,
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@analytics_bp.route('/cases/pipeline', methods=['GET'])
@jwt_required()
@dpo_admin_only
def get_cases_pipeline():
    """Case status pipeline, source distribution, endorsement routing, and top diagnoses."""
    try:
        # Status pipeline (use case_status field, fall back to status)
        pipeline_order = ['NEW', 'INTAKE_SCHEDULED', 'ACTIVE', 'PENDING_TERMINATION', 'CLOSED', 'CANCELLED']
        pipeline_counts = {}
        for stage in pipeline_order:
            count = db.db.cases.count_documents({
                '$or': [{'case_status': stage}, {'status': stage}]
            })
            pipeline_counts[stage] = count

        # Source distribution
        source_agg = list(db.db.cases.aggregate([
            {'$group': {'_id': '$source', 'count': {'$sum': 1}}},
            {'$sort': {'count': -1}},
        ]))
        source_data = [{'source': (item['_id'] or 'Unspecified').replace('_', ' ').title(), 'count': item['count']} for item in source_agg]

        # Endorsement routing (CC vs CP)
        endorse_agg = list(db.db.cases.aggregate([
            {'$match': {'endorsed_to_role': {'$exists': True, '$ne': None}}},
            {'$group': {'_id': '$endorsed_to_role', 'count': {'$sum': 1}}},
        ]))
        endorse_data = {item['_id']: item['count'] for item in endorse_agg}

        # Top diagnoses (from cases.diagnoses array)
        diag_pipeline = [
            {'$unwind': '$diagnoses'},
            {'$group': {'_id': '$diagnoses.name', 'count': {'$sum': 1}}},
            {'$sort': {'count': -1}},
            {'$limit': 10},
        ]
        diagnoses = [{'name': item['_id'], 'count': item['count']} for item in db.db.cases.aggregate(diag_pipeline) if item['_id']]

        # Cases stuck in NEW for > 7 days (need assignment)
        week_ago = datetime.utcnow() - timedelta(days=7)
        stuck_new = db.db.cases.count_documents({
            '$or': [{'case_status': 'NEW'}, {'status': 'NEW'}],
            'created_at': {'$lt': week_ago},
        })

        return jsonify({
            'pipeline': [{'stage': s, 'count': pipeline_counts[s]} for s in pipeline_order],
            'source_distribution': source_data,
            'endorsement_routing': endorse_data,
            'top_diagnoses': diagnoses,
            'stuck_new_cases': stuck_new,
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@analytics_bp.route('/sessions/outcomes', methods=['GET'])
@jwt_required()
@dpo_admin_only
def get_session_outcomes():
    """Monthly avg mood from session notes, risk-flagged count, PERMA label distribution."""
    try:
        months_back = min(int(request.args.get('months', 6)), 12)
        now = datetime.utcnow()
        mood_monthly = []
        for i in range(months_back - 1, -1, -1):
            yr, mo = now.year, now.month - i
            while mo <= 0:
                mo += 12; yr -= 1
            ms = datetime(yr, mo, 1)
            me = datetime(yr, mo + 1, 1) if mo < 12 else datetime(yr + 1, 1, 1)
            agg = list(db.db.session_notes.aggregate([
                {'$match': {
                    'session_date': {'$gte': ms, '$lt': me},
                    'mood_rating': {'$exists': True, '$type': 'number'},
                    'is_deleted': {'$ne': True},
                }},
                {'$group': {'_id': None, 'avg_mood': {'$avg': '$mood_rating'}, 'count': {'$sum': 1}}},
            ]))
            mood_monthly.append({
                'short': ms.strftime('%b'), 'label': ms.strftime('%b %Y'),
                'avg_mood': round(agg[0]['avg_mood'], 1) if agg else None,
                'session_count': agg[0]['count'] if agg else 0,
            })

        # Risk-flagged sessions
        total_notes = db.db.session_notes.count_documents({'is_deleted': {'$ne': True}})
        flagged     = db.db.session_notes.count_documents({'risk_flagged': True, 'is_deleted': {'$ne': True}})

        # Session type distribution
        stype_agg = list(db.db.session_notes.aggregate([
            {'$match': {'is_deleted': {'$ne': True}}},
            {'$group': {'_id': '$session_type', 'count': {'$sum': 1}}},
            {'$sort': {'count': -1}},
        ]))
        session_types = [{'type': item['_id'] or 'Unspecified', 'count': item['count']} for item in stype_agg]

        # PERMA label distribution (from perma_snapshots, latest per student)
        _label_norm = {'Flourishing': 'Excelling'}
        perma_agg = list(db.db.perma_snapshots.aggregate([
            {'$sort': {'saved_at': -1}},
            {'$group': {'_id': '$student_user_id', 'perma_label': {'$first': '$perma_label'}}},
            {'$group': {'_id': '$perma_label', 'count': {'$sum': 1}}},
            {'$sort': {'count': -1}},
        ]))
        # merge legacy labels into canonical ones
        merged: dict = {}
        for item in perma_agg:
            lbl = _label_norm.get(item['_id'], item['_id']) or 'Unknown'
            merged[lbl] = merged.get(lbl, 0) + item['count']
        perma_dist = [{'label': lbl, 'count': cnt} for lbl, cnt in sorted(merged.items(), key=lambda x: -x[1])]

        # No-show risk: students with ≥2 consecutive no-shows
        noshows_at_risk = db.db.missed_appointment_tracker.count_documents({
            'consecutive_no_shows': {'$gte': 2},
            'auto_closed': {'$ne': True},
        })

        return jsonify({
            'mood_monthly': mood_monthly,
            'risk_flagged_sessions': flagged,
            'total_sessions': total_notes,
            'flagged_rate': round(flagged / total_notes * 100, 1) if total_notes else 0,
            'session_type_distribution': session_types,
            'perma_label_distribution': perma_dist,
            'noshows_at_risk': noshows_at_risk,
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@analytics_bp.route('/evaluations/summary', methods=['GET'])
@jwt_required()
@dpo_admin_only
def evaluations_summary():
    """Aggregate session evaluation stats + individual list for admin analytics."""
    try:
        days = int(request.args.get('days', 180))
        since = datetime.utcnow() - timedelta(days=days)

        pipeline_agg = [
            {'$match': {
                'evaluation': {'$exists': True, '$ne': None},
                'evaluation.submitted_at': {'$gte': since},
            }},
            {'$project': {
                'evaluation': 1,
                'counselor_id': 1,
                'student_id': 1,
                'scheduled_start': 1,
                'preferred_date': 1,
                'session_type': 1,
            }},
        ]
        raw = list(db.db.appointments.aggregate(pipeline_agg))

        if not raw:
            return jsonify({
                'total': 0, 'averages': {}, 'by_month': [], 'individual': [],
            }), 200

        cats = ['counselor_attitude', 'online_communication', 'counseling_objectives',
                'techniques_used', 'overall_experience']

        # Aggregate averages
        totals = {c: 0 for c in cats}
        counts = {c: 0 for c in cats}
        for appt in raw:
            ev = appt.get('evaluation', {})
            for c in cats:
                v = ev.get(c)
                if v and isinstance(v, (int, float)) and v > 0:
                    totals[c] += v
                    counts[c] += 1

        averages = {c: round(totals[c] / counts[c], 2) if counts[c] else 0 for c in cats}
        overall_avg = round(sum(averages.values()) / len([v for v in averages.values() if v > 0]), 2) \
            if any(averages.values()) else 0

        # Monthly trend (overall_experience avg per month)
        monthly: dict = {}
        for appt in raw:
            ev = appt.get('evaluation', {})
            sub = ev.get('submitted_at')
            oe = ev.get('overall_experience', 0)
            if sub and oe:
                key = sub.strftime('%Y-%m') if isinstance(sub, datetime) else str(sub)[:7]
                if key not in monthly:
                    monthly[key] = {'total': 0, 'count': 0}
                monthly[key]['total'] += oe
                monthly[key]['count'] += 1
        by_month = sorted(
            [{'month': k, 'avg': round(v['total'] / v['count'], 2), 'count': v['count']}
             for k, v in monthly.items()],
            key=lambda x: x['month'],
        )

        # Resolve counselor names
        counselor_ids = list({str(a.get('counselor_id')) for a in raw if a.get('counselor_id')})
        counselor_map = {}
        for cid in counselor_ids:
            try:
                u = db.db.users.find_one({'_id': ObjectId(cid)}, {'first_name': 1, 'last_name': 1})
                if u:
                    counselor_map[cid] = f"{u.get('first_name', '')} {u.get('last_name', '')}".strip()
            except Exception:
                pass

        # Per-counselor averages
        by_counselor: dict = {}
        for appt in raw:
            cid = str(appt.get('counselor_id', ''))
            ev = appt.get('evaluation', {})
            oe = ev.get('overall_experience', 0)
            if cid and oe:
                if cid not in by_counselor:
                    by_counselor[cid] = {'name': counselor_map.get(cid, 'Unknown'), 'total': 0, 'count': 0}
                by_counselor[cid]['total'] += oe
                by_counselor[cid]['count'] += 1
        counselor_ratings = sorted(
            [{'counselor_id': cid, 'name': v['name'],
              'avg': round(v['total'] / v['count'], 2), 'count': v['count']}
             for cid, v in by_counselor.items()],
            key=lambda x: x['avg'], reverse=True,
        )

        # Individual list
        individual = []
        for appt in raw:
            ev = appt.get('evaluation', {})
            cid = str(appt.get('counselor_id', ''))
            date_raw = appt.get('scheduled_start') or appt.get('preferred_date')
            individual.append({
                'appointment_id': str(appt['_id']),
                'counselor_name': counselor_map.get(cid, 'Unknown'),
                'session_date': date_raw.isoformat() if isinstance(date_raw, datetime) else str(date_raw or ''),
                'submitted_at': ev.get('submitted_at', '').isoformat()
                    if isinstance(ev.get('submitted_at'), datetime) else '',
                'counselor_attitude': ev.get('counselor_attitude', 0),
                'online_communication': ev.get('online_communication', 0),
                'counseling_objectives': ev.get('counseling_objectives', 0),
                'techniques_used': ev.get('techniques_used', 0),
                'overall_experience': ev.get('overall_experience', 0),
                'liked_most': ev.get('liked_most', ''),
                'to_improve': ev.get('to_improve', ''),
            })
        individual.sort(key=lambda x: x['submitted_at'], reverse=True)

        # Completion rate: evaluations submitted vs COMPLETED appointments in period
        total_completed = db.db.appointments.count_documents({
            'status': 'COMPLETED',
            'updated_at': {'$gte': since},
        })

        return jsonify({
            'total': len(raw),
            'total_completed': total_completed,
            'completion_rate': round(len(raw) / total_completed * 100, 1) if total_completed else 0,
            'overall_avg': overall_avg,
            'averages': averages,
            'by_month': by_month,
            'by_counselor': counselor_ratings,
            'individual': individual,
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
