import type { ReactNode } from 'react'
import { Ban, CircleCheck, Clock3, FileCheck2, Files, Wallet } from 'lucide-react'
import type { SubmissionStatus, SubmissionSummary } from '../types/schema'
import { subStatus, submissionAmount } from '../data/submissions'
import { formatMoney } from '../shared/money'

// The documents at a glance, one tile a status — and each tile is the status
// filter: press it to see only those, press it again (or "ทั้งหมด") for all.
const TILES: { status: SubmissionStatus | ''; label: string; icon: ReactNode; tone: string; ring: string }[] = [
  { status: '', label: 'ทั้งหมด', icon: <Files size={18} />, tone: 'bg-clay-600 text-white', ring: 'ring-clay-600' },
  { status: 'pending', label: 'รอลายเซ็น', icon: <Clock3 size={18} />, tone: 'bg-ochre-50 text-ochre-700', ring: 'ring-ochre-500' },
  { status: 'signed', label: 'เซ็นครบ', icon: <CircleCheck size={18} />, tone: 'bg-olive-100 text-olive-800', ring: 'ring-olive-500' },
  { status: 'done', label: 'บันทึกแล้ว', icon: <FileCheck2 size={18} />, tone: 'bg-clay-100 text-clay-800', ring: 'ring-clay-500' },
  { status: 'void', label: 'ยกเลิก', icon: <Ban size={18} />, tone: 'bg-rose-100 text-brick-700', ring: 'ring-brick-500' },
]

export default function StatusTiles({ docs, shown, status, onStatus }: {
  /** Every document (the latest round of each), for the counts. */
  docs: SubmissionSummary[]
  /** What the filters are showing now, for the total. */
  shown: SubmissionSummary[]
  status: string
  onStatus: (status: string) => void
}) {
  const count = (st: SubmissionStatus | '') => (st ? docs.filter(d => subStatus(d) === st).length : docs.length)
  const total = shown.filter(d => !d.voided).reduce((sum, d) => sum + submissionAmount(d), 0)
  return (
    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {TILES.map(t => {
        const active = status === t.status
        return (
          <button
            key={t.label}
            type="button"
            aria-pressed={active}
            onClick={() => onStatus(active && t.status ? '' : t.status)}
            className={`group flex items-center gap-3 rounded-2xl border bg-white p-3.5 text-left shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-md ${
              active ? `border-transparent ring-2 ${t.ring}` : 'border-stone-200/60'
            }`}
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.tone}`}>{t.icon}</span>
            <span className="min-w-0">
              <span className="block text-xs text-stone-500">{t.label}</span>
              <span className="block text-xl font-semibold tabular-nums text-stone-900">{count(t.status)}</span>
            </span>
          </button>
        )
      })}
      <div className="col-span-2 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-clay-600 to-clay-800 p-3.5 text-white shadow-[0_6px_16px_-6px_rgba(30,78,140,0.6)] sm:col-span-1">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15"><Wallet size={18} /></span>
        <span className="min-w-0">
          <span className="block text-xs text-clay-100">ยอดรวมที่แสดง (บาท)</span>
          <span className="block truncate text-xl font-semibold tabular-nums">{formatMoney(total)}</span>
        </span>
      </div>
    </div>
  )
}
