'use client';

import React, { useState, useEffect } from 'react';
import { File, Upload, Search, AlertCircle, X, Loader2 } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

const IC = 'w-full px-3 py-2 text-sm rounded-lg outline-none transition';
const IC_S: React.CSSProperties = { border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' };
const onFIn  = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-surface)'; };
const onFOut = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; };

const documentTypes = ['Intake', 'Progress Notes', 'Treatment Plan', 'Assessment', 'Referral', 'Other'];

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

  useEffect(() => { loadDocuments(); }, []);

  const loadDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { setError('No authentication token found'); setLoading(false); return; }
      const r = await fetch(api('/api/documentation'), { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setDocuments(d.documents || []); setError(null); }
      else { const e = await r.json(); setError(e.error || 'Failed to load documents'); setDocuments([]); }
    } catch { setError('Failed to load documents'); setDocuments([]); }
    finally { setLoading(false); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setUploadFile(e.target.files[0]);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) { setError('Please select a file'); return; }
    if (!uploadTitle) { setError('Please enter a document title'); return; }
    const caseId = localStorage.getItem('current_case_id');
    if (!caseId) { setError('No case selected. Please select a case before uploading.'); return; }
    setUploading(true); setError(null); setUploadError(null); setSuccess(null);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', uploadTitle);
      formData.append('document_type', uploadType);
      formData.append('case_id', caseId);
      const r = await fetch(api('/api/documentation/upload'), {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData,
      });
      if (r.ok) {
        setSuccess('Document uploaded successfully!');
        setUploadFile(null); setUploadTitle(''); setUploadType('Other'); setShowUploadForm(false);
        setTimeout(() => { loadDocuments(); setSuccess(null); }, 2000);
      } else { const e = await r.json(); setUploadError(e.error || 'Failed to upload document'); }
    } catch { setUploadError('Failed to upload document. Please try again.'); }
    finally { setUploading(false); }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/documentation/${docId}/delete`), { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { setSuccess('Document deleted successfully'); loadDocuments(); setTimeout(() => setSuccess(null), 2000); }
      else { const e = await r.json(); setError(e.error || 'Failed to delete document'); }
    } catch { setError('Failed to delete document'); }
  };

  const filteredDocs = documents.filter(d =>
    (filterType === 'all' || d.document_type === filterType) &&
    (d.title?.toLowerCase().includes(searchTerm.toLowerCase()) || d.content?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <DashboardPageWrapper title="Documentation Hub" subtitle="Manage clinical and administrative documents">
        <div className="flex items-center justify-center py-12 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="Documentation Hub" subtitle="Manage clinical and administrative documents">
      <div className="space-y-5">
        {error && (
          <div className="border rounded-lg p-4 flex gap-3 items-start" style={{ background: 'var(--color-danger-surface)', borderColor: 'var(--color-danger)' }}>
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-danger)' }} />
            <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>
            <button onClick={() => setError(null)} className="ml-auto" style={{ color: 'var(--color-danger)' }}>×</button>
          </div>
        )}
        {success && (
          <div className="border rounded-lg p-4 flex gap-3 items-start" style={{ background: 'var(--color-success-surface)', borderColor: 'var(--color-success)' }}>
            <span style={{ color: 'var(--color-success)' }}>✓</span>
            <p className="text-sm" style={{ color: 'var(--color-success)' }}>{success}</p>
          </div>
        )}

        {/* Upload section */}
        {showUploadForm ? (
          <div className="border rounded-2xl p-6 shadow-card" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Upload Document</h3>
              <button onClick={() => setShowUploadForm(false)} className="transition"
                style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Document Title</label>
                <input type="text" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)}
                  placeholder="Enter document title" required className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Document Type</label>
                <select value={uploadType} onChange={e => setUploadType(e.target.value)} className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut}>
                  {documentTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Select File</label>
                <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={handleFileSelect} required
                  className={`${IC} file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:text-white`}
                  style={{ ...IC_S, '--file-bg': 'var(--color-primary)' } as React.CSSProperties} />
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Accepted: PDF, DOC, DOCX, PNG, JPG · Max size: 10 MB</p>
                {uploadFile && (
                  <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                    Selected: {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
              {uploadError && (
                <p className="text-xs flex items-center gap-1" style={{ color: 'var(--color-danger)' }}>
                  <AlertCircle size={12} /> {uploadError}
                </p>
              )}
              <div className="flex gap-3">
                <button type="submit" disabled={uploading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-white text-sm font-medium rounded-xl transition disabled:opacity-50 hover:opacity-90"
                  style={{ background: 'var(--color-primary)' }}>
                  {uploading && <Loader2 size={13} className="animate-spin" />}
                  {uploading ? 'Uploading…' : 'Upload Document'}
                </button>
                <button type="button" onClick={() => setShowUploadForm(false)}
                  className="flex-1 px-4 py-2 border rounded-xl text-sm font-medium transition"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <button onClick={() => setShowUploadForm(true)}
            className="w-full border-2 border-dashed rounded-2xl p-8 text-center transition cursor-pointer"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = 'var(--color-primary-surface)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'var(--color-surface)'; }}>
            <Upload className="mx-auto mb-3" size={28} style={{ color: 'var(--color-text-muted)' }} />
            <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>Upload New Document</h2>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Click to select a file to upload</p>
          </button>
        )}

        {/* Search and filter */}
        <div className="border rounded-xl p-4 shadow-card" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
              <input type="text" placeholder="Search documents…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className={`${IC} pl-9`} style={IC_S} onFocus={onFIn} onBlur={onFOut} />
            </div>
            <div>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut}>
                <option value="all">All Types</option>
                {documentTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Document list */}
        <div className="border rounded-2xl shadow-card overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          {filteredDocs.length > 0 ? (
            <div>
              {filteredDocs.map((doc, i) => (
                <div key={doc._id} className="p-4 transition"
                  style={{ borderBottom: i < filteredDocs.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1.5">
                        <File size={16} style={{ color: 'var(--color-text-muted)' }} />
                        <h3 className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{doc.title}</h3>
                        {doc.is_locked && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded" style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                            Locked
                          </span>
                        )}
                      </div>
                      <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                        Type: {doc.document_type} · Created: {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'N/A'}
                      </p>
                      {doc.content && (
                        <p className="text-sm line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>{doc.content}</p>
                      )}
                    </div>
                    <div className="ml-4 flex gap-2 flex-shrink-0">
                      {doc.gdrive_file_link && (
                        <a href={doc.gdrive_file_link} target="_blank" rel="noopener noreferrer"
                          className="px-3 py-1.5 text-xs font-medium border rounded-lg transition"
                          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          View
                        </a>
                      )}
                      <button onClick={() => handleDelete(doc._id)}
                        className="px-3 py-1.5 text-xs font-medium border rounded-lg transition"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-danger-surface)'; e.currentTarget.style.color = 'var(--color-danger)'; e.currentTarget.style.borderColor = 'var(--color-danger)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <File size={28} className="mx-auto mb-3" style={{ color: 'var(--color-border)' }} />
              <p style={{ color: 'var(--color-text-muted)' }}>No documents found</p>
            </div>
          )}
        </div>
      </div>
    </DashboardPageWrapper>
  );
}
