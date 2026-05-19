'use client';

import { useState } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { Star, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '@/utils/api';

const CATEGORIES = [
  { value: 'general',   label: 'General Experience', icon: '🏢', desc: 'Overall impression of CPS services' },
  { value: 'session',   label: 'Counseling Session',  icon: '🗣', desc: 'Feedback on a counseling session' },
  { value: 'program',   label: 'Program / Workshop',  icon: '📋', desc: 'Events, group sessions, or workshops' },
  { value: 'resources', label: 'Wellness Resources',  icon: '📚', desc: 'Materials, guides, online resources' },
  { value: 'staff',     label: 'Staff Experience',    icon: '👤', desc: 'Administrative or support staff' },
  { value: 'other',     label: 'Other',               icon: '💬', desc: 'Something else entirely' },
];

const SESSION_FORMATS = [
  { value: 'walk_in',    label: 'Walk-in',    icon: '🚶' },
  { value: 'in_person',  label: 'In-person (booked)', icon: '🏠' },
  { value: 'online',     label: 'Online (Google Meet / Zoom)', icon: '💻' },
  { value: 'phone',      label: 'Phone call', icon: '📞' },
];

const RECOMMEND_OPTIONS = [
  { value: 'yes',   label: 'Yes, definitely', icon: '👍', active: 'border-green-400  bg-green-50  dark:bg-green-900/20'  },
  { value: 'maybe', label: 'Maybe',           icon: '🤔', active: 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' },
  { value: 'no',    label: 'No',              icon: '👎', active: 'border-red-400    bg-red-50    dark:bg-red-900/20'    },
];

const RATING_LABELS: Record<number, string> = {
  1: 'Very Poor', 2: 'Poor', 3: 'Okay', 4: 'Good', 5: 'Excellent',
};

export default function FeedbackPage() {
  const [rating, setRating]             = useState(0);
  const [hover, setHover]               = useState(0);
  const [category, setCategory]         = useState('');
  const [sessionFormat, setSessionFormat] = useState('');
  const [hadSession, setHadSession]     = useState<boolean | null>(null);
  const [content, setContent]           = useState('');
  const [wouldRecommend, setWouldRecommend] = useState('yes');
  const [loading, setLoading]           = useState(false);
  const [submitted, setSubmitted]       = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const showSessionFormat = category === 'session';
  const displayRating     = hover || rating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) { setError('Please select what your feedback is about'); return; }
    if (!rating)   { setError('Please select a star rating'); return; }
    setLoading(true); setError(null);
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (!token) { setError('Not authenticated'); setLoading(false); return; }
      const r = await fetch(api('/api/engagement/feedback'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          category,
          content,
          would_recommend: wouldRecommend,
          session_format:  showSessionFormat ? sessionFormat || null : null,
          had_session:     hadSession,
        }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Failed to submit'); }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally { setLoading(false); }
  };

  const reset = () => {
    setRating(0); setHover(0); setCategory(''); setSessionFormat('');
    setHadSession(null); setContent(''); setWouldRecommend('yes');
    setSubmitted(false); setError(null);
  };

  if (submitted) {
    return (
      <DashboardPageWrapper title="Feedback" subtitle="Share your thoughts">
        <div className="max-w-md mx-auto flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
            <CheckCircle size={40} className="text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Thank you!</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            Your feedback has been submitted. It helps us improve our services for everyone.
          </p>
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Submit Another
          </button>
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="Feedback" subtitle="Help us improve our services">
      <div className="max-w-xl mx-auto">

        {error && (
          <div className="mb-5 flex gap-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4">
            <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── Category ── */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">What is your feedback about?</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">You can give feedback even if you haven't had a session yet.</p>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => { setCategory(c.value); if (c.value !== 'session') setSessionFormat(''); }}
                  className={`text-left p-3 rounded-xl border-2 transition-all ${
                    category === c.value
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="text-xl block mb-1">{c.icon}</span>
                  <p className={`text-sm font-semibold ${category === c.value ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-900 dark:text-white'}`}>{c.label}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-tight">{c.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* ── Session format (only when Counseling Session selected) ── */}
          {showSessionFormat && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Session format <span className="font-normal text-gray-500 dark:text-gray-400">(optional)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {SESSION_FORMATS.map(f => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setSessionFormat(sessionFormat === f.value ? '' : f.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all ${
                      sessionFormat === f.value
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-600'
                    }`}
                  >
                    <span>{f.icon}</span> {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Rating ── */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-4">How would you rate your experience?</p>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map(s => (
                <button
                  key={s}
                  type="button"
                  onMouseEnter={() => setHover(s)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(s)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    size={36}
                    className={`transition-colors ${
                      s <= displayRating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-200 dark:text-gray-700'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[80px]">
                {displayRating ? RATING_LABELS[displayRating] : 'Select…'}
              </span>
            </div>
          </div>

          {/* ── Would recommend ── */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Would you recommend our services?</p>
            <div className="flex gap-3">
              {RECOMMEND_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setWouldRecommend(opt.value)}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${
                    wouldRecommend === opt.value
                      ? opt.active
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="text-2xl">{opt.icon}</span>
                  <span className={`text-xs font-medium ${wouldRecommend === opt.value ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Comments ── */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <label className="text-sm font-semibold text-gray-900 dark:text-white block mb-3">
              Tell us more <span className="font-normal text-gray-500 dark:text-gray-400">(optional)</span>
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Share any comments, suggestions, or specific experiences…"
              maxLength={1000}
              rows={4}
              className="w-full px-3.5 py-3 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-gray-900 transition resize-none"
            />
            <div className="flex justify-end mt-1.5">
              <span className="text-xs text-gray-400">{content.length}/1000</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {loading ? 'Submitting…' : 'Submit Feedback'}
          </button>
        </form>
      </div>
    </DashboardPageWrapper>
  );
}
