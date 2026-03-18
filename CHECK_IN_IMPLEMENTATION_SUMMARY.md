# Check-In System Implementation Summary

## What's New

Added a comprehensive **Check-In System** for managing existing clients who don't require active ongoing counseling but need periodic monitoring and status updates.

---

## Problem It Solves

**Before:** 
- All clients were either "in active counseling" or "closed"
- No clear workflow for transitioning clients to periodic monitoring
- Difficult to track status changes or non-counseling interactions
- No distinction between active clients and check-in-only clients

**After:**
- Clear client status tracking (ACTIVE, INACTIVE, CHECK_IN_ONLY, etc.)
- Separate check-in workflow for monitoring without active sessions
- Transaction type tracking (new intake vs. check-in vs. referral)
- Check-in history with detailed audit trail
- Overdue check-in alerts
- Easy status transitions

---

## Key Components

### 1. **Client Status Field** (New to Cases)
Tracks the current service status of each client:
- `ACTIVE` - Active counseling
- `INACTIVE` - Not receiving services
- `CHECK_IN_ONLY` - Periodic check-ins only
- `WITH_MH_CHECK_IN` - Collaborative care, check-in focused
- `UNDER_ACCOMMODATION` - SDFO accommodations
- `TERMINATION_PENDING` - In process of closing

### 2. **Transaction Type** (New to Cases)
Tracks how the client came into the system:
- `NEW_INTAKE` - First-time intake
- `CHECK_IN` - Periodic check-in
- `SELF_REFERRED` - Student self-referral
- `REFERRED` - Referred from another department
- `WALK_IN` - Walk-in visit
- `FOLLOW_UP` - Follow-up contact

### 3. **Check-In Records** (New Collection)
Captures details of each interaction:
- Check-in type (STATUS_UPDATE, WELFARE_CHECK, REFERRAL_FOLLOW_UP, CRISIS_INTERVENTION)
- Contact method (IN_PERSON, PHONE, EMAIL, VIDEO)
- Status before/after
- Concern tracking
- Action items with due dates
- Outcome tracking
- Next check-in scheduling

### 4. **New Endpoints**

#### Check-In Management
```
POST   /api/check-ins/create              - Create new check-in
GET    /api/check-ins/<check_in_id>       - Get check-in details
GET    /api/check-ins/<case_id>/history   - Get all check-ins for case
PUT    /api/check-ins/<check_in_id>       - Update check-in notes
GET    /api/check-ins/list                - Get pending/overdue check-ins
GET    /api/check-ins/summary/status      - Get dashboard summary
```

#### Case Status Management
```
PUT    /api/cases/<case_id>/status        - Update client status
```

---

## Use Cases Now Supported

### 1. **Post-Counseling Monitoring**
- Complete 8 sessions → Status: CHECK_IN_ONLY
- Quarterly phone check-ins
- Re-engage if issues emerge

### 2. **Collaborative Care**
- With external mental health provider
- Status: WITH_MH_CHECK_IN
- Track coordination

### 3. **Accommodation Tracking**
- SDFO students
- Status: UNDER_ACCOMMODATION
- Document compliance

### 4. **Crisis Follow-Up**
- After crisis intervention
- Frequent check-ins for safety
- Type: CRISIS_INTERVENTION

### 5. **Alumni Support**
- Graduated students
- Status: CHECK_IN_ONLY
- Low-frequency monitoring

---

## Data Model Changes

### Updated Case Schema
```javascript
{
  // Existing fields...
  _id, student_id, assigned_counselor_id, status, case_type, etc.
  
  // NEW FIELDS:
  client_status: String,              // ACTIVE, CHECK_IN_ONLY, etc.
  transaction_type: String,           // NEW_INTAKE, CHECK_IN, etc.
  primary_concern: String,            // Can differ from presenting_issue
  check_ins: [{                       // List of check-in references
    check_in_id: ObjectId,
    check_in_date: Date,
    type: String
  }],
  status_change_reason: String
}
```

### New Check-In Collection
```javascript
{
  _id: ObjectId,
  case_id: ObjectId,
  client_id: ObjectId,
  checked_in_by: ObjectId,
  
  check_in_type: String,              // STATUS_UPDATE, WELFARE_CHECK, etc.
  contact_method: String,             // IN_PERSON, PHONE, EMAIL, VIDEO
  duration_minutes: Number,
  
  client_status_before: String,
  client_status_after: String,
  concern_before: String,
  concern_after: String,
  
  notes: String,
  action_items: [{
    action: String,
    due_date: Date
  }],
  referrals_made: [String],
  
  outcome: String,                    // RESOLVED, ONGOING, REFERRED
  next_check_in_date: Date,
  
  created_at: Date,
  updated_at: Date
}
```

### New Enums (in models.py)
```python
class ClientStatus(Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    CHECK_IN_ONLY = "CHECK_IN_ONLY"
    WITH_MH_CHECK_IN = "WITH_MH_CHECK_IN"
    UNDER_ACCOMMODATION = "UNDER_ACCOMMODATION"
    TERMINATION_PENDING = "TERMINATION_PENDING"

class TransactionType(Enum):
    NEW_INTAKE = "NEW_INTAKE"
    CHECK_IN = "CHECK_IN"
    SELF_REFERRED = "SELF_REFERRED"
    REFERRED = "REFERRED"
    WALK_IN = "WALK_IN"
    FOLLOW_UP = "FOLLOW_UP"
```

---

## Files Modified/Created

### Created
- `backend/blueprints/check_ins.py` - Complete check-in blueprint (350+ lines)
- `CHECK_IN_SYSTEM_GUIDE.md` - Comprehensive documentation
- `test_check_in_system.py` - End-to-end test script

### Modified
- `backend/models.py` - Added ClientStatus and TransactionType enums
- `backend/blueprints/cases.py` - Added client_status, transaction_type, primary_concern fields and status update endpoint
- `backend/blueprints/__init__.py` - Added check_ins_bp import
- `backend/app.py` - Registered check_ins blueprint

---

## API Examples

### Create Check-In
```bash
POST /api/check-ins/create
{
  "case_id": "case_id",
  "check_in_type": "STATUS_UPDATE",
  "contact_method": "PHONE",
  "duration_minutes": 30,
  "notes": "Client doing well, no concerns",
  "outcome": "ONGOING",
  "next_check_in_date": "2026-06-15"
}
```

### Update Client Status
```bash
PUT /api/cases/<case_id>/status
{
  "client_status": "CHECK_IN_ONLY",
  "reason": "Completed counseling, transitioning to periodic monitoring"
}
```

### Get Pending Check-Ins
```bash
GET /api/check-ins/list
```

Response shows:
- Cases with CHECK_IN_ONLY or WITH_MH_CHECK_IN status
- Overdue check-ins (next_check_in_date passed)
- Days since last check-in
- Sorted by priority

### Get Dashboard Summary
```bash
GET /api/check-ins/summary/status
```

Response shows:
- Count by client status
- Check-in type distribution
- Total cases and check-ins

---

## Testing

Run the comprehensive test script:
```bash
python3 test_check_in_system.py
```

Tests cover:
1. Update client status
2. Create check-in (STATUS_UPDATE)
3. Get check-in details
4. Create second check-in (WELFARE_CHECK)
5. Get check-in history
6. Update check-in notes
7. Get pending check-ins
8. Get summary
9. Status transitions
10. Final status confirmation

---

## Workflow Example

### Scenario: Student Completes Counseling
```
Week 1-4: Active counseling (ACTIVE)
  └─ 8 sessions, PHQ-9 score improves

Week 5: Graduation from counseling
  └─ PUT /api/cases/{id}/status
     {client_status: "CHECK_IN_ONLY"}

Month 1: First check-in
  └─ POST /api/check-ins/create
     {check_in_type: "STATUS_UPDATE", duration: 30}
     Response: Check-in complete, next scheduled 3 months

Month 4: Overdue check-in alert
  └─ GET /api/check-ins/list
     Response: is_overdue: true

Month 4: Welfare check
  └─ POST /api/check-ins/create
     {check_in_type: "WELFARE_CHECK", duration: 15}
  └─ Client doing well, schedule next check-in 6 months

Month 10: Scheduled check-in
  └─ Routine check-in completes cycle
```

---

## Permissions

Check-in operations require:
- **Create**: EDIT_CASE permission
- **View**: VIEW_CASE permission
- **Update**: EDIT_CASE permission

Accessible by: Counselor, Psychologist, DPO, Admin

---

## Best Practices

1. **Always schedule next check-in** - Set next_check_in_date for continuity
2. **Document thoroughly** - Clear notes help future contacts
3. **Track outcomes** - Use RESOLVED/ONGOING/REFERRED appropriately
4. **Use action items** - Document follow-ups with due dates
5. **Monitor overdue** - Dashboard alerts for missed check-ins
6. **Smooth transitions** - Use status update endpoint when transitioning
7. **Log changes** - Reason field explains status changes

---

## Future Enhancements

1. **Automated reminders** - Send check-in overdue notifications
2. **Dashboard widgets** - Visual status distribution
3. **Scheduling integration** - Calendar-based check-in scheduling
4. **Email notifications** - Alert users of upcoming check-ins
5. **Bulk operations** - Transition multiple clients at once
6. **Analytics** - Check-in effectiveness metrics
7. **Mobile support** - Check-in app for on-the-go updates

---

## Database Migration

No migration needed - system works with new and existing cases.
- New cases automatically get client_status field
- Existing cases get null values, can be populated via update endpoint
- Check-ins collection created automatically on first write

---

## Backward Compatibility

- All existing endpoints continue to work
- New fields are optional on case creation
- Default values provided if not specified
- Existing cases not affected until manually updated

---

## Summary

The Check-In System enables:
✅ Monitoring existing clients without active counseling
✅ Clear status tracking and transitions
✅ Transaction history and audit trail
✅ Overdue check-in alerts
✅ Collaborative care coordination
✅ SDFO accommodation tracking
✅ Crisis intervention follow-up
✅ Alumni/ongoing support management

**Result:** Better client follow-up, clearer service pathways, and comprehensive interaction tracking.

