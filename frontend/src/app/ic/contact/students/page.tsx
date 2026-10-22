"use client";

import { useEffect, useState, useCallback } from 'react';
import PageShell from '@/components/PageShell';
import { api, apiFetch } from '@/utils/api';
import { Search, Mail, Phone, User, RefreshCw, AlertCircle } from 'lucide-react';

interface Student {
  _id: string;
  first_name: string;
  last_name: string;
  email: string;
  id_number?: string;
  phone?: string;
  year_level?: string;
  program?: string;
  case_status?: string;
}

export default function ContactStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(api('/api/users?role=STUDENT&limit=200'));
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setStudents(data.users ?? data ?? []);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    return (
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
      (s.email ?? '').toLowerCase().includes(q) ||
      (s.id_number ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <PageShell title="Student Contact" subtitle={`${students.length} student${students.length !== 1 ? 's' : ''}`}>
      <div className="space-y-4">
        {/* Search bar */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
            <input
              type="text"
              placeholder="Search by name, email, or ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
            />
          </div>
          <button
            onClick={fetchStudents}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-opacity hover:opacity-70"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ background: 'var(--color-error-bg, #fef2f2)', color: 'var(--color-error, #dc2626)' }}>
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16" style={{ color: 'var(--color-text-secondary)' }}>
            <RefreshCw size={20} className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-2" style={{ color: 'var(--color-text-secondary)' }}>
            <User size={32} className="opacity-30" />
            <p className="text-sm">{search ? 'No students match your search.' : 'No students found.'}</p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(s => (
              <div
                key={s._id}
                className="card p-4 flex flex-col gap-2"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                    style={{ background: 'var(--color-primary-muted, #ede9fe)', color: 'var(--color-primary)' }}
                  >
                    {s.first_name?.[0]}{s.last_name?.[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {s.first_name} {s.last_name}
                    </p>
                    {s.id_number && (
                      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{s.id_number}</p>
                    )}
                    {s.program && (
                      <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>{s.program}{s.year_level ? ` · ${s.year_level}` : ''}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  {s.email && (
                    <a
                      href={`mailto:${s.email}`}
                      className="flex items-center gap-1.5 text-xs hover:underline truncate"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      <Mail size={12} className="shrink-0" />
                      {s.email}
                    </a>
                  )}
                  {s.phone && (
                    <a
                      href={`tel:${s.phone}`}
                      className="flex items-center gap-1.5 text-xs hover:underline"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      <Phone size={12} className="shrink-0" />
                      {s.phone}
                    </a>
                  )}
                </div>
                {s.case_status && (
                  <span
                    className="self-start text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: 'var(--color-primary-muted, #ede9fe)', color: 'var(--color-primary)' }}
                  >
                    {s.case_status}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
