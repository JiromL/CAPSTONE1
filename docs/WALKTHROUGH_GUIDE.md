# CPS Management System — User Walkthrough Guide

**Counseling and Psychological Services Portal — Scenario-Based Manual**  
Version 1.0 | Roles Covered: Student · Office Assistant · Intake Coordinator · Counselor · Psychologist

---

## Recurring Characters

| Name | Role | Description |
|------|------|-------------|
| **Jerome Santos** | Student | 3rd Year, BS Computer Science. First-time CPS client seeking support for academic stress and anxiety. |
| **Ms. Ana Reyes** | Office Assistant | Manages incoming appointment requests and handles walk-in clients at the CPS front desk. |
| **Ms. Julie Estrada** | Intake Coordinator | Conducts intake interviews, assesses urgency, and endorses students to the appropriate counselor. |
| **Dr. Rose Tan** | Counselor | Assigned counselor for Jerome's case. Specializes in academic stress and anxiety management. |
| **Dr. Daryl Cruz** | Psychologist | Receives the referral from Dr. Tan to conduct a formal psychological assessment on Jerome. |

---

## Table of Contents

1. [Scenario 1 — Google OAuth Login and Student Account Creation](#scenario-1)
2. [Scenario 2 — Student Completes MHBot PERMA Assessment](#scenario-2)
3. [Scenario 3 — First-Time Student Books an Intake Interview](#scenario-3)
4. [Scenario 4 — Office Assistant Reviews Appointment and Endorses It](#scenario-4)
5. [Scenario 5 — Intake Coordinator Reviews and Assigns Counselor](#scenario-5)
6. [Scenario 6 — Counselor Confirms Schedule and Conducts First Session](#scenario-6)
7. [Scenario 7 — Counselor Schedules a Follow-up Appointment](#scenario-7)
8. [Scenario 8 — Student Attends Follow-up Session](#scenario-8)
9. [Scenario 9 — Psychologist Receives Referral and Conducts Assessment](#scenario-9)
10. [Scenario 10 — EMA Weekly Monitoring and Counselor Alert](#scenario-10)
11. [Scenario 11 — Counselor Closes the Case](#scenario-11)

---

## Scenario 1

### Google OAuth Login and Student Account Creation

**Background**

Jerome Santos is a third-year BS Computer Science student at De La Salle University. Over the past month, he has been struggling with persistent academic stress, difficulty sleeping, and growing anxiety ahead of midterm examinations. After a conversation with his block mate who had previously visited the CPS office, Jerome decides it is time to seek professional support. He opens his laptop and navigates to the CPS Management System portal for the first time.

**Objective**

Jerome needs to create a student account and sign in to the CPS portal so that he can access the booking system and request a counseling appointment.

**Walkthrough**

**Step 1 — Jerome navigates to the CPS portal login page.**

He types the portal URL into his browser. The login page displays a clean interface with the DLSU-CPS logo, a brief welcome message, and a prominent "Sign in with Google" button. A notice below the button reads: "Only @dlsu.edu.ph accounts are accepted."

> **System Response:** The login page loads with the Google Sign-In button rendered via Google's Identity Services (GSI). No username or password fields are present — authentication is handled exclusively through Google OAuth.

**Step 2 — Jerome selects "Sign in with Google" to begin the OAuth flow.**

Because this is his first time using the portal, Jerome knows he must use his official DLSU Google account. He clicks the button, which opens Google's standard account selection popup. He selects his *jsantos@dlsu.edu.ph* account.

> **System Response:** Google returns a secure credential token to the CPS portal. The backend verifies the token, confirms the email domain ends in **@dlsu.edu.ph**, and checks whether an account already exists in the system.

**Step 3 — The system detects that Jerome's email has no existing account and automatically creates one.**

Since this is Jerome's first login, the system creates a new Student account using the name and email provided by Google. No additional registration form is required.

> **System Response:** A new Student record is created in the database with Jerome's name, email, and a **STUDENT** role. A JWT access token is issued. Jerome is automatically redirected to the student dashboard without any further steps.

**Step 4 — Jerome arrives at his student dashboard for the first time.**

The dashboard greets him with a welcome message and displays the main navigation options: Dashboard, Book Appointment, My Appointments, Wellness Resources, MHBot, EMA, and Profile. A prompt is visible encouraging him to complete the MHBot PERMA assessment before booking.

> **System Response:** The dashboard loads Jerome's profile summary. Because no prior appointment or case exists, all appointment counters show zero and the wellbeing widgets display a placeholder state prompting him to complete his first assessment.

**Outcome**

Jerome has successfully authenticated using his DLSU Google account. A Student account has been created automatically by the system. He is now logged in and can access all student-facing features of the CPS portal, including appointment booking, the MHBot chatbot, and wellness resources.

---

## Scenario 2

### Student Completes MHBot PERMA Assessment

**Background**

Still on his first day using the portal, Jerome notices the recommendation to complete the PERMA wellbeing assessment before scheduling an appointment. He is curious about what the assessment involves and decides to complete it. He understands that the results will give his future counselor a baseline understanding of his current emotional and psychological state.

**Objective**

Jerome wishes to complete the MHBot PERMA wellbeing assessment to establish a baseline for his mental health status before his first counseling appointment.

**Walkthrough**

**Step 1 — Jerome navigates to the MHBot section from the dashboard sidebar.**

He selects the MHBot option from the navigation menu. The MHBot page opens to reveal an AI-powered chat interface specifically designed to conduct mental health check-ins. A brief explanation of PERMA is displayed: Positive Emotion, Engagement, Relationships, Meaning, and Accomplishment.

> **System Response:** The MHBot interface loads. The bot introduces itself and explains that the conversation will be used to assess Jerome's current wellbeing across the five PERMA dimensions. It assures him that his responses are confidential and will only be shared with his assigned counselor.

**Step 2 — Jerome engages with MHBot's guided conversation to complete the PERMA assessment.**

MHBot asks Jerome a series of conversational questions about how he has been feeling over the past two weeks. Questions cover his sense of happiness, his level of engagement with his studies, the quality of his relationships, whether he feels his academic work has meaning, and his sense of personal accomplishment. Jerome responds honestly, sharing that he feels low on positive emotion and accomplishment, and that his relationships with friends have been suffering due to self-imposed isolation.

> **System Response:** The system records Jerome's responses in real time. As the conversation progresses, the backend calculates dimension scores across the five PERMA categories. Jerome's scores indicate elevated risk in Positive Emotion (Low) and Accomplishment (Low), with moderate scores in the remaining dimensions.

**Step 3 — Jerome reviews his PERMA results summary.**

After the conversation concludes, MHBot presents a summary of his wellbeing snapshot. A visual chart displays his scores across all five dimensions. Two dimensions are highlighted in amber, indicating areas of concern. MHBot offers a brief supportive message and encourages Jerome to book a counseling appointment.

> **System Response:** The PERMA snapshot is saved to Jerome's profile as his baseline entry. The results will be accessible to his assigned counselor once a case is created. The EMA monitoring system registers this as his first data point for longitudinal tracking.

**Outcome**

Jerome has completed his first PERMA wellbeing assessment. The system has recorded his baseline scores across all five dimensions. His counselor will be able to view these results once an appointment is confirmed and a case is created, providing valuable context before their first session.

---

## Scenario 3

### First-Time Student Books an Intake Interview

**Background**

Encouraged by his PERMA results and the MHBot's recommendation, Jerome is now ready to formally request a counseling appointment. This will be his first time submitting a request through the CPS portal. He wants to book a face-to-face intake interview, as he feels more comfortable speaking in person rather than online.

**Objective**

Jerome aims to submit a formal appointment request for a face-to-face intake interview, completing all required forms and selecting his preferred schedule.

**Walkthrough**

**Step 1 — Jerome selects "Book Appointment" from the dashboard navigation.**

He clicks the Book Appointment option from the sidebar, which opens the appointment booking wizard. The first step asks him to select the purpose of his appointment. A list of available purposes is displayed, including Personal Counseling, Academic Concerns, Career Guidance, and Relationship Issues. Jerome selects *Personal Counseling* as the most appropriate option given his concerns about stress and anxiety.

**Step 2 — Jerome selects Face-to-Face as his preferred counseling mode.**

The wizard advances to the counseling mode selection screen. Two options are presented: Face-to-Face and Online. Jerome selects Face-to-Face because he finds in-person sessions more conducive to open conversation. Since he chose Face-to-Face, no additional platform selection (Google Meet or Zoom) is prompted.

**Step 3 — Jerome chooses his preferred appointment date and time.**

A calendar is displayed showing available dates. Jerome selects the following Monday. The system then displays available time slots for that date, filtered in real time based on the current counselor availability schedules configured by the CPS staff. He selects a 10:00 AM slot.

> **System Response:** The backend queries active counselor schedules and filters out any slots already occupied by confirmed appointments. Only genuinely available time windows are shown to Jerome.

**Step 4 — Jerome reads and acknowledges the Consent Form.**

Before proceeding further, the system presents Jerome with a CPS Consent Form. The form explains the nature of counseling services, confidentiality policies, the exceptions to confidentiality (such as imminent risk to life), and Jerome's rights as a student client. Jerome reads through the form carefully. Satisfied that he understands and agrees, he activates the consent checkbox and continues.

> **System Response:** Jerome's consent is recorded in the system with a timestamp and the current consent version number. This record is stored permanently for compliance purposes and will be associated with his case record once it is created.

**Step 5 — Jerome fills in the Initial Contact Form (ICF).**

The booking wizard presents the Initial Contact Form, which collects essential information about Jerome's presenting concerns and background. He completes the following fields:

- Presenting concern: Academic stress, anxiety before exams, difficulty concentrating
- Duration of concern: Approximately four weeks
- Previous counseling history: None
- Referral source: Self-referred
- Urgency level: Moderate

**Step 6 — Jerome completes the Student Personal Information Form (SPIF).**

The next form collects Jerome's personal and academic information needed for his student record. He fills in his full name, student ID, college, degree program, year level, contact number, and emergency contact details. Much of this information is pre-filled from his Google account; Jerome verifies the accuracy and completes the remaining fields.

**Step 7 — Jerome completes the PHQ-4 screening questionnaire.**

Because Jerome indicated anxiety and low mood in his Initial Contact Form, the system automatically presents a PHQ-4 screening. The four-item questionnaire asks how frequently he has been bothered by nervousness, worrying, feeling down, and lack of interest over the past two weeks. Jerome responds honestly. His responses indicate a moderate level of anxiety and low mood.

> **System Response:** The system calculates Jerome's PHQ-4 score and stores it alongside his appointment request. The score will be visible to the Intake Coordinator when reviewing his case, helping to determine urgency and appropriate referral.

**Step 8 — Jerome reviews his submission summary and submits the appointment request.**

The final screen of the booking wizard displays a complete summary of Jerome's request: purpose, counseling mode, preferred date and time, and a checklist confirming that all forms have been completed. Satisfied that everything is accurate, Jerome submits the request.

> **System Response:** The appointment is created in the database with a status of **REQUESTED**. A unique reference number is generated. An email confirmation is sent to Jerome's DLSU email address acknowledging that his request has been received and is under review. A notification also appears in his portal notification inbox.

> 🔔 **Notification sent to Jerome:** "Your appointment request has been received and is currently under review. You will be notified once it has been confirmed."

**Outcome**

Jerome has successfully submitted a face-to-face intake interview request. His appointment now carries the status **REQUESTED**. All required forms — Consent Form, ICF, SPIF, and PHQ-4 — have been completed and attached to his record. The Office Assistant will be notified and will review the request in the next business day.

---

## Scenario 4

### Office Assistant Reviews Appointment and Endorses It

**Background**

The following morning, Ms. Ana Reyes, the CPS Office Assistant, begins her daily routine of reviewing newly submitted appointment requests. She opens the CPS portal and sees that a new request from Jerome Santos has arrived overnight. Her role is to verify that the submission is complete and appropriate before passing it to the Intake Coordinator for further review and scheduling.

**Objective**

Ms. Ana Reyes needs to review Jerome's appointment request, confirm that all required forms have been properly submitted, and endorse the request to the Intake Coordinator for action.

**Walkthrough**

**Step 1 — Ms. Ana signs in to the CPS portal using her staff credentials.**

She navigates to the portal login page and authenticates using her DLSU Google account associated with the Office Assistant role. The system recognizes her role and redirects her to the staff dashboard — one focused on appointment management and client processing.

**Step 2 — Ms. Ana opens the Appointment Requests queue.**

From the dashboard, she navigates to the Appointment Requests section, which displays all incoming appointment requests with a status of **REQUESTED**. Jerome's submission appears at the top of the queue. The queue entry shows his name, student ID, preferred date, purpose, and counseling mode.

> **System Response:** The system displays all unprocessed appointment requests sorted by submission time. Each row includes a form-completion indicator showing whether the ICF, SPIF, Consent Form, and PHQ-4 have all been submitted. Jerome's entry shows a complete checkmark across all required documents.

**Step 3 — Ms. Ana opens Jerome's appointment request to review the details.**

She selects Jerome's entry to open his full submission. She reviews his Initial Contact Form, noting his presenting concern of academic stress and exam anxiety. She reads his PHQ-4 results, which indicate moderate anxiety. She checks that the consent form was signed and that the SPIF contains complete personal information. Everything appears to be in order.

**Step 4 — Ms. Ana endorses the appointment to the Intake Coordinator.**

Having confirmed that all forms are complete and the request is appropriate for intake processing, Ms. Ana selects the option to endorse the appointment. She adds a brief internal note: "Complete submission. PHQ-4 indicates moderate anxiety. First-time client." She then confirms the endorsement action.

> **System Response:** The appointment's internal status is updated to reflect that it has been reviewed and endorsed by the Office Assistant. The Intake Coordinator, Ms. Julie Estrada, receives a portal notification and an email alert informing her that a new endorsed appointment is awaiting her review.

> 🔔 **Notification sent to Ms. Julie Estrada (IC):** "A new appointment request from Jerome Santos has been endorsed for your review. Preferred date: Monday, 10:00 AM."

**Step 5 — Ms. Ana records a walk-in appointment for another student arriving at the front desk.**

Shortly after processing Jerome's request, a student named Patricia arrives at the CPS front desk without a prior appointment. Ms. Ana uses the Walk-In Intake feature to create an immediate appointment record. Because Patricia is a walk-in, her appointment is created with a status of **CONFIRMED** immediately, bypassing the request-and-endorsement flow entirely.

> **System Response:** Patricia's walk-in appointment is created and confirmed in the system. An Intake Coordinator is notified of the walk-in arrival for immediate attention.

**Outcome**

Ms. Ana has reviewed Jerome's appointment request, verified that all required forms are complete, and endorsed the request to the Intake Coordinator. Jerome's appointment remains at **REQUESTED** status pending the Intake Coordinator's action. Ms. Julie Estrada has been notified and will process the request in the next step.

---

## Scenario 5

### Intake Coordinator Reviews and Assigns Counselor

**Background**

Ms. Julie Estrada, the CPS Intake Coordinator, has received the notification about Jerome's endorsed appointment request. She is responsible for reviewing the student's background, assessing the urgency of the concern, and assigning an appropriate counselor or psychologist.

**Objective**

Ms. Julie Estrada needs to review Jerome's submission, assess the urgency of his concern, accept the appointment, and assign an available counselor whose schedule aligns with Jerome's preferred time.

**Walkthrough**

**Step 1 — Ms. Julie opens the endorsed appointment from her intake queue.**

She logs into the portal and navigates to the Intake Management section. Jerome's endorsed request appears in her queue. She reviews his ICF, SPIF, consent documentation, and PHQ-4 results. She notes that Jerome's presenting concern is well within the scope of standard counseling services and does not indicate an immediate safety risk. She assesses the urgency as moderate.

**Step 2 — Ms. Julie accepts the appointment request.**

Having assessed Jerome's case as appropriate for intake, Ms. Julie selects the Accept option. She confirms the appointment's scheduled date and time — Monday at 10:00 AM — and adds a brief intake note summarizing her initial clinical impression.

> **System Response:** The appointment status advances to **PENDING_APPROVAL**, indicating that it has been accepted by the Intake Coordinator and is awaiting counselor assignment and final confirmation.

**Step 3 — Ms. Julie reviews available counselors and selects Dr. Rose Tan.**

The system presents a list of available counselors and psychologists with their current caseloads and schedule availability. Ms. Julie filters by availability on Monday at 10:00 AM and reviews the list. Dr. Rose Tan has availability at that time and has managed similar academic stress cases previously. Ms. Julie selects Dr. Tan as the assigned counselor.

> **System Response:** Dr. Tan is assigned to the appointment. The appointment status is updated to **CONFIRMED**. Because this is Jerome's first appointment, a new Case record is automatically created with a status of **NEW**. The case is linked to the confirmed appointment and assigned to Dr. Rose Tan.

**Step 4 — The system sends confirmation notifications to all relevant parties.**

Upon confirmation, the system automatically dispatches notifications to Jerome, Dr. Rose Tan, and Ms. Ana Reyes.

> 🔔 **Notification to Jerome:** "Your appointment has been confirmed for Monday at 10:00 AM with Dr. Rose Tan. Please arrive 10 minutes early at the CPS office, Henry Sy Sr. Hall, Room 101."

> 🔔 **Notification to Dr. Rose Tan:** "A new appointment has been assigned to you — Jerome Santos on Monday at 10:00 AM. A new case (CPS-2025-001) has been created."

**Outcome**

Jerome's appointment is now **CONFIRMED** with Dr. Rose Tan on Monday at 10:00 AM. A new case record (CPS-2025-001) has been automatically created with a status of **NEW**. Both Jerome and Dr. Tan have been notified. A confirmation email with calendar details has been sent to Jerome's DLSU email address.

---

## Scenario 6

### Counselor Confirms Schedule and Conducts First Session

**Background**

Dr. Rose Tan is an experienced counselor at the DLSU CPS office. Having received the notification of her new appointment with Jerome, she reviews his background forms before the session. On Monday morning, Jerome arrives as scheduled and the session takes place. Afterward, Dr. Tan documents her clinical observations through the session notes feature.

**Objective**

Dr. Rose Tan needs to review Jerome's pre-session forms, conduct the intake counseling session, and document her observations using the SOAP session notes feature in the portal.

**Walkthrough**

**Step 1 — Dr. Tan reviews Jerome's case and pre-session forms before the appointment.**

She logs in and navigates to her Appointments section, selecting Jerome's confirmed appointment. She reviews his ICF, SPIF, PHQ-4 results, and PERMA baseline scores. She notes his moderate PHQ-4 score and the two below-average PERMA dimensions — Positive Emotion and Accomplishment.

> **System Response:** The case record for CPS-2025-001 displays all submitted forms and the student's PERMA snapshot in an organized view accessible only to Dr. Tan and authorized CPS staff.

**Step 2 — Jerome arrives at the CPS office and Dr. Tan marks the appointment as in-progress.**

When Jerome arrives and the session begins, Dr. Tan confirms his presence in the portal. This updates the appointment status to reflect that the session is actively underway.

**Step 3 — Dr. Tan conducts the intake counseling session with Jerome.**

During the one-hour session, Dr. Tan uses a person-centered approach to explore Jerome's experience. Jerome opens up about the mounting pressure of academic performance expectations, his feelings of inadequacy, and his difficulty maintaining a sleep schedule. Dr. Tan conducts a brief risk assessment and determines that Jerome poses no imminent risk to himself or others.

**Step 4 — Dr. Tan documents the session using the SOAP notes feature.**

Following the session, Dr. Tan navigates to the session notes section of Jerome's case record. She selects the Structured SOAP format and fills in the following components:

- **Subjective:** Client reports persistent academic stress and anxiety for approximately four weeks. Describes difficulty concentrating, sleep disturbance, and social withdrawal. PHQ-4 moderate.
- **Objective:** Client was cooperative and well-groomed. Affect appeared subdued but appropriate. Speech was organized. No indicators of suicidal ideation.
- **Assessment:** Presenting concerns consistent with adjustment-related anxiety. Risk level assessed as GREEN. No immediate safety concerns.
- **Plan:** Provide psychoeducation on stress response. Introduce breathing exercises. Schedule follow-up session in one week. Monitor PERMA via EMA check-ins.

> **System Response:** The session note is saved to Jerome's case record (CPS-2025-001). The appointment status is updated to **COMPLETED**. The case status advances from **NEW** to **ACTIVE**. Jerome's risk level is recorded as GREEN.

**Outcome**

Jerome's first counseling session has been successfully completed and documented. Case CPS-2025-001 is now **ACTIVE**. Dr. Tan's SOAP notes are stored securely in the case record. Jerome's risk level has been set to GREEN.

---

## Scenario 7

### Counselor Schedules a Follow-up Appointment

**Background**

After completing Jerome's session notes, Dr. Rose Tan determines that a follow-up session in one week is clinically appropriate. Rather than having Jerome go through the full booking process again, Dr. Tan schedules the follow-up directly within the portal.

**Objective**

Dr. Rose Tan needs to schedule a follow-up appointment for Jerome within the existing case, set a date for the following Monday, and ensure Jerome receives a confirmation notification.

**Walkthrough**

**Step 1 — Dr. Tan navigates to Jerome's active case and initiates a follow-up schedule.**

From Jerome's case record, Dr. Tan selects the option to schedule a follow-up session. The system presents a scheduling interface showing her available slots for the following week. She selects Monday at 10:00 AM and confirms the session format as Face-to-Face.

**Step 2 — The system creates the follow-up appointment linked to the existing case.**

Dr. Tan confirms the scheduling details and submits. Because Jerome already has an active case, the follow-up appointment is automatically linked to Case CPS-2025-001. No new case is created.

> **System Response:** A new appointment record is created with a status of **CONFIRMED** and linked to Case CPS-2025-001. The appointment is tagged as a follow-up session (Session 2). Jerome receives a confirmation notification and email.

> 🔔 **Notification to Jerome:** "A follow-up counseling session has been scheduled for next Monday at 10:00 AM with Dr. Rose Tan at the CPS office."

**Outcome**

A follow-up appointment has been confirmed for Jerome and is linked to his existing active case CPS-2025-001. Jerome has been notified. The session counter on the case record now reflects one completed session with one upcoming session scheduled.

---

## Scenario 8

### Student Attends Follow-up Session

**Background**

One week has passed since Jerome's first session. He received an automated reminder notification 24 hours before his appointment. He arrives at the CPS office on Monday morning for his follow-up with Dr. Tan. Jerome has been practicing the breathing exercises introduced in Session 1 and feels slightly more grounded, though his academic anxiety remains.

**Objective**

Jerome attends his follow-up session with Dr. Tan, who will assess his progress since Session 1, introduce new coping strategies, and update the case record with new session notes.

**Walkthrough**

**Step 1 — Jerome receives his automated 24-hour reminder notification.**

The evening before the appointment, Jerome's phone displays a push notification from the CPS portal reminding him of his 10:00 AM session the following morning.

> **System Response:** The automated reminder system checks for appointments within the next 24 hours and dispatches reminder notifications to the respective students. A one-hour reminder will also be sent the morning of the appointment.

**Step 2 — Jerome checks in via the CPS portal QR code at the front desk.**

Upon arriving at the CPS office, Jerome opens the portal on his phone and scans the QR code displayed at the front desk.

> **System Response:** The system registers Jerome's check-in and notifies Dr. Tan that her 10:00 AM client has arrived. The appointment record is updated with a check-in timestamp.

**Step 3 — Dr. Tan conducts the follow-up session and reviews Jerome's progress.**

In Session 2, Dr. Tan reviews her notes from the previous session and asks Jerome how the past week has been. Jerome shares that the breathing exercises helped somewhat but that he still struggles during late-night study sessions. Dr. Tan introduces cognitive restructuring techniques to address his perfectionistic thought patterns and assigns a thought diary as homework.

**Step 4 — Dr. Tan records session notes and updates the case record.**

After the session, Dr. Tan completes a new SOAP session note for Session 2, documenting Jerome's progress, the techniques introduced, and the homework assigned. She updates the case's risk level, which remains GREEN, and schedules another follow-up for the following week.

> **System Response:** Session 2 SOAP notes are saved to Case CPS-2025-001. The appointment status is updated to **COMPLETED**. The case session counter now shows 2 completed sessions.

**Outcome**

Jerome's second counseling session has been completed and documented. Case CPS-2025-001 remains **ACTIVE** with two completed sessions on record. Dr. Tan has identified the need for a deeper psychological assessment to complement the counseling work.

---

## Scenario 9

### Psychologist Receives Referral and Conducts Assessment

**Background**

After two sessions with Jerome, Dr. Rose Tan has observed that his anxiety patterns are more deeply rooted than initially assessed. She determines that a formal psychological assessment by Dr. Daryl Cruz, the CPS Psychologist, would provide a more complete clinical picture. She initiates an internal referral through the portal.

**Objective**

Dr. Tan will initiate an internal referral to the psychologist, and Dr. Daryl Cruz will receive the referral, review Jerome's case history, conduct a psychological assessment, and document his findings in the case record.

**Walkthrough**

**Step 1 — Dr. Tan initiates an internal referral to Dr. Daryl Cruz.**

From Jerome's case record, Dr. Tan selects the Internal Referral option. She selects Dr. Daryl Cruz — Psychologist — as the receiving provider, notes "Suspected generalized anxiety — formal assessment warranted," and marks the urgency as Standard.

> **System Response:** An internal referral record is created and linked to Case CPS-2025-001. Dr. Daryl Cruz receives a portal notification and an email informing him of the referral, including a summary of Jerome's case history and Dr. Tan's clinical notes.

> 🔔 **Notification to Dr. Daryl Cruz:** "You have received an internal referral for Jerome Santos (CPS-2025-001) from Dr. Rose Tan. Reason: Formal psychological assessment requested."

**Step 2 — Dr. Cruz reviews the referral and Jerome's complete case history.**

Dr. Cruz logs in to the portal and opens the referral notification. He reviews Jerome's case record in full — the initial ICF, PHQ-4 scores, PERMA baseline, and Dr. Tan's two SOAP session notes.

**Step 3 — Dr. Cruz schedules and conducts the psychological assessment session.**

Dr. Cruz schedules an assessment appointment with Jerome through the portal. During the session, Dr. Cruz administers a standardized anxiety inventory and conducts a structured clinical interview. Jerome completes the assessment honestly, describing the scope of his worry and its functional impact on his academic and social life.

**Step 4 — Dr. Cruz documents his assessment findings in the case record.**

Following the assessment session, Dr. Cruz opens Jerome's case in the portal and adds a Psychological Assessment note. He documents his diagnostic impressions, the standardized test results, his clinical formulation, and recommended treatment modifications. He recommends continued counseling with Dr. Tan supplemented by structured cognitive-behavioral interventions.

> **System Response:** The assessment note is saved to Case CPS-2025-001. The case record now reflects both the counselor and psychologist's contributions. Dr. Tan receives a notification that Dr. Cruz has completed his assessment.

**Outcome**

The internal referral process has been completed. Dr. Cruz has conducted a formal psychological assessment and added his findings to Jerome's case record. Dr. Tan has been informed of the results and can incorporate the psychologist's recommendations into her ongoing counseling approach.

---

## Scenario 10

### EMA Weekly Monitoring and Counselor Alert

**Background**

Four weeks into his counseling journey, Jerome has been receiving weekly Ecological Momentary Assessment (EMA) check-ins through the CPS portal. During the fifth week, Jerome encounters a particularly stressful period — a failed group presentation and a conflict with a close friend — and his EMA responses reflect a notable drop in wellbeing.

**Objective**

The EMA system will detect Jerome's significant wellbeing decline and automatically alert Dr. Tan, who will review his check-in history and decide whether to reach out before the next scheduled session.

**Walkthrough**

**Step 1 — Jerome receives and completes his weekly EMA check-in.**

On Tuesday evening, Jerome receives a push notification prompting him to complete his weekly EMA check-in. Reflecting on the difficult week he has had, Jerome rates his mood as Very Low, his stress as Very High, and his sense of connection as Low. He submits the check-in.

> **System Response:** The EMA system calculates Jerome's composite wellbeing score for the week and compares it against his recent trend. The system detects a significant drop — a decrease of more than two standard deviations from his rolling four-week average across the Positive Emotion and Engagement dimensions. An automated alert is triggered for Dr. Rose Tan.

**Step 2 — Dr. Tan receives an automated wellbeing decline alert.**

The following morning, Dr. Tan opens her portal and sees a high-priority alert notification flagged on Jerome's case: "Wellbeing Decline Detected — Jerome Santos." She opens the alert, which shows a side-by-side comparison of his current EMA scores against his prior weeks' trend lines across all PERMA dimensions.

> **System Response:** The alert is displayed prominently on Dr. Tan's dashboard in the Needs Attention section. The case record for CPS-2025-001 is also flagged with a wellbeing trend warning. The system does not contact Jerome directly — the response decision rests entirely with the counselor.

**Step 3 — Dr. Tan reviews Jerome's full EMA history and decides to send him a check-in message.**

Dr. Tan reviews the longitudinal EMA chart for Jerome's case, noting the sharp decline over the past week. She cross-references this with her Session 2 notes, which mentioned Jerome's upcoming group presentation as a source of stress. She decides to proactively send Jerome a brief supportive message through the portal's messaging feature.

**Step 4 — Jerome receives Dr. Tan's message and acknowledges it.**

Jerome receives a notification from the portal — a brief message from Dr. Tan checking in on how he is doing and confirming their upcoming session. Feeling heard even before the session, Jerome replies that he has had a tough week but is looking forward to talking about it. The exchange is logged in the case record as a between-session contact note.

> 🔔 **Notification to Jerome:** "You have a new message from Dr. Rose Tan in the CPS portal."

**Outcome**

The EMA system successfully detected Jerome's wellbeing decline and alerted Dr. Tan within 24 hours of his check-in submission. Dr. Tan reviewed his EMA history, identified the likely stressor, and made proactive contact through the portal. The between-session outreach has been documented in the case record.

---

## Scenario 11

### Counselor Closes the Case

**Background**

Eight weeks have passed since Jerome's first session with Dr. Rose Tan. Through consistent attendance and engagement with the coping strategies introduced throughout his counseling journey, Jerome has made meaningful progress. His academic performance has stabilized, his sleep patterns have improved, and his EMA scores have been trending positively for the past three consecutive weeks. Dr. Tan conducts a final termination session with Jerome, during which they review his progress together and formulate a maintenance plan. Both agree that Jerome is ready to transition out of active counseling.

**Objective**

Dr. Rose Tan needs to document the termination session, complete the case closure process, update the case status to closed, and ensure Jerome has a record of his care and a maintenance plan for the future.

**Walkthrough**

**Step 1 — Dr. Tan conducts the termination session with Jerome.**

In their final session, Dr. Tan and Jerome review the progress made across the eight weeks of counseling. They discuss the coping tools Jerome has developed — cognitive restructuring, breathing exercises, and realistic goal-setting — and agree on a self-care maintenance plan he can use going forward.

**Step 2 — Dr. Tan writes the final session note and termination summary.**

After the session, Dr. Tan opens Jerome's case record and creates the final session note. She selects the Termination Summary template, which prompts her to document the client's progress, treatment goals achieved, unresolved concerns, maintenance recommendations, and the agreed-upon reason for case closure. She notes the positive treatment outcomes and recommends Jerome return to CPS if he experiences another episode of significant distress.

> **System Response:** The termination session note is saved to Case CPS-2025-001. The final session is marked as **COMPLETED**. The case session counter reflects a total of eight completed sessions.

**Step 3 — Dr. Tan initiates the case closure process.**

From the case record, Dr. Tan selects the Close Case option. The system prompts her to confirm the closure reason — she selects "Treatment Goals Achieved" — and to verify the termination summary has been completed. She confirms both and proceeds.

> **System Response:** Case CPS-2025-001 transitions from **ACTIVE** to **CLOSED**. The case is archived in the system with full documentation preserved. Jerome receives a notification informing him that his counseling case has been formally closed.

> 🔔 **Notification to Jerome:** "Your counseling case (CPS-2025-001) has been formally closed. A summary of your care journey is available in your case history. You are welcome to return to CPS at any time."

**Step 4 — Jerome views his closed case and final session summary in the portal.**

Jerome logs in and navigates to his Appointment History. He can see the full timeline of his counseling journey — eight completed sessions, the psychological assessment conducted by Dr. Cruz, and the termination summary prepared by Dr. Tan. The record is read-only, preserved as a confidential document in his student profile.

> **System Response:** Jerome's student dashboard no longer shows an active case. His EMA check-ins and PERMA history remain accessible in his profile. The case record and all associated documents are permanently archived and accessible only to authorized CPS personnel.

**Outcome**

Case CPS-2025-001 has been formally closed with a status of **CLOSED**. Jerome has successfully completed eight sessions of counseling and one psychological assessment, achieving meaningful progress in managing his academic stress and anxiety. All case records — including session notes, SOAP documentation, PERMA assessments, and the termination summary — are archived in the system. Jerome retains access to his care history through his student account. Should he require support in the future, he can return to the CPS portal to submit a new appointment request.

---

*CPS Management System — Walkthrough Guide v1.0*
