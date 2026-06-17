"""
EPIC 6: ONGOING COUNSELING MODULE
Blueprint for session documentation and progress tracking
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from models import db, AppointmentStatus, RiskLevel, PermissionType
from utils import audit_log, user_has_permission
from datetime import datetime

counseling_bp = Blueprint('counseling', __name__, url_prefix='/api/counseling')


@counseling_bp.route('/case/<case_id>/session-note', methods=['POST'])
@jwt_required()
def create_session_note(case_id):
    """Create session note (EPIC 6: Session Note Template Creation)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_NOTES.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        cid = ObjectId(case_id)
        case = db.db.cases.find_one({"_id": cid})
    except:
        case = db.db.cases.find_one({"_id": case_id})
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    data = request.get_json()
    
    if not data.get('session_date') or not data.get('session_type'):
        return jsonify({'error': 'session_date and session_type are required'}), 400
    
    try:
        session_date = datetime.fromisoformat(data['session_date'])
    except ValueError:
        return jsonify({'error': 'Invalid datetime format'}), 400
    
    note_format = data.get('note_format', 'freeform')
    note = {
        "case_id": case['_id'],
        "appointment_id": ObjectId(data['appointment_id']) if data.get('appointment_id') else None,
        "counselor_id": ObjectId(user_id) if isinstance(user_id, str) else user_id,
        "session_date": session_date,
        "session_type": data['session_type'],
        "note_format": note_format,
        # SOAP fields (populated when note_format == 'SOAP')
        "soap": {
            "subjective": data.get('soap_subjective', ''),
            "objective":  data.get('soap_objective', ''),
            "assessment": data.get('soap_assessment', ''),
            "plan":       data.get('soap_plan', ''),
        } if note_format == 'SOAP' else None,
        # Freeform fields
        "topics_discussed": data.get('topics_discussed'),
        "interventions": data.get('interventions'),
        "client_response": data.get('client_response'),
        "homework_assigned": data.get('homework_assigned'),
        "mood_rating": data.get('mood_rating'),
        "symptom_severity": data.get('symptom_severity'),
        "progress_on_goals": data.get('progress_on_goals'),
        "risk_flagged": data.get('risk_flagged', False),
        "risk_notes": data.get('risk_notes'),
        "mandatory_submitted": True,
        "supervisor_approved": False,
        "created_at": datetime.utcnow()
    }
    
    result = db.db.session_notes.insert_one(note)
    
    # Update case risk if flagged (EPIC 6: High-Risk Flagging on Counselor Dashboard)
    if note['risk_flagged']:
        db.db.cases.update_one(
            {"_id": case['_id']},
            {"$set": {"current_risk_level": RiskLevel.YELLOW.value}}
        )
    
    audit_log(db.db, 'session_note', 'create', entity_id=str(result.inserted_id), new_values={
        'case_id': str(case['_id']),
        'session_date': data['session_date']
    })
    
    return jsonify({
        'note_id': str(result.inserted_id),
        'case_id': str(case['_id']),
        'session_date': session_date.isoformat(),
        'mandatory_submitted': True
    }), 201


@counseling_bp.route('/session-note/<note_id>', methods=['GET'])
@jwt_required()
def get_session_note(note_id):
    """Get session note details"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_NOTES.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        nid = ObjectId(note_id)
        note = db.db.session_notes.find_one({"_id": nid})
    except:
        note = db.db.session_notes.find_one({"_id": note_id})
    
    if not note:
        return jsonify({'error': 'Session note not found'}), 404
    
    audit_log(db.db, 'session_note', 'view', entity_id=str(note['_id']))
    
    counselor = db.db.users.find_one({"_id": note.get('counselor_id')})
    
    return jsonify({
        'note_id': str(note['_id']),
        'case_id': str(note.get('case_id')),
        'counselor': f"{counselor.get('first_name', '')} {counselor.get('last_name', '')}" if counselor else None,
        'session_date': note['session_date'].isoformat() if isinstance(note['session_date'], datetime) else note['session_date'],
        'session_type': note.get('session_type'),
        'topics_discussed': note.get('topics_discussed'),
        'interventions': note.get('interventions'),
        'client_response': note.get('client_response'),
        'homework_assigned': note.get('homework_assigned'),
        'mood_rating': note.get('mood_rating'),
        'symptom_severity': note.get('symptom_severity'),
        'progress_on_goals': note.get('progress_on_goals'),
        'risk_flagged': note.get('risk_flagged'),
        'risk_notes': note.get('risk_notes'),
        'created_at': note['created_at'].isoformat() if isinstance(note['created_at'], datetime) else note['created_at']
    }), 200


@counseling_bp.route('/session-note/<note_id>', methods=['PATCH'])
@jwt_required()
def update_session_note(note_id):
    """Update session note"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_NOTES.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        nid = ObjectId(note_id)
        note = db.db.session_notes.find_one({"_id": nid})
    except:
        note = db.db.session_notes.find_one({"_id": note_id})
    
    if not note:
        return jsonify({'error': 'Session note not found'}), 404
    
    data = request.get_json()
    
    # Update fields
    update_data = {"updated_at": datetime.utcnow()}
    
    if 'topics_discussed' in data:
        update_data['topics_discussed'] = data['topics_discussed']
    if 'interventions' in data:
        update_data['interventions'] = data['interventions']
    if 'client_response' in data:
        update_data['client_response'] = data['client_response']
    if 'homework_assigned' in data:
        update_data['homework_assigned'] = data['homework_assigned']
    if 'mood_rating' in data:
        update_data['mood_rating'] = data['mood_rating']
    if 'symptom_severity' in data:
        update_data['symptom_severity'] = data['symptom_severity']
    if 'progress_on_goals' in data:
        update_data['progress_on_goals'] = data['progress_on_goals']
    if 'risk_flagged' in data:
        update_data['risk_flagged'] = data['risk_flagged']
    if 'risk_notes' in data:
        update_data['risk_notes'] = data['risk_notes']
    
    db.db.session_notes.update_one(
        {"_id": note['_id']},
        {"$set": update_data}
    )
    
    audit_log(db.db, 'session_note', 'update', entity_id=str(note['_id']), new_values=data)

    return jsonify({'message': 'Session note updated', 'note_id': str(note['_id'])}), 200


@counseling_bp.route('/session-note/<note_id>/approve', methods=['PATCH'])
@jwt_required()
def approve_session_note(note_id):
    """Supervisor approves or rejects a session note."""
    user_id = get_jwt_identity()

    user = db.db.users.find_one({'_id': ObjectId(user_id) if isinstance(user_id, str) else user_id})
    if not user:
        return jsonify({'error': 'User not found'}), 404
    allowed_roles = {'PSYCHOLOGIST', 'ADMIN'}
    if user.get('role') not in allowed_roles:
        return jsonify({'error': 'Only supervisors (PSYCHOLOGIST/ADMIN) can approve notes'}), 403

    try:
        nid = ObjectId(note_id)
        note = db.db.session_notes.find_one({'_id': nid})
    except Exception:
        note = db.db.session_notes.find_one({'_id': note_id})

    if not note:
        return jsonify({'error': 'Session note not found'}), 404

    data = request.get_json() or {}
    action = data.get('action')  # 'approve' | 'reject'
    if action not in ('approve', 'reject'):
        return jsonify({'error': "action must be 'approve' or 'reject'"}), 400

    approved = action == 'approve'
    update_fields = {
        'supervisor_approved': approved,
        'supervisor_id': user_id,
        'supervisor_name': f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
        'supervisor_action_at': datetime.utcnow(),
        'supervisor_comment': data.get('comment', ''),
    }
    db.db.session_notes.update_one({'_id': note['_id']}, {'$set': update_fields})
    audit_log(db.db, 'session_note', action, entity_id=str(note['_id']),
              new_values={'supervisor': user_id, 'comment': data.get('comment', '')})

    return jsonify({'message': f'Note {action}d', 'note_id': note_id, 'approved': approved}), 200


@counseling_bp.route('/case/<case_id>/session-history', methods=['GET'])
@jwt_required()
def get_case_session_history(case_id):
    """Get all session notes for a case (EPIC 6: Mandatory Post-Session Note Rule)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_NOTES.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        cid = ObjectId(case_id)
        case = db.db.cases.find_one({"_id": cid})
    except:
        case = db.db.cases.find_one({"_id": case_id})
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    notes = list(db.db.session_notes.find({"case_id": case['_id']}).sort("session_date", -1))

    result = []
    for n in notes:
        # Resolve counselor name
        counselor_name = ''
        if n.get('counselor_id'):
            c = db.db.users.find_one({'_id': n['counselor_id']}, {'name': 1})
            if c:
                counselor_name = c.get('name', '')

        result.append({
            'note_id': str(n['_id']),
            'session_date': n['session_date'].isoformat() if isinstance(n.get('session_date'), datetime) else n.get('session_date'),
            'session_type': n.get('session_type', ''),
            'note_content': n.get('note_content', ''),
            'note_format': n.get('note_format', 'freeform'),
            'soap': n.get('soap'),
            'topics_discussed': n.get('topics_discussed', ''),
            'interventions': n.get('interventions', ''),
            'client_response': n.get('client_response', ''),
            'homework_assigned': n.get('homework_assigned', ''),
            'progress_on_goals': n.get('progress_on_goals', ''),
            'mood_rating': n.get('mood_rating'),
            'symptom_severity': n.get('symptom_severity', ''),
            'risk_flagged': n.get('risk_flagged', False),
            'risk_notes': n.get('risk_notes', ''),
            'risk_level': n.get('risk_level', ''),
            'counselor': counselor_name,
            'supervisor_approved': n.get('supervisor_approved', False),
            'supervisor_name': n.get('supervisor_name', ''),
            'supervisor_comment': n.get('supervisor_comment', ''),
            'supervisor_action_at': n['supervisor_action_at'].isoformat() if isinstance(n.get('supervisor_action_at'), datetime) else n.get('supervisor_action_at'),
        })
    return jsonify({'sessions': result, 'total': len(result)}), 200


# ---------------------------------------------------------------------------
# Demo UI route
# ---------------------------------------------------------------------------
@counseling_bp.route('/login-page', methods=['GET'])
def login_page():
    """Serve a basic login page mimicking the style from the HTML snippet.

    This endpoint returns an HTML string with inline CSS so that only Python is
    used in this file (no new templates, CSS or JavaScript files).
    """
    html = """<!doctype html>
<html lang=\"en\">
<head>
  <meta charset=\"utf-8\">
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">
  <title>Login</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f0f0f0; margin:0; }
    .login-container { max-width: 400px; margin: 80px auto; padding: 20px;
      background: #fff; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
    .login-container h2 { text-align: center; color: #2c3e50; }
    .form-group { margin-bottom: 15px; }
    .form-group label { display: block; margin-bottom: 5px; }
    .form-group input { width: 100%; padding: 8px; box-sizing: border-box; }
    .btn { width: 100%; padding: 10px; background: #3498db; color: #fff;
      border: none; cursor: pointer; }
    .btn:hover { background: #2980b9; }
  </style>
</head>
<body>
  <div class=\"login-container\">
    <h2>Let's Get Started</h2>
    <form method=\"post\" action=\"/api/auth/login\">
      <div class=\"form-group\">
        <label>Username / Email</label>
        <input type=\"text\" name=\"username\" required />
      </div>
      <div class=\"form-group\">
        <label>Password</label>
        <input type=\"password\" name=\"password\" required />
      </div>
      <button class=\"btn\" type=\"submit\">Sign In</button>
    </form>
  </div>
</body>
</html>"""
    return html

    
    result_notes = []
    for n in notes:
        counselor = db.db.users.find_one({"_id": n.get('counselor_id')})
        result_notes.append({
            'note_id': str(n['_id']),
            'session_date': n['session_date'].isoformat() if isinstance(n['session_date'], datetime) else n['session_date'],
            'session_type': n.get('session_type'),
            'mood_rating': n.get('mood_rating'),
            'symptom_severity': n.get('symptom_severity'),
            'risk_flagged': n.get('risk_flagged'),
            'counselor': f"{counselor.get('first_name', '')} {counselor.get('last_name', '')}" if counselor else None
        })
    
    return jsonify({
        'case_id': str(case['_id']),
        'total_sessions': len(notes),
        'sessions': result_notes
    }), 200


@counseling_bp.route('/progress-metric', methods=['POST'])
@jwt_required()
def add_progress_metric():
    """Add progress tracking metric (EPIC 6: Progress Tracking Chart)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    data = request.get_json()
    
    if not data.get('case_id') or not data.get('metric_name'):
        return jsonify({'error': 'case_id and metric_name are required'}), 400
    
    try:
        cid = ObjectId(data['case_id'])
        case = db.db.cases.find_one({"_id": cid})
    except:
        case = db.db.cases.find_one({"_id": data['case_id']})
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    metric = {
        "case_id": case['_id'],
        "metric_name": data['metric_name'],
        "baseline_value": data.get('baseline_value'),
        "current_value": data.get('current_value'),
        "target_value": data.get('target_value'),
        "unit": data.get('unit'),
        "recorded_at": datetime.utcnow()
    }
    
    result = db.db.progress_metrics.insert_one(metric)
    
    audit_log(db.db, 'progress_metric', 'create', entity_id=str(result.inserted_id), new_values={
        'metric_name': data['metric_name']
    })
    
    return jsonify({
        'metric_id': str(result.inserted_id),
        'metric_name': data['metric_name'],
        'baseline_value': data.get('baseline_value'),
        'current_value': data.get('current_value')
    }), 201


@counseling_bp.route('/progress-metric/<metric_id>', methods=['PATCH'])
@jwt_required()
def update_progress_metric(metric_id):
    """Update progress metric"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        mid = ObjectId(metric_id)
        metric = db.db.progress_metrics.find_one({"_id": mid})
    except:
        metric = db.db.progress_metrics.find_one({"_id": metric_id})
    
    if not metric:
        return jsonify({'error': 'Progress metric not found'}), 404
    
    data = request.get_json()
    
    update_data = {}
    if 'current_value' in data:
        update_data['current_value'] = data['current_value']
    if 'target_value' in data:
        update_data['target_value'] = data['target_value']
    
    update_data['updated_at'] = datetime.utcnow()
    
    db.db.progress_metrics.update_one(
        {"_id": metric['_id']},
        {"$set": update_data}
    )
    
    audit_log(db.db, 'progress_metric', 'update', entity_id=str(metric['_id']), new_values=data)
    
    return jsonify({
        'message': 'Progress metric updated',
        'metric_id': str(metric['_id']),
        'current_value': data.get('current_value', metric.get('current_value')),
        'target_value': data.get('target_value', metric.get('target_value'))
    }), 200


@counseling_bp.route('/case/<case_id>/progress', methods=['GET'])
@jwt_required()
def get_case_progress(case_id):
    """Get progress tracking for a case (EPIC 6: Progress Tracking Chart)"""
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
    
    metrics = list(db.db.progress_metrics.find({"case_id": case['_id']}).sort("recorded_at", -1))
    
    result_metrics = []
    for m in metrics:
        baseline = m.get('baseline_value')
        current = m.get('current_value')
        target = m.get('target_value')
        
        progress_pct = None
        if baseline is not None and target is not None and current is not None:
            progress_pct = ((current - baseline) / (target - baseline) * 100) if (target - baseline) != 0 else 0
        
        result_metrics.append({
            'metric_id': str(m['_id']),
            'metric_name': m.get('metric_name'),
            'baseline_value': baseline,
            'current_value': current,
            'target_value': target,
            'unit': m.get('unit'),
            'progress_percentage': progress_pct,
            'recorded_at': m['recorded_at'].isoformat() if isinstance(m['recorded_at'], datetime) else m['recorded_at']
        })
    
    return jsonify({
        'case_id': str(case['_id']),
        'progress_metrics': result_metrics
    }), 200


@counseling_bp.route('/high-risk-dashboard', methods=['GET'])
@jwt_required()
def get_counselor_high_risk_dashboard():
    """Get high-risk clients for counselor dashboard (EPIC 6: High-Risk Flagging on Counselor Dashboard)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_RISK_DASHBOARD.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        uid = ObjectId(user_id)
        high_risk_cases = list(db.db.cases.find({
            "assigned_counselor_id": uid,
            "current_risk_level": {"$in": [RiskLevel.RED.value, RiskLevel.CRITICAL.value]}
        }))
    except:
        high_risk_cases = list(db.db.cases.find({
            "assigned_counselor_id": user_id,
            "current_risk_level": {"$in": [RiskLevel.RED.value, RiskLevel.CRITICAL.value]}
        }))
    
    case_ids = [c['_id'] for c in high_risk_cases]
    risk_notes = list(db.db.session_notes.find({
        "case_id": {"$in": case_ids},
        "risk_flagged": True
    }).sort("session_date", -1))
    
    result_cases = []
    for c in high_risk_cases:
        student = db.db.users.find_one({"_id": c.get('student_id')})
        last_session = next((n['session_date'].isoformat() if isinstance(n['session_date'], datetime) else n['session_date'] 
                            for n in risk_notes if n['case_id'] == c['_id']), None)
        result_cases.append({
            'case_id': str(c['_id']),
            'case_number': c.get('case_number'),
            'student_name': f"{student.get('first_name', '')} {student.get('last_name', '')}" if student else None,
            'risk_level': c.get('current_risk_level'),
            'last_session': last_session,
            'requires_daily_checkin': c.get('requires_daily_checkin', False)
        })
    
    return jsonify({
        'high_risk_count': len(high_risk_cases),
        'flagged_sessions': len(risk_notes),
        'cases': result_cases
    }), 200


@counseling_bp.route('/weekly-review', methods=['GET'])
@jwt_required()
def get_weekly_psychologist_review():
    """Get weekly review data for psychologist (EPIC 6: Weekly Psychologist Review Panel)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_RISK_DASHBOARD.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    # Get all high-risk cases with recent flagged sessions
    high_risk_cases = list(db.db.cases.find({
        "current_risk_level": {"$in": [RiskLevel.RED.value, RiskLevel.CRITICAL.value]}
    }))
    
    case_ids = [c['_id'] for c in high_risk_cases]
    
    flagged_sessions = list(db.db.session_notes.find({
        "case_id": {"$in": case_ids},
        "risk_flagged": True
    }).sort("session_date", -1).limit(20))
    
    result_sessions = []
    for n in flagged_sessions:
        case = db.db.cases.find_one({"_id": n.get('case_id')})
        student = db.db.users.find_one({"_id": case.get('student_id')}) if case else None
        counselor = db.db.users.find_one({"_id": n.get('counselor_id')})
        
        result_sessions.append({
            'note_id': str(n['_id']),
            'case_id': str(n.get('case_id')),
            'student_name': f"{student.get('first_name', '')} {student.get('last_name', '')}" if student else None,
            'session_date': n['session_date'].isoformat() if isinstance(n['session_date'], datetime) else n['session_date'],
            'risk_notes': n.get('risk_notes'),
            'counselor': f"{counselor.get('first_name', '')} {counselor.get('last_name', '')}" if counselor else None
        })
    
    return jsonify({
        'total_high_risk_cases': len(high_risk_cases),
        'flagged_sessions_this_week': len(flagged_sessions),
        'sessions_requiring_review': result_sessions
    }), 200
