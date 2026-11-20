"""
Resources Blueprint - Wellness resources upload and distribution

Who shares what:
- ADMIN and CASE_MANAGER share resources with every student (audience 'all').
- COUNSELOR, PSYCHOLOGIST and IC share with their own students (audience 'my_students'), or with
  every student when they choose 'all'.
- Link resources added without an uploader (the seeded CPS-wide links) are for every student.

Uploaded files are kept in MongoDB GridFS (bucket `resource_files`), so they survive redeploys on
hosts without a persistent disk, such as Render.
"""

import mimetypes
from datetime import datetime, timezone
from functools import wraps
from io import BytesIO

import gridfs
from bson import ObjectId
from flask import Blueprint, request, jsonify, current_app, send_file

from models import db
from utils import server_error

resources_bp = Blueprint('resources', __name__, url_prefix='/api/resources')

UPLOAD_ROLES = ['ADMIN', 'CASE_MANAGER', 'PSYCHOLOGIST', 'COUNSELOR', 'IC']
EVERYONE_ROLES = ['ADMIN', 'CASE_MANAGER']          # their uploads always go to every student
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'txt', 'png', 'jpg', 'jpeg', 'gif', 'ppt', 'pptx'}
MAX_FILE_BYTES = 10 * 1024 * 1024


def _files():
    return gridfs.GridFS(db.db, collection='resource_files')


def token_required(f):
    """Verify JWT token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        from flask_jwt_extended import verify_jwt_in_request
        try:
            verify_jwt_in_request()
        except Exception:
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated


def staff_only(allowed_roles=None):
    """Verify user is staff who can share resources"""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            from flask_jwt_extended import get_jwt
            role = get_jwt().get('role')
            if role not in UPLOAD_ROLES:
                return jsonify({'error': 'Only CPS staff can share resources'}), 403
            if allowed_roles and role not in allowed_roles:
                return jsonify({'error': f'This action requires one of: {allowed_roles}'}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator


def _for_everyone():
    """Query for resources every student sees"""
    return {'is_active': {'$ne': False},
            '$or': [{'uploaded_by_user_id': {'$exists': False}}, {'audience': 'all'}]}


def _student_staff_ids(student_id):
    """Staff whose 'my_students' resources this student sees: the assigned counselor or
    psychologist, and the intake counselor."""
    ids = set()
    for case in db.db.cases.find({'student_id': ObjectId(student_id)},
                                 {'assigned_counselor_id': 1, 'intake_counselor_id': 1}):
        ids.update(x for x in (case.get('assigned_counselor_id'), case.get('intake_counselor_id')) if x)
    return ids


def _student_can_see(resource, student_id):
    if resource.get('is_active') is False:
        return False
    if not resource.get('uploaded_by_user_id') or resource.get('audience') == 'all':
        return True
    return resource['uploaded_by_user_id'] in _student_staff_ids(student_id)


def _public(resource):
    """A resource as the API returns it"""
    out = {k: v for k, v in resource.items() if k not in ('file_id', 'file_path')}
    out['_id'] = str(resource['_id'])
    out['has_file'] = bool(resource.get('file_id'))
    out['file_type'] = resource.get('file_type') or resource.get('content_type') or ('link' if resource.get('url') else '')
    if resource.get('uploaded_by_user_id'):   # link resources have no uploader
        out['uploaded_by_user_id'] = str(resource['uploaded_by_user_id'])
    for key in ('created_at', 'updated_at'):
        if isinstance(resource.get(key), datetime):
            out[key] = resource[key].isoformat()
    return out


@resources_bp.route('/upload', methods=['POST'])
@token_required
@staff_only()
def upload_resource():
    """
    Share a wellness resource: a file (PDF, image, document) or a link.

    Request (multipart/form-data):
        - file: the file to upload, or
        - url: a link to share instead of a file
        - title (required), description, category
        - audience: 'all' or 'my_students' (ADMIN and CASE_MANAGER always share with all)

    Returns:
        - 201: Resource created
        - 400: Missing or invalid fields
        - 403: User not authorized to upload
    """
    from flask_jwt_extended import get_jwt

    claims = get_jwt()
    user_id, role = claims.get('sub'), claims.get('role')
    title = (request.form.get('title') or '').strip()
    description = (request.form.get('description') or '').strip()
    category = (request.form.get('category') or '').strip() or 'General'
    link = (request.form.get('url') or '').strip()
    audience = 'all' if role in EVERYONE_ROLES else request.form.get('audience', 'my_students')
    if audience not in ('all', 'my_students'):
        return jsonify({'error': "audience must be 'all' or 'my_students'"}), 400
    if not title:
        return jsonify({'error': 'Title is required'}), 400

    file = request.files.get('file')
    if (not file or not file.filename) and not link:
        return jsonify({'error': 'Choose a file or enter a link'}), 400
    if link and not link.startswith(('https://', 'http://')):
        return jsonify({'error': 'The link must start with https://'}), 400

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    doc = {
        '_id': ObjectId(), 'title': title, 'description': description, 'category': category,
        'audience': audience, 'is_active': True,
        'uploaded_by_user_id': ObjectId(user_id), 'uploaded_by_role': role,
        'created_at': now, 'updated_at': now,
    }
    try:
        if file and file.filename:
            ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
            if ext not in ALLOWED_EXTENSIONS:
                return jsonify({'error': f'File type .{ext or "?"} is not allowed. Use: {", ".join(sorted(ALLOWED_EXTENSIONS))}'}), 400
            content = file.read()
            if len(content) > MAX_FILE_BYTES:
                return jsonify({'error': 'The file is larger than 10 MB'}), 400
            content_type = mimetypes.guess_type(file.filename)[0] or 'application/octet-stream'
            doc['file_id'] = _files().put(content, filename=file.filename, content_type=content_type,
                                          resource_id=doc['_id'])
            doc.update(file_name=file.filename, content_type=content_type, file_type=content_type,
                       file_size=len(content))
        else:
            doc.update(url=link, file_type='link')

        db.db.resources.insert_one(doc)
        return jsonify({**_public(doc), 'message': 'Resource shared'}), 201

    except Exception as e:
        current_app.logger.error(f"Resource upload failed: {str(e)}")
        return server_error(e, 'Upload failed. Please try again.')


@resources_bp.route('/staff/<staff_id>', methods=['GET'])
@token_required
def get_staff_resources(staff_id):
    """
    Get all resources shared by a specific staff member

    Returns:
        - 200: List of resources
        - 404: Staff not found
    """
    try:
        staff = db.db.users.find_one({'_id': ObjectId(staff_id)})
        if not staff:
            return jsonify({'error': 'Staff member not found'}), 404
        resources = [_public(r) for r in db.db.resources.find({'uploaded_by_user_id': ObjectId(staff_id)}).sort('created_at', -1)]
        return jsonify({
            'staff_id': staff_id,
            'staff_name': staff.get('name', 'Unknown'),
            'staff_role': staff.get('role', 'Unknown'),
            'resources_count': len(resources),
            'resources': resources
        }), 200

    except Exception as e:
        return server_error(e, 'Failed to retrieve resources. Please try again.')


@resources_bp.route('/student', methods=['GET'])
@token_required
def get_student_resources():
    """
    Wellness resources for the Resources page. Students get the resources shared with every
    student plus those their own counselor, psychologist or intake counselor shared with them;
    staff get every active resource.

    Returns:
        - 200: List of resources
    """
    from flask_jwt_extended import get_jwt

    claims = get_jwt()
    user_id, role = claims.get('sub'), claims.get('role')

    def listing(query):
        return [_public(r) for r in db.db.resources.find(query).sort('created_at', -1)]

    try:
        if role != 'STUDENT':
            resources = listing({'is_active': {'$ne': False}})
            return jsonify({'resources_count': len(resources), 'resources': resources}), 200

        staff_ids = list(_student_staff_ids(user_id))
        query = _for_everyone()
        if staff_ids:
            query = {'is_active': {'$ne': False}, '$or': query['$or'] + [{'uploaded_by_user_id': {'$in': staff_ids}}]}
        resources = listing(query)
        return jsonify({
            'resources_count': len(resources),
            'resources': resources,
            'message': None if staff_ids else 'Your counselor can share more resources with you after your intake.',
        }), 200

    except Exception as e:
        return server_error(e, 'Failed to retrieve resources. Please try again.')


@resources_bp.route('/<resource_id>/download', methods=['GET'])
@token_required
def download_resource(resource_id):
    """
    Where to open a resource: its link, or the file route for uploaded files.

    Returns:
        - 200: {download_url}
        - 404: Resource not found
        - 403: Not authorized
    """
    from flask_jwt_extended import get_jwt

    claims = get_jwt()
    try:
        resource = db.db.resources.find_one({'_id': ObjectId(resource_id)})
        if not resource:
            return jsonify({'error': 'Resource not found'}), 404
        if claims.get('role') == 'STUDENT' and not _student_can_see(resource, claims.get('sub')):
            return jsonify({'error': 'Not authorized to download this resource'}), 403
        return jsonify({
            'resource_id': resource_id,
            'title': resource.get('title'),
            'file_name': resource.get('file_name'),
            'download_url': f"/api/resources/{resource_id}/file" if resource.get('file_id') else resource.get('url'),
        }), 200

    except Exception as e:
        return server_error(e, 'Failed to generate download URL. Please try again.')


@resources_bp.route('/<resource_id>/file', methods=['GET'])
@token_required
def get_resource_file(resource_id):
    """
    The uploaded file itself. Students only get files shared with them.

    Returns:
        - 200: the file
        - 404: Resource or file not found
        - 403: Not authorized
    """
    from flask_jwt_extended import get_jwt

    claims = get_jwt()
    try:
        resource = db.db.resources.find_one({'_id': ObjectId(resource_id)})
        if not resource or not resource.get('file_id'):
            return jsonify({'error': 'File not found'}), 404
        if claims.get('role') == 'STUDENT' and not _student_can_see(resource, claims.get('sub')):
            return jsonify({'error': 'Not authorized to download this resource'}), 403
        stored = _files().get(resource['file_id'])
        return send_file(BytesIO(stored.read()), mimetype=resource.get('content_type') or 'application/octet-stream',
                         as_attachment=request.args.get('download') == '1', download_name=resource.get('file_name') or 'resource')

    except gridfs.errors.NoFile:
        return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        return server_error(e, 'Failed to open the file. Please try again.')


@resources_bp.route('/<resource_id>', methods=['GET'])
@token_required
def get_resource_info(resource_id):
    """
    Get resource information (metadata only, no file)

    Returns:
        - 200: Resource metadata
        - 404: Resource not found
    """
    from flask_jwt_extended import get_jwt

    claims = get_jwt()
    try:
        resource = db.db.resources.find_one({'_id': ObjectId(resource_id)})
        if not resource or (claims.get('role') == 'STUDENT' and not _student_can_see(resource, claims.get('sub'))):
            return jsonify({'error': 'Resource not found'}), 404
        return jsonify(_public(resource)), 200

    except Exception as e:
        return server_error(e, 'Failed to retrieve resource. Please try again.')


@resources_bp.route('/<resource_id>', methods=['DELETE'])
@token_required
@staff_only()
def delete_resource(resource_id):
    """
    Delete a resource (only its uploader or an admin)

    Returns:
        - 200: Resource deleted
        - 404: Resource not found
        - 403: Not authorized to delete
    """
    from flask_jwt_extended import get_jwt

    claims = get_jwt()
    try:
        resource = db.db.resources.find_one({'_id': ObjectId(resource_id)})
        if not resource:
            return jsonify({'error': 'Resource not found'}), 404
        if str(resource.get('uploaded_by_user_id')) != claims.get('sub') and claims.get('role') != 'ADMIN':
            return jsonify({'error': 'Not authorized to delete this resource'}), 403

        if resource.get('file_id'):
            try:
                _files().delete(resource['file_id'])
            except Exception as e:
                current_app.logger.warning(f"Failed to delete resource file: {e}")
        db.db.resources.delete_one({'_id': ObjectId(resource_id)})
        return jsonify({'message': 'Resource deleted', 'resource_id': resource_id}), 200

    except Exception as e:
        return server_error(e, 'Failed to delete resource. Please try again.')
