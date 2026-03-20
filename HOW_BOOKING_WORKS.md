# How the Booking System Works

**Date**: March 20, 2026

## Overview

The booking system allows students to schedule appointments without completing a full intake first. Here's the complete flow:

---

## Step-by-Step Flow

### 1. **Student Visits Book Appointment Page**
📍 Route: `/book-appointment`

**What happens:**
- Page loads
- System checks if student has an existing case
- If no case found → Shows **"Quick Appointment Request"** minimal form

### 2. **Student Fills Minimal Form** (Only if no case exists)
**Form collects:**
- ✍️ **Reason for visit** (required) - e.g., "stress management", "relationship issues"
- 🎯 **Preferred session type** - Video, Phone, or In-Person

**Example:**
```
"What would you like to discuss?"
→ "I'm having trouble managing test anxiety and focusing on my studies"

"Preferred session type"
→ "Video Call"
```

### 3. **Case Created** (Backend)
Endpoint: `POST /api/cases`
- Creates a **minimal case** with:
  - `student_id` - Who's requesting
  - `presenting_issue` - The reason they provided
  - `preferred_platform` - Their session preference
  - `assigned_counselor_id` - **NULL** (empty initially)
  - `transaction_type` - "SELF_REFERRED"
  - `client_status` - "ACTIVE"

**Response:**
```json
{
  "case_id": "507f1f77bcf86cd799439011",
  "success": true,
  "message": "Case created successfully"
}
```

### 4. **Booking Calendar Appears**
After case is created, the `ScheduleAppointmentCalendar` component loads.

**What it does:**
- Fetches the case details: `GET /api/cases/{caseId}`
- ❌ **Used to fail** → "No counselor assigned to your case"
- ✅ **Now fixed** → Returns case with counselor (see fix below)

### 5. **Auto-Assignment of Counselor** ✨ (THE FIX)

When student requests an appointment:
Endpoint: `POST /api/appointments/request`

**Backend flow:**
```
1. Create appointment with:
   - case_id
   - requested_start (student's chosen time)
   - requested_end
   - status: "REQUESTED"

2. Trigger auto_assign_appointment()
   - Find available counselor for that time
   - Assign counselor to APPOINTMENT
   - ✨ NEW: Also assign counselor to CASE
     (before: only appointment got counselor)
     (now: both appointment and case get counselor)

3. Return appointment details with assigned counselor
```

**Key fix in code:**
```python
# After assigning counselor to appointment, also update the case:
if case and not case.get('assigned_counselor_id'):
    db.db.cases.update_one(
        {"_id": appointment['case_id']},
        {"$set": {
            "assigned_counselor_id": counselor['_id'],
            "updated_at": datetime.utcnow()
        }}
    )
```

### 6. **Calendar Loads Successfully** 🎉
- ScheduleAppointmentCalendar fetches case again
- **Now finds the assigned counselor** (thanks to auto-assignment)
- Shows calendar with availability for that counselor
- Student can see available time slots

### 7. **Student Selects Time Slot**
- Calendar shows available slots for the assigned counselor
- Student clicks on their preferred time
- Slot is reserved temporarily

### 8. **Appointment Confirmed**
- Student clicks "Confirm Booking"
- Appointment status → "CONFIRMED"
- Confirmation email sent to student
- Counselor receives notification

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ STUDENT: Book Appointment Page                              │
└─────────────────────────────────┬───────────────────────────┘
                                  │
                    ┌─────────────▼────────────┐
                    │ Create Minimal Case      │
                    │ POST /api/cases          │
                    │ ✓ reason_for_visit      │
                    │ ✓ preferred_platform    │
                    │ ✗ counselor (NULL)      │
                    └─────────────┬────────────┘
                                  │
                 ┌────────────────▼─────────────────┐
                 │ ScheduleAppointmentCalendar      │
                 │ - Fetch case: GET /api/case/{id} │
                 │ - Look for counselor_id          │
                 └────────────────┬──────────────────┘
                                  │
                    ┌─────────────▼────────────┐
                    │ Request Appointment      │
                    │ POST /api/appointments   │
                    │ - case_id                │
                    │ - requested_start        │
                    │ - requested_end          │
                    └─────────────┬────────────┘
                                  │
                  ┌───────────────▼──────────────┐
                  │ AUTO-ASSIGNMENT TRIGGERED    │
                  │ Find available counselor     │
                  │ Assign to appointment ✓      │
                  │ Assign to case ✓ (NEW FIX)  │
                  └───────────────┬──────────────┘
                                  │
      ┌───────────────────────────▼───────────────────────────┐
      │ COUNSELOR NOW ASSIGNED TO BOTH:                       │
      │ • Case (assigned_counselor_id)                        │
      │ • Appointment (counselor_id)                          │
      │ ✅ Calendar can now find counselor!                   │
      └───────────────────────────┬───────────────────────────┘
                                  │
                    ┌─────────────▼────────────┐
                    │ Calendar Fetches Again   │
                    │ GET /api/cases/{id}      │
                    │ ✅ Finds counselor_id    │
                    │ ✅ Loads availability    │
                    └─────────────┬────────────┘
                                  │
                    ┌─────────────▼────────────┐
                    │ Student Selects Time     │
                    │ Confirms Appointment     │
                    │ Status → CONFIRMED       │
                    └────────────────────────┘
```

---

## What Each Component Does

### **Frontend: `/frontend/src/app/(dashboard)/book-appointment/page.tsx`**

**Responsibilities:**
- ✅ Detect if student has a case
- ✅ Show minimal form if no case exists
- ✅ Handle form submission → creates case via API
- ✅ Pass case_id to ScheduleAppointmentCalendar
- ✅ Display booking confirmation
- ✅ **NEW**: Handle denied appointments with resubmission form

**State Management:**
```typescript
[caseId] - The case being booked for
[showMinimalForm] - Whether to show quick form
[deniedAppointment] - If appointment was denied
[showResubmissionForm] - Resubmission UI
```

### **Frontend: `/frontend/src/components/ScheduleAppointmentCalendar.tsx`**

**Responsibilities:**
- ✅ Fetch case details (get `assigned_counselor_id`)
- ✅ Fetch available slots for that counselor
- ✅ Display calendar with available times
- ✅ Submit appointment request
- ✅ Show error: "No counselor assigned" (if auto-assignment fails)

**Key Fix:**
- Now successfully retrieves `assigned_counselor_id` from case because auto-assignment updated the case

### **Backend: `/backend/blueprints/appointments.py`**

**Key Functions:**

1. **`auto_assign_appointment(appointment_id)`**
   - Finds available counselor
   - Assigns to appointment
   - ✨ **NEW**: Also assigns to case
   - Returns: `(success, counselor_id, message)`

2. **`request_appointment()` endpoint**
   - Creates new appointment
   - Calls `auto_assign_appointment()`
   - Returns appointment with assigned counselor

3. **Approval/Denial Endpoints** (newly added)
   - `/api/appointments/<id>/approve` - Counselor approves
   - `/api/appointments/<id>/deny` - Counselor denies with reason

### **Backend: `/backend/blueprints/cases.py`**

**Key Functions:**

1. **`create_case()` endpoint**
   - Creates case with minimal info
   - Sets `assigned_counselor_id = None` initially
   - Later updated by auto_assign_appointment()

2. **`get_case()` endpoint**
   - Returns case details (role-based access)
   - ScheduleAppointmentCalendar uses this to fetch `assigned_counselor_id`

---

## Error Handling

### **Error: "No counselor assigned to your case"**

This error appears when:
1. ❌ `assigned_counselor_id` is NULL/null in case
2. ❌ Auto-assignment failed
3. ❌ No available counselors for selected time

**Solutions:**
- Contact support (shows contact link)
- Try different time slots
- Try different session type (video vs phone vs in-person)

### **Error: "Failed to load case information"**

Causes:
- Invalid case ID
- Network error
- API server down

**Solution:**
- Refresh the page
- Check browser console for details

---

## Approval/Denial Workflow Integration

Once appointment is booked and auto-assigned:

### **Counselor Reviews:**
- Counselor receives notification of new appointment
- Counselor can **approve** or **deny**

### **If Approved:** ✅
- Appointment status → "APPROVED" → "CONFIRMED"
- Student sees confirmation
- Ready for session

### **If Denied:** ❌
- Appointment status → "DENIED"
- Student sees denial reason (e.g., "Time conflict - please choose another slot")
- Resubmission form appears
- Student can:
  - Select their current status (dropdown)
  - Add context
  - Submit new appointment request

---

## Status Progression

```
Case Created       Appointment Requested   Counselor Assigned
     ↓                     ↓                      ↓
student_id          REQUESTED            (auto-assigned)
presenting_issue    ↓                      ↓
preferred_platform  MATCHED              assigned_counselor_id
assigned_counselor: ↓
  NULL (initially)  See Counselor
                    ↓
                    APPROVED
                    ↓
                    CONFIRMED
                    ↓
                    Ready for Session
```

---

## Summary

### **The Complete Booking Journey:**

1. **Student arrives** → No intake barrier
2. **Minimal form** → Just reason + platform preference
3. **Case created** → No counselor yet
4. **Appointment requested** → Backend finds available counselor
5. **Auto-assignment** → **FIX**: Counselor assigned to BOTH appointment AND case
6. **Calendar loads** → Now successfully finds counselor
7. **Time selected** → Appointment confirmed
8. **Counselor reviews** → Can approve or deny
9. **If denied** → Student can resubmit with context
10. **Ready** → Session scheduled!

---

## Technical Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 13+ TypeScript, Tailwind CSS |
| Backend | Python Flask, MongoDB |
| Auth | JWT (JSON Web Tokens) |
| API | RESTful endpoints |
| Database | MongoDB with role-based access |

---

## Files Involved

**Frontend:**
- `/frontend/src/app/(dashboard)/book-appointment/page.tsx` - Main booking interface
- `/frontend/src/components/ScheduleAppointmentCalendar.tsx` - Calendar/slot selection

**Backend:**
- `/backend/blueprints/appointments.py` - Appointment endpoints, auto-assignment
- `/backend/blueprints/cases.py` - Case management
- `/backend/models.py` - Data models and enums

**Fixed Issue:**
- `auto_assign_appointment()` now updates case with counselor (was only updating appointment)

---

## Next Steps

- ✅ Booking flow working
- ✅ Auto-assignment fixed
- ✅ Approval/denial workflow added
- ⏳ Counselor admin dashboard (to approve/deny)
- ⏳ Email notifications
- ⏳ Integration tests
