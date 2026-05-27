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
    
    def send_appointment_confirmation_email(self, recipient_email, student_name, appointment_details, pdf_file_path=None):
        """Send appointment confirmation email with optional PDF attachment
        
        Args:
            recipient_email: Email address of student
            student_name: Full name of student
            appointment_details: Dict containing appointment info:
                - reference_id: Confirmation number
                - appointment_date: Date of appointment
                - appointment_time: Time of appointment
                - platform: Meeting platform (In-Person, Google Meet, Zoom)
                - counselor_name: Name of assigned counselor
                - concern: Primary concern (optional)
        pdf_file_path: Path to confirmation PDF file to attach
        """
        
        subject = f"Your Appointment Confirmation - {appointment_details.get('reference_id', 'CPS')}"
        
        appointment_date = appointment_details.get('appointment_date', '')
        appointment_time = appointment_details.get('appointment_time', '')
        platform = appointment_details.get('platform', 'In-Person')
        counselor_name = appointment_details.get('counselor_name', 'CPS Staff')
        concern = appointment_details.get('concern', '')
        reference_id = appointment_details.get('reference_id', '')
        
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1B5E20; text-align: center;">Appointment Confirmed</h2>
                    
                    <p>Dear {student_name},</p>
                    
                    <p>Thank you for scheduling an appointment with the Counseling and Psychological Services (CPS). Your appointment has been confirmed.</p>
                    
                    <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #1B5E20;">
                        <h3 style="color: #1B5E20; margin-top: 0;">Appointment Details</h3>
                        <p style="margin: 10px 0;"><strong>Confirmation Number:</strong> {reference_id}</p>
                        <p style="margin: 10px 0;"><strong>Date:</strong> {appointment_date}</p>
                        <p style="margin: 10px 0;"><strong>Time:</strong> {appointment_time}</p>
                        <p style="margin: 10px 0;"><strong>Format:</strong> {platform}</p>
                        <p style="margin: 10px 0;"><strong>Counselor:</strong> {counselor_name}</p>
                        {f'<p style="margin: 10px 0;"><strong>Concern:</strong> {concern}</p>' if concern else ''}
                    </div>
                    
                    <div style="background-color: #FFF3E0; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #FF6F00;">
                        <h4 style="margin-top: 0; color: #E65100;">Important Notes:</h4>
                        <ol style="margin: 0; padding-left: 20px;">
                            <li>Please arrive 10 minutes early for in-person appointments.</li>
                            <li>If meeting via Google Meet or Zoom, ensure you have a stable internet connection.</li>
                            <li>If you need to reschedule, contact us at least 24 hours before your appointment.</li>
                            <li>Your appointment confirmation document has been attached for your reference.</li>
                        </ol>
                    </div>
                    
                    <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    
                    <p style="color: #999; font-size: 12px; text-align: center;">
                        {_org('ORG_UNIVERSITY', 'De La Salle University')} &mdash; {_org('ORG_NAME', 'Counseling &amp; Psychological Services')}<br>
                        <a href="mailto:{_org('SUPPORT_EMAIL', 'cps@dlsu.edu.ph')}" style="color: #0052cc; text-decoration: none;">{_org('SUPPORT_EMAIL', 'cps@dlsu.edu.ph')}</a>
                    </p>
                </div>
            </body>
        </html>
        """
        
        return self._send_email(recipient_email, subject, html_body, attachment_path=pdf_file_path)
    

    def _send_email(self, recipient_email, subject, html_body, attachment_path=None):
        """Internal method to send email with optional file attachment"""
        
        if self.dev_mode:
            print(f"\n{'='*60}")
            print(f"[EMAIL MODE: DEVELOPMENT]")
            print(f"To: {recipient_email}")
            print(f"Subject: {subject}")
            print(f"{'='*60}")
            print(html_body)
            if attachment_path:
                print(f"[ATTACHMENT]: {attachment_path}")
            print(f"{'='*60}\n")
            return True
        
        try:
            # Create message
            message = MIMEMultipart('alternative')
            message['Subject'] = subject
            message['From'] = self.from_email
            message['To'] = recipient_email
            
            # Attach HTML
            message.attach(MIMEText(html_body, 'html'))
            
            # Attach file if provided
            if attachment_path and os.path.exists(attachment_path):
                try:
                    with open(attachment_path, 'rb') as attachment:
                        part = MIMEBase('application', 'octet-stream')
                        part.set_payload(attachment.read())
                    
                    encoders.encode_base64(part)
                    filename = os.path.basename(attachment_path)
                    part.add_header('Content-Disposition', f'attachment; filename= {filename}')
                    message.attach(part)
                    print(f"✓ Attached file: {filename}")
                except Exception as e:
                    print(f"⚠ Could not attach file: {e}")
            
            # Send via SMTP
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
