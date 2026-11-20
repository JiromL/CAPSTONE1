"""
Caseload helpers for routing intakes to a counselor/psychologist.

Two simple signals on top of the plain workload count:
  * how many open RED/CRITICAL cases each person already carries
  * whether their Staff Settings specialty areas cover the student's concern
"""

HIGH_RISK_LEVELS = ('RED', 'CRITICAL')
HIGH_RISK_WARNING_THRESHOLD = 3   # warn the IC at this many open high-risk cases
CLOSED_CASE_STATUSES = ['CLOSED', 'ARCHIVED']

# Intake concern / ICF "service requested" -> Staff Settings specialty areas that cover it.
_PERSONAL = ['Stress and Anxiety', 'Depression and Mood', 'Identity and Self-Worth', 'Life Transitions']
_ACADEMIC = ['Academic Performance', 'Study Skills', 'Attention Concerns']
_CAREER = ['Career Counseling']
_RELATIONSHIP = ['Relationship Issues']
_CRISIS = ['Trauma and PTSD', 'Grief and Loss', 'Depression and Mood', 'Stress and Anxiety']

CONCERN_TO_SPECIALTIES = {
    # intake.concern values
    'personal': _PERSONAL,
    'academic': _ACADEMIC,
    'career': _CAREER,
    'social': _RELATIONSHIP,
    'family': _RELATIONSHIP,
    # ICF service_requested values
    'personal_counseling': _PERSONAL,
    'academic_concerns': _ACADEMIC,
    'career_guidance': _CAREER,
    'family_concerns': _RELATIONSHIP,
    'relationship_concerns': _RELATIONSHIP,
    'crisis_support': _CRISIS,
    'psychiatric_evaluation': ['Depression and Mood', 'Stress and Anxiety'],
}


# Free-text concerns ("Academic stress, anxiety") are matched by keyword.
KEYWORD_TO_SPECIALTY = [
    (('anxiety', 'anxious', 'stress', 'panic', 'worry'), 'Stress and Anxiety'),
    (('depress', 'mood', 'sad', 'hopeless'), 'Depression and Mood'),
    (('academic', 'grade', 'exam', 'school', 'class'), 'Academic Performance'),
    (('study', 'studying', 'procrastinat'), 'Study Skills'),
    (('career', 'job', 'internship'), 'Career Counseling'),
    (('relationship', 'family', 'friend', 'social', 'peer', 'partner'), 'Relationship Issues'),
    (('grief', 'loss', 'death', 'bereave'), 'Grief and Loss'),
    (('trauma', 'abuse', 'ptsd', 'assault'), 'Trauma and PTSD'),
    (('identity', 'self-worth', 'self worth', 'self-esteem', 'self esteem'), 'Identity and Self-Worth'),
    (('transition', 'adjust', 'homesick'), 'Life Transitions'),
    (('substance', 'alcohol', 'drug', 'vape', 'smok'), 'Substance Use'),
    (('eating', 'body image', 'weight'), 'Eating/Body Image'),
    (('sleep', 'insomnia'), 'Sleep Issues'),
    (('attention', 'adhd', 'focus', 'concentrat'), 'Attention Concerns'),
]


def specialties_for(*concerns):
    """
    Specialty areas relevant to the given concerns (order kept, no duplicates).
    Each concern is either a known key (intake concern / ICF service requested) or free text.
    """
    wanted = []

    def add(area):
        if area not in wanted:
            wanted.append(area)

    for c in concerns:
        text = (c or '').strip().lower()
        if not text:
            continue
        if text in CONCERN_TO_SPECIALTIES:
            for area in CONCERN_TO_SPECIALTIES[text]:
                add(area)
            continue
        for words, area in KEYWORD_TO_SPECIALTY:
            if any(w in text for w in words):
                add(area)
    return wanted


def matched_specialties(counselor_areas, wanted):
    """The counselor's specialty areas that cover the student's concern."""
    have = {a.lower() for a in (counselor_areas or [])}
    return [a for a in wanted if a.lower() in have]


def pick_recommended(rows, risk_level):
    """
    rows: dicts with _score, last_name, high_risk_cases, matched_specialties.
    Order: specialist first; for RED/CRITICAL intakes, fewer high-risk cases next;
    then lowest workload score; then name.
    """
    if not rows:
        return None
    urgent = (risk_level or '').upper() in HIGH_RISK_LEVELS

    def key(r):
        return (
            0 if r.get('matched_specialties') else 1,
            r.get('high_risk_cases', 0) if urgent else 0,
            r.get('_score', 0),
            r.get('last_name', ''),
        )
    return min(rows, key=key)['counselor_id']
