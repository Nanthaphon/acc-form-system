import { useEffect, useRef, useState } from 'react'
import type { Signer } from '../data/submissions'

interface Props {
  value: string
  onChange: (uid: string) => void
  signers: Signer[]
  className?: string
}

// A searchable signer picker: type to filter, click to select.
export default function SignerSelect({ value, onChange, signers, className }: Props) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const selected = signers.find(s => s.uid === value)

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const matches = signers.filter(s => s.name.toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <div ref={ref} className="relative">
      <input
        className={className}
        placeholder="พิมพ์ค้นหาผู้เซ็น…"
        value={open ? q : (selected?.name ?? '')}
        onFocus={() => { setOpen(true); setQ('') }}
        onChange={e => { setQ(e.target.value); setOpen(true) }}
      />
      {open && (
        <div className="absolute z-20 mt-1 max-h-56 w-full min-w-[220px] overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {matches.length === 0 && <div className="px-3 py-2 text-sm text-gray-400">ไม่พบผู้เซ็น</div>}
          {matches.map(s => (
            <button
              key={s.uid}
              type="button"
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${s.uid === value ? 'bg-blue-50 font-medium text-blue-700' : ''}`}
              onClick={() => { onChange(s.uid); setOpen(false); setQ('') }}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
