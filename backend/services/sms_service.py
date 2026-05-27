"""
SMS notification stub service.
Ready to wire to a real SMS provider (Twilio, Semaphore, etc.).
Set SMS_PROVIDER, SMS_API_KEY, SMS_SENDER_ID in environment variables to enable.

To activate Twilio:
  SMS_PROVIDER=twilio
  TWILIO_ACCOUNT_SID=...
  TWILIO_AUTH_TOKEN=...
  TWILIO_FROM=+1...

To activate Semaphore (Philippines):
  SMS_PROVIDER=semaphore
  SEMAPHORE_API_KEY=...
  SMS_SENDER_ID=DLSU_CPS
"""

import os


class SMSService:
    def __init__(self):
        self.provider = os.getenv('SMS_PROVIDER', '').lower()
        self.dev_mode = not self.provider

    def send_sms(self, phone_number: str, message: str) -> bool:
        """Send an SMS. Returns True on success, False on failure."""
        if not phone_number:
            return False

        if self.dev_mode:
            print(f"[SMS-STUB] To: {phone_number} | Message: {message}")
            return True

        if self.provider == 'twilio':
            return self._send_twilio(phone_number, message)
        if self.provider == 'semaphore':
            return self._send_semaphore(phone_number, message)

        print(f"[SMS] Unknown provider '{self.provider}'. Message not sent.")
        return False

    def send_appointment_reminder(self, phone: str, student_name: str,
                                  appointment_time: str, reminder_type: str = '24h') -> bool:
        label = '24 hours' if reminder_type == '24h' else '1 hour'
        org_short = os.getenv('ORG_SHORT', 'DLSU CPS')
        msg = (
            f"Hi {student_name}, this is a reminder that your {org_short} counseling "
            f"appointment is in {label} ({appointment_time}). "
            f"Reply STOP to opt out."
        )
        return self.send_sms(phone, msg)

    def send_safety_plan_follow_up(self, phone: str, student_name: str, counselor_name: str) -> bool:
        org_short = os.getenv('ORG_SHORT', 'DLSU CPS')
        msg = (
            f"Hi {student_name}, your counselor {counselor_name} at {org_short} is checking in on you. "
            f"Please reach out if you need support. Crisis line: 1553."
        )
        return self.send_sms(phone, msg)

    # ── Provider implementations ──────────────────────────────────────────────

    def _send_twilio(self, phone: str, message: str) -> bool:
        try:
            from twilio.rest import Client
            client = Client(
                os.getenv('TWILIO_ACCOUNT_SID'),
                os.getenv('TWILIO_AUTH_TOKEN'),
            )
            client.messages.create(
                body=message,
                from_=os.getenv('TWILIO_FROM'),
                to=phone,
            )
            return True
        except Exception as e:
            print(f"[SMS-Twilio] Error: {e}")
            return False

    def _send_semaphore(self, phone: str, message: str) -> bool:
        try:
            import requests
            resp = requests.post('https://api.semaphore.co/api/v4/messages', data={
                'apikey': os.getenv('SEMAPHORE_API_KEY'),
                'number': phone,
                'message': message,
                'sendername': os.getenv('SMS_SENDER_ID', 'DLSU_CPS'),
            }, timeout=10)
            return resp.status_code == 200
        except Exception as e:
            print(f"[SMS-Semaphore] Error: {e}")
            return False
