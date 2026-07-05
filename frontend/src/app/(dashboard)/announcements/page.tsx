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

const TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  webinar: { bg: 'bg-blue-50',   text: 'text-blue-600' },
  event:   { bg: 'bg-green-50',  text: 'text-green-700' },
  notice:  { bg: 'bg-orange-50', text: 'text-orange-600' },
  info:    { bg: 'bg-gray-100',  text: 'text-gray-600' },
};

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}
function fmtEventDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

const POSTER_ROLES = new Set(['PSYCHOLOGIST','ADMIN','DPO']);

export default function AnnouncementsPage() {
  const [items, setItems]       = useState<Announcement[]>([]);
  const [loading, setLoading]   = useState(true);
  const [canPost, setCanPost]   = useState(false);
  const [composing, setComposing] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  // Form state
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
    // Derive can-post from stored user role (avoids extra round-trip)
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      setCanPost(POSTER_ROLES.has((u.role || '').toUpperCase()));
    } catch { /* ignore */ }
    load();
  }, []);

  const resetForm = () => {
    setTitle(''); setBody(''); setEventType('info');
    setEventDate(''); setLink(''); setPinned(false); setError('');
  };

  const openCompose = () => { resetForm(); setComposing(true); };
  const closeCompose = () => { setComposing(false); resetForm(); };

  const handleSave = async () => {
    if (!title.trim()) { setError('Title is required.'); return; }
    setSaving(true); setError('');
    try {
      const body_data: any = {
        title: title.trim(),
        body: body.trim(),
        event_type: eventType,
        link: link.trim(),
        pinned,
      };
      if (eventDate) body_data.event_date = eventDate;

      const r = await fetch(api('/api/announcements'), {
        method: 'POST',
        headers: h(),
        body: JSON.stringify(body_data),
      });
      if (!r.ok) throw new Error('Failed');
      await load();
      closeCompose();
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

      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">{items.length} active announcement{items.length !== 1 ? 's' : ''}</p>
        {canPost && (
          <button
            onClick={openCompose}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition"
            style={{ backgroundColor: '#2563eb' }}
          >
            <Plus size={15} /> New Announcement
          </button>
        )}
      </div>

      {/* Compose panel */}
      {composing && (
        <div className="mb-6 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="h-1" style={{ backgroundColor: '#2563eb' }} />
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <p className="text-base font-semibold text-gray-900">New Announcement</p>
              <button onClick={closeCompose} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <X size={16} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Type</label>
                <div className="flex gap-2 flex-wrap">
                  {EVENT_TYPES.map(t => (
                    <button key={t.value} onClick={() => setEventType(t.value)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                        eventType === t.value
                          ? 'border-gray-400 bg-gray-100 font-medium text-gray-800'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Title <span className="text-red-400">*</span></label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Stress Management Webinar — June 20"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Description <span className="text-gray-400">(optional)</span></label>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Short description students will see on the dashboard…"
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Event date */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Event Date <span className="text-gray-400">(optional)</span></label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={e => setEventDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
                  />
                </div>

                {/* Link */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Link <span className="text-gray-400">(optional)</span></label>
                  <input
                    value={link}
                    onChange={e => setLink(e.target.value)}
                    placeholder="https://meet.google.com/…"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
                  />
                </div>
              </div>

              {/* Pinned toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <div
                  onClick={() => setPinned(p => !p)}
                  className={`w-9 h-5 rounded-full transition-colors relative ${pinned ? 'bg-[#2563eb]' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${pinned ? 'left-4' : 'left-0.5'}`} />
                </div>
                <span className="text-sm text-gray-700">Pin to top</span>
                <Pin size={13} className={pinned ? 'text-[#2563eb]' : 'text-gray-300'} />
              </label>
            </div>

            {error && <p className="text-xs text-red-500 mt-3">{error}</p>}

            <div className="flex gap-2 justify-end mt-5">
              <button onClick={closeCompose}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 text-sm text-white font-medium rounded-lg disabled:opacity-50 transition"
                style={{ backgroundColor: '#2563eb' }}>
                {saving && <Loader2 size={13} className="animate-spin" />}
                Post Announcement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 gap-2 text-sm">
          <Loader2 size={18} className="animate-spin" /> Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-52 bg-white border border-gray-200 rounded-xl text-center">
          <p className="text-2xl mb-3">📢</p>
          <p className="font-medium text-gray-700">No announcements yet</p>
          <p className="text-sm text-gray-400 mt-1">
            {canPost
              ? 'Click "New Announcement" to post something for students.'
              : 'No active announcements from CPS at this time.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => {
            const style = TYPE_STYLES[item.event_type] || TYPE_STYLES.info;
            const typeLabel = EVENT_TYPES.find(t => t.value === item.event_type)?.label || 'Info';
            return (
              <div key={item.id} className="bg-white border border-gray-100 rounded-xl p-5 hover:border-gray-200 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                        {typeLabel}
                      </span>
                      {item.pinned && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Pin size={11} /> Pinned
                        </span>
                      )}
                      <span className="text-xs text-gray-300">Posted {fmtDate(item.created_at)}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                    {item.body && (
                      <p className="text-sm text-gray-500 mt-1 leading-relaxed">{item.body}</p>
                    )}
                    {item.event_date && (
                      <p className="text-xs text-gray-400 mt-2">📅 {fmtEventDate(item.event_date)}</p>
                    )}
                    {item.link && (
                      <a href={item.link} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#2563eb] hover:underline mt-1.5">
                        <ExternalLink size={11} /> {item.link}
                      </a>
                    )}
                  </div>
                  {canPost && (
                    <button onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition flex-shrink-0">
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
