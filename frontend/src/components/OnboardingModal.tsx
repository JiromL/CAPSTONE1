'use client';

import { useState } from 'react';
import { Loader2, GraduationCap, Phone, Users } from 'lucide-react';
import { api } from '@/utils/api';

const DLSU_COLLEGES = [
  { abbr: 'CCS',    name: 'College of Computer Studies',    courses: ['BS Computer Science', 'BS Information Technology', 'BS Information Systems'] },
  { abbr: 'COB',    name: 'College of Business',            courses: ['BS Accountancy', 'BS Business Administration', 'BS Entrepreneurship', 'BS Management of Financial Institutions'] },
  { abbr: 'COE',    name: 'College of Engineering',         courses: ['BS Chemical Engineering', 'BS Civil Engineering', 'BS Electronics Engineering', 'BS Industrial Engineering', 'BS Mechanical Engineering'] },
  { abbr: 'CLA',    name: 'College of Liberal Arts',        courses: ['BA Communication Arts', 'BA Political Science', 'BA Psychology', 'BA Filipino', 'BA Literature'] },
  { abbr: 'COS',    name: 'College of Science',             courses: ['BS Biology', 'BS Chemistry', 'BS Mathematics', 'BS Physics'] },
  { abbr: 'SOE',    name: 'School of Economics',            courses: ['BS Economics', 'BS Applied Economics'] },
  { abbr: 'BAGCED', name: 'College of Education',           courses: ['BS Education (major in English)', 'BS Education (major in Mathematics)', 'BS Education (major in Filipino)'] },
  { abbr: 'SOM',    name: 'School of Medicine',             courses: ['Doctor of Medicine'] },
  { abbr: 'GCOE',   name: 'Graduate School',                courses: ['Masters / Doctoral program'] },
];

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Graduate'];

const IC = 'w-full px-3 py-2 text-sm rounded-xl outline-none transition-all';
const ICS: React.CSSProperties = {
  background: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-primary)',
};

const STEPS = [
  { icon: GraduationCap, label: 'Academic Info' },
  { icon: Phone,         label: 'Contact'       },
  { icon: Users,         label: 'Emergency'     },
];

interface Props {
  user: any;
  onComplete: (updatedUser: any) => void;
}

export function OnboardingModal({ user, onComplete }: Props) {
  const [step, setStep]     = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const [form, setForm] = useState({
    college:    user?.college     || '',
    course:     user?.course      || '',
    year:       user?.year        || '',
    student_id: user?.id_number   || '',
    phone:      user?.phone       || '',
    ec_name:    user?.emergency_contact || '',
    ec_rel:     user?.emergency_contact_relationship || '',
    ec_phone:   user?.emergency_phone   || '',
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.value;
    setForm(p => k === 'college' ? { ...p, college: value, course: '' } : { ...p, [k]: value });
  };

  const selectedCollege = DLSU_COLLEGES.find(c => c.abbr === form.college);

  function canAdvance() {
    if (step === 0) return form.college && form.course && form.year;
    if (step === 1) return form.phone.trim().length >= 7;
    if (step === 2) return form.ec_name.trim() && form.ec_phone.trim().length >= 7;
    return true;
  }

  async function handleFinish() {
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(api('/api/users/profile'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          first_name: user.first_name,
          last_name:  user.last_name,
          email:      user.email,
          phone:      form.phone,
          college:    form.college,
          course:     form.course,
          year:       form.year,
          id_number:  form.student_id || undefined,
          emergency_contact:              form.ec_name,
          emergency_contact_relationship: form.ec_rel,
          emergency_phone:                form.ec_phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to save. Please try again.'); return; }
      if (!data.user) { setError('Save succeeded but response was incomplete. Please try again.'); return; }
      onComplete(data.user);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleNext() {
    if (step < 2) { setStep(s => s + 1); setError(''); }
    else handleFinish();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-md rounded-3xl shadow-2xl p-8"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        {/* Header */}
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: 'var(--color-primary)' }}>
            Getting Started
          </p>
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Complete your profile
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Takes about a minute — helps us serve you faster.
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                    style={{
                      background: done || active ? 'var(--color-primary)' : 'var(--color-bg)',
                      border: `2px solid ${done || active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    }}
                  >
                    <s.icon size={14} style={{ color: done || active ? '#fff' : 'var(--color-text-muted)' }} />
                  </div>
                  <span className="text-xs font-medium whitespace-nowrap" style={{ color: active ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-0.5 mb-4 transition-all" style={{ background: i < step ? 'var(--color-primary)' : 'var(--color-border)' }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="space-y-4 mb-6">

          {step === 0 && (
            <>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  College <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <select className={IC} style={ICS} value={form.college} onChange={set('college')}>
                  <option value="">— Select your college —</option>
                  {DLSU_COLLEGES.map(c => (
                    <option key={c.abbr} value={c.abbr}>{c.abbr} · {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Program / Course <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input
                  className={IC} style={ICS} value={form.course}
                  onChange={set('course')}
                  placeholder={selectedCollege ? `e.g. ${selectedCollege.courses[0]}` : 'Select a college first'}
                  list="course-suggestions"
                />
                {selectedCollege && (
                  <datalist id="course-suggestions">
                    {selectedCollege.courses.map(c => <option key={c} value={c} />)}
                  </datalist>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Year Level <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <select className={IC} style={ICS} value={form.year} onChange={set('year')}>
                  <option value="">— Select year level —</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Student ID <span className="font-normal" style={{ color: 'var(--color-text-muted)' }}>(optional)</span>
                </label>
                <input
                  className={IC} style={ICS} value={form.student_id}
                  onChange={set('student_id')}
                  placeholder="e.g. 12345678"
                  maxLength={8}
                />
              </div>
            </>
          )}

          {step === 1 && (
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                Mobile Number <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                type="tel" className={IC} style={ICS} value={form.phone}
                onChange={set('phone')}
                placeholder="+63 9XX XXX XXXX"
              />
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                Used only by our counseling office to reach you about appointments.
              </p>
            </div>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Emergency Contact Name <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input className={IC} style={ICS} value={form.ec_name} onChange={set('ec_name')} placeholder="Full name" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Relationship
                </label>
                <input className={IC} style={ICS} value={form.ec_rel} onChange={set('ec_rel')} placeholder="e.g. Parent, Guardian, Sibling" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Emergency Contact Number <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input type="tel" className={IC} style={ICS} value={form.ec_phone} onChange={set('ec_phone')} placeholder="+63 9XX XXX XXXX" />
              </div>
            </>
          )}

        </div>

        {/* Error */}
        {error && (
          <p className="text-xs mb-4 px-3 py-2 rounded-lg" style={{ background: 'var(--color-danger-surface)', color: 'var(--color-danger)' }}>
            {error}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Step {step + 1} of {STEPS.length}
          </p>
          <button
            onClick={handleNext}
            disabled={!canAdvance() || saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
            style={{ background: 'var(--color-primary)' }}
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {step < 2 ? 'Continue →' : saving ? 'Saving…' : 'Complete Setup'}
          </button>
        </div>
      </div>
    </div>
  );
}
