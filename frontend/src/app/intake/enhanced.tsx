"use client";

import { useState, useEffect } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { ChevronRight, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { api } from '@/utils/api';

export default function EnhancedIntakePage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [counselingId, setCounselingId] = useState('');
  const [scores, setScores] = useState({ phq9: 0, gad7: 0, pss: 0 });
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
  const [formData, setFormData] = useState({
    purpose: '',
    concerns: '',
    emergency_notes: '',
    phq9_responses: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    gad7_responses: [0, 0, 0, 0, 0, 0, 0],
    pss_responses: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    preferred_platform: 'in-person',
    consent_given: false,
    is_anonymous: false,
    is_emergency: false,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const steps = [
    { number: 1, title: 'About You' },
    { number: 2, title: 'Concerns' },
    { number: 3, title: 'Assessments' },
    { number: 4, title: 'Review & Consent' },
  ];

  const phq9_questions = [
    'Little interest or pleasure in doing things',
    'Feeling down, depressed, or hopeless',
    'Trouble falling or staying asleep, or sleeping too much',
    'Feeling tired or having little energy',
    'Poor appetite or overeating',
    'Feeling bad about yourself or that you are a failure',
    'Trouble concentrating on things',
    'Moving or speaking so slowly or being fidgety or restless',
    'Thoughts that you would be better off dead',
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

  const pss_questions = [
    'Been unable to control things in your life',
    'Felt confident about ability to handle personal problems',
    'Felt things were going your way',
    'Felt difficulties were piling up',
    'Been upset by things that happened unexpectedly',
    'Felt nervous or stressed',
    'Dealt successfully with day-to-day hassles',
    'Felt unable to cope with all you had to do',
    'Been able to control irritations in your life',
    'Felt that you were on top of things',
  ];

  const handleAssessmentChange = (assessmentType: string, index: number, value: number) => {
    const key = `${assessmentType}_responses` as keyof typeof formData;
    const updated = [...(formData[key] as number[])];
    updated[index] = value;
    setFormData({ ...formData, [key]: updated });
    updateScores({ ...formData, [key]: updated });
  };

  const updateScores = (data: any) => {
    const phq9 = (data.phq9_responses as number[]).reduce((a, b) => a + b, 0);
    const gad7 = (data.gad7_responses as number[]).reduce((a, b) => a + b, 0);
    const pss = (data.pss_responses as number[]).reduce((a, b) => a + b, 0);
    setScores({ phq9, gad7, pss });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.purpose) {
          setMessage({ type: 'error', text: 'Please select a concern category' });
          return false;
        }
        return true;
      case 2:
        if (!formData.concerns.trim()) {
          setMessage({ type: 'error', text: 'Please describe your concerns' });
          return false;
        }
        if (isEmergency && !formData.emergency_notes.trim()) {
          setMessage({ type: 'error', text: 'Please provide details about your emergency' });
          return false;
        }
        return true;
      case 3:
        return true; // Assessments are optional but good to have
      case 4:
        if (!formData.consent_given) {
          setMessage({ type: 'error', text: 'You must consent to proceed' });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setMessage(null);
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrev = () => {
    setMessage(null);
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(4)) return;

    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const submitData = {
        ...formData,
        is_anonymous: isAnonymous,
        is_emergency: isEmergency,
      };

      const response = await fetch(api('/api/intake/submit'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (response.ok) {
        setCounselingId(data.counseling_id);
        localStorage.setItem('counseling_id', data.counseling_id);
        setSubmitted(true);
        setMessage({ type: 'success', text: 'Intake submitted successfully!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to submit intake' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error submitting form' });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <DashboardPageWrapper title="Intake Complete" subtitle="Your information has been received">
        <div className="max-w-2xl mx-auto">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-8 text-center">
            <Check className="mx-auto mb-4 text-green-600" size={48} />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">Thank You!</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {isEmergency
                ? 'Your intake has been flagged for priority review. A counselor will contact you within 24 hours.'
                : 'Your intake has been received and reviewed. Check your email for next steps.'}
            </p>

            <div className="bg-white dark:bg-gray-900 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Your Counseling ID</p>
              <p className="text-3xl font-mono font-bold text-blue-600 dark:text-blue-400 tracking-widest mb-4">
                {counselingId}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Keep this ID for all future communications with counseling services
              </p>
            </div>

            {/* Score Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-100 dark:bg-gray-800 rounded p-4">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Depression</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{scores.phq9}</p>
                <p className="text-xs text-gray-500">/27</p>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded p-4">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Anxiety</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{scores.gad7}</p>
                <p className="text-xs text-gray-500">/21</p>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded p-4">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Stress</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{scores.pss}</p>
                <p className="text-xs text-gray-500">/40</p>
              </div>
            </div>

            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="Student Intake Form" subtitle="Help us understand your needs">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6\">
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => (
              <div key={step.number} className="flex items-center flex-1">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium transition ${
                    currentStep >= step.number
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  {currentStep > step.number ? <Check size={16} /> : step.number}
                </div>
                <div className="ml-2">
                  <p className="text-xs font-medium">{step.title}</p>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-px mx-2 transition ${
                      currentStep > step.number ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded text-sm ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 border border-green-200'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Step 1: About You */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Anonymous Toggle */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  {isAnonymous ? <Eye size={18} /> : <EyeOff size={18} />}
                  <span className="flex-1">
                    <span className="font-medium text-gray-900 dark:text-gray-50">Anonymous Intake</span>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {isAnonymous
                        ? 'Your intake is anonymous. You will receive communications using your Counseling ID only.'
                        : 'You can submit this intake anonymously to protect your privacy.'}
                    </p>
                  </span>
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => {
                      setIsAnonymous(e.target.checked);
                      setFormData({ ...formData, is_anonymous: e.target.checked });
                    }}
                    className="w-5 h-5"
                  />
                </label>
              </div>

              {/* Concern Category */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-3">
                  What is your primary concern? *
                </label>
                <select
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a category</option>
                  <option value="depression">Depression & Mood</option>
                  <option value="anxiety">Anxiety & Worry</option>
                  <option value="stress">Stress & Pressure</option>
                  <option value="relationships">Relationships & Social</option>
                  <option value="academic">Academic Concerns</option>
                  <option value="substance">Substance & Addiction</option>
                  <option value="crisis">Crisis/Safety</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Emergency Flag */}
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <AlertCircle size={18} className="text-red-600" />
                  <span className="flex-1">
                    <span className="font-medium text-gray-900 dark:text-gray-50">I need help urgently</span>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {isEmergency
                        ? 'Your intake will be reviewed immediately by a counselor.'
                        : 'Check this if you need priority support or are experiencing a crisis.'}
                    </p>
                  </span>
                  <input
                    type="checkbox"
                    checked={isEmergency}
                    onChange={(e) => {
                      setIsEmergency(e.target.checked);
                      setFormData({ ...formData, is_emergency: e.target.checked });
                    }}
                    className="w-5 h-5"
                  />
                </label>
              </div>

              {/* Preferred Platform */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-3">
                  Preferred Communication Method
                </label>
                <select
                  name="preferred_platform"
                  value={formData.preferred_platform}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="in-person">In-Person</option>
                  <option value="zoom">Zoom Video</option>
                  <option value="flexible">Flexible</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Concerns */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-3">
                  Please describe what you're experiencing *
                </label>
                <textarea
                  name="concerns"
                  value={formData.concerns}
                  onChange={handleInputChange}
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                  placeholder="Share as much detail as you're comfortable with..."
                />
              </div>

              {isEmergency && (
                <div>
                  <label className="block text-sm font-medium text-red-700 dark:text-red-400 mb-3">
                    Tell us about the urgent situation *
                  </label>
                  <textarea
                    name="emergency_notes"
                    value={formData.emergency_notes}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-2 border border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-red-500"
                    placeholder="Describe the crisis or urgent need..."
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 3: Assessments */}
          {currentStep === 3 && (
            <div className="space-y-8">
              {/* PHQ-9 */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-2">Depression Assessment</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Over the last 2 weeks, how often have you been bothered by these problems?
                </p>
                <div className="space-y-4">
                  {phq9_questions.map((question, index) => (
                    <div key={index}>
                      <label className="text-sm font-medium text-gray-900 dark:text-gray-50 mb-2 block">
                        {question}
                      </label>
                      <div className="flex gap-2">
                        {[0, 1, 2, 3].map((value) => (
                          <label key={value} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              checked={formData.phq9_responses[index] === value}
                              onChange={() => handleAssessmentChange('phq9', index, value)}
                              className="w-4 h-4"
                            />
                            <span className="text-xs text-gray-700 dark:text-gray-300">
                              {['Not', 'Several', 'More', 'Nearly'][value]}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-50 mt-4">
                  Score: {scores.phq9}/27
                </p>
              </div>

              {/* GAD-7 */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-2">Anxiety Assessment</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Over the last 2 weeks, how often have you felt...?
                </p>
                <div className="space-y-4">
                  {gad7_questions.map((question, index) => (
                    <div key={index}>
                      <label className="text-sm font-medium text-gray-900 dark:text-gray-50 mb-2 block">
                        {question}
                      </label>
                      <div className="flex gap-2">
                        {[0, 1, 2, 3].map((value) => (
                          <label key={value} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              checked={formData.gad7_responses[index] === value}
                              onChange={() => handleAssessmentChange('gad7', index, value)}
                              className="w-4 h-4"
                            />
                            <span className="text-xs text-gray-700 dark:text-gray-300">
                              {['Not', 'Several', 'More', 'Nearly'][value]}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-50 mt-4">
                  Score: {scores.gad7}/21
                </p>
              </div>

              {/* PSS */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-2">Stress Assessment</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  In the last month, how often have you...?
                </p>
                <div className="space-y-4">
                  {pss_questions.map((question, index) => (
                    <div key={index}>
                      <label className="text-sm font-medium text-gray-900 dark:text-gray-50 mb-2 block">
                        {question}
                      </label>
                      <div className="flex gap-2">
                        {[0, 1, 2, 3, 4].map((value) => (
                          <label key={value} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              checked={formData.pss_responses[index] === value}
                              onChange={() => handleAssessmentChange('pss', index, value)}
                              className="w-4 h-4"
                            />
                            <span className="text-xs text-gray-700 dark:text-gray-300">
                              {['Never', 'Almost', 'Sometimes', 'Fairly', 'Very'][value]}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-50 mt-4">
                  Score: {scores.pss}/40
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Review & Consent */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-gray-900 dark:text-gray-50 mb-4">Review Your Information</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Status:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-50">
                      {isAnonymous ? 'Anonymous' : 'Identified'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Priority:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-50">
                      {isEmergency ? '🚨 Urgent' : 'Standard'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Concern:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-50">{formData.purpose}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Method:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-50">{formData.preferred_platform}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Depression Score:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-50">{scores.phq9}/27</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Anxiety Score:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-50">{scores.gad7}/21</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Stress Score:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-50">{scores.pss}/40</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="consent_given"
                    checked={formData.consent_given}
                    onChange={handleInputChange}
                    className="w-5 h-5 mt-1"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium block mb-1">I consent to counseling services</span>
                    I understand that my information will be treated confidentially and only shared with authorized CPS staff as needed for my care. I consent to electronic communication about my intake and appointments. *
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                ← Back
              </button>
            )}
            {currentStep < 4 && (
              <button
                type="button"
                onClick={handleNext}
                className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition"
              >
                Next <ChevronRight size={16} />
              </button>
            )}
            {currentStep === 4 && (
              <button
                type="submit"
                disabled={loading || !formData.consent_given}
                className="ml-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Submitting...' : 'Submit Intake'}
              </button>
            )}
          </div>
        </form>
      </div>
    </DashboardPageWrapper>
  );
}
