#!/bin/bash
# Google OAuth Setup Helper Script
# This script helps configure Google OAuth credentials for the CPS system

set -e

echo "================================================"
echo "CPS System - Google OAuth Setup Helper"
echo "================================================"
echo ""

# Check if running from project root
if [ ! -f "backend/config.py" ]; then
    echo "❌ Error: Run this script from the project root directory"
    echo "   Example: ./setup_google_oauth.sh"
    exit 1
fi

# Create backend .env file if it doesn't exist
if [ ! -f "backend/.env" ]; then
    echo "📄 Creating backend/.env file..."
    touch backend/.env
else
    echo "Found existing backend/.env"
fi

echo ""
echo "📋 Google OAuth Credentials Setup"
echo "========================================"
echo ""
echo "Before proceeding, please obtain your Google OAuth credentials:"
echo ""
echo "1. Go to: https://console.cloud.google.com"
echo "2. Create a new project (or select existing)"
echo "3. Enable Google+ API in APIs & Services"
echo "4. Create OAuth 2.0 credentials (Web Application)"
echo "5. Add Authorized Origins:"
echo "   - http://localhost:3000"
echo "   - http://localhost:5000"
echo "6. Add Authorized Redirect URIs:"
echo "   - http://localhost:3000/login"
echo "   - http://localhost:5000/api/auth/oauth/callback"
echo ""

read -p "Do you have your Google Client ID and Secret? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Setup cancelled. Please get your credentials first."
    exit 1
fi

echo ""
echo "📝 Please enter your credentials:"
echo ""

read -p "Google Client ID (ends with .apps.googleusercontent.com): " CLIENT_ID
if [ -z "$CLIENT_ID" ]; then
    echo "❌ Client ID is required"
    exit 1
fi

read -sp "Google Client Secret (will not be displayed): " CLIENT_SECRET
echo ""
if [ -z "$CLIENT_SECRET" ]; then
    echo "❌ Client Secret is required"
    exit 1
fi

# Backup existing .env
if [ -s backend/.env ]; then
    echo "💾 Backing up existing .env to .env.backup"
    cp backend/.env backend/.env.backup
fi

# Function to update or add environment variable
update_env() {
    local key=$1
    local value=$2
    local env_file="backend/.env"
    
    if grep -q "^$key=" "$env_file"; then
        # Update existing
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/^$key=.*/$key=$value/" "$env_file"
        else
            sed -i "s/^$key=.*/$key=$value/" "$env_file"
        fi
    else
        # Add new
        echo "$key=$value" >> "$env_file"
    fi
}

# Update credentials
update_env "GOOGLE_CLIENT_ID" "$CLIENT_ID"
update_env "GOOGLE_CLIENT_SECRET" "$CLIENT_SECRET"

echo ""
echo "✅ Credentials saved to backend/.env"
echo ""
echo "📋 Current configuration:"
grep "^GOOGLE_" backend/.env || echo "   (none found)"
echo ""

# Check if backend is running
echo "🔍 Checking backend server..."
if pgrep -f "python3 app.py" > /dev/null; then
    echo "⚠️  Backend is already running. Restarting to apply changes..."
    pkill -f "python3 app.py" || true
    sleep 2
fi

echo ""
echo "🚀 Starting backend server..."
cd backend
python3 app.py &
BACKEND_PID=$!
cd ..

sleep 3

echo ""
echo "🧪 Testing Google OAuth setup..."
echo ""

# Test the endpoint
RESPONSE=$(curl -s http://localhost:5000/api/auth/oauth/google/client-id 2>&1 || echo "error")

if echo "$RESPONSE" | grep -q "client_id"; then
    echo "✅ Backend is responding correctly"
    echo "📌 Response: $RESPONSE"
    echo ""
    echo "================================================"
    echo "✨ Google OAuth Setup Complete!"
    echo "================================================"
    echo ""
    echo "Next steps:"
    echo "1. Open browser: http://localhost:3000"
    echo "2. Go to Login page"
    echo "3. Click 'Sign in with Google'"
    echo "4. Use your @dlsu.edu.ph email"
    echo ""
    echo "Troubleshooting:"
    echo "- Check browser console for errors (F12)"
    echo "- Check backend logs: tail -f backend.log"
    echo "- Verify .env file: cat backend/.env | grep GOOGLE"
    echo ""
else
    echo "⚠️  Could not connect to backend"
    echo "   Make sure backend is running: python3 backend/app.py"
    echo "   Then test manually: curl http://localhost:5000/api/auth/oauth/google/client-id"
fi

echo "Backend running as PID: $BACKEND_PID"
echo ""
echo "Documentation: See GOOGLE_OAUTH_LOGIN_SETUP.md"
