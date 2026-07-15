import { api } from './api';

// ─── PHQ / GAD question text ───────────────────────────────────────────────

const PHQ4_QUESTIONS = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Feeling nervous, anxious, or on edge',
  'Not being able to stop or control worrying',
];

const PHQ9_QUESTIONS = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Trouble falling or staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
  'Trouble concentrating on things, such as reading or watching television',
  'Moving or speaking so slowly that other people could have noticed; or the opposite — being so fidgety or restless that you have been moving around a lot more than usual',
  'Thoughts that you would be better off dead, or of hurting yourself in some way',
];

const GAD7_QUESTIONS = [
  'Feeling nervous, anxious, or on edge',
  'Not being able to stop or control worrying',
  'Worrying too much about different things',
  'Trouble relaxing',
  'Being so restless that it is hard to sit still',
  'Becoming easily annoyed or irritable',
  'Feeling afraid as if something awful might happen',
];

const FREQ_LABELS = ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'];

// ─── Score interpretation helpers ─────────────────────────────────────────

function phq9Severity(score: number | null) {
  if (score === null) return '—';
  if (score <= 4)  return 'Minimal (0–4)';
  if (score <= 9)  return 'Mild (5–9)';
  if (score <= 14) return 'Moderate (10–14)';
  if (score <= 19) return 'Moderately Severe (15–19)';
  return 'Severe (20–27)';
}

function gad7Severity(score: number | null) {
  if (score === null) return '—';
  if (score <= 4)  return 'Minimal (0–4)';
  if (score <= 9)  return 'Mild (5–9)';
  if (score <= 14) return 'Moderate (10–14)';
  return 'Severe (15–21)';
}

function riskBadge(level: string) {
  const map: Record<string, string> = {
    GREEN:    'background:#f0f0f0;color:#111',
    YELLOW:   'background:#e8e8e8;color:#111',
    RED:      'background:#ccc;color:#111',
    CRITICAL: 'background:#111;color:white',
  };
  return map[level?.toUpperCase()] ?? 'background:#f0f0f0;color:#111';
}

function decisionLabel(d: string) {
  if (d === 'ENDORSE_CC') return 'Endorsed to Counselor';
  if (d === 'ENDORSE_CP') return 'Endorsed to Psychologist';
  if (d === 'CLOSE_AT_INTAKE') return 'Closed at Intake';
  return d || '—';
}

function fmtDate(s?: string) {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch { return s; }
}

function fmtDateTime(s?: string) {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  } catch { return s; }
}

function val(v: any) { return v ? String(v) : '—'; }

// ─── HTML builder ──────────────────────────────────────────────────────────

function buildHtml(intake: any, packet: any, sections: SectionsMap = DEFAULT_SECTIONS): string {
  const s = sections;
  const icf  = packet?.icf  ?? {};
  const spif = packet?.spif ?? {};
  const phq4r: number[] = packet?.phq4_responses ?? [];
  const phq4s = packet?.phq4_summary ?? null;

  const phq9r: number[] = intake?.phq9_responses ?? [];
  const gad7r: number[] = intake?.gad7_responses ?? [];

  const studentName = icf.first_name
    ? `${(icf.last_name || '').toUpperCase()}, ${icf.first_name}${icf.middle_name ? ' ' + icf.middle_name : ''}`
    : val(intake?.responses?.first_name ? `${(intake.responses.last_name || '').toUpperCase()}, ${intake.responses.first_name}` : null);

  const generatedAt = new Date().toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  const docId = `CPS-${Date.now().toString(36).toUpperCase()}`;

  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; color: #111; background: white; }
    @page { margin: 18mm 20mm; size: A4 portrait; }
    @media print { .no-print { display: none !important; } body { font-size: 10pt; } }
    .print-btn { position: fixed; bottom: 24px; right: 24px; background: #111; color: white; border: none; padding: 10px 22px; border-radius: 8px; font-size: 11pt; cursor: pointer; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,.25); }
    .confidential { border: 1.5px solid #111; text-align: center; padding: 5px; font-size: 8pt; font-weight: bold; color: #111; letter-spacing: .07em; margin-bottom: 14px; }
    .header { display: flex; align-items: flex-start; gap: 14px; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 16px; }
    .header-logo { width: 46px; height: 46px; background: #111; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 13pt; flex-shrink: 0; }
    .header-text h1 { color: #111; font-size: 13pt; }
    .header-text p { color: #555; font-size: 8.5pt; margin-top: 2px; }
    .header-meta { margin-left: auto; text-align: right; }
    .header-meta p { color: #555; font-size: 8pt; margin-top: 2px; }
    h2 { color: #111; font-size: 10.5pt; font-weight: bold; border-bottom: 1px solid #111; padding-bottom: 4px; margin: 18px 0 10px; text-transform: uppercase; letter-spacing: .04em; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 24px; }
    .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0 16px; }
    .field { margin-bottom: 9px; }
    .field-label { font-size: 7.5pt; color: #555; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 2px; }
    .field-value { font-size: 10pt; padding-bottom: 3px; border-bottom: 1px solid #ccc; min-height: 19px; }
    .field-value.block { border: 1px solid #ccc; padding: 5px 8px; border-radius: 2px; min-height: 48px; font-size: 9.5pt; background: #fafafa; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 9.5pt; }
    thead th { background: #111; color: white; text-align: left; padding: 6px 10px; font-weight: bold; }
    tbody td { padding: 5px 10px; border-bottom: 1px solid #e8e8e8; }
    tbody tr:nth-child(even) td { background: #f7f7f7; }
    .score-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 10px 0; }
    .score-cell { background: #f7f7f7; border: 1px solid #ccc; border-radius: 4px; padding: 10px 8px; text-align: center; }
    .score-num { font-size: 20pt; font-weight: bold; color: #111; line-height: 1; }
    .score-lbl { font-size: 7.5pt; color: #555; margin-top: 3px; }
    .risk-badge { display: inline-block; padding: 3px 12px; border: 1.5px solid #111; border-radius: 2px; font-weight: bold; font-size: 9.5pt; }
    .decision-box { background: #f7f7f7; border: 1.5px solid #111; border-radius: 4px; padding: 10px 14px; margin: 8px 0; }
    .decision-label { font-weight: bold; font-size: 11pt; color: #111; }
    .notes-box { background: #f7f7f7; border: 1px solid #ccc; border-radius: 2px; padding: 8px 12px; font-size: 9.5pt; white-space: pre-wrap; min-height: 36px; }
    .consent-row { display: flex; align-items: center; gap: 8px; margin: 4px 0; font-size: 9.5pt; }
    .check { width: 13px; height: 13px; border: 1.5px solid #111; border-radius: 1px; display: inline-flex; align-items: center; justify-content: center; font-size: 9pt; flex-shrink: 0; }
    .check.yes { background: #eee; color: #111; }
    .check.no  { background: white; color: #111; }
    .footer { margin-top: 32px; border-top: 1px solid #ccc; padding-top: 10px; color: #777; font-size: 7.5pt; display: flex; justify-content: space-between; }
    .page-break { page-break-before: always; }
  `;

  // PHQ-4 table rows
  const phq4Rows = PHQ4_QUESTIONS.map((q, i) => `
    <tr>
      <td style="width:30px;text-align:center;">${i + 1}</td>
      <td>${q}</td>
      <td style="text-align:center;font-weight:bold;">${phq4r[i] ?? '—'}</td>
      <td>${FREQ_LABELS[phq4r[i]] ?? '—'}</td>
    </tr>`).join('');

  // PHQ-9 table rows
  const phq9Rows = PHQ9_QUESTIONS.map((q, i) => `
    <tr>
      <td style="width:30px;text-align:center;">${i + 1}</td>
      <td>${q}</td>
      <td style="text-align:center;font-weight:bold;">${phq9r[i] ?? '—'}</td>
      <td>${FREQ_LABELS[phq9r[i]] ?? '—'}</td>
    </tr>`).join('');

  // GAD-7 table rows
  const gad7Rows = GAD7_QUESTIONS.map((q, i) => `
    <tr>
      <td style="width:30px;text-align:center;">${i + 1}</td>
      <td>${q}</td>
      <td style="text-align:center;font-weight:bold;">${gad7r[i] ?? '—'}</td>
      <td>${FREQ_LABELS[gad7r[i]] ?? '—'}</td>
    </tr>`).join('');

  const phq9Score  = intake?.phq9_score  ?? null;
  const gad7Score  = intake?.gad7_score  ?? null;
  const riskLevel  = (intake?.risk_level ?? 'GREEN').toUpperCase();
  const decision   = intake?.triage_decision ?? '';
  const notes      = intake?.endorsement_notes ?? '';
  const triagedAt  = intake?.triaged_at ?? '';

  // consent
  const consentService = icf.consent_to_service ?? packet?.consent_audit?.consent_to_service;
  const consentData    = icf.consent_to_data    ?? packet?.consent_audit?.consent_to_data;
  const consentTs      = packet?.consent_audit?.consent_timestamp;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Clinical Intake Documentation — ${studentName}</title>
  <style>${css}</style>
</head>
<body>

<button class="print-btn no-print" onclick="window.print()">🖨 Print / Save as PDF</button>

<div class="confidential">⚠ CONFIDENTIAL — FOR AUTHORIZED CPS STAFF USE ONLY — PROTECTED UNDER RA 10173 (DATA PRIVACY ACT)</div>

<!-- ── HEADER ── -->
<div class="header">
  <div class="header-logo">CPS</div>
  <div class="header-text">
    <p style="font-size:7.5pt;color:#777;text-transform:uppercase;letter-spacing:.06em;">De La Salle University</p>
    <h1>Counseling and Psychological Services</h1>
    <p>Clinical Intake Documentation</p>
  </div>
  <div class="header-meta">
    <p>Generated: <strong>${generatedAt}</strong></p>
    <p>Document ID: ${docId}</p>
    <p>Source: ${intake?.source === 'walkin' ? 'Walk-in' : 'Online Booking'}</p>
  </div>
</div>

${s.studentInfo ? `
<!-- ── SECTION 1: STUDENT INFORMATION ── -->
<h2>1. Student Information</h2>
<div class="grid3">
  <div class="field"><div class="field-label">Full Name</div><div class="field-value">${studentName}</div></div>
  <div class="field"><div class="field-label">ID Number</div><div class="field-value">${val(icf.student_id)}</div></div>
  <div class="field"><div class="field-label">Date of Intake</div><div class="field-value">${fmtDate(intake?.created_at)}</div></div>
</div>
<div class="grid3">
  <div class="field"><div class="field-label">College / Unit</div><div class="field-value">${val(icf.college)}</div></div>
  <div class="field"><div class="field-label">Program</div><div class="field-value">${val(icf.program)}</div></div>
  <div class="field"><div class="field-label">Year Level</div><div class="field-value">${val(icf.year_level)}</div></div>
</div>
<div class="grid2">
  <div class="field"><div class="field-label">Email Address</div><div class="field-value">${val(icf.email)}</div></div>
  <div class="field"><div class="field-label">Contact Number</div><div class="field-value">${val(icf.phone)}</div></div>
</div>` : ''}

${s.presentingConcern ? `
<!-- ── SECTION 2: PRESENTING CONCERN ── -->
<h2>2. Presenting Concern &amp; Service Request</h2>
<div class="grid2">
  <div class="field"><div class="field-label">Service Requested</div><div class="field-value">${val(icf.service_requested ?? intake?.responses?.service_requested).replace(/_/g, ' ')}</div></div>
  <div class="field"><div class="field-label">Referral Source</div><div class="field-value">${val(icf.referral_source).replace(/-/g, ' ')}</div></div>
</div>
${icf.referred_by ? `<div class="field"><div class="field-label">Referred By</div><div class="field-value">${val(icf.referred_by)}</div></div>` : ''}
<div class="field">
  <div class="field-label">Presenting Concern</div>
  <div class="field-value block">${val(icf.presenting_concern ?? intake?.concern ?? intake?.responses?.concern)}</div>
</div>` : ''}

${s.emergencyContact ? `
<!-- ── SECTION 3: EMERGENCY CONTACT ── -->
<h2>3. Emergency Contact</h2>
<div class="grid3">
  <div class="field"><div class="field-label">Name</div><div class="field-value">${val(icf.emergency_contact_name)}</div></div>
  <div class="field"><div class="field-label">Relationship</div><div class="field-value">${val(icf.emergency_contact_relationship)}</div></div>
  <div class="field"><div class="field-label">Contact Number</div><div class="field-value">${val(icf.emergency_contact_phone)}</div></div>
</div>` : ''}

${s.spif ? `
<!-- ── SECTION 4: PERSONAL & FAMILY BACKGROUND (SPIF) ── -->
<h2>4. Personal &amp; Family Background (SPIF-IF)</h2>
<div class="grid3">
  <div class="field"><div class="field-label">Birthdate</div><div class="field-value">${fmtDate(spif.birthdate)}</div></div>
  <div class="field"><div class="field-label">Gender</div><div class="field-value">${val(spif.gender)}</div></div>
</div>
<div class="grid3">
  <div class="field"><div class="field-label">Religion</div><div class="field-value">${val(spif.religion)}</div></div>
  <div class="field"><div class="field-label">Nationality</div><div class="field-value">${val(spif.nationality)}</div></div>
  <div class="field"><div class="field-label">Family Composition</div><div class="field-value">${val(spif.family_composition)}</div></div>
</div>
<div class="grid2">
  <div class="field"><div class="field-label">Living Arrangement</div><div class="field-value">${val(spif.living_with)}</div></div>
  <div class="field"><div class="field-label">Birth Order</div><div class="field-value">${val(spif.birth_order)}${spif.number_of_siblings ? ' of ' + spif.number_of_siblings + ' siblings' : ''}</div></div>
</div>
<div class="field"><div class="field-label">Current Address</div><div class="field-value">${val(spif.address)}</div></div>
<div class="grid2">
  <div class="field"><div class="field-label">Existing Medical Conditions</div><div class="field-value block">${val(spif.existing_medical_conditions)}</div></div>
  <div class="field"><div class="field-label">Current Medications</div><div class="field-value block">${val(spif.current_medications)}</div></div>
</div>
<div class="grid2">
  <div class="field"><div class="field-label">Previous Counseling</div><div class="field-value">${spif.previous_counseling ? 'Yes' : 'No'}</div></div>
  ${spif.previous_counseling ? `<div class="field"><div class="field-label">Details</div><div class="field-value block">${val(spif.previous_counseling_details)}</div></div>` : ''}
</div>` : ''}

${s.phq4 ? `
<!-- ── SECTION 5: PHQ-4 INITIAL SCREENING ── -->
<h2>5. PHQ-4 Initial Screening</h2>
${phq4r.length > 0 ? `
<p style="font-size:8.5pt;color:#555;margin-bottom:8px;">Over the <strong>last 2 weeks</strong>, how often have you been bothered by the following problems?</p>
<table>
  <thead><tr><th style="width:30px;">#</th><th>Question</th><th style="width:50px;text-align:center;">Score</th><th style="width:160px;">Response</th></tr></thead>
  <tbody>${phq4Rows}</tbody>
</table>
${phq4s ? `
<div class="score-summary">
  <div class="score-cell"><div class="score-num">${phq4s.phq2_score ?? '—'}</div><div class="score-lbl">PHQ-2 (Depression)</div></div>
  <div class="score-cell"><div class="score-num">${phq4s.gad2_score ?? '—'}</div><div class="score-lbl">GAD-2 (Anxiety)</div></div>
  <div class="score-cell"><div class="score-num">${phq4s.total_score ?? '—'}</div><div class="score-lbl">Total PHQ-4</div></div>
  <div class="score-cell" style="background:${phq4s.depression_risk || phq4s.anxiety_risk ? '#e0e0e0' : '#f7f7f7'}">
    <div style="font-size:9.5pt;font-weight:bold;color:#111">
      ${phq4s.depression_risk && phq4s.anxiety_risk ? 'Both Flagged' : phq4s.depression_risk ? 'Depression ⚑' : phq4s.anxiety_risk ? 'Anxiety ⚑' : 'No Flag'}
    </div>
    <div class="score-lbl">Screening Result</div>
  </div>
</div>` : ''}
` : '<p style="font-size:9pt;color:#777;font-style:italic;">PHQ-4 not collected (fast-track or deferred).</p>'}` : ''}

${s.clinicalAssessment ? `
<!-- ── SECTION 6: CLINICAL ASSESSMENT ── -->
<h2 class="page-break">6. Clinical Assessment (IC Session)</h2>
${phq9r.length > 0 ? `
<p style="font-size:9pt;font-weight:bold;color:#111;margin-bottom:4px;">PHQ-9 — Patient Health Questionnaire</p>
<p style="font-size:8.5pt;color:#555;margin-bottom:8px;">Over the <strong>last 2 weeks</strong>, how often have you been bothered by any of the following problems?</p>
<table>
  <thead><tr><th style="width:30px;">#</th><th>Question</th><th style="width:50px;text-align:center;">Score</th><th style="width:160px;">Response</th></tr></thead>
  <tbody>${phq9Rows}</tbody>
</table>
<div class="score-summary" style="grid-template-columns:repeat(2,1fr);max-width:360px;">
  <div class="score-cell"><div class="score-num">${phq9Score ?? '—'}</div><div class="score-lbl">PHQ-9 Total Score</div></div>
  <div class="score-cell"><div style="font-size:10pt;font-weight:bold;color:#111;">${phq9Severity(phq9Score)}</div><div class="score-lbl">Severity</div></div>
</div>` : '<p style="font-size:9pt;color:#777;font-style:italic;margin-bottom:12px;">PHQ-9 not administered.</p>'}
${gad7r.length > 0 ? `
<p style="font-size:9pt;font-weight:bold;color:#111;margin-bottom:4px;margin-top:14px;">GAD-7 — Generalized Anxiety Disorder Scale</p>
<p style="font-size:8.5pt;color:#555;margin-bottom:8px;">Over the <strong>last 2 weeks</strong>, how often have you been bothered by the following problems?</p>
<table>
  <thead><tr><th style="width:30px;">#</th><th>Question</th><th style="width:50px;text-align:center;">Score</th><th style="width:160px;">Response</th></tr></thead>
  <tbody>${gad7Rows}</tbody>
</table>
<div class="score-summary" style="grid-template-columns:repeat(2,1fr);max-width:360px;">
  <div class="score-cell"><div class="score-num">${gad7Score ?? '—'}</div><div class="score-lbl">GAD-7 Total Score</div></div>
  <div class="score-cell"><div style="font-size:10pt;font-weight:bold;color:#111;">${gad7Severity(gad7Score)}</div><div class="score-lbl">Severity</div></div>
</div>` : '<p style="font-size:9pt;color:#777;font-style:italic;margin-top:12px;">GAD-7 not administered.</p>'}` : ''}

${s.triageSummary ? `
<!-- ── SECTION 7: TRIAGE SUMMARY ── -->
<h2>7. IC Triage Summary</h2>
<div class="grid2" style="margin-bottom:10px;">
  <div class="field">
    <div class="field-label">Overall Risk Level</div>
    <div class="field-value" style="padding-top:3px;">
      <span class="risk-badge" style="${riskBadge(riskLevel)}">${riskLevel}</span>
    </div>
  </div>
  <div class="field"><div class="field-label">Triage Completed</div><div class="field-value">${fmtDateTime(triagedAt)}</div></div>
</div>
${decision ? `
<div class="decision-box">
  <div style="font-size:8pt;color:#555;margin-bottom:2px;">Triage Decision</div>
  <div class="decision-label">${decisionLabel(decision)}</div>
</div>` : '<p style="font-size:9pt;color:#777;font-style:italic;margin-bottom:8px;">Triage not yet completed.</p>'}
<div class="field" style="margin-top:10px;">
  <div class="field-label">IC Endorsement Notes</div>
  <div class="notes-box">${notes || '(No notes provided)'}</div>
</div>` : ''}

${s.consent ? `
<!-- ── SECTION 8: CONSENT DOCUMENTATION ── -->
<h2>8. Consent Documentation</h2>
<div class="consent-row">
  <div class="check ${consentService ? 'yes' : 'no'}">${consentService ? '✓' : '✗'}</div>
  <span>Consent to Services — Student agrees to receive counseling services from DLSU CPS</span>
</div>
<div class="consent-row">
  <div class="check ${consentData ? 'yes' : 'no'}">${consentData ? '✓' : '✗'}</div>
  <span>Data Privacy Consent — Student agrees to processing of personal information (RA 10173)</span>
</div>
${consentTs ? `<p style="font-size:8pt;color:#777;margin-top:6px;">Consent recorded: ${fmtDateTime(consentTs)}</p>` : ''}
<p style="font-size:8pt;color:#777;margin-top:4px;">Consent version: 2025-AY</p>` : ''}

${s.signatureBlock ? `
<!-- ── SIGNATURE BLOCK ── -->
<div style="margin-top:28px;display:grid;grid-template-columns:1fr 1fr;gap:40px;">
  <div>
    <div style="border-top:1.5px solid #111;padding-top:6px;margin-top:32px;">
      <p style="font-size:9pt;font-weight:bold;">${val(intake?.counselor_name)}</p>
      <p style="font-size:8pt;color:#555;">Intake Counselor / Assessing Clinician</p>
    </div>
  </div>
  <div>
    <div style="border-top:1.5px solid #111;padding-top:6px;margin-top:32px;">
      <p style="font-size:9pt;">&nbsp;</p>
      <p style="font-size:8pt;color:#555;">Supervising Clinician (if applicable)</p>
    </div>
  </div>
</div>` : ''}

<!-- ── FOOTER ── -->
<div class="footer">
  <span>DLSU Counseling and Psychological Services — Clinical Intake Documentation</span>
  <span>Document ID: ${docId} | Generated: ${generatedAt}</span>
</div>

</body>
</html>`;
}

// ─── Section definitions ──────────────────────────────────────────────────

export type SectionKey =
  | 'studentInfo'
  | 'presentingConcern'
  | 'emergencyContact'
  | 'spif'
  | 'phq4'
  | 'clinicalAssessment'
  | 'triageSummary'
  | 'consent'
  | 'signatureBlock';

export const SECTION_LABELS: Record<SectionKey, string> = {
  studentInfo:        'Student Information',
  presentingConcern:  'Presenting Concern & Service Request',
  emergencyContact:   'Emergency Contact',
  spif:               'Personal & Family Background (SPIF-IF)',
  phq4:               'PHQ-4 Initial Screening',
  clinicalAssessment: 'Clinical Assessment (PHQ-9 / GAD-7)',
  triageSummary:      'IC Triage Summary',
  consent:            'Consent Documentation',
  signatureBlock:     'Signature Block',
};

export const ALL_SECTIONS: SectionKey[] = Object.keys(SECTION_LABELS) as SectionKey[];

export type SectionsMap = Record<SectionKey, boolean>;

export const DEFAULT_SECTIONS: SectionsMap = {
  studentInfo: true, presentingConcern: true, emergencyContact: true,
  spif: true, phq4: true, clinicalAssessment: true,
  triageSummary: true, consent: true, signatureBlock: true,
};

// ─── Public export function ────────────────────────────────────────────────

export async function exportClinicalDoc(
  intakeId: string,
  appointmentId: string | null,
  token: string,
  sections: SectionsMap = DEFAULT_SECTIONS,
): Promise<void> {
  const headers = { Authorization: `Bearer ${token}` };

  const [intakeRes, packetRes] = await Promise.all([
    fetch(api(`/api/intake/${intakeId}`), { headers }),
    appointmentId
      ? fetch(api(`/api/intake/packet/${appointmentId}`), { headers })
      : Promise.resolve(null),
  ]);

  const intake = intakeRes.ok ? await intakeRes.json() : null;
  const packet = packetRes?.ok ? await packetRes.json() : null;

  const html = buildHtml(intake, packet, sections);

  const win = window.open('', '_blank');
  if (!win) { alert('Pop-ups blocked — please allow pop-ups for this site and try again.'); return; }
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 600);
}
