# Quick Integration Checklist

## Risk-Based Appointment Scheduling - Integration Steps

### Backend ✅ READY
- [x] `get_available_intake_counselors()` - Queries IC role users
- [x] `find_next_available_slot()` - Core scheduling logic with user choice flags  
- [x] `get_available_slots_for_risk()` - Returns multiple slots for selection
- [x] `_get_priority_queue_stats()` - Queue statistics aggregation
- [x] `GET /api/intake/available-slots` - Endpoint for slot retrieval
- [x] `POST /api/intake/select-appointment-time` - Endpoint for user slot selection

### Frontend ✅ READY
- [x] `UrgencyScheduler.tsx` component
  - Shows risk level badge with color coding
  - Displays counselor availability
  - Shows queue statistics
  - Auto-assigns RED risk (no selection)
  - Allows YELLOW risk to selection (same/next day)
  - Allows GREEN risk full selection (tomorrow+)

---

## Integration Workflow

### Phase 1: Import Component
Add to intake form page:
```tsx
import UrgencyScheduler from '@/components/UrgencyScheduler';
```

### Phase 2: Render Component
In intake form JSX (after risk level calculated):
```tsx
{riskLevel && (
  <UrgencyScheduler 
    riskLevel={riskLevel as 'RED' | 'YELLOW' | 'GREEN'}
    onSlotSelected={(dateTime) => {
      setFormData(prev => ({
        ...prev,
        appointment_datetime: dateTime
      }));
    }}
    onError={(error) => setError(error)}
  />
)}
```

### Phase 3: Update Submission
Pass selected appointment to backend:
```tsx
const response = await fetch('/api/intake/submit', {
  method: 'POST',
  body: JSON.stringify({
    ...formData,
    appointment_datetime: formData.appointment_datetime // From UrgencyScheduler
  })
});
```

### Phase 4: Backend Appointment Creation
Use selected time if available, else calculate:
```python
appointment_dt = (
  datetime.fromisoformat(data['appointment_datetime'])
  if data.get('appointment_datetime')
  else find_next_available_slot(risk_level)[0]
)
```

---

## Risk Level Determination

Add to assessment component:
```typescript
const calculateRiskLevel = (scores) => {
  const { phq9, gad7, pss, suicidal } = scores;
  
  if (suicidal || phq9 > 20 || gad7 > 15 || pss > 30) return 'RED';
  if (phq9 > 15 || gad7 > 12) return 'YELLOW';
  return 'GREEN';
};
```

---

## API Response Examples

### GET /api/intake/available-slots
```json
{
  "available_slots": [
    {"date": "2026-03-22", "time": "10:00", "day_of_week": "Sunday"},
    {"date": "2026-03-22", "time": "10:30", "day_of_week": "Sunday"}
  ],
  "is_user_choice": true,
  "choice_message": "✓ Full choice - select your preferred time",
  "priority_queues": {
    "urgent_red": 1,
    "high_priority_yellow": 3,
    "standard_green": 10
  }
}
```

### POST /api/intake/select-appointment-time
```json
{
  "success": true,
  "selected_appointment": {
    "datetime": "2026-03-22T10:00:00",
    "date": "2026-03-22",
    "time": "10:00 AM"
  }
}
```

---

## Testing Commands

### 1. Get Available Slots (as student)
```bash
curl -H "Authorization: Bearer STUDENT_TOKEN" \
  "http://localhost:5001/api/intake/available-slots?risk_level=GREEN&count=5"
```

### 2. Select Appointment (as student)
```bash
curl -X POST http://localhost:5001/api/intake/select-appointment-time \
  -H "Authorization: Bearer STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "appointment_datetime": "2026-03-22T10:00:00",
    "risk_level": "GREEN"
  }'
```

### 3. Check Priority Queue
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:5001/api/intake/priority-queue"
```

---

## Expected Behavior by Risk Level

| Level | User Choice | Window | Slots Shown | Auto-Assigned |
|-------|-------------|--------|-------------|---------------|
| **RED** | ❌ No | Now to EOD | 1 | ✅ Yes |
| **YELLOW** | ✅ Limited | Today/Tomorrow | 3-5 | ❌ No |
| **GREEN** | ✅ Full | Tomorrow+ | 5-8 | ❌ No |

---

## Troubleshooting

**Problem**: "No intake counselors available"
- Solution: Create IC role users in database first

**Problem**: "This time slot is no longer available"
- Solution: User took too long selecting, suggest refreshing slots

**Problem**: RED risk user tries to select slot
- Solution: Returns 403 error - component should prevent this

**Problem**: YELLOW risk user picks time not in same/next day
- Solution: Returns 400 error - component limits visible options

---

## Files Modified
- ✅ `/backend/blueprints/intake.py` - Added scheduling functions & endpoints
- ✅ `/frontend/src/components/UrgencyScheduler.tsx` - Updated component with slot selection
- ✅ `/RISK_BASED_SCHEDULING_COMPLETE.md` - Full implementation documentation

## Status
✅ All code complete and tested
✅ Backend syntax validated  
✅ Frontend component ready
🔄 Integration awaiting intake form update
