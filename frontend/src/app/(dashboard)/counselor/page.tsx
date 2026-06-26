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
    const token = localStorage.getItem('token');

    if (!userData || !token) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    // Fetch counselor profile
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await fetch(getApiUrl('/api/users/profile'), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setProfile(data);
          setError('');
        } else if (response.status === 404) {
          setError('Profile information not found');
        } else {
          setError('Failed to load profile');
        }
      } catch (err) {
        console.error('Error fetching counselor profile:', err);
        setError('Error loading profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  if (loading) {
    return (
      <DashboardPageWrapper title="Counselor Profile" subtitle="Your profile information">
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-3">
            <Loader className="animate-spin text-green-600" size={32} />
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </div>
      </DashboardPageWrapper>
    );
  }

  if (error && !profile) {
    return (
      <DashboardPageWrapper title="Counselor Profile" subtitle="Your profile information">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-200">Unable to Load Profile</h3>
              <p className="text-red-800 dark:text-red-300 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      </DashboardPageWrapper>
    );
  }

  // Use user data as fallback if profile fetch failed
  const displayProfile: CounselorProfile = profile || ({
    _id: user?._id || '',
    first_name: user?.first_name || 'N/A',
    last_name: user?.last_name || 'N/A',
    email: user?.email || 'N/A',
  } as CounselorProfile);

  const fullName = `${displayProfile.first_name} ${displayProfile.last_name}`;

  return (
    <DashboardPageWrapper title="Counselor Profile" subtitle="Your professional profile">
      <div className="max-w-4xl space-y-6">
        {/* Main Profile Card */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                {displayProfile.first_name?.charAt(0).toUpperCase()}{displayProfile.last_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{fullName}</h1>
                <p className="text-gray-600 dark:text-gray-400">Licensed Counselor</p>
                {displayProfile.specialization && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-2">{displayProfile.specialization}</p>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="flex items-center gap-4">
              <Mail className="text-green-600 dark:text-green-400" size={24} />
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Email</p>
                <p className="text-gray-900 dark:text-white font-medium break-all">{displayProfile.email}</p>
              </div>
            </div>

            {displayProfile.phone && (
              <div className="flex items-center gap-4">
                <Phone className="text-green-600 dark:text-green-400" size={24} />
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Phone</p>
                  <p className="text-gray-900 dark:text-white font-medium">{displayProfile.phone}</p>
                </div>
              </div>
            )}

            {displayProfile.office_location && (
              <div className="flex items-center gap-4">
                <MapPin className="text-green-600 dark:text-green-400" size={24} />
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Office Location</p>
                  <p className="text-gray-900 dark:text-white font-medium">{displayProfile.office_location}</p>
                </div>
              </div>
            )}

            {displayProfile.availability && (
              <div className="flex items-center gap-4">
                <Clock className="text-green-600 dark:text-green-400" size={24} />
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Availability</p>
                  <p className="text-gray-900 dark:text-white font-medium">{displayProfile.availability}</p>
                </div>
              </div>
            )}
          </div>

          {/* Bio Section */}
          {displayProfile.bio && (
            <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">About</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{displayProfile.bio}</p>
            </div>
          )}

          {/* Professional Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {displayProfile.years_experience !== undefined && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="text-blue-600 dark:text-blue-400" size={20} />
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Experience</p>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {displayProfile.years_experience}+ years
                </p>
              </div>
            )}

            {displayProfile.languages && displayProfile.languages.length > 0 && (
              <div className="bg-green-50 dark:bg-blue-900/20 border border-green-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="text-green-600 dark:text-green-400" size={20} />
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Languages</p>
                </div>
                <p className="text-gray-900 dark:text-white font-medium">{displayProfile.languages.join(', ')}</p>
              </div>
            )}

            {displayProfile.session_rate !== undefined && (
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="text-purple-600 dark:text-purple-400" size={20} />
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Session Rate</p>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${displayProfile.session_rate}
                </p>
              </div>
            )}
          </div>

          {/* Qualifications */}
          {displayProfile.qualifications && displayProfile.qualifications.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Award size={20} className="text-green-600" />
                Qualifications & Certifications
              </h3>
              <ul className="space-y-2">
                {displayProfile.qualifications.map((qual, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                    <span className="text-green-600 dark:text-green-400 mt-1">✓</span>
                    {qual}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-blue-900 dark:text-blue-200 text-sm">
            <strong>Note:</strong> To update your profile information, please contact your administrator or use the form settings page.
          </p>
        </div>
      </div>
    </DashboardPageWrapper>
  );
}
