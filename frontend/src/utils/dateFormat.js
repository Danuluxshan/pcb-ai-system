// frontend/src/utils/dateFormat.js
/**
 * Converts backend timestamps (expected in UTC) into the viewing user's
 * local timezone for display, using the browser's own locale/timezone
 * settings automatically (Intl API) — no hardcoded timezone anywhere.
 *
 * Defensive: if a timestamp string has no explicit UTC/offset marker
 * (a common backend bug — Python's naive `datetime.isoformat()` omits
 * it), this treats it as UTC anyway rather than letting the browser
 * silently misinterpret it as already-local time.
 */

function toUtcSafeDate(isoString) {
  if (!isoString) return null;
  const hasTzMarker = /Z$|[+-]\d{2}:?\d{2}$/.test(isoString);
  const safeString = hasTzMarker ? isoString : `${isoString}Z`;
  const date = new Date(safeString);
  return isNaN(date.getTime()) ? null : date;
}

/** e.g. "28 Aug 2026, 14:32" — in the user's local timezone */
export function formatDateTime(isoString) {
  const date = toUtcSafeDate(isoString);
  if (!date) return '\u2014';
  return date.toLocaleString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** e.g. "28 Aug 2026" */
export function formatDate(isoString) {
  const date = toUtcSafeDate(isoString);
  if (!date) return '\u2014';
  return date.toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

/** e.g. "2:32 PM" */
export function formatTime(isoString) {
  const date = toUtcSafeDate(isoString);
  if (!date) return '\u2014';
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit', minute: '2-digit',
  });
}

/** e.g. "Just now", "5m ago", "3h ago", "2d ago", falling back to a date */
export function formatRelative(isoString) {
  const date = toUtcSafeDate(isoString);
  if (!date) return '\u2014';
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(isoString);
}

/** The browser's detected IANA timezone, e.g. "Asia/Colombo" — useful for a settings/debug display */
export function getUserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
