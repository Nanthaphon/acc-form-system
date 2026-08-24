// Document number: form code + YYYYMM (ค.ศ / Gregorian) + a 4-digit running
// number. The running number resets each month — see createSubmission, which
// keys the counter per form + month.
export function formatDocNumber(prefix: string, date: Date, seq: number): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const seqStr = String(seq).padStart(4, '0')
  const ym = `${yyyy}${mm}`
  // No form code → just YYYYMM-0001 (avoid showing the form's internal id).
  return prefix.trim() ? `${prefix.trim()}-${ym}-${seqStr}` : `${ym}-${seqStr}`
}
