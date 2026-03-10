"""
Flask application configuration
"""

import os
from datetime import timedelta

class Config:
    """Base configuration"""
    # Class-level defaults for Flask's config_from_object
    SECRET_KEY = 'dev-secret-key-change-in-production'
    JWT_SECRET_KEY = 'jwt-secret-key-change-in-production'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    MONGODB_URI = 'mongodb://localhost:27017'
    MONGODB_DB_NAME = 'cps_system'
    
    # Authentication & Third-party integrations
    GOOGLE_CLIENT_ID = None
    GOOGLE_CLIENT_SECRET = None
    ZOOM_ACCOUNT_ID = None
    ZOOM_CLIENT_ID = None
    ZOOM_CLIENT_SECRET = None
    ZOOM_TOKEN_SECRET = None
    PANDADOC_API_KEY = None
    
    # Email configuration
    SMTP_HOST = None
    SMTP_PORT = 587
    SMTP_USER = None
    SMTP_PASS = None
    
    # Storage & security
    GDRIVE_SERVICE_ACCOUNT_JSON = None
    ENCRYPTION_KEY = None
    S3_ENABLED = False
    S3_BUCKET = None
    S3_REGION = None
    S3_ACCESS_KEY = None
    S3_SECRET_KEY = None
    
    def __init__(self):
        """Initialize config with environment variables"""
        # This __init__ is kept for backward compatibility but Flask uses class attributes
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
