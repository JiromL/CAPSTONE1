'use client';

// The EMA data privacy notice, shared by Profile, the Talk to EMA widget and the EMA page so
// students always read the same text. Each point must match how the system actually behaves
// (see backend/services/ema_access.py for who sees which students, and
// backend/blueprints/mhbot_integration.py for consent checks and the chat relay).
// When the wording changes, bump EMA_CONSENT_VERSION in the backend.

export const EMA_NOTICE_POINTS: string[] = [
  'EMA is a separate wellbeing chatbot run by DLSU PCHRD, with its own privacy policy. Linking lets CPS receive your EMA wellbeing results (labels such as Thriving or Struggling, and their scores) to support your counseling.',
  'Your results are seen only by the CPS staff involved in your care: your own counselor or psychologist, the intake counselor who met with you, and the CPS case manager, who watches for students who may need support. Administrators and the Data Privacy Officer see totals only, never your name or your individual results. Office assistants, other counselors and other students cannot see them.',
  'CPS uses your results to flag students who may need support. When staff follow up, they may write a note that becomes part of your counseling record.',
  'CPS stays signed in to your EMA account so you can chat with EMA inside CPS. Your password is never saved; CPS keeps only an encrypted sign-in key.',
  'Your chat messages pass through CPS to reach EMA but are not saved by CPS. EMA keeps your conversations.',
  'When you submit an EMA journal, you can choose to save a copy to your private CPS journal, which only you can see.',
  'Data is stored in the CPS system with password-protected, role-based access. All CPS staff with data access are bound by confidentiality agreements. Reports shared outside your care team use anonymized totals only.',
  'You can disconnect EMA at any time in Profile. CPS then stops receiving new results; results already saved stay in your counseling record. To ask for them to be deleted, contact the CPS Data Privacy Officer at cps@dlsu.edu.ph.',
];

export const EMA_CONSENT_STATEMENT =
  'I have read the EMA data privacy notice. I agree that CPS may receive and use my EMA wellbeing results and stay connected to my EMA account as described, in accordance with the Data Privacy Act of 2012 (RA 10173).';

export function EmaPrivacyNotice({ compact = false }: { compact?: boolean }) {
  return (
    <ul className={`list-disc pl-4 ${compact ? 'space-y-1 text-[11px]' : 'space-y-1.5 text-xs'}`}
      style={{ color: 'var(--color-text-secondary)' }}>
      {EMA_NOTICE_POINTS.map(p => <li key={p}>{p}</li>)}
    </ul>
  );
}

/** Consent checkbox with the full notice one click away. */
export function EmaConsentCheckbox({ checked, onChange, id = 'ema-consent' }: {
  checked: boolean; onChange: (v: boolean) => void; id?: string;
}) {
  return (
    <div className="space-y-2">
      <details className="rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
        <summary className="cursor-pointer font-medium" style={{ color: 'var(--color-primary-text)' }}>
          Read the EMA data privacy notice
        </summary>
        <div className="pt-2"><EmaPrivacyNotice compact /></div>
      </details>
      <label htmlFor={id} className="flex items-start gap-2 text-xs cursor-pointer" style={{ color: 'var(--color-text-secondary)' }}>
        <input id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="mt-0.5"
          style={{ accentColor: 'var(--color-primary)' }} />
        <span>{EMA_CONSENT_STATEMENT}</span>
      </label>
    </div>
  );
}
