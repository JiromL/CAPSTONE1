'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Phone, MapPin, Clock, Award, FileText, AlertCircle, Loader } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { getApiUrl } from '@/utils/api-config';

interface CounselorProfile {
  _id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  specialization?: string;
  bio?: string;
  office_location?: string;
  availability?: string;
  qualifications?: string[];
  languages?: string[];
  session_rate?: number;
  years_experience?: number;
}

export default function CounselorProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CounselorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token    = localStorage.getItem('token');
    if (!userData || !token) { router.push('/login'); return; }
    setUser(JSON.parse(userData));

    (async () => {
      try {
        const r = await fetch(getApiUrl('/api/users/profile'), {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (r.ok) { setProfile(await r.json()); }
        else setError(r.status === 404 ? 'Profile information not found' : 'Failed to load profile');
      } catch { setError('Error loading profile. Please try again.'); }
      finally { setLoading(false); }
    })();
  }, [router]);

  if (loading) {
    return (
      <DashboardPageWrapper title="Counselor Profile" subtitle="Your profile information">
        <div className="flex items-center justify-center h-96 flex-col gap-3">
          <Loader className="animate-spin" size={32} style={{ color: 'var(--color-primary)' }} />
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading profile…</p>
        </div>
      </DashboardPageWrapper>
    );
  }

  if (error && !profile) {
    return (
      <DashboardPageWrapper title="Counselor Profile" subtitle="Your profile information">
        <div className="rounded-xl border p-6"
          style={{ background: 'var(--color-danger-surface)', borderColor: 'var(--color-danger)' }}>
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-danger)' }} />
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--color-danger)' }}>Unable to Load Profile</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--color-danger)' }}>{error}</p>
            </div>
          </div>
        </div>
      </DashboardPageWrapper>
    );
  }

  const dp: CounselorProfile = profile || {
    _id: user?._id || '', first_name: user?.first_name || 'N/A',
    last_name: user?.last_name || 'N/A', email: user?.email || 'N/A',
  } as CounselorProfile;
  const fullName = `${dp.first_name} ${dp.last_name}`;
  const initials = `${dp.first_name?.charAt(0).toUpperCase() ?? ''}${dp.last_name?.charAt(0).toUpperCase() ?? ''}`;

  const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
    <div className="flex items-center gap-4">
      <Icon size={24} style={{ color: 'var(--color-primary)' }} />
      <div>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
        <p className="font-medium break-all" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
      </div>
    </div>
  );

  return (
    <DashboardPageWrapper title="Counselor Profile" subtitle="Your professional profile">
      <div className="max-w-4xl space-y-6">

        {/* Main Card */}
        <div className="rounded-2xl border shadow-card p-8" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>

          {/* Header */}
          <div className="flex items-start gap-6 pb-6 mb-6" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold flex-shrink-0"
              style={{ background: 'var(--color-primary)' }}>
              {initials}
            </div>
            <div>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{fullName}</h2>
              <p style={{ color: 'var(--color-text-secondary)' }}>Licensed Counselor</p>
              {dp.specialization && (
                <p className="text-sm mt-2" style={{ color: 'var(--color-primary)' }}>{dp.specialization}</p>
              )}
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <InfoRow icon={Mail} label="Email" value={dp.email} />
            {dp.phone && <InfoRow icon={Phone} label="Phone" value={dp.phone} />}
            {dp.office_location && <InfoRow icon={MapPin} label="Office Location" value={dp.office_location} />}
            {dp.availability && <InfoRow icon={Clock} label="Availability" value={dp.availability} />}
          </div>

          {/* Bio */}
          {dp.bio && (
            <div className="mb-8 p-4 rounded-lg" style={{ background: 'var(--color-bg)' }}>
              <h3 className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>About</h3>
              <p className="leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{dp.bio}</p>
            </div>
          )}

          {/* Professional info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {dp.years_experience !== undefined && (
              <div className="rounded-lg border p-4" style={{ background: 'var(--color-primary-surface)', borderColor: 'var(--color-primary)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Award size={20} style={{ color: 'var(--color-primary)' }} />
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Experience</p>
                </div>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{dp.years_experience}+ years</p>
              </div>
            )}
            {dp.languages && dp.languages.length > 0 && (
              <div className="rounded-lg border p-4" style={{ background: 'var(--color-success-surface)', borderColor: 'var(--color-success)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={20} style={{ color: 'var(--color-success)' }} />
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Languages</p>
                </div>
                <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{dp.languages.join(', ')}</p>
              </div>
            )}
            {dp.session_rate !== undefined && (
              <div className="rounded-lg border p-4" style={{ background: '#F5F3FF', borderColor: '#7C3AED' }}>
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={20} style={{ color: '#7C3AED' }} />
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Session Rate</p>
                </div>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>${dp.session_rate}</p>
              </div>
            )}
          </div>

          {/* Qualifications */}
          {dp.qualifications && dp.qualifications.length > 0 && (
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
              <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                <Award size={20} style={{ color: 'var(--color-primary)' }} />
                Qualifications & Certifications
              </h3>
              <ul className="space-y-2">
                {dp.qualifications.map((qual, idx) => (
                  <li key={idx} className="flex items-start gap-3" style={{ color: 'var(--color-text-secondary)' }}>
                    <span className="mt-1" style={{ color: 'var(--color-primary)' }}>✓</span>
                    {qual}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Info tip */}
        <div className="rounded-xl border p-4" style={{ background: 'var(--color-primary-surface)', borderColor: 'var(--color-primary)' }}>
          <p className="text-sm" style={{ color: 'var(--color-primary)' }}>
            <strong>Note:</strong> To update your profile information, please contact your administrator or use the form settings page.
          </p>
        </div>
      </div>
    </DashboardPageWrapper>
  );
}
