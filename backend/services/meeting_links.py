"""
Meeting links for online appointments.

Students choose "online" plus a platform when they book (preferred_method 'online',
preferred_platform 'zoom' or 'google-meet'). The link is made on the platform they chose; if
that fails (Zoom down, or no Google Calendar connected for the counselor or the CPS system
account), the other platform is tried so the student still gets a working link.
"""
from datetime import timedelta

ZOOM, MEET = 'zoom', 'google-meet'


def platform_for(appointment: dict):
    """The platform the student asked for, or None for in-person sessions."""
    method = (appointment.get('preferred_method') or appointment.get('method') or '').lower()
    chosen = (appointment.get('preferred_platform') or '').lower().replace('_', '-')
    if method == ZOOM or chosen == ZOOM:
        return ZOOM
    if method in ('google-meet', 'google_meet') or chosen == MEET:
        return MEET
    if method in ('online', 'video'):
        return MEET   # online with no platform picked: Meet first, Zoom as the fallback
    return None


def _zoom(appointment, counselor, student, start, end, config):
    from integrations.zoom import ZoomIntegration
    minutes = int((end - start).total_seconds() // 60) if end else 60
    s_name = f"{student.get('first_name', '')} {student.get('last_name', '')}".strip() if student else 'Student'
    c_name = f"{counselor.get('first_name', '')} {counselor.get('last_name', '')}".strip()
    result = ZoomIntegration(config).create_meeting(
        topic=f"Counseling Session – {s_name} with {c_name}", start_time=start.isoformat(),
        duration_minutes=minutes or 60)
    if not result.get('join_url'):
        return None
    return {'meeting_link': result['join_url'], 'meeting_platform': ZOOM,
            'meeting_id': str(result.get('meeting_id', '')), 'meeting_passcode': result.get('meeting_passcode')}


def _meet(appointment, counselor, start, end):
    from blueprints.google_calendar import sync_appointment_to_calendar
    appt = dict(appointment, scheduled_start=start, scheduled_end=end or start + timedelta(minutes=60),
                counselor_id=counselor['_id'], preferred_method='online', preferred_platform=MEET)
    event_id, link = sync_appointment_to_calendar(str(counselor['_id']), appt)
    if not link:
        return None
    return {'meeting_link': link, 'meeting_platform': MEET, 'calendar_event_id': event_id}


def create_meeting_link(appointment: dict, counselor: dict, student: dict, start, end, config):
    """Fields to save on the appointment, or None when no link is needed or none could be made."""
    platform = platform_for(appointment)
    if not platform or not start or not counselor:
        return None
    for p in ([ZOOM, MEET] if platform == ZOOM else [MEET, ZOOM]):
        try:
            made = _zoom(appointment, counselor, student, start, end, config) if p == ZOOM \
                else _meet(appointment, counselor, start, end)
        except Exception as e:
            print(f"⚠ {p} link failed: {e}")
            continue
        if made:
            if p != platform:
                print(f"⚠ {platform} unavailable; used {p} instead")
            return {**made, 'is_telehealth': True}
    print(f"⚠ No meeting link could be created for appointment {appointment.get('_id')}")
    return None
