import requests

# Get token as student
login_res = requests.post('http://localhost:8000/api/auth/login', json={
    'email': 'student1@dlsu.edu.ph',
    'password': 'password123'
})

if login_res.status_code == 200:
    data = login_res.json()
    token = data.get('access_token') or data.get('token')
    print(f"OK Login successful")
    print(f"  Token: {token[:30]}...")
    print(f"  User: {data.get('email')}")
    print(f"  Role: {data.get('role')}")
    
    # Test endpoints
    endpoints = [
        ('GET', '/api/check-ins/student/pending-checkins'),
        ('GET', '/api/check-ins/student/my-checkins'),
    ]
    
    print(f"\nTesting endpoints:")
    for method, path in endpoints:
        res = requests.request(
            method, 
            f'http://localhost:8000{path}',
            headers={'Authorization': f'Bearer {token}'}
        )
        status = "OK" if res.status_code == 200 else "ERROR"
        print(f"  {status} {method} {path}: {res.status_code}")
        if res.status_code != 200:
            print(f"      Error: {res.text[:100]}")
else:
    print(f"ERROR Login failed: {login_res.status_code}")
    print(f"  {login_res.json()}")
