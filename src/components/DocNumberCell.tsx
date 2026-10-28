import type { SubmissionSummary } from '../types/schema'

// A document's number in a list. A cancelled one is struck through and names
// the document that corrected it; a corrected one names the one it replaces —
// so the wrong copy and the right one are never mistaken for two claims.
export default function DocNumberCell({ sub }: { sub: Pick<SubmissionSummary, 'docNumber' | 'voided' | 'replaces'> }) {
  const note = sub.voided?.replacedByNumber ? `แก้เป็น ${sub.voided.replacedByNumber}`
    : sub.replaces?.docNumber ? `แทน ${sub.replaces.docNumber}`
    : null
  return (
    <>
      <span className={sub.voided ? 'text-stone-500 line-through decoration-stone-500' : undefined}>{sub.docNumber}</span>
      {note && <div className="font-sans text-[11px] text-stone-500">{note}</div>}
    </>
  )
}
