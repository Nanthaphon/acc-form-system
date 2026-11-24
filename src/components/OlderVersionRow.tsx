import { CornerDownRight, Eye } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { SubmissionSummary } from '../types/schema'
import { submissionAmount } from '../data/submissions'
import { formatDate } from '../shared/date'
import { formatMoney } from '../shared/money'

// An earlier round of a corrected document, folded under the latest one (R1, R2 …):
// drawn as a layer below it — a line down from the row above and an arrow into
// this one — so the history reads newest → oldest at a glance.
export default function OlderVersionRow({ doc, colSpan, label, last }: {
  doc: SubmissionSummary
  colSpan: number
  /** "ฉบับเดิม" for the original, "R1" for the first correction … */
  label: string
  /** The bottom of the stack: the line stops here. */
  last: boolean
}) {
  return (
    <tr className="bg-clay-50/40">
      <td colSpan={colSpan} className="py-0 pl-6 pr-4">
        <div className="relative flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 pl-8 text-xs">
          {/* the connector: a line down from the row above, turning into this one */}
          <span aria-hidden className={`absolute left-2 top-0 w-px bg-clay-200 ${last ? 'h-1/2' : 'h-full'}`} />
          <CornerDownRight aria-hidden size={15} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-clay-400" />
          <span className="rounded-md bg-white px-1.5 py-0.5 font-medium text-clay-700 ring-1 ring-clay-200">{label}</span>
          <span className="font-mono text-[12.5px] text-stone-500 line-through decoration-stone-400">{doc.docNumber}</span>
          <span className="rounded-md bg-rose-50 px-1.5 py-0.5 font-medium text-brick-700">ไม่ได้ใช้แล้ว</span>
          <span className="text-stone-500">{formatDate(doc.createdAt)}</span>
          <span className="tabular-nums text-stone-600">{formatMoney(submissionAmount(doc))} บาท</span>
          {doc.voided?.reason && <span className="min-w-0 max-w-[24rem] truncate text-stone-500" title={doc.voided.reason}>เหตุผลที่แก้: {doc.voided.reason}</span>}
          <Link
            to={`/submission/${doc.id}/preview`}
            aria-label={`ดูเอกสารฉบับ ${doc.docNumber}`}
            className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-clay-700 transition-colors hover:bg-white"
          >
            <Eye size={14} /> ดูฉบับนี้
          </Link>
        </div>
      </td>
    </tr>
  )
}

/** The label of each earlier round: R2, R1 … down to ฉบับเดิม (the original). */
export function roundLabel(docNumber: string): string {
  const m = /-R(\d+)$/.exec(docNumber.trim())
  return m ? `R${m[1]}` : 'ฉบับเดิม'
}
