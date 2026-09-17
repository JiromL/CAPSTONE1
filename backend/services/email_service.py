"""
Email Service — unified branded templates for all CPS notifications.
Brand colour: #2352CC (matches --color-primary in the frontend).
"""

import smtplib
import os
import random
import string
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime, timedelta
from urllib.parse import urlencode


# ── Brand constants ────────────────────────────────────────────────────────────
PRIMARY   = '#2352CC'
PRIMARY_L = '#EBF0FF'   # light tint for detail cards
DANGER    = '#DC2626'
DANGER_L  = '#FEF2F2'
WARNING   = '#D97706'
WARNING_L = '#FFFBEB'
SUCCESS   = '#16A34A'
SUCCESS_L = '#F0FDF4'


def _org(key: str, default: str) -> str:
    return os.getenv(key, default)


def _base_html(header_title: str, body: str, header_color: str = PRIMARY) -> str:
    """Shared HTML wrapper used by every email template."""
    uni = _org('ORG_UNIVERSITY', 'De La Salle University')
    org = _org('ORG_NAME', 'Counseling &amp; Psychological Services')
    sup = _org('SUPPORT_EMAIL', 'cps@dlsu.edu.ph')
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"
       style="background:#F3F4F6;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" style="max-width:560px;background:#ffffff;
           border-radius:14px;overflow:hidden;
           box-shadow:0 2px 8px rgba(0,0,0,0.08);">

      <!-- Header -->
      <tr>
        <td style="background:{header_color};padding:28px 40px;">
          <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.7);
                    font-weight:600;letter-spacing:1.2px;text-transform:uppercase;">
            {uni} &mdash; {org}
          </p>
          <h1 style="margin:8px 0 0;font-size:20px;font-weight:700;color:#ffffff;
                     letter-spacing:-0.3px;">
            {header_title}
          </h1>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:32px 40px 24px;">
          {body}
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#F9FAFB;padding:18px 40px;
                   border-top:1px solid #E5E7EB;">
          <p style="margin:0;font-size:11px;color:#9CA3AF;text-align:center;">
            {uni} &mdash; {org}<br>
            <a href="mailto:{sup}"
               style="color:{PRIMARY};text-decoration:none;">{sup}</a>
            &nbsp;&bull;&nbsp; This is an automated email — please do not reply.
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>"""


def _detail_card(rows: list[tuple[str, str]], accent: str = PRIMARY) -> str:
    """Render a labelled detail card. rows = [(label, value), ...]"""
    items = ''.join(
        f'<tr>'
        f'<td style="padding:7px 0;font-size:13px;color:#6B7280;width:40%;'
        f'vertical-align:top;">{label}</td>'
        f'<td style="padding:7px 0;font-size:13px;color:#111827;font-weight:600;">{value}</td>'
        f'</tr>'
        for label, value in rows if value
    )
    return (
        f'<table width="100%" cellpadding="0" cellspacing="0" '
        f'style="background:#F8FAFF;border:1px solid {accent}33;'
        f'border-radius:10px;padding:16px 20px;margin:16px 0;">'
        f'<tbody>{items}</tbody></table>'
    )


def _info_box(text: str, color: str = WARNING, bg: str = WARNING_L) -> str:
    return (
        f'<div style="background:{bg};border:1px solid {color}44;'
        f'border-radius:8px;padding:14px 18px;margin-top:20px;">'
        f'<p style="margin:0;font-size:13px;color:{color};line-height:1.6;">{text}</p>'
        f'</div>'
    )


def _btn(label: str, href: str, color: str = PRIMARY) -> str:
    return (
        f'<div style="text-align:center;margin:24px 0;">'
        f'<a href="{href}" target="_blank" '
        f'style="display:inline-block;background:{color};color:#ffffff;'
        f'font-size:14px;font-weight:600;text-decoration:none;'
        f'padding:12px 30px;border-radius:8px;letter-spacing:0.2px;">'
        f'{label}</a></div>'
    )


def _p(text: str) -> str:
    return f'<p style="margin:0 0 14px;font-size:14px;color:#374151;line-height:1.6;">{text}</p>'


# ── Google Calendar helpers ────────────────────────────────────────────────────

def _gcal_link(title: str, start_dt: datetime, end_dt: datetime,
               description: str = '', location: str = '') -> str:
    params = {
        'action':   'TEMPLATE',
        'text':     title,
        'dates':    f"{start_dt.strftime('%Y%m%dT%H%M%SZ')}/{end_dt.strftime('%Y%m%dT%H%M%SZ')}",
        'details':  description,
        'location': location,
    }
    return 'https://calendar.google.com/calendar/render?' + urlencode(params)


def _ics(title: str, start_dt: datetime, end_dt: datetime,
         description: str = '', location: str = '', uid: str = '') -> str:
    def fmt(dt): return dt.strftime('%Y%m%dT%H%M%SZ')
    desc = (description or '').replace('\n', '\\n').replace(',', '\\,')
    loc  = (location  or '').replace(',', '\\,')
    org_short = _org('ORG_SHORT', 'DLSU CPS')
    return (
        'BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'
        f'PRODID:-//{org_short}//CPS Portal//EN\r\n'
        'METHOD:REQUEST\r\n'
        'BEGIN:VEVENT\r\n'
        f'UID:{uid or f"cps-apt@dlsu-cps.edu.ph"}\r\n'
        f'DTSTAMP:{fmt(datetime.utcnow())}\r\n'
        f'DTSTART:{fmt(start_dt)}\r\n'
        f'DTEND:{fmt(end_dt)}\r\n'
        f'SUMMARY:{title}\r\n'
        f'DESCRIPTION:{desc}\r\n'
        f'LOCATION:{loc}\r\n'
        'STATUS:CONFIRMED\r\nSEQUENCE:0\r\n'
        'END:VEVENT\r\nEND:VCALENDAR\r\n'
    )


# ── EmailService ───────────────────────────────────────────────────────────────

class EmailService:

    def __init__(self, smtp_host=None, smtp_port=None,
                 smtp_user=None, smtp_password=None):
        self.smtp_host     = smtp_host     or os.getenv('SMTP_HOST')
        self.smtp_port     = smtp_port     or int(os.getenv('SMTP_PORT', 587))
        self.smtp_user     = smtp_user     or os.getenv('SMTP_USER')
        self.smtp_password = smtp_password or os.getenv('SMTP_PASSWORD')
        self.from_email    = os.getenv('SMTP_FROM_EMAIL', 'noreply@dlsu-cps.edu.ph')
        self.dev_mode      = not (self.smtp_host and self.smtp_user and self.smtp_password)

    @staticmethod
    def generate_verification_code(length=6):
        return ''.join(random.choices(string.digits, k=length))

    # ── Auth emails ─────────────────────────────────────────────────────────────

    def send_verification_email(self, recipient_email: str, first_name: str,
                                 verification_code: str, verify_url: str = None):
        org_short = _org('ORG_SHORT', 'DLSU CPS')
        subject   = f'Verify your {org_short} account'

        button = (
            _btn('Verify Email', verify_url)
            + _p(f'Or paste this link into your browser: '
                 f'<a href="{verify_url}" style="color:{PRIMARY};">{verify_url}</a>')
            + '<hr style="border:none;border-top:1px solid #E5E7EB;margin:20px 0;">'
            + _p('Or enter this code on the verification page:')
        ) if verify_url else ''

        code_box = (
            f'<div style="background:#F8FAFF;border:1px solid {PRIMARY}33;'
            f'border-radius:10px;padding:20px;text-align:center;margin:16px 0;">'
            f'<p style="margin:0 0 6px;font-size:11px;color:#6B7280;font-weight:600;'
            f'text-transform:uppercase;letter-spacing:0.8px;">Verification Code</p>'
            f'<p style="margin:0;font-size:36px;font-weight:800;letter-spacing:10px;'
            f'color:{PRIMARY};">{verification_code}</p></div>'
        )

        body = (
            _p(f'Hi <strong>{first_name}</strong>,')
            + _p(f'Thank you for signing up for {org_short}. Please verify your email address to complete your registration.')
            + button
            + code_box
            + _p('This code expires in <strong>24 hours</strong>.')
            + _p('<span style="color:#9CA3AF;font-size:12px;">If you did not create this account, you can safely ignore this email.</span>')
        )
        return self._send(recipient_email, subject, _base_html('Welcome to ' + org_short, body))

    def send_welcome_email(self, recipient_email: str, first_name: str):
        org_short = _org('ORG_SHORT', 'DLSU CPS')
        subject   = f'Account verified — welcome to {org_short}'
        body = (
            _p(f'Hi <strong>{first_name}</strong>,')
            + _p('Your email has been verified and your account is now active. You can now sign in to the CPS portal.')
            + _btn('Go to Login', os.getenv('FRONTEND_URL', 'http://localhost:3000') + '/login')
            + _p('If you have any questions, please contact the CPS office.')
        )
        return self._send(recipient_email, subject, _base_html('Account Verified ✓', body, SUCCESS))

    def send_code_reminder_email(self, recipient_email: str, first_name: str,
                                  verification_code: str):
        org_short = _org('ORG_SHORT', 'DLSU CPS')
        subject   = f'Your {org_short} verification code'
        code_box  = (
            f'<div style="background:#F8FAFF;border:1px solid {PRIMARY}33;'
            f'border-radius:10px;padding:20px;text-align:center;margin:16px 0;">'
            f'<p style="margin:0 0 6px;font-size:11px;color:#6B7280;font-weight:600;'
            f'text-transform:uppercase;letter-spacing:0.8px;">Verification Code</p>'
            f'<p style="margin:0;font-size:36px;font-weight:800;letter-spacing:10px;'
            f'color:{PRIMARY};">{verification_code}</p></div>'
        )
        body = (
            _p(f'Hi <strong>{first_name}</strong>, here is your verification code:')
            + code_box
            + _p('This code expires in <strong>24 hours</strong>.')
        )
        return self._send(recipient_email, subject, _base_html('Your Verification Code', body))

    # ── Appointment emails ───────────────────────────────────────────────────────

    def send_appointment_request_receipt(self, recipient_email: str, student_name: str,
                                          request_id: str, preferred_date: str,
                                          purpose: str):
        subject = 'Appointment request received — CPS'
        rows = [
            ('Request ID',     request_id),
            ('Preferred date', preferred_date),
            ('Purpose',        purpose),
            ('Status',         'Under review'),
        ]
        body = (
            _p(f'Hi <strong>{student_name}</strong>,')
            + _p('Thank you for submitting your appointment request. Our counseling team will review it and match you with an available counselor. You will receive a confirmation once your session is scheduled.')
            + _detail_card(rows)
            + _info_box('You will be notified by email when your appointment is confirmed.', PRIMARY, PRIMARY_L)
        )
        return self._send(recipient_email, subject,
                          _base_html('Request Received', body))

    def send_appointment_confirmation_email(self, recipient_email: str, student_name: str,
                                             appointment_details: dict,
                                             pdf_file_path: str = None):
        d            = appointment_details
        date_str     = d.get('appointment_date', '')
        time_str     = d.get('appointment_time', '')
        platform     = d.get('platform', 'In-Person')
        counselor    = d.get('counselor_name', 'CPS Staff')
        concern      = d.get('concern', '')
        ref_id       = d.get('reference_id', '')
        meeting_link = d.get('meeting_link', '')
        meeting_passcode = d.get('meeting_passcode', '')
        start_dt     = d.get('start_dt')
        end_dt       = d.get('end_dt')
        subject      = f'Appointment confirmed — {date_str} at {time_str}'

        rows = [
            ('Reference #',  ref_id),
            ('Date',         date_str),
            ('Time',         time_str + ' PHT'),
            ('Format',       platform),
            ('Counselor',    counselor),
        ]
        if concern:
            rows.append(('Concern', concern))
        if meeting_link:
            rows.append(('Meeting link',
                         f'<a href="{meeting_link}" style="color:{PRIMARY};">{meeting_link}</a>'))
            if meeting_passcode:
                rows.append(('Passcode', meeting_passcode))

        ics_content     = None
        calendar_block  = ''

        if start_dt:
            if not end_dt:
                end_dt = start_dt + timedelta(hours=1)
            is_online = bool(meeting_link)
            location  = meeting_link if is_online else _org('ORG_SHORT', 'DLSU CPS') + ' Office, De La Salle University'
            evt_desc  = (f'Counseling session with {counselor}.'
                         + (f' Join: {meeting_link}' if is_online else ' Please come to the CPS office.'))
            apt_title = _org('ORG_SHORT', 'DLSU CPS') + ' Counseling Appointment'
            gcal      = _gcal_link(apt_title, start_dt, end_dt, evt_desc, location)
            ics_content = _ics(apt_title, start_dt, end_dt, evt_desc, location,
                               uid=f'cps-{ref_id or "apt"}@dlsu-cps.edu.ph')
            calendar_block = (
                _btn('&#128197; Add to Google Calendar', gcal)
                + '<p style="font-size:11px;color:#9CA3AF;text-align:center;margin-top:-12px;">'
                '  Or open the attached <strong>appointment.ics</strong> to add to Apple Calendar / Outlook.'
                '</p>'
            )

        reminders = (
            '<ul style="margin:0;padding-left:18px;font-size:13px;'
            'color:#92400E;line-height:1.7;">'
            '<li>Arrive 10 minutes early for in-person sessions.</li>'
            '<li>For online sessions, ensure a stable internet connection.</li>'
            '<li>Reschedule at least 24 hours in advance via the CPS portal.</li>'
            '</ul>'
        )
        reminder_box = (
            f'<div style="background:{WARNING_L};border:1px solid {WARNING}44;'
            f'border-radius:8px;padding:14px 18px;margin-top:20px;">'
            f'<p style="margin:0 0 8px;font-size:12px;font-weight:700;color:{WARNING};'
            f'text-transform:uppercase;letter-spacing:0.5px;">Reminders</p>'
            f'{reminders}</div>'
        )

        body = (
            _p(f'Hi <strong>{student_name}</strong>, your counseling appointment has been confirmed.')
            + _detail_card(rows)
            + calendar_block
            + reminder_box
        )
        return self._send(recipient_email, subject,
                          _base_html('Appointment Confirmed ✓', body, SUCCESS),
                          ics_content=ics_content, attachment_path=pdf_file_path)

    def send_counselor_notification(self, recipient_email: str, counselor_name: str,
                                     student_name: str, date_str: str, time_str: str,
                                     platform: str, meeting_link: str = '',
                                     meeting_passcode: str = ''):
        subject = f'New appointment assigned — {student_name} on {date_str}'
        rows = [
            ('Student',  student_name),
            ('Date',     date_str),
            ('Time',     time_str + ' PHT'),
            ('Format',   platform),
        ]
        if meeting_link:
            rows.append(('Meeting link',
                         f'<a href="{meeting_link}" style="color:{PRIMARY};">{meeting_link}</a>'))
            if meeting_passcode:
                rows.append(('Passcode', meeting_passcode))
        body = (
            _p(f'Hi <strong>{counselor_name}</strong>,')
            + _p('A new counseling appointment has been assigned to you. Please log in to the CPS portal to review the full case details.')
            + _detail_card(rows)
        )
        return self._send(recipient_email, subject,
                          _base_html('New Appointment Assigned', body))

    def send_reminder_email(self, recipient_email: str, student_name: str,
                             reminder_type: str, appointment_time: str):
        label   = '24 hours' if reminder_type == '24h' else '1 hour'
        subject = f'Reminder: your CPS appointment is in {label}'
        body = (
            _p(f'Hi <strong>{student_name}</strong>,')
            + _p(f'This is a reminder that your counseling appointment is coming up in <strong>{label}</strong>.')
            + _detail_card([('Appointment time', appointment_time)])
            + _info_box('Please arrive or log in on time. To reschedule, do so at least 24 hours in advance via the CPS portal.')
        )
        return self._send(recipient_email, subject,
                          _base_html(f'Appointment in {label}', body))

    def send_cancellation_email(self, recipient_email: str, recipient_name: str,
                                 appointment_date: str, cancelled_by: str,
                                 reason: str = ''):
        subject = 'CPS appointment cancelled'
        body = (
            _p(f'Hi <strong>{recipient_name}</strong>,')
            + _p(f'Your counseling appointment on <strong>{appointment_date}</strong> has been cancelled by the {cancelled_by}.')
            + (_detail_card([('Reason', reason)]) if reason else '')
            + _info_box('If you have questions or would like to rebook, please contact the CPS office or visit the portal.',
                        WARNING, WARNING_L)
        )
        return self._send(recipient_email, subject,
                          _base_html('Appointment Cancelled', body, DANGER))

    def send_denial_email(self, recipient_email: str, student_name: str,
                           appointment_id: str, reason: str):
        subject = 'CPS appointment request not approved'
        body = (
            _p(f'Hi <strong>{student_name}</strong>,')
            + _p(f'We regret to inform you that your appointment request (ID: <strong>{appointment_id}</strong>) could not be approved at this time.')
            + _detail_card([('Reason', reason)])
            + _info_box('You are welcome to submit a new appointment request. For urgent concerns, please contact the CPS office directly.',
                        WARNING, WARNING_L)
        )
        return self._send(recipient_email, subject,
                          _base_html('Request Not Approved', body, DANGER))

    def send_reschedule_notification(self, recipient_email: str, counselor_name: str,
                                      student_name: str, old_time: str,
                                      new_time: str, reason: str = ''):
        subject = f'Reschedule request — {student_name}'
        rows = [
            ('Student',            student_name),
            ('Current time',       old_time),
            ('Requested new time', new_time),
        ]
        if reason:
            rows.append(('Reason', reason))
        body = (
            _p(f'Hi <strong>{counselor_name}</strong>,')
            + _p(f'<strong>{student_name}</strong> has requested to reschedule their appointment.')
            + _detail_card(rows)
            + _info_box('Please log in to the CPS portal to approve or deny this request.')
        )
        return self._send(recipient_email, subject,
                          _base_html('Reschedule Request', body))

    def send_meeting_link_email(self, recipient_email: str, student_name: str,
                                 meeting_link: str, appointment_time: str,
                                 platform: str = 'Online'):
        subject = f'Meeting link ready — {appointment_time}'
        body = (
            _p(f'Hi <strong>{student_name}</strong>,')
            + _p(f'Your {platform} link for the counseling session on <strong>{appointment_time}</strong> is now available.')
            + _btn('Join Session', meeting_link)
            + _p(f'<span style="font-size:12px;color:#6B7280;">If the button doesn\'t work, paste this link into your browser:<br>'
                 f'<a href="{meeting_link}" style="color:{PRIMARY};">{meeting_link}</a></span>')
        )
        return self._send(recipient_email, subject,
                          _base_html('Meeting Link Ready', body))

    # ── Internal send ────────────────────────────────────────────────────────────

    def _send(self, to: str, subject: str, html: str,
              ics_content: str = None, attachment_path: str = None) -> bool:
        if not to:
            return False

        if self.dev_mode:
            print(f'\n{"="*60}')
            print(f'[EMAIL DEV] To: {to}')
            print(f'[EMAIL DEV] Subject: {subject}')
            if ics_content:
                print('[EMAIL DEV] .ics calendar invite attached')
            if attachment_path:
                print(f'[EMAIL DEV] PDF attachment: {attachment_path}')
            print(f'{"="*60}\n')
            return True

        try:
            msg = MIMEMultipart('mixed')
            msg['Subject'] = subject
            msg['From']    = self.from_email
            msg['To']      = to

            alt = MIMEMultipart('alternative')
            alt.attach(MIMEText(html, 'html'))
            msg.attach(alt)

            if ics_content:
                ics_part = MIMEText(ics_content, 'calendar', 'utf-8')
                ics_part.add_header('Content-Disposition', 'attachment; filename="appointment.ics"')
                msg.attach(ics_part)

            if attachment_path and os.path.exists(attachment_path):
                try:
                    with open(attachment_path, 'rb') as f:
                        part = MIMEBase('application', 'octet-stream')
                        part.set_payload(f.read())
                    encoders.encode_base64(part)
                    part.add_header('Content-Disposition',
                                    f'attachment; filename="{os.path.basename(attachment_path)}"')
                    msg.attach(part)
                except Exception as e:
                    print(f'⚠ Could not attach file: {e}')

            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)

            print(f'✓ Email sent to {to}')
            return True

        except Exception as e:
            print(f'✗ Email failed ({to}): {e}')
            return False

    # Keep legacy alias so old call sites still work
    def _send_email(self, to: str, subject: str, html: str,
                    attachment_path: str = None, ics_content: str = None) -> bool:
        return self._send(to, subject, html,
                          ics_content=ics_content, attachment_path=attachment_path)


# ── Module-level helpers ───────────────────────────────────────────────────────

def create_email_service() -> EmailService:
    return EmailService()


def send_email(to: str, subject: str, body: str) -> bool:
    """Send a plain-text notification as a minimal branded HTML email."""
    if not to:
        return False
    safe = (body or '').replace('\r\n', '\n')
    paragraphs = ''.join(
        f'<p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.6;">'
        f'{para.strip().replace(chr(10), "<br>")}</p>'
        for para in safe.split('\n\n') if para.strip()
    )
    html = _base_html('CPS Notification', paragraphs)
    try:
        return EmailService()._send(to, subject, html)
    except Exception as e:
        print(f'✗ send_email failed: {e}')
        return False
