"""
Counselor Availability Management
Endpoints for creating, updating, and retrieving counselor availability slots
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from models import db, PermissionType
from utils import user_has_permission
from datetime import datetime, timedelta

availability_bp = Blueprint('availability', __name__, url_prefix='/api/availability')


# ============================================================================
# COUNSELOR AVAILABILITY MANAGEMENT
# ============================================================================

@availability_bp.route('/set-availability', methods=['POST'])
@jwt_required()
def set_availability():
    """Create or update counselor's availability slots"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    try:
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        user = db.db.users.find_one({"_id": user_id_obj})
    except:
        user = db.db.users.find_one({"_id": user_id})
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Only counselors and staff can set their availability
    if user.get('role') not in ['COUNSELOR', 'PSYCHOLOGIST', 'CSC', 'CSP', 'ADMIN']:
        return jsonify({'error': 'Only counselors can set availability'}), 403
    
    # Get slots from request (array of time slots)
    slots = data.get('slots', [])
    if not slots:
        return jsonify({'error': 'No slots provided'}), 400
    
    created_slots = []
    
    for slot in slots:
        try:
            slot_start = datetime.fromisoformat(slot['start'])
            slot_end = datetime.fromisoformat(slot['end'])
        except (ValueError, KeyError):
            return jsonify({'error': 'Invalid slot format. Required: start, end (ISO format)'}), 400
        
        if slot_end <= slot_start:
            return jsonify({'error': 'Slot end must be after start'}), 400
        
        # Check for existing slot in same time range
        existing = db.db.counselor_availability.find_one({
            'counselor_id': user_id_obj,
            'slot_start': {'$lt': slot_end},
            'slot_end': {'$gt': slot_start}
        })
        
        if existing:
            # Update existing slot
            db.db.counselor_availability.update_one(
                {'_id': existing['_id']},
                {'$set': {
                    'slot_start': slot_start,
                    'slot_end': slot_end,
                    'is_available': True,
                    'updated_at': datetime.utcnow()
                }}
            )
            created_slots.append({
                'slot_id': str(existing['_id']),
                'slot_start': slot_start.isoformat(),
                'slot_end': slot_end.isoformat(),
                'status': 'updated'
            })
        else:
            # Create new slot
            new_slot = {
                'counselor_id': user_id_obj,
                'slot_start': slot_start,
                'slot_end': slot_end,
                'is_available': True,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }
            result = db.db.counselor_availability.insert_one(new_slot)
            created_slots.append({
                'slot_id': str(result.inserted_id),
                'slot_start': slot_start.isoformat(),
                'slot_end': slot_end.isoformat(),
                'status': 'created'
            })
    
    return jsonify({
        'message': f'Created/updated {len(created_slots)} availability slots',
        'slots': created_slots
    }), 201


@availability_bp.route('/my-availability', methods=['GET'])
@jwt_required()
def get_my_availability():
    """Get current user's availability slots"""
    user_id = get_jwt_identity()
    
    try:
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        user = db.db.users.find_one({"_id": user_id_obj})
    except:
        user = db.db.users.find_one({"_id": user_id})
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Get date range if provided
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    query = {'counselor_id': user_id_obj}
    
    if start_date and end_date:
        try:
            start = datetime.fromisoformat(start_date)
            end = datetime.fromisoformat(end_date)
            query['slot_start'] = {'$gte': start}
            query['slot_end'] = {'$lte': end}
        except ValueError:
            return jsonify({'error': 'Invalid datetime format'}), 400
    
    slots = list(db.db.counselor_availability.find(query).sort('slot_start', 1))
    
    result_slots = []
    for s in slots:
        result_slots.append({
            'slot_id': str(s['_id']),
            'slot_start': s['slot_start'].isoformat() if isinstance(s['slot_start'], datetime) else s['slot_start'],
            'slot_end': s['slot_end'].isoformat() if isinstance(s['slot_end'], datetime) else s['slot_end'],
            'is_available': s.get('is_available', True),
            'created_at': s['created_at'].isoformat() if isinstance(s['created_at'], datetime) else s['created_at']
        })
    
    return jsonify({
        'counselor_id': str(user_id_obj),
        'counselor_name': f"{user.get('first_name', '')} {user.get('last_name', '')}",
        'total_slots': len(slots),
        'slots': result_slots
    }), 200


@availability_bp.route('/counselor/<counselor_id>', methods=['GET'])
@jwt_required()
def get_counselor_availability(counselor_id):
    """Get specific counselor's availability slots (for scheduling)"""
    user_id = get_jwt_identity()
    
    try:
        cid = ObjectId(counselor_id) if isinstance(counselor_id, str) else counselor_id
    except:
        cid = counselor_id
    
    # Get date range
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    if not start_date or not end_date:
        return jsonify({'error': 'start_date and end_date required'}), 400
    
    try:
        start = datetime.fromisoformat(start_date)
        end = datetime.fromisoformat(end_date)
    except ValueError:
        return jsonify({'error': 'Invalid datetime format'}), 400
    
    # Get counselor info
    try:
        counselor = db.db.users.find_one({"_id": cid})
    except:
        counselor = db.db.users.find_one({"_id": ObjectId(counselor_id)})
    
    if not counselor:
        return jsonify({'error': 'Counselor not found'}), 404
    
    # Get slots
    query = {
        'counselor_id': counselor.get('_id'),
        'slot_start': {'$gte': start},
        'slot_end': {'$lte': end},
        'is_available': True
    }
    
    slots = list(db.db.counselor_availability.find(query).sort('slot_start', 1))
    
    # Filter out slots with conflicting appointments
    available_slots = []
    for slot in slots:
        # Check for conflicting confirmed appointments
        conflict = db.db.appointments.find_one({
            'counselor_id': counselor.get('_id'),
            'status': {'$in': ['CONFIRMED', 'MATCHED']},
            'requested_start': {'$lt': slot['slot_end']},
            'requested_end': {'$gt': slot['slot_start']}
        })
        
        if not conflict:
            available_slots.append({
                'slot_id': str(slot['_id']),
                'slot_start': slot['slot_start'].isoformat() if isinstance(slot['slot_start'], datetime) else slot['slot_start'],
                'slot_end': slot['slot_end'].isoformat() if isinstance(slot['slot_end'], datetime) else slot['slot_end'],
                'duration_minutes': int((slot['slot_end'] - slot['slot_start']).total_seconds() / 60)
            })
    
    return jsonify({
        'counselor_id': str(counselor.get('_id')),
        'counselor_name': f"{counselor.get('first_name', '')} {counselor.get('last_name', '')}",
        'available_slots': available_slots,
        'total_available': len(available_slots)
    }), 200


@availability_bp.route('/<slot_id>', methods=['DELETE'])
@jwt_required()
def delete_availability(slot_id):
    """Delete an availability slot"""
    user_id = get_jwt_identity()
    
    try:
        slot_id_obj = ObjectId(slot_id) if isinstance(slot_id, str) else slot_id
        slot = db.db.counselor_availability.find_one({"_id": slot_id_obj})
    except:
        slot = db.db.counselor_availability.find_one({"_id": slot_id})
    
    if not slot:
        return jsonify({'error': 'Slot not found'}), 404
    
    # Only the counselor or admin can delete their own slots
    user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
    user = db.db.users.find_one({"_id": user_id_obj})
    
    if slot['counselor_id'] != user_id_obj and user.get('role') != 'ADMIN':
        return jsonify({'error': 'Unauthorized'}), 403
    
    db.db.counselor_availability.delete_one({"_id": slot.get('_id')})
    
    return jsonify({'message': 'Availability slot deleted'}), 200


@availability_bp.route('/bulk-create', methods=['POST'])
@jwt_required()
def bulk_create_availability():
    """Create recurring availability slots (e.g., every Monday 2-4pm for 8 weeks)"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    try:
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        user = db.db.users.find_one({"_id": user_id_obj})
    except:
        user = db.db.users.find_one({"_id": user_id})
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if user.get('role') not in ['COUNSELOR', 'PSYCHOLOGIST', 'CSC', 'CSP', 'ADMIN']:
        return jsonify({'error': 'Only counselors can set availability'}), 403
    
    # Required fields
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    slot_start_time = data.get('slot_start_time')  # e.g., "14:00"
    slot_end_time = data.get('slot_end_time')      # e.g., "16:00"
    days_of_week = data.get('days_of_week', [])    # [0-6] Monday=0, Sunday=6
    
    if not all([start_date, end_date, slot_start_time, slot_end_time, days_of_week]):
        return jsonify({'error': 'Missing required fields: start_date, end_date, slot_start_time, slot_end_time, days_of_week'}), 400
    
    try:
        start = datetime.fromisoformat(start_date)
        end = datetime.fromisoformat(end_date)
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400
    
    # Parse times
    try:
        start_h, start_m = map(int, slot_start_time.split(':'))
        end_h, end_m = map(int, slot_end_time.split(':'))
    except:
        return jsonify({'error': 'Invalid time format. Use HH:MM'}), 400
    
    created_slots = []
    current = start
    
    # Generate slots for matching days within date range
    while current <= end:
        if current.weekday() in days_of_week:
            slot_start = current.replace(hour=start_h, minute=start_m, second=0)
            slot_end = current.replace(hour=end_h, minute=end_m, second=0)
            
            new_slot = {
                'counselor_id': user_id_obj,
                'slot_start': slot_start,
                'slot_end': slot_end,
                'is_available': True,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }
            
            result = db.db.counselor_availability.insert_one(new_slot)
            created_slots.append({
                'slot_id': str(result.inserted_id),
                'slot_start': slot_start.isoformat(),
                'slot_end': slot_end.isoformat()
            })
        
        current += timedelta(days=1)
    
    return jsonify({
        'message': f'Created {len(created_slots)} recurring availability slots',
        'total_slots': len(created_slots),
        'slots': created_slots
    }), 201
