"""
Campus Counseling & Psychology Services (CPS) Management System
Complete implementation of 8 Epics with RBAC, Triage, Intake, Booking, Documentation,
Counseling, High-Risk Monitoring, and Referral Management - Using MongoDB
"""

import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables BEFORE any other imports
# Look for .env in the parent directory (project root)
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from datetime import datetime

from config import config
from models import db, UserRole, PermissionType, RiskLevel

from blueprints import (
    auth_bp,
    assessments_bp,
    intake_bp,
    appointments_bp,
    documentation_bp,
    counseling_bp,
    high_risk_bp,
    dashboard_bp,
    referrals_bp,
    reservations_bp,
    integrations_bp,
    cases_bp,
    resources_bp,
)
from blueprints.google_calendar import calendar_bp
from blueprints.mhbot_integration import mhbot_bp

def create_app(config_name=None):
    """Application factory"""
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')
    
    app = Flask(__name__)
    app.config.from_object(config.get(config_name, config['development']))
    
    # Update config with current environment variables (for runtime env vars like SMTP)
    app.config['SMTP_HOST'] = os.getenv('SMTP_HOST', app.config.get('SMTP_HOST'))
    app.config['SMTP_PORT'] = int(os.getenv('SMTP_PORT', app.config.get('SMTP_PORT', 587)))
    app.config['SMTP_USER'] = os.getenv('SMTP_USER', app.config.get('SMTP_USER'))
    app.config['SMTP_PASS'] = os.getenv('SMTP_PASS', app.config.get('SMTP_PASS'))
    app.config['GOOGLE_CLIENT_ID'] = os.getenv('GOOGLE_CLIENT_ID', app.config.get('GOOGLE_CLIENT_ID'))
    app.config['GOOGLE_CLIENT_SECRET'] = os.getenv('GOOGLE_CLIENT_SECRET', app.config.get('GOOGLE_CLIENT_SECRET'))
    app.config['ZOOM_ACCOUNT_ID'] = os.getenv('ZOOM_ACCOUNT_ID', app.config.get('ZOOM_ACCOUNT_ID'))
    app.config['ZOOM_CLIENT_ID'] = os.getenv('ZOOM_CLIENT_ID', app.config.get('ZOOM_CLIENT_ID'))
    app.config['ZOOM_CLIENT_SECRET'] = os.getenv('ZOOM_CLIENT_SECRET', app.config.get('ZOOM_CLIENT_SECRET'))
    app.config['ZOOM_TOKEN_SECRET'] = os.getenv('ZOOM_TOKEN_SECRET', app.config.get('ZOOM_TOKEN_SECRET'))
    
    # Initialize extensions
    CORS(app, resources={r"/api/*": {"origins": [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://localhost:3004",  # allow multiple ports for Next.js development
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:3003",
        "http://127.0.0.1:3004"
    ]}})
    jwt = JWTManager(app)
    
    # Initialize MongoDB
    mongodb = db.init_app(app)
    # expose db on app for integrations and blueprints
    app.db = mongodb
    
    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(assessments_bp)
    app.register_blueprint(intake_bp)
    app.register_blueprint(appointments_bp)
    app.register_blueprint(documentation_bp)
    app.register_blueprint(counseling_bp)
    app.register_blueprint(high_risk_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(referrals_bp)
    app.register_blueprint(reservations_bp)
    app.register_blueprint(integrations_bp)
    app.register_blueprint(cases_bp)
    app.register_blueprint(resources_bp)
    app.register_blueprint(calendar_bp)
    app.register_blueprint(mhbot_bp)
    
    # Health check route
    @app.route('/api/health', methods=['GET'])
    def health():
        try:
            # Check MongoDB connection
            mongodb.client.admin.command('ping')
            mongodb_status = 'connected'
        except Exception as e:
            mongodb_status = f'error: {str(e)}'
        
        return jsonify({
            'status': 'Backend is running',
            'timestamp': datetime.utcnow().isoformat(),
            'version': '1.0.0',
            'database': 'MongoDB',
            'mongodb_status': mongodb_status,
            'epics': [
                'RBAC & Access Control',
                'Triage & Early Detection',
                'Intake Interview & Endorsement',
                'Booking & Scheduling',
                'Centralized Documentation Hub',
                'Ongoing Counseling',
                'High-Risk Monitoring',
                'Referral & Warm Handoff'
            ]
        }), 200
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Resource not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'error': 'Internal server error'}), 500
    
    return app


# Create application
app = create_app()

if __name__ == '__main__':
    # allow overriding port to avoid conflicts (e.g. macOS AirPlay on 5000)
    port = int(os.environ.get('PORT', 5000))
    app.run(port=port, debug=False, threaded=True)
