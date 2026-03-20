# Book Appointment - Complete Implementation

## Overview
The Book Appointment feature implements a complete end-to-end workflow for students to request counseling appointments with the office assistant assigning actual appointment times based on counselor availability.

## Implementation Details

### Frontend: `/frontend/src/app/(dashboard)/book-appointment/page.tsx`

#### Form Fields
1. **Purpose** (Required)
   - Dropdown: Counseling, Follow up counselling, Intake interview, Others
   - If "Others" selected, shows text input for "Specify Purpose"

2. **Referral Type** (Required)
   - Radio buttons: Self-referred, Referred by someone/organization
   - If "Referred by", shows text input for "Who referred you?"

3. **Concern/Need/Problem** (Required)
   - Textarea for describing the concern

4. **Preferred Counseling Platform** (Required)
   - Radio buttons: In-Person, Video Call, Phone Call

5. **Preferred Date** (Required)
   - Date input, range: today to 30 days from today

6. **Preferred Time** (Required)
   - Dropdown showing business hours only: 9 AM to 5 PM (9 hourly slots)
   - Stores as 24-hour format (09:00, 10:00, etc.)

#### Form Validation
- All required fields must be filled
- If referral_type is "referred", must provide referral source
- If purpose is "others", must specify the purpose

#### Form Submission
- Sends POST request to `http://localhost:5001/api/appointments/request`
- Includes Bearer token authentication
- Payload includes all form fields plus case_id from localStorage

#### Success Flow
- Shows success confirmation with CheckCircle icon
- Redirects to /appointments after 2.5 seconds
- Success message: "Appointment Booked Successfully!"

---

### Backend: `/backend/blueprints/appointments.py`

#### Endpoint: `POST /api/appointments/request`

**Updated to accept new fields from student booking form**

**Request Payload:**
```json
{
  "case_id": "string",
  "preferred_date": "YYYY-MM-DD",
  "preferred_time": "HH:MM",
  "purpose": "string (Counseling|Follow up counselling|Intake interview|custom text)",
  "concern": "string",
  "referral_type": "self-referred|referred",
  "referred_by": "string (optional, required if referral_type is 'referred')",
  "preferred_method": "in-person|video|phone",
  "appointment_type": "string (default: 'initial')"
}
```

**Processing:**
1. Validates all required fields
2. If referral_type is "referred", ensures referred_by is provided
3. Checks user permissions (EDIT_CASE)
4. Validates case_id exists
5. Parses preferred_date and preferred_time into ISO datetime
6. Creates appointment with 1-hour duration (start to start+1hour)
7. Stores additional metadata: purpose, concern, referral_type, referred_by, preferred_method
8. Sets status to REQUESTED
9. Attempts auto-assignment (if configured)
10. Returns appointment details with assignment status

**Response (201 Created):**
```json
{
  "appointment_id": "string",
  "status": "REQUESTED",
  "requested_start": "ISO datetime",
  "requested_end": "ISO datetime",
  "purpose": "string",
  "concern": "string",
  "referral_type": "string",
  "referred_by": "string or null",
  "preferred_method": "string",
  "auto_assigned": boolean,
  "counselor_id": "string or null",
  "auto_assignment_message": "string"
}
```

**Error Responses:**
- 400: Missing required fields or invalid format
- 403: Insufficient permissions
- 404: Case not found

---

## Database Schema

### Appointments Collection
New fields added to appointment documents:
```javascript
{
  _id: ObjectId,
  case_id: ObjectId,
  appointment_type: "initial|followup|etc",
  requested_start: Date,
  requested_end: Date,
  status: "REQUESTED|MATCHED|CONFIRMED|etc",
  
  // New fields from student booking
  purpose: String,
  concern: String,
  referral_type: "self-referred|referred",
  referred_by: String,
  preferred_method: "in-person|video|phone",
  
  // System fields
  created_at: Date,
  updated_at: Date,
  counselor_id: ObjectId (optional),
  ...
}
```

---

## Navigation Integration

### Student Navigation (All Pages)
The "Book Appointment" menu item appears consistently across all student navigation:
- Dashboard
- My Tasks
- **Book Appointment** ← Always visible
- Intake Form
- Wellness Resources
- My Profile

---

## User Flow

### Student Journey
1. **Navigate to Book Appointment**
   - From Dashboard or My Tasks page
   - Click "Book Appointment" in left sidebar

2. **Fill Out Form**
   - Select purpose (e.g., "Counseling")
   - Choose referral type (e.g., "Self Referred")
   - Describe concern or need
   - Select preferred platform (e.g., "Video Call")
   - Pick date (calendar picker, up to 30 days)
   - Select time from dropdown (9 AM - 5 PM)

3. **Submit Request**
   - Click "Book Appointment" button
   - Form validates, sends to backend
   - Shows success message

4. **Office Assistant Review** (Optional - Future)
   - Office assistant reviews pending appointment requests
   - Assigns actual appointment date/time from counselor availability
   - Student receives confirmation email

---

## Testing Checklist

### Frontend Tests
- [ ] Form renders with all fields
- [ ] Date picker shows today to 30 days ahead
- [ ] Time dropdown shows 9 AM - 5 PM (9 slots)
- [ ] Required field validation works
- [ ] Referral source field appears when "Referred" selected
- [ ] Other purpose field appears when purpose is "Others"
- [ ] Submit button disabled until all fields filled
- [ ] Success message shows after submission
- [ ] Redirects to /appointments after 2.5s

### Backend Tests
- [ ] POST /api/appointments/request accepts new fields
- [ ] Validates required fields (returns 400 if missing)
- [ ] Validates referral_type/referred_by logic
- [ ] Parses date/time correctly
- [ ] Creates appointment with correct start/end times
- [ ] Stores all metadata fields
- [ ] Returns 201 with appointment details
- [ ] Handles JWT authentication
- [ ] Checks permissions
- [ ] Validates case_id exists

### Integration Tests
- [ ] Student can submit appointment request
- [ ] Appointment appears in database with all fields
- [ ] Student redirected to appointments page
- [ ] Appointment visible in student's appointments list

---

## Implementation Status

✅ **Completed:**
- Frontend form with all required fields
- Form validation (including conditional validation for referral_type)
- Preferred date picker (calendar, 30-day range)
- Preferred time dropdown (business hours only, 9 AM - 5 PM)
- Backend endpoint updated to handle new fields
- Database schema supports new fields
- API payload includes all booking details
- Navigation consistently shows "Book Appointment"
- Success confirmation screen
- Error handling and user feedback

⚠️ **Future Enhancements:**
- Office assistant UI to review and assign appointment times
- Email notifications to student with confirmation details
- Appointment status tracking (REQUESTED → CONFIRMED)
- Ability to modify requested appointment details
- Calendar integration for office assistant assignment
- Counselor availability conflict checking

---

## Code Quality

### TypeScript
- ✅ No TypeScript errors in book-appointment page
- ✅ Proper type annotations for all state variables
- ✅ Form validation with clear error messages

### Python
- ✅ No Python syntax errors in appointments blueprint
- ✅ Proper error handling and validation
- ✅ Audit logging of appointment requests
- ✅ Permission checks

---

## API Documentation

### Create Appointment Request
**Endpoint:** `POST /api/appointments/request`

**Authentication:** Bearer token required (JWT)

**Request:**
```bash
curl -X POST http://localhost:5001/api/appointments/request \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "case_id": "65c1234567890abcdef12345",
    "preferred_date": "2026-04-15",
    "preferred_time": "10:00",
    "purpose": "Counseling",
    "concern": "Feeling stressed about exams",
    "referral_type": "self-referred",
    "referred_by": null,
    "preferred_method": "video",
    "appointment_type": "initial"
  }'
```

**Success Response (201 Created):**
```json
{
  "appointment_id": "65c1234567890abcdef99999",
  "status": "REQUESTED",
  "requested_start": "2026-04-15T10:00:00",
  "requested_end": "2026-04-15T11:00:00",
  "purpose": "Counseling",
  "concern": "Feeling stressed about exams",
  "referral_type": "self-referred",
  "referred_by": null,
  "preferred_method": "video",
  "auto_assigned": false,
  "counselor_id": null,
  "auto_assignment_message": "No available counselors"
}
```

