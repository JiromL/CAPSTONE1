'use client';

import { Check } from 'lucide-react';
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
    return new Date(date).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', 
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
      <div className="mb-8 p-6 rounded-lg shadow-lg no-print" style={{ background: 'var(--color-primary)' }}>
        <p className="text-white text-sm font-bold mb-4 uppercase tracking-wider">📄 Export Your Appointment Confirmation</p>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={handlePrint}
            className="flex-1 min-w-[180px] font-bold py-3 px-6 rounded-lg transition-all shadow-md hover:shadow-lg"
            style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-surface)'; }}
          >
            🖨️ Print
          </button>
          <button
            onClick={handleDownloadClick}
            className="flex-1 min-w-[180px] font-bold py-3 px-6 rounded-lg transition-all shadow-md hover:shadow-lg"
            style={{ background: 'var(--color-success-surface)', color: 'var(--color-success-text)', border: '2px solid var(--color-success)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
          >
            📥 Download PDF
          </button>
        </div>
      </div>

      {/* Document */}
      <div ref={printRef} style={{ background: 'var(--color-surface)', border: '4px solid #1f2937' }}>
        {/* Header */}
        <div className="px-8 py-8" style={{ borderBottom: '2px solid #1f2937' }}>
          <div className="flex justify-between items-start mb-6 gap-4">
            {/* DLSU Logo */}
            <div className="w-24 h-24 flex items-center justify-center flex-shrink-0">
              <img src="/dlsu-seal.svg" alt="DLSU Logo" className="w-full h-full object-contain" />
            </div>

            <div className="text-center flex-1 px-6">
              <p className="text-sm font-bold mb-1">DE LA SALLE UNIVERSITY - MANILA</p>
              <p className="text-xs mb-3">Counseling and Psychological Services</p>
              <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>APPOINTMENT CONFIRMATION</h1>
            </div>

            {/* CPS Logo */}
            <div className="w-24 h-24 flex items-center justify-center flex-shrink-0">
              <img src="/cps-logo.png" alt="CPS Logo" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>

        {/* Reservation Summary */}
        <div className="px-8 py-6">
          <h2 className="text-lg font-bold mb-6 underline" style={{ color: 'var(--color-text-primary)' }}>RESERVATION SUMMARY</h2>

          {/* Reference ID */}
          <div className="mb-6 pb-4" style={{ borderBottom: '1px solid var(--color-border-strong)' }}>
            <div className="flex">
              <span className="font-bold w-32" style={{ color: 'var(--color-text-primary)' }}>Confirmation No:</span>
              <span className="font-mono font-bold underline" style={{ color: 'var(--color-text-primary)' }}>{referenceId}</span>
            </div>
          </div>

          {/* Student Information */}
          <div className="mb-6 pb-4" style={{ borderBottom: '1px solid var(--color-border-strong)' }}>
            <div className="flex mb-3">
              <span className="font-bold w-32" style={{ color: 'var(--color-text-primary)' }}>Student Name:</span>
              <span style={{ color: 'var(--color-text-primary)' }}>{studentName}</span>
            </div>
            <div className="flex mb-3">
              <span className="font-bold w-32" style={{ color: 'var(--color-text-primary)' }}>Student ID:</span>
              <span className="font-mono" style={{ color: 'var(--color-text-primary)' }}>{studentId}</span>
            </div>
            <div className="flex">
              <span className="font-bold w-32" style={{ color: 'var(--color-text-primary)' }}>Contact No:</span>
              <span style={{ color: 'var(--color-text-primary)' }}>{studentContact}</span>
            </div>
          </div>

          {/* Primary Concern */}
          {concern && (
            <div className="mb-6 pb-4" style={{ borderBottom: '1px solid var(--color-border-strong)' }}>
              <div className="flex">
                <span className="font-bold w-32" style={{ color: 'var(--color-text-primary)' }}>Primary Concern:</span>
                <span className="capitalize" style={{ color: 'var(--color-text-primary)' }}>{concern}</span>
              </div>
            </div>
          )}

          {/* Assessments */}
          {screeningsCompleted.length > 0 && (
            <div className="mb-6 pb-4" style={{ borderBottom: '1px solid var(--color-border-strong)' }}>
              <div className="font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>Assessments Completed:</div>
              <ul className="space-y-2 ml-4">
                {screeningsCompleted.map((screening, idx) => (
                  <li key={idx} className="flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                    <Check size={14} aria-hidden="true" className="flex-shrink-0" style={{ color: 'var(--color-success-text)' }} />
                    <span>{screening}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Appointment Details */}
          <div className="mb-6 pb-4" style={{ borderBottom: '1px solid var(--color-border-strong)' }}>
            <div className="flex mb-3">
              <span className="font-bold w-32" style={{ color: 'var(--color-text-primary)' }}>Appointment Date:</span>
              <span className="font-semibold underline" style={{ color: 'var(--color-text-primary)' }}>{formatDate(appointmentDate)}</span>
            </div>
            <div className="flex mb-3">
              <span className="font-bold w-32" style={{ color: 'var(--color-text-primary)' }}>Appointment Time:</span>
              <span className="font-semibold underline" style={{ color: 'var(--color-text-primary)' }}>{appointmentTime}</span>
            </div>
            <div className="flex">
              <span className="font-bold w-32" style={{ color: 'var(--color-text-primary)' }}>Appointment Format:</span>
              <span className="font-semibold underline" style={{ color: 'var(--color-text-primary)' }}>{formatPlatform(platform)}</span>
            </div>
          </div>
        </div>

        {/* Important Notes Section */}
        <div className="px-8 py-6" style={{ borderTop: '2px solid #1f2937' }}>
          <div className="p-6" style={{ border: '1px solid #1f2937' }}>
            <p className="font-bold mb-4 text-sm" style={{ color: 'var(--color-danger)' }}>NOTE:</p>
            <ol className="text-xs space-y-3 list-decimal list-inside" style={{ color: 'var(--color-text-primary)' }}>
              <li className="mb-2"><span className="font-bold">Follow your scheduled appointment date and time.</span> If you cannot keep this appointment, reschedule immediately.</li>
              <li className="mb-2"><span className="font-bold">Contact CPS at least 24 hours in advance</span> if you need to reschedule or cancel your appointment.</li>
              <li className="mb-2"><span className="font-bold">For virtual appointments:</span> Join 5-10 minutes early to test your connection and technology.</li>
              <li><span className="font-bold">Emergency Support:</span> If you experience a crisis, call 988 (National Suicide & Crisis Lifeline) available 24/7.</li>
            </ol>
            <p className="text-xs mt-4 italic" style={{ color: 'var(--color-text-secondary)' }}>Please retain this confirmation for your records.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 text-center text-xs"
          style={{ borderTop: '2px solid #1f2937', background: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}>
          <p className="font-semibold mb-1">Counseling and Psychological Services</p>
          <p className="mb-2">De La Salle University - Manila</p>
          <p style={{ color: 'var(--color-text-secondary)' }}>{new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
        </div>
      </div>
    </div>
  );
}
