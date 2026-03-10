# Zoom Integration Setup

This document explains how to set up real Zoom meeting creation for the CPS system.

## Prerequisites

The Zoom integration uses **Server-to-Server OAuth 2.0** authentication to create meetings on behalf of a Zoom account.

## Step 1: Create a Zoom App

1. Go to [Zoom App Marketplace](https://marketplace.zoom.us)
2. Click "Develop" → "Build App"
3. Select **Server-to-Server OAuth** as the app type
4. Fill in the app name and contact information
5. Accept terms and create the app

## Step 2: Generate Credentials

1. In your Zoom app dashboard, go to the **"App Credentials"** section
2. Copy your **Client ID** and **Client Secret**
3. Save these securely - you'll need them for environment variables

## Step 3: Configure Environment Variables

Add the following to your `.env` file:

```env
ZOOM_CLIENT_ID=your_client_id_here
ZOOM_CLIENT_SECRET=your_client_secret_here
```

## Step 4: Enable Features

In your Zoom app settings:

1. Go to **"Scopes"**
2. Add the following scopes:
   - `meeting:write` - Create meetings
   - `meeting:read` - Read meeting details
   - `user:read` - Read user information

## Step 5: Account Setup

1. From the app dashboard, go to **"Information"** → **"Accounts"**
2. Authorize your Zoom account to use this app
3. Note the **Account ID** if needed

## Testing

### Test with curl:

```bash
# If credentials are set, try submitting an intake form with preferred_platform=zoom
curl -X POST http://localhost:8000/api/intake/submit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "purpose": "personal",
    "concerns": ["anxiety"],
    "preferred_platform": "zoom",
    "phq9_responses": [{"score": 2}, ...],
    "consent_given": true
  }'
```

### Expected Response:

If credentials are configured:
```json
{
  "appointment": {
    "meeting_link": "https://zoom.us/j/123456789",
    "meeting_id": 123456789,
    "meeting_passcode": "ABC123",
    "status": "successfully_created"
  }
}
```

If credentials are missing (fallback):
```json
{
  "appointment": {
    "meeting_link": "https://zoom.us/j/987654321",
    "meeting_id": 987654321,
    "meeting_passcode": "XYZ789",
    "status": "test_meeting"
  }
}
```

## Troubleshooting

### "Missing credentials" message

- Verify `ZOOM_CLIENT_ID` and `ZOOM_CLIENT_SECRET` are in your `.env` file
- Restart the backend after updating `.env`
- Run: `cd backend && source .venv/bin/activate && python3 -c "from config import Config; c = Config(); print(f'Client ID: {c.ZOOM_CLIENT_ID}')"`

### "Failed to create Zoom meeting" error

- Verify API credentials are correct
- Check that your Zoom account is authorized for the app
- Ensure the `meeting:write` scope is enabled
- Check backend logs for detailed error messages

### Meeting link is valid but can't join

- Verify the meeting ID is correct
- Join as authenticated Zoom user first
- Try joining with the passcode if prompted

## Production Considerations

1. **Rate Limiting**: Zoom API has rate limits. Implement caching for meeting creation.
2. **Error Handling**: Current implementation falls back to test meetings. Consider alerting admins on API failures.
3. **Webhook Events**: Consider adding Zoom webhooks to track meeting starts/ends.
4. **User Management**: For large-scale deployment, consider pre-creating accounts for counselors.
5. **Recurring Meetings**: Current implementation creates single meetings. For follow-ups, consider recurring meetings.

## API Documentation

- [Zoom Create Meeting API](https://developers.zoom.us/docs/api/rest/reference/zoom-api/methods/#operation/userMeetingsPost)
- [Zoom Server-to-Server OAuth](https://developers.zoom.us/docs/internal-apps/s2s-oauth/)

## Security Notes

- Never commit `.env` files with real credentials
- Rotate credentials periodically
- Use separate Zoom accounts for dev/staging/production
- Monitor API usage for suspicious activity
