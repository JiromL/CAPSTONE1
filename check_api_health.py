#!/usr/bin/env python3
"""
Comprehensive API endpoint test to identify failures
"""
import subprocess
import json

# Get token first
print("🔐 Getting authentication token...")
login_response = subprocess.run([
    'curl', '-s', '-X', 'POST', 
    'http://localhost:5001/api/auth/login',
    '-H', 'Content-Type: application/json',
    '-d', '{"email":"student1@dlsu.edu.ph","password":"student123"}'
], capture_output=True, text=True)

try:
    login_data = json.loads(login_response.stdout)
    token = login_data.get('access_token')
    if not token:
        print("✗ Failed to get token")
        exit(1)
    print(f"✓ Token obtained\n")
except:
    print("✗ Failed to parse login response")
    exit(1)

# Test endpoints
endpoints = [
    ("Appointments - All", "/api/appointments", "GET"),
    ("Appointments - My Appointments", "/api/appointments/my-appointments", "GET"),
    ("Appointments - Active", "/api/appointments/active", "GET"),
    ("Cases - My Current", "/api/cases/my-current", "GET"),
    ("Cases - My Cases", "/api/cases/my-cases", "GET"),
    ("Intakes - My Intake", "/api/intake/my-intake", "GET"),
    ("Resources - Student", "/api/resources/student", "GET"),
    ("Resources - All", "/api/resources", "GET"),
    ("Check-ins - My Check-ins", "/api/check-ins/student/my-checkins", "GET"),
    ("Engagement - Feedback", "/api/engagement/feedback?type=all&limit=50", "GET"),
    ("Availability - My Availability", "/api/availability/my-availability", "GET"),
    ("Dashboard", "/api/dashboard", "GET"),
]

print("📊 ENDPOINT TEST RESULTS")
print("=" * 70)
print(f"{'Endpoint':<40} {'Status':>10} {'Result':>15}")
print("=" * 70)

headers = ['-H', f'Authorization: Bearer {token}']

for name, endpoint, method in endpoints:
    cmd = ['curl', '-s', '-w', '%{http_code}', '-X', method, f'http://localhost:5001{endpoint}'] + headers
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    output = result.stdout
    
    # Last 3 chars are HTTP status code
    status_code = output[-3:] if len(output) >= 3 else "???"
    response_body = output[:-3] if len(output) >= 3 else output
    
    # Determine status symbol
    if status_code == "200":
        symbol = "✓"
        status_text = "OK"
        try:
            data = json.loads(response_body)
            # Check if has actual data
            if isinstance(data, dict):
                if any(k in data for k in ["items", "data", "appointments", "cases", "feedback", "success"]):
                    result_text = "Has data"
                elif len(data) == 0 or data.get("appointments") == [] or data.get("cases") == []:
                    result_text = "EMPTY"
                else:
                    result_text = "OK"
            else:
                result_text = "OK"
        except:
            result_text = "OK"
    elif status_code == "404":
        symbol = "✗"
        status_text = "NOT FOUND"
        result_text = ""
    elif status_code == "403":
        symbol = "⚠"
        status_text = "FORBIDDEN"
        result_text = "No Permission"
    elif status_code == "400":
        symbol = "⚠"
        status_text = "BAD REQUEST"
        result_text = "Invalid params"
    elif status_code == "422":
        symbol = "⚠"
        status_text = "UNPROCESSABLE"
        result_text = "Invalid data"
    elif status_code == "401":
        symbol = "✗"
        status_text = "UNAUTHORIZED"
        result_text = "Auth failed"
    elif status_code == "500":
        symbol = "✗"
        status_text = "SERVER ERROR"
        result_text = ""
    else:
        symbol = "?"
        status_text = status_code
        result_text = ""
    
    print(f"{symbol} {name:<37} {status_text:>10} {result_text:>15}")

print("=" * 70)
print("\n✓ = Working (200 OK)")
print("⚠ = Client/Validation Error (4xx)")
print("✗ = Server Error or Not Found (404/5xx)")
