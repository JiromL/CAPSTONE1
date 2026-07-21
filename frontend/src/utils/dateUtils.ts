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
