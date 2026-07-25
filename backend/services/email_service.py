"""
Email Service for verification codes and notifications
Supports both SMTP and development modes
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


def _org(key, default):
    """Read org identity strings from environment at call time."""
    return os.getenv(key, default)


class EmailService:
    """Handle email sending for verification codes and notifications"""

    def __init__(self, smtp_host=None, smtp_port=None, smtp_user=None, smtp_password=None):
        self.smtp_host = smtp_host or os.getenv('SMTP_HOST')
        self.smtp_port = smtp_port or int(os.getenv('SMTP_PORT', 587))
        self.smtp_user = smtp_user or os.getenv('SMTP_USER')
        self.smtp_password = smtp_password or os.getenv('SMTP_PASSWORD')
        self.from_email = os.getenv('SMTP_FROM_EMAIL', 'noreply@dlsu-cps.edu.ph')
        
        # Development mode - just print emails
        self.dev_mode = not (self.smtp_host and self.smtp_user and self.smtp_password)
    
    @staticmethod
    def generate_verification_code(length=6):
        """Generate a random 6-digit verification code"""
        return ''.join(random.choices(string.digits, k=length))
    
    def send_verification_email(self, recipient_email, first_name, verification_code, verify_url=None):
        """Send verification email with a clickable button and code fallback"""

        org_short = _org('ORG_SHORT', 'DLSU CPS')
        subject = f"Verify Your {org_short} Account"

        button_section = f"""
            <div style="text-align:center; margin:32px 0;">
              <a href="{verify_url}"
                 style="display:inline-block; background-color:#4f46e5; color:#ffffff;
                        font-size:15px; font-weight:600; text-decoration:none;
                        padding:14px 36px; border-radius:8px; letter-spacing:0.3px;">
                Verify Email
              </a>
            </div>
            <p style="font-size:13px; color:#6b7280; margin-bottom:4px;">
              If the button above doesn't work, copy and paste this link into your browser:
            </p>
            <p style="font-size:12px; word-break:break-all;">
              <a href="{verify_url}" style="color:#4f46e5;">{verify_url}</a>
            </p>
            <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0;">
            <p style="font-size:13px; color:#6b7280;">
              Or enter this code manually on the verification page:
            </p>
        """ if verify_url else ""

        html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background-color:#4f46e5;padding:32px 40px;">
            <p style="margin:0;font-size:13px;color:#c7d2fe;font-weight:600;letter-spacing:1px;text-transform:uppercase;">
              {_org('ORG_UNIVERSITY', 'De La Salle University')} &mdash; {_org('ORG_NAME', 'Counseling &amp; Psychological Services')}
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 28px;">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">
              Welcome, {first_name}!
            </h1>
            <p style="margin:0 0 20px;font-size:14px;color:#4b5563;line-height:1.6;">
              Hi {first_name},<br><br>
              Thank you for signing up for {_org('ORG_SHORT', 'DLSU CPS')}. To complete your registration,
              please verify your email address by clicking the button below:
            </p>

            {button_section}

            <!-- Code box -->
            <div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;
                        padding:20px;text-align:center;margin:16px 0;">
              <p style="margin:0 0 8px;font-size:12px;color:#6b7280;font-weight:600;
                         text-transform:uppercase;letter-spacing:0.8px;">
                Verification Code
              </p>
              <p style="margin:0;font-size:34px;font-weight:800;letter-spacing:8px;color:#4f46e5;">
                {verification_code}
              </p>
            </div>

            <p style="margin:16px 0 0;font-size:13px;color:#6b7280;">
              This code will expire in <strong>24 hours</strong>.
            </p>
            <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">
              If you did not create this account, you can safely ignore this email.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
              {_org('ORG_UNIVERSITY', 'De La Salle University')} &mdash; {_org('ORG_NAME', 'Counseling &amp; Psychological Services')}<br>
              This is an automated email — please do not reply.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""

        return self._send_email(recipient_email, subject, html_body)
    
    def send_welcome_email(self, recipient_email, first_name):
        """Send welcome email after successful verification"""
        
        subject = f"Welcome to {_org('ORG_SHORT', 'DLSU CPS')}"
        
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #0052cc;">Account Verified Successfully!</h2>
                    
                    <p>Hi {first_name},</p>
                    
                    <p>Your email has been verified and your account is now active. You can now log in to the CPS system.</p>
                    
                    <div style="margin: 30px 0;">
                        <a href="http://127.0.0.1:3000/login" style="display: inline-block; background-color: #0052cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                            Go to Login
                        </a>
                    </div>
                    
                    <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    
                    <p style="color: #999; font-size: 12px; text-align: center;">
                        {_org('ORG_UNIVERSITY', 'De La Salle University')} &mdash; {_org('ORG_NAME', 'Counseling &amp; Psychological Services')}
                    </p>
                </div>
            </body>
        </html>
        """

        return self._send_email(recipient_email, subject, html_body)

    def send_code_reminder_email(self, recipient_email, first_name, verification_code):
        """Resend verification code"""
        
        subject = f"Your {_org('ORG_SHORT', 'DLSU CPS')} Verification Code"
        
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #0052cc;">Your Verification Code</h2>
                    
                    <p>Hi {first_name},</p>
                    
                    <p>Here's your verification code:</p>
                    
                    <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
                        <p style="font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 0; color: #0052cc;">
                            {verification_code}
                        </p>
                    </div>
                    
                    <p>This code will expire in <strong>24 hours</strong>.</p>
                </div>
            </body>
        </html>
        """
        
        return self._send_email(recipient_email, subject, html_body)
    
    def _generate_ics(self, title, start_dt, end_dt, description, location, uid):
        """Generate .ics calendar invite string (RFC 5545)."""
        def fmt(dt):
            return dt.strftime('%Y%m%dT%H%M%SZ')
        desc = (description or '').replace('\n', '\\n').replace(',', '\\,').replace(';', '\\;')
        loc  = (location  or '').replace(',', '\\,').replace(';', '\\;')
        return (
            'BEGIN:VCALENDAR\r\n'
            'VERSION:2.0\r\n'
            f'PRODID:-//{_org("ORG_SHORT","DLSU CPS")}//CPS Portal//EN\r\n'
            'METHOD:REQUEST\r\n'
            'BEGIN:VEVENT\r\n'
            f'UID:{uid}\r\n'
            f'DTSTAMP:{fmt(datetime.utcnow())}\r\n'
            f'DTSTART:{fmt(start_dt)}\r\n'
            f'DTEND:{fmt(end_dt)}\r\n'
            f'SUMMARY:{title}\r\n'
            f'DESCRIPTION:{desc}\r\n'
            f'LOCATION:{loc}\r\n'
            'STATUS:CONFIRMED\r\n'
            'SEQUENCE:0\r\n'
            'END:VEVENT\r\n'
            'END:VCALENDAR\r\n'
        )

    def _google_calendar_link(self, title, start_dt, end_dt, description, location):
        """Return an Add-to-Google-Calendar URL."""
        from urllib.parse import urlencode
        params = {
            'action': 'TEMPLATE',
            'text': title,
            'dates': f"{start_dt.strftime('%Y%m%dT%H%M%SZ')}/{end_dt.strftime('%Y%m%dT%H%M%SZ')}",
            'details': description or '',
            'location': location or '',
        }
        return 'https://calendar.google.com/calendar/render?' + urlencode(params)

    def send_appointment_confirmation_email(self, recipient_email, student_name, appointment_details, pdf_file_path=None):
        """Send appointment confirmation email.

        appointment_details keys:
          reference_id, appointment_date (str), appointment_time (str),
          platform, counselor_name, concern, meeting_link,
          start_dt (datetime, optional), end_dt (datetime, optional)
        """
        subject = f"CPS Appointment Confirmed — {appointment_details.get('appointment_date', '')} at {appointment_details.get('appointment_time', '')}"

        appointment_date = appointment_details.get('appointment_date', '')
        appointment_time = appointment_details.get('appointment_time', '')
        platform         = appointment_details.get('platform', 'In-Person')
        counselor_name   = appointment_details.get('counselor_name', 'CPS Staff')
        concern          = appointment_details.get('concern', '')
        reference_id     = appointment_details.get('reference_id', '')
        meeting_link     = appointment_details.get('meeting_link', '')

        # Build calendar section if we have datetime objects
        start_dt = appointment_details.get('start_dt')
        end_dt   = appointment_details.get('end_dt')
        ics_content = None
        calendar_section = ''

        if start_dt:
            if not end_dt:
                end_dt = start_dt + timedelta(hours=1)

            is_online = bool(meeting_link)
            location  = meeting_link if is_online else f'{_org("ORG_SHORT","DLSU CPS")} Office, De La Salle University'
            evt_desc  = (
                f'Counseling session with {counselor_name}.'
                + (f' Meeting link: {meeting_link}' if is_online else ' Please come to the CPS office.')
            )

            gcal_link = self._google_calendar_link(
                title=f'{_org("ORG_SHORT","DLSU CPS")} Counseling Appointment',
                start_dt=start_dt, end_dt=end_dt,
                description=evt_desc, location=location,
            )
            ics_content = self._generate_ics(
                title=f'{_org("ORG_SHORT","DLSU CPS")} Counseling Appointment',
                start_dt=start_dt, end_dt=end_dt,
                description=evt_desc, location=location,
                uid=f"cps-{reference_id or 'apt'}@dlsu-cps.edu.ph",
            )

            join_row = (
                f'<p style="margin:10px 0;"><strong>Meeting Link:</strong> '
                f'<a href="{meeting_link}" style="color:#1a73e8;">{meeting_link}</a></p>'
            ) if is_online else ''

            calendar_section = f"""
            <div style="text-align:center;margin:28px 0 12px;">
              <a href="{gcal_link}" target="_blank"
                 style="display:inline-block;background:#1a73e8;color:#ffffff;
                        font-size:14px;font-weight:600;text-decoration:none;
                        padding:12px 28px;border-radius:8px;letter-spacing:0.2px;">
                &#128197; Add to Google Calendar
              </a>
            </div>
            <p style="font-size:12px;color:#9ca3af;text-align:center;margin-top:4px;">
              Or open the attached <strong>appointment.ics</strong> file to add to Apple Calendar or Outlook.
            </p>"""
        else:
            join_row = (
                f'<p style="margin:10px 0;"><strong>Meeting Link:</strong> '
                f'<a href="{meeting_link}" style="color:#1a73e8;">{meeting_link}</a></p>'
            ) if meeting_link else ''

        html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

  <!-- Header -->
  <tr>
    <td style="background:#1a73e8;padding:32px 40px;">
      <p style="margin:0;font-size:13px;color:#c7d2fe;font-weight:600;letter-spacing:1px;text-transform:uppercase;">
        {_org('ORG_UNIVERSITY','De La Salle University')} &mdash; {_org('ORG_NAME','Counseling &amp; Psychological Services')}
      </p>
      <h1 style="margin:10px 0 0;font-size:22px;font-weight:700;color:#ffffff;">Appointment Confirmed &#10003;</h1>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:32px 40px 24px;">
      <p style="margin:0 0 16px;font-size:14px;color:#4b5563;line-height:1.6;">
        Hi <strong>{student_name}</strong>, your counseling appointment has been confirmed.
      </p>

      <!-- Details card -->
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:20px;">
        <p style="margin:0 0 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#6b7280;">
          Appointment Details
        </p>
        <p style="margin:10px 0;font-size:14px;color:#111827;"><strong>Ref #:</strong> {reference_id}</p>
        <p style="margin:10px 0;font-size:14px;color:#111827;"><strong>Date:</strong> {appointment_date}</p>
        <p style="margin:10px 0;font-size:14px;color:#111827;"><strong>Time:</strong> {appointment_time}</p>
        <p style="margin:10px 0;font-size:14px;color:#111827;"><strong>Format:</strong> {platform}</p>
        <p style="margin:10px 0;font-size:14px;color:#111827;"><strong>Counselor:</strong> {counselor_name}</p>
        {join_row}
        {f'<p style="margin:10px 0;font-size:14px;color:#111827;"><strong>Concern:</strong> {concern}</p>' if concern else ''}
      </div>

      {calendar_section}

      <!-- Reminders -->
      <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin-top:20px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#92400e;">Reminders</p>
        <ul style="margin:0;padding-left:18px;font-size:13px;color:#78350f;line-height:1.7;">
          <li>Arrive 10 minutes early for in-person sessions.</li>
          <li>For online sessions, ensure a stable internet connection.</li>
          <li>Reschedule at least 24 hours in advance via the CPS portal.</li>
        </ul>
      </div>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background:#f9fafb;padding:18px 40px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
        {_org('ORG_UNIVERSITY','De La Salle University')} &mdash; {_org('ORG_NAME','Counseling &amp; Psychological Services')}<br>
        <a href="mailto:{_org('SUPPORT_EMAIL','cps@dlsu.edu.ph')}" style="color:#1a73e8;text-decoration:none;">{_org('SUPPORT_EMAIL','cps@dlsu.edu.ph')}</a>
        &nbsp;&bull;&nbsp; This is an automated email — please do not reply.
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>"""

        return self._send_email(
            recipient_email, subject, html_body,
            attachment_path=pdf_file_path,
            ics_content=ics_content,
        )


    def _send_email(self, recipient_email, subject, html_body, attachment_path=None, ics_content=None):
        """Internal method to send email with optional attachments."""
        
        if self.dev_mode:
            print(f"\n{'='*60}")
            print(f"[EMAIL DEV] To: {recipient_email} | Subject: {subject}")
            if ics_content:
                print("[EMAIL DEV] .ics calendar invite attached")
            if attachment_path:
                print(f"[EMAIL DEV] File attachment: {attachment_path}")
            print(f"{'='*60}\n")
            return True

        try:
            # Use 'mixed' to allow multiple attachment types
            message = MIMEMultipart('mixed')
            message['Subject'] = subject
            message['From']    = self.from_email
            message['To']      = recipient_email

            # HTML body wrapped in 'alternative'
            alt = MIMEMultipart('alternative')
            alt.attach(MIMEText(html_body, 'html'))
            message.attach(alt)

            # .ics calendar invite
            if ics_content:
                ics_part = MIMEText(ics_content, 'calendar', 'utf-8')
                ics_part.add_header('Content-Disposition', 'attachment; filename="appointment.ics"')
                message.attach(ics_part)

            # Optional file attachment (e.g. PDF)
            if attachment_path and os.path.exists(attachment_path):
                try:
                    with open(attachment_path, 'rb') as f:
                        part = MIMEBase('application', 'octet-stream')
                        part.set_payload(f.read())
                    encoders.encode_base64(part)
                    part.add_header('Content-Disposition', f'attachment; filename="{os.path.basename(attachment_path)}"')
                    message.attach(part)
                except Exception as e:
                    print(f"⚠ Could not attach file: {e}")

            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(message)

            print(f"✓ Email sent to {recipient_email}")
            return True

        except Exception as e:
            print(f"✗ Failed to send email: {e}")
            return False


    def send_reminder_email(self, recipient_email: str, student_name: str, reminder_type: str, appointment_time: str):
        """Send appointment reminder email (24h or 1h before)."""
        label = '24 hours' if reminder_type == '24h' else '1 hour'
        subject = f"Reminder: Your CPS appointment is in {label}"
        html_body = f"""
        <html><body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4F46E5;">Appointment Reminder</h2>
            <p>Dear {student_name},</p>
            <p>This is a reminder that your counseling appointment is coming up in <strong>{label}</strong>.</p>
            <div style="background:#F0F0FF; padding:16px; border-radius:8px; border-left:4px solid #4F46E5; margin:16px 0;">
                <p style="margin:0;"><strong>Appointment time:</strong> {appointment_time}</p>
            </div>
            <p>Please arrive or log in on time. If you need to reschedule, do so at least 24 hours in advance via the CPS portal.</p>
            <hr style="border:none; border-top:1px solid #eee; margin:20px 0;">
            <p style="color:#999; font-size:12px; text-align:center;">
                {_org('ORG_UNIVERSITY', 'De La Salle University')} &mdash; {_org('ORG_NAME', 'Counseling &amp; Psychological Services')} &bull;
                <a href="mailto:{_org('SUPPORT_EMAIL', 'cps@dlsu.edu.ph')}" style="color:#4F46E5;">{_org('SUPPORT_EMAIL', 'cps@dlsu.edu.ph')}</a>
            </p>
        </div></body></html>"""

        if self.dev_mode:
            print(f"\n[EmailService DEV] REMINDER EMAIL")
            print(f"  To:      {recipient_email}")
            print(f"  Subject: {subject}")
            print(f"  Body:    Reminder for {student_name} — {appointment_time}\n")
            return True

        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.from_email
            msg['To'] = recipient_email
            msg.attach(MIMEText(html_body, 'html'))
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
            print(f"✓ Reminder email sent to {recipient_email}")
            return True
        except Exception as e:
            print(f"✗ Failed to send reminder email: {e}")
            return False


# Helper functions for use in other modules
def create_email_service():
    """Factory function to create email service"""
    return EmailService()


def send_email(to, subject, body):
    """Send a plain-text notification email.

    Convenience wrapper used by workflow notifications (intake endorsement,
    session scheduling, follow-up, case closure). Accepts a plain-text body and
    renders it as simple HTML. Returns True on success or in dev mode, False on
    failure — callers treat delivery as best-effort and never block on it.
    """
    if not to:
        return False
    safe = (body or '').replace('\r\n', '\n')
    paragraphs = ''.join(
        f'<p style="margin:0 0 12px;">{para.strip().replace(chr(10), "<br>")}</p>'
        for para in safe.split('\n\n') if para.strip()
    )
    html_body = (
        '<html><body style="font-family: Arial, sans-serif; color:#333; line-height:1.6;">'
        f'<div style="max-width:600px; margin:0 auto; padding:20px;">{paragraphs}</div>'
        '</body></html>'
    )
    try:
        return create_email_service()._send_email(to, subject, html_body)
    except Exception as e:
        print(f"✗ send_email failed: {e}")
        return False
