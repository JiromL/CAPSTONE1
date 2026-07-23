/**
 * Shared badge definitions — single source of truth for risk and status
 * color encoding across all pages. Import from here; never redefine locally.
 */

import React from 'react';

/* ── Risk level ─────────────────────────────────────────────────────────── */

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'RED' | 'YELLOW' | 'MEDIUM' | 'GREEN' | 'LOW' | string;

export interface BadgeStyle {
  bg: string;
  text: string;
  border: string;
  dot?: string;
  label: string;
}

export function getRiskBadgeStyle(level: RiskLevel): BadgeStyle {
  switch ((level || '').toUpperCase()) {
    case 'CRITICAL':
      return { bg: 'var(--color-danger-surface)', text: 'var(--color-danger)', border: 'rgba(220,38,38,0.3)', dot: 'var(--color-danger)', label: 'Critical' };
    case 'HIGH':
    case 'RED':
      return { bg: 'var(--color-danger-surface)', text: 'var(--color-danger-text)', border: 'rgba(220,38,38,0.2)', dot: 'var(--color-danger)', label: level.toUpperCase() === 'HIGH' ? 'High' : 'High Risk' };
    case 'MEDIUM':
    case 'YELLOW':
      return { bg: 'var(--color-warning-surface)', text: 'var(--color-warning-text)', border: 'rgba(217,119,6,0.2)', dot: 'var(--color-warning)', label: 'Moderate' };
    case 'LOW':
    case 'GREEN':
      return { bg: 'var(--color-success-surface)', text: 'var(--color-success-text)', border: 'rgba(5,150,105,0.2)', dot: 'var(--color-success)', label: 'Low Risk' };
    default:
      return { bg: 'var(--color-border)', text: 'var(--color-text-muted)', border: 'var(--color-border)', label: level || 'Unknown' };
  }
}

/* ── Appointment / case status ──────────────────────────────────────────── */

export function getStatusBadgeStyle(status: string): BadgeStyle {
  switch ((status || '').toUpperCase()) {
    // Case statuses
    case 'ACTIVE':
      return { bg: 'var(--color-success-surface)', text: 'var(--color-success-text)', border: 'rgba(5,150,105,0.2)', label: 'Active' };
    case 'NEW':
      return { bg: 'var(--color-primary-surface)', text: 'var(--color-primary-text)', border: 'rgba(35,82,204,0.2)', label: 'New' };
    case 'INTAKE_SCHEDULED':
      return { bg: 'var(--color-warning-surface)', text: 'var(--color-warning-text)', border: 'rgba(217,119,6,0.2)', label: 'Intake Scheduled' };
    case 'PENDING_TERMINATION':
      return { bg: 'rgba(249,115,22,0.1)', text: '#C2410C', border: 'rgba(249,115,22,0.25)', label: 'Pending Closure' };
    case 'CLOSED':
      return { bg: 'var(--color-border)', text: 'var(--color-text-muted)', border: 'var(--color-border)', label: 'Closed' };
    case 'CANCELLED':
      return { bg: 'var(--color-danger-surface)', text: 'var(--color-danger-text)', border: 'rgba(220,38,38,0.2)', label: 'Cancelled' };
    // Appointment statuses
    case 'PENDING_APPROVAL':
    case 'REQUESTED':
      return { bg: 'var(--color-warning-surface)', text: 'var(--color-warning-text)', border: 'rgba(217,119,6,0.2)', label: status === 'REQUESTED' ? 'Requested' : 'Under Review' };
    case 'APPROVED':
    case 'MATCHED':
    case 'CONFIRMED':
      return { bg: 'var(--color-success-surface)', text: 'var(--color-success-text)', border: 'rgba(5,150,105,0.2)', label: 'Confirmed' };
    case 'CHECKED_IN':
      return { bg: 'var(--color-primary-surface)', text: 'var(--color-primary-text)', border: 'rgba(35,82,204,0.2)', label: 'Checked In' };
    case 'COMPLETED':
    case 'FOLLOW_UP':
      return { bg: 'var(--color-success-surface)', text: 'var(--color-success-text)', border: 'rgba(5,150,105,0.15)', label: status === 'FOLLOW_UP' ? 'Follow-up' : 'Completed' };
    case 'NO_SHOW':
      return { bg: 'var(--color-danger-surface)', text: 'var(--color-danger-text)', border: 'rgba(220,38,38,0.2)', label: 'No Show' };
    case 'DENIED':
      return { bg: 'var(--color-danger-surface)', text: 'var(--color-danger-text)', border: 'rgba(220,38,38,0.15)', label: 'Denied' };
    case 'RESCHEDULE_REQUESTED':
      return { bg: 'rgba(124,58,237,0.1)', text: '#6D28D9', border: 'rgba(124,58,237,0.2)', label: 'Reschedule Requested' };
    case 'EVALUATION':
      return { bg: 'rgba(6,182,212,0.1)', text: '#0E7490', border: 'rgba(6,182,212,0.2)', label: 'Awaiting Review' };
    default:
      return { bg: 'var(--color-border)', text: 'var(--color-text-muted)', border: 'var(--color-border)', label: (status || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) };
  }
}

/* ── Session note type ──────────────────────────────────────────────────── */

export function getNoteTypeBadgeStyle(type: string): BadgeStyle {
  switch ((type || '').toUpperCase()) {
    case 'CRISIS':
      return { bg: 'var(--color-danger-surface)', text: 'var(--color-danger)', border: 'rgba(220,38,38,0.2)', label: 'Crisis' };
    case 'FOLLOW_UP':
      return { bg: 'var(--color-primary-surface)', text: 'var(--color-primary)', border: 'rgba(35,82,204,0.15)', label: 'Follow-up' };
    case 'INTAKE':
      return { bg: 'var(--color-success-surface)', text: 'var(--color-success)', border: 'rgba(5,150,105,0.15)', label: 'Intake' };
    default:
      return { bg: 'var(--color-primary-surface)', text: 'var(--color-primary-text)', border: 'rgba(35,82,204,0.15)', label: (type || 'Session').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) };
  }
}

/* ── Badge component ────────────────────────────────────────────────────── */

interface BadgeProps {
  style: BadgeStyle;
  size?: 'xs' | 'sm';
  dot?: boolean;
  className?: string;
}

export function Badge({ style, size = 'xs', dot = false, className = '' }: BadgeProps) {
  const padding = size === 'sm' ? 'px-2.5 py-1' : 'px-2 py-0.5';
  const fontSize = size === 'sm' ? 'text-xs' : 'text-[11px]';

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full leading-none ${padding} ${fontSize} ${className}`}
      style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}
    >
      {dot && style.dot && (
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: style.dot }} />
      )}
      {style.label}
    </span>
  );
}

export function RiskBadge({ level, size = 'xs', dot = true }: { level: string; size?: 'xs' | 'sm'; dot?: boolean }) {
  return <Badge style={getRiskBadgeStyle(level)} size={size} dot={dot} />;
}

export function StatusBadge({ status, size = 'xs' }: { status: string; size?: 'xs' | 'sm' }) {
  return <Badge style={getStatusBadgeStyle(status)} size={size} />;
}
