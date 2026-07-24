#!/usr/bin/env python3
"""
Patch script:
  1. Fix all student id_number to DLSU format: 1YY + 5 digits  (e.g. 12173797)
  2. Seed realistic intake_interview_form on ACTIVE/CLOSED cases
"""
import os, random
from datetime import datetime, timedelta
from pymongo import MongoClient
from bson import ObjectId

MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
MONGODB_DB  = os.getenv('MONGODB_DB_NAME', 'cps_system_dev')
db = MongoClient(MONGODB_URI)[MONGODB_DB]

rng = random.Random(42)

# ── IC users (for signature) ──────────────────────────────────────────────────
ic_users = list(db.users.find({'role': 'IC'}, {'first_name': 1, 'last_name': 1}))
ic_names = [f"{u['first_name']} {u['last_name']}" for u in ic_users] or ['CPS Initial Contact']


# ── 1. Fix student IDs ────────────────────────────────────────────────────────
print("=" * 60)
print("STEP 1 — Fix student ID numbers to DLSU format")
print("=" * 60)

students = list(db.users.find({'role': 'STUDENT'}, {'_id': 1, 'created_at': 1, 'id_number': 1}))
updated_ids = 0

# Track used IDs to avoid duplicates
used_ids = set()

for s in students:
    raw = str(s.get('id_number', '') or '')
    # Already correct format: 8 digits starting with 1
    if raw.isdigit() and len(raw) == 8 and raw.startswith('1'):
        used_ids.add(raw)

for s in students:
    raw = str(s.get('id_number', '') or '')
    if raw.isdigit() and len(raw) == 8 and raw.startswith('1'):
        continue  # already correct

    # Derive year from created_at or use a random recent batch
    created = s.get('created_at')
    if created and hasattr(created, 'year'):
        yr = created.year
    else:
        yr = rng.randint(2020, 2024)

    # Clamp to realistic DLSU batches (2020-2025)
    yr = max(2020, min(2025, yr))
    yy = yr - 2000  # e.g. 21 for 2021

    while True:
        suffix = rng.randint(10000, 99999)
        new_id = f"1{yy:02d}{suffix}"
        if new_id not in used_ids:
            used_ids.add(new_id)
            break

    db.users.update_one({'_id': s['_id']}, {'$set': {'id_number': new_id}})
    updated_ids += 1

print(f"✅  {updated_ids} student IDs patched to DLSU format (1YY##### )")


# ── Option pools for intake_interview_form ────────────────────────────────────

REFERRAL_SOURCES = [
    'Self – client initiated the counseling request independently',
    'Faculty / Staff – referred by teaching or non-teaching personnel',
    'Parent / Guardian – referral made by family member or guardian',
    'Peer / Friend – encouraged by classmate or colleague',
    'Academic Department / Program Chair – referral through college office or adviser',
    'DLSU Office / Support Unit (e.g., SDFO, OUR, OAS, HSO)',
]

CLINICAL_DX = [
    'No clinical diagnosis indicated / mentioned',
    'Clinically diagnosed (as informed by the client)',
    'Not disclosed / Unknown',
    'Clinically diagnosed (based on provided documentation or prior records)',
]

GENERAL_APPEARANCE = [
    'Appropriate and well-groomed – neat, tidy, and consistent with the setting',
    'Neat / Casual – relaxed but presentable',
    'Fatigued or tired-looking – appears low in energy or sleep-deprived',
    'Tearful / emotional – shows visible sadness or crying during the session',
    'Disheveled / unkempt – clothing or hygiene suggests stress or neglect',
]

COMMUNICATION_STYLE = [
    'Clear and coherent – expresses ideas logically and understandably',
    'Soft-spoken / hesitant – quiet voice, pauses often, or unsure when speaking',
    'Logical and goal-directed – stays on topic, communicates purposefully',
    'Rapid / pressured – talks quickly, difficult to interrupt, possibly anxious',
    'Circumstantial / tangential – gives excessive details or goes off topic',
]

GENERAL_DISPOSITION = [
    'Calm and cooperative – open, responsive, and comfortable engaging',
    'Anxious or tense – restless, nervous, or visibly uneasy',
    'Sad or withdrawn – quiet, minimal expression, or emotionally distant',
    'Motivated and engaged – participative, eager to reflect and improve',
    'Guarded or defensive – cautious, reluctant to share',
    'Distracted or preoccupied – unfocused, thinking of something else',
    'Angry or irritable – defensive tone or easily frustrated',
]

PRESENTING_PROBLEMS = [
    'Anxiety or fear – excessive worry, tension, or panic episodes',
    'Depression or sadness – low mood, hopelessness, or loss of interest',
    'Stress or burnout – feeling overwhelmed by academics or work',
    'Relationship or family conflict – difficulties in communication or boundaries',
    'Adjustment or transition issue – struggling to cope with life or school changes',
    'Grief or loss – emotional pain following death, separation, or significant loss',
    'Trauma-related distress – distress linked to a past adverse event',
    'Identity or self-concept concern – confusion about personal values, gender, or direction',
    'Motivation or focus difficulty – trouble concentrating or completing tasks',
    'Health-related stress – emotional impact of physical conditions or fatigue',
]

PSYCHOSOCIAL_HISTORY = [
    'Significant past experiences – history of trauma, loss, illness, or major life transitions',
    'Family background – quality of family relationships, support, or sources of conflict',
    'Coping styles and strategies – ways the client typically manages stress',
    'Academic or work functioning – level of motivation, performance, or adjustment',
    'Peer and social relationships – quality of friendships or social supports',
    'Health and lifestyle – physical well-being, sleep, exercise, nutrition, or medical conditions',
    'Previous counseling or therapy – prior experience with mental health services',
    'Faith or spirituality – beliefs or practices that influence coping and meaning-making',
]

INTERACTION_RELATIONSHIP = [
    'Engaged and cooperative – open, responsive, and actively participated',
    'Warm and receptive – friendly and comfortable engaging in dialogue',
    'Guarded or hesitant – cautious, reserved, or limited in responses',
    'Calm and composed – steady demeanor and appropriate behavior',
    'Withdrawn or avoidant – quiet, minimal eye contact, or reluctant to engage',
    'Motivated and hopeful – shows readiness and willingness to improve',
    'Irritable or defensive – easily frustrated or resistant to feedback',
]

AFFECT_EXPRESSION = [
    'Appropriate to content – emotion matches the topic being discussed',
    'Anxious / tense – fidgety, restless, or visibly nervous',
    'Depressed / sad – flat affect, tearful, or downcast tone',
    'Euthymic / stable – balanced, calm, and consistent emotional tone',
    'Flat / restricted – limited range of emotion or monotone tone',
    'Labile / fluctuating – sudden shifts in mood or expression',
    'Irritable / frustrated – easily annoyed or impatient',
]

MALADAPTIVE_PATTERNS = [
    'Avoidance behaviors – Tendency to avoid situations, tasks, or conversations that cause discomfort',
    'Negative self-talk or self-criticism – Persistent self-blame, harsh internal dialogue, or low self-worth',
    'Excessive worry or rumination – Repetitive overthinking, difficulty letting go',
    'Perfectionism or fear of failure – Unrealistic standards, strong fear of making mistakes',
    'Emotional suppression – Difficulty expressing or acknowledging emotions',
    'Academic/work-related maladaptive patterns – Procrastination, disengagement, or chronic burnout',
    'Interpersonal difficulties – Recurrent conflicts, withdrawal, or difficulty setting boundaries',
    'Maladaptive coping strategies – Coping styles that provide short-term relief but increase distress',
    'Trauma-related responses – Hypervigilance, emotional numbing, or heightened reactivity',
]

PREDISPOSING = [
    'Personality traits (e.g., perfectionism, dependency, impulsivity)',
    'Early childhood adversity or trauma',
    'Family history of mental health or relational problems',
    'Limited early emotional support or attachment disruption',
    'Cultural, gender, or identity-related stress exposure',
    'Chronic medical condition or neurobiological vulnerability',
]

PRECIPITATING = [
    'Academic or work stress / overload',
    'Relationship conflict or breakup',
    'Recent loss or separation',
    'Transition or adjustment (e.g., relocation, new role, course changes)',
    'Traumatic or critical incident',
    'Health-related event or diagnosis',
]

PERPETUATING = [
    'Negative thinking patterns or self-criticism',
    'Ongoing stressors (family, financial, workload)',
    'Maladaptive coping (avoidance, withdrawal, substance use)',
    'Poor self-care or sleep habits',
    'Lack of insight or resistance to change',
    'Environmental barriers (limited support, unsafe environment)',
]

PROTECTIVE = [
    'Motivation to improve / willingness to seek help',
    'Supportive relationships or social network',
    'Academic or work engagement',
    'Effective coping or problem-solving skills',
    'Faith or spirituality',
    'Access to mental health and community resources',
    'Stable housing or financial situation',
]

RECOMMENDATIONS = [
    'Continue Counseling / Psychotherapy – client to engage in ongoing sessions with same counselor/psychologist or team',
    'Follow-up Session Scheduled – next session date or frequency confirmed',
    'Referral to CPS Psychologist (Testing / Assessment) – for further diagnostic or psychological evaluation',
    'Referral to CPS Psychologist for Psychotherapy – referred for specialized, in-depth therapy within CPS',
    'Crisis Intervention / Safety Plan Initiated – immediate response to safety or suicide risk concerns',
    'Referral to Psychiatrist / Physician – for medication evaluation or medical management',
]

BRIEF_REMARKS = [
    "Client presented with visible emotional distress but remained engaged throughout the session. Rapport was established with moderate ease.",
    "Client was cooperative and articulate. Disclosed concerns with some hesitation but opened up as the session progressed.",
    "Client appeared fatigued and emotionally drained. Despite this, they were able to communicate their concerns clearly.",
    "Client maintained good eye contact and was forthcoming with information. No signs of acute distress observed.",
    "Client showed signs of anxiety during initial contact but settled as the session progressed. Communication was coherent throughout.",
    "Client appeared composed but made minimal eye contact. Engagement improved after initial rapport-building.",
    "Client was tearful at times but remained composed enough to complete the intake. Expressed relief at being heard.",
    "Client presented calmly but affect was somewhat restricted. Responses were thoughtful and relevant.",
]

PSYCH_REMARKS = [
    "Client reports strong family support but limited peer connections. Previous counseling experience at secondary school level.",
    "Client comes from a high-achieving family background with significant academic pressure reported since early schooling.",
    "Client has no prior mental health history. Current stressors are primarily academic-related with some family tension.",
    "Client disclosed a history of anxiety managed informally. No prior psychiatric treatment. Good social support noted.",
    "Client reports deteriorating sleep and appetite over the past three weeks correlated with academic deadlines.",
    "Client has prior counseling experience and found it beneficial. Motivated to continue therapeutic work.",
    "Client disclosed significant family conflict affecting concentration and motivation. Limited peer support reported.",
    "Client reports chronic stress from financial strain alongside academic load. Coping strategies are largely avoidant.",
]

INTERACTION_REMARKS = [
    "Client maintained consistent engagement. Emotional responses were proportionate and appropriate to content discussed.",
    "Client demonstrated capacity for insight and self-reflection. Therapeutic alliance was easily established.",
    "Client was initially guarded but warmed up after rapport was built. Affect consistent with reported concerns.",
    "Client showed minimal affect during neutral topics but became visibly emotional when discussing family matters.",
    "Client's affect was congruent throughout. Humor was used adaptively at times. Overall positive therapeutic stance.",
    "None – checklist adequately captures the client's presentation during the intake session.",
]

COUNSELING_GOALS = [
    "Client will reduce anxiety-related distress and develop at least two effective coping strategies within 6 weeks of counseling.",
    "Client will identify and challenge negative self-talk patterns and report improved self-esteem within 8 sessions.",
    "Client will develop a structured study routine and reduce academic procrastination behaviors within 4 weeks.",
    "Client will process grief-related emotions and establish healthy coping strategies within 10 sessions.",
    "Client will improve interpersonal communication and reduce conflict with family members within 8 weeks.",
    "Client will develop crisis management skills and maintain a safety plan with weekly check-ins for 6 weeks.",
    "Client will improve sleep hygiene, reduce rumination, and establish a consistent self-care routine within 6 sessions.",
    "Client will explore identity-related concerns and develop a clearer sense of direction within 10 weeks of counseling.",
]


def pick(lst, k=1, required=1):
    """Pick k items but at least required."""
    k = max(required, rng.randint(1, k))
    return rng.sample(lst, min(k, len(lst)))


def phq9_for_risk(risk):
    """Generate realistic PHQ-9 responses matching risk level."""
    if risk in ('RED', 'CRITICAL'):
        base = [2, 2, 2, 2, 1, 2, 2, 3, 1]
        return [max(0, min(3, v + rng.randint(-1, 1))) for v in base]
    elif risk == 'YELLOW':
        base = [1, 1, 1, 1, 1, 1, 0, 1, 0]
        return [max(0, min(3, v + rng.randint(-1, 1))) for v in base]
    else:
        base = [0, 1, 0, 0, 1, 0, 0, 0, 0]
        return [max(0, min(3, v + rng.randint(0, 1))) for v in base]


def gad7_for_risk(risk):
    """Generate realistic GAD-7 responses matching risk level."""
    if risk in ('RED', 'CRITICAL'):
        base = [2, 2, 2, 2, 2, 2, 2]
        return [max(0, min(3, v + rng.randint(-1, 1))) for v in base]
    elif risk == 'YELLOW':
        base = [1, 1, 1, 1, 1, 0, 1]
        return [max(0, min(3, v + rng.randint(-1, 1))) for v in base]
    else:
        base = [0, 1, 0, 1, 0, 0, 0]
        return [max(0, min(3, v + rng.randint(0, 1))) for v in base]


def build_intake_form(case, ic_name, conducted_at):
    risk = case.get('risk_level', 'GREEN')
    phq9 = phq9_for_risk(risk)
    gad7 = gad7_for_risk(risk)

    # High-risk cases: more presenting problems, heavier language
    if risk in ('RED', 'CRITICAL'):
        problems = pick(PRESENTING_PROBLEMS, k=3, required=2)
        disposition = pick(['Sad or withdrawn – quiet, minimal expression, or emotionally distant',
                            'Anxious or tense – restless, nervous, or visibly uneasy',
                            'Guarded or defensive – cautious, reluctant to share'], k=2, required=1)
        affect = pick(['Depressed / sad – flat affect, tearful, or downcast tone',
                       'Anxious / tense – fidgety, restless, or visibly nervous',
                       'Flat / restricted – limited range of emotion or monotone tone'], k=2, required=1)
        interaction = pick(['Guarded or hesitant – cautious, reserved, or limited in responses',
                            'Withdrawn or avoidant – quiet, minimal eye contact, or reluctant to engage'], k=1)
        maladaptive = pick(MALADAPTIVE_PATTERNS, k=4, required=3)
        rec = pick(['Continue Counseling / Psychotherapy – client to engage in ongoing sessions with same counselor/psychologist or team',
                    'Crisis Intervention / Safety Plan Initiated – immediate response to safety or safety risk concerns',
                    'Referral to CPS Psychologist for Psychotherapy – referred for specialized, in-depth therapy within CPS'], k=2, required=1)
    elif risk == 'YELLOW':
        problems = pick(PRESENTING_PROBLEMS, k=2, required=1)
        disposition = pick(GENERAL_DISPOSITION, k=2, required=1)
        affect = pick(AFFECT_EXPRESSION, k=2, required=1)
        interaction = pick(INTERACTION_RELATIONSHIP, k=2, required=1)
        maladaptive = pick(MALADAPTIVE_PATTERNS, k=3, required=2)
        rec = pick(['Continue Counseling / Psychotherapy – client to engage in ongoing sessions with same counselor/psychologist or team',
                    'Follow-up Session Scheduled – next session date or frequency confirmed',
                    'Referral to CPS Psychologist (Testing / Assessment) – for further diagnostic or psychological evaluation'], k=2, required=1)
    else:
        problems = pick(PRESENTING_PROBLEMS, k=2, required=1)
        disposition = pick(['Calm and cooperative – open, responsive, and comfortable engaging',
                            'Motivated and engaged – participative, eager to reflect and improve'], k=1)
        affect = pick(['Appropriate to content – emotion matches the topic being discussed',
                       'Euthymic / stable – balanced, calm, and consistent emotional tone'], k=1)
        interaction = pick(['Engaged and cooperative – open, responsive, and actively participated',
                            'Warm and receptive – friendly and comfortable engaging in dialogue',
                            'Motivated and hopeful – shows readiness and willingness to improve'], k=2, required=1)
        maladaptive = pick(MALADAPTIVE_PATTERNS[:6], k=2, required=1)
        rec = ['Continue Counseling / Psychotherapy – client to engage in ongoing sessions with same counselor/psychologist or team',
               'Follow-up Session Scheduled – next session date or frequency confirmed']

    return {
        # Step 0 – Session Info
        'type_of_service': 'Intake Interview',
        'referral_source': pick(REFERRAL_SOURCES, k=2, required=1),
        'session_date': conducted_at.strftime('%B %-d, %Y'),
        'session_time': conducted_at.strftime('%-I:%M %p'),
        'session_mode': rng.choice(['F2F', 'F2F', 'Online']),

        # Step 1 – Clinical Diagnosis
        'clinical_diagnosis': rng.choice(CLINICAL_DX),

        # Step 2 – Psychometric
        'phq9_responses': phq9,
        'phq9_score': sum(phq9),
        'gad7_responses': gad7,
        'gad7_score': sum(gad7),

        # Step 3 – Brief Description
        'general_appearance': pick(GENERAL_APPEARANCE, k=2, required=1),
        'communication_style': pick(COMMUNICATION_STYLE, k=2, required=1),
        'general_disposition': disposition,
        'brief_description_remarks': rng.choice(BRIEF_REMARKS),

        # Step 4 – Presenting Problem
        'presenting_problem': problems,
        'presenting_problem_remarks': rng.choice([
            "Client described the concern as persistent over the past several weeks with increasing impact on daily functioning.",
            "The presenting issue appears to be situationally triggered and has escalated recently.",
            "Client expressed difficulty managing the concern independently and sought professional support.",
            "The concern has been present for approximately one semester and is interfering with academic performance.",
            "Client reports the issue worsened following a significant life event in the past month.",
        ]),

        # Step 5 – Psychosocial History
        'psychosocial_history': pick(PSYCHOSOCIAL_HISTORY, k=3, required=2),
        'psychosocial_remarks': rng.choice(PSYCH_REMARKS),

        # Step 6 – Interaction & Affect
        'interaction_relationship': interaction,
        'affect_expression': affect,
        'interaction_remarks': rng.choice(INTERACTION_REMARKS),

        # Step 7 – Maladaptive Patterns
        'maladaptive_patterns': maladaptive,

        # Step 8 – Counseling Goal
        'counseling_goal': rng.choice(COUNSELING_GOALS),

        # Step 9 – Recommendation (4P's + recommendation)
        'predisposing_factors': pick(PREDISPOSING, k=3, required=1),
        'precipitating_factors': pick(PRECIPITATING, k=2, required=1),
        'perpetuating_factors': pick(PERPETUATING, k=2, required=1),
        'protective_factors': pick(PROTECTIVE, k=3, required=2),
        'recommendation': rec,

        # Step 10 – Signature
        'ic_name': ic_name,
        'ic_signature_date': conducted_at.strftime('%Y-%m-%d'),
    }


# ── 2. Seed intake_interview_form on cases ────────────────────────────────────
print()
print("=" * 60)
print("STEP 2 — Seed intake_interview_form on cases")
print("=" * 60)

# Target: ACTIVE and CLOSED cases that don't already have a form
cases = list(db.cases.find(
    {
        'status': {'$in': ['ACTIVE', 'CLOSED', 'TERMINATED']},
        'intake_interview_form': {'$exists': False},
    },
    {'_id': 1, 'risk_level': 1, 'created_at': 1, 'counseling_id': 1}
))

print(f"Found {len(cases)} cases without intake_interview_form")

# Always fill ~80% of ACTIVE/CLOSED, leave ~20% incomplete for realism
filled = 0
skipped = 0

for c in cases:
    # ~20% chance to leave incomplete (simulate pending IC doc)
    if rng.random() < 0.20:
        skipped += 1
        continue

    created = c.get('created_at', datetime.utcnow() - timedelta(days=rng.randint(30, 300)))
    # Form filled 1-3 days after case created
    conducted_at = created + timedelta(days=rng.randint(1, 3), hours=rng.randint(8, 16))
    if conducted_at > datetime.utcnow():
        conducted_at = datetime.utcnow() - timedelta(hours=rng.randint(1, 12))

    ic_name = rng.choice(ic_names)
    form = build_intake_form(c, ic_name, conducted_at)

    db.cases.update_one(
        {'_id': c['_id']},
        {'$set': {
            'intake_interview_form': form,
            'intake_form_updated_at': conducted_at,
        }}
    )
    filled += 1

print(f"✅  {filled} cases seeded with complete intake_interview_form")
print(f"⏭   {skipped} cases left without form (realistic incomplete ~20%)")

# ── Summary ───────────────────────────────────────────────────────────────────
print()
print("=" * 60)
total_with_form = db.cases.count_documents({'intake_interview_form': {'$exists': True}})
print(f"✅  DONE  — {total_with_form} cases now have intake_interview_form")
print("=" * 60)
