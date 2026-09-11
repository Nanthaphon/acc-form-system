import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

// Copies a value to the clipboard and briefly shows a tick.
export default function CopyButton({ value, label = 'คัดลอก' }: { value: string; label?: string }) {
  const [done, setDone] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setDone(true)
      setTimeout(() => setDone(false), 1500)
    } catch { /* clipboard blocked — nothing to do */ }
  }
  return (
    <button
      type="button"
      onClick={copy}
      title={done ? 'คัดลอกแล้ว' : label}
      aria-label={label}
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition ${done ? 'text-green-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'}`}
    >
      {done ? <Check size={14} /> : <Copy size={14} />}
    </button>
  )
}
