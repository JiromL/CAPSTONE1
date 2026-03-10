# Google Meet Integration Setup

This document explains how to set up real Google Meet meeting creation for the CPS system.

## Prerequisites

The Google Meet integration creates real meetings via the **Google Calendar API** using a **Service Account**.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a Project"** → **"New Project"**
3. Name it: `CPS Campus Counseling` (or similar)
4. Wait for project creation to complete

## Step 2: Enable Required APIs

1. In the Cloud Console, go to **APIs & Services** → **Library**
2. Search for and enable:
   - **Google Calendar API** - Click "Enable"
   - **Google Meet API** - Click "Enable" (if available)

## Step 3: Create Service Account

1. Go to **APIs & Services** → **Credentials**
2. Click **"Create Credentials"** → **"Service Account"**
3. Fill in:
   - **Service account name**: `cps-google-meet`
   - **Service account ID**: (auto-filled, e.g., `cps-google-meet@...iam.gserviceaccount.com`)
4. Click **"Create and Continue"**
5. Skip the optional steps and click **"Done"**

## Step 4: Generate Service Account Key

1. In **Credentials**, find your newly created service account
2. Click on the service account email
3. Go to the **"Keys"** tab
4. Click **"Add Key"** → **"Create new key"**
5. Select **"JSON"** format
6. Click **"Create"** - a JSON file will download

**⚠️ IMPORTANT**: Save this JSON file securely. It contains the private key.

## Step 5: Share Google Calendar with Service Account

1. Copy the service account email from the JSON key file (field: `client_email`)
2. Go to [Google Calendar](https://calendar.google.com/)
3. On the left sidebar, find **"Other calendars"**
4. Click the **"+"** → **"Subscribe to calendar"**
5. Paste the service account email
6. The service account can now create events on your calendar

Alternatively, if you want dedicated calendar:
1. Create a new calendar (e.g., "CPS Appointments")
2. Share it with the service account email with "Make changes to events" permission

## Step 6: Configure Environment Variables

Update your `.env` file with the service account details:

```env
# Google Meet service account credentials
GOOGLE_SERVICE_ACCOUNT_EMAIL=cps-google-meet@YOUR_PROJECT.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"cps-google-meet@...iam.gserviceaccount.com",...}'
```

**How to extract credentials from JSON file:**

1. Open the downloaded JSON file
2. Copy the **`client_email`** field
3. For the full JSON, either:
   - Option A: Convert to single line (replace newlines with `\n`):
     ```bash
     cat your-key-file.json | jq -c '.' > key-single-line.json
     # Then paste entire output as the value
     ```
   - Option B: Set it directly in production (use AWS Secrets Manager, etc.)

## Step 7: Install Required Package

The Google Meet integration requires PyJWT for service account authentication:

```bash
cd backend
pip install PyJWT
```

Update `requirements.txt`:
```
PyJWT==2.8.1
```

## Step 8: Test Integration

### Test with Python Script

Create `test_google_meet.py`:

```python
#!/usr/bin/env python3
import os
from datetime import datetime, timedelta
from pathlib import Path
import sys

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / 'backend'))

# Load environment
from dotenv import load_dotenv
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

# Import and test
from backend.integrations import GoogleMeetIntegration
from backend.config import Config

try:
    print("🔍 Testing Google Meet Integration...")
    
    # Initialize
    meet = GoogleMeetIntegration(Config)
    
    # Create test meeting
    test_time = datetime.utcnow() + timedelta(hours=2)
    
    result = meet.create_meeting(
        title="Test Meeting - CPS Google Meet",
        start_time=test_time,
        duration_minutes=60,
        description="Testing Google Meet integration"
    )
    
    print("✅ Google Meet Meeting Created Successfully!")
    print(f"🔗 Meeting ID: {result.get('meeting_id')}")
    print(f"🔗 Join URL: {result.get('join_url')}")
    print(f"📅 Start: {result.get('start_time')}")
    print(f"✅ Status: {result.get('status')}")
    
except Exception as e:
    print(f"❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()
```

Run the test:
```bash
python3 test_google_meet.py
```

## Step 9: Frontend Configuration (Optional)

If you want users to choose their preferred platform during intake, the frontend form should include:

```json
{
  "preferred_platform": "zoom" | "google_meet" | "in-person"
}
```

The intake endpoint already supports this - just ensure your form passes it.

## Troubleshooting

### Error: "GOOGLE_SERVICE_ACCOUNT_KEY not configured"
- Ensure `GOOGLE_SERVICE_ACCOUNT_KEY` is set in `.env`
- Check that the JSON is valid and properly formatted

### Error: "Failed to authenticate with Google"
- Verify the service account email is shared with your Google Calendar
- Check that the JSON key has correct `private_key` format
- Ensure the key wasn't rotated (regenerate if needed)

### Error: "Permission denied" creating calendar event
- Verify service account has edit rights on the target calendar
- Check that **Google Calendar API** is enabled in Cloud Console
- Ensure service account email is shared with edit permissions

### Google Meet link not appearing in response
- Meeting might still be created but `conferenceData` is empty
- This can happen if the account quota is exceeded
- Check [Google Cloud Quotas](https://console.cloud.google.com/apis/dashboard) page

## Reference: Supported Platforms

The intake form now supports three meeting platforms:

| Platform | Status | Implementation |
|----------|--------|-----------------|
| **Zoom** | ✅ Fully Working | OAuth2 Server-to-Server, real meetings |
| **Google Meet** | ✅ Fully Working | Service Account, real calendar events |
| **In-Person** | ✅ Supported | Returns location info only |

Users can select their preferred platform during intake, and the system will automatically create the appropriate meeting link.

## Next Steps

1. ✅ Set up service account credentials
2. ✅ Update `.env` with credentials
3. ✅ Install PyJWT dependency
4. ✅ Test with `test_google_meet.py`
5. ✅ Update frontend to show platform options
6. ✅ Deploy to production

## Additional Resources

- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- [Google Service Accounts](https://cloud.google.com/iam/docs/service-accounts)
- [Google Meet in Calendar Events](https://developers.google.com/calendar/api/guides/create-events#create_an_event_with_a_video_conference)
