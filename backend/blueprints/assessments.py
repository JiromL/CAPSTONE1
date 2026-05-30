"""
EPIC 2: TRIAGE & EARLY DETECTION MODULE
Blueprint for creating triage assessments (PHQ-9, GAD-7, PSS) with auto-scoring
MongoDB-compatible version
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, AssessmentType, RiskLevel, PermissionType
from utils import audit_log, user_has_permission
from datetime import datetime
from bson import ObjectId

assessments_bp = Blueprint('assessments', __name__, url_prefix='/api/assessments')


def calculate_phq9_score(responses):
    """Calculate PHQ-9 score from responses (Kroenke & Spitzer, 2002)"""
    if not responses:
        return 0, None, 'Minimal'
    raw_score = sum(int(responses.get(str(i), 0)) for i in range(9))
    if raw_score <= 4:
        return raw_score, None, 'Minimal'
    elif raw_score <= 9:
        return raw_score, RiskLevel.GREEN.value, 'Mild'
    elif raw_score <= 14:
        return raw_score, RiskLevel.YELLOW.value, 'Moderate'
    elif raw_score <= 19:
        return raw_score, RiskLevel.RED.value, 'Moderately Severe'
    else:
        return raw_score, RiskLevel.CRITICAL.value, 'Severe'


def calculate_gad7_score(responses):
    """Calculate GAD-7 score from responses (Spitzer et al., 2006)"""
    if not responses:
        return 0, None, 'Minimal'
    raw_score = sum(int(responses.get(str(i), 0)) for i in range(7))
    if raw_score <= 4:
        return raw_score, None, 'Minimal'
    elif raw_score <= 9:
        return raw_score, RiskLevel.GREEN.value, 'Mild'
    elif raw_score <= 14:
        return raw_score, RiskLevel.YELLOW.value, 'Moderate'
    else:
        return raw_score, RiskLevel.RED.value, 'Severe'


# PSS-10 items that are reverse-scored (0-indexed): confident, going your way, control irritations, on top of things
_PSS_REVERSED = {3, 4, 6, 7}


def calculate_pss_score(responses):
    """Calculate PSS-10 score from responses (Cohen, Kamarck & Mermelstein, 1983).
    Items at indices 3, 4, 6, 7 are reverse-scored (score = 4 - response).
    """
    if not responses:
        return 0, None, 'Low'
    raw_score = 0
    for i in range(10):
        val = int(responses.get(str(i), 0))
        raw_score += (4 - val) if i in _PSS_REVERSED else val
    if raw_score <= 13:
        return raw_score, RiskLevel.GREEN.value, 'Low'
    elif raw_score <= 26:
        return raw_score, RiskLevel.YELLOW.value, 'Moderate'
    else:
        return raw_score, RiskLevel.RED.value, 'High'


@assessments_bp.route('/<case_id>/triage', methods=['POST'])
@jwt_required()
def create_triage_assessment(case_id):
    """Create a triage assessment"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.CREATE_ASSESSMENT.value):
        return jsonify({'error': 'Permission denied'}), 403
    
    try:
        case = db.db.cases.find_one({"_id": ObjectId(case_id)})
    except:
        case = db.db.cases.find_one({"_id": case_id})
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    data = request.get_json()
    assessment_type = data.get('assessment_type', '').upper()
    
    if assessment_type not in ['PHQ9', 'GAD7', 'PSS']:
        return jsonify({'error': 'Invalid assessment type'}), 400
    
    responses = data.get('responses', {})
    
    if assessment_type == 'PHQ9':
        raw_score, risk_level, severity = calculate_phq9_score(responses)
        max_score = 27
    elif assessment_type == 'GAD7':
        raw_score, risk_level, severity = calculate_gad7_score(responses)
        max_score = 21
    else:
        raw_score, risk_level, severity = calculate_pss_score(responses)
        max_score = 40

    assessment_doc = {
        "_id": ObjectId(),
        "case_id": ObjectId(case_id) if isinstance(case_id, str) else case_id,
        "assessment_type": assessment_type,
        "raw_score": raw_score,
        "max_score": max_score,
        "normalized_score": round((raw_score / max_score) * 100, 1),
        "severity": severity,
        "risk_level": risk_level,
        "responses": responses,
        "created_by": ObjectId(user_id) if isinstance(user_id, str) else user_id,
        "created_at": datetime.utcnow()
    }
    
    result = db.db.assessments.insert_one(assessment_doc)
    
    # Update case risk level if needed
    if risk_level in [RiskLevel.RED.value, RiskLevel.CRITICAL.value]:
        db.db.cases.update_one(
            {"_id": ObjectId(case_id) if isinstance(case_id, str) else case_id},
            {
                "$set": {
                    "current_risk_level": risk_level,
                    "last_risk_assessment": datetime.utcnow()
                }
            }
        )
        
        # Create crisis escalation if critical
        if risk_level == RiskLevel.CRITICAL.value:
            db.db.crisis_escalations.insert_one({
                "_id": ObjectId(),
                "case_id": ObjectId(case_id) if isinstance(case_id, str) else case_id,
                "initiated_by": ObjectId(user_id) if isinstance(user_id, str) else user_id,
                "crisis_level": RiskLevel.CRITICAL.value,
                "description": f"Auto-triggered alert from {assessment_type} assessment with critical risk score",
                "created_at": datetime.utcnow()
            })
    
    audit_log(db.db, 'assessment', 'create', entity_id=str(result.inserted_id), new_values={
        'assessment_type': assessment_type,
        'risk_level': risk_level
    })
    
    return jsonify({
        'assessment_id': str(result.inserted_id),
        'case_id': case_id,
        'assessment_type': assessment_type,
        'raw_score': raw_score,
        'max_score': max_score,
        'normalized_score': round((raw_score / max_score) * 100, 1),
        'severity': severity,
        'risk_level': risk_level
    }), 201


@assessments_bp.route('/<assessment_id>', methods=['GET'])
@jwt_required()
def get_assessment(assessment_id):
    """Get assessment details"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Permission denied'}), 403
    
    try:
        assessment = db.db.assessments.find_one({"_id": ObjectId(assessment_id)})
    except:
        assessment = db.db.assessments.find_one({"_id": assessment_id})
    
    if not assessment:
        return jsonify({'error': 'Assessment not found'}), 404
    
    assessment['_id'] = str(assessment['_id'])
    assessment['case_id'] = str(assessment['case_id'])
    if 'created_by' in assessment:
        assessment['created_by'] = str(assessment['created_by'])
    assessment['created_at'] = assessment['created_at'].isoformat()

    return jsonify(assessment), 200


@assessments_bp.route('/case/<case_id>/history', methods=['GET'])
@jwt_required()
def get_case_assessments(case_id):
    """Get all assessments for a case"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Permission denied'}), 403
    
    try:
        assessments = list(db.db.assessments.find(
            {"case_id": ObjectId(case_id) if isinstance(case_id, str) else case_id}
        ).sort("created_at", -1))
    except:
        assessments = list(db.db.assessments.find(
            {"case_id": case_id}
        ).sort("created_at", -1))
    
    for a in assessments:
        a['_id'] = str(a['_id'])
        a['case_id'] = str(a['case_id'])
        if 'created_by' in a:
            a['created_by'] = str(a['created_by'])
        a['created_at'] = a['created_at'].isoformat()

    return jsonify({
        'case_id': case_id,
        'assessments': assessments
    }), 200


@assessments_bp.route('/phq9/template', methods=['GET'])
def get_phq9_template():
    """Get PHQ-9 template questions (Kroenke & Spitzer, 2002)"""
    return jsonify({
        'assessment_type': 'PHQ9',
        'name': 'Patient Health Questionnaire-9 (PHQ-9)',
        'instruction': 'Over the last 2 weeks, how often have you been bothered by any of the following problems?',
        'questions': [
            "Little interest or pleasure in doing things",
            "Feeling down, depressed, or hopeless",
            "Trouble falling or staying asleep, or sleeping too much",
            "Feeling tired or having little energy",
            "Poor appetite or overeating",
            "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
            "Trouble concentrating on things, such as reading the newspaper or watching television",
            "Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual",
            "Thoughts that you would be better off dead or of hurting yourself in some way"
        ],
        'scale': [
            {'value': 0, 'label': 'Not at all'},
            {'value': 1, 'label': 'Several days'},
            {'value': 2, 'label': 'More than half the days'},
            {'value': 3, 'label': 'Nearly every day'},
        ],
        'max_score': 27,
        'severity_guide': [
            {'range': '0–4', 'label': 'Minimal'},
            {'range': '5–9', 'label': 'Mild'},
            {'range': '10–14', 'label': 'Moderate'},
            {'range': '15–19', 'label': 'Moderately Severe'},
            {'range': '20–27', 'label': 'Severe'},
        ],
    }), 200


@assessments_bp.route('/gad7/template', methods=['GET'])
def get_gad7_template():
    """Get GAD-7 template questions (Spitzer et al., 2006)"""
    return jsonify({
        'assessment_type': 'GAD7',
        'name': 'Generalized Anxiety Disorder-7 (GAD-7)',
        'instruction': 'Over the last 2 weeks, how often have you been bothered by the following problems?',
        'questions': [
            "Feeling nervous, anxious, or on edge",
            "Not being able to stop or control worrying",
            "Worrying too much about different things",
            "Trouble relaxing",
            "Being so restless that it is hard to sit still",
            "Becoming easily annoyed or irritable",
            "Feeling afraid as if something awful might happen",
        ],
        'scale': [
            {'value': 0, 'label': 'Not at all'},
            {'value': 1, 'label': 'Several days'},
            {'value': 2, 'label': 'More than half the days'},
            {'value': 3, 'label': 'Nearly every day'},
        ],
        'max_score': 21,
        'severity_guide': [
            {'range': '0–4', 'label': 'Minimal'},
            {'range': '5–9', 'label': 'Mild'},
            {'range': '10–14', 'label': 'Moderate'},
            {'range': '15–21', 'label': 'Severe'},
        ],
    }), 200


@assessments_bp.route('/pss/template', methods=['GET'])
def get_pss_template():
    """Get PSS-10 template questions (Cohen, Kamarck & Mermelstein, 1983).
    Items at indices 3, 4, 6, 7 are reverse-scored.
    """
    return jsonify({
        'assessment_type': 'PSS',
        'name': 'Perceived Stress Scale-10 (PSS-10)',
        'instruction': 'In the last month, how often have you felt or thought the following?',
        'questions': [
            "Been upset because of something that happened unexpectedly?",
            "Felt that you were unable to control the important things in your life?",
            "Felt nervous and stressed?",
            "Felt confident about your ability to handle your personal problems?",
            "Felt that things were going your way?",
            "Been unable to cope with all the things that you had to do?",
            "Been able to control irritations in your life?",
            "Felt that you were on top of things?",
            "Been angered because of things that were outside of your control?",
            "Felt difficulties were piling up so high that you could not overcome them?",
        ],
        'reversed_items': [3, 4, 6, 7],
        'scale': [
            {'value': 0, 'label': 'Never'},
            {'value': 1, 'label': 'Almost never'},
            {'value': 2, 'label': 'Sometimes'},
            {'value': 3, 'label': 'Fairly often'},
            {'value': 4, 'label': 'Very often'},
        ],
        'max_score': 40,
        'severity_guide': [
            {'range': '0–13', 'label': 'Low stress'},
            {'range': '14–26', 'label': 'Moderate stress'},
            {'range': '27–40', 'label': 'High stress'},
        ],
    }), 200


@assessments_bp.route('/high-risk', methods=['GET'])
@jwt_required()
def get_high_risk_clients():
    """Get all high-risk clients for dashboard"""
    user_id = get_jwt_identity()
    
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_RISK_DASHBOARD.value):
        return jsonify({'error': 'Permission denied'}), 403
    
    high_risk_cases = list(db.db.cases.find(
        {"current_risk_level": {"$in": [RiskLevel.RED.value, RiskLevel.CRITICAL.value]}}
    ))
    
    for c in high_risk_cases:
        c['_id'] = str(c['_id'])
        if 'student_id' in c:
            c['student_id'] = str(c['student_id'])
        if 'created_at' in c:
            c['created_at'] = c['created_at'].isoformat()
    
    return jsonify({
        'high_risk_count': len(high_risk_cases),
        'cases': high_risk_cases
    }), 200


@assessments_bp.route('/case/<case_id>/schedule', methods=['GET'])
@jwt_required()
def get_assessment_schedule(case_id):
    """Get repeating assessment schedule for a case."""
    user_id = get_jwt_identity()
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Permission denied'}), 403
    try:
        cid = ObjectId(case_id)
    except Exception:
        cid = case_id
    schedules = list(db.db.assessment_schedules.find({'case_id': cid}))
    result = []
    for s in schedules:
        result.append({
            'schedule_id': str(s['_id']),
            'assessment_type': s.get('assessment_type'),
            'interval_days': s.get('interval_days'),
            'next_due': s['next_due'].isoformat() if isinstance(s.get('next_due'), datetime) else s.get('next_due'),
            'active': s.get('active', True),
            'created_at': s['created_at'].isoformat() if isinstance(s.get('created_at'), datetime) else s.get('created_at'),
        })
    return jsonify({'schedules': result}), 200


@assessments_bp.route('/case/<case_id>/schedule', methods=['POST'])
@jwt_required()
def create_assessment_schedule(case_id):
    """Create a repeating assessment schedule for a case."""
    user_id = get_jwt_identity()
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Permission denied'}), 403
    try:
        cid = ObjectId(case_id)
    except Exception:
        cid = case_id
    data = request.get_json() or {}
    assessment_type = data.get('assessment_type')  # 'PHQ9', 'GAD7', 'PSS'
    interval_days = data.get('interval_days')
    if not assessment_type or not interval_days:
        return jsonify({'error': 'assessment_type and interval_days are required'}), 400
    now = datetime.utcnow()
    doc = {
        'case_id': cid,
        'assessment_type': assessment_type,
        'interval_days': int(interval_days),
        'next_due': data.get('start_date') or now.isoformat(),
        'active': True,
        'created_by': user_id,
        'created_at': now,
    }
    # Convert next_due to datetime
    if isinstance(doc['next_due'], str):
        try:
            doc['next_due'] = datetime.fromisoformat(doc['next_due'].replace('Z', '+00:00')).replace(tzinfo=None)
        except Exception:
            doc['next_due'] = now
    result = db.db.assessment_schedules.insert_one(doc)
    return jsonify({'schedule_id': str(result.inserted_id), 'message': 'Schedule created'}), 201


@assessments_bp.route('/schedule/<schedule_id>', methods=['DELETE'])
@jwt_required()
def delete_assessment_schedule(schedule_id):
    """Deactivate a repeating assessment schedule."""
    user_id = get_jwt_identity()
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Permission denied'}), 403
    try:
        sid = ObjectId(schedule_id)
    except Exception:
        sid = schedule_id
    db.db.assessment_schedules.update_one({'_id': sid}, {'$set': {'active': False}})
    return jsonify({'message': 'Schedule deactivated'}), 200
