# Risk-Based Appointment Scheduling - Implementation Complete

## Summary

The risk-based appointment scheduling system is now fully implemented with:
- **Backend**: Complete API endpoints and counselor availability logic
- **Frontend**: Updated UrgencyScheduler component with full slot selection UI
- **Integration Ready**: All components ready for integration into intake form

---

## Implementation Details

### Backend Changes (Flask - `backend/blueprints/intake.py`)

#### New Functions Added:

1. **`get_available_intake_counselors(exclude_ids=[])`** (Lines ~30-45)
   - Queries MongoDB for users with IC (Intake Counselor) role
   - Returns list of available counselor documents
   - Used for counselor availability checking

2. **`find_next_available_slot(risk_level, max_wait_minutes=30)`** (Lines ~45-140)
   - Core scheduling algorithm
   - Returns: `(datetime, urgency_text, status, is_user_selectable)`
   - **User Choice Logic**:
     - `RED`: Returns first available slot with `is_user_selectable=False` (auto-assigned)
     - `YELLOW`: Returns same/next day slots with `is_user_selectable=True`
     - `GREEN`: Returns tomorrow+ slots with `is_user_selectable=True`
   - Business hours: 9 AM - 5 PM
   - Skips weekends automatically
   - 30-minute slot granularity

3. **`get_available_slots_for_risk(risk_level, num_days=7)`** (Lines ~140-200)
   - Generates multiple available time slots for user selection
   - Returns list of up to 20 available slots
   - Format:
     ```python
     {
       "date": "2026-03-22",
       "time": "10:00",
       "day_of_week": "Sunday",
       "is_today": false,
       "is_tomorrow": false
     }
     ```

4. **`_get_priority_queue_stats()`** (Lines ~200-215)
   - Aggregates priority queue statistics
   - Returns:
     ```python
     {
       "urgent_red": 2,
       "high_priority_yellow": 5,
       "standard_green": 12
     }
     ```

#### New API Endpoints:

1. **`GET /api/intake/available-slots`** (Lines ~1460-1500)
   - Query parameters:
     - `risk_level`: 'RED', 'YELLOW', 'GREEN'
     - `count`: number of slots (default: 5, max: 10)
   - Response:
     ```json
     {
       "available_slots": [...],
       "total_slots_available": 8,
       "risk_level": "GREEN",
       "is_user_choice": true,
       "choice_message": "✓ Full choice - select your preferred time",
       "counselors_available": 3,
       "counselor_names": ["John Smith", "Jane Doe"],
       "priority_queues": {
         "urgent_red": 1,
         "high_priority_yellow": 3,
         "standard_green": 10
       }
     }
     ```

2. **`POST /api/intake/select-appointment-time`** (Lines ~1500-1570)
   - Allows users to select specific appointment times
   - Request body:
     ```json
     {
       "appointment_datetime": "2026-03-22T10:00:00",
       "risk_level": "GREEN"
     }
     ```
   - Validates:
     - RED users cannot select (returns 403)
     - YELLOW: appointment must be today or tomorrow
     - GREEN: appointment must be tomorrow or later
     - Appointment must be during business hours (9-17)
     - Slot must still be available
   - Response:
     ```json
     {
       "success": true,
       "selected_appointment": {
         "datetime": "2026-03-22T10:00:00",
         "date": "2026-03-22",
         "time": "10:00 AM",
         "risk_level": "GREEN",
         "counselors_available": 3
       },
       "message": "Appointment scheduled for March 22 at 10:00 AM"
     }
     ```

---

### Frontend Changes (Next.js - `frontend/src/components/UrgencyScheduler.tsx`)

#### Updated Component Structure:

**Props**:
```typescript
interface UrgencySchedulerProps {
  riskLevel: 'RED' | 'YELLOW' | 'GREEN';
  onSlotSelected?: (dateTime: string) => void;  // Called when user confirms slot
  onError?: (error: string) => void;            // Error callback
}
```

#### Component Features:

1. **Risk Level Badge**
   - Color-coded (Red/Yellow/Green)
   - Displays risk label and choice message
   - Animated loading state

2. **Queue Statistics Display**
   - Shows current queue counts:
     - Urgent RED cases
     - High Priority YELLOW cases
     - Standard GREEN cases
   - Color-coded grid layout

3. **Counselor Availability Info**
   - Shows number of available intake counselors
   - Updates based on real counselor data

4. **Appointment Slot Selection**
   - **For RED (Urgent)**:
     - Shows auto-assigned slot
     - No selection required
     - Displays immediate assignment notice
   - **For YELLOW (High Priority)**:
     - Shows selectable slots (same/next day only)
     - User can pick from available times
     - Submit button to confirm

   - **For GREEN (Standard)**:
     - Shows full 7-day availability
     - User can choose any future date
     - Submit button to confirm

5. **UI Elements**:
   - First slot marked as "RECOMMENDED"
   - Active selection highlighted in blue
   - Disable state during submission
   - Empty state handling

#### API Integration:
- Fetches available slots from `/api/intake/available-slots`
- Submits selection to `/api/intake/select-appointment-time`
- Uses JWT token from localStorage (`access_token`)
- Proper error handling and user feedback

---

## Integration Instructions

### Step 1: Import Component in Intake Form
File: `frontend/src/app/intake/page.tsx` (or wherever intake form is)

```tsx
import UrgencyScheduler from '@/components/UrgencyScheduler';

// In your intake form JSX, after risk level is calculated:
{riskLevel && (
  <UrgencyScheduler 
    riskLevel={riskLevel}
    onSlotSelected={(dateTime) => {
      // Store the selected appointment datetime
      setFormData(prev => ({
        ...prev,
        appointmentDateTime: dateTime
      }));
    }}
    onError={(error) => {
      // Display error to user
      setErrorMessage(error);
    }}
  />
)}
```

### Step 2: Store Selected Appointment in Intake Submission
Modify the intake form submission to include the selected appointment:

```tsx
const handleSubmitIntake = async (formData) => {
  // formData should include appointmentDateTime from UrgencyScheduler callback
  const response = await fetch('/api/intake/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      ...formData,
      appointment_datetime: formData.appointmentDateTime // From selector
    })
  });
  // ... handle response
};
```

### Step 3: Update Backend Intake Submission
File: `backend/blueprints/intake.py` - `@intake_bp.route('/create', methods=['POST'])`

Modify appointment creation to use selected DateTime:

```python
@intake_bp.route('/create', methods=['POST'])
@jwt_required()
def create_intake():
    data = request.get_json()
    
    # If user selected an appointment time, use it
    if data.get('appointment_datetime'):
        appointment_datetime = datetime.fromisoformat(data['appointment_datetime'].replace('Z', '+00:00'))
    else:
        # Fallback to calculated time (for backward compatibility)
        appointment_datetime, _, _, _ = find_next_available_slot(risk_level)
    
    # Create appointment with user-selected or auto-assigned time
    appointment = {
        'scheduled_start': appointment_datetime,
        'scheduled_end': appointment_datetime + timedelta(minutes=50),  # 50-minute slots
        # ... rest of appointment fields
    }
    
    # Save appointment
    # ... rest of your code
```

---

## Risk Level Thresholds

Risk levels are calculated based on assessment scores during intake:

```
RED (Critical) - Urgent within 30 mins:
  - PHQ-9 score > 20 (severe depression)
  - GAD-7 score > 15 (severe anxiety)
  - PSS score > 30 (high stress)
  - OR suicidal ideation indicated

YELLOW (High) - Same day or next day:
  - PHQ-9 score > 15 (moderate-to-severe)
  - GAD-7 score > 12 (moderate-to-severe)
  - No suicidal ideation

GREEN (Standard) - Tomorrow onwards:
  - PHQ-9 score ≤ 15
  - GAD-7 score ≤ 12
  - PSS score ≤ 30
```

---

## Testing the System

### 1. Test Available Slots Endpoint
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5001/api/intake/available-slots?risk_level=GREEN&count=5"
```

### 2. Test Slot Selection
```bash
curl -X POST http://localhost:5001/api/intake/select-appointment-time \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "appointment_datetime": "2026-03-22T10:00:00",
    "risk_level": "GREEN"
  }'
```

### 3. Test with Frontend Component
1. Start intake form in browser
2. Complete assessment questions
3. Verify risk level is calculated correctly
4. Verify UrgencyScheduler loads with appropriate slots
5. For RED: Verify auto-assignment
6. For YELLOW/GREEN: Select a slot and confirm

---

## Key Features Implemented

✅ **Counselor Availability Checking**
- Queries real counselor schedules
- Avoids double-booking
- Respects IC role assignment

✅ **User Choice Restrictions**
- RED: No choice (auto-assigned)
- YELLOW: Limited (same/next day only)
- GREEN: Flexible (any future time)

✅ **Business Hours Enforcement**
- 9 AM - 5 PM only
- Weekends skipped
- 30-minute slot granularity

✅ **Queue Priority Management**
- Shows current queue statistics
- Priority based on risk level
- Submission time tiebreaker

✅ **Error Handling**
- No available counselors
- Fully booked appointments
- Invalid time selection
- Permission checks

✅ **Responsive UI**
- Mobile-friendly design
- Clear visual feedback
- Loading states
- Error messages

---

## Next Steps

1. **Integrate UrgencyScheduler into intake form**
   - Import component
   - Pass risk level prop
   - Handle slot selection callback

2. **Update intake submission endpoint**
   - Store selected appointment datetime
   - Associate appointment correctly

3. **Test end-to-end flow**
   - Complete intake → slot selection → appointment creation
   - Verify counselor assignments
   - Check priority queue ordering

4. **Add appointment confirmation email**
   - Send to student with appointment details
   - Include Zoom/Google Meet link if applicable

5. **Monitor counselor queue**
   - Add admin dashboard to view priority queue
   - Allow manual intervention if needed

---

## File Locations

- **Backend Functions**: `/backend/blueprints/intake.py` (lines ~30-215)
- **Backend Endpoints**: `/backend/blueprints/intake.py` (lines ~1460-1570)
- **Frontend Component**: `/frontend/src/components/UrgencyScheduler.tsx`

---

## Status

✅ **Backend**: Complete and syntax-validated
✅ **Frontend**: Complete and ready to use
🔄 **Integration**: Ready to integrate into intake form
🔄 **Testing**: Pending end-to-end testing

**Last Updated**: [Current Date]
**Commit**: Push changes with message: "Implement risk-based appointment scheduling with user choice restrictions and counselor availability"
