import { useState } from 'react'
import { mmToPct, pctToMm } from '../features/expense-claim/calc'

// A column width typed as a share of the table, in whole percent (no decimals:
// "10.5" is taken as 10), kept in millimetres. A text box, not type="number",
// so a pasted or typed decimal can be cut off rather than refused outright.
//
// The widths may not add up to more than 100%. A figure that would take the
// table past it is shown in red and not taken — leaving the box puts the last
// good one back. `maxPct` is what is left for this column; a form already over
// (saved before the rule) is marked by `over`, and may only come down.
export default function PercentWidthInput({ mm, onChange, maxPct = 100, over = false, placeholder, disabled, className, ariaLabel }: {
  mm?: number | null
  onChange: (mm: number | undefined) => void
  maxPct?: number
  over?: boolean
  placeholder?: string
  disabled?: boolean
  className?: string
  ariaLabel?: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const [refused, setRefused] = useState(false)
  const current = mm ? mmToPct(mm) : 0
  const room = Math.max(0, Math.floor(maxPct + 1e-6))
  const shown = draft ?? (mm ? String(current) : '')
  const red = !disabled && (refused || (over && !!mm))
  return (
    <span className="relative inline-flex">
      <input
        type="text"
        inputMode="numeric"
        aria-label={ariaLabel}
        aria-invalid={red || undefined}
        placeholder={placeholder}
        disabled={disabled}
        className={`${className ?? ''} tabular-nums ${red ? '!border-brick-600 !bg-rose-50 !text-brick-700 focus:!ring-rose-100' : ''}`}
        value={shown}
        onChange={e => {
          const v = e.target.value.replace(/[.,].*$/, '').replace(/\D/g, '')   // whole percent: what follows a point is dropped
          setDraft(v)
          const n = Number(v)
          if (v.trim() === '' || !Number.isFinite(n) || n <= 0) { setRefused(false); onChange(undefined); return }
          // Past what is left, and not a step down from a total already over: refused.
          if (n > room && n > current) { setRefused(true); return }
          setRefused(false)
          onChange(pctToMm(n))
        }}
        onBlur={() => { setDraft(null); setRefused(false) }}
      />
      {refused && (
        <span role="alert" className="absolute left-0 top-full z-20 mt-1 whitespace-nowrap rounded-md bg-brick-600 px-2 py-0.5 text-[11px] font-medium text-white shadow">
          เกิน 100% · ใส่ได้ไม่เกิน {room}%
        </span>
      )}
    </span>
  )
}
