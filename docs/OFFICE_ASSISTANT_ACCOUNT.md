# Office Assistant Account

## Credentials

| Field | Value |
|-------|-------|
| **Email** | office.assistant@counseling.edu |
| **Username** | office_assistant |
| **Password** | officestaff123 |
| **Role** | STAFF |
| **ID** | 69b1e3e40367c3f4eedfa06c |

## Permissions & Access

The STAFF role (Office Assistant) can:
- Access office staff management endpoints
- View batch appointment assignment queue
- Generate workload reports for counselors
- Get reassignment suggestions
- Manage appointment scheduling
- View counselor availability

## API Endpoints (STAFF Only)

```
POST   /api/appointments/staff/batch-assign
GET    /api/appointments/staff/workload-report
GET    /api/appointments/staff/reassignment-suggestions
```

## Dashboard Access

Office Assistant can access:
- `/dashboard/staff-settings` - Calendar and staff settings
- Google Calendar integration
- Appointment batch operations
- Workload management tools

## Related Files

- **Setup Script**: `setup_office_assistant.py` - Creates STAFF user
- **Auth Update**: `setup_auth.py` - Updated to include STAFF credentials
- **Role Definition**: `backend/models.py` - STAFF role defined
- **Endpoints**: `backend/blueprints/appointments.py` - Staff-specific endpoints
