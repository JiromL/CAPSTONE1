# Google Gmail Login Setup Guide

This guide will help you set up Google OAuth login for the CPS system.

## Prerequisites
- Google Cloud Project (create at [console.cloud.google.com](https://console.cloud.google.com))
- Admin access to your Google Cloud Project

## Step 1: Create Google OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Go to **APIs & Services** → **Library**
4. Search for and enable:
   - **Google+ API**
   - **Gmail API** (optional, for future email features)

5. Go to **APIs & Services** → **Credentials**
6. Click **+ Create Credentials** → **OAuth Client ID**
7. If prompted to set up OAuth Consent Screen:
   - Click **Configure OAuth consent screen**
   - Select **External** for User Type
   - Fill in Application name: `CPS System`
   - Add your email for support
   - Add scopes: `email`, `profile`, `openid`
   - Skip optional fields
   - Go back to credentials

8. Create OAuth Client ID:
   - Application type: **Web Application**
   - Name: `CPS Frontend`
   - Authorized JavaScript origins:
     ```
     http://localhost:3000
     http://localhost:5000
     https://yourdomain.com (for production)
     ```
   - Authorized redirect URIs:
     ```
     http://localhost:3000/login
     http://localhost:3000
     http://localhost:5000/api/auth/oauth/callback
     https://yourdomain.com/login (for production)
     ```
   - Click **Create**

9. Copy your credentials:
   - **Client ID** (something like: `xxxxx.apps.googleusercontent.com`)
   - **Client Secret** (keep this secret!)

## Step 2: Configure Backend Environment Variables

Create or update `.env` file in `backend/` directory:

```bash
# Google OAuth Credentials
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here

# Optional: Token encryption key (keep defaults if first time)
ENCRYPTION_KEY=5k4TtzFSzW3xEVU1ZT-2zV1X-vZEX_V_ZIXwcfvcK3Y=
```

## Step 3: Restart Backend Server

```bash
cd backend
# Kill any existing process
pkill -f "python3 app.py"
sleep 2

# Restart
python3 app.py
```

## Step 4: Test Login

1. Open browser: `http://localhost:3000`
2. Go to **Login** page
3. Click **Sign in with Google**
4. Sign in with your **@dlsu.edu.ph** email
5. You should be logged in automatically

## Troubleshooting

### Issue: "Unable to fetch Google Client ID"
- **Solution**: Check that backend is running and `/api/auth/oauth/google/client-id` endpoint is working
- **Test**: `curl http://localhost:5000/api/auth/oauth/google/client-id`

### Issue: Google Sign-In button not showing
- **Solution**: Check browser console for errors
- **Check**: Verify `GOOGLE_CLIENT_ID` is set correctly in backend
- **Test**: Open DevTools → Console and look for error messages

### Issue: "Only DLSU email addresses are allowed"
- **Solution**: You must use an email ending with `@dlsu.edu.ph`
- **For testing**: Contact admin to create test user or modify email domain in `backend/services/oauth_service.py` line 18

### Issue: Redirect URI mismatch error
- **Solution**: Ensure your redirect URI in Google Console matches exactly
- **Important**: No trailing slashes, exact match required
- **For localhost**: Make sure port 3000 is being used

## How It Works

1. **User clicks "Sign in with Google"** → Frontend loads Google Sign-In button
2. **User authenticates with Google** → Browser shows Google login dialog
3. **Google returns ID token** → Frontend sends to backend `/api/auth/oauth/google/callback`
4. **Backend verifies token** → Checks email domain (@dlsu.edu.ph)
5. **User created or found** → JWT token generated
6. **User logged in** → Redirected to dashboard

## Security Features

✅ **Domain Restriction**: Only @dlsu.edu.ph emails allowed  
✅ **Token Verification**: Google ID tokens validated server-side  
✅ **No Password**: OAuth eliminates password management  
✅ **Audit Logging**: All OAuth login events logged  
✅ **Auto-verified**: OAuth users automatically marked as verified  

## For Production

1. Update redirect URIs:
   ```
   https://yourdomain.com/login
   https://yourdomain.com
   https://yourdomain.com/api/auth/oauth/callback
   ```

2. Use environment variables from secrets manager:
   ```bash
   GOOGLE_CLIENT_ID=prod_client_id
   GOOGLE_CLIENT_SECRET=prod_client_secret
   ```

3. Test thoroughly before deployment

## API Endpoints

### Get Google Client ID
```
GET /api/auth/oauth/google/client-id

Response:
{
  "client_id": "xxxxx.apps.googleusercontent.com"
}
```

### Handle OAuth Callback
```
POST /api/auth/oauth/google/callback
Content-Type: application/json

{
  "token": "google_id_token_from_frontend"
}

Response:
{
  "access_token": "jwt_token",
  "email": "user@dlsu.edu.ph",
  "first_name": "John",
  "last_name": "Doe",
  "picture": "https://...",
  "role": "STUDENT"
}
```

## Support

For issues:
1. Check browser console (F12 → Console)
2. Check backend logs
3. Verify `.env` file has correct credentials
4. Ensure MongoDB is running
5. Confirm frontend/backend can communicate

---

**Created**: March 2026  
**Status**: ✅ Ready to Use
