import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Calendar as CalendarIcon } from 'lucide-react'
import Calendar from './Calendar'

// Text-based date field that ALWAYS shows dd/mm/yyyy (ค.ศ), regardless of the
// browser locale. Stores/emits the value as ISO "yyyy-mm-dd" like a native
// <input type="date">. Clicking anywhere in the field opens the calendar, and
// the date can still be typed in.

function isoToDisplay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '')
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}
function autoSlash(s: string): string {
  const d = s.replace(/\D/g, '').slice(0, 8)
  let out = d.slice(0, 2)
  if (d.length >= 3) out += '/' + d.slice(2, 4)
  if (d.length >= 5) out += '/' + d.slice(4, 8)
  return out
}
function displayToIso(s: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s.trim())
  if (!m) return null
  const dd = +m[1], mm = +m[2]
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null
  return `${m[3]}-${m[2]}-${m[1]}`
}

const CALENDAR_W = 300
const CALENDAR_H = 360

interface Props { value: string; onChange: (iso: string) => void; className?: string }

export default function DateInput({ value, onChange, className }: Props) {
  const [text, setText] = useState(isoToDisplay(value))
  const [open, setOpen] = useState(false)
  const [at, setAt] = useState({ top: 0, left: 0 })
  const wrap = useRef<HTMLDivElement>(null)
  const field = useRef<HTMLInputElement>(null)

  // Keep the display in sync when the stored value changes elsewhere.
  useEffect(() => { setText(isoToDisplay(value)) }, [value])

  // The calendar hangs from the document body, so a field inside a table that
  // scrolls sideways — or near the window's edge — still shows it whole.
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const r = field.current?.getBoundingClientRect()
      if (!r) return
      const below = window.innerHeight - r.bottom
      const top = below < CALENDAR_H && r.top > below ? r.top - CALENDAR_H - 4 : r.bottom + 4
      setAt({
        top: Math.max(4, top),
        left: Math.min(Math.max(4, r.left), window.innerWidth - CALENDAR_W - 4),
      })
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => { window.removeEventListener('scroll', place, true); window.removeEventListener('resize', place) }
  }, [open])

  // Clicking away or pressing Escape closes it.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!wrap.current?.contains(t) && !document.getElementById('date-popover')?.contains(t)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  function handleText(raw: string) {
    const s = autoSlash(raw)
    setText(s)
    if (s === '') { onChange(''); return }
    const iso = displayToIso(s)
    if (iso) onChange(iso)
  }

  function pick(iso: string) {
    onChange(iso)
    setText(isoToDisplay(iso))
    setOpen(false)
    field.current?.focus()
  }

  return (
    <div ref={wrap} className="relative">
      <input
        ref={field}
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/yyyy"
        maxLength={10}
        className={`${className ?? ''} pr-6`}
        value={text}
        onChange={e => handleText(e.target.value)}
        onClick={() => setOpen(true)}
      />
      <button
        type="button"
        tabIndex={-1}
        title="เลือกวันที่"
        aria-label="เลือกวันที่"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className="absolute inset-y-0 right-1 flex items-center text-stone-400 hover:text-stone-600"
      >
        <CalendarIcon size={13} />
      </button>
      {open && createPortal(
        <div id="date-popover" style={{ top: at.top, left: at.left }} className="fixed z-[200]">
          <Calendar
            value={value}
            onPick={pick}
            onClear={() => { onChange(''); setText(''); setOpen(false) }}
            onClose={() => setOpen(false)}
          />
        </div>,
        document.body,
      )}
    </div>
  )
}
