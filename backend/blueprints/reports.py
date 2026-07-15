"""
CPS Reports Blueprint
Exportable spreadsheet data matching the three CPS tracking templates:
  1. New Clients  (appointments + intakes → all service requests)
  2. Existing Clients for Counseling  (active counseling cases)
  3. Non-counseling Clients / Check-ins
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime
from models import db
from utils import audit_log

reports_bp = Blueprint('reports', __name__, url_prefix='/api/reports')


def _admin_or_dpo(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        from flask_jwt_extended import get_jwt
        role = get_jwt().get('role', '')
        if role not in ('ADMIN', 'DPO'):
            return jsonify({'error': 'Only ADMIN or DPO can export reports'}), 403
        return f(*args, **kwargs)
    return decorated


# ─── helpers ──────────────────────────────────────────────────────────────────

def _s(v):
    """Safe string conversion for any MongoDB value."""
    if v is None:
        return ''
    if isinstance(v, ObjectId):
        return str(v)
    if isinstance(v, datetime):
        return v.strftime('%Y-%m-%d %H:%M')
    return str(v)


def _name(user):
    if not user:
        return ''
    return f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()


def _date_range(month_str):
    """Return (start, end) datetimes for a YYYY-MM string, or (None, None)."""
    if not month_str:
        return None, None
    try:
        start = datetime.strptime(f"{month_str}-01", '%Y-%m-%d')
        y, m = start.year, start.month
        end = datetime(y + (1 if m == 12 else 0), (m % 12) + 1, 1)
        return start, end
    except Exception:
        return None, None


# ─── main export endpoint ─────────────────────────────────────────────────────

@reports_bp.route('/cps-export', methods=['GET'])
@jwt_required()
@_admin_or_dpo
def cps_export():
    """
    GET /api/reports/cps-export?sheet=<sheet>&month=YYYY-MM
    sheet: new-clients | counseling-cases | checkins | all
    month: optional filter (omit for all-time)
    """
    sheet = request.args.get('sheet', 'new-clients')
    month = request.args.get('month', '')
    start, end = _date_range(month)

    try:
        if sheet == 'new-clients':
            rows = _sheet_new_clients(start, end)
        elif sheet == 'counseling-cases':
            rows = _sheet_counseling_cases(start, end)
        elif sheet == 'checkins':
            rows = _sheet_checkins(start, end)
        elif sheet == 'all':
            rows = {
                'new_clients':       _sheet_new_clients(start, end),
                'counseling_cases':  _sheet_counseling_cases(start, end),
                'checkins':          _sheet_checkins(start, end),
            }
            audit_log(db.db, 'reports', 'export_all', new_values={'month': month or 'all'})
            return jsonify({
                'sheet': 'all',
                'month': month or 'all',
                'data': rows,
                'totals': {k: len(v) for k, v in rows.items()},
            }), 200
        else:
            return jsonify({'error': 'Invalid sheet. Use: new-clients, counseling-cases, checkins, all'}), 400

        audit_log(db.db, 'reports', f'export_{sheet}', new_values={'month': month or 'all', 'rows': len(rows)})
        return jsonify({'sheet': sheet, 'month': month or 'all', 'rows': rows, 'total': len(rows)}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─── CPS summary counts (used by analytics page) ─────────────────────────────

@reports_bp.route('/cps-summary', methods=['GET'])
@jwt_required()
@_admin_or_dpo
def cps_summary():
    """Quick count summary for the 3 CPS categories."""
    try:
        from datetime import timedelta
        now = datetime.utcnow()
        month_ago = now - timedelta(days=30)

        new_clients_total = db.db.appointments.count_documents({})
        new_clients_month = db.db.appointments.count_documents({'created_at': {'$gte': month_ago}})

        counseling_total = db.db.cases.count_documents({
            'status': {'$nin': ['closed', 'CLOSED']},
        })
        counseling_active = db.db.cases.count_documents({
            'status': {'$in': ['active', 'ACTIVE']},
        })

        checkin_total = db.db.cases.count_documents({'client_status': 'CHECK_IN_ONLY'})
        checkin_month = db.db.check_ins.count_documents({'created_at': {'$gte': month_ago}})

        return jsonify({
            'new_clients': {'total': new_clients_total, 'this_month': new_clients_month},
            'counseling_cases': {'total': counseling_total, 'active': counseling_active},
            'checkins': {'total_clients': checkin_total, 'checkins_this_month': checkin_month},
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─── sheet builders ───────────────────────────────────────────────────────────

_STATUS_LABELS = {
    'REQUESTED':               'Service Request Received',
    'PENDING':                 'Pending Review',
    'PENDING_STUDENT_APPROVAL':'Awaiting Student Confirmation',
    'APPROVED':                'Approved',
    'CONFIRMED':               'Confirmed',
    'MATCHED':                 'Matched with Counselor',
    'SCHEDULED':               'Scheduled',
    'EVALUATION':              'Under Evaluation',
    'FOLLOW_UP':               'Follow-up Scheduled',
    'RESCHEDULE_REQUESTED':    'Reschedule Requested',
    'COMPLETED':               'Completed',
    'CANCELLED':               'Cancelled',
    'NO_SHOW':                 'No Show',
    'CHECKED_IN':              'Checked In',
}


def _label(status):
    return _STATUS_LABELS.get(str(status).upper(), str(status).replace('_', ' ').title())


def _sheet_new_clients(start, end):
    """
    PDF page 29 — New Clients
    Columns: Date, Time, Source, Transaction Type, ID Number, Last Name, First Name,
             College/Unit, Degree Program, Service Requested, Intake Counselor,
             Action Taken, CC Assigned, CP Assigned
    """
    query = {}
    if start and end:
        query['created_at'] = {'$gte': start, '$lt': end}

    appointments = list(
        db.db.appointments.find(query).sort('created_at', -1).limit(1000)
    )

    appt_ids      = [a['_id']         for a in appointments]
    student_ids   = [a['student_id']  for a in appointments if a.get('student_id')]
    counselor_ids = [a['counselor_id'] for a in appointments if a.get('counselor_id')]

    students   = {u['_id']: u for u in db.db.users.find({'_id': {'$in': student_ids}})}
    counselors = {u['_id']: u for u in db.db.users.find({'_id': {'$in': counselor_ids}})}

    # Batch-fetch intake packets — used as fallback for college/id_number/program
    intake_pkts = {}
    for pkt in db.db.intake_packets.find({'appointment_id': {'$in': appt_ids}}):
        aid = pkt.get('appointment_id')
        if aid and aid not in intake_pkts:
            intake_pkts[aid] = pkt

    rows = []
    for a in appointments:
        student   = students.get(a.get('student_id'))
        counselor = counselors.get(a.get('counselor_id'))
        pkt       = intake_pkts.get(a['_id'])
        icf       = pkt.get('icf', {}) if pkt else {}

        created  = a.get('created_at')
        date_str = created.strftime('%Y-%m-%d') if isinstance(created, datetime) else _s(created)[:10]
        time_str = created.strftime('%H:%M')    if isinstance(created, datetime) else ''

        # Pull from user profile first, fall back to ICF intake data
        id_number   = _s(student.get('id_number') or icf.get('student_id') or icf.get('id_number'))  if student else _s(icf.get('student_id', ''))
        college     = _s(student.get('department') or student.get('college') or icf.get('college'))   if student else _s(icf.get('college', ''))
        program     = _s(student.get('course')     or student.get('program') or icf.get('program'))   if student else _s(icf.get('program', ''))

        method = (a.get('method') or a.get('preferred_method') or '').lower()
        if method in ('walk-in', 'walkin', 'face_to_face', 'f2f', 'in-person'):
            source = 'Walk-in'
        elif method in ('online', 'virtual', 'video'):
            source = 'Online'
        else:
            source = method.replace('_', ' ').title() if method else 'Online'

        c_role   = counselor.get('role', '') if counselor else ''
        ic_name  = ''
        cc_name  = ''
        cp_name  = ''
        if c_role == 'IC':
            ic_name = _name(counselor)
        elif c_role == 'COUNSELOR':
            cc_name = _name(counselor)
        elif c_role == 'PSYCHOLOGIST':
            cp_name = _name(counselor)

        rows.append({
            'Date of Request':   date_str,
            'Time of Request':   time_str,
            'Source':            source,
            'Transaction Type':  a.get('appointment_type') or a.get('purpose') or 'Initial Consultation',
            'ID Number':         id_number,
            'Last Name':         _s(student.get('last_name'))  if student else a.get('student_name', ''),
            'First Name':        _s(student.get('first_name')) if student else '',
            'College/Unit':      college,
            'Degree Program':    program,
            'Year Level':        _s(student.get('year_level') or icf.get('year_level')) if student else _s(icf.get('year_level', '')),
            'Service Requested': a.get('concern') or a.get('purpose') or icf.get('service_requested', ''),
            'Intake Counselor':  ic_name,
            'Action Taken':      _label(a.get('status', '')),
            'CC Assigned':       cc_name,
            'CP Assigned':       cp_name,
        })

    return rows


def _sheet_counseling_cases(start, end):
    """
    PDF page 27 — Existing Clients for Counseling
    Columns: Counselor, Case Number, ID Number, Client Name,
             Target No. of Sessions, Current No. of Sessions, Risk Level, Status
    """
    query = {'client_status': {'$nin': ['CHECK_IN_ONLY', None]}}
    if start and end:
        query['created_at'] = {'$gte': start, '$lt': end}

    cases = list(db.db.cases.find(query).sort('created_at', -1).limit(1000))

    counselor_ids = [c['counselor_id'] for c in cases if c.get('counselor_id')]
    student_ids   = [c['student_id']   for c in cases if c.get('student_id')]
    counselors    = {u['_id']: u for u in db.db.users.find({'_id': {'$in': counselor_ids}})}
    students      = {u['_id']: u for u in db.db.users.find({'_id': {'$in': student_ids}})}

    rows = []
    for c in cases:
        counselor = counselors.get(c.get('counselor_id'))
        student   = students.get(c.get('student_id'))

        rows.append({
            'Counselor':               _name(counselor),
            'Case Number':             _s(c.get('case_number', '')),
            'ID Number':               _s(student.get('id_number') or student.get('student_id')) if student else '',
            'Last Name':               _s(student.get('last_name'))  if student else '',
            'First Name':              _s(student.get('first_name')) if student else '',
            'College/Unit':            _s(student.get('department') or student.get('college')) if student else '',
            'Degree Program':          _s(student.get('course') or student.get('program'))     if student else '',
            'Target No. of Sessions':  _s(c.get('target_sessions', '')),
            'Current No. of Sessions': _s(c.get('session_count', 0)),
            'Risk Level':              c.get('risk_level', 'GREEN'),
            'Case Status':             _label(c.get('client_status') or c.get('status', '')),
        })

    return rows


def _sheet_checkins(start, end):
    """
    PDF page 28 — Non-counseling Clients (Check-in)
    Columns: Counselor, Case Number, ID Number, Client Name,
             Concern, Check-in Type, Last Check-in, Status
    """
    cases = list(
        db.db.cases.find({'client_status': 'CHECK_IN_ONLY'}).sort('created_at', -1).limit(1000)
    )
    case_ids = [c['_id'] for c in cases]

    # Latest check-in per case
    all_checkins = list(
        db.db.check_ins.find({'case_id': {'$in': case_ids}}).sort('created_at', -1)
    )
    latest = {}
    for ci in all_checkins:
        cid = ci.get('case_id')
        if cid and cid not in latest:
            latest[cid] = ci

    counselor_ids = list({c.get('counselor_id') for c in cases if c.get('counselor_id')} |
                         {ci.get('checked_in_by') for ci in all_checkins if ci.get('checked_in_by')})
    student_ids   = [c['student_id'] for c in cases if c.get('student_id')]

    counselors = {u['_id']: u for u in db.db.users.find({'_id': {'$in': counselor_ids}})}
    students   = {u['_id']: u for u in db.db.users.find({'_id': {'$in': student_ids}})}

    # Optional date filter on check-in date rather than case creation
    rows = []
    for c in cases:
        ci        = latest.get(c['_id'])
        counselor = counselors.get(c.get('counselor_id'))
        student   = students.get(c.get('student_id'))

        if start and end and ci:
            ci_date = ci.get('created_at')
            if isinstance(ci_date, datetime) and not (start <= ci_date < end):
                continue

        rows.append({
            'Counselor':      _name(counselor),
            'Case Number':    _s(c.get('case_number', '')),
            'ID Number':      _s(student.get('id_number') or student.get('student_id')) if student else '',
            'Last Name':      _s(student.get('last_name'))  if student else '',
            'First Name':     _s(student.get('first_name')) if student else '',
            'College/Unit':   _s(student.get('department') or student.get('college')) if student else '',
            'Concern':        _s(c.get('presenting_concern') or (ci.get('notes') if ci else '')),
            'Check-in Type':  _s(ci.get('check_in_type')) if ci else '',
            'Last Check-in':  _s(ci.get('created_at'))    if ci else '',
            'Status':         _label(c.get('client_status', '')),
        })

    return rows


# ─── Appointment CSV export ───────────────────────────────────────────────────

@reports_bp.route('/appointments-csv', methods=['GET'])
@jwt_required()
@_admin_or_dpo
def appointments_csv():
    """GET /api/reports/appointments-csv?month=YYYY-MM"""
    month = request.args.get('month', '')
    start, end = _date_range(month)

    try:
        query = {}
        if start and end:
            query['$or'] = [
                {'created_at': {'$gte': start, '$lt': end}},
                {'scheduled_start': {'$gte': start, '$lt': end}},
            ]

        appointments = list(db.db.appointments.find(query).sort('created_at', -1).limit(2000))
        student_ids   = [a['student_id']  for a in appointments if a.get('student_id')]
        counselor_ids = [a['counselor_id'] for a in appointments if a.get('counselor_id')]
        students   = {u['_id']: u for u in db.db.users.find({'_id': {'$in': student_ids}})}
        counselors = {u['_id']: u for u in db.db.users.find({'_id': {'$in': counselor_ids}})}

        rows = []
        for a in appointments:
            student   = students.get(a.get('student_id'))
            counselor = counselors.get(a.get('counselor_id'))
            dt = a.get('scheduled_start') or a.get('requested_start') or a.get('created_at')
            rows.append({
                'Date':           dt.strftime('%Y-%m-%d') if isinstance(dt, datetime) else _s(dt)[:10],
                'Time':           dt.strftime('%H:%M')    if isinstance(dt, datetime) else '',
                'ID Number':      _s(student.get('id_number') or student.get('student_id')) if student else '',
                'Last Name':      _s(student.get('last_name'))  if student else '',
                'First Name':     _s(student.get('first_name')) if student else '',
                'College/Unit':   _s(student.get('department') or student.get('college')) if student else '',
                'Degree Program': _s(student.get('course') or student.get('program'))     if student else '',
                'Counselor':      _name(counselor),
                'Counselor Role': counselor.get('role', '') if counselor else '',
                'Type':           _s(a.get('appointment_type') or a.get('purpose')),
                'Method':         _s(a.get('method') or a.get('preferred_method')),
                'Status':         _label(a.get('status', '')),
                'Concern':        _s(a.get('concern')),
            })

        audit_log(db.db, 'reports', 'export_appointments', new_values={'month': month or 'all', 'rows': len(rows)})
        return jsonify({'rows': rows, 'total': len(rows), 'month': month or 'all'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─── Case summary (for printable case record) ─────────────────────────────────

@reports_bp.route('/case-summary/<case_id>', methods=['GET'])
@jwt_required()
def case_summary(case_id):
    """GET /api/reports/case-summary/<case_id> — structured case data for printing."""
    from flask_jwt_extended import get_jwt
    role = get_jwt().get('role', '')
    if role not in ('ADMIN', 'DPO', 'COUNSELOR', 'PSYCHOLOGIST', 'IC', 'CASE_MANAGER', 'STAFF'):
        return jsonify({'error': 'Access denied'}), 403

    try:
        oid = ObjectId(case_id)
    except Exception:
        return jsonify({'error': 'Invalid case ID'}), 400

    try:
        case = db.db.cases.find_one({'_id': oid})
        if not case:
            return jsonify({'error': 'Case not found'}), 404

        student      = db.db.users.find_one({'_id': case.get('student_id')})
        counselor    = db.db.users.find_one({'_id': case.get('assigned_counselor_id') or case.get('counselor_id')})
        psychologist = db.db.users.find_one({'_id': case.get('assigned_psychologist_id')})
        appointment  = db.db.appointments.find_one({'case_id': oid})
        intake_pkt   = db.db.intake_packets.find_one({'appointment_id': appointment['_id']}) if appointment else None

        icf  = intake_pkt.get('icf',  {}) if intake_pkt else {}
        spif = intake_pkt.get('spif', {}) if intake_pkt else {}
        phq4 = intake_pkt.get('phq4_responses') if intake_pkt else None
        notes = case.get('progress_notes', [])

        def fmt_date(v):
            return v.strftime('%B %d, %Y') if isinstance(v, datetime) else _s(v)[:10]

        result = {
            'generated_at': datetime.utcnow().strftime('%B %d, %Y %I:%M %p UTC'),
            'case': {
                'case_number':     case.get('case_number', ''),
                'status':          case.get('status', ''),
                'risk_level':      case.get('risk_level', ''),
                'opening_date':    fmt_date(case.get('opening_date') or case.get('created_at')),
                'chief_complaint': case.get('chief_complaint', ''),
                'treatment_plan':  case.get('treatment_plan', ''),
            },
            'student': {
                'name':      f"{(student or {}).get('first_name','')} {(student or {}).get('last_name','')}".strip(),
                'id_number': (student or {}).get('id_number', (student or {}).get('student_id', '')),
                'email':     (student or {}).get('email', ''),
                'college':   (student or {}).get('college', ''),
                'program':   (student or {}).get('program', ''),
            },
            'counselor':    {'name': _name(counselor),    'role': (counselor    or {}).get('role', '')},
            'psychologist': {'name': _name(psychologist), 'role': (psychologist or {}).get('role', '')},
            'icf': {k: icf.get(k, '') for k in [
                'first_name', 'last_name', 'email', 'student_id', 'phone',
                'college', 'program', 'year_level', 'service_requested',
                'presenting_concern', 'referral_source', 'referred_by',
                'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
            ]},
            'spif': {k: spif.get(k, '') for k in ['address', 'birthdate', 'gender']},
            'phq4': phq4,
            'notes': [
                {
                    'date':    _s(n.get('date') or n.get('created_at')),
                    'content': n.get('content', n.get('note', '')),
                    'author':  n.get('author', ''),
                }
                for n in (notes if isinstance(notes, list) else [])
            ],
        }

        audit_log(db.db, 'reports', 'view_case_summary', new_values={'case_id': case_id})
        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
