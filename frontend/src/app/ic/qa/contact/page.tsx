"use client";

import { useEffect, useState } from 'react';
import PageShell from '@/components/PageShell';
import { Mail, MessageSquare, Send } from 'lucide-react';

export default function ContactStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await fetch('/api/users?role=student');
        if (res.ok) {
          const data = await res.json();
          setStudents(Array.isArray(data) ? data : data.students || []);
        }
      } catch {
        setStudents([]);
      }
      setLoading(false);
    };
    fetchStudents();
  }, []);

  const handleToggleStudent = (id: string) => {
    setSelected((prev: string[]) => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    if (!message.trim() || selected.length === 0) return;
    try {
      await fetch('/api/communications/bulk-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients: selected, message })
      });
      setMessage('');
      setSelected([]);
      alert('Messages sent successfully');
    } catch {
      alert('Error sending messages');
    }
  };

  return (
    <PageShell title="Contact Students" subtitle="Send bulk communications to students">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700">Total Students</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{students.length}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700">Selected</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{selected.length}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700">Message Length</p>
            <p className="text-3xl font-bold text-gray-600 mt-2">{message.length}</p>
          </div>
        </div>

        {loading ? (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        ) : (
          <div className="space-y-4">
            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-900 mb-3">Select Students</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto border rounded p-3">
                {students.map(student => (
                  <label key={student._id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.includes(student._id)}
                      onChange={() => handleToggleStudent(student._id)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{student.name}</p>
                      <p className="text-xs text-gray-600">{student.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <MessageSquare size={18} /> Compose Message
              </h3>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your message here..."
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={6}
              />
              <button
                onClick={handleSend}
                disabled={!message.trim() || selected.length === 0}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                <Send size={16} /> Send to {selected.length} Student{selected.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
