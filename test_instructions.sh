#!/bin/bash
#
# Quick test of the intake flow
#

echo "🧪 Testing Intake Flow with Meeting Links"
echo "=========================================="
echo ""
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo ""
echo "Steps:"
echo "1. Go to http://localhost:3000/intake"
echo "2. Login with: student1@university.edu / test123"
echo "3. Select 'Personal' concern"
echo "4. Choose to take some assessments"
echo "5. Set preferred method to 'Zoom'"
echo "6. Complete the form"
echo "7. WATCH FOR MEETING LINKS ON THE COMPLETION PAGE"
echo ""
echo "API Test Response (from backend test):"
echo ""

cd /Users/jeromelouiesantos/CAPSTONE1 && python3 test_appointment_flow.py 2>&1 | grep -A 15 "Platform:"

echo ""
echo "If the backend shows meeting links but they don't appear in the frontend,"
echo "it's likely a display/state issue. Check:"
echo "- Browser DevTools → Console for errors"
echo "- appointmentData state contents"
echo "- Whether the Zoom condition is matching"
