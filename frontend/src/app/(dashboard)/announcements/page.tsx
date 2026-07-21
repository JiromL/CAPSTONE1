'use client';

import { useState, useEffect } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import { Plus, Trash2, X, Loader2, Pin, ExternalLink } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  body?: string;
  event_type: string;
  event_date?: string;
  link?: string;
  pinned?: boolean;
  created_at: string;
}

const EVENT_TYPES = [
  { value: 'webinar', label: 'Webinar' },
  { value: 'event',   label: 'Event' },
  { value: 'notice',  label: 'Notice' },
  { value: 'info',    label: 'Info / General' },
];

function typeStyle(t: string): React.CSSProperties {
  switch (t) {
    case 'webinar': return { background: 'var(--color-primary-surface)', color: 'var(--color-primary)' };
    case 'event':   return { background: 'var(--color-success-surface)', color: 'var(--color-success)' };
    case 'notice':  return { background: 'var(--color-warning-surface)', color: 'var(--color-warning)' };
    default:        return { background: 'var(--color-bg)', color: 'var(--color-text-muted)' };
  }
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtEventDate(s: string) {
  return new Date(s).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

const POSTER_ROLES = new Set(['PSYCHOLOGIST', 'ADMIN', 'DPO']);

const IC = 'w-full px-3 py-2.5 text-sm rounded-lg outline-none transition';
const ICS: React.CSSProperties = {
  background: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-primary)',
};

export default function AnnouncementsPage() {
  const [items, setItems]         = useState<Announcement[]>([]);
  const [loading, setLoading]     = useState(true);
  const [canPost, setCanPost]     = useState(false);
  const [composing, setComposing] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const [title, setTitle]         = useState('');
  const [body, setBody]           = useState('');
  const [eventType, setEventType] = useState('info');
  const [eventDate, setEventDate] = useState('');
  const [link, setLink]           = useState('');
  const [pinned, setPinned]       = useState(false);

  const h = () => {
    const t = localStorage.getItem('token');
    return { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' };
  };

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(api('/api/announcements?limit=50'), { headers: h() });
      if (r.ok) { const d = await r.json(); setItems(d.announcements || []); }
    } finally { setLoading(false); }
  };

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      setCanPost(POSTER_ROLES.has((u.role || '').toUpperCase()));
    } catch {}
    load();
  }, []);

  const resetForm = () => { setTitle(''); setBody(''); setEventType('info'); setEventDate(''); setLink(''); setPinned(false); setError(''); };
  const openCompose  = () => { resetForm(); setComposing(true); };
  const closeCompose = () => { setComposing(false); resetForm(); };

  const handleSave = async () => {
    if (!title.trim()) { setError('Title is required.'); return; }
    setSaving(true); setError('');
    try {
      const payload: any = { title: title.trim(), body: body.trim(), event_type: eventType, link: link.trim(), pinned };
      if (eventDate) payload.event_date = eventDate;
      const r = await fetch(api('/api/announcements'), { method: 'POST', headers: h(), body: JSON.stringify(payload) });
      if (!r.ok) throw new Error('Failed');
      await load(); closeCompose();
    } catch { setError('Failed to post announcement.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this announcement? Students will no longer see it.')) return;
    await fetch(api(`/api/announcements/${id}`), { method: 'DELETE', headers: h() });
    setItems(prev => prev.filter(a => a.id !== id));
  };

  return (
    <DashboardPageWrapper title="Announcements" subtitle="Post events, webinars, and notices for students">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{items.length} active announcement{items.length !== 1 ? 's' : ''}</p>
        {canPost && (
          <button onClick={openCompose}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition hover:opacity-90"
            style={{ background: 'var(--color-primary)' }}>
            <Plus size={15} /> New Announcement
          </button>
        )}
      </div>

      {/* Compose panel */}
      {composing && (
        <div className="mb-6 rounded-xl overflow-hidden shadow-card"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="h-1" style={{ background: 'var(--color-primary)' }} />
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <p className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>New Announcement</p>
              <button onClick={closeCompose} className="p-1.5 rounded-lg transition"
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <X size={16} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Type */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Type</label>
                <div className="flex gap-2 flex-wrap">
                  {EVENT_TYPES.map(t => {
                    const sel = eventType === t.value;
                    return (
                      <button key={t.value} onClick={() => setEventType(t.value)}
                        className="px-3 py-1.5 text-sm rounded-lg border transition"
                        style={sel
                          ? { borderColor: 'var(--color-primary)', background: 'var(--color-primary-surface)', color: 'var(--color-primary)', fontWeight: 600 }
                          : { borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}>
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  Title <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Stress Management Webinar — June 20"
                  className={IC} style={ICS} />
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  Description <span style={{ color: 'var(--color-text-muted)' }}>(optional)</span>
                </label>
                <textarea value={body} onChange={e => setBody(e.target.value)}
                  placeholder="Short description students will see on the dashboard…"
                  rows={3} className="w-full px-3 py-2.5 text-sm rounded-lg outline-none transition resize-none"
                  style={ICS} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Event Date <span style={{ color: 'var(--color-text-muted)' }}>(optional)</span>
                  </label>
                  <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className={IC} style={ICS} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Link <span style={{ color: 'var(--color-text-muted)' }}>(optional)</span>
                  </label>
                  <input value={link} onChange={e => setLink(e.target.value)} placeholder="https://meet.google.com/…"
                    className={IC} style={ICS} />
                </div>
              </div>

              {/* Pinned toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <div onClick={() => setPinned(p => !p)}
                  className="relative w-9 h-5 rounded-full transition-colors"
                  style={{ background: pinned ? 'var(--color-primary)' : 'var(--color-border)' }}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${pinned ? 'left-4' : 'left-0.5'}`} />
                </div>
                <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>Pin to top</span>
                <Pin size={13} style={{ color: pinned ? 'var(--color-primary)' : 'var(--color-border)' }} />
              </label>
            </div>

            {error && <p className="text-xs mt-3" style={{ color: 'var(--color-danger)' }}>{error}</p>}

            <div className="flex gap-2 justify-end mt-5">
              <button onClick={closeCompose}
                className="px-4 py-2 text-sm rounded-lg border transition"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 text-sm text-white font-medium rounded-lg disabled:opacity-50 transition hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}>
                {saving && <Loader2 size={13} className="animate-spin" />}
                Post Announcement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-40 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-52 rounded-xl text-center shadow-card"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-2xl mb-3">📢</p>
          <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>No announcements yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {canPost ? 'Click "New Announcement" to post something for students.' : 'No active announcements from CPS at this time.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => {
            const typeLabel = EVENT_TYPES.find(t => t.value === item.event_type)?.label || 'Info';
            return (
              <div key={item.id} className="rounded-xl p-5 transition shadow-card"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={typeStyle(item.event_type)}>
                        {typeLabel}
                      </span>
                      {item.pinned && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          <Pin size={11} /> Pinned
                        </span>
                      )}
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Posted {fmtDate(item.created_at)}</span>
                    </div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{item.title}</p>
                    {item.body && <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{item.body}</p>}
                    {item.event_date && <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>📅 {fmtEventDate(item.event_date)}</p>}
                    {item.link && (
                      <a href={item.link} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs mt-1.5 hover:underline"
                        style={{ color: 'var(--color-primary)' }}>
                        <ExternalLink size={11} /> {item.link}
                      </a>
                    )}
                  </div>
                  {canPost && (
                    <button onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-lg transition flex-shrink-0"
                      style={{ color: 'var(--color-text-muted)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-danger-surface)'; e.currentTarget.style.color = 'var(--color-danger)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardPageWrapper>
  );
}
