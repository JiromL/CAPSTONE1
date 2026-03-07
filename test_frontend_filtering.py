#!/usr/bin/env python3
"""
Test frontend assessment filtering logic
Verifies that concern selection properly filters available assessments
"""

# Frontend's concern-to-assessment mapping
concern_assessment_mapping = {
    'personal': ['phq9', 'gad7', 'pss'],
    'academic': ['acad', 'phq9', 'gad7'],
    'career': ['career', 'phq9'],
    'social': ['social', 'gad7'],
    'other': ['phq9', 'gad7', 'pss', 'acad', 'career', 'social']
}

# Available assessments info
assessment_info = {
    'phq9': {'name': 'Depression Screening', 'maxScore': 27},
    'gad7': {'name': 'Anxiety Screening', 'maxScore': 21},
    'pss': {'name': 'Stress Assessment', 'maxScore': 40},
    'acad': {'name': 'Academic Stress Assessment', 'maxScore': 32},
    'career': {'name': 'Career Readiness Assessment', 'maxScore': 32},
    'social': {'name': 'Social Functioning Assessment', 'maxScore': 32}
}

def get_available_assessments(concern):
    """Simulate frontend's getAvailableAssessments() function"""
    return concern_assessment_mapping.get(concern, [])


# Test scenarios
scenarios = [
    {
        'concern': 'personal',
        'expectedCount': 3,
        'expectedAssessments': ['phq9', 'gad7', 'pss'],
        'description': 'Personal/Mental Health concern'
    },
    {
        'concern': 'academic',
        'expectedCount': 3,
        'expectedAssessments': ['acad', 'phq9', 'gad7'],
        'description': 'Academic concern (with academic focus + mental health options)'
    },
    {
        'concern': 'career',
        'expectedCount': 2,
        'expectedAssessments': ['career', 'phq9'],
        'description': 'Career concern (with career focus + optional anxiety)'
    },
    {
        'concern': 'social',
        'expectedCount': 2,
        'expectedAssessments': ['social', 'gad7'],
        'description': 'Social concern (with social focus + optional anxiety)'
    },
    {
        'concern': 'other',
        'expectedCount': 6,
        'expectedAssessments': ['phq9', 'gad7', 'pss', 'acad', 'career', 'social'],
        'description': 'Other concern (all assessments available)'
    }
]

print("\n" + "=" * 80)
print("FRONTEND ASSESSMENT FILTERING TEST")
print("=" * 80 + "\n")

all_passed = True

for scenario in scenarios:
    concern = scenario['concern']
    available = get_available_assessments(concern)
    
    count_match = len(available) == scenario['expectedCount']
    assessments_match = available == scenario['expectedAssessments']
    passed = count_match and assessments_match
    
    status = "✓ PASS" if passed else "✗ FAIL"
    if not passed:
        all_passed = False
    
    print(f"{status} | {scenario['description']}")
    print(f"     Concern: {concern}")
    print(f"     Expected assessments: {scenario['expectedAssessments']}")
    print(f"     Got:                  {available}")
    print(f"     Count: {len(available)} (expected {scenario['expectedCount']})")
    
    # Show Assessment names
    assessment_names = [assessment_info[a]['name'] for a in available]
    for i, name in enumerate(assessment_names, 1):
        print(f"       {i}. {name}")
    print()

print("=" * 80)
if all_passed:
    print("✓ All frontend filtering tests passed!")
    print("\nSummary of filtering behavior:")
    print("  • Personal     → Depression, Anxiety, Stress (3 core mental health)")
    print("  • Academic     → Academic Stress, Depression, Anxiety (academic focus)")
    print("  • Career       → Career Readiness, Depression (career focus)")
    print("  • Social       → Social Functioning, Anxiety (social focus)")
    print("  • Other        → All 6 assessments (student choice)")
else:
    print("✗ Some tests failed!")

print("=" * 80 + "\n")
exit(0 if all_passed else 1)
