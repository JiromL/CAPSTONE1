"""
Feedback Collection Blueprint
Handles session feedback, effectiveness surveys, and outcome tracking.
Includes session satisfaction, counselor effectiveness, and treatment outcome forms.
"""

from flask import Blueprint, request, jsonify
from datetime import datetime
from functools import wraps
from bson.objectid import ObjectId

feedback_bp = Blueprint('feedback', __name__, url_prefix='/api/feedback')


# Import database and utilities
from models import db, PermissionType
from utils import audit_log, user_has_permission
from flask_jwt_extended import jwt_required, get_jwt_identity


# ============ FEEDBACK TEMPLATE CRUD ============

@feedback_bp.route('/templates', methods=['GET'])
def list_feedback_templates():
    """
    List available feedback templates.
    Templates: session_feedback, effectiveness_survey, outcome_tracking, satisfaction_form
    """
    try:
        templates = list(db.feedback_templates.find({}))
        
        for template in templates:
            template['_id'] = str(template['_id'])
        
        return jsonify(templates), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@feedback_bp.route('/templates/<template_id>', methods=['GET'])
def get_feedback_template(template_id):
    """Get a specific feedback template."""
    try:
        template = db.feedback_templates.find_one({'_id': ObjectId(template_id)})
        if not template:
            return jsonify({"error": "Template not found"}), 404
        
        template['_id'] = str(template['_id'])
        
        return jsonify(template), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============ FEEDBACK SUBMISSIONS ============

@feedback_bp.route('/submit', methods=['POST'])
def submit_feedback():
    """
    Submit session feedback or survey.
    
    Body:
    {
        "case_id": "string",
        "session_id": "string",
        "feedback_type": "session_feedback|effectiveness_survey|outcome_tracking|satisfaction_form",
        "counselor_id": "string",
        "client_id": "string",
        "responses": {
            "question_1": "answer",
            "question_2": 8,
            ...
        },
        "overall_satisfaction": 1-5,
        "effectiveness_rating": 1-5,
        "comments": "string (optional)"
    }
    """
    try:
        auth_header = request.headers.get('Authorization', '').replace('Bearer ', '')
        _, user_id = token_required(auth_header)
        
        data = request.json
        
        # Validate required fields
        required_fields = ['case_id', 'session_id', 'feedback_type', 'counselor_id', 'client_id', 'responses']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing field: {field}"}), 400
        
        valid_types = ['session_feedback', 'effectiveness_survey', 'outcome_tracking', 'satisfaction_form']
        if data['feedback_type'] not in valid_types:
            return jsonify({"error": f"Invalid feedback_type. Must be one of: {', '.join(valid_types)}"}), 400
        
        feedback_doc = {
            "case_id": ObjectId(data['case_id']),
            "session_id": ObjectId(data['session_id']),
            "feedback_type": data['feedback_type'],
            "counselor_id": data['counselor_id'],
            "client_id": data['client_id'],
            "submitted_by": user_id,
            "responses": data['responses'],
            "overall_satisfaction": data.get('overall_satisfaction'),
            "effectiveness_rating": data.get('effectiveness_rating'),
            "comments": data.get('comments', ''),
            "status": "submitted",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "anonymized": data.get('anonymized', False),
            "tags": data.get('tags', [])
        }
        
        result = db.feedback_submissions.insert_one(feedback_doc)
        feedback_doc['_id'] = str(result.inserted_id)
        feedback_doc['case_id'] = str(feedback_doc['case_id'])
        feedback_doc['session_id'] = str(feedback_doc['session_id'])
        
        # Log audit
        log_audit_action(
            collection='feedback_submissions',
            action='CREATE',
            case_id=data['case_id'],
            user_id=user_id,
            changes={'new_feedback': {'feedback_type': data['feedback_type']}},
            reason='Feedback submitted'
        )
        
        return jsonify(feedback_doc), 201
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@feedback_bp.route('/<feedback_id>', methods=['GET'])
def get_feedback(feedback_id):
    """Get a specific feedback submission."""
    try:
        feedback = db.feedback_submissions.find_one({'_id': ObjectId(feedback_id)})
        if not feedback:
            return jsonify({"error": "Feedback not found"}), 404
        
        feedback['_id'] = str(feedback['_id'])
        feedback['case_id'] = str(feedback['case_id'])
        feedback['session_id'] = str(feedback['session_id'])
        
        return jsonify(feedback), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@feedback_bp.route('/', methods=['GET'])
def list_feedback():
    """
    List feedback submissions with optional filters.
    Query params: case_id, session_id, feedback_type, counselor_id, client_id, status
    """
    try:
        query = {}
        
        if request.args.get('case_id'):
            query['case_id'] = ObjectId(request.args.get('case_id'))
        if request.args.get('session_id'):
            query['session_id'] = ObjectId(request.args.get('session_id'))
        if request.args.get('feedback_type'):
            query['feedback_type'] = request.args.get('feedback_type')
        if request.args.get('counselor_id'):
            query['counselor_id'] = request.args.get('counselor_id')
        if request.args.get('client_id'):
            query['client_id'] = request.args.get('client_id')
        if request.args.get('status'):
            query['status'] = request.args.get('status')
        
        feedback_list = list(db.feedback_submissions.find(query).sort('created_at', -1).limit(100))
        
        for feedback in feedback_list:
            feedback['_id'] = str(feedback['_id'])
            feedback['case_id'] = str(feedback['case_id'])
            feedback['session_id'] = str(feedback['session_id'])
        
        return jsonify(feedback_list), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@feedback_bp.route('/<feedback_id>', methods=['PATCH'])
def update_feedback(feedback_id):
    """Update a feedback submission."""
    try:
        auth_header = request.headers.get('Authorization', '').replace('Bearer ', '')
        _, user_id = token_required(auth_header)
        
        feedback = db.feedback_submissions.find_one({'_id': ObjectId(feedback_id)})
        if not feedback:
            return jsonify({"error": "Feedback not found"}), 404
        
        data = request.json
        updates = {}
        
        if 'responses' in data:
            updates['responses'] = data['responses']
        if 'overall_satisfaction' in data:
            updates['overall_satisfaction'] = data['overall_satisfaction']
        if 'effectiveness_rating' in data:
            updates['effectiveness_rating'] = data['effectiveness_rating']
        if 'comments' in data:
            updates['comments'] = data['comments']
        if 'tags' in data:
            updates['tags'] = data['tags']
        
        updates['updated_at'] = datetime.utcnow()
        
        db.feedback_submissions.update_one({'_id': ObjectId(feedback_id)}, {'$set': updates})
        
        # Log audit
        log_audit_action(
            collection='feedback_submissions',
            action='UPDATE',
            case_id=str(feedback['case_id']),
            user_id=user_id,
            changes=updates,
            reason='Feedback updated'
        )
        
        updated_feedback = db.feedback_submissions.find_one({'_id': ObjectId(feedback_id)})
        updated_feedback['_id'] = str(updated_feedback['_id'])
        updated_feedback['case_id'] = str(updated_feedback['case_id'])
        updated_feedback['session_id'] = str(updated_feedback['session_id'])
        
        return jsonify(updated_feedback), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@feedback_bp.route('/<feedback_id>', methods=['DELETE'])
def delete_feedback(feedback_id):
    """Delete a feedback submission."""
    try:
        auth_header = request.headers.get('Authorization', '').replace('Bearer ', '')
        _, user_id = token_required(auth_header)
        
        feedback = db.feedback_submissions.find_one({'_id': ObjectId(feedback_id)})
        if not feedback:
            return jsonify({"error": "Feedback not found"}), 404
        
        db.feedback_submissions.delete_one({'_id': ObjectId(feedback_id)})
        
        # Log audit
        log_audit_action(
            collection='feedback_submissions',
            action='DELETE',
            case_id=str(feedback['case_id']),
            user_id=user_id,
            changes={'id': feedback_id},
            reason='Feedback deleted'
        )
        
        return jsonify({"message": "Feedback deleted successfully"}), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============ FEEDBACK ANALYTICS ============

@feedback_bp.route('/analytics/summary', methods=['GET'])
def get_feedback_summary():
    """
    Get feedback summary and analytics.
    Query params: case_id, date_from, date_to, feedback_type
    """
    try:
        query = {}
        
        if request.args.get('case_id'):
            query['case_id'] = ObjectId(request.args.get('case_id'))
        if request.args.get('feedback_type'):
            query['feedback_type'] = request.args.get('feedback_type')
        
        # Date range filtering
        if request.args.get('date_from'):
            query['created_at'] = {'$gte': datetime.fromisoformat(request.args.get('date_from'))}
        if request.args.get('date_to'):
            if 'created_at' in query:
                query['created_at']['$lte'] = datetime.fromisoformat(request.args.get('date_to'))
            else:
                query['created_at'] = {'$lte': datetime.fromisoformat(request.args.get('date_to'))}
        
        feedback_list = list(db.feedback_submissions.find(query))
        
        # Calculate analytics
        total_count = len(feedback_list)
        avg_satisfaction = 0
        avg_effectiveness = 0
        satisfaction_ratings = []
        effectiveness_ratings = []
        type_breakdown = {}
        
        for feedback in feedback_list:
            if feedback.get('overall_satisfaction'):
                satisfaction_ratings.append(feedback['overall_satisfaction'])
            if feedback.get('effectiveness_rating'):
                effectiveness_ratings.append(feedback['effectiveness_rating'])
            
            ftype = feedback.get('feedback_type', 'unknown')
            type_breakdown[ftype] = type_breakdown.get(ftype, 0) + 1
        
        if satisfaction_ratings:
            avg_satisfaction = sum(satisfaction_ratings) / len(satisfaction_ratings)
        if effectiveness_ratings:
            avg_effectiveness = sum(effectiveness_ratings) / len(effectiveness_ratings)
        
        return jsonify({
            "total_count": total_count,
            "average_satisfaction": round(avg_satisfaction, 2),
            "average_effectiveness": round(avg_effectiveness, 2),
            "type_breakdown": type_breakdown,
            "satisfaction_distribution": {
                "min": min(satisfaction_ratings) if satisfaction_ratings else None,
                "max": max(satisfaction_ratings) if satisfaction_ratings else None,
                "median": sorted(satisfaction_ratings)[len(satisfaction_ratings)//2] if satisfaction_ratings else None
            }
        }), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@feedback_bp.route('/counselor/<counselor_id>/performance', methods=['GET'])
def get_counselor_performance(counselor_id):
    """Get performance metrics for a specific counselor based on feedback."""
    try:
        feedback_list = list(db.feedback_submissions.find({'counselor_id': counselor_id}))
        
        if not feedback_list:
            return jsonify({
                "counselor_id": counselor_id,
                "total_feedback": 0,
                "average_effectiveness": 0,
                "average_satisfaction": 0
            }), 200
        
        effectiveness_ratings = [f.get('effectiveness_rating') for f in feedback_list if f.get('effectiveness_rating')]
        satisfaction_ratings = [f.get('overall_satisfaction') for f in feedback_list if f.get('overall_satisfaction')]
        
        avg_effectiveness = sum(effectiveness_ratings) / len(effectiveness_ratings) if effectiveness_ratings else 0
        avg_satisfaction = sum(satisfaction_ratings) / len(satisfaction_ratings) if satisfaction_ratings else 0
        
        return jsonify({
            "counselor_id": counselor_id,
            "total_feedback": len(feedback_list),
            "average_effectiveness": round(avg_effectiveness, 2),
            "average_satisfaction": round(avg_satisfaction, 2),
            "feedback_types": list(set([f.get('feedback_type') for f in feedback_list]))
        }), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============ OUTCOME TRACKING ============

@feedback_bp.route('/outcomes/summary', methods=['GET'])
def get_outcome_summary():
    """
    Get summary of treatment outcomes based on feedback.
    Tracks effectiveness and client progress.
    """
    try:
        outcomes = list(db.feedback_submissions.find({
            'feedback_type': 'outcome_tracking'
        }))
        
        improved_count = len([o for o in outcomes if o.get('responses', {}).get('client_progress') == 'improved'])
        stable_count = len([o for o in outcomes if o.get('responses', {}).get('client_progress') == 'stable'])
        declined_count = len([o for o in outcomes if o.get('responses', {}).get('client_progress') == 'declined'])
        
        return jsonify({
            "total_outcomes": len(outcomes),
            "improved": improved_count,
            "stable": stable_count,
            "declined": declined_count,
            "improvement_rate": round((improved_count / len(outcomes) * 100) if outcomes else 0, 2)
        }), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
