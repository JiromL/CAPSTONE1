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
      'Feeling nervous, anxious, or on edge.',
      'Not being able to stop or control worrying.',
      'Worrying too much about different things.',
      'Trouble relaxing.',
      'Being so restless that it is hard to sit still.',
      'Becoming easily annoyed or irritable.',
      'Feeling afraid as if something awful might happen.',
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
  const [communicationMethod, setCommunicationMethod] = useState<'zoom' | 'google_meet' | 'in_person'>('in_person');
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
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        
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
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
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

      // Try to get token from localStorage (check both keys for compatibility)
      let finalToken = localStorage.getItem('token') || localStorage.getItem('access_token');
      const endpoint = api('/api/intake/submit');
      
      console.log('📡 INTAKE SUBMISSION DEBUG:');
      console.log('   Endpoint:', endpoint);
      console.log('   Token from localStorage:', !!finalToken ? `${finalToken.substring(0, 30)}...` : 'NULL');
      console.log('   Auth header:', finalToken ? `Bearer ${finalToken.substring(0, 20)}...` : 'NOT SET');
      console.log('   Appointment override:', appointmentOverridden);
      console.log('   Automatic date:', automaticAppointmentInfo?.automatic_date);
      console.log('   Selected date:', appointmentDate);
      console.log('   Payload keys:', Object.keys(payload));
      
      if (!finalToken) {
        throw new Error('No authentication token found. Please log in again.');
      }
      
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
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-block px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-700 mb-3">
              Step 1 of 6
            </div>
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">What brings you in today?</h1>
            <p className="text-gray-600 dark:text-gray-300">Tell us about your primary concern</p>
          </div>

          {/* Concern Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
            {Object.entries(CONCERN_TYPES).map(([key, concern]) => (
              <button
                key={key}
                onClick={() => setSelectedConcern(key)}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  selectedConcern === key
                    ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-600'
                    : 'bg-white border-gray-200 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:border-gray-600'
                }`}
              >
                <p className={`font-semibold ${selectedConcern === key ? 'text-blue-900 dark:text-blue-200' : 'text-gray-900 dark:text-gray-100'}`}>
                  {concern.label}
                </p>
              </button>
            ))}
          </div>

          {/* Action Button */}
          <button
            disabled={!selectedConcern}
            onClick={handleConcernSelection}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue →
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

    const assessmentDescriptions: {[key: string]: string} = {
      phq9: 'Quick assessment for depressive symptoms',
      gad7: 'Evaluate anxiety levels and worries',
      pss: 'Measure perceived stress levels',
      acad: 'Assess academic-related concerns',
      career: 'Evaluate career clarity and confidence',
      social: 'Understand social and relationship concerns'
    };
    
    return (
      <DashboardLayout
        user={user}
        onLogout={handleLogout}
        menuItems={menuItems}
        title="Intake Form"
        subtitle="Campus Counseling Services"
      >
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-block px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-700 mb-3">
              Step 2 of 6
            </div>
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">Screening Assessments</h1>
            <p className="text-gray-600 dark:text-gray-300">Select which assessments you'd like to complete</p>
          </div>

          {/* Screening Cards */}
          <div className="space-y-3 mb-8">
            {allowedAssessments.map((assessment) => (
              <label
                key={assessment}
                className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedScreenings.has(assessment)
                    ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-600'
                    : 'bg-white border-gray-200 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:border-gray-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedScreenings.has(assessment)}
                  onChange={() => toggleScreening(assessment)}
                  className="w-5 h-5 mt-1 mr-4 cursor-pointer"
                />
                <div className="flex-1">
                  <p className={`font-semibold ${selectedScreenings.has(assessment) ? 'text-blue-900 dark:text-blue-200' : 'text-gray-900 dark:text-gray-100'}`}>
                    {assessmentLabels[assessment] || assessment}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                    {assessmentDescriptions[assessment]}
                  </p>
                </div>
              </label>
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep('concern')}
              className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 font-semibold transition-colors dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
            >
              ← Back
            </button>
            <button
              disabled={selectedScreenings.size === 0}
              onClick={handleScreeningSelection}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue →
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
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-block px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-700 mb-3">
              Step 3 of 6
            </div>
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">How urgent is your situation?</h1>
            <p className="text-gray-600 dark:text-gray-300">This helps us prioritize your support</p>
          </div>

          {/* Urgency Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Not Urgent */}
            <button
              onClick={() => setIsUrgent(false)}
              className={`p-6 border-2 rounded-lg text-left transition-all ${
                isUrgent === false
                  ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-600'
                  : 'bg-white border-gray-200 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:border-gray-600'
              }`}
            >
              <p className={`text-lg font-semibold ${isUrgent === false ? 'text-green-900 dark:text-green-200' : 'text-gray-900 dark:text-gray-100'}`}>
                I can wait
              </p>
              <p className={`text-sm mt-1 ${isUrgent === false ? 'text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-gray-400'}`}>
                Schedule an appointment within a week
              </p>
            </button>

            {/* Urgent */}
            <button
              onClick={() => setIsUrgent(true)}
              className={`p-6 border-2 rounded-lg text-left transition-all ${
                isUrgent === true
                  ? 'bg-amber-50 border-amber-300 dark:bg-amber-900/20 dark:border-amber-600'
                  : 'bg-white border-gray-200 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:border-gray-600'
              }`}
            >
              <p className={`text-lg font-semibold ${isUrgent === true ? 'text-amber-900 dark:text-amber-200' : 'text-gray-900 dark:text-gray-100'}`}>
                I need help soon
              </p>
              <p className={`text-sm mt-1 ${isUrgent === true ? 'text-amber-700 dark:text-amber-300' : 'text-gray-600 dark:text-gray-400'}`}>
                I'd like support as soon as possible
              </p>
            </button>
          </div>

          {/* Optional Notes for Urgent Cases */}
          {isUrgent && (
            <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-900/20 dark:border-amber-700">
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                What's happening? (optional)
              </label>
              <textarea
                value={urgencyNotes}
                onChange={(e) => setUrgencyNotes(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                rows={4}
                placeholder="Share what you're experiencing..."
              />
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep('concern')}
              className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 font-semibold transition-colors dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
            >
              ← Back
            </button>
            <button
              disabled={isUrgent === null}
              onClick={() => handleUrgencyResponse(isUrgent === true)}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue →
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
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-block px-3 py-1 bg-red-50 border border-red-200 rounded-full text-sm text-red-700 mb-3">
              Get Support Now
            </div>
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">Resources Available</h1>
            <p className="text-gray-600 dark:text-gray-300">Multiple ways to get help right now</p>
          </div>

          {/* Quick Access Resources */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* 24/7 Crisis Line */}
            <div className="p-5 bg-red-50 border-2 border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-700">
              <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2">24/7 CRISIS SUPPORT</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Call 988</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Suicide & Crisis Lifeline - Anytime</p>
              <a
                href="tel:988"
                className="block w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-center transition-colors"
              >
                Call 988 Now
              </a>
            </div>

            {/* Campus Security */}
            <div className="p-5 bg-gray-100 border-2 border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">CAMPUS EMERGENCY</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Ext. 911</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Campus Security - For emergencies</p>
              <a
                href="tel:911"
                className="block w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg text-center transition-colors"
              >
                Call Emergency
              </a>
            </div>

            {/* CPS Direct Line (if Business Hours) */}
            {isBusinessHours && (
              <div className="p-5 bg-green-50 border-2 border-green-200 rounded-lg md:col-span-2 dark:bg-green-900/20 dark:border-green-700">
                <p className="text-sm font-semibold text-green-700 dark:text-green-300 mb-2">TALK TO A COUNSELOR NOW</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">Monday - Friday, 9 AM - 5 PM</p>
                <button
                  onClick={() => setStep('appointment')}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg text-center transition-colors"
                >
                  Schedule Emergency Appointment →
                </button>
              </div>
            )}

            {/* Crisis Chat */}
            <a
              href="https://suicidepreventionlifeline.org/chat"
              target="_blank"
              rel="noopener noreferrer"
              className="p-5 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 transition-colors dark:bg-blue-900/20 dark:border-blue-700 dark:hover:bg-blue-900/40"
            >
              <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">CRISIS CHAT</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Talk Online</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm">24/7 support via chat</p>
            </a>
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep('urgency')}
              className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 font-semibold transition-colors dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep('appointment')}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              Continue →
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
    const progressPercent = ((completedQuestions) / totalQuestions) * 100;

    return (
      <DashboardLayout
        user={user}
        onLogout={handleLogout}
        menuItems={menuItems}
        title="Intake Form"
        subtitle="Campus Counseling Services"
      >
        <div className="max-w-2xl mx-auto">
          {/* Progress Section */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm text-blue-600 dark:text-blue-400 font-semibold mb-1">
                  {assessmentInfo.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Question {completedQuestions + 1} of {totalQuestions}
                </div>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {Math.round(progressPercent)}%
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-500 dark:bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white leading-snug">
              {currentQuestion}
            </h2>
          </div>

          {/* Response Options */}
          <div className="grid grid-cols-2 gap-3 mb-10">
            {RESPONSE_SCALE.map((option) => (
              <button
                key={option.value}
                onClick={() => handleAnswerQuestion(option.value)}
                className="p-4 bg-white border border-gray-300 hover:border-blue-300 hover:bg-blue-50 rounded-lg text-center transition-all dark:bg-gray-800 dark:border-gray-700 dark:hover:border-blue-600 dark:hover:bg-gray-750"
              >
                <p className="text-gray-900 dark:text-white font-medium">{option.label}</p>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              disabled={completedQuestions === 0}
              onClick={handlePreviousQuestion}
              className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
            >
              ← Previous
            </button>
            <button
              disabled={completedQuestions === 0}
              onClick={() => setStep('appointment')}
              className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
            >
              Skip to Appointment
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
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column: Form Fields */}
          <div className="col-span-2 space-y-4">
            <h2 className="text-xl font-semibold mb-6 text-white">Schedule Your Appointment</h2>

            {/* Automatic Appointment Info */}
            {automaticAppointmentInfo && (
              <div className={`p-4 border-2 rounded ${
                automaticAppointmentInfo.risk_level === 'RED' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                automaticAppointmentInfo.risk_level === 'YELLOW' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' :
                'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-bold dark:text-gray-100">
                    📅 AUTOMATIC APPOINTMENT SCHEDULED
                  </p>
                  {automaticAppointmentInfo.risk_level && (
                    <div className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                      automaticAppointmentInfo.risk_level === 'RED' ? 'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-300' :
                      automaticAppointmentInfo.risk_level === 'YELLOW' ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                      'bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                    }`}>
                      {automaticAppointmentInfo.risk_level}
                    </div>
                  )}
                </div>
                <p className={`text-lg font-bold mb-1 ${
                  automaticAppointmentInfo.risk_level === 'RED' ? 'text-red-700 dark:text-red-300' :
                  automaticAppointmentInfo.risk_level === 'YELLOW' ? 'text-yellow-700 dark:text-yellow-300' :
                  'text-blue-700 dark:text-blue-300'
                }`}>
                  {automaticAppointmentInfo.automatic_date_formatted}
                </p>
                <p className={`text-xs mb-3 ${
                  automaticAppointmentInfo.risk_level === 'RED' ? 'text-red-600 dark:text-red-400' :
                  automaticAppointmentInfo.risk_level === 'YELLOW' ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-blue-600 dark:text-blue-400'
                }`}>
                  Based on your assessment scores ({automaticAppointmentInfo.estimated_days})
                </p>
                <p className={`text-xs ${
                  automaticAppointmentInfo.risk_level === 'RED' ? 'text-red-600 dark:text-red-400' :
                  automaticAppointmentInfo.risk_level === 'YELLOW' ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-blue-600 dark:text-blue-400'
                }`}>
                  {automaticAppointmentInfo.risk_level === 'RED' ? (
                    <>🚨 Critical: Crisis management within 30 minutes</>
                  ) : automaticAppointmentInfo.risk_level === 'YELLOW' ? (
                    <>🔴 High Priority: Schedule within 1 business day</>
                  ) : (
                    <>✓ Standard: Schedule 2-3 business days</>
                  )}
                </p>
                {automaticAppointmentInfo.appointment_time && automaticAppointmentInfo.risk_level !== 'RED' && (
                  <p className={`text-xs mt-2 pt-2 border-t ${
                    automaticAppointmentInfo.risk_level === 'YELLOW' ? 'border-yellow-200 dark:border-yellow-800 text-yellow-600 dark:text-yellow-400' :
                    'border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                  }`}>
                    ⏰ Appointment time: <span className="font-semibold">{automaticAppointmentInfo.appointment_time}</span>
                  </p>
                )}
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
        <div className="max-w-3xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Intake Complete</h1>
            <p className="text-gray-600 dark:text-gray-300">Your appointment has been scheduled successfully</p>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Left Column: Next Steps & Resources */}
            <div className="lg:col-span-2 space-y-6">
              {/* Next Steps */}
              <div className="p-5 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">What happens next?</h3>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <span className="text-green-600 dark:text-green-500 font-bold">✓</span>
                    <div>
                      <p className="text-gray-900 dark:text-white font-semibold">Check your email</p>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">You'll receive confirmation with your appointment details</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-green-600 dark:text-green-500 font-bold">✓</span>
                    <div>
                      <p className="text-gray-900 dark:text-white font-semibold">Counselor contact</p>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">We'll confirm your appointment time with you</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-green-600 dark:text-green-500 font-bold">✓</span>
                    <div>
                      <p className="text-gray-900 dark:text-white font-semibold">Ready to meet</p>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">You'll receive login info for your appointment</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resources */}
              <div className="p-5 bg-gray-50 border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Need support?</h3>
                <div className="grid grid-cols-2 gap-3">
                  <a href="tel:988" className="p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors dark:bg-red-900/20 dark:border-red-800 dark:hover:bg-red-900/40">
                    <p className="text-red-700 dark:text-red-400 font-semibold text-sm">Crisis Support</p>
                    <p className="text-gray-900 dark:text-white font-bold">Call 988</p>
                  </a>
                  <a href="https://suicidepreventionlifeline.org/chat" target="_blank" rel="noopener noreferrer" className="p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors dark:bg-blue-900/20 dark:border-blue-800 dark:hover:bg-blue-900/40">
                    <p className="text-blue-700 dark:text-blue-400 font-semibold text-sm">Chat</p>
                    <p className="text-gray-900 dark:text-white font-bold">24/7 Online</p>
                  </a>
                </div>
              </div>
            </div>

            {/* Right Column: Appointment Summary */}
            <div className="lg:col-span-1">
              <div className="p-5 bg-gray-50 border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700 sticky top-20">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                  Your Appointment
                </h3>
                
                <div className="space-y-4">
                  {/* Reference ID */}
                  {counselingId && (
                    <div>
                      <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">REFERENCE ID</p>
                      <p className="text-sm font-mono text-blue-600 dark:text-blue-400 break-all">{counselingId}</p>
                    </div>
                  )}

                  {/* Risk Level */}
                  {appointmentData?.risk_level && (
                    <div>
                      <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">RISK LEVEL</p>
                      <div className={`inline-block px-3 py-1 rounded-full font-bold text-sm ${
                        appointmentData.risk_level === 'RED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        appointmentData.risk_level === 'YELLOW' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {appointmentData.risk_level}
                      </div>
                    </div>
                  )}

                  {/* Reason */}
                  <div>
                    <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">REASON</p>
                    <p className="text-gray-900 dark:text-white font-semibold capitalize">{selectedConcern || 'Personal'}</p>
                  </div>

                  {/* Date */}
                  <div>
                    <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">SCHEDULED</p>
                    <p className="text-gray-900 dark:text-white font-semibold">
                      {appointmentData?.appointment_date 
                        ? new Date(appointmentData.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : appointmentDate ? new Date(appointmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Pending'}
                    </p>
                  </div>

                  {/* Time */}
                  {!isUrgent && (appointmentData?.appointment_time || appointmentTime) && (
                    <div>
                      <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">TIME</p>
                      <p className="text-gray-900 dark:text-white font-semibold">{appointmentData?.appointment_time || appointmentTime}</p>
                    </div>
                  )}

                  {(isUrgent || appointmentData?.risk_level === 'RED') && (
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">PRIORITY</p>
                      <p className="text-red-600 dark:text-red-400 font-bold flex items-center gap-2">
                        <span className="inline-block w-2 h-2 bg-red-600 dark:bg-red-400 rounded-full animate-pulse"></span>
                        🚨 Urgent - Within 30 minutes
                      </p>
                    </div>
                  )}

                  {/* Format */}
                  <div>
                    <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">FORMAT</p>
                    <p className="text-gray-900 dark:text-white font-semibold capitalize">
                      {appointmentData?.preferred_platform?.replace(/_/g, ' ') || communicationMethod?.replace(/_/g, ' ') || 'Online'}
                    </p>
                  </div>

                  {/* Meeting Link if Available */}
                  {appointmentData?.join_url && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <a 
                        href={appointmentData.join_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg text-center transition-colors text-sm"
                      >
                        Join Meeting →
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Button */}
          <Link href="/dashboard">
            <button className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors">
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
