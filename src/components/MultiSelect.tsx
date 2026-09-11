import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'

export interface MultiSelectOption { value: string; label: string }

interface Props {
  options: MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string        // shown when nothing is selected
  searchPlaceholder?: string
  emptyText?: string          // shown when the search matches nothing
}

// Searchable multi-select dropdown. Picks show as removable chips; the list
// filters as you type, so it stays usable when there are many options.
export default function MultiSelect({
  options, value, onChange,
  placeholder = '— เลือก —', searchPlaceholder = 'ค้นหา…', emptyText = 'ไม่พบรายการ',
}: Props) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  // A saved pick whose option no longer exists (e.g. a deleted group) still shows, by its id.
  const labelOf = (v: string) => options.find(o => o.value === v)?.label ?? v
  const needle = q.trim().toLowerCase()
  const matches = needle ? options.filter(o => o.label.toLowerCase().includes(needle)) : options
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v])

  return (
    <div ref={ref} className="relative">
      <div
        role="button"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => { setOpen(o => !o); setQ('') }}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); setOpen(true) } }}
        className={`flex min-h-[42px] w-full cursor-pointer flex-wrap items-center gap-1.5 rounded-lg border bg-white py-1.5 pl-2 pr-9 text-sm ${
          open ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        {value.length === 0 ? (
          <span className="px-1 text-gray-400">{placeholder}</span>
        ) : value.map(v => (
          <span key={v} className="inline-flex items-center gap-1 rounded-md bg-blue-50 py-0.5 pl-2 pr-1 text-xs font-medium text-blue-700">
            {labelOf(v)}
            <button
              type="button"
              aria-label={`เอา ${labelOf(v)} ออก`}
              onClick={e => { e.stopPropagation(); toggle(v) }}
              className="rounded p-0.5 hover:bg-blue-100"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <ChevronDown size={16} className={`pointer-events-none absolute right-3 top-[21px] -translate-y-1/2 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full min-w-[240px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="relative border-b border-gray-100 p-2">
            <Search size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-md border border-gray-200 py-1.5 pl-7 pr-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <ul role="listbox" aria-multiselectable="true" className="max-h-60 overflow-auto py-1">
            {matches.length === 0 && <li className="px-3 py-2 text-sm text-gray-400">{emptyText}</li>}
            {matches.map(o => {
              const on = value.includes(o.value)
              return (
                <li key={o.value} role="option" aria-selected={on}>
                  <button
                    type="button"
                    onClick={() => toggle(o.value)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${on ? 'text-blue-700' : 'text-gray-700'}`}
                  >
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${on ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white'}`}>
                      {on && <Check size={12} strokeWidth={3} />}
                    </span>
                    <span className="truncate">{o.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          {value.length > 0 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2 text-xs text-gray-500">
              <span>เลือกแล้ว {value.length} รายการ</span>
              <button type="button" onClick={() => onChange([])} className="font-medium text-blue-600 hover:underline">ล้างทั้งหมด</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
