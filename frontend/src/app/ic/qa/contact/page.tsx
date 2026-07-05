"use client";

import { useEffect, useState } from 'react';
import PageShell from '@/components/PageShell';
import { Mail, MessageSquare, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '@/utils/api';

export default function ContactStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const token = () => localStorage.getItem('token');

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await fetch(api('/api/users?role=student'), {
          headers: { Authorization: `Bearer ${token()}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStudents(Array.isArray(data) ? data : data.users || data.students || []);
        }
      } catch {
        setStudents([]);
      }
      setLoading(false);
    };
    fetchStudents();
  }, []);

  const handleToggleStudent = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const handleSend = async () => {
    if (!message.trim() || selected.length === 0) return;
    setSending(true);
    setSendMsg(null);
    try {
      const res = await fetch(api('/api/communications/bulk-send'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients: selected, message }),
      });
      if (res.ok) {
        setSendMsg({ type: 'ok', text: `Message sent to ${selected.length} student${selected.length !== 1 ? 's' : ''}.` });
        setMessage('');
        setSelected([]);
      } else {
        const d = await res.json().catch(() => ({}));
        setSendMsg({ type: 'err', text: d.error || 'Failed to send messages.' });
      }
    } catch {
      setSendMsg({ type: 'err', text: 'Network error. Please try again.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <PageShell title="Contact Students" subtitle="Send bulk communications to students">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-medium text-gray-600">Total Students</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{students.length}</p>
          </div>
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-medium text-gray-600">Selected</p>
            <p className="text-3xl font-bold text-[#2563eb] mt-1">{selected.length}</p>
          </div>
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-medium text-gray-600">Message Length</p>
            <p className="text-3xl font-bold text-gray-600 mt-1">{message.length}</p>
          </div>
        </div>

        {sendMsg && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border ${
            sendMsg.type === 'ok'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {sendMsg.type === 'ok' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            {sendMsg.text}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-gray-400 text-sm">
            <Loader2 size={16} className="animate-spin" /> Loading students…
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-900 mb-3">Select Students</h3>
              {students.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No students found.</p>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto border border-gray-200 rounded-xl p-3">
                  {students.map(student => (
                    <label key={student._id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.includes(student._id)}
                        onChange={() => handleToggleStudent(student._id)}
                        className="w-4 h-4 rounded border-gray-300 accent-[#2563eb]"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{student.name || `${student.first_name} ${student.last_name}`}</p>
                        <p className="text-xs text-gray-500">{student.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <MessageSquare size={18} /> Compose Message
              </h3>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Write your message here..."
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                rows={6}
              />
              <button
                onClick={handleSend}
                disabled={!message.trim() || selected.length === 0 || sending}
                className="mt-3 px-4 py-2.5 bg-[#2563eb] hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2 text-sm transition"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Send to {selected.length} Student{selected.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
