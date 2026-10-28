import { useEffect, useRef, useState } from 'react'
import GrowTextarea from './GrowTextarea'
import { CalendarDays, CircleHelp, Hash, Link2, Pencil, SquareChevronDown, TextCursorInput, WandSparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { uiPrompt } from './dialog/dialogService'
import SelectFieldDialog from './SelectFieldDialog'
import { AUTO_FIELDS, countDottedBlanks, dotsToTokens, makeToken, selectTokens } from '../shared/bodyTemplate'
import type { TemplateFieldType } from '../shared/bodyTemplate'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

type TypedField = Exclude<TemplateFieldType, 'auto'>
const INSERTS: { type: TypedField; label: string; icon: LucideIcon }[] = [
  { type: 'text', label: 'ข้อความ', icon: TextCursorInput },
  { type: 'date', label: 'วันที่', icon: CalendarDays },
  { type: 'number', label: 'ตัวเลข', icon: Hash },
  { type: 'select', label: 'ตัวเลือก', icon: SquareChevronDown },
]
const toolBtn = 'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-stone-600 hover:bg-stone-100 hover:text-clay-600'
const HELP = 'พิมพ์ {{ชื่อช่อง}} ในข้อความเพื่อเว้นช่องให้ผู้กรอกใส่ข้อมูลในระบบ · ถ้าไม่กรอก จะพิมพ์ออกเป็น ........ ให้เขียนด้วยมือ'
  + ' · ช่องตัวเลือก แก้รายการได้ที่ปุ่มดินสอใต้ข้อความ'
  + ' · ช่องอัตโนมัติ เช่น {{ชื่อบริษัท:อัตโนมัติ}} ระบบเติมให้จากข้อมูลในเอกสาร ผู้กรอกไม่ต้องกรอก'
const PLACEHOLDER: Record<TypedField, string> = {
  text: 'เช่น ได้รับเงินจาก', date: 'เช่น ตั้งแต่วันที่', number: 'เช่น จำนวนเงิน', select: 'เช่น วิธีชำระเงิน',
}

// Paragraph editor for a form's intro/body text with fill-in blanks: a slim
// toolbar inserts {{ชื่อช่อง}} tokens at the cursor, and old dotted blanks can
// be converted in one click.
export default function TemplateTextarea({ value, onChange, placeholder }: Props) {
  const ref = useRef<HTMLTextAreaElement | null>(null)
  const menu = useRef<HTMLDivElement | null>(null)
  const [autoOpen, setAutoOpen] = useState(false)
  // The dropdown being written: where its token goes, and what it held before.
  const [selectEdit, setSelectEdit] = useState<{ start: number; end: number; initial?: { label: string; options: string[] } } | null>(null)
  const dotted = countDottedBlanks(value)
  const selects = selectTokens(value)

  useEffect(() => {
    if (!autoOpen) return
    const close = (e: Event) => { if (!menu.current?.contains(e.target as Node)) setAutoOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAutoOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', onKey) }
  }, [autoOpen])

  // Put a token where the cursor was, and the cursor just after it.
  function place(token: string, start: number, end: number) {
    onChange(value.slice(0, start) + token + value.slice(end))
    requestAnimationFrame(() => {
      const el = ref.current
      if (!el) return
      el.focus()
      el.setSelectionRange(start + token.length, start + token.length)
    })
  }
  const cursor = () => [ref.current?.selectionStart ?? value.length, ref.current?.selectionEnd ?? value.length] as const

  async function insert(type: TypedField, label: string) {
    // Read the cursor before the dialog takes focus away from the textarea.
    const [start, end] = cursor()
    if (type === 'select') {
      // With the cursor inside a dropdown already written, that one is edited.
      const at = selects.find(t => start > t.start && start < t.end)
      setSelectEdit(at ? { start: at.start, end: at.end, initial: at } : { start, end })
      return
    }
    const name = await uiPrompt('ตั้งชื่อช่อง — ผู้กรอกฟอร์มจะเห็นชื่อนี้ในช่องกรอก', {
      title: `แทรกช่อง${label}`,
      placeholder: PLACEHOLDER[type],
      confirmText: 'แทรก',
    })
    if (!name?.trim()) return
    const token = makeToken(name, type)
    if (token) place(token, start, end)
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-white focus-within:border-clay-500 focus-within:ring-2 focus-within:ring-clay-100">
      <GrowTextarea
        inputRef={ref}
        className="block min-h-[64px] w-full rounded-t-lg border-0 bg-transparent px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none"
        value={value}
        placeholder={placeholder}
        onChange={onChange}
      />
      <div className="flex flex-wrap items-center gap-0.5 border-t border-stone-100 px-2 py-1">
        <span className="mr-1 text-xs text-stone-400">แทรกช่องกรอก</span>
        {INSERTS.map(({ type, label, icon: Icon }) => (
          <button key={type} type="button" aria-label={`แทรกช่อง${label}`} className={toolBtn} onClick={() => insert(type, label)}>
            <Icon size={13} /> {label}
          </button>
        ))}
        {/* A field the system fills from the document — picked from a list, no
            name to type. Pressing the button must not take the cursor out of
            the text, or there would be nowhere to put it. */}
        <div ref={menu} className="relative">
          <button
            type="button"
            aria-label="แทรกช่องอัตโนมัติ"
            aria-haspopup="menu"
            aria-expanded={autoOpen}
            className={`${toolBtn} ${autoOpen ? 'bg-stone-100 text-clay-600' : ''}`}
            onMouseDown={e => e.preventDefault()}
            onClick={() => setAutoOpen(o => !o)}
          >
            <Link2 size={13} /> อัตโนมัติ
          </button>
          {autoOpen && (
            <div role="menu" aria-label="ช่องอัตโนมัติ" className="absolute left-0 top-full z-30 mt-1 w-72 rounded-lg border border-stone-200 bg-white p-1 shadow-lg">
              {AUTO_FIELDS.map(a => (
                <button
                  key={a.source}
                  type="button"
                  role="menuitem"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => { const [s, e] = cursor(); setAutoOpen(false); place(makeToken(a.label, 'auto'), s, e) }}
                  className="flex w-full flex-col items-start rounded-md px-3 py-2 text-left hover:bg-stone-50"
                >
                  <span className="text-sm text-stone-900">{a.label}</span>
                  <span className="text-xs text-stone-500">มาจาก{a.from}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="ml-1 cursor-help text-stone-300 hover:text-stone-500" title={HELP}><CircleHelp size={14} /></span>
        {/* Each dropdown in the text, opened again to change its choices —
            no hunting through a long {{…|…|…}} by hand. */}
        {selects.map((t, k) => (
          <button key={k} type="button" aria-label={`แก้ตัวเลือกช่อง ${t.label}`} title="แก้ตัวเลือก"
            className={`${toolBtn} border border-stone-200`}
            onClick={() => setSelectEdit({ start: t.start, end: t.end, initial: t })}>
            <Pencil size={12} /> {t.label} <span className="text-stone-500">({t.options.length})</span>
          </button>
        ))}
        {dotted > 0 && (
          <button type="button" className={`${toolBtn} ml-auto font-medium text-clay-600`} onClick={() => onChange(dotsToTokens(value))}>
            <WandSparkles size={13} /> แปลง ........ เป็นช่องกรอก ({dotted})
          </button>
        )}
      </div>
      {selectEdit && (
        <SelectFieldDialog
          initial={selectEdit.initial}
          onClose={() => setSelectEdit(null)}
          onSubmit={(label, options) => {
            const { start, end } = selectEdit
            setSelectEdit(null)
            place(makeToken(label, 'select', options), start, end)
          }}
        />
      )}
    </div>
  )
}
