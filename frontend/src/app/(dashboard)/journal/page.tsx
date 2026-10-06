'use client';

import { useState, useEffect } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import { Plus, Trash2, Edit2, X, Tag, Loader2, ChevronDown, ChevronUp, BookOpen, Lock } from 'lucide-react';

interface JournalEntry {
  journal_id: string;
  mood: number;
  content: string;
  tags: string[];
  source?: string | null;
  created_at: string;
}

const MOODS = [
  { value: 1, emoji: '😢', label: 'Very Sad',  color: '#ef4444' },
  { value: 2, emoji: '😟', label: 'Sad',        color: '#f97316' },
  { value: 3, emoji: '😐', label: 'Neutral',    color: '#eab308' },
  { value: 4, emoji: '🙂', label: 'Good',       color: '#22c55e' },
  { value: 5, emoji: '😊', label: 'Great',      color: '#6366f1' },
];

function getMood(v: number) { return MOODS[Math.max(0, Math.min(4, v - 1))]; }

function fmtFull(d: string) {
  return new Date(d).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}
function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true });
}
function fmtMonthYear(d: string) {
  return new Date(d).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'long', year: 'numeric' });
}

export default function JournalPage() {
  const [entries, setEntries]       = useState<JournalEntry[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [composing, setComposing]   = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [content, setContent]       = useState('');
  const [mood, setMood]             = useState(3);
  const [tags, setTags]             = useState('');
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  const h = () => {
    const t = localStorage.getItem('token');
    return { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' };
  };

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(api('/api/engagement/journal?limit=50'), { headers: h() });
      if (r.ok) { const d = await r.json(); setEntries(d.entries ?? []); setTotal(d.total ?? 0); }
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCompose = () => { setContent(''); setMood(3); setTags(''); setEditingId(null); setError(''); setComposing(true); };
  const openEdit = (e: JournalEntry) => {
    setContent(e.content); setMood(e.mood); setTags(e.tags.join(', '));
    setEditingId(e.journal_id); setError(''); setComposing(true); setExpandedId(null);
  };
  const closeCompose = () => { setComposing(false); setEditingId(null); setError(''); };

  const handleSave = async () => {
    if (!content.trim()) { setError('Write something first.'); return; }
    setSaving(true); setError('');
    try {
      const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
      const body = JSON.stringify({ mood, content, tags: tagList, is_private: true });
      const url    = editingId ? api(`/api/engagement/journal/${editingId}`) : api('/api/engagement/journal');
      const method = editingId ? 'PATCH' : 'POST';
      const r = await fetch(url, { method, headers: h(), body });
      if (!r.ok) throw new Error('Failed to save');
      await load(); closeCompose();
    } catch { setError('Failed to save entry.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    const r = await fetch(api(`/api/engagement/journal/${id}`), { method: 'DELETE', headers: h() });
    if (r.ok) { setEntries(prev => prev.filter(e => e.journal_id !== id)); setTotal(t => t - 1); if (expandedId === id) setExpandedId(null); }
  };

  const thisMonthCount = (() => {
    const now = new Date();
    return entries.filter(e => { const d = new Date(e.created_at); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); }).length;
  })();

  const grouped: { month: string; items: JournalEntry[] }[] = [];
  for (const e of entries) {
    const m = fmtMonthYear(e.created_at);
    const last = grouped[grouped.length - 1];
    if (last && last.month === m) last.items.push(e);
    else grouped.push({ month: m, items: [e] });
  }

  const today = new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const currentMoodColor = getMood(mood).color;

  return (
    <DashboardPageWrapper
      title="My Journal"
      subtitle="A private space to reflect on your thoughts and feelings"
      actions={
        <button onClick={openCompose} className="btn-primary !min-h-11 !px-5 !text-sm">
          <Plus size={16} /> New entry
        </button>
      }
    >

      {/* Entry counts */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <BookOpen size={15} style={{ color: 'var(--color-text-muted)' }} />
              <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{total}</span> entries
            </span>
            {thisMonthCount > 0 && (
              <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <BookOpen size={15} style={{ color: 'var(--color-primary)' }} />
                <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{thisMonthCount}</span> this month
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Compose / Edit panel */}
      {composing && (
        <div className="mb-6 rounded-2xl border shadow-card overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          {/* Mood accent bar */}
          <div className="h-1.5 w-full" style={{ background: currentMoodColor }} />
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-display text-xl" style={{ color: 'var(--color-text-primary)' }}>{editingId ? 'Edit entry' : 'New entry'}</p>
                <p className="flex items-center gap-1.5 type-caption mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {today} · <Lock size={11} aria-hidden="true" /> Only you can see this
                </p>
              </div>
              <button onClick={closeCompose} aria-label="Close editor" className="w-10 h-10 flex items-center justify-center rounded-xl transition hover:bg-[var(--color-bg)]">
                <X size={16} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>

            {/* Mood row */}
            <div className="mb-4">
              <p className="field-label">How are you feeling?</p>
              <div className="flex gap-2 flex-wrap">
                {MOODS.map(m => {
                  const sel = mood === m.value;
                  return (
                    <button key={m.value} onClick={() => setMood(m.value)} title={m.label}
                      aria-pressed={sel}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-sm transition-all active:scale-95"
                      style={sel
                        ? { borderColor: m.color, background: `${m.color}15`, color: m.color, fontWeight: 600 }
                        : { borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                      onMouseEnter={e => { if (!sel) { e.currentTarget.style.borderColor = m.color; e.currentTarget.style.color = m.color; } }}
                      onMouseLeave={e => { if (!sel) { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)'; } }}>
                      <span className="text-base">{m.emoji}</span>
                      <span className="hidden sm:inline">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Writing area */}
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="What's on your mind today?"
              rows={6}
              className="w-full px-4 py-3 text-sm rounded-lg outline-none transition resize-none leading-relaxed"
              style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)' }}
              onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px var(--color-primary-surface)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
            />

            {/* Tags */}
            <div className="flex items-center gap-2 mt-3">
              <Tag size={14} className="flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
              <input
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="Tags: stress, family, school  (comma-separated)"
                className="flex-1 px-3 py-2 text-sm rounded-lg outline-none transition"
                style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
                onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px var(--color-primary-surface)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {error && <p className="text-xs mt-3" style={{ color: 'var(--color-danger)' }}>{error}</p>}

            <div className="flex gap-2 justify-end mt-4">
              <button onClick={closeCompose}
                className="px-4 py-2 text-sm rounded-lg transition border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 text-sm text-white font-medium rounded-xl disabled:opacity-50 transition hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}>
                {saving && <Loader2 size={13} className="animate-spin" />}
                {editingId ? 'Update Entry' : 'Save Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entries */}
      {loading ? (
        <div className="flex items-center justify-center h-40 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading entries…
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-52 text-center rounded-2xl border shadow-card"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <BookOpen size={28} className="mb-3" style={{ color: 'var(--color-border)' }} />
          <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>No entries yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Your journal is private. Start writing today.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => (
            <div key={group.month}>
              <div className="flex items-center gap-3 mb-3">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{group.month}</p>
                <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
              </div>
              <div className="space-y-2">
                {group.items.map(entry => {
                  const m = getMood(entry.mood);
                  const expanded = expandedId === entry.journal_id;
                  return (
                    <div key={entry.journal_id}
                      className="border rounded-xl overflow-hidden transition-colors"
                      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-text-muted)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}>
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                {fmtFull(entry.created_at)}
                              </span>
                              <span style={{ color: 'var(--color-border)' }}>·</span>
                              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{fmtTime(entry.created_at)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className="text-base">{m.emoji}</span>
                              <span className="text-xs font-medium" style={{ color: m.color }}>{m.label}</span>
                              {entry.source === 'ema' && (
                                <span className="ml-1 inline-flex items-center gap-1 text-[11px] font-medium pl-0.5 pr-2 py-0.5 rounded-full"
                                  style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary-text)' }}
                                  title="Copied from your check-in with Ema">
                                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                                    style={{ background: 'var(--color-surface)' }}>E</span>
                                  From EMA check-in
                                </span>
                              )}
                            </div>
                            <p className={`text-sm leading-relaxed ${expanded ? 'whitespace-pre-wrap' : 'line-clamp-3'}`}
                              style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
                              {entry.content}
                            </p>
                            {entry.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2.5">
                                {entry.tags.map((tag, i) => (
                                  <span key={i} className="text-xs px-2 py-0.5 rounded-full font-medium"
                                    style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
                            <button onClick={() => openEdit(entry)}
                              className="p-1.5 rounded-lg transition"
                              style={{ color: 'var(--color-text-muted)' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => handleDelete(entry.journal_id)}
                              className="p-1.5 rounded-lg transition"
                              style={{ color: 'var(--color-text-muted)' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-danger-surface)'; e.currentTarget.style.color = 'var(--color-danger)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
                              <Trash2 size={14} />
                            </button>
                            <button onClick={() => setExpandedId(expanded ? null : entry.journal_id)}
                              className="p-1.5 rounded-lg transition"
                              style={{ color: 'var(--color-text-muted)' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
                              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardPageWrapper>
  );
}
