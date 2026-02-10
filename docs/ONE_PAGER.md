# Campus Counseling & Psychology Services (CPS) System
## Executive One-Pager (Print to PDF)

**Version:** 1.0 | **Date:** February 10, 2026 | **Status:** Development Phase 1

---

## System Purpose
Digital platform for university counseling office to manage student intakes, clinical assessments, counselor appointments, session documentation, high-risk case monitoring, and referrals to external providers. Replaces paper-based intake, improves response time to at-risk students, and ensures FERPA/legal compliance.

---

## Key Features (MVP)
| Feature | Benefit | Timeline |
|---------|---------|----------|
| **Self-Service Intake** | Students avoid wait times; IC reviews asynchronously | Week 4 |
| **Auto-Risk Assessment** | PHQ-9/GAD-7 scores → risk level; no manual scoring | Week 4 |
| **Appointment Booking** | Students self-schedule; counselor availability visible; auto-matching | Week 6 |
| **Session Documentation** | Counselors record notes; searchable case history; audit trail | Week 8 |
| **High-Risk Monitoring** | Alerts when score/content flags risk; escalation workflow | Week 10 |
| **Referral Tracking** | Create referral → contact external provider → track ROI & handoff | Week 12 |
| **Audit Logging** | Every action logged (user, timestamp, change); FERPA compliance ready | Week 8 |
| **RBAC** | 9 roles; 14 granular permissions; students can't see others' data | Week 2 |

---

## Architecture at a Glance

```
Student/Counselor/Admin
└─ Web Browser (Next.js 14 + Tailwind CSS)
   └ REST API (Flask, Python 3.9+)
      └ MongoDB 6.0+ (users, cases, intakes, assessments, appointments, notes, referrals, audit_logs)
```

| Layer | Technology | Scale |
|-------|-----------|-------|
| **Frontend** | Next.js 14, React 18, Tailwind CSS, TypeScript | 500-2000 users |
| **Backend** | Flask, PyMongo, JWT auth, Werkzeug hashing | ~100 concurrent users (Phase 2: 500) |
| **Database** | MongoDB 6.0+ (local or Atlas) | 100GB+ capacity |

---

## User Roles & Simplified Data Flow

```
1. Student: Intake → Risk Score → Book Appt → Counselor Session → (Refer if needed → External)
2. Intake Coordinator: Review Intake → Endorse (green-light for booking) → Assign counselor
3. Counselor: View Cases → Document Sessions → Monitor Risk → Escalate if needed
4. Psychologist: High-risk dashboard → Escalate crisis → Contact crisis line/hospital
5. Admin: Manage users, view audit log, export compliance reports
```

---

## Security & Compliance Highlights

- **FERPA-ready:** Audit trail (who accessed what, when) logged; student records isolated by role.
- **HIPAA foundation:** Encrypted credentials; no plaintext passwords; HTTPS (TLS) required.
- **Mandatory reporting:** High-risk flags enable quick escalation & documentation of action taken.
- **Data retention:** Configurable (default 7 years post-discharge); secure deletion avaialable.
- **Multi-role access:** Students can't see other students' records; counselors see assigned cases only.

---

## Development Timeline (24 weeks)

| Phase | Duration | Focus | Go-Live |
|-------|----------|-------|---------|
| **Phase 1: MVP** | Wks 1-8 | Auth, intake, triage, booking, docs, RBAC | Beta (30 users) |
| **Phase 2: Production** | Wks 9-16 | Risk escalation, referrals, notifications, admin tools | Full dept (50-100 users) |
| **Phase 3: Advanced** | Wks 17-24 | Analytics, mobile polish, telehealth, ML risk (optional) | Campus-wide (1000+ students) |

**Team:** 3-4 engineers (1 lead + 2 full-stack + 0.5 DevOps). **Budget:** ~$270k-340k (salary + infra).

---

## Key Metrics for Success

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Uptime** | ≥ 99% | Datadog / monitoring service |
| **Response Time** | < 500ms p95 | API latency tracking |
| **No-show Rate** | Track & trend | Case management |
| **Intake-to-1st-Appt** | ≤ 7 days | Average wait time |
| **High-risk Escalation** | < 5 min to alert | Crisis timer in system |
| **User Satisfaction** | ≥ 4/5 stars | Post-session survey |
| **Mobile Usage** | ≥ 50% | Analytics |
| **Data Security** | 0 breaches | Audit + penetration test |

---

## Tech Stack & Versions

| Component | Technology | Version | Notes |
|-----------|-----------|---------|-------|
| **Frontend** | Next.js | 14+ | React 18+, Tailwind 3.3+, TypeScript 5+ |
| **Backend** | Flask | 3.0+ | Python 3.9+; JWT via flask-jwt-extended |
| **Database** | MongoDB | 6.0+ | Local or MongoDB Atlas (managed) |
| **Auth** | JWT + bcrypt | — | flask-jwt-extended + werkzeug |
| **Containers** | Docker | Latest | docker-compose for dev, K8s optional for prod |
| **CI/CD** | GitHub Actions | — | Auto-test + deploy on push |
| **Monitoring** | Datadog/NewRelic | — | Alerts for errors, latency, downtime |

---

## Deployment & Operations (Quick Start)

### **Development (Local)**
```bash
# Start MongoDB (Docker)
docker run -d --name mongodb -p 27017:27017 mongo:6.0

# Backend
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt && python app.py  # Runs :5000

# Frontend
cd frontend && npm install && npm run dev  # Runs :3000
```

### **Production (Recommended)**
- **Frontend:** Deploy Next.js to Vercel (easiest) or container.
- **Backend:** Docker image → Kubernetes, AWS App Runner, or similar.
- **Database:** MongoDB Atlas (managed, backups, auto-scaling).
- **Monitoring:** Datadog or cloud provider monitoring + alerting.
- **SSL/TLS:** Auto via Vercel or AWS cert manager.

---

## Known Limitations & Future Enhancements

**Current Scope:**
✅ Intake, triage, booking, documentation, risk monitoring, referrals, RBAC

**Not in MVP (Phase 2+):**
- SMS/Email reminders (Twilio/SendGrid integration)
- Video telehealth (Zoom API)
- Chatbot / FAQ (skipped per request)
- Insurance billing
- Mobile native app
- Advanced analytics / BI dashboards
- AI risk prediction

---

## Risk Summary & Mitigation

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Scope creep | Med | Strict change control; sprint freeze 2 wks before end |
| Low adoption | Med | Early pilot feedback; user training; iterative UI |
| Data breach | High | Quarterly security audit; pen-test before launch; secrets management |
| Key person leaves | Med | Code/architecture docs; pair programming; cross-training |
| DB performance | Med | Query optimization; indexes; load testing each sprint |

---

## Recommended Next Steps
1. **Weeks 1-2:** Project kickoff, team onboarding, env setup (DONE)
2. **Week 3-4:** Auth system + login/register pages (IN PROGRESS)
3. **Week 5-6:** Intake form + IC workflow (STARTING)
4. **Week 7-8:** Appointment booking + session docs
5. → **Phase 2** begins Week 9 (risk monitoring, referrals, notifications)

---

## Contact & Documentation
- **System Design:** `docs/SYSTEM_DESIGN.md` (comprehensive, all details)
- **Architecture:** `docs/ARCHITECTURE_DETAILED.md` (diagrams, tech stack)
- **Implementation Plan:** `docs/IMPLEMENTATION_PLAN.md` (12 sprints, gantt, risk matrix)
- **API Docs:** `docs/API.md` (endpoint reference)
- **Setup Guide:** `docs/SETUP.md` (dev environment)

**Project Lead:** [Your Name] | **Repo:** [GitHub URL]

---

**How to Print to PDF:**  
1. In your browser, press **Ctrl+P** (Windows) or **Cmd+P** (Mac)
2. Choose "Save as PDF"
3. Adjust margins (0.5 in) and scale (80-90%) to fit on 1-2 pages
4. Save

---

*Document created: February 10, 2026 | Next review: End of Phase 1 (Week 8)*
