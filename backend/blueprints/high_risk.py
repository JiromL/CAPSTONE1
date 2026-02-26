"""
EPIC 7: HIGH-RISK MONITORING SYSTEM
Blueprint for daily check-ins, crisis escalation, and safety planning
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from models import db, RiskLevel, UserRole, PermissionType
from utils import audit_log, user_has_permission
from datetime import datetime, timedelta

high_risk_bp = Blueprint('high_risk', __name__, url_prefix='/api/high-risk')


@high_risk_bp.route('/case/<case_id>/checkin', methods=['POST'])
@jwt_required()
def create_daily_checkin(case_id):
    """Create daily check-in for high-risk client (EPIC 7: Daily Check-In Note System)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        cid = ObjectId(case_id)
        case = db.db.cases.find_one({"_id": cid})
    except:
        case = db.db.cases.find_one({"_id": case_id})
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    if not case.get('requires_daily_checkin'):
        return jsonify({'error': 'Daily check-in not required for this case'}), 400
    
    data = request.get_json()
    
    if not data.get('check_in_method') or not data.get('notes') or 'current_risk_level' not in data:
        return jsonify({'error': 'Missing required fields'}), 400
    
    checkin = {
        "case_id": case['_id'],
        "counselor_id": ObjectId(user_id) if isinstance(user_id, str) else user_id,
        "check_in_method": data['check_in_method'],
        "notes": data['notes'],
        "current_risk_level": data['current_risk_level'].upper(),
        "risk_escalation_needed": data.get('risk_escalation_needed', False),
        "escalation_reason": data.get('escalation_reason'),
        "check_in_date": datetime.utcnow(),
        "created_at": datetime.utcnow()
    }
    
    result = db.db.high_risk_checkins.insert_one(checkin)
    
    # Update case risk level if escalation needed (EPIC 7: Risk Escalation Alerts)
    if checkin['risk_escalation_needed'] and checkin['current_risk_level'] in ['RED', 'CRITICAL']:
        db.db.cases.update_one(
            {"_id": case['_id']},
            {"$set": {
                "current_risk_level": checkin['current_risk_level'],
                "last_risk_assessment": datetime.utcnow()
            }}
        )
        
        # Create crisis escalation if critical
        if checkin['current_risk_level'] == 'CRITICAL':
            escalation = {
                "case_id": case['_id'],
                "initiated_by_id": ObjectId(user_id) if isinstance(user_id, str) else user_id,
                "crisis_level": RiskLevel.CRITICAL.value,
                "description": f"Crisis escalation from daily check-in: {data.get('escalation_reason', '')}",
                "resolved": False,
                "created_at": datetime.utcnow()
            }
            db.db.crisis_escalations.insert_one(escalation)
    
    audit_log(db.db, 'high_risk_checkin', 'create', entity_id=str(result.inserted_id), new_values={
        'case_id': str(case['_id']),
        'current_risk_level': data['current_risk_level'],
        'risk_escalation_needed': data.get('risk_escalation_needed', False)
    })
    
    return jsonify({
        'checkin_id': str(result.inserted_id),
        'case_id': str(case['_id']),
        'check_in_method': data['check_in_method'],
        'current_risk_level': data['current_risk_level'],
        'check_in_date': checkin['check_in_date'].isoformat()
    }), 201


@high_risk_bp.route('/case/<case_id>/checkin-history', methods=['GET'])
@jwt_required()
def get_checkin_history(case_id):
    """Get daily check-in history (EPIC 7: Daily Check-In Note System)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        cid = ObjectId(case_id)
        case = db.db.cases.find_one({"_id": cid})
    except:
        case = db.db.cases.find_one({"_id": case_id})
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    checkins = list(db.db.high_risk_checkins.find({"case_id": case['_id']}).sort("check_in_date", -1))
    
    result_checkins = []
    for c in checkins:
        counselor = db.db.users.find_one({"_id": c.get('counselor_id')})
        result_checkins.append({
            'checkin_id': str(c['_id']),
            'check_in_method': c.get('check_in_method'),
            'notes': c.get('notes'),
            'current_risk_level': c.get('current_risk_level'),
            'risk_escalation_needed': c.get('risk_escalation_needed'),
            'check_in_date': c['check_in_date'].isoformat() if isinstance(c['check_in_date'], datetime) else c['check_in_date'],
            'counselor': f"{counselor.get('first_name', '')} {counselor.get('last_name', '')}" if counselor else None
        })
    
    return jsonify({
        'case_id': str(case['_id']),
        'total_checkins': len(checkins),
        'checkins': result_checkins
    }), 200


@high_risk_bp.route('/case/<case_id>/safety-plan', methods=['POST'])
@jwt_required()
def create_safety_plan(case_id):
    """Create or update safety plan (EPIC 7: Safety Plan Upload Field)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        cid = ObjectId(case_id)
        case = db.db.cases.find_one({"_id": cid})
    except:
        case = db.db.cases.find_one({"_id": case_id})
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    data = request.get_json()
    
    safety_plan = db.db.safety_plans.find_one({"case_id": case['_id']})
    
    if safety_plan:
        # Update existing
        db.db.safety_plans.update_one(
            {"_id": safety_plan['_id']},
            {"$set": {
                "risk_factors": data.get('risk_factors'),
                "warning_signs": data.get('warning_signs'),
                "coping_strategies": data.get('coping_strategies'),
                "support_people": data.get('support_people'),
                "crisis_resources": data.get('crisis_resources'),
                "updated_at": datetime.utcnow()
            }}
        )
        plan_id = str(safety_plan['_id'])
    else:
        # Create new
        safety_plan_doc = {
            "case_id": case['_id'],
            "risk_factors": data.get('risk_factors'),
            "warning_signs": data.get('warning_signs'),
            "coping_strategies": data.get('coping_strategies'),
            "support_people": data.get('support_people'),
            "crisis_resources": data.get('crisis_resources'),
            "created_at": datetime.utcnow()
        }
        result = db.db.safety_plans.insert_one(safety_plan_doc)
        plan_id = str(result.inserted_id)
    
    audit_log(db.db, 'safety_plan', 'create_or_update', entity_id=plan_id, new_values={
        'case_id': str(case['_id'])
    })
    
    return jsonify({
        'safety_plan_id': plan_id,
        'case_id': str(case['_id']),
        'message': 'Safety plan created/updated'
    }), 201


# -- new perma history / risk endpoints --------------------------------------------------

def _compute_risk_from_label(label: str) -> str:
    """Map a PERMA label to a simple risk level."""
    if not label:
        return 'UNKNOWN'
    l = label.lower()
    if 'struggl' in l or 'red' in l:
        return 'HIGH'
    if 'surviv' in l or 'yellow' in l:
        return 'MEDIUM'
    if 'thriv' in l or 'green' in l:
        return 'LOW'
    return 'UNKNOWN'


@high_risk_bp.route('/user/<username>/perma-history', methods=['GET'])
@jwt_required()
def get_user_perma_history(username):
    """Return the PERMA history for a student along with a risk classification."""
    # simple permission check: counselors and above
    user_id = get_jwt_identity()
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_RISK_DASHBOARD.value):
        return jsonify({'error': 'Insufficient permissions'}), 403

    entries = list(db.db.perma_history.find({'username': username}).sort('date', -1))
    result = []
    for e in entries:
        result.append({
            'date': e.get('date').isoformat() if hasattr(e.get('date'), 'isoformat') else e.get('date'),
            'perma_label': e.get('perma_label')
        })
    risk = _compute_risk_from_label(result[0]['perma_label']) if result else 'UNKNOWN'

    return jsonify({'username': username, 'risk': risk, 'history': result}), 200


@high_risk_bp.route('/users', methods=['GET'])
@jwt_required()
def list_users_with_risk():
    """List all student usernames along with their current risk classification."""
    user_id = get_jwt_identity()
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_RISK_DASHBOARD.value):
        return jsonify({'error': 'Insufficient permissions'}), 403

    # get student usernames from users collection
    student_docs = db.db.users.find({'role': 'STUDENT'}, {'username': 1})
    users = []
    for doc in student_docs:
        uname = doc.get('username')
        # fetch latest perma entry
        entry = db.db.perma_history.find({'username': uname}).sort('date', -1).limit(1)
        latest = list(entry)
        risk = _compute_risk_from_label(latest[0].get('perma_label')) if latest else 'UNKNOWN'
        users.append({'username': uname, 'risk': risk})

    return jsonify(users), 200


@high_risk_bp.route('/case/<case_id>/safety-plan', methods=['GET'])
@jwt_required()
def get_safety_plan(case_id):
    """Get safety plan (EPIC 7: Safety Plan Upload Field)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        cid = ObjectId(case_id)
        case = db.db.cases.find_one({"_id": cid})
    except:
        case = db.db.cases.find_one({"_id": case_id})
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    safety_plan = db.db.safety_plans.find_one({"case_id": case['_id']})
    
    if not safety_plan:
        return jsonify({'error': 'Safety plan not found'}), 404
    
    audit_log(db.db, 'safety_plan', 'view', entity_id=str(safety_plan['_id']))
    
    return jsonify({
        'safety_plan_id': str(safety_plan['_id']),
        'case_id': str(case['_id']),
        'risk_factors': safety_plan.get('risk_factors'),
        'warning_signs': safety_plan.get('warning_signs'),
        'coping_strategies': safety_plan.get('coping_strategies'),
        'support_people': safety_plan.get('support_people'),
        'crisis_resources': safety_plan.get('crisis_resources'),
        'created_at': safety_plan['created_at'].isoformat() if isinstance(safety_plan['created_at'], datetime) else safety_plan['created_at'],
        'updated_at': safety_plan['updated_at'].isoformat() if isinstance(safety_plan.get('updated_at'), datetime) else safety_plan.get('updated_at')
    }), 200


@high_risk_bp.route('/crisis-escalate/<case_id>', methods=['POST'])
@jwt_required()
def escalate_to_crisis(case_id):
    """Trigger crisis escalation (EPIC 7: Crisis Escalation Button)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.ESCALATE_CRISIS.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        cid = ObjectId(case_id)
        case = db.db.cases.find_one({"_id": cid})
    except:
        case = db.db.cases.find_one({"_id": case_id})
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    data = request.get_json()
    
    if not data.get('description'):
        return jsonify({'error': 'Description is required'}), 400
    
    escalation = {
        "case_id": case['_id'],
        "initiated_by_id": ObjectId(user_id) if isinstance(user_id, str) else user_id,
        "crisis_level": data.get('crisis_level', 'CRITICAL').upper(),
        "description": data['description'],
        "emergency_contact_notified": data.get('emergency_contact_notified', False),
        "hospital_contact": data.get('hospital_contact', False),
        "police_contact": data.get('police_contact', False),
        "resolved": False,
        "created_at": datetime.utcnow()
    }
    
    result = db.db.crisis_escalations.insert_one(escalation)
    
    # Update case to critical risk
    db.db.cases.update_one(
        {"_id": case['_id']},
        {"$set": {
            "current_risk_level": RiskLevel.CRITICAL.value,
            "last_risk_assessment": datetime.utcnow(),
            "requires_daily_checkin": True
        }}
    )
    
    audit_log(db.db, 'crisis_escalation', 'create', entity_id=str(result.inserted_id), new_values={
        'case_id': str(case['_id']),
        'description': data['description']
    })
    
    return jsonify({
        'escalation_id': str(result.inserted_id),
        'case_id': str(case['_id']),
        'crisis_level': escalation['crisis_level'],
        'created_at': escalation['created_at'].isoformat()
    }), 201


@high_risk_bp.route('/crisis-escalation/<escalation_id>', methods=['GET'])
@jwt_required()
def get_crisis_escalation(escalation_id):
    """Get crisis escalation details"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        eid = ObjectId(escalation_id)
        escalation = db.db.crisis_escalations.find_one({"_id": eid})
    except:
        escalation = db.db.crisis_escalations.find_one({"_id": escalation_id})
    
    if not escalation:
        return jsonify({'error': 'Escalation not found'}), 404
    
    initiated_by = db.db.users.find_one({"_id": escalation.get('initiated_by_id')})
    
    return jsonify({
        'escalation_id': str(escalation['_id']),
        'case_id': str(escalation.get('case_id')),
        'crisis_level': escalation.get('crisis_level'),
        'description': escalation.get('description'),
        'initiated_by': f"{initiated_by.get('first_name', '')} {initiated_by.get('last_name', '')}" if initiated_by else None,
        'emergency_contact_notified': escalation.get('emergency_contact_notified'),
        'hospital_contact': escalation.get('hospital_contact'),
        'police_contact': escalation.get('police_contact'),
        'resolved': escalation.get('resolved'),
        'resolution_notes': escalation.get('resolution_notes'),
        'created_at': escalation['created_at'].isoformat() if isinstance(escalation['created_at'], datetime) else escalation['created_at'],
        'resolved_at': escalation['resolved_at'].isoformat() if isinstance(escalation.get('resolved_at'), datetime) else escalation.get('resolved_at')
    }), 200


@high_risk_bp.route('/crisis-escalation/<escalation_id>/resolve', methods=['POST'])
@jwt_required()
def resolve_crisis(escalation_id):
    """Resolve crisis escalation"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        eid = ObjectId(escalation_id)
        escalation = db.db.crisis_escalations.find_one({"_id": eid})
    except:
        escalation = db.db.crisis_escalations.find_one({"_id": escalation_id})
    
    if not escalation:
        return jsonify({'error': 'Escalation not found'}), 404
    
    data = request.get_json()
    
    db.db.crisis_escalations.update_one(
        {"_id": escalation['_id']},
        {"$set": {
            "resolved": True,
            "resolved_at": datetime.utcnow(),
            "resolution_notes": data.get('resolution_notes')
        }}
    )
    
    audit_log(db.db, 'crisis_escalation', 'resolve', entity_id=str(escalation['_id']), new_values={
        'resolved': True,
        'resolution_notes': data.get('resolution_notes')
    })
    
    return jsonify({
        'message': 'Crisis escalation resolved',
        'escalation_id': str(escalation['_id']),
        'resolved_at': datetime.utcnow().isoformat()
    }), 200


@high_risk_bp.route('/monitoring-dashboard', methods=['GET'])
@jwt_required()
def get_monitoring_dashboard():
    """Get high-risk monitoring dashboard (EPIC 7: Psych Oversight Dashboard)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_RISK_DASHBOARD.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    # Get all critical/red risk cases
    high_risk_cases = list(db.db.cases.find({
        "current_risk_level": {"$in": [RiskLevel.RED.value, RiskLevel.CRITICAL.value]}
    }))
    
    # Get recent escalations
    escalations = list(db.db.crisis_escalations.find({"resolved": False}).sort("created_at", -1))
    
    # Get cases missing daily check-ins
    now = datetime.utcnow()
    yesterday = now - timedelta(days=1)
    
    missing_checkins = []
    for case in high_risk_cases:
        if case.get('requires_daily_checkin'):
            last_checkin = db.db.high_risk_checkins.find_one(
                {"case_id": case['_id']},
                sort=[("check_in_date", -1)]
            )
            if not last_checkin or last_checkin['check_in_date'] < yesterday:
                missing_checkins.append(case)
    
    result_cases = []
    for c in high_risk_cases:
        student = db.db.users.find_one({"_id": c.get('student_id')})
        assigned_counselor = db.db.users.find_one({"_id": c.get('assigned_counselor_id')})
        result_cases.append({
            'case_id': str(c['_id']),
            'case_number': c.get('case_number'),
            'student_name': f"{student.get('first_name', '')} {student.get('last_name', '')}" if student else None,
            'risk_level': c.get('current_risk_level'),
            'assigned_counselor': f"{assigned_counselor.get('first_name', '')} {assigned_counselor.get('last_name', '')}" if assigned_counselor else None,
            'last_assessment': c['last_risk_assessment'].isoformat() if isinstance(c.get('last_risk_assessment'), datetime) else c.get('last_risk_assessment'),
            'requires_daily_checkin': c.get('requires_daily_checkin', False),
            'missing_checkin': c in missing_checkins
        })
    
    return jsonify({
        'high_risk_count': len(high_risk_cases),
        'critical_count': sum(1 for c in high_risk_cases if c.get('current_risk_level') == RiskLevel.CRITICAL.value),
        'active_escalations': len(escalations),
        'missing_daily_checkins': len(missing_checkins),
        'cases': result_cases,
        'active_escalations_list': [{
            'escalation_id': str(e['_id']),
            'case_id': str(e.get('case_id')),
            'crisis_level': e.get('crisis_level'),
            'description': e.get('description'),
            'created_at': e['created_at'].isoformat() if isinstance(e['created_at'], datetime) else e['created_at']
        } for e in escalations]
    }), 200


@high_risk_bp.route('/daily-updates-due', methods=['GET'])
@jwt_required()
def get_daily_updates_due():
    """Get cases due for daily updates (EPIC 7: 100% daily updates for red-flag clients)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    now = datetime.utcnow()
    yesterday = now - timedelta(days=1)
    
    # Find cases requiring daily check-in that haven't been checked in today
    cases_requiring_checkin = list(db.db.cases.find({"requires_daily_checkin": True}))
    
    overdue_cases = []
    for case in cases_requiring_checkin:
        last_checkin = db.db.high_risk_checkins.find_one(
            {"case_id": case['_id']},
            sort=[("check_in_date", -1)]
        )
        if not last_checkin or last_checkin['check_in_date'] < yesterday:
            overdue_cases.append(case)
    
    result_cases = []
    for c in overdue_cases:
        student = db.db.users.find_one({"_id": c.get('student_id')})
        assigned_counselor = db.db.users.find_one({"_id": c.get('assigned_counselor_id')})
        last_checkin = db.db.high_risk_checkins.find_one(
            {"case_id": c['_id']},
            sort=[("check_in_date", -1)]
        )
        result_cases.append({
            'case_id': str(c['_id']),
            'case_number': c.get('case_number'),
            'student_name': f"{student.get('first_name', '')} {student.get('last_name', '')}" if student else None,
            'assigned_counselor': f"{assigned_counselor.get('first_name', '')} {assigned_counselor.get('last_name', '')}" if assigned_counselor else None,
            'last_checkin': last_checkin['check_in_date'].isoformat() if last_checkin and isinstance(last_checkin['check_in_date'], datetime) else (last_checkin['check_in_date'] if last_checkin else None)
        })
    
    return jsonify({
        'overdue_count': len(overdue_cases),
        'cases': result_cases
    }), 200
