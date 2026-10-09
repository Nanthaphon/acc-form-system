import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// The month grid behind every date field. The browser's own picker could not
// be styled or sized, and came out in the browser's language rather than the
// document's, so the system draws its own: Thai months, ค.ศ years like the rest
// of the app, and the same size everywhere.

export const MONTHS_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]
const WEEKDAYS_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

const pad = (n: number) => String(n).padStart(2, '0')
export const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export function parseIso(iso?: string | null): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '')
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

// The six weeks a month grid shows, starting on Sunday.
function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const start = new Date(year, month, 1 - first.getDay())
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
}

interface Props {
  value?: string | null              // ISO yyyy-mm-dd
  onPick: (iso: string) => void
  onClear?: () => void
  onClose?: () => void
}

export default function Calendar({ value, onPick, onClear, onClose }: Props) {
  const selected = parseIso(value)
  const today = new Date()
  const [view, setView] = useState(() => selected ?? today)
  const [yearOpen, setYearOpen] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)

  // Opening on a different date (a second field, or one typed in) moves the view.
  useEffect(() => { if (selected) setView(selected) }, [value])   // eslint-disable-line react-hooks/exhaustive-deps

  const days = useMemo(() => monthGrid(view.getFullYear(), view.getMonth()), [view])
  const years = useMemo(() => {
    const centre = view.getFullYear()
    return Array.from({ length: 21 }, (_, i) => centre - 10 + i)
  }, [view])

  const move = (months: number) => setView(v => new Date(v.getFullYear(), v.getMonth() + months, 1))

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { e.stopPropagation(); onClose?.() }
    else if (e.key === 'PageUp') { e.preventDefault(); move(-1) }
    else if (e.key === 'PageDown') { e.preventDefault(); move(1) }
  }

  return (
    <div
      onKeyDown={onKeyDown}
      className="w-[300px] select-none rounded-xl border border-stone-200 bg-white p-3 shadow-[0_12px_32px_rgba(22,32,36,0.18)]"
    >
      <div className="mb-2 flex items-center gap-1">
        <button
          type="button"
          aria-label="เดือนก่อนหน้า"
          onClick={() => move(-1)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          onClick={() => setYearOpen(o => !o)}
          aria-expanded={yearOpen}
          className="flex-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-stone-900 transition-colors hover:bg-stone-100"
        >
          {MONTHS_TH[view.getMonth()]} {view.getFullYear()}
        </button>
        <button
          type="button"
          aria-label="เดือนถัดไป"
          onClick={() => move(1)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {yearOpen ? (
        <div className="grid max-h-[232px] grid-cols-3 gap-1 overflow-auto">
          {years.map(y => (
            <button
              key={y}
              type="button"
              onClick={() => { setView(v => new Date(y, v.getMonth(), 1)); setYearOpen(false) }}
              className={`rounded-lg py-2 text-sm transition-colors ${
                y === view.getFullYear() ? 'bg-clay-600 font-semibold text-white' : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-0.5 pb-1">
            {WEEKDAYS_TH.map(d => (
              <div key={d} className="py-1 text-center text-xs font-medium text-stone-400">{d}</div>
            ))}
          </div>
          <div ref={gridRef} className="grid grid-cols-7 gap-0.5">
            {days.map(d => {
              const outside = d.getMonth() !== view.getMonth()
              const isToday = sameDay(d, today)
              const isPicked = !!selected && sameDay(d, selected)
              return (
                <button
                  key={toIso(d)}
                  type="button"
                  aria-label={`${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear()}`}
                  aria-current={isToday ? 'date' : undefined}
                  aria-pressed={isPicked}
                  onClick={() => onPick(toIso(d))}
                  className={`h-9 rounded-lg text-sm transition-colors ${
                    isPicked
                      ? 'bg-clay-600 font-semibold text-white'
                      : outside
                      ? 'text-stone-300 hover:bg-stone-100'
                      : 'text-stone-700 hover:bg-clay-50 hover:text-clay-700'
                  } ${isToday && !isPicked ? 'font-semibold text-clay-700 ring-1 ring-inset ring-clay-300' : ''}`}
                >
                  {d.getDate()}
                </button>
              )
            })}
          </div>
        </>
      )}

      <div className="mt-2 flex items-center justify-between border-t border-stone-100 pt-2">
        <button
          type="button"
          onClick={() => onClear?.()}
          className="rounded-lg px-2.5 py-1.5 text-sm text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
        >
          ล้าง
        </button>
        <button
          type="button"
          onClick={() => { setView(today); onPick(toIso(today)) }}
          className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-clay-700 transition-colors hover:bg-clay-50"
        >
          วันนี้
        </button>
      </div>
    </div>
  )
}
