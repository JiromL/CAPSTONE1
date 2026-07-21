'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import { AlertCircle, Video, ExternalLink, Lock, Copy, Check, Loader2 } from 'lucide-react';

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

const PLATFORM_ICONS: Record<string, string> = {
  zoom: '🔵',
  google_meet: '🔴',
  teams: '🟦',
  other: '📹',
};

function platformStyle(platform: string): React.CSSProperties {
  switch (platform) {
    case 'zoom':        return { background: 'var(--color-primary-surface)', color: 'var(--color-primary)' };
    case 'google_meet': return { background: 'var(--color-danger-surface)',  color: 'var(--color-danger)'  };
    case 'teams':       return { background: '#F5F3FF', color: '#7C3AED' };
    default:            return { background: 'var(--color-bg)', color: 'var(--color-text-muted)' };
  }
}

function isUpcoming(startTime?: string) {
  if (!startTime) return false;
  return new Date(startTime) > new Date();
}

function isActive(startTime?: string) {
  if (!startTime) return false;
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return now >= start && now <= end;
}

export default function VideoLinksPage() {
  const router = useRouter();
  const [videoLinks, setVideoLinks] = useState<VideoLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!userData || !token) { router.push('/login'); return; }

    (async () => {
      try {
        setLoading(true);
        const r = await fetch(api('/api/appointments?include_video_links=true'), {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (r.ok) {
          const d = await r.json();
          const links: VideoLink[] = [];
          if (Array.isArray(d.appointments)) {
            for (const apt of d.appointments) {
              if (apt.video_link || apt.meeting_link) {
                links.push({
                  video_link_id: apt._id || apt.id || `appointment-${apt.appointment_id}`,
                  platform: apt.preferred_platform || 'zoom',
                  link_url: apt.video_link || apt.meeting_link || apt.join_url || '',
                  password: apt.passcode || undefined,
                  start_time: apt.appointment_date || apt.start_time,
                  created_at: apt.created_at || new Date().toISOString(),
                  session_name: `Session with ${apt.counselor_name || 'Counselor'}`,
                  counselor_name: apt.counselor_name || 'Counselor',
                });
              }
            }
          }
          setVideoLinks(links);
        }
      } catch {}
      setLoading(false);
    })();
  }, [router]);

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <DashboardPageWrapper title="Video Meeting Links" subtitle="Join your counseling sessions">
        <div className="flex items-center justify-center h-96 gap-3" style={{ color: 'var(--color-text-muted)' }}>
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
        </div>
      </DashboardPageWrapper>
    );
  }

  const activeLinks   = videoLinks.filter(l => isActive(l.start_time));
  const upcomingLinks = videoLinks.filter(l => isUpcoming(l.start_time));
  const pastLinks     = videoLinks.filter(l => !isUpcoming(l.start_time) && !isActive(l.start_time));

  return (
    <DashboardPageWrapper title="Video Meeting Links" subtitle="Join your counseling sessions">
      <div className="space-y-6">

        {error && (
          <div className="flex items-start gap-3 rounded-xl p-4 border"
            style={{ background: 'var(--color-danger-surface)', borderColor: 'var(--color-danger)' }}>
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-danger)' }} />
            <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Links',    value: videoLinks.length, color: 'var(--color-text-primary)' },
            { label: 'Active Now',     value: activeLinks.length,   color: 'var(--color-success)' },
            { label: 'Upcoming',       value: upcomingLinks.length, color: 'var(--color-primary)' },
            { label: 'Past Sessions',  value: pastLinks.length,     color: 'var(--color-text-muted)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border p-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
              <p className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
              <p className="text-3xl font-bold" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Active sessions */}
        {activeLinks.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
              <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--color-success)' }} />
              Active Now
            </h2>
            {activeLinks.map(link => (
              <div key={link.video_link_id} className="rounded-2xl border-2 p-5"
                style={{ background: 'var(--color-success-surface)', borderColor: 'var(--color-success)' }}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>{link.session_name}</h3>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      with {link.counselor_name} · {link.platform.replace('_', ' ').toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 flex-wrap">
                  <a href={link.link_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition font-medium hover:opacity-90"
                    style={{ background: 'var(--color-primary)' }}>
                    <Video size={16} /> Join Session <ExternalLink size={14} />
                  </a>
                  {link.password && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                      <Lock size={14} style={{ color: 'var(--color-text-muted)' }} />
                      <code className="font-mono text-sm" style={{ color: 'var(--color-text-primary)' }}>{link.password}</code>
                      <button onClick={() => copy(link.password || '', link.video_link_id)} className="p-1 rounded transition"
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        {copiedId === link.video_link_id
                          ? <Check size={14} style={{ color: 'var(--color-success)' }} />
                          : <Copy size={14} style={{ color: 'var(--color-text-muted)' }} />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upcoming */}
        {upcomingLinks.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Upcoming Sessions</h2>
            <div className="space-y-3">
              {upcomingLinks.map(link => (
                <div key={link.video_link_id} className="rounded-2xl border cursor-pointer transition"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-card)' }}
                  onClick={() => setExpandedId(expandedId === link.video_link_id ? null : link.video_link_id)}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-card-md)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--shadow-card)')}>
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{PLATFORM_ICONS[link.platform] || PLATFORM_ICONS.other}</span>
                        <div>
                          <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{link.session_name}</h3>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                            {link.start_time ? new Date(link.start_time).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : 'Time not specified'}
                          </p>
                          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>with {link.counselor_name}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium"
                            style={platformStyle(link.platform)}>
                            {link.platform.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {expandedId === link.video_link_id && (
                    <div className="px-4 pb-4 pt-2 space-y-3" style={{ borderTop: '1px solid var(--color-border)' }}
                      onClick={e => e.stopPropagation()}>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Meeting Link</p>
                        <div className="flex gap-2 items-center px-3 py-2 rounded-lg"
                          style={{ background: 'var(--color-bg)' }}>
                          <input type="text" value={link.link_url} readOnly
                            className="flex-1 bg-transparent text-sm focus:outline-none"
                            style={{ color: 'var(--color-text-primary)' }} />
                          <button onClick={() => copy(link.link_url, link.video_link_id)} className="p-1.5 rounded transition"
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-border)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            {copiedId === link.video_link_id
                              ? <Check size={14} style={{ color: 'var(--color-success)' }} />
                              : <Copy size={14} style={{ color: 'var(--color-text-muted)' }} />}
                          </button>
                        </div>
                      </div>
                      {link.password && (
                        <div className="space-y-1.5">
                          <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Passcode</p>
                          <div className="flex gap-2 items-center px-3 py-2 rounded-lg" style={{ background: 'var(--color-bg)' }}>
                            <code className="flex-1 font-mono text-sm" style={{ color: 'var(--color-text-primary)' }}>{link.password}</code>
                            <button onClick={() => copy(link.password || '', `${link.video_link_id}-pw`)} className="p-1.5 rounded transition"
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-border)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                              {copiedId === `${link.video_link_id}-pw`
                                ? <Check size={14} style={{ color: 'var(--color-success)' }} />
                                : <Copy size={14} style={{ color: 'var(--color-text-muted)' }} />}
                            </button>
                          </div>
                        </div>
                      )}
                      <a href={link.link_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition font-medium hover:opacity-90"
                        style={{ background: 'var(--color-primary)' }}>
                        <Video size={16} /> Join Meeting <ExternalLink size={14} />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Past */}
        {pastLinks.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Past Sessions</h2>
            <div className="space-y-2">
              {pastLinks.map(link => (
                <div key={link.video_link_id} className="rounded-2xl border p-4 opacity-60"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <h3 className="font-medium line-through" style={{ color: 'var(--color-text-secondary)' }}>{link.session_name}</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {link.start_time ? new Date(link.start_time).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : 'Time not specified'} · {link.platform.toUpperCase()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {videoLinks.length === 0 && (
          <div className="border rounded-2xl p-12 text-center" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
            <Video size={40} className="mx-auto mb-4" style={{ color: 'var(--color-border)' }} />
            <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>No video links available</p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Video links will appear here when your counselor creates them for your sessions
            </p>
          </div>
        )}

        {/* Info tip */}
        <div className="rounded-xl border p-4" style={{ background: 'var(--color-primary-surface)', borderColor: 'var(--color-primary)' }}>
          <p className="text-sm" style={{ color: 'var(--color-primary)' }}>
            <strong>Tip:</strong> Copy the meeting link and passcode to join your sessions. Meeting links will be ready just before your scheduled session time.
          </p>
        </div>

      </div>
    </DashboardPageWrapper>
  );
}
