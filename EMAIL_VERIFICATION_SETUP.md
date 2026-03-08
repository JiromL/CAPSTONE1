# Email Verification System

## Overview

The email verification system handles user registration with email confirmation for DLSU accounts only (@dlsu.edu.ph domain).

## Features

- **DLSU Domain Restriction**: Only @dlsu.edu.ph email addresses can register
- **6-Digit Verification Codes**: Randomly generated codes with 24-hour expiration
- **Email Delivery**: Support for both production SMTP and development console output
- **Resend Functionality**: Users can request new codes if expired
- **Rate Limiting**: Maximum 5 failed verification attempts per code
- **Account State**: Accounts created but not verified cannot login

## Flow

### 1. Registration
```
User fills registration form
↓
Backend validates email domain (@dlsu.edu.ph)
↓
Create unverified user account
↓
Generate 6-digit code (24h expiry)
↓
Send email with code
↓
Redirect to /verify-email
```

### 2. Email Verification
```
User enters 6-digit code
↓
Backend validates code (checks expiry, attempts)
↓
Mark account as verified
↓
Send welcome email
↓
User can now login
```

### 3. Resend Code
```
User clicks "Resend Code"
↓
Backend generates new code (24h expiry)
↓
Reset verification attempts to 0
↓
Send email with new code
```

## Configuration

### Development Mode (Default)

In development, emails are printed to console. No configuration needed:

```bash
cd backend
python app.py
```

Console output will show:
```
============================================================
[EMAIL MODE: DEVELOPMENT]
To: student@dlsu.edu.ph
Subject: Verify Your DLSU CPS Account
============================================================
[HTML email content]
============================================================
```

### Production Mode (SMTP)

Set environment variables to enable SMTP:

```bash
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=587
export SMTP_USER=your-email@gmail.com
export SMTP_PASSWORD=your-app-password
export SMTP_FROM_EMAIL=noreply@dlsu-cps.edu.ph
```

**Gmail Setup:**
1. Enable 2-Factor Authentication on Google Account
2. Create App Password: https://myaccount.google.com/apppasswords
3. Use 16-character app password as SMTP_PASSWORD

**Alternative SMTP Providers:**
- SendGrid: `smtp.sendgrid.net:587`
- AWS SES: `email-smtp.{region}.amazonaws.com:587`
- Microsoft 365: `smtp.office365.com:587`

## API Endpoints

### POST /api/auth/register

Register new user with email verification

**Request:**
```json
{
  "email": "student@dlsu.edu.ph",
  "password": "securepassword",
  "first_name": "Juan",
  "last_name": "Dela Cruz"
}
```

**Response (201):**
```json
{
  "message": "Account created. Please check your email for verification code.",
  "email": "student@dlsu.edu.ph",
  "user_id": "507f1f77bcf86cd799439011"
}
```

**Errors:**
- `400`: Missing fields or invalid email domain
- `409`: Email already exists (verified)

### POST /api/auth/verify-email

Verify email with confirmation code

**Request:**
```json
{
  "email": "student@dlsu.edu.ph",
  "code": "123456"
}
```

**Response (200):**
```json
{
  "message": "Email verified successfully. You can now login."
}
```

**Errors:**
- `400`: Missing fields, email already verified
- `401`: Invalid code
- `403`: Too many failed attempts (429)
- `404`: Email not found

### POST /api/auth/resend-code

Request new verification code

**Request:**
```json
{
  "email": "student@dlsu.edu.ph"
}
```

**Response (200):**
```json
{
  "message": "Verification code sent to your email"
}
```

**Errors:**
- `400`: Missing email
- `404`: Email not found

### POST /api/auth/login

Login after email verification

**Request:**
```json
{
  "email": "student@dlsu.edu.ph",
  "password": "securepassword"
}
```

**Response (200):**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user_id": "507f1f77bcf86cd799439011",
  "email": "student@dlsu.edu.ph",
  "first_name": "Juan",
  "last_name": "Dela Cruz",
  "role": "student"
}
```

**Errors:**
- `401`: Invalid credentials
- `403`: Email not verified (returns user_id for retry)
- `403`: Account inactive

## Database Fields

User documents now include:

```javascript
{
  // ... existing fields
  "is_verified": false,              // Email verification status
  "verification_code": "123456",     // 6-digit code
  "verification_code_expires": ISODate("2024-01-15T10:30:00Z"),  // 24h from creation
  "verification_attempts": 0         // Failed attempts counter
}
```

## Email Templates

### Verification Email
- Subject: "Verify Your DLSU CPS Account"
- Body: HTML email with 6-digit code displayed prominently
- Link: None (user copies code manually)

### Welcome Email
- Subject: "Welcome to DLSU CPS"
- Body: Confirmation message with login link
- Sent: After successful verification

### Resend Email
- Subject: "Your DLSU CPS Verification Code"
- Body: New 6-digit code
- Sent: When user requests resend

## Frontend Pages

### /register
- Registration form (first_name, last_name, email, password)
- Email domain hint
- Auto-redirects to /verify-email on success

### /verify-email
- Email confirmation input (masked 6-digit field)
- "Resend Code" button with 60-second cooldown
- Auto-redirects to /login on success
- Shows email address for reference

## Security Notes

1. **DLSU Domain Only**: Only @dlsu.edu.ph emails accepted
2. **Time-Limited Codes**: Codes expire after 24 hours
3. **Rate Limiting**: Max 5 failed attempts per code generation
4. **Password Hashing**: Passwords hashed with Werkzeug security
5. **No Unverified Logins**: Unverified accounts cannot login
6. **Audit Trail**: All actions logged for security review

## Testing

### Manual Test Flow

1. **Register**:
```bash
curl -X POST http://127.0.0.1:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@dlsu.edu.ph",
    "password": "testpass123",
    "first_name": "Test",
    "last_name": "User"
  }'
```

2. **Copy verification code from console output**

3. **Verify Email**:
```bash
curl -X POST http://127.0.0.1:8000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@dlsu.edu.ph",
    "code": "123456"
  }'
```

4. **Login**:
```bash
curl -X POST http://127.0.0.1:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@dlsu.edu.ph",
    "password": "testpass123"
  }'
```

## Troubleshooting

### Emails not sending in production
- Check SMTP credentials in environment variables
- Verify firewall allows port 587 (or configured port)
- Check email provider's rate limits

### Code expired too quickly
- Verify system clock is synchronized
- Check code expiry is set to 24 hours (timedelta(hours=24))

### User can't login after verification
- Verify is_verified flag is set to true
- Check is_active flag is true
- Review audit logs for verification events

### Too many failed attempts
- User must request new code via resend endpoint
- Resend resets attempts counter to 0

## Future Enhancements

- SMS verification option
- Backup email addresses
- Two-factor authentication (2FA)
- Session management improvements
- Email provider analytics/tracking
