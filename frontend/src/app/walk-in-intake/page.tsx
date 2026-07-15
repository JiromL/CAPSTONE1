'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import {
  AlertCircle, CheckCircle2, Search, UserPlus, User, X,
  Loader2, ChevronRight,
} from 'lucide-react';

type Mode = 'search' | 'existing' | 'guest';

interface FoundStudent {
  _id: string;
  first_name: string;
  last_name: string;
  email: string;
  student_number?: string;
}

const IC = 'w-full px-3 py-2.5 text-sm rounded-lg outline-none transition';
const ICS: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' };
const LABEL_CLS = 'block text-xs font-semibold uppercase tracking-wide mb-1.5';
const LABEL_S: React.CSSProperties = { color: 'var(--color-text-secondary)' };

export default function WalkInIntakePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('search');

  const [query, setQuery]           = useState('');
  const [results, setResults]       = useState<FoundStudent[]>([]);
  const [searching, setSearching]   = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [selected, setSelected]     = useState<FoundStudent | null>(null);

  const [firstName, setFirstName]   = useState('');
  const [lastName, setLastName]     = useState('');
  const [email, setEmail]           = useState('');
  const [studentNum, setStudentNum] = useState('');
  const [phone, setPhone]           = useState('');

  const [service, setService]     = useState('');
  const [referral, setReferral]   = useState('');
  const [concern, setConcern]     = useState('');
  const [isUrgent, setIsUrgent]   = useState(false);
  const [notes, setNotes]         = useState('');

  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  const searchStudents = async (q: string) => {
    setQuery(q);
    setSearchDone(false);
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/users?role=STUDENT&q=${encodeURIComponent(q)}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        const d = await r.json();
        setResults(d.users || []);
      }
    } finally {
      setSearching(false);
      setSearchDone(true);
    }
  };

  const selectStudent = (s: FoundStudent) => {
    setSelected(s);
    setResults([]);
    setQuery('');
    setMode('existing');
  };

  const goGuest = () => {
    setSelected(null);
    setResults([]);
    setMode('guest');
  };

  const reset = () => {
    setMode('search');
    setQuery('');
    setResults([]);
    setSearchDone(false);
    setSelected(null);
    setFirstName(''); setLastName(''); setEmail('');
    setStudentNum(''); setPhone('');
    setService(''); setReferral(''); setConcern(''); setIsUrgent(false); setNotes('');
    setError(''); setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const fn = mode === 'existing' ? selected!.first_name : firstName.trim();
    const ln = mode === 'existing' ? selected!.last_name  : lastName.trim();
    const em = mode === 'existing' ? selected!.email      : email.trim();

    if (!fn || !ln || !em) {
      setError('First name, last name, and email are required.');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const body: Record<string, unknown> = {
        first_name: fn,
        last_name: ln,
        email: em,
        phone,
        service_requested: service,
        referral_source: referral,
        concern,
        is_urgent: isUrgent,
        notes,
      };
      if (mode === 'existing' && selected) body.student_id = selected._id;
      if (mode === 'guest' && studentNum) body.student_id = studentNum;

      const r = await fetch(api('/api/intake/walkin'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || d.message || `Server error (${r.status})`);
      }

      const result = await r.json();
      const counselingId = result.counseling_id || result.intake_id || 'N/A';
      setSuccess(`Walk-in registered. Counseling ID: ${counselingId}`);
      setTimeout(() => router.push('/appointment-requests'), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error. Check that the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const CARD: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border)' };

  return (
    <DashboardPageWrapper title="Walk-In Intake" subtitle="Register a student visiting the CPS office">
      <div className="max-w-xl mx-auto py-6">

        {mode === 'search' && (
          <div className="rounded-xl p-6 space-y-5" style={CARD}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>Step 1 of 2</p>
              <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Look up the student</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Search by name or email. If they don't have an account, register them as a guest.</p>
            </div>

            <div className="relative">
              <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 transition"
                style={{ background: 'var(--color-bg)', border: `1px solid ${query.length >= 2 ? 'var(--color-primary)' : 'var(--color-border)'}` }}>
                <Search size={16} style={{ color: 'var(--color-text-muted)' }} className="flex-shrink-0" />
                <input
                  value={query}
                  onChange={e => searchStudents(e.target.value)}
                  placeholder="Search by name or email address…"
                  className="flex-1 text-sm bg-transparent outline-none"
                  style={{ color: 'var(--color-text-primary)' }}
                  autoFocus
                />
                {searching && <Loader2 size={15} className="animate-spin flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />}
                {query && !searching && (
                  <button onClick={() => { setQuery(''); setResults([]); setSearchDone(false); }}>
                    <X size={15} style={{ color: 'var(--color-text-muted)' }} />
                  </button>
                )}
              </div>

              {results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl z-20 overflow-hidden"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
                  {results.slice(0, 6).map(s => (
                    <button
                      key={s._id}
                      onClick={() => selectStudent(s)}
                      className="w-full text-left px-4 py-3 transition flex items-center gap-3"
                      style={{ borderBottom: '1px solid var(--color-border)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--color-primary-surface)' }}>
                        <User size={15} style={{ color: 'var(--color-primary)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{s.first_name} {s.last_name}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{s.email}</p>
                      </div>
                      <ChevronRight size={14} className="flex-shrink-0" style={{ color: 'var(--color-border-strong)' }} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {searchDone && results.length === 0 && query.trim().length >= 2 && (
              <div className="rounded-xl px-4 py-4 text-center" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>No account found for &quot;{query}&quot;</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>This student can still be registered as a guest walk-in.</p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>or</span>
              <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
            </div>

            <button
              onClick={goGuest}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition"
              style={{ border: '2px dashed var(--color-border)' }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--color-primary-muted)';
                e.currentTarget.style.background = 'var(--color-primary-surface)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition"
                style={{ background: 'var(--color-bg)' }}>
                <UserPlus size={16} style={{ color: 'var(--color-text-secondary)' }} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Student doesn&apos;t have an account</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Register manually as a guest walk-in</p>
              </div>
              <ChevronRight size={14} className="ml-auto" style={{ color: 'var(--color-border-strong)' }} />
            </button>
          </div>
        )}

        {mode === 'existing' && selected && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-xl p-5" style={CARD}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Student</p>
                <button type="button" onClick={reset} className="text-xs underline underline-offset-2"
                  style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>Change</button>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--color-primary)' }}>
                  <span className="text-white text-sm font-semibold">{selected.first_name[0]}{selected.last_name[0]}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{selected.first_name} {selected.last_name}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{selected.email}</p>
                </div>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'var(--color-success-surface)', color: 'var(--color-success-text)', border: '1px solid var(--color-success)' }}>
                  Has account
                </span>
              </div>
            </div>

            <div className="rounded-xl p-5 space-y-4" style={CARD}>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Visit Details</p>
              <VisitFields service={service} setService={setService} referral={referral} setReferral={setReferral} concern={concern} setConcern={setConcern} isUrgent={isUrgent} setIsUrgent={setIsUrgent} notes={notes} setNotes={setNotes} />
            </div>

            <FormFooter error={error} success={success} loading={loading} onCancel={reset} />
          </form>
        )}

        {mode === 'guest' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-xl p-5" style={CARD}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Guest Walk-In</p>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>No account — fill in the student&apos;s details manually.</p>
                </div>
                <button type="button" onClick={reset} className="text-xs underline underline-offset-2 flex-shrink-0 ml-4"
                  style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>← Back</button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL_CLS} style={LABEL_S}>First Name <span className="normal-case font-normal" style={{ color: 'var(--color-danger)' }}>*</span></label>
                    <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                      placeholder="Juan" required className={IC} style={ICS} />
                  </div>
                  <div>
                    <label className={LABEL_CLS} style={LABEL_S}>Last Name <span className="normal-case font-normal" style={{ color: 'var(--color-danger)' }}>*</span></label>
                    <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                      placeholder="Dela Cruz" required className={IC} style={ICS} />
                  </div>
                </div>
                <div>
                  <label className={LABEL_CLS} style={LABEL_S}>Email <span className="normal-case font-normal" style={{ color: 'var(--color-danger)' }}>*</span></label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="student@dlsu.edu.ph" required className={IC} style={ICS} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL_CLS} style={LABEL_S}>Student Number</label>
                    <input type="text" value={studentNum} onChange={e => setStudentNum(e.target.value)}
                      placeholder="00-1234" className={IC} style={ICS} />
                  </div>
                  <div>
                    <label className={LABEL_CLS} style={LABEL_S}>Phone</label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                      placeholder="+63 9XX XXX XXXX" className={IC} style={ICS} />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl p-5 space-y-4" style={CARD}>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Visit Details</p>
              <VisitFields service={service} setService={setService} referral={referral} setReferral={setReferral} concern={concern} setConcern={setConcern} isUrgent={isUrgent} setIsUrgent={setIsUrgent} notes={notes} setNotes={setNotes} />
            </div>

            <FormFooter error={error} success={success} loading={loading} onCancel={reset} />
          </form>
        )}
      </div>
    </DashboardPageWrapper>
  );
}

const SERVICES_LIST = [
  'Individual Counseling', 'Psychological Assessment', 'Group Counseling',
  'Crisis Intervention', 'Consultation', 'Other',
];
const REFERRAL_LIST = [
  'Self-referred', 'Faculty / Professor', 'Dean / Department Chair',
  'Guidance Counselor', 'Friend / Classmate', 'Parent / Family',
  'University Health Service', 'Other',
];
const CONCERN_LIST = [
  'Academic Concerns', 'Anxiety / Stress', 'Depression / Low Mood',
  'Relationship Issues', 'Family Concerns', 'Career / Life Direction',
  'Grief / Loss', 'Trauma', 'Crisis / Safety', 'Other',
];

function VisitFields({ service, setService, referral, setReferral, concern, setConcern, isUrgent, setIsUrgent, notes, setNotes }: {
  service: string; setService: (v: string) => void;
  referral: string; setReferral: (v: string) => void;
  concern: string; setConcern: (v: string) => void;
  isUrgent: boolean; setIsUrgent: (v: boolean) => void;
  notes: string; setNotes: (v: string) => void;
}) {
  const IC = 'w-full px-3 py-2.5 text-sm rounded-lg outline-none transition';
  const ICS: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' };
  const LABEL_CLS = 'block text-xs font-semibold uppercase tracking-wide mb-1.5';
  const LABEL_S: React.CSSProperties = { color: 'var(--color-text-secondary)' };

  return (
    <>
      <div>
        <label className={LABEL_CLS} style={LABEL_S}>Service Requested <span className="normal-case font-normal text-red-500">*</span></label>
        <select value={service} onChange={e => setService(e.target.value)} className={IC} style={ICS}>
          <option value="">— Select service —</option>
          {SERVICES_LIST.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div>
        <label className={LABEL_CLS} style={LABEL_S}>Referred by</label>
        <select value={referral} onChange={e => setReferral(e.target.value)} className={IC} style={ICS}>
          <option value="">— Select referral source —</option>
          {REFERRAL_LIST.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div>
        <label className={LABEL_CLS} style={LABEL_S}>Presenting Concern</label>
        <select value={concern} onChange={e => setConcern(e.target.value)} className={IC} style={ICS}>
          <option value="">— Select a concern —</option>
          {CONCERN_LIST.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Urgent toggle: KEPT fixed red — safety-critical */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition"
        style={isUrgent ? { background: '#FEF2F2', borderColor: '#FECACA' } : { background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
        onClick={() => setIsUrgent(!isUrgent)}>
        <input type="checkbox" checked={isUrgent} onChange={e => setIsUrgent(e.target.checked)}
          className="w-4 h-4 rounded accent-red-600" />
        <div>
          <p className="text-sm font-semibold" style={{ color: isUrgent ? '#B91C1C' : 'var(--color-text-primary)' }}>Mark as Urgent</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Needs immediate attention — will be flagged as high priority</p>
        </div>
      </div>

      <div>
        <label className={LABEL_CLS} style={LABEL_S}>Staff Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Brief notes about the student's visit…" rows={3}
          className={IC} style={{ ...ICS, resize: 'none' }} />
      </div>
    </>
  );
}

function FormFooter({ error, success, loading, onCancel }: {
  error: string; success: string; loading: boolean; onCancel: () => void;
}) {
  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl"
          style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)' }}>
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-danger)' }} />
          <p className="text-sm" style={{ color: 'var(--color-danger-text)' }}>{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl"
          style={{ background: 'var(--color-success-surface)', border: '1px solid var(--color-success)' }}>
          <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-success)' }} />
          <p className="text-sm" style={{ color: 'var(--color-success-text)' }}>{success}</p>
        </div>
      )}
      <div className="flex gap-3">
        <button type="button" onClick={onCancel}
          className="flex-1 px-4 py-2.5 text-sm rounded-xl transition"
          style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          Cancel
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: 'var(--color-primary)' }}
          onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)'; }}
          onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'; }}>
          {loading
            ? <><Loader2 size={14} className="animate-spin" /> Registering…</>
            : 'Register Walk-In'}
        </button>
      </div>
      <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
        Walk-in will be added to the intake queue and assigned a counselor.
      </p>
    </div>
  );
}
