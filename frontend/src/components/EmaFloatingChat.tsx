'use client';

import { useState, useEffect } from 'react';
import { X, Minus, ExternalLink, RefreshCw, MessageCircle, Eye, EyeOff, Loader2, LogIn, CheckCircle } from 'lucide-react';
import { api } from '@/utils/api';

const EMA_URL = 'https://pchrd-ema.dlsu.edu.ph/app/login/';

export function EmaFloatingChat() {
  const [open, setOpen]           = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // EMA connection state
  const [connected, setConnected]   = useState<boolean | null>(null); // null = loading
  const [username, setUsername]     = useState('');
  const [password, setPassword]     = useState('');
  const [emaId, setEmaId]           = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [logging, setLogging]       = useState(false);
  const [error, setError]           = useState('');
  const [justConnected, setJustConnected] = useState(false);
  const [recovered, setRecovered]   = useState(0);

  const isEmaFormat = (u: string) => /^ema_[a-zA-Z0-9]+$/.test(u.trim());

  // Check connection status when widget opens
  useEffect(() => {
    if (!open || connected !== null) return;
    const token = localStorage.getItem('token');
    if (!token) { setConnected(false); return; }
    fetch(api('/api/mhbot/auth/status'), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => setConnected(d?.connected ?? false))
      .catch(() => setConnected(false));
  }, [open]);

  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const syncLatest = async (showFeedback = false) => {
    const token = localStorage.getItem('token');
    if (!token || !connected) return;
    if (showFeedback) setSyncing(true);
    try {
      const r = await fetch(api('/api/mhbot/my-perma?limit=50'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (showFeedback && r.ok) {
        const d = await r.json();
        setSyncMsg(d.latest_label ? `Latest: ${d.latest_label}` : 'No labels found yet');
        setTimeout(() => setSyncMsg(''), 4000);
      }
    } catch {
      if (showFeedback) setSyncMsg('Sync failed');
    } finally {
      if (showFeedback) setSyncing(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLogging(true); setError('');
    try {
      const token = localStorage.getItem('token') ?? '';
      const r = await fetch(api('/api/mhbot/auth/login'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, ema_identifier: emaId.trim() || undefined }),
      });
      const d = await r.json();
      if (r.ok) {
        setConnected(true);
        setRecovered(d.recovered ?? 0);
        setJustConnected(true);
        setPassword('');
        setTimeout(() => setJustConnected(false), 4000);
      } else {
        setError(d.error || 'Login failed. Check your credentials.');
      }
    } catch { setError('Network error — please try again.'); }
    finally { setLogging(false); }
  };

  const panelStyle = minimized
    ? {}
    : { width: 'calc(100vw - 280px)', height: 'calc(100vh - 32px)', maxWidth: '1100px', maxHeight: '960px' };

  return (
    <>
      {/* Floating toggle button */}
      {!open && (
        <button
          onClick={() => { setOpen(true); setMinimized(false); }}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#2563eb] hover:bg-blue-800 text-white rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          title="Open EMA Chatbot"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className={`fixed bottom-4 right-4 z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden border border-gray-200 transition-all duration-200 ${minimized ? 'h-14 w-96' : ''}`}
          style={panelStyle}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#2563eb] flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <MessageCircle size={16} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-tight">EMA Chatbot</p>
                {!minimized && (
                  <p className="text-[10px] text-white/70 leading-tight">DLSU Mental Health Support</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <a href={EMA_URL} target="_blank" rel="noopener noreferrer" title="Open in new tab"
                className="p-1.5 rounded-lg hover:bg-white/10 transition text-white/70 hover:text-white">
                <ExternalLink size={14} />
              </a>
              {connected && (
                <button onClick={() => syncLatest(true)} title="Sync PERMA labels now" disabled={syncing}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition text-white/70 hover:text-white disabled:opacity-50">
                  {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                </button>
              )}
              <button onClick={() => { syncLatest(); setMinimized(m => !m); }} title={minimized ? 'Expand' : 'Minimize'}
                className="p-1.5 rounded-lg hover:bg-white/10 transition text-white/70 hover:text-white">
                <Minus size={14} />
              </button>
              <button onClick={() => { syncLatest(); setOpen(false); }} title="Close"
                className="p-1.5 rounded-lg hover:bg-white/10 transition text-white/70 hover:text-white">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Body */}
          {!minimized && (
            <div className="flex-1 bg-white overflow-hidden relative">

              {/* Loading check */}
              {connected === null && (
                <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                  <Loader2 size={20} className="animate-spin text-gray-300" />
                </div>
              )}

              {/* Not connected — show login form as overlay */}
              {connected === false && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 p-8">
                  <div className="w-full max-w-sm">
                    <div className="flex flex-col items-center mb-6">
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                        <MessageCircle size={22} className="text-[#2563eb]" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900">Sign in to EMA</h3>
                      <p className="text-xs text-gray-400 text-center mt-1">
                        Use your EMA account credentials. Your past assessment history will be recovered automatically.
                      </p>
                    </div>

                    <form onSubmit={handleConnect} className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">EMA Username</label>
                        <input
                          type="text" value={username} onChange={e => setUsername(e.target.value)} required
                          placeholder="Your EMA username"
                          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl placeholder-gray-300 focus:ring-2 focus:ring-[#2563eb] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Password</label>
                        <div className="relative">
                          <input
                            type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                            placeholder="••••••••"
                            className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-200 rounded-xl placeholder-gray-300 focus:ring-2 focus:ring-[#2563eb] focus:outline-none"
                          />
                          <button type="button" onClick={() => setShowPw(p => !p)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>

                      {username && !isEmaFormat(username) && (
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">
                            Original EMA ID <span className="text-gray-400 font-normal">(optional)</span>
                          </label>
                          <input
                            type="text" value={emaId} onChange={e => setEmaId(e.target.value)}
                            placeholder="e.g. ema_nhS"
                            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl placeholder-gray-300 focus:ring-2 focus:ring-[#2563eb] focus:outline-none"
                          />
                          <p className="text-[10px] text-gray-400 mt-1">
                            If you changed your EMA username, enter the original <span className="font-mono">ema_XXX</span> ID your account was created with.
                          </p>
                        </div>
                      )}

                      {error && (
                        <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
                      )}

                      <button type="submit" disabled={logging}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#2563eb] hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition">
                        {logging
                          ? <><Loader2 size={14} className="animate-spin" /> Connecting…</>
                          : <><LogIn size={14} /> Sign in & Open Chatbot</>}
                      </button>
                    </form>

                    <p className="text-[10px] text-gray-300 text-center mt-4">
                      These credentials are used only to sync your wellness history. You'll also sign in inside the chatbot below.
                    </p>
                  </div>
                </div>
              )}

              {/* Toasts */}
              {connected === true && (justConnected || syncMsg) && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-blue-700 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg whitespace-nowrap">
                  <CheckCircle size={13} />
                  {justConnected
                    ? (recovered > 0 ? `Connected! ${recovered} past assessment${recovered !== 1 ? 's' : ''} recovered.` : 'Connected to EMA.')
                    : syncMsg}
                </div>
              )}

              {/* iframe — always rendered when connected so it loads in background */}
              {connected === true && (
                <iframe
                  key={iframeKey}
                  src={EMA_URL}
                  title="EMA Chatbot"
                  className="w-full h-full border-0"
                  allow="microphone; camera"
                />
              )}

            </div>
          )}
        </div>
      )}
    </>
  );
}
