"use client";

import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Edit2, Save, AlertCircle, Lock, Eye, EyeOff, CheckCircle, Activity, LogOut, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import { PermaBadge } from '@/components/PendingStudentsWithPerma';

const DLSU_COLLEGES: { abbr: string; name: string; sampleCourses: string[] }[] = [
  { abbr: 'CCS',    name: 'College of Computer Studies',       sampleCourses: ['BS Computer Science', 'BS Information Technology', 'BS Information Systems'] },
  { abbr: 'COB',    name: 'College of Business',               sampleCourses: ['BS Accountancy', 'BS Business Administration', 'BS Entrepreneurship', 'BS Management of Financial Institutions'] },
  { abbr: 'COE',    name: 'College of Engineering',            sampleCourses: ['BS Chemical Engineering', 'BS Civil Engineering', 'BS Electronics Engineering', 'BS Industrial Engineering', 'BS Mechanical Engineering'] },
  { abbr: 'CLA',    name: 'College of Liberal Arts',           sampleCourses: ['BA Communication Arts', 'BA Political Science', 'BA Psychology', 'BA Filipino', 'BA Literature'] },
  { abbr: 'COS',    name: 'College of Science',                sampleCourses: ['BS Biology', 'BS Chemistry', 'BS Mathematics', 'BS Physics'] },
  { abbr: 'SOE',    name: 'School of Economics',               sampleCourses: ['BS Economics', 'BS Applied Economics'] },
  { abbr: 'BAGCED', name: 'College of Education',              sampleCourses: ['BS Education (major in English)', 'BS Education (major in Mathematics)', 'BS Education (major in Filipino)'] },
  { abbr: 'SOM',    name: 'School of Medicine',                sampleCourses: ['Doctor of Medicine'] },
  { abbr: 'GCOE',   name: 'Graduate School',                   sampleCourses: ['Masters / Doctoral program'] },
];

const IC = 'w-full px-3 py-2 text-sm rounded-lg outline-none transition';
const ICS: React.CSSProperties = {
  background: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-primary)',
};

function InfoRow({ icon, label, value, indent }: { icon?: React.ReactNode; label: string; value: string; indent?: boolean }) {
  return (
    <div className={`flex items-center gap-3 text-sm ${indent ? 'ml-4' : ''}`}>
      {icon && <div className="flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>{icon}</div>}
      <div className="flex-1">
        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
        <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [editMode, setEditMode]     = useState(false);
  const [saving, setSaving]         = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage]     = useState<string | null>(null);

  // PERMA / MHBot state
  const [permaData, setPermaData]         = useState<any>(null);
  const [loadingPerma, setLoadingPerma]   = useState(false);
  const [mhbotLogging, setMhbotLogging]   = useState(false);
  const [mhbotError, setMhbotError]       = useState('');
  const [emaConsentGiven, setEmaConsentGiven] = useState(false);
  const [showEmaConsent, setShowEmaConsent]   = useState(false);
  const [emaConsentChecked, setEmaConsentChecked] = useState(false);
  const [emaConsentSaving, setEmaConsentSaving]   = useState(false);
  const [emaConsentError, setEmaConsentError]     = useState('');

  const cpsToken = () => localStorage.getItem('token') || '';

  async function fetchMyPerma() {
    setLoadingPerma(true);
    try {
      const r = await fetch(api('/api/mhbot/my-snapshots'), { headers: { Authorization: `Bearer ${cpsToken()}` } });
      const d = await r.json();
      setPermaData((prev: any) => ({
        connected: prev?.connected ?? false,
        mhbot_username: prev?.mhbot_username || '',
        latest_label: d.latest_label,
        latest_date: d.latest_date,
        history: (d.snapshots || []).map((s: any) => ({ perma_label: s.perma_label, date: s.raw_date || s.entry_date })),
      }));
    } catch {} finally { setLoadingPerma(false); }
  }

  async function handleEmaConsent() {
    setEmaConsentSaving(true); setEmaConsentError('');
    try {
      const r = await fetch(api('/api/consent/submit'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${cpsToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent_types: ['ema_data_linking'] }),
      });
      if (r.ok) { setEmaConsentGiven(true); setShowEmaConsent(false); }
      else setEmaConsentError('Failed to record consent. Please try again.');
    } catch { setEmaConsentError('Network error.'); }
    finally { setEmaConsentSaving(false); }
  }

  async function handleMhbotLogout() {
    await fetch(api('/api/mhbot/auth/logout'), { method: 'POST', headers: { Authorization: `Bearer ${cpsToken()}` } });
    setPermaData(null);
  }

  // Change password
  const [showPwModal, setShowPwModal] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwError, setPwError]   = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const openPwModal = () => {
    setPwForm({ current: '', newPw: '', confirm: '' });
    setPwError(null); setPwSuccess(false); setShowPwModal(true);
  };

  const handleChangePassword = async () => {
    setPwError(null);
    if (!pwForm.current) { setPwError('Enter your current password'); return; }
    if (pwForm.newPw.length < 8) { setPwError('New password must be at least 8 characters'); return; }
    if (pwForm.newPw !== pwForm.confirm) { setPwError('New passwords do not match'); return; }
    if (pwForm.newPw === pwForm.current) { setPwError('New password must be different from current password'); return; }
    setPwSaving(true);
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const r = await fetch(api('/api/auth/change-password'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: pwForm.current, new_password: pwForm.newPw }),
      });
      const d = await r.json();
      if (!r.ok) { setPwError(d.error || 'Failed to change password'); return; }
      setPwSuccess(true);
      setTimeout(() => setShowPwModal(false), 1800);
    } catch { setPwError('Something went wrong. Please try again.'); }
    finally { setPwSaving(false); }
  };

  const [userRole, setUserRole] = useState<string | null>(null);
  const [profile, setProfile] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    studentId: '', college: '', course: '', major: '', year: '',
    emergencyContact: '', emergencyPhone: '',
  });
  const [formData, setFormData] = useState(profile);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const cached = localStorage.getItem('user');
    const cachedUser = cached ? JSON.parse(cached) : {};
    const fromCache = {
      firstName: cachedUser.first_name || '', lastName: cachedUser.last_name || '',
      email: cachedUser.email || '', phone: cachedUser.phone || '',
      studentId: cachedUser.id_number || '', college: cachedUser.college || '',
      course: cachedUser.course || '', major: cachedUser.major || '',
      year: cachedUser.year || '', emergencyContact: cachedUser.emergency_contact || '',
      emergencyPhone: cachedUser.emergency_phone || '',
    };
    setProfile(fromCache); setFormData(fromCache); setUserRole(cachedUser.role || null);
    if (!token) return;

    fetch(api('/api/users/profile'), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (r.status === 401 || r.status === 404) {
          localStorage.removeItem('token'); localStorage.removeItem('user');
          window.location.href = '/login'; return Promise.reject('session_expired');
        }
        return r.ok ? r.json() : Promise.reject(r.status);
      })
      .then(user => {
        const fresh = {
          firstName: user.first_name || '', lastName: user.last_name || '',
          email: user.email || '', phone: user.phone || '',
          studentId: user.id_number || '', college: user.college || '',
          course: user.course || '', major: user.major || '',
          year: user.year || '', emergencyContact: user.emergency_contact || '',
          emergencyPhone: user.emergency_phone || '',
        };
        setProfile(fresh); setFormData(fresh); setUserRole(user.role || null);
        setEmaConsentGiven(user.ema_consent_given || false);
        localStorage.setItem('user', JSON.stringify({ ...cachedUser, ...user }));
        if (user.role === 'STUDENT') fetchMyPerma();
      })
      .catch(err => { if (err !== 'session_expired') console.error('Failed to fetch profile:', err); });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'college') setFormData({ ...formData, college: value, course: '' });
    else setFormData({ ...formData, [name]: value });
  };

  const handleSave = async () => {
    if (!formData.firstName.trim()) { setErrorMessage('First name is required'); return; }
    if (!formData.lastName.trim())  { setErrorMessage('Last name is required'); return; }
    if (!formData.email.trim() || !formData.email.includes('@')) { setErrorMessage('Valid email is required'); return; }
    setSaving(true); setErrorMessage(null); setSuccessMessage(null);
    try {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : {};
      const r = await fetch(api('/api/users/profile'), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: formData.firstName, last_name: formData.lastName,
          email: formData.email, phone: formData.phone, id_number: formData.studentId,
          college: formData.college, course: formData.course, major: formData.major,
          year: formData.year, emergency_contact: formData.emergencyContact,
          emergency_phone: formData.emergencyPhone,
        }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Failed to update profile'); }
      const { user: saved } = await r.json();
      localStorage.setItem('user', JSON.stringify({ ...user, ...saved }));
      setProfile(formData); setEditMode(false);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Failed to update profile');
    } finally { setSaving(false); }
  };

  const initials = `${profile.firstName?.charAt(0).toUpperCase() ?? ''}${profile.lastName?.charAt(0).toUpperCase() ?? ''}`;

  // PERMA chart constants (semantic wellness colors — keep fixed)
  const LABEL_SCORE: Record<string, number> = {
    'In Crisis': 1, 'Struggling': 2, 'Surviving': 3, 'Thriving': 4, 'Excelling': 5,
  };
  const LABEL_COLOR: Record<string, string> = {
    'In Crisis': '#ef4444', 'Struggling': '#f97316', 'Surviving': '#eab308',
    'Thriving': '#22c55e', 'Excelling': '#16a34a',
  };
  const ZONE_BG = [
    { y: 0,  h: 20, color: '#fef2f2', label: 'In Crisis' },
    { y: 20, h: 20, color: '#fff7ed', label: 'Struggling' },
    { y: 40, h: 20, color: '#fefce8', label: 'Surviving' },
    { y: 60, h: 20, color: '#f0fdf4', label: 'Thriving' },
    { y: 80, h: 20, color: '#dcfce7', label: 'Excelling' },
  ];

  return (
    <>
    <DashboardPageWrapper title="My Profile">
      <div className="max-w-3xl mx-auto space-y-5">

        {successMessage && (
          <div className="p-4 rounded-xl" style={{ background: 'var(--color-success-surface)', border: '1px solid var(--color-success)' }}>
            <p className="text-sm" style={{ color: 'var(--color-success)' }}>{successMessage}</p>
          </div>
        )}
        {errorMessage && (
          <div className="p-4 rounded-xl flex gap-3" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)' }}>
            <AlertCircle className="flex-shrink-0" size={18} style={{ color: 'var(--color-danger)' }} />
            <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{errorMessage}</p>
          </div>
        )}

        {/* Main profile card */}
        <div className="rounded-xl p-6 shadow-card" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-semibold flex-shrink-0"
                style={{ background: 'var(--color-primary)' }}>
                {initials}
              </div>
              <div>
                <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  {profile.firstName} {profile.lastName}
                </h2>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {[profile.college, profile.course].filter(Boolean).join(' · ') || 'No course set'}
                </p>
              </div>
            </div>
            <button onClick={() => { setEditMode(!editMode); setErrorMessage(null); }}
              className="flex items-center gap-2 px-3 py-2 text-white text-sm rounded-lg transition hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}>
              <Edit2 size={14} /> {editMode ? 'Cancel' : 'Edit'}
            </button>
          </div>

          <div className="space-y-4">
            {editMode ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'First Name', name: 'firstName', type: 'text',  value: formData.firstName,  span: false },
                    { label: 'Last Name',  name: 'lastName',  type: 'text',  value: formData.lastName,   span: false },
                    { label: 'Email',      name: 'email',     type: 'email', value: formData.email,      span: true  },
                    { label: 'Phone',      name: 'phone',     type: 'tel',   value: formData.phone,      span: true  },
                    { label: 'Student ID', name: 'studentId', type: 'text',  value: formData.studentId,  span: false },
                  ].map(({ label, name, type, value, span }) => (
                    <div key={name} className={span ? 'md:col-span-2' : ''}>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>{label}</label>
                      <input type={type} name={name} value={value} onChange={handleChange} className={IC} style={ICS} />
                    </div>
                  ))}
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>College</label>
                    <select name="college" value={formData.college} onChange={handleChange} className={IC} style={ICS}>
                      <option value="">— Select college —</option>
                      {DLSU_COLLEGES.map(c => <option key={c.abbr} value={c.abbr}>{c.abbr} · {c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Course / Program</label>
                    <input type="text" name="course" value={formData.course} onChange={handleChange} className={IC} style={ICS}
                      placeholder={formData.college
                        ? `e.g. ${DLSU_COLLEGES.find(c => c.abbr === formData.college)?.sampleCourses[0] ?? 'your program'}`
                        : 'Select a college first'} />
                    {formData.college && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {DLSU_COLLEGES.find(c => c.abbr === formData.college)?.sampleCourses.map(sc => (
                          <button key={sc} type="button" onClick={() => setFormData(f => ({ ...f, course: sc }))}
                            className="text-xs px-2 py-0.5 rounded-full transition"
                            style={{ background: 'var(--color-bg)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-primary-surface)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-bg)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}>
                            {sc}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-2 pt-4 mt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                    <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-secondary)' }}>Emergency Contact</h3>
                  </div>
                  {[
                    { label: 'Name',  name: 'emergencyContact', type: 'text', value: formData.emergencyContact },
                    { label: 'Phone', name: 'emergencyPhone',   type: 'tel',  value: formData.emergencyPhone },
                  ].map(({ label, name, type, value }) => (
                    <div key={name}>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>{label}</label>
                      <input type={type} name={name} value={value} onChange={handleChange} className={IC} style={ICS} />
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 text-white text-sm rounded-lg transition hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'var(--color-primary)' }}>
                    <Save size={16} /> {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button onClick={() => { setFormData(profile); setEditMode(false); setErrorMessage(null); }} disabled={saving}
                    className="px-6 py-2 text-sm rounded-lg border transition disabled:opacity-50"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <InfoRow icon={<Mail size={16} />} label="Email"      value={profile.email} />
                <InfoRow icon={<Phone size={16} />} label="Phone"     value={profile.phone} />
                <InfoRow icon={<User size={16} />}  label="Student ID" value={profile.studentId} />
                <InfoRow label="College" value={profile.college ? `${profile.college} · ${DLSU_COLLEGES.find(c => c.abbr === profile.college)?.name ?? ''}` : ''} />
                <InfoRow label="Course"  value={profile.course} />
                <div className="pt-3 mt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>Emergency Contact</h3>
                  <InfoRow label="Name"  value={profile.emergencyContact} indent />
                  <InfoRow label="Phone" value={profile.emergencyPhone}   indent />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PERMA / MHBot (students only) */}
        {userRole === 'STUDENT' && (
          <div className="rounded-xl p-6 shadow-card" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity size={15} style={{ color: 'var(--color-success)' }} />
                <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>My Wellbeing (PERMA)</h3>
              </div>
              {permaData?.connected && (
                <button onClick={handleMhbotLogout}
                  className="flex items-center gap-1.5 text-xs transition"
                  style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-danger)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
                  <LogOut size={12} /> Disconnect
                </button>
              )}
            </div>

            {loadingPerma ? (
              <div className="flex items-center gap-2 text-sm py-2" style={{ color: 'var(--color-text-muted)' }}>
                <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading…
              </div>
            ) : !permaData?.connected ? (
              <div className="flex flex-col items-start gap-1.5 py-2">
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Not connected to EMA yet.</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Open the <span className="font-medium" style={{ color: 'var(--color-primary)' }}>EMA chatbot</span> using the button at the bottom-right of the screen and sign in — your wellbeing history will appear here automatically.
                </p>
              </div>
            ) : (() => {
              const history = [...(permaData.history || [])].reverse();
              const points = history
                .map((e: any) => ({ label: e.perma_label, date: e.date, score: LABEL_SCORE[e.perma_label] }))
                .filter((p: any) => p.score !== undefined);

              const W = 540, H = 160, PAD_L = 72, PAD_R = 16, PAD_T = 12, PAD_B = 28;
              const chartW = W - PAD_L - PAD_R;
              const chartH = H - PAD_T - PAD_B;
              const xOf = (i: number) => PAD_L + (points.length > 1 ? (i / (points.length - 1)) * chartW : chartW / 2);
              const yOf = (score: number) => PAD_T + chartH - ((score - 1) / 4) * chartH;
              const pathD = points.length > 1
                ? points.reduce((d: string, p: any, i: number) => {
                    const x = xOf(i); const y = yOf(p.score);
                    if (i === 0) return `M${x},${y}`;
                    const px = xOf(i - 1); const py = yOf(points[i - 1].score);
                    const cpx = (px + x) / 2;
                    return `${d} C${cpx},${py} ${cpx},${y} ${x},${y}`;
                  }, '')
                : '';

              const latest = permaData.latest_label;
              const prev   = points.length >= 2 ? points[points.length - 2]?.label : null;
              const latestScore = LABEL_SCORE[latest] ?? 0;
              const prevScore   = LABEL_SCORE[prev] ?? 0;
              const trend = !prev ? null : latestScore > prevScore ? 'up' : latestScore < prevScore ? 'down' : 'same';
              const latestColor = LABEL_COLOR[latest] ?? '#6b7280';

              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <PermaBadge label={latest} />
                    {trend === 'up'   && <span className="text-xs font-semibold" style={{ color: 'var(--color-success)' }}>↑ Improving</span>}
                    {trend === 'down' && <span className="text-xs font-semibold" style={{ color: 'var(--color-danger)' }}>↓ Declining</span>}
                    {trend === 'same' && <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>→ Stable</span>}
                    {permaData.latest_date && (
                      <span className="text-xs ml-auto" style={{ color: 'var(--color-text-muted)' }}>
                        Last assessed {new Date(permaData.latest_date).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                  </div>

                  {points.length === 0 ? (
                    <div className="py-6 flex flex-col items-center gap-2 text-center rounded-2xl"
                      style={{ border: '1px dashed var(--color-border)' }}>
                      <Activity size={22} style={{ color: 'var(--color-border)' }} />
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>No assessments recorded yet</p>
                      <p className="text-xs max-w-xs" style={{ color: 'var(--color-text-muted)' }}>
                        Complete a conversation in the EMA chatbot to generate your first PERMA wellness label.
                      </p>
                      <p className="text-xs font-medium mt-1" style={{ color: 'var(--color-primary)' }}>→ Use the chat button at the bottom-right</p>
                    </div>
                  ) : (
                    <div className="rounded-2xl overflow-hidden shadow-card" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 180 }}>
                        {ZONE_BG.map(z => (
                          <rect key={z.label} x={PAD_L} y={PAD_T + chartH - (z.y / 100) * chartH - (z.h / 100) * chartH}
                            width={chartW} height={(z.h / 100) * chartH} fill={z.color} />
                        ))}
                        {[1,2,3,4,5].map(score => (
                          <text key={score} x={PAD_L - 8} y={yOf(score) + 4}
                            textAnchor="end" fontSize={8.5}
                            fill={LABEL_COLOR[['','In Crisis','Struggling','Surviving','Thriving','Excelling'][score]] ?? '#9ca3af'}
                            fontWeight="500">
                            {['','In Crisis','Struggling','Surviving','Thriving','Excelling'][score]}
                          </text>
                        ))}
                        {[1,2,3,4,5].map(score => (
                          <line key={score} x1={PAD_L} x2={PAD_L + chartW} y1={yOf(score)} y2={yOf(score)}
                            stroke="#e5e7eb" strokeWidth={0.75} strokeDasharray="4,3" />
                        ))}
                        {pathD && points.length > 1 && (
                          <>
                            <defs>
                              <linearGradient id="permaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={latestColor} stopOpacity="0.18" />
                                <stop offset="100%" stopColor={latestColor} stopOpacity="0.01" />
                              </linearGradient>
                            </defs>
                            <path d={`${pathD} L${xOf(points.length - 1)},${PAD_T + chartH} L${xOf(0)},${PAD_T + chartH} Z`}
                              fill="url(#permaGrad)" />
                          </>
                        )}
                        {pathD && (
                          <path d={pathD} fill="none" stroke={latestColor} strokeWidth={2.5}
                            strokeLinecap="round" strokeLinejoin="round" />
                        )}
                        {points.map((p: any, i: number) => {
                          const isLast  = i === points.length - 1;
                          const showDate = i === 0 || isLast || points.length <= 7;
                          return (
                            <g key={i}>
                              {isLast && <circle cx={xOf(i)} cy={yOf(p.score)} r={9}
                                fill={LABEL_COLOR[p.label] ?? '#6b7280'} fillOpacity={0.15} />}
                              <circle cx={xOf(i)} cy={yOf(p.score)} r={isLast ? 5 : 4}
                                fill={LABEL_COLOR[p.label] ?? '#6b7280'} stroke="white" strokeWidth={2} />
                              {showDate && (
                                <text x={xOf(i)} y={H - 6} textAnchor="middle" fontSize={7.5} fill="#9ca3af">
                                  {new Date(p.date).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' })}
                                </text>
                              )}
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  )}

                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    Connected as <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>{permaData.mhbot_username || '—'}</span>
                    <span className="mx-1.5">·</span>
                    {points.length} assessment{points.length !== 1 ? 's' : ''} recorded
                  </p>
                </div>
              );
            })()}
          </div>
        )}

        {/* Account section */}
        <div className="rounded-2xl shadow-card p-5 flex flex-col gap-2" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>Account</p>

          <button onClick={openPwModal}
            className="flex items-center justify-between px-4 py-3 rounded-xl transition text-left group"
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center transition"
                style={{ background: 'var(--color-bg)' }}>
                <Lock size={14} style={{ color: 'var(--color-text-muted)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Change Password</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Update your account password</p>
              </div>
            </div>
            <span className="text-lg leading-none" style={{ color: 'var(--color-text-muted)' }}>›</span>
          </button>

          {userRole && ['COUNSELOR', 'PSYCHOLOGIST', 'IC'].includes(userRole) && (
            <Link href="/staff-settings"
              className="flex items-center justify-between px-4 py-3 rounded-xl transition"
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
                  <User size={14} style={{ color: 'var(--color-text-muted)' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Work Preferences & Availability</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Set your schedule and session preferences</p>
                </div>
              </div>
              <span className="text-lg leading-none" style={{ color: 'var(--color-text-muted)' }}>›</span>
            </Link>
          )}
        </div>
      </div>

      {/* EMA Consent Modal */}
      {showEmaConsent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl shadow-xl w-full max-w-md p-6" style={{ background: 'var(--color-surface)' }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--color-success-surface)' }}>
                <Activity size={16} style={{ color: 'var(--color-success)' }} />
              </div>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>Link EMA Account</h3>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>One-time consent required before connecting</p>
              </div>
            </div>

            <div className="rounded-xl p-4 mb-4 text-xs leading-relaxed"
              style={{ background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary)' }}>
              <p className="font-semibold mb-1" style={{ color: 'var(--color-primary)' }}>What this consent allows:</p>
              <ul className="list-disc list-inside space-y-1" style={{ color: 'var(--color-primary)' }}>
                <li>CPS will access your EMA wellbeing labels (e.g. Thriving, Surviving)</li>
                <li>Your counselor may use this to suggest relevant pre-session assessments</li>
                <li>Only your assigned counselor or psychologist can view this data</li>
                <li>You can disconnect EMA at any time from this page</li>
              </ul>
            </div>

            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl transition mb-4"
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <input type="checkbox" checked={emaConsentChecked} onChange={e => setEmaConsentChecked(e.target.checked)}
                className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ accentColor: 'var(--color-primary)' }} />
              <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                I consent to CPS accessing my EMA wellness data to support my counseling sessions, in accordance with the Data Privacy Act of 2012 (RA 10173).
              </span>
            </label>

            {emaConsentError && <p className="text-xs mb-3" style={{ color: 'var(--color-danger)' }}>{emaConsentError}</p>}

            <div className="flex gap-3">
              <button onClick={() => setShowEmaConsent(false)}
                className="flex-1 py-2.5 text-sm font-medium rounded-lg border transition"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                Cancel
              </button>
              <button onClick={handleEmaConsent} disabled={!emaConsentChecked || emaConsentSaving}
                className="flex-1 py-2.5 text-white text-sm font-semibold rounded-lg transition hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: 'var(--color-primary)' }}>
                {emaConsentSaving && <Loader2 size={13} className="animate-spin" />}
                I Agree &amp; Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPwModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl shadow-xl w-full max-w-md p-6" style={{ background: 'var(--color-surface)' }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--color-success-surface)' }}>
                <Lock size={16} style={{ color: 'var(--color-success)' }} />
              </div>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>Change Password</h3>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Choose a strong password of at least 8 characters</p>
              </div>
            </div>

            {pwSuccess ? (
              <div className="flex flex-col items-center py-6 gap-3">
                <CheckCircle size={40} style={{ color: 'var(--color-success)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Password changed successfully</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pwError && (
                  <div className="flex gap-2 rounded-lg p-3" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)' }}>
                    <AlertCircle size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-danger)' }} />
                    <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{pwError}</p>
                  </div>
                )}

                {[
                  { label: 'Current Password',     key: 'current' as const, show: showCurrent, toggle: () => setShowCurrent(v => !v) },
                  { label: 'New Password',          key: 'newPw'   as const, show: showNew,     toggle: () => setShowNew(v => !v) },
                  { label: 'Confirm New Password',  key: 'confirm' as const, show: showConfirm, toggle: () => setShowConfirm(v => !v) },
                ].map(({ label, key, show, toggle }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>{label}</label>
                    <div className="relative">
                      <input type={show ? 'text' : 'password'} value={pwForm[key]}
                        onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
                        className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-lg outline-none"
                        style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                        placeholder={key === 'current' ? 'Enter current password' : key === 'newPw' ? 'At least 8 characters' : 'Re-enter new password'} />
                      <button type="button" onClick={toggle}
                        className="absolute right-3 top-1/2 -translate-y-1/2 transition"
                        style={{ color: 'var(--color-text-muted)' }}>
                        {show ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                ))}

                {pwForm.newPw.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {[
                      { ok: pwForm.newPw.length >= 8,                                        label: '8+ chars' },
                      { ok: /[A-Z]/.test(pwForm.newPw),                                      label: 'Uppercase' },
                      { ok: /[0-9]/.test(pwForm.newPw),                                      label: 'Number' },
                      { ok: pwForm.newPw === pwForm.confirm && pwForm.confirm.length > 0,     label: 'Match' },
                    ].map(({ ok, label }) => (
                      <span key={label} className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={ok
                          ? { background: 'var(--color-success-surface)', color: 'var(--color-success)' }
                          : { background: 'var(--color-bg)', color: 'var(--color-text-muted)' }}>
                        {ok ? '✓' : '○'} {label}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowPwModal(false)}
                    className="flex-1 py-2.5 text-sm font-medium rounded-lg border transition"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    Cancel
                  </button>
                  <button onClick={handleChangePassword} disabled={pwSaving}
                    className="flex-1 py-2.5 text-white text-sm font-semibold rounded-lg transition hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'var(--color-primary)' }}>
                    {pwSaving ? 'Saving…' : 'Update Password'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardPageWrapper>
    </>
  );
}
