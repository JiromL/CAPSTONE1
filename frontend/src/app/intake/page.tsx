"use client";

import { useState, useEffect } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { ChevronRight, Check, Eye, EyeOff } from 'lucide-react';
import { api } from '@/utils/api';

export default function IntakePage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [counselingId, setCounselingId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [estimatedDays, setEstimatedDays] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedAssessments, setSelectedAssessments] = useState<string[]>([]);
  const [currentAssessmentIndex, setCurrentAssessmentIndex] = useState(0);
  
  const [formData, setFormData] = useState({
    purpose: '',
    purpose_other: '',
    concerns: '',
    emergency_notes: '',
    phq9_responses: [] as number[],
    gad7_responses: [] as number[],
    pss_responses: [] as number[],
    acad_responses: [] as number[],
    career_responses: [] as number[],
    social_responses: [] as number[],
    preferred_platform: 'in-person',
    consent_given: false,
    is_anonymous: false,
    is_emergency: false,
  });

  const [scores, setScores] = useState({ phq9: 0, gad7: 0, pss: 0, acad: 0, career: 0, social: 0 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const acad_questions = [
    'Difficulty concentrating on coursework',
    'Feeling overwhelmed by academic workload',
    'Struggling with time management and deadlines',
    'Difficulty staying motivated in classes',
    'Concern about grades or academic performance',
    'Trouble participating in class discussions',
    'Difficulty completing assignments on time',
    'Feeling disconnected from your major or field of study',
  ];

  const career_questions = [
    'Uncertain about your career direction',
    'Concerned about job market readiness',
    'Difficulty identifying your strengths and interests',
    'Worried about finding internship or job opportunities',
    'Unsure about skills needed for desired career',
    'Concerned about work-life balance in chosen field',
    'Need guidance on career planning and goals',
    'Worried about competition in your field',
  ];

  const social_questions = [
    'Difficulty making or maintaining friendships',
    'Feeling lonely or isolated',
    'Trouble in romantic relationships',
    'Difficulty communicating with others',
    'Conflict with family members',
    'Struggling to fit in or belong',
    'Anxiety in social situations',
    'Difficulty setting boundaries in relationships',
  ];

  const assessmentInfo = {
    phq9: {
      name: 'Depression Screening',
      description: 'Over the last 2 weeks, how often have you been bothered by these problems?',
      questions: phq9_questions,
      maxScore: 27
    },
    gad7: {
      name: 'Anxiety Screening',
      description: 'Over the last 2 weeks, how often have you felt...?',
      questions: gad7_questions,
      maxScore: 21
    },
    pss: {
      name: 'Stress Assessment',
      description: 'In the last month, how often have you...?',
      questions: pss_questions,
      maxScore: 40
    },
    acad: {
      name: 'Academic Stress Assessment',
      description: 'How often do you experience these academic-related concerns?',
      questions: acad_questions,
      maxScore: 32
    },
    career: {
      name: 'Career Readiness Assessment',
      description: 'How often do you feel these career-related concerns?',
      questions: career_questions,
      maxScore: 32
    },
    social: {
      name: 'Social Functioning Assessment',
      description: 'How often do you experience these social-related concerns?',
      questions: social_questions,
      maxScore: 32
    }
  };

  // Mapping of concerns to available assessments
  const concernAssessmentMapping: Record<string, string[]> = {
    personal: ['phq9', 'gad7', 'pss'],
    academic: ['acad', 'phq9', 'gad7'], // Academic focus with optional mental health
    career: ['career', 'phq9'],         // Career focus with optional anxiety
    social: ['social', 'gad7'],         // Social focus with optional anxiety
    other: ['phq9', 'gad7', 'pss', 'acad', 'career', 'social'] // All available
  };

  const getAvailableAssessments = (): string[] => {
    const concern = formData.purpose || 'personal';
    return concernAssessmentMapping[concern] || [];
  };

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
    const acad = (data.acad_responses as number[]).reduce((a, b) => a + b, 0);
    const career = (data.career_responses as number[]).reduce((a, b) => a + b, 0);
    const social = (data.social_responses as number[]).reduce((a, b) => a + b, 0);
    setScores({ phq9, gad7, pss, acad, career, social });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const validateStep = (step: number): boolean => {
    setMessage(null);
    switch (step) {
      case 1:
        if (!formData.purpose) {
          setMessage({ type: 'error', text: 'Please select a concern category' });
          return false;
        }
        if (formData.purpose === 'other' && !formData.purpose_other.trim()) {
          setMessage({ type: 'error', text: 'Please describe your other concern' });
          return false;
        }
        return true;
      case 2:
        if (!formData.concerns.trim()) {
          setMessage({ type: 'error', text: 'Please describe your concerns' });
          return false;
        }
        if (formData.is_emergency && !formData.emergency_notes.trim()) {
          setMessage({ type: 'error', text: 'Please provide details about your urgent situation' });
          return false;
        }
        return true;
      case 3:
        // Assessment selection - optional
        return true;
      case 4:
        // Taking assessments - optional
        return true;
      case 5:
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
      if (currentStep === 3 && selectedAssessments.length > 0) {
        // If assessments selected, go to assessment taking step
        setCurrentStep(4);
        setCurrentAssessmentIndex(0);
      } else if (currentStep === 4) {
        // In assessment step, move to next assessment or to step 5
        if (currentAssessmentIndex < selectedAssessments.length - 1) {
          setCurrentAssessmentIndex(currentAssessmentIndex + 1);
        } else {
          // All assessments done, move to step 5
          setCurrentStep(5);
        }
      } else if (currentStep < 5) {
        // Skip to next step
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrev = () => {
    setMessage(null);
    if (currentStep === 4) {
      // In assessment step, go back to previous assessment or back to step 3
      if (currentAssessmentIndex > 0) {
        setCurrentAssessmentIndex(currentAssessmentIndex - 1);
      } else {
        setCurrentStep(3);
      }
    } else if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const toggleAssessment = (type: string) => {
    setSelectedAssessments(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleCompleteAssessment = () => {
    if (currentAssessmentIndex < selectedAssessments.length - 1) {
      setCurrentAssessmentIndex(currentAssessmentIndex + 1);
    } else {
      setCurrentStep(5);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(5)) return;

    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('access_token');
      const submitData = {
        ...formData,
        is_anonymous: isAnonymous,
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
        setAppointmentDate(data.appointment_date);
        setEstimatedDays(data.estimated_days);
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
    const apptDate = new Date(appointmentDate).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    return (
      <DashboardPageWrapper title="Intake Submitted" subtitle="Thank you for completing the form">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8">
            <div className="text-center mb-8">
              <Check className="mx-auto mb-4 text-green-600" size={40} />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50 mb-2">Thank You</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Your intake has been received and processed</p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-4 mb-6 border border-gray-200 dark:border-gray-600">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Your Counseling ID</p>
              <p className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400 tracking-wider">
                {counselingId}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Keep this for all future communication
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-4 mb-6">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">Expected Appointment</p>
              <p className="text-lg text-blue-900 dark:text-blue-200 font-medium">{apptDate}</p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">Within {estimatedDays}</p>
            </div>

            {Object.entries(scores).map(([key, value]: [string, number]) => {
              const assessmentKey = key as keyof typeof assessmentInfo;
              if (key === 'phq9' && value === 0 && !formData.phq9_responses.length) return null;
              if (key === 'gad7' && value === 0 && !formData.gad7_responses.length) return null;
              if (key === 'pss' && value === 0 && !formData.pss_responses.length) return null;
              if (key === 'acad' && value === 0 && !formData.acad_responses.length) return null;
              if (key === 'career' && value === 0 && !formData.career_responses.length) return null;
              if (key === 'social' && value === 0 && !formData.social_responses.length) return null;

              const info = assessmentInfo[assessmentKey];
              return (
                <div key={key} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/30 rounded border border-gray-200 dark:border-gray-600 mb-2">
                  <span className="text-sm text-gray-900 dark:text-gray-50">{info.name}</span>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{value}/{info.maxScore}</span>
                </div>
              );
            })}

            <button
              onClick={() => window.location.href = '/'}
              className="w-full mt-8 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="Intake Form" subtitle="Tell us about your needs">
      <div className="max-w-2xl mx-auto">
        {/* Simple Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className={`h-2 flex-1 rounded transition ${
                  currentStep >= step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {currentStep === 4 && selectedAssessments.length > 0 ? (
              <>Step 4: Assessment {currentAssessmentIndex + 1} of {selectedAssessments.length}</>
            ) : (
              <>Step {currentStep} of {selectedAssessments.length > 0 ? 5 : 4}</>
            )}
          </p>
        </div>

        {/* Step 1: About You */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-2">
                What is your primary concern? *
              </label>
              <select
                name="purpose"
                value={formData.purpose}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a concern</option>
                <option value="social">Social Concerns</option>
                <option value="personal">Personal Concerns (Mental Health)</option>
                <option value="academic">Academic Concerns</option>
                <option value="career">Career Concerns</option>
                <option value="other">Other</option>
              </select>
            </div>

            {formData.purpose === 'other' && (
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-2">
                  Please specify *
                </label>
                <input
                  type="text"
                  name="purpose_other"
                  value={formData.purpose_other}
                  onChange={handleInputChange}
                  placeholder="Describe your concern"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-2">
                Preferred Communication Method
              </label>
              <select
                name="preferred_platform"
                value={formData.preferred_platform}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="in-person">In-Person</option>
                <option value="zoom">Zoom Video</option>
                <option value="phone">Phone</option>
                <option value="flexible">Flexible</option>
              </select>
            </div>

            <label className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer">
              {isAnonymous ? (
                <EyeOff size={18} className="text-gray-600 dark:text-gray-400" />
              ) : (
                <Eye size={18} className="text-gray-600 dark:text-gray-400" />
              )}
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => {
                  setIsAnonymous(e.target.checked);
                  setFormData({ ...formData, is_anonymous: e.target.checked });
                }}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-900 dark:text-gray-50">
                {isAnonymous ? 'Anonymous submission' : 'Keep my identity private'}
              </span>
            </label>
          </div>
        )}

        {/* Step 2: Concerns Description */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-2">
                Tell us what you're experiencing *
              </label>
              <textarea
                name="concerns"
                value={formData.concerns}
                onChange={handleInputChange}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 text-sm placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                placeholder="Share what's on your mind..."
              />
            </div>

            <label className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_emergency}
                onChange={(e) => {
                  setFormData({ ...formData, is_emergency: e.target.checked });
                }}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-50">
                This is urgent
              </span>
            </label>

            {formData.is_emergency && (
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-2">
                  Describe the urgent situation *
                </label>
                <textarea
                  name="emergency_notes"
                  value={formData.emergency_notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-orange-300 dark:border-orange-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 text-sm focus:ring-2 focus:ring-orange-500"
                  placeholder="Please provide details..."
                />
              </div>
            )}
          </div>
        )}

        {/* Step 3: Assessment Selection */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Would you like to complete any of these assessments? (Optional)
            </p>

            {getAvailableAssessments().map((type) => {
              const info = assessmentInfo[type as keyof typeof assessmentInfo];
              return (
                <label key={type} className="flex items-start gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                  <input
                    type="checkbox"
                    checked={selectedAssessments.includes(type)}
                    onChange={() => toggleAssessment(type)}
                    className="w-4 h-4 mt-1"
                  />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-50">{info.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{info.description}</p>
                  </div>
                </label>
              );
            })}

            <p className="text-xs text-gray-500 dark:text-gray-400 italic">
              You can skip assessments and proceed to submit your intake.
            </p>
          </div>
        )}

        {/* Step 4: Assessment Taking */}
        {currentStep === 4 && selectedAssessments.length > 0 && (
          <div className="space-y-4">
            {(() => {
              const assessmentType = selectedAssessments[currentAssessmentIndex] as keyof typeof assessmentInfo;
              const info = assessmentInfo[assessmentType];
              const responses = formData[`${assessmentType}_responses` as keyof typeof formData] as number[];
              const score = responses.reduce((a, b) => a + b, 0);

              return (
                <div>
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-50 mb-1">
                      {info.name}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">{info.description}</p>
                    <p className="text-xs text-gray-500">
                      Question {currentAssessmentIndex + 1} of {selectedAssessments.length}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {info.questions.map((question, idx) => (
                      <div key={idx}>
                        <p className="text-sm text-gray-900 dark:text-gray-50 mb-2">{question}</p>
                        <div className="flex gap-2 flex-wrap">
                          {[0, 1, 2, 3].map((value) => (
                            <label key={value} className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                checked={responses[idx] === value}
                                onChange={() => handleAssessmentChange(assessmentType, idx, value)}
                                className="w-4 h-4"
                              />
                              <span className="text-xs text-gray-700 dark:text-gray-300">
                                {['Not at all', 'Several days', 'More than half', 'Nearly every day'][value]}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-4">
                    Progress: {score}/{info.maxScore}
                  </p>
                </div>
              );
            })()}
          </div>
        )}

        {/* Step 5: Review & Consent */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3 text-sm">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Concern</p>
                <p className="text-gray-900 dark:text-gray-50 font-medium">
                  {formData.purpose === 'other' ? formData.purpose_other : formData.purpose}
                </p>
              </div>
              {selectedAssessments.length > 0 && (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Assessments Completed</p>
                  <p className="text-gray-900 dark:text-gray-50 font-medium">
                    {selectedAssessments
                      .map(t => assessmentInfo[t as keyof typeof assessmentInfo].name)
                      .join(', ')}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Communication Method</p>
                <p className="text-gray-900 dark:text-gray-50 font-medium capitalize">
                  {formData.preferred_platform}
                </p>
              </div>
            </div>

            <label className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={formData.consent_given}
                onChange={handleInputChange}
                name="consent_given"
                className="w-4 h-4 mt-1"
              />
              <span className="text-sm text-gray-900 dark:text-gray-50">
                I consent to submit this intake form and understand that counseling information will be used according to our privacy policy
              </span>
            </label>
          </div>
        )}

        {/* Messages */}
        {message && (
          <div
            className={`mt-4 p-3 rounded-lg text-sm ${
              message.type === 'error'
                ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={handlePrev}
            disabled={currentStep === 1}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-50 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Back
          </button>

          {currentStep === 5 ? (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Submitting...' : 'Submit Intake'}
            </button>
          ) : currentStep === 4 && selectedAssessments.length > 0 ? (
            <button
              onClick={handleNext}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2 transition"
            >
              {currentAssessmentIndex < selectedAssessments.length - 1 
                ? `Next Assessment (${currentAssessmentIndex + 2}/${selectedAssessments.length})`
                : 'Continue to Review'} <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2 transition"
            >
              Next <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </DashboardPageWrapper>
  );
}
