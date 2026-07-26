"""
CLIENT TRACKING MODULE
Manages three tracking systems:
1. New Client Intakes
2. Non-Counseling Clients (Check-ins)
3. Existing Clients for Counseling (Session Tracking)
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, UserRole
from utils import audit_log
from datetime import datetime
from bson import ObjectId
import uuid

client_tracking_bp = Blueprint('client_tracking', __name__, url_prefix='/api/client-tracking')


def generate_case_number():
    """Generate unique case number: CASE-YYYYMM-XXXX"""
    now = datetime.utcnow()
    year_month = now.strftime('%Y%m')
    random_suffix = str(uuid.uuid4().hex[:4]).upper()
    return f"CASE-{year_month}-{random_suffix}"


def get_user_from_token():
    """Get current user from JWT"""
    user_id = get_jwt_identity()
    user = db.db.users.find_one({"_id": ObjectId(user_id)})
    return user


# ==================== NEW CLIENT INTAKES ====================

@client_tracking_bp.route('/new-intakes', methods=['GET'])
@jwt_required()
def get_new_intakes():
    """Get new client intakes — pulls from actual intakes collection"""
    user = get_user_from_token()
    if user['role'] == UserRole.STUDENT:
        return jsonify({"error": "Access denied"}), 403

    page  = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)
    search = request.args.get('search', '')
    month  = request.args.get('month', '')
    status = request.args.get('status', '')

    mine = request.args.get('mine', 'false').lower() == 'true'

    query = {}
    if mine and user['role'] == UserRole.IC:
        query['counselor_id'] = user['_id']
    if search:
        query['$or'] = [
            {'responses.first_name': {'$regex': search, '$options': 'i'}},
            {'responses.last_name':  {'$regex': search, '$options': 'i'}},
            {'responses.email':      {'$regex': search, '$options': 'i'}},
            {'responses.student_id': {'$regex': search, '$options': 'i'}},
        ]
    if status:
        query['status'] = status
    if month:
        from datetime import datetime as dt
        start = dt.strptime(f"{month}-01", '%Y-%m-%d')
        end   = dt(start.year + 1 if start.month == 12 else start.year, start.month + 1 if start.month < 12 else 1, 1)
        query['created_at'] = {'$gte': start, '$lt': end}

    total   = db.db.intakes.count_documents(query)
    records = list(db.db.intakes.find(query)
        .sort('created_at', -1)
        .skip((page - 1) * limit)
        .limit(limit))

    # Enrich with student + counselor names
    student_ids   = [r['student_id']  for r in records if r.get('student_id')]
    counselor_ids = [r['counselor_id'] for r in records if r.get('counselor_id')]
    students   = {u['_id']: u for u in db.db.users.find({'_id': {'$in': student_ids}},  {'first_name':1,'last_name':1,'id_number':1,'course':1,'mhbot_username':1})}
    counselors = {u['_id']: u for u in db.db.users.find({'_id': {'$in': counselor_ids}}, {'first_name':1,'last_name':1,'role':1})}

    # Check which have submitted packets
    appt_ids = [r['appointment_id'] for r in records if r.get('appointment_id')]
    packets_submitted = set(
        str(p['appointment_id'])
        for p in db.db.intake_packets.find({'appointment_id': {'$in': appt_ids}}, {'appointment_id': 1})
    )

    # Look up case_id + assigned counselor per student
    _cases = list(db.db.cases.find(
        {'student_id': {'$in': student_ids}},
        {'_id': 1, 'student_id': 1, 'assigned_counselor_id': 1, 'endorsed_to_role': 1}
    ))
    case_map = {str(c['student_id']): str(c['_id']) for c in _cases}
    _referred_ids = [c['assigned_counselor_id'] for c in _cases if c.get('assigned_counselor_id')]
    _referred_users = {u['_id']: u for u in db.db.users.find(
        {'_id': {'$in': _referred_ids}},
        {'first_name': 1, 'last_name': 1, 'name': 1, 'role': 1}
    )}
    _referred_map = {
        str(c['student_id']): {
            'name': (lambda u: f"{u.get('first_name','')} {u.get('last_name','')}".strip() or u.get('name',''))(
                _referred_users[c['assigned_counselor_id']]
            ) if c.get('assigned_counselor_id') and c['assigned_counselor_id'] in _referred_users else None,
            'role': _referred_users[c['assigned_counselor_id']].get('role') if c.get('assigned_counselor_id') and c['assigned_counselor_id'] in _referred_users else c.get('endorsed_to_role'),
        }
        for c in _cases
    }

    data = []
    for r in records:
        s = students.get(r.get('student_id'))
        c = counselors.get(r.get('counselor_id'))
        s_first = s.get('first_name','') if s else r.get('responses',{}).get('first_name','')
        s_last  = s.get('last_name', '') if s else r.get('responses',{}).get('last_name', '')
        c_first = c.get('first_name','') if c else ''
        c_last  = c.get('last_name', '') if c else ''
        data.append({
            '_id':                    str(r['_id']),
            'client_name':            f"{s_last.upper()}, {s_first}" if s_last else (s_first or '—'),
            'client_id_number':       s.get('id_number','') if s else r.get('responses',{}).get('student_id',''),
            'college_unit':           s.get('course','')    if s else r.get('responses',{}).get('college',''),
            'program':                r.get('responses',{}).get('program',''),
            'service_requested':      r.get('responses',{}).get('service_requested','personal_counseling'),
            'source':                 r.get('source','online'),
            'intake_counselor_name':  f"{c_last.upper()}, {c_first}" if c_last else '—',
            'action_taken':           r.get('triage_decision',''),
            'status':                 r.get('status','PENDING'),
            'created_date':           r.get('created_at','').isoformat() if hasattr(r.get('created_at',''), 'isoformat') else str(r.get('created_at','')),
            'appointment_id':          str(r['appointment_id']) if r.get('appointment_id') else None,
            'intake_packet_submitted': str(r.get('appointment_id','')) in packets_submitted,
            'mhbot_username': s.get('mhbot_username') if s else None,
            'case_id': case_map.get(str(r.get('student_id', '')), None),
            'referred_to_name': _referred_map.get(str(r.get('student_id', '')), {}).get('name'),
            'referred_to_role': _referred_map.get(str(r.get('student_id', '')), {}).get('role'),
        })

    return jsonify({
        'data':  data,
        'total': total,
        'page':  page,
        'pages': (total + limit - 1) // limit,
    }), 200


@client_tracking_bp.route('/new-intakes/counts', methods=['GET'])
@jwt_required()
def get_new_intakes_counts():
    """Return status counts for new intakes in a single query."""
    user = get_user_from_token()
    if user['role'] == UserRole.STUDENT:
        return jsonify({"error": "Access denied"}), 403

    search = request.args.get('search', '')
    month  = request.args.get('month', '')
    mine   = request.args.get('mine', 'false').lower() == 'true'

    base_query = {}
    if mine and user['role'] == UserRole.IC:
        base_query['counselor_id'] = user['_id']
    if search:
        base_query['$or'] = [
            {'responses.first_name': {'$regex': search, '$options': 'i'}},
            {'responses.last_name':  {'$regex': search, '$options': 'i'}},
            {'responses.email':      {'$regex': search, '$options': 'i'}},
            {'responses.student_id': {'$regex': search, '$options': 'i'}},
        ]
    if month:
        from datetime import datetime as dt
        start = dt.strptime(f"{month}-01", '%Y-%m-%d')
        end   = dt(start.year + 1 if start.month == 12 else start.year, start.month + 1 if start.month < 12 else 1, 1)
        base_query['created_at'] = {'$gte': start, '$lt': end}

    pipeline = [
        {'$match': base_query},
        {'$group': {'_id': '$status', 'count': {'$sum': 1}}},
    ]
    rows = list(db.db.intakes.aggregate(pipeline))
    by_status = {r['_id']: r['count'] for r in rows}

    total      = sum(by_status.values())
    new_count  = by_status.get('NEW', 0)
    in_progress = by_status.get('PENDING', 0) + by_status.get('IN_PROGRESS', 0)
    completed  = by_status.get('COMPLETED', 0)

    return jsonify({
        'total': total,
        'new': new_count,
        'inProgress': in_progress,
        'completed': completed,
    }), 200


@client_tracking_bp.route('/new-intakes', methods=['POST'])
@jwt_required()
def create_new_intake():
    """Create new client intake record"""
    user = get_user_from_token()
    
    # Only IC, DPO, and STAFF can create
    if user['role'] not in [UserRole.IC, UserRole.DPO, UserRole.STAFF]:
        return jsonify({"error": "Only IC, DPO, or STAFF can create intakes"}), 403
    
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['client_name', 'client_id_number', 'college_unit', 'program', 'service_requested', 'source']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400
    
    # Create intake record
    intake = {
        'client_name': data['client_name'],
        'client_id_number': data['client_id_number'],
        'college_unit': data.get('college_unit'),
        'program': data.get('program'),
        'service_requested': data.get('service_requested'),
        'source': data.get('source'),  # Self-referred, Walk-in, etc.
        'transaction_type': data.get('transaction_type', 'NEW_INTAKE'),
        'intake_counselor_id': ObjectId(user['_id']),
        'intake_counselor_name': user['name'],
        'action_taken': data.get('action_taken', ''),
        'status': data.get('status', 'NEW'),
        'created_date': datetime.utcnow(),
        'updated_date': datetime.utcnow(),
    }
    
    result = db.db.new_client_intakes.insert_one(intake)
    intake['_id'] = str(intake['_id'])
    
    # Audit log
    audit_log(
        user_id=user['_id'],
        action='CREATE_NEW_INTAKE',
        entity_type='NewClientIntake',
        entity_id=result.inserted_id,
        old_values={},
        new_values=intake
    )
    
    return jsonify({
        "message": "New client intake created",
        "intake": intake
    }), 201


@client_tracking_bp.route('/new-intakes/<intake_id>', methods=['PUT'])
@jwt_required()
def update_new_intake(intake_id):
    """Update new client intake"""
    user = get_user_from_token()
    data = request.get_json()
    
    try:
        intake_obj_id = ObjectId(intake_id)
    except:
        return jsonify({"error": "Invalid intake ID"}), 400
    
    intake = db.db.new_client_intakes.find_one({"_id": intake_obj_id})
    if not intake:
        return jsonify({"error": "Intake not found"}), 404
    
    # Store old values for audit
    old_values = intake.copy()
    
    # Update fields
    update_fields = ['client_name', 'college_unit', 'program', 'service_requested', 
                     'action_taken', 'status']
    for field in update_fields:
        if field in data:
            intake[field] = data[field]
    
    intake['updated_date'] = datetime.utcnow()
    
    db.db.new_client_intakes.update_one({"_id": intake_obj_id}, {"$set": intake})
    
    # Audit log
    audit_log(
        user_id=user['_id'],
        action='UPDATE_NEW_INTAKE',
        entity_type='NewClientIntake',
        entity_id=intake_obj_id,
        old_values=old_values,
        new_values=intake
    )
    
    intake['_id'] = str(intake['_id'])
    return jsonify({"message": "Intake updated", "intake": intake}), 200


# ==================== NON-COUNSELING CLIENTS (CHECK-INS) ====================

@client_tracking_bp.route('/check-ins', methods=['GET'])
@jwt_required()
def get_check_in_clients():
    """Get non-counseling clients (check-in only)"""
    user = get_user_from_token()
    
    if user['role'] == UserRole.STUDENT:
        return jsonify({"error": "Access denied"}), 403
    
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)
    search = request.args.get('search', '')
    month = request.args.get('month', '')
    concern_filter = request.args.get('concern', '')
    status_filter = request.args.get('status', '')
    
    query = {}
    
    if search:
        query['$or'] = [
            {'client_name': {'$regex': search, '$options': 'i'}},
            {'client_id_number': {'$regex': search, '$options': 'i'}},
        ]
    
    if concern_filter:
        query['concern'] = concern_filter
    
    if status_filter:
        query['status'] = status_filter
    
    if month:
        from datetime import datetime as dt
        start = dt.strptime(f"{month}-01", '%Y-%m-%d')
        end = dt(start.year, start.month + 1 if start.month < 12 else 1, 1)
        query['created_date'] = {'$gte': start, '$lt': end}
    
    total = db.db.non_counseling_clients.count_documents(query)
    clients = list(db.db.non_counseling_clients.find(query)
        .sort('created_date', -1)
        .skip((page - 1) * limit)
        .limit(limit))
    
    for client in clients:
        client['_id'] = str(client['_id'])
    
    return jsonify({
        'data': clients,
        'total': total,
        'page': page,
        'pages': (total + limit - 1) // limit
    }), 200


@client_tracking_bp.route('/check-ins', methods=['POST'])
@jwt_required()
def create_check_in_client():
    """Create check-in only client record"""
    user = get_user_from_token()
    
    if user['role'] not in [UserRole.IC, UserRole.DPO, UserRole.STAFF, UserRole.COUNSELOR]:
        return jsonify({"error": "Not authorized"}), 403
    
    data = request.get_json()
    
    required_fields = ['client_name', 'client_id_number', 'concern', 'counselor_id']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400
    
    check_in = {
        'case_number': generate_case_number(),
        'client_name': data['client_name'],
        'client_id_number': data['client_id_number'],
        'concern': data['concern'],
        'counselor_id': ObjectId(data['counselor_id']),
        'status': data.get('status', 'Active'),
        'created_date': datetime.utcnow(),
        'updated_date': datetime.utcnow(),
    }
    
    result = db.db.non_counseling_clients.insert_one(check_in)
    check_in['_id'] = str(check_in['_id'])
    
    audit_log(
        user_id=user['_id'],
        action='CREATE_CHECK_IN_CLIENT',
        entity_type='NonCounselingClient',
        entity_id=result.inserted_id,
        old_values={},
        new_values=check_in
    )
    
    return jsonify({
        "message": "Check-in client created",
        "client": check_in
    }), 201


@client_tracking_bp.route('/check-ins/<client_id>', methods=['PUT'])
@jwt_required()
def update_check_in_client(client_id):
    """Update check-in client"""
    user = get_user_from_token()
    data = request.get_json()
    
    try:
        client_obj_id = ObjectId(client_id)
    except:
        return jsonify({"error": "Invalid client ID"}), 400
    
    client = db.db.non_counseling_clients.find_one({"_id": client_obj_id})
    if not client:
        return jsonify({"error": "Client not found"}), 404
    
    old_values = client.copy()
    
    update_fields = ['client_name', 'concern', 'status', 'check_in_frequency_days']
    for field in update_fields:
        if field in data:
            client[field] = data[field]

    client['updated_date'] = datetime.utcnow()

    db.db.non_counseling_clients.update_one({"_id": client_obj_id}, {"$set": client})
    
    audit_log(
        user_id=user['_id'],
        action='UPDATE_CHECK_IN_CLIENT',
        entity_type='NonCounselingClient',
        entity_id=client_obj_id,
        old_values=old_values,
        new_values=client
    )
    
    client['_id'] = str(client['_id'])
    return jsonify({"message": "Client updated", "client": client}), 200


# ==================== COUNSELING CASES ====================

@client_tracking_bp.route('/counseling-cases', methods=['GET'])
@jwt_required()
def get_counseling_cases():
    """Get existing clients for counseling with session tracking"""
    user = get_user_from_token()
    
    if user['role'] == UserRole.STUDENT:
        return jsonify({"error": "Access denied"}), 403
    
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)
    search = request.args.get('search', '')
    month = request.args.get('month', '')
    status_filter = request.args.get('status', '')
    
    query = {}
    
    if search:
        query['$or'] = [
            {'client_name': {'$regex': search, '$options': 'i'}},
            {'client_id_number': {'$regex': search, '$options': 'i'}},
            {'case_number': {'$regex': search, '$options': 'i'}},
        ]
    
    if status_filter:
        query['status'] = status_filter
    
    if month:
        from datetime import datetime as dt
        start = dt.strptime(f"{month}-01", '%Y-%m-%d')
        end = dt(start.year, start.month + 1 if start.month < 12 else 1, 1)
        query['created_date'] = {'$gte': start, '$lt': end}
    
    total = db.db.counseling_cases.count_documents(query)
    cases = list(db.db.counseling_cases.find(query)
        .sort('created_date', -1)
        .skip((page - 1) * limit)
        .limit(limit))
    
    for case in cases:
        case['_id'] = str(case['_id'])
    
    return jsonify({
        'data': cases,
        'total': total,
        'page': page,
        'pages': (total + limit - 1) // limit
    }), 200


@client_tracking_bp.route('/counseling-cases', methods=['POST'])
@jwt_required()
def create_counseling_case():
    """Create counseling case with session tracking"""
    user = get_user_from_token()
    
    if user['role'] not in [UserRole.IC, UserRole.DPO, UserRole.COUNSELOR, UserRole.PSYCHOLOGIST]:
        return jsonify({"error": "Not authorized"}), 403
    
    data = request.get_json()
    
    required_fields = ['client_name', 'client_id_number', 'counselor_id', 'target_sessions']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400
    
    counseling_case = {
        'case_number': generate_case_number(),
        'client_name': data['client_name'],
        'client_id_number': data['client_id_number'],
        'counselor_id': ObjectId(data['counselor_id']),
        'target_sessions': int(data['target_sessions']),
        'current_sessions': int(data.get('current_sessions', 0)),
        'status': data.get('status', 'Active'),
        'created_date': datetime.utcnow(),
        'updated_date': datetime.utcnow(),
    }
    
    result = db.db.counseling_cases.insert_one(counseling_case)
    counseling_case['_id'] = str(counseling_case['_id'])
    
    audit_log(
        user_id=user['_id'],
        action='CREATE_COUNSELING_CASE',
        entity_type='CounselingCase',
        entity_id=result.inserted_id,
        old_values={},
        new_values=counseling_case
    )
    
    return jsonify({
        "message": "Counseling case created",
        "case": counseling_case
    }), 201


@client_tracking_bp.route('/counseling-cases/<case_id>', methods=['PUT'])
@jwt_required()
def update_counseling_case(case_id):
    """Update counseling case"""
    user = get_user_from_token()
    data = request.get_json()
    
    try:
        case_obj_id = ObjectId(case_id)
    except:
        return jsonify({"error": "Invalid case ID"}), 400
    
    case = db.db.counseling_cases.find_one({"_id": case_obj_id})
    if not case:
        return jsonify({"error": "Case not found"}), 404
    
    old_values = case.copy()
    
    update_fields = ['client_name', 'target_sessions', 'current_sessions', 'status']
    for field in update_fields:
        if field in data:
            if field in ['target_sessions', 'current_sessions']:
                case[field] = int(data[field])
            else:
                case[field] = data[field]
    
    case['updated_date'] = datetime.utcnow()
    
    db.db.counseling_cases.update_one({"_id": case_obj_id}, {"$set": case})
    
    audit_log(
        user_id=user['_id'],
        action='UPDATE_COUNSELING_CASE',
        entity_type='CounselingCase',
        entity_id=case_obj_id,
        old_values=old_values,
        new_values=case
    )
    
    case['_id'] = str(case['_id'])
    return jsonify({"message": "Case updated", "case": case}), 200


# ==================== MONTHLY EXPORT ====================

@client_tracking_bp.route('/export/<module_type>', methods=['GET'])
@jwt_required()
def export_monthly_data(module_type):
    """Export monthly data as JSON for Excel conversion"""
    user = get_user_from_token()
    
    if user['role'] == UserRole.STUDENT:
        return jsonify({"error": "Access denied"}), 403
    
    month = request.args.get('month', '')
    if not month:
        return jsonify({"error": "Month parameter required (YYYY-MM)"}), 400
    
    from datetime import datetime as dt
    try:
        start = dt.strptime(f"{month}-01", '%Y-%m-%d')
        end = dt(start.year, start.month + 1 if start.month < 12 else 1, 1)
    except:
        return jsonify({"error": "Invalid month format (use YYYY-MM)"}), 400
    
    # Map module type to collection
    if module_type == 'new-intakes':
        query = {'created_date': {'$gte': start, '$lt': end}}
        data = list(db.db.new_client_intakes.find(query).sort('created_date', 1))
    elif module_type == 'check-ins':
        query = {'created_date': {'$gte': start, '$lt': end}}
        data = list(db.db.non_counseling_clients.find(query).sort('created_date', 1))
    elif module_type == 'counseling-cases':
        query = {'created_date': {'$gte': start, '$lt': end}}
        data = list(db.db.counseling_cases.find(query).sort('created_date', 1))
    else:
        return jsonify({"error": "Invalid module type"}), 400
    
    # Convert ObjectIds to strings
    for record in data:
        record['_id'] = str(record['_id'])
        if 'created_date' in record:
            record['created_date'] = record['created_date'].isoformat()
        if 'updated_date' in record:
            record['updated_date'] = record['updated_date'].isoformat()
    
    return jsonify({
        'module': module_type,
        'month': month,
        'record_count': len(data),
        'data': data
    }), 200
