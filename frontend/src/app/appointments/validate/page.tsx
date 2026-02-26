"use client";

import { useState } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';

export default function ValidateSlotPage() {
  const [counselorId, setCounselorId] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const validate = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/appointments/validate-slot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ counselor_id: counselorId, start, end })
    });
    const data = await res.json();
    setResult(JSON.stringify(data, null, 2));
  };

  return (
    <DashboardPageWrapper title="Validate Slot" subtitle="Check counselor availability">
      <div className="max-w-xl bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Validate Appointment Slot</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm">Counselor ID</label>
            <input value={counselorId} onChange={(e) => setCounselorId(e.target.value)} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm">Start (ISO)</label>
            <input value={start} onChange={(e) => setStart(e.target.value)} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm">End (ISO)</label>
            <input value={end} onChange={(e) => setEnd(e.target.value)} className="w-full border p-2 rounded" />
          </div>
          <div className="mt-3">
            <button onClick={validate} className="bg-blue-600 text-white px-4 py-2 rounded">Validate</button>
          </div>
          {result && <pre className="mt-3 bg-gray-100 p-2 rounded text-sm overflow-auto">{result}</pre>}
        </div>
      </div>
    </DashboardPageWrapper>
  );
}
