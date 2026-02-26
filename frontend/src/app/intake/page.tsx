"use client";

import { useState } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';

export default function IntakePage() {
  const [submitted, setSubmitted] = useState(false);
  const [counselingId, setCounselingId] = useState('');
  const [formData, setFormData] = useState({
    purpose: '',
    purpose_other: '',
    concerns: '',
    preferred_date: '',
    preferred_time: '',
    platform: '',
    counselor: '',
    gad7_responses: [0, 0, 0, 0, 0, 0, 0],
    consent: false,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const gad7_questions = [
    'Feeling nervous, anxious or on edge',
    'Not being able to stop or control worrying',
    'Worrying too much about different things',
    'Trouble relaxing',
    'Being so restless that it is hard to sit still',
    'Becoming easily annoyed or irritable',
    'Feeling afraid as if something awful might happen',
  ];

  const handle_gad7_change = (index: number, value: number) => {
    const updated = [...formData.gad7_responses];
    updated[index] = value;
    setFormData({ ...formData, gad7_responses: updated });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Validate required fields
    if (!formData.purpose || !formData.concerns || !formData.preferred_date || !formData.preferred_time || !formData.platform || !formData.consent) {
      setMessage({ type: 'error', text: 'Please fill in all required fields and accept the consent.' });
      setLoading(false);
      return;
    }

    if (formData.purpose === 'other' && !formData.purpose_other) {
      setMessage({ type: 'error', text: 'Please specify the purpose when selecting "Other".' });
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/intake/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setCounselingId(data.counseling_id);
        setSubmitted(true);
        setMessage({ type: 'success', text: 'Intake form submitted successfully!' });
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to submit intake form' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error submitting form. Make sure backend is running.' });
    } finally {
      setLoading(false);
    }
  };


  return (
    <DashboardPageWrapper title="Student Intake" subtitle="Intake form for counseling services">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
        {!submitted ? (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Intake Form</h1>
            <p className="text-gray-600 mb-8">Please complete this brief intake form to help us serve you better. Your responses are confidential.</p>

            {message && (
              <div
                className={`mb-6 p-4 rounded-md ${
                  message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}
              >
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Purpose */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">What is the purpose of your visit? *</label>
                <select
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a purpose</option>
                  <option value="counseling">Initial Counseling</option>
                  <option value="follow_up">Follow-up Session</option>
                  <option value="intake_interview">Intake Interview</option>
                  <option value="other">Other (please specify)</option>
                </select>
              </div>

              {/* Purpose Other */}
              {formData.purpose === 'other' && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Please specify the purpose *</label>
                  <input
                    type="text"
                    name="purpose_other"
                    value={formData.purpose_other}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe the purpose of your visit..."
                    required={formData.purpose === 'other'}
                  />
                </div>
              )}

              {/* Concerns */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">What concerns, needs, or problems would you like to address? *</label>
                <textarea
                  name="concerns"
                  value={formData.concerns}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Please describe the concerns you'd like to discuss..."
                />
              </div>

              {/* Preferred Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Preferred Date *</label>
                  <input
                    type="date"
                    name="preferred_date"
                    value={formData.preferred_date}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Preferred Time *</label>
                  <input
                    type="time"
                    name="preferred_time"
                    value={formData.preferred_time}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Platform */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Preferred Platform *</label>
                <select
                  name="platform"
                  value={formData.platform}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a platform</option>
                  <option value="face_to_face">Face to Face</option>
                  <option value="zoom">Zoom</option>
                  <option value="google_meet">Google Meet</option>
                </select>
              </div>

              {/* Counselor */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Preferred Counselor (optional)</label>
                <input
                  type="text"
                  name="counselor"
                  value={formData.counselor}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter counselor name if you have a specific preference..."
                />
              </div>

              {/* GAD-7 */}
              <div className="border-t pt-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Anxiety Assessment (GAD-7)</h2>
                <p className="text-sm text-gray-600 mb-6">Over the last 2 weeks, how often have you been bothered by the following?</p>
                <div className="space-y-6">
                  {gad7_questions.map((question, index) => (
                    <div key={index}>
                      <label className="block text-sm font-medium text-gray-900 mb-3">{index + 1}. {question}</label>
                      <div className="flex gap-4">
                        {[0, 1, 2, 3].map((value) => (
                          <label key={value} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`gad7_${index}`}
                              value={value}
                              checked={formData.gad7_responses[index] === value}
                              onChange={() => handle_gad7_change(index, value)}
                              className="w-4 h-4"
                            />
                            <span className="text-sm text-gray-700">
                              {value === 0 && 'Not at all'}
                              {value === 1 && 'Several days'}
                              {value === 2 && 'More than half'}
                              {value === 3 && 'Nearly every day'}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Consent */}
              <div className="border-t pt-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="consent"
                    checked={formData.consent}
                    onChange={handleInputChange}
                    className="w-5 h-5 mt-1"
                  />
                  <span className="text-sm text-gray-700">
                    I consent to participate in counseling services and understand that my information will be kept confidential in accordance with applicable privacy laws. *
                  </span>
                </label>
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'Submitting...' : 'Submit Intake Form'}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="bg-green-50 rounded-lg p-8 mb-6">
              <h1 className="text-3xl font-bold text-green-900 mb-4">Thank You!</h1>
              <p className="text-green-700 mb-6">Your intake form has been submitted successfully.</p>
              <div className="bg-white rounded-lg p-6 inline-block">
                <p className="text-gray-600 text-sm mb-2">Your Counseling ID</p>
                <p className="text-3xl font-bold text-blue-600 font-mono">{counselingId}</p>
                <p className="text-gray-600 text-xs mt-4 max-w-sm">Please save this ID for your records. You'll use it for all future counseling communications.</p>
              </div>
              <p className="text-gray-600 mt-8">A confirmation email with your counseling ID has been sent to your email address.</p>
            </div>
            <button
              onClick={() => {
                setSubmitted(false);
                setCounselingId('');
                setFormData({
                  purpose: '',
                  purpose_other: '',
                  concerns: '',
                  preferred_date: '',
                  preferred_time: '',
                  platform: '',
                  counselor: '',
                  gad7_responses: [0, 0, 0, 0, 0, 0, 0],
                  consent: false,
                });
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700"
            >
              Submit Another Form
            </button>
          </div>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
