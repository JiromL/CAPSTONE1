"""
EPIC 5: CENTRALIZED DOCUMENTATION HUB
Blueprint for secure case file repository with version control and audit trails
"""

from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from models import db, PermissionType
from utils import audit_log, user_has_permission
from datetime import datetime
import os
import sys
import json
import io
from werkzeug.utils import secure_filename

# Import Google Drive service from utils directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'utils'))
from gdrive import get_gdrive_service

documentation_bp = Blueprint('documentation', __name__, url_prefix='/api/documentation')


@documentation_bp.route('', methods=['GET'])
@jwt_required()
def list_documents():
    """List all accessible documents for the current user"""
    user_id = get_jwt_identity()
    
    try:
        # Convert user_id to ObjectId if needed
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        
        # Get user and their role
        user = db.db.users.find_one({'_id': user_id_obj})
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user_role = user.get('role', 'STUDENT')
        
        # Build query based on role
        query = {}
        
        # Different roles have different access levels
        if user_role == 'ADMIN':
            # Admin can see all documents
            pass  # No query restriction
        elif user_role in ['COUNSELOR', 'PSYCHOLOGIST', 'DPO']:
            # These roles can see documents from cases they work on
            query = {'case_id': {'$exists': True}}
        else:
            # Students and others can only see documents from their own cases
            student_cases = list(db.db.cases.find(
                {'student_id': str(user_id_obj)},
                {'_id': 1}
            ).limit(100))
            case_ids = [case['_id'] for case in student_cases]
            if case_ids:
                query = {'case_id': {'$in': case_ids}}
            else:
                query = {'case_id': None}  # No cases, empty result
        
        # Fetch documents
        documents = list(db.db.documents.find(query).sort('created_at', -1).limit(100))
        
        # Format response
        doc_list = []
        for doc in documents:
            doc_list.append({
                '_id': str(doc.get('_id')),
                'case_id': str(doc.get('case_id')) if doc.get('case_id') else None,
                'document_type': doc.get('document_type'),
                'title': doc.get('title'),
                'content': doc.get('content')[:200] if doc.get('content') else None,  # Brief preview
                'file_path': doc.get('file_path'),
                'created_at': doc.get('created_at').isoformat() if doc.get('created_at') else None,
                'created_by_id': str(doc.get('created_by_id')) if doc.get('created_by_id') else None,
                'created_by_name': doc.get('created_by_name', 'Unknown'),
                'is_locked': doc.get('is_locked', False),
                'locked_by_id': str(doc.get('locked_by_id')) if doc.get('locked_by_id') else None,
            })
        
        audit_log(db.db, 'documentation', 'list_documents', entity_id=str(user_id_obj))
        
        return jsonify({
            'documents': doc_list,
            'count': len(doc_list),
            'user_role': user_role
        }), 200
    
    except Exception as e:
        print(f'Error listing documents: {str(e)}')
        return jsonify({'error': f'Failed to list documents: {str(e)}'}), 500


@documentation_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_document():
    """Upload a document file to Google Drive and save metadata to MongoDB"""
    user_id = get_jwt_identity()
    
    try:
        # Get user info
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        user = db.db.users.find_one({'_id': user_id_obj})
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Check if file is in request
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Get document metadata from form
        case_id = request.form.get('case_id')
        document_type = request.form.get('document_type', 'Other')
        title = request.form.get('title', file.filename)
        
        if not case_id:
            return jsonify({'error': 'case_id is required'}), 400
        
        # Verify case exists and user has access
        try:
            case_id_obj = ObjectId(case_id)
            case = db.db.cases.find_one({'_id': case_id_obj})
        except:
            case = db.db.cases.find_one({'_id': case_id})
        
        if not case:
            return jsonify({'error': 'Case not found'}), 404
        
        # Read file content
        file_content = file.read()
        if len(file_content) == 0:
            return jsonify({'error': 'File is empty'}), 400
        
        # Upload to Google Drive
        gdrive = get_gdrive_service()
        filename = secure_filename(f"{case_id}_{datetime.utcnow().timestamp()}_{file.filename}")
        
        gdrive_file = gdrive.upload_file(
            file_content=file_content,
            filename=filename,
            mime_type=file.content_type or 'application/octet-stream',
            metadata={
                'description': f'Case document: {title}',
                'properties': {
                    'case_id': str(case_id),
                    'uploaded_by': str(user_id)
                }
            }
        )
        
        if not gdrive_file:
            return jsonify({'error': 'Failed to upload file to Google Drive'}), 500
        
        # Save document metadata to MongoDB
        document = {
            'case_id': case_id_obj if isinstance(case_id_obj, ObjectId) else ObjectId(case_id),
            'document_type': document_type,
            'title': title,
            'original_filename': file.filename,
            'gdrive_file_id': gdrive_file.get('id'),
            'gdrive_file_link': gdrive_file.get('webViewLink'),
            'file_size': len(file_content),
            'mime_type': file.content_type or 'application/octet-stream',
            'created_by_id': user_id_obj,
            'created_by_name': f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
            'is_locked': False,
            'version': 1
        }
        
        result = db.db.documents.insert_one(document)
        
        audit_log(db.db, 'document', 'upload', entity_id=str(result.inserted_id), new_values={
            'document_type': document_type,
            'title': title,
            'gdrive_file_id': gdrive_file.get('id')
        })
        
        return jsonify({
            'document_id': str(result.inserted_id),
            'case_id': str(case_id),
            'title': title,
            'gdrive_file_id': gdrive_file.get('id'),
            'gdrive_file_link': gdrive_file.get('webViewLink'),
            'created_at': document['created_at'].isoformat(),
            'message': 'Document uploaded successfully'
        }), 201
    
    except Exception as e:
        print(f'Error uploading document: {str(e)}')
        return jsonify({'error': f'Failed to upload document: {str(e)}'}), 500


@documentation_bp.route('/<document_id>/download', methods=['GET'])
@jwt_required()
def download_document(document_id):
    """Download a document from Google Drive"""
    user_id = get_jwt_identity()
    
    try:
        # Get document
        doc_id_obj = ObjectId(document_id) if isinstance(document_id, str) else document_id
        document = db.db.documents.find_one({'_id': doc_id_obj})
        
        if not document:
            return jsonify({'error': 'Document not found'}), 404
        
        # Check access permissions
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        user = db.db.users.find_one({'_id': user_id_obj})
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user_role = user.get('role', 'STUDENT')
        case_id = document.get('case_id')
        
        # Permission check
        has_access = False
        if user_role == 'ADMIN':
            has_access = True
        elif user_role in ['COUNSELOR', 'PSYCHOLOGIST', 'DPO']:
            # Check if user is assigned to this case
            has_access = True  # Can be refined based on case assignments
        else:
            # Student can only access their own case documents
            student_case = db.db.cases.find_one({
                '_id': case_id,
                'student_id': str(user_id_obj)
            })
            has_access = student_case is not None
        
        if not has_access:
            return jsonify({'error': 'Access denied'}), 403
        
        # Download from Google Drive
        gdrive_file_id = document.get('gdrive_file_id')
        if not gdrive_file_id:
            return jsonify({'error': 'Google Drive file ID not found'}), 404
        
        gdrive = get_gdrive_service()
        file_content = gdrive.get_file(gdrive_file_id)
        
        if not file_content:
            return jsonify({'error': 'Failed to download file from Google Drive'}), 500
        
        # Log download
        audit_log(db.db, 'document', 'download', entity_id=str(doc_id_obj))
        
        return send_file(
            io.BytesIO(file_content),
            download_name=document.get('original_filename'),
            as_attachment=True,
            mimetype=document.get('mime_type', 'application/octet-stream')
        )
    
    except Exception as e:
        print(f'Error downloading document: {str(e)}')
        return jsonify({'error': f'Failed to download document: {str(e)}'}), 500


@documentation_bp.route('/<document_id>/delete', methods=['DELETE'])
@jwt_required()
def delete_document(document_id):
    """Delete a document from Google Drive and MongoDB"""
    user_id = get_jwt_identity()
    
    try:
        # Get document
        doc_id_obj = ObjectId(document_id) if isinstance(document_id, str) else document_id
        document = db.db.documents.find_one({'_id': doc_id_obj})
        
        if not document:
            return jsonify({'error': 'Document not found'}), 404
        
        # Check permissions - only creator or admin can delete
        user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
        user = db.db.users.find_one({'_id': user_id_obj})
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user_role = user.get('role', 'STUDENT')
        created_by_id = document.get('created_by_id')
        
        is_creator = str(user_id_obj) == str(created_by_id)
        is_admin = user_role == 'ADMIN'
        
        if not (is_creator or is_admin):
            return jsonify({'error': 'Only document creator or admin can delete'}), 403
        
        # Delete from Google Drive
        gdrive_file_id = document.get('gdrive_file_id')
        if gdrive_file_id:
            gdrive = get_gdrive_service()
            gdrive.delete_file(gdrive_file_id)
        
        # Delete from MongoDB
        db.db.documents.delete_one({'_id': doc_id_obj})
        
        audit_log(db.db, 'document', 'delete', entity_id=str(doc_id_obj))
        
        return jsonify({'message': 'Document deleted successfully'}), 200
    
    except Exception as e:
        print(f'Error deleting document: {str(e)}')
        return jsonify({'error': f'Failed to delete document: {str(e)}'}), 500



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
