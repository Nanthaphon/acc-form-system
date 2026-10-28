import { useState } from 'react'
import { ListPlus, SquareChevronDown, X } from 'lucide-react'
import { OPTION_PRESETS, cleanOptions, splitOptions } from '../shared/bodyTemplate'
import { ui } from './ui'

interface Props {
  // Set when an existing dropdown is opened again.
  initial?: { label: string; options: string[] }
  onSubmit: (label: string, options: string[]) => void
  onClose: () => void
}

// Names a dropdown blank and lists its choices: one per line, so a long list
// (every bank) can be pasted straight from a column in Excel, or added from a
// ready-made list, rather than typed into one line with commas.
export default function SelectFieldDialog({ initial, onSubmit, onClose }: Props) {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [text, setText] = useState((initial?.options ?? []).join('\n'))
  const options = splitOptions(text)
  const name = label.replace(/[{}:]/g, '').trim()
  const ready = !!name && options.length > 0

  function addPreset(preset: string[]) {
    setText(cleanOptions([...options, ...preset]).join('\n'))
  }

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/40">
      <div className="flex min-h-full items-center justify-center p-4" onMouseDown={onClose}>
        <form
          role="dialog"
          aria-modal="true"
          aria-label={initial ? 'แก้ช่องตัวเลือก' : 'แทรกช่องตัวเลือก'}
          className="w-full max-w-lg rounded-lg border border-stone-200 bg-white shadow-2xl"
          onMouseDown={e => e.stopPropagation()}
          onSubmit={e => { e.preventDefault(); if (ready) onSubmit(name, options) }}
        >
          <div className="flex items-center gap-3 border-b border-stone-100 px-6 py-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-clay-50 text-clay-600"><SquareChevronDown size={18} /></div>
            <h2 className="flex-1 text-base font-semibold text-stone-900">{initial ? 'แก้ช่องตัวเลือก' : 'แทรกช่องตัวเลือก'}</h2>
            <button type="button" onClick={onClose} aria-label="ปิด" className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-700"><X size={18} /></button>
          </div>

          <div className="space-y-4 px-6 py-5">
            <label className="block">
              <span className={ui.label}>ชื่อช่อง — ผู้กรอกจะเห็นชื่อนี้</span>
              <input autoFocus className={ui.input} value={label} onChange={e => setLabel(e.target.value)} placeholder="เช่น ชื่อธนาคาร" />
            </label>

            <div>
              <div className="mb-1.5 flex items-center gap-2">
                <span className="text-xs font-medium text-stone-500">ตัวเลือก — บรรทัดละ 1 ตัวเลือก</span>
                <span className="ml-auto text-xs text-stone-500">{options.length} ตัวเลือก</span>
              </div>
              <textarea
                aria-label="ตัวเลือก"
                className={`${ui.input} min-h-[200px] resize-y leading-relaxed`}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={'เงินสด\nโอนเงิน\nเช็ค'}
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs text-stone-500">วางจาก Excel ได้ทั้งคอลัมน์ หรือเพิ่มชุดสำเร็จรูป:</span>
                {OPTION_PRESETS.map(p => (
                  <button key={p.label} type="button" onClick={() => addPreset(p.options)}
                    className="inline-flex items-center gap-1 rounded-md border border-stone-200 px-2 py-1 text-xs font-medium text-clay-700 hover:border-clay-600 hover:bg-clay-50">
                    <ListPlus size={13} /> {p.label} ({p.options.length})
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 rounded-b-lg border-t border-stone-100 bg-stone-50/60 px-6 py-4">
            <button type="button" onClick={onClose} className={ui.btnSecondary}>ยกเลิก</button>
            <button type="submit" disabled={!ready} className={`${ui.btnPrimary} disabled:opacity-50`}>{initial ? 'บันทึก' : 'แทรก'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
