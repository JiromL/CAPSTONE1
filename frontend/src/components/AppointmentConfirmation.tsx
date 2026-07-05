'use client';

import { useAppointmentExport } from '@/hooks/useAppointmentExport';

interface AppointmentConfirmationProps {
  studentName: string;
  studentId: string;
  studentContact: string;
  appointmentDate: string;
  appointmentTime: string;
  platform: string;
  screeningsCompleted: string[];
  referenceId: string;
  concern: string;
}

export function AppointmentConfirmation({
  studentName,
  studentId,
  studentContact,
  appointmentDate,
  appointmentTime,
  platform,
  screeningsCompleted,
  referenceId,
  concern,
}: AppointmentConfirmationProps) {
  const { printRef, handlePrint, handleDownloadPDF } = useAppointmentExport();

  const handleDownloadClick = () => {
    const filename = `CPS_Appointment_${studentId}_${appointmentDate.replace(/\//g, '-')}.pdf`;
    handleDownloadPDF(filename);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatPlatform = (p: string) => {
    if (p === 'in_person') return 'In-Person';
    if (p === 'google_meet') return 'Google Meet';
    if (p === 'zoom') return 'Zoom';
    return p.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="w-full max-w-4xl mx-auto mb-12">
      {/* Action Buttons */}
      <div className="mb-8 p-6 bg-blue-900 rounded-lg shadow-lg no-print">
        <p className="text-white text-sm font-bold mb-4 uppercase tracking-wider">📄 Export Your Appointment Confirmation</p>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={handlePrint}
            className="flex-1 min-w-[180px] bg-white hover:bg-gray-100 text-blue-900 font-bold py-3 px-6 rounded-lg transition-all shadow-md hover:shadow-lg"
          >
            🖨️ Print
          </button>
          <button
            onClick={handleDownloadClick}
            className="flex-1 min-w-[180px] bg-green-50 hover:bg-green-100 text-green-900 font-bold py-3 px-6 rounded-lg transition-all shadow-md hover:shadow-lg border-2 border-green-200"
          >
            📥 Download PDF
          </button>
        </div>
      </div>

      {/* Document */}
      <div ref={printRef} className="bg-white border-4 border-gray-800">
        {/* Header */}
        <div className="border-b-2 border-gray-800 px-8 py-8">
          <div className="flex justify-between items-start mb-6 gap-4">
            {/* DLSU Logo */}
            <div className="w-24 h-24 flex items-center justify-center flex-shrink-0">
              <img src="/dlsu-seal.svg" alt="DLSU Logo" className="w-full h-full object-contain" />
            </div>

            <div className="text-center flex-1 px-6">
              <p className="text-sm font-bold mb-1">DE LA SALLE UNIVERSITY - MANILA</p>
              <p className="text-xs mb-3">Counseling and Psychological Services</p>
              <h1 className="text-xl font-bold text-gray-900">APPOINTMENT CONFIRMATION</h1>
            </div>

            {/* CPS Logo */}
            <div className="w-24 h-24 flex items-center justify-center flex-shrink-0">
              <img src="/cps-logo.png" alt="CPS Logo" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>

        {/* Reservation Summary */}
        <div className="px-8 py-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6 underline">RESERVATION SUMMARY</h2>
          
          {/* Reference ID */}
          <div className="mb-6 pb-4 border-b border-gray-300">
            <div className="flex">
              <span className="font-bold text-gray-900 w-32">Confirmation No:</span>
              <span className="text-gray-800 font-mono font-bold underline">{referenceId}</span>
            </div>
          </div>

          {/* Student Information */}
          <div className="mb-6 pb-4 border-b border-gray-300">
            <div className="flex mb-3">
              <span className="font-bold text-gray-900 w-32">Student Name:</span>
              <span className="text-gray-800">{studentName}</span>
            </div>
            <div className="flex mb-3">
              <span className="font-bold text-gray-900 w-32">Student ID:</span>
              <span className="text-gray-800 font-mono">{studentId}</span>
            </div>
            <div className="flex">
              <span className="font-bold text-gray-900 w-32">Contact No:</span>
              <span className="text-gray-800">{studentContact}</span>
            </div>
          </div>

          {/* Primary Concern */}
          {concern && (
            <div className="mb-6 pb-4 border-b border-gray-300">
              <div className="flex">
                <span className="font-bold text-gray-900 w-32">Primary Concern:</span>
                <span className="text-gray-800 capitalize">{concern}</span>
              </div>
            </div>
          )}

          {/* Assessments */}
          {screeningsCompleted.length > 0 && (
            <div className="mb-6 pb-4 border-b border-gray-300">
              <div className="font-bold text-gray-900 mb-3">Assessments Completed:</div>
              <ul className="space-y-2 ml-4">
                {screeningsCompleted.map((screening, idx) => (
                  <li key={idx} className="text-gray-800 flex items-center gap-2">
                    <span className="text-blue-700">✓</span>
                    <span>{screening}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Appointment Details */}
          <div className="mb-6 pb-4 border-b border-gray-300">
            <div className="flex mb-3">
              <span className="font-bold text-gray-900 w-32">Appointment Date:</span>
              <span className="text-gray-800 font-semibold underline">{formatDate(appointmentDate)}</span>
            </div>
            <div className="flex mb-3">
              <span className="font-bold text-gray-900 w-32">Appointment Time:</span>
              <span className="text-gray-800 font-semibold underline">{appointmentTime}</span>
            </div>
            <div className="flex">
              <span className="font-bold text-gray-900 w-32">Appointment Format:</span>
              <span className="text-gray-800 font-semibold underline">{formatPlatform(platform)}</span>
            </div>
          </div>
        </div>

        {/* Important Notes Section */}
        <div className="border-t-2 border-gray-800 px-8 py-6">
          <div className="border border-gray-800 p-6">
            <p className="font-bold text-red-600 mb-4 text-sm">NOTE:</p>
            <ol className="text-xs text-gray-800 space-y-3 list-decimal list-inside">
              <li className="mb-2"><span className="font-bold">Follow your scheduled appointment date and time.</span> If you cannot keep this appointment, reschedule immediately.</li>
              <li className="mb-2"><span className="font-bold">Contact CPS at least 24 hours in advance</span> if you need to reschedule or cancel your appointment.</li>
              <li className="mb-2"><span className="font-bold">For virtual appointments:</span> Join 5-10 minutes early to test your connection and technology.</li>
              <li><span className="font-bold">Emergency Support:</span> If you experience a crisis, call 988 (National Suicide & Crisis Lifeline) available 24/7.</li>
            </ol>
            <p className="text-xs text-gray-600 mt-4 italic">Please retain this confirmation for your records.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-800 bg-gray-100 px-8 py-4 text-center text-xs text-gray-700">
          <p className="font-semibold mb-1">Counseling and Psychological Services</p>
          <p className="mb-2">De La Salle University - Manila</p>
          <p className="text-gray-600">{new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
        </div>
      </div>
    </div>
  );
}
