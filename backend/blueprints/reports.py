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
            audit_log(db.db, 'reports', 'export_all', extra={'month': month or 'all'})
            return jsonify({
                'sheet': 'all',
                'month': month or 'all',
                'data': rows,
                'totals': {k: len(v) for k, v in rows.items()},
            }), 200
        else:
            return jsonify({'error': 'Invalid sheet. Use: new-clients, counseling-cases, checkins, all'}), 400

        audit_log(db.db, 'reports', f'export_{sheet}', extra={'month': month or 'all', 'rows': len(rows)})
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
            'status': {'$ne': 'closed'},
            'client_status': {'$nin': ['CHECK_IN_ONLY', None]},
        })
        counseling_active = db.db.cases.count_documents({
            'status': 'active',
            'client_status': {'$nin': ['CHECK_IN_ONLY', None]},
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

def _sheet_new_clients(start, end):
    """
    PDF page 29 — New Clients
    Columns: Date, Time, Source, Transaction Type, ID Number, Last Name, First Name,
             College/Unit, Degree Program, Service Requested, Intake Counselor,
             Action Taken, CC Assigned, CP Assigned, Status
    """
    query = {}
    if start and end:
        query['created_at'] = {'$gte': start, '$lt': end}

    appointments = list(
        db.db.appointments.find(query).sort('created_at', -1).limit(1000)
    )

    # Batch-fetch related users and cases
    student_ids   = [a['student_id']  for a in appointments if a.get('student_id')]
    counselor_ids = [a['counselor_id'] for a in appointments if a.get('counselor_id')]
    case_ids      = [a['case_id']      for a in appointments if a.get('case_id')]

    students   = {u['_id']: u for u in db.db.users.find({'_id': {'$in': student_ids}})}
    counselors = {u['_id']: u for u in db.db.users.find({'_id': {'$in': counselor_ids}})}
    cases      = {c['_id']: c for c in db.db.cases.find({'_id': {'$in': case_ids}})}

    rows = []
    for a in appointments:
        student  = students.get(a.get('student_id'))
        counselor = counselors.get(a.get('counselor_id'))
        case     = cases.get(a.get('case_id'))

        created = a.get('created_at')
        date_str = created.strftime('%Y-%m-%d') if isinstance(created, datetime) else _s(created)[:10]
        time_str = created.strftime('%H:%M')    if isinstance(created, datetime) else ''

        c_role = counselor.get('role', '') if counselor else ''

        rows.append({
            'Date of Request':   date_str,
            'Time of Request':   time_str,
            'Source':            'Walk-in' if a.get('preferred_method') in ('walk-in', 'walkin') else 'Online',
            'Transaction Type':  a.get('purpose', 'Initial Consultation'),
            'ID Number':         student.get('id_number', '') if student else '',
            'Last Name':         student.get('last_name',  '') if student else a.get('student_name', ''),
            'First Name':        student.get('first_name', '') if student else '',
            'College/Unit':      student.get('department', '') if student else '',
            'Degree Program':    student.get('course', '')     if student else '',
            'Service Requested': a.get('concern', '') or a.get('purpose', ''),
            'Intake Counselor':  _name(counselor) if c_role == 'IC' else '',
            'Action Taken':      a.get('status', ''),
            'CC Assigned':       _name(counselor) if c_role == 'COUNSELOR'   else '',
            'CP Assigned':       _name(counselor) if c_role == 'PSYCHOLOGIST' else '',
            'Status':            a.get('status', ''),
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
            'Case Number':             c.get('case_number', ''),
            'ID Number':               student.get('id_number', '') if student else '',
            'Client Name':             _name(student),
            'Target No. of Sessions':  _s(c.get('target_sessions', '')),
            'Current No. of Sessions': _s(c.get('session_count', 0)),
            'Risk Level':              c.get('risk_level', 'GREEN'),
            'Status':                  c.get('client_status', c.get('status', '')),
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
            'Case Number':    c.get('case_number', ''),
            'ID Number':      student.get('id_number', '') if student else '',
            'Client Name':    _name(student),
            'Concern':        c.get('presenting_concern', '') or (ci.get('notes', '') if ci else ''),
            'Check-in Type':  ci.get('check_in_type', '') if ci else '',
            'Last Check-in':  _s(ci.get('created_at')) if ci else '',
            'Status':         c.get('client_status', ''),
        })

    return rows
