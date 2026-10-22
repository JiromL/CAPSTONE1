"""WSGI entry point for production (gunicorn/uWSGI)."""
from app import app

application = app  # some WSGI servers expect `application`
