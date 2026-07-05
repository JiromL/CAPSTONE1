"use client";

import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Edit2, Save, AlertCircle, Lock, Eye, EyeOff, CheckCircle, Activity, LogIn, LogOut, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import { PermaBadge } from '@/components/PendingStudentsWithPerma';

const DLSU_COLLEGES: { abbr: string; name: string; sampleCourses: string[] }[] = [
  { abbr: 'CCS', name: 'College of Computer Studies',       sampleCourses: ['BS Computer Science', 'BS Information Technology', 'BS Information Systems'] },
  { abbr: 'COB', name: 'College of Business',               sampleCourses: ['BS Accountancy', 'BS Business Administration', 'BS Entrepreneurship', 'BS Management of Financial Institutions'] },
  { abbr: 'COE', name: 'College of Engineering',            sampleCourses: ['BS Chemical Engineering', 'BS Civil Engineering', 'BS Electronics Engineering', 'BS Industrial Engineering', 'BS Mechanical Engineering'] },
  { abbr: 'CLA', name: 'College of Liberal Arts',           sampleCourses: ['BA Communication Arts', 'BA Political Science', 'BA Psychology', 'BA Filipino', 'BA Literature'] },
  { abbr: 'COS', name: 'College of Science',                sampleCourses: ['BS Biology', 'BS Chemistry', 'BS Mathematics', 'BS Physics'] },
  { abbr: 'SOE', name: 'School of Economics',               sampleCourses: ['BS Economics', 'BS Applied Economics'] },
  { abbr: 'BAGCED', name: 'College of Education',           sampleCourses: ['BS Education (major in English)', 'BS Education (major in Mathematics)', 'BS Education (major in Filipino)'] },
  { abbr: 'SOM', name: 'School of Medicine',                sampleCourses: ['Doctor of Medicine'] },
  { abbr: 'GCOE', name: 'Graduate School',                  sampleCourses: ['Masters / Doctoral program'] },
];

export default function ProfilePage() {
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // PERMA / MHBot state (students only)
  const [permaData, setPermaData]         = useState<any>(null);
  const [loadingPerma, setLoadingPerma]   = useState(false);
  const [showMhbotForm, setShowMhbotForm] = useState(false);
  const [mhbotUser, setMhbotUser]         = useState('');
  const [mhbotPass, setMhbotPass]         = useState('');
  const [mhbotShowPw, setMhbotShowPw]     = useState(false);
  const [mhbotLogging, setMhbotLogging]   = useState(false);
  const [mhbotError, setMhbotError]       = useState('');
  const [mhbotStep, setMhbotStep]         = useState<1 | 2>(1);
  const [emaIdentifier, setEmaIdentifier] = useState('');
  const [savingId, setSavingId]           = useState(false);
  const [emaConsentGiven, setEmaConsentGiven] = useState(false);
  const [showEmaConsent, setShowEmaConsent]   = useState(false);
  const [emaConsentChecked, setEmaConsentChecked] = useState(false);
  const [emaConsentSaving, setEmaConsentSaving]   = useState(false);
  const [emaConsentError, setEmaConsentError]     = useState('');

  const cpsToken = () => localStorage.getItem('token') || '';

  async function fetchMyPerma() {
    setLoadingPerma(true);
    try {
      // Always load from saved snapshots (works with or without EMA connected)
      const r = await fetch(api('/api/mhbot/my-snapshots'), {
        headers: { Authorization: `Bearer ${cpsToken()}` },
      });
      const d = await r.json();
      setPermaData((prev: any) => ({
        connected: prev?.connected ?? false,
        mhbot_username: prev?.mhbot_username || '',
        latest_label: d.latest_label,
        latest_date: d.latest_date,
        history: (d.snapshots || []).map((s: any) => ({
          perma_label: s.perma_label,
          date: s.raw_date || s.entry_date,
        })),
      }));
    } catch {}
    finally { setLoadingPerma(false); }
  }

  async function handleMhbotLogin(e: React.FormEvent) {
    e.preventDefault();
    setMhbotLogging(true); setMhbotError('');
    try {
      const r = await fetch(api('/api/mhbot/auth/login'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${cpsToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: mhbotUser, password: mhbotPass }),
      });
      const d = await r.json();
      if (r.ok) {
        setShowMhbotForm(false);
        setMhbotUser(''); setMhbotPass('');
        setPermaData({ connected: true, mhbot_username: d.mhbot_username, latest_label: d.latest_label });
        fetchMyPerma();
      } else {
        setMhbotError(d.error || 'Login failed');
      }
    } catch { setMhbotError('Network error'); }
    finally { setMhbotLogging(false); }
  }

  async function handleEmaConsent() {
    setEmaConsentSaving(true); setEmaConsentError('');
    try {
      const r = await fetch(api('/api/consent/submit'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${cpsToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent_types: ['ema_data_linking'] }),
      });
      if (r.ok) {
        setEmaConsentGiven(true);
        setShowEmaConsent(false);
        setShowMhbotForm(true);
      } else {
        setEmaConsentError('Failed to record consent. Please try again.');
      }
    } catch { setEmaConsentError('Network error.'); }
    finally { setEmaConsentSaving(false); }
  }

  async function handleMhbotLogout() {
    await fetch(api('/api/mhbot/auth/logout'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${cpsToken()}` },
    });
    setPermaData(null);
  }

  // Change password modal state
  const [showPwModal, setShowPwModal] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const openPwModal = () => {
    setPwForm({ current: '', newPw: '', confirm: '' });
    setPwError(null); setPwSuccess(false);
    setShowPwModal(true);
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
    } catch {
      setPwError('Something went wrong. Please try again.');
    } finally {
      setPwSaving(false);
    }
  };
  const [userRole, setUserRole] = useState<string | null>(null);
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    studentId: '',
    college: '',
    course: '',
    major: '',
    year: '',
    emergencyContact: '',
    emergencyPhone: '',
  });

  const [formData, setFormData] = useState(profile);

  // Load user data from API on mount, fall back to localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    const cached = localStorage.getItem('user');
    const cachedUser = cached ? JSON.parse(cached) : {};

    // Pre-fill immediately from cache so the page isn't blank
    const fromCache = {
      firstName: cachedUser.first_name || '',
      lastName: cachedUser.last_name || '',
      email: cachedUser.email || '',
      phone: cachedUser.phone || '',
      studentId: cachedUser.id_number || '',
      college: cachedUser.college || '',
      course: cachedUser.course || '',
      major: cachedUser.major || '',
      year: cachedUser.year || '',
      emergencyContact: cachedUser.emergency_contact || '',
      emergencyPhone: cachedUser.emergency_phone || '',
    };
    setProfile(fromCache);
    setFormData(fromCache);
    setUserRole(cachedUser.role || null);

    if (!token) return;

    // Fetch fresh data from the API
    fetch(api('/api/users/profile'), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(user => {
        const fresh = {
          firstName: user.first_name || '',
          lastName: user.last_name || '',
          email: user.email || '',
          phone: user.phone || '',
          studentId: user.id_number || '',
          college: user.college || '',
          course: user.course || '',
          major: user.major || '',
          year: user.year || '',
          emergencyContact: user.emergency_contact || '',
          emergencyPhone: user.emergency_phone || '',
        };
        setProfile(fresh);
        setFormData(fresh);
        setUserRole(user.role || null);
        setEmaConsentGiven(user.ema_consent_given || false);
        localStorage.setItem('user', JSON.stringify({ ...cachedUser, ...user }));
        if (user.role === 'STUDENT') fetchMyPerma();
      })
      .catch(err => console.error('Failed to fetch profile from API:', err));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Reset course when college changes
    if (name === 'college') {
      setFormData({ ...formData, college: value, course: '' });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSave = async () => {
    // Validate email and name
    if (!formData.firstName.trim()) {
      setErrorMessage('First name is required');
      return;
    }
    if (!formData.lastName.trim()) {
      setErrorMessage('Last name is required');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setErrorMessage('Valid email is required');
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : {};

      const response = await fetch(api('/api/users/profile'), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          id_number: formData.studentId,
          college: formData.college,
          course: formData.course,
          major: formData.major,
          year: formData.year,
          emergency_contact: formData.emergencyContact,
          emergency_phone: formData.emergencyPhone,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update profile');
      }

      const { user: savedUser } = await response.json();

      // Sync localStorage with all returned fields
      localStorage.setItem('user', JSON.stringify({
        ...user,
        first_name: savedUser.first_name,
        last_name: savedUser.last_name,
        email: savedUser.email,
        phone: savedUser.phone,
        id_number: savedUser.id_number,
        college: savedUser.college,
        course: savedUser.course,
        major: savedUser.major,
        year: savedUser.year,
        emergency_contact: savedUser.emergency_contact,
        emergency_phone: savedUser.emergency_phone,
      }));

      setProfile(formData);
      setEditMode(false);
      setSuccessMessage('Profile updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      setErrorMessage(message);
      console.error('Profile update error:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <DashboardPageWrapper title="My Profile">
      <div className="max-w-3xl mx-auto">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-blue-700 rounded">
            <p className="text-sm text-green-700 dark:text-green-300">{successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded flex gap-3">
            <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={18} />
            <p className="text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
          </div>
        )}

        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gray-400 rounded-full flex items-center justify-center text-white text-xl font-semibold">{profile.firstName[0]}{profile.lastName[0]}</div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{profile.firstName} {profile.lastName}</h2>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {[profile.college, profile.course].filter(Boolean).join(' · ') || 'No course set'}
                </p>
              </div>
            </div>
            <button 
              onClick={() => {
                setEditMode(!editMode);
                setErrorMessage(null);
              }} 
              className="flex items-center gap-2 bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white px-3 py-2 rounded text-sm transition"
            >
              <Edit2 size={14} /> {editMode ? 'Cancel' : 'Edit'}
            </button>
          </div>

          <div className="space-y-4">
            {editMode ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                    <input 
                      type="text" 
                      name="firstName" 
                      value={formData.firstName} 
                      onChange={handleChange} 
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                    <input 
                      type="text" 
                      name="lastName" 
                      value={formData.lastName} 
                      onChange={handleChange} 
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-gray-400"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                    <input 
                      type="email" 
                      name="email" 
                      value={formData.email} 
                      onChange={handleChange} 
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-gray-400"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                    <input 
                      type="tel" 
                      name="phone" 
                      value={formData.phone} 
                      onChange={handleChange} 
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Student ID</label>
                    <input 
                      type="text" 
                      name="studentId" 
                      value={formData.studentId} 
                      onChange={handleChange} 
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">College</label>
                    <select
                      name="college"
                      value={formData.college}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-gray-400"
                    >
                      <option value="">— Select college —</option>
                      {DLSU_COLLEGES.map(c => (
                        <option key={c.abbr} value={c.abbr}>{c.abbr} · {c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course / Program</label>
                    <input
                      type="text"
                      name="course"
                      value={formData.course}
                      onChange={handleChange}
                      placeholder={
                        formData.college
                          ? `e.g. ${DLSU_COLLEGES.find(c => c.abbr === formData.college)?.sampleCourses[0] ?? 'your program'}`
                          : 'Select a college first'
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-gray-400 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                    {formData.college && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {DLSU_COLLEGES.find(c => c.abbr === formData.college)?.sampleCourses.map(sc => (
                          <button
                            key={sc}
                            type="button"
                            onClick={() => setFormData(f => ({ ...f, course: sc }))}
                            className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-blue-900/40 hover:text-green-700 dark:hover:text-green-300 transition-colors"
                          >
                            {sc}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-2 border-t border-gray-300 dark:border-gray-600 pt-4 mt-2">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Emergency Contact</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                    <input 
                      type="text" 
                      name="emergencyContact" 
                      value={formData.emergencyContact} 
                      onChange={handleChange} 
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                    <input 
                      type="tel" 
                      name="emergencyPhone" 
                      value={formData.emergencyPhone} 
                      onChange={handleChange} 
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-gray-400"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="flex items-center gap-2 bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white px-6 py-2 rounded-lg text-sm transition disabled:opacity-50"
                  >
                    <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button 
                    onClick={() => {
                      setFormData(profile);
                      setEditMode(false);
                      setErrorMessage(null);
                    }}
                    disabled={saving}
                    className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <InfoRow icon={<Mail size={16} />} label="Email" value={profile.email} />
                <InfoRow icon={<Phone size={16} />} label="Phone" value={profile.phone} />
                <InfoRow icon={<User size={16} />} label="Student ID" value={profile.studentId} />
                <InfoRow label="College" value={profile.college ? `${profile.college} · ${DLSU_COLLEGES.find(c => c.abbr === profile.college)?.name ?? ''}` : ''} />
                <InfoRow label="Course" value={profile.course} />
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Emergency Contact</h3>
                  <InfoRow label="Name" value={profile.emergencyContact} indent={true} />
                  <InfoRow label="Phone" value={profile.emergencyPhone} indent={true} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── PERMA / MHBot (students only) ── */}
        {userRole === 'STUDENT' && (
          <div className="mt-6 border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity size={15} className="text-green-500" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">My Wellbeing (PERMA)</h3>
              </div>
              {permaData?.connected && (
                <button onClick={handleMhbotLogout}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition">
                  <LogOut size={12} /> Disconnect
                </button>
              )}
            </div>

            {loadingPerma ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
                <Loader2 size={14} className="animate-spin" /> Loading…
              </div>
            ) : !permaData?.connected ? (
              /* Not connected */
              !showMhbotForm ? (
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => {
                      if (emaConsentGiven) { setShowMhbotForm(true); setMhbotError(''); }
                      else { setShowEmaConsent(true); setEmaConsentChecked(false); setEmaConsentError(''); }
                    }}
                      className="flex items-center gap-2 px-4 py-2 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition">
                      <LogIn size={13} /> Connect EMA
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleMhbotLogin} className="space-y-3 max-w-sm">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">EMA Username</label>
                    <input type="text" value={mhbotUser} onChange={e => setMhbotUser(e.target.value)} required
                      placeholder="Your EMA login username"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg placeholder-gray-400 focus:ring-2 focus:ring-[#2563eb] focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Password</label>
                    <div className="relative">
                      <input type={mhbotShowPw ? 'text' : 'password'} value={mhbotPass} onChange={e => setMhbotPass(e.target.value)} required
                        placeholder="••••••••"
                        className="w-full px-3 py-2 pr-9 text-sm border border-gray-300 rounded-lg placeholder-gray-400 focus:ring-2 focus:ring-[#2563eb] focus:outline-none" />
                      <button type="button" onClick={() => setMhbotShowPw(p => !p)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                        {mhbotShowPw ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </div>
                  {mhbotError && <p className="text-xs text-red-500">{mhbotError}</p>}
                  <p className="text-xs text-gray-400">Use the same credentials you use to log into the EMA chatbot.</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowMhbotForm(false)}
                      className="px-4 py-2 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition">
                      Cancel
                    </button>
                    <button type="submit" disabled={mhbotLogging}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#2563eb] hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition">
                      {mhbotLogging ? <><Loader2 size={12} className="animate-spin" /> Connecting…</> : <><LogIn size={12} /> Connect & Recover History</>}
                    </button>
                  </div>
                </form>
              )
            ) : (
              /* Connected — PERMA line graph */
              (() => {
                const LABEL_SCORE: Record<string, number> = {
                  'In Crisis': 1, 'Struggling': 2, 'Surviving': 3, 'Thriving': 4, 'Excelling': 5,
                };
                const LABEL_COLOR: Record<string, string> = {
                  'In Crisis': '#ef4444', 'Struggling': '#f97316', 'Surviving': '#eab308',
                  'Thriving': '#22c55e', 'Excelling': '#16a34a',
                };
                const ZONE_BG: { y: number; h: number; color: string; label: string }[] = [
                  { y: 0,   h: 20, color: '#fef2f2', label: 'In Crisis' },
                  { y: 20,  h: 20, color: '#fff7ed', label: 'Struggling' },
                  { y: 40,  h: 20, color: '#fefce8', label: 'Surviving' },
                  { y: 60,  h: 20, color: '#f0fdf4', label: 'Thriving' },
                  { y: 80,  h: 20, color: '#dcfce7', label: 'Excelling' },
                ];
                const history = [...(permaData.history || [])].reverse(); // oldest first
                const points = history
                  .map((e: any) => ({ label: e.perma_label, date: e.date, score: LABEL_SCORE[e.perma_label] }))
                  .filter((p: any) => p.score !== undefined);

                const W = 480, H = 100, PAD_L = 60, PAD_R = 16, PAD_T = 8, PAD_B = 20;
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
                const prev = points.length >= 2 ? points[points.length - 2]?.label : null;
                const latestScore = LABEL_SCORE[latest] ?? 0;
                const prevScore = LABEL_SCORE[prev] ?? 0;
                const trend = !prev ? null : latestScore > prevScore ? 'up' : latestScore < prevScore ? 'down' : 'same';

                return (
                  <div className="space-y-3">
                    {/* Current label + trend */}
                    <div className="flex items-center gap-3">
                      <PermaBadge label={latest} />
                      {trend === 'up' && <span className="text-xs text-green-600 font-medium flex items-center gap-0.5">↑ Improving</span>}
                      {trend === 'down' && <span className="text-xs text-red-500 font-medium flex items-center gap-0.5">↓ Declining</span>}
                      {trend === 'same' && <span className="text-xs text-gray-400">→ Stable</span>}
                      {permaData.latest_date && (
                        <span className="text-xs text-gray-400 ml-auto">
                          {new Date(permaData.latest_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                    </div>

                    {/* SVG line chart */}
                    {points.length === 0 ? (
                      <p className="text-xs text-gray-400 py-2">No assessments recorded yet. Complete a PERMA survey in the EMA chatbot.</p>
                    ) : (
                      <div className="rounded-xl overflow-hidden border border-gray-100 bg-white">
                        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 120 }}>
                          {/* Zone backgrounds */}
                          {ZONE_BG.map(z => (
                            <rect key={z.label} x={PAD_L} y={PAD_T + chartH - (z.y / 100) * chartH - (z.h / 100) * chartH}
                              width={chartW} height={(z.h / 100) * chartH} fill={z.color} />
                          ))}
                          {/* Y-axis labels */}
                          {[1,2,3,4,5].map(score => (
                            <text key={score} x={PAD_L - 6} y={yOf(score) + 3.5}
                              textAnchor="end" fontSize={7} fill="#9ca3af">
                              {['','In Crisis','Struggling','Surviving','Thriving','Excelling'][score]}
                            </text>
                          ))}
                          {/* Grid lines */}
                          {[1,2,3,4,5].map(score => (
                            <line key={score} x1={PAD_L} x2={PAD_L + chartW} y1={yOf(score)} y2={yOf(score)}
                              stroke="#e5e7eb" strokeWidth={0.5} strokeDasharray="3,2" />
                          ))}
                          {/* Fill area under line */}
                          {pathD && points.length > 1 && (
                            <path
                              d={`${pathD} L${xOf(points.length - 1)},${yOf(1) + chartH * 0.05} L${xOf(0)},${yOf(1) + chartH * 0.05} Z`}
                              fill={LABEL_COLOR[latest] ?? '#6b7280'} fillOpacity={0.08}
                            />
                          )}
                          {/* Line */}
                          {pathD && (
                            <path d={pathD} fill="none"
                              stroke={LABEL_COLOR[latest] ?? '#6b7280'} strokeWidth={2}
                              strokeLinecap="round" />
                          )}
                          {/* Dots + date labels */}
                          {points.map((p: any, i: number) => (
                            <g key={i}>
                              <circle cx={xOf(i)} cy={yOf(p.score)} r={3.5}
                                fill={LABEL_COLOR[p.label] ?? '#6b7280'} stroke="white" strokeWidth={1.5} />
                              {(i === 0 || i === points.length - 1 || points.length <= 6) && (
                                <text x={xOf(i)} y={H - 4} textAnchor="middle" fontSize={6.5} fill="#9ca3af">
                                  {new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </text>
                              )}
                            </g>
                          ))}
                        </svg>
                      </div>
                    )}

                    <p className="text-xs text-gray-400">
                      Connected as <span className="font-medium text-gray-500">{permaData.mhbot_username || '—'}</span>
                      {' · '}{points.length} assessment{points.length !== 1 ? 's' : ''} recorded
                    </p>
                  </div>
                );
              })()
            )}
          </div>
        )}

        <div className="mt-6 border border-gray-200 dark:border-gray-700 rounded p-6 bg-white dark:bg-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Account Settings</h3>
          <div className="space-y-2">
            <div onClick={openPwModal}><AccountOption label="Change Password" description="Update your account password" /></div>
            <AccountOption label="Notification Preferences" description="Manage notifications" />
            <AccountOption label="Privacy Settings" description="Control information visibility" />
            <AccountOption label="Two-Factor Authentication" description="Secure with 2FA" isEnabled={true} />
            {userRole && ['COUNSELOR', 'PSYCHOLOGIST', 'IC'].includes(userRole) && (
              <Link href="/staff-settings">
                <AccountOption label="Work Preferences & Availability" description="Configure availability without pricing" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── EMA Data Linking Consent Modal ── */}
      {showEmaConsent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                <Activity size={16} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Link EMA Account</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">One-time consent required before connecting</p>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 mb-4 text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
              <p className="font-semibold mb-1">What this consent allows:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-400">
                <li>CPS will access your EMA wellbeing labels (e.g. Thriving, Surviving)</li>
                <li>Your counselor may use this to suggest relevant pre-session assessments</li>
                <li>Only your assigned counselor or psychologist can view this data</li>
                <li>You can disconnect EMA at any time from this page</li>
              </ul>
            </div>

            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition mb-4">
              <input type="checkbox" checked={emaConsentChecked} onChange={e => setEmaConsentChecked(e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-[#2563eb] flex-shrink-0" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                I consent to CPS accessing my EMA wellness data to support my counseling sessions, in accordance with the Data Privacy Act of 2012 (RA 10173).
              </span>
            </label>

            {emaConsentError && <p className="text-xs text-red-500 mb-3">{emaConsentError}</p>}

            <div className="flex gap-3">
              <button onClick={() => setShowEmaConsent(false)}
                className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                Cancel
              </button>
              <button onClick={handleEmaConsent} disabled={!emaConsentChecked || emaConsentSaving}
                className="flex-1 py-2.5 bg-green-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition flex items-center justify-center gap-2">
                {emaConsentSaving && <Loader2 size={13} className="animate-spin" />}
                I Agree &amp; Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Change Password Modal ── */}
      {showPwModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                <Lock size={16} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Change Password</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Choose a strong password of at least 8 characters</p>
              </div>
            </div>

            {pwSuccess ? (
              <div className="flex flex-col items-center py-6 gap-3">
                <CheckCircle size={40} className="text-green-500" />
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Password changed successfully</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pwError && (
                  <div className="flex gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
                    <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700 dark:text-red-300">{pwError}</p>
                  </div>
                )}

                {[
                  { label: 'Current Password', key: 'current' as const, show: showCurrent, toggle: () => setShowCurrent(v => !v) },
                  { label: 'New Password',     key: 'newPw'   as const, show: showNew,     toggle: () => setShowNew(v => !v) },
                  { label: 'Confirm New Password', key: 'confirm' as const, show: showConfirm, toggle: () => setShowConfirm(v => !v) },
                ].map(({ label, key, show, toggle }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
                    <div className="relative">
                      <input
                        type={show ? 'text' : 'password'}
                        value={pwForm[key]}
                        onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
                        className="w-full px-3.5 py-2.5 pr-10 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white dark:focus:bg-gray-900"
                        placeholder={key === 'current' ? 'Enter current password' : key === 'newPw' ? 'At least 8 characters' : 'Re-enter new password'}
                      />
                      <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        {show ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                ))}

                {pwForm.newPw.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {[
                      { ok: pwForm.newPw.length >= 8,                       label: '8+ chars' },
                      { ok: /[A-Z]/.test(pwForm.newPw),                     label: 'Uppercase' },
                      { ok: /[0-9]/.test(pwForm.newPw),                     label: 'Number' },
                      { ok: pwForm.newPw === pwForm.confirm && pwForm.confirm.length > 0, label: 'Match' },
                    ].map(({ ok, label }) => (
                      <span key={label} className={`text-xs px-2 py-0.5 rounded-full font-medium ${ok ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800'}`}>
                        {ok ? '✓' : '○'} {label}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowPwModal(false)}
                    className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleChangePassword}
                    disabled={pwSaving}
                    className="flex-1 py-2.5 bg-green-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
                  >
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

function InfoRow({ icon, label, value, indent }: any) {
  return (
    <div className={`flex items-center gap-3 text-sm ${indent ? 'ml-4' : ''}`}>
      {icon && <div className="text-gray-400 dark:text-gray-500 flex-shrink-0">{icon}</div>}
      <div className="flex-1">
        <p className="text-xs text-gray-600 dark:text-gray-400">{label}</p>
        <p className="text-sm text-gray-900 dark:text-gray-100">{value}</p>
      </div>
    </div>
  );
}

function AccountOption({ label, description, isEnabled }: any) {
  return (
    <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer">
      <div>
        <p className="text-sm text-gray-900 dark:text-gray-100">{label}</p>
        <p className="text-xs text-gray-600 dark:text-gray-400">{description}</p>
      </div>
      {isEnabled && <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs">Enabled</span>}
    </div>
  );
}
