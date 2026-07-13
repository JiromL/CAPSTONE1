'use client';

import { useState, useEffect } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import { Plus, Trash2, Edit2, X, Tag, Loader2, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';

interface JournalEntry {
  journal_id: string;
  mood: number;
  content: string;
  tags: string[];
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
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}
function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}
function fmtMonthYear(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
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

  const openCompose = () => {
    setContent(''); setMood(3); setTags(''); setEditingId(null); setError(''); setComposing(true);
  };
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
      const body    = JSON.stringify({ mood, content, tags: tagList, is_private: true });
      const url     = editingId ? api(`/api/engagement/journal/${editingId}`) : api('/api/engagement/journal');
      const method  = editingId ? 'PATCH' : 'POST';
      const r = await fetch(url, { method, headers: h(), body });
      if (!r.ok) throw new Error('Failed to save');
      await load();
      closeCompose();
    } catch { setError('Failed to save entry.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    const r = await fetch(api(`/api/engagement/journal/${id}`), { method: 'DELETE', headers: h() });
    if (r.ok) {
      setEntries(prev => prev.filter(e => e.journal_id !== id));
      setTotal(t => t - 1);
      if (expandedId === id) setExpandedId(null);
    }
  };

  const thisMonthCount = (() => {
    const now = new Date();
    return entries.filter(e => {
      const d = new Date(e.created_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
  })();

  // Group entries by month
  const grouped: { month: string; items: JournalEntry[] }[] = [];
  for (const e of entries) {
    const m = fmtMonthYear(e.created_at);
    const last = grouped[grouped.length - 1];
    if (last && last.month === m) last.items.push(e);
    else grouped.push({ month: m, items: [e] });
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <DashboardPageWrapper title="My Journal" subtitle="A private space to reflect on your thoughts and feelings">

      {/* Header row */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-sm text-gray-400">{today}</p>
          <div className="flex items-center gap-5 mt-1">
            <span className="flex items-center gap-1.5 text-sm text-gray-600">
              <BookOpen size={15} className="text-gray-400" />
              <span className="font-semibold text-gray-800">{total}</span> entries
            </span>
            {thisMonthCount > 0 && (
              <span className="flex items-center gap-1.5 text-sm text-gray-600">
                <BookOpen size={15} className="text-[#2563eb]" />
                <span className="font-semibold text-gray-800">{thisMonthCount}</span> this month
              </span>
            )}
          </div>
        </div>
        <button
          onClick={openCompose}
          className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg transition"
          style={{ backgroundColor: '#2563eb' }}
        >
          <Plus size={15} /> New Entry
        </button>
      </div>

      {/* Compose / Edit panel */}
      {composing && (
        <div className="mb-6 bg-white rounded-2xl border border-gray-100 shadow-sm shadow-sm overflow-hidden">
          {/* Page-top strip */}
          <div className="h-1.5 w-full" style={{ backgroundColor: getMood(mood).color }} />
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-base font-semibold text-gray-900">{editingId ? 'Edit Entry' : 'New Entry'}</p>
                <p className="text-xs text-gray-400 mt-0.5">{today}</p>
              </div>
              <button onClick={closeCompose} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <X size={16} className="text-gray-400" />
              </button>
            </div>

            {/* Mood row */}
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">How are you feeling?</p>
              <div className="flex gap-2">
                {MOODS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setMood(m.value)}
                    title={m.label}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-all ${
                      mood === m.value
                        ? 'border-gray-300 bg-gray-50 font-medium text-gray-800 shadow-sm'
                        : 'border-gray-100 text-gray-400 hover:border-gray-200 hover:text-gray-600'
                    }`}
                  >
                    <span className="text-base">{m.emoji}</span>
                    <span className="hidden sm:inline">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Writing area */}
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="What's on your mind today?"
              rows={6}
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg bg-[#fafaf8] text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:border-transparent resize-none leading-relaxed"
              style={{ fontFamily: 'Georgia, serif' }}
              onFocus={e => e.currentTarget.style.setProperty('--tw-ring-color', '#2563eb')}
            />

            {/* Tags */}
            <div className="flex items-center gap-2 mt-3">
              <Tag size={14} className="text-gray-300 flex-shrink-0" />
              <input
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="Tags: stress, family, school  (comma-separated)"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300 transition"
              />
            </div>

            {error && <p className="text-xs text-red-500 mt-3">{error}</p>}

            <div className="flex gap-2 justify-end mt-4">
              <button onClick={closeCompose}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 text-sm text-white font-medium rounded-lg disabled:opacity-50 transition"
                style={{ backgroundColor: '#2563eb' }}>
                {saving && <Loader2 size={13} className="animate-spin" />}
                {editingId ? 'Update Entry' : 'Save Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entries */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 gap-2 text-sm">
          <Loader2 size={18} className="animate-spin" /> Loading entries…
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-52 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
          <BookOpen size={28} className="text-gray-300 mb-3" />
          <p className="font-medium text-gray-700">No entries yet</p>
          <p className="text-sm text-gray-400 mt-1">Your journal is private. Start writing today.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => (
            <div key={group.month}>
              {/* Month header */}
              <div className="flex items-center gap-3 mb-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{group.month}</p>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              <div className="space-y-2">
                {group.items.map(entry => {
                  const m        = getMood(entry.mood);
                  const expanded = expandedId === entry.journal_id;
                  return (
                    <div key={entry.journal_id}
                      className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-gray-200 transition-colors">
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          {/* Date + mood */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-sm font-semibold text-gray-800">
                                {fmtFull(entry.created_at)}
                              </span>
                              <span className="text-gray-300">·</span>
                              <span className="text-xs text-gray-400">{fmtTime(entry.created_at)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className="text-base">{m.emoji}</span>
                              <span className="text-xs font-medium" style={{ color: m.color }}>{m.label}</span>
                            </div>
                            <p className={`text-sm text-gray-700 leading-relaxed ${expanded ? 'whitespace-pre-wrap' : 'line-clamp-3'}`}
                              style={{ fontFamily: 'Georgia, serif' }}>
                              {entry.content}
                            </p>
                            {entry.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2.5">
                                {entry.tags.map((tag, i) => (
                                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
                            <button onClick={() => openEdit(entry)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-300 hover:text-gray-500 transition">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => handleDelete(entry.journal_id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition">
                              <Trash2 size={14} />
                            </button>
                            <button onClick={() => setExpandedId(expanded ? null : entry.journal_id)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-300 hover:text-gray-500 transition">
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
