"""Integration stubs for external providers"""
from .google import GoogleIntegration, GoogleMeetIntegration
from .zoom import ZoomIntegration
from .pandadoc import PandaDocIntegration
from .email import EmailIntegration
from .qr import generate_qr

__all__ = [
    'GoogleIntegration',
    'GoogleMeetIntegration',
    'ZoomIntegration',
    'PandaDocIntegration',
    'EmailIntegration',
    'generate_qr',
]
