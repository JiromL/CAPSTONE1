'use client';

import { useState, useEffect } from 'react';
import { X, Minus, ExternalLink, RefreshCw, MessageCircleHeart, Eye, EyeOff, Loader2, LogIn, CheckCircle, Maximize2, Minimize2 } from 'lucide-react';
import { api } from '@/utils/api';
import { EmaChat, EmaAvatar } from './EmaChat';
import { EmaConsentCheckbox } from './EmaPrivacyNotice';

const EMA_URL = 'https://pchrd-ema.dlsu.edu.ph/app/login/';

export function EmaFloatingChat() {
  const [open, setOpen]           = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [expanded, setExpanded]   = useState(false);
  const [linkedAs, setLinkedAs]   = useState('');

  // EMA connection state
  const [connected, setConnected]   = useState<boolean | null>(null); // null = loading
  const [username, setUsername]     = useState('');
  const [password, setPassword]     = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [logging, setLogging]       = useState(false);
  const [error, setError]           = useState('');
  const [justConnected, setJustConnected] = useState(false);
  const [recovered, setRecovered]   = useState(0);
  const [needsRelink, setNeedsRelink] = useState(false);
  const [consented, setConsented]   = useState(false);

  // Check connection status when widget opens
  useEffect(() => {
    if (!open || connected !== null) return;
    const token = localStorage.getItem('token');
    if (!token) { setConnected(false); return; }
    fetch(api('/api/mhbot/auth/status'), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        // Only signed in when CPS holds this student's EMA key; older links must sign in once more
        setConnected(!!(d?.connected && d?.chat_ready));
        setNeedsRelink(!!d?.needs_relink);
        setLinkedAs(d?.mhbot_username ?? '');
      })
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
      const r = await fetch(api('/api/mhbot/link-username'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        // The backend records consent together with the link, so it can't be skipped
        body: JSON.stringify({ username, password, consent: consented }),
      });
      const d = await r.json();
      if (r.ok) {
        setConnected(true);
        setNeedsRelink(false);
        setLinkedAs(d.mhbot_username ?? username);
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

  // Docked side panel: narrow by default so the page stays usable, wider on request
  const panelStyle: React.CSSProperties = minimized
    ? { width: 'min(320px, calc(100vw - 32px))' }
    : { width: expanded ? 'min(760px, calc(100vw - 32px))' : 'min(440px, calc(100vw - 32px))', height: 'min(820px, calc(100vh - 88px))' };

  const iconBtn = 'w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2';
  const iconHover = {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.background = 'var(--color-bg)'; e.currentTarget.style.color = 'var(--color-text-primary)'; },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; },
  };

  return (
    <>
      {/* Floating toggle button */}
      {!open && (
        <button
          onClick={() => { setOpen(true); setMinimized(false); }}
          className="group fixed bottom-6 right-6 z-50 h-14 pl-2 pr-5 rounded-full flex items-center gap-3 text-left transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 animate-scale-in"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)',
            color: 'white',
            // Shadow tinted with the brand blue so the button lifts off the page instead of sitting in a grey smudge
            boxShadow: '0 8px 20px -6px rgba(35,82,204,0.55), 0 2px 6px -2px rgba(13,21,38,0.15)',
          }}
          aria-label="Open EMA chatbot"
        >
          {/* Chat bubble with a heart: reads as "supportive chat" at a glance */}
          <span className="relative w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-lg transition-transform duration-200 group-hover:scale-105"
            style={{ background: 'white', color: 'var(--color-primary)' }} aria-hidden>
            <MessageCircleHeart size={22} strokeWidth={2} />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full"
              style={{ background: 'var(--color-success)', border: '2px solid var(--color-primary)' }} />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">Talk to EMA</span>
            <span className="text-xs" style={{ opacity: 0.8 }}>Wellbeing chatbot</span>
          </span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-4 right-4 z-50 flex flex-col rounded-2xl overflow-hidden border animate-slide-up"
          style={{ ...panelStyle, borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-modal)', background: 'var(--color-surface)', transition: 'width 200ms ease' }}
        >
          {/* Header */}
          <div className={`flex items-center justify-between pl-4 pr-2 flex-shrink-0 ${minimized ? 'py-2' : 'py-3 border-b'}`}
            style={{ borderColor: 'var(--color-border)' }}>
            <button className="flex items-center gap-2.5 min-w-0 text-left" onClick={() => minimized && setMinimized(false)}
              tabIndex={minimized ? 0 : -1} aria-label={minimized ? 'Expand chat' : undefined}>
              <EmaAvatar size={34} />
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--color-text-primary)' }}>EMA</p>
                <p className="text-xs leading-tight truncate" style={{ color: 'var(--color-text-muted)' }}>
                  {connected && linkedAs ? <>EMA chatbot · signed in as {linkedAs}</> : 'EMA chatbot · DLSU mental health support'}
                </p>
              </div>
            </button>
            <div className="flex items-center flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
              {!minimized && connected && (
                <button onClick={() => syncLatest(true)} title="Update my wellbeing results" disabled={syncing} className={iconBtn} {...iconHover}>
                  {syncing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                </button>
              )}
              {!minimized && (
                <a href={EMA_URL} target="_blank" rel="noopener noreferrer" title="Open EMA in a new tab" className={iconBtn} {...iconHover}>
                  <ExternalLink size={15} />
                </a>
              )}
              {!minimized && (
                <button onClick={() => setExpanded(x => !x)} title={expanded ? 'Make narrower' : 'Make wider'} className={`${iconBtn} hidden md:flex`} {...iconHover}>
                  {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                </button>
              )}
              <button onClick={() => { syncLatest(); setMinimized(m => !m); }} title={minimized ? 'Expand' : 'Minimize'} className={iconBtn} {...iconHover}>
                {minimized ? <Maximize2 size={15} /> : <Minus size={15} />}
              </button>
              <button onClick={() => { syncLatest(); setOpen(false); }} title="Close" className={iconBtn} {...iconHover}>
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Body */}
          {!minimized && (
            <div className="flex-1 min-h-0 overflow-hidden relative" style={{ background: 'var(--color-surface)' }}>

              {/* Loading check */}
              {connected === null && (
                <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: 'var(--color-surface)' }}>
                  <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-border-strong)' }} />
                </div>
              )}

              {/* Not connected — show login form as overlay */}
              {connected === false && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-6 py-8 overflow-y-auto" style={{ background: 'var(--color-surface)' }}>
                  <div className="w-full max-w-sm">
                    <div className="flex flex-col items-center mb-6">
                      <div className="mb-3"><EmaAvatar size={48} /></div>
                      <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {needsRelink ? 'Reconnect your EMA account' : 'Sign in to EMA'}
                      </h3>
                      <p className="text-xs text-center mt-1" style={{ color: 'var(--color-text-muted)' }}>
                        {needsRelink
                          ? 'Sign in once more so the chatbot can open already signed in from now on.'
                          : 'Use your EMA account credentials. Your past assessment history will be recovered automatically.'}
                      </p>
                    </div>

                    <form onSubmit={handleConnect} className="space-y-3">
                      <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>EMA Username</label>
                        <input
                          type="text" value={username} onChange={e => setUsername(e.target.value)} required
                          placeholder="Your EMA username"
                          className="w-full px-3 py-2.5 text-sm rounded-xl outline-none transition"
                          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                          onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                          onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Password</label>
                        <div className="relative">
                          <input
                            type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                            placeholder="••••••••"
                            className="w-full px-3 py-2.5 pr-10 text-sm rounded-xl outline-none transition"
                            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                            onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                            onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                          />
                          <button type="button" onClick={() => setShowPw(p => !p)}
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                            style={{ color: 'var(--color-text-muted)' }}>
                            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>

                      <EmaConsentCheckbox checked={consented} onChange={setConsented} id="ema-widget-consent" />

                      {error && (
                        <p className="text-xs rounded-lg px-3 py-2"
                          style={{ color: 'var(--color-danger-text)', background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)' }}>
                          {error}
                        </p>
                      )}

                      <button type="submit" disabled={logging || !consented}
                        className="w-full flex items-center justify-center gap-2 py-2.5 disabled:opacity-50 text-sm font-medium rounded-xl transition"
                        style={{ background: 'var(--color-primary)', color: 'white' }}
                        onMouseEnter={e => { if (!logging) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'; }}>
                        {logging
                          ? <><Loader2 size={14} className="animate-spin" /> Connecting…</>
                          : <><LogIn size={14} /> Sign in & Open Chatbot</>}
                      </button>
                    </form>

                    <p className="text-xs text-center mt-4" style={{ color: 'var(--color-border-strong)' }}>
                      You only do this once. Your password isn&apos;t saved. You can disconnect anytime in your Profile.
                    </p>
                  </div>
                </div>
              )}

              {/* Toasts */}
              {connected === true && (justConnected || syncMsg) && (
                <div
                  className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-full shadow-lg whitespace-nowrap"
                  style={{ background: 'var(--color-primary-hover)', color: 'white' }}
                >
                  <CheckCircle size={13} />
                  {justConnected
                    ? (recovered > 0 ? `Connected! ${recovered} past assessment${recovered !== 1 ? 's' : ''} recovered.` : 'Connected to EMA.')
                    : syncMsg}
                </div>
              )}

              {/* Chat — CPS talks to EMA as this student with their saved key */}
              {connected === true && (
                <EmaChat onNeedsRelink={() => { setConnected(false); setNeedsRelink(true); }} />
              )}

            </div>
          )}
        </div>
      )}
    </>
  );
}
