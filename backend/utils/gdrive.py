"""
Google Drive service utility for document management
"""

import os
import json
import io
from typing import Optional, List, Dict, Any
from flask import current_app
from google.auth.transport.requests import Request
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload, MediaIoBaseUpload


class GoogleDriveService:
    """Service for interacting with Google Drive API"""
    
    SCOPES = ['https://www.googleapis.com/auth/drive']
    
    def __init__(self):
        """Initialize Google Drive service with service account credentials"""
        self.service = None
        self._initialize_service()
    
    def _initialize_service(self):
        """Initialize the Google Drive service with credentials"""
        try:
            gdrive_json = current_app.config.get('GDRIVE_SERVICE_ACCOUNT_JSON')
            
            if not gdrive_json:
                print("Warning: GDRIVE_SERVICE_ACCOUNT_JSON not configured")
                return False
            
            # Parse the JSON string
            service_account_info = json.loads(gdrive_json)
            
            # Create credentials from service account info
            credentials = Credentials.from_service_account_info(
                service_account_info,
                scopes=self.SCOPES
            )
            
            # Build the Drive service
            self.service = build('drive', 'v3', credentials=credentials)
            return True
        except Exception as e:
            print(f"Error initializing Google Drive service: {str(e)}")
            return False
    
    def upload_file(
        self,
        file_content: bytes,
        filename: str,
        mime_type: str = 'application/octet-stream',
        folder_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Upload a file to Google Drive
        
        Args:
            file_content: File content as bytes
            filename: Name of the file
            mime_type: MIME type of the file
            folder_id: Optional parent folder ID in Google Drive
            metadata: Optional additional metadata
        
        Returns:
            File metadata dictionary with 'id' and 'name' or None on error
        """
        try:
            if not self.service:
                print("Google Drive service not initialized")
                return None
            
            file_metadata = {
                'name': filename,
                **(metadata or {})
            }
            
            if folder_id:
                file_metadata['parents'] = [folder_id]
            
            # Create file upload
            media = MediaIoBaseUpload(io.BytesIO(file_content), mimetype=mime_type, resumable=True)
            
            # Upload the file
            request = self.service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id, name, createdTime, mimeType, size, webViewLink'
            )
            
            file_obj = request.execute()
            print(f"File uploaded successfully: {file_obj.get('id')}")
            return file_obj
        
        except HttpError as error:
            print(f"An error occurred: {error}")
            return None
        except Exception as e:
            print(f"Unexpected error uploading file: {str(e)}")
            return None
    
    def get_file(self, file_id: str) -> Optional[bytes]:
        """
        Download a file from Google Drive
        
        Args:
            file_id: Google Drive file ID
        
        Returns:
            File content as bytes or None on error
        """
        try:
            if not self.service:
                print("Google Drive service not initialized")
                return None
            
            request = self.service.files().get_media(fileId=file_id)
            file_content = request.execute()
            return file_content
        
        except HttpError as error:
            print(f"An error occurred: {error}")
            return None
        except Exception as e:
            print(f"Unexpected error downloading file: {str(e)}")
            return None
    
    def list_files(
        self,
        folder_id: Optional[str] = None,
        query: Optional[str] = None,
        page_size: int = 10
    ) -> List[Dict[str, Any]]:
        """
        List files from Google Drive
        
        Args:
            folder_id: Optional parent folder ID
            query: Optional search query
            page_size: Number of results per page
        
        Returns:
            List of file metadata dictionaries
        """
        try:
            if not self.service:
                print("Google Drive service not initialized")
                return []
            
            # Build query
            q = []
            if folder_id:
                q.append(f"'{folder_id}' in parents")
            if query:
                q.append(query)
            q.append("trashed = false")
            
            query_string = " and ".join(q) if q else "trashed = false"
            
            # List files
            request = self.service.files().list(
                q=query_string,
                spaces='drive',
                fields='files(id, name, mimeType, createdTime, modifiedTime, size, webViewLink, owners)',
                pageSize=page_size
            )
            
            results = request.execute()
            files = results.get('files', [])
            return files
        
        except HttpError as error:
            print(f"An error occurred: {error}")
            return []
        except Exception as e:
            print(f"Unexpected error listing files: {str(e)}")
            return []
    
    def delete_file(self, file_id: str) -> bool:
        """
        Delete a file from Google Drive
        
        Args:
            file_id: Google Drive file ID
        
        Returns:
            True if successful, False otherwise
        """
        try:
            if not self.service:
                print("Google Drive service not initialized")
                return False
            
            self.service.files().delete(fileId=file_id).execute()
            print(f"File deleted successfully: {file_id}")
            return True
        
        except HttpError as error:
            print(f"An error occurred: {error}")
            return False
        except Exception as e:
            print(f"Unexpected error deleting file: {str(e)}")
            return False
    
    def share_file(
        self,
        file_id: str,
        email: str,
        role: str = 'reader'
    ) -> bool:
        """
        Share a file with a user
        
        Args:
            file_id: Google Drive file ID
            email: Email address to share with
            role: Role to assign ('reader', 'writer', 'organizer')
        
        Returns:
            True if successful, False otherwise
        """
        try:
            if not self.service:
                print("Google Drive service not initialized")
                return False
            
            permission = {
                'type': 'user',
                'role': role,
                'emailAddress': email
            }
            
            self.service.permissions().create(
                fileId=file_id,
                body=permission,
                fields='id'
            ).execute()
            
            print(f"File shared successfully with {email}")
            return True
        
        except HttpError as error:
            print(f"An error occurred: {error}")
            return False
        except Exception as e:
            print(f"Unexpected error sharing file: {str(e)}")
            return False
    
    def create_folder(
        self,
        folder_name: str,
        parent_id: Optional[str] = None
    ) -> Optional[str]:
        """
        Create a folder in Google Drive
        
        Args:
            folder_name: Name of the folder
            parent_id: Optional parent folder ID
        
        Returns:
            Folder ID or None on error
        """
        try:
            if not self.service:
                print("Google Drive service not initialized")
                return None
            
            file_metadata = {
                'name': folder_name,
                'mimeType': 'application/vnd.google-apps.folder'
            }
            
            if parent_id:
                file_metadata['parents'] = [parent_id]
            
            folder = self.service.files().create(
                body=file_metadata,
                fields='id'
            ).execute()
            
            folder_id = folder.get('id')
            print(f"Folder created successfully: {folder_id}")
            return folder_id
        
        except HttpError as error:
            print(f"An error occurred: {error}")
            return None
        except Exception as e:
            print(f"Unexpected error creating folder: {str(e)}")
            return None


def get_gdrive_service() -> GoogleDriveService:
    """
    Get or create a Google Drive service instance
    
    Returns:
        GoogleDriveService instance
    """
    return GoogleDriveService()
