"""Email integration (SMTP / Gmail send) stub"""
import smtplib
from email.mime.text import MIMEText
import base64
import requests
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from .token_store import get_tokens, save_tokens
from datetime import datetime, timedelta

class EmailIntegration:
    def __init__(self, config):
        # Handle both dict-like and object-like config
        if hasattr(config, 'get'):  # dict-like
            self.host = config.get('SMTP_HOST')
            self.port = config.get('SMTP_PORT', 587)
            self.user = config.get('SMTP_USER')
            self.password = config.get('SMTP_PASS')
        else:  # object-like
            self.host = getattr(config, 'SMTP_HOST', None)
            self.port = getattr(config, 'SMTP_PORT', 587)
            self.user = getattr(config, 'SMTP_USER', None)
            self.password = getattr(config, 'SMTP_PASS', None)

    def send_email(self, to_address, subject, html_body, text_body=None):
        # Don't send if no email
        if not to_address:
            print("⚠️ No email address provided, skipping email send")
            return False
            
        msg = MIMEText(html_body, 'html')
        msg['Subject'] = subject
        msg['From'] = self.user or 'no-reply@example.com'
        msg['To'] = to_address

        try:
            print(f"📧 Attempting to send email via {self.host}:{self.port}")
            with smtplib.SMTP(self.host, self.port, timeout=10) as smtp:
                smtp.starttls()
                if self.user and self.password:
                    print(f"📧 Logging in as {self.user}")
                    smtp.login(self.user, self.password)
                print(f"📧 Sending message from {msg['From']} to {to_address}")
                smtp.sendmail(msg['From'], [to_address], msg.as_string())
            print(f"✅ EMAIL SENT SUCCESSFULLY to {to_address}")
            return True
        except smtplib.SMTPAuthenticationError as e:
            print(f"❌ SMTP Authentication Failed: {e}")
            print(f"   Check SMTP_USER and SMTP_PASS in .env")
            return False
        except smtplib.SMTPException as e:
            print(f"❌ SMTP Error: {e}")
            return False
        except Exception as e:
            print(f"❌ Email send failed: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            return False

    def send_via_gmail(self, db, config, user_id, to_address, subject, html_body, text_body=None):
        """Send email via Gmail API using stored Google OAuth tokens for `user_id`."""
        # Retrieve tokens
        tokens = get_tokens(db, config, user_id, 'google')
        if not tokens:
            raise RuntimeError('No Google tokens found for user')

        access = tokens.get('access_token')
        refresh = tokens.get('refresh_token')

        def _send_with_access(token):
            url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'
            # Build RFC2822 message
            raw_msg = MIMEText(html_body, 'html')
            raw_msg['To'] = to_address
            raw_msg['From'] = self.user or 'me'
            raw_msg['Subject'] = subject
            import base64
            raw_b64 = base64.urlsafe_b64encode(raw_msg.as_bytes()).decode()
            resp = requests.post(url, json={'raw': raw_b64}, headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}, timeout=10)
            if resp.status_code == 401 and refresh:
                return None, 'refresh'
            resp.raise_for_status()
            return resp.json(), None

        try:
            result, action = _send_with_access(access)
        except requests.HTTPError as e:
            # If unauthorized and refresh token exists, try refreshing
            if e.response.status_code == 401 and refresh:
                action = 'refresh'
            else:
                raise

        if action == 'refresh':
            # Refresh access token
            token_url = 'https://oauth2.googleapis.com/token'
            data = {
                'client_id': config.GOOGLE_CLIENT_ID,
                'client_secret': config.GOOGLE_CLIENT_SECRET,
                'refresh_token': refresh,
                'grant_type': 'refresh_token'
            }
            r = requests.post(token_url, data=data, timeout=10)
            r.raise_for_status()
            new_tokens = r.json()
            new_access = new_tokens.get('access_token')
            expires_in = new_tokens.get('expires_in')
            expires_at = None
            if expires_in:
                expires_at = datetime.utcnow() + timedelta(seconds=int(expires_in))
            # Save updated tokens
            save_tokens(db, config, user_id, 'google', new_access, refresh, expires_at=expires_at)
            # Retry send
            result, _ = _send_with_access(new_access)

        return result
