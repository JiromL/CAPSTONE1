'use client';

import { useState } from 'react';
import { X, FileText, Loader2 } from 'lucide-react';
import {
  exportClinicalDoc,
  ALL_SECTIONS,
  SECTION_LABELS,
  DEFAULT_SECTIONS,
  type SectionKey,
  type SectionsMap,
} from '@/utils/clinicalExport';

interface Props {
  intakeId: string;
  appointmentId: string | null;
  onClose: () => void;
}

export function ClinicalExportModal({ intakeId, appointmentId, onClose }: Props) {
  const [sections, setSections] = useState<SectionsMap>({ ...DEFAULT_SECTIONS });
  const [exporting, setExporting] = useState(false);

  const allChecked = ALL_SECTIONS.every(k => sections[k]);
  const noneChecked = ALL_SECTIONS.every(k => !sections[k]);

  const toggle = (key: SectionKey) =>
    setSections(prev => ({ ...prev, [key]: !prev[key] }));

  const toggleAll = () => {
    const next = !allChecked;
    setSections(Object.fromEntries(ALL_SECTIONS.map(k => [k, next])) as SectionsMap);
  };

  const handleExport = async () => {
    if (noneChecked) return;
    setExporting(true);
    try {
      const token = localStorage.getItem('token') ?? '';
      await exportClinicalDoc(intakeId, appointmentId, token, sections);
      onClose();
    } finally {
      setExporting(false);
    }
  };

  // Section grouping for visual structure
  const GROUPS: { label: string; keys: SectionKey[] }[] = [
    {
      label: 'Student Details',
      keys: ['studentInfo', 'presentingConcern', 'emergencyContact', 'spif'],
    },
    {
      label: 'Clinical Screening',
      keys: ['phq4', 'clinicalAssessment'],
    },
    {
      label: 'Outcome & Compliance',
      keys: ['triageSummary', 'consent', 'signatureBlock'],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-gray-500" />
              <h3 className="font-semibold text-sm text-gray-900">Export Clinical Documentation</h3>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Choose which sections to include in the PDF.</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition mt-0.5">
            <X size={14} className="text-gray-400" />
          </button>
        </div>

        {/* Select all toggle */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500">
            {ALL_SECTIONS.filter(k => sections[k]).length} of {ALL_SECTIONS.length} sections selected
          </span>
          <button
            onClick={toggleAll}
            className="text-xs font-semibold text-[#2563eb] hover:underline"
          >
            {allChecked ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        {/* Section checkboxes */}
        <div className="px-6 py-4 space-y-4 max-h-72 overflow-y-auto">
          {GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{group.label}</p>
              <div className="space-y-1.5">
                {group.keys.map(key => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${
                      sections[key]
                        ? 'bg-[#2563eb] border-[#2563eb]'
                        : 'border-gray-300 group-hover:border-[#2563eb]/50'
                    }`}>
                      {sections[key] && (
                        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                          <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={sections[key]}
                      onChange={() => toggle(key)}
                    />
                    <span className={`text-sm transition ${sections[key] ? 'text-gray-900' : 'text-gray-400'}`}>
                      {SECTION_LABELS[key]}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-3 border-t border-gray-100 flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition">
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || noneChecked}
            className="flex-1 px-4 py-2 bg-[#2563eb] hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition flex items-center justify-center gap-2"
          >
            {exporting
              ? <><Loader2 size={13} className="animate-spin" /> Generating…</>
              : <><FileText size={13} /> Export PDF</>}
          </button>
        </div>

      </div>
    </div>
  );
}
