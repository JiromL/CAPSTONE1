import React, { useState, useEffect } from 'react';
import { api } from '@/utils/api';

export default function ManualNotifyForm() {
  const [username, setUsername] = useState('');
  const [loadingNotify, setLoadingNotify] = useState(false);
  const [notifyResult, setNotifyResult] = useState<string | null>(null);

  const [history, setHistory] = useState<Array<{ date: string; perma_label: string }>>([]);
  const [risk, setRisk] = useState<string>('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadHistory = async () => {
    if (!username) return;
    setLoadingHistory(true);
    setHistoryError(null);
    const url = api(`/api/v1/dashboard/user_perma_history/${encodeURIComponent(username)}?offset=0&limit=100`);
    console.log('fetching history from', url);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // try to parse JSON, but if content-type is not JSON return text
      let data: any;
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(`Expected JSON but got: ${text}`);
      }

      if (res.ok) {
        setHistory(data || []);
        // Extract latest perma label for risk display
        const latestLabel = data && data.length > 0 ? data[0].perma_label : '';
        setRisk(latestLabel);
      } else {
        setHistory([]);
        setRisk('');
        setHistoryError(data.error || 'Failed to load history');
      }
    } catch (err: any) {
      console.error('fetch history error', err);
      setHistoryError(err.message || 'Network error');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleNotify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingNotify(true);
    setNotifyResult(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(api(`/api/high-risk/user/${encodeURIComponent(username)}/notify`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setNotifyResult('success');
      } else {
        console.error('manual notify failed', data);
        setNotifyResult('error');
      }
    } catch (err) {
      console.error(err);
      setNotifyResult('error');
    } finally {
      setLoadingNotify(false);
    }
  };

  // polling to refresh history every 30 seconds
  useEffect(() => {
    if (!username) return;
    const id = setInterval(() => {
      loadHistory();
    }, 30000);
    return () => clearInterval(id);
  }, [username]);

  return (
    <div className="max-w-md">
      <form onSubmit={handleNotify} className="space-y-2">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border-b border-gray-300 pb-1 text-black"
          placeholder="Student username (e.g. jsmith)"
          required
        />
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            onClick={loadHistory}
            disabled={loadingHistory || !username}
            className="text-blue-600 hover:underline"
          >
            {loadingHistory ? 'Loading…' : 'Load'}
          </button>
          <button
            type="submit"
            disabled={loadingNotify || !username}
            className="text-yellow-600 hover:underline"
          >
            {loadingNotify ? 'Sending…' : 'Notify'}
          </button>
        </div>
      </form>

      {historyError && <p className="text-red-600 text-xs mt-1">{historyError}</p>}
      {risk && <p className="text-xs mt-1">Risk: {risk}</p>}
      {history.length > 0 && (
        <ul className="text-xs mt-2 list-disc ml-4">
          {history.map((h, idx) => (
            <li key={idx}>
              {new Date(h.date).toLocaleDateString()}: {h.perma_label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
