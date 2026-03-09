# Google Calendar Integration - Quick Start Guide

## For Developers

### Quick Setup

1. **Add Environment Variables** (`.env` or `.env.local`)
   ```bash
   GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret  
   GOOGLE_REDIRECT_URI=http://localhost:8000/api/appointments/google/callback
   ENCRYPTION_KEY=<generate with: python3 -c "import secrets; print(secrets.token_hex(32))">
   ```

2. **Verify Backend Setup**
   ```bash
   cd backend
   # Check imports work
   python3 -c "from blueprints.google_calendar import calendar_bp; print('✓ Module OK')"
   ```

3. **Start Backend**
   ```bash
   python3 app.py
   # Should see: * Running on http://localhost:8000
   ```

4. **Enable Frontend** (Already done in staff-settings)
   - Navigate to: `http://localhost:3000/dashboard/staff-settings`
   - Click "Connect Google Calendar" button

---

## For End Users (Counselors)

### How to Enable Google Calendar Sync

**Step 1: Log In**
- Go to dashboard

**Step 2: Access Settings**
- Click user menu → select "Staff Settings"
- Or navigate to: `Dashboard → Staff Settings`

**Step 3: Connect Calendar**
- Click on "Calendar & Availability" tab
- Click blue button "Authorize Google Calendar"
- Grant permissions when prompted by Google
- Automatically redirected back with "Connected" status ✅

**Step 4: Start Syncing**
- Done! ✅ Future appointments sync automatically
- When you confirm an appointment, it appears in your Google Calendar

### Managing Your Calendar

**Check Connection Status**
- Go to Staff Settings → Settings tab
- See "Google Calendar Connected" indicator

**Disconnect**
- Click "Disconnect Google Calendar" button
- Confirm action
- Calendar sync disabled for new appointments
- Existing events stay in Google Calendar

**Troubleshooting**

| Problem | Solution |
|---------|----------|
| Button says "Loading..." | Refresh page, check internet connection |
| OAuth screen won't load | Check cookies are enabled, try private window |
| Events not appearing | Wait 30 seconds, refresh Google Calendar |
| Token expired errors | Reconnect calendar (1-click) |

---

## For Administrators

### Monitoring Calendar Usage

**Check Which Staff Have Calendar Connected**
```bash
mongo
> db.oauth_tokens.find({provider: "google"}).pretty()
```

**View Recent Syncs**
```bash
> db.appointments.find(
  {calendar_event_id: {$exists: true}},
  {_id: 1, calendar_event_id: 1, updated_at: -1}
).limit(10)
```

**Count Total Synced Appointments**
```bash
> db.appointments.countDocuments({calendar_event_id: {$exists: true}})
```

### Troubleshooting Production Issues

**Staff can't connect (OAuth error)**
1. Verify OAuth credentials in `.env`
2. Check Google Cloud Console for errors
3. Verify redirect URI matches exactly

**Events not syncing**
1. Check staff has `/api/calendar/status` → `connected: true`
2. View backend logs for API errors
3. Check Google Calendar API quota not exceeded

**Expired tokens causing sync failures**
- System auto-refreshes, should work fine
- If stuck: staff should disconnect + reconnect

---

## API Response Examples

### Successful Authorization
```json
GET /api/appointments/google/authorize
Response:
{
  "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
  "message": "Visit this URL to authorize Google Calendar access"
}
```

### Calendar Connected
```json
GET /api/calendar/status
Response:
{
  "connected": true,
  "email": "counselor@gmail.com",
  "calendar_id": "primary"
}
```

### Calendar Not Connected  
```json
GET /api/calendar/status
Response:
{
  "connected": false
}
```

### Sync Success
```json
POST /api/appointments/123/confirm
Response:
{
  "status": "success",
  "appointment": {
    "_id": "123",
    "status": "CONFIRMED",
    "calendar_event_id": "event123@google.com"  // ← Created!
  }
}
```

---

## Testing Commands

### Test Authorization Flow
```bash
# Get auth URL
curl -X GET http://localhost:8000/api/appointments/google/authorize \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Should return auth URL to click
```

### Test Status Check
```bash
curl -X GET http://localhost:8000/api/calendar/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Shows: {connected: false} or {connected: true, email: "..."}
```

### Test Disconnect
```bash
curl -X POST http://localhost:8000/api/calendar/disconnect \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Should disconnect and return {connected: false}
```

---

## Logs & Debugging

### Check Backend Logs
```bash
# View last 20 lines
tail -20 backend/app.log

# Watch real-time logs
tail -f backend/app.log

# Search for calendar errors
grep -i "calendar" backend/app.log
```

### Enable Debug Mode
```python
# In backend/app.py add:
app.config['DEBUG'] = True

# Or set environment variable:
export FLASK_DEBUG=1
```

### Database Inspection

**View All Tokens**
```javascript
db.oauth_tokens.find().pretty()
```

**Check Token Expiry**
```javascript
db.oauth_tokens.findOne({user_id: ObjectId("...")})
  .token_expiry
```

**Find Appointments Needing Sync**
```javascript
db.appointments.find({
  status: "CONFIRMED",
  calendar_event_id: {$exists: false}
})
```

---

## Performance Notes

| Operation | Time | Notes |
|-----------|------|-------|
| OAuth authorization | 30-60s | One-time, includes user interaction |
| Calendar sync | <1s | Async, non-blocking |
| Daily token refresh | <100ms | Automatic |
| Event creation API | <500ms | Via Google Calendar API |

---

## Security Audit Checklist

- [ ] OAuth credentials stored in `.env` (not committed)
- [ ] Encryption key is 32 bytes (64 hex chars)
- [ ] HTTPS enabled in production (not HTTP)
- [ ] Token refresh working (check logs)
- [ ] State validation preventing CSRF (enabled by default)
- [ ] Only authenticated users can authorize
- [ ] Permissions checked (staff only)

---

## Common Issues & Fixes

### "Invalid state parameter"
```
Problem: OAuth state validation failed
Fix: Clear oauth_states, try again
  db.oauth_states.deleteMany({})
```

### "Token expired, needs refresh"
```
Problem: Access token expired
Fix: Automatic (happens transparently)
If stuck: Disconnect and reconnect calendar
```

### "Google Calendar API quota exceeded"
```
Problem: Too many API calls
Fix: Check your Google Cloud quota limits
     May need to upgrade from free tier
```

### "Appointment not syncing"
```
Problem: Auto-sync not working
Check:
1. db.oauth_tokens.find() - token exists?
2. /api/calendar/status - connected?
3. Backend logs - any errors?
4. Retry appointment confirmation
```

---

## Reference URLs

- Google OAuth Docs: https://developers.google.com/identity/protocols/oauth2
- Google Calendar API: https://developers.google.com/calendar/api
- Setup Instructions: See `GOOGLE_CALENDAR_INTEGRATION.md`
- Full Implementation: See `GOOGLE_CALENDAR_IMPLEMENTATION_SUMMARY.md`

---

**Version**: 1.0.0  
**Status**: Production Ready ✅  
**Last Updated**: Current Session  
