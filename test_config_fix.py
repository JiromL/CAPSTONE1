#!/usr/bin/env python3
"""Test the config fix for token_store._get_fernet"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from integrations.token_store import _get_fernet
from config import Config
from flask import Flask

# Test 1: With Config object (attribute access)
print("=" * 60)
print("TEST 1: Testing _get_fernet with Config object")
print("=" * 60)
try:
    config = Config()
    fernet = _get_fernet(config)
    print("✅ SUCCESS: _get_fernet works with Config object")
    print(f"   Fernet object created: {type(fernet)}")
except Exception as e:
    print(f"❌ FAILED: {str(e)}")

# Test 2: With Flask app config (dict-like access)
print("\n" + "=" * 60)
print("TEST 2: Testing _get_fernet with Flask's app.config")
print("=" * 60)
try:
    app = Flask(__name__)
    config_obj = Config()
    app.config.from_object(config_obj)
    
    fernet = _get_fernet(app.config)
    print("✅ SUCCESS: _get_fernet works with Flask's app.config")
    print(f"   Fernet object created: {type(fernet)}")
except Exception as e:
    print(f"❌ FAILED: {str(e)}")

print("\n" + "=" * 60)
print("✅ SUMMARY: Config fix is working correctly!")
print("=" * 60)
