import { useEffect, useRef, useState } from 'react'
import { Calendar } from 'lucide-react'

// Text-based date field that ALWAYS shows dd/mm/yyyy (ค.ศ), regardless of the
// browser locale. Stores/emits the value as ISO "yyyy-mm-dd" like a native
// <input type="date">. Clicking anywhere in the field opens the native picker,
// and the date can still be typed in.

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

interface Props { value: string; onChange: (iso: string) => void; className?: string }

export default function DateInput({ value, onChange, className }: Props) {
  const [text, setText] = useState(isoToDisplay(value))
  const dateRef = useRef<HTMLInputElement>(null)
  // Keep the display in sync when the stored value changes elsewhere.
  useEffect(() => { setText(isoToDisplay(value)) }, [value])

  // showPicker throws where it is unsupported or blocked (e.g. a cross-origin
  // frame); typing still works there, so it is fine to ignore.
  function openPicker() {
    try { dateRef.current?.showPicker?.() } catch { /* type the date instead */ }
  }

  function handleText(raw: string) {
    const s = autoSlash(raw)
    setText(s)
    if (s === '') { onChange(''); return }
    const iso = displayToIso(s)
    if (iso) onChange(iso)
  }

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/yyyy"
        maxLength={10}
        className={`${className ?? ''} pr-6`}
        value={text}
        onChange={e => handleText(e.target.value)}
        onClick={openPicker}
      />
      <button
        type="button"
        tabIndex={-1}
        title="เลือกวันที่"
        onClick={openPicker}
        className="absolute inset-y-0 right-1 flex items-center text-stone-400 hover:text-stone-600"
      >
        <Calendar size={13} />
      </button>
      <input
        ref={dateRef}
        type="date"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        tabIndex={-1}
        aria-hidden
      />
    </div>
  )
}
