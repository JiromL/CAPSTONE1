# Email & PDF Implementation - Quick Start Guide

## What Was Implemented

### 1. ✅ Professional Email Notifications
- **Request Receipt Email**: Sent when student submits appointment request
- **Confirmation Email**: Sent when appointment is confirmed
- Both include studentname, appointment details, and next steps

### 2. ✅ PDF Attachment Support
- **PDF Generation**: Server-side PDF creation using reportlab
- **File Attachment**: PDFs automatically attached to confirmation emails
- **Professional Formatting**: DOH-compliant layout with green branding
- **Auto-Cleanup**: Temporary files removed after sending

### 3. ✅ Email Service Enhancements
- New `send_appointment_confirmation_email()` method
- File attachment support via `MIMEBase`
- Dev and production modes fully supported
- Comprehensive error handling

### 4. ✅ PDF Service Creation
- Generates appointment confirmation documents
- Uses reportlab for reliable PDF creation
- Includes student info, appointment details, and important notes
- Professional styling matching CPS branding

## How to Test

### **Option 1: Development Mode (Easiest - No SMTP Setup)**

If SMTP environment variables are NOT configured, the system runs in development mode:

1. **Install Dependencies**:
```bash
cd backend
pip install -r requirements.txt
```

2. **Start the backend**:
```bash
python app.py
```

3. **Create a test appointment request**:
```bash
# In another terminal, get a JWT token first, then:
curl -X POST http://localhost:5000/api/appointments/request \
  -H "Authorization: Bearer {YOUR_JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "preferred_date": "2024-05-15",
    "preferred_time": "14:00",
    "purpose": "Mental Health Support",
    "concern": "Anxiety",
    "referral_type": "self",
    "preferred_method": "in_person"
  }'
```

4. **Check the console output** - You should see:
```
============================================================
[EMAIL MODE: DEVELOPMENT]
To: student@dlsu.edu.ph
Subject: Appointment Request Received
============================================================
<html>... (full email HTML) ...</html>
============================================================
```

5. **Confirm an appointment** (must have counselor assigned first):
```bash
curl -X POST http://localhost:5000/api/appointments/{APPOINTMENT_ID}/confirm \
  -H "Authorization: Bearer {YOUR_JWT_TOKEN}" \
  -H "Content-Type: application/json"
```

6. **Check console for confirmation email**:
```
============================================================
[EMAIL MODE: DEVELOPMENT]
To: student@dlsu.edu.ph
Subject: Your Appointment Confirmation - {ID}
============================================================
<html>... (confirmation email HTML) ...</html>
[ATTACHMENT]: /path/to/temp_pdfs/CPS_Appointment_*.pdf
============================================================
✓ Temporary PDF cleaned up
```

### **Option 2: Production Mode (With SMTP)**

1. **Configure SMTP environment variables** in `.env`:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@dlsu-cps.edu.ph
```

2. **Restart the backend**

3. **Test the same endpoints** - Emails will now be sent to actual recipients

## File Changes Summary

### **Modified Files**:
1. **`backend/services/email_service.py`**
   - Added MIMEBase import for attachments
   - Added `send_appointment_confirmation_email()` method
   - Updated `_send_email()` to support file attachments

2. **`backend/blueprints/appointments.py`**
   - Added imports for email and PDF services
   - Updated `/request` endpoint to send receipt email
   - Updated `/confirm` endpoint to generate PDF and send confirmation email
   - User loading moved earlier for email notifications

3. **`backend/requirements.txt`**
   - Added `reportlab==4.0.9` for PDF generation

### **New Files Created**:
1. **`backend/services/pdf_service.py`** - PDF generation service
2. **`EMAIL_PDF_IMPLEMENTATION.md`** - Detailed documentation

### **Auto-Created Directories**:
- `backend/temp_pdfs/` - Temporary PDF storage (auto-created on first use)

## What Happens Now

### **When Student Requests Appointment**:
1. Appointment created in database
2. ✅ **NEW**: Request receipt email sent to student
3. Shows request ID, date, purpose, status
4. Auto-assignment attempts

### **When Appointment is Confirmed**:
1. Appointment status updated to CONFIRMED
2. ✅ **NEW**: PDF generated with all appointment details
3. ✅ **NEW**: Confirmation email sent with PDF attachment
4. Temporary PDF cleaned up
5. Calendar sync performed (existing feature)

## Email Content Examples

### **Request Receipt**
```
Subject: Appointment Request Received

Dear John Doe,

Thank you for submitting your appointment request with the Counseling and 
Psychological Services (CPS). We have received your submission and will 
process it shortly.

Request Details
Request ID: 507f1f77bcf86cd799439011
Preferred Date: 2024-05-15
Purpose: Mental Health Support
Status: REQUESTED

Our counseling team will review your request and match you with an appropriate 
counselor. You will receive a confirmation email once your appointment has been 
scheduled.

For questions, contact: cps@dlsu.edu.ph
```

### **Confirmation Email**
```
Subject: Your Appointment Confirmation - 507f1f77bcf86cd799439011

Dear John Doe,

Thank you for scheduling an appointment with the Counseling and Psychological 
Services (CPS). Your appointment has been confirmed.

Appointment Details
Confirmation No.: 507f1f77bcf86cd799439011
Date: May 15, 2024
Time: 02:00 PM
Format: In-Person
Counselor: Ms. Patricia Smith

Important Notes:
1. Please arrive 10 minutes early for in-person appointments.
2. If meeting via Google Meet or Zoom, ensure stable internet connection.
3. Contact CPS at least 24 hours before for rescheduling requests.
4. For concerns or questions, reach out to our support team.

[ATTACHED: CPS_Appointment_A00123456_May_15_2024.pdf]
```

## PDF Document Example

The attached PDF includes:
- Header: "Appointment Confirmation" + CPS branding
- Confirmation Number
- Student Information (name, ID, contact)
- Appointment Details (date, time, format, counselor)
- Important Notes (4 key requirements)
- Professional footer with contact info

## Troubleshooting

### ❌ "Missing required fields" Error
**Solution**: Make sure to include all required fields in appointment request:
- `preferred_date` (YYYY-MM-DD format)
- `preferred_time` (HH:MM format)
- `purpose`
- `concern`
- `referral_type`
- `preferred_method`

### ❌ "Counselor must be assigned" Error
**Solution**: The appointment needs a counselor assigned before confirmation. Use:
- Auto-assignment (happens automatically)
- Manual assignment via `/api/appointments/{id}/match-counselor`

### ❌ "reportlab module not found" Error
**Solution**: Install dependencies:
```bash
cd backend
pip install reportlab
```

### ❌ Emails not showing in console
**Solution**: Make sure SMTP environment variables are NOT set (for dev mode)

### ❌ "PDF generation failed"
**Solution**: Check console for error details, ensure reportlab is installed

## Production Checklist

- [ ] Install reportlab: `pip install reportlab`
- [ ] Configure SMTP environment variables
- [ ] Test with development mode first (no SMTP setup)
- [ ] Create test appointment request
- [ ] Confirm test appointment
- [ ] Verify emails received at test email address
- [ ] Verify PDF attachment opens correctly
- [ ] Test with multiple students
- [ ] Check email formatting on different clients
- [ ] Deploy to production server

## Verification Commands

### Check if reportlab is installed:
```bash
python -c "import reportlab; print(f'reportlab version: {reportlab.Version}')"
```

### Check if email service is working:
```bash
python -c "from services.email_service import EmailService; print('✓ Email service imported successfully')"
```

### Check if PDF service is working:
```bash
python -c "from services.pdf_service import generate_appointment_confirmation_pdf; print('✓ PDF service imported successfully')"
```

## Support

For issues or questions:
1. Check `EMAIL_PDF_IMPLEMENTATION.md` for detailed documentation
2. Review console output for error messages
3. Check the backend `app.py` logs
4. Verify SMTP configuration if using production mode
5. Ensure all required fields are present in API requests
