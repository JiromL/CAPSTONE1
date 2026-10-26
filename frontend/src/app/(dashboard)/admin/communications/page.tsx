"use client";

import { useState, useEffect, useCallback } from 'react';
import { Send, Users, CheckCircle, AlertCircle, Search, X } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { apiFetch } from '@/utils/api';

interface User {
  _id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Students',
  IC: 'Intake Counselors',
  COUNSELOR: 'Counselors',
  PSYCHOLOGIST: 'Psychologists',
  CASE_MANAGER: 'Case Managers',
  STAFF: 'Staff',
  ADMIN: 'Admins',
  DPO: 'DPO',
};

export default function CommunicationsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('STUDENT');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/users?role=${roleFilter}&limit=200`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || data || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [roleFilter]);

  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => { setSelected(new Set()); }, [roleFilter]);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return !q || `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(q);
  });

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(u => u._id)));
    }
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function send() {
    if (!message.trim() || selected.size === 0) return;
    setStatus('sending');
    setFeedback('');
    try {
      const res = await apiFetch('/api/communications/bulk-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients: Array.from(selected), message: message.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setFeedback(data.message || `Sent to ${selected.size} recipient(s).`);
        setMessage('');
        setSelected(new Set());
      } else {
        setStatus('error');
        setFeedback(data.error || 'Failed to send.');
      }
    } catch {
      setStatus('error');
      setFeedback('Network error — could not reach the server.');
    }
  }

  return (
    <DashboardPageWrapper title="Bulk Communications" subtitle="Send an in-app message to multiple users at once">
      <div className="max-w-3xl space-y-6">

        {/* Recipient picker */}
        <div className="rounded-2xl p-5 space-y-4"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Users size={15} style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Recipients
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {Object.entries(ROLE_LABELS).map(([r, label]) => (
                <button key={r}
                  onClick={() => setRoleFilter(r)}
                  className="text-xs px-3 py-1 rounded-full border transition"
                  style={{
                    background: roleFilter === r ? 'var(--color-primary)' : 'transparent',
                    color: roleFilter === r ? '#fff' : 'var(--color-text-secondary)',
                    borderColor: roleFilter === r ? 'var(--color-primary)' : 'var(--color-border)',
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full text-sm rounded-lg border pl-8 pr-8 py-2 focus:outline-none"
              style={{
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X size={13} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            )}
          </div>

          {/* User list */}
          <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--color-border)', maxHeight: 280, overflowY: 'auto' }}>
            {loading ? (
              <div className="p-4 text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>No users found.</div>
            ) : (
              <>
                <div className="flex items-center gap-3 px-4 py-2 text-xs font-medium cursor-pointer"
                  style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
                  onClick={toggleAll}>
                  <input type="checkbox" readOnly
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    className="rounded" />
                  <span>Select all ({filtered.length})</span>
                  {selected.size > 0 && (
                    <span className="ml-auto font-semibold" style={{ color: 'var(--color-primary)' }}>
                      {selected.size} selected
                    </span>
                  )}
                </div>
                {filtered.map(u => (
                  <div key={u._id}
                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition"
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                    onClick={() => toggle(u._id)}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <input type="checkbox" readOnly checked={selected.has(u._id)} className="rounded flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                        {u.first_name} {u.last_name}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{u.email}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Message composer */}
        <div className="rounded-2xl p-5 space-y-4"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Message</p>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={5}
            placeholder="Write your message here…"
            className="w-full text-sm rounded-lg border p-3 resize-none focus:outline-none"
            style={{
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />

          {status === 'success' && (
            <div className="flex items-center gap-2 p-3 rounded-lg text-sm"
              style={{ background: 'var(--color-success-surface)', border: '1px solid var(--color-success)', color: 'var(--color-success-text)' }}>
              <CheckCircle size={14} className="flex-shrink-0" />
              <span>{feedback}</span>
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-center gap-2 p-3 rounded-lg text-sm"
              style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)', color: 'var(--color-danger-text)' }}>
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          <button
            onClick={send}
            disabled={status === 'sending' || selected.size === 0 || !message.trim()}
            className="flex items-center gap-2 text-white px-5 py-2 rounded-lg text-sm font-medium transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--color-primary)' }}>
            <Send size={14} />
            {status === 'sending'
              ? 'Sending…'
              : `Send to ${selected.size || 0} recipient${selected.size === 1 ? '' : 's'}`}
          </button>
        </div>

      </div>
    </DashboardPageWrapper>
  );
}
