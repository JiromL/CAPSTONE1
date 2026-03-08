'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, BookOpen, CheckCircle, Heart, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/utils/api';
import { DashboardLayout } from '@/components/DashboardLayout';

// Assessment questions - shown ONE AT A TIME - simple, direct format
const ASSESSMENTS = {
  phq9: {
    name: 'Depression Screening',
    questions: [
      'Are you depressed?',
      'Do you have little interest or pleasure in doing things?',
      'Do you have trouble sleeping or sleep too much?',
      'Do you feel tired or have little energy?',
      'Are you struggling with appetite or eating too much?',
      'Do you feel bad about yourself?',
      'Do you have trouble concentrating?',
      'Are you feeling restless or slowed down?',
      'Have you had thoughts of harming yourself?',
    ]
  },
  gad7: {
    name: 'Anxiety Screening',
    questions: [
      'Are you anxious?',
      'Can you stop or control worrying?',
      'Do you worry too much?',
      'Can you relax easily?',
      'Are you restless?',
      'Are you easily annoyed or irritable?',
      'Are you afraid something bad might happen?',
    ]
  },
  pss: {
    name: 'Stress Assessment',
    questions: [
      'Do unexpected events upset you?',
      'Do you feel unable to control things in your life?',
      'Do you feel nervous or stressed?',
      'Are you confident handling your problems?',
      'Do you feel things are going your way?',
      'Do you struggle to cope with responsibilities?',
      'Can you control frustrations in your life?',
      'Do you feel on top of things?',
    ]
  },
  acad: {
    name: 'Academic Stress Screening',
    questions: [
      'Are you struggling with coursework?',
      'Do you have test anxiety?',
      'Do you struggle with time management?',
      'Are you overwhelmed by academic workload?',
      'Do you understand course material?',
      'Are you concerned about your grades?',
      'Do you struggle with procrastination?',
      'Do you have trouble concentrating on studies?',
    ]
  },
  career: {
    name: 'Career Readiness Screening',
    questions: [
      'Are you uncertain about your career?',
      'Are you unsure of your career interests?',
      'Are you anxious about job prospects?',
      'Do you find it hard to make career decisions?',
      'Do you feel pressure about your career?',
      'Do you lack confidence professionally?',
      'Are you concerned about your resume or interviews?',
      'Do you worry about work-life balance?',
    ]
  },
  social: {
    name: 'Social Functioning Screening',
    questions: [
      'Do you feel isolated or lonely?',
      'Do you struggle to make friends?',
      'Do you have difficulty in relationships?',
      'Are you uncomfortable in social situations?',
      'Do you have family conflicts?',
      'Do you feel judged by others?',
      'Do you struggle with assertiveness?',
      'Do you feel disconnected from your community?',
    ]
  }
};

// Concern types and their associated assessments
const CONCERN_TYPES = {
  personal: {
    label: 'Personal/Mental Health',
    assessments: ['phq9', 'gad7', 'pss']
  },
  academic: {
    label: 'Academic Concerns',
    assessments: ['acad', 'phq9', 'gad7']
  },
  career: {
    label: 'Career/Professional',
    assessments: ['career', 'phq9']
  },
  social: {
    label: 'Social/Relationships',
    assessments: ['social', 'gad7']
  },
  other: {
    label: 'Other',
    assessments: ['phq9', 'gad7', 'pss', 'acad', 'career', 'social']
  }
};

const RESPONSE_SCALE = [
  { value: 0, label: 'No' },
  { value: 1, label: 'Somewhat' },
  { value: 2, label: 'Often' },
  { value: 3, label: 'Very Much' }
];

export default function IntakePage() {
  const router = useRouter();
  const [step, setStep] = useState<'concern' | 'screening_selection' | 'urgency' | 'crisis' | 'screening' | 'appointment' | 'complete'>('concern');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Concern selection
  const [selectedConcern, setSelectedConcern] = useState<string | null>(null);
  
  // Screening selection - checkboxes for which assessments to take
  const [selectedScreenings, setSelectedScreenings] = useState<Set<string>>(new Set());
  
  const [isUrgent, setIsUrgent] = useState<boolean | null>(null);
  const [urgencyNotes, setUrgencyNotes] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Assessment tracking
  const [selectedAssessments, setSelectedAssessments] = useState<string[]>([]);
  const [currentAssessmentIdx, setCurrentAssessmentIdx] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [assessmentResponses, setAssessmentResponses] = useState<{[key: string]: number[]}>({});
  const [assessmentScores, setAssessmentScores] = useState<{[key: string]: number}>({});

  // Appointment preferences
  const [autoSuggestedDate, setAutoSuggestedDate] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [communicationMethod, setCommunicationMethod] = useState<'zoom' | 'google_meet' | 'phone' | 'in_person'>('zoom');
  const [counselingId, setCounselingId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const menuItems = [
    { label: 'Dashboard', href: '/dashboard', icon: <BookOpen size={20} /> },
    { label: 'My Tasks', href: '/tasks', icon: <CheckCircle size={20} />, badge: 3 },
    { label: 'Intake Form', href: '/intake', icon: <FileText size={20} /> },
    { label: 'Wellness Resources', href: '/resources', icon: <Heart size={20} /> },
    { label: 'My Profile', href: '/profile', icon: <AlertCircle size={20} /> },
  ];

  // Determine which assessments to run based on selected concern
  const determineAssessments = () => {
    if (!selectedConcern) return [];
    return CONCERN_TYPES[selectedConcern as keyof typeof CONCERN_TYPES]?.assessments || [];
  };

  // Calculate auto-suggested appointment date based on scores
  const calculateAutoSuggestedDate = (scores: {[key: string]: number}) => {
    let highestRiskScore = 0;
    
    // Calculate weighted risk
    if (scores.phq9) highestRiskScore = Math.max(highestRiskScore, scores.phq9 / 27);
    if (scores.gad7) highestRiskScore = Math.max(highestRiskScore, scores.gad7 / 21);

    // Map risk to appointment window
    if (highestRiskScore >= 0.75) return 'same_day'; // Critical
    if (highestRiskScore >= 0.5) return '1_day'; // High - within 1 day
    if (highestRiskScore >= 0.25) return '3_days'; // Moderate - within 3 days
    return 'next_week'; // Low - next week
  };

  // Handle concern selection and move to urgency check
  const handleConcernSelection = () => {
    if (!selectedConcern) {
      alert('Please select a concern');
      return;
    }
    
    // Move directly to urgency check
    setStep('urgency');
  };

  // Handle screening selection and move to screening questions
  const handleScreeningSelection = () => {
    if (selectedScreenings.size === 0) {
      alert('Please select at least one screening');
      return;
    }
    
    const assessments = Array.from(selectedScreenings);
    setSelectedAssessments(assessments);
    
    // Initialize assessment responses
    const initialResponses: {[key: string]: number[]} = {};
    assessments.forEach(assessment => {
      initialResponses[assessment] = new Array(ASSESSMENTS[assessment as keyof typeof ASSESSMENTS].questions.length).fill(-1);
    });
    setAssessmentResponses(initialResponses);
    setStep('screening');
  };
  
  // Toggle screening checkbox
  const toggleScreening = (screening: string) => {
    const newSelected = new Set(selectedScreenings);
    if (newSelected.has(screening)) {
      newSelected.delete(screening);
    } else {
      newSelected.add(screening);
    }
    setSelectedScreenings(newSelected);
  };

  // Step 2: Urgency check - routing decision point
  const handleUrgencyResponse = (isEmergency: boolean) => {
    setIsUrgent(isEmergency);
    if (isEmergency) {
      // If urgent, go straight to crisis resources
      setStep('crisis');
    } else {
      // If not urgent, go to screening selection to pick which screenings
      setSelectedScreenings(new Set());
      setStep('screening_selection');
    }
  };

  // Update current assessment response
  const handleAnswerQuestion = (value: number) => {
    const currentAssessment = selectedAssessments[currentAssessmentIdx];
    const newResponses = { ...assessmentResponses };
    newResponses[currentAssessment][currentQuestionIdx] = value;
    setAssessmentResponses(newResponses);

    // Move to next question
    const currentAssessmentQuestions = ASSESSMENTS[currentAssessment as keyof typeof ASSESSMENTS].questions.length;
    if (currentQuestionIdx < currentAssessmentQuestions - 1) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    } else {
      // Move to next assessment
      if (currentAssessmentIdx < selectedAssessments.length - 1) {
        setCurrentAssessmentIdx(currentAssessmentIdx + 1);
        setCurrentQuestionIdx(0);
      } else {
        // All assessments complete - calculate scores
        calculateScores();
        setStep('appointment');
      }
    }
  };

  // Calculate assessment scores (hidden from student)
  const calculateScores = () => {
    const scores: {[key: string]: number} = {};
    selectedAssessments.forEach(assessment => {
      const responses = assessmentResponses[assessment];
      const score = responses.reduce((sum, val) => sum + (val >= 0 ? val : 0), 0);
      scores[assessment] = score;
    });
    setAssessmentScores(scores);
    
    // Calculate auto-suggested appointment date based on scores
    const suggestedDateWindow = calculateAutoSuggestedDate(scores);
    setAutoSuggestedDate(suggestedDateWindow);
  };

  // Go back to previous question
  const handlePreviousQuestion = () => {
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx(currentQuestionIdx - 1);
    } else if (currentAssessmentIdx > 0) {
      setCurrentAssessmentIdx(currentAssessmentIdx - 1);
      const prevAssessment = selectedAssessments[currentAssessmentIdx - 1];
      const prevAssessmentLen = ASSESSMENTS[prevAssessment as keyof typeof ASSESSMENTS].questions.length;
      setCurrentQuestionIdx(prevAssessmentLen - 1);
    }
  };

  // Submit intake
  const handleSubmitIntake = async () => {
    if (!consentGiven) {
      alert('Please provide consent to proceed');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        purpose: selectedConcern,
        is_emergency: isUrgent,
        emergency_notes: urgencyNotes,
        is_anonymous: isAnonymous,
        consent_given: true,
        preferred_platform: communicationMethod,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
      };

      // Add assessment responses
      selectedAssessments.forEach(assessment => {
        payload[`${assessment}_responses`] = assessmentResponses[assessment];
      });

      const response = await fetch(`${api.base}/intake/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to submit intake');

      const data = await response.json();
      setCounselingId(data.counseling_id);
      setStep('complete');
    } catch (error) {
      alert('Error submitting intake: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // STEP 1: CONCERN SELECTION
  // ============================================
  if (step === 'concern') {
    return (
      <DashboardLayout
        user={user}
        onLogout={handleLogout}
        menuItems={menuItems}
        title="Intake Form"
        subtitle="Campus Counseling Services"
      >
        <div className="max-w-2xl">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50 mb-1">What brings you in today?</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">Select the concern that best describes your situation</p>

            <div className="space-y-2 mb-8">
              {Object.entries(CONCERN_TYPES).map(([key, concern]) => (
                <button
                  key={key}
                  onClick={() => setSelectedConcern(key)}
                  className={`w-full p-3 border text-left transition ${
                    selectedConcern === key
                      ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 border-gray-800 dark:border-gray-200'
                      : 'border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-50 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  {concern.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                disabled={!selectedConcern}
                onClick={handleConcernSelection}
                className="flex-1 px-4 py-2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 rounded font-medium hover:bg-gray-700 dark:hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
      </DashboardLayout>
    );
  }

  // ============================================
  // STEP 1.5: SCREENING SELECTION (Choose which screenings to take)
  // ============================================
  if (step === 'screening_selection') {
    const allowedAssessments = determineAssessments();
    
    const assessmentLabels: {[key: string]: string} = {
      phq9: 'Depression Screening (PHQ-9)',
      gad7: 'Anxiety Screening (GAD-7)',
      pss: 'Stress Assessment (PSS)',
      acad: 'Academic Stress Screening',
      career: 'Career Readiness Screening',
      social: 'Social Functioning Screening'
    };
    
    return (
      <DashboardLayout
        user={user}
        onLogout={handleLogout}
        menuItems={menuItems}
        title="Intake Form"
        subtitle="Campus Counseling Services"
      >
        <div className="max-w-2xl">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50 mb-1">Which screenings would you like to complete?</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">Select all that apply based on your concerns</p>

            <div className="space-y-2 mb-8">
              {allowedAssessments.map((assessment) => (
                <label
                  key={assessment}
                  className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded cursor-pointer hover:border-gray-400 dark:hover:border-gray-500"
                >
                  <input
                    type="checkbox"
                    checked={selectedScreenings.has(assessment)}
                    onChange={() => toggleScreening(assessment)}
                    className="w-4 h-4 mr-3"
                  />
                  <span className="text-gray-900 dark:text-gray-50">
                    {assessmentLabels[assessment] || assessment}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep('concern')}
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded hover:border-gray-400 dark:hover:border-gray-500"
              >
                ← Back
              </button>
              <button
                disabled={selectedScreenings.size === 0}
                onClick={handleScreeningSelection}
                className="flex-1 px-4 py-2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 rounded font-medium hover:bg-gray-700 dark:hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
      </DashboardLayout>
    );
  }

  // ============================================
  // STEP 2: URGENCY CHECK
  // ============================================
  if (step === 'urgency') {
    return (
      <DashboardLayout
        user={user}
        onLogout={handleLogout}
        menuItems={menuItems}
        title="Intake Form"
        subtitle="Campus Counseling Services"
      >
        <div className="max-w-2xl">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50 mb-8">Is this urgent?</h2>

            <div className="space-y-2 mb-8">
              <button
                onClick={() => setIsUrgent(true)}
                className={`w-full p-3 border rounded text-left ${
                  isUrgent === true
                    ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 border-gray-800 dark:border-gray-200'
                    : 'border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-50 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                Yes, I need immediate support
              </button>

              <button
                onClick={() => setIsUrgent(false)}
                className={`w-full p-3 border rounded text-left ${
                  isUrgent === false
                    ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 border-gray-800 dark:border-gray-200'
                    : 'border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-50 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                No, I can wait for an appointment
              </button>
            </div>

            {isUrgent && (
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-2">
                  Describe what's happening (optional)
                </label>
                <textarea
                  value={urgencyNotes}
                  onChange={(e) => setUrgencyNotes(e.target.value)}
                  className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded dark:bg-gray-900 text-gray-900 dark:text-gray-50 text-sm"
                  rows={3}
                  placeholder="What is happening right now?"
                />
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setStep('concern')}
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded hover:border-gray-400 dark:hover:border-gray-500"
              >
                ← Back
              </button>
              <button
                disabled={isUrgent === null}
                onClick={() => handleUrgencyResponse(isUrgent === true)}
                className="flex-1 px-4 py-2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 rounded font-medium hover:bg-gray-700 dark:hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
      </DashboardLayout>
    );
  }

  // ============================================
  // STEP 3: CRISIS RESOURCES
  // ============================================
  if (step === 'crisis') {
    const isBusinessHours = new Date().getHours() >= 9 && new Date().getHours() < 17;
    
    return (
      <DashboardLayout
        user={user}
        onLogout={handleLogout}
        menuItems={menuItems}
        title="Intake Form"
        subtitle="Campus Counseling Services"
      >
        <div className="max-w-2xl">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50 mb-8">Immediate Support</h2>

            <div className="space-y-3 mb-8">
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded">
                <p className="font-semibold text-gray-900 dark:text-gray-50">24/7 Crisis Hotline</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">988 (Suicide & Crisis Lifeline)</p>
              </div>

              {isBusinessHours && (
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded">
                  <p className="font-semibold text-gray-900 dark:text-gray-50 mb-1">Talk Now (Business Hours)</p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">Monday - Friday, 9 AM - 5 PM</p>
                  <button
                    onClick={() => setStep('appointment')}
                    className="w-full px-4 py-2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 rounded font-medium hover:bg-gray-700 dark:hover:bg-gray-300 text-sm"
                  >
                    Schedule Now
                  </button>
                </div>
              )}

              {!isBusinessHours && (
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded">
                  <p className="font-semibold text-gray-900 dark:text-gray-50 mb-1">Hours</p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Monday - Friday, 9 AM - 5 PM</p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Use 988 for crisis support outside these hours</p>
                </div>
              )}

              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded">
                <p className="font-semibold text-gray-900 dark:text-gray-50">Campus Security</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Ext. 911</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep('urgency')}
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded hover:border-gray-400 dark:hover:border-gray-500"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep('appointment')}
                className="flex-1 px-4 py-2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 rounded font-medium hover:bg-gray-700 dark:hover:bg-gray-300"
              >
                Next →
              </button>
            </div>
          </div>
      </DashboardLayout>
    );
  }

  // ============================================
  // STEP 4: PROGRESSIVE SCREENING (ONE QUESTION AT A TIME)
  // ============================================
  if (step === 'screening') {
    const currentAssessment = selectedAssessments[currentAssessmentIdx];
    const assessmentInfo = ASSESSMENTS[currentAssessment as keyof typeof ASSESSMENTS];
    const currentQuestion = assessmentInfo.questions[currentQuestionIdx];
    const totalQuestions = selectedAssessments.reduce((sum, a) => sum + ASSESSMENTS[a as keyof typeof ASSESSMENTS].questions.length, 0);
    const completedQuestions = selectedAssessments.slice(0, currentAssessmentIdx).reduce((sum, a) => sum + ASSESSMENTS[a as keyof typeof ASSESSMENTS].questions.length, 0) + currentQuestionIdx;

    return (
      <DashboardLayout
        user={user}
        onLogout={handleLogout}
        menuItems={menuItems}
        title="Intake Form"
        subtitle="Campus Counseling Services"
      >
        <div className="max-w-2xl">
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3 text-xs text-gray-600 dark:text-gray-400">
              <span>Question {completedQuestions + 1} of {totalQuestions}</span>
              <span>{assessmentInfo.name}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-gray-900 dark:bg-gray-50 h-1.5 rounded-full"
                style={{ width: `${((completedQuestions) / totalQuestions) * 100}%` }}
              />
            </div>
          </div>

          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-8">{currentQuestion}</h2>

            <div className="space-y-2 mb-8">
              {RESPONSE_SCALE.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleAnswerQuestion(option.value)}
                  className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded hover:border-gray-400 dark:hover:border-gray-500 text-left text-gray-900 dark:text-gray-50 text-sm"
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                disabled={completedQuestions === 0}
                onClick={handlePreviousQuestion}
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded hover:border-gray-400 dark:hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Back
              </button>
            </div>
          </div>
      </DashboardLayout>
    );
  }

  // ============================================
  // STEP 5: SCHEDULE APPOINTMENT
  // ============================================
  if (step === 'appointment') {
    return (
      <DashboardLayout
        user={user}
        onLogout={handleLogout}
        menuItems={menuItems}
        title="Intake Form"
        subtitle="Campus Counseling Services"
      >
        <div className="max-w-2xl">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50 mb-8">Schedule Your Appointment</h2>

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-2">Date</label>
                <input
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50 text-sm"
                />
              </div>

              {!isUrgent && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-2">Time</label>
                  <select
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50 text-sm"
                  >
                    <option value="">Select...</option>
                    <option value="9:00">9:00 AM</option>
                    <option value="10:00">10:00 AM</option>
                    <option value="11:00">11:00 AM</option>
                    <option value="1:00">1:00 PM</option>
                    <option value="2:00">2:00 PM</option>
                    <option value="3:00">3:00 PM</option>
                    <option value="4:00">4:00 PM</option>
                  </select>
                </div>
              )}

              {isUrgent && (
                <div className="p-3 border border-gray-200 dark:border-gray-700 rounded text-sm text-gray-700 dark:text-gray-300">
                  A counselor will contact you within 30 minutes during business hours.
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-2">How to meet</label>
                <div className="space-y-2">
                  {[
                    { value: 'zoom', label: 'Zoom' },
                    { value: 'google_meet', label: 'Google Meet' },
                    { value: 'phone', label: 'Phone' },
                    { value: 'in_person', label: 'In Person' }
                  ].map(({ value, label }) => (
                    <label key={value} className="flex items-center p-2 border border-gray-200 dark:border-gray-700 rounded cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 text-sm">
                      <input
                        type="radio"
                        name="communication"
                        value={value}
                        checked={communicationMethod === value}
                        onChange={(e) => setCommunicationMethod(e.target.value as any)}
                        className="mr-2"
                      />
                      <span className="text-gray-900 dark:text-gray-50">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-center p-2 border border-gray-200 dark:border-gray-700 rounded cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 text-sm">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="mr-2 w-4 h-4"
                />
                <span className="text-gray-900 dark:text-gray-50">Keep anonymous</span>
              </label>

              <label className="flex items-start p-3 border border-gray-200 dark:border-gray-700 rounded cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 text-xs">
                <input
                  type="checkbox"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  className="mr-2 w-4 h-4 mt-0.5"
                />
                <span className="text-gray-700 dark:text-gray-300">
                  I consent to my responses being used for assessment and to be contacted for my appointment. I understand I can call 988 anytime for crisis support.
                </span>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(isUrgent ? 'crisis' : 'screening')}
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded hover:border-gray-400 dark:hover:border-gray-500"
              >
                ← Back
              </button>
              <button
                onClick={handleSubmitIntake}
                disabled={!appointmentDate || !consentGiven || isSubmitting}
                className="flex-1 px-4 py-2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 rounded font-medium hover:bg-gray-700 dark:hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
      </DashboardLayout>
    );
  }

  // ============================================
  // STEP 6: CONFIRMATION & SUBMISSION
  // ============================================
  if (step === 'complete') {
    return (
      <DashboardLayout
        user={user}
        onLogout={handleLogout}
        menuItems={menuItems}
        title="Intake Form"
        subtitle="Campus Counseling Services"
      >
        <div className="max-w-2xl">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50 mb-1">Thank you!</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">Your intake has been submitted.</p>

            {counselingId && (
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded mb-8">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Counseling ID</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-50 font-mono">{counselingId}</p>
              </div>
            )}

            <div className="space-y-2 mb-8 text-sm text-gray-600 dark:text-gray-400">
              <p>• You will receive an email confirmation with your appointment details</p>
              <p>• A counselor will contact you at the time selected</p>
              <p>• For crisis support anytime, call 988</p>
            </div>

            <Link href="/dashboard">
              <button className="w-full px-4 py-2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 rounded font-medium hover:bg-gray-700 dark:hover:bg-gray-300">
                Return to Dashboard
              </button>
            </Link>
          </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return null;
}
