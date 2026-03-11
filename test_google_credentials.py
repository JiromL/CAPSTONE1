#!/usr/bin/env python3
"""Test Google Service Account credentials are properly configured"""

import json
import os
import sys
from pathlib import Path

# Load the .env file
env_file = Path('/Users/jeromelouiesantos/CAPSTONE1/backend/.env')
env_vars = {}

with open(env_file) as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#'):
            if '=' in line:
                key, value = line.split('=', 1)
                env_vars[key.strip()] = value.strip()

# Verify Google credentials are loaded
print('✓ Google Service Account Email:', env_vars.get('GOOGLE_SERVICE_ACCOUNT_EMAIL', 'NOT FOUND'))

# Parse and validate the JSON key
try:
    key_json = json.loads(env_vars.get('GOOGLE_SERVICE_ACCOUNT_KEY', '{}'))
    print('✓ Google Service Account Key: Valid JSON')
    print('  - Project ID:', key_json.get('project_id'))
    print('  - Client Email:', key_json.get('client_email'))
    print('  - Private Key ID:', key_json.get('private_key_id')[:8] + '...')
    print('\n✅ Google credentials successfully configured!')
except Exception as e:
    print('✗ Error parsing Google credentials:', str(e))
    sys.exit(1)
