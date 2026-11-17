import { ChevronLeft, ChevronRight } from 'lucide-react'
import { pageList } from '../shared/usePagination'

const btn = 'inline-flex h-9 min-w-9 items-center justify-center gap-1 whitespace-nowrap rounded-lg border px-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-clay-600/30'
const idle = 'border-stone-200 bg-white text-stone-700 hover:border-clay-300 hover:text-clay-700'
const off = 'cursor-not-allowed border-stone-200 bg-stone-50 text-stone-500'

// The bar under a paged table: where you are, and the way to the other pages.
// Shown only when there is more than one page.
export default function Pagination({ page, pageCount, from, to, total, onPage }: {
  page: number
  pageCount: number
  from: number
  to: number
  total: number
  onPage: (page: number) => void
}) {
  if (pageCount <= 1) return null
  return (
    <nav aria-label="เลือกหน้า" className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <p className="whitespace-nowrap text-sm text-stone-600">
        แสดง <span className="font-medium text-stone-900">{from}–{to}</span> จาก <span className="font-medium text-stone-900">{total}</span> รายการ
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" className={`${btn} ${page === 1 ? off : idle}`} disabled={page === 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft size={16} /> ก่อนหน้า
        </button>
        {pageList(page, pageCount).map((n, i) => n === null
          ? <span key={`gap${i}`} className="px-1 text-sm text-stone-500" aria-hidden>…</span>
          : (
            <button
              key={n}
              type="button"
              aria-label={`หน้า ${n}`}
              aria-current={n === page ? 'page' : undefined}
              className={`${btn} tabular-nums ${n === page ? 'border-clay-600 bg-clay-600 text-white' : idle}`}
              onClick={() => onPage(n)}
            >
              {n}
            </button>
          ))}
        <button type="button" className={`${btn} ${page === pageCount ? off : idle}`} disabled={page === pageCount} onClick={() => onPage(page + 1)}>
          ถัดไป <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  )
}
