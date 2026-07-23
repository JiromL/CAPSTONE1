'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, BookOpen, CheckCircle, Heart, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/utils/api';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getMenuItemsByRole } from '@/utils/navigation';
import { AppointmentConfirmation } from '@/components/AppointmentConfirmation';

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
  const [step, setStep] = useState<'terms' | 'personal_info' | 'distress_level' | 'concern' | 'urgency' | 'crisis' | 'appointment' | 'red_confirmation' | 'review' | 'complete'>('terms');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isInDistress, setIsInDistress] = useState<boolean | null>(null);
  
  // Concern selection
  const [selectedConcern, setSelectedConcern] = useState<string | null>(null);
  
  // Screening selection - checkboxes for which assessments to take
  const [selectedScreenings, setSelectedScreenings] = useState<Set<string>>(new Set());
  
  const [isUrgent, setIsUrgent] = useState<boolean | null>(null);
  const [urgencyLevel, setUrgencyLevel] = useState<'RED' | 'YELLOW' | 'GREEN' | null>(null);
  const [urgencyNotes, setUrgencyNotes] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');

  // Assessment tracking
  const [selectedAssessments, setSelectedAssessments] = useState<string[]>([]);
  const [currentAssessmentIdx, setCurrentAssessmentIdx] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [assessmentResponses, setAssessmentResponses] = useState<{[key: string]: number[]}>({});
  const [assessmentScores, setAssessmentScores] = useState<{[key: string]: number}>({});

  // Personal Information
  const [personalInfo, setPersonalInfo] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    birthday: '',
    gender: '',
    id_number: '',
    contact_number: '',
    personal_data_consent: false,
  });

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
  const [activeAppointmentError, setActiveAppointmentError] = useState<{
    hasError: boolean;
    message: string;
    appointmentTime?: string;
  }>({ hasError: false, message: '' });
  
  // Inline validation error for personal info step
  const [personalInfoError, setPersonalInfoError] = useState('');

  // Draft save status ('idle' | 'saving' | 'saved' | 'error')
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Available times for custom date selection
  const [availableTimes, setAvailableTimes] = useState<any[]>([]);
  const [isLoadingTimes, setIsLoadingTimes] = useState(false);
  const [availableDates, setAvailableDates] = useState<any[]>([]);
  const [isLoadingDates, setIsLoadingDates] = useState(false);
  const [minAvailableDate, setMinAvailableDate] = useState('');
  const [maxAvailableDate, setMaxAvailableDate] = useState('');

  // Distress-path slot selection
  type DistressSlot = { slot_id: string; slot_start: string; slot_end: string; counselor_id: string; counselor_name: string };
  const [distressSlots, setDistressSlots] = useState<DistressSlot[]>([]);
  const [distressSelectedSlotId, setDistressSelectedSlotId] = useState<string | null>(null);
  const [distressSlotsLoading, setDistressSlotsLoading] = useState(false);
  const [distressShowAllSlots, setDistressShowAllSlots] = useState(false);

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

    // Pre-fill known profile fields so the student doesn't re-type them
    setPersonalInfo(prev => ({
      ...prev,
      first_name: parsedUser.first_name || '',
      last_name: parsedUser.last_name || '',
      contact_number: parsedUser.phone || '',
      id_number: parsedUser.id_number || '',
    }));

    // Check for active appointments
    checkForActiveAppointments();

    // Load draft if it exists
    loadDraft();
  }, [router]);

  const checkForActiveAppointments = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(api('/api/appointments/active'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.has_active_appointment) {
          let appointmentTimeStr = 'Unknown';
          if (data.appointment_time) {
            appointmentTimeStr = new Date(data.appointment_time).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          }
          setActiveAppointmentError({
            hasError: true,
            message: `You already have an active appointment scheduled for ${appointmentTimeStr}. Please complete or cancel your existing appointment before booking a new one.`,
            appointmentTime: appointmentTimeStr
          });
        }
      }
    } catch (error) {
      console.error('Error checking for active appointments:', error);
    }
  };

  const loadDraft = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(api('/api/intake/draft/load'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.has_draft && data.draft) {
          const draft = data.draft;
          setHasDraft(true);
          setDraftId(draft._id);
          
          // Restore form data
          if (draft.form_data.personalInfo) {
            setPersonalInfo(draft.form_data.personalInfo);
          }
          if (draft.form_data.concern) setSelectedConcern(draft.form_data.concern);
          if (draft.form_data.selectedAssessments) setSelectedAssessments(draft.form_data.selectedAssessments);
          if (draft.form_data.assessmentResponses) setAssessmentResponses(draft.form_data.assessmentResponses);
          if (draft.form_data.assessmentScores) setAssessmentScores(draft.form_data.assessmentScores);
          if (draft.form_data.urgencyLevel) setUrgencyLevel(draft.form_data.urgencyLevel);
          if (draft.form_data.isUrgent !== null) setIsUrgent(draft.form_data.isUrgent);
          if (draft.form_data.urgencyNotes) setUrgencyNotes(draft.form_data.urgencyNotes);
          if (draft.form_data.consentGiven) setConsentGiven(draft.form_data.consentGiven);
          if (draft.form_data.isInDistress !== null) setIsInDistress(draft.form_data.isInDistress);
          if (draft.form_data.appointmentDate) setAppointmentDate(draft.form_data.appointmentDate);
          if (draft.form_data.appointmentTime) setAppointmentTime(draft.form_data.appointmentTime);
          if (draft.form_data.communicationMethod) setCommunicationMethod(draft.form_data.communicationMethod);
          if (draft.form_data.automaticAppointmentInfo) setAutomaticAppointmentInfo(draft.form_data.automaticAppointmentInfo);
          
          // Resume at last saved step
          setStep(draft.current_step);
        }
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  const saveDraft = async () => {
    setDraftStatus('saving');
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      if (!token) {
        setDraftStatus('error');
        return;
      }

      const draftData = {
        current_step: step,
        personalInfo: { ...personalInfo },
        isInDistress,
        concern: selectedConcern,
        selectedAssessments,
        assessmentResponses,
        assessmentScores,
        urgencyLevel,
        isUrgent,
        urgencyNotes,
        consentGiven,
        appointmentDate,
        appointmentTime,
        communicationMethod,
        automaticAppointmentInfo
      };

      const response = await fetch(api('/api/intake/draft/save'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(draftData)
      });

      if (response.ok) {
        const result = await response.json();
        setDraftId(result.draft_id);
        setDraftStatus('saved');
        setTimeout(() => setDraftStatus('idle'), 3000);
      } else {
        setDraftStatus('error');
        setTimeout(() => setDraftStatus('idle'), 4000);
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      setDraftStatus('error');
      setTimeout(() => setDraftStatus('idle'), 4000);
    }
  };

  const deleteDraft = async () => {
    if (!draftId) return;
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(api(`/api/intake/draft/${draftId}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setHasDraft(false);
        setDraftId(null);
      }
    } catch (error) {
      console.error('Error deleting draft:', error);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  const menuItems = user ? getMenuItemsByRole(user.role) : [];

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

  // Calculate urgency level (RED, YELLOW, GREEN) based on assessment scores
  const calculateUrgencyLevel = (scores: {[key: string]: number}): 'RED' | 'YELLOW' | 'GREEN' => {
    // RED: PHQ-9 > 20 OR GAD-7 > 15 OR PSS > 30
    if ((scores.phq9 && scores.phq9 > 20) || (scores.gad7 && scores.gad7 > 15) || (scores.pss && scores.pss > 30)) {
      return 'RED';
    }
    
    // YELLOW: PHQ-9 > 15 OR GAD-7 > 12 OR PSS > 20
    if ((scores.phq9 && scores.phq9 > 15) || (scores.gad7 && scores.gad7 > 12) || (scores.pss && scores.pss > 20)) {
      return 'YELLOW';
    }
    
    // GREEN: Below all thresholds
    return 'GREEN';
  };

  // Handle distress level selection
  const handleDistressLevel = async (inDistress: boolean) => {
    setIsInDistress(inDistress);
    if (inDistress) {
      setSelectedConcern('personal');
      setIsUrgent(true);
      setUrgencyLevel('RED');
      setAssessmentScores({ phq9: 30, gad7: 21, pss: 40 });
      setAutoSuggestedDate('same_day');
      setAppointmentOverridden(true);

      // Fetch open counselor slots and auto-select the earliest
      setDistressSlotsLoading(true);
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        const r = await fetch(api('/api/appointments/open-slots?days=7'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r.ok) {
          const d = await r.json();
          const flat: DistressSlot[] = (d.counselors || [])
            .flatMap((c: any) =>
              (c.slots || []).map((s: any) => ({
                slot_id: s.slot_id,
                slot_start: s.slot_start,
                slot_end: s.slot_end,
                counselor_id: c.counselor_id,
                counselor_name: c.counselor_name,
              }))
            )
            .sort((a: DistressSlot, b: DistressSlot) =>
              new Date(a.slot_start).getTime() - new Date(b.slot_start).getTime()
            );
          setDistressSlots(flat);
          if (flat.length > 0) {
            const earliest = flat[0];
            setDistressSelectedSlotId(earliest.slot_id);
            setAppointmentDate(earliest.slot_start.split('T')[0]);
            setAppointmentTime(earliest.slot_start.split('T')[1]?.slice(0, 5) || '09:00');
          }
        }
      } catch {}
      setDistressSlotsLoading(false);

      setTimeout(() => setStep('appointment'), 100);
    } else {
      // If can wait: proceed to concern selection for assessment
      setStep('concern');
    }
  };

  // Handle concern selection and move directly to appointment scheduling
  const handleConcernSelection = () => {
    if (!selectedConcern) {
      alert('Please select a concern');
      return;
    }
    // Assessments are conducted by the intake counselor, not the student
    if (!urgencyLevel) setUrgencyLevel('GREEN');
    setStep('appointment');
  };

  // Step after concern: go to appointment (assessments removed from student flow)
  const handleUrgencyResponse = (isEmergency: boolean) => {
    setIsUrgent(isEmergency);
    if (!urgencyLevel) setUrgencyLevel('GREEN');
    setStep('appointment');
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

  // Handle personal information changes
  const handlePersonalInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setPersonalInfo({
      ...personalInfo,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  // Validate personal information before proceeding
  const validatePersonalInfo = (): boolean => {
    setPersonalInfoError('');
    if (!personalInfo.first_name.trim()) {
      setPersonalInfoError('Please enter your first name');
      return false;
    }
    if (!personalInfo.last_name.trim()) {
      setPersonalInfoError('Please enter your last name');
      return false;
    }
    if (!personalInfo.birthday) {
      setPersonalInfoError('Please enter your birthday');
      return false;
    }
    if (!personalInfo.gender) {
      setPersonalInfoError('Please select your gender');
      return false;
    }
    if (!personalInfo.id_number.trim()) {
      setPersonalInfoError('Please enter your ID number');
      return false;
    }
    if (!/^\d{8}$/.test(personalInfo.id_number.trim())) {
      setPersonalInfoError('ID number must be exactly 8 digits (e.g. 11234567)');
      return false;
    }
    if (!personalInfo.contact_number.trim()) {
      setPersonalInfoError('Please enter your contact number');
      return false;
    }
    if (!personalInfo.personal_data_consent) {
      setPersonalInfoError('Please consent to the collection and use of your personal data to continue');
      return false;
    }
    return true;
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
    
    // Calculate urgency level based on thresholds
    const urgency = calculateUrgencyLevel(scores);
    setUrgencyLevel(urgency);
    
    // Set urgency to true if RED, false otherwise
    const isUrgent = urgency === 'RED';
    setIsUrgent(isUrgent);
    
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

  // Generate available 30-min time slots for intake counselor
  const generateAvailableSlots = () => {
    const slots: string[] = [];
    const startHour = 9; // 9 AM
    const endHour = 17; // 5 PM
    
    for (let hour = startHour; hour < endHour; hour++) {
      slots.push(`${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`);
      if (hour < endHour - 1) {
        slots.push(`${hour > 12 ? hour - 12 : hour}:30 ${hour >= 12 ? 'PM' : 'AM'}`);
      }
    }
    setAvailableTimeSlots(slots);
    if (slots.length > 0) {
      setSelectedTimeSlot(slots[0]);
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
          setAutomaticAppointmentInfo(data);
          
          // Extract date part from ISO format (YYYY-MM-DD)
          const automaticDateOnly = data.automatic_date.split('T')[0];
          const minDateOnly = data.min_selectable_date_formatted || data.min_selectable_date.split('T')[0];
          
          setMinSelectableDate(minDateOnly);
          setAutoSuggestedDate(data.automatic_date_formatted);
          setAppointmentDate(automaticDateOnly); // Pre-fill with automatic date (YYYY-MM-DD)
          setAppointmentTime(data.appointment_time || '10:00'); // Set the suggested time
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

  // Fetch available times for a selected date
  const fetchAvailableTimesForDate = async (date: string) => {
    if (!date) {
      setAvailableTimes([]);
      return;
    }
    
    setIsLoadingTimes(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      
      const response = await fetch(api(`/api/intake/available-times-for-date?date=${date}`), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableTimes(data.available_times || []);
        
        // Auto-select first available time
        if (data.available_times && data.available_times.length > 0) {
          setAppointmentTime(data.available_times[0].time);
        } else {
          setAppointmentTime('');
        }
      } else {
        console.error('❌ Failed to fetch available times:', response.status);
        setAvailableTimes([]);
      }
    } catch (error) {
      console.error('❌ Error fetching available times:', error);
      setAvailableTimes([]);
    } finally {
      setIsLoadingTimes(false);
    }
  };

  // Fetch available dates (only dates with slots)
  const fetchAvailableDates = async () => {
    setIsLoadingDates(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');

      const response = await fetch(api(`/api/intake/available-dates?days=30`), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableDates(data.available_dates || []);

        if (data.available_dates && data.available_dates.length > 0) {
          setMinAvailableDate(data.available_dates[0].date);
          setMaxAvailableDate(data.available_dates[data.available_dates.length - 1].date);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching available dates:', error);
    } finally {
      setIsLoadingDates(false);
    }
  };

  // Calculate automatic appointment when entering appointment step
  useEffect(() => {
    if (step === 'appointment' && !automaticAppointmentInfo && selectedAssessments.length > 0) {
      calculateAppointment();
    }
    
    // Load available dates for selection
    if (step === 'appointment') {
      fetchAvailableDates();
    }
    
    // Generate available time slots for RED/YELLOW urgency
    if (step === 'appointment' && (urgencyLevel === 'RED' || urgencyLevel === 'YELLOW')) {
      generateAvailableSlots();
    }
  }, [step, automaticAppointmentInfo, selectedAssessments.length, urgencyLevel]);

  // Submit intake
  const handleSubmitIntake = async () => {
    // Refresh appointment check before submission
    // This catches the edge case where user booked in another tab
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      if (token) {
        const response = await fetch(api('/api/appointments/active'), {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.has_active_appointment) {
            let appointmentTimeStr = 'Unknown';
            if (data.appointment_time) {
              appointmentTimeStr = new Date(data.appointment_time).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
            }
            const errorMsg = `You already have an active appointment scheduled for ${appointmentTimeStr}. Please complete or cancel your existing appointment before booking a new one.`;
            alert('⚠️ ' + errorMsg);
            setActiveAppointmentError({
              hasError: true,
              message: errorMsg,
              appointmentTime: appointmentTimeStr
            });
            setIsSubmitting(false);
            return;
          }
        }
      }
    } catch (error) {
      console.error('⚠️ Error refreshing appointment check:', error);
      // Don't block submission on check error, continue
    }

    // Validate required fields
    if (!selectedConcern) {
      alert('❌ Please select your primary concern');
      setStep('concern');
      return;
    }

    if (!appointmentDate) {
      alert('❌ Please select an appointment date');
      setStep('appointment');
      return;
    }

    if (!appointmentTime) {
      alert('❌ Please select an appointment time');
      setStep('appointment');
      return;
    }

    if (!consentGiven) {
      alert('Please provide consent to proceed');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      
      if (!token) {
        alert('❌ No authentication token found! Please log in again.');
        setIsSubmitting(false);
        return;
      }

      const payload: any = {
        purpose: selectedConcern,
        is_emergency: isUrgent,
        emergency_notes: urgencyNotes,
        consent_given: true,
        preferred_platform: communicationMethod,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        appointment_override: appointmentOverridden,
        automatic_appointment_date: automaticAppointmentInfo?.automatic_date,
        distress_slot_id: distressSelectedSlotId || undefined,
        // Personal Information
        first_name: personalInfo.first_name,
        middle_name: personalInfo.middle_name,
        last_name: personalInfo.last_name,
        birthday: personalInfo.birthday,
        gender: personalInfo.gender,
        id_number: personalInfo.id_number,
        contact_number: personalInfo.contact_number,
      };

      // Add assessment responses
      selectedAssessments.forEach(assessment => {
        payload[`${assessment}_responses`] = assessmentResponses[assessment];
      });

      // Try to get token from localStorage (check both keys for compatibility)
      let finalToken = localStorage.getItem('token') || localStorage.getItem('access_token');
      const endpoint = api('/api/intake/submit');
      
      
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

      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.replace('/login');
          return;
        }

        const errorData = await response.json();
        console.error('❌ API ERROR:', response.status);
        console.error('   Error response:', errorData);

        // Handle 409 Conflict - student already has active appointment or pending intake
        if (response.status === 409) {
          const mainError = errorData.error || 'Conflict detected';
          const detailMessage = errorData.message || '';
          const fullMessage = detailMessage || mainError;
          
          setActiveAppointmentError({
            hasError: true,
            message: fullMessage,
            appointmentTime: errorData.existing_appointment_status || errorData.existing_intake_status
          });
          
          alert('⚠️ ' + fullMessage);
          setIsSubmitting(false);
          return;
        }
        
        // Handle 400 Bad Request - includes past date validation
        if (response.status === 400) {
          const message = errorData.error || 'Invalid request. Please check your information and try again.';
          alert('⚠️ ' + message);
          setIsSubmitting(false);
          return;
        }
        
        throw new Error(`Failed to submit intake: ${errorData.error || response.status}`);
      }

      const data = await response.json();
      
      // Check if appointment is null, undefined, or has the wrong structure
      if (!data.appointment) {
        console.error('❌ CRITICAL: data.appointment is', data.appointment);
        console.error('   Full response:', data);
        console.error('   Check if API is returning appointment object');
      }
      
      if (data.appointment) {
      } else {
      }
      
      setCounselingId(data.counseling_id);
      setAppointmentData(data.appointment);
      setStep('complete');
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

  // ERROR: ACTIVE APPOINTMENT CHECK
  // ============================================
  if (activeAppointmentError.hasError) {
    return (
      <DashboardLayout
        user={user}
        onLogout={handleLogout}
        menuItems={menuItems}
        title="Intake Form"
        subtitle="Campus Counseling Services"
      >
        <div className="max-w-2xl mx-auto py-8">
          <div className="p-6 rounded-lg" style={{ background: 'var(--color-danger-surface)', border: '2px solid var(--color-danger)' }}>
            <div className="flex gap-4">
              <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-danger)' }} />
              <div className="flex-1">
                <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--color-danger-text)' }}>
                  Cannot Book Another Appointment
                </h2>
                <p className="mb-4 leading-relaxed" style={{ color: 'var(--color-danger-text)' }}>
                  {activeAppointmentError.message}
                </p>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="px-6 py-2 text-white font-medium rounded transition"
                    style={{ background: 'var(--color-danger)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-danger-hover)'}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-danger)'}
                  >
                    Return to Dashboard
                  </button>
                  <button
                    onClick={() => router.push('/my-appointments')}
                    className="px-6 py-2 font-medium rounded transition"
                    style={{ border: '1px solid var(--color-danger)', color: 'var(--color-danger)', background: 'transparent' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-danger-surface)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    View My Appointment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

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
        <div className="max-w-2xl mx-auto">
          {/* Header Section */}
          <div className="mb-8 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Step 4 of 8</span>
            <h1 className="text-xl font-semibold mt-2 mb-1" style={{ color: 'var(--color-text-primary)' }}>What brings you in today?</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Select your primary concern</p>
          </div>

          {/* Concern Cards */}
          <div className="space-y-2 mb-6">
            {Object.entries(CONCERN_TYPES).map(([key, concern]) => (
              <button
                key={key}
                onClick={() => setSelectedConcern(key)}
                className="w-full p-4 rounded border text-left transition"
                style={selectedConcern === key
                  ? { background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary)' }
                  : { background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                onMouseEnter={e => { if (selectedConcern !== key) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg)'; }}
                onMouseLeave={e => { if (selectedConcern !== key) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-surface)'; }}
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {concern.label}
                  </p>
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={selectedConcern === key
                      ? { borderColor: 'var(--color-primary)', background: 'var(--color-primary)' }
                      : { borderColor: 'var(--color-border-strong)' }}>
                    {selectedConcern === key && <span className="text-white text-xs">✓</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep('terms')}
              className="flex-1 px-4 py-2 font-medium rounded transition"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', background: 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              Back
            </button>
            <button
              disabled={!selectedConcern}
              onClick={handleConcernSelection}
              className="flex-1 px-4 py-2 text-white font-medium rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--color-primary)' }}
              onMouseEnter={e => { if (!(e.currentTarget as HTMLButtonElement).disabled) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)'; }}
              onMouseLeave={e => { if (!(e.currentTarget as HTMLButtonElement).disabled) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'; }}
            >
              Continue
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ============================================
  // STEP 0: TERMS AND CONDITIONS
  // ============================================
  if (step === 'terms') {
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
          <div className="mb-8 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Step 1 of 8</span>
            <h1 className="text-xl font-semibold mt-2 mb-1" style={{ color: 'var(--color-text-primary)' }}>Terms and Conditions</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Please read and accept to proceed</p>
          </div>

          {/* Terms Content */}
          <div className="space-y-6 mb-8 max-h-96 overflow-y-auto p-6 rounded" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            {/* English Section */}
            <div>
              <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>Terms and Conditions</h2>
              <div className="space-y-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <div>
                  <p className="font-medium mb-2">Urgency-Based & First Come, First Served Basis</p>
                  <p>This appointment and scheduling system allocates slots based on urgency level (determined by assessment responses) and then on a first come, first served basis within each priority level. Appointments with higher urgency will be prioritized. There is no guarantee that a slot will always be available for a user's first choice for an appointment schedule.</p>
                </div>
                <div>
                  <p className="font-medium mb-2">Accuracy of Information</p>
                  <p>Users accept the responsibility for providing, checking and verifying the validity and accuracy of the information they provide on this system in connection with their registration and consent to collect and use of their personal information for Government to conduct checks and validation against existing and previous medical applications.</p>
                </div>
                <div>
                  <p className="font-medium mb-2">System Abuse</p>
                  <p>Users who are found to have abused the system will be blocked from securing an appointment.</p>
                </div>
              </div>
            </div>

            {/* Tagalog Section */}
            <hr style={{ borderColor: 'var(--color-border)' }} />
            <div>
              <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>Mga Tuntunin at Kundisyon</h2>
              <div className="space-y-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <div>
                  <p className="font-medium mb-2">Basis ng Urgency at First Come, First Served</p>
                  <p>Ang sistema ng appointment at pag-iskedyul na ito ay nagbibigay ng mga slot batay sa antas ng urgency (na tinutukoy ng responses sa assessment) at pagkatapos ay "first come, first served" na paraan sa loob ng bawat priority level. Ang mga appointment na may mas mataas na urgency ay magiging priority. Hindi garantisado na laging may available na slot para sa unang pinili ng user na oras ng appointment.</p>
                </div>
                <div>
                  <p className="font-medium mb-2">Katumpakan ng Impormasyon</p>
                  <p>Responsibilidad ng mga user ang magbigay, mag-check, at mag-verify ng katumpakan at kawastuhan ng impormasyong ibinibigay nila sa sistemang ito kaugnay ng kanilang rehistrasyon at pahintulot sa pagkolekta at paggamit ng kanilang personal na impormasyon para sa pagsasagawa ng mga pagsusuri at pag-validate ng Gobyerno laban sa mga kasalukuyan at nakaraang aplikasyong medika.</p>
                </div>
                <div>
                  <p className="font-medium mb-2">Paggamit ng Sistema</p>
                  <p>Ang mga user na mapapatunayang nag-abuso sa sistema ay babawalan na makakuha ng appointment.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Acceptance Section */}
          <div className="p-4 rounded-lg mb-8" style={{ background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary-muted)' }}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="w-5 h-5 mt-1 rounded"
              />
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <span className="font-medium block mb-1" style={{ color: 'var(--color-text-primary)' }}>I have read and understood the instructions and information on this page</span>
                I agree to the Terms and Conditions on the use of this online appointment and scheduling system.
                <span className="block mt-2 text-xs italic">Nabasa at naunawaan ko ang mga instruksyon at impormasyon sa pahinang ito, at sumasang-ayon ako sa mga Tuntunin at Kundisyon sa paggamit ng online appointment at scheduling system na ito.</span>
                <span className="font-semibold" style={{ color: 'var(--color-danger)' }}> *</span>
              </span>
            </label>
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => router.back()}
              className="flex-1 px-4 py-2 font-medium rounded transition"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', background: 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              Back
            </button>
            <button
              disabled={!termsAccepted}
              onClick={() => setStep('personal_info')}
              className="flex-1 px-4 py-2 text-white font-medium rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--color-primary)' }}
              onMouseEnter={e => { if (!(e.currentTarget as HTMLButtonElement).disabled) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)'; }}
              onMouseLeave={e => { if (!(e.currentTarget as HTMLButtonElement).disabled) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'; }}
            >
              I Accept & Continue
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
          <div className="mb-8 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Step 6 of 8</span>
            <h1 className="text-xl font-semibold mt-2 mb-1" style={{ color: 'var(--color-text-primary)' }}>How urgent is your situation?</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>This helps us prioritize your support</p>
          </div>

          {/* Urgency Options */}
          <div className="space-y-2 mb-6">
            {/* Not Urgent */}
            <button
              onClick={() => setIsUrgent(false)}
              className="w-full p-4 rounded border text-left transition"
              style={isUrgent === false
                ? { background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary)' }
                : { background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              onMouseEnter={e => { if (isUrgent !== false) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg)'; }}
              onMouseLeave={e => { if (isUrgent !== false) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-surface)'; }}
            >
              <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>I can wait</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>Schedule an appointment within a week</p>
            </button>

            {/* Urgent */}
            <button
              onClick={() => setIsUrgent(true)}
              className="w-full p-4 rounded border text-left transition"
              style={isUrgent === true
                ? { background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary)' }
                : { background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              onMouseEnter={e => { if (isUrgent !== true) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg)'; }}
              onMouseLeave={e => { if (isUrgent !== true) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-surface)'; }}
            >
              <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>I need help soon</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>I'd like support as soon as possible</p>
            </button>
          </div>

          {/* Optional Notes for Urgent Cases */}
          {isUrgent && (
            <div className="mb-6 p-4 rounded" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
              <label className="block text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
                Additional details (optional)
              </label>
              <textarea
                value={urgencyNotes}
                onChange={(e) => setUrgencyNotes(e.target.value)}
                className="w-full px-3 py-2 rounded text-sm outline-none transition"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', resize: 'none' }}
                rows={3}
                placeholder="Share additional details..."
              />
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep('concern')}
              className="flex-1 px-4 py-2 font-medium rounded transition"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', background: 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              Back
            </button>
            <button
              disabled={isUrgent === null}
              onClick={() => handleUrgencyResponse(isUrgent === true)}
              className="flex-1 px-4 py-2 text-white font-medium rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--color-primary)' }}
              onMouseEnter={e => { if (!(e.currentTarget as HTMLButtonElement).disabled) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)'; }}
              onMouseLeave={e => { if (!(e.currentTarget as HTMLButtonElement).disabled) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'; }}
            >
              Continue
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
          <div className="mb-8 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Step 6 of 7</span>
            <h1 className="text-xl font-semibold mt-2 mb-1" style={{ color: 'var(--color-text-primary)' }}>Resources Available</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Multiple ways to get help</p>
          </div>

          {/* Quick Access Resources */}
          <div className="space-y-3 mb-6">
            {/* 24/7 Crisis Line */}
            <div className="p-4 rounded" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
              <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>24/7 Helpline</p>
              <p className="text-lg font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>988 Suicide & Crisis Lifeline</p>
              <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>Available anytime for support</p>
              <a
                href="tel:988"
                className="block w-full px-3 py-2 text-white font-medium rounded text-center text-sm transition"
                style={{ background: 'var(--color-primary)' }}
                onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'var(--color-primary-hover)')}
                onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'var(--color-primary)')}
              >
                Call 988
              </a>
            </div>

            {/* Campus Security */}
            <div className="p-4 rounded" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
              <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>Campus Emergency</p>
              <p className="text-lg font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>Call 911</p>
              <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>For immediate emergencies</p>
              <a
                href="tel:911"
                className="block w-full px-3 py-2 text-white font-medium rounded text-center text-sm transition"
                style={{ background: 'var(--color-primary)' }}
                onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'var(--color-primary-hover)')}
                onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'var(--color-primary)')}
              >
                Call Emergency
              </a>
            </div>

            {/* CPS Direct Line (if Business Hours) */}
            {isBusinessHours && (
              <div className="p-4 rounded" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>Campus Counseling (Business Hours)</p>
                <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>Monday - Friday, 9 AM - 5 PM</p>
                <button
                  onClick={() => setStep('appointment')}
                  className="w-full px-3 py-2 text-white font-medium rounded text-sm transition"
              style={{ background: 'var(--color-primary)' }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)')}
                >
                  Schedule Appointment
                </button>
              </div>
            )}

            {/* Crisis Chat */}
            <a
              href="https://suicidepreventionlifeline.org/chat"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded transition"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'var(--color-bg)')}
              onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'var(--color-surface)')}
            >
              <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>24/7 Support</p>
              <p className="font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>Crisis Chat</p>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Talk online with a counselor</p>
            </a>
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep('urgency')}
              className="flex-1 px-4 py-2 font-medium rounded transition"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', background: 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              Back
            </button>
            <button
              onClick={() => setStep('appointment')}
              className="flex-1 px-4 py-2 text-white font-medium rounded transition"
              style={{ background: 'var(--color-primary)' }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)')}
            >
              Continue
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ============================================
  // STEP 5: PERSONAL INFORMATION
  // ============================================
  if (step === 'personal_info') {
    return (
      <DashboardLayout
        user={user}
        onLogout={handleLogout}
        menuItems={menuItems}
        title="Intake Form"
        subtitle="Campus Counseling Services"
      >
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Step 2 of 8</span>
            <h1 className="text-xl font-semibold mt-2 mb-1" style={{ color: 'var(--color-text-primary)' }}>Personal Information</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Please provide your contact details to get started</p>
          </div>

          <div className="space-y-4 mb-6">
            {/* Name Row - First, Middle, Last */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  First Name <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={personalInfo.first_name}
                  onChange={handlePersonalInfoChange}
                  placeholder="John"
                  className="w-full px-3 py-2 text-sm rounded-lg outline-none transition"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  Middle Name
                </label>
                <input
                  type="text"
                  name="middle_name"
                  value={personalInfo.middle_name}
                  onChange={handlePersonalInfoChange}
                  placeholder="Christopher (optional)"
                  className="w-full px-3 py-2 text-sm rounded-lg outline-none transition"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  Last Name <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={personalInfo.last_name}
                  onChange={handlePersonalInfoChange}
                  placeholder="Doe"
                  className="w-full px-3 py-2 text-sm rounded-lg outline-none transition"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                />
              </div>
            </div>

            {/* Birthday and Gender Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  Birthday <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input
                  type="date"
                  name="birthday"
                  value={personalInfo.birthday}
                  onChange={handlePersonalInfoChange}
                  className="w-full px-3 py-2 text-sm rounded-lg outline-none transition"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  Gender <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <select
                  name="gender"
                  value={personalInfo.gender}
                  onChange={handlePersonalInfoChange}
                  className="w-full px-3 py-2 text-sm rounded-lg outline-none transition"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
            </div>

            {/* ID Number Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  ID Number <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  name="id_number"
                  value={personalInfo.id_number}
                  onChange={handlePersonalInfoChange}
                  placeholder="11234567"
                  maxLength={8}
                  className="w-full px-3 py-2 text-sm rounded-lg outline-none transition"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Must be 8 digits (e.g., 11234567)</p>
              </div>
            </div>

            {/* Email and Contact Number Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  Email (from your account)
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-3 py-2 text-sm rounded-lg cursor-not-allowed"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>This cannot be changed during intake</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  Contact Number <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input
                  type="tel"
                  name="contact_number"
                  value={personalInfo.contact_number}
                  onChange={handlePersonalInfoChange}
                  placeholder="+63 9 XX XXX XXXX"
                  className="w-full px-3 py-2 text-sm rounded-lg outline-none transition"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                />
              </div>
            </div>

            {/* Consent Section */}
            <div className="p-4 rounded-lg" style={{ background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary-muted)' }}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="personal_data_consent"
                  checked={personalInfo.personal_data_consent}
                  onChange={handlePersonalInfoChange}
                  className="w-5 h-5 mt-1 rounded"
                />
                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  <span className="font-medium block mb-1" style={{ color: 'var(--color-text-primary)' }}>I consent to the collection and use of my personal data</span>
                  I understand that my personal information (name, contact details, address) will be collected and securely stored. This information will be used only for counseling services administration and will not be shared outside of authorized university staff without my consent. I acknowledge the counseling center's privacy practices.
                  <span className="font-semibold" style={{ color: 'var(--color-danger)' }}> *</span>
                </span>
              </label>
            </div>
          </div>

          {/* Inline validation error */}
          {personalInfoError && (
            <div className="mb-4 flex items-center gap-2 p-3 rounded-lg text-sm" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)', color: 'var(--color-danger-text)' }}>
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" /></svg>
              {personalInfoError}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep('concern')}
              className="flex-1 px-4 py-2 font-medium rounded transition"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', background: 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              Back
            </button>
            <button
              onClick={() => {
                if (validatePersonalInfo()) {
                  setPersonalInfoError('');
                  setStep('distress_level');
                }
              }}
              className="flex-1 px-4 py-2 text-white font-medium rounded transition"
              style={{ background: 'var(--color-primary)' }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)')}
            >
              Continue
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ============================================
  // STEP 3: DISTRESS / ASSISTANCE LEVEL
  // ============================================
  if (step === 'distress_level') {
    return (
      <DashboardLayout
        user={user}
        onLogout={handleLogout}
        menuItems={menuItems}
        title="Intake Form"
        subtitle="Campus Counseling Services"
      >
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Step 3 of 8</span>
            <h1 className="text-xl font-semibold mt-2 mb-1" style={{ color: 'var(--color-text-primary)' }}>Do you need assistance right away?</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>This helps us prioritize your appointment scheduling</p>
          </div>

          {/* Options */}
          <div className="space-y-3 mb-8">
            {/* In Distress Option */}
            {/* In distress: kept fixed red (crisis-UI) */}
            <button
              onClick={() => handleDistressLevel(true)}
              className="w-full p-6 rounded border-2 text-left transition"
              style={isInDistress === true
                ? { background: '#FEF2F2', borderColor: '#F87171' }
                : { background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
              onMouseEnter={e => { if (isInDistress !== true) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg)'; }}
              onMouseLeave={e => { if (isInDistress !== true) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-surface)'; }}
            >
              <div className="flex items-start justify-between">
                <div className="text-left">
                  <p className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Yes, I&apos;m in distress and need assistance ASAP</p>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    I&apos;m experiencing a crisis or urgent mental health concern and need immediate support within 30 minutes
                  </p>
                </div>
                <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1"
                  style={isInDistress === true
                    ? { borderColor: '#F87171', background: '#F87171' }
                    : { borderColor: 'var(--color-border-strong)' }}>
                  {isInDistress === true && <span className="text-white text-lg">✓</span>}
                </div>
              </div>
            </button>

            {/* Can Wait Option */}
            <button
              onClick={() => handleDistressLevel(false)}
              className="w-full p-6 rounded border-2 text-left transition"
              style={isInDistress === false
                ? { background: 'var(--color-primary-surface)', borderColor: 'var(--color-primary)' }
                : { background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
              onMouseEnter={e => { if (isInDistress !== false) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg)'; }}
              onMouseLeave={e => { if (isInDistress !== false) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-surface)'; }}
            >
              <div className="flex items-start justify-between">
                <div className="text-left">
                  <p className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>No, I can wait for an appointment</p>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    I&apos;m experiencing challenges but not in immediate crisis. I&apos;m flexible with scheduling based on availability
                  </p>
                </div>
                <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1"
                  style={isInDistress === false
                    ? { borderColor: 'var(--color-primary)', background: 'var(--color-primary)' }
                    : { borderColor: 'var(--color-border-strong)' }}>
                  {isInDistress === false && <span className="text-white text-lg">✓</span>}
                </div>
              </div>
            </button>
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep('personal_info')}
              className="flex-1 px-4 py-2 font-medium rounded transition"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', background: 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              Back
            </button>
            <button
              disabled={isInDistress === null}
              onClick={() => {
                if (isInDistress === false) {
                  setStep('concern');
                }
                // If true, handleDistressLevel already navigated to appointment
              }}
              className="flex-1 px-4 py-2 text-white font-medium rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--color-primary)' }}
              onMouseEnter={e => { if (!(e.currentTarget as HTMLButtonElement).disabled) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)'; }}
              onMouseLeave={e => { if (!(e.currentTarget as HTMLButtonElement).disabled) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'; }}
            >
              Continue
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ============================================
  // STEP 6: SCHEDULE APPOINTMENT
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
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Step 7 of 8</span>
            <h1 className="text-xl font-semibold mt-2 mb-1" style={{ color: 'var(--color-text-primary)' }}>Schedule Your Appointment</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Choose your preferred date and time</p>
          </div>

          {/* Appointment Info based on Urgency Level */}
          {automaticAppointmentInfo && (
            <div className="p-4 rounded mb-6" style={{
              border: `1px solid ${urgencyLevel === 'RED' ? '#F87171' : urgencyLevel === 'YELLOW' ? '#FCD34D' : 'var(--color-border)'}`,
              background: urgencyLevel === 'RED' ? '#FEF2F2' : urgencyLevel === 'YELLOW' ? '#FFFBEB' : 'var(--color-bg)'
            }}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                    {urgencyLevel === 'RED' ? '🔴 ' : urgencyLevel === 'YELLOW' ? '🟡 ' : '🟢 '}
                    {urgencyLevel === 'RED' || urgencyLevel === 'YELLOW' ? 'Recommended Appointment' : 'Suggested Appointment'}
                  </p>
                  <p className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {automaticAppointmentInfo.automatic_date_formatted}
                  </p>
                </div>
                <button
                  onClick={() => setAppointmentOverridden(!appointmentOverridden)}
                  className="px-2 py-1 text-xs font-medium rounded whitespace-nowrap transition"
                  style={{ background: 'var(--color-surface)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-surface)')}
                >
                  {appointmentOverridden ? 'Use Recommended' : 'Choose Different'}
                </button>
              </div>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {urgencyLevel === 'RED' 
                  ? 'Earliest available - highest priority' 
                  : urgencyLevel === 'YELLOW'
                  ? 'Earliest available - high priority'
                  : 'Based on your assessment results - you can customize'}
              </p>
            </div>
          )}

          {isCalculatingAppointment && (
            <div className="p-4 rounded mb-6 text-center text-sm" style={{ background: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}>
              Calculating appointment...
            </div>
          )}

          <div className="space-y-4 mb-6">

            {/* ── Distress path: slot picker ───────────────────── */}
            {isInDistress && (
              <div className="space-y-3">
                {distressSlotsLoading ? (
                  <div className="p-4 rounded text-sm flex items-center gap-2" style={{ border: '1px solid #F87171', background: '#FEF2F2', color: '#991B1B' }}>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                    Finding earliest available slot…
                  </div>
                ) : distressSlots.length === 0 ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-lg text-sm" style={{ border: '1px solid var(--color-warning)', background: 'var(--color-warning-surface)', color: 'var(--color-warning-text)' }}>
                      No counselor slots are currently open. Enter your preferred date and time — CPS will prioritize your request as urgent.
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Preferred Date</label>
                        <input
                          type="date"
                          value={appointmentDate}
                          onChange={e => setAppointmentDate(e.target.value)}
                          min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                          max={new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]}
                          className="w-full px-3 py-2 text-sm rounded-lg outline-none transition"
                          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Preferred Time</label>
                        <select
                          value={appointmentTime}
                          onChange={e => setAppointmentTime(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg outline-none transition"
                          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                        >
                          <option value="">Select a time</option>
                          {['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00'].map(t => (
                            <option key={t} value={t}>
                              {new Date(`1970-01-01T${t}`).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true })}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>For immediate crisis support, call <strong>988</strong> anytime.</p>
                  </div>
                ) : (
                  <>
                    {/* Auto-selected earliest slot */}
                    {(() => {
                      const sel = distressSlots.find(s => s.slot_id === distressSelectedSlotId) || distressSlots[0];
                      const start = new Date(sel.slot_start);
                      return (
                        <div className="p-4 border-2 rounded-lg" style={{ borderColor: '#F87171', background: '#FEF2F2' }}>
                          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#B91C1C' }}>🔴 Earliest Available</p>
                          <p className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                            {start.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'long', month: 'long', day: 'numeric' })}
                          </p>
                          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                            {start.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true })} · {sel.counselor_name}
                          </p>
                        </div>
                      );
                    })()}

                    {/* Toggle to see all slots */}
                    <button
                      type="button"
                      onClick={() => setDistressShowAllSlots(v => !v)}
                      className="text-sm font-medium hover:underline" style={{ color: 'var(--color-primary-text)' }}
                    >
                      {distressShowAllSlots ? '▲ Hide other slots' : '▼ Choose a different slot (optional)'}
                    </button>

                    {distressShowAllSlots && (
                      <div className="grid gap-2 max-h-64 overflow-y-auto pr-1">
                        {distressSlots.map(slot => {
                          const start = new Date(slot.slot_start);
                          const isSelected = slot.slot_id === distressSelectedSlotId;
                          return (
                            <button
                              key={slot.slot_id}
                              type="button"
                              onClick={() => {
                                setDistressSelectedSlotId(slot.slot_id);
                                setAppointmentDate(slot.slot_start.split('T')[0]);
                                setAppointmentTime(slot.slot_start.split('T')[1]?.slice(0, 5) || '09:00');
                              }}
                              className="flex items-center justify-between px-4 py-3 rounded-lg border-2 text-left transition-all"
                              style={isSelected
                                ? { borderColor: '#F87171', background: '#FEF2F2' }
                                : { borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                            >
                              <div>
                                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                  {start.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric' })}
                                </p>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                                  {start.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true })} · {slot.counselor_name}
                                </p>
                              </div>
                              {isSelected && <span className="text-sm font-bold" style={{ color: '#DC2626' }}>✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Use Recommended Time (Default) — non-distress path */}
            {!isInDistress && !appointmentOverridden && automaticAppointmentInfo && (
              <div className="p-3 rounded" style={{
                border: `1px solid ${urgencyLevel === 'RED' ? '#F87171' : urgencyLevel === 'YELLOW' ? '#FCD34D' : 'var(--color-primary-muted)'}`,
                background: urgencyLevel === 'RED' ? '#FEF2F2' : urgencyLevel === 'YELLOW' ? '#FFFBEB' : 'var(--color-primary-surface)'
              }}>
                <p className="text-sm font-medium mb-2" style={{
                  color: urgencyLevel === 'RED' ? '#991B1B' : urgencyLevel === 'YELLOW' ? '#92400E' : 'var(--color-primary-text)'
                }}>
                  ✓ {urgencyLevel === 'RED' || urgencyLevel === 'YELLOW' ? 'Using Recommended' : 'Using Suggested'} Appointment
                </p>
                <p className="text-sm" style={{
                  color: urgencyLevel === 'RED' ? '#B91C1C' : urgencyLevel === 'YELLOW' ? '#78350F' : 'var(--color-primary-text)'
                }}>
                  📅 <strong>{automaticAppointmentInfo.automatic_date_formatted}</strong> at <strong>{automaticAppointmentInfo.appointment_time}</strong>
                </p>
              </div>
            )}

            {/* Custom Date/Time Selection (When Overridden) — non-distress path only */}
            {!isInDistress && appointmentOverridden && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    Your Preferred Date
                  </label>

                  {isLoadingDates ? (
                    <div className="px-3 py-3 rounded text-sm flex items-center gap-2" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" style={{ color: 'var(--color-primary)' }}><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                      Loading available dates…
                    </div>
                  ) : availableDates.length > 0 ? (
                    <select
                      value={appointmentDate}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        setAppointmentDate(newDate);
                        fetchAvailableTimesForDate(newDate);
                      }}
                      className="w-full px-3 py-2 rounded text-sm outline-none transition"
                      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                    >
                      <option value="">— Select a date —</option>
                      {availableDates.map((date_option: any) => (
                        <option key={date_option.date} value={date_option.date}>
                          {date_option.formatted} ({date_option.day_name})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="px-4 py-3 rounded text-sm flex items-center justify-between gap-3"
                      style={{ background: 'var(--color-warning-surface)', border: '1px solid var(--color-warning)', color: 'var(--color-warning-text)' }}>
                      <span>No available dates found in the next 30 days.</span>
                      <button type="button" onClick={fetchAvailableDates}
                        className="text-xs font-medium hover:underline whitespace-nowrap"
                        style={{ color: 'var(--color-primary)' }}>
                        Retry
                      </button>
                    </div>
                  )}

                  {!isLoadingDates && availableDates.length > 0 && (
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      Only dates with available counselor slots are shown
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Time Selection - Shown when date is selected — non-distress path only */}
            {!isInDistress && appointmentOverridden && appointmentDate && (
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  Available Time Slots
                </label>
                {isLoadingTimes ? (
                  <div className="p-3 rounded text-center" style={{ background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary-muted)' }}>
                    <p className="text-sm" style={{ color: 'var(--color-primary)' }}>Loading available times...</p>
                  </div>
                ) : availableTimes.length > 0 ? (
                  <div className="space-y-2">
                    {availableTimes.map(timeSlot => (
                      <label key={timeSlot.datetime}
                      className="flex items-start p-4 rounded cursor-pointer transition"
                      style={appointmentTime === timeSlot.time
                        ? { background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary)' }
                        : { background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                        <input
                          type="radio"
                          name="time"
                          value={timeSlot.time}
                          checked={appointmentTime === timeSlot.time}
                          onChange={(e) => setAppointmentTime(e.target.value)}
                          className="mr-3 w-4 h-4 mt-1 flex-shrink-0"
                        />
                        <div className="flex-1">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{timeSlot.time}</span>
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                              style={timeSlot.available_counselors >= 3
                                ? { background: 'var(--color-success-surface)', color: 'var(--color-success-text)' }
                                : { background: 'var(--color-info-surface)', color: 'var(--color-info-text)' }}>
                              {timeSlot.available_counselors} counselor{timeSlot.available_counselors !== 1 ? 's' : ''} available
                            </span>
                          </div>
                          {timeSlot.counselor_details && timeSlot.counselor_details.length > 0 && (
                            <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                              <p className="mt-1">Available with:</p>
                              <div className="mt-1 ml-2 space-y-0.5">
                                {timeSlot.counselor_details.slice(0, 2).map((counselor: any, idx: number) => (
                                  <p key={idx} className="font-medium">• {counselor.counselor_name}</p>
                                ))}
                                {timeSlot.counselor_details.length > 2 && (
                                  <p className="font-medium">• +{timeSlot.counselor_details.length - 2} more</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded flex items-center justify-between gap-3"
                    style={{ background: 'var(--color-warning-surface)', border: '1px solid var(--color-warning)' }}>
                    <p className="text-sm" style={{ color: 'var(--color-warning-text)' }}>
                      Slots for this date just filled up. Please choose another date.
                    </p>
                    <button type="button"
                      onClick={() => { setAppointmentDate(''); setAvailableTimes([]); fetchAvailableDates(); }}
                      className="text-xs font-medium hover:underline whitespace-nowrap"
                      style={{ color: 'var(--color-primary)' }}>
                      Pick another
                    </button>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>How to Meet</label>
              <div className="space-y-2">
                {[
                  { value: 'zoom', label: 'Zoom Video Call' },
                  { value: 'google_meet', label: 'Google Meet' },
                  { value: 'in_person', label: 'In Person' }
                ].map(({ value, label }) => (
                  <label key={value}
                    className="flex items-center p-3 rounded text-sm cursor-pointer transition"
                    style={communicationMethod === value
                      ? { background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary)' }
                      : { background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <input
                      type="radio"
                      name="communication"
                      value={value}
                      checked={communicationMethod === value}
                      onChange={(e) => setCommunicationMethod(e.target.value as 'zoom' | 'google_meet' | 'in_person')}
                      className="mr-3 w-4 h-4"
                      style={{ accentColor: 'var(--color-primary)' }}
                    />
                    <span style={{ color: 'var(--color-text-primary)' }}>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-start p-3 rounded text-xs cursor-pointer transition"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              onMouseEnter={e => ((e.currentTarget as HTMLLabelElement).style.background = 'var(--color-bg)')}
              onMouseLeave={e => ((e.currentTarget as HTMLLabelElement).style.background = 'var(--color-surface)')}>
              <input type="checkbox" checked={consentGiven} onChange={(e) => setConsentGiven(e.target.checked)}
                className="mr-3 mt-0.5 w-4 h-4 flex-shrink-0"
                style={{ accentColor: 'var(--color-primary)' }} />
              <span style={{ color: 'var(--color-text-primary)' }}>
                I consent to my responses being used for assessment and to be contacted for my appointment. I understand I can call 988 anytime for crisis support.
              </span>
            </label>
          </div>

          {/* Navigation Buttons */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <button
                onClick={() => setStep('personal_info')}
                className="flex-1 px-4 py-2 font-medium rounded transition"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', background: 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                Back
              </button>
              <button
                onClick={() => {
                  // For RED cases, show confirmation screen first
                  if (urgencyLevel === 'RED') {
                    setStep('red_confirmation');
                  } else {
                    setStep('review');
                  }
                }}
                disabled={!appointmentDate || !appointmentTime || !consentGiven}
                className="flex-1 px-4 py-2 text-white font-medium rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--color-primary)' }}
              onMouseEnter={e => { if (!(e.currentTarget as HTMLButtonElement).disabled) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)'; }}
              onMouseLeave={e => { if (!(e.currentTarget as HTMLButtonElement).disabled) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'; }}
              >
                {urgencyLevel === 'RED' ? 'Confirm Assignment' : 'Review & Submit'}
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ============================================
  // STEP 5.5: RED CASE CONFIRMATION (High Risk Priority Confirmation)
  // ============================================
  if (step === 'red_confirmation') {
    const selectedTimeSlot = availableTimes.find(slot => slot.time === appointmentTime);
    
    return (
      <DashboardLayout
        user={user}
        onLogout={handleLogout}
        menuItems={menuItems}
        title="Intake Form"
        subtitle="Campus Counseling Services"
      >
        <div className="max-w-2xl mx-auto">
          <div className="rounded-lg overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            {/* Header */}
            <div className="text-white p-6 mb-6" style={{ background: '#B91C1C' }}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-4xl">🔴</span>
                <h1 className="text-2xl font-bold" style={{ color: 'white' }}>Priority Alert: Immediate Attention</h1>
              </div>
              <p style={{ color: '#FEF2F2' }}>Your assessment indicates a higher risk level requiring immediate support</p>
            </div>

            <div className="px-8 py-6 space-y-6">
              {/* Risk Level Explanation */}
              <div className="rounded-lg p-4" style={{ background: '#FEF2F2', border: '1px solid #F87171' }}>
                <h2 className="font-semibold mb-2" style={{ color: '#991B1B' }}>Why This Alert?</h2>
                <p className="text-sm" style={{ color: '#B91C1C' }}>
                  Based on your assessment responses, we've identified symptoms that require prompt professional attention. Your intake interview appointment has been marked as high-priority, and you'll be scheduled with one of our available counselors.
                </p>
              </div>

              {/* Appointment Confirmation */}
              <div className="rounded-lg p-4" style={{ background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary-muted)' }}>
                <h3 className="font-semibold mb-3" style={{ color: 'var(--color-primary-text)' }}>Your Appointment Details</h3>
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>📅 Date</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {appointmentDate ? new Date(appointmentDate).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'long', month: 'long', day: 'numeric' }) : '-'}
                    </span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>⏰ Time</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{appointmentTime}</span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>📞 Method</span>
                    <span className="text-sm font-semibold capitalize" style={{ color: 'var(--color-text-primary)' }}>{communicationMethod.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>

              {/* Available Counselors */}
              {selectedTimeSlot && selectedTimeSlot.counselor_details && (
                <div className="rounded-lg p-4" style={{ background: 'var(--color-success-surface)', border: '1px solid var(--color-success)' }}>
                  <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-success-text)' }}>
                    <span>👥</span> Available Counselors
                  </h3>
                  <div className="space-y-2">
                    {selectedTimeSlot.counselor_details.map((counselor: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 p-2 rounded" style={{ background: 'var(--color-surface)' }}>
                        <span className="w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold" style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary-text)' }}>
                          {idx + 1}
                        </span>
                        <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{counselor.counselor_name}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs mt-3" style={{ color: 'var(--color-success-text)' }}>
                    ✓ A counselor will be assigned to best match your needs
                  </p>
                </div>
              )}

              {/* Important Information */}
              <div className="rounded-lg p-4" style={{ background: 'var(--color-warning-surface)', border: '1px solid var(--color-warning)' }}>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--color-warning-text)' }}>📋 Important</h3>
                <ul className="text-sm space-y-1 list-disc list-inside" style={{ color: 'var(--color-warning-text)' }}>
                  <li>If you are in immediate crisis, please call 988 (Suicide & Crisis Lifeline)</li>
                  <li>Your counselor will follow up before your appointment to confirm details</li>
                  <li>You can reschedule if needed by contacting our office</li>
                </ul>
              </div>

              {/* Confirmation Buttons */}
              <div className="flex flex-col gap-3 pt-6" style={{ borderTop: '1px solid var(--color-border)' }}>
                <button
                  onClick={() => setStep('appointment')}
                  className="w-full px-4 py-2 font-medium rounded transition"
                  style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', background: 'transparent' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
                >
                  ← Go Back
                </button>
                <button
                  onClick={() => setStep('review')}
                  className="w-full px-4 py-3 text-white font-semibold rounded transition flex items-center justify-center gap-2"
                  style={{ background: '#DC2626' }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#B91C1C'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = '#DC2626'}
                >
                  <span>✓</span> Confirm & Proceed
                </button>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ============================================
  // STEP 6: REVIEW & SUMMARY
  // ============================================
  if (step === 'review') {
    return (
      <DashboardLayout
        user={user}
        onLogout={handleLogout}
        menuItems={menuItems}
        title="Intake Form"
        subtitle="Campus Counseling Services"
      >
        <div className="max-w-4xl mx-auto">
          <div className="rounded-lg overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            {/* Header */}
            <div className="text-white p-6 mb-6" style={{ background: 'var(--color-primary)' }}>
              <h1 className="text-3xl font-bold mb-2">Intake Assessment Form</h1>
              <p style={{ color: 'rgba(255,255,255,0.8)' }}>Please review all information carefully before submitting</p>
            </div>

            <div className="px-8 pb-8">
              {/* Info: PDF Export Available After Submission */}
              <div className="mb-6 p-4 rounded" style={{ background: 'var(--color-success-surface)', border: '1px solid var(--color-success)' }}>
                <p className="text-sm" style={{ color: 'var(--color-success-text)' }}>
                  <span className="font-semibold">📄 After submission:</span> You'll receive an official confirmation document that you can print or download as PDF, and a confirmation email will be sent to you.
                </p>
              </div>

              {/* Personal Information */}
              <div className="mb-8">
                <div className="text-white px-4 py-2 rounded mb-4" style={{ background: 'var(--color-primary)' }}>
                  <h2 className="font-bold text-lg">PERSONAL INFORMATION</h2>
                </div>
                <div className="rounded" style={{ border: '1px solid var(--color-border)' }}>
                  <div className="grid grid-cols-2 gap-0">
                    <div className="p-4" style={{ borderRight: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                      <p className="text-xs font-bold uppercase mb-1" style={{ color: 'var(--color-text-secondary)' }}>First Name</p>
                      <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{personalInfo.first_name || '-'}</p>
                    </div>
                    <div className="p-4" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                      <p className="text-xs font-bold uppercase mb-1" style={{ color: 'var(--color-text-secondary)' }}>Last Name</p>
                      <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{personalInfo.last_name || '-'}</p>
                    </div>
                    <div className="p-4" style={{ borderRight: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                      <p className="text-xs font-bold uppercase mb-1" style={{ color: 'var(--color-text-secondary)' }}>Birthday</p>
                      <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{personalInfo.birthday || '-'}</p>
                    </div>
                    <div className="p-4" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                      <p className="text-xs font-bold uppercase mb-1" style={{ color: 'var(--color-text-secondary)' }}>Gender</p>
                      <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{personalInfo.gender || '-'}</p>
                    </div>
                    <div className="p-4" style={{ borderRight: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                      <p className="text-xs font-bold uppercase mb-1" style={{ color: 'var(--color-text-secondary)' }}>ID Number</p>
                      <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{personalInfo.id_number || '-'}</p>
                    </div>
                    <div className="p-4" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                      <p className="text-xs font-bold uppercase mb-1" style={{ color: 'var(--color-text-secondary)' }}>Contact Number</p>
                      <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{personalInfo.contact_number || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Appointment Details */}
              <div className="mb-8">
                <div className="text-white px-4 py-2 rounded mb-4" style={{ background: 'var(--color-primary)' }}>
                  <h2 className="font-bold text-lg">APPOINTMENT DETAILS</h2>
                </div>
                <div className="rounded" style={{ border: '1px solid var(--color-border)' }}>
                  <div className="grid grid-cols-2 gap-0">
                    <div className="p-4" style={{ borderRight: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                      <p className="text-xs font-bold uppercase mb-1" style={{ color: 'var(--color-text-secondary)' }}>Scheduled Date</p>
                      {!appointmentDate ? (
                        <p className="font-medium" style={{ color: 'var(--color-danger)' }}>Required: Select a date</p>
                      ) : (
                        <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{new Date(appointmentDate).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      )}
                    </div>
                    <div className="p-4" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                      <p className="text-xs font-bold uppercase mb-1" style={{ color: 'var(--color-text-secondary)' }}>Time</p>
                      {!appointmentTime ? (
                        <p className="font-medium" style={{ color: 'var(--color-danger)' }}>Required: Select a time</p>
                      ) : (
                        <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{appointmentTime}</p>
                      )}
                    </div>
                    <div className="p-4" style={{ borderRight: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                      <p className="text-xs font-bold uppercase mb-1" style={{ color: 'var(--color-text-secondary)' }}>Communication Method</p>
                      <p className="font-medium capitalize" style={{ color: 'var(--color-text-primary)' }}>{communicationMethod.replace('_', ' ')}</p>
                    </div>
                    <div className="p-4" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                      <p className="text-xs font-bold uppercase mb-1" style={{ color: 'var(--color-text-secondary)' }}>Concern</p>
                      <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{selectedConcern ? (CONCERN_TYPES[selectedConcern as keyof typeof CONCERN_TYPES]?.label || selectedConcern) : '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assessments */}
              {selectedAssessments.length > 0 && (
                <div className="mb-8">
                  <div className="text-white px-4 py-2 rounded mb-4" style={{ background: 'var(--color-primary)' }}>
                    <h2 className="font-bold text-lg">SCREENING ASSESSMENTS COMPLETED</h2>
                  </div>
                  <div className="rounded p-4" style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                    <div className="space-y-2">
                      {selectedAssessments.map(assessment => (
                        <div key={assessment} className="flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                          <span style={{ color: 'var(--color-success)' }}>✓</span>
                          {ASSESSMENTS[assessment as keyof typeof ASSESSMENTS]?.name || assessment}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Important Notes */}
              <div className="mb-8">
                <div className="text-white px-4 py-2 rounded mb-4" style={{ background: 'var(--color-primary)' }}>
                  <h2 className="font-bold text-lg">IMPORTANT NOTES</h2>
                </div>
                <ul className="space-y-2 list-none" style={{ color: 'var(--color-text-secondary)' }}>
                  <li>• All information provided must be accurate and complete</li>
                  <li>• You will receive a confirmation email with appointment details and PDF document</li>
                  <li>• Contact support at least 24 hours before for rescheduling requests</li>
                  <li>• I agree to the terms and conditions stated in this intake form</li>
                </ul>
              </div>

              {/* Verification Checkbox */}
              <div className="rounded-lg p-4 mb-8" style={{ background: 'var(--color-warning-surface)', border: '1px solid var(--color-warning)' }}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                    className="w-5 h-5 mt-1 rounded"
                  />
                  <div>
                    <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>I verify that all information is correct</p>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>I confirm all details are accurate and agree to proceed with this intake submission. <span className="font-semibold" style={{ color: 'var(--color-danger)' }}>*</span></p>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6" style={{ borderTop: '1px solid var(--color-border)' }}>
                <button
                  onClick={handleSubmitIntake}
                  disabled={!consentGiven || isSubmitting}
                  className="flex-1 px-6 py-3 rounded font-bold transition disabled:cursor-not-allowed disabled:opacity-40 text-white"
                  style={{ background: (!consentGiven || isSubmitting) ? 'var(--color-border-strong)' : 'var(--color-primary)' }}
                  onMouseEnter={e => { if (consentGiven && !isSubmitting) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)'; }}
                  onMouseLeave={e => { if (consentGiven && !isSubmitting) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'; }}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Intake'}
                </button>
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={isSubmitting || draftStatus === 'saving'}
                  className="px-6 py-3 rounded font-bold transition text-white disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    background: (isSubmitting || draftStatus === 'saving') ? 'var(--color-border-strong)'
                      : draftStatus === 'saved' ? 'var(--color-success)'
                      : draftStatus === 'error' ? 'var(--color-danger)'
                      : 'var(--color-warning)'
                  }}
                >
                  {draftStatus === 'saving' ? 'Saving…' : draftStatus === 'saved' ? '✓ Saved' : draftStatus === 'error' ? 'Save failed' : 'Save for Later'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('appointment')}
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded font-bold transition"
                  style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', background: 'transparent' }}
                  onMouseEnter={e => { if (!isSubmitting) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg)'; }}
                  onMouseLeave={e => { if (!isSubmitting) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ============================================
  // STEP 7: COMPLETION
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
        <div className="max-w-2xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8 pb-6" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Intake Submitted</h1>
            <p style={{ color: 'var(--color-text-secondary)' }}>Your appointment has been scheduled successfully</p>
          </div>

          {/* Next Steps */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold mb-4 uppercase tracking-wide" style={{ color: 'var(--color-text-primary)' }}>What happens next</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="font-semibold flex-shrink-0" style={{ color: 'var(--color-text-primary)' }}>1</span>
                <div>
                  <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Check your email</p>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>You'll receive confirmation with your appointment details</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="font-semibold flex-shrink-0" style={{ color: 'var(--color-text-primary)' }}>2</span>
                <div>
                  <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Counselor will contact you</p>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>We'll confirm your appointment time with you</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="font-semibold flex-shrink-0" style={{ color: 'var(--color-text-primary)' }}>3</span>
                <div>
                  <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Join your appointment</p>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>You'll receive login info for your appointment</p>
                </div>
              </div>
            </div>
          </div>

          {/* Appointment Confirmation Document */}
          <div className="mb-8">
            <AppointmentConfirmation
              studentName={`${personalInfo.first_name} ${personalInfo.last_name}`}
              studentId={personalInfo.id_number}
              studentContact={personalInfo.contact_number}
              appointmentDate={appointmentData?.appointment_date || appointmentDate}
              appointmentTime={appointmentData?.appointment_time || appointmentTime}
              platform={appointmentData?.preferred_platform || communicationMethod}
              screeningsCompleted={selectedAssessments.map(assessment => 
                ASSESSMENTS[assessment as keyof typeof ASSESSMENTS]?.name || assessment
              )}
              referenceId={counselingId}
              concern={selectedConcern ? (CONCERN_TYPES[selectedConcern as keyof typeof CONCERN_TYPES]?.label || selectedConcern) : 'General'}
            />
          </div>

          {/* Appointment Summary */}
          <div className="mb-8 p-4 rounded" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
            <h3 className="text-sm font-semibold mb-4 uppercase tracking-wide" style={{ color: 'var(--color-text-primary)' }}>Your Appointment</h3>

            <div className="space-y-3">
              {counselingId && (
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Reference ID</p>
                  <p className="text-sm font-mono break-all" style={{ color: 'var(--color-text-primary)' }}>{counselingId}</p>
                </div>
              )}
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Reason</p>
                <p className="font-medium capitalize" style={{ color: 'var(--color-text-primary)' }}>{selectedConcern || 'Personal'}</p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Scheduled Date</p>
                <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {appointmentData?.appointment_date
                    ? new Date(appointmentData.appointment_date).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })
                    : appointmentDate ? new Date(appointmentDate).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Pending'}
                </p>
              </div>
              {!isUrgent && (appointmentData?.appointment_time || appointmentTime) && (
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Time</p>
                  <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{appointmentData?.appointment_time || appointmentTime}</p>
                </div>
              )}
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Format</p>
                <p className="font-medium capitalize" style={{ color: 'var(--color-text-primary)' }}>
                  {appointmentData?.preferred_platform?.replace(/_/g, ' ') || communicationMethod?.replace(/_/g, ' ') || 'Online'}
                </p>
              </div>
              {isUrgent && (
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Priority</p>
                  <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Urgent - Within 30 minutes</p>
                </div>
              )}
            </div>
          </div>

          {/* Support Resources */}
          <div className="mb-8 p-4 rounded" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
            <h3 className="text-sm font-semibold mb-4 uppercase tracking-wide" style={{ color: 'var(--color-text-primary)' }}>Need support?</h3>
            <div className="space-y-2">
              <a href="tel:988" className="block p-3 rounded transition"
                style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = 'var(--color-bg)'}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = 'var(--color-surface)'}>
                <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Crisis Support: Call 988</p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Available 24/7</p>
              </a>
              <a href="https://suicidepreventionlifeline.org/chat" target="_blank" rel="noopener noreferrer" className="block p-3 rounded transition"
                style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = 'var(--color-bg)'}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = 'var(--color-surface)'}>
                <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Chat Online</p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>24/7 crisis chat support</p>
              </a>
            </div>
          </div>

          {appointmentData?.join_url && (
            <a
              href={appointmentData.join_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full px-4 py-3 text-white font-medium rounded text-center transition mb-4"
              style={{ background: 'var(--color-primary)' }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = 'var(--color-primary-hover)'}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = 'var(--color-primary)'}
            >
              Join Meeting
            </a>
          )}

          <Link href="/dashboard">
            <button className="w-full px-4 py-3 text-white font-medium rounded transition"
              style={{ background: 'var(--color-primary)' }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'}>
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
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-border-strong)' }} />
      </div>
    );
  }

  return null;
}
