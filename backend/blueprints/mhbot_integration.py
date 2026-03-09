"""
MHBot Integration Blueprint
Integrates with MHBot Backend Server for PERMA tracking
Displays student mental health status (Excelling, Surviving, etc.)
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
import requests
from datetime import datetime
from models import db, PermissionType
from utils import user_has_permission
import os
import logging

logger = logging.getLogger(__name__)

mhbot_bp = Blueprint('mhbot', __name__, url_prefix='/api/mhbot')

# MHBot server URL
MHBOT_BASE_URL = os.getenv('MHBOT_BASE_URL', 'https://pchrd-ema.dlsu.edu.ph/backend')
MHBOT_API_TOKEN = os.getenv('MHBOT_API_TOKEN', '')


def get_perma_history(username: str, limit: int = 5) -> dict:
    """
    Fetch PERMA history from MHBot for a specific user
    
    Args:
        username: MHBot username (e.g., 'ema_lVk')
        limit: Number of records to fetch
    
    Returns:
        dict with 'success', 'data', and optional 'error'
    """
    try:
        # Check if token is configured
        if not MHBOT_API_TOKEN:
            logger.error('MHBOT_API_TOKEN not configured in .env')
            return {
                'success': False,
                'error': 'MHBot API token not configured',
                'data': []
            }
        
        url = f"{MHBOT_BASE_URL}/api/v1/dashboard/user_perma_history/{username}"
        headers = {
            'accept': 'application/json',
            'Authorization': f'Bearer {MHBOT_API_TOKEN}'
        }
        params = {
            'offset': 0,
            'limit': limit
        }
        
        logger.info(f'Fetching PERMA for {username} from {url}')
        response = requests.get(url, headers=headers, params=params, timeout=10)
        
        if response.status_code == 200:
            history = response.json()
            logger.info(f'Successfully fetched {len(history)} records for {username}')
            return {
                'success': True,
                'data': history,
                'latest_label': history[0]['perma_label'] if history and history[0]['perma_label'] else None,
                'latest_date': history[0]['date'] if history else None
            }
        else:
            error_detail = response.text if response.text else 'No response body'
            logger.error(f'MHBot API error {response.status_code}: {error_detail}')
            return {
                'success': False,
                'error': f'MHBot API error: {response.status_code} - {error_detail[:100]}',
                'data': []
            }
    except requests.exceptions.Timeout:
        logger.error(f'MHBot API timeout for {username}')
        return {
            'success': False,
            'error': 'MHBot API timeout (server not responding)',
            'data': []
        }
    except requests.exceptions.ConnectionError as e:
        logger.error(f'MHBot connection error: {str(e)}')
        return {
            'success': False,
            'error': f'Cannot connect to MHBot server: {str(e)[:100]}',
            'data': []
        }
    except Exception as e:
        logger.error(f'Failed to fetch PERMA data: {str(e)}', exc_info=True)
        return {
            'success': False,
            'error': f'Failed to fetch PERMA data: {str(e)}',
            'data': []
        }


@mhbot_bp.route('/perma/<username>', methods=['GET'])
@jwt_required()
def get_user_perma(username):
    """Get latest PERMA label for a user"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    limit = request.args.get('limit', 5, type=int)
    limit = min(limit, 100)  # Cap at 100
    
    result = get_perma_history(username, limit)
    
    if result['success']:
        return jsonify({
            'username': username,
            'latest_label': result['latest_label'],
            'latest_date': result['latest_date'],
            'history': result['data'],
            'status': 'ok'
        }), 200
    else:
        return jsonify({
            'error': result['error'],
            'username': username
        }), 400


@mhbot_bp.route('/students/pending', methods=['GET'])
@jwt_required()
def get_pending_students_with_perma():
    """
    Get pending appointments/cases with PERMA status
    Returns students with pending appointments and their latest PERMA label
    """
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        # Get pending appointments
        pending_appointments = db.db.appointments.find({
            'status': 'PENDING'
        }).sort('requested_start', -1)
        
        results = []
        for apt in pending_appointments:
            case = db.db.cases.find_one({'_id': apt.get('case_id')})
            if case:
                student = db.db.users.find_one({'_id': case.get('student_id')})
                if student:
                    # Get PERMA data if mhbot_username exists
                    perma_data = None
                    if student.get('mhbot_username'):
                        perma_result = get_perma_history(student['mhbot_username'], limit=1)
                        if perma_result['success']:
                            perma_data = {
                                'label': perma_result['latest_label'],
                                'date': perma_result['latest_date']
                            }
                    
                    results.append({
                        'appointment_id': str(apt['_id']),
                        'case_id': str(case['_id']),
                        'student_id': str(student['_id']),
                        'student_name': f"{student.get('first_name', '')} {student.get('last_name', '')}",
                        'student_email': student.get('email'),
                        'mhbot_username': student.get('mhbot_username'),
                        'requested_start': apt.get('requested_start'),
                        'requested_end': apt.get('requested_end'),
                        'appointment_type': apt.get('appointment_type'),
                        'perma_status': perma_data,
                        'case_status': case.get('status')
                    })
        
        return jsonify({
            'total': len(results),
            'students': results
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@mhbot_bp.route('/lookup', methods=['POST'])
@jwt_required()
def lookup_perma_by_username():
    """
    Lookup PERMA status by MHBot username
    POST body: {"username": "ema_lVk"}
    """
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    data = request.get_json()
    username = data.get('username', '').strip()
    
    if not username:
        return jsonify({'error': 'Username required'}), 400
    
    result = get_perma_history(username, limit=10)
    
    if result['success']:
        return jsonify({
            'username': username,
            'success': True,
            'latest_label': result['latest_label'],
            'latest_date': result['latest_date'],
            'history': result['data']
        }), 200
    else:
        return jsonify({
            'username': username,
            'success': False,
            'error': result['error']
        }), 400


@mhbot_bp.route('/case/<case_id>/link-mhbot', methods=['POST'])
@jwt_required()
def link_case_to_mhbot(case_id):
    """Link a case's student to their MHBot account"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    data = request.get_json()
    mhbot_username = data.get('mhbot_username', '').strip()
    
    if not mhbot_username:
        return jsonify({'error': 'MHBot username required'}), 400
    
    try:
        from bson import ObjectId
        cid = ObjectId(case_id)
        case = db.db.cases.find_one({'_id': cid})
    except:
        case = db.db.cases.find_one({'_id': case_id})
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    # Verify the username works with MHBot
    perma_result = get_perma_history(mhbot_username, limit=1)
    if not perma_result['success']:
        return jsonify({
            'error': 'Invalid MHBot username - could not fetch PERMA data',
            'mhbot_error': perma_result['error']
        }), 400
    
    try:
        # Update student's mhbot_username
        student_id = case.get('student_id')
        db.db.users.update_one(
            {'_id': student_id},
            {'$set': {
                'mhbot_username': mhbot_username,
                'mhbot_linked_at': datetime.utcnow()
            }}
        )
        
        return jsonify({
            'success': True,
            'message': 'MHBot username linked successfully',
            'case_id': str(case['_id']),
            'mhbot_username': mhbot_username,
            'latest_perma_label': perma_result['latest_label']
        }), 200
    
    except Exception as e:
        return jsonify({'error': f'Failed to link MHBot username: {str(e)}'}), 500


@mhbot_bp.route('/case/<case_id>/unlink-mhbot', methods=['POST'])
@jwt_required()
def unlink_case_from_mhbot(case_id):
    """Unlink a case's student from their MHBot account"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        from bson import ObjectId
        cid = ObjectId(case_id)
        case = db.db.cases.find_one({'_id': cid})
    except:
        case = db.db.cases.find_one({'_id': case_id})
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    try:
        student_id = case.get('student_id')
        old_username = db.db.users.find_one({'_id': student_id}).get('mhbot_username')
        
        db.db.users.update_one(
            {'_id': student_id},
            {'$unset': {'mhbot_username': '', 'mhbot_linked_at': ''}}
        )
        
        return jsonify({
            'success': True,
            'message': 'MHBot username unlinked successfully',
            'removed_username': old_username
        }), 200
    
    except Exception as e:
        return jsonify({'error': f'Failed to unlink MHBot: {str(e)}'}), 500


@mhbot_bp.route('/stats/perma-distribution', methods=['GET'])
@jwt_required()
def get_perma_distribution():
    """Get distribution of PERMA labels across students"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        # Get all cases with students that have mhbot_username
        cases = db.db.cases.find({})
        
        perma_counts = {
            'Excelling': 0,
            'Thriving': 0,
            'Stable': 0,
            'Managing': 0,
            'Struggling': 0,
            'Surviving': 0,
            'Crisis': 0,
            'No Data': 0
        }
        
        total_students = 0
        
        for case in cases:
            student = db.db.users.find_one({'_id': case.get('student_id')})
            if student and student.get('mhbot_username'):
                total_students += 1
                perma_result = get_perma_history(student['mhbot_username'], limit=1)
                
                if perma_result['success'] and perma_result['latest_label']:
                    label = perma_result['latest_label']
                    if label in perma_counts:
                        perma_counts[label] += 1
                    else:
                        perma_counts['No Data'] += 1
                else:
                    perma_counts['No Data'] += 1
        
        return jsonify({
            'total_students_tracked': total_students,
            'distribution': perma_counts
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@mhbot_bp.route('/health', methods=['GET'])
def check_mhbot_health():
    """Check if MHBot server is accessible and token is configured"""
    try:
        # Check configuration
        if not MHBOT_API_TOKEN:
            return jsonify({
                'status': 'error',
                'mhbot_server': MHBOT_BASE_URL,
                'error': 'MHBOT_API_TOKEN not configured in .env file'
            }), 500
        
        url = f"{MHBOT_BASE_URL}/ping"
        headers = {'Authorization': f'Bearer {MHBOT_API_TOKEN}'}
        
        response = requests.get(url, headers=headers, timeout=5)
        
        if response.status_code == 200:
            return jsonify({
                'status': 'healthy',
                'mhbot_server': MHBOT_BASE_URL,
                'message': 'MHBot server is reachable',
                'token_configured': bool(MHBOT_API_TOKEN)
            }), 200
        else:
            return jsonify({
                'status': 'unhealthy',
                'mhbot_server': MHBOT_BASE_URL,
                'error': f'HTTP {response.status_code}: {response.text[:100]}',
                'token_configured': bool(MHBOT_API_TOKEN)
            }), 503
    
    except requests.exceptions.Timeout:
        return jsonify({
            'status': 'timeout',
            'mhbot_server': MHBOT_BASE_URL,
            'error': 'MHBot server not responding',
            'token_configured': bool(MHBOT_API_TOKEN)
        }), 503
    except requests.exceptions.ConnectionError as e:
        return jsonify({
            'status': 'error',
            'mhbot_server': MHBOT_BASE_URL,
            'error': f'Cannot connect: {str(e)[:100]}',
            'token_configured': bool(MHBOT_API_TOKEN)
        }), 503
    except Exception as e:
        return jsonify({
            'status': 'error',
            'mhbot_server': MHBOT_BASE_URL,
            'error': str(e),
            'token_configured': bool(MHBOT_API_TOKEN)
        }), 500
