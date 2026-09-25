import { useId } from 'react'

// A text box that suggests the values from Custom Field, and takes anything.
//
// แผนก and ตำแหน่ง are free text: a list may offer "Payroll" to click, but a
// department the list does not have yet can still be typed. The browser shows
// the suggestions under the box as it is typed into, narrowing them as it goes.
export default function OptionInput({ value, options, onChange, placeholder, className, disabled }: {
  value: string
  options: string[]
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}) {
  const listId = useId()
  return (
    <>
      <input
        className={className}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        list={options.length > 0 ? listId : undefined}
        autoComplete="off"
        onChange={e => onChange(e.target.value)}
      />
      {options.length > 0 && (
        <datalist id={listId}>
          {options.map(o => <option key={o} value={o} />)}
        </datalist>
      )}
    </>
  )
}
