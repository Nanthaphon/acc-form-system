import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from 'lucide-react'
import { PAGE_SIZES } from '../shared/usePagination'

const iconBtn = 'inline-flex h-8 w-8 items-center justify-center rounded-lg text-stone-700 transition-colors hover:bg-stone-100 hover:text-clay-700 focus:outline-none focus:ring-2 focus:ring-clay-600/30 disabled:cursor-not-allowed disabled:text-stone-300 disabled:hover:bg-transparent'

// The footer of a paged table: how many lines a page, which lines are showing,
// and first / previous / next / last. Hidden when the list fits the smallest page.
export default function Pagination({ page, pageCount, pageSize, from, to, total, onPage, onPageSize }: {
  page: number
  pageCount: number
  pageSize: number
  from: number
  to: number
  total: number
  onPage: (page: number) => void
  onPageSize: (size: number) => void
}) {
  if (total <= PAGE_SIZES[0]) return null
  const first = page === 1
  const last = page === pageCount
  return (
    <nav aria-label="เลือกหน้า" className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2 border-t border-stone-100 px-4 py-2 text-sm text-stone-600">
      <label className="inline-flex items-center gap-2 whitespace-nowrap">
        แสดงต่อหน้า
        <select
          value={pageSize}
          onChange={e => onPageSize(Number(e.target.value))}
          className="rounded-lg border border-stone-200 bg-white py-1 pl-2 pr-7 text-sm text-stone-800 transition-colors hover:border-stone-300 focus:border-clay-600 focus:outline-none focus:ring-2 focus:ring-clay-600/15"
        >
          {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <span className="whitespace-nowrap tabular-nums text-stone-700">{from}–{to} จาก {total}</span>
      <div className="flex items-center gap-1">
        <button type="button" className={iconBtn} disabled={first} onClick={() => onPage(1)} aria-label="หน้าแรก" title="หน้าแรก"><ChevronFirst size={18} /></button>
        <button type="button" className={iconBtn} disabled={first} onClick={() => onPage(page - 1)} aria-label="หน้าก่อนหน้า" title="หน้าก่อนหน้า"><ChevronLeft size={18} /></button>
        <button type="button" className={iconBtn} disabled={last} onClick={() => onPage(page + 1)} aria-label="หน้าถัดไป" title="หน้าถัดไป"><ChevronRight size={18} /></button>
        <button type="button" className={iconBtn} disabled={last} onClick={() => onPage(pageCount)} aria-label="หน้าสุดท้าย" title="หน้าสุดท้าย"><ChevronLast size={18} /></button>
      </div>
    </nav>
  )
}
