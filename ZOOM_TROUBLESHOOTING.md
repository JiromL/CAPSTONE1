# Zoom Integration Troubleshooting Guide

## Current Status

Your Zoom credentials have been configured and the JWT token generation is working correctly! However, the Zoom API is returning an "Invalid access token" error (code 124).

### JWT Token Details (from test run):
- ✅ Issuer (Client ID): `Ew5kgn89SD2ou4cxFoT7Gg`
- ✅ Subject (Account ID): `3QyIKcImQoGFCsVdIC3C1Q`
- ✅ Token format: Correct HS256 signature

## Common Causes & Solutions

### 1. **App Not Fully Activated** (Most Likely)

S2S OAuth apps need to be explicitly activated after creation.

**Fix:**
1. Go to https://marketplace.zoom.us
2. Click "Develop" → "My Apps"
3. Select your app
4. Go to "App Credentials" tab
5. Look for "Activation Status" - ensure it says **"Active"**
6. If inactive, there should be an "Activate App" button - click it
7. Accept terms if prompted

### 2. **Missing or Incomplete Scopes**

Even if the app is active, the required permissions might not be enabled.

**Fix:**
1. In your Zoom app: Go to "Scopes"
2. Search for and **add these scopes**:
   - `meeting:write` - Create meetings
   - `meeting:read` - Read meeting details
   - `user:read` - Read user information
3. Accept the scope changes
4. **Reauth** your account if prompted

### 3. **Account Not Authorized**

The Account ID might not be properly linked to your app.

**Fix:**
1. Go to "Information" tab → "Accounts"
2. Click "Authorize" next to your account
3. A browser window will open - authorize and accept permissions
4. Confirm authorization is complete

### 4. **Token Secret vs Client Secret**

The token secret (`__VwppAFRKOKoPtl6_axSA`) might be for a different purpose.

**Verify:**
- For S2S OAuth, the JWT signature MUST use the **Client Secret**, not the token secret
- Our code now supports both (uses token_secret if available, falls back to client_secret)
- This should be correct, but if issues persist, try regenerating credentials

### 5. **Testing the Token Manually**

You can test if the JWT token is valid using Zoom's documentation:

```bash
# Generate JWT token (the test script does this)
JWT_TOKEN=$(python3 test_zoom_integration.py 2>&1 | grep "Token payload" | head -1)

# Test calling Zoom API
curl -i -X GET \
  https://api.zoom.us/v2/users/me \
  -H "Authorization: Bearer $JWT_TOKEN"

# Should return user details, not 124 error
```

## After Making Changes

1. **Restart the backend:**
   ```bash
   pkill -f "PORT=8000 python3 app.py" || true
   sleep 2
   cd backend && PORT=8000 python3 app.py > /tmp/flask.log 2>&1 &
   ```

2. **Test again:**
   ```bash
   cd /Users/jeromelouiesantos/CAPSTONE1
   source backend/.venv/bin/activate
   python3 test_zoom_integration.py
   ```

3. **Look for "✅ MEETING CREATED SUCCESSFULLY!" message**

## If Still Not Working

1. **Check Zoom App Status:**
   - Log in to https://marketplace.zoom.us
   - Ensure the app is Active
   - Check that your account is Authorized
   - Verify all required scopes are added

2. **Verify Environment Variables:**
   ```bash
   cat .env | grep ZOOM
   # Should see all 4 variables set
   ```

3. **Check Backend Logs:**
   ```bash
   tail -50 /tmp/flask.log
   # Look for any errors
   ```

4. **Regenerate Credentials:**
   If still stuck, try regenerating the Client Secret and Account Secret in Zoom's app dashboard

## When It Works

Once the JWT token is valid, you'll see:
```
✅ MEETING CREATED SUCCESSFULLY!
   Meeting ID: 123456789
   Join URL: https://zoom.us/j/123456789
   Passcode: 123456
   Status: successfully_created
```

Then the intake form submissions will automatically create real Zoom meetings!

## Still Need Help?

1. Open https://developers.zoom.us/docs/internal-apps/s2s-oauth/
2. Review the "Account Authorization" section
3. Ensure "Token endpoint secret" is used (not for JWT signing though)
4. Consider opening a support ticket with Zoom mentioning S2S OAuth error 124

## Reference

- Zoom S2S OAuth Docs: https://developers.zoom.us/docs/internal-apps/s2s-oauth/
- Zoom API Error Codes: https://developers.zoom.us/docs/api/rest/reference/error-codes/
- Error 124: Invalid access token (usually auth/activation issue)
