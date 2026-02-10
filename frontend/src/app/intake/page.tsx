'use client';

import { useState } from 'react';

export default function IntakePage() {
  const [formData, setFormData] = useState({
    email: '',
    presenting_concerns: '',
    medical_conditions: '',
    current_medications: '',
    substance_use: '',
    family_mental_health_history: '',
    phq9_responses: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    gad7_responses: [0, 0, 0, 0, 0, 0, 0],
    sleep_patterns: '',
    support_systems: '',
    previous_counseling: false,
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const phq9_questions = [
    'Little interest or pleasure in doing things',
    'Feeling down, depressed, or hopeless',
    'Trouble falling or staying asleep, or sleeping too much',
    'Feeling tired or having little energy',
    'Poor appetite or overeating',
    'Feeling bad about yourself - or that you are a failure or have let your family down',
    'Trouble concentrating on things, such as reading the newspaper or watching television',
    'Moving or speaking so slowly that other people could have noticed? Or the opposite - being so fidgety or restless that you have been moving around a lot more than usual',
    'Thoughts that you would be better off dead or of hurting yourself in some way',
  ];

  const gad7_questions = [
    'Feeling nervous, anxious or on edge',
    'Not being able to stop or control worrying',
    'Worrying too much about different things',
    'Trouble relaxing',
    'Being so restless that it is hard to sit still',
    'Becoming easily annoyed or irritable',
    'Feeling afraid as if something awful might happen',
  ];

  const handle_phq9_change = (index: number, value: number) => {
    const updated = [...formData.phq9_responses];
    updated[index] = value;
    setFormData({ ...formData, phq9_responses: updated });
  };

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
        setMessage({ type: 'success', text: 'Intake form submitted successfully!' });
        setFormData({
          email: '',
          presenting_concerns: '',
          medical_conditions: '',
          current_medications: '',
          substance_use: '',
          family_mental_health_history: '',
          phq9_responses: [0, 0, 0, 0, 0, 0, 0, 0, 0],
          gad7_responses: [0, 0, 0, 0, 0, 0, 0],
          sleep_patterns: '',
          support_systems: '',
          previous_counseling: false,
          notes: '',
        });
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
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Intake Questionnaire</h1>
        <p className="text-gray-600 mb-8">Please answer the following questions to help us provide you with the best support.</p>

        {message && (
          <div
            className={`mb-6 p-4 rounded-md ${
              message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Email Address *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="your.email@university.edu"
            />
          </div>

          {/* Presenting Concerns */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              What brings you in today? (Presenting Concerns) *
            </label>
            <textarea
              name="presenting_concerns"
              value={formData.presenting_concerns}
              onChange={handleInputChange}
              required
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe what brought you to counseling..."
            />
          </div>

          {/* Medical & Medications */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Medical Conditions
              </label>
              <textarea
                name="medical_conditions"
                value={formData.medical_conditions}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Any relevant medical conditions..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Current Medications
              </label>
              <textarea
                name="current_medications"
                value={formData.current_medications}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="List any medications you're taking..."
              />
            </div>
          </div>

          {/* Mental Health History */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Family Mental Health History
              </label>
              <textarea
                name="family_mental_health_history"
                value={formData.family_mental_health_history}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Any family history of mental health conditions..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Substance Use
              </label>
              <textarea
                name="substance_use"
                value={formData.substance_use}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Alcohol, tobacco, or other substance use..."
              />
            </div>
          </div>

          {/* Sleep & Support */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Sleep Patterns
              </label>
              <textarea
                name="sleep_patterns"
                value={formData.sleep_patterns}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe your typical sleep patterns..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Support Systems
              </label>
              <textarea
                name="support_systems"
                value={formData.support_systems}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Who supports you? (Family, friends, etc.)..."
              />
            </div>
          </div>

          {/* Previous Counseling */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="previous_counseling"
                checked={formData.previous_counseling}
                onChange={handleInputChange}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-2 focus:ring-blue-500"
              />
              <span className="ml-3 text-sm font-medium text-gray-900">
                I have received counseling or mental health treatment before
              </span>
            </label>
          </div>

          {/* PHQ-9 Depression Screening */}
          <div className="border-t pt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Depression Screening (PHQ-9)</h2>
            <p className="text-sm text-gray-600 mb-4">
              Over the last 2 weeks, how often have you been bothered by the following problems?
            </p>
            <div className="space-y-4">
              {phq9_questions.map((question, index) => (
                <div key={index}>
                  <label className="block text-sm font-medium text-gray-900 mb-2">{question}</label>
                  <select
                    value={formData.phq9_responses[index]}
                    onChange={(e) => handle_phq9_change(index, parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={0}>Not at all (0)</option>
                    <option value={1}>Several days (1)</option>
                    <option value={2}>More than half the days (2)</option>
                    <option value={3}>Nearly every day (3)</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* GAD-7 Anxiety Screening */}
          <div className="border-t pt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Anxiety Screening (GAD-7)</h2>
            <p className="text-sm text-gray-600 mb-4">
              Over the last 2 weeks, how often have you been bothered by the following problems?
            </p>
            <div className="space-y-4">
              {gad7_questions.map((question, index) => (
                <div key={index}>
                  <label className="block text-sm font-medium text-gray-900 mb-2">{question}</label>
                  <select
                    value={formData.gad7_responses[index]}
                    onChange={(e) => handle_gad7_change(index, parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={0}>Not at all (0)</option>
                    <option value={1}>Several days (1)</option>
                    <option value={2}>More than half the days (2)</option>
                    <option value={3}>Nearly every day (3)</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Additional Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Anything else you'd like to tell us..."
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {loading ? 'Submitting...' : 'Submit Intake Form'}
          </button>
        </form>
      </div>
    </div>
  );
}
