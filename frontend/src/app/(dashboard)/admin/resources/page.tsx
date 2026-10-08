"use client";

import { useState } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';

const IC  = 'w-full px-4 py-2 rounded-lg outline-none transition disabled:opacity-50';
const ICS: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' };

export default function AdminResourcesPage() {
  const [file, setFile]               = useState<File | null>(null);
  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading]     = useState(false);
  const [message, setMessage]         = useState('');
  const [error, setError]             = useState('');
  const [dragActive, setDragActive]   = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setMessage('');
    if (!file || !title.trim()) { setError('Please select a file and enter a title'); return; }
    setUploading(true);
    try {
      const token    = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file); formData.append('title', title); formData.append('description', description);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/resources/upload`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        setMessage(`Resource "${title}" uploaded successfully! Students will see this in their resource list.`);
        setFile(null); setTitle(''); setDescription('');
        const fi = document.getElementById('file') as HTMLInputElement;
        if (fi) fi.value = '';
      } else { setError(data.error || 'Failed to upload resource'); }
    } catch { setError('Error uploading resource. Please try again.'); }
    finally { setUploading(false); }
  };

  return (
    <DashboardPageWrapper title="Manage Wellness Resources">
      <div className="max-w-2xl">

        <div className="p-4 mb-6 rounded-xl" style={{ background: 'var(--color-primary-surface)', border: '1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--color-primary)' }}>How it works:</h3>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Upload wellness resources (PDFs, guides, images, documents) here. These resources will be visible to your assigned students in their personal resource library.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-lg p-6 shadow-md"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>

          <div className="mb-6">
            <label htmlFor="title" className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              Resource Title *
            </label>
            <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Anxiety Management Worksheet, Depression Guide"
              className={IC} style={ICS} disabled={uploading} />
          </div>

          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              Description (Optional)
            </label>
            <textarea id="description" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of what students will find in this resource..."
              rows={3} className={`${IC} resize-none`} style={ICS} disabled={uploading} />
          </div>

          <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ borderColor: dragActive ? 'var(--color-primary)' : 'var(--color-border)', background: dragActive ? 'var(--color-primary-surface)' : 'var(--color-bg)' }}>
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12" style={{ color: 'var(--color-text-muted)' }} stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20a4 4 0 004 4h24a4 4 0 004-4V20m-8-12l-4-4m0 0l-4 4m4-4v16" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              {file ? file.name : 'Drag and drop your resource here'}
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>or</p>
            <label htmlFor="file">
              <input type="file" id="file" onChange={handleFileChange} className="hidden"
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif" disabled={uploading} />
              <button type="button" onClick={() => document.getElementById('file')?.click()} disabled={uploading}
                className="px-4 py-2 text-white rounded-lg transition disabled:opacity-50"
                style={{ background: 'var(--color-primary)' }}>
                Select File
              </button>
            </label>
            <p className="text-xs mt-4" style={{ color: 'var(--color-text-muted)' }}>PDF, Word, Text, Image files up to 50MB</p>
          </div>

          {error && (
            <div className="mt-4 p-4 rounded-lg text-sm"
              style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>
              {error}
            </div>
          )}
          {message && (
            <div className="mt-4 p-4 rounded-lg text-sm"
              style={{ background: 'var(--color-success-surface)', border: '1px solid var(--color-success)', color: 'var(--color-success)' }}>
              {message}
            </div>
          )}

          <button type="submit" disabled={uploading || !file || !title.trim()}
            className="mt-6 w-full px-6 py-3 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--color-primary)' }}>
            {uploading ? 'Uploading...' : 'Upload Resource'}
          </button>
        </form>

        <div className="mt-8 rounded-lg p-6" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Best Practices</h3>
          <ul className="space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <li><strong>Relevant:</strong> Upload resources that directly help your students with their specific concerns</li>
            <li><strong>Clear Titles:</strong> Use descriptive titles so students know exactly what they're accessing</li>
            <li><strong>Organization:</strong> Group related resources with clear naming conventions</li>
            <li><strong>Format:</strong> PDFs and images work best for consistent formatting across devices</li>
            <li><strong>Privacy:</strong> Only upload resources you're authorized to share</li>
          </ul>
        </div>
      </div>
    </DashboardPageWrapper>
  );
}
