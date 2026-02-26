"use client";

import React, { useState } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Edit2, Save } from 'lucide-react';
import Link from 'next/link';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';

export default function ProfilePage() {
  const [editMode, setEditMode] = useState(false);
  const [profile, setProfile] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@university.edu',
    phone: '(555) 123-4567',
    studentId: 'STU-2024-001',
    major: 'Computer Science',
    year: 'Junior',
    enrollmentDate: '2022-08-15',
    emergencyContact: 'Jane Doe',
    emergencyPhone: '(555) 987-6543',
  });

  const [formData, setFormData] = useState(profile);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSave = () => {
    setProfile(formData);
    setEditMode(false);
  };

  return (
    <DashboardPageWrapper title="My Profile">
      <div className="max-w-3xl mx-auto">
        <div className="border border-gray-200 rounded p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gray-400 rounded-full flex items-center justify-center text-white text-xl font-semibold">{profile.firstName[0]}{profile.lastName[0]}</div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 mb-1">{profile.firstName} {profile.lastName}</h2>
                <p className="text-xs text-gray-600">{profile.studentId}</p>
                <p className="text-xs text-gray-600">{profile.major} • {profile.year}</p>
              </div>
            </div>
            <button onClick={() => setEditMode(!editMode)} className="flex items-center gap-2 bg-gray-400 hover:bg-gray-500 text-white px-3 py-1.5 rounded text-sm transition"><Edit2 size={14} /> {editMode ? 'Cancel' : 'Edit'}</button>
          </div>

          <div className="space-y-4">
            {editMode ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">First Name</label>
                    <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Last Name</label>
                    <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" />
                  </div>
                </div>
                <button onClick={handleSave} className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-1.5 rounded text-sm transition flex items-center gap-2"><Save size={14} /> Save</button>
              </>
            ) : (
              <div className="space-y-2">
                <InfoRow icon={<Mail size={16} />} label="Email" value={profile.email} />
                <InfoRow icon={<Phone size={16} />} label="Phone" value={profile.phone} />
                <InfoRow icon={<User size={16} />} label="Student ID" value={profile.studentId} />
                <InfoRow icon={<Calendar size={16} />} label="Enrollment Date" value={new Date(profile.enrollmentDate).toLocaleDateString()} />
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <h3 className="text-xs font-semibold text-gray-700 mb-2">Emergency Contact</h3>
                  <InfoRow label="Name" value={profile.emergencyContact} indent={true} />
                  <InfoRow label="Phone" value={profile.emergencyPhone} indent={true} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 border border-gray-200 rounded p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Account Settings</h3>
          <div className="space-y-2">
            <AccountOption label="Change Password" description="Update password" />
            <AccountOption label="Notification Preferences" description="Manage notifications" />
            <AccountOption label="Privacy Settings" description="Control information visibility" />
            <AccountOption label="Two-Factor Authentication" description="Secure with 2FA" isEnabled={true} />
          </div>
        </div>
      </div>
    </DashboardPageWrapper>
  );
}

function InfoRow({ icon, label, value, indent }: any) {
  return (
    <div className={`flex items-center gap-3 text-sm ${indent ? 'ml-4' : ''}`}>
      {icon && <div className="text-gray-400 flex-shrink-0">{icon}</div>}
      <div className="flex-1">
        <p className="text-xs text-gray-600">{label}</p>
        <p className="text-sm text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function AccountOption({ label, description, isEnabled }: any) {
  return (
    <div className="flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50 transition cursor-pointer">
      <div>
        <p className="text-sm text-gray-900">{label}</p>
        <p className="text-xs text-gray-600">{description}</p>
      </div>
      {isEnabled && <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">Enabled</span>}
    </div>
  );
}
