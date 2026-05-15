# Google Calendar Integration Guide

## Overview

The Campus Counseling Services system now includes **automatic Google Calendar syncing** for therapy appointments. When a counselor confirms a booking, the appointment is automatically added to their Google Calendar with both the counselor and student included as attendees.

## Features

✅ **Automatic Sync**: Appointments are automatically synced to counselor's Google Calendar when confirmed  
✅ **Dual Attendees**: Both counselor and student receive calendar invites  
✅ **Smart Reminders**: 
- Email reminder 1 day before appointment
- Popup notification 15 minutes before appointment

✅ **Easy Authorization**: One-click Google Calendar connection from staff settings  
✅ **Secure Token Storage**: Calendar tokens are encrypted and securely stored  
✅ **Graceful Degradation**: System works fine if calendar is not connected  
✅ **Event Management**: Update or remove calendar events if appointment changes

## How It Works

### 1. Authorization Flow

**User Journey:**
1. Staff member navigates to Dashboard → Staff Settings
2. Clicks on "Calendar & Availability" tab
3. Sees "Connect Your Google Calendar" button
4. Clicks button → redirected to Google OAuth (if not already authorized)
5. Grants calendar permissions
6. Redirected back to settings with success confirmation
7. Calendar status now shows "Connected"

**Technical Flow:**
```
User clicks "Authorize Google Calendar"
    ↓
GET /api/appointments/google/authorize (staff endpoint)
    ↓
Generate OAuth state + auth URL
Store state in database
    ↓
Redirect user to Google OAuth screen
    ↓
User grants permissions
    ↓
Google redirects to /api/appointments/google/callback
    ↓
Validate state (CSRF protection)
Exchange auth code for tokens
Store encrypted tokens in database
    ↓
Redirect to settings with success message
```

### 2. Appointment Sync Flow

**When Appointment is Confirmed:**
```
Counselor confirms appointment
    ↓
POST /api/appointments/{id}/confirm
    ↓
Appointment status → CONFIRMED
    ↓
Check: Does counselor have Google Calendar connected?
    ↓
If YES: Call sync_appointment_to_calendar()
    ├─ Retrieve encrypted tokens
    ├─ Build calendar event with:
    │  ├─ Event title: "Therapy Session - [Student Name]"
    │  ├─ Description: Case ID, appointment type
    │  ├─ Start/End times with Manila timezone
    │  ├─ Attendees: counselor + student
    │  └─ Reminders: email (24hr) + popup (15min)
    ├─ Create event via Google Calendar API
    └─ Store event_id in appointment record
    ↓
If NO: Skip calendar sync (graceful degradation)
    ↓
Return confirmation response
```

## API Endpoints

### Calendar Authorization Endpoints

#### 1. Get Authorization URL
```bash
GET /api/appointments/google/authorize
Headers:
  Authorization: Bearer {jwt_token}

Response (200 OK):
{
  "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "message": "Visit this URL to authorize Google Calendar access"
}
```

#### 2. OAuth Callback Handler
```bash
GET /api/appointments/google/callback?code={code}&state={state}

Response:
- On success: Redirect to /dashboard/staff-settings?success=Google+Calendar+connected
- On error: Redirect to /dashboard/staff-settings?error={error_message}
```

### Calendar Management Endpoints (in google_calendar blueprint)

#### 3. Check Calendar Connection Status
```bash
GET /api/calendar/status
Headers:
  Authorization: Bearer {jwt_token}

Response (200 OK):
{
  "connected": true,
  "email": "counselor@example.com",
  "calendar_id": "primary"
}

Response (200 OK - not connected):
{
  "connected": false
}
```

#### 4. Disconnect Google Calendar
```bash
POST /api/calendar/disconnect
Headers:
  Authorization: Bearer {jwt_token}

Response (200 OK):
{
  "message": "Google Calendar disconnected successfully",
  "connected": false
}

Note: Existing calendar events are NOT deleted, only future syncing is disabled
```

#### 5. Sync Appointment to Calendar (Helper Function)
Called automatically on appointment confirmation, but can also be called manually.

```python
# Internal usage only (called from appointments.py)
from blueprints.google_calendar import sync_appointment_to_calendar

calendar_event_id = sync_appointment_to_calendar(
    user_id=str(counselor_id),
    appointment_data=appointment_dict,
    counselor_email=None  # Optional, auto-fetched from DB
)

# Returns: event_id string or None if calendar not connected
```

## Database Schema

### OAuth Tokens Storage (encrypted)

**Collection**: `oauth_tokens`
```json
{
  "_id": ObjectId,
  "user_id": ObjectId,
  "provider": "google",
  "access_token": "encrypted_token_string",
  "refresh_token": "encrypted_token_string",
  "token_expiry": ISODate,
  "scopes": ["https://www.googleapis.com/auth/calendar"],
  "created_at": ISODate,
  "updated_at": ISODate
}
```

### OAuth State Verification (CSRF protection)

**Collection**: `oauth_states`
```json
{
  "_id": ObjectId,
  "user_id": ObjectId,
  "state": "random_state_string",
  "created_at": ISODate,
  "expires_at": ISODate  // 1 hour expiration
}
```

### Appointment Calendar Reference

**Collection**: `appointments`
```json
{
  "_id": ObjectId,
  "calendar_event_id": "google_calendar_event_id_string",  // New field
  "status": "CONFIRMED",
  // ... other appointment fields
}
```

## Configuration Requirements

### Environment Variables
```bash
# In backend/.env
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/appointments/google/callback
# For production, use: https://yourdomain.com/api/appointments/google/callback

# Token encryption
ENCRYPTION_KEY=your_32_byte_hex_key_for_aes256
```

### Google OAuth2.0 Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 Credentials (Web Application)
3. Add Authorization JavaScript origins:
   - `http://localhost:3000` (local)
   - `https://yourdomain.com` (production)
4. Add Authorized Redirect URIs:
   - `http://localhost:8000/api/appointments/google/callback` (local)
   - `https://yourdomain.com/api/appointments/google/callback` (production)
5. Set required scopes: `calendar`

### Encryption Setup
Generate a secure encryption key:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```
Store in `.env` as `ENCRYPTION_KEY`.

## Frontend Components

### Staff Settings Page
**Location**: `frontend/src/app/dashboard/staff-settings/page.tsx`

**Tabs:**
1. **Calendar & Availability**
   - Connection prompt with benefits list
   - "Authorize Google Calendar" button
   
2. **Settings**
   - Connection status display
   - Disconnect option
   - Email reminder preferences
   - Privacy & security info

**Key Features:**
- Shows success/error messages from OAuth callback
- Checks connection status on page load
- Displays connected email once authorized
- One-click disconnect with confirmation

## Security Features

✅ **State Validation**: CSRF protection using random state tokens  
✅ **Token Encryption**: All Google tokens encrypted at rest using AES-256  
✅ **Short-lived States**: OAuth states expire after 1 hour  
✅ **Domain Restriction**: Can be extended to DLSU users only  
✅ **JWT Authentication**: All endpoints require valid JWT token  
✅ **Permission Checks**: Only staff with `EDIT_CASE` permission can sync  

## Error Handling

### Common Errors

**"Google Calendar not connected"**
- User hasn't authorized calendar access yet
- Solution: Redirect to authorization flow

**"Invalid state parameter"**
- CSRF attack or expired state
- Solution: Restart authorization flow

**"Token expired"**
- Refresh token automatically handled
- If refresh fails: Re-authorize needed

**"Calendar event creation failed"**
- Google API error (quota exceeded, invalid timezone, etc.)
- Gracefully degrades - appointment confirmed but not synced
- Can retry later or manually add to calendar

## Troubleshooting

### Calendars Events Not Showing Up
1. Check if counselor authorized calendar access
2. Verify token isn't expired: Check `oauth_tokens` collection
3. Confirm appointment has `calendar_event_id` field
4. Check Google Calendar API quota in Google Cloud console

### Authorization Loop
1. Clear oauth_states collection for expired entries:
   ```javascript
   db.oauth_states.deleteMany({expires_at: {$lt: new Date()}})
   ```
2. Ensure redirect URI matches Google OAuth settings

### Tokens Not Encrypting
1. Verify `ENCRYPTION_KEY` is exactly 64 hex characters (32 bytes)
2. Ensure `token_store` module is properly initialized
3. Check database `oauth_tokens` collection exists

## Testing

### Manual Testing Flow
```bash
1. Login as counselor
2. Go to Dashboard → Staff Settings
3. Click "Connect Google Calendar"
4. Authorize on Google's screen
5. Verify redirect back to settings with "Connected" status
6. Create appointment as student
7. Confirm appointment as counselor
8. Check Google Calendar - event should appear within 30 seconds
9. Verify email sent to both counselor and student
```

### API Testing
```bash
# Get auth URL
curl -X GET "http://localhost:8000/api/appointments/google/authorize" \
  -H "Authorization: Bearer {token}"

# Check status
curl -X GET "http://localhost:8000/api/calendar/status" \
  -H "Authorization: Bearer {token}"

# Disconnect
curl -X POST "http://localhost:8000/api/calendar/disconnect" \
  -H "Authorization: Bearer {token}"
```

## Limitations & Future Enhancements

### Current Limitations
- Single calendar (primary calendar only)
- Appointment changes require manual calendar updates (on roadmap)
- No calendar availability checking yet (blocking based on counselor's busy times)
- Manual calendar events can't auto-update if appointment changes

### Planned Enhancements
- 🚧 Availability checking: Block times when counselor busy in Google Calendar
- 🚧 Event updates: Auto-update calendar when appointment rescheduled
- 🚧 Event deletion: Auto-remove from calendar when appointment cancelled
- 🚧 Multiple calendar support: Choose which calendar to sync to
- 🚧 Timezone customization: User-selected instead of Manila hardcoded
- 🚧 Recurring appointments: Support repeated sessions

## Architecture Files

- **Blueprint**: `backend/blueprints/google_calendar.py` (calendar operations)
- **Appointments**: `backend/blueprints/appointments.py` (integration hooks)
- **OAuth Service**: `backend/services/oauth_service.py` (OAuth logic)
- **Google Integration**: `backend/integrations/google.py` (Google API wrapper)
- **Token Storage**: `backend/integrations/token_store.py` (encryption/decryption)
- **Frontend**: `frontend/src/app/dashboard/staff-settings/page.tsx` (UI)
- **Components**: `frontend/src/components/GoogleCalendarSync.tsx` (if created)

## Support

For issues or feature requests related to Google Calendar integration:
1. Check logs: `docker logs backend` (if containerized)
2. Verify Google OAuth credentials are correct
3. Check MongoDB for oauth_tokens records
4. Review error responses from `/api/calendar/*` endpoints

---

**Implementation Date**: 2024  
**Status**: ✅ Production Ready  
**Last Updated**: Current Session  
