"""
Flask application configuration
"""

import os
from datetime import timedelta

class Config:
    """Base configuration"""
    def __init__(self):
        """Initialize config with environment variables"""
        self.SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
        self.JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
        self.JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
        self.JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
        self.MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
        self.MONGODB_DB_NAME = 'cps_system'
        self.GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
        self.GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
        self.ZOOM_ACCOUNT_ID = os.getenv('ZOOM_ACCOUNT_ID')
        self.ZOOM_CLIENT_ID = os.getenv('ZOOM_CLIENT_ID')
        self.ZOOM_CLIENT_SECRET = os.getenv('ZOOM_CLIENT_SECRET')
        self.ZOOM_TOKEN_SECRET = os.getenv('ZOOM_TOKEN_SECRET')
        self.PANDADOC_API_KEY = os.getenv('PANDADOC_API_KEY')
        self.SMTP_HOST = os.getenv('SMTP_HOST')
        self.SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
        self.SMTP_USER = os.getenv('SMTP_USER')
        self.SMTP_PASS = os.getenv('SMTP_PASS')
        self.GDRIVE_SERVICE_ACCOUNT_JSON = os.getenv('GDRIVE_SERVICE_ACCOUNT_JSON')
        self.ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY')
        self.S3_ENABLED = os.getenv('S3_ENABLED', 'false').lower() == 'true'
        self.S3_BUCKET = os.getenv('S3_BUCKET')
        self.S3_REGION = os.getenv('S3_REGION')
        self.S3_ACCESS_KEY = os.getenv('S3_ACCESS_KEY')
        self.S3_SECRET_KEY = os.getenv('S3_SECRET_KEY')
    
    # Class-level defaults for Flask's config_from_object
    SECRET_KEY = 'dev-secret-key-change-in-production'
    JWT_SECRET_KEY = 'jwt-secret-key-change-in-production'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    MONGODB_URI = 'mongodb://localhost:27017'
    MONGODB_DB_NAME = 'cps_system'
    SMTP_HOST = None
    SMTP_PORT = 587
    SMTP_USER = None
    SMTP_PASS = None
    S3_ENABLED = False


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
