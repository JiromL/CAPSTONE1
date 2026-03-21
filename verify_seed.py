from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017/')
db = client.cps_system_dev

print("📊 DATA VERIFICATION")
print("=" * 60)

# Get user IDs
admin = db.users.find_one({'email': 'admin@dlsu.edu.ph'})
student1 = db.users.find_one({'email': 'student1@dlsu.edu.ph'})
counselor1 = db.users.find_one({'email': 'counselor1@dlsu.edu.ph'})

print(f"\nUser IDs:")
print(f"  Admin: {admin['_id']}")
print(f"  Student1: {student1['_id']}")
print(f"  Counselor1: {counselor1['_id']}")

# Check an appointment
appt = db.appointments.find_one()
print(f"\nSample Appointment:")
print(f"  ID: {appt['_id']}")
print(f"  Student ID: {appt.get('student_id')}")
print(f"  Counselor ID: {appt.get('counselor_id')}")
print(f"  Status: {appt.get('status')}")
print(f"  Type: {appt.get('appointment_type')}")

# Check if student1 has any appointments
student1_appts = db.appointments.count_documents({'student_id': student1['_id']})
print(f"\nStudent1 Appointments: {student1_appts}")

# List all appointments
print(f"\nAll Appointments in Database:")
for appt in db.appointments.find():
    print(f"  - {appt['appointment_type']} ({appt['status']}) - Student: {str(appt.get('student_id'))[:20]}...")

print("\n" + "=" * 60)
print("✅ Database contains seed data - ready for testing!")
