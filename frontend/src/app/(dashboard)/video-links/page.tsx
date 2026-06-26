'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import { AlertCircle, Video, ExternalLink, Lock, Copy, Check } from 'lucide-react';

interface VideoLink {
  video_link_id: string;
  platform: string;
  link_url: string;
  password?: string;
  start_time?: string;
  created_at: string;
  session_id?: string;
  session_name?: string;
  counselor_name?: string;
}

interface VideoLinksData {
  video_links: VideoLink[];
}

const PLATFORM_ICONS: Record<string, string> = {
  zoom: '🔵',
  google_meet: '🔴',
  teams: '🟦',
  other: '📹'
};

const PLATFORM_COLORS: Record<string, string> = {
  zoom: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  google_meet: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
  teams: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
  other: 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200'
};

export default function VideoLinksPage() {
  const router = useRouter();
  const [videoLinks, setVideoLinks] = useState<VideoLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // Fetch video links from appointments/sessions
  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userData || !token) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    const fetchVideoLinks = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const appointmentsResponse = await fetch(`${api('/api/appointments?include_video_links=true')}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (appointmentsResponse.ok) {
          const appointmentsData = await appointmentsResponse.json();
          // Extract video links from appointments
          const links: VideoLink[] = [];
          
          if (appointmentsData.appointments && Array.isArray(appointmentsData.appointments)) {
            for (const apt of appointmentsData.appointments) {
              if (apt.video_link || apt.meeting_link) {
                links.push({
                  video_link_id: apt._id || apt.id || `appointment-${apt.appointment_id}`,
                  platform: apt.preferred_platform || 'zoom',
                  link_url: apt.video_link || apt.meeting_link || apt.join_url || '',
                  password: apt.passcode || undefined,
                  start_time: apt.appointment_date || apt.start_time,
                  created_at: apt.created_at || new Date().toISOString(),
                  session_name: `Session with ${apt.counselor_name || 'Counselor'}`,
                  counselor_name: apt.counselor_name || 'Counselor'
                });
              }
            }
          }

          setVideoLinks(links);
          setError('');
        } else {
          // Fallback: only show placeholder if no appointments available
          setVideoLinks([]);
          setError('');
        }
      } catch (err) {
        // Don't show error for missing endpoint, instead show helpful message
        setVideoLinks([]);
        setError('');
      } finally {
        setLoading(false);
      }
    };

    fetchVideoLinks();
  }, [router]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isUpcoming = (startTime?: string) => {
    if (!startTime) return false;
    return new Date(startTime) > new Date();
  };

  const isActive = (startTime?: string) => {
    if (!startTime) return false;
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour duration
    return now >= start && now <= end;
  };

  if (loading) {
    return (
      <DashboardPageWrapper title="Video Meeting Links" subtitle="Join your counseling sessions">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DashboardPageWrapper>
    );
  }

  const upcomingLinks = videoLinks.filter(link => isUpcoming(link.start_time));
  const activeLinks = videoLinks.filter(link => isActive(link.start_time));
  const pastLinks = videoLinks.filter(link => !isUpcoming(link.start_time));

  return (
    <DashboardPageWrapper title="Video Meeting Links" subtitle="Join your counseling sessions">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Video Meeting Links</h1>
          <p className="text-gray-600 dark:text-gray-400">Join your counseling sessions</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Total Links</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{videoLinks.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Active Now</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{activeLinks.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Upcoming</p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{upcomingLinks.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Past Sessions</p>
            <p className="text-3xl font-bold text-gray-600 dark:text-gray-400">{pastLinks.length}</p>
          </div>
        </div>

        {/* Active Sessions (Highlighted) */}
        {activeLinks.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">🔴 Active Now</h2>
            {activeLinks.map(link => (
              <div
                key={link.video_link_id}
                className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border-2 border-green-400 dark:border-blue-700 p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-block animate-pulse text-2xl">🟢</span>
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                        {link.session_name}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      with {link.counselor_name} • {link.platform.replace('_', ' ').toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 flex-wrap">
                  <a
                    href={link.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                  >
                    <Video size={18} />
                    Join Session
                    <ExternalLink size={16} />
                  </a>
                  {link.password && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600">
                      <Lock size={16} className="text-gray-600 dark:text-gray-400" />
                      <code className="font-mono text-sm">{link.password}</code>
                      <button
                        onClick={() => copyToClipboard(link.password || '', link.video_link_id)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition"
                      >
                        {copiedId === link.video_link_id ? (
                          <Check size={16} className="text-green-600" />
                        ) : (
                          <Copy size={16} className="text-gray-600 dark:text-gray-400" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upcoming Sessions */}
        {upcomingLinks.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">📅 Upcoming</h2>
            <div className="space-y-3">
              {upcomingLinks.map(link => (
                <div
                  key={link.video_link_id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:shadow-md transition"
                  onClick={() => setExpandedId(expandedId === link.video_link_id ? null : link.video_link_id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{PLATFORM_ICONS[link.platform] || PLATFORM_ICONS.other}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {link.session_name}
                          </h3>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {link.start_time
                              ? new Date(link.start_time).toLocaleString()
                              : 'Time not specified'}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        with {link.counselor_name}
                      </p>
                      <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${PLATFORM_COLORS[link.platform] || PLATFORM_COLORS.other}`}>
                        {link.platform.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedId === link.video_link_id && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Meeting Link</p>
                        <div className="flex gap-2 items-center bg-gray-50 dark:bg-gray-700 p-3 rounded">
                          <input
                            type="text"
                            value={link.link_url}
                            readOnly
                            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-300 focus:outline-none"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(link.link_url, link.video_link_id);
                            }}
                            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition"
                          >
                            {copiedId === link.video_link_id ? (
                              <Check size={16} className="text-green-600" />
                            ) : (
                              <Copy size={16} className="text-gray-600 dark:text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>

                      {link.password && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Passcode</p>
                          <div className="flex gap-2 items-center bg-gray-50 dark:bg-gray-700 p-3 rounded">
                            <code className="flex-1 font-mono text-sm text-gray-900 dark:text-gray-300">
                              {link.password}
                            </code>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(link.password || '', link.video_link_id);
                              }}
                              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition"
                            >
                              {copiedId === link.video_link_id ? (
                                <Check size={16} className="text-green-600" />
                              ) : (
                                <Copy size={16} className="text-gray-600 dark:text-gray-400" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      <a
                        href={link.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium mt-2"
                      >
                        <Video size={18} />
                        Join Meeting
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Past Sessions */}
        {pastLinks.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">📋 Past Sessions</h2>
            <div className="space-y-2">
              {pastLinks.map(link => (
                <div
                  key={link.video_link_id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 opacity-60"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-700 dark:text-gray-400 line-through">
                        {link.session_name}
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-500">
                        {link.start_time ? new Date(link.start_time).toLocaleString() : 'Time not specified'} • {link.platform.toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {videoLinks.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
            <Video className="mx-auto text-gray-400 dark:text-gray-600 mb-4" size={48} />
            <p className="text-gray-700 dark:text-gray-300 font-medium">No video links available</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Video links will appear here when your counselor creates them for your sessions</p>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-blue-900 dark:text-blue-200 text-sm">
            <strong>💡 Tip:</strong> Copy the meeting link and passcode to join your sessions. Meeting links will be ready just before your scheduled session time.
          </p>
        </div>
      </div>
    </DashboardPageWrapper>
  );
}
