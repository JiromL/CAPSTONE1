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
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from datetime import datetime

from config import config
from models import db, UserRole, PermissionType, RiskLevel

from blueprints import (
    auth_bp,
    assessments_bp,
    intake_bp,
    appointments_bp,
    availability_bp,
    documentation_bp,
    counseling_bp,
    high_risk_bp,
    dashboard_bp,
    referrals_bp,
    check_ins_bp,
    integrations_bp,
    cases_bp,
    resources_bp,
    users_bp,
    analytics_bp,
    client_tracking_bp,
)
from blueprints.staff_settings import staff_settings_bp
from blueprints.google_calendar import calendar_bp
from blueprints.mhbot_integration import mhbot_bp
from blueprints.engagement import engagement_bp
from blueprints.appointments_enhancements import appointments_enh_bp
from blueprints.appointments_dashboard import appointments_dashboard_bp
from blueprints.scheduling_reports import scheduling_reports_bp
from blueprints.conflict_resolution import conflict_resolution_bp
from blueprints.matching_algorithm import matching_algorithm_bp
from blueprints.case_management import case_management_bp
from blueprints.reminders import reminders_bp
from blueprints.feedback import feedback_bp
from blueprints.c2c_referral import c2c_referral_bp
from blueprints.waitlist import waitlist_bp
from blueprints.qr_checkin import qr_bp
from blueprints.consent import consent_bp
from blueprints.announcements import announcements_bp
from blueprints.reports import reports_bp
from blueprints.communications import communications_bp
from blueprints.holidays import holidays_bp

def create_app(config_name=None):
    """Application factory"""
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')
    
    app = Flask(__name__)
    app.config.from_object(config.get(config_name, config['development']))

    # The built-in defaults are public (they are in this repository). Anyone who knows them
    # could forge a login token, so production refuses to start without real secrets.
    if config_name == 'production':
        weak = [k for k in ('SECRET_KEY', 'JWT_SECRET_KEY')
                if not os.getenv(k) or 'change-in-production' in str(app.config.get(k))]
        if weak:
            raise RuntimeError(f"Set {', '.join(weak)} in the environment before running in production.")
    
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
    # CORS — restrict to configured frontend origin in production
    allowed_origin = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    CORS(app, resources={r"/api/*": {"origins": [allowed_origin, "http://localhost:3000"]}})
    jwt = JWTManager(app)

    # Rate limiter — memory storage is fine for single-process; swap to Redis in prod
    from limiter_instance import limiter
    from flask_limiter.errors import RateLimitExceeded
    limiter.init_app(app)

    @app.errorhandler(RateLimitExceeded)
    def handle_rate_limit(e):
        return jsonify({'error': 'Too many requests. Please wait and try again.', 'retry_after': str(e.retry_after)}), 429

    # Initialize MongoDB
    mongodb = db.init_app(app)
    # expose db on app for integrations and blueprints
    app.db = mongodb
    
    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(assessments_bp)
    app.register_blueprint(intake_bp)
    app.register_blueprint(appointments_bp)
    app.register_blueprint(availability_bp)
    app.register_blueprint(documentation_bp)
    app.register_blueprint(counseling_bp)
    app.register_blueprint(high_risk_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(referrals_bp)
    app.register_blueprint(check_ins_bp)
    app.register_blueprint(integrations_bp)
    app.register_blueprint(cases_bp)
    app.register_blueprint(resources_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(calendar_bp)
    app.register_blueprint(mhbot_bp)
    app.register_blueprint(engagement_bp)
    app.register_blueprint(appointments_enh_bp)
    app.register_blueprint(appointments_dashboard_bp)
    app.register_blueprint(client_tracking_bp)
    app.register_blueprint(staff_settings_bp)
    app.register_blueprint(scheduling_reports_bp)
    app.register_blueprint(conflict_resolution_bp)
    app.register_blueprint(matching_algorithm_bp)
    app.register_blueprint(case_management_bp)
    app.register_blueprint(reminders_bp)
    app.register_blueprint(feedback_bp)
    app.register_blueprint(c2c_referral_bp)
    app.register_blueprint(waitlist_bp)
    app.register_blueprint(qr_bp)
    app.register_blueprint(consent_bp)
    app.register_blueprint(announcements_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(communications_bp)
    app.register_blueprint(holidays_bp)

    # Start background reminder scheduler (not during tests: it syncs EMA and
    # writes to the database)
    if not app.config.get('TESTING') and os.getenv('DISABLE_SCHEDULER') != '1':
        from scheduler import start_scheduler
        start_scheduler(app)

    # One access rule for every URL that names a case or a record inside a case, so
    # sub-resources (notes, safety plans, check-ins, referrals…) follow the case page's rules
    @app.before_request
    def enforce_case_record_access():
        from flask import request, jsonify
        from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
        from utils import record_access_error
        if request.method == 'OPTIONS' or not request.view_args:
            return None
        try:
            verify_jwt_in_request(optional=True)
            user_id = get_jwt_identity()
        except Exception:
            return None   # the route's own @jwt_required reports bad or expired tokens
        if not user_id:
            return None
        denied = record_access_error(mongodb, user_id, request.view_args)
        if denied:
            return jsonify({'error': denied[0]}), denied[1]
        return None

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
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
