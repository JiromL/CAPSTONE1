# Email Verification System - Quick Start Guide

## System Overview

Your DLSU CPS system now has a complete email verification system that:
- ✓ Restricts registration to @dlsu.edu.ph email addresses only
- ✓ Requires email confirmation with 6-digit codes
- ✓ 24-hour code expiry for security
- ✓ Prevents unverified accounts from logging in
- ✓ Works in development mode (no email setup needed)
- ✓ Ready for production email when configured

## Quick Start (Development)

### 1. Start the System

**Terminal 1 - Backend:**
```bash
cd backend
python app.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Both should be running on:
- Backend: http://127.0.0.1:8000
- Frontend: http://127.0.0.1:3000

### 2. Test Registration

Open browser to: **http://localhost:3000/register**

Fill in:
```
First Name:  Test
Last Name:   User
Email:       testuser@dlsu.edu.ph
Password:    TestPass123
```

Click "Register"

### 3. Check Backend Console

In Terminal 1 (Backend), you should see:

```
============================================================
[EMAIL MODE: DEVELOPMENT]
To: testuser@dlsu.edu.ph
Subject: Verify Your DLSU CPS Account
============================================================
<HTML email with 6-digit code>
============================================================
```

**👉 Copy the 6-digit code** from the console (e.g., `123456`)

### 4. Verify Email

Frontend automatically redirects to: **http://localhost:3000/verify-email?email=testuser@dlsu.edu.ph&user_id=...**

Paste the 6-digit code you copied and click "Verify Email"

You should see: ✅ "Email verified successfully! Redirecting to login..."

### 5. Login

You're now redirected to: **http://localhost:3000/login**

Login with:
```
Email:    testuser@dlsu.edu.ph
Password: TestPass123
```

Success! You're now logged in as a verified user.

## Testing Different Scenarios

### Scenario 1: Invalid Domain
Try registering with email that's not @dlsu.edu.ph:
```
Email: student@gmail.com
```
Result: ❌ "Only DLSU email addresses (@dlsu.edu.ph) are allowed"

### Scenario 2: Missing Fields
Try registering without entering a password:
Result: ❌ "Missing required fields: email, password, first_name, last_name"

### Scenario 3: Wrong Code
At verification page, enter wrong code (e.g., `000000`):
Result: ❌ "Invalid verification code" (after 5 attempts: "Too many failed attempts")

### Scenario 4: Try Login Before Verification
After registration, try logging in without verifying email:
Result: ❌ "Email not verified. Please check your email for verification code."

### Scenario 5: Resend Code
Click "Resend Code" if code expired or lost:
Result: ✅ New code sent (appears in backend console)
- 60-second cooldown between resends
- New code has fresh 24-hour expiry
- Attempt counter resets to 0

## API Endpoints Reference

### POST /api/auth/register
Register new user
```json
{
  "email": "student@dlsu.edu.ph",
  "password": "securepass",
  "first_name": "Juan",
  "last_name": "Dela Cruz"
}
```
Response: 201 (includes user_id for verification)

### POST /api/auth/verify-email
Verify email with code
```json
{
  "email": "student@dlsu.edu.ph",
  "code": "123456"
}
```
Response: 200 (account activated)

### POST /api/auth/resend-code
Request new verification code
```json
{
  "email": "student@dlsu.edu.ph"
}
```
Response: 200 (new code sent)

### POST /api/auth/login
Login after verification
```json
{
  "email": "student@dlsu.edu.ph",
  "password": "securepass"
}
```
Response: 200 (JWT token included)

## Using Test Script

Run automated tests:
```bash
python3 test_email_verification.py
```

Output shows pass/fail for:
- ✓ Domain validation
- ✓ Missing field validation
- ✓ Registration success
- ✓ Invalid code rejection
- ✓ Unverified login blocking
- ✓ Code resend

## Production Setup (Optional)

To use real email instead of console output:

### Gmail Setup:
```bash
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=587
export SMTP_USER=your-email@gmail.com
export SMTP_PASSWORD=your-16-char-app-password
export SMTP_FROM_EMAIL=noreply@dlsu-cps.edu.ph
```

Get Gmail app password:
1. Enable 2-Factor Authentication: https://myaccount.google.com/security
2. Create app password: https://myaccount.google.com/apppasswords
3. Use 16-character password as SMTP_PASSWORD

### Other Email Providers:
See `EMAIL_VERIFICATION_SETUP.md` for SendGrid, AWS SES, Office365, etc.

## System Architecture

### Database Schema (User Document)
```javascript
{
  _id: ObjectId,
  email: "student@dlsu.edu.ph",
  password_hash: "bcrypt_hashed",
  first_name: "Juan",
  last_name: "Dela Cruz",
  is_verified: false,                    // Email verification status
  verification_code: "123456",           // 6-digit code
  verification_code_expires: ISODate(),  // Expiry (24 hours)
  verification_attempts: 0,              // Failed attempts (max 5)
  role: "student",
  is_active: true,
  created_at: ISODate(),
  updated_at: ISODate()
}
```

### Email Templates

**Verification Email:**
- Prominently displays 6-digit code
- Explains 24-hour expiry
- No action links (code only)

**Welcome Email:**
- Confirmation of verified status
- Link to login page
- Contact info for support

**Resend Email:**
- New 6-digit code
- Same format as verification email

### Request Flow

```
Browser                          Backend                      DB
  |                               |                           |
  |--- Register Form ------------>|                           |
  |    (email, password, name)     |                           |
  |                               |--- Validate Domain -------|
  |                               |--- Generate Code ---------|
  |                               |--- Create User ---------->|
  |                               |--- Send Email (console)
  |<---- Success + Redirect ------|
  |
  |--- Verify Email Page
  |    (paste code from console)
  |
  |--- Submit Code  ------------->|
  |                               |--- Validate Code ---------|
  |                               |--- Update User (verified)-|
  |<---- Success + Redirect ------|
  |
  |--- Login Page
  |    (email, password)
  |
  |--- Submit Login  ------------->|
  |                               |--- Check is_verified ----|
  |                               |--- Return JWT Token ------|
  |<---- JWT Token + Redirect -----|
```

## Troubleshooting

### Problem: Code not appearing in console
- Check Terminal 1 is running backend
- Wait a few seconds after "Register" button
- Scroll up in terminal if console is full

### Problem: Code expired message
- Codes expire after 24 hours
- Use "Resend Code" button to get fresh code
- Verify your system clock is correct

### Problem: Too many attempts message
- You tried 5 wrong codes
- Click "Resend Code" to get fresh code
- Attempt counter resets with new code

### Problem: Email domain error on non-DLSU address
- System only accepts @dlsu.edu.ph
- This is correct - working as designed
- For testing: ask admin to add users manually if needed

### Problem: Can't login after verification
- Check you received "verification successful" message
- Try logging out and back in
- Check email address capitalization (should be lowercase)

## Files Location

### Backend
- Email Service: `backend/services/email_service.py`
- Auth Routes: `backend/blueprints/auth.py`

### Frontend
- Registration: `frontend/src/app/register/page.tsx`
- Verification: `frontend/src/app/verify-email/page.tsx`

### Documentation
- Complete Setup: `EMAIL_VERIFICATION_SETUP.md` (detailed reference)
- Implementation: `EMAIL_VERIFICATION_IMPLEMENTATION.md` (technical details)
- Tests: `test_email_verification.py` (automated testing)
- This Guide: `EMAIL_VERIFICATION_QUICK_START.md` (you are here)

## Next Steps

### For Development:
1. ✅ Test with multiple accounts
2. ✅ Try all error scenarios
3. ✅ Verify database shows is_verified status
4. ✅ Check audit logs for verification events

### For Production:
1. Set up SMTP with Gmail/SendGrid/AWS SES
2. Configure environment variables
3. Test end-to-end with real email
4. Set up email monitoring/analytics
5. Configure recovery procedures

### Future Enhancements:
- SMS verification option
- Two-factor authentication
- Admin user management dashboard
- Verification code analytics

## Support

See full documentation in:
- `EMAIL_VERIFICATION_SETUP.md` - Complete technical reference
- `EMAIL_VERIFICATION_IMPLEMENTATION.md` - What was added
- `test_email_verification.py` - Run to verify system works

## Important Notes

✅ Development mode needs NO email setup - codes appear in console
✅ System is production-ready but uses console email by default
✅ Only @dlsu.edu.ph emails allowed - enforced at registration
✅ Unverified accounts cannot login - security by design
✅ All verification events logged to audit_logs collection
✅ Codes valid 24 hours with 5-attempt rate limiting

Happy testing! 🎉
