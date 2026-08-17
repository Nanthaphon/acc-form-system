interface Props {
  on: boolean
  onChange: (v: boolean) => void
  title?: string
}

// Small on/off toggle. Stops click propagation so it works on clickable cards.
export default function Switch({ on, onChange, title }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      title={title ?? (on ? 'เปิดใช้งานอยู่' : 'ปิดอยู่')}
      onClick={e => { e.preventDefault(); e.stopPropagation(); onChange(!on) }}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${on ? 'bg-green-500' : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  )
}
