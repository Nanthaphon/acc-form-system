// System-wide date formatting: always dd/mm/yyyy in ค.ศ (Gregorian year),
// never Buddhist era. Use these instead of toLocale*('th-TH').

function pad(n: number): string { return String(n).padStart(2, '0') }

// A millisecond timestamp -> "dd/mm/yyyy" (returns '-' for empty).
export function formatDate(ms?: number | null): string {
  if (!ms) return '-'
  const d = new Date(ms)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

// A millisecond timestamp -> "dd/mm/yyyy HH:mm" (returns '-' for empty).
export function formatDateTime(ms?: number | null): string {
  if (!ms) return '-'
  const d = new Date(ms)
  return `${formatDate(ms)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// An ISO date string from <input type="date"> ("yyyy-mm-dd") -> "dd/mm/yyyy".
// Anything that isn't an ISO date is returned unchanged.
export function formatIsoDate(v: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v ?? '')
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (v ?? '')
}
