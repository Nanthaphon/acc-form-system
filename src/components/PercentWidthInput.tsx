import { useState } from 'react'
import { mmToPct, pctToMm } from '../features/expense-claim/calc'

// A column width typed as a share of the table (%), kept in millimetres. What
// is being typed is held as typed — "12." or "12.5" — rather than reformatted
// from the stored figure on every key, which would swallow the decimal point.
// A text box, not type="number": that reports "12." as empty while it is typed.
export default function PercentWidthInput({ mm, onChange, placeholder, disabled, className, ariaLabel }: {
  mm?: number | null
  onChange: (mm: number | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  ariaLabel?: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? (mm ? String(mmToPct(mm)) : '')
  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      placeholder={placeholder}
      disabled={disabled}
      className={`${className ?? ''} tabular-nums`}
      value={shown}
      onChange={e => {
        const v = e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1')   // digits and one point
        setDraft(v)
        const n = Number(v)
        onChange(v.trim() !== '' && Number.isFinite(n) && n > 0 ? pctToMm(Math.min(n, 100)) : undefined)
      }}
      onBlur={() => setDraft(null)}
    />
  )
}
