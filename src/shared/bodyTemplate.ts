import { formatIsoDate } from './date'
import { formatMoney } from './money'
import { bahtText } from './bahttext'

// Fill-in blanks inside a form's paragraph text (introText / bodyText).
// The admin writes {{ชื่อช่อง}} where the person filling the form types a value;
// {{ชื่อช่อง:วันที่}} / {{ชื่อช่อง:ตัวเลข}} make it a date / number field. A blank
// left empty prints as a dotted line, so it can still be written in by hand.
// {{ชื่อช่อง:เลือก=เงินสด|โอนเงิน|เช็ค}} is a dropdown of those choices.
// {{ชื่อบริษัท:อัตโนมัติ}} is filled by the system from what the document
// already holds (see AUTO_FIELDS) — nobody types it, so it cannot disagree.
// Values live in header.fields under `tpl:<label>` — the same label used twice
// is one field.

export type TemplateFieldType = 'text' | 'date' | 'number' | 'select' | 'auto'
export type AutoSource = 'company' | 'amount' | 'amountText' | 'requester' | 'position'
export interface TemplateField { key: string; label: string; type: TemplateFieldType; options?: string[]; source?: AutoSource }
export type TemplatePart = { kind: 'text'; text: string } | { kind: 'field'; field: TemplateField }

export const TEMPLATE_KEY_PREFIX = 'tpl:'
const TYPE_WORDS: Record<string, TemplateFieldType> = {
  'วันที่': 'date', date: 'date', 'ตัวเลข': 'number', number: 'number', 'อัตโนมัติ': 'auto', auto: 'auto',
}
const TYPE_SUFFIX: Record<TemplateFieldType, string> = { text: '', date: ':วันที่', number: ':ตัวเลข', select: ':เลือก=', auto: ':อัตโนมัติ' }

// What an automatic field can show, by the name written in it. The company
// is the one picked at the top of the form; the amount is the document's
// net total, as its "เป็นจำนวนเงิน" line prints it.
export const AUTO_FIELDS: { source: AutoSource; label: string; from: string }[] = [
  { source: 'company', label: 'ชื่อบริษัท', from: 'บริษัทที่เลือกด้านบน' },
  { source: 'amount', label: 'ยอดเงิน', from: 'ยอดสุทธิของเอกสาร' },
  { source: 'amountText', label: 'ยอดเงินตัวอักษร', from: 'ยอดสุทธิเป็นตัวอักษร' },
  { source: 'requester', label: 'ชื่อผู้เบิก', from: 'ชื่อ นามสกุล ในเอกสาร' },
  { source: 'position', label: 'ตำแหน่ง', from: 'ตำแหน่งในเอกสาร' },
]
export interface AutoValues { company?: string | null; amount?: number; requester?: string; position?: string }

// An automatic field's value, or '' while there is nothing to show — which
// prints as dots, like an empty blank. A zero amount is nothing yet.
export function autoValue(source: AutoSource | undefined, v: AutoValues): string {
  switch (source) {
    case 'company': return (v.company ?? '').trim()
    case 'amount': return v.amount && v.amount > 0 ? formatMoney(v.amount) : ''
    case 'amountText': return v.amount && v.amount > 0 ? bahtText(v.amount) : ''
    case 'requester': return (v.requester ?? '').trim()
    case 'position': return (v.position ?? '').trim()
    default: return ''
  }
}
const TOKEN = /\{\{([^{}]*)\}\}/g
// "name:เลือก=a|b|c" — the choices may themselves hold a colon (10:00|13:00).
const SELECT = /^(.*):\s*(?:เลือก|select)\s*=(.*)$/is
const OPTION_SEP = '|'
// A run of 4+ dots (or 2+ "…") — how blanks were typed before fields existed.
const DOTS = /[.…]{4,}|…{2,}/g

// The choices of a dropdown, cleaned: no braces or separators inside one, no
// empty or repeated ones.
export function cleanOptions(options: string[]): string[] {
  const out: string[] = []
  for (const o of options) {
    const c = o.replace(/[{}|]/g, '').trim()
    if (c && !out.includes(c)) out.push(c)
  }
  return out
}

function parseToken(inner: string): TemplateField | null {
  const select = SELECT.exec(inner)
  if (select) {
    const label = select[1].trim()
    const options = cleanOptions(select[2].split(OPTION_SEP))
    if (!label) return null
    // With nothing to choose from it is an ordinary blank.
    return options.length
      ? { key: TEMPLATE_KEY_PREFIX + label, label, type: 'select', options }
      : { key: TEMPLATE_KEY_PREFIX + label, label, type: 'text' }
  }
  let label = inner
  let type: TemplateFieldType = 'text'
  const i = inner.lastIndexOf(':')
  if (i >= 0) {
    const t = TYPE_WORDS[inner.slice(i + 1).trim().toLowerCase()]
    if (t) { label = inner.slice(0, i); type = t }
  }
  label = label.trim()
  if (!label) return null
  if (type === 'auto') {
    // A name the system has no value for is an ordinary blank.
    const auto = AUTO_FIELDS.find(a => a.label === label)
    return auto
      ? { key: `auto:${auto.source}`, label, type: 'auto', source: auto.source }
      : { key: TEMPLATE_KEY_PREFIX + label, label, type: 'text' }
  }
  return { key: TEMPLATE_KEY_PREFIX + label, label, type }
}

// Splits text into literal runs and fields. "{{}}" (no name) stays literal.
export function parseTemplate(text: string): TemplatePart[] {
  const parts: TemplatePart[] = []
  let last = 0
  for (const m of text.matchAll(TOKEN)) {
    const field = parseToken(m[1])
    if (!field) continue
    if (m.index > last) parts.push({ kind: 'text', text: text.slice(last, m.index) })
    parts.push({ kind: 'field', field })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ kind: 'text', text: text.slice(last) })
  return parts
}

// Every distinct field across the given texts, in order of first appearance.
export function templateFields(...texts: (string | null | undefined)[]): TemplateField[] {
  const seen = new Map<string, TemplateField>()
  for (const t of texts) {
    for (const p of parseTemplate(t ?? '')) {
      if (p.kind === 'field' && !seen.has(p.field.key)) seen.set(p.field.key, p.field)
    }
  }
  return [...seen.values()]
}

// A typed value as it should print, or '' when nothing was entered.
export function formatTemplateValue(field: TemplateField, raw: string | undefined): string {
  const v = (raw ?? '').trim()
  if (!v) return ''
  if (field.type === 'date') return formatIsoDate(v)
  if (field.type === 'number') {
    const n = Number(v.replace(/,/g, ''))
    // Always two decimals, like every other amount on the document (money() in
    // ExpenseClaimPreview): a blank filled in as 1000.50 has
    // to print as 1,000.50, not 1,000.5.
    return Number.isFinite(n) ? formatMoney(n) : v
  }
  return v
}

// What an empty blank prints as.
export function blankFor(field: TemplateField): string {
  const long = field.type === 'text' || (field.type === 'auto' && field.source !== 'amount')
  return long ? '.'.repeat(40) : '.'.repeat(24)
}

// The token for a field, or '' if the name is empty once { } : are removed —
// or, for a dropdown, if there is nothing to choose from.
export function makeToken(label: string, type: TemplateFieldType = 'text', options: string[] = []): string {
  const clean = label.replace(/[{}:]/g, '').trim()
  if (!clean) return ''
  if (type !== 'select') return `{{${clean}${TYPE_SUFFIX[type]}}}`
  const choices = cleanOptions(options)
  return choices.length ? `{{${clean}${TYPE_SUFFIX.select}${choices.join(OPTION_SEP)}}}` : ''
}

// Choices as an admin types them into one box: separated by commas or new lines.
export function splitOptions(typed: string): string[] {
  return cleanOptions(typed.split(/[,\n|]/))
}

export function countDottedBlanks(text: string): number {
  return (text.match(DOTS) ?? []).length
}

// Turns every dotted blank into a field, named after the word right before it
// ("ได้รับเงินจาก ......" -> {{ได้รับเงินจาก}}). Names containing วันที่ become
// date fields and จำนวน number fields. Without a usable word the field is
// numbered "ช่องที่ N"; repeated names get " 2", " 3" so each stays separate.
export function dotsToTokens(text: string): string {
  const used = new Set(templateFields(text).map(f => f.label))
  let n = 0
  return text.replace(DOTS, (_m, offset: number) => {
    n++
    const before = text.slice(0, offset).trimEnd()
    const word = /(\S+)$/.exec(before)?.[1] ?? ''
    let label = word && !/[{}:.…]/.test(word) && word.length <= 25 ? word : `ช่องที่ ${n}`
    const base = label
    for (let k = 2; used.has(label); k++) label = `${base} ${k}`
    used.add(label)
    const type: TemplateFieldType = label.includes('วันที่') ? 'date' : label.includes('จำนวน') ? 'number' : 'text'
    return makeToken(label, type)
  })
}
