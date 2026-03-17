#!/usr/bin/env python3
"""
Google OAuth Setup Validation Script
Checks if Google OAuth is properly configured and working
"""

import os
import sys
import requests
import json
from pathlib import Path

def print_header(text):
    print(f"\n{'='*50}")
    print(f"  {text}")
    print(f"{'='*50}\n")

def check_env_file():
    """Check if .env file exists and has credentials"""
    print("🔍 Checking .env file...")
    
    env_path = Path("backend/.env")
    if not env_path.exists():
        print("  ❌ backend/.env not found")
        return False
    
    with open(env_path) as f:
        content = f.read()
    
    has_client_id = "GOOGLE_CLIENT_ID=" in content
    has_client_secret = "GOOGLE_CLIENT_SECRET=" in content
    
    if has_client_id:
        print("  ✅ GOOGLE_CLIENT_ID found")
    else:
        print("  ❌ GOOGLE_CLIENT_ID missing")
    
    if has_client_secret:
        print("  ✅ GOOGLE_CLIENT_SECRET found")
    else:
        print("  ❌ GOOGLE_CLIENT_SECRET missing")
    
    return has_client_id and has_client_secret

def check_backend_running():
    """Check if backend is running"""
    print("🔍 Checking backend server...")
    
    try:
        response = requests.get(
            "http://localhost:5000/api/auth/oauth/google/client-id",
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("client_id"):
                print(f"  ✅ Backend is running and responding")
                print(f"  ✅ Client ID: {data['client_id'][:20]}...")
                return True
            else:
                print("  ⚠️  Backend responding but no Client ID returned")
                return False
    except requests.exceptions.ConnectionError:
        print("  ❌ Cannot connect to backend at http://localhost:5000")
        print("     Is backend running? Try: python3 backend/app.py")
        return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def check_frontend_running():
    """Check if frontend is running"""
    print("🔍 Checking frontend server...")
    
    try:
        response = requests.get(
            "http://localhost:3000",
            timeout=5
        )
        
        if response.status_code == 200:
            print("  ✅ Frontend is running at http://localhost:3000")
            return True
    except requests.exceptions.ConnectionError:
        print("  ❌ Cannot connect to frontend at http://localhost:3000")
        print("     Is frontend running? Try: npm run dev (from frontend/)")
        return False
    except Exception as e:
        print(f"  ⚠️  Frontend check: {e}")
        return False

def validate_credentials():
    """Validate Google credentials format"""
    print("🔍 Validating credential format...")
    
    env_path = Path("backend/.env")
    if not env_path.exists():
        return False
    
    with open(env_path) as f:
        for line in f:
            if line.startswith("GOOGLE_CLIENT_ID="):
                client_id = line.split("=", 1)[1].strip()
                if ".apps.googleusercontent.com" in client_id:
                    print(f"  ✅ Client ID format valid")
                else:
                    print(f"  ⚠️  Client ID format unusual (may be custom)")
            
            if line.startswith("GOOGLE_CLIENT_SECRET="):
                secret = line.split("=", 1)[1].strip()
                if len(secret) > 20:
                    print(f"  ✅ Client Secret appears valid (length: {len(secret)})")
                else:
                    print(f"  ⚠️  Client Secret seems too short")
    
    return True

def main():
    print_header("🔐 Google OAuth Setup Validator")
    print("This script checks if Google OAuth is properly configured.\n")
    
    results = {
        "✅ .env file": check_env_file(),
        "✅ Backend running": check_backend_running(),
        "✅ Frontend running": check_frontend_running(),
        "✅ Credentials format": validate_credentials(),
    }
    
    print_header("📊 Summary")
    
    for check, result in results.items():
        status = "✅" if result else "❌"
        print(f"{status} {check}")
    
    passed = sum(results.values())
    total = len(results)
    
    print(f"\n{passed}/{total} checks passed\n")
    
    if passed == total:
        print("✨ Everything looks good! You're ready to test.")
        print("\nNext steps:")
        print("1. Open http://localhost:3000 in your browser")
        print("2. Go to Login page")
        print("3. Click 'Sign in with Google'")
        print("4. Sign in with @dlsu.edu.ph email")
        print("\n")
        return 0
    else:
        print("⚠️  Some checks failed. Please fix and try again.")
        print("\nTroubleshooting:")
        
        if not results["✅ .env file"]:
            print("• Create backend/.env and add:")
            print("  GOOGLE_CLIENT_ID=your_id_here")
            print("  GOOGLE_CLIENT_SECRET=your_secret_here")
        
        if not results["✅ Backend running"]:
            print("• Start backend: cd backend && python3 app.py")
        
        if not results["✅ Frontend running"]:
            print("• Start frontend: cd frontend && npm run dev")
        
        print("\n")
        return 1

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\n❌ Validation cancelled")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
