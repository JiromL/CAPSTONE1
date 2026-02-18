"use client";

import React from 'react';

interface Props {
  documentId: string;
  label?: string;
}

export function DownloadButton({ documentId, label }: Props) {
  const handleDownload = async () => {
    try {
      const res = await fetch(`/api/documentation/documents/${documentId}/download`, { credentials: 'include' });
      if (!res.ok) {
        console.error('Download failed', await res.json());
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error', err);
    }
  };

  return (
    <button onClick={handleDownload} className="btn btn-sm">
      {label || 'Download'}
    </button>
  );
}
