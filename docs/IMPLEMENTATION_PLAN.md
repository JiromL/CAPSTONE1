# Campus CPS System — Implementation Plan & Sprint Breakdown

**Project Duration:** 24 weeks (6 months)  
**Team Size:** 3-4 engineers (1 lead, 1-2 full-stack, 1 DevOps / QA)  
**Release Cadence:** 2-week sprints

---

## Phase Overview

| Phase | Duration | Focus | Key Deliverable |
|-------|----------|-------|-----------------|
| **Phase 1: MVP** | Wks 1-8 (4 sprints) | Core intake, triage, appointments, RBAC | Working platform for initial users |
| **Phase 2: Enhancement** | Wks 9-16 (4 sprints) | Risk workflow, referrals, notifications, admin dashboard | Production-ready system |
| **Phase 3: Advanced** | Wks 17-24 (4 sprints) | Analytics, chatbot, telehealth foundation | Scalable + intelligent system |
| **Post-Launch** | Ongoing | Monitoring, feedback, incremental features | Stability & user satisfaction |

---

## PHASE 1: MVP (Weeks 1-8, 4 Sprints)

### Sprint 1 (Weeks 1-2): Foundation & Auth

**Goal:** Project scaffold, env setup, user authentication working end-to-end.

**Backend Tasks:**
- [x] Project structure (blueprints, config, models)
- [ ] MongoDB setup & connection pooling
- [ ] User model + password hashing (werkzeug)
- [ ] JWT token generation & validation
- [ ] /api/auth/{register, login, me} endpoints
- [ ] Error handling & logging middleware
- [ ] Write unit tests (pytest) for auth module
- **Acceptance Criteria:** Can POST /api/auth/register, receive JWT, use token to access /api/auth/me.

**Frontend Tasks:**
- [x] Next.js + Tailwind scaffold
- [ ] Login page (form, validation, error display)
- [ ] Register page (form, validation, error display)
- [ ] LocalStorage token management
- [ ] Protected route wrapper (redirect if no token)
- [ ] Basic navbar with user info + logout
- [ ] Basic home/dashboard page (placeholder)
- **Acceptance Criteria:** Can register, login, see token in localStorage, access protected page.

**DevOps / QA Tasks:**
- [ ] GitHub Actions CI/CD setup (lint, test on push)
- [ ] Docker compose for local dev (MongoDB + Flask + Next.js)
- [ ] Environment variable template (.env.example)
- **Acceptance Criteria:** `docker-compose up` brings up full stack locally.

**Sprint Deliverable:** **Authentication System Live**  
- Users can register and log in.
- JWT tokens issued and validated.
- Protected routes work end-to-end.

---

### Sprint 2 (Weeks 3-4): Intake & Triage Foundation

**Goal:** Student intake form submission, IC review workflow, auto-scoring of assessments.

**Backend Tasks:**
- [ ] Intake model + collection schema
- [ ] Case model + collection schema
- [ ] Assessment models (PHQ-9, GAD-7, PSS) with scoring logic
- [ ] /api/intake POST (create intake)
- [ ] /api/intake GET (IC views pending intakes)
- [ ] /api/intake PATCH (endorse intake, auto-score assessments)
- [ ] /api/assessments POST & GET endpoints
- [ ] Risk level auto-assignment (GREEN/YELLOW/RED based on scores)
- [ ] RBAC checks for IC role
- [ ] Unit + integration tests
- **Acceptance Criteria:** Student submits intake, IC endorses it, risk level assigned.

**Frontend Tasks:**
- [ ] Intake questionnaire form (demographics, chief complaint, history)
- [ ] Intake submission & feedback (success/error messages)
- [ ] IC dashboard view (list pending intakes)
- [ ] IC endorsement workflow (review details, click "Endorse")
- [ ] Display risk level badge (GREEN / YELLOW / RED)
- [ ] Placeholder assessment results display
- **Acceptance Criteria:** E2E: Student submits intake → IC reviews → endorses → risk level shown.

**Database Tasks:**
- [ ] Create indexes on intakes (case_id), cases (student_id, assigned_counselor_id, risk_level)
- [ ] Seed script for test data (5 sample intakes)

**Sprint Deliverable:** **Intake & Triage Workflow Live**  
- Students can self-serve intake.
- IC can review and endorse.
- Risk levels auto-calculated.

---

### Sprint 3 (Weeks 5-6): Appointment Booking & Matching

**Goal:** Simple appointment request/confirm workflow. Counselor availability + matching algorithm.

**Backend Tasks:**
- [ ] Appointment model + appointments collection
- [ ] Counselor availability slots (simple: fixed weekly hours)
- [ ] /api/appointments/request POST (student requests appointment)
- [ ] /api/appointments/:id/match-counselor POST (manual or auto-match)
- [ ] /api/appointments/:id/confirm POST (confirm appointment)
- [ ] /api/appointments/:id/complete POST (mark completed after session)
- [ ] /api/appointments/:case_id/upcoming GET (list upcoming for case)
- [ ] Simple matching algorithm (score counselors by: availability, caseload, credentials)
- [ ] No-show tracking (update case metrics if student doesn't show)
- [ ] RBAC checks for students, counselors, case managers
- [ ] Unit + integration tests
- **Acceptance Criteria:** Student requests appt → system matches counselor → appointment confirmed.

**Frontend Tasks:**
- [ ] Appointment request form (date, time preferences, notes)
- [ ] Availability display (available slots for next 30 days)
- [ ] Confirmation page (counselor, time, modality)
- [ ] Student view upcoming appointments
- [ ] Counselor dashboard (my appointments, list of upcoming)
- [ ] Mark appointment complete (post-session workflow)
- **Acceptance Criteria:** Student requests → sees available counselors → confirms appt.

**Backend Database Tasks:**
- [ ] Seed counselor availability data (50 demo slots across next 30 days).
- [ ] Create indexes on appointments (case_id, counselor_id, requested_start).

**Sprint Deliverable:** **Appointment Booking Live**  
- Students can request appointments.
- Counselors auto-matched based on availability.
- Appointments confirmed and tracked.

---

### Sprint 4 (Weeks 7-8): Session Documentation & RBAC Refinement

**Goal:** Counselors document sessions; audit logging; RBAC fully enforced.

**Backend Tasks:**
- [ ] Session note model + session_notes collection
- [ ] /api/documentation/session-notes POST (counselor creates note)
- [ ] /api/documentation/:case_id/notes GET (list notes for case, with permission checks)
- [ ] /api/documentation/:note_id PATCH (edit note — counselor only, log edit)
- [ ] /api/documentation/:case_id/all GET (full case record — counselor/IC/admin view)
- [ ] Comprehensive audit_logs collection (log every action: create, update, view, export)
- [ ] Middleware: audit_log() helper called on every significant action
- [ ] RBAC permission matrix full enforcement (all endpoints check user role + specific permission)
- [ ] Permission override log (if admin grants temporary permission, log it)
- [ ] Unit + integration tests (RBAC coverage)
- **Acceptance Criteria:** Counselor writes note → audit logged → note visible only to authorized roles.

**Frontend Tasks:**
- [ ] Session documentation form (content, interventions, next steps)
- [ ] View case full records (read-only for non-counselors)
- [ ] Session notes feed (timeline of all notes)
- [ ] Edit note (counselor only)
- [ ] Admin audit log viewer (search by user, action, date)
- [ ] Permission warnings (e.g., "You don't have permission to edit this note")
- **Acceptance Criteria:** Counselor documents session → stored with audit trail → proper access controls.

**Database Tasks:**
- [ ] Create indexes on session_notes (case_id, counselor_id), audit_logs (user_id, timestamp).

**Sprint 4 Quality Assurance:**
- [ ] End-to-end test: full workflow (student registers → intake → endorsed → books appt → counselor documents session).
- [ ] Load test: 50 concurrent users.
- [ ] Security audit: JWT expiry, password hashing, RBAC enforcement.

**Phase 1 Deliverable: Minimal Viable Product (MVP)**
- Core workflows working end-to-end.
- User roles and permissions enforced.
- Session data persisted and audited.
- **Launch to:** Pilot group of 1-2 counselors + 20 students for 2-week beta.

---

## PHASE 2: Enhancement & Production Readiness (Weeks 9-16, 4 Sprints)

### Sprint 5 (Weeks 9-10): High-Risk Monitoring & Escalation

**Goal:** Automated risk detection, escalation workflow, crisis alerts.

**Backend Tasks:**
- [ ] Crisis escalations collection
- [ ] Risk assessment logic refinement (keyword scanning, score thresholds)
- [ ] /api/high-risk/dashboard GET (list all RED/CRITICAL cases — psychologist view)
- [ ] /api/high-risk/:case_id/escalate POST (escalate to crisis, log actions)
- [ ] /api/high-risk/:case_id/check-in POST (schedule follow-up check-in)
- [ ] Alert trigger: Email/SMS when case escalated (foundation for Twilio/SendGrid)
- [ ] Crisis escalation workflow state machine (PENDING → CONTACTED → REFERRED → RESOLVED)
- [ ] Integration test: trigger escalation → alert generated
- **Acceptance Criteria:** Counselor identifies high-risk case → system escalates → alert sent.

**Frontend Tasks:**
- [ ] High-risk dashboard (psychologist/DPO view) - list RED/CRITICAL cases
- [ ] Escalation modal (contact crisis line, log actions, assign follow-up)
- [ ] Follow-up check-in scheduling
- [ ] Escalation history timeline
- **Acceptance Criteria:** Psychologist sees high-risk cases, can escalate with one click.

**Testing & QA:**
- [ ] Test escalation triggers (keyword, score threshold, manual)
- [ ] Verify alert queuing works (emails queued, not blocking API)

**Sprint Deliverable: High-Risk Workflow**
- Automated detection of high-risk students.
- Escalation workflow (crisis line contact, follow-up).
- Reduced response time for at-risk students.

---

### Sprint 6 (Weeks 11-12): Referral Management & Notifications

**Goal:** Complete referral workflow (to external providers); Email/SMS notification foundation.

**Backend Tasks:**
- [ ] Referrals collection + model
- [ ] /api/referrals POST (create referral, auto-generate ROI template)
- [ ] /api/referrals/:case_id GET (list referrals for case)
- [ ] /api/referrals/:id PATCH (update status: pending → referred → roi_signed → warm_handoff → completed)
- [ ] /api/referrals/:id/warm-handoff POST (schedule warm handoff call with external provider)
- [ ] Email queue service (background task to send emails — use Celery or simple queue)
- [ ] Email templates: ROI request, warm handoff notification, follow-up
- [ ] SMS notification stubs (ready for Twilio integration)
- [ ] Referral follow-up reminders (auto-email after 14 days if not completed)
- [ ] Integration test: Create referral → ROI email sent → status tracked
- **Acceptance Criteria:** Counselor creates referral → external provider contacted → status tracked.

**Frontend Tasks:**
- [ ] Referral creation form (select provider, reason, attach notes)
- [ ] Referral list (view all referrals for a case)
- [ ] ROI signing workflow UI (upload signed doc or e-signature stub)
- [ ] Warm handoff scheduling (date/time picker, notes)
- [ ] Referral status tracking (timeline showing: referred → roi_signed → handoff → completed)
- **Acceptance Criteria:** E2E referral workflow from creation to completion.

**DevOps / Configuration:**
- [ ] Email service configuration (SendGrid API keys in .env)
- [ ] Background job queue setup (optional: Redis + task queue)
- [ ] Email template files

**Sprint Deliverable: Referral & Notification System**
- Complete referral tracking.
- Email notifications (foundation for SMS).
- Follow-up reminders.

---

### Sprint 7 (Weeks 13-14): Admin Dashboard & Reporting

**Goal:** System-wide metrics, user management, audit log viewer.

**Backend Tasks:**
- [ ] /api/auth/users GET (admin list all users)
- [ ] /api/auth/users/:id PATCH (admin update user role)
- [ ] /api/auth/audit-logs GET (admin query audit logs, with filtering: user, action, date range, entity)
- [ ] /api/admin/metrics GET (system health: user count, case count, avg wait time, no-show rate)
- [ ] /api/admin/export POST (admin export cases to CSV — logs export in audit_logs)
- [ ] RBAC: Only DPO/ADMIN can access admin endpoints
- [ ] Integration test: admin queries metrics, exports data
- **Acceptance Criteria:** Admin views system metrics, manages users, queries audit log.

**Frontend Tasks:**
- [ ] Admin dashboard (landing page with key metrics: # students, # cases, # appointments, avg risk level)
- [ ] User management page (table of users, filter by role, update role, activate/deactivate)
- [ ] Audit log viewer (table with filters: user, action, date, entity type)
- [ ] Export data button (generate CSV of cases, logs)
- [ ] System health check (uptime, DB status, last backup timestamp)
- **Acceptance Criteria:** Admin can view system status, manage users, query audit logs, export data.

**Database Tasks:**
- [ ] Advanced indexes for audit_logs (composite index on user_id + timestamp).

**Testing & QA:**
- [ ] Admin access control test (non-admin cannot view metrics).
- [ ] Export data test (CSV valid, audit logged).

**Sprint Deliverable: Administration Suite**
- Full user management.
- Comprehensive audit log viewer.
- System metrics & health.
- Data export capability.

---

### Sprint 8 (Weeks 15-16): Production Hardening & Beta Launch Prep

**Goal:** Security, scalability, monitoring, documentation ready for production.

**Backend Tasks:**
- [ ] Security audit: password hashing, JWT expiry, CORS, input validation
- [ ] Rate limiting on auth endpoints (prevent brute force)
- [ ] Database connection pooling (MongoDB URI with poolSize config)
- [ ] Error handling standardized (return consistent JSON errors)
- [ ] Logging: structured logging to file (JSON format, rotated daily)
- [ ] Health check endpoint enhanced (/api/health includes: DB latency, request queue depth)
- [ ] Performance tuning: N+1 query review, caching opportunities (session cache short-lived)
- [ ] Load test (Apache JMeter or similar): 100 concurrent users, 5 min duration
- **Acceptance Criteria:** Pass security checklist, handle 100 concurrent users, log all requests.

**Frontend Tasks:**
- [ ] Error boundary component (catch and display errors gracefully)
- [ ] Loading states (skeleton screens, spinners)
- [ ] Timeout handling (user-friendly message if API slow)
- [ ] Input validation (client + server-side)
- [ ] Accessibility audit (WCAG 2.1 AA standard)
- [ ] Performance optimization (images lazy-loaded, code split by route)
- **Acceptance Criteria:** Smooth UX, fast load times, accessible.

**DevOps / Infrastructure:**
- [ ] Docker image for backend (multi-stage build, small image)
- [ ] Docker image for frontend (static export)
- [ ] docker-compose.yml for production-like local run
- [ ] Kubernetes deployment manifests (YAML) — optional if using managed service
- [ ] Environment setup for production: .env.prod template
- [ ] Database backup script + restore test
- [ ] Monitoring setup: Datadog/NewRelic agent, alerts configured
- [ ] SSL/TLS certificate setup (self-signed for staging, real cert for prod)
- **Acceptance Criteria:** Deploy with one command; monitor uptime + errors; can restore from backup.

**Documentation:**
- [ ] API documentation (OpenAPI/Swagger spec)
- [ ] Runbook: deployment, incident response, backup/restore
- [ ] User guide for students, counselors, admin
- [ ] Developer guide: onboarding, architecture, code standards

**Testing & QA:**
- [ ] Full regression test suite (automated E2E tests for all workflows)
- [ ] Security penetration test (or internal checklist)
- [ ] Performance test (100 concurrent users, measure p95 latency)
- [ ] Accessibility test (automated + manual)

**Phase 2 Deliverable: Production-Ready System**
- Secured, monitored, scalable.
- Complete feature set for MVP use.
- **Launch to:** Institution's full counseling department (~30-50 users, 500-1000 students).

---

## PHASE 3: Advanced Features (Weeks 17-24, 4 Sprints)

### Sprint 9 (Weeks 17-18): Analytics & Reporting Dashboard

**Goal:** Insights into counselor productivity, case outcomes, wait times.

**Backend Tasks:**
- [ ] /api/analytics/counselor GET (counselor productivity: # cases, # sessions, avg client rating - future)
- [ ] /api/analytics/intake GET (intake funnel: submitted → endorsed → booked first appt)
- [ ] /api/analytics/wait-time GET (avg days from intake endorsement to first appointment)
- [ ] /api/analytics/outcomes GET (risk level change distribution, referral success rate)
- [ ] Aggregation queries (MongoDB aggregation pipeline for efficiency)
- [ ] Optional: data warehouse sync (daily sync to BI tool)
- **Acceptance Criteria:** /api/analytics endpoints return meaningful data; query < 2 sec.

**Frontend Tasks:**
- [ ] Analytics dashboard (charts: intake funnel, wait times, counselor caseload, risk distribution)
- [ ] Filter by date range, counselor, department
- [ ] Export graphs as PNG/PDF
- OTOAcceptance Criteria:** Dashboard renders key metrics, is interactive.

**Skills Required:** MongoDB aggregation framework, D3.js or Chart.js for visualizations.

**Sprint Deliverable: Analytics & Insights**
- Visibility into system performance.
- Data-driven decision making for administration.

---

### Sprint 10 (Weeks 19-20): Chatbot Foundation & FAQ Module (Chatbot skipped per user request — substitute with Mobile App Polish or Telehealth UI)

**Goal:** [SKIPPED]  Instead: Mobile responsiveness polish + advanced appointment rules.

**Backend Tasks:**
- [ ] Advanced counselor matching rules (timezone preferences, specialty matching, wait list for overbooked counselors)
- [ ] /api/appointments/availability-advanced GET (filter by counselor credentials, modality, max wait time)
- [ ] Waitlist feature (student can join waitlist if no slots available, auto-notify when slot opens)
- [ ] Integration test: student added to waitlist → slot opens → student notified
- **Acceptance Criteria:** Advanced booking rules work; waitlist notifies appropriately.

**Frontend Tasks:**
- [ ] Mobile responsive design (test on iPhone, iPad, Android)
- [ ] Advanced appointment filter (specialty, type, modality, max wait days)
- [ ] Waitlist UI (join list, view position, get notification when slot available)
- [ ] Progressive Web App (PWA) setup (installable on mobile, works offline)
- [ ] Touch-friendly UI (larger buttons, better spacing)
- **Acceptance Criteria:** App works smoothly on mobile; can book appointments via phone.

**Testing:**
- [ ] Mobile device testing (real devices + emulators)
- [ ] PWA test (lighthouse score > 80)

**Sprint Deliverable: Mobile-First Experience**
- Full functionality on mobile devices.
- Advanced booking options.
- Improved accessibility and UX.

---

### Sprint 11 (Weeks 21-22): Telehealth Integration Foundation

**Goal:** Video call capability (Zoom/Jitsi) integrated into appointment workflow.

**Backend Tasks:**
- [ ] Zoom API integration (generate meeting link for each appointment)
- [ ] /api/appointments/:id/join-link GET (return meeting link + token)
- [ ] Store meeting metadata in appointment record (zoom_meeting_id, join_url)
- [ ] Zoom webhook integration (record meeting end, store recording URL)
- [ ] Recording access control (only counselor + student can access)
- [ ] Integration test: appointment created → zoom link generated → meeting can be joined
- **Acceptance Criteria:** Pressing "Join Call" takes counselor/student to Zoom meeting.

**Frontend Tasks:**
- [ ] Modality toggle (in-person vs. telehealth) during appointment request
- [ ] Next.js dynamic component (conditional load Zoom SDK if telehealth)
- [ ] "Join Video Call" button (pre-session, visible 5 min before, links to Zoom)
- [ ] Recording consent disclaimer (before joining)
- [ ] Post-session feedback (rate call quality)
- **Acceptance Criteria:** User clicks "Join Video Call", enters Zoom meeting, call records.

**DevOps / Configuration:**
- [ ] Zoom API credentials (.env)
- [ ] Recording storage (S3 bucket or Zoom cloud)

**Testing:**
- [ ] E2E test: schedule telehealth appt → join Zoom → meeting works
- [ ] Recording playback test

**Sprint Deliverable: Video Counseling**
- Students can meet counselors via video.
- Sessions recorded (with consent) for quality assurance.

---

### Sprint 12 (Weeks 23-24): Machine Learning Risk Prediction (Optional) + Public Deployment

**Goal:** Optional: ML model to predict high-risk cases; prepare system for production launch campus-wide.

**Backend Tasks (Optional ML):**
- [ ] Historical data analysis: identify patterns in assessments that correlate with crisis/referral
- [ ] Simple ML model (scikit-learn): trained on past case data, predicts risk score
- [ ] /api/ml/risk-predict POST (given case data, return risk probability)
- [ ] A/B test (compare AI predictions vs. IC manual triage for accuracy)
- **Note:** ML is optional; focus on stability + monitoring if skipping.

**Production Launch Prep (All Teams):**
- [ ] Final security audit + penetration test
- [ ] Load test at scale (500 concurrent users for 30 min)
- [ ] Disaster recovery drill (simulate DB failure, restore from backup)
- [ ] User acceptance testing (5-10 real users from counseling dept)
- [ ] Documentation finalized (admin guides, user guides, API docs)
- [ ] Monitoring configured (alerts for errors, high latency, low disk space)
- [ ] Runbook for on-call support
- [ ] Training for admin + clinic staff (2-4 hour workshop)

**Frontend Finishing Tasks:**
- [ ] Analytics dashboard refined based on feedback
- [ ] Accessibility final check + fixes
- [ ] Performance optimization final pass (Lighthouse > 90)
- [ ] Help / FAQ section (in-app)

**Testing & QA (Final Pass):**
- [ ] Full regression test suite run
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Stress test (500 concurrent users)
- [ ] UAT with pilot users (sign-off)

**Phase 3 Deliverable: Enterprise-Grade System**
- ML-assisted risk prediction (optional).
- Telehealth integrated.
- Mobile-first design.
- Analytics & insights.
- **Launch to:** Campus-wide (all students, all counselors, all staff).

---

## POST-LAUNCH (Ongoing)

### Weeks 25+: Monitoring, Feedback, Iteration

**Continuous Tasks:**
- [ ] Monitor system health (uptime, errors, performance)
- [ ] Collect user feedback (surveys, interviews, support tickets)
- [ ] Bug fixes (prioritized as P0/P1/P2/P3)
- [ ] Feature requests (backlog prioritization)
- [ ] Security patches (monthly review of dependencies)
- [ ] Database maintenance (reindex, archive old data)
- [ ] Capacity planning (monitor growth, scale as needed)

**Recommended Enhancements (Future):**
- SMS reminders via Twilio
- Insurance billing integration
- Multi-language support
- Advanced analytics (retention, outcome prediction)
- API for external EHR integration
- Mobile app (iOS + Android native)

---

## Success Criteria & KPIs

### Phase 1 MVP Success:
- ✅ Pilot group (30 users) can complete end-to-end workflow without major bugs
- ✅ System uptime ≥ 95%
- ✅ Average API response time < 500ms
- ✅ All RBAC rules enforced; no unauthorized access
- ✅ Audit logs capture all significant actions

### Phase 2 Production Success:
- ✅ 500+ concurrent users handled (p95 latency < 1 sec)
- ✅ Zero data loss events
- ✅ Student no-show rate tracked
- ✅ Admin can export compliance reports
- ✅ Crisis escalation response time < 5 minutes
- ✅ User satisfaction score ≥ 4/5

### Phase 3 / Post-Launch Success:
- ✅ 95%+ student self-service intake completion rate
- ✅ Average booking wait time ≤ 7 days
- ✅ Referral follow-up rate ≥ 80%
- ✅ System supports 2000+ active students
- ✅ Mobile app installs ≥ 50%
- ✅ ML risk predictions match IC triage ≥ 85% of the time

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Scope creep** | Delays, budget overrun | Strict change control; phases freeze 2 weeks before sprint end |
| **Data privacy breach** | Legal, reputational | Quarterly security audit; penetration test before launch |
| **Low user adoption** | System underutilized | User training, early pilot feedback, iterative UI improvements |
| **Database performance** | Timeout errors, user frustration | Performance testing each sprint; query optimization; caching |
| **Key person departure** | Schedule slip, knowledge loss | Document code + architecture; pair programming; cross-training |
| **Late requirement changes** | Rework, scope creep | Requirements capture upfront; UA sign-off at sprint 4 |

---

## Budget & Resource Estimate

| Role | Count | Duration | Estimate |
|------|-------|----------|----------|
| **Lead Engineer** | 1 | 24 weeks | 1 FTE |
| **Full-Stack Dev** | 2 | 24 weeks | 2 FTE |
| **DevOps / QA** | 1 | 24 weeks (part-time) | 0.5 FTE |
| **Product Manager** | 0.5 | 24 weeks | 0.5 FTE |
| **Designer** (UI/UX) | 0.5 | 8 weeks (Phase 1) | 0.5 FTE |
| **Total** | — | — | **~4.5 FTE** |

**Estimated Cost** (assuming $120k-$150k/yr per engineer):  
~4.5 FTE × 6 months = ~2.25 FTE-years ≈ **$270k - $340k** (salary only; add infrastructure, licenses, training).

---

## Approval & Sign-Off

- **Product Owner:** ___________________________ Date: ___________
- **Technical Lead:** ___________________________ Date: ___________
- **Institution CTO/IT Director:** _________________ Date: ___________

---

**Document Version:** 1.0  
**Last Updated:** February 10, 2026  
**Next Review:** May 10, 2026 (end of Phase 1)
