# Campus Counseling & Psychology Services (CPS) System Design

**Version:** 1.0  
**Date:** February 10, 2026  
**Status:** Design & Development Phase  

---

## 1. System Purpose & Goals

**Primary Mission:**  
Provide a comprehensive digital platform for a university counseling and psychology services office to manage student intakes, clinical assessments, counselor-student appointments, ongoing session documentation, high-risk case monitoring, and referrals to external providers.

**Key Objectives:**  
- **Intake & Triage:** Rapid assessment of student mental health needs and risk level.  
- **Access & Booking:** Students self-serve for appointment scheduling; counselors efficiently match clients.  
- **Documentation:** Centralized clinical records for all student interactions and treatment plans.  
- **Risk Monitoring:** Real-time alerts and escalation for students showing signs of crisis.  
- **Continuity:** Seamless referrals to campus health, external mental health, or crisis services.  
- **Compliance & Audit:** Full record of system access and data changes (FERPA, legal holds).

---

## 2. System Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        USERS / CLIENTS                           │
│  (Students, Counselors, Intake Counselors, Admins)            │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS / REST
         ┌───────────────┴───────────────┐
         ▼                               ▼
    ┌─────────────┐              ┌─────────────────┐
    │   Frontend  │              │  Backend API    │
    │ (Next.js +  │              │ (Flask + Python │
    │  Tailwind)  │◄────REST────►│  + MongoDB)     │
    │  Port 3000  │              │  Port 5000      │
    └─────────────┘              └────────┬────────┘
                                          │
                                          │ Native Driver
                                          ▼
                                   ┌──────────────┐
                                   │   MongoDB    │
                                   │   Database   │
                                   └──────────────┘
```

### Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | Next.js, React, Tailwind CSS, TypeScript | 14+, 18+, 3.3+, 5+ |
| **Backend** | Flask, Python | 3.0+, 3.9+ |
| **Database** | MongoDB | 6.0+ |
| **Auth & JWT** | flask-jwt-extended | 4.0+ |
| **Validation** | Pydantic | 2.0+ |
| **ORM / ODM** | PyMongo | 4.7+ |

---

## 3. User Roles & Permissions

### Role Hierarchy (9 Tiers)

| Role | Examples | Key Permissions | Visibility |
|------|----------|-----------------|------------|
| **STUDENT** | Undergrad, Grad | View own case, request appointment | Self only |
| **STAFF** | Admin assistants | View cases, schedule | Assigned cases |
| **CSP** | Counselor Support Person | Create assessments, view case | Assigned cases |
| **CSC** | Counseling Support Case worker | Edit case, create assessments | Assigned cases |
| **IC** | Intake Counselor | Complete intake, endorse cases, triage | All cases |
| **CASE_MANAGER** | Care coordinator | Assign cases, manage workflows | All cases |
| **PSYCHOLOGIST** | Licensed psychologist | Full case view/edit, escalate crisis | All cases |
| **DPO** | Director of Psych Operations | Manage users, view audit, export data | All system |
| **ADMIN** | System admin | All permissions | Full system access |

**Permission Types (14 total):**  
VIEW_CASE, EDIT_CASE, VIEW_ASSESSMENT, CREATE_ASSESSMENT, VIEW_NOTES, EDIT_NOTES, VIEW_SENSITIVE_FIELDS, MANAGE_USERS, MANAGE_ROLES, VIEW_AUDIT_LOG, EXPORT_DATA, ASSIGN_CASES, VIEW_RISK_DASHBOARD, ESCALATE_CRISIS.

---

## 4. Core Workflows & User Journeys

### 4.1 Student Self-Service Intake

**Flow:**
1. Student logs in (or creates account).
2. Starts intake questionnaire (demographics, chief complaint, history).
3. System auto-scores screening tools (PHQ-9, GAD-7, PSS).
4. Case marked as `PENDING` intake review.
5. Intake Counselor reviews, endorses or requests more info.
6. Case moves to `ENDORSED` → available for counselor assignment.

**Actors:** Student, IC, Backend intake service.

### 4.2 Counselor Matching & Appointment Booking

**Flow:**
1. Student/Counselor requests appointment with date/time preferences.
2. System checks counselor availability slots.
3. Algorithm suggests best match (credentials, availability, no prior conflicts).
4. Appointment confirmed → both parties notified.
5. Reminder email/SMS sent 24-48 hours before.
6. If student doesn't show, no-show flag incremented.

**Actors:** Student, Counselor, Case Manager, Availability Engine.

### 4.3 Session Documentation & Treatment Planning

**Flow:**
1. After appointment, counselor creates session note (content, interventions, next steps).
2. Note attached to case with timestamp, counselor ID.
3. Audit log records note creation and any edits.
4. Treatment plan updated if needed.
5. Case risk level may be updated based on session.

**Actors:** Counselor, Psychologist (reviews).

### 4.4 High-Risk Monitoring & Escalation

**Flow:**
1. Student shows HIGH/CRITICAL risk on assessment or during session.
2. System triggers alert dashboard for assigned counselor/psychologist.
3. Escalation workflow: internal consultation → external referral (crisis line, hospital).
4. Crisis escalation log created with timestamp, actions taken.
5. Follow-up check-ins scheduled.

**Actors:** Counselor, Psychologist, DPO, Crisis team.

### 4.5 Referral & Warm Handoff

**Flow:**
1. Counselor decides external referral needed (e.g., psychiatric evaluation, substance abuse treatment).
2. Creates referral record with external provider, ROI (release of information).
3. Tracks: ROI signed → warm handoff call scheduled → completion.
4. Notes sent to external provider (with consent).
5. Follow-up verifies student engagement.

**Actors:** Counselor, Case Manager, External provider, Student (consents).

---

## 5. Data Model (MongoDB Collections)

### 5.1 Core Collections

#### **users**
```json
{
  "_id": ObjectId,
  "email": string,
  "password_hash": string,
  "first_name": string,
  "last_name": string,
  "role": "STUDENT|COUNSELOR|...",
  "phone": string,
  "department": string,
  "specializations": [string],
  "is_active": boolean,
  "created_at": datetime,
  "updated_at": datetime
}
```

#### **cases**
```json
{
  "_id": ObjectId,
  "student_id": ObjectId,
  "intake_id": ObjectId,
  "assigned_counselor_id": ObjectId,
  "status": "NEW|IN_PROGRESS|PAUSED|CLOSED",
  "risk_level": "GREEN|YELLOW|RED|CRITICAL",
  "chief_complaint": string,
  "presenting_issue": string,
  "treatment_goals": [string],
  "created_at": datetime,
  "updated_at": datetime
}
```

#### **intakes**
```json
{
  "_id": ObjectId,
  "case_id": ObjectId,
  "student_id": ObjectId,
  "demographics": { age, gender, year, major... },
  "chief_complaint": string,
  "history": { medical, psychiatric, family, substance... },
  "status": "PENDING|IN_PROGRESS|COMPLETED|ENDORSED",
  "completed_by": ObjectId,  // IC user ID (Intake Counselor)
  "created_at": datetime,
  "updated_at": datetime
}
```

#### **assessments**
```json
{
  "_id": ObjectId,
  "case_id": ObjectId,
  "type": "PHQ9|GAD7|PSS",  // Standardized screening tools
  "score": number,
  "result": "LOW|MODERATE|HIGH|CRITICAL",
  "created_at": datetime,
  "created_by": ObjectId
}
```

#### **appointments**
```json
{
  "_id": ObjectId,
  "case_id": ObjectId,
  "counselor_id": ObjectId,
  "requested_start": datetime,
  "requested_end": datetime,
  "actual_start": datetime,
  "actual_end": datetime,
  "status": "REQUESTED|MATCHED|CONFIRMED|COMPLETED|CANCELLED|NO_SHOW",
  "appointment_type": "initial|followup",
  "location": string,
  "modality": "in-person|telehealth",
  "created_at": datetime
}
```

#### **session_notes**
```json
{
  "_id": ObjectId,
  "case_id": ObjectId,
  "appointment_id": ObjectId,
  "counselor_id": ObjectId,
  "content": string,  // Clinical summary (PHI protected)
  "interventions": [string],
  "next_steps": string,
  "mood": string,
  "risk_assessment": string,
  "created_at": datetime,
  "updated_at": datetime
}
```

#### **referrals**
```json
{
  "_id": ObjectId,
  "case_id": ObjectId,
  "external_provider": string,
  "referral_type": "INTERNAL|EXTERNAL",
  "reason": string,
  "status": "PENDING|REFERRED|ROI_REQUESTED|ROI_SIGNED|WARM_HANDOFF_COMPLETE|COMPLETED",
  "roi_signed_date": datetime,
  "handoff_date": datetime,
  "created_at": datetime,
  "updated_at": datetime
}
```

#### **audit_logs**
```json
{
  "_id": ObjectId,
  "entity_type": "user|case|assessment|...",
  "action": "create|update|delete|view|export",
  "entity_id": string,
  "user_id": ObjectId,
  "old_values": object,
  "new_values": object,
  "timestamp": datetime,
  "ip_address": string
}
```

#### **crisis_escalations**
```json
{
  "_id": ObjectId,
  "case_id": ObjectId,
  "risk_level": "RED|CRITICAL",
  "trigger": string,
  "action_taken": string,
  "contacted": [{ provider, contact, time }],
  "resolved": boolean,
  "resolution_date": datetime,
  "created_at": datetime
}
```

#### **reservations** (Helper collection for demo/simple bookings)
```json
{
  "_id": ObjectId,
  "user_id": string,
  "date": string,
  "time": string,
  "party_size": number,
  "status": "pending|confirmed|cancelled",
  "created_at": datetime
}
```

---

## 6. REST API Endpoints

### 6.1 Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new user (student/staff) | None |
| POST | `/api/auth/login` | Get JWT access token | None |
| GET | `/api/auth/me` | Current user profile | JWT |
| GET | `/api/auth/users` | List all users (admin) | JWT + ADMIN |
| PATCH | `/api/auth/users/<id>/role` | Update user role | JWT + ADMIN |
| GET | `/api/auth/roles` | Available role list | None |
| GET | `/api/auth/audit-logs` | Audit log query | JWT + VIEW_AUDIT_LOG |

### 6.2 Intake & Assessments (`/api/intake`, `/api/assessments`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/intake` | Create new intake | JWT |
| GET | `/api/intake/<case_id>` | Get intake by case | JWT + VIEW_CASE |
| PATCH | `/api/intake/<intake_id>/endorse` | IC endorses intake | JWT + IC |
| POST | `/api/assessments` | Create assessment (PHQ-9, etc.) | JWT |
| GET | `/api/assessments/<case_id>` | List assessments for case | JWT + VIEW_ASSESSMENT |

### 6.3 Appointments & Booking (`/api/appointments`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/appointments/request` | Student requests appointment | JWT |
| GET | `/api/appointments/availability` | Get available slots | JWT |
| POST | `/api/appointments/<id>/match-counselor` | Assign counselor | JWT + ASSIGN_CASES |
| POST | `/api/appointments/<id>/confirm` | Confirm appointment | JWT + EDIT_CASE |
| POST | `/api/appointments/<id>/remind` | Send reminder (email/SMS) | JWT + EDIT_CASE |
| POST | `/api/appointments/<id>/mark-no-show` | Record no-show | JWT + EDIT_CASE |
| POST | `/api/appointments/<id>/complete` | Mark completed | JWT + EDIT_CASE |
| GET | `/api/appointments/<case_id>/upcoming` | List upcoming for case | JWT + VIEW_CASE |

### 6.4 Documentation (`/api/documentation`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/documentation/session-notes` | Create session note | JWT + EDIT_NOTES |
| GET | `/api/documentation/<case_id>/notes` | List notes for case | JWT + VIEW_NOTES |
| PATCH | `/api/documentation/notes/<id>` | Edit session note | JWT + EDIT_NOTES |
| GET | `/api/documentation/<case_id>/all` | Full case record | JWT + VIEW_CASE |

### 6.5 Counseling (`/api/counseling`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/counseling/dashboard` | Counselor caseload & status | JWT + PSYCHOLOGIST/CSC |
| GET | `/api/counseling/<case_id>` | Case details for counselor | JWT + VIEW_CASE |
| PATCH | `/api/counseling/<case_id>/treatment-plan` | Update treatment plan | JWT + EDIT_CASE |

### 6.6 High-Risk Monitoring (`/api/high-risk`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/high-risk/dashboard` | All high-risk cases | JWT + VIEW_RISK_DASHBOARD |
| POST | `/api/high-risk/<case_id>/escalate` | Escalate to crisis | JWT + ESCALATE_CRISIS |
| GET | `/api/high-risk/<case_id>/escalations` | Escalation history | JWT + VIEW_CASE |
| POST | `/api/high-risk/<case_id>/check-in` | Schedule follow-up check-in | JWT + EDIT_CASE |

### 6.7 Referrals (`/api/referrals`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/referrals` | Create referral | JWT + EDIT_CASE |
| GET | `/api/referrals/<case_id>` | List referrals for case | JWT + VIEW_CASE |
| PATCH | `/api/referrals/<id>/status` | Update referral status | JWT + EDIT_CASE |
| POST | `/api/referrals/<id>/warm-handoff` | Schedule warm handoff call | JWT + EDIT_CASE |

### 6.8 Demo / Quick Start (`/api/reservations`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/reservations` | List all reservations | None |
| POST | `/api/reservations` | Create reservation | None |
| GET | `/api/reservations/<id>` | Get single reservation | None |

### 6.9 System (`/api/health`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check (DB status, version, epics) |

---

## 7. Security & Compliance

### 7.1 Authentication & Authorization

- **JWT Tokens:** All protected routes require valid JWT in `Authorization: Bearer <token>` header.
- **Token Expiry:** Access tokens expire in 1 hour; refresh tokens valid 30 days (implement refresh endpoint).
- **Password Hashing:** Use `werkzeug.security.generate_password_hash` (bcrypt, PBKDF2).
- **RBAC Enforcement:** Every route checks user's role and specific permission before allowing action.

### 7.2 Data Protection

- **TLS/HTTPS:** All traffic encrypted in transit (required for production).
- **At-Rest Encryption:** Consider MongoDB encryption at rest; encrypt sensitive fields (SSN, health data).
- **Access Control:** Database credentials stored in `.env` / secret manager, never hardcoded.
- **Field-Level Redaction:** Sensitive fields (therapy notes, risk assessments) only visible to authorized roles.

### 7.3 Compliance Considerations

| Regulation | Applicability | Actions Required |
|-----------|---------------|------------------|
| **FERPA** | US education law; protects student records | Limit disclosure; obtain consent before sharing; audit access. |
| **HIPAA** | If linked to medical records | Business Associate Agreement; encryption; incident response. |
| **State licensing laws** | Psychology/counseling licensure | Maintain confidentiality; follow telehealth rules. |
| **Mandatory reporting** | Child abuse, imminent harm | Document imminent risk; escalate; override confidentiality if legally required. |
| **Data retention** | Vary by state/institution | Define retention policy (e.g., 7 years post-discharge); implement secure deletion. |

### 7.4 Audit & Logging

- **Comprehensive Audit Trail:** Every create/read/update/delete logged with user, timestamp, IP, old/new values.
- **Access Logging:** All logins, permission checks, exports recorded.
- **Retention:** Keep audit logs for minimum 3-7 years (per institutional policy).
- **Restricted Access:** Only admin and compliance officers can view audit logs.

### 7.5 Incident Response

- **Breach Detection:** Monitor for unusual access, failed logins, bulk exports.
- **Incidents:** Document, isolate affected systems, notify affected parties per state law (typically 30-60 days).
- **Backup & Recovery:** Daily automated backups; test restore procedures monthly.

---

## 8. Deployment & Operations

### 8.1 Development Environment

**Local Setup:**
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # or .\venv\Scripts\Activate.ps1 on Windows
pip install -r requirements.txt
export MONGODB_URI=mongodb://localhost:27017
export MONGODB_DB_NAME=cps_system_dev
python app.py  # Runs on port 5000

# Frontend
cd frontend
npm install
npm run dev  # Runs on port 3000

# Database
docker run -d --name mongodb -p 27017:27017 mongo:6.0
```

### 8.2 Production Environment (Recommended)

**Frontend:**
- Deploy Next.js to **Vercel** (easiest) or host on containerized platform (Docker + K8s).
- CDN for static assets.
- Environment: `NEXT_PUBLIC_API_URL=https://api.cps.youruniversity.edu`

**Backend:**
- Containerize Flask app: `docker build -t cps-api:latest .`
- Deploy to **Kubernetes**, **AWS App Runner**, **Google Cloud Run**, or **Azure App Service**.
- Use **WSGI server**: Gunicorn, uWSGI (not Flask dev server).
- Environment variables via **AWS Secrets Manager**, **Vault**, or managed secrets.

**Database:**
- Use **MongoDB Atlas** (managed, backups, scalability).
- Enable encryption at rest, IP whitelist, multi-region replication.
- Network: Private VPC, allow only app servers.

**Infrastructure as Code:**
- Terraform / CloudFormation for consistent deployments.
- Automated tests on every commit (GitHub Actions / GitLab CI).

### 8.3 Monitoring & Observability

- **Uptime Monitoring:** Pingdom, DataDog, or cloud provider; alert on 500 errors, high latency.
- **Metrics:** CPU, memory, request latency, error rates, database query performance.
- **Logs:** Centralized log aggregation (ELK Stack, DataDog, CloudWatch).
- **Alerts:** Auto-escalate on resource exhaustion, auth failures, data anomalies.

### 8.4 Backup & Disaster Recovery

- **Database Backups:** Automated daily, tested monthly.
- **RTO / RPO:** Define target recovery time (4-8 hrs) and data loss tolerance (1 day).
- **Failover:** Multi-region replication for high availability.
- **Document Runbook:** Step-by-step restore procedures, tested regularly.

---

## 9. Non-Functional Requirements

| Attribute | Target | Notes |
|-----------|--------|-------|
| **Availability** | 99.5% uptime | Allow 3.6 hours downtime/month for maintenance. |
| **Response Time** | < 500ms p95 | Most endpoints return within 200-400ms. |
| **Throughput** | 100 concurrent users | Scale horizontally if exceeds 500 concurrent. |
| **Data Retention** | 7 years (configurable) | Post-student-departure or per legal hold. |
| **Recovery Time (RTO)** | 4 hours | Acceptable for campus service (not 24/7 emergency). |
| **Recovery Point (RPO)** | 1 day | Maximum data loss acceptable between backups. |
| **Compliance Audits** | Quarterly | Internal wellness check; annual third-party audit recommended. |

---

## 10. Known Limitations & Future Enhancements

### Current Scope (MVP)
- ✅ User authentication & RBAC.
- ✅ Intake & triage workflow.
- ✅ Appointment booking and matching algorithm.
- ✅ Session documentation.
- ✅ High-risk monitoring and escalation.
- ✅ Referral tracking.
- ✅ Audit logging.

### Out of Current Scope (Phase 2+)
- ❌ Chatbot / FAQ automation (noted for future).
- ❌ SMS/Email reminders (foundation in place, integrate Twilio/SendGrid).
- ❌ Video telehealth (integrate Zoom/Jitsi API).
- ❌ Insurance billing (medical billing system integration).
- ❌ Mobile app (consider React Native).
- ❌ Advanced analytics & reporting dashboard.
- ❌ Machine learning risk prediction.

---

## 11. Implementation Roadmap

**Phase 1 (MVP): Weeks 1-8**
- Core intake, assessments, appointments.
- Basic RBAC.
- Audit logging.

**Phase 2: Weeks 9-16**
- High-risk workflow refine.
- Referral module complete.
- Email notifications.
- Admin reporting dashboard.

**Phase 3: Weeks 17-24**
- Chatbot / FAQ.
- Analytics/BI dashboards.
- Advanced counselor availability rules.

**Phase 4+: Ongoing**
- Telehealth integration.
- Mobile app.
- Machine learning models.

---

## 12. Support & Documentation

- **API Documentation:** [docs/API.md](API.md)
- **Setup Guide:** [docs/SETUP.md](SETUP.md)
- **Architecture Diagram:** [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- **Implementation Plan:** [docs/IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)

---

**Document Owner:** Development Team  
**Last Updated:** February 10, 2026  
**Next Review:** May 10, 2026
