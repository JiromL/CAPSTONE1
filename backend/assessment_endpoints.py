"""
Role-Based Assessment Dashboard Endpoints
Efficient, role-based access to assessment data with real-time alerts
"""

def init_assessment_indexes(db_instance):
    """Create efficient database indexes for assessment queries"""
    try:
        # Intake collection indexes
        db_instance.db.intakes.create_index([("is_emergency", 1), ("status", 1), ("student_submitted_at", -1)])
        db_instance.db.intakes.create_index([("case_id", 1)])
        db_instance.db.intakes.create_index([("assigned_counselor_id", 1), ("status", 1)])
        db_instance.db.intakes.create_index([("urgency_level", 1), ("student_submitted_at", -1)])
        db_instance.db.intakes.create_index([("responses.phq9_score", 1), ("responses.gad7_score", 1)])
        
        # Assessment collection indexes
        db_instance.db.assessments.create_index([("case_id", 1)])
        db_instance.db.assessments.create_index([("assessment_type", 1), ("created_at", -1)])
        db_instance.db.assessments.create_index([("assessment_type", 1), f"{assessment_type}_score", 1)])
        
        # Case collection indexes
        db_instance.db.cases.create_index([("student_id", 1)])
        db_instance.db.cases.create_index([("assigned_counselor_id", 1)])
        db_instance.db.cases.create_index([("case_status", 1)])
        
        return {"status": "success", "message": "All indexes created"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


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


def can_view_assessment(user_role, target_case_counselor_id, user_id):
    """Determine if user can view specific assessment based on role"""
    role_permissions = {
        "ADMIN": True,  # Admins see all
        "DPO": True,    # DPO sees all
        "PSYCHOLOGIST": True,  # Psychologists see all assigned cases
        "COUNSELOR": lambda: str(target_case_counselor_id) == str(user_id),  # Only own assignments
        "CSP": lambda: str(target_case_counselor_id) == str(user_id),
        "CSC": lambda: str(target_case_counselor_id) == str(user_id),
        "IC": True,     # Intake counselors see all intakes
        "CASE_MANAGER": True,  # Case managers see all
        "STUDENT": False,  # Students don't see others
        "STAFF": False
    }
    
    permission = role_permissions.get(user_role, False)
    if callable(permission):
        return permission()
    return permission


# ============================================================
# EFFICIENT ROLE-BASED ASSESSMENT ENDPOINTS
# ============================================================

@intake_bp.route('/assessments/init-indexes', methods=['POST'])
@jwt_required()
def init_indexes():
    """Initialize database indexes for optimal performance"""
    user_id = get_jwt_identity()
    user = db.db.users.find_one({"_id": ObjectId(user_id)})
    
    if not user or user.get('role') not in ['ADMIN', 'DPO']:
        return jsonify({'error': 'Only admins can initialize indexes'}), 403
    
    result = init_assessment_indexes(db)
    return jsonify(result), 200


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
            case = db.db.cases.find_one({"student_id": ObjectId(user_id)})
            if case:
                intakes = list(db.db.intakes.find({"case_id": case['_id']}).sort("created_at", -1).limit(5))
                for intake in intakes:
                    scores = intake.get('responses', {})
                    risk = get_risk_level(
                        scores.get('phq9_score'),
                        scores.get('gad7_score'),
                        scores.get('acad_score'),
                        scores.get('social_score')
                    )
                    dashboard_data['recent_cases'].append({
                        'counseling_id': intake.get('counseling_id'),
                        'submitted_at': intake.get('student_submitted_at').isoformat() if intake.get('student_submitted_at') else None,
                        'appointment_date': intake.get('responses', {}).get('appointment_date'),
                        'risk_level': risk,
                        'scores': {k: v for k, v in scores.items() if k.endswith('_score')}
                    })
                
                dashboard_data['summary'] = {
                    'total_intakes': len(intakes),
                    'my_case_id': str(case['_id'])
                }
        
        elif user_role in ['COUNSELOR', 'CSC', 'CSP']:
            # Counselor sees only their assigned cases
            cases = list(db.db.cases.find({"assigned_counselor_id": ObjectId(user_id)}).limit(50))
            case_ids = [case['_id'] for case in cases]
            
            # Efficiently get all assessments for assigned cases
            intakes = list(db.db.intakes.find({
                "case_id": {"$in": case_ids},
                "status": "COMPLETED"
            }).sort("student_submitted_at", -1).limit(20))
            
            for intake in intakes:
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
                
                dashboard_data['recent_cases'].append({
                    'case_id': str(intake['case_id']),
                    'counseling_id': intake.get('counseling_id'),
                    'submitted_at': intake.get('student_submitted_at').isoformat() if intake.get('student_submitted_at') else None,
                    'risk_level': risk,
                    'is_emergency': intake.get('is_emergency')
                })
            
            dashboard_data['summary'] = {
                'assigned_cases': len(cases),
                'high_risk_alerts': len(dashboard_data['alerts']),
                'recent_assessments': len(intakes)
            }
        
        elif user_role in ['PSYCHOLOGIST']:
            # Psychologists see high-complexity cases (mental health focus)
            # Efficiently find high-risk mental health cases
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
            
            # Count by risk level
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
            
            dashboard_data['recent_cases'] = all_intakes[:20]
            dashboard_data['summary'] = {
                'total_intakes': len(all_intakes),
                'risk_distribution': risk_distribution,
                'concern_distribution': concern_distribution,
                'critical_alerts': len([a for a in dashboard_data['alerts'] if a['risk_level'] == 'CRITICAL'])
            }
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
    return jsonify(dashboard_data), 200


@intake_bp.route('/assessments/urgent', methods=['GET'])
@jwt_required()
def get_urgent_assessments():
    """
    Get all urgent assessments (high-risk or emergency)
    Role-based filtering - very efficient aggregation
    """
    user_id = get_jwt_identity()
    user = db.db.users.find_one({"_id": ObjectId(user_id)})
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    user_role = user.get('role')
    
    # Build efficient aggregation pipeline
    pipeline = [
        {
            "$match": {
                "status": "COMPLETED",
                "$or": [
                    {"is_emergency": True},
                    {"responses.phq9_score": {"$gte": 20}},
                    {"responses.gad7_score": {"$gte": 15}},
                    {"responses.acad_score": {"$gte": 24}},
                    {"responses.social_score": {"$gte": 24}}
                ]
            }
        },
        {"$sort": {"student_submitted_at": -1}},
        {"$limit": 50},
        {
            "$lookup": {
                "from": "cases",
                "localField": "case_id",
                "foreignField": "_id",
                "as": "case"
            }
        }
    ]
    
    # Role-based filtering
    if user_role == 'COUNSELOR':
        pipeline[0]["$match"]["assigned_counselor_id"] = ObjectId(user_id)
    elif user_role == 'STUDENT':
        # Students only see their own
        case = db.db.cases.find_one({"student_id": ObjectId(user_id)})
        if case:
            pipeline[0]["$match"]["case_id"] = case['_id']
        else:
            return jsonify({'urgent_assessments': []}), 200
    elif user_role not in ['ADMIN', 'DPO', 'PSYCHOLOGIST', 'IC', 'CASE_MANAGER']:
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    urgent_intakes = list(db.db.intakes.aggregate(pipeline))
    
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
            'submitted_at': intake.get('student_submitted_at').isoformat() if intake.get('student_submitted_at') else None,
            'days_since_submission': (datetime.utcnow() - intake.get('student_submitted_at')).days if intake.get('student_submitted_at') else None
        })
    
    return jsonify({
        'count': len(result),
        'urgent_assessments': result
    }), 200


@intake_bp.route('/assessments/<assessment_id>', methods=['GET'])
@jwt_required()
def get_assessment_details(assessment_id):
    """Get detailed assessment information with role-based access"""
    user_id = get_jwt_identity()
    user = db.db.users.find_one({"_id": ObjectId(user_id)})
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    try:
        intake = db.db.intakes.find_one({"_id": ObjectId(assessment_id)})
    except:
        intake = db.db.intakes.find_one({"_id": assessment_id})
    
    if not intake:
        return jsonify({'error': 'Assessment not found'}), 404
    
    case = db.db.cases.find_one({"_id": intake['case_id']})
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    # Check role-based access
    user_role = user.get('role')
    if user_role == 'STUDENT':
        if str(case['student_id']) != str(user_id):
            return jsonify({'error': 'Cannot view other students assessments'}), 403
    elif user_role in ['COUNSELOR', 'CSC', 'CSP']:
        if str(case.get('assigned_counselor_id')) != str(user_id):
            return jsonify({'error': 'Not assigned to this case'}), 403
    elif user_role not in ['ADMIN', 'DPO', 'PSYCHOLOGIST', 'IC', 'CASE_MANAGER']:
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    # Build detailed response
    responses = intake.get('responses', {})
    scores = {k: v for k, v in responses.items() if k.endswith('_score')}
    
    return jsonify({
        'intake_id': str(intake['_id']),
        'counseling_id': intake.get('counseling_id'),
        'case_id': str(case['_id']),
        'concern': responses.get('purpose'),
        'concern_details': responses.get('concerns'),
        'assessments_taken': list(scores.keys()),
        'scores': scores,
        'risk_level': get_risk_level(*scores.values()),
        'is_emergency': intake.get('is_emergency'),
        'is_anonymous': intake.get('is_anonymous'),
        'submitted_at': intake.get('student_submitted_at').isoformat() if intake.get('student_submitted_at') else None,
        'appointment_date': responses.get('appointment_date'),
        'urgency_level': responses.get('urgency_level'),
        'preferred_platform': responses.get('preferred_platform')
    }), 200


@intake_bp.route('/assessments/by-concern/<concern>', methods=['GET'])
@jwt_required()
def get_assessments_by_concern(concern):
    """Efficiently get assessments filtered by concern type"""
    user_id = get_jwt_identity()
    user = db.db.users.find_one({"_id": ObjectId(user_id)})
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    user_role = user.get('role')
    
    # Only counseling staff can view aggregated data
    if user_role not in ['ADMIN', 'DPO', 'PSYCHOLOGIST', 'COUNSELOR', 'IC', 'CASE_MANAGER']:
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    # Efficient query with concern filter
    query = {
        "status": "COMPLETED",
        "responses.purpose": concern
    }
    
    if user_role == 'COUNSELOR':
        query["assigned_counselor_id"] = ObjectId(user_id)
    
    assessments = list(db.db.intakes.find(query).sort("student_submitted_at", -1).limit(100))
    
    result = []
    for intake in assessments:
        scores = intake.get('responses', {})
        result.append({
            'intake_id': str(intake['_id']),
            'counseling_id': intake.get('counseling_id'),
            'concerns': scores.get('concerns', '')[:100],  # First 100 chars
            'is_emergency': intake.get('is_emergency'),
            'scores': {k: v for k, v in scores.items() if k.endswith('_score')},
            'submitted_at': intake.get('student_submitted_at').isoformat() if intake.get('student_submitted_at') else None
        })
    
    return jsonify({
        'concern': concern,
        'count': len(result),
        'assessments': result
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
        
        # Efficient aggregation for statistics
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
                    ],
                    "by_appointment_window": [
                        {"$group": {"_id": "$responses.estimated_appointment_days", "count": {"$sum": 1}}}
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
