// A field that is a dropdown once it has a list, and a text box until then.
//
// The value a person already has is always kept as a choice, even when it is
// not on the list. Otherwise opening an older employee — whose department was
// typed before the list existed — would show the dropdown blank, and saving
// anything else on the page would silently wipe the department.
export default function OptionInput({ value, options, onChange, placeholder, className, disabled }: {
  value: string
  options: string[]
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}) {
  if (options.length === 0) {
    return (
      <input
        className={className}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
      />
    )
  }

  const current = value.trim()
  const offList = current !== '' && !options.includes(current)
  return (
    <select className={className} value={current} disabled={disabled} onChange={e => onChange(e.target.value)}>
      <option value="">— เลือก —</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
      {offList && <option value={current}>{current} (ไม่อยู่ในรายการ)</option>}
    </select>
  )
}
