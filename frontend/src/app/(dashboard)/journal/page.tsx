'use client';

import { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { api } from '@/utils/api';
import { AlertCircle, Plus, Trash2, Edit2, Heart, ChevronRight } from 'lucide-react';

interface JournalEntry {
  journal_id: string;
  mood: number;
  content: string;
  tags: string[];
  created_at: string;
}

interface JournalData {
  entries: JournalEntry[];
  total: number;
}

const MOOD_EMOJIS = ['😢', '😟', '😐', '🙂', '😊'];
const MOOD_LABELS = ['Very Sad', 'Sad', 'Neutral', 'Happy', 'Very Happy'];

export default function JournalPage() {
  const [journalData, setJournalData] = useState<JournalData>({ entries: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newContent, setNewContent] = useState('');
  const [newMood, setNewMood] = useState(3);
  const [newTags, setNewTags] = useState('');

  // Fetch journal entries
  useEffect(() => {
    const fetchJournal = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('access_token');
        if (!token) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }

        const response = await fetch(`${api('/api/engagement/journal?limit=50')}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch journal entries');
        }

        const data = await response.json();
        setJournalData(data);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load journal');
      } finally {
        setLoading(false);
      }
    };

    fetchJournal();
  }, []);

  // Create new entry
  const handleCreateEntry = async () => {
    if (!newContent.trim()) {
      setError('Please write something in your entry');
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const tags = newTags.split(',').map(t => t.trim()).filter(t => t);

      const response = await fetch(`${api('/api/engagement/journal')}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mood: newMood,
          content: newContent,
          tags: tags,
          is_private: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create entry');
      }

      // Refresh journal list
      const listResponse = await fetch(`${api('/api/engagement/journal?limit=50')}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await listResponse.json();
      setJournalData(data);
      setShowNewEntry(false);
      setNewContent('');
      setNewMood(3);
      setNewTags('');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create entry');
    }
  };

  // Update entry
  const handleUpdateEntry = async () => {
    if (!editingId || !newContent.trim()) return;

    try {
      const token = localStorage.getItem('access_token');
      const tags = newTags.split(',').map(t => t.trim()).filter(t => t);

      const response = await fetch(`${api(`/api/engagement/journal/${editingId}`)}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mood: newMood,
          content: newContent,
          tags: tags
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update entry');
      }

      // Refresh journal list
      const listResponse = await fetch(`${api('/api/engagement/journal?limit=50')}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await listResponse.json();
      setJournalData(data);
      setEditingId(null);
      setNewContent('');
      setNewMood(3);
      setNewTags('');
      setSelectedEntry(null);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update entry');
    }
  };

  // Delete entry
  const handleDeleteEntry = async (journalId: string) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;

    try {
      const token = localStorage.getItem('access_token');

      const response = await fetch(`${api(`/api/engagement/journal/${journalId}`)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete entry');
      }

      // Remove from list
      setJournalData({
        ...journalData,
        entries: journalData.entries.filter(e => e.journal_id !== journalId),
        total: journalData.total - 1
      });

      setSelectedEntry(null);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entry');
    }
  };

  const startEdit = (entry: JournalEntry) => {
    setEditingId(entry.journal_id);
    setNewContent(entry.content);
    setNewMood(entry.mood);
    setNewTags(entry.tags.join(', '));
    setSelectedEntry(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewContent('');
    setNewMood(3);
    setNewTags('');
  };

  if (loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Journal</h1>
            <p className="text-gray-600 dark:text-gray-400">Reflect on your thoughts and feelings</p>
          </div>
          <button
            onClick={() => {
              setShowNewEntry(!showNewEntry);
              setEditingId(null);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Plus size={20} />
            New Entry
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Total Entries</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{journalData.total}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Current Mood</p>
            <p className="text-4xl">{journalData.entries.length > 0 ? MOOD_EMOJIS[journalData.entries[0].mood - 1] : '😐'}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Last Entry</p>
            <p className="text-gray-900 dark:text-white font-medium">
              {journalData.entries.length > 0
                ? new Date(journalData.entries[0].created_at).toLocaleDateString()
                : 'No entries yet'}
            </p>
          </div>
        </div>

        {/* New/Edit Entry Form */}
        {(showNewEntry || editingId) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {editingId ? 'Edit Entry' : 'Write a New Entry'}
            </h2>

            {/* Mood Selector */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                How are you feeling?
              </label>
              <div className="flex gap-2 justify-center">
                {MOOD_EMOJIS.map((emoji, idx) => (
                  <button
                    key={idx}
                    onClick={() => setNewMood(idx + 1)}
                    className={`text-3xl p-2 rounded-lg transition ${
                      newMood === idx + 1
                        ? 'bg-blue-200 dark:bg-blue-900 scale-110'
                        : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                    title={MOOD_LABELS[idx]}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                {MOOD_LABELS[newMood - 1]}
              </p>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Your thoughts
              </label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Write what's on your mind..."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tags (optional, comma-separated)
              </label>
              <input
                type="text"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                placeholder="e.g., stress, family, school"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelEdit}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={editingId ? handleUpdateEntry : handleCreateEntry}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                {editingId ? 'Update Entry' : 'Save Entry'}
              </button>
            </div>
          </div>
        )}

        {/* Journal Entries List */}
        <div className="space-y-4">
          {journalData.entries.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
              <Heart className="mx-auto text-gray-400 dark:text-gray-600 mb-4" size={48} />
              <p className="text-gray-700 dark:text-gray-300 font-medium">No journal entries yet</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Start your journaling journey by creating your first entry</p>
            </div>
          ) : (
            journalData.entries.map((entry) => (
              <div
                key={entry.journal_id}
                className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 cursor-pointer transition hover:shadow-md dark:hover:shadow-lg ${
                  selectedEntry?.journal_id === entry.journal_id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => {
                  if (editingId !== entry.journal_id) {
                    setSelectedEntry(selectedEntry?.journal_id === entry.journal_id ? null : entry);
                  }
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">{MOOD_EMOJIS[entry.mood - 1]}</span>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(entry.created_at).toLocaleDateString()} at{' '}
                          {new Date(entry.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {MOOD_LABELS[entry.mood - 1]}
                        </p>
                      </div>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 line-clamp-2">{entry.content}</p>
                    {entry.tags.length > 0 && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {entry.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <ChevronRight
                    className={`text-gray-400 transition ${
                      selectedEntry?.journal_id === entry.journal_id ? 'rotate-90' : ''
                    }`}
                    size={20}
                  />
                </div>

                {/* Expanded Detail View */}
                {selectedEntry?.journal_id === entry.journal_id && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Full Entry</h4>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{entry.content}</p>
                    </div>
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(entry);
                        }}
                        className="flex items-center gap-2 px-3 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition"
                      >
                        <Edit2 size={16} />
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEntry(entry.journal_id);
                        }}
                        className="flex items-center gap-2 px-3 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </PageShell>
  );
}
