# MHBot Integration Guide

## Overview

The Campus Counseling Services now integrates with **MHBot Backend Server** to display student mental health status using the **PERMA framework** (Positive Psychology model).

This allows counselors to:
- View student PERMA labels (Excelling, Surviving, etc.) before/during appointments
- Understand student mental health context from assessments
- Link student cases to their MHBot usernames
- Track wellness trends across student population

## Setup

### Environment Variables

Add these to your `.env` file:

```bash
# MHBot Server Configuration
MHBOT_BASE_URL=https://pchrd-ema.dlsu.edu.ph/backend
MHBOT_API_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Getting MHBot Credentials

1. **Base URL**: Your MHBot server URL (provided by IT)
2. **API Token**: JWT token with scope `dashboard` from MHBot
   - Contact MHBot admin for token
   - Token format: `Bearer <JWT_TOKEN>`

### Database

MHBot integration uses existing `users` and `cases` collections with new field:

```mongodb
db.users.updateMany(
  {},
  {
    $set: {
      "mhbot_username": null,           // Will store "ema_lVk" format
      "mhbot_linked_at": null           // Timestamp when linked
    }
  }
)
```

## API Endpoints

### 1. Lookup Student PERMA by Username

**Request:**
```bash
POST /api/mhbot/lookup
Content-Type: application/json
Authorization: Bearer {JWT_TOKEN}

{
  "username": "ema_lVk"
}
```

**Response:**
```json
{
  "username": "ema_lVk",
  "success": true,
  "latest_label": "Surviving",
  "latest_date": "2026-02-09T12:53:41.599567Z",
  "history": [
    {
      "date": "2026-02-09T12:53:41.599567Z",
      "perma_label": null
    },
    {
      "date": "2026-01-31T07:31:51.506794Z",
      "perma_label": "Surviving"
    }
  ]
}
```

### 2. Get Pending Students with PERMA Status

**Request:**
```bash
GET /api/mhbot/students/pending
Authorization: Bearer {JWT_TOKEN}
```

**Response:**
```json
{
  "total": 5,
  "students": [
    {
      "appointment_id": "507f1f77bcf86cd799439011",
      "case_id": "507f1f77bcf86cd799439012",
      "student_id": "507f1f77bcf86cd799439013",
      "student_name": "John Doe",
      "student_email": "john@dlsu.edu.ph",
      "mhbot_username": "ema_lVk",
      "requested_start": "2026-03-15T10:00:00Z",
      "requested_end": "2026-03-15T11:00:00Z",
      "appointment_type": "Initial",
      "perma_status": {
        "label": "Surviving",
        "date": "2026-02-09T12:53:41.599567Z"
      },
      "case_status": "ACTIVE"
    }
  ]
}
```

### 3. Link Case to MHBot Account

**Request:**
```bash
POST /api/mhbot/case/{case_id}/link-mhbot
Content-Type: application/json
Authorization: Bearer {JWT_TOKEN}

{
  "mhbot_username": "ema_lVk"
}
```

**Response:**
```json
{
  "success": true,
  "message": "MHBot username linked successfully",
  "case_id": "507f1f77bcf86cd799439012",
  "mhbot_username": "ema_lVk",
  "latest_perma_label": "Surviving"
}
```

### 4. Unlink Case from MHBot

**Request:**
```bash
POST /api/mhbot/case/{case_id}/unlink-mhbot
Authorization: Bearer {JWT_TOKEN}
```

**Response:**
```json
{
  "success": true,
  "message": "MHBot username unlinked successfully",
  "removed_username": "ema_lVk"
}
```

### 5. Get PERMA Distribution Stats

**Request:**
```bash
GET /api/mhbot/stats/perma-distribution
Authorization: Bearer {JWT_TOKEN}
```

**Response:**
```json
{
  "total_students_tracked": 150,
  "distribution": {
    "Excelling": 23,
    "Thriving": 31,
    "Stable": 45,
    "Managing": 28,
    "Struggling": 15,
    "Surviving": 8,
    "Crisis": 0,
    "No Data": 0
  }
}
```

### 6. Check MHBot Server Health

**Request:**
```bash
GET /api/mhbot/health
```

**Response:**
```json
{
  "status": "healthy",
  "mhbot_server": "https://pchrd-ema.dlsu.edu.ph/backend",
  "message": "MHBot server is reachable"
}
```

**Error Response (503):**
```json
{
  "status": "unhealthy",
  "mhbot_server": "https://pchrd-ema.dlsu.edu.ph/backend",
  "error": "HTTP 503"
}
```

### 7. Get User's PERMA History

**Request:**
```bash
GET /api/mhbot/perma/{username}?limit=10
Authorization: Bearer {JWT_TOKEN}
```

**Response:**
```json
{
  "username": "ema_lVk",
  "latest_label": "Surviving",
  "latest_date": "2026-02-09T12:53:41.599567Z",
  "history": [
    {
      "date": "2026-02-09T12:53:41.599567Z",
      "perma_label": null
    },
    {
      "date": "2026-01-31T07:31:51.506794Z",
      "perma_label": "Surviving"
    }
  ],
  "status": "ok"
}
```

## PERMA Framework

The PERMA model measures wellbeing across 5 dimensions:

| Label | Level | Color | Icon | Description |
|-------|-------|-------|------|-------------|
| **Excelling** | Excellent | 🟢 Green | ✨ | Outstanding wellbeing, no concerns |
| **Thriving** | Good | Emerald | 🌟 | Good mental health, positive outlook |
| **Stable** | Neutral | Blue | 🔵 | Stable condition, functioning well |
| **Managing** | Caution | Yellow | ⚠️ | Managing challenges, some stress |
| **Struggling** | Concerning | Orange | 😟 | Significant struggles, needs support |
| **Surviving** | Severe | Red | 🆘 | Severe difficulties, crisis intervention needed |
| **Crisis** | Emergency | Dark Red | 🚨 | Immediate crisis, emergency response |

## Frontend Component

### Pending Students View

**Location:** `/dashboard/pending`

**Features:**
- **Lookup Section**: Search for student by MHBot username
- **Pending List**: Shows all pending appointments with student info
- **PERMA Status Badge**: Color-coded PERMA label display
- **Link Action**: One-click option to link a found username to a student case

**States:**
- ✅ **Linked**: Student has MHBot account linked, showing current PERMA status
- ❓ **Not Linked**: Student doesn't have MHBot account linked
- 🔄 **Loading**: Fetching PERMA data from MHBot
- ⚠️ **Error**: MHBot server unavailable or user not found

### Usage Flow

1. **View Pending Students**
   - Navigate to `/dashboard/pending`
   - See all pending appointments with PERMA status

2. **Lookup Student**
   - Enter MHBot username (e.g., `ema_lVk`)
   - Click "Search"
   - View current PERMA label and history

3. **Link to Case**
   - Click "Link {username}" button
   - Student case now connected to MHBot account
   - Future appointments show their PERMA status automatically

4. **Monitor Trends**
   - See PERMA history (last 5 updates)
   - Understand context for counseling session
   - Track wellness improvements over time

## Security

### Endpoints Protected By

- ✅ JWT Authentication (all endpoints except `/health`)
- ✅ Role-Based Access Control:
  - `VIEW_CASE`: Read PERMA data, lookup, view pending
  - `EDIT_CASE`: Link/unlink MHBot accounts

### Token Handling

- MHBot API token stored in `.env`
- Never exposed to frontend
- Passed in Authorization header only
- HTTPS only in production

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `"Invalid MHBot username"` | Username doesn't exist in MHBot | Verify username format (ema_xxx) |
| `"MHBot API timeout"` | Server not responding | Check MHBOT_BASE_URL, network connection |
| `"401 Unauthorized"` | Invalid API token | Verify MHBOT_API_TOKEN in .env |
| `"User not found"` | Student doesn't exist in MHBot | Confirm student has MHBot account |

### Graceful Degradation

- If MHBot is down: "No Data" badge shown, appointment still confirmed
- If username invalid: User notified, case not linked
- If network timeout: Error message, user can retry

## Connection Status

**Check Integration Status:**
```bash
curl -X GET "http://localhost:8000/api/mhbot/health" \
  -H "accept: application/json"
```

**Response indicates:**
- ✅ `"status": "healthy"` → MHBot connected
- ⚠️ `"status": "timeout"` → Network issue
- ❌ `"status": "unhealthy"` → Server error

## Monitoring PERMA Distribution

**Admin Dashboard Query:**
```bash
curl -X GET "http://localhost:8000/api/mhbot/stats/perma-distribution" \
  -H "Authorization: Bearer {JWT_TOKEN}"
```

**Use Cases:**
- Track student population wellness
- Identify high-risk cohorts (many "Surviving")
- Report on intervention effectiveness
- Plan counseling resources

## Testing

### Manual Test Flow

1. **Setup**
   ```bash
   # Verify credentials
   MHBOT_BASE_URL=https://pchrd-ema.dlsu.edu.ph/backend
   MHBOT_API_TOKEN=your_bearer_token
   ```

2. **Test Lookup**
   ```bash
   curl -X POST "http://localhost:8000/api/mhbot/lookup" \
     -H "Authorization: Bearer {your_jwt}" \
     -H "Content-Type: application/json" \
     -d '{"username":"ema_lVk"}'
   ```

3. **Test Pending Students**
   ```bash
   curl -X GET "http://localhost:8000/api/mhbot/students/pending" \
     -H "Authorization: Bearer {your_jwt}"
   ```

4. **Test Linking**
   ```bash
   curl -X POST "http://localhost:8000/api/mhbot/case/{case_id}/link-mhbot" \
     -H "Authorization: Bearer {your_jwt}" \
     -H "Content-Type: application/json" \
     -d '{"mhbot_username":"ema_lVk"}'
   ```

## Architecture

### Data Flow

```
Frontend (User searches)
    ↓
POST /api/mhbot/lookup
    ↓
Backend calls MHBot API
    ↓
MHBot returns PERMA history
    ↓
Backend formats response
    ↓
Frontend displays in table
    ↓
User clicks "Link {username}"
    ↓
POST /api/mhbot/case/{id}/link-mhbot
    ↓
Backend stores username in user doc
    ↓
GET /api/mhbot/students/pending
    ↓
Backend fetches all students + PERMA
    ↓
Frontend shows linked students with status
```

### Files

**Backend:**
- `backend/blueprints/mhbot_integration.py` (new)
- `backend/app.py` (registers blueprint)

**Frontend:**
- `frontend/src/components/PendingStudentsWithPerma.tsx` (new)
- `frontend/src/app/dashboard/pending/page.tsx` (new)

## Limitations & Future

### Current Limitations
- Read-only from MHBot (no writing assessments back)
- Real-time sync happens on-demand only
- Requires manual username input to link

### Planned Enhancements
- 🚧 Auto-detect DLSU ID → MHBot username mapping
- 🚧 Real-time PERMA change notifications
- 🚧 Historical trend charts (PERMA over time)
- 🚧 Automated risk alerts (when status drops)
- 🚧 Batch student imports from MHBot
- 🚧 Integration with schedule (block busy times)

## Support

For issues:
1. Verify `MHBOT_BASE_URL` and `MHBOT_API_TOKEN` in `.env`
2. Check MHBot server status: `GET /api/mhbot/health`
3. Verify JWT token has `dashboard` scope
4. Check network connectivity to MHBot server
5. Review backend logs for detailed errors

---

**Version**: 1.0.0  
**Status**: Production Ready ✅  
**Updated**: March 2026  
