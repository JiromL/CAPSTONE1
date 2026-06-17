'use client';

import React, { useState, useEffect } from 'react';
import { File, Upload, Search, AlertCircle, X } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

export default function DocumentationPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadType, setUploadType] = useState('Other');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);

  const documentTypes = ['Intake', 'Progress Notes', 'Treatment Plan', 'Assessment', 'Referral', 'Other'];

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }

      const response = await fetch(api('/api/documentation'), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load documents');
        setDocuments([]);
      }
    } catch (err) {
      console.error('Error loading documents:', err);
      setError('Failed to load documents');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uploadFile) {
      setError('Please select a file');
      return;
    }

    if (!uploadTitle) {
      setError('Please enter a document title');
      return;
    }

    // Get case_id from localStorage or URL params (implement based on your routing)
    const caseId = localStorage.getItem('current_case_id');
    if (!caseId) {
      setError('No case selected. Please select a case before uploading.');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', uploadTitle);
      formData.append('document_type', uploadType);
      formData.append('case_id', caseId);

      const response = await fetch(api('/api/documentation/upload'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess('Document uploaded successfully!');
        setUploadFile(null);
        setUploadTitle('');
        setUploadType('Other');
        setShowUploadForm(false);

        // Reload documents
        setTimeout(() => {
          loadDocuments();
          setSuccess(null);
        }, 2000);
      } else {
        const errorData = await response.json();
        setUploadError(errorData.error || 'Failed to upload document');
      }
    } catch (err) {
      console.error('Error uploading document:', err);
      setUploadError('Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api(`/api/documentation/${docId}/delete`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setSuccess('Document deleted successfully');
        loadDocuments();
        setTimeout(() => setSuccess(null), 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete document');
      }
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Failed to delete document');
    }
  };

  const filteredDocs = documents.filter(
    (d) =>
      (filterType === 'all' || d.document_type === filterType) &&
      (d.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       d.content?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <DashboardPageWrapper title="Documentation Hub" subtitle="Manage clinical and administrative documents">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400"></div>
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="Documentation Hub" subtitle="Manage clinical and administrative documents">
      <div className="space-y-6">
        {error && (
          <div className="border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 flex gap-3">
            <AlertCircle className="text-gray-600 dark:text-gray-400 flex-shrink-0" size={20} />
            <p className="text-sm text-gray-700 dark:text-gray-300">{error}</p>
          </div>
        )}

        {success && (
          <div className="border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 flex gap-3">
            <div className="text-green-600 dark:text-green-400 flex-shrink-0">✓</div>
            <p className="text-sm text-gray-700 dark:text-gray-300">{success}</p>
          </div>
        )}

        {/* Upload Form Section */}
        {showUploadForm ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Upload Document</h3>
              <button
                onClick={() => setShowUploadForm(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Document Title
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Enter document title"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Document Type
                </label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  {documentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select File
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={handleFileSelect}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-gray-900 dark:file:bg-gray-700 file:text-white"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Accepted: PDF, DOC, DOCX, PNG, JPG · Max size: 10 MB</p>
                {uploadFile && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    Selected: {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white rounded-lg font-medium text-sm transition disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload Document'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowUploadForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
              </div>
              {uploadError && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {uploadError}
                </p>
              )}
            </form>
          </div>
        ) : (
          <button
            onClick={() => setShowUploadForm(true)}
            className="w-full bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer text-center"
          >
            <Upload className="mx-auto text-gray-400 mb-3" size={32} />
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Upload New Document</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Click to select a file to upload</p>
          </button>
        )}

        {/* Search and Filter */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" size={18} />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm"
              />
            </div>
            <div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="all">All Types</option>
                {documentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Documents List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {filteredDocs.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredDocs.map((doc) => (
                <div key={doc._id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <File size={18} className="text-gray-400" />
                        <h3 className="font-medium text-gray-900 dark:text-white">{doc.title}</h3>
                        {doc.is_locked && (
                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                            Locked
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        Type: {doc.document_type} • Created: {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'N/A'}
                      </p>
                      {doc.content && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{doc.content}</p>
                      )}
                    </div>
                    <div className="ml-4 flex gap-2">
                      {doc.gdrive_file_link && (
                        <a
                          href={doc.gdrive_file_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                        >
                          View
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(doc._id)}
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <File className="mx-auto mb-3 text-gray-400" size={32} />
              <p className="text-gray-600 dark:text-gray-400">No documents found</p>
            </div>
          )}
        </div>
      </div>
    </DashboardPageWrapper>
  );
}
