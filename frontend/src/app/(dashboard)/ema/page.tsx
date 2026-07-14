'use client';

import { useState } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';

const EMA_URL = 'https://pchrd-ema.dlsu.edu.ph/app/login/';

export default function EmaPage() {
  const [key, setKey] = useState(0);
  const [errored, setErrored] = useState(false);

  return (
    <DashboardPageWrapper title="EMA Chatbot" subtitle="Ecological Momentary Assessment — DLSU Mental Health Monitoring">
      <div className="flex flex-col" style={{ height: 'calc(100vh - 140px)' }}>

        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Powered by{' '}
            <a href={EMA_URL} target="_blank" rel="noopener noreferrer"
              className="font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>
              pchrd-ema.dlsu.edu.ph
            </a>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setErrored(false); setKey(k => k + 1); }}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <RefreshCw size={12} /> Reload
            </button>
            <a
              href={EMA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
              <ExternalLink size={12} /> Open in new tab
            </a>
          </div>
        </div>

        <div className="relative flex-1 rounded-xl overflow-hidden border shadow-sm"
          style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
          {errored ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center p-8">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--color-danger-surface)' }}>
                <AlertCircle size={22} style={{ color: 'var(--color-danger)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Could not load EMA</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>The EMA server may be temporarily unavailable.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setErrored(false); setKey(k => k + 1); }}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-2 text-white rounded-lg transition hover:opacity-90"
                  style={{ background: 'var(--color-primary)' }}>
                  <RefreshCw size={12} /> Try again
                </button>
                <a
                  href={EMA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <ExternalLink size={12} /> Open directly
                </a>
              </div>
            </div>
          ) : (
            <iframe
              key={key}
              src={EMA_URL}
              title="EMA Chatbot"
              className="w-full h-full border-0"
              onError={() => setErrored(true)}
              allow="microphone; camera"
            />
          )}
        </div>

      </div>
    </DashboardPageWrapper>
  );
}
