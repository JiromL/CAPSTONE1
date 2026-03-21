# Case Management API - Quick Reference for Frontend

## 🚀 Base URL
```
http://localhost:8000/api/case-management
```

## 🔐 Authentication
All endpoints require JWT Bearer token:
```javascript
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

## 📝 Session Notes API

### Create Session Note
```
POST /session-notes
{
  "case_id": "507f1f77bcf86cd799439011",
  "session_date": "2024-03-22T14:00:00",
  "session_type": "individual|group|family",
  "topics_discussed": ["Topic 1", "Topic 2"],
  "interventions": ["Intervention 1"],
  "client_response": "Response description",
  "homework_assigned": "Homework details",
  "mood_rating": 7,
  "risk_flagged": false,
  "risk_notes": "Optional"
}
```
Response: 201 Created
```javascript
{
  "note_id": "507f1f77bcf86cd799439012",
  "message": "Session note created successfully",
  "version": 1
}
```

### Edit Session Note
```
PUT /session-notes/{note_id}
{
  "topics_discussed": ["Updated Topic 1"],
  "interventions": ["Updated Intervention"],
  "change_reason": "Added more details"
}
```
Response: 200 OK
```javascript
{
  "message": "Session note updated successfully",
  "version": 2,
  "version_id": "507f1f77bcf86cd799439013"
}
```

### Get Version History
```
GET /session-notes/{note_id}/versions
```
Response: 200 OK
```javascript
{
  "note_id": "507f1f77bcf86cd799439012",
  "total_versions": 2,
  "current_version": 2,
  "versions": [
    {
      "version_id": "507f1f77bcf86cd799439013",
      "version_number": 2,
      "edited_by": "507f1f77bcf86cd799439000",
      "edited_at": "2024-03-22T14:30:00",
      "change_reason": "Added more details"
    }
  ]
}
```

### View Specific Version
```
GET /session-notes/{note_id}/version/{version_id}
```
Response: 200 OK
```javascript
{
  "version_id": "507f1f77bcf86cd799439013",
  "version_number": 2,
  "edited_by": "507f1f77bcf86cd799439000",
  "edited_at": "2024-03-22T14:30:00",
  "previous_values": {...},
  "new_values": {...},
  "change_reason": "Added more details"
}
```

### Delete Session Note
```
DELETE /session-notes/{note_id}
```
Response: 200 OK
```javascript
{
  "message": "Session note deleted successfully"
}
```

### Restore Session Note (Admin Only)
```
POST /session-notes/{note_id}/restore
```
Response: 200 OK
```javascript
{
  "message": "Session note restored successfully"
}
```

---

## 🤝 Handovers API

### Initiate Handover
```
POST /handovers
{
  "case_id": "507f1f77bcf86cd799439011",
  "to_counselor_id": "507f1f77bcf86cd799439020",
  "reason": "Counselor relocation",
  "notes": "Optional handover notes"
}
```
Response: 201 Created
```javascript
{
  "handover_id": "507f1f77bcf86cd799439030",
  "message": "Handover initiated successfully",
  "status": "INITIATED"
}
```

### Get Handover History
```
GET /handovers/{case_id}
```
Response: 200 OK
```javascript
{
  "case_id": "507f1f77bcf86cd799439011",
  "handover_count": 1,
  "handovers": [
    {
      "handover_id": "507f1f77bcf86cd799439030",
      "status": "INITIATED",
      "reason": "Counselor relocation",
      "from_counselor_id": "507f1f77bcf86cd799439010",
      "to_counselor_id": "507f1f77bcf86cd799439020",
      "initiated_at": "2024-03-22T10:00:00",
      "completed_at": null
    }
  ]
}
```

### Approve Handover
```
PUT /handovers/{handover_id}/approve
```
Response: 200 OK
```javascript
{
  "message": "Handover approved",
  "status": "PENDING_APPROVAL"
}
```

### Reject Handover
```
PUT /handovers/{handover_id}/reject
```
Response: 200 OK
```javascript
{
  "message": "Handover rejected",
  "status": "REJECTED"
}
```

### Complete Handover
```
POST /handovers/{handover_id}/complete
```
Response: 200 OK
```javascript
{
  "message": "Handover completed successfully",
  "status": "COMPLETED"
}
```

---

## 🏥 Referrals API

### Log Referral
```
POST /referrals
{
  "case_id": "507f1f77bcf86cd799439011",
  "referral_type": "hospital|psychiatrist|physical_health|emergency|welfare|legal|other",
  "agency_name": "Philippine General Hospital",
  "contact_person": "Dr. Santos",
  "contact_email": "dr.santos@pgh.gov.ph",
  "contact_phone": "+63-2-555-1234",
  "notes": "Referral for psychiatric evaluation"
}
```
Response: 201 Created
```javascript
{
  "referral_id": "507f1f77bcf86cd799439040",
  "message": "Referral logged successfully",
  "status": "INITIATED"
}
```

### Update Referral Status
```
PUT /referrals/{referral_id}/status
{
  "status": "SENT|RECEIVED|ACCEPTED|REJECTED|PENDING_RESPONSE|PENDING_FOLLOWUP|COMPLETED"
}
```
Response: 200 OK
```javascript
{
  "message": "Referral status updated",
  "status": "SENT"
}
```

### Log Follow-up
```
POST /referrals/{referral_id}/follow-up
{
  "action_taken": "Called agency to confirm receipt",
  "notes": "Confirmed with receiving hospital",
  "next_followup": "2024-03-29"
}
```
Response: 201 Created
```javascript
{
  "message": "Follow-up logged successfully"
}
```

### Get Case Referrals
```
GET /referrals/{case_id}
```
Response: 200 OK
```javascript
{
  "case_id": "507f1f77bcf86cd799439011",
  "referral_count": 1,
  "referrals": [
    {
      "referral_id": "507f1f77bcf86cd799439040",
      "referral_type": "hospital",
      "agency_name": "Philippine General Hospital",
      "status": "SENT",
      "created_at": "2024-03-22T11:00:00",
      "follow_up_count": 1
    }
  ]
}
```

---

## 📅 Timeline API

### Get Case Timeline
```
GET /cases/{case_id}/timeline
GET /cases/{case_id}/timeline?type=status_change
GET /cases/{case_id}/timeline?from=2024-01-01&to=2024-12-31
```
Response: 200 OK
```javascript
{
  "case_id": "507f1f77bcf86cd799439011",
  "event_count": 5,
  "timeline": [
    {
      "event_type": "case_created",
      "timestamp": "2024-03-10T09:00:00",
      "description": "Case created for individual type",
      "initiator": "507f1f77bcf86cd799439001"
    },
    {
      "event_type": "status_change",
      "timestamp": "2024-03-10T10:00:00",
      "description": "Status changed to INTAKE_SCHEDULED",
      "reason": "First appointment booked",
      "initiator": "507f1f77bcf86cd799439001"
    },
    {
      "event_type": "session_note_added",
      "timestamp": "2024-03-15T14:00:00",
      "description": "Session note created - individual",
      "session_date": "2024-03-15T14:00:00",
      "initiator": "507f1f77bcf86cd799439002"
    }
  ]
}
```

---

## 📊 Status API

### Change Case Status
```
POST /cases/{case_id}/status
{
  "status": "NEW|INTAKE_SCHEDULED|ACTIVE|CLOSED|REFERRED",
  "reason": "Student completed counseling goals"
}
```
Response: 200 OK
```javascript
{
  "message": "Case status updated successfully",
  "new_status": "CLOSED"
}
```

### Get Status History
```
GET /cases/{case_id}/status-history
```
Response: 200 OK
```javascript
{
  "case_id": "507f1f77bcf86cd799439011",
  "current_status": "ACTIVE",
  "history_count": 3,
  "status_history": [
    {
      "status": "NEW",
      "changed_at": "2024-03-10T09:00:00",
      "changed_by": "507f1f77bcf86cd799439001",
      "reason": "Case created"
    },
    {
      "status": "INTAKE_SCHEDULED",
      "changed_at": "2024-03-10T10:30:00",
      "changed_by": "507f1f77bcf86cd799439001",
      "reason": "First appointment booked"
    }
  ]
}
```

---

## 🔍 Audit Log API

### Get Case Audit Trail
```
GET /cases/{case_id}/audit-log
```
Response: 200 OK
```javascript
{
  "case_id": "507f1f77bcf86cd799439011",
  "audit_entry_count": 10,
  "audit_log": [
    {
      "timestamp": "2024-03-22T14:30:00",
      "action": "edit",
      "entity_type": "session_note",
      "changed_by": "507f1f77bcf86cd799439002",
      "previous_values": {...},
      "new_values": {...},
      "reason": "Added more details"
    }
  ]
}
```

---

## ❌ Error Responses

### 400 Bad Request
```javascript
{
  "error": "case_id, session_date, and session_type are required"
}
```

### 403 Forbidden
```javascript
{
  "error": "Insufficient permissions to create session notes"
}
```

### 404 Not Found
```javascript
{
  "error": "Case not found"
}
```

### 409 Conflict
```javascript
{
  "error": "Cannot edit deleted session note"
}
```

---

## 🔐 Permission Requirements by Role

| Operation | STUDENT | COUNSELOR | CASE_MANAGER | ADMIN |
|-----------|---------|-----------|--------------|-------|
| Create Session Note | ❌ | ✅ | ✅ | ✅ |
| Edit Session Note | ❌ | ✅ | ✅ | ✅ |
| View Session Notes | ❌ | ✅ | ✅ | ✅ |
| Delete Session Note | ❌ | ✅ | ✅ | ✅ |
| Restore Session Note | ❌ | ❌ | ❌ | ✅ |
| Initiate Handover | ❌ | ✅ | ✅ | ✅ |
| Manage Referrals | ❌ | ✅ | ✅ | ✅ |
| View Case Timeline | ❌ | ✅ | ✅ | ✅ |
| Change Case Status | ❌ | ✅ | ✅ | ✅ |
| View Audit Log | ❌ | ✅ | ✅ | ✅ |

---

## 📱 Frontend Integration Example

```javascript
// Get JWT token from login
const token = localStorage.getItem('access_token');

// Create session note
const createSessionNote = async (caseId, data) => {
  const response = await fetch(
    'http://localhost:8000/api/case-management/session-notes',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        case_id: caseId,
        ...data
      })
    }
  );
  return response.json();
};

// Get case timeline
const getCaseTimeline = async (caseId) => {
  const response = await fetch(
    `http://localhost:8000/api/case-management/cases/${caseId}/timeline`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.json();
};
```

---

## 🎯 Common Use Cases

### Scenario 1: Document a Counseling Session
1. POST /session-notes (create note)
2. Later: PUT /session-notes/{id} (edit with additional info)
3. GET /session-notes/{id}/versions (audit trail)

### Scenario 2: Transfer Case to Another Counselor
1. POST /handovers (initiate)
2. PUT /handovers/{id}/approve (new counselor approves)
3. POST /handovers/{id}/complete (finalize)
4. GET /cases/{id}/timeline (see handover in timeline)

### Scenario 3: Patient Referral to Hospital
1. POST /referrals (log hospital referral)
2. PUT /referrals/{id}/status (mark as SENT)
3. POST /referrals/{id}/follow-up (log follow-up calls)
4. PUT /referrals/{id}/status (mark as RECEIVED/ACCEPTED)

### Scenario 4: Case Review
1. GET /cases/{id}/timeline (view complete history)
2. GET /cases/{id}/audit-log (detailed who/what/when)
3. GET /cases/{id}/status-history (status progression)
4. GET /handovers/{id} (past handovers)

---

## 🚀 Deployment Checklist

- [x] Backend running on port 8000
- [x] Database collections created
- [x] Indexes created
- [x] Authentication integrated
- [x] Permissions enforced
- [x] Audit logging active
- [ ] Frontend UI components created
- [ ] Integration tests completed
- [ ] Production deployment

---

**Last Updated**: March 22, 2026  
**Status**: Ready for Frontend Integration ✅
