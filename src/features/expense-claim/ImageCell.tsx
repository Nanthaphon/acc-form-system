import { useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { Spinner } from '../../components/Spinner'

export interface RowImages {
  urls: Record<string, string>                     // value (path or pending token) → shown URL
  pick: (file: File) => Promise<string | null>     // shrink + hold a picked picture; its cell value, or null
}

// One picture in a table cell: a button to add it, then a thumbnail that
// opens the full picture, with a cross to take it out.
export default function ImageCell({ value, images, onChange, label }: {
  value: string
  images?: RowImages
  onChange: (v: string) => void
  label: string
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const url = value ? images?.urls[value] : undefined

  async function onFile(file?: File) {
    if (!file || !images) return
    setBusy(true)
    try {
      const v = await images.pick(file)
      if (v) onChange(v)
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  if (value) {
    return (
      <div className="flex items-center justify-center gap-1">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          title={`ดูรูป ${label}`}
          className="flex h-9 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-stone-200 bg-stone-50"
        >
          {url ? <img src={url} alt={`รูป ${label}`} className="h-full w-full object-cover" /> : <Spinner size={14} />}
        </a>
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={`เอารูป ${label} ออก`}
          className="rounded-md p-1 text-stone-400 transition-colors hover:bg-rose-50 hover:text-brick-600"
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        disabled={!images || busy}
        onClick={() => input.current?.click()}
        className="flex h-9 w-full min-w-0 items-center justify-center gap-1 rounded-md border border-dashed border-stone-300 bg-white px-2 text-xs text-stone-500 transition-colors hover:border-clay-500 hover:text-clay-700 disabled:opacity-50"
      >
        {busy ? <Spinner size={14} /> : <ImagePlus size={14} />} แนบรูป
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label={`แนบรูป ${label}`}
        onChange={e => onFile(e.target.files?.[0])}
      />
    </>
  )
}
