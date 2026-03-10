# 🔧 Fixing 401 Error on Intake Submission

## 📋 Quick Diagnosis

The backend API is working correctly (confirmed with 201 responses). The 401 error means the authentication token is not being sent or is invalid.

## ✅ Step-by-Step Fix

### 1. **Clear Your Browser Cache & Local Storage**
   - Press `F12` to open Developer Tools
   - Go to **Application** tab
   - Click **Storage** → **Local Storage** → **http://localhost:3000**
   - Delete all entries (especially `token` and `user`)
   - Refresh the page

### 2. **Ensure Frontend Has Latest Code**
   ```bash
   # In terminal (frontend directory)
   cd /Users/jeromelouiesantos/CAPSTONE1/frontend
   npm run dev
   ```
   Wait for confirmation: "✓ Ready in X.XXs"

### 3. **Log In Fresh**
   - Go to `http://localhost:3000/login`
   - Email: `student1@university.edu`
   - Password: `test123`
   - Click Login and wait for Dashboard

### 4. **Check Console Logs (Critical!)**
   - **DO NOT close the login page yet**
   - Press `F12` (Developer Tools)
   - Go to **Console** tab
   - You should see:
     ```
     🔐 TOKEN DEBUG:
        Token exists: true
        Token length: XXX
        Token preview: eyJ...
     ```
   - If you see `Token exists: false` → **Login failed, try logging in again**
   - If you don't see this → Frontend rebuilding, wait 10 seconds and try again

### 5. **Submit Intake Form**
   - Return to form (click "Next" through steps)
   - Fill in the form normally
   - **CHECK CONSENT CHECKBOX** (critical!)
   - Scroll down and click "Submit Intake"

### 6. **Check Debug Output in Console**
   After clicking submit, look for:
   ```
   📡 INTAKE SUBMISSION DEBUG:
      Endpoint: http://127.0.0.1:8000/api/intake/submit
      Token from localStorage: eyJ...
      Auth header: Bearer eyJ...
      Payload keys: [...]
   
   📤 Response status: 201 true
   ```
   
   **IF YOU SEE:**
   - `Response status: 401 false` → Token issue
   - `Response status: 400 false` → Missing required fields
   - `Response status: 201 true` → **SUCCESS!** Look for purple "MEETING LINK READY" box

## 🐛 Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| `401 false` | Token missing/invalid | Clear localStorage, log in again |
| `Token exists: false` | Not logged in | Go to `/login`, use correct credentials |
| No response at all | Frontend not running | Run `cd frontend && npm run dev` |
| CORS error in console | API CORS misconfigured | Check backend `CORS_ORIGINS` setting |
| `400 false` | Missing consent/field | Check if `consent_given: true` in payload |

## 🔍 Manual API Test (If Browser Test Fails)

```bash
# From terminal:
cd /Users/jeromelouiesantos/CAPSTONE1

# Test login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student1@university.edu","password":"test123"}' \
  | grep access_token

# Copy the token, then replace TOKEN_HERE below:
curl -X POST http://localhost:8000/api/intake/submit \
  -H "Authorization: Bearer TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"purpose":"test","consent_given":true,"preferred_platform":"zoom"}'

# If backend responds with 201 → problem is frontend
# If backend responds with 401 → problem is backend auth
```

## ✨ Expected Success Flow

1. ✅ Log in successfully
2. ✅ See TOKEN DEBUG logs with `Token exists: true`
3. ✅ Fill and submit intake form
4. ✅ See INTAKE SUBMISSION DEBUG logs with `Response status: 201 true`
5. ✅ See purple "✅ MEETING LINK READY" box
6. ✅ See meeting link with passcode

---

**If the issue persists after these steps**, please share:
- [ ] Console logs from step 4-6 (screenshot or copy-paste)
- [ ] Network tab showing the failed request? (F12 → Network → find `/api/intake/submit` request)
- [ ] Backend logs: `cat /tmp/flask.log | tail -50`
