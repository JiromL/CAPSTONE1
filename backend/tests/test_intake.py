#!/usr/bin/env python3
from app import app
from flask_jwt_extended import create_access_token
from bson import ObjectId

# Create a test token for student1
with app.app_context():
    student_id = ObjectId()  # Dummy ID
    token = create_access_token(identity=str(student_id))
    print(f"Token: {token}")
    
    # Test the intake/submit route
    with app.test_client() as client:
        response = client.post(
            '/api/intake/submit',
            json={
                'email': 'test@test.edu',
                'presenting_concerns': 'test',
                'phq9_responses': [0]*9,
                'gad7_responses': [0]*7,
            },
            headers={'Authorization': f'Bearer {token}'}
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.get_json()}")
