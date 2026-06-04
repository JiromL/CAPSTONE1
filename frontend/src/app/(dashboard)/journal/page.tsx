'use client';

import { useState, useEffect } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import { Plus, Trash2, Edit2, X, BookOpen, Flame, ChevronDown, ChevronUp, Tag, Loader2 } from 'lucide-react';

interface JournalEntry {
  journal_id: string;
  mood: number;
  content: string;
  tags: string[];
  created_at: string;
}

const MOODS = [
  { value: 1, emoji: '😢', label: 'Very Sad',   color: '#ef4444', bg: '#fee2e2' },
  { value: 2, emoji: '😟', label: 'Sad',         color: '#f97316', bg: '#ffedd5' },
  { value: 3, emoji: '😐', label: 'Neutral',     color: '#eab308', bg: '#fef9c3' },
  { value: 4, emoji: '🙂', label: 'Happy',       color: '#22c55e', bg: '#dcfce7' },
  { value: 5, emoji: '😊', label: 'Very Happy',  color: '#6366f1', bg: '#e0e7ff' },
];

function getMood(v: number) { return MOODS[Math.max(0, Math.min(4, v - 1))]; }

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function JournalPage() {
  const [entries, setEntries]     = useState<JournalEntry[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [composing, setComposing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [content, setContent]     = useState('');
  const [mood, setMood]           = useState(3);
  const [tags, setTags]           = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

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
    if (!content.trim()) { setError('Write something first'); return; }
    setSaving(true); setError('');
    try {
      const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
      const body = JSON.stringify({ mood, content, tags: tagList, is_private: true });
      const url    = editingId ? api(`/api/engagement/journal/${editingId}`) : api('/api/engagement/journal');
      const method = editingId ? 'PATCH' : 'POST';
      const r = await fetch(url, { method, headers: h(), body });
      if (!r.ok) throw new Error('Failed to save');
      await load();
      closeCompose();
    } catch { setError('Failed to save entry'); }
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

  // Stats
  const streak = (() => {
    if (!entries.length) return 0;
    // Deduplicate to one entry per calendar day (entries sorted newest first)
    const days: string[] = [];
    for (const e of entries) {
      const day = new Date(e.created_at).toDateString();
      if (!days.includes(day)) days.push(day);
    }
    // Count consecutive days going backwards from today
    let s = 0;
    let cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    for (const day of days) {
      const d = new Date(day);
      const diff = Math.round((cursor.getTime() - d.getTime()) / 86400000);
      if (diff === 0 || diff === 1) { s++; cursor = d; }
      else break;
    }
    return s;
  })();
  const latestMood = entries.length ? getMood(entries[0].mood) : getMood(3);

  return (
    <DashboardPageWrapper title="My Journal" subtitle="Reflect on your thoughts and feelings">

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { icon: <BookOpen size={18} className="text-green-600 dark:text-green-400" />, bg: 'bg-green-50 dark:bg-green-900/30', label: 'Total Entries', value: total },
          { icon: <Flame size={18} className="text-orange-500" />, bg: 'bg-orange-50 dark:bg-orange-900/30', label: 'Day Streak', value: streak },
        ].map(({ icon, bg, label, value }) => (
          <div key={label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>{icon}</div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
            </div>
          </div>
        ))}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: latestMood.bg }}>
            <span className="text-xl">{latestMood.emoji}</span>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Latest Mood</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{entries.length ? latestMood.label : '—'}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex justify-end mb-4">
        <button
          onClick={openCompose}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={15} /> New Entry
        </button>
      </div>

      {/* Compose / Edit panel */}
      {composing && (
        <div className="mb-5 bg-white dark:bg-gray-900 border border-green-200 dark:border-green-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {editingId ? 'Edit Entry' : 'New Entry'}
            </p>
            <button onClick={closeCompose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
              <X size={15} className="text-gray-500" />
            </button>
          </div>

          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">How are you feeling?</p>
          <div className="flex gap-2 mb-4">
            {MOODS.map(m => (
              <button
                key={m.value}
                onClick={() => setMood(m.value)}
                title={m.label}
                className={`flex-1 py-2.5 rounded-xl flex flex-col items-center gap-1 border-2 transition-all ${
                  mood === m.value ? 'scale-105' : 'border-transparent bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                style={mood === m.value ? { background: m.bg, borderColor: m.color } : {}}
              >
                <span className="text-xl">{m.emoji}</span>
                <span className="text-xs font-medium hidden sm:block" style={{ color: mood === m.value ? m.color : '#9ca3af' }}>
                  {m.label}
                </span>
              </button>
            ))}
          </div>

          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="What's on your mind today?"
            rows={5}
            className="w-full px-3.5 py-3 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white dark:focus:bg-gray-900 transition resize-none mb-3"
          />

          <div className="flex items-center gap-2 mb-4">
            <Tag size={13} className="text-gray-400 flex-shrink-0" />
            <input
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="Tags: stress, family, school (comma-separated)"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
            />
          </div>

          {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

          <div className="flex gap-2 justify-end">
            <button onClick={closeCompose} className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-lg flex items-center gap-2 transition-colors"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              {editingId ? 'Update' : 'Save Entry'}
            </button>
          </div>
        </div>
      )}

      {/* Entries list */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 gap-2">
          <Loader2 size={20} className="animate-spin" /> Loading entries…
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
          <div className="w-14 h-14 rounded-2xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center mb-4">
            <BookOpen size={24} className="text-green-400" />
          </div>
          <p className="font-medium text-gray-900 dark:text-white mb-1">No entries yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Start your journaling journey today</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => {
            const m        = getMood(entry.mood);
            const expanded = expandedId === entry.journal_id;
            return (
              <div key={entry.journal_id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                <div className="h-1 w-full" style={{ background: m.color }} />
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: m.bg }}>
                      <span className="text-lg">{m.emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold" style={{ color: m.color }}>{m.label}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {fmtDate(entry.created_at)} · {fmtTime(entry.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => openEdit(entry)}
                            className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(entry.journal_id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition text-gray-400 hover:text-red-500"
                          >
                            <Trash2 size={13} />
                          </button>
                          <button
                            onClick={() => setExpandedId(expanded ? null : entry.journal_id)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400"
                          >
                            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        </div>
                      </div>

                      <p className={`text-sm text-gray-700 dark:text-gray-300 mt-2 leading-relaxed ${expanded ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}>
                        {entry.content}
                      </p>

                      {entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {entry.tags.map((tag, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-medium">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardPageWrapper>
  );
}
