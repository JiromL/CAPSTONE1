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
from datetime import datetime, timedelta
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

def _date_range_explicit(date_from, date_to, month):
    """Resolve explicit from/to dates, falling back to month, then None."""
    if date_from and date_to:
        try:
            start = datetime.strptime(date_from, '%Y-%m-%d')
            end   = datetime.strptime(date_to,   '%Y-%m-%d').replace(hour=23, minute=59, second=59)
            return start, end
        except Exception:
            pass
    return _date_range(month)


@reports_bp.route('/cps-export', methods=['GET'])
@jwt_required()
@_admin_or_dpo
def cps_export():
    """
    GET /api/reports/cps-export?sheet=<sheet>&from=YYYY-MM-DD&to=YYYY-MM-DD
    sheet: service-requests | scheduled-appointments | completed-sessions |
           no-shows | cancellations | walk-in-sessions |
           active-caseload | closed-cases |
           checkin-log | referral-summary | counselor-workload
    Accepts date_from / date_to (explicit range) OR legacy month=YYYY-MM.
    """
    sheet      = request.args.get('sheet', 'service-requests')
    month      = request.args.get('month', '')
    date_from  = request.args.get('from', '')
    date_to    = request.args.get('to', '')
    start, end = _date_range_explicit(date_from, date_to, month)

    VALID = {
        'service-requests', 'scheduled-appointments', 'completed-sessions',
        'no-shows', 'cancellations', 'walk-in-sessions',
        'active-caseload', 'closed-cases',
        'checkin-log', 'referral-summary', 'counselor-workload',
        # legacy aliases kept for backward compat
        'new-clients', 'counseling-cases', 'checkins',
    }
    if sheet not in VALID:
        return jsonify({'error': f'Invalid sheet: {sheet}'}), 400

    try:
        if sheet in ('service-requests', 'new-clients'):
            rows = _sheet_new_clients(start, end)
        elif sheet == 'scheduled-appointments':
            rows = _sheet_scheduled_appointments(start, end)
        elif sheet == 'completed-sessions':
            rows = _sheet_completed_sessions(start, end)
        elif sheet == 'no-shows':
            rows = _sheet_by_status(start, end, ['NO_SHOW'], 'No-Show Report')
        elif sheet == 'cancellations':
            rows = _sheet_by_status(start, end, ['CANCELLED'], 'Cancellation Report')
        elif sheet == 'walk-in-sessions':
            rows = _sheet_walkin(start, end)
        elif sheet in ('active-caseload', 'counseling-cases'):
            rows = _sheet_counseling_cases(start, end)
        elif sheet == 'closed-cases':
            rows = _sheet_closed_cases(start, end)
        elif sheet in ('checkin-log', 'checkins'):
            rows = _sheet_checkins(start, end)
        elif sheet == 'referral-summary':
            rows = _sheet_referrals(start, end)
        elif sheet == 'counselor-workload':
            rows = _sheet_counselor_workload(start, end)
        else:
            rows = []

        label = f'{date_from}_to_{date_to}' if date_from and date_to else (month or 'all')
        audit_log(db.db, 'reports', f'export_{sheet}', new_values={'range': label, 'rows': len(rows)})
        return jsonify({'sheet': sheet, 'range': label, 'rows': rows, 'total': len(rows)}), 200

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

        counseling_total = db.db.cases.count_documents({})
        counseling_active = db.db.cases.count_documents({
            'case_status': {'$in': ['active', 'ACTIVE']},
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
    query = {'client_status': {'$ne': 'CHECK_IN_ONLY'}}
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
            'Case Status':             _label(c.get('case_status', '')),
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


# ─── New sheet builders ──────────────────────────────────────────────────────

def _appt_base_row(a, student, counselor):
    """Shared columns used across appointment-based sheets."""
    dt = a.get('scheduled_start') or a.get('preferred_date') or a.get('created_at')
    return {
        'Student Name':    f"{_s(student.get('last_name'))}, {_s(student.get('first_name'))}" if student else _s(a.get('student_name', '')),
        'Student ID':      _s(student.get('id_number') or student.get('student_id', '')) if student else '',
        'College / Unit':  _s(student.get('department') or student.get('college', ''))   if student else '',
        'Degree Program':  _s(student.get('course') or student.get('program', ''))       if student else '',
        'Year Level':      _s(student.get('year_level', ''))                              if student else '',
        'Counselor':       _name(counselor),
        'Counselor Role':  counselor.get('role', '') if counselor else '',
        'Date':            dt.strftime('%Y-%m-%d') if isinstance(dt, datetime) else _s(dt)[:10],
        'Time':            dt.strftime('%H:%M')    if isinstance(dt, datetime) else '',
        'Session Type':    _s(a.get('appointment_type') or a.get('purpose', 'Initial Consultation')),
        'Session Mode':    _s(a.get('method') or a.get('preferred_method', '')).replace('_', ' ').title(),
        'Concern':         _s(a.get('concern') or a.get('chief_complaint', '')),
        'Status':          _label(a.get('status', '')),
        'Created Date':    a['created_at'].strftime('%Y-%m-%d') if isinstance(a.get('created_at'), datetime) else '',
    }


def _fetch_appts_with_lookups(query):
    appts = list(db.db.appointments.find(query).sort('scheduled_start', -1).limit(2000))
    s_ids = [a['student_id']  for a in appts if a.get('student_id')]
    c_ids = [a['counselor_id'] for a in appts if a.get('counselor_id')]
    students   = {u['_id']: u for u in db.db.users.find({'_id': {'$in': s_ids}})}
    counselors = {u['_id']: u for u in db.db.users.find({'_id': {'$in': c_ids}})}
    return appts, students, counselors


def _sheet_scheduled_appointments(start, end):
    """Confirmed / approved / matched appointments."""
    q = {'status': {'$in': ['CONFIRMED', 'APPROVED', 'MATCHED', 'SCHEDULED']}}
    if start and end:
        q['$or'] = [{'scheduled_start': {'$gte': start, '$lt': end}},
                    {'created_at': {'$gte': start, '$lt': end}}]
    appts, students, counselors = _fetch_appts_with_lookups(q)
    rows = []
    for a in appts:
        row = _appt_base_row(a, students.get(a.get('student_id')), counselors.get(a.get('counselor_id')))
        dt_sched = a.get('scheduled_start')
        row['Scheduled Date'] = dt_sched.strftime('%Y-%m-%d') if isinstance(dt_sched, datetime) else ''
        row['Scheduled Time'] = dt_sched.strftime('%H:%M')    if isinstance(dt_sched, datetime) else ''
        rows.append(row)
    return rows


def _sheet_completed_sessions(start, end):
    """Sessions marked COMPLETED."""
    q = {'status': 'COMPLETED'}
    if start and end:
        q['$or'] = [{'scheduled_start': {'$gte': start, '$lt': end}},
                    {'completed_at': {'$gte': start, '$lt': end}}]
    appts, students, counselors = _fetch_appts_with_lookups(q)
    rows = []
    for a in appts:
        student   = students.get(a.get('student_id'))
        counselor = counselors.get(a.get('counselor_id'))
        row = _appt_base_row(a, student, counselor)
        completed = a.get('completed_at') or a.get('updated_at')
        row['Completed Date'] = completed.strftime('%Y-%m-%d') if isinstance(completed, datetime) else ''
        row['Has Evaluation'] = 'Yes' if a.get('evaluation') else 'No'
        rows.append(row)
    return rows


def _sheet_by_status(start, end, statuses, _label_unused):
    """Generic attendance issue sheet (no-shows, cancellations)."""
    q = {'status': {'$in': statuses}}
    if start and end:
        q['$or'] = [{'scheduled_start': {'$gte': start, '$lt': end}},
                    {'updated_at': {'$gte': start, '$lt': end}}]
    appts, students, counselors = _fetch_appts_with_lookups(q)
    rows = []
    for a in appts:
        row = _appt_base_row(a, students.get(a.get('student_id')), counselors.get(a.get('counselor_id')))
        row['Cancellation Reason'] = _s(a.get('cancellation_reason') or a.get('cancel_reason', ''))
        rows.append(row)
    return rows


def _sheet_walkin(start, end):
    """Walk-in sessions only."""
    walkin_methods = ['walk-in', 'walkin', 'walk_in', 'in-person', 'face_to_face']
    q = {'method': {'$in': walkin_methods}}
    if start and end:
        q['created_at'] = {'$gte': start, '$lt': end}
    appts, students, counselors = _fetch_appts_with_lookups(q)
    rows = []
    for a in appts:
        row = _appt_base_row(a, students.get(a.get('student_id')), counselors.get(a.get('counselor_id')))
        rows.append(row)
    return rows


def _sheet_closed_cases(start, end):
    """Cases with CLOSED / CANCELLED status."""
    q = {'status': {'$in': ['CLOSED', 'CANCELLED', 'closed', 'cancelled']}}
    if start and end:
        q['$or'] = [{'closed_at': {'$gte': start, '$lt': end}},
                    {'updated_at': {'$gte': start, '$lt': end}}]
    cases = list(db.db.cases.find(q).sort('closed_at', -1).limit(1000))
    c_ids = [c.get('counselor_id') or c.get('assigned_counselor_id') for c in cases if c.get('counselor_id') or c.get('assigned_counselor_id')]
    s_ids = [c['student_id'] for c in cases if c.get('student_id')]
    counselors = {u['_id']: u for u in db.db.users.find({'_id': {'$in': c_ids}})}
    students   = {u['_id']: u for u in db.db.users.find({'_id': {'$in': s_ids}})}
    rows = []
    for c in cases:
        student   = students.get(c.get('student_id'))
        counselor = counselors.get(c.get('counselor_id') or c.get('assigned_counselor_id'))
        closed    = c.get('closed_at') or c.get('updated_at')
        rows.append({
            'Case Number':       _s(c.get('case_number', '')),
            'Student Name':      f"{_s(student.get('last_name'))}, {_s(student.get('first_name'))}" if student else '',
            'Student ID':        _s(student.get('id_number', '')) if student else '',
            'College / Unit':    _s(student.get('department') or student.get('college', '')) if student else '',
            'Degree Program':    _s(student.get('course') or student.get('program', ''))    if student else '',
            'Counselor':         _name(counselor),
            'Opening Date':      c['created_at'].strftime('%Y-%m-%d') if isinstance(c.get('created_at'), datetime) else '',
            'Closing Date':      closed.strftime('%Y-%m-%d')          if isinstance(closed, datetime) else '',
            'Sessions Completed':_s(c.get('session_count', 0)),
            'Closure Reason':    _s(c.get('closure_reason') or c.get('close_reason', '')),
            'Final Risk Level':  _s(c.get('risk_level', 'GREEN')),
            'Final Status':      _label(c.get('status', '')),
        })
    return rows


def _sheet_referrals(start, end):
    """Referral summary report."""
    q = {}
    if start and end:
        q['created_at'] = {'$gte': start, '$lt': end}
    refs = list(db.db.referrals.find(q).sort('created_at', -1).limit(1000))
    u_ids = list({r.get('from_user_id') for r in refs if r.get('from_user_id')} |
                 {r.get('to_user_id')   for r in refs if r.get('to_user_id')})
    c_ids = [r.get('case_id') for r in refs if r.get('case_id')]
    users  = {u['_id']: u for u in db.db.users.find({'_id': {'$in': u_ids}})}
    cases  = {c['_id']: c for c in db.db.cases.find({'_id': {'$in': c_ids}})}
    rows = []
    for r in refs:
        case    = cases.get(r.get('case_id'))
        from_u  = users.get(r.get('from_user_id'))
        to_u    = users.get(r.get('to_user_id'))
        s_id    = case.get('student_id') if case else None
        student = db.db.users.find_one({'_id': s_id}) if s_id else None
        created = r.get('created_at')
        rows.append({
            'Referral Date':       created.strftime('%Y-%m-%d') if isinstance(created, datetime) else '',
            'Student Name':        f"{_s(student.get('last_name'))}, {_s(student.get('first_name'))}" if student else '',
            'Student ID':          _s(student.get('id_number', '')) if student else '',
            'College / Unit':      _s(student.get('department') or student.get('college', '')) if student else '',
            'Case Number':         _s(case.get('case_number', '')) if case else '',
            'Referral Type':       _s(r.get('referral_type', '')).replace('_', ' ').title(),
            'Referred By':         _name(from_u),
            'Referred To (Name)':  _name(to_u),
            'Referred To (Role)':  _s(r.get('assigned_to_role') or (to_u.get('role') if to_u else '')),
            'Reason':              _s(r.get('reason', '')),
            'Urgency':             _s(r.get('urgency', '')).title(),
            'Status':              _label(r.get('status', '')),
        })
    return rows


def _sheet_counselor_workload(start, end):
    """Per-counselor session and caseload summary."""
    staff = list(db.db.users.find({'role': {'$in': ['COUNSELOR', 'PSYCHOLOGIST', 'IC', 'CASE_MANAGER']}}))
    q_appt = {}
    if start and end:
        q_appt['scheduled_start'] = {'$gte': start, '$lt': end}
    all_appts = list(db.db.appointments.find(q_appt, {'counselor_id': 1, 'status': 1}))
    q_case = {'case_status': {'$nin': ['CLOSED', 'CANCELLED', 'closed', 'cancelled']}}
    all_cases = list(db.db.cases.find(q_case, {'counselor_id': 1, 'assigned_counselor_id': 1, 'case_status': 1}))
    rows = []
    for u in staff:
        uid = u['_id']
        appts_for = [a for a in all_appts if a.get('counselor_id') == uid]
        cases_for = [c for c in all_cases if c.get('counselor_id') == uid or c.get('assigned_counselor_id') == uid]
        rows.append({
            'Counselor Name':        _name(u),
            'Role':                  u.get('role', ''),
            'Active Cases':          str(len(cases_for)),
            'Total Sessions (Period)': str(len(appts_for)),
            'Completed Sessions':    str(sum(1 for a in appts_for if a.get('status') == 'COMPLETED')),
            'No-Shows':              str(sum(1 for a in appts_for if a.get('status') == 'NO_SHOW')),
            'Cancellations':         str(sum(1 for a in appts_for if a.get('status') == 'CANCELLED')),
            'Pending Sessions':      str(sum(1 for a in appts_for if a.get('status') in ('CONFIRMED', 'SCHEDULED', 'APPROVED', 'MATCHED'))),
        })
    rows.sort(key=lambda r: int(r['Active Cases']), reverse=True)
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

        # Find intake packet via multiple strategies:
        # 1. By actual appointment IDs on this case (walk-in / post-fix online)
        # 2. By intake._id used as appointment_id (pre-fix IC-entered online packets)
        # 3. Fallback to raw intakes doc for basic field reconstruction
        intake_pkt = None
        for appt in db.db.appointments.find({'case_id': oid}):
            intake_pkt = db.db.intake_packets.find_one({'appointment_id': appt['_id']})
            if intake_pkt:
                break

        intake_doc = db.db.intakes.find_one({'case_id': oid})
        if not intake_pkt and intake_doc:
            # IC conduct page saved the packet keyed to intake._id when appointment_id
            # wasn't yet stored on the intake (pre-fix online bookings).
            intake_pkt = db.db.intake_packets.find_one({'appointment_id': intake_doc['_id']})

        icf  = (intake_pkt or {}).get('icf',  {}) or {}
        spif = (intake_pkt or {}).get('spif', {}) or {}
        phq4 = (intake_pkt or {}).get('phq4_responses')

        # If still empty, pull what we can from the intakes document
        if not icf and intake_doc:
            icf = {
                'first_name':    (student or {}).get('first_name', ''),
                'last_name':     (student or {}).get('last_name', ''),
                'email':         (student or {}).get('email', ''),
                'phone':         intake_doc.get('phone', ''),
                'year_level':    intake_doc.get('year_level', ''),
                'presenting_concern': intake_doc.get('responses', {}).get('purpose', intake_doc.get('purpose', '')),
                'service_requested':  intake_doc.get('responses', {}).get('purpose', ''),
                'referral_source':    intake_doc.get('referral_source', ''),
                'referred_by':        intake_doc.get('referred_by', ''),
                'emergency_contact_name':         intake_doc.get('emergency_contact_name', ''),
                'emergency_contact_phone':        intake_doc.get('emergency_contact_phone', ''),
                'emergency_contact_relationship': intake_doc.get('emergency_contact_relationship', ''),
            }
        if not spif and intake_doc:
            spif = {
                'address':   intake_doc.get('address', ''),
                'birthdate': intake_doc.get('birthdate', ''),
                'gender':    intake_doc.get('gender', ''),
            }

        # Session notes live in the session_notes collection, not embedded in case
        raw_notes = list(db.db.session_notes.find({'case_id': case['_id']}).sort('session_date', 1))
        notes = raw_notes

        def fmt_date(v):
            return v.strftime('%B %d, %Y') if isinstance(v, datetime) else _s(v)[:10]

        result = {
            'generated_at': (datetime.utcnow() + timedelta(hours=8)).strftime('%B %d, %Y %I:%M %p PHT'),
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
                    'date': (
                        n['session_date'].strftime('%B %d, %Y')
                        if isinstance(n.get('session_date'), datetime)
                        else _s(n.get('session_date') or n.get('date') or n.get('created_at'))[:10]
                    ),
                    'content': n.get('note_content') or n.get('content') or n.get('note') or '',
                    'soap': n.get('soap'),
                    'note_format': n.get('note_format', 'freeform'),
                    'author': (
                        _name(db.db.users.find_one({'_id': n['counselor_id']}))
                        if n.get('counselor_id') else n.get('author', '')
                    ),
                }
                for n in (notes if isinstance(notes, list) else [])
            ],
        }

        audit_log(db.db, 'reports', 'view_case_summary', new_values={'case_id': case_id})
        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
