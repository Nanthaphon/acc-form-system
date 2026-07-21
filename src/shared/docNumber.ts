export function formatDocNumber(prefix: string, date: Date, seq: number): string {
  const buddhistYear = date.getFullYear() + 543
  const yy = String(buddhistYear).slice(-2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const seqStr = String(seq).padStart(4, '0')
  return `${prefix}-${yy}${mm}-${seqStr}`
}
