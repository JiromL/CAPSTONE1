'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import { Loader2, Plus, Trash2, Pencil, Check, X, CalendarOff } from 'lucide-react';

interface Holiday {
  id: string;
  date: string;
  name: string;
  description: string;
}

const IC = 'input';
const IC_S: React.CSSProperties = { border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' };
const onFIn  = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-surface)'; };
const onFOut = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; };

function fmtDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PH', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

export default function HolidaysPage() {
  const router = useRouter();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  const [newDate, setNewDate] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [adding, setAdding] = useState(false);
  const [addErr, setAddErr] = useState('');

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); };

  const token = () => localStorage.getItem('token') ?? '';

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (!raw) { router.replace('/login'); return; }
    const user = JSON.parse(raw);
    if (user.role !== 'ADMIN') { router.replace('/'); return; }
  }, [router]);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const r = await fetch(api(`/api/holidays?year=${year}`), { headers: { Authorization: `Bearer ${token()}` } });
      if (r.ok) { const d = await r.json(); setHolidays(d.holidays ?? []); }
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchHolidays(); }, [year]);

  const addHoliday = async () => {
    if (!newDate || !newName.trim()) { setAddErr('Date and name are required.'); return; }
    setAdding(true); setAddErr('');
    try {
      const r = await fetch(api('/api/holidays'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: newDate, name: newName.trim(), description: newDesc.trim() }),
      });
      const d = await r.json();
      if (r.ok) { setNewDate(''); setNewName(''); setNewDesc(''); fetchHolidays(); showToast('Holiday added', true); }
      else setAddErr(d.error ?? 'Failed to add holiday');
    } catch { setAddErr('Network error'); }
    finally { setAdding(false); }
  };

  const startEdit = (h: Holiday) => { setEditId(h.id); setEditName(h.name); setEditDesc(h.description); };
  const cancelEdit = () => { setEditId(null); setEditName(''); setEditDesc(''); };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    setEditSaving(true);
    try {
      const r = await fetch(api(`/api/holidays/${id}`), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), description: editDesc.trim() }),
      });
      const d = await r.json();
      if (r.ok) { cancelEdit(); fetchHolidays(); showToast('Holiday updated', true); }
      else showToast(d.error ?? 'Failed', false);
    } finally { setEditSaving(false); }
  };

  const deleteHoliday = async (id: string) => {
    setDeletingId(id);
    try {
      const r = await fetch(api(`/api/holidays/${id}`), { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
      const d = await r.json();
      if (r.ok) { fetchHolidays(); showToast('Holiday removed', true); }
      else showToast(d.error ?? 'Failed', false);
    } finally { setDeletingId(null); }
  };

  const currentYear = new Date().getFullYear();

  return (
    <DashboardPageWrapper title="University Holiday Calendar" subtitle="Declare university holidays — students cannot book on these dates">

      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium"
          style={toast.ok
            ? { background: 'var(--color-success-surface)', color: 'var(--color-success)', border: '1px solid var(--color-success)' }
            : { background: 'var(--color-danger-surface)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}>
          {toast.ok && <Check size={14} />}
          {toast.msg}
        </div>
      )}

      {/* Year selector */}
      <div className="flex items-center gap-3 mb-6">
        {[currentYear - 1, currentYear, currentYear + 1].map(y => (
          <button key={y} onClick={() => setYear(y)}
            className="px-4 py-1.5 text-sm font-medium rounded-lg transition"
            style={year === y
              ? { background: 'var(--color-primary)', color: 'white' }
              : { background: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
            {y}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Add form */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Add Holiday</h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="field-label">
                  Date <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                  className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut} />
              </div>
              <div>
                <label className="field-label">
                  Name <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Independence Day, Semester Break"
                  className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut} />
              </div>
              <div>
                <label className="field-label">
                  Description <span className="font-normal normal-case" style={{ color: 'var(--color-text-muted)' }}>(optional)</span>
                </label>
                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)}
                  rows={2} placeholder="Any additional notes…"
                  className="w-full px-3 py-2 text-sm rounded-lg outline-none transition resize-none"
                  style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
                  onFocus={onFIn} onBlur={onFOut} />
              </div>
              {addErr && <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{addErr}</p>}
              <button onClick={addHoliday} disabled={adding}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-50 transition hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}>
                {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {adding ? 'Adding…' : 'Add Holiday'}
              </button>
            </div>
          </div>
        </div>

        {/* Holiday list */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {year} Holidays
              </h2>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{holidays.length} declared</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-10 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading…
              </div>
            ) : holidays.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-10 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                <CalendarOff size={28} style={{ color: 'var(--color-border)' }} />
                No holidays declared for {year}.
              </div>
            ) : (
              <div>
                {holidays.map((h, i) => (
                  <div key={h.id} className="px-5 py-4"
                    style={{ borderBottom: i < holidays.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                    {editId === h.id ? (
                      <div className="space-y-2">
                        <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                          className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut} />
                        <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)}
                          rows={2} className="w-full px-3 py-2 text-sm rounded-lg outline-none transition resize-none"
                          style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
                          onFocus={onFIn} onBlur={onFOut} />
                        <div className="flex gap-2">
                          <button onClick={() => saveEdit(h.id)} disabled={editSaving}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg disabled:opacity-50"
                            style={{ background: 'var(--color-primary)' }}>
                            {editSaving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Save
                          </button>
                          <button onClick={cancelEdit} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg"
                            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                            <X size={11} /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{h.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{fmtDate(h.date)}</p>
                          {h.description && (
                            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{h.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => startEdit(h)} title="Edit"
                            className="p-1.5 rounded-lg transition"
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <Pencil size={13} style={{ color: 'var(--color-text-muted)' }} />
                          </button>
                          <button onClick={() => deleteHoliday(h.id)} disabled={deletingId === h.id} title="Delete"
                            className="p-1.5 rounded-lg transition disabled:opacity-50"
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-danger-surface)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            {deletingId === h.id
                              ? <Loader2 size={13} className="animate-spin" style={{ color: 'var(--color-danger)' }} />
                              : <Trash2 size={13} style={{ color: 'var(--color-danger)' }} />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardPageWrapper>
  );
}
