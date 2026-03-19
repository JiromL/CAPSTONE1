# Google Drive API Integration Setup Guide

## Overview
This system now integrates with Google Drive to securely store and manage clinical documents. All uploaded documents are stored in Google Drive and tracked in MongoDB for access control.

## Prerequisites

1. **Google Cloud Project** - Create a new project or use existing one
2. **Service Account** - Create a service account for API authentication
3. **Google Drive API** - Enable in your Google Cloud project
4. **Shared Drive or Folder** - Optional: Create a dedicated Google Drive folder for documents

## Setup Steps

### 1. Create Service Account Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Go to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "Service Account"
5. Fill in service account details:
   - Service account name: `cps-documentation-api`
   - Service account ID: auto-generated
   - Click "Create and Continue"
6. Grant basic roles (optional, can be configured later)
7. Click "Create Key" > "JSON"
8. Save the JSON file - this contains your credentials

### 2. Enable Google Drive API

1. In Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google Drive API"
3. Click on it and press "Enable"

### 3. Configure Environment Variables

Add the following to your `.env` file:

```bash
# Google Drive API Configuration
GDRIVE_SERVICE_ACCOUNT_JSON='<paste-entire-json-content-here>'
```

To get the JSON content:
1. Open the JSON file you downloaded
2. Copy the entire content
3. Paste it as a single line in your .env file

Example:
```bash
GDRIVE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"your-project-id",...}'
```

### 4. Optional: Create Shared Drive Folder

1. Go to [Google Drive](https://drive.google.com)
2. Create a new folder for CPS documents
3. Right-click folder > "Share"
4. Add the service account email (found in JSON file as "client_email")
5. Grant Editor access

### 5. Backup Existing Documents

If migrating from local storage:
1. Export current documents
2. Run backup script
3. Verify all files are accessible

## API Endpoints

### Upload Document
```
POST /api/documentation/upload
Content-Type: multipart/form-data

Parameters:
- file: Binary file content
- title: Document title (string)
- document_type: Type of document (string)
- case_id: Associated case ID (string)

Response: 201 Created
{
  "document_id": "mongo_id",
  "case_id": "case_id",
  "title": "Document Title",
  "gdrive_file_id": "google_drive_file_id",
  "gdrive_file_link": "https://drive.google.com/file/d/...",
  "created_at": "2024-03-19T..."
}
```

### List Documents
```
GET /api/documentation
Authorization: Bearer <token>

Response: 200 OK
{
  "documents": [
    {
      "_id": "mongo_id",
      "title": "Document Title",
      "document_type": "Intake",
      "created_at": "...",
      "gdrive_file_link": "..."
    }
  ],
  "count": 5,
  "user_role": "COUNSELOR"
}
```

### Download Document
```
GET /api/documentation/<document_id>/download
Authorization: Bearer <token>

Response: 200 OK (file content)
```

### Delete Document
```
DELETE /api/documentation/<document_id>/delete
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "Document deleted successfully"
}
```

## Access Control

The system implements role-based access control:

- **ADMIN**: Can see and manage all documents
- **COUNSELOR/PSYCHOLOGIST/DPO/CSC**: Can see case documents they work on
- **STUDENT**: Can only see documents from their own cases
- **STAFF**: Limited access based on role configuration

## Features

### Automatic Features
- ✅ Files automatically uploaded to Google Drive
- ✅ Metadata stored in MongoDB for quick access
- ✅ Role-based access control
- ✅ Audit logging for all operations
- ✅ File versioning support
- ✅ Document locking for sensitive files

### Document Types
- Intake
- Progress Notes
- Treatment Plan
- Assessment
- Referral
- Other

## Troubleshooting

### Issue: "Failed to upload file to Google Drive"
- Verify service account credentials in .env
- Check if Google Drive API is enabled
- Ensure service account has necessary permissions

### Issue: "Invalid credentials"
- Check JSON content is properly formatted
- Verify all required fields are present in JSON
- Ensure JSON is on a single line in .env

### Issue: "Access denied"
- Verify user role permissions
- Check if user is assigned to the case
- Verify case_id is valid

## Security Considerations

1. **Encryption**: Files are stored encrypted in transit (HTTPS)
2. **Access Control**: Role-based permissions enforced
3. **Audit Trail**: All operations logged
4. **Service Account**: Use service account, not personal account
5. **Key Rotation**: Rotate service account keys periodically
6. **Data Retention**: Follow institutional policy for document retention

## Testing

To test the integration:

1. Login to the system
2. Navigate to Documentation Hub
3. Click "Upload New Document"
4. Select a case
5. Fill in document details
6. Click "Upload"
7. Verify document appears in list
8. Click "View" to access in Google Drive
9. Download to verify file integrity

## Support

For issues or questions about Google Drive integration:
1. Check logs: `tail -f backend.log`
2. Verify credentials: `python scripts/verify_gdrive.py`
3. Test API manually: See API Endpoints section above
