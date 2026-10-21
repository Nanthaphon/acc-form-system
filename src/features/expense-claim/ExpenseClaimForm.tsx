import { useLayoutEffect, useRef, useState } from 'react'
import { ALargeSmall, Link2, Minus, Plus, RotateCcw, Trash2 } from 'lucide-react'
import ActionIconButton from '../../components/ActionIconButton'
import type { ExpenseHeader, ExpenseRow, FormColumn, HeaderField } from '../../types/schema'
import { emptyRow, EXPENSE_CLAIM_DEFAULT_COLUMNS, isTextCol, sectionTitles, SEQ_COLUMN_WIDTH } from '../../types/schema'
import { computeRow, computeColumnTotals, grandTotal, isRowTicked, rowHasNumbers, taxBases, taxSummary, visibleColumns, fillColumnPercents, tableMinWidth, rowWhtRate, rowRetRate, ACTION_COL_PX, TICK_COL_PX, WHT_PRESETS, RET_PRESETS, ROW_VAT_KEY, ROW_WHT_KEY, ROW_WHT_RATE_KEY, ROW_RET_RATE_KEY, TICK, UNTICK } from './calc'
import { formatMoney } from '../../shared/money'
import DateInput from '../../components/DateInput'
import { AUTO_FIELDS, autoValue, parseTemplate, templateFields } from '../../shared/bodyTemplate'
import type { TemplateField } from '../../shared/bodyTemplate'
import { BLANK_LIMITS, blankWidth } from './blankSizing'
import { FEATURES } from '../../shared/features'
import TaxPanel from './TaxPanel'
import GrowTextarea from '../../components/GrowTextarea'
import { textPx, textSizeScale, DEFAULT_TEXT_PX, MAX_TEXT_PX, MIN_TEXT_PX } from '../../shared/textSize'

interface Props {
  header: ExpenseHeader
  items: ExpenseRow[]
  onHeaderChange: (h: ExpenseHeader) => void
  onItemsChange: (items: ExpenseRow[]) => void
  columns?: FormColumn[]
  categories?: string[]
  headerFields?: HeaderField[]
  introText?: string | null   // form paragraphs — their {{blanks}} are filled in here
  companyName?: string | null // for an automatic {{ชื่อบริษัท}} in them
  bodyText?: string | null
  requesterTitle?: string     // section headings, editable per form (see sectionTitles)
  itemsTitle?: string
  showSeq?: boolean           // show the ลำดับ column (default true)
}

// Larger or smaller text in the boxes being typed into — this form's own
// setting, saved with it. The document it prints as is untouched.
const STEP_BTN = 'inline-flex h-7 w-7 items-center justify-center text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent'

function TextSizePicker({ value, onChange }: { value: number; onChange: (px: number) => void }) {
  // What is being typed, while it is typed: "16" passes through "1", so the
  // size is taken — and kept within 10–20 — only once the typing is done.
  const [draft, setDraft] = useState<string | null>(null)
  const commit = () => {
    if (draft === null) return
    const n = Number(draft)
    setDraft(null)
    if (draft.trim() !== '' && Number.isFinite(n)) onChange(textPx(n))
  }
  return (
    <span className="inline-flex items-center gap-1.5" title="ขนาดตัวอักษรในช่องกรอกของฟอร์มนี้ — ไม่มีผลกับเอกสารที่พิมพ์ออกมา">
      <ALargeSmall size={15} className="shrink-0 text-stone-400" aria-hidden />
      <span className="text-xs text-stone-500">ขนาดตัวอักษร</span>
      <span className="inline-flex items-center overflow-hidden rounded-lg border border-stone-200 bg-white">
        <button type="button" aria-label="ลดขนาดตัวอักษร" disabled={value <= MIN_TEXT_PX} onClick={() => onChange(value - 1)} className={STEP_BTN}>
          <Minus size={14} />
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={MIN_TEXT_PX}
          max={MAX_TEXT_PX}
          aria-label="ขนาดตัวอักษร (px)"
          value={draft ?? String(value)}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit() } }}
          className="h-7 w-9 border-x border-stone-200 text-center text-xs tabular-nums text-stone-900 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button type="button" aria-label="เพิ่มขนาดตัวอักษร" disabled={value >= MAX_TEXT_PX} onClick={() => onChange(value + 1)} className={STEP_BTN}>
          <Plus size={14} />
        </button>
      </span>
      <span className="text-xs text-stone-400">px</span>
      {value !== DEFAULT_TEXT_PX && (
        <button type="button" aria-label="กลับเป็นขนาดปกติ" title={`กลับเป็น ${DEFAULT_TEXT_PX} px`} onClick={() => onChange(DEFAULT_TEXT_PX)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700">
          <RotateCcw size={14} />
        </button>
      )}
    </span>
  )
}

const CATEGORIES = ['ค่าไมล์เลทและค่าใช้จ่ายเดินทาง', 'ค่าใช้จ่ายต่างๆ', 'ค่าล่วงเวลา', 'ค่าเบี้ยเลี้ยง']

const cardClass = 'rounded-xl border border-stone-200 bg-white p-6'
const cardTitleClass = 'mb-4 text-[15px] font-semibold text-stone-900'
const labelClass = 'mb-1.5 block text-xs font-medium text-stone-500'
const inputClass = 'w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-clay-500 focus:outline-none focus:ring-2 focus:ring-clay-100'

const blankClass = 'inline-block rounded-md border border-stone-200 bg-white px-2 py-1 align-middle text-sm leading-normal text-stone-900 placeholder:text-stone-400 focus:border-clay-500 focus:outline-none focus:ring-2 focus:ring-clay-100'
// Off-screen copy of the blank's text, in the same font, used to measure it.
// Thai has no usable average character width, so `size` / `ch` units would be
// well off — only a real measurement is right.
const mirrorClass = 'pointer-events-none invisible absolute left-0 top-0 whitespace-pre px-2 text-sm leading-normal'

// An automatic field inside a paragraph: what the system fills in, shown where
// it will print, and not a box to type in — it changes where it comes from.
function AutoChip({ field, value }: { field: TemplateField; value: string }) {
  const from = AUTO_FIELDS.find(a => a.source === field.source)?.from ?? ''
  return (
    <span
      title={`เติมอัตโนมัติจาก${from}`}
      aria-label={`${field.label} (อัตโนมัติ)`}
      className="mx-1 inline-flex max-w-full items-center gap-1.5 rounded-md border border-dashed border-stone-300 bg-stone-100 px-2 py-1 align-middle text-sm leading-normal text-stone-700"
    >
      <Link2 size={13} className="shrink-0 text-stone-400" />
      {value ? <span className="truncate">{value}</span> : <span className="text-stone-400">{field.label} — มาจาก{from}</span>}
    </span>
  )
}

// One {{blank}} inside a paragraph, sized to sit in the running text and to
// grow with what is typed into it (see blankSizing).
function BlankInput({ field, value, onChange }: { field: TemplateField; value: string; onChange: (v: string) => void }) {
  const limits = BLANK_LIMITS[field.type]
  const mirror = useRef<HTMLSpanElement>(null)
  const [width, setWidth] = useState(limits.min)
  // offsetWidth is 0 where there is no layout (jsdom, before paint); blankWidth
  // falls back to the minimum, so the blank is never rendered at zero width.
  useLayoutEffect(() => { setWidth(blankWidth(mirror.current?.offsetWidth ?? 0, limits)) }, [value, field.label, limits])

  if (field.type === 'date') {
    return (
      <span className="mx-1 inline-block w-40 align-middle leading-normal" title={field.label}>
        <DateInput className={`${blankClass} w-full`} value={value} onChange={onChange} />
      </span>
    )
  }
  if (field.type === 'select') {
    // A choice the admin has since taken off the list stays on this document.
    const options = field.options ?? []
    const choices = value && !options.includes(value) ? [...options, value] : options
    return (
      <span className="mx-1 inline-block max-w-full align-middle leading-normal">
        <select
          aria-label={field.label}
          title={field.label}
          style={{ minWidth: limits.min, maxWidth: limits.max }}
          className={`${value ? blankClass : blankClass.replace('text-stone-900', 'text-stone-400')} max-w-full cursor-pointer text-left`}
          value={value}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">— {field.label} —</option>
          {choices.map(o => <option key={o} value={o} className="text-stone-900">{o}</option>)}
        </select>
      </span>
    )
  }
  const number = field.type === 'number'
  return (
    <span className="relative mx-1 inline-block max-w-full align-middle leading-normal">
      {/* Measures the value, or the placeholder while the blank is empty. */}
      <span ref={mirror} aria-hidden className={mirrorClass}>{value || field.label}</span>
      <input
        aria-label={field.label}
        title={field.label}
        inputMode={number ? 'decimal' : undefined}
        style={{ width: `${width}px` }}
        className={`${blankClass} max-w-full text-left ${number ? 'tabular-nums' : ''}`}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </span>
  )
}

function fmt(n: number): string {
  return formatMoney(n)
}

export default function ExpenseClaimForm({ header, items, onHeaderChange, onItemsChange, columns, categories, headerFields, introText, bodyText, companyName, requesterTitle, itemsTitle, showSeq = true }: Props) {
  const cols = columns ?? EXPENSE_CLAIM_DEFAULT_COLUMNS
  const titles = sectionTitles({ requesterTitle, itemsTitle })
  const textSize = textPx(header.textSize)
  // The cells being typed into take the document's size; nothing else does.
  const cellFont = { fontSize: `${textSize}px` }
  const setHField = (id: string, v: string) => onHeaderChange({ ...header, fields: { ...(header.fields ?? {}), [id]: v } })
  // Paragraphs that have blanks to fill (plain paragraphs need no input).
  const fillTexts = [introText, bodyText].filter((t): t is string => !!t && templateFields(t).length > 0)
  const vcols = visibleColumns(cols)
  // Same proportions the sheet will print, so what is typed matches what comes out.
  const colPercents = fillColumnPercents(showSeq ? SEQ_COLUMN_WIDTH : 0, vcols)
  const hasColumns = vcols.length > 0
  const computed = items.map(r => computeRow(cols, r))
  const columnTotals = computeColumnTotals(cols, items)
  const total = grandTotal(cols, items)
  // Each tax is charged either on the whole document or on chosen lines, and
  // the two are decided separately: VAT on everything, withholding on two rows.
  // Both are held back for now (shared/features): until they are let out,
  // every tax is charged on the whole document, the way it always was.
  const scopes = FEATURES.taxPerRow ? { vat: header.vatScope, wht: header.whtScope, ret: header.retentionScope } : {}
  const onNet = FEATURES.taxOnNet ? { vat: header.vatOnNet, whtRate: header.whtOnNetRate } : undefined
  const vatByRow = !!header.vat && scopes.vat === 'rows'
  const whtByRow = !!header.whtRate && scopes.wht === 'rows'
  const bases = taxBases(cols, items, scopes)
  const tax = taxSummary(total, header.vat, header.whtRate, header.retentionRate, bases, onNet)
  // What the paragraphs' automatic fields show — the same figures the sheet prints.
  const autoValues = { company: companyName, amount: tax.netTotal, requester: `${header.firstName} ${header.lastName}`, position: header.position }
  // Whether this document is taxed a second time, on what it comes to rather
  // than on its items.
  const taxedAgain = !!onNet?.vat || !!onNet?.whtRate
  // VAT picked line by line is a tick (it is always 7%); withholding and
  // ค่าประกันงาน are a rate per line, so their columns hold a choice instead.
  const tickCols: { key: string; label: string; rate?: 'wht' | 'ret' }[] = [
    ...(vatByRow ? [{ key: ROW_VAT_KEY, label: 'VAT 7%' }] : []),
    ...(whtByRow ? [{ key: ROW_WHT_KEY, label: 'หัก ณ ที่จ่าย', rate: 'wht' as const }] : []),
    ...(!!header.retentionRate && scopes.ret === 'rows' ? [{ key: ROW_RET_RATE_KEY, label: 'ประกันงาน', rate: 'ret' as const }] : []),
  ]
  // Lines where อื่นๆ was picked and the rate is still being typed, as "wht:3".
  const [otherRateRows, setOtherRateRows] = useState<Set<string>>(new Set())
  const setRowRate = (kind: 'wht' | 'ret', i: number, rate: number) => {
    const set: ExpenseRow = kind === 'wht' ?{ [ROW_WHT_RATE_KEY]: rate, [ROW_WHT_KEY]: UNTICK } : { [ROW_RET_RATE_KEY]: rate }
    onItemsChange(items.map((r, x) => x === i ? { ...r, ...set } : r))
  }
  const ratePresets = (kind: 'wht' | 'ret') => kind === 'wht' ? WHT_PRESETS : RET_PRESETS
  const rateChoice = (kind: 'wht' | 'ret', i: number, rate: number): string =>
    otherRateRows.has(`${kind}:${i}`) || (rate > 0 && !ratePresets(kind).includes(rate)) ? 'other' : String(rate)

  const categoryOptions = categories ?? CATEGORIES

  function setCell(rowIdx: number, key: string, value: string | number) {
    onItemsChange(items.map((r, i) => i === rowIdx ? { ...r, [key]: value } : r))
  }
  // Single-select: pick one category (clicking the selected one clears it).
  function selectCategory(c: string) {
    const has = header.categories.includes(c)
    onHeaderChange({ ...header, categories: has ? [] : [c] })
  }

  return (
    <div className="space-y-4">
      {/* Category — hidden when the form defines no categories */}
      {categoryOptions.length > 0 && (
        <div className={cardClass}>
          <h2 className={cardTitleClass}>ประเภทค่าใช้จ่าย</h2>
          <div className="flex flex-wrap gap-2">
            {categoryOptions.map(c => {
              const on = header.categories.includes(c)
              return (
                <label
                  key={c}
                  className={`flex cursor-pointer select-none items-center gap-2 rounded-lg border px-3.5 py-2 text-sm transition-colors ${
                    on ? 'border-clay-500 bg-clay-50 font-medium text-clay-700' : 'border-stone-200 text-stone-600 hover:border-stone-300'
                  }`}
                >
                  <input type="checkbox" className="hidden" checked={on} onChange={() => selectCategory(c)} />
                  <span
                    className={`flex h-[15px] w-[15px] items-center justify-center rounded-full border ${
                      on ? 'border-clay-500' : 'border-stone-300'
                    }`}
                  >
                    {on && <span className="h-[7px] w-[7px] rounded-full bg-clay-500" />}
                  </span>
                  {c}
                </label>
              )
            })}
          </div>
        </div>
      )}

      {/* Requester */}
      <div className={cardClass}>
        <h2 className={cardTitleClass}>{titles.requester}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={labelClass}>ชื่อ</label>
            <input className={inputClass} placeholder="ชื่อ" value={header.firstName} onChange={e => onHeaderChange({ ...header, firstName: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>นามสกุล</label>
            <input className={inputClass} placeholder="นามสกุล" value={header.lastName} onChange={e => onHeaderChange({ ...header, lastName: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>ตำแหน่ง</label>
            <input className={inputClass} placeholder="ตำแหน่ง" value={header.position} onChange={e => onHeaderChange({ ...header, position: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Job</label>
            <input className={inputClass} placeholder="Job" value={header.job} onChange={e => onHeaderChange({ ...header, job: e.target.value })} />
          </div>
          {(headerFields ?? []).map(f => (
            <div key={f.id}>
              <label className={labelClass}>{f.label || 'ช่องเพิ่มเติม'}</label>
              {f.type === 'date'
                ? <DateInput className={inputClass} value={header.fields?.[f.id] ?? ''} onChange={v => setHField(f.id, v)} />
                : <input className={inputClass} placeholder={f.label} value={header.fields?.[f.id] ?? ''} onChange={e => setHField(f.id, e.target.value)} />}
            </div>
          ))}
        </div>
      </div>

      {/* Blanks in the form's paragraphs — typed here, printed in place of the dots */}
      {fillTexts.length > 0 && (
        <div className={cardClass}>
          <h2 className={cardTitleClass}>ข้อความในเอกสาร</h2>
          <div className="space-y-3">
            {fillTexts.map((t, i) => (
              <div key={i} className="whitespace-pre-line rounded-lg bg-stone-50 px-4 py-3 text-sm leading-[2.75] text-stone-700">
                {parseTemplate(t).map((p, j) => p.kind === 'text'
                  ? <span key={j}>{p.text}</span>
                  : p.field.type === 'auto'
                    ? <AutoChip key={j} field={p.field} value={autoValue(p.field.source, autoValues)} />
                    : <BlankInput key={j} field={p.field} value={header.fields?.[p.field.key] ?? ''} onChange={v => setHField(p.field.key, v)} />)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Items — dynamic columns */}
      <div className={cardClass}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className={cardTitleClass.replace('mb-4 ', '')}>{titles.items}</h2>
          <TextSizePicker value={textSize} onChange={v => onHeaderChange({ ...header, textSize: v })} />
        </div>
        {!hasColumns ? (
          <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
            ฟอร์มนี้ยังไม่ได้ตั้งค่าคอลัมน์<br />
            <span className="text-xs">ผู้ดูแลระบบต้องเพิ่มคอลัมน์ในหน้าแก้ไขฟอร์มก่อนจึงจะกรอกรายการได้</span>
          </div>
        ) : (
          <>
            <div className="scroll-slim overflow-x-auto">
              <table className={`w-full table-fixed border-separate border-spacing-0 text-xs leading-[1.9]`} style={{ minWidth: `${tableMinWidth(vcols, textSizeScale(textSize), tickCols.length)}px` }}>
                <thead>
                  <tr>
                    {showSeq && <th className={`w-8 border-b border-stone-200 bg-stone-50 px-1.5 py-2.5 text-center text-xs font-medium text-stone-500`}>#</th>}
                    {vcols.map((col, ci) => (
                      <th
                        key={col.key}
                        style={{ width: colPercents[ci] }}
                        className={`whitespace-pre-line break-words border-b border-stone-200 bg-stone-50 px-1.5 py-2.5 text-[11px] font-medium text-stone-600 ${
                          isTextCol(col.type) ? 'text-left' : 'text-right'
                        }`}
                      >
                        {col.label}
                        {col.type === 'calc' && <span className="ml-1 text-[10px] font-normal text-stone-400">(คำนวณ)</span>}
                      </th>
                    ))}
                    {tickCols.map(t => (
                      <th key={t.key} style={{ width: TICK_COL_PX }} className={`whitespace-pre-line border-b border-clay-100 bg-clay-50 px-1.5 py-2.5 text-center text-[11px] font-medium text-clay-700`}>
                        {t.label}
                      </th>
                    ))}
                    <th style={{ width: ACTION_COL_PX }} className="border-b border-stone-200 bg-stone-50 px-1 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, i) => (
                    <tr key={i} className="hover:bg-stone-50/60">
                      {showSeq && <td className="border-b border-stone-100 p-2 text-center text-stone-400">{i + 1}</td>}
                      {vcols.map(col => (
                        <td key={col.key} className="border-b border-stone-100 p-1">
                          {col.type === 'calc' ? (
                            <div className="truncate px-1 text-right font-medium text-stone-900">
                              {rowHasNumbers(cols, row) ? fmt(Number(computed[i][col.key]) || 0) : ''}
                            </div>
                          ) : col.type === 'date' ? (
                            <DateInput
                              className={`w-full min-w-0 rounded-md border border-stone-200 bg-white px-2 py-1.5 focus:border-clay-500 focus:outline-none focus:ring-2 focus:ring-clay-100`}
                              style={cellFont}
                              value={row[col.key] as string}
                              onChange={v => setCell(i, col.key, v)}
                            />
                          ) : col.type === 'number' ? (
                            <input
                              type="number"
                              placeholder="0"
                              className={`w-full min-w-0 rounded-md border border-stone-200 bg-white px-2 py-1.5 text-right placeholder:text-stone-300 focus:border-clay-500 focus:outline-none focus:ring-2 focus:ring-clay-100`}
                              style={cellFont}
                              value={(row[col.key] ?? '') as string | number}
                              onChange={e => setCell(i, col.key, e.target.value === '' ? '' : Number(e.target.value))}
                            />
                          ) : col.type === 'select' ? (
                            <select
                              className={`w-full min-w-0 rounded-md border border-stone-200 bg-white px-2 py-1.5 focus:border-clay-500 focus:outline-none focus:ring-2 focus:ring-clay-100`}
                              style={cellFont}
                              value={row[col.key] as string}
                              onChange={e => setCell(i, col.key, e.target.value)}
                            >
                              <option value="">— เลือก —</option>
                              {(col.options ?? []).filter(o => o.trim()).map((o, oi) => <option key={oi} value={o}>{o}</option>)}
                            </select>
                          ) : (
                            <GrowTextarea
                              className={`w-full min-w-0 rounded-md border border-stone-200 bg-white px-2 py-1.5 leading-snug focus:border-clay-500 focus:outline-none focus:ring-2 focus:ring-clay-100`}
                              style={cellFont}
                              aria-label={`${col.label.replace(/\s+/g, ' ')} รายการที่ ${i + 1}`}
                              value={(row[col.key] ?? '') as string}
                              onChange={v => setCell(i, col.key, v)}
                            />
                          )}
                        </td>
                      ))}
                      {tickCols.map(t => {
                        if (!t.rate) {
                          return (
                            <td key={t.key} className="border-b border-stone-100 bg-clay-50/40 p-1 text-center">
                              <input
                                type="checkbox"
                                aria-label={`${t.label} รายการที่ ${i + 1}`}
                                checked={isRowTicked(row, t.key)}
                                onChange={e => setCell(i, t.key, e.target.checked ? TICK : UNTICK)}
                              />
                            </td>
                          )
                        }
                        // An older ticked line shows the document's rate, which is what it is withheld at.
                        const kind = t.rate
                        const rate = kind === 'wht' ? rowWhtRate(row) ?? (header.whtRate || 0) : rowRetRate(row)
                        const choice = rateChoice(kind, i, rate)
                        return (
                          <td key={t.key} className="border-b border-stone-100 bg-clay-50/40 p-1 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <select
                                aria-label={`${t.label} รายการที่ ${i + 1}`}
                                className={`w-full rounded-md border border-stone-200 bg-white px-1 py-1 text-xs focus:border-clay-500 focus:outline-none focus:ring-2 focus:ring-clay-100 ${rate > 0 ? 'font-medium text-stone-900' : 'text-stone-400'}`}
                                value={choice}
                                onChange={e => {
                                  const v = e.target.value
                                  setOtherRateRows(prev => {
                                    const next = new Set(prev)
                                    if (v === 'other') next.add(`${kind}:${i}`)
                                    else next.delete(`${kind}:${i}`)
                                    return next
                                  })
                                  if (v !== 'other') setRowRate(kind, i, Number(v))
                                }}
                              >
                                <option value="0">ไม่หัก</option>
                                {ratePresets(kind).map(r => <option key={r} value={String(r)}>{r}%</option>)}
                                <option value="other">อื่นๆ</option>
                              </select>
                              {choice === 'other' && (
                                <span className="flex items-center gap-0.5 text-xs text-stone-500">
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    min={0}
                                    max={100}
                                    step="0.01"
                                    autoFocus={rate === 0}
                                    aria-label={`อัตรา${t.label} รายการที่ ${i + 1} (%)`}
                                    className="w-12 rounded-md border border-stone-200 bg-white px-1 py-0.5 text-right text-xs focus:border-clay-500 focus:outline-none focus:ring-2 focus:ring-clay-100"
                                    value={rate > 0 ? rate : ''}
                                    onChange={e => {
                                      const n = Number(e.target.value)
                                      setRowRate(kind, i, Number.isFinite(n) && n > 0 ? Math.min(n, 100) : 0)
                                    }}
                                  />
                                  %
                                </span>
                              )}
                            </div>
                          </td>
                        )
                      })}
                      <td className="border-b border-stone-100 px-1 py-1.5 text-center">
                        <ActionIconButton
                          label="ลบรายการ"
                          tone="red"
                          icon={<Trash2 size={16} />}
                          onClick={() => onItemsChange(items.filter((_, x) => x !== i))}
                        />
                      </td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="font-semibold text-stone-900">
                    {showSeq && <td className="border-t border-stone-200 px-2.5 py-2.5"></td>}
                    {vcols.map((col, idx) => (
                      <td key={col.key} className={`border-t border-stone-200 px-2.5 py-2.5 ${isTextCol(col.type) ? 'text-left' : 'text-right'}`}>
                        {idx === 0 ? 'รวม' : isTextCol(col.type) ? '' : fmt(columnTotals[col.key] ?? 0)}
                      </td>
                    ))}
                    {tickCols.map(t => <td key={t.key} className="border-t border-stone-200 bg-clay-50/40"></td>)}
                    <td className="border-t border-stone-200"></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <button
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-600 hover:border-clay-400 hover:text-clay-600"
              onClick={() => onItemsChange([...items, emptyRow(cols)])}
            >
              <Plus size={16} /> เพิ่มรายการ
            </button>
          </>
        )}
      </div>

      {/* Taxes and the total — see TaxPanel */}
      {hasColumns && (
        <TaxPanel header={header} onHeaderChange={onHeaderChange} items={items} onItemsChange={onItemsChange}
          cols={cols} tax={tax} bases={bases} taxedAgain={taxedAgain} />
      )}
    </div>
  )
}
