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
    
    def _send_email(self, recipient_email, subject, html_body):
        """Internal method to send email"""
        
        if self.dev_mode:
            print(f"\n{'='*60}")
            print(f"[EMAIL MODE: DEVELOPMENT]")
            print(f"To: {recipient_email}")
            print(f"Subject: {subject}")
            print(f"{'='*60}")
            print(html_body)
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
