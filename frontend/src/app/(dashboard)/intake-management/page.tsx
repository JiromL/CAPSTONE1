'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/utils/api';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { ClinicalExportModal } from '@/components/ClinicalExportModal';
import {
  Loader2, AlertCircle, RefreshCw, Search, CheckCircle2,
  ClipboardList, CalendarDays, FileCheck, PenLine, Clock,
  FileText, ChevronRight,
} from 'lucide-react';

interface IntakeAppointment {
  appointment_id: string;
  student_name: string;
  student_email: string;
  purpose: string;
  status: string;
  preferred_date?: string;
  preferred_time?: string;
  counselor_id?: string;
  concern?: string;
}

interface IntakeRecord {
  _id: string;
  appointment_id?: string;
  client_name: string;
  client_id_number: string;
  college_unit: string;
  program: string;
  service_requested: string;
  status: string;
  created_date: string;
  intake_packet_submitted?: boolean;
  case_id?: string;
}

const STAGES = [
  {
    key: 'awaiting',
    label: 'Awaiting Confirmation',
    sublabel: 'Confirm the student\'s slot',
    icon: Clock,
    ring: 'ring-amber-400', bg: 'bg-amber-50', txt: 'text-amber-700',
    cardBorder: 'border-amber-100', cardBg: 'bg-amber-50/30',
    emptyMsg: 'No pending confirmations — all intake slots are confirmed.',
  },
  {
    key: 'scheduled',
    label: 'Session Scheduled',
    sublabel: 'Conduct the intake interview',
    icon: CalendarDays,
    ring: 'ring-blue-400', bg: 'bg-blue-50', txt: 'text-[#2563eb]',
    cardBorder: 'border-blue-100', cardBg: 'bg-blue-50/20',
    emptyMsg: 'No sessions scheduled yet. Confirmed intakes will appear here.',
  },
  {
    key: 'write',
    label: 'Complete IC Report',
    sublabel: 'Write clinical notes & endorsement',
    icon: PenLine,
    ring: 'ring-purple-400', bg: 'bg-purple-50', txt: 'text-purple-700',
    cardBorder: 'border-purple-100', cardBg: 'bg-purple-50/20',
    emptyMsg: 'No reports pending. Conducted intakes waiting for clinical documentation will appear here.',
  },
  {
    key: 'done',
    label: 'Completed',
    sublabel: 'View completed intake records',
    icon: CheckCircle2,
    ring: 'ring-green-400', bg: 'bg-green-50', txt: 'text-green-700',
    cardBorder: 'border-green-100', cardBg: 'bg-green-50/20',
    emptyMsg: 'No completed intakes yet.',
  },
] as const;
type StageKey = typeof STAGES[number]['key'];

const SERVICE_LABELS: Record<string, string> = {
  personal_counseling:   'Personal Counseling',
  career_counseling:     'Career Counseling',
  group_counseling:      'Group Counseling',
  psychological_testing: 'Psychological Testing',
  consultation:          'Consultation',
};

function fmtDate(d?: string) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return d; }
}

function fmtTime(t?: string) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return ` · ${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

function fmtService(v?: string) {
  if (!v) return '—';
  return SERVICE_LABELS[v] ?? v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Stage cards ───────────────────────────────────────────────────────────────

function AwaitingCard({
  apt,
  onConfirm,
  confirming,
  msg,
}: {
  apt: IntakeAppointment;
  onConfirm: () => void;
  confirming: boolean;
  msg: { type: 'ok' | 'err'; text: string } | null;
}) {
  const canConfirm = !!(apt.counselor_id && apt.preferred_time);
  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">{apt.student_name}</p>
        <p className="text-xs text-gray-400">{apt.student_email}</p>
        {apt.preferred_date && (
          <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
            <CalendarDays size={11} />
            Requested: {fmtDate(apt.preferred_date)}{fmtTime(apt.preferred_time)}
          </p>
        )}
        {msg && (
          <p className={`text-xs mt-1.5 font-medium ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
            {msg.text}
          </p>
        )}
      </div>
      <div className="flex-shrink-0">
        {canConfirm ? (
          <button
            onClick={onConfirm}
            disabled={confirming || !!msg}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#2563eb] rounded-lg hover:bg-blue-700 disabled:opacity-50 transition whitespace-nowrap"
          >
            {confirming ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
            Confirm Slot
          </button>
        ) : (
          <span className="text-xs text-amber-600 font-medium whitespace-nowrap">No slot selected</span>
        )}
      </div>
    </div>
  );
}

function ScheduledCard({ apt }: { apt: IntakeAppointment }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/20 p-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">{apt.student_name}</p>
        <p className="text-xs text-gray-400">{apt.student_email}</p>
        {apt.preferred_date && (
          <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
            <CalendarDays size={11} />
            {fmtDate(apt.preferred_date)}{fmtTime(apt.preferred_time)}
          </p>
        )}
      </div>
      <Link href={`/ic/intake/conduct/${apt.appointment_id}`} className="flex-shrink-0">
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#2563eb] rounded-lg hover:bg-blue-700 transition whitespace-nowrap">
          <ClipboardList size={11} /> Start Intake
        </button>
      </Link>
    </div>
  );
}

function WriteCard({
  intake,
  onExport,
}: {
  intake: IntakeRecord;
  onExport: () => void;
}) {
  return (
    <div className="rounded-xl border border-purple-100 bg-purple-50/20 p-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">{intake.client_name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {intake.client_id_number && (
            <span className="text-xs text-gray-400 font-mono">{intake.client_id_number}</span>
          )}
          {intake.college_unit && (
            <span className="text-xs text-gray-400 truncate max-w-[140px]">{intake.college_unit}</span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">{fmtService(intake.service_requested)}</p>
        <p className="text-xs text-gray-400 mt-0.5">Intake date: {fmtDate(intake.created_date)}</p>
        {intake.intake_packet_submitted ? (
          <span className="inline-flex items-center gap-1 mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-700 ring-1 ring-green-200">
            <FileCheck size={10} /> Student packet ready
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium bg-orange-50 text-orange-600 ring-1 ring-orange-200">
            Packet pending
          </span>
        )}
      </div>
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <Link href={`/cases/${intake.case_id}?tab=intake-summary`}>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition whitespace-nowrap">
            <PenLine size={11} /> Complete Report
          </button>
        </Link>
        {intake.intake_packet_submitted && (
          <button
            onClick={onExport}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-purple-300 hover:text-purple-600 transition whitespace-nowrap"
          >
            <FileText size={11} /> Export
          </button>
        )}
      </div>
    </div>
  );
}

function DoneCard({
  intake,
  onExport,
}: {
  intake: IntakeRecord;
  onExport: () => void;
}) {
  return (
    <div className="rounded-xl border border-green-100 bg-green-50/20 p-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">{intake.client_name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {intake.client_id_number && (
            <span className="text-xs text-gray-400 font-mono">{intake.client_id_number}</span>
          )}
          {intake.college_unit && (
            <span className="text-xs text-gray-400 truncate max-w-[140px]">{intake.college_unit}</span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">{fmtService(intake.service_requested)}</p>
        <p className="text-xs text-gray-400 mt-0.5">Completed: {fmtDate(intake.created_date)}</p>
      </div>
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <Link href={`/cases/${intake.case_id}?tab=intake-summary`}>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-green-200 text-green-700 bg-white rounded-lg hover:bg-green-50 transition whitespace-nowrap">
            <FileCheck size={11} /> View Summary
          </button>
        </Link>
        <button
          onClick={onExport}
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-green-300 hover:text-green-600 transition whitespace-nowrap"
        >
          <FileText size={11} /> Export
        </button>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function IntakeManagementPage() {
  const [appointments, setAppointments] = useState<IntakeAppointment[]>([]);
  const [intakes, setIntakes]           = useState<IntakeRecord[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [activeStage, setActiveStage]   = useState<StageKey>('awaiting');
  const [search, setSearch]             = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [actionMsg, setActionMsg]       = useState<{ id: string; type: 'ok' | 'err'; text: string } | null>(null);
  const [exportTarget, setExportTarget] = useState<{ intakeId: string; appointmentId: string | null } | null>(null);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true); setError(null);
    try {
      const token = localStorage.getItem('token');
      const h = { Authorization: `Bearer ${token}` };
      const [aptRes, intakeRes] = await Promise.all([
        fetch(api('/api/appointments/dashboard/role-view'), { headers: h }),
        fetch(api('/api/client-tracking/new-intakes?page=1&limit=200&mine=true'), { headers: h }),
      ]);
      if (aptRes.status === 401 || aptRes.status === 422) {
        ['token', 'user'].forEach(k => localStorage.removeItem(k));
        window.location.href = '/login';
        return;
      }
      if (!aptRes.ok) throw new Error('Failed to load appointments');
      const aptData = await aptRes.json();
      const intakeData = intakeRes.ok ? await intakeRes.json() : { data: [] };

      const intakeApts = (aptData.appointments || []).filter(
        (a: IntakeAppointment) => a.purpose === 'intake_interview'
      );
      setAppointments(intakeApts);
      setIntakes(intakeData.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally { setLoading(false); }
  }

  async function confirmSlot(aptId: string) {
    setConfirmingId(aptId);
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api(`/api/appointments/${aptId}/confirm-intake`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (r.ok) {
        setActionMsg({ id: aptId, type: 'ok', text: 'Confirmed — student notified.' });
        setTimeout(() => { setActionMsg(null); fetchAll(); }, 1500);
      } else {
        const e = await r.json();
        setActionMsg({ id: aptId, type: 'err', text: e.error || 'Failed to confirm.' });
        setTimeout(() => setActionMsg(null), 3000);
      }
    } finally { setConfirmingId(null); }
  }

  // ── Stage buckets ─────────────────────────────────────────────────────────
  const awaiting  = appointments.filter(a => ['REQUESTED', 'PENDING_APPROVAL'].includes(a.status));
  const scheduled = appointments.filter(a => ['CONFIRMED', 'APPROVED', 'MATCHED', 'CHECKED_IN'].includes(a.status));
  const write     = intakes.filter(i => i.case_id && i.status !== 'COMPLETED');
  const done      = intakes.filter(i => i.status === 'COMPLETED');

  const stageCounts: Record<StageKey, number> = {
    awaiting: awaiting.length,
    scheduled: scheduled.length,
    write: write.length,
    done: done.length,
  };

  // ── Search ────────────────────────────────────────────────────────────────
  const q = search.toLowerCase();
  function filterApts(list: IntakeAppointment[]) {
    if (!q) return list;
    return list.filter(a =>
      a.student_name?.toLowerCase().includes(q) ||
      a.student_email?.toLowerCase().includes(q)
    );
  }
  function filterIntakes(list: IntakeRecord[]) {
    if (!q) return list;
    return list.filter(i =>
      i.client_name?.toLowerCase().includes(q) ||
      i.client_id_number?.toLowerCase().includes(q) ||
      i.college_unit?.toLowerCase().includes(q)
    );
  }

  const visible = {
    awaiting:  filterApts(awaiting),
    scheduled: filterApts(scheduled),
    write:     filterIntakes(write),
    done:      filterIntakes(done),
  };

  const currentStage = STAGES.find(s => s.key === activeStage)!;

  // ── Loading / Error ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <DashboardPageWrapper title="Intake Management" subtitle="Track your intake interviews from booking to completion">
        <div className="flex items-center justify-center h-48 gap-2 text-gray-400 text-sm">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      </DashboardPageWrapper>
    );
  }

  if (error) {
    return (
      <DashboardPageWrapper title="Intake Management" subtitle="Track your intake interviews from booking to completion">
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
          <AlertCircle size={14} /> {error}
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <>
      <DashboardPageWrapper title="Intake Management" subtitle="Track your intake interviews from booking to completion">

        {/* Pipeline stage cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {STAGES.map((s, idx) => {
            const isActive = activeStage === s.key;
            const count    = stageCounts[s.key];
            const hasItems = count > 0;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setActiveStage(s.key)}
                className={`relative flex flex-col rounded-xl border px-4 py-3 text-left transition w-full ${
                  isActive
                    ? `ring-2 ${s.ring} border-transparent ${s.bg}`
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {/* Step indicator */}
                <span className="text-[10px] font-bold tracking-widest text-gray-300 uppercase mb-1">Step {idx + 1}</span>
                <div className="flex items-center gap-2">
                  <s.icon size={14} className={isActive ? s.txt : hasItems ? s.txt : 'text-gray-300'} />
                  <span className={`text-xl font-bold ${isActive ? s.txt : hasItems ? s.txt : 'text-gray-300'}`}>
                    {count}
                  </span>
                </div>
                <p className={`text-xs mt-1 font-medium leading-tight ${isActive ? s.txt : 'text-gray-500'}`}>
                  {s.label}
                </p>
                {isActive && (
                  <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                )}
              </button>
            );
          })}
        </div>

        {/* List card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Card header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-sm font-bold text-gray-900">{currentStage.label}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{currentStage.sublabel}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search student…"
                  className="pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb] focus:outline-none w-40"
                />
              </div>
              <button
                onClick={fetchAll}
                className="p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition"
                title="Refresh"
              >
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

          {/* Stage content */}
          <div className="p-4 space-y-3">
            {/* Awaiting Confirmation */}
            {activeStage === 'awaiting' && (
              visible.awaiting.length === 0 ? (
                <EmptyState msg={currentStage.emptyMsg} icon={currentStage.icon} />
              ) : (
                visible.awaiting.map(apt => (
                  <AwaitingCard
                    key={apt.appointment_id}
                    apt={apt}
                    onConfirm={() => confirmSlot(apt.appointment_id)}
                    confirming={confirmingId === apt.appointment_id}
                    msg={actionMsg?.id === apt.appointment_id ? { type: actionMsg.type, text: actionMsg.text } : null}
                  />
                ))
              )
            )}

            {/* Session Scheduled */}
            {activeStage === 'scheduled' && (
              visible.scheduled.length === 0 ? (
                <EmptyState msg={currentStage.emptyMsg} icon={currentStage.icon} />
              ) : (
                visible.scheduled.map(apt => (
                  <ScheduledCard key={apt.appointment_id} apt={apt} />
                ))
              )
            )}

            {/* Write Assessment */}
            {activeStage === 'write' && (
              visible.write.length === 0 ? (
                <EmptyState msg={currentStage.emptyMsg} icon={currentStage.icon} />
              ) : (
                visible.write.map(intake => (
                  <WriteCard
                    key={intake._id}
                    intake={intake}
                    onExport={() => setExportTarget({ intakeId: intake._id, appointmentId: intake.appointment_id ?? null })}
                  />
                ))
              )
            )}

            {/* Completed */}
            {activeStage === 'done' && (
              visible.done.length === 0 ? (
                <EmptyState msg={currentStage.emptyMsg} icon={currentStage.icon} />
              ) : (
                visible.done.map(intake => (
                  <DoneCard
                    key={intake._id}
                    intake={intake}
                    onExport={() => setExportTarget({ intakeId: intake._id, appointmentId: intake.appointment_id ?? null })}
                  />
                ))
              )
            )}
          </div>

          {/* Footer count */}
          {visible[activeStage].length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-400">
                Showing <strong className="text-gray-600">{visible[activeStage].length}</strong> record{visible[activeStage].length !== 1 ? 's' : ''}
                {search && <span> matching <span className="font-medium">"{search}"</span></span>}
              </p>
            </div>
          )}
        </div>

        {/* Pipeline guide */}
        <div className="mt-4 rounded-xl border border-gray-100 bg-white px-5 py-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Intake Pipeline</p>
          <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
            {STAGES.map((s, i) => (
              <span key={s.key} className="flex items-center gap-2">
                <button
                  onClick={() => setActiveStage(s.key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium transition ${
                    activeStage === s.key
                      ? `${s.bg} ${s.txt} ring-1 ${s.ring}`
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <s.icon size={11} />
                  {s.label}
                  {stageCounts[s.key] > 0 && (
                    <span className={`text-[10px] font-bold min-w-[16px] h-[16px] flex items-center justify-center rounded-full px-1 ${
                      activeStage === s.key ? 'bg-white/60' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {stageCounts[s.key]}
                    </span>
                  )}
                </button>
                {i < STAGES.length - 1 && <ChevronRight size={12} className="text-gray-300 flex-shrink-0" />}
              </span>
            ))}
          </div>
        </div>

      </DashboardPageWrapper>

      {exportTarget && (
        <ClinicalExportModal
          intakeId={exportTarget.intakeId}
          appointmentId={exportTarget.appointmentId}
          onClose={() => setExportTarget(null)}
        />
      )}
    </>
  );
}

function EmptyState({ msg, icon: Icon }: { msg: string; icon: React.ElementType }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
        <Icon size={18} className="text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-600">All clear</p>
      <p className="text-xs text-gray-400 mt-1 max-w-xs">{msg}</p>
    </div>
  );
}
