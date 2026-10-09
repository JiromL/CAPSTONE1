const PHT = 'Asia/Manila';

export function fmtDate(s: string | null | undefined): string {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString('en-PH', {
      timeZone: PHT, month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return s; }
}

export function fmtDateTime(s: string | null | undefined): string {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleString('en-PH', {
      timeZone: PHT, month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  } catch { return s; }
}

export function fmtTime(s: string | null | undefined): string {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleTimeString('en-PH', {
      timeZone: PHT, hour: 'numeric', minute: '2-digit', hour12: true,
    });
  } catch { return s; }
}

export function fmtDateShort(s: string | null | undefined): string {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString('en-PH', {
      timeZone: PHT, month: 'short', day: 'numeric',
    });
  } catch { return s; }
}

export function fmtDateWeekday(s: string | null | undefined): string {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString('en-PH', {
      timeZone: PHT, weekday: 'short', month: 'short', day: 'numeric',
    });
  } catch { return s; }
}

export function fmtDateLong(s: string | null | undefined): string {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString('en-PH', {
      timeZone: PHT, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
  } catch { return s; }
}

/** A Date's YYYY-MM-DD in the viewer's own calendar. Never use toISOString() for this: it
 *  converts to UTC, so in the Philippines local midnight becomes the previous day. */
export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Today's date in the Philippines as YYYY-MM-DD (correct between 12 and 8 AM too). */
export function todayPH(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}
