"use client";

import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Edit2, Save, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

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
        // Keep localStorage in sync
        localStorage.setItem('user', JSON.stringify({ ...cachedUser, ...user }));
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
    <DashboardPageWrapper title="My Profile">
      <div className="max-w-3xl mx-auto">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded">
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
                            className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
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

        <div className="mt-6 border border-gray-200 dark:border-gray-700 rounded p-6 bg-white dark:bg-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Account Settings</h3>
          <div className="space-y-2">
            <AccountOption label="Change Password" description="Update password" />
            <AccountOption label="Notification Preferences" description="Manage notifications" />
            <AccountOption label="Privacy Settings" description="Control information visibility" />
            <AccountOption label="Two-Factor Authentication" description="Secure with 2FA" isEnabled={true} />
            {userRole && ['COUNSELOR', 'PSYCHOLOGIST', 'IC', 'CSC', 'CSP'].includes(userRole) && (
              <Link href="/staff-settings">
                <AccountOption label="Work Preferences & Availability" description="Configure availability without pricing" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </DashboardPageWrapper>
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
