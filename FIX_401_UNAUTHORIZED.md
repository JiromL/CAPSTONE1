# Fixing 401 Unauthorized Errors on Intake Form Submission

## Problem
User was getting `Error submitting intake: Failed to submit intake: 401` when trying to submit the intake form.

## Root Causes Found & Fixed

### 1. **Token Key Inconsistency** ✅ FIXED
The frontend had inconsistency in how tokens were stored in localStorage:
- Login page stores token as: `localStorage.setItem('token', data.access_token)`
- But some pages were retrieving as: `localStorage.getItem('access_token')`

**Files fixed:**
- `frontend/src/app/admin/resources/page.tsx`
- `frontend/src/app/(dashboard)/counselor/emergency/page.tsx`
- `frontend/src/app/resources/page.tsx`
- `frontend/src/app/intake/enhanced.tsx`

All now consistently use `localStorage.getItem('token')`

### 2. **No Fallback for Token Retrieval** ✅ FIXED
Added fallback to check both 'token' and 'access_token' keys in intake form:
```typescript
const token = localStorage.getItem('token') || localStorage.getItem('access_token');
```

Also added explicit error message if no token is found:
```
"No authentication token found. Please log in again."
```

**Updated in:**
- `frontend/src/app/intake/page.tsx` - All token retrieval locations

## How the Fix Works

1. **Login** → Token stored as `localStorage.setItem('token', access_token)`
2. **Intake Page Load** → Checks both 'token' and 'access_token' keys (with 'token' as primary)
3. **Appointment Calculation** → Uses the same fallback token retrieval
4. **Intake Submission** → Uses the same fallback token retrieval  
5. **Request Header** → Includes `Authorization: Bearer <token>`

## Testing the Fix

### Automated Diagnostic Script
Run the included diagnostic script to verify everything works:
```bash
python3 test_intake_auth.py
```

This script tests:
- ✅ Login endpoint returns valid JWT token
- ✅ 401 returned when no token provided
- ✅ Intake endpoint accepts valid tokens (201 response)

### Manual Testing
1. **Open browser DevTools** (F12)
2. **Go to Application tab** → localStorage
3. **Log in** and verify 'token' key is present
4. **Go to Intake form** → Should not redirect to login
5. **Submit intake** → Should succeed with 201 status

### If You Still Get 401
1. **Clear localStorage**: `localStorage.clear()` in console
2. **Log out and log in again**
3. **Check for 'token' key** in localStorage after login
4. **Check browser console** for error messages
5. **Run diagnostic script** to check backend

## Backend Status
✅ Backend authentication working correctly
- Login returns valid JWT tokens
- Intake endpoint properly requires authentication  
- Valid tokens are accepted for intake submission
- Real Zoom meetings are created on submission

## Files Modified

### Frontend Changes
- `frontend/src/app/admin/resources/page.tsx` - Fixed token key
- `frontend/src/app/(dashboard)/counselor/emergency/page.tsx` - Fixed token key
- `frontend/src/app/resources/page.tsx` - Fixed token key  
- `frontend/src/app/intake/enhanced.tsx` - Fixed token key
- `frontend/src/app/intake/page.tsx` - Added fallback token retrieval + error messaging

### Testing/Diagnostics
- `test_intake_auth.py` - New diagnostic script for testing auth flow

## Commits
1. `Fix token key inconsistency - standardize on 'token'`
2. `Add fallback token retrieval in intake form`
3. `Add diagnostic script for intake 401 errors`

## Next Steps if Issues Persist

1. **Check backend logs**:
   ```bash
   tail -50 /tmp/flask.log
   ```

2. **Verify MongoDB is running**:
   ```bash
   lsof -i :27017
   ```

3. **Check CORS configuration** - Verify frontend origin is allowed

4. **Test with curl** (as documented in `test_intake_auth.py`)

5. **Check JWT configuration** - Verify `JWT_SECRET_KEY` is set in backend config
