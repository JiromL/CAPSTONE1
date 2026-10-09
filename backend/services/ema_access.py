"""
Who may see which students' EMA results. This is the rule the EMA privacy notice promises
(frontend/src/components/EmaPrivacyNotice.tsx), so change both together.

  CASE_MANAGER          every EMA-linked student, by name (watching triage is their job)
  COUNSELOR/PSYCHOLOGIST only students whose case is assigned to them
  IC                    only students whose intake they handled
  ADMIN, DPO            totals only: numbers and charts, never names or per-student results
  everyone else         nothing
"""
from bson import ObjectId

ALL, OWN, TOTALS = 'all', 'own', 'totals'


def _ids(values):
    """Match ids stored either as ObjectId or as a string."""
    out = []
    for v in values:
        out.append(v)
        out.append(str(v))
        if isinstance(v, str) and ObjectId.is_valid(v):
            out.append(ObjectId(v))
    return out


def ema_scope(db, user_id):
    """(mode, student_ids). student_ids is a set of ObjectIds for OWN, otherwise None.
    mode is None when the caller may not see EMA data at all."""
    try:
        uid = ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id
    except Exception:
        return None, None
    user = db.users.find_one({'_id': uid}, {'role': 1})
    role = (user or {}).get('role')
    if role == 'CASE_MANAGER':
        return ALL, None
    if role in ('ADMIN', 'DPO'):
        return TOTALS, None
    if role in ('COUNSELOR', 'PSYCHOLOGIST'):
        cases = db.cases.find({'assigned_counselor_id': {'$in': _ids([uid])}}, {'student_id': 1})
        return OWN, {c['student_id'] for c in cases if c.get('student_id')}
    if role == 'IC':
        students = {c['student_id'] for c in db.cases.find({'intake_counselor_id': {'$in': _ids([uid])}}, {'student_id': 1})
                    if c.get('student_id')}
        students |= {a['student_id'] for a in db.appointments.find(
            {'counselor_id': {'$in': _ids([uid])}, 'purpose': 'intake_interview'}, {'student_id': 1}) if a.get('student_id')}
        return OWN, students
    return None, None


def student_filter(mode, student_ids):
    """Extra MongoDB filter on the users collection for this scope."""
    if mode == OWN:
        return {'_id': {'$in': list(student_ids)}}
    return {}


def can_see_student(mode, student_ids, student_id):
    if mode == ALL:
        return True
    if mode == OWN:
        return any(str(student_id) == str(s) for s in student_ids)
    return False
