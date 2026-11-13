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

// A document that was signed and found wrong is corrected by issuing a new one
// in its place. The new one keeps the number it replaces and adds the round of
// correction, so the two are read as one document put right rather than two
// claims: GAC69-005-202611-0048 → …-0048-R1 → …-0048-R2.
const REVISION = /-R(\d+)$/i

export function reviseDocNumber(docNumber: string): string {
  const n = docNumber.trim()
  const m = REVISION.exec(n)
  return m ? n.replace(REVISION, `-R${Number(m[1]) + 1}`) : `${n}-R1`
}

// Which round of correction a number is on — 0 for a document never corrected.
export function revisionOf(docNumber: string): number {
  return Number(REVISION.exec(docNumber.trim())?.[1] ?? 0)
}

// The number without its round of correction: what every revision of the same
// document has in common.
export function baseDocNumber(docNumber: string): string {
  return docNumber.trim().replace(REVISION, '')
}
