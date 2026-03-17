# 🚀 Quick Start: Google Gmail Login

## What's Already Done ✅
- Backend OAuth endpoints configured
- Frontend Google Sign-In button ready
- MongoDB user sync ready
- Email domain validation (@dlsu.edu.ph)

## What You Need to Do ⚙️

### Step 1: Get Google OAuth Credentials (5 minutes)

1. Open [Google Cloud Console](https://console.cloud.google.com)
2. **Create New Project** (if needed) or select existing
3. **Enable APIs**:
   - Go to **APIs & Services** → **Library**
   - Search and enable: **Google+ API**
   
4. **Create OAuth Credentials**:
   - Go to **APIs & Services** → **Credentials**
   - Click **+ Create Credentials** → **OAuth Client ID**
   - If prompted for Consent Screen, click **Configure**:
     - User Type: **External**
     - App name: `CPS System`
     - User support email: your email
     - Scopes to add: `email`, `profile`, `openid`
     - Save and continue (skip optional fields)
   
   - Back to Credentials → **Create OAuth Client ID**:
     - Application type: **Web Application**
     - Name: `CPS Frontend`
     - **Authorized JavaScript Origins**:
       ```
       http://localhost:3000
       http://localhost:5000
       ```
     - **Authorized redirect URIs**:
       ```
       http://localhost:3000/login
       http://localhost:3000
       http://localhost:5000/api/auth/oauth/callback
       ```
     - Click **Create**

5. **Copy Your Credentials**:
   - Click the credential you just created
   - Copy **Client ID** (looks like: `123456789-abc123def456.apps.googleusercontent.com`)
   - Copy **Client Secret** (keep safe!)

### Step 2: Add to Backend (2 minutes)

Edit `backend/.env` (create if doesn't exist):

```bash
# Add these lines:
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

### Step 3: Restart Backend

```bash
# Kill existing backend
pkill -f "python3 app.py"
sleep 2

# Start backend
cd backend
python3 app.py
```

### Step 4: Test Login

1. Open browser: `http://localhost:3000`
2. Click **Login**
3. Click **Sign in with Google**
4. Sign in with `@dlsu.edu.ph` email
5. ✅ You should see dashboard

## 🎯 It's That Simple!

The system will automatically:
- ✅ Create user account (first time only)
- ✅ Store OAuth connection
- ✅ Generate JWT token
- ✅ Log you in
- ✅ Display dashboard

## 🆘 Troubleshooting

### Issue: Google button doesn't appear
**Solution**: 
- Press F12 → Console and check for errors
- Verify backend is running: `curl http://localhost:5000/api/auth/oauth/google/client-id`
- Check `.env` file is saved: `cat backend/.env | grep GOOGLE`

### Issue: "Invalid Client ID"
**Solution**:
- Copy Client ID again carefully (check for spaces)
- Ensure `.env` is saved: `cat backend/.env`
- Restart backend: `pkill -f "python3 app.py"` then `python3 backend/app.py`

### Issue: "Only DLSU emails allowed"
**Solution**:
- Must use email ending with `@dlsu.edu.ph`
- For testing with other emails, edit `backend/services/oauth_service.py` line 18

### Issue: "Redirect URI mismatch"
**Solution**:
- Go to Google Console → Your OAuth credential
- Check "Authorized Redirect URIs" match:
  ```
  http://localhost:3000/login
  http://localhost:3000
  http://localhost:5000/api/auth/oauth/callback
  ```
- Exact match required (no trailing slashes)
- Save changes

## 📊 How It Works (Behind the Scenes)

```
User Screen          Frontend                Backend                Google
    |                  |                        |                      |
    |-- Click ---------->|                      |                      |
    | Google Login      |                      |                      |
    |                   |-- Get Client ID ----->|                      |
    |                   |<--- Return ----------|                      |
    |                   |-- Load Google SDK ---|                      |
    |                   |                      |                      |
    |<------------- Show Google Dialog --------|                      |
    |                   |                      |                      |
    |-- Sign In ------->|<--- Credential Popup -------- Google Server
    |                   |<--- Get ID Token --------- Google Server
    |                   |                      |                      |
    |                   |-- Send ID Token --->|                      |
    |                   |                     |-- Verify Token ---->|
    |                   |                     |<-- Valid ----------|
    |                   |-- Create User ----->|                      |
    |                   |<-- JWT Token --------|                      |
    |-- Redirect ------>| /dashboard          |                      |
    |                   |                      |                      |
```

## ✨ Features

✅ **No Password**: Secure OAuth login  
✅ **Auto Verification**: Emails verified via Google  
✅ **Domain Locked**: Only @dlsu.edu.ph emails  
✅ **Profile Sync**: Name & picture from Google  
✅ **Auto User Creation**: First login creates account  
✅ **Audit Logging**: All logins tracked  

## 🔐 Security

- **Token Verification**: Google tokens validated server-side
- **Domain Restriction**: Only DLSU emails allowed
- **No Password Storage**: Passwords never stored
- **JWT Security**: Access tokens encrypted
- **HTTPS Ready**: Production uses HTTPS

## 📚 For More Info

- Full setup guide: `GOOGLE_OAUTH_LOGIN_SETUP.md`
- API endpoints: See `GOOGLE_OAUTH_LOGIN_SETUP.md` → API Endpoints
- Automation script: Run `./setup_google_oauth.sh`

## ✅ Quick Checklist

- [ ] Google Client ID copied
- [ ] Google Client Secret copied  
- [ ] `backend/.env` file updated with credentials
- [ ] Backend process restarted
- [ ] Can access `http://localhost:5000/api/auth/oauth/google/client-id`
- [ ] Login page loads at `http://localhost:3000`
- [ ] Google button visible
- [ ] Able to sign in with @dlsu.edu.ph email
- [ ] Redirects to dashboard
- [ ] User data stored in MongoDB

---

**Questions?** Check `GOOGLE_OAUTH_LOGIN_SETUP.md` for detailed guide  
**Automated Setup?** Run `./setup_google_oauth.sh` from project root
