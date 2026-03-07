#!/usr/bin/env python3
"""
Test script to verify assessment mapping and validation logic
Tests concern-to-assessment mapping without running the full backend
"""

# Simulate the backend logic
def get_allowed_assessments_for_concern(concern: str) -> list:
    """Test version of the backend function"""
    concern_mapping = {
        'personal': ['phq9', 'gad7', 'pss'],
        'academic': ['acad', 'phq9', 'gad7'],
        'career': ['career', 'phq9'],
        'social': ['social', 'gad7'],
        'other': ['phq9', 'gad7', 'pss', 'acad', 'career', 'social']
    }
    return concern_mapping.get(concern, ['phq9', 'gad7', 'pss'])


# Test cases
test_cases = [
    {
        'concern': 'personal',
        'submitted': ['phq9', 'gad7', 'pss'],
        'should_pass': True,
        'description': 'Personal concern with all mental health assessments'
    },
    {
        'concern': 'academic',
        'submitted': ['acad', 'phq9'],
        'should_pass': True,
        'description': 'Academic concern with academic + mental health'
    },
    {
        'concern': 'academic',
        'submitted': ['pss'],  # PSS is not allowed for academic
        'should_pass': False,
        'description': 'Academic concern attempting stress assessment (not allowed)'
    },
    {
        'concern': 'career',
        'submitted': ['career'],
        'should_pass': True,
        'description': 'Career concern with career assessment'
    },
    {
        'concern': 'career',
        'submitted': ['career', 'gad7'],  # GAD-7 not allowed for career
        'should_pass': False,
        'description': 'Career concern attempting anxiety (not allowed)'
    },
    {
        'concern': 'social',
        'submitted': ['social', 'gad7'],
        'should_pass': True,
        'description': 'Social concern with social + anxiety'
    },
    {
        'concern': 'other',
        'submitted': ['phq9', 'gad7', 'pss', 'acad', 'career', 'social'],
        'should_pass': True,
        'description': 'Other concern with all assessments'
    }
]

# Run tests
print("=" * 80)
print("ASSESSMENT MAPPING VALIDATION TEST")
print("=" * 80)

passed = 0
failed = 0

for i, test in enumerate(test_cases, 1):
    concern = test['concern']
    submitted = test['submitted']
    allowed = get_allowed_assessments_for_concern(concern)
    
    # Validate
    is_valid = all(assessment in allowed for assessment in submitted)
    
    passed_test = is_valid == test['should_pass']
    status = "✓ PASS" if passed_test else "✗ FAIL"
    
    if passed_test:
        passed += 1
    else:
        failed += 1
    
    print(f"\nTest {i}: {status}")
    print(f"  Description: {test['description']}")
    print(f"  Concern:     {concern}")
    print(f"  Allowed:     {allowed}")
    print(f"  Submitted:   {submitted}")
    print(f"  Validation:  {'✓ VALID' if is_valid else '✗ INVALID'} (expected: {'VALID' if test['should_pass'] else 'INVALID'})")

print("\n" + "=" * 80)
print(f"RESULTS: {passed} passed, {failed} failed")
print("=" * 80)

if failed == 0:
    print("\n✓ All tests passed! Assessment mapping is working correctly.")
    exit(0)
else:
    print(f"\n✗ {failed} test(s) failed!")
    exit(1)
