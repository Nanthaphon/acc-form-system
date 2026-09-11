import { useRef } from 'react'
import { CalendarDays, CircleHelp, Hash, TextCursorInput, WandSparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { uiPrompt } from './dialog/dialogService'
import { countDottedBlanks, dotsToTokens, makeToken } from '../shared/bodyTemplate'
import type { TemplateFieldType } from '../shared/bodyTemplate'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

const INSERTS: { type: TemplateFieldType; label: string; icon: LucideIcon }[] = [
  { type: 'text', label: 'ข้อความ', icon: TextCursorInput },
  { type: 'date', label: 'วันที่', icon: CalendarDays },
  { type: 'number', label: 'ตัวเลข', icon: Hash },
]
const toolBtn = 'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 hover:text-blue-600'
const HELP = 'พิมพ์ {{ชื่อช่อง}} ในข้อความเพื่อเว้นช่องให้ผู้กรอกใส่ข้อมูลในระบบ · ถ้าไม่กรอก จะพิมพ์ออกเป็น ........ ให้เขียนด้วยมือ'

// Paragraph editor for a form's intro/body text with fill-in blanks: a slim
// toolbar inserts {{ชื่อช่อง}} tokens at the cursor, and old dotted blanks can
// be converted in one click.
export default function TemplateTextarea({ value, onChange, placeholder }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const dotted = countDottedBlanks(value)

  async function insert(type: TemplateFieldType, label: string) {
    // Read the cursor before the dialog takes focus away from the textarea.
    const start = ref.current?.selectionStart ?? value.length
    const end = ref.current?.selectionEnd ?? value.length
    const name = await uiPrompt('ตั้งชื่อช่อง — ผู้กรอกฟอร์มจะเห็นชื่อนี้ในช่องกรอก', {
      title: `แทรกช่อง${label}`,
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
    <div className="rounded-lg border border-gray-200 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
      <textarea
        ref={ref}
        className="block min-h-[64px] w-full resize-y rounded-t-lg border-0 bg-transparent px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-0.5 border-t border-gray-100 px-2 py-1">
        <span className="mr-1 text-xs text-gray-400">แทรกช่องกรอก</span>
        {INSERTS.map(({ type, label, icon: Icon }) => (
          <button key={type} type="button" aria-label={`แทรกช่อง${label}`} className={toolBtn} onClick={() => insert(type, label)}>
            <Icon size={13} /> {label}
          </button>
        ))}
        <span className="ml-1 cursor-help text-gray-300 hover:text-gray-500" title={HELP}><CircleHelp size={14} /></span>
        {dotted > 0 && (
          <button type="button" className={`${toolBtn} ml-auto font-medium text-blue-600`} onClick={() => onChange(dotsToTokens(value))}>
            <WandSparkles size={13} /> แปลง ........ เป็นช่องกรอก ({dotted})
          </button>
        )}
      </div>
    </div>
  )
}
