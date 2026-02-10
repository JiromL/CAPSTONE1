# System Architecture Diagram

## System Components & Data Flow

```mermaid
graph TB
    subgraph Users["👥 Users / Clients"]
        Student["Student"]
        Counselor["Counselor<br/>Psychologist"]
        IC["Intake Coordinator"]
        Admin["Admin<br/>DPO"]
    end

    subgraph Frontend["Frontend Layer<br/>Next.js + React + Tailwind"]
        LoginPage["Login / Register<br/>Pages"]
        Dashboard["Dashboard<br/>Caseload View"]
        IntakePage["Intake<br/>Questionnaire"]
        BookingPage["Appointment<br/>Booking"]
        DocumentationUI["Session<br/>Documentation"]
        RiskUI["Risk<br/>Dashboard"]
    end

    subgraph Backend["Backend Layer<br/>Flask + Python"]
        AuthSvc["Auth Service<br>/api/auth"]
        IntakeSvc["Intake Service<br>/api/intake"]
        AppointmentSvc["Appointment Service<br>/api/appointments"]
        DocumentationSvc["Documentation Service<br>/api/documentation"]
        RiskSvc["Risk Monitoring<br>/api/high-risk"]
        ReferralSvc["Referral Service<br>/api/referrals"]
        AuditSvc["Audit & Logging<br>/api/audit-logs"]
    end

    subgraph Database["Database Layer<br/>MongoDB"]
        Users[("users")]
        Cases[("cases")]
        Intakes[("intakes")]
        Assessments[("assessments")]
        Appointments[("appointments")]
        Sessions[("session_notes")]
        Referrals[("referrals")]
        AuditLogs[("audit_logs")]
        Escalations[("crisis_escalations")]
    end

    subgraph External["External & Notifications"]
        EmailSvc["Email Service<br/>(Future: SendGrid)"]
        SMSSvc["SMS Service<br/>(Future: Twilio)"]
        CrisisLine["Crisis Hotline<br/>Reference"]
    end

    Student -->|Login<br/>View Case<br/>Book Apt| Frontend
    Counselor -->|Login<br/>View Cases<br/>Document| Frontend
    IC -->|Login<br/>Triage<br/>Endorse| Frontend
    Admin -->|Login<br/>Manage Users<br/>View Audit| Frontend

    LoginPage -->|JWT Auth| AuthSvc
    IntakePage -->|Submit Form| IntakeSvc
    BookingPage -->|Request Slot| AppointmentSvc
    DocumentationUI -->|Write Note| DocumentationSvc
    RiskUI -->|View Status| RiskSvc
    Dashboard -->|View Risk| RiskSvc

    AuthSvc -->|CRUD Users| Users
    IntakeSvc -->|Create Intakes| Intakes
    IntakeSvc -->|Create Cases| Cases
    AppointmentSvc -->|Manage Appointments| Appointments
    AppointmentSvc -->|Assess Risk| Assessments
    DocumentationSvc -->|Store Notes| Sessions
    RiskSvc -->|Query Escalations| Escalations
    ReferralSvc -->|Manage Referrals| Referrals
    AuditSvc -->|Log Actions| AuditLogs

    AuthSvc -->|Log Access| AuditLogs
    DocumentationSvc -->|Log Edits| AuditLogs

    RiskSvc -->|Send Alert| EmailSvc
    AppointmentSvc -->|Send Reminder| SMSSvc
    RiskSvc -->|Escalate| CrisisLine

    style Users fill:#e1f5ff
    style Frontend fill:#fff3e0
    style Backend fill:#f3e5f5
    style Database fill:#e8f5e9
    style External fill:#fce4ec
```

---

## Detailed Service Interactions

### 1. Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant MongoDB

    User->>Frontend: Enter email/password
    activate Frontend
    Frontend->>Backend: POST /api/auth/login
    activate Backend
    Backend->>MongoDB: Query users collection
    activate MongoDB
    MongoDB-->>Backend: Return user record
    deactivate MongoDB
    Backend->>Backend: Verify password hash
    Backend->>Backend: Create JWT token
    Backend-->>Frontend: Return token + user profile
    deactivate Backend
    Frontend->>Frontend: Store token in localStorage
    Frontend-->>User: Redirect to dashboard
    deactivate Frontend
```

### 2. Intake & Triage Workflow

```mermaid
sequenceDiagram
    participant Student
    participant Frontend
    participant Backend
    participant DB as MongoDB

    Student->>Frontend: Start Intake
    activate Frontend
    Frontend->>Backend: POST /api/intake
    activate Backend
    Backend->>DB: Create intake record
    activate DB
    DB-->>Backend: Intake ID
    deactivate DB
    Backend->>DB: Create case record
    activate DB
    DB-->>Backend: Case ID
    deactivate DB
    Backend-->>Frontend: Success + case_id
    deactivate Backend
    Frontend-->>Student: "Intake submitted, pending IC review"
    deactivate Frontend

    rect rgb(100, 150, 255, 0.1)
    Note over Student,DB: Intake Coordinator reviews
    IC->>Frontend: View pending intakes
    Frontend->>Backend: GET /api/intake?status=PENDING
    Backend->>DB: Query intakes
    DB-->>Backend: List
    Backend-->>Frontend: Display
    Frontend-->>IC: Show intake details

    IC->>Frontend: Endorse intake
    Frontend->>Backend: PATCH /api/intake/{id}/endorse
    Backend->>Backend: Auto-score assessments (PHQ-9, GAD-7)
    Backend->>DB: Update case risk_level
    Backend->>DB: Log action in audit_logs
    DB-->>Backend: OK
    Backend-->>Frontend: Case endorsed, risk=YELLOW
    end
```

### 3. Appointment Booking & Matching

```mermaid
sequenceDiagram
    participant Student
    participant Frontend
    participant Matching as Matching Engine
    participant Backend
    participant DB as MongoDB

    Student->>Frontend: Request appointment (date, time)
    activate Frontend
    Frontend->>Backend: POST /api/appointments/request
    activate Backend
    Backend->>Matching: Find available counselors
    activate Matching
    Matching->>DB: Query counselor_availability
    activate DB
    DB-->>Matching: Available slots
    deactivate DB
    Matching->>Matching: Score candidates (credentials, availability, fit)
    Matching-->>Backend: Recommended counselor + slot
    deactivate Matching
    Backend->>DB: Create appointment (status=CONFIRMED)
    activate DB
    DB-->>Backend: appointment_id
    deactivate DB
    Backend->>Backend: Queue notification (email/SMS)
    Backend-->>Frontend: Appointment confirmed
    deactivate Backend
    Frontend-->>Student: "Appointment with Dr. X on Feb 15, 2pm"
    deactivate Frontend
```

### 4. Risk Monitoring & Escalation

```mermaid
sequenceDiagram
    participant Counselor
    participant Frontend
    participant Backend
    participant RiskEngine as Risk Engine
    participant AlertSystem as Alert System
    participant DB as MongoDB

    Counselor->>Frontend: Document session (note includes risk assessment)
    activate Frontend
    Frontend->>Backend: POST /api/documentation/session-notes
    activate Backend
    Backend->>RiskEngine: Assess risk from content
    activate RiskEngine
    RiskEngine->>RiskEngine: Analyze keywords, concerns
    RiskEngine-->>Backend: risk_level = RED or CRITICAL
    deactivate RiskEngine

    alt High Risk Detected
    Backend->>DB: Create crisis_escalations record
    activate DB
    DB-->>Backend: escalation_id
    deactivate DB
    Backend->>AlertSystem: Trigger alert
    activate AlertSystem
    AlertSystem->>AlertSystem: Notify psychologist, DPO
    AlertSystem-->>Backend: Alerts sent
    deactivate AlertSystem
    Backend-->>Frontend: "⚠️ High-risk escalation created"
    deactivate Backend

    rect rgb(255, 100, 100, 0.1)
    Note over Counselor,AlertSystem: Crisis escalation workflow
    Psychologist->>Frontend: View high-risk dashboard
    Frontend->>Backend: GET /api/high-risk/dashboard
    Backend->>DB: Query cases with risk=RED/CRITICAL
    DB-->>Backend: List + escalation records
    Backend-->>Frontend: Display cases needing attention
    Frontend-->>Psychologist: Show case + escalation history

    Psychologist->>Frontend: Escalate case (contact crisis line, schedule follow-up)
    Frontend->>Backend: POST /api/high-risk/{case_id}/escalate
    Backend->>DB: Update escalation (action_taken, contacted_at)
    Backend->>DB: Log audit entry
    DB-->>Backend: OK
    Backend-->>Frontend: Escalation recorded
    end

    else Low Risk
    Backend-->>Frontend: Session documented
    end
```

---

## Data Flow: Student Perspective

```mermaid
graph LR
    A["Student Creates<br/>Account"] -->|Register| B["Authentication<br/>JWT Issued"]
    B -->|Login| C["Student Dashboard"]
    C -->|Start Intake| D["Fill Questionnaire<br/>PHQ-9, GAD-7, History"]
    D -->|Submit| E["Intake Pending<br/>IC Review"]
    E -->|IC Endorses| F["Case In Progress<br/>Risk Level Assigned"]
    F -->|Request Appt| G["Appointment<br/>With Counselor"]
    G -->|Complete Session| H["Session Note<br/>Added to Case"]
    H -->|Follow-ups| I["Ongoing Treatment"]
    I -->|If Needed| J["Referral to<br/>External Provider"]
    J -->|WarmHandoff| K["Warm Transfer<br/>to External Care"]
```

---

## Technology Stack Interaction

```mermaid
graph TB
    subgraph ClientTier["Client Tier (Port 3000)"]
        NextJS["Next.js 14+<br/>React 18+"]
        Tailwind["Tailwind CSS 3.3+"]
        TypeScript["TypeScript 5+"]
    end

    subgraph ServerTier["Server Tier (Port 5000)"]
        Flask["Flask 3.0+"]
        PyJWT["flask-jwt-extended"]
        PyMongo["PyMongo 4.7+"]
        Werkzeug["werkzeug<br/>password hashing"]
    end

    subgraph DBTier["Database Tier"]
        MongoDB["MongoDB 6.0+<br/>5 GB+ cluster"]
    end

    NextJS -->|REST API<br/>HTTPS| Flask
    Tailwind -->|Style| NextJS
    TypeScript -->|Type Safety| NextJS
    PyJWT -->|Generate JWT| Flask
    Werkzeug -->|Hash Passwords| Flask
    PyMongo -->|Native Driver| MongoDB
    Flask -->|Query, CRUD| MongoDB

    style ClientTier fill:#fff3e0
    style ServerTier fill:#f3e5f5
    style DBTier fill:#e8f5e9
```

---

**Diagram Generated:** February 10, 2026  
**Architecture Version:** 1.0
