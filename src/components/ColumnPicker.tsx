import { useEffect, useRef, useState } from 'react'
import { Check, Columns3 } from 'lucide-react'
import { ui } from './ui'

export interface PickableColumn {
  key: string
  label: string
  locked?: boolean   // identifies the row (e.g. form name, doc number) — always shown
}

interface Props {
  columns: PickableColumn[]
  hidden: Set<string>
  onToggle: (key: string) => void
  onReset: () => void
}

// "Choose columns" dropdown for a table.
export default function ColumnPicker({ columns, hidden, onToggle, onReset }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  const isShown = (c: PickableColumn) => c.locked || !hidden.has(c.key)
  const shownCount = columns.filter(isShown).length

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="menu" className={ui.btnSecondary}>
        <Columns3 size={16} /> คอลัมน์
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{shownCount}/{columns.length}</span>
      </button>

      {open && (
        <div role="menu" className="absolute right-0 z-20 mt-1 w-60 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 px-3 py-2 text-xs font-medium text-gray-500">เลือกคอลัมน์ที่จะแสดง</div>
          <ul className="max-h-72 overflow-auto py-1">
            {columns.map(c => {
              const on = isShown(c)
              return (
                <li key={c.key}>
                  <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={on}
                    disabled={c.locked}
                    onClick={() => onToggle(c.key)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-default disabled:hover:bg-transparent"
                  >
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      c.locked ? 'border-gray-300 bg-gray-300 text-white' : on ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white'
                    }`}>
                      {on && <Check size={12} strokeWidth={3} />}
                    </span>
                    <span className={`flex-1 truncate ${c.locked ? 'text-gray-400' : ''}`}>{c.label}</span>
                    {c.locked && <span className="text-[11px] text-gray-400">แสดงเสมอ</span>}
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="border-t border-gray-100 px-3 py-2 text-right">
            <button type="button" onClick={onReset} className="text-xs font-medium text-blue-600 hover:underline">แสดงทั้งหมด</button>
          </div>
        </div>
      )}
    </div>
  )
}
