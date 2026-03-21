'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Send, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '@/utils/api';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getMenuItemsByRole } from '@/utils/navigation';

function FeedbackForm() {
  const [rating, setRating] = useState(5);
  const [category, setCategory] = useState('session');
  const [content, setContent] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState('yes');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (!token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const response = await fetch(api('/api/engagement/submit-feedback'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating,
          category,
          content,
          would_recommend: wouldRecommend,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit feedback');
      }

      setSubmitted(true);
      // Reset form
      setRating(5);
      setCategory('session');
      setContent('');
      setWouldRecommend('yes');

      // Auto-hide success message after 3 seconds
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Your Feedback Matters</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Help us improve our services by sharing your thoughts about your experience
        </p>
      </div>

      {submitted && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-4 flex gap-3">
          <CheckCircle className="text-green-600 dark:text-green-400 flex-shrink-0" size={20} />
          <div>
            <p className="font-semibold text-green-800 dark:text-green-300">Thank you!</p>
            <p className="text-green-700 dark:text-green-400 text-sm">Your feedback has been submitted successfully</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4 flex gap-3">
          <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={20} />
          <div>
            <p className="font-semibold text-red-800 dark:text-red-300">Error</p>
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Feedback Category */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-900">
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-50 mb-3">
            What is your feedback about?
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
          >
            <option value="session">Counseling Session</option>
            <option value="program">Program / Workshop</option>
            <option value="resources">Wellness Resources</option>
            <option value="staff">Staff Experience</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Rating */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-900">
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-50 mb-4">
            How would you rate your experience?
          </label>
          <div className="flex gap-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  size={32}
                  className={
                    star <= rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300 dark:text-gray-600'
                  }
                />
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">You rated: {rating}/5 stars</p>
        </div>

        {/* Recommendation */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-900">
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-50 mb-3">
            Would you recommend our services?
          </label>
          <div className="flex gap-4">
            {[
              { value: 'yes', label: 'Yes, definitely' },
              { value: 'maybe', label: 'Maybe' },
              { value: 'no', label: 'No' },
            ].map((option) => (
              <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="recommend"
                  value={option.value}
                  checked={wouldRecommend === option.value}
                  onChange={(e) => setWouldRecommend(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Feedback Text */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-900">
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-50 mb-3">
            Tell us more (optional)
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share any additional comments or suggestions..."
            maxLength={1000}
            rows={5}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 placeholder-gray-500 dark:placeholder-gray-400"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {content.length}/1000 characters
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || submitted}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded font-semibold transition"
          >
            <Send size={18} />
            {loading ? 'Submitting...' : submitted ? 'Submitted!' : 'Submit Feedback'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function FeedbackPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userData || !token) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const menuItems = getMenuItemsByRole(user.role);

  return (
    <DashboardLayout
      user={user}
      onLogout={handleLogout}
      menuItems={menuItems}
      title="Feedback"
      subtitle="Share your thoughts"
      activeSection="feedback"
    >
      <FeedbackForm />
    </DashboardLayout>
  );
}
