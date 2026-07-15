"use client";

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PageShell from '@/components/PageShell';
import {
  CheckCircle2, XCircle, Clock, Phone, Mail, AlertTriangle,
  MessageSquare, Send, Loader2, AlertCircle, FileText, Eye,
} from 'lucide-react';
import { api } from '@/utils/api';

const token = () => localStorage.getItem('token') ?? '';

// ── shared helpers ─────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="text-center py-16">
      <Icon className="mx-auto mb-4" size={32} style={{ color: 'var(--color-text-muted)' }} />
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{text}</p>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
      <Loader2 size={16} className="animate-spin" /> Loading…
    </div>
  );
}

// ── Tab: Verify Intakes ────────────────────────────────────────────────────

function VerifyTab() {
  const [intakes, setIntakes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => {
    fetch(api('/api/intake/list?status=completed'), { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : { intakes: [] })
      .then(d => setIntakes(Array.isArray(d) ? d : d.intakes || []))
      .catch(() => setIntakes([]))
      .finally(() => setLoading(false));
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActioningId(id);
    try {
      const r = await fetch(api(`/api/intake/${id}/verify`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (r.ok) {
        setIntakes(prev => prev.map(i =>
          i._id === id ? { ...i, verification_status: action === 'approve' ? 'approved' : 'rejected' } : i
        ));
      }
    } finally { setActioningId(null); }
  };

  // treat missing verification_status as pending
  const statusOf = (i: any) => i.verification_status || 'pending';

  const counts = {
    pending:  intakes.filter(i => statusOf(i) === 'pending').length,
    approved: intakes.filter(i => statusOf(i) === 'approved').length,
    rejected: intakes.filter(i => statusOf(i) === 'rejected').length,
  };

  const SUBS: { key: 'pending' | 'approved' | 'rejected'; label: string }[] = [
    { key: 'pending',  label: 'Pending Verification' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {SUBS.map(s => (
          <button key={s.key} onClick={() => setSub(s.key)}
            className="px-3 py-1.5 rounded-lg whitespace-nowrap text-sm font-medium transition"
            style={sub === s.key
              ? { background: 'var(--color-primary)', color: '#fff' }
              : { background: 'var(--color-bg)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
            {s.label}
            <span className="ml-1.5 font-bold">{counts[s.key]}</span>
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : intakes.filter(i => statusOf(i) === sub).length === 0 ? (
        <EmptyState icon={Clock} text="No intakes in this category" />
      ) : (
        <div className="space-y-3">
          {intakes.filter(i => statusOf(i) === sub).map(intake => (
            <div key={intake._id} className="rounded-xl p-4 flex items-start justify-between gap-3"
              style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{intake.student_name || 'Unknown'}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  Completed: {intake.completed_date ? new Date(intake.completed_date).toLocaleDateString() : '—'}
                </p>
              </div>
              {sub === 'pending' && (
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleAction(intake._id, 'approve')} disabled={actioningId === intake._id}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition disabled:opacity-50"
                    style={{ background: 'var(--color-success-surface)', color: 'var(--color-success)' }}>
                    {actioningId === intake._id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                    Approve
                  </button>
                  <button onClick={() => handleAction(intake._id, 'reject')} disabled={actioningId === intake._id}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition disabled:opacity-50"
                    style={{ background: 'var(--color-danger-surface)', color: 'var(--color-danger)' }}>
                    <XCircle size={11} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab: Review Forms ──────────────────────────────────────────────────────

function ReviewTab() {
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending_review' | 'approved' | 'revision_needed'>('all');
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(api('/api/forms?status=pending_review'), { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : [])
      .then(d => setForms(Array.isArray(d) ? d : d.forms || []))
      .catch(() => setForms([]))
      .finally(() => setLoading(false));
  }, []);

  const handleAction = async (formId: string, action: 'approve' | 'revise') => {
    setActioningId(formId); setError('');
    try {
      const r = await fetch(api(`/api/forms/${formId}/${action}`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      });
      if (r.ok) {
        setForms(prev => prev.map(f =>
          f._id === formId ? { ...f, status: action === 'approve' ? 'approved' : 'revision_needed' } : f
        ));
      } else {
        const d = await r.json().catch(() => ({}));
        setError((d as any).error || `Failed to ${action}.`);
      }
    } finally { setActioningId(null); }
  };

  const STATUS_LABEL: Record<string, { label: string; bg: string; color: string }> = {
    pending_review:   { label: 'Pending', bg: 'var(--color-warning-surface)', color: 'var(--color-warning-text)' },
    approved:         { label: 'Approved', bg: 'var(--color-success-surface)', color: 'var(--color-success)' },
    revision_needed:  { label: 'Needs Revision', bg: 'var(--color-danger-surface)', color: 'var(--color-danger)' },
  };

  const displayed = filter === 'all' ? forms : forms.filter(f => f.status === filter);

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['all', 'pending_review', 'approved', 'revision_needed'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-lg whitespace-nowrap text-sm font-medium transition"
            style={filter === f
              ? { background: 'var(--color-primary)', color: '#fff' }
              : { background: 'var(--color-bg)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
            {f === 'all' ? `All (${forms.length})` : STATUS_LABEL[f]?.label + ` (${forms.filter(x => x.status === f).length})`}
          </button>
        ))}
      </div>

      {error && <p className="text-sm px-1" style={{ color: 'var(--color-danger)' }}>{error}</p>}

      {loading ? <Spinner /> : displayed.length === 0 ? (
        <EmptyState icon={FileText} text="No forms in this category" />
      ) : (
        <div className="space-y-3">
          {displayed.map(form => {
            const s = STATUS_LABEL[form.status] || STATUS_LABEL['pending_review'];
            return (
              <div key={form._id} className="rounded-xl p-4 flex items-start justify-between gap-3"
                style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {form.student_name || form.title || 'Untitled Form'}
                    </p>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: s.bg, color: s.color }}>{s.label}</span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    Submitted: {form.submitted_at ? new Date(form.submitted_at).toLocaleDateString() : '—'}
                  </p>
                </div>
                {form.status === 'pending_review' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <a href={`/ic/forms/review/${form._id}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition"
                      style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary)' }}>
                      <Eye size={11} /> View
                    </a>
                    <button onClick={() => handleAction(form._id, 'approve')} disabled={actioningId === form._id}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition disabled:opacity-50"
                      style={{ background: 'var(--color-success-surface)', color: 'var(--color-success)' }}>
                      {actioningId === form._id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                      Approve
                    </button>
                    <button onClick={() => handleAction(form._id, 'revise')} disabled={actioningId === form._id}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition disabled:opacity-50"
                      style={{ background: 'var(--color-warning-surface)', color: 'var(--color-warning-text)' }}>
                      <AlertCircle size={11} /> Revise
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tab: Follow-up ─────────────────────────────────────────────────────────

function FollowUpTab() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState<'pending' | 'attempted' | 'completed'>('pending');
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => {
    fetch(api('/api/qa/follow-up?status=pending'), { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : [])
      .then(d => setTasks(Array.isArray(d) ? d : d.tasks || []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, []);

  const handleAction = async (id: string, action: 'log' | 'complete') => {
    setActioningId(id);
    try {
      const r = await fetch(api(`/api/qa/follow-up/${id}/${action}`), {
        method: 'POST', headers: { Authorization: `Bearer ${token()}` },
      });
      if (r.ok) {
        setTasks(prev => prev.map(t =>
          t._id === id ? { ...t, status: action === 'complete' ? 'completed' : 'attempted' } : t
        ));
      }
    } finally { setActioningId(null); }
  };

  const SUBS: { key: 'pending' | 'attempted' | 'completed'; label: string }[] = [
    { key: 'pending',   label: 'Pending' },
    { key: 'attempted', label: 'Attempted' },
    { key: 'completed', label: 'Completed' },
  ];

  const counts = { pending: 0, attempted: 0, completed: 0 };
  tasks.forEach(t => { const k = t.status as keyof typeof counts; if (k in counts) counts[k]++; });

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {SUBS.map(s => (
          <button key={s.key} onClick={() => setSub(s.key)}
            className="px-3 py-1.5 rounded-lg whitespace-nowrap text-sm font-medium transition"
            style={sub === s.key
              ? { background: 'var(--color-primary)', color: '#fff' }
              : { background: 'var(--color-bg)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
            {s.label} <span className="ml-1.5 font-bold">{counts[s.key]}</span>
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : tasks.filter(t => t.status === sub).length === 0 ? (
        <EmptyState icon={CheckCircle2} text={`No ${sub} follow-up tasks`} />
      ) : (
        <div className="space-y-3">
          {tasks.filter(t => t.status === sub).map(task => (
            <div key={task._id} className="rounded-xl p-4 flex items-start justify-between gap-3"
              style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{task.student_name}</p>
                <p className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {task.method === 'call' ? <Phone size={11} /> : <Mail size={11} />}
                  {task.method === 'call' ? task.phone : task.email}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'}
                </p>
              </div>
              {sub !== 'completed' && (
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleAction(task._id, 'log')} disabled={actioningId === task._id}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50"
                    style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary)' }}>
                    {actioningId === task._id ? <Loader2 size={11} className="animate-spin inline" /> : 'Log'}
                  </button>
                  <button onClick={() => handleAction(task._id, 'complete')} disabled={actioningId === task._id}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition disabled:opacity-50"
                    style={{ background: 'var(--color-success-surface)', color: 'var(--color-success)' }}>
                    <CheckCircle2 size={11} /> Complete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab: Missing Data ──────────────────────────────────────────────────────

function MissingDataTab() {
  const [intakes, setIntakes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(api('/api/intake/list?status=incomplete'), { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : [])
      .then(d => setIntakes(Array.isArray(d) ? d : d.intakes || []))
      .catch(() => setIntakes([]))
      .finally(() => setLoading(false));
  }, []);

  const getMissing = (intake: any) => {
    const fields = [];
    if (!intake.phone) fields.push('Phone');
    if (!intake.email) fields.push('Email');
    if (!intake.date_of_birth) fields.push('DOB');
    if (!intake.emergency_contact) fields.push('Emergency Contact');
    if (!intake.medical_history) fields.push('Medical History');
    return fields;
  };

  return (
    <div className="space-y-5">
      {intakes.length > 0 && (
        <div className="rounded-xl p-4 flex items-start gap-3"
          style={{ background: 'var(--color-warning-surface)', border: '1px solid var(--color-warning)' }}>
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-warning-text)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-warning-text)' }}>
            {intakes.length} intake{intakes.length !== 1 ? 's' : ''} have missing required information
          </p>
        </div>
      )}

      {loading ? <Spinner /> : intakes.length === 0 ? (
        <EmptyState icon={CheckCircle2} text="All intakes have complete data" />
      ) : (
        <div className="space-y-3">
          {intakes.map(intake => {
            const missing = getMissing(intake);
            return (
              <div key={intake._id} className="rounded-xl p-4 flex items-start justify-between gap-3"
                style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{intake.student_name}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {missing.length > 0 ? missing.map(f => (
                      <span key={f} className="px-2 py-0.5 text-xs rounded-full font-medium"
                        style={{ background: 'var(--color-danger-surface)', color: 'var(--color-danger)' }}>
                        {f}
                      </span>
                    )) : (
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No missing fields</span>
                    )}
                  </div>
                </div>
                <a href={`/ic/intake/conduct/${intake._id}`}
                  className="px-3 py-1.5 text-white rounded-lg text-xs font-medium flex-shrink-0 transition flex items-center gap-1"
                  style={{ background: 'var(--color-primary)' }}>
                  <Eye size={11} /> Review
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tab: Contact Students ──────────────────────────────────────────────────

function ContactTab() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch(api('/api/users?role=student'), { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : [])
      .then(d => setStudents(Array.isArray(d) ? d : d.users || d.students || []))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const handleSend = async () => {
    if (!message.trim() || selected.length === 0) return;
    setSending(true); setSendMsg(null);
    try {
      const r = await fetch(api('/api/communications/bulk-send'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients: selected, message }),
      });
      if (r.ok) {
        setSendMsg({ type: 'ok', text: `Message sent to ${selected.length} student${selected.length !== 1 ? 's' : ''}.` });
        setMessage(''); setSelected([]);
      } else {
        const d = await r.json().catch(() => ({}));
        setSendMsg({ type: 'err', text: (d as any).error || 'Failed to send messages.' });
      }
    } catch {
      setSendMsg({ type: 'err', text: 'Network error. Please try again.' });
    } finally { setSending(false); }
  };

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const name = s.name || `${s.first_name ?? ''} ${s.last_name ?? ''}`;
    return !q || name.toLowerCase().includes(q) || (s.email ?? '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Students', value: students.length,  color: 'var(--color-text-primary)' },
          { label: 'Selected',       value: selected.length,  color: 'var(--color-primary)'      },
          { label: 'Msg Length',     value: message.length,   color: 'var(--color-text-secondary)'},
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border p-3 text-center"
            style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
            <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {sendMsg && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm"
          style={sendMsg.type === 'ok'
            ? { background: 'var(--color-success-surface)', border: '1px solid var(--color-success)', color: 'var(--color-success)' }
            : { background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>
          {sendMsg.type === 'ok' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {sendMsg.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Select Students</p>
            {selected.length > 0 && (
              <button onClick={() => setSelected([])} className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Clear all
              </button>
            )}
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email…"
            className="w-full px-3 py-2 text-sm rounded-lg outline-none mb-2"
            style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }} />
          {loading ? <Spinner /> : (
            <div className="space-y-1 max-h-56 overflow-y-auto rounded-xl p-2"
              style={{ border: '1px solid var(--color-border)' }}>
              {filtered.length === 0
                ? <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-muted)' }}>No students found</p>
                : filtered.map(s => {
                    const name = s.name || `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim();
                    return (
                      <label key={s._id} className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition"
                        style={{ background: selected.includes(s._id) ? 'var(--color-primary-surface)' : 'transparent' }}
                        onMouseEnter={e => { if (!selected.includes(s._id)) (e.currentTarget as HTMLElement).style.background = 'var(--color-bg)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = selected.includes(s._id) ? 'var(--color-primary-surface)' : 'transparent'; }}>
                        <input type="checkbox" checked={selected.includes(s._id)} onChange={() => toggle(s._id)}
                          className="w-4 h-4 rounded" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{name}</p>
                          <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{s.email}</p>
                        </div>
                      </label>
                    );
                  })
              }
            </div>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}>
            <MessageSquare size={14} /> Compose Message
          </p>
          <textarea value={message} onChange={e => setMessage(e.target.value)}
            placeholder="Write your message here…" rows={7}
            className="w-full p-3 rounded-xl text-sm outline-none resize-none"
            style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
          <button onClick={handleSend} disabled={!message.trim() || selected.length === 0 || sending}
            className="mt-2 w-full px-4 py-2.5 text-white rounded-xl font-medium flex items-center justify-center gap-2 text-sm transition disabled:opacity-50"
            style={{ background: 'var(--color-primary)' }}>
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Send to {selected.length} Student{selected.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Root QA Page ───────────────────────────────────────────────────────────

const TABS = [
  { key: 'verify',       label: 'Verify Intakes' },
  { key: 'review',       label: 'Review Forms'   },
  { key: 'follow-up',   label: 'Follow-up'       },
  { key: 'missing-data', label: 'Missing Data'   },
  { key: 'contact',      label: 'Contact'         },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function QAPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initial = (searchParams.get('tab') as TabKey) || 'verify';
  const [active, setActive] = useState<TabKey>(initial);

  const setTab = (key: TabKey) => {
    setActive(key);
    router.replace(`/ic/qa?tab=${key}`, { scroll: false });
  };

  return (
    <PageShell title="QA" subtitle="Quality assurance — verify, review, and follow up on intakes">
      <div className="space-y-6">
        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto pb-1" style={{ borderBottom: '1px solid var(--color-border)' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="px-4 py-2.5 text-sm font-medium whitespace-nowrap transition relative"
              style={{
                color: active === t.key ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                borderBottom: active === t.key ? '2px solid var(--color-primary)' : '2px solid transparent',
                marginBottom: -1,
                background: 'transparent',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {active === 'verify'       && <VerifyTab />}
        {active === 'review'       && <ReviewTab />}
        {active === 'follow-up'    && <FollowUpTab />}
        {active === 'missing-data' && <MissingDataTab />}
        {active === 'contact'      && <ContactTab />}
      </div>
    </PageShell>
  );
}
