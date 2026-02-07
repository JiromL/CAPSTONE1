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
    """Calculate PHQ-9 score from responses"""
    if not responses:
        return 0, None
    scores = [int(responses.get(str(i), 0)) for i in range(9)]
    raw_score = sum(scores)
    if raw_score <= 4:
        risk_level = None
    elif raw_score <= 9:
        risk_level = RiskLevel.GREEN.value
    elif raw_score <= 14:
        risk_level = RiskLevel.YELLOW.value
    elif raw_score <= 19:
        risk_level = RiskLevel.RED.value
    else:
        risk_level = RiskLevel.CRITICAL.value
    return raw_score, risk_level


def calculate_gad7_score(responses):
    """Calculate GAD-7 score from responses"""
    if not responses:
        return 0, None
    scores = [int(responses.get(str(i), 0)) for i in range(7)]
    raw_score = sum(scores)
    if raw_score <= 4:
        risk_level = None
    elif raw_score <= 9:
        risk_level = RiskLevel.GREEN.value
    elif raw_score <= 14:
        risk_level = RiskLevel.YELLOW.value
    else:
        risk_level = RiskLevel.RED.value
    return raw_score, risk_level


def calculate_pss_score(responses):
    """Calculate PSS score from responses"""
    if not responses:
        return 0, None
    scores = [int(responses.get(str(i), 0)) for i in range(10)]
    raw_score = sum(scores)
    if raw_score <= 13:
        risk_level = RiskLevel.GREEN.value
    elif raw_score <= 26:
        risk_level = RiskLevel.YELLOW.value
    else:
        risk_level = RiskLevel.RED.value
    return raw_score, risk_level


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
        raw_score, risk_level = calculate_phq9_score(responses)
    elif assessment_type == 'GAD7':
        raw_score, risk_level = calculate_gad7_score(responses)
    else:
        raw_score, risk_level = calculate_pss_score(responses)
    
    assessment_doc = {
        "_id": ObjectId(),
        "case_id": ObjectId(case_id) if isinstance(case_id, str) else case_id,
        "assessment_type": assessment_type,
        "raw_score": raw_score,
        "normalized_score": min(100, (raw_score / 100) * 100),
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
        'normalized_score': min(100, (raw_score / 100) * 100),
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
        a['created_at'] = a['created_at'].isoformat()
    
    return jsonify({
        'case_id': case_id,
        'assessments': assessments
    }), 200


@assessments_bp.route('/phq9/template', methods=['GET'])
def get_phq9_template():
    """Get PHQ-9 template questions"""
    phq9_questions = [
        "Little interest or pleasure in doing things",
        "Feeling down, depressed, or hopeless",
        "Trouble falling or staying asleep, or sleeping too much",
        "Feeling tired or having little energy",
        "Poor appetite or overeating",
        "Feeling bad about yourself",
        "Trouble concentrating on things",
        "Moving or speaking so slowly that others have noticed, or the opposite",
        "Thoughts that you would be better off dead"
    ]
    
    return jsonify({
        'assessment_type': 'PHQ9',
        'questions': phq9_questions,
        'scale': 'Not at all (0) - Several days (1) - More than half the days (2) - Nearly every day (3)'
    }), 200


@assessments_bp.route('/gad7/template', methods=['GET'])
def get_gad7_template():
    """Get GAD-7 template questions"""
    gad7_questions = [
        "Feeling nervous, anxious, or on edge",
        "Not being able to stop or control worrying",
        "Worrying too much about different things",
        "Trouble relaxing",
        "Being so restless that it is hard to sit still",
        "Becoming easily annoyed or irritable",
        "Feeling afraid as if something awful might happen"
    ]
    
    return jsonify({
        'assessment_type': 'GAD7',
        'questions': gad7_questions,
        'scale': 'Not at all (0) - Several days (1) - More than half the days (2) - Nearly every day (3)'
    }), 200


@assessments_bp.route('/pss/template', methods=['GET'])
def get_pss_template():
    """Get PSS template questions"""
    pss_questions = [
        "Been upset because of something that happened unexpectedly",
        "Felt unable to control the important things in your life",
        "Felt nervous and stressed",
        "Dealt successfully with irritating life hassles",
        "Felt that you were effectively coping with important changes",
        "Felt confident about your ability to handle personal problems",
        "Felt that things were going your way",
        "Found that you could not cope with all the things you had to do",
        "Been able to control irritations in your life",
        "Felt that you were on top of things"
    ]
    
    return jsonify({
        'assessment_type': 'PSS',
        'questions': pss_questions,
        'scale': 'Never (0) - Almost never (1) - Sometimes (2) - Fairly often (3) - Very often (4)'
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
