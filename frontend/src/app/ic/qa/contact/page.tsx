"use client";

import { useEffect, useState } from 'react';
import PageShell from '@/components/PageShell';
import { Mail, MessageSquare, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '@/utils/api';

const ICS: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' };
const IC = 'w-full p-3 rounded-xl text-sm outline-none resize-none';

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
    setSending(true); setSendMsg(null);
    try {
      const res = await fetch(api('/api/communications/bulk-send'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients: selected, message }),
      });
      if (res.ok) {
        setSendMsg({ type: 'ok', text: `Message sent to ${selected.length} student${selected.length !== 1 ? 's' : ''}.` });
        setMessage(''); setSelected([]);
      } else {
        const d = await res.json().catch(() => ({}));
        setSendMsg({ type: 'err', text: d.error || 'Failed to send messages.' });
      }
    } catch {
      setSendMsg({ type: 'err', text: 'Network error. Please try again.' });
    } finally { setSending(false); }
  };

  return (
    <PageShell title="Contact Students" subtitle="Send bulk communications to students">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Total Students', value: students.length, color: 'var(--color-text-primary)' },
            { label: 'Selected',       value: selected.length, color: 'var(--color-primary)'     },
            { label: 'Message Length', value: message.length,  color: 'var(--color-text-secondary)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border p-4"
              style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
              <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>

        {sendMsg && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
            style={sendMsg.type === 'ok'
              ? { background: 'var(--color-success-surface)', border: '1px solid var(--color-success)', color: 'var(--color-success)' }
              : { background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)',  color: 'var(--color-danger)'  }}>
            {sendMsg.type === 'ok' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            {sendMsg.text}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-sm"
            style={{ color: 'var(--color-text-muted)' }}>
            <Loader2 size={16} className="animate-spin" /> Loading students…
          </div>
        ) : (
          <div className="space-y-4">
            <div className="pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
              <h3 className="font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>Select Students</h3>
              {students.length === 0 ? (
                <p className="text-sm py-4 text-center" style={{ color: 'var(--color-text-muted)' }}>No students found.</p>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto rounded-xl p-3"
                  style={{ border: '1px solid var(--color-border)' }}>
                  {students.map(student => (
                    <label key={student._id}
                      className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition"
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <input
                        type="checkbox"
                        checked={selected.includes(student._id)}
                        onChange={() => handleToggleStudent(student._id)}
                        className="w-4 h-4 rounded"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {student.name || `${student.first_name} ${student.last_name}`}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{student.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
              <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                <MessageSquare size={18} /> Compose Message
              </h3>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Write your message here..."
                className={IC}
                style={ICS}
                rows={6}
              />
              <button
                onClick={handleSend}
                disabled={!message.trim() || selected.length === 0 || sending}
                className="mt-3 px-4 py-2.5 text-white rounded-lg font-medium flex items-center gap-2 text-sm transition disabled:opacity-50"
                style={{ background: 'var(--color-primary)' }}
                onMouseEnter={e => { if (!sending) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)'; }}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'}>
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
