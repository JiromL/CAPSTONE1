# Quick Test Guide: Appointment Booking Fix

## The Fix
Added `student_id` field to appointments when they're created. This fixes the "Task details not available yet" error.

## Step-by-Step Testing

### 1. Start Servers
```bash
# Terminal 1 - Backend
cd /Users/jeromelouiesantos/CAPSTONE1/backend
lsof -i :5001 | awk 'NR>1 {print $2}' | xargs kill -9 2>/dev/null
PORT=5001 python3 app.py

# Terminal 2 - Frontend
cd /Users/jeromelouiesantos/CAPSTONE1/frontend
lsof -i :3000 | awk 'NR>1 {print $2}' | xargs kill -9 2>/dev/null
npm run dev
```

Wait for both to start (backend: "Running on", frontend: "ready - started server on")

### 2. Open App
Go to http://localhost:3000

### 3. Login as Student
- Use existing student credentials, or
- Create new account at signup

### 4. Book Appointment
1. Click "Book Appointment" in navigation
2. Fill the form:
   - Purpose: "Academic Support" (or any option)
   - Concern: "I need help with my studies"
   - Referral Type: "Self-referred"
   - Communication Method: "In-Person" (or Zoom/Google Meet)
   - Date: Pick a date in the future
   - Time: Pick a time
3. Click "Submit"

### 5. What You Should See
✅ Green success screen: "Appointment Booked Successfully!"
✅ Message: "Your appointment request has been submitted"
✅ "View My Appointments" button

### 6. View the Appointment (Critical Test)
**Option A: Check Appointments Page**
- Click "View My Appointments" or navigate to /appointments
- You should see the appointment listed
- Click "View" button on the appointment
- **ERROR SHOULD NOT APPEAR** - You should see appointment details

**Option B: Check Tasks Page**
- Navigate to /tasks
- Find the appointment in "Scheduled" tab
- Click "View" button
- **ERROR SHOULD NOT APPEAR** - You should see appointment details

**Option C: Check Dashboard**
- Navigate to /dashboard
- "Next Appointment" card should show the appointment
- Calendar should show the appointment

### 7. What SHOULD Work
✅ See "Appointment Booked Successfully"
✅ View appointment details at /tasks/[id]
✅ See appointment on /appointments page
✅ See appointment on dashboard
✅ See appointment in tasks list

### 8. What Should NOT Happen
❌ "Task details not available yet" error - FIXED
❌ "Insufficient permissions" error - FIXED
❌ Blank appointment detail page

## If It Still Fails
1. Make sure you restarted the backend (Python process)
2. Check backend logs for errors: look for "Error" in terminal output
3. Check browser console for errors (F12 → Console tab)
4. Clear browser cache and reload
5. Check that appointment shows in /appointments before clicking View

## Expected Status
After booking:
- Status: "SCHEDULED" or "MATCHED" (depending on counselor availability)
- Both should work fine now
