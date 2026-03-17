#!/usr/bin/env python3
"""Test OAuth configuration"""

import sys
import os

# Add backend to path
sys.path.insert(0, '/Users/jeromelouiesantos/CAPSTONE1/backend')

# Load environment
from dotenv import load_dotenv
load_dotenv('/Users/jeromelouiesantos/CAPSTONE1/backend/.env')

print("=" * 60)
print("OAUTH CONFIGURATION CHECK")
print("=" * 60)

# Check environment variables
google_client_id = os.getenv('GOOGLE_CLIENT_ID')
google_client_secret = os.getenv('GOOGLE_CLIENT_SECRET')

print(f"\n✓ GOOGLE_CLIENT_ID set: {'Yes' if google_client_id else 'No'}")
if google_client_id:
    print(f"  Value: {google_client_id[:30]}...")

print(f"✓ GOOGLE_CLIENT_SECRET set: {'Yes' if google_client_secret else 'No'}")
if google_client_secret:
    print(f"  Value: {google_client_secret[:20]}...")

# Try to import and initialize OAuthService
try:
    from services.oauth_service import OAuthService
    oauth_service = OAuthService()
    client_id = oauth_service.get_google_client_id()
    print(f"\n✓ OAuthService initialized")
    print(f"✓ get_google_client_id() returns: {client_id[:30] if client_id else 'None'}...")
    
    if not client_id:
        print("\n❌ ERROR: OAuthService cannot get Client ID from environment")
        print("   Check that GOOGLE_CLIENT_ID is set in backend/.env")
    else:
        print("\n✅ OAuth configuration looks good!")
        
except Exception as e:
    print(f"\n❌ Error initializing OAuthService: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
