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

const INPUT = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-300 focus:ring-2 focus:ring-[#2563eb]/25 focus:border-[#2563eb] focus:outline-none';
const LABEL = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5';

export default function WalkInIntakePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('search');

  // Student search
  const [query, setQuery]           = useState('');
  const [results, setResults]       = useState<FoundStudent[]>([]);
  const [searching, setSearching]   = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [selected, setSelected]     = useState<FoundStudent | null>(null);

  // Guest form fields (only used in guest mode)
  const [firstName, setFirstName]   = useState('');
  const [lastName, setLastName]     = useState('');
  const [email, setEmail]           = useState('');
  const [studentNum, setStudentNum] = useState('');
  const [phone, setPhone]           = useState('');

  // Shared fields
  const [concern, setConcern]   = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [notes, setNotes]       = useState('');

  // Submit state
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
    setConcern(''); setIsUrgent(false); setNotes('');
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
      const body: any = {
        first_name: fn,
        last_name: ln,
        email: em,
        phone,
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

  return (
    <DashboardPageWrapper title="Walk-In Intake" subtitle="Register a student visiting the CPS office">
      <div className="max-w-xl mx-auto py-6">

        {/* ── Step 1: Search ─────────────────────────────────────── */}
        {mode === 'search' && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Step 1 of 2</p>
              <h2 className="text-base font-semibold text-gray-900">Look up the student</h2>
              <p className="text-sm text-gray-500 mt-1">Search by name or email. If they don't have an account, register them as a guest.</p>
            </div>

            <div className="relative">
              <div className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 bg-gray-50 transition ${query.length >= 2 ? 'border-[#2563eb] ring-2 ring-[#2563eb]/20' : 'border-gray-200'} focus-within:border-[#2563eb] focus-within:ring-2 focus-within:ring-[#2563eb]/20`}>
                <Search size={16} className="text-gray-400 flex-shrink-0" />
                <input
                  value={query}
                  onChange={e => searchStudents(e.target.value)}
                  placeholder="Search by name or email address…"
                  className="flex-1 text-sm bg-transparent outline-none text-gray-900 placeholder-gray-400"
                  autoFocus
                />
                {searching && <Loader2 size={15} className="animate-spin text-gray-400 flex-shrink-0" />}
                {query && !searching && (
                  <button onClick={() => { setQuery(''); setResults([]); setSearchDone(false); }}>
                    <X size={15} className="text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>

              {/* Results dropdown */}
              {results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                  {results.slice(0, 6).map(s => (
                    <button
                      key={s._id}
                      onClick={() => selectStudent(s)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition border-b border-gray-50 last:border-0 flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#2563eb]/10 flex items-center justify-center flex-shrink-0">
                        <User size={15} style={{ color: '#2563eb' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{s.first_name} {s.last_name}</p>
                        <p className="text-xs text-gray-400 truncate">{s.email}</p>
                      </div>
                      <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* No results state */}
            {searchDone && results.length === 0 && query.trim().length >= 2 && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-center">
                <p className="text-sm text-gray-600 font-medium mb-1">No account found for "{query}"</p>
                <p className="text-xs text-gray-400">This student can still be registered as a guest walk-in.</p>
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400">or</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Guest button */}
            <button
              onClick={goGuest}
              className="w-full flex items-center gap-3 px-4 py-3.5 border-2 border-dashed border-gray-200 rounded-xl hover:border-[#2563eb]/40 hover:bg-[#2563eb]/5 transition group"
            >
              <div className="w-9 h-9 rounded-full bg-gray-100 group-hover:bg-[#2563eb]/10 flex items-center justify-center flex-shrink-0 transition">
                <UserPlus size={16} className="text-gray-500 group-hover:text-[#2563eb] transition" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-700 group-hover:text-[#2563eb] transition">Student doesn't have an account</p>
                <p className="text-xs text-gray-400">Register manually as a guest walk-in</p>
              </div>
              <ChevronRight size={14} className="text-gray-300 ml-auto group-hover:text-[#2563eb] transition" />
            </button>
          </div>
        )}

        {/* ── Step 2a: Existing student ──────────────────────────── */}
        {mode === 'existing' && selected && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Student card */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Student</p>
                <button type="button" onClick={reset} className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2">Change</button>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#2563eb' }}>
                  <span className="text-white text-sm font-semibold">{selected.first_name[0]}{selected.last_name[0]}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{selected.first_name} {selected.last_name}</p>
                  <p className="text-xs text-gray-400">{selected.email}</p>
                </div>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-green-50 text-blue-700 border border-green-100 font-medium">Has account</span>
              </div>
            </div>

            {/* Visit details */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Visit Details</p>
              <VisitFields
                concern={concern} setConcern={setConcern}
                isUrgent={isUrgent} setIsUrgent={setIsUrgent}
                notes={notes} setNotes={setNotes}
              />
            </div>

            <FormFooter error={error} success={success} loading={loading} onCancel={reset} />
          </form>
        )}

        {/* ── Step 2b: Guest / no account ───────────────────────── */}
        {mode === 'guest' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Guest header */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-0.5">Guest Walk-In</p>
                  <p className="text-sm text-gray-500">No account — fill in the student's details manually.</p>
                </div>
                <button type="button" onClick={reset} className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 flex-shrink-0 ml-4">← Back</button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL}>First Name <span className="text-red-400 normal-case font-normal">*</span></label>
                    <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                      placeholder="Juan" required className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>Last Name <span className="text-red-400 normal-case font-normal">*</span></label>
                    <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                      placeholder="Dela Cruz" required className={INPUT} />
                  </div>
                </div>
                <div>
                  <label className={LABEL}>Email <span className="text-red-400 normal-case font-normal">*</span></label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="student@dlsu.edu.ph" required className={INPUT} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL}>Student Number</label>
                    <input type="text" value={studentNum} onChange={e => setStudentNum(e.target.value)}
                      placeholder="00-1234" className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>Phone</label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                      placeholder="+63 9XX XXX XXXX" className={INPUT} />
                  </div>
                </div>
              </div>
            </div>

            {/* Visit details */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Visit Details</p>
              <VisitFields
                concern={concern} setConcern={setConcern}
                isUrgent={isUrgent} setIsUrgent={setIsUrgent}
                notes={notes} setNotes={setNotes}
              />
            </div>

            <FormFooter error={error} success={success} loading={loading} onCancel={reset} />
          </form>
        )}
      </div>
    </DashboardPageWrapper>
  );
}

// ── Shared visit fields ───────────────────────────────────────────────────────
function VisitFields({ concern, setConcern, isUrgent, setIsUrgent, notes, setNotes }: {
  concern: string; setConcern: (v: string) => void;
  isUrgent: boolean; setIsUrgent: (v: boolean) => void;
  notes: string; setNotes: (v: string) => void;
}) {
  return (
    <>
      <div>
        <label className={LABEL}>Primary Concern</label>
        <select value={concern} onChange={e => setConcern(e.target.value)} className={INPUT}>
          <option value="">— Select a concern —</option>
          <option value="academic">Academic Concerns</option>
          <option value="mental_health">Mental Health</option>
          <option value="personal">Personal Issues</option>
          <option value="relationship">Relationship Issues</option>
          <option value="career">Career Counseling</option>
          <option value="crisis">Crisis Support</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition ${isUrgent ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200 hover:border-amber-200'}`}
        onClick={() => setIsUrgent(!isUrgent)}>
        <input type="checkbox" checked={isUrgent} onChange={e => setIsUrgent(e.target.checked)}
          className="w-4 h-4 rounded accent-red-600" />
        <div>
          <p className={`text-sm font-semibold ${isUrgent ? 'text-red-700' : 'text-gray-700'}`}>Mark as Urgent</p>
          <p className="text-xs text-gray-400">Needs immediate attention — will be flagged as high priority</p>
        </div>
      </div>

      <div>
        <label className={LABEL}>Staff Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Brief notes about the student's visit…" rows={3}
          className={`${INPUT} resize-none`} />
      </div>
    </>
  );
}

// ── Form footer ───────────────────────────────────────────────────────────────
function FormFooter({ error, success, loading, onCancel }: {
  error: string; success: string; loading: boolean; onCancel: () => void;
}) {
  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
          <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 px-4 py-3 bg-green-50 border border-green-100 rounded-xl">
          <CheckCircle2 size={15} className="text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">{success}</p>
        </div>
      )}
      <div className="flex gap-3">
        <button type="button" onClick={onCancel}
          className="flex-1 px-4 py-2.5 text-sm border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition">
          Cancel
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ backgroundColor: '#2563eb' }}>
          {loading
            ? <><Loader2 size={14} className="animate-spin" /> Registering…</>
            : 'Register Walk-In'}
        </button>
      </div>
      <p className="text-xs text-gray-400 text-center">
        Walk-in will be added to the intake queue and assigned a counselor.
      </p>
    </div>
  );
}
