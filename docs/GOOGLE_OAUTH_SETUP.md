# Google OAuth2.0 Setup Guide

This guide explains how to set up Google OAuth2.0 for the CPS (Campus Counseling Services) reservation system. The system now uses Google OAuth for authentication instead of email verification.

## Overview

- **Authentication Method**: Google OAuth2.0
- **Supported Emails**: @dlsu.edu.ph only (DLSU Gmail accounts)
- **Auto Registration**: New users are automatically created on first login
- **No Passwords**: OAuth eliminates the need for password management

## Prerequisites

1. Google Cloud Project (free tier works)
2. Google Admin access to DLSU domain (for deployment)
3. Environment variables configured

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a Project** → **New Project**
3. Name it: `CPS-Reservation-System`
4. Click **Create**

## Step 2: Enable OAuth Consent Screen

1. In Google Cloud Console, go to **APIs & Services** → **OAuth Consent Screen**
2. Select **External** (for DLSU domain testing)
3. Click **Create**
4. Fill in the form:
   - **App name**: CPS Reservation System
   - **User support email**: your-email@dlsu.edu.ph
   - **Developer contact**: your-email@dlsu.edu.ph
5. Click **Save and Continue**
6. On Scopes page, click **Save and Continue** (default scopes are fine)
7. On Test Users page, click **Add Users** and add your testing emails
8. Click **Save and Continue**

## Step 3: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth Client ID**
3. If prompted, set up OAuth Consent Screen first (see Step 2)
4. Select **Web Application**
5. Name it: `CPS Frontend`
6. Under **Authorized JavaScript origins**, add:
   ```
   http://localhost:3000
   http://localhost:5000
   https://yourdomain.com (for production)
   ```
7. Under **Authorized redirect URIs**, add:
   ```
   http://localhost:3000/login
   http://localhost:3000
   https://yourdomain.com/login (for production)
   ```
8. Click **Create**
9. Copy the **Client ID** and **Client Secret**

## Step 4: Configure Environment Variables

### Backend (.env)

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

## Step 5: Start the Application

### Backend
```bash
cd backend
source .venv/bin/activate
python3 app.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

The application will be available at `http://localhost:3000`

## Step 6: Test Google OAuth

1. Open `http://localhost:3000/login`
2. Click the **Google Sign-In** button
3. Sign in with your @dlsu.edu.ph Google account
4. You should be redirected to the dashboard
5. Your account will be automatically created

## API Endpoints

### Get Google Client ID
```
GET /api/auth/oauth/google/client-id
```
Returns the Client ID for frontend OAuth initialization

### OAuth Callback
```
POST /api/auth/oauth/google/callback
Content-Type: application/json

{
  "token": "google-id-token"
}
```
Authenticates user and returns JWT token

## Security Features

✅ **Domain Restriction**: Only @dlsu.edu.ph emails allowed
✅ **Token Verification**: Google tokens validated server-side
✅ **Audit Logging**: All auth events logged
✅ **JWT Tokens**: Secure session tokens
✅ **No Password Storage**: OAuth eliminates password security risks

## User Account Creation

When a user signs in with Google for the first time:

1. Google ID token is verified
2. Email domain checked (@dlsu.edu.ph)
3. New user account created with:
   - Email
   - First/Last Name (from Google)
   - Profile Picture (from Google)
   - OAuth Provider (Google)
   - OAuth ID (Google User ID)
4. User automatically verified and logged in
5. JWT token returned for session

## Troubleshooting

### "Invalid token" error
- Ensure `GOOGLE_CLIENT_ID` matches frontend value
- Check that Google project is properly configured
- Verify OAuth Consent Screen is set up

### "Only DLSU email addresses allowed" error
- Must sign in with @dlsu.edu.ph email
- Personal Google accounts won't work

### Google Sign-In button not showing
- Check browser console for errors
- Verify `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set in frontend
- Restart Next.js dev server after env changes

### Token verification fails
- Verify `GOOGLE_CLIENT_SECRET` is correct
- Check backend logs for detailed error
- Ensure Google Cloud Project is active

## Production Deployment

### For DLSU Domain

1. Update authorized URIs in Google Cloud Console:
   ```
   https://cps.dlsu.edu.ph
   https://cps.dlsu.edu.ph/login
   ```

2. Update environment variables on production server

3. Consider switching OAuth Consent Screen from "External" to "Internal" (requires DLSU admin)

4. Enable HTTPS (required for production)

### Environment Variables
```bash
export GOOGLE_CLIENT_ID=your-production-client-id
export GOOGLE_CLIENT_SECRET=your-production-client-secret
```

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Sign-In for Web](https://developers.google.com/identity/sign-in/web)
- [Google Cloud Console](https://console.cloud.google.com/)

## Migration from Email Verification

If you were previously using email verification:

✅ Old accounts are still accessible
✅ New accounts use Google OAuth
✅ Users can link their OAuth account to existing email accounts (future enhancement)
✅ Verification code fields are deprecated

## Questions?

Contact your system administrator or development team for support.
