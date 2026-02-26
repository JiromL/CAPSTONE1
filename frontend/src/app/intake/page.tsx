"use client";

import { useState, useEffect } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { ChevronRight, Check } from 'lucide-react';

export default function IntakePage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [counselingId, setCounselingId] = useState('');
  const [existingCounselingId, setExistingCounselingId] = useState<string | null>(null);
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

  // Load existing counseling ID from localStorage
  useEffect(() => {
    const savedId = localStorage.getItem('counseling_id');
    if (savedId) {
      setExistingCounselingId(savedId);
    }
  }, []);

  const steps = [
    { number: 1, title: 'Purpose & Counselor' },
    { number: 2, title: 'Availability' },
    { number: 3, title: 'Concerns & Assessment' },
    { number: 4, title: 'Review & Consent' },
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

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.purpose) {
          setMessage({ type: 'error', text: 'Please select a purpose' });
          return false;
        }
        if (formData.purpose === 'other' && !formData.purpose_other) {
          setMessage({ type: 'error', text: 'Please specify the purpose' });
          return false;
        }
        return true;
      case 2:
        if (!formData.preferred_date || !formData.preferred_time || !formData.platform) {
          setMessage({ type: 'error', text: 'Please fill in all availability fields' });
          return false;
        }
        return true;
      case 3:
        if (!formData.concerns) {
          setMessage({ type: 'error', text: 'Please describe your concerns' });
          return false;
        }
        return true;
      case 4:
        if (!formData.consent) {
          setMessage({ type: 'error', text: 'Please accept the consent to continue' });
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
        // Save counseling ID to localStorage
        localStorage.setItem('counseling_id', data.counseling_id);
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
    <DashboardPageWrapper title="Student Intake" subtitle="Complete your intake form">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
        {!submitted ? (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Student Intake Form</h1>

            {/* Display existing counseling ID at the top */}
            {existingCounselingId && (
              <div className="mb-8 border border-green-300 rounded-lg p-6 bg-green-50">
                <p className="text-sm text-green-700 font-medium mb-2">Your Counseling ID</p>
                <p className="text-2xl font-bold text-green-900 font-mono tracking-wider">{existingCounselingId}</p>
                <p className="text-xs text-green-700 mt-2">You can use this to reference your previous intake submission</p>
              </div>
            )}

            {/* Stepper */}
            <div className="mb-12">
              <div className="flex items-center justify-between">
                {steps.map((step, idx) => (
                  <div key={step.number} className="flex items-center flex-1">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${
                        currentStep >= step.number
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {currentStep > step.number ? <Check size={20} /> : step.number}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{step.title}</p>
                    </div>
                    {idx < steps.length - 1 && (
                      <div
                        className={`flex-1 h-1 mx-3 ${
                          currentStep > step.number ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {message && (
              <div
                className={`mb-6 p-4 rounded-md ${
                  message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}
              >
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Step 1: Purpose & Counselor */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      What is the purpose of your visit? *
                    </label>
                    <select
                      name="purpose"
                      value={formData.purpose}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a purpose</option>
                      <option value="counseling">Initial Counseling</option>
                      <option value="follow_up">Follow-up Session</option>
                      <option value="intake_interview">Intake Interview</option>
                      <option value="other">Other (please specify)</option>
                    </select>
                  </div>

                  {formData.purpose === 'other' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Please specify the purpose *
                      </label>
                      <input
                        type="text"
                        name="purpose_other"
                        value={formData.purpose_other}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="Describe the purpose of your visit..."
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Preferred Counselor (optional)
                    </label>
                    <input
                      type="text"
                      name="counselor"
                      value={formData.counselor}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter counselor name if you have a preference..."
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Availability */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Preferred Date *
                      </label>
                      <input
                        type="date"
                        name="preferred_date"
                        value={formData.preferred_date}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Preferred Time *
                      </label>
                      <input
                        type="time"
                        name="preferred_time"
                        value={formData.preferred_time}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Preferred Platform *
                    </label>
                    <select
                      name="platform"
                      value={formData.platform}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a platform</option>
                      <option value="face_to_face">Face to Face</option>
                      <option value="zoom">Zoom</option>
                      <option value="google_meet">Google Meet</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Step 3: Concerns & Assessment */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      What concerns, needs, or problems would you like to address? *
                    </label>
                    <textarea
                      name="concerns"
                      value={formData.concerns}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="Please describe the concerns you'd like to discuss..."
                    />
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Anxiety Assessment (GAD-7)</h3>
                    <p className="text-sm text-gray-600 mb-6">
                      Over the last 2 weeks, how often have you been bothered by the following?
                    </p>
                    <div className="space-y-6">
                      {gad7_questions.map((question, index) => (
                        <div key={index}>
                          <label className="block text-sm font-medium text-gray-900 mb-3">
                            {index + 1}. {question}
                          </label>
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
                </div>
              )}

              {/* Step 4: Review & Consent */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                    <h3 className="font-bold text-gray-900">Review Your Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Purpose</p>
                        <p className="font-medium text-gray-900">
                          {formData.purpose === 'other' ? formData.purpose_other : formData.purpose}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Preferred Counselor</p>
                        <p className="font-medium text-gray-900">{formData.counselor || 'Auto-assigned'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Preferred Date & Time</p>
                        <p className="font-medium text-gray-900">
                          {formData.preferred_date} at {formData.preferred_time}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Platform</p>
                        <p className="font-medium text-gray-900">{formData.platform}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-600">Concerns</p>
                        <p className="font-medium text-gray-900">{formData.concerns}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-600">GAD-7 Score</p>
                        <p className="font-medium text-gray-900">{formData.gad7_responses.reduce((a, b) => a + b, 0)} / 21</p>
                      </div>
                    </div>
                  </div>

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
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-4 mt-8">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50"
                  >
                    ← Back
                  </button>
                )}
                {currentStep < 4 && (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="ml-auto px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 flex items-center gap-2"
                  >
                    Next <ChevronRight size={18} />
                  </button>
                )}
                {currentStep === 4 && (
                  <button
                    type="submit"
                    disabled={loading}
                    className="ml-auto px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {loading ? 'Submitting...' : 'Submit Intake Form'}
                  </button>
                )}
              </div>
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
                <p className="text-gray-600 text-xs mt-4 max-w-sm">
                  Please save this ID for your records. You'll use it for all future counseling communications.
                </p>
              </div>
              <p className="text-gray-600 mt-8">A confirmation email with your counseling ID has been sent to your email address.</p>
            </div>
            <button
              onClick={() => {
                setSubmitted(false);
                setCounselingId('');
                setCurrentStep(1);
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
