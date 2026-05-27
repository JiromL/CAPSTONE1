"""
Flask application configuration
"""

import os
from datetime import timedelta

class Config:
    """Base configuration"""
    # Class-level defaults for Flask's config_from_object
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)  # Extended for development/testing
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
    MONGODB_DB_NAME = 'cps_system'
    
    # Authentication & Third-party integrations
    GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
    GOOGLE_SERVICE_ACCOUNT_EMAIL = os.getenv('GOOGLE_SERVICE_ACCOUNT_EMAIL')
    GOOGLE_SERVICE_ACCOUNT_KEY = os.getenv('GOOGLE_SERVICE_ACCOUNT_KEY')
    ZOOM_ACCOUNT_ID = os.getenv('ZOOM_ACCOUNT_ID')
    ZOOM_CLIENT_ID = os.getenv('ZOOM_CLIENT_ID')
    ZOOM_CLIENT_SECRET = os.getenv('ZOOM_CLIENT_SECRET')
    ZOOM_TOKEN_SECRET = os.getenv('ZOOM_TOKEN_SECRET')
    PANDADOC_API_KEY = os.getenv('PANDADOC_API_KEY')
    
    # Email configuration
    SMTP_HOST = os.getenv('SMTP_HOST')
    SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
    SMTP_USER = os.getenv('SMTP_USER')
    SMTP_PASS = os.getenv('SMTP_PASS')
    
    # Storage & security
    GDRIVE_SERVICE_ACCOUNT_JSON = os.getenv('GDRIVE_SERVICE_ACCOUNT_JSON')
    ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY', '5k4TtzFSzW3xEVU1ZT-2zV1X-vZEX_V_ZIXwcfvcK3Y=')
    S3_ENABLED = os.getenv('S3_ENABLED', 'false').lower() == 'true'
    S3_BUCKET = os.getenv('S3_BUCKET')
    S3_REGION = os.getenv('S3_REGION')
    S3_ACCESS_KEY = os.getenv('S3_ACCESS_KEY')
    S3_SECRET_KEY = os.getenv('S3_SECRET_KEY')

    # Organisation identity
    ORG_NAME = os.getenv('ORG_NAME', 'Counseling & Psychological Services')
    ORG_UNIVERSITY = os.getenv('ORG_UNIVERSITY', 'De La Salle University')
    ORG_SHORT = os.getenv('ORG_SHORT', 'DLSU CPS')
    SUPPORT_EMAIL = os.getenv('SUPPORT_EMAIL', 'cps@dlsu.edu.ph')
    ALLOWED_EMAIL_DOMAIN = os.getenv('ALLOWED_EMAIL_DOMAIN', '@dlsu.edu.ph')
    SMTP_FROM_EMAIL = os.getenv('SMTP_FROM_EMAIL', 'noreply@dlsu-cps.edu.ph')
    REFERENCE_ID_PREFIX = os.getenv('REFERENCE_ID_PREFIX', 'CPS-')

    # Appointment business logic
    APPOINTMENT_DURATION_MINUTES = int(os.getenv('APPOINTMENT_DURATION_MINUTES', '60'))
    QR_EXPIRY_MINUTES = int(os.getenv('QR_EXPIRY_MINUTES', '30'))
    REMINDER_HOURS_24 = int(os.getenv('REMINDER_HOURS_24', '24'))
    REMINDER_HOURS_1 = int(os.getenv('REMINDER_HOURS_1', '1'))
    NO_SHOW_THRESHOLD = int(os.getenv('NO_SHOW_THRESHOLD', '3'))
    LATE_CANCEL_THRESHOLD = int(os.getenv('LATE_CANCEL_THRESHOLD', '3'))
    
    def __init__(self):
        """Initialize config with environment variables"""
        # This __init__ is kept for backward compatibility
        pass


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = False
    MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
    MONGODB_DB_NAME = 'cps_system_dev'
    SMTP_HOST = os.getenv('SMTP_HOST')
    SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
    SMTP_USER = os.getenv('SMTP_USER')
    SMTP_PASS = os.getenv('SMTP_PASS')


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    MONGODB_URI = os.getenv('MONGODB_URI')  # Must be set in environment
    MONGODB_DB_NAME = 'cps_system'


class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    MONGODB_URI = 'mongodb://localhost:27017'
    MONGODB_DB_NAME = 'cps_system_test'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=5)


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
