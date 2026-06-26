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

        {/* Top bar */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <p className="text-xs text-gray-400">
            Powered by{' '}
            <a href={EMA_URL} target="_blank" rel="noopener noreferrer"
              className="text-[#2563eb] hover:underline font-medium">
              pchrd-ema.dlsu.edu.ph
            </a>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setErrored(false); setKey(k => k + 1); }}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition"
            >
              <RefreshCw size={12} /> Reload
            </button>
            <a
              href={EMA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:border-[#2563eb] hover:text-[#2563eb] transition"
            >
              <ExternalLink size={12} /> Open in new tab
            </a>
          </div>
        </div>

        {/* Iframe or error state */}
        <div className="relative flex-1 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 shadow-sm">
          {errored ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center p-8">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                <AlertCircle size={22} className="text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Could not load EMA</p>
                <p className="text-xs text-gray-400 mt-1">The EMA server may be temporarily unavailable.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setErrored(false); setKey(k => k + 1); }}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-2 bg-[#2563eb] text-white rounded-lg hover:bg-blue-800 transition"
                >
                  <RefreshCw size={12} /> Try again
                </button>
                <a
                  href={EMA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition"
                >
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
