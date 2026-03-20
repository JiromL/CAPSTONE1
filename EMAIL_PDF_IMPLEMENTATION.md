# Email and PDF Appointment Confirmation Implementation

## Overview

This document describes the implementation of email notifications with PDF attachments for appointment confirmations in the CPS Reservation Management System.

## Architecture

### Components Added

#### 1. **Email Service Enhancement** (`backend/services/email_service.py`)

**New Addition**: `send_appointment_confirmation_email()` method

```python
def send_appointment_confirmation_email(self, recipient_email, student_name, appointment_details, pdf_file_path=None):
    """Send appointment confirmation email with optional PDF attachment"""
```

**Features**:
- Professional DOH-style HTML email template
- Green color scheme (#1B5E20) matching CPS branding
- Appointment details table with confirmation number
- Important notes section with 4 key requirements
- Optional PDF file attachment support
- Works in both dev mode (prints to console) and production mode (SMTP)

**Updated Method**: `_send_email()` now supports file attachments via `MIMEBase` and `encoders`

```python
def _send_email(self, recipient_email, subject, html_body, attachment_path=None):
    """Internal method to send email with optional file attachment"""
    # In dev mode: prints email and attachment path
    # In production: attaches file as binary and sends via SMTP
```

#### 2. **PDF Generation Service** (`backend/services/pdf_service.py`)

**Main Function**: `generate_appointment_confirmation_pdf()`

```python
def generate_appointment_confirmation_pdf(appointment_data, output_path=None):
    """Generate appointment confirmation PDF using reportlab"""
```

**PDF Content**:
- Header with "Appointment Confirmation" title
- Confirmation number box
- Student information section (name, ID, contact)
- Appointment details table (date, time, format, counselor)
- Important notes section with 4 requirements
- Professional footer with CPS info

**Requirements**:
- Uses `reportlab` library (added to requirements.txt)
- Generates professional PDF documents
- Supports both file output and binary stream output
- DOH-compliant styling with green color scheme

#### 3. **Appointments Blueprint Updates** (`backend/blueprints/appointments.py`)

**New Imports**:
```python
from services.pdf_service import generate_appointment_confirmation_pdf
from services.email_service import EmailService
import os
```

**Enhancement 1: Request Appointment Receipt** (`POST /api/appointments/request`)

When a student submits an appointment request:
1. Creates appointment in database
2. **NEW**: Generates request receipt email
3. Sends professional receipt to student
4. Includes request ID, date, purpose, and status

**Receipt Email Template**:
- Green header with "Appointment Request Received"
- Request details box
- Next steps information
- Professional footer

**Enhancement 2: Confirm Appointment with PDF** (`POST /api/appointments/<id>/confirm`)

When an appointment is confirmed:
1. Updates appointment status to CONFIRMED
2. **NEW**: Generates appointment confirmation PDF
3. **NEW**: Sends confirmation email with PDF attachment
4. Cleans up temporary PDF files
5. Syncs to Google Calendar (existing functionality)

**Workflow**:
```python
# 1. Load appointment and student data from database
student = db.db.users.find_one(...)
counselor = db.db.users.find_one(...)

# 2. Format appointment details for email/PDF
appointment_data = {
    'student_name': '...',
    'student_id': '...',
    'reference_id': str(appointment_id),
    'appointment_date': 'May 15, 2024',
    'appointment_time': '2:00 PM',
    # ... more fields
}

# 3. Generate PDF (in temp directory)
pdf_path = generate_appointment_confirmation_pdf(appointment_data, pdf_path)

# 4. Send email with PDF attachment
email_service.send_appointment_confirmation_email(
    recipient_email=student_email,
    student_name=student_name,
    appointment_details=appointment_data,
    pdf_file_path=pdf_path
)

# 5. Clean up temporary PDF
os.remove(pdf_path)
```

## Dependencies

### Added to `backend/requirements.txt`:
```
reportlab==4.0.9  # PDF generation
```

### Existing Dependencies (Already Required):
- Flask
- python-dotenv
- pymongo
- email.mime (built-in)

## Email Templates

### 1. Appointment Request Receipt

**Subject**: "Appointment Request Received"

**Content**:
- Welcome message
- Request acknowledgment
- Request ID, date, purpose, status
- Next steps information
- Support contact info

**Color Scheme**: Green header (#1B5E20)

### 2. Appointment Confirmation

**Subject**: "Your Appointment Confirmation - {CONFIRMATION_ID}"

**Content**:
- Confirmation notification
- Appointment details table:
  - Confirmation Number
  - Date and Time
  - Meeting Format (In-Person, Google Meet, Zoom)
  - Assigned Counselor
- Important Notes:
  - Arrive 10 minutes early
  - Ensure internet connection
  - 24-hour cancellation policy
  - Contact information
- **PDF Attachment**: Full confirmation document

**Color Scheme**: Green accents with orange warning section

## Environment Variables

The email service uses these optional environment variables:

```bash
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=cps@dlsu.edu.ph
SMTP_PASSWORD=your_password
SMTP_FROM_EMAIL=noreply@dlsu-cps.edu.ph
```

**Dev Mode Behavior**:
If SMTP credentials are not configured, the system operates in dev mode:
- Emails are printed to the console instead of being sent
- No actual email transmission occurs
- Attachment paths are logged
- Perfect for development and testing

## PDF Format

### Styling
- **Page Size**: US Letter (8.5" x 11")
- **Margins**: 0.5" on all sides
- **Font**: Helvetica (built-in)
- **Colors**:
  - Header: Green (#1B5E20)
  - Text: Dark gray (#333)
  - Alternating rows: White and light gray (#f5f5f5)

### Content Structure
1. **Header** (3 lines):
   - "Appointment Confirmation"
   - "Counseling & Psychological Services"
   - "De La Salle University"

2. **Confirmation Number**: Bold centered text in gray box

3. **Student Information Section**:
   - Table with name, ID, contact, concern

4. **Appointment Details Section**:
   - Table with date, time, format, counselor

5. **Important Notes**:
   - Numbered list of 4 requirements

6. **Footer**:
   - Service name, university, email, phone
   - Document generation date

## File Structure

### New Files Created
```
backend/
├── services/
│   ├── email_service.py          (UPDATED)
│   └── pdf_service.py            (NEW)
├── temp_pdfs/                    (AUTO-CREATED)
│   └── CPS_Appointment_*.pdf     (TEMPORARY)
└── blueprints/
    └── appointments.py           (UPDATED)
```

### Temporary Files
- PDFs are stored in `backend/temp_pdfs/` directory
- Automatically created on first use
- Cleaned up after email is sent
- Naming format: `CPS_Appointment_{STUDENT_ID}_{DATE}.pdf`

## Testing

### Dev Mode Testing
1. Ensure SMTP environment variables are NOT set
2. Run the backend server
3. Make a POST request to confirm an appointment
4. Check the console output for:
   - `[EMAIL MODE: DEVELOPMENT]`
   - Full email HTML content
   - `[ATTACHMENT]: /path/to/pdf`

### Production Mode Testing
1. Configure SMTP environment variables
2. Run the backend server
3. Make a POST request to confirm an appointment
4. Check the recipient email for:
   - Professional HTML email
   - PDF attachment named "CPS_Appointment_*.pdf"
   - All appointment details

## Error Handling

### Email Service
- **Dev Mode**: Prints all output to console
- **Production Mode**: 
  - Logs success: `✓ Email sent to {recipient}`
  - Logs failures: `✗ Failed to send email: {error}`
  - Logs attachments: `✓ Attached file: {filename}`

### PDF Generation
- **Success**: `✓ PDF generated: {path}`
- **Failure**: `⚠ Could not generate PDF: {error}`
- **Missing Dependency**: Raises `ImportError` with installation instructions

### Appointment Confirmation
- **Email Error**: Non-fatal (doesn't fail appointment confirmation)
- **PDF Error**: Non-fatal (doesn't fail appointment confirmation)
- Both errors are logged to console but don't break the flow

## Usage Examples

### Test Request Receipt Email
```bash
# Send appointment request
curl -X POST http://localhost:5000/api/appointments/request \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "preferred_date": "2024-05-15",
    "preferred_time": "14:00",
    "purpose": "Mental Health Support",
    "concern": "Stress Management",
    "referral_type": "self",
    "preferred_method": "in_person"
  }'
```

### Test Confirmation Email with PDF
```bash
# Confirm appointment (must have counselor assigned)
curl -X POST http://localhost:5000/api/appointments/{APPOINTMENT_ID}/confirm \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json"
```

## Success Metrics

✅ **Implemented Features**:
1. Professional email template for appointment requests
2. Professional email template for appointment confirmations
3. PDF generation with DOH-style formatting
4. PDF attachment to confirmation emails
5. Temporary file management (auto-cleanup)
6. Dev mode console output
7. Production mode SMTP support
8. Error handling and logging

✅ **Code Quality**:
- Clean separation of concerns (email_service, pdf_service)
- Reusable components
- Comprehensive error handling
- Dev/production mode support
- Detailed console logging

✅ **User Experience**:
- Professional appearance matching DOH standards
- Clear appointment details and requirements
- Green branding to match CPS
- Complete information for compliance
- Easy PDF download and archiving

## Future Enhancements

### Possible Improvements
1. **Email Reminders**: Add reminder emails 24 hours before appointment
2. **Calendar Sync**: Add automatic calendar invitations (iCal)
3. **SMS Notifications**: Add SMS backup notifications
4. **Customizable Templates**: Allow CPS staff to customize email templates
5. **Multi-Language Support**: Add Filipino and other language templates
6. **Email Receipts**: Add email read receipts
7. **Audit Trail**: Log all emails sent for compliance

## Database Changes

**No database schema changes required**. The system uses existing fields:
- `appointments.student_id` → Student info lookup
- `appointments.counselor_id` → Counselor info lookup
- `appointments.status` → For confirmation flow
- `appointments.requested_start/end` → For date/time formatting

## Summary

This implementation adds professional email and PDF functionality to the CPS appointment system:
- **Request Email**: Acknowledges student submission
- **Confirmation Email**: Contains PDF attachment with full appointment details
- **PDF Document**: DOH-compliant format with all required information
- **Dev Mode**: Perfect for testing without SMTP setup
- **Production Mode**: Full SMTP support with error handling

The system is production-ready and follows professional standards for healthcare appointment confirmations.
