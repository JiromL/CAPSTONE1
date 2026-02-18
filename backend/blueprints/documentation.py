"""
EPIC 5: CENTRALIZED DOCUMENTATION HUB
Blueprint for secure case file repository with version control and audit trails
"""

from flask import Blueprint, request, jsonify, send_file
from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from models import db, PermissionType
from utils import audit_log, user_has_permission
from datetime import datetime
import os
import json
from flask import send_file, redirect

documentation_bp = Blueprint('documentation', __name__, url_prefix='/api/documentation')


@documentation_bp.route('/case/<case_id>/documents', methods=['POST'])
@jwt_required()
def create_document(case_id):
    """Create a new case document (EPIC 5: Create Case File Repository)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        cid = ObjectId(case_id)
        case = db.db.cases.find_one({"_id": cid})
    except:
        case = db.db.cases.find_one({"_id": case_id})
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    data = request.get_json()
    
    if not data.get('document_type') or not data.get('title'):
        return jsonify({'error': 'document_type and title are required'}), 400
    
    document = {
        "case_id": case['_id'],
        "document_type": data['document_type'],
        "title": data['title'],
        "content": data.get('content'),
        "file_path": data.get('file_path'),
        "created_by_id": ObjectId(user_id) if isinstance(user_id, str) else user_id,
        "version": 1,
        "is_locked": False,
        "created_at": datetime.utcnow()
    }
    
    result = db.db.documents.insert_one(document)
    
    audit_log(db.db, 'document', 'create', entity_id=str(result.inserted_id), new_values={
        'document_type': data['document_type'],
        'title': data['title']
    })
    
    return jsonify({
        'document_id': str(result.inserted_id),
        'case_id': str(case['_id']),
        'document_type': data['document_type'],
        'title': data['title'],
        'created_at': document['created_at'].isoformat()
    }), 201


@documentation_bp.route('/case/<case_id>/documents', methods=['GET'])
@jwt_required()
def list_case_documents(case_id):
    """List all documents for a case (EPIC 5: Auto Timestamp for All Entries)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        cid = ObjectId(case_id)
        case = db.db.cases.find_one({"_id": cid})
    except:
        case = db.db.cases.find_one({"_id": case_id})
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    documents = list(db.db.documents.find({"case_id": case['_id']}))
    
    audit_log(db.db, 'documentation', 'list', entity_id=str(case['_id']))
    
    result_docs = []
    for d in documents:
        creator = db.db.users.find_one({"_id": d.get('created_by_id')})
        locked_by = db.db.users.find_one({"_id": d.get('locked_by_id')}) if d.get('locked_by_id') else None
        result_docs.append({
            'document_id': str(d['_id']),
            'document_type': d.get('document_type'),
            'title': d.get('title'),
            'version': d.get('version'),
            'created_at': d['created_at'].isoformat() if isinstance(d['created_at'], datetime) else d['created_at'],
            'created_by': f"{creator.get('first_name', '')} {creator.get('last_name', '')}" if creator else None,
            'is_locked': d.get('is_locked', False),
            'locked_by': f"{locked_by.get('first_name', '')} {locked_by.get('last_name', '')}" if locked_by else None
        })
    
    return jsonify({
        'case_id': str(case['_id']),
        'documents': result_docs
    }), 200


@documentation_bp.route('/documents/<document_id>', methods=['GET'])
@jwt_required()
def get_document(document_id):
    """Get document details (EPIC 5: Version History & Locking)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        did = ObjectId(document_id)
        document = db.db.documents.find_one({"_id": did})
    except:
        document = db.db.documents.find_one({"_id": document_id})
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    audit_log(db.db, 'documentation', 'view', entity_id=str(document['_id']))
    
    creator = db.db.users.find_one({"_id": document.get('created_by_id')})
    locked_by = db.db.users.find_one({"_id": document.get('locked_by_id')}) if document.get('locked_by_id') else None
    
    return jsonify({
        'document_id': str(document['_id']),
        'case_id': str(document.get('case_id')),
        'document_type': document.get('document_type'),
        'title': document.get('title'),
        'content': document.get('content'),
        'version': document.get('version'),
        'created_at': document['created_at'].isoformat() if isinstance(document['created_at'], datetime) else document['created_at'],
        'created_by': f"{creator.get('first_name', '')} {creator.get('last_name', '')}" if creator else None,
        'is_locked': document.get('is_locked', False),
        'locked_by': f"{locked_by.get('first_name', '')} {locked_by.get('last_name', '')}" if locked_by else None,
        'locked_at': document['locked_at'].isoformat() if isinstance(document.get('locked_at'), datetime) else document.get('locked_at')
    }), 200


@documentation_bp.route('/documents/<document_id>', methods=['PATCH'])
@jwt_required()
def update_document(document_id):
    """Update document content (EPIC 5: Version History & Locking)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_NOTES.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        did = ObjectId(document_id)
        document = db.db.documents.find_one({"_id": did})
    except:
        document = db.db.documents.find_one({"_id": document_id})
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    if document.get('is_locked'):
        return jsonify({'error': 'Document is locked'}), 403
    
    data = request.get_json()
    
    # Create version entry
    old_content = document.get('content')
    
    version = {
        "document_id": document['_id'],
        "version_number": document.get('version'),
        "content": old_content,
        "changed_by_id": ObjectId(user_id) if isinstance(user_id, str) else user_id,
        "change_summary": data.get('change_summary'),
        "created_at": datetime.utcnow()
    }
    
    db.db.document_versions.insert_one(version)
    
    # Update document
    update_data = {"updated_at": datetime.utcnow()}
    
    if 'content' in data:
        update_data['content'] = data['content']
    if 'title' in data:
        update_data['title'] = data['title']
    
    update_data['version'] = document.get('version', 1) + 1
    
    db.db.documents.update_one(
        {"_id": document['_id']},
        {"$set": update_data}
    )
    
    audit_log(db.db, 'documentation', 'update', entity_id=str(document['_id']), old_values={'content': old_content}, new_values={
        'content': data.get('content'),
        'version': update_data['version']
    })
    
    return jsonify({
        'message': 'Document updated',
        'document_id': str(document['_id']),
        'version': update_data['version']
    }), 200


@documentation_bp.route('/documents/<document_id>/lock', methods=['POST'])
@jwt_required()
def lock_document(document_id):
    """Lock document from editing (EPIC 5: Version History & Locking)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_NOTES.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        did = ObjectId(document_id)
        document = db.db.documents.find_one({"_id": did})
    except:
        document = db.db.documents.find_one({"_id": document_id})
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    db.db.documents.update_one(
        {"_id": document['_id']},
        {"$set": {
            "is_locked": True,
            "locked_by_id": ObjectId(user_id) if isinstance(user_id, str) else user_id,
            "locked_at": datetime.utcnow()
        }}
    )
    
    audit_log(db.db, 'documentation', 'lock', entity_id=str(document['_id']))
    
    return jsonify({'message': 'Document locked', 'document_id': str(document['_id'])}), 200


@documentation_bp.route('/documents/<document_id>/unlock', methods=['POST'])
@jwt_required()
def unlock_document(document_id):
    """Unlock document for editing"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_NOTES.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        did = ObjectId(document_id)
        document = db.db.documents.find_one({"_id": did})
    except:
        document = db.db.documents.find_one({"_id": document_id})
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    db.db.documents.update_one(
        {"_id": document['_id']},
        {"$set": {
            "is_locked": False,
            "locked_by_id": None,
            "locked_at": None
        }}
    )
    
    audit_log(db.db, 'documentation', 'unlock', entity_id=str(document['_id']))
    
    return jsonify({'message': 'Document unlocked', 'document_id': str(document['_id'])}), 200


@documentation_bp.route('/documents/<document_id>/versions', methods=['GET'])
@jwt_required()
def get_document_history(document_id):
    """Get document version history (EPIC 5: Version History & Locking)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        did = ObjectId(document_id)
        document = db.db.documents.find_one({"_id": did})
    except:
        document = db.db.documents.find_one({"_id": document_id})
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    versions = list(db.db.document_versions.find({"document_id": document['_id']}).sort("created_at", -1))
    
    result_versions = []
    for v in versions:
        changed_by = db.db.users.find_one({"_id": v.get('changed_by_id')})
        result_versions.append({
            'version_number': v.get('version_number'),
            'changed_by': f"{changed_by.get('first_name', '')} {changed_by.get('last_name', '')}" if changed_by else None,
            'change_summary': v.get('change_summary'),
            'created_at': v['created_at'].isoformat() if isinstance(v['created_at'], datetime) else v['created_at']
        })
    
    return jsonify({
        'document_id': str(document['_id']),
        'current_version': document.get('version'),
        'versions': result_versions
    }), 200


@documentation_bp.route('/case/<case_id>/search', methods=['GET'])
@jwt_required()
def search_case_documents(case_id):
    """Advanced search for case documents (EPIC 5: Advanced Search)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        cid = ObjectId(case_id)
        case = db.db.cases.find_one({"_id": cid})
    except:
        case = db.db.cases.find_one({"_id": case_id})
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    query_str = request.args.get('query', '')
    document_type = request.args.get('document_type')
    
    mongo_query = {"case_id": case['_id']}
    
    if query_str:
        mongo_query["$or"] = [
            {"title": {"$regex": query_str, "$options": "i"}},
            {"content": {"$regex": query_str, "$options": "i"}}
        ]
    
    if document_type:
        mongo_query["document_type"] = document_type
    
    documents = list(db.db.documents.find(mongo_query))
    
    return jsonify({
        'case_id': str(case['_id']),
        'search_results': [{
            'document_id': str(d['_id']),
            'title': d.get('title'),
            'document_type': d.get('document_type'),
            'created_at': d['created_at'].isoformat() if isinstance(d['created_at'], datetime) else d['created_at']
        } for d in documents],
        'total_results': len(documents)
    }), 200


@documentation_bp.route('/case/<case_id>/roi', methods=['POST'])
@jwt_required()
def upload_roi(case_id):
    """Upload ROI (Release of Information) document (EPIC 5: Secure File Upload)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        cid = ObjectId(case_id)
        case = db.db.cases.find_one({"_id": cid})
    except:
        case = db.db.cases.find_one({"_id": case_id})
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # In production, implement secure file upload with virus scanning
    file_path = f'uploads/{str(case["_id"])}/roi_{datetime.utcnow().timestamp()}.pdf'
    
    document = {
        "case_id": case['_id'],
        "document_type": 'roi',
        "title": f'ROI Upload - {datetime.utcnow().isoformat()}',
        "file_path": file_path,
        "created_by_id": ObjectId(user_id) if isinstance(user_id, str) else user_id,
        "version": 1,
        "is_locked": False,
        "created_at": datetime.utcnow()
    }
    
    result = db.db.documents.insert_one(document)
    
    audit_log(db.db, 'documentation', 'upload_roi', entity_id=str(result.inserted_id))
    
    return jsonify({
        'message': 'ROI uploaded',
        'document_id': str(result.inserted_id),
        'file_path': file_path
    }), 201


@documentation_bp.route('/case/<case_id>/presign-upload', methods=['POST'])
@jwt_required()
def presign_upload(case_id):
    """Return a presigned upload URL (S3) or fallback error if not configured."""
    user_id = get_jwt_identity()

    # Permission check
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403

    try:
        cid = ObjectId(case_id)
        case = db.db.cases.find_one({"_id": cid})
    except:
        case = db.db.cases.find_one({"_id": case_id})

    if not case:
        return jsonify({'error': 'Case not found'}), 404

    data = request.get_json() or {}
    filename = data.get('filename')
    content_type = data.get('content_type')
    if not filename:
        return jsonify({'error': 'filename required'}), 400

    from integrations.s3 import S3Integration
    s3 = S3Integration(current_app.config)
    if not s3.enabled:
        return jsonify({'error': 'S3 not configured'}), 400

    key = f"cases/{str(case['_id'])}/{filename}"
    try:
        url = s3.presign_upload(key, content_type=content_type)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    # create a document metadata placeholder
    document = {
        'case_id': case['_id'],
        'document_type': 'attachment',
        'title': filename,
        'file_path': None,
        's3_key': key,
        'created_by_id': ObjectId(user_id) if isinstance(user_id, str) else user_id,
        'version': 1,
        'is_locked': False,
        'created_at': __import__('datetime').datetime.utcnow(),
        'presigned_expires_at': __import__('datetime').datetime.utcnow()
    }

    res = db.db.documents.insert_one(document)

    return jsonify({'presigned_url': url, 'document_id': str(res.inserted_id)}), 200


@documentation_bp.route('/case/<case_id>/safety-plan', methods=['POST'])
@jwt_required()
def upload_safety_plan(case_id):
    """Upload safety plan (EPIC 5: Secure File Upload)"""
    user_id = get_jwt_identity()
    
    # Check permission
    if not user_has_permission(db.db, user_id, PermissionType.EDIT_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    try:
        cid = ObjectId(case_id)
        case = db.db.cases.find_one({"_id": cid})
    except:
        case = db.db.cases.find_one({"_id": case_id})
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    file_path = f'uploads/{str(case["_id"])}/safety_plan_{datetime.utcnow().timestamp()}.pdf'
    
    document = {
        "case_id": case['_id'],
        "document_type": 'safety_plan',
        "title": f'Safety Plan - {datetime.utcnow().isoformat()}',
        "file_path": file_path,
        "created_by_id": ObjectId(user_id) if isinstance(user_id, str) else user_id,
        "version": 1,
        "is_locked": False,
        "created_at": datetime.utcnow()
    }
    
    result = db.db.documents.insert_one(document)
    
    audit_log(db.db, 'documentation', 'upload_safety_plan', entity_id=str(result.inserted_id))
    
    return jsonify({
        'message': 'Safety plan uploaded',
        'document_id': str(result.inserted_id)
    }), 201


@documentation_bp.route('/documents/<document_id>/download', methods=['GET'])
@jwt_required()
def download_document(document_id):
    """Secure download for stored attachments or inline content"""
    user_id = get_jwt_identity()

    # Permission check
    if not user_has_permission(db.db, user_id, PermissionType.VIEW_CASE.value):
        return jsonify({'error': 'Insufficient permissions'}), 403

    try:
        did = ObjectId(document_id)
        document = db.db.documents.find_one({"_id": did})
    except:
        document = db.db.documents.find_one({"_id": document_id})

    if not document:
        return jsonify({'error': 'Document not found'}), 404

    # If file_path exists on disk, stream it
    file_path = document.get('file_path')
    if file_path and os.path.exists(file_path):
        audit_log(db.db, 'documentation', 'download', entity_id=str(document['_id']))
        return send_file(file_path, as_attachment=True)

    # If external Google Drive ID is present, redirect to Drive viewer link (note: production should use signed link)
    gdrive_id = document.get('gdrive_id')
    if gdrive_id:
        drive_link = f'https://drive.google.com/uc?id={gdrive_id}&export=download'
        audit_log(db.db, 'documentation', 'download_redirect', entity_id=str(document['_id']))
        return redirect(drive_link)

    # If stored inline as base64 content
    data_b64 = document.get('data_base64')
    if data_b64:
        import base64, io
        file_bytes = base64.b64decode(data_b64)
        audit_log(db.db, 'documentation', 'download_inline', entity_id=str(document['_id']))
        return send_file(io.BytesIO(file_bytes), download_name=document.get('title', 'attachment'), as_attachment=True)

    return jsonify({'error': 'No downloadable content for this document'}), 404
