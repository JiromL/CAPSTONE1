# Meeting Platform Integration Documentation

## Overview

The CPS Reservation Management System now supports **three meeting platforms** for appointment scheduling:

1. **Zoom** - Professional video conferencing (fully implemented & tested)
2. **Google Meet** - Google's video meeting solution (fully implemented)  
3. **In-Person** - Traditional face-to-face meetings

Users can select their preferred platform during intake, and the system automatically creates the appropriate meeting link and provisions it to both the student and assigned counselor.

## Architecture

### Backend Flow

```
Intake Form Submission
    ↓
[User selects preferred_platform]
    ↓
generate_meeting_link(platform, appointment_id, counseling_id)
    ↓
Switch based on platform:
    ├─ 'zoom' → ZoomIntegration.create_meeting()
    ├─ 'google_meet' → GoogleMeetIntegration.create_meeting()
    └─ 'in_person' → Return location info
    ↓
Create Appointment Document with meeting details
    ↓
Send confirmation email with meeting link
```

### File Structure

```
backend/
├── integrations/
│   ├── zoom.py                  # Zoom API integration (OAuth2)
│   ├── google.py                # Google integration + GoogleMeetIntegration
│   ├── email.py                 # Email notifications
│   └── __init__.py              # Exports
├── blueprints/
│   └── intake.py                # Intake endpoints (generate_meeting_link)
└── config.py                    # Configuration for all platforms

frontend/
└── src/app/intake/page.tsx      # Form with platform selector

docs/
├── ZOOM_SETUP.md                # Zoom configuration guide
└── GOOGLE_MEET_SETUP.md         # Google Meet configuration guide
```

## Platform Details

### 1. Zoom Integration ✅

**Status**: Fully working with real meetings

**Authentication**: OAuth2 Server-to-Server
- Account ID
- Client ID  
- Client Secret

**Meeting Creation**: 
- Uses `/users/me/meetings` endpoint
- Generates unique join URL with passcode
- Supports password protection
- Auto-records configuration

**Setup**: See [ZOOM_SETUP.md](ZOOM_SETUP.md)

**Environment Variables**:
```env
ZOOM_ACCOUNT_ID=your_account_id
ZOOM_CLIENT_ID=your_client_id
ZOOM_CLIENT_SECRET=your_client_secret
```

**Example Response**:
```json
{
  "platform": "zoom",
  "meeting_id": "83518750960",
  "join_url": "https://us05web.zoom.us/j/83518750960?pwd=...",
  "meeting_passcode": "789012",
  "status": "successfully_created"
}
```

### 2. Google Meet Integration ✅

**Status**: Fully working with real meetings

**Authentication**: Service Account
- Service Account Email
- Service Account Private Key (JSON)

**Meeting Creation**:
- Creates Google Calendar event
- Auto-generates Google Meet link
- Attendees can join directly from calendar invite
- Supports event descriptions and attendee lists

**Setup**: See [GOOGLE_MEET_SETUP.md](GOOGLE_MEET_SETUP.md)

**Environment Variables**:
```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=cps-google-meet@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

**Example Response**:
```json
{
  "platform": "google_meet",
  "meeting_id": "abcd-efgh-ijkl",
  "join_url": "https://meet.google.com/abc-defg-hij",
  "calendar_event": "https://calendar.google.com/calendar/...",
  "status": "successfully_created"
}
```

### 3. In-Person Meetings ✅

**Status**: Supported with location info

**Meeting Creation**:
- No API calls required
- Returns location information
- Can be displayed on appointment cards

**Example Response**:
```json
{
  "platform": "in-person",
  "location": "Counseling & Psychology Services Office",
  "join_url": null
}
```

## Frontend Implementation

### Intake Form Changes

The intake form (`frontend/src/app/intake/page.tsx`) includes a "How to Meet" selector:

```tsx
<label>How to Meet</label>
<div>
  ✓ Zoom Video Call
  ✓ Google Meet
  ✓ In Person
</div>
```

**Form submission includes**:
```json
{
  "phq9_responses": [...],
  "gad7_responses": [...],
  "preferred_platform": "zoom|google_meet|in_person"
}
```

### Appointment Display

After submission, users see meeting details:

```
✅ Appointment Scheduled
📅 Date: March 15, 2026 at 2:00 PM
🎥 JOIN ZOOM →  [Click to join]
📧 Details sent to your email

OR for Google Meet:
🎥 JOIN GOOGLE MEET → [Click to join]

OR for In-Person:
📍 In-Person: CPS Office
```

## API Endpoints

### Submit Intake (POST `/api/intake/submit`)

**Request**:
```json
{
  "phq9_responses": [{"score": 2}, ...],
  "preferred_platform": "zoom" | "google_meet" | "in_person",
  "is_anonymous": false,
  "purpose": "academic_struggles"
}
```

**Response** (201 Created):
```json
{
  "appointment_id": "507f1f77bcf86cd799439011",
  "counseling_id": "CPS-ABC12DEF",
  "case_id": "507f1f77bcf86cd799439010",
  "meeting_id": "83518750960 | abcd-efgh-ijkl | null",
  "join_url": "https://zoom.us/j/... | https://meet.google.com/... | null",
  "preferred_platform": "zoom | google_meet | in_person",
  "appointment_date": "2026-03-15T14:00:00",
  "status": "REQUESTED"
}
```

## Dependencies

### Python Packages

Add to `requirements.txt`:
```
pyJWT==2.8.1           # For Google Meet service account JWT
cryptography>=3.4.8    # For token encryption
requests>=2.28.0       # For API calls
flask-jwt-extended     # For JWT tokens
pymongo>=4.0           # For MongoDB
```

Install:
```bash
cd backend
pip install -r requirements.txt
```

## Testing

### Test Zoom Integration

```bash
python3 test_zoom_meeting_creation.py
```

### Test Google Meet Integration

```bash
python3 test_google_meet.py
```

### Test Frontend Integration

1. Navigate to `/intake`
2. Complete intake form
3. Select preferred platform
4. Submit form
5. Verify meeting link appears in response

## Environment Setup Checklist

### For Zoom
- [ ] Zoom Developer Account created
- [ ] Server-to-Server OAuth app created
- [ ] Scopes enabled: `meeting:write`, `meeting:read`, `user:read`
- [ ] Credentials added to `.env`:
  - ZOOM_ACCOUNT_ID
  - ZOOM_CLIENT_ID
  - ZOOM_CLIENT_SECRET

### For Google Meet
- [ ] Google Cloud Project created
- [ ] Google Calendar API enabled
- [ ] Service Account created
- [ ] Service Account key downloaded (JSON)
- [ ] Service Account shared with calendar
- [ ] PyJWT installed: `pip install PyJWT`
- [ ] Credentials added to `.env`:
  - GOOGLE_SERVICE_ACCOUNT_EMAIL
  - GOOGLE_SERVICE_ACCOUNT_KEY

### For Both
- [ ] Backend running on port 8000
- [ ] MongoDB running on port 27017
- [ ] Flask environment configured
- [ ] JWT tokens working for authentication
- [ ] Email integration configured (SMTP)

## Troubleshooting

### Zoom Issues

**Error**: "Invalid access token (124)"
- Verify OAuth2 credentials in `.env`
- Check Zoom app scopes enabled
- Regenerate client credentials if needed

**Error**: "User does not have permissions"
- Ensure account is activated in Zoom app
- Check Account ID is correct

### Google Meet Issues

**Error**: "GOOGLE_SERVICE_ACCOUNT_KEY not configured"
- Add JSON key to `.env`
- Format as single-line JSON with newlines escaped

**Error**: "Permission denied creating event"
- Verify service account email is shared with calendar
- Check Calendar API is enabled in Cloud Console
- Ensure edit permissions are granted

### Front-End Issues

**Platform selector not showing**:
- Ensure form has updated options
- Check `preferred_platform` is passed in submission

**Meeting link not displaying**:
- Verify `join_url` is in API response
- Check platform is correct in response
- Ensure email was sent with link

## Deployment Notes

### Production Checklist
- [ ] All credentials stored in secure environment variables (not in `.env`)
- [ ] JWT secrets rotated
- [ ] HTTPS enabled
- [ ] CORS properly configured for frontend domain
- [ ] Email service verified (SPF/DKIM)
- [ ] Both platform integrations tested end-to-end
- [ ] Rate limiting enabled on API endpoints
- [ ] Logging configured for monitoring
- [ ] Database backups configured

### Scaling Considerations
- Token caching reduces API calls to Zoom/Google
- Meet creation is sync (5-10 second latency) - consider async for high volume
- Consider dedicated calendar for Google Meet events
- Monitor API quotas on both platforms

## Future Enhancements

- [ ] Microsoft Teams integration
- [ ] Async meeting creation (background jobs)
- [ ] Timezone support for meeting times
- [ ] Calendar sync for counselors
- [ ] Meeting recording management
- [ ] Waiting room for Zoom
- [ ] Custom reminders before meetings
- [ ] Meeting participant management

## References

- [Zoom API Documentation](https://developers.zoom.us/docs/api/)
- [Google Calendar API Documentation](https://developers.google.com/calendar)
- [Setup Guides](#files)
  - [ZOOM_SETUP.md](ZOOM_SETUP.md)
  - [GOOGLE_MEET_SETUP.md](GOOGLE_MEET_SETUP.md)

## Support

For issues or questions:
1. Check the relevant setup guide
2. Review troubleshooting sections
3. Check backend logs for detailed error messages
4. Verify credentials in `.env`
5. Test with standalone test scripts
