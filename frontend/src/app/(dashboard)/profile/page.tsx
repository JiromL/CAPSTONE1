"use client";

import React, { useState } from 'react';
import { ArrowLeft, User, Mail, Phone, MapPin, Calendar, Edit2, Save } from 'lucide-react';
import Link from 'next/link';
import PageShell from '@/components/PageShell';

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
    <PageShell title="My Profile">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-start gap-6">
              <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white text-4xl font-bold">{profile.firstName[0]}{profile.lastName[0]}</div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{profile.firstName} {profile.lastName}</h2>
                <p className="text-gray-600">{profile.studentId}</p>
                <p className="text-gray-600">{profile.major} • {profile.year}</p>
              </div>
            </div>
            <button onClick={() => setEditMode(!editMode)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"><Edit2 size={18} /> {editMode ? 'Cancel' : 'Edit Profile'}</button>
          </div>

          <div className="space-y-6">
            {editMode ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                    <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                    <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  </div>
                </div>
                <button onClick={handleSave} className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2"><Save size={18} /> Save Changes</button>
              </>
            ) : (
              <div className="space-y-4">
                <InfoRow icon={<Mail size={20} />} label="Email" value={profile.email} />
                <InfoRow icon={<Phone size={20} />} label="Phone" value={profile.phone} />
                <InfoRow icon={<User size={20} />} label="Student ID" value={profile.studentId} />
                <InfoRow icon={<Calendar size={20} />} label="Enrollment Date" value={new Date(profile.enrollmentDate).toLocaleDateString()} />
                <hr className="my-4" />
                <h3 className="font-bold text-gray-900 mb-3">Emergency Contact</h3>
                <InfoRow label="Name" value={profile.emergencyContact} indent={true} />
                <InfoRow label="Phone" value={profile.emergencyPhone} indent={true} />
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Account Settings</h3>
          <div className="space-y-4">
            <AccountOption label="Change Password" description="Update your account password" />
            <AccountOption label="Notification Preferences" description="Manage email and SMS notifications" />
            <AccountOption label="Privacy Settings" description="Control who can see your information" />
            <AccountOption label="Two-Factor Authentication" description="Secure your account with 2FA" isEnabled={true} />
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function InfoRow({ icon, label, value, indent }: any) {
  return (
    <div className={`flex items-center gap-4 ${indent ? 'ml-6' : ''}`}>
      {icon && <div className="text-gray-400">{icon}</div>}
      <div className="flex-1">
        <p className="text-sm text-gray-600">{label}</p>
        <p className="font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function AccountOption({ label, description, isEnabled }: any) {
  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition cursor-pointer">
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      {isEnabled && <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">Enabled</span>}
    </div>
  );
}
