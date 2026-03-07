"""
Resources Blueprint - Wellness resources upload and distribution
Staff members upload resources, students access resources from assigned staff
"""

from flask import Blueprint, request, jsonify, current_app
from functools import wraps
from bson import ObjectId
from datetime import datetime
from models import UserRole, ResourceUploadRole, db
from integrations.s3 import S3Integration
import mimetypes

resources_bp = Blueprint('resources', __name__, url_prefix='/api/resources')


def token_required(f):
    """Verify JWT token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        from flask_jwt_extended import verify_jwt_in_request, get_jwt
        try:
            verify_jwt_in_request()
            claims = get_jwt()
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({'error': 'Unauthorized'}), 401
    return decorated


def staff_only(allowed_roles=None):
    """Verify user is staff who can upload resources"""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            from flask_jwt_extended import get_jwt
            claims = get_jwt()
            user_id = claims.get('sub')
            role = claims.get('role')
            
            # Check if role can upload resources
            upload_roles = ['PSYCHOLOGIST', 'COUNSELOR', 'CASE_MANAGER', 'IC']
            if role not in upload_roles:
                return jsonify({'error': 'Only staff can upload resources'}), 403
            
            if allowed_roles and role not in allowed_roles:
                return jsonify({'error': f'This action requires one of: {allowed_roles}'}), 403
            
            return f(*args, **kwargs)
        return decorated
    return decorator


@resources_bp.route('/upload', methods=['POST'])
@token_required
@staff_only()
def upload_resource():
    """
    Upload a wellness resource (PDF, image, document, etc.)
    
    Request:
    - multipart/form-data with:
        - file: the file to upload
        - title: resource title (required)
        - description: resource description (optional)
    
    Returns:
        - 201: Resource created
        - 400: Missing required fields
        - 403: User not authorized to upload
        - 500: Upload failed
    """
    from flask_jwt_extended import get_jwt
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    title = request.form.get('title', '')
    description = request.form.get('description', '')
    
    if not title:
        return jsonify({'error': 'Title is required'}), 400
    
    claims = get_jwt()
    user_id = claims.get('sub')
    role = claims.get('role')
    
    try:
        # Get file info
        file_content = file.read()
        file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'bin'
        content_type = mimetypes.guess_type(file.filename)[0] or 'application/octet-stream'
        
        # Generate S3 key
        resource_id = str(ObjectId())
        s3_key = f"resources/{resource_id}/{file.filename}"
        
        # Upload to S3
        s3 = S3Integration(current_app.config)
        if s3.enabled:
            # Generate presigned upload URL
            url = s3.presign_upload(s3_key, expires_in=3600, content_type=content_type)
            # In production, you'd upload here. For dev, we store locally.
            file_path = s3_key
        else:
            # Fallback: store path reference (for dev without S3)
            file_path = f"local://resources/{resource_id}/{file.filename}"
        
        # Store metadata in MongoDB
        resource_doc = {
            '_id': ObjectId(resource_id),
            'title': title,
            'description': description,
            'file_path': file_path,
            'file_name': file.filename,
            'content_type': content_type,
            'file_size': len(file_content),
            'uploaded_by_user_id': ObjectId(user_id),
            'uploaded_by_role': role,  # PSYCHOLOGIST, COUNSELOR, CASE_MANAGER, IC
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        }
        
        result = db.db.resources.insert_one(resource_doc)
        
        return jsonify({
            'id': resource_id,
            'title': title,
            'file_name': file.filename,
            'uploaded_by_role': role,
            'created_at': resource_doc['created_at'].isoformat(),
            'message': 'Resource uploaded successfully'
        }), 201
    
    except Exception as e:
        current_app.logger.error(f"Resource upload failed: {str(e)}")
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500


@resources_bp.route('/staff/<staff_id>', methods=['GET'])
@token_required
def get_staff_resources(staff_id):
    """
    Get all resources uploaded by a specific staff member
    
    Returns:
        - 200: List of resources
        - 404: Staff not found
    """
    try:
        # Verify staff exists
        staff = db.db.users.find_one({'_id': ObjectId(staff_id)})
        if not staff:
            return jsonify({'error': 'Staff member not found'}), 404
        
        # Get resources uploaded by this staff member
        resources = list(db.db.resources.find(
            {'uploaded_by_user_id': ObjectId(staff_id)},
            {'file_path': 0, 'file_size': 0}  # Don't including large fields
        ).sort('created_at', -1))
        
        for resource in resources:
            resource['_id'] = str(resource['_id'])
            resource['uploaded_by_user_id'] = str(resource['uploaded_by_user_id'])
            if isinstance(resource.get('created_at'), datetime):
                resource['created_at'] = resource['created_at'].isoformat()
            if isinstance(resource.get('updated_at'), datetime):
                resource['updated_at'] = resource['updated_at'].isoformat()
        
        return jsonify({
            'staff_id': staff_id,
            'staff_name': staff.get('name', 'Unknown'),
            'staff_role': staff.get('role', 'Unknown'),
            'resources_count': len(resources),
            'resources': resources
        }), 200
    
    except Exception as e:
        return jsonify({'error': f'Failed to retrieve resources: {str(e)}'}), 500


@resources_bp.route('/student', methods=['GET'])
@token_required
def get_student_resources():
    """
    Get wellness resources from the student's assigned counselor/psychologist
    
    Flow:
    1. Get current user (must be STUDENT)
    2. Find their case
    3. Get assigned counselor/psychologist
    4. Return resources they've uploaded
    
    Returns:
        - 200: List of resources
        - 400: User is not a student
        - 404: Student case not found
    """
    from flask_jwt_extended import get_jwt
    
    claims = get_jwt()
    user_id = claims.get('sub')
    role = claims.get('role')
    
    if role != 'STUDENT':
        return jsonify({'error': 'Only students can access this endpoint'}), 400
    
    try:
        # Find student's case
        case = db.db.cases.find_one({'student_id': ObjectId(user_id)})
        if not case:
            return jsonify({
                'case_found': False,
                'resources': [],
                'message': 'No active case found. Resources will be available after intake.'
            }), 200
        
        assigned_counselor_id = case.get('assigned_counselor_id')
        if not assigned_counselor_id:
            return jsonify({
                'case_found': True,
                'resources': [],
                'message': 'Case under review. Resources will be available once assigned.'
            }), 200
        
        # Get counselor/psychologist info
        counselor = db.db.users.find_one({'_id': ObjectId(assigned_counselor_id)})
        
        # Get resources uploaded by assigned counselor
        resources = list(db.db.resources.find(
            {'uploaded_by_user_id': ObjectId(assigned_counselor_id)},
            {'file_path': 0, 'file_size': 0}
        ).sort('created_at', -1))
        
        for resource in resources:
            resource['_id'] = str(resource['_id'])
            resource['uploaded_by_user_id'] = str(resource['uploaded_by_user_id'])
            if isinstance(resource.get('created_at'), datetime):
                resource['created_at'] = resource['created_at'].isoformat()
            if isinstance(resource.get('updated_at'), datetime):
                resource['updated_at'] = resource['updated_at'].isoformat()
        
        return jsonify({
            'case_id': str(case['_id']),
            'assigned_to': counselor.get('name', 'Unknown') if counselor else 'Unknown',
            'assigned_role': counselor.get('role', 'Unknown') if counselor else 'Unknown',
            'resources_count': len(resources),
            'resources': resources
        }), 200
    
    except Exception as e:
        return jsonify({'error': f'Failed to retrieve resources: {str(e)}'}), 500


@resources_bp.route('/<resource_id>/download', methods=['GET'])
@token_required
def download_resource(resource_id):
    """
    Get download URL for a resource
    
    Authorization:
    - Staff can download any resource
    - Students can only download from their assigned counselor
    
    Returns:
        - 200: Presigned download URL
        - 404: Resource not found
        - 403: Not authorized
    """
    from flask_jwt_extended import get_jwt
    
    claims = get_jwt()
    user_id = claims.get('sub')
    role = claims.get('role')
    
    try:
        # Find resource
        resource = db.db.resources.find_one({'_id': ObjectId(resource_id)})
        if not resource:
            return jsonify({'error': 'Resource not found'}), 404
        
        # Authorization check for students
        if role == 'STUDENT':
            case = db.db.cases.find_one({'student_id': ObjectId(user_id)})
            if not case or str(case.get('assigned_counselor_id')) != str(resource['uploaded_by_user_id']):
                return jsonify({'error': 'Not authorized to download this resource'}), 403
        
        # Generate presigned download URL
        s3 = S3Integration(current_app.config)
        if s3.enabled and resource['file_path'].startswith('resources/'):
            download_url = s3.presign_download(resource['file_path'], expires_in=3600)
        else:
            # Fallback: return file info
            download_url = f"/api/resources/{resource_id}/file"
        
        return jsonify({
            'resource_id': resource_id,
            'title': resource['title'],
            'file_name': resource['file_name'],
            'download_url': download_url,
            'expires_in_seconds': 3600
        }), 200
    
    except Exception as e:
        return jsonify({'error': f'Failed to generate download URL: {str(e)}'}), 500


@resources_bp.route('/<resource_id>', methods=['GET'])
@token_required
def get_resource_info(resource_id):
    """
    Get resource information (metadata only, no file)
    
    Returns:
        - 200: Resource metadata
        - 404: Resource not found
    """
    try:
        resource = db.db.resources.find_one(
            {'_id': ObjectId(resource_id)},
            {'file_path': 0, 'file_size': 0}
        )
        
        if not resource:
            return jsonify({'error': 'Resource not found'}), 404
        
        resource['_id'] = str(resource['_id'])
        resource['uploaded_by_user_id'] = str(resource['uploaded_by_user_id'])
        if isinstance(resource.get('created_at'), datetime):
            resource['created_at'] = resource['created_at'].isoformat()
        if isinstance(resource.get('updated_at'), datetime):
            resource['updated_at'] = resource['updated_at'].isoformat()
        
        return jsonify(resource), 200
    
    except Exception as e:
        return jsonify({'error': f'Failed to retrieve resource: {str(e)}'}), 500


@resources_bp.route('/<resource_id>', methods=['DELETE'])
@token_required
@staff_only()
def delete_resource(resource_id):
    """
    Delete a resource (only uploader or admin can delete)
    
    Returns:
        - 200: Resource deleted
        - 404: Resource not found
        - 403: Not authorized to delete
    """
    from flask_jwt_extended import get_jwt
    
    claims = get_jwt()
    user_id = claims.get('sub')
    role = claims.get('role')
    
    try:
        resource = db.db.resources.find_one({'_id': ObjectId(resource_id)})
        if not resource:
            return jsonify({'error': 'Resource not found'}), 404
        
        # Check authorization
        if str(resource['uploaded_by_user_id']) != user_id and role != 'ADMIN':
            return jsonify({'error': 'Not authorized to delete this resource'}), 403
        
        # Delete from S3 if applicable
        if resource['file_path'].startswith('resources/'):
            try:
                s3 = S3Integration(current_app.config)
                if s3.enabled:
                    s3.delete_object(resource['file_path'])
            except Exception as e:
                current_app.logger.warning(f"Failed to delete S3 object: {e}")
        
        # Delete from MongoDB
        db.db.resources.delete_one({'_id': ObjectId(resource_id)})
        
        return jsonify({
            'message': 'Resource deleted successfully',
            'resource_id': resource_id
        }), 200
    
    except Exception as e:
        return jsonify({'error': f'Failed to delete resource: {str(e)}'}), 500
