"""
Campus Counseling & Psychology Services (CPS) Management System
Complete implementation of 8 Epics with RBAC, Triage, Intake, Booking, Documentation,
Counseling, High-Risk Monitoring, and Referral Management - Using MongoDB
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from datetime import datetime
import os
from dotenv import load_dotenv

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
    referrals_bp
)

load_dotenv()

def create_app(config_name=None):
    """Application factory"""
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')
    
    app = Flask(__name__)
    app.config.from_object(config.get(config_name, config['development']))
    
    # Initialize extensions
    CORS(app, resources={r"/api/*": {"origins": ["http://localhost:3000", "http://localhost:3001"]}})
    jwt = JWTManager(app)
    
    # Initialize MongoDB
    mongodb = db.init_app(app)
    
    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(assessments_bp)
    app.register_blueprint(intake_bp)
    app.register_blueprint(appointments_bp)
    app.register_blueprint(documentation_bp)
    app.register_blueprint(counseling_bp)
    app.register_blueprint(high_risk_bp)
    app.register_blueprint(referrals_bp)
    
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
    app.run(debug=True, port=5000)
