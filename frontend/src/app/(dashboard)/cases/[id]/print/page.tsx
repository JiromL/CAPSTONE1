'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/utils/api';

interface CaseSummary {
  generated_at: string;
  case: {
    case_number: string; status: string; risk_level: string;
    opening_date: string; chief_complaint: string; treatment_plan: string;
  };
  student: { name: string; id_number: string; email: string; college: string; program: string; };
  counselor:    { name: string; role: string; };
  psychologist: { name: string; role: string; };
  icf: Record<string, string>;
  spif: Record<string, string>;
  phq4: (number | null)[] | null;
  notes: { date: string; content: string; author: string; }[];
}

const PHQ4_LABELS = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Feeling nervous, anxious, or on edge',
  'Not being able to stop or control worrying',
];
const FREQ = ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'];

const RISK_COLOR: Record<string, string> = {
  GREEN: '#166534', YELLOW: '#b45309', ORANGE: '#c2410c', RED: '#991b1b', CRITICAL: '#7f1d1d',
};

export default function CasePrintPage() {
  const params = useParams();
  const caseId = params.id as string;
  const [data, setData] = useState<CaseSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setError('Not authenticated'); return; }
    fetch(api(`/api/reports/case-summary/${caseId}`), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(d.error || 'Failed')))
      .then(setData)
      .catch(e => setError(String(e)));
  }, [caseId]);

  if (error) return (
    <div className="min-h-screen flex items-center justify-center text-red-600 text-sm">{error}</div>
  );
  if (!data) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Loading…</div>
  );

  const phq2 = data.phq4 ? (data.phq4[0] ?? 0) + (data.phq4[1] ?? 0) : null;
  const gad2 = data.phq4 ? (data.phq4[2] ?? 0) + (data.phq4[3] ?? 0) : null;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 18mm 16mm; }
        }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #111; }
      `}</style>

      {/* Print button */}
      <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
        <button onClick={() => window.print()}
          className="px-4 py-2 bg-[#1a5228] text-white text-sm font-semibold rounded-lg shadow hover:bg-green-800 transition">
          Print / Save as PDF
        </button>
        <button onClick={() => window.close()}
          className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition">
          Close
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-10 text-sm">

        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-[#1a5228] pb-4 mb-6">
          <div>
            <p className="text-xl font-bold text-[#1a5228]">De La Salle University</p>
            <p className="text-sm text-gray-600">Counseling & Psychology Services</p>
            <p className="text-xs text-gray-400 mt-0.5">Case Summary Record — CONFIDENTIAL</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Generated: {data.generated_at}</p>
            <p className="text-xs font-mono text-gray-700 mt-1">Case No: {data.case.case_number || '—'}</p>
          </div>
        </div>

        {/* Case status strip */}
        <div className="flex gap-3 mb-6">
          <span className="px-3 py-1 text-xs font-semibold rounded-full text-white"
            style={{ backgroundColor: RISK_COLOR[data.case.risk_level] ?? '#6b7280' }}>
            {data.case.risk_level || 'N/A'} RISK
          </span>
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
            {data.case.status}
          </span>
          <span className="px-3 py-1 text-xs rounded-full bg-gray-50 text-gray-500">
            Opened {data.case.opening_date}
          </span>
        </div>

        {/* Student info */}
        <Section title="Student Information">
          <Row2 a={['Full Name', data.student.name]} b={['ID Number', data.student.id_number]} />
          <Row2 a={['Email', data.student.email]} b={['College / Program', `${data.student.college} · ${data.student.program}`]} />
          <Row2
            a={['Assigned Counselor', data.counselor.name || '—']}
            b={['Assigned Psychologist', data.psychologist.name || '—']}
          />
        </Section>

        {/* ICF */}
        <Section title="Initial Contact Form (ICF)">
          <Row2
            a={['First Name', data.icf.first_name]}
            b={['Last Name', data.icf.last_name]}
          />
          <Row2
            a={['Phone', data.icf.phone]}
            b={['Year Level', data.icf.year_level]}
          />
          <Row2
            a={['Referral Source', data.icf.referral_source]}
            b={['Referred By', data.icf.referred_by || '—']}
          />
          <Row2
            a={['Service Requested', (data.icf.service_requested || '').replace(/_/g, ' ')]}
            b={['', '']}
          />
          <RowFull label="Presenting Concern" value={data.icf.presenting_concern} />
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 mb-1">Emergency Contact</p>
            <Row2
              a={['Name', data.icf.emergency_contact_name]}
              b={['Relationship', data.icf.emergency_contact_relationship]}
            />
            <Row2 a={['Phone', data.icf.emergency_contact_phone]} b={['', '']} />
          </div>
        </Section>

        {/* SPIF */}
        {(data.spif.address || data.spif.birthdate || data.spif.gender) && (
          <Section title="Personal Background (SPIF-IF)">
            <Row2 a={['Date of Birth', data.spif.birthdate]} b={['Gender', data.spif.gender]} />
            <RowFull label="Home Address" value={data.spif.address} />
          </Section>
        )}

        {/* PHQ-4 */}
        {data.phq4 && data.phq4.some(v => v !== null) && (
          <Section title="Mental Health Screener (PHQ-4)">
            <div className="space-y-1.5 mb-3">
              {PHQ4_LABELS.map((q, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs text-gray-500 w-5 shrink-0">{i + 1}.</span>
                  <span className="flex-1 text-xs text-gray-700">{q}</span>
                  <span className="text-xs font-semibold text-gray-900 shrink-0 w-40 text-right">
                    {data.phq4![i] !== null ? `${data.phq4![i]} — ${FREQ[data.phq4![i]!]}` : '—'}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-6 mt-2 pt-2 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-500">PHQ-2 Score (Depression)</p>
                <p className="text-base font-bold text-gray-900">{phq2} / 6</p>
                <p className="text-[10px] text-gray-400">{phq2! >= 3 ? 'Positive screen — follow-up indicated' : 'Below clinical threshold'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">GAD-2 Score (Anxiety)</p>
                <p className="text-base font-bold text-gray-900">{gad2} / 6</p>
                <p className="text-[10px] text-gray-400">{gad2! >= 3 ? 'Positive screen — follow-up indicated' : 'Below clinical threshold'}</p>
              </div>
            </div>
          </Section>
        )}

        {/* Treatment plan */}
        {data.case.treatment_plan && (
          <Section title="Treatment Plan">
            <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">{data.case.treatment_plan}</p>
          </Section>
        )}

        {/* Session notes */}
        {data.notes.length > 0 && (
          <Section title={`Session Notes (${data.notes.length})`}>
            <div className="space-y-3">
              {data.notes.map((n, i) => (
                <div key={i} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-gray-700">{n.date}</p>
                    {n.author && <p className="text-[10px] text-gray-400">{n.author}</p>}
                  </div>
                  <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">{n.content}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Footer */}
        <div className="mt-10 pt-4 border-t border-gray-200 text-center">
          <p className="text-[10px] text-gray-400">
            This document is confidential and protected under RA 10173 (Data Privacy Act of 2012) and RA 11036 (Mental Health Act of 2018).
            Unauthorized disclosure is prohibited. For internal CPS use only.
          </p>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-bold text-[#1a5228] uppercase tracking-wide border-b border-[#1a5228]/20 pb-1 mb-2">{title}</p>
      {children}
    </div>
  );
}

function Row2({ a, b }: { a: [string, string]; b: [string, string] }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 mb-1.5">
      <div>
        <span className="text-[10px] text-gray-400 uppercase tracking-wide">{a[0]}</span>
        <p className="text-xs text-gray-800">{a[1] || '—'}</p>
      </div>
      {b[0] && (
        <div>
          <span className="text-[10px] text-gray-400 uppercase tracking-wide">{b[0]}</span>
          <p className="text-xs text-gray-800">{b[1] || '—'}</p>
        </div>
      )}
    </div>
  );
}

function RowFull({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-1.5">
      <span className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</span>
      <p className="text-xs text-gray-800 whitespace-pre-line">{value || '—'}</p>
    </div>
  );
}
