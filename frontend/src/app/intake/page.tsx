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
  const [communicationMethod, setCommunicationMethod] = useState<'zoom' | 'google_meet' | 'in_person'>('zoom');
  const [counselingId, setCounselingId] = useState('');
  const [appointmentData, setAppointmentData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Automatic appointment calculation
  const [automaticAppointmentInfo, setAutomaticAppointmentInfo] = useState<any>(null);
  const [minSelectableDate, setMinSelectableDate] = useState('');
  const [isCalculatingAppointment, setIsCalculatingAppointment] = useState(false);
  const [appointmentOverridden, setAppointmentOverridden] = useState(false);

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

  // Calculate automatic appointment based on assessment scores
  const calculateAppointment = async () => {
    if (!automaticAppointmentInfo) {
      setIsCalculatingAppointment(true);
      try {
        const token = localStorage.getItem('token');
        
        // Build the payload with assessment responses
        const payload: any = {};
        selectedAssessments.forEach(assessment => {
          payload[`${assessment}_responses`] = assessmentResponses[assessment] || [];
        });
        
        console.log('📅 Calculating appointment with scores:', payload);
        
        const response = await fetch(api('/api/intake/calculate-appointment'), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Appointment calculated:', data);
          setAutomaticAppointmentInfo(data);
          
          // Extract date part from ISO format (YYYY-MM-DD)
          const automaticDateOnly = data.automatic_date.split('T')[0];
          const minDateOnly = data.min_selectable_date_formatted || data.min_selectable_date.split('T')[0];
          
          setMinSelectableDate(minDateOnly);
          setAutoSuggestedDate(data.automatic_date_formatted);
          setAppointmentDate(automaticDateOnly); // Pre-fill with automatic date (YYYY-MM-DD)
          setAppointmentOverridden(false);
        } else {
          console.error('❌ Failed to calculate appointment:', response.status);
        }
      } catch (error) {
        console.error('❌ Error calculating appointment:', error);
      } finally {
        setIsCalculatingAppointment(false);
      }
    }
  };

  // Calculate automatic appointment when entering appointment step
  useEffect(() => {
    if (step === 'appointment' && !automaticAppointmentInfo && selectedAssessments.length > 0) {
      calculateAppointment();
    }
  }, [step, automaticAppointmentInfo, selectedAssessments.length]);

  // Submit intake
  const handleSubmitIntake = async () => {
    if (!consentGiven) {
      alert('Please provide consent to proceed');
      return;
    }

    // Validate appointment date is not earlier than automatic date
    if (automaticAppointmentInfo && appointmentDate) {
      const selectedDate = new Date(appointmentDate);
      const automaticDate = new Date(automaticAppointmentInfo.automatic_date);
      
      if (selectedDate < automaticDate) {
        alert(`⚠️ Appointment date cannot be earlier than the automatically calculated date (${automaticAppointmentInfo.automatic_date_formatted}). Please select a later date.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      console.log('🔐 TOKEN DEBUG:');
      console.log('   Token exists:', !!token);
      console.log('   Token length:', token?.length);
      console.log('   Token preview:', token?.substring(0, 30) + '...');
      
      if (!token) {
        alert('❌ No authentication token found! Please log in again.');
        setIsSubmitting(false);
        return;
      }

      const payload: any = {
        purpose: selectedConcern,
        is_emergency: isUrgent,
        emergency_notes: urgencyNotes,
        is_anonymous: isAnonymous,
        consent_given: true,
        preferred_platform: communicationMethod,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        appointment_override: appointmentOverridden,
        automatic_appointment_date: automaticAppointmentInfo?.automatic_date,
      };

      // Add assessment responses
      selectedAssessments.forEach(assessment => {
        payload[`${assessment}_responses`] = assessmentResponses[assessment];
      });

      const finalToken = localStorage.getItem('token');
      const endpoint = api('/api/intake/submit');
      
      console.log('📡 INTAKE SUBMISSION DEBUG:');
      console.log('   Endpoint:', endpoint);
      console.log('   Token from localStorage:', !!finalToken ? `${finalToken.substring(0, 30)}...` : 'NULL');
      console.log('   Auth header:', finalToken ? `Bearer ${finalToken.substring(0, 20)}...` : 'NOT SET');
      console.log('   Appointment override:', appointmentOverridden);
      console.log('   Automatic date:', automaticAppointmentInfo?.automatic_date);
      console.log('   Selected date:', appointmentDate);
      console.log('   Payload keys:', Object.keys(payload));
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${finalToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      console.log('📤 Response status:', response.status, response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API ERROR:', response.status);
        console.error('   Error response:', errorText);
        throw new Error(`Failed to submit intake: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ FULL API RESPONSE:', JSON.stringify(data, null, 2));
      console.log('🔍 Response keys:', Object.keys(data));
      console.log('📅 data.appointment exists?', !!data.appointment);
      console.log('📅 data.appointment value:', data.appointment);
      console.log('📅 type of data.appointment:', typeof data.appointment);
      
      // Check if appointment is null, undefined, or has the wrong structure
      if (!data.appointment) {
        console.error('❌ CRITICAL: data.appointment is', data.appointment);
        console.error('   Full response:', data);
        console.error('   Check if API is returning appointment object');
      }
      
      if (data.appointment) {
        console.log('   - join_url:', data.appointment.join_url);
        console.log('   - meeting_id:', data.appointment.meeting_id);
        console.log('   - platform:', data.appointment.platform);
        console.log('   - preferred_platform:', data.appointment.preferred_platform);
      } else {
        console.log('⚠️ WARNING: data.appointment is undefined or null!');
        console.log('Available top-level fields in response:', Object.entries(data).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v).substring(0, 50) : v}`).join(', '));
      }
      
      console.log('📌 About to set state...');
      console.log('   setCounselingId:', data.counseling_id);
      console.log('   setAppointmentData:', data.appointment);
      setCounselingId(data.counseling_id);
      setAppointmentData(data.appointment);
      console.log('✅ State setters called');
      console.log('📌 About to setStep("complete")');
      setStep('complete');
      console.log('✅ setStep("complete") called');
    } catch (error) {
      console.error('❌ ERROR DURING SUBMISSION:', error);
      if (error instanceof Error) {
        console.error('   Message:', error.message);
        console.error('   Stack:', error.stack);
      }
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
          <h2 className="text-xl font-semibold mb-2 text-white">What brings you in today?</h2>
          <p className="text-sm text-white mb-6">Select the concern that best describes your situation</p>

            <div className="space-y-2 mb-8">
              {Object.entries(CONCERN_TYPES).map(([key, concern]) => (
                <button
                  key={key}
                  onClick={() => setSelectedConcern(key)}
                  className={`w-full p-3 border rounded text-left transition ${
                    selectedConcern === key
                      ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100'
                      : 'border-gray-300 dark:border-gray-600 text-white hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  {concern.label}
                </button>
              ))}
            </div>

            <button
              disabled={!selectedConcern}
              onClick={handleConcernSelection}
              className="w-full px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded font-medium hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
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
          <h2 className="text-xl font-semibold text-white mb-1">Which screenings would you like to complete?</h2>
          <p className="text-sm text-white mb-8">Select all that apply based on your concerns</p>

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
                  <span className="text-white">
                    {assessmentLabels[assessment] || assessment}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep('concern')}
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 text-white rounded hover:border-gray-400 dark:hover:border-gray-500"
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
          <h2 className="text-xl font-semibold mb-6 text-white">Is this urgent?</h2>

            <div className="space-y-2 mb-6">
              <button
                onClick={() => setIsUrgent(true)}
                className={`w-full p-3 border rounded text-left transition ${
                  isUrgent === true
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                }`}
              >
                Yes, I need immediate support
              </button>

              <button
                onClick={() => setIsUrgent(false)}
                className={`w-full p-3 border rounded text-left transition ${
                  isUrgent === false
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                }`}
              >
                No, I can wait for an appointment
              </button>
            </div>

            {isUrgent && (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Describe what's happening (optional)
                </label>
                <textarea
                  value={urgencyNotes}
                  onChange={(e) => setUrgencyNotes(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-900 text-sm"
                  rows={3}
                  placeholder="What is happening right now?"
                />
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setStep('concern')}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm hover:border-gray-400"
              >
                ← Back
              </button>
              <button
                disabled={isUrgent === null}
                onClick={() => handleUrgencyResponse(isUrgent === true)}
                className="flex-1 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded font-medium hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
          <h2 className="text-xl font-semibold mb-6 text-white">Immediate Support</h2>

            <div className="space-y-3 mb-6">
              <div className="p-4 border border-gray-300 dark:border-gray-600 rounded">
                  <p className="font-semibold text-white">24/7 Crisis Hotline</p>
                <p className="text-white text-sm">988 (Suicide & Crisis Lifeline)</p>
              </div>

              {isBusinessHours && (
                <div className="p-4 border border-gray-300 dark:border-gray-600 rounded">
                  <p className="font-semibold mb-1 text-white">Talk Now (Business Hours)</p>
                  <p className="text-white text-sm mb-3">Monday - Friday, 9 AM - 5 PM</p>
                  <button
                    onClick={() => setStep('appointment')}
                    className="w-full px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded font-medium hover:bg-gray-800 dark:hover:bg-gray-200 text-sm"
                  >
                    Schedule Now
                  </button>
                </div>
              )}

              {!isBusinessHours && (
                <div className="p-4 border border-gray-300 dark:border-gray-600 rounded">
                  <p className="font-semibold mb-1 text-white">Hours</p>
                  <p className="text-white text-sm">Monday - Friday, 9 AM - 5 PM</p>
                  <p className="text-white text-sm mt-1">Use 988 for crisis support outside these hours</p>
                </div>
              )}

              <div className="p-4 border border-gray-300 dark:border-gray-600 rounded">
                <p className="font-semibold text-white">Campus Security</p>
                <p className="text-white text-sm">Ext. 911</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep('urgency')}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm hover:border-gray-400"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep('appointment')}
                className="flex-1 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded font-medium hover:bg-gray-800 dark:hover:bg-gray-200"
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
          <div className="mb-6">
            <div className="flex justify-between text-xs text-white mb-2">
              <span>Question {completedQuestions + 1} of {totalQuestions}</span>
              <span>{assessmentInfo.name}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full">
              <div
                className="bg-gray-900 dark:bg-gray-100 h-1.5 rounded-full transition-all"
                style={{ width: `${((completedQuestions) / totalQuestions) * 100}%` }}
              />
            </div>
          </div>

          <h2 className="text-lg font-semibold mb-6 text-white">{currentQuestion}</h2>

            <div className="space-y-2 mb-6">
              {RESPONSE_SCALE.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleAnswerQuestion(option.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded text-left text-sm hover:border-gray-400 dark:hover:border-gray-500"
                >
                  {option.label}
                </button>
              ))}
            </div>

            <button
              disabled={completedQuestions === 0}
              onClick={handlePreviousQuestion}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm hover:border-gray-400 dark:hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Back
            </button>
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
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column: Form Fields */}
          <div className="col-span-2 space-y-4">
            <h2 className="text-xl font-semibold mb-6 text-white">Schedule Your Appointment</h2>

            {/* Automatic Appointment Info */}
            {automaticAppointmentInfo && (
              <div className="p-4 border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded">
                <p className="text-sm font-bold text-blue-900 dark:text-blue-200 mb-2">
                  📅 AUTOMATIC APPOINTMENT SCHEDULED
                </p>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-300 mb-1">
                  {automaticAppointmentInfo.automatic_date_formatted}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
                  Based on your assessment scores ({automaticAppointmentInfo.estimated_days})
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {automaticAppointmentInfo.is_emergency ? (
                    <>⚠️ Emergency: High priority scheduling</>
                  ) : automaticAppointmentInfo.urgency_level === 'high' ? (
                    <>🔴 High Priority: Prioritized scheduling</>
                  ) : (
                    <>✓ Standard: Regular scheduling</>
                  )}
                </p>
              </div>
            )}

            {isCalculatingAppointment && (
              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded text-center text-sm text-white">
                Calculating automatic appointment...
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Preferred Date
                {appointmentOverridden && (
                  <span className="text-xs text-yellow-500 ml-2">(Custom date selected)</span>
                )}
              </label>
              <input
                type="date"
                value={appointmentDate}
                onChange={(e) => {
                  const newDate = e.target.value;
                  if (minSelectableDate && newDate < minSelectableDate) {
                    alert(`Cannot select a date earlier than ${minSelectableDate}`);
                    return;
                  }
                  setAppointmentDate(newDate);
                  setAppointmentOverridden(true);
                }}
                min={minSelectableDate}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-sm"
              />
              {minSelectableDate && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Earliest selectable: {new Date(minSelectableDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              )}
            </div>

            {!isUrgent && (
              <div>
                <label className="block text-sm font-medium text-white mb-2">Preferred Time</label>
                <select
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-sm"
                >
                  <option value="">Select a time...</option>
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
              <div className="p-4 border border-gray-300 rounded text-sm text-white bg-gray-50 dark:bg-gray-900/50">
                A counselor will contact you within 30 minutes during business hours.
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-white mb-2">How to Meet</label>
              <div className="space-y-2">
                {[
                  { value: 'zoom', label: 'Zoom Video Call' },
                  { value: 'google_meet', label: 'Google Meet' },
                  { value: 'in_person', label: 'In Person' }
                ].map(({ value, label }) => (
                  <label key={value} className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <input
                      type="radio"
                      name="communication"
                      value={value}
                      checked={communicationMethod === value}
                      onChange={(e) => setCommunicationMethod(e.target.value as any)}
                      className="mr-3"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="mr-2 w-4 h-4"
              />
              Keep anonymous
            </label>

            <label className="flex items-start p-3 border border-gray-300 dark:border-gray-600 rounded text-xs cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50">
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                className="mr-2 mt-0.5 w-4 h-4"
              />
              <span className="text-white">
                I consent to my responses being used for assessment and to be contacted for my appointment. I understand I can call 988 anytime for crisis support.
              </span>
            </label>
          </div>

          {/* Right Column: Appointment Details Summary */}
          <div className="col-span-1">
            <div className="border border-gray-300 dark:border-gray-600 rounded p-6 bg-gray-50 dark:bg-gray-900/50 sticky top-20">
              <h3 className="text-lg font-semibold mb-6 pb-4 border-b border-gray-300 dark:border-gray-600 text-white">Your Appointment</h3>
              
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold text-white mb-1">PURPOSE:</p>
                  <p className="text-sm font-semibold text-white capitalize">{selectedConcern || 'Not selected'}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-white mb-1">COMMUNICATION:</p>
                  <p className="text-sm font-semibold text-white capitalize">
                    {communicationMethod?.replace('_', ' ') || 'Not selected'}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-white mb-1">DATE:</p>
                  <p className="text-sm font-semibold text-white">
                    {appointmentDate ? new Date(appointmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not selected'}
                  </p>
                </div>

                {!isUrgent && (
                  <div>
                    <p className="text-xs font-semibold text-white mb-1">TIME:</p>
                    <p className="text-sm font-semibold text-white">
                      {appointmentTime || 'Not selected'}
                    </p>
                  </div>
                )}

                {isUrgent && (
                  <div>
                    <p className="text-xs font-semibold text-white mb-1">STATUS:</p>
                    <p className="text-sm font-semibold text-white">URGENT - Within 30 minutes</p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-white mb-1">PRIVACY:</p>
                  <p className="text-sm font-semibold text-white">
                    {isAnonymous ? 'Anonymous' : 'Standard'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mt-8">
          <div className="col-span-2 flex gap-2">
            <button
              onClick={() => setStep(isUrgent ? 'crisis' : 'screening')}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-900/50"
            >
              ← Back
            </button>
            <button
              onClick={handleSubmitIntake}
              disabled={!appointmentDate || !consentGiven || isSubmitting}
              className="flex-1 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded font-medium hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Intake'}
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
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column: Success Message and Information */}
          <div className="col-span-2 space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full mb-4">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold mb-2">Intake Complete</h2>
              <p className="text-white">Your appointment has been scheduled. You'll receive a confirmation email shortly.</p>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded p-4">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-white flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-white">
                  <p className="font-semibold">What happens next?</p>
                  <ul className="mt-2 space-y-1">
                    <li>✓ Check your email for a confirmation message</li>
                    <li>✓ A counselor will contact you to confirm your appointment</li>
                    <li>✓ You'll receive login instructions for your appointment</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-white">Need immediate support?</h3>
              <div className="grid grid-cols-2 gap-3">
                <a href="tel:988" className="p-3 border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 rounded hover:bg-red-100 dark:hover:bg-red-900/40 text-sm font-medium text-center">
                  📞 Call 988<br/><span className="text-xs text-white">Crisis Hotline</span>
                </a>
                <a href="https://suicidepreventionlifeline.org" target="_blank" rel="noopener noreferrer" className="p-3 border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 text-sm font-medium text-center">
                  💬 Crisis Chat<br/><span className="text-xs text-white">24/7 Support</span>
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Appointment Summary */}
          <div className="col-span-1">
            {/* DEBUG: Show appointment data state */}
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded text-xs text-red-200 font-mono break-all">
              <div className="font-bold mb-2">🔴 DEBUG INFO</div>
              <div>step value: <span className="text-yellow-300">{step}</span></div>
              <div>appointmentData exists: {appointmentData ? '✅ YES' : '❌ NO'}</div>
              <div>typeof appointmentData: {typeof appointmentData}</div>
              {appointmentData && (
                <>
                  <div>join_url: {appointmentData.join_url ? '✅ YES' : '❌ NO'}</div>
                  <div>meeting_id: {appointmentData.meeting_id || 'NONE'}</div>
                  <div>platform: {appointmentData.platform || 'NONE'}</div>
                  <div className="mt-2 font-bold">FULL DATA:</div>
                  <div className="whitespace-pre-wrap">{JSON.stringify(appointmentData, null, 2)}</div>
                </>
              )}
            </div>

            <div className="border border-gray-300 dark:border-gray-600 rounded p-6 bg-gray-50 dark:bg-gray-900/50 sticky top-20">
              <h3 className="text-lg font-semibold mb-6 pb-4 border-b border-gray-300 dark:border-gray-600 text-white">Your Appointment</h3>
              
              <div className="space-y-5">
                {counselingId && (
                  <div>
                    <p className="text-xs font-semibold text-white mb-1">REFERENCE ID:</p>
                    <p className="text-sm font-semibold text-white break-all font-mono">{counselingId}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-white mb-1">REASON:</p>
                  <p className="text-sm font-semibold text-white capitalize">{selectedConcern || 'Not specified'}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-white mb-1">SCHEDULED DATE:</p>
                  <p className="text-sm font-semibold text-white">
                    {appointmentData?.appointment_date 
                      ? new Date(appointmentData.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : appointmentDate ? new Date(appointmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Pending'}
                  </p>
                </div>

                {!isUrgent && appointmentTime && (
                  <div>
                    <p className="text-xs font-semibold text-white mb-1">TIME:</p>
                    <p className="text-sm font-semibold text-white">{appointmentTime}</p>
                  </div>
                )}

                {isUrgent && (
                  <div>
                    <p className="text-xs font-semibold text-white mb-1">PRIORITY:</p>
                    <p className="text-sm font-semibold text-white">URGENT - Within 30 min</p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-white mb-1">FORMAT:</p>
                  <p className="text-sm font-semibold text-white capitalize">
                    {appointmentData?.preferred_platform?.replace(/_/g, ' ') || communicationMethod?.replace(/_/g, ' ') || 'Not specified'}
                  </p>
                </div>

                {/* Meeting Link Section - Explicit Rendering */}
                {appointmentData && appointmentData.join_url ? (
                  <>
                    {/* INLINE STYLE TEST - Should always show if appointmentData.join_url exists */}
                    <div style={{
                      backgroundColor: '#ff0000',
                      color: '#fff',
                      padding: '12px',
                      marginBottom: '12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      🎯 INLINE STYLE TEST: join_url is present
                    </div>

                    {/* Tailwind Version */}
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-400 dark:border-purple-600 rounded animate-pulse">
                      <p className="text-xs font-bold text-purple-900 dark:text-purple-200 mb-3">✅ MEETING LINK READY</p>
                      <a 
                        href={appointmentData.join_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block p-3 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded font-bold text-center mb-3 transition"
                      >
                        🎥 {appointmentData.preferred_platform === 'zoom' ? 'JOIN ZOOM' : appointmentData.preferred_platform === 'google_meet' ? 'JOIN GOOGLE MEET' : 'JOIN MEETING'} →
                      </a>
                      <div className="p-2 bg-gray-900 dark:bg-gray-800 rounded text-xs font-mono text-white break-all space-y-2">
                        {appointmentData.meeting_id && (
                          <div><span className="text-gray-400">Meeting ID:</span> <span className="text-purple-300 font-bold">{appointmentData.meeting_id}</span></div>
                        )}
                        {appointmentData.passcode && (
                          <div><span className="text-gray-400">Passcode:</span> <span className="text-purple-300 font-bold">{appointmentData.passcode}</span></div>
                        )}
                        {appointmentData.meeting_code && (
                          <div><span className="text-gray-400">Code:</span> <span className="text-purple-300 font-bold">{appointmentData.meeting_code}</span></div>
                        )}
                        <div><span className="text-gray-400">Link:</span></div>
                        <div className="text-purple-300 underline break-all text-xs">{appointmentData.join_url}</div>
                      </div>
                    </div>
                  </>
                ) : appointmentData ? (
                  <div className="p-2 bg-gray-800 rounded mb-3 text-xs text-yellow-400 break-all font-mono border border-yellow-600">
                    <div>📍 {appointmentData.preferred_platform === 'in_person' ? 'In-Person: ' + (appointmentData.location || 'CPS Office') : '⏳ Meeting link will be sent via email'}</div>
                  </div>
                ) : (
                  <div className="p-2 bg-blue-900/50 rounded mb-3 text-xs text-blue-300 border border-blue-600">
                    <div>ℹ️ No appointment details available</div>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-white mb-1">PRIVACY:</p>
                  <p className="text-sm font-semibold text-white">
                    {isAnonymous ? 'Anonymous' : 'Standard'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mt-8">
          <div className="col-span-2">
            <Link href="/dashboard">
              <button className="w-full px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded font-medium hover:bg-gray-800 dark:hover:bg-gray-200">
                Return to Dashboard
              </button>
            </Link>
          </div>
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
