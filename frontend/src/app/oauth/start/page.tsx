"use client";

import { useEffect } from 'react';
import PageShell from '@/components/PageShell';

export default function OAuthStart() {
  useEffect(() => {
    const userRaw = localStorage.getItem('user');
    if (!userRaw) {
      window.location.href = '/login';
      return;
    }
    const user = JSON.parse(userRaw);
    const userId = user.id || user._id || user.user_id || '';
    fetch(`/api/oauth/authorize?state=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.authorize_url) {
          window.location.href = data.authorize_url;
        } else {
          console.error('No authorize_url returned', data);
        }
      })
      .catch((err) => console.error('OAuth start error', err));
  }, []);

  return (
    <PageShell title="Connect Calendar" subtitle="Redirecting to provider...">
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-gray-700">Redirecting to provider for authorization...</div>
      </div>
    </PageShell>
  );
}
