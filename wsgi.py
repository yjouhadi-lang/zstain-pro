"""
WSGI entry point for production deployment.
"""
import sys
sys.path.insert(0, '.')

from releve_app.web.app import create_app

app = create_app()
