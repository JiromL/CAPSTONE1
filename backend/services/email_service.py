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
    
    def send_verification_email(self, recipient_email, first_name, verification_code):
        """Send email with verification code"""
        
        subject = "Verify Your DLSU CPS Account"
        
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #0052cc;">Welcome to DLSU Counseling & Psychological Services</h2>
                    
                    <p>Hi {first_name},</p>
                    
                    <p>Thank you for registering! To complete your registration, please verify your email address using the code below:</p>
                    
                    <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
                        <p style="font-size: 14px; margin: 0 0 10px 0; color: #666;">Your Verification Code:</p>
                        <p style="font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 0; color: #0052cc;">
                            {verification_code}
                        </p>
                    </div>
                    
                    <p>This code will expire in <strong>24 hours</strong>.</p>
                    
                    <p style="color: #999; font-size: 12px;">
                        If you didn't register for this account, please ignore this email.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    
                    <p style="color: #999; font-size: 12px; text-align: center;">
                        DLSU Counseling & Psychological Services<br>
                        De La Salle University
                    </p>
                </div>
            </body>
        </html>
        """
        
        return self._send_email(recipient_email, subject, html_body)
    
    def send_welcome_email(self, recipient_email, first_name):
        """Send welcome email after successful verification"""
        
        subject = "Welcome to DLSU CPS"
        
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
                        DLSU Counseling & Psychological Services<br>
                        De La Salle University
                    </p>
                </div>
            </body>
        </html>
        """
        
        return self._send_email(recipient_email, subject, html_body)
    
    def send_code_reminder_email(self, recipient_email, first_name, verification_code):
        """Resend verification code"""
        
        subject = "Your DLSU CPS Verification Code"
        
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
                        DLSU Counseling & Psychological Services<br>
                        De La Salle University<br>
                        <a href="mailto:cps@dlsu.edu.ph" style="color: #0052cc; text-decoration: none;">cps@dlsu.edu.ph</a><br>
                        Phone: +63 2 XXXX-XXXX
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


# Helper functions for use in other modules
def create_email_service():
    """Factory function to create email service"""
    return EmailService()
