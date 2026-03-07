"use client";

import { useState } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { useRouter } from 'next/navigation';

export default function AdminResourcesPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!file || !title.trim()) {
      setError('Please select a file and enter a title');
      return;
    }

    setUploading(true);

    try {
      const token = localStorage.getItem('access_token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('description', description);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/resources/upload`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage(
          `✓ Resource "${title}" uploaded successfully! Students will see this in their resource list.`
        );
        setFile(null);
        setTitle('');
        setDescription('');
        // Reset form
        const fileInput = document.getElementById('file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        setError(data.error || 'Failed to upload resource');
      }
    } catch (err) {
      setError('Error uploading resource. Please try again.');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardPageWrapper title="Manage Wellness Resources">
      <div className="max-w-2xl mx-auto">
        {/* Info Box */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <h3 className="font-semibold text-blue-900">How it works:</h3>
          <p className="text-blue-800 text-sm mt-1">
            Upload wellness resources (PDFs, guides, images, documents) here. These resources will be
            visible to your assigned students in their personal resource library.
          </p>
        </div>

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Resource Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Anxiety Management Worksheet, Depression Guide"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={uploading}
            />
          </div>

          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what students will find in this resource..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={uploading}
            />
          </div>

          {/* Drag and Drop Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 bg-gray-50 hover:border-gray-400'
            } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="mb-4">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20a4 4 0 004 4h24a4 4 0 004-4V20m-8-12l-4-4m0 0l-4 4m4-4v16"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <p className="text-gray-600 font-medium mb-1">
              {file ? file.name : 'Drag and drop your resource here'}
            </p>
            <p className="text-gray-500 text-sm mb-4">
              or
            </p>

            <label htmlFor="file" className="inline-block">
              <input
                type="file"
                id="file"
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif"
                disabled={uploading}
              />
              <button
                type="button"
                onClick={() => document.getElementById('file')?.click()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
                disabled={uploading}
              >
                Select File
              </button>
            </label>

            <p className="text-gray-500 text-xs mt-4">
              PDF, Word, Text, Image files up to 50MB
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Success Message */}
          {message && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {message}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={uploading || !file || !title.trim()}
            className="mt-6 w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {uploading ? 'Uploading...' : 'Upload Resource'}
          </button>
        </form>

        {/* Info Section */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">📋 Best Practices</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>
              <strong>Relevant:</strong> Upload resources that directly help your students with their specific concerns
            </li>
            <li>
              <strong>Clear Titles:</strong> Use descriptive titles so students know exactly what they're accessing
            </li>
            <li>
              <strong>Organization:</strong> Group related resources with clear naming conventions
            </li>
            <li>
              <strong>Format:</strong> PDFs and images work best for consistent formatting across devices
            </li>
            <li>
              <strong>Privacy:</strong> Only upload resources you're authorized to share
            </li>
          </ul>
        </div>
      </div>
    </DashboardPageWrapper>
  );
}
