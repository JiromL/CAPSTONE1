"""Run tests against the testing config (database cps_system_test) with the
background scheduler off, so tests never touch development data or call EMA."""
import os
import sys

os.environ['FLASK_ENV'] = 'testing'
os.environ['DISABLE_SCHEDULER'] = '1'
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
