#!/usr/bin/env python3
"""
Verification script for Google Drive API configuration
Tests if the service account credentials are valid and Google Drive API is accessible
"""

import os
import sys
import json
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / 'backend'))

def verify_gdrive_config():
    """Verify Google Drive configuration"""
    from config import Config
    from utils.gdrive import GoogleDriveService
    
    print("=" * 60)
    print("Google Drive API Configuration Verification")
    print("=" * 60)
    
    # Check environment variable
    gdrive_json = os.getenv('GDRIVE_SERVICE_ACCOUNT_JSON') or Config.GDRIVE_SERVICE_ACCOUNT_JSON
    
    if not gdrive_json:
        print("\n❌ GDRIVE_SERVICE_ACCOUNT_JSON not found in environment")
        print("   Please set the environment variable with your service account JSON")
        return False
    
    print("\n✅ GDRIVE_SERVICE_ACCOUNT_JSON is set")
    
    # Parse JSON
    try:
        creds = json.loads(gdrive_json)
        print("✅ JSON credentials are valid")
        
        # Check required fields
        required_fields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email']
        for field in required_fields:
            if field not in creds:
                print(f"❌ Missing required field: {field}")
                return False
            print(f"✅ Found field: {field}")
        
        print(f"\n📋 Service Account Details:")
        print(f"   Project ID: {creds.get('project_id')}")
        print(f"   Client Email: {creds.get('client_email')}")
        
    except json.JSONDecodeError as e:
        print(f"\n❌ Invalid JSON format: {str(e)}")
        print("   Make sure GDRIVE_SERVICE_ACCOUNT_JSON is a valid JSON string on a single line")
        return False
    
    # Test service initialization
    print("\n" + "=" * 60)
    print("Testing Google Drive Service Connection")
    print("=" * 60)
    
    try:
        service = GoogleDriveService()
        
        if service.service:
            print("\n✅ Google Drive service initialized successfully")
            
            # Try to list files (limit to 1 to minimize API calls)
            files = service.list_files(page_size=1)
            print("✅ Successfully connected to Google Drive API")
            print(f"   Accessible files in Drive: {len(files)} (sampled)")
            
            return True
        else:
            print("\n❌ Failed to initialize Google Drive service")
            print("   Check that Google Drive API is enabled in Google Cloud Console")
            return False
            
    except Exception as e:
        print(f"\n❌ Error connecting to Google Drive: {str(e)}")
        print("   Verify your credentials and that Google Drive API is enabled")
        return False


def check_requirements():
    """Check if required packages are installed"""
    print("=" * 60)
    print("Checking Required Packages")
    print("=" * 60 + "\n")
    
    required_packages = [
        'google-auth',
        'google-auth-oauthlib',
        'google-api-python-client'
    ]
    
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
            print(f"✅ {package} is installed")
        except ImportError:
            print(f"❌ {package} is NOT installed")
            print(f"   Run: pip install {package}")
            return False
    
    return True


if __name__ == '__main__':
    print("\n")
    
    # Check requirements
    if not check_requirements():
        print("\n❌ Some required packages are missing")
        sys.exit(1)
    
    print()
    
    # Verify configuration
    if verify_gdrive_config():
        print("\n" + "=" * 60)
        print("✅ Google Drive API is properly configured!")
        print("=" * 60)
        print("\nYou can now use the documentation upload feature.")
        sys.exit(0)
    else:
        print("\n" + "=" * 60)
        print("❌ Google Drive API configuration has issues")
        print("=" * 60)
        print("\nPlease follow the setup guide: GDRIVE_SETUP_GUIDE.md")
        sys.exit(1)
