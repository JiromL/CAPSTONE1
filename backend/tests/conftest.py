"""Run tests against the testing config (database cps_system_test) with the
background scheduler and email off, so tests never touch development data, call EMA or email anyone."""
import os
import sys

os.environ['FLASK_ENV'] = 'testing'
os.environ['DISABLE_SCHEDULER'] = '1'
os.environ['EMAIL_DISABLED'] = '1'      # tests never send real email
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
