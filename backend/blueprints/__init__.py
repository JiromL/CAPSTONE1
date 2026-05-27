"""
Blueprints package initialization
"""

from .auth import auth_bp
from .assessments import assessments_bp
from .intake import intake_bp
from .appointments import appointments_bp
from .availability import availability_bp
from .documentation import documentation_bp
from .counseling import counseling_bp
from .high_risk import high_risk_bp, dashboard_bp
from .referrals import referrals_bp
from .check_ins import check_ins_bp
from .integrations import integrations_bp
from .cases import cases_bp
from .resources import resources_bp
from .users import users_bp
from .analytics import analytics_bp
from .client_tracking import client_tracking_bp

__all__ = [
    'auth_bp',
    'assessments_bp',
    'intake_bp',
    'appointments_bp',
    'availability_bp',
    'documentation_bp',
    'counseling_bp',
    'high_risk_bp',
    'dashboard_bp',
    'referrals_bp',
    'check_ins_bp',
    'integrations_bp',
    'cases_bp',
    'resources_bp',
    'users_bp',
    'analytics_bp',
    'client_tracking_bp',
]
