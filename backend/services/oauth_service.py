"""
Google OAuth2.0 Service for authentication
Handles OAuth flow and token management
"""

import os
from google.auth.transport import requests
from google.oauth2 import id_token
from datetime import datetime


class OAuthService:
    """Handle Google OAuth authentication"""
    
    def __init__(self):
        self.google_client_id = os.getenv('GOOGLE_CLIENT_ID')
        self.google_client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
        _domain = os.getenv('ALLOWED_EMAIL_DOMAIN', '@dlsu.edu.ph').lstrip('@')
        self.allowed_domains = [_domain]
        
    def verify_token(self, token):
        """
        Verify Google ID token
        Returns user info if valid, None if invalid
        """
        try:
            # Verify the token
            idinfo = id_token.verify_oauth2_token(
                token,
                requests.Request(),
                self.google_client_id
            )
            
            # Verify token is not expired (Google does this automatically)
            # Verify it's from Google
            if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                return None
            
            email = idinfo.get('email', '')
            
            # Check allowed domain
            if not self._is_allowed_email(email):
                domain = '@' + (self.allowed_domains[0] if self.allowed_domains else 'dlsu.edu.ph')
                return {
                    'error': f'Only {domain} email addresses are allowed',
                    'email': email
                }
            
            # Extract user info
            return {
                'email': email,
                'first_name': idinfo.get('given_name', ''),
                'last_name': idinfo.get('family_name', ''),
                'picture': idinfo.get('picture', ''),
                'sub': idinfo.get('sub'),  # Google user ID
                'aud': idinfo.get('aud'),  # Audience (should be our client ID)
            }
            
        except ValueError as e:
            # Invalid token
            print(f"Token verification failed: {e}")
            return None
        except Exception as e:
            print(f"OAuth error: {e}")
            return None
    
    def _is_allowed_email(self, email):
        """Check if email is from an allowed domain."""
        if not email:
            return False
        lower = email.lower()
        return any(lower.endswith('@' + d) for d in self.allowed_domains)
    
    def get_google_client_id(self):
        """Get Google Client ID for frontend"""
        return self.google_client_id


def create_oauth_service():
    """Factory function to create OAuth service"""
    return OAuthService()
