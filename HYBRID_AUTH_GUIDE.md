# Hybrid Authentication System - Email + OAuth2.0

Your CPS reservation system now supports **both email/password and Google OAuth2.0 authentication**, eliminating the "hanging" issue and providing flexibility.

## How It Works

### Two Authentication Methods

#### 1. Email/Password (Traditional)
- Register with @dlsu.edu.ph email and password
- Verify email with 6-digit code (sent to inbox)
- Login with email and password
- Email verification required before access

#### 2. Google OAuth2.0
- Sign in with Google using @dlsu.edu.ph account
- Account auto-created on first login
- Auto-verified (no code needed)
- Profile data (name, picture) pulled from Google

## Frontend Flow

### Login Page
- **Two tabs**: "Email" and "Google"
- Switch between methods easily
- Email tab: Traditional email/password form
- Google tab: Google Sign-In button
- Both enforce @dlsu.edu.ph domain

### Register Page
- Create account with email/password
- Verify email with 6-digit code
- OR use Google OAuth via login page

## Backend Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/register` | Register with email/password |
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/verify-email` | Verify email code |
| POST | `/api/auth/resend-code` | Resend verification code |
| GET | `/api/auth/oauth/google/client-id` | Get Google Client ID |
| POST | `/api/auth/oauth/google/callback` | OAuth callback handler |

## User Account Flow

### Email Registration Flow
```
User fills register form
     ↓
Account created (not verified)
     ↓
Verification code sent to email
     ↓
User verifies code
     ↓
Can now login
```

### Google OAuth Flow
```
User clicks "Sign in with Google"
     ↓
Google authentication
     ↓
Account auto-created (if new)
     ↓
Auto-verified
     ↓
Logged in immediately
```

## Database Schema

Users now have optional fields:
- `password_hash` - NULL for OAuth users
- `is_verified` - Required for email users, auto-true for OAuth
- `verification_code` - Only for email verification
- `oauth_provider` - "google" or null
- `oauth_id` - Google user ID
- `picture` - Profile picture from Google

## Security Features

✅ **Domain Restriction**: @dlsu.edu.ph only
✅ **Email Verification**: Required for email-based accounts
✅ **Rate Limiting**: 5 failed verification attempts blocked
✅ **Code Expiry**: 24-hour expiration on verification codes
✅ **Token Verification**: Google tokens validated server-side
✅ **Audit Logging**: All auth events tracked
✅ **JWT Tokens**: Secure session tokens

## Development Setup

### 1. Backend (.env)
```env
# Gmail/Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com

# Google OAuth (required for OAuth)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

### 2. Frontend (.env.local)
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### 3. Start Services
```bash
# Backend
cd backend
source .venv/bin/activate
python3 app.py

# Frontend (new terminal)
cd frontend
npm run dev
```

## Testing the System

### Test Email Registration
1. Go to `http://localhost:3000/register`
2. Fill in: name, email, password
3. Should see: "Check your email for verification code"
4. Look for code in console (dev mode) or email inbox (prod)
5. Go to `http://localhost:3000/verify-email`
6. Enter code
7. Should redirect to login

### Test Email Login
1. Go to `http://localhost:3000/login`
2. Select "Email" tab
3. Enter email and password
4. Should redirect to dashboard

### Test Google OAuth
1. Go to `http://localhost:3000/login`
2. Select "Google" tab
3. Click Google Sign-In button
4. Sign with @dlsu.edu.ph Google account
5. Should auto-create account and login
6. Should redirect to dashboard

## Troubleshooting

### "Loading..." on Google button
- Check if `GOOGLE_CLIENT_ID` is set in backend
- Check browser console for errors
- Verify Google script loading

### Email verification code not received
- **Dev mode**: Check backend console for printed code
- **Prod mode**: Check email inbox and spam folder
- Ensure `SMTP_*` variables are set correctly

### "Only DLSU emails allowed"
- Used non-@dlsu.edu.ph email
- Gmail account needs to be linked to DLSU domain

### OAuth fails after registration
- Google Client ID/Secret might be wrong
- Check that authorized URIs match your domain

## Environment Variables Reference

### Required for OAuth
- `GOOGLE_CLIENT_ID` - From Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - From Google Cloud Console

### Optional for Email Verification
- `SMTP_HOST` - Email server (default: localhost)
- `SMTP_PORT` - Email port (default: 1025)
- `SMTP_USER` - Email account
- `SMTP_PASSWORD` - Email password
- `SMTP_FROM_EMAIL` - Sender email address

## Switching Modes

### Email Mode (Console Output)
Default - verification codes print to backend console. Useful for development.

### Email Mode (SMTP)
Set `SMTP_*` environment variables to send real emails.

## API Response Examples

### Register Success
```json
{
  "message": "Account created. Please check your email for verification code.",
  "email": "student@dlsu.edu.ph",
  "user_id": "507f1f77bcf86cd799439011"
}
```

### Login Success
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user_id": "507f1f77bcf86cd799439011",
  "email": "student@dlsu.edu.ph",
  "first_name": "John",
  "last_name": "Doe",
  "role": "student"
}
```

### Email Not Verified (403)
```json
{
  "error": "Email not verified. Please check your email for verification code.",
  "user_id": "507f1f77bcf86cd799439011",
  "email": "student@dlsu.edu.ph"
}
```

## User Experience

Users now see:
1. **Login page** with choice of Email or Google
2. **Register page** for email-based registration  
3. **Verification page** for email code entry (if email method)
4. **Dashboard** after authentication

No more hanging - both methods work reliably!

## Future Enhancements

- [ ] SMS verification backup
- [ ] Two-factor authentication (2FA)
- [ ] Account linking (link Google to existing email account)
- [ ] Social login (GitHub, Microsoft)
- [ ] Passwordless email login (magic links)
- [ ] Remember device option

## Support

For issues with:
- **Email verification**: Check SMTP settings and email inbox
- **Google OAuth**: Verify Client ID/Secret in Google Cloud Console
- **Both not working**: Check browser console and backend logs

See `GOOGLE_OAUTH_SETUP.md` for detailed OAuth setup instructions.
