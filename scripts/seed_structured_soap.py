#!/usr/bin/env python3
"""
Add structured SOAP session notes (using the StructuredSOAPForm schema)
to several cases that currently only have free-form notes.
"""
from pymongo import MongoClient
from datetime import datetime, timedelta

db = MongoClient()['cps_system_dev']
now = datetime.utcnow()

def H(days, h=10, m=0):
    return (now - timedelta(days=days)).replace(hour=h, minute=m, second=0, microsecond=0)

def u(email):
    return db.users.find_one({'email': email})['_id']

def c(num):
    return db.cases.find_one({'case_number': num})['_id']

def name(uid):
    d = db.users.find_one({'_id': uid})
    return f"{d['first_name']} {d['last_name']}"

# ── Option string shorthands (exact text from StructuredSOAPForm.tsx) ─────────
# S — Mood
CALM        = 'Calm – feels relaxed and at ease'
HAPPY       = 'Happy / Cheerful – positive, content, or uplifted'
NEUTRAL     = 'Neutral – neither good nor bad; steady'
ANXIOUS_M   = 'Anxious / Nervous – worried or tense'
SAD_M       = 'Sad / Low – down or discouraged'
IRRITABLE_M = 'Irritable / Frustrated – easily annoyed or upset'
TIRED_M     = 'Tired / Fatigued – lacking energy or motivation'
STRESSED    = 'Stressed / Overwhelmed – burdened by pressure or demands'
HOPEFUL     = 'Hopeful – optimistic about situation or future'
MOTIVATED   = 'Motivated – focused and driven to act'

# S — Concerns
SC_ACADEMIC  = 'Academic / Performance Concerns – difficulties with studies, workload, or motivation'
SC_ADJUST    = 'Adjustment Issues – trouble adapting to new environment or life changes'
SC_ANXIETY   = 'Anxiety / Stress – excessive worry, pressure, or restlessness'
SC_CAREER    = 'Career / Decision-Making – uncertainty about choices or direction'
SC_DEPRESSION= 'Depression / Low Mood – sadness, loss of interest, or hopelessness'
SC_FAMILY    = 'Family Concerns – conflict, communication, or relationship strain at home'
SC_INTERPERS = 'Interpersonal / Relationship Issues – friendship, romantic, or peer conflicts'
SC_SELFESTEEM= 'Self-Esteem / Self-Confidence – feelings of inadequacy or low self-worth'
SC_GRIEF     = 'Grief / Loss – bereavement or emotional distress from loss'
SC_TRAUMA    = 'Trauma / Past Experiences – distress related to previous events'
SC_TIME      = 'Time Management / Productivity – difficulty balancing tasks or meeting deadlines'
SC_MOTIVATION= 'Motivation / Goal Setting – struggles initiating or sustaining effort'

# S — Coping
COP_SOCIAL   = 'Seeking social support – talking to friends, family, or peers'
COP_PROBLEM  = 'Problem-solving – planning or taking steps to address issues'
COP_REFRAME  = 'Positive reframing – focusing on lessons or growth from challenges'
COP_RELAX    = 'Relaxation / Mindfulness – breathing, meditation, or grounding exercises'
COP_FAITH    = 'Spiritual / Faith-based practices – prayer, reflection, or attending services'
COP_HOBBIES  = 'Engaging in hobbies – music, art, sports, reading, etc.'
COP_EXERCISE = 'Physical activity – exercise or movement to manage stress'
COP_AVOIDANCE= 'Avoidance / Withdrawal – escaping or avoiding the issue'
COP_SUPPRESS = 'Suppression / Denial – minimizing or pushing away emotions'
COP_SELFCARE = 'Self-care routines – rest, healthy eating, journaling, breaks'

# S — Suicidal ideation
SI_DENIED    = 'Denied – client clearly reports no suicidal or self-harm thoughts'
SI_PASSIVE   = 'Passive – vague thoughts but no intent or plan'
SI_ACTIVE    = 'Active – current suicidal or self-harm thoughts reported'
SI_NA        = 'Not assessed – topic not covered this session'

# O — Appearance
APP_APPROP   = 'Appropriate – suitable for the setting and occasion'
APP_NEAT     = 'Neat – clean and well-groomed'
APP_CASUAL   = 'Casual – relaxed but tidy appearance'
APP_DISHEVEL = 'Disheveled – messy, wrinkled, or unkempt look'
APP_FATIGUED = 'Fatigued – appears tired or lacking energy'
APP_TEARFUL  = 'Tearful – appears emotional or crying during session'

# O — Affect
AFF_APPROP   = 'Appropriate – affect matches situation or discussion content'
AFF_CALM     = 'Calm / Stable – relaxed, steady emotional tone'
AFF_NEUTRAL  = 'Neutral – even, without strong emotion'
AFF_ANXIOUS  = 'Anxious / Tense – restless or uneasy presentation'
AFF_SAD      = 'Sad / Depressed – subdued, low affect'
AFF_IRRITABLE= 'Irritable / Angry – easily annoyed or reactive tone'
AFF_FLAT     = 'Flat / Blunted – minimal or no visible emotional expression'
AFF_TEARFUL  = 'Tearful / Labile – emotional or shifts mood quickly'

# O — Behavior
BEH_CALM     = 'Calm / Cooperative – engaged and responsive during session'
BEH_ATTENTIVE= 'Attentive – focused and shows interest in discussion'
BEH_RESTLESS = 'Restless / Fidgety – moves frequently, appears tense or uneasy'
BEH_AGITATED = 'Agitated / Irritable – visibly frustrated or reactive'
BEH_WITHDRAWN= 'Withdrawn / Guarded – quiet, distant, or hesitant to speak'
BEH_TEARFUL  = 'Tearful / Emotional – crying or easily moved to tears'
BEH_DISTRACT = 'Distracted / Inattentive – difficulty maintaining focus'
BEH_LETHARGIC= 'Lethargic / Low Energy – slow or tired in movements and response'

# O — Speech/Thought
SP_NORMAL    = 'Normal / Coherent – clear, logical, and easy to follow'
SP_GOAL      = 'Goal-directed – focused, stays on topic'
SP_CIRCUM    = 'Circumstantial – includes unnecessary details but eventually answers'
SP_TANGENTIAL= 'Tangential – drifts off topic and does not return'

# A — Progress
PRG_IMPROVED = 'Improved – noticeable positive change in mood, coping, or functioning since last session'
PRG_SLIGHT   = 'Slightly Improved – minor positive changes, though issues are still present'
PRG_NOCHANGE = 'No Change – condition or behavior remains generally the same'
PRG_DECLINED = 'Declined – mood, symptoms, or functioning have worsened compared to the previous session'

# A — Main issues
AI_STRESS    = 'Stress Management – difficulty handling academic, work, or personal stressors'
AI_ANXIETY   = 'Anxiety Symptoms – excessive worry, restlessness, or physiological tension'
AI_DEPRESSION= 'Depressive Symptoms – low mood, hopelessness, or loss of motivation/interest'
AI_RELATION  = 'Relationship Conflict – interpersonal or family tension, communication issues'
AI_ADJUST    = 'Adjustment Issues – trouble adapting to change or new circumstances'
AI_ACADEMIC  = 'Academic / Work Concerns – poor performance, burnout, or lack of focus'
AI_SELFESTEEM= 'Self-Esteem / Self-Concept – low confidence or negative self-perception'
AI_TRAUMA    = 'Trauma-Related Distress – emotional impact from past adverse experiences'
AI_GRIEF     = 'Grief / Loss – emotional distress following bereavement or major loss'
AI_HEALTH    = 'Health / Fatigue – physical illness, psychosomatic concerns, or exhaustion'
AI_MOTIVATION= 'Motivation / Goal Setting – difficulty initiating or sustaining effort'
AI_TIME      = 'Time Management / Productivity – struggle to balance responsibilities'

# A — Risk level
RISK_LOW     = 'Low Risk – fleeting thoughts, no plan or intent, protective factors identified'
RISK_MOD     = 'Moderate Risk – ideation with some intent but no plan; partial protective factors'
RISK_HIGH    = 'High Risk – active plan or intent, recent attempt, limited protective factors'
RISK_NA      = 'N/A – not applicable (risk not present or not assessed this session)'

# A — Clinical impression
CI_PROGRESS  = 'Client demonstrates progress – shows improvement in mood, coping, or insight'
CI_STABLE    = 'Stable functioning – no significant change; maintains current coping level'
CI_MILD      = 'Mild distress – manageable symptoms; able to function with some difficulty'
CI_MODERATE  = 'Moderate distress – noticeable impact on functioning; requires ongoing support'
CI_SEVERE    = 'Severe distress – significant impairment in daily functioning or emotional regulation'
CI_INSIGHT   = 'Insight present – recognizes thoughts, emotions, or behaviors contributing to issues'
CI_LTD_INS   = 'Limited insight – minimal awareness or denial of contributing factors'
CI_ENGAGED   = 'Engaged in session – participative, reflective, and responsive to interventions'
CI_MINIMAL   = 'Minimally engaged – quiet, withdrawn, or resistant during session'
CI_NO_SAFETY = 'No immediate safety risk – denies suicidal or self-harm thoughts'
CI_SAFETY    = 'Safety concern identified – refer to C-SSRS and note safety actions'
CI_FOLLOWUP  = 'Follow-up required – schedule next session or coordinate with support system'
CI_REFERRAL  = 'Referral recommended – consider internal/external referral'

# P — Interventions
INT_CBT      = 'Cognitive-Behavioral Therapy (CBT)'
INT_DBT      = 'Dialectical Behavior Therapy (DBT)'
INT_MBI      = 'Mindfulness-Based Intervention (MBI)'
INT_MI       = 'Motivational Interviewing (MI)'
INT_PCT      = 'Person-Centered Therapy (PCT)'
INT_PSYCHOED = 'Psychoeducation'
INT_SFBT     = 'Solution-Focused Brief Therapy (SFBT)'
INT_SUPPORT  = 'Supportive Counseling'
INT_ACT      = 'Acceptance and Commitment Therapy (ACT)'
INT_NT       = 'Narrative Therapy (NT)'
INT_IPT      = 'Interpersonal Therapy (IPT)'

# P — Homework
HW_JOURNAL   = 'Reflection or journaling activity'
HW_MINDFUL   = 'Practice mindfulness or relaxation techniques'
HW_COPING    = 'Apply coping strategies discussed'
HW_SUPPORT   = 'Communicate with identified support person'
HW_SELFCARE  = 'Complete self-care or study plan'

# P — Next focus
NF_FOLLOWUP  = 'Follow-up on previous commitments or tasks'
NF_CONTINUE  = 'Continue current goals or interventions'
NF_COPING    = 'Introduce or strengthen coping strategies / skills'
NF_EXPLORE   = 'Explore emotions or manage stressors'
NF_REVIEW    = 'Review progress toward academic, personal, or relational goals'
NF_INSIGHT   = 'Build insight or self-understanding'
NF_COMM      = 'Enhance communication or relationship skills'
NF_MAINTAIN  = 'Maintain progress / prevent relapse'

# P — Follow-up
FU_SCHEDULE  = 'Schedule next counseling session'
FU_ACTIVITY  = 'Client to complete assigned activity or reflection task'
FU_CHECKIN   = 'Follow-up via email / message / check-in'
FU_PSYCH     = 'Referred to CPS psychologist for psychotherapy'

# P — Case status
CS_ONGOING   = 'Ongoing – counseling/psychotherapy sessions are continuing'
CS_ONHOLD    = 'On Hold – sessions temporarily paused (e.g., scheduling or personal reasons)'
CS_REFERRED  = 'Referred – client referred to another CPS counselor, psychologist, or external provider'
CS_CLOSED    = 'Terminated / Closed – counseling/psychotherapy relationship formally concluded'

# ── Insert helper ──────────────────────────────────────────────────────────────
notes_added = 0

def structured_soap(case_id, counselor_id, student_id, dt, session_num, mode, goal,
                    s_mood, s_concerns, s_coping, s_si,
                    o_appearance, o_affect, o_behavior, o_speech,
                    a_progress, a_issues, a_risk, a_impression, a_remarks,
                    p_interventions, p_homework, p_next_focus, p_follow_up, p_remarks,
                    p_case_status, p_termination_summary='Ongoing case not for termination yet',
                    mood_rating=5, risk_flagged=False):
    global notes_added
    db.session_notes.insert_one({
        'case_id':        case_id,
        'counselor_id':   counselor_id,
        'student_id':     student_id,
        'student_name':   name(student_id),
        'session_date':   dt,
        'session_type':   'INDIVIDUAL',
        'note_format':    'SOAP',
        'soap':           None,
        'structured_soap': {
            'mode_of_session':          mode,
            'session_number':           session_num,
            'counseling_goal':          goal,
            's_mood':                   s_mood,
            's_mood_other':             '',
            's_concerns':               s_concerns,
            's_concerns_other':         '',
            's_coping':                 s_coping,
            's_coping_other':           '',
            's_suicidal_ideation':      s_si,
            'o_appearance':             o_appearance,
            'o_appearance_other':       '',
            'o_affect':                 o_affect,
            'o_affect_other':           '',
            'o_behavior':               o_behavior,
            'o_behavior_other':         '',
            'o_speech_thought':         o_speech,
            'o_speech_thought_other':   '',
            'a_progress':               a_progress,
            'a_progress_other':         '',
            'a_main_issues':            a_issues,
            'a_main_issues_other':      '',
            'a_risk_level':             a_risk,
            'a_clinical_impression':    a_impression,
            'a_clinical_impression_other': '',
            'a_remarks':                a_remarks,
            'p_interventions':          p_interventions,
            'p_interventions_other':    '',
            'p_homework':               p_homework,
            'p_homework_other':         '',
            'p_next_focus':             p_next_focus,
            'p_next_focus_other':       '',
            'p_follow_up':              p_follow_up,
            'p_follow_up_other':        '',
            'p_remarks':                p_remarks,
            'p_case_status':            p_case_status,
            'p_case_status_other':      '',
            'p_termination_summary':    p_termination_summary,
        },
        'mood_rating':    mood_rating,
        'risk_flagged':   risk_flagged,
        'risk_notes':     'Elevated risk — see structured SOAP A section' if risk_flagged else None,
        'is_deleted':     False,
        'current_version': 1,
        'edit_history':   [],
        'created_at':     dt,
        'updated_at':     dt,
    })
    notes_added += 1

# ── Users ──────────────────────────────────────────────────────────────────────
s3  = u('lpark@dlsu.edu.ph')       # Lena   — c3  ACTIVE, relationship/anxiety
s7  = u('msantos@dlsu.edu.ph')     # Miguel — c7  ACTIVE, trauma
s8  = u('egarcia@dlsu.edu.ph')     # Ella   — c8  ACTIVE, family conflict
s12 = u('pdesai@dlsu.edu.ph')      # Priya  — c12 ACTIVE, grief
s13 = u('rkim@dlsu.edu.ph')        # Rachel — c13 ACTIVE, OCD
s14 = u('idelarosa@dlsu.edu.ph')   # Iris   — c14 ACTIVE, ADHD
s16 = u('cdiaz@dlsu.edu.ph')       # Carlos — c16 ACTIVE, bipolar
s17 = u('mcruz@dlsu.edu.ph')       # Mia    — c17 ACTIVE, homesickness

c_chelly = u('chelly@dlsu.edu.ph')
c_rose   = u('rose.t@dlsu.edu.ph')
c_daye   = u('daye@dlsu.edu.ph')
c_clara  = u('clara@dlsu.edu.ph')
c_bia    = u('bia@dlsu.edu.ph')
p_niko   = u('niko@dlsu.edu.ph')
p_jenny  = u('jenny@dlsu.edu.ph')
p_chona  = u('chona@dlsu.edu.ph')
p_shel   = u('shel@dlsu.edu.ph')

c3  = c('CPS-2025-003')
c7  = c('CPS-2025-007')
c8  = c('CPS-2025-008')
c12 = c('CPS-2025-012')
c13 = c('CPS-2025-013')
c14 = c('CPS-2025-014')
c16 = c('CPS-2025-016')
c17 = c('CPS-2025-017')

# ══════════════════════════════════════════════════════════════════════════════
# Lena (c3) — relationship anxiety, 2 structured SOAP notes
# ══════════════════════════════════════════════════════════════════════════════
structured_soap(
    c3, c_chelly, s3, H(21, 10), '2', 'Onsite (Face-to-Face)',
    goal='Client will identify and express at least two specific emotions related to the breakup without redirecting to cognitive analysis, using a feelings inventory exercise before session 4.',
    s_mood=[ANXIOUS_M, SAD_M],
    s_concerns=[SC_ANXIETY, SC_INTERPERS, SC_SELFESTEEM],
    s_coping=[COP_SOCIAL, COP_SUPPRESS],
    s_si=SI_DENIED,
    o_appearance=[APP_NEAT, APP_CASUAL],
    o_affect=[AFF_APPROP, AFF_ANXIOUS, AFF_TEARFUL],
    o_behavior=[BEH_ATTENTIVE, BEH_RESTLESS],
    o_speech=[SP_NORMAL, SP_CIRCUM],
    a_progress=PRG_SLIGHT,
    a_issues=[AI_ANXIETY, AI_RELATION],
    a_risk=RISK_NA,
    a_impression=[CI_MILD, CI_INSIGHT, CI_ENGAGED, CI_NO_SAFETY, CI_FOLLOWUP],
    a_remarks='Client tends to intellectualize grief. Able to briefly access sadness when gently prompted. Good self-awareness overall.',
    p_interventions=[INT_PCT, INT_CBT, INT_PSYCHOED],
    p_homework=[HW_JOURNAL, HW_MINDFUL],
    p_next_focus=[NF_EXPLORE, NF_COPING],
    p_follow_up=[FU_SCHEDULE, FU_ACTIVITY],
    p_remarks='Assigned feelings inventory worksheet. Discussed sleep hygiene — client agreed to limit phone use after 10 PM.',
    p_case_status=[CS_ONGOING],
    mood_rating=4)

structured_soap(
    c3, c_chelly, s3, H(14, 10), '3', 'Onsite (Face-to-Face)',
    goal='Client will practice scheduled worry time (15 min/day) and report on its effectiveness before session 5.',
    s_mood=[NEUTRAL, HOPEFUL],
    s_concerns=[SC_ANXIETY, SC_INTERPERS],
    s_coping=[COP_JOURNAL if False else COP_SELFCARE, COP_RELAX],
    s_si=SI_DENIED,
    o_appearance=[APP_NEAT, APP_APPROP],
    o_affect=[AFF_APPROP, AFF_CALM],
    o_behavior=[BEH_CALM, BEH_ATTENTIVE],
    o_speech=[SP_NORMAL, SP_GOAL],
    a_progress=PRG_IMPROVED,
    a_issues=[AI_ANXIETY, AI_RELATION],
    a_risk=RISK_NA,
    a_impression=[CI_PROGRESS, CI_INSIGHT, CI_ENGAGED, CI_NO_SAFETY, CI_FOLLOWUP],
    a_remarks='Noticeable improvement in affect regulation. Client completed feelings inventory and reported increased awareness of emotional avoidance patterns.',
    p_interventions=[INT_CBT, INT_MBI, INT_PCT],
    p_homework=[HW_MINDFUL, HW_COPING],
    p_next_focus=[NF_FOLLOWUP, NF_COPING, NF_MAINTAIN],
    p_follow_up=[FU_SCHEDULE, FU_ACTIVITY],
    p_remarks='Introduced scheduled worry time technique. Client engaged well and committed to daily 15-minute practice.',
    p_case_status=[CS_ONGOING],
    mood_rating=6)

# ══════════════════════════════════════════════════════════════════════════════
# Miguel (c7) — trauma/PTSD, 2 structured SOAP notes
# ══════════════════════════════════════════════════════════════════════════════
structured_soap(
    c7, p_niko, s7, H(18, 13), '2', 'Onsite (Face-to-Face)',
    goal='Client will practice the Safe Place grounding exercise daily and report frequency/effectiveness at session 3, as a prerequisite for trauma-processing work.',
    s_mood=[ANXIOUS_M, TIRED_M],
    s_concerns=[SC_ANXIETY, SC_TRAUMA],
    s_coping=[COP_AVOIDANCE, COP_SUPPRESS],
    s_si=SI_DENIED,
    o_appearance=[APP_CASUAL, APP_FATIGUED],
    o_affect=[AFF_ANXIOUS, AFF_APPROP],
    o_behavior=[BEH_RESTLESS, BEH_ATTENTIVE],
    o_speech=[SP_NORMAL, SP_GOAL],
    a_progress=PRG_SLIGHT,
    a_issues=[AI_TRAUMA, AI_ANXIETY, AI_STRESS],
    a_risk=RISK_NA,
    a_impression=[CI_MODERATE, CI_INSIGHT, CI_ENGAGED, CI_NO_SAFETY, CI_FOLLOWUP],
    a_remarks='Client continues to experience 3–4 intrusive flashbacks per week. Avoidance of public transport still active. Showed engagement with grounding techniques introduced today.',
    p_interventions=[INT_CBT, INT_MBI, INT_PSYCHOED],
    p_homework=[HW_MINDFUL, HW_COPING],
    p_next_focus=[NF_COPING, NF_FOLLOWUP],
    p_follow_up=[FU_SCHEDULE, FU_ACTIVITY],
    p_remarks='Practiced 5-4-3-2-1 grounding in session. Client responded well. Safe Place visualization exercise assigned as daily homework.',
    p_case_status=[CS_ONGOING],
    mood_rating=3)

structured_soap(
    c7, p_niko, s7, H(11, 13), '3', 'Onsite (Face-to-Face)',
    goal='Client will engage in one graded exposure task (standing at a bus stop for 5 minutes) with grounding support and report back at session 4.',
    s_mood=[ANXIOUS_M, HOPEFUL],
    s_concerns=[SC_ANXIETY, SC_TRAUMA],
    s_coping=[COP_RELAX, COP_PROBLEM],
    s_si=SI_DENIED,
    o_appearance=[APP_CASUAL, APP_APPROP],
    o_affect=[AFF_ANXIOUS, AFF_APPROP],
    o_behavior=[BEH_CALM, BEH_ATTENTIVE],
    o_speech=[SP_NORMAL, SP_GOAL],
    a_progress=PRG_IMPROVED,
    a_issues=[AI_TRAUMA, AI_ANXIETY],
    a_risk=RISK_NA,
    a_impression=[CI_PROGRESS, CI_INSIGHT, CI_ENGAGED, CI_NO_SAFETY, CI_FOLLOWUP],
    a_remarks='Client completed grounding homework 6 of 7 days. Reports flashbacks reduced to 1–2×/week. Motivation for graduated exposure is increasing.',
    p_interventions=[INT_CBT, INT_MBI],
    p_homework=[HW_COPING, HW_JOURNAL],
    p_next_focus=[NF_COPING, NF_EXPLORE, NF_CONTINUE],
    p_follow_up=[FU_SCHEDULE, FU_ACTIVITY],
    p_remarks='Discussed graded exposure rationale. Client agreed to first step: visit a bus stop as a passenger observer (no boarding). Safety plan reviewed.',
    p_case_status=[CS_ONGOING],
    mood_rating=5)

# ══════════════════════════════════════════════════════════════════════════════
# Ella (c8) — family conflict/stress, 2 structured SOAP notes
# ══════════════════════════════════════════════════════════════════════════════
structured_soap(
    c8, c_rose, s8, H(16, 11), '2', 'Onsite (Face-to-Face)',
    goal='Client will identify and apply one "detachment with compassion" boundary technique during a family conflict situation before session 3.',
    s_mood=[STRESSED, ANXIOUS_M],
    s_concerns=[SC_FAMILY, SC_ANXIETY, SC_ACADEMIC],
    s_coping=[COP_SUPPRESS, COP_AVOIDANCE],
    s_si=SI_DENIED,
    o_appearance=[APP_NEAT, APP_FATIGUED],
    o_affect=[AFF_ANXIOUS, AFF_APPROP],
    o_behavior=[BEH_ATTENTIVE, BEH_RESTLESS],
    o_speech=[SP_NORMAL, SP_GOAL],
    a_progress=PRG_NOCHANGE,
    a_issues=[AI_STRESS, AI_RELATION, AI_ACADEMIC],
    a_risk=RISK_NA,
    a_impression=[CI_MILD, CI_INSIGHT, CI_ENGAGED, CI_NO_SAFETY, CI_FOLLOWUP],
    a_remarks='Home conflict escalated this week — parents\' arguments now audible from student\'s study space. Academic focus significantly disrupted.',
    p_interventions=[INT_PCT, INT_CBT, INT_IPT],
    p_homework=[HW_JOURNAL, HW_COPING],
    p_next_focus=[NF_EXPLORE, NF_COPING, NF_COMM],
    p_follow_up=[FU_SCHEDULE, FU_ACTIVITY],
    p_remarks='Introduced "detachment with compassion" concept. Practiced distinguishing what is in versus out of client\'s control.',
    p_case_status=[CS_ONGOING],
    mood_rating=4)

structured_soap(
    c8, c_rose, s8, H(9, 11), '3', 'Online (Zoom, Google Meet, etc.)',
    goal='Client will practice a 10-minute daily boundary-setting journaling exercise and identify one concrete way to protect study time from household disruptions.',
    s_mood=[NEUTRAL, HOPEFUL],
    s_concerns=[SC_FAMILY, SC_ACADEMIC],
    s_coping=[COP_JOURNAL if False else COP_REFRAME, COP_SOCIAL],
    s_si=SI_DENIED,
    o_appearance=[APP_APPROP, APP_CASUAL],
    o_affect=[AFF_APPROP, AFF_CALM],
    o_behavior=[BEH_CALM, BEH_ATTENTIVE],
    o_speech=[SP_NORMAL, SP_GOAL],
    a_progress=PRG_SLIGHT,
    a_issues=[AI_RELATION, AI_STRESS],
    a_risk=RISK_NA,
    a_impression=[CI_PROGRESS, CI_INSIGHT, CI_ENGAGED, CI_NO_SAFETY, CI_FOLLOWUP],
    a_remarks='Client applied detachment technique once and found it helpful. Sleep slightly improved. Academic engagement still affected but less than previous week.',
    p_interventions=[INT_CBT, INT_PCT, INT_PSYCHOED],
    p_homework=[HW_JOURNAL, HW_SELFCARE],
    p_next_focus=[NF_FOLLOWUP, NF_COPING, NF_REVIEW],
    p_follow_up=[FU_SCHEDULE, FU_ACTIVITY],
    p_remarks='Discussed study environment strategies. Client will rearrange room to reduce auditory exposure during study hours.',
    p_case_status=[CS_ONGOING],
    mood_rating=5)

# ══════════════════════════════════════════════════════════════════════════════
# Priya (c12) — grief/bereavement, 2 structured SOAP notes
# ══════════════════════════════════════════════════════════════════════════════
structured_soap(
    c12, c_daye, s12, H(19, 9), '2', 'Onsite (Face-to-Face)',
    goal='Client will identify and articulate three specific memories of the deceased that bring both sadness and warmth, using a memory narrative exercise before session 3.',
    s_mood=[SAD_M, TIRED_M],
    s_concerns=[SC_GRIEF, SC_DEPRESSION, SC_ACADEMIC],
    s_coping=[COP_FAITH, COP_SUPPRESS],
    s_si=SI_DENIED,
    o_appearance=[APP_CASUAL, APP_FATIGUED, APP_TEARFUL],
    o_affect=[AFF_SAD, AFF_TEARFUL, AFF_APPROP],
    o_behavior=[BEH_TEARFUL, BEH_CALM],
    o_speech=[SP_NORMAL, SP_CIRCUM],
    a_progress=PRG_NOCHANGE,
    a_issues=[AI_GRIEF, AI_DEPRESSION, AI_ACADEMIC],
    a_risk=RISK_NA,
    a_impression=[CI_MODERATE, CI_INSIGHT, CI_ENGAGED, CI_NO_SAFETY, CI_FOLLOWUP],
    a_remarks='Client describes grief as "waves that hit without warning." Academic absences increasing. Social withdrawal continuing.',
    p_interventions=[INT_PCT, INT_NT, INT_PSYCHOED],
    p_homework=[HW_JOURNAL, HW_SUPPORT],
    p_next_focus=[NF_EXPLORE, NF_INSIGHT],
    p_follow_up=[FU_SCHEDULE, FU_ACTIVITY],
    p_remarks='Introduced narrative grief approach — memory re-telling to reduce avoidance and integrate loss. Assigned written memory narrative as between-session task.',
    p_case_status=[CS_ONGOING],
    mood_rating=3)

structured_soap(
    c12, c_daye, s12, H(12, 9), '3', 'Onsite (Face-to-Face)',
    goal='Client will reconnect with one peer or faith community member before session 4 and share the experience in session.',
    s_mood=[SAD_M, HOPEFUL],
    s_concerns=[SC_GRIEF, SC_ADJUST],
    s_coping=[COP_FAITH, COP_SOCIAL],
    s_si=SI_DENIED,
    o_appearance=[APP_NEAT, APP_CASUAL],
    o_affect=[AFF_SAD, AFF_APPROP],
    o_behavior=[BEH_CALM, BEH_ATTENTIVE],
    o_speech=[SP_NORMAL, SP_GOAL],
    a_progress=PRG_SLIGHT,
    a_issues=[AI_GRIEF, AI_ADJUST],
    a_risk=RISK_NA,
    a_impression=[CI_PROGRESS, CI_INSIGHT, CI_ENGAGED, CI_NO_SAFETY, CI_FOLLOWUP],
    a_remarks='Client completed memory narrative. Able to hold mixed emotions (sadness + warmth) simultaneously — this is a marker of progress in grief integration.',
    p_interventions=[INT_NT, INT_PCT, INT_MBI],
    p_homework=[HW_SUPPORT, HW_MINDFUL],
    p_next_focus=[NF_FOLLOWUP, NF_EXPLORE, NF_COMM],
    p_follow_up=[FU_SCHEDULE, FU_ACTIVITY],
    p_remarks='Encouraged re-engagement with faith community as a grief support structure. Discussed meaning-making around the loss.',
    p_case_status=[CS_ONGOING],
    mood_rating=5)

# ══════════════════════════════════════════════════════════════════════════════
# Rachel (c13) — OCD, 2 structured SOAP notes
# ══════════════════════════════════════════════════════════════════════════════
structured_soap(
    c13, c_clara, s13, H(20, 10), '2', 'Onsite (Face-to-Face)',
    goal='Client will complete the ERP hierarchy worksheet ranking 10 feared situations and return it at session 3, prioritizing items with moderate distress (SUDS 40–60).',
    s_mood=[ANXIOUS_M, STRESSED],
    s_concerns=[SC_ANXIETY],
    s_coping=[COP_AVOIDANCE, COP_SUPPRESS],
    s_si=SI_DENIED,
    o_appearance=[APP_NEAT, APP_APPROP],
    o_affect=[AFF_ANXIOUS, AFF_APPROP],
    o_behavior=[BEH_RESTLESS, BEH_ATTENTIVE],
    o_speech=[SP_NORMAL, SP_GOAL],
    a_progress=PRG_NOCHANGE,
    a_issues=[AI_ANXIETY, AI_TIME],
    a_risk=RISK_NA,
    a_impression=[CI_MODERATE, CI_INSIGHT, CI_ENGAGED, CI_NO_SAFETY, CI_FOLLOWUP],
    a_remarks='OCD rituals consuming 2.5–3 hours daily. Client has good insight into compulsion cycle but struggles with motivation to resist. Academic impact significant.',
    p_interventions=[INT_CBT, INT_PSYCHOED],
    p_homework=[HW_JOURNAL, HW_COPING],
    p_next_focus=[NF_COPING, NF_EXPLORE],
    p_follow_up=[FU_SCHEDULE, FU_ACTIVITY],
    p_remarks='Provided ERP psychoeducation. Explained rationale for response prevention. Client completed initial SUDS hierarchy in session.',
    p_case_status=[CS_ONGOING],
    mood_rating=4)

structured_soap(
    c13, c_clara, s13, H(13, 10), '3', 'Onsite (Face-to-Face)',
    goal='Client will attempt one exposure task (checking the stove once then leaving the kitchen) and record SUDS before, during, and after, to bring to session 4.',
    s_mood=[ANXIOUS_M, MOTIVATED],
    s_concerns=[SC_ANXIETY],
    s_coping=[COP_PROBLEM, COP_RELAX],
    s_si=SI_DENIED,
    o_appearance=[APP_NEAT, APP_APPROP],
    o_affect=[AFF_ANXIOUS, AFF_APPROP],
    o_behavior=[BEH_ATTENTIVE, BEH_RESTLESS],
    o_speech=[SP_NORMAL, SP_GOAL],
    a_progress=PRG_SLIGHT,
    a_issues=[AI_ANXIETY, AI_MOTIVATION],
    a_risk=RISK_NA,
    a_impression=[CI_PROGRESS, CI_INSIGHT, CI_ENGAGED, CI_NO_SAFETY, CI_FOLLOWUP],
    a_remarks='Client submitted completed hierarchy. Top-ranked trigger: leaving the stove unchecked when leaving home. SUDS: 90. Starting point agreed: stove check reduced to 1× then exit.',
    p_interventions=[INT_CBT, INT_MBI],
    p_homework=[HW_COPING, HW_JOURNAL],
    p_next_focus=[NF_COPING, NF_FOLLOWUP, NF_REVIEW],
    p_follow_up=[FU_SCHEDULE, FU_ACTIVITY],
    p_remarks='Practiced in-session imaginal exposure. Reviewed anxiety curve and the relationship between rituals and maintained anxiety. Client motivated to begin behavioral experiments.',
    p_case_status=[CS_ONGOING],
    mood_rating=5)

# ══════════════════════════════════════════════════════════════════════════════
# Iris (c14) — ADHD/academic difficulties, 2 structured SOAP notes
# ══════════════════════════════════════════════════════════════════════════════
structured_soap(
    c14, p_shel, s14, H(17, 11), '2', 'Onsite (Face-to-Face)',
    goal='Client will implement a daily time-blocking schedule for one week and track task completion percentage, sharing results at session 3.',
    s_mood=[NEUTRAL, STRESSED],
    s_concerns=[SC_ACADEMIC, SC_ANXIETY, SC_MOTIVATION],
    s_coping=[COP_PROBLEM, COP_SUPPRESS],
    s_si=SI_DENIED,
    o_appearance=[APP_CASUAL, APP_APPROP],
    o_affect=[AFF_APPROP, AFF_NEUTRAL],
    o_behavior=[BEH_ATTENTIVE, BEH_RESTLESS, BEH_DISTRACT],
    o_speech=[SP_NORMAL, SP_CIRCUM],
    a_progress=PRG_SLIGHT,
    a_issues=[AI_ACADEMIC, AI_TIME, AI_MOTIVATION],
    a_risk=RISK_NA,
    a_impression=[CI_MILD, CI_INSIGHT, CI_ENGAGED, CI_NO_SAFETY, CI_FOLLOWUP],
    a_remarks='Client missed two deadlines this week despite good intentions. Self-reported frustration with inability to sustain effort ("I start strong then just... drift"). Good self-awareness about ADHD patterns.',
    p_interventions=[INT_CBT, INT_SFBT, INT_PSYCHOED],
    p_homework=[HW_SELFCARE, HW_COPING],
    p_next_focus=[NF_COPING, NF_REVIEW, NF_FOLLOWUP],
    p_follow_up=[FU_SCHEDULE, FU_ACTIVITY],
    p_remarks='Co-designed time-blocking template adapted for ADHD (shorter blocks, visual color-coding, built-in transitions). Discussed dopamine motivation strategy.',
    p_case_status=[CS_ONGOING],
    mood_rating=5)

structured_soap(
    c14, p_shel, s14, H(10, 11), '3', 'Onsite (Face-to-Face)',
    goal='Client will use a 2-minute rule ("if it takes less than 2 minutes, do it now") for 5 days and track instances, to reduce procrastination on small academic tasks.',
    s_mood=[HOPEFUL, MOTIVATED],
    s_concerns=[SC_ACADEMIC, SC_SELFESTEEM],
    s_coping=[COP_PROBLEM, COP_REFRAME],
    s_si=SI_DENIED,
    o_appearance=[APP_CASUAL, APP_APPROP],
    o_affect=[AFF_APPROP, AFF_CALM],
    o_behavior=[BEH_ATTENTIVE, BEH_CALM],
    o_speech=[SP_NORMAL, SP_GOAL],
    a_progress=PRG_IMPROVED,
    a_issues=[AI_ACADEMIC, AI_SELFESTEEM],
    a_risk=RISK_NA,
    a_impression=[CI_PROGRESS, CI_INSIGHT, CI_ENGAGED, CI_NO_SAFETY, CI_FOLLOWUP],
    a_remarks='Time-blocking worked 4 of 7 days. Client celebrates partial success rather than all-or-nothing thinking — a significant shift. Submitted one overdue task.',
    p_interventions=[INT_CBT, INT_ACT, INT_SFBT],
    p_homework=[HW_COPING, HW_JOURNAL],
    p_next_focus=[NF_FOLLOWUP, NF_REVIEW, NF_MAINTAIN],
    p_follow_up=[FU_SCHEDULE, FU_ACTIVITY],
    p_remarks='Discussed cognitive restructuring of "lazy" self-label. Reframed ADHD as a different operating system, not a deficit. Client responded positively.',
    p_case_status=[CS_ONGOING],
    mood_rating=6)

# ══════════════════════════════════════════════════════════════════════════════
# Carlos (c16) — bipolar disorder, 2 structured SOAP notes
# ══════════════════════════════════════════════════════════════════════════════
structured_soap(
    c16, p_jenny, s16, H(15, 14), '2', 'Onsite (Face-to-Face)',
    goal='Client will complete the mood tracking chart daily for two weeks and bring completed chart to session 3 to identify early warning signs of mood shifts.',
    s_mood=[TIRED_M, SAD_M],
    s_concerns=[SC_DEPRESSION, SC_ACADEMIC, SC_MOTIVATION],
    s_coping=[COP_FAITH, COP_SOCIAL],
    s_si=SI_DENIED,
    o_appearance=[APP_CASUAL, APP_FATIGUED],
    o_affect=[AFF_SAD, AFF_FLAT, AFF_APPROP],
    o_behavior=[BEH_LETHARGIC, BEH_CALM],
    o_speech=[SP_NORMAL, SP_GOAL],
    a_progress=PRG_NOCHANGE,
    a_issues=[AI_DEPRESSION, AI_ACADEMIC, AI_MOTIVATION],
    a_risk=RISK_LOW,
    a_impression=[CI_MODERATE, CI_INSIGHT, CI_ENGAGED, CI_FOLLOWUP],
    a_remarks='Depressive phase ongoing — sleeping 12 hours, skipping morning classes. Medication compliance confirmed (lithium). No SI. Psychiatric review scheduled next week.',
    p_interventions=[INT_PSYCHOED, INT_ACT, INT_SUPPORT],
    p_homework=[HW_SELFCARE, HW_JOURNAL],
    p_next_focus=[NF_REVIEW, NF_COPING, NF_EXPLORE],
    p_follow_up=[FU_SCHEDULE, FU_CHECKIN],
    p_remarks='Discussed behavioral activation as a depressive-phase intervention. Negotiated minimum activity goal: 10-minute walk daily. Coordination with psychiatrist ongoing.',
    p_case_status=[CS_ONGOING],
    mood_rating=3)

structured_soap(
    c16, p_jenny, s16, H(8, 14), '3', 'Onsite (Face-to-Face)',
    goal='Client will identify at least 3 personal early warning signs of hypomania (behavioral, sleep, thought) and document them on the mood monitoring chart.',
    s_mood=[NEUTRAL, HOPEFUL],
    s_concerns=[SC_DEPRESSION, SC_ACADEMIC],
    s_coping=[COP_SELFCARE, COP_SOCIAL],
    s_si=SI_DENIED,
    o_appearance=[APP_NEAT, APP_CASUAL],
    o_affect=[AFF_APPROP, AFF_CALM],
    o_behavior=[BEH_CALM, BEH_ATTENTIVE],
    o_speech=[SP_NORMAL, SP_GOAL],
    a_progress=PRG_IMPROVED,
    a_issues=[AI_DEPRESSION, AI_ACADEMIC],
    a_risk=RISK_NA,
    a_impression=[CI_PROGRESS, CI_INSIGHT, CI_ENGAGED, CI_NO_SAFETY, CI_FOLLOWUP],
    a_remarks='Depressive episode lightening — sleep normalized to 8–9 hours, attendance resuming. Mood chart completed for 12 of 14 days. Psychiatry review occurred; lithium dose adjusted.',
    p_interventions=[INT_PSYCHOED, INT_CBT, INT_ACT],
    p_homework=[HW_JOURNAL, HW_SELFCARE],
    p_next_focus=[NF_REVIEW, NF_INSIGHT, NF_MAINTAIN],
    p_follow_up=[FU_SCHEDULE, FU_CHECKIN],
    p_remarks='Early warning sign identification exercise completed. Client identified reduced sleep need, increased goal-directed behavior, and "everything is exciting" as hypomania signals.',
    p_case_status=[CS_ONGOING],
    mood_rating=6)

# ══════════════════════════════════════════════════════════════════════════════
# Mia (c17) — homesickness/adjustment, 2 structured SOAP notes
# ══════════════════════════════════════════════════════════════════════════════
structured_soap(
    c17, c_bia, s17, H(13, 9), '2', 'Online (Zoom, Google Meet, etc.)',
    goal='Client will introduce themselves to one dormitory neighbor and attend one university organization meeting before session 3.',
    s_mood=[SAD_M, ANXIOUS_M],
    s_concerns=[SC_ADJUST, SC_INTERPERS],
    s_coping=[COP_FAITH, COP_SUPPRESS],
    s_si=SI_DENIED,
    o_appearance=[APP_CASUAL, APP_APPROP],
    o_affect=[AFF_SAD, AFF_APPROP],
    o_behavior=[BEH_CALM, BEH_ATTENTIVE],
    o_speech=[SP_NORMAL, SP_GOAL],
    a_progress=PRG_SLIGHT,
    a_issues=[AI_ADJUST, AI_RELATION],
    a_risk=RISK_NA,
    a_impression=[CI_MILD, CI_INSIGHT, CI_ENGAGED, CI_NO_SAFETY, CI_FOLLOWUP],
    a_remarks='Client describes homesickness as "a constant dull ache." Has been calling home 3× daily — recognized this may be prolonging adjustment difficulties.',
    p_interventions=[INT_CBT, INT_ACT, INT_PSYCHOED],
    p_homework=[HW_COPING, HW_SUPPORT],
    p_next_focus=[NF_COPING, NF_EXPLORE, NF_COMM],
    p_follow_up=[FU_SCHEDULE, FU_ACTIVITY],
    p_remarks='Discussed transitioning from "coping" mindset to "building a new life" frame. Psychoeducation on adjustment curves. Collaboratively identified low-anxiety social first steps.',
    p_case_status=[CS_ONGOING],
    mood_rating=4)

structured_soap(
    c17, c_bia, s17, H(6, 9), '3', 'Onsite (Face-to-Face)',
    goal='Client will attend the psychology club general assembly next week and report on the experience, including one interaction with a new person.',
    s_mood=[NEUTRAL, HOPEFUL],
    s_concerns=[SC_ADJUST, SC_ANXIETY],
    s_coping=[COP_SOCIAL, COP_FAITH],
    s_si=SI_DENIED,
    o_appearance=[APP_CASUAL, APP_APPROP],
    o_affect=[AFF_APPROP, AFF_CALM],
    o_behavior=[BEH_CALM, BEH_ATTENTIVE],
    o_speech=[SP_NORMAL, SP_GOAL],
    a_progress=PRG_IMPROVED,
    a_issues=[AI_ADJUST],
    a_risk=RISK_NA,
    a_impression=[CI_PROGRESS, CI_INSIGHT, CI_ENGAGED, CI_NO_SAFETY, CI_FOLLOWUP],
    a_remarks='Client spoke to her dormitory neighbor and had a brief positive interaction. Described it as "less terrifying than I thought." Reduced home calls to 1× daily by choice.',
    p_interventions=[INT_CBT, INT_ACT, INT_SFBT],
    p_homework=[HW_COPING, HW_SUPPORT],
    p_next_focus=[NF_FOLLOWUP, NF_REVIEW, NF_COMM],
    p_follow_up=[FU_SCHEDULE, FU_ACTIVITY],
    p_remarks='Celebrated social win. Identified psychology club as interest-aligned community option. Client agreed to attend next week\'s general assembly.',
    p_case_status=[CS_ONGOING],
    mood_rating=6)

# ── Summary ────────────────────────────────────────────────────────────────────
print(f"✅ {notes_added} structured SOAP session notes added")
total = db.session_notes.count_documents({})
structured = db.session_notes.count_documents({'structured_soap': {'$ne': None}})
freeform_soap = db.session_notes.count_documents({'note_format': 'SOAP', 'structured_soap': None})
narrative = db.session_notes.count_documents({'note_format': 'NARRATIVE'})
print(f"   Structured SOAP:  {structured}")
print(f"   Free-form SOAP:   {freeform_soap}")
print(f"   Narrative:        {narrative}")
print(f"   Total notes:      {total}")
