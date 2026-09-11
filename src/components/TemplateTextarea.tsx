import { useRef } from 'react'
import { CalendarDays, Hash, TextCursorInput, WandSparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ui } from './ui'
import { uiPrompt } from './dialog/dialogService'
import { countDottedBlanks, dotsToTokens, makeToken, templateFields } from '../shared/bodyTemplate'
import type { TemplateFieldType } from '../shared/bodyTemplate'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

const INSERTS: { type: TemplateFieldType; label: string; icon: LucideIcon }[] = [
  { type: 'text', label: 'ช่องข้อความ', icon: TextCursorInput },
  { type: 'date', label: 'ช่องวันที่', icon: CalendarDays },
  { type: 'number', label: 'ช่องตัวเลข', icon: Hash },
]
const TYPE_NAME: Record<TemplateFieldType, string> = { text: 'ข้อความ', date: 'วันที่', number: 'ตัวเลข' }
const chipBtn = 'inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600'

// Paragraph editor for a form's intro/body text with fill-in blanks: buttons
// insert {{ชื่อช่อง}} tokens at the cursor, and old dotted blanks can be
// converted in one click. Lists the blanks it found so the admin sees what the
// person filling the form will be asked for.
export default function TemplateTextarea({ value, onChange, placeholder }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const fields = templateFields(value)
  const dotted = countDottedBlanks(value)

  async function insert(type: TemplateFieldType, label: string) {
    // Read the cursor before the dialog takes focus away from the textarea.
    const start = ref.current?.selectionStart ?? value.length
    const end = ref.current?.selectionEnd ?? value.length
    const name = await uiPrompt('ตั้งชื่อช่อง — ผู้กรอกฟอร์มจะเห็นชื่อนี้ในช่องกรอก', {
      title: `แทรก${label}`,
      placeholder: type === 'date' ? 'เช่น ตั้งแต่วันที่' : type === 'number' ? 'เช่น จำนวนเงิน' : 'เช่น ได้รับเงินจาก',
      confirmText: 'แทรก',
    })
    const token = makeToken(name ?? '', type)
    if (!token) return
    onChange(value.slice(0, start) + token + value.slice(end))
    requestAnimationFrame(() => {
      const el = ref.current
      if (!el) return
      el.focus()
      el.setSelectionRange(start + token.length, start + token.length)
    })
  }

  return (
    <div>
      <textarea
        ref={ref}
        className={`${ui.input} min-h-[72px] resize-y`}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {INSERTS.map(({ type, label, icon: Icon }) => (
          <button key={type} type="button" className={chipBtn} onClick={() => insert(type, label)}>
            <Icon size={14} /> {label}
          </button>
        ))}
        {dotted > 0 && (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
            onClick={() => onChange(dotsToTokens(value))}
          >
            <WandSparkles size={14} /> แปลง ........ เป็นช่องกรอก ({dotted})
          </button>
        )}
      </div>
      {fields.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-gray-500">ช่องกรอกในข้อความนี้:</span>
          {fields.map(f => (
            <span key={f.key} className="rounded-full bg-blue-50 px-2.5 py-0.5 font-medium text-blue-700">
              {f.label}{f.type !== 'text' && <span className="font-normal text-blue-500"> · {TYPE_NAME[f.type]}</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
