import { formatIsoDate } from './date'

// Fill-in blanks inside a form's paragraph text (introText / bodyText).
// The admin writes {{ชื่อช่อง}} where the person filling the form types a value;
// {{ชื่อช่อง:วันที่}} / {{ชื่อช่อง:ตัวเลข}} make it a date / number field. A blank
// left empty prints as a dotted line, so it can still be written in by hand.
// Values live in header.fields under `tpl:<label>` — the same label used twice
// is one field.

export type TemplateFieldType = 'text' | 'date' | 'number'
export interface TemplateField { key: string; label: string; type: TemplateFieldType }
export type TemplatePart = { kind: 'text'; text: string } | { kind: 'field'; field: TemplateField }

export const TEMPLATE_KEY_PREFIX = 'tpl:'
const TYPE_WORDS: Record<string, TemplateFieldType> = { 'วันที่': 'date', date: 'date', 'ตัวเลข': 'number', number: 'number' }
const TYPE_SUFFIX: Record<TemplateFieldType, string> = { text: '', date: ':วันที่', number: ':ตัวเลข' }
const TOKEN = /\{\{([^{}]*)\}\}/g
// A run of 4+ dots (or 2+ "…") — how blanks were typed before fields existed.
const DOTS = /[.…]{4,}|…{2,}/g

function parseToken(inner: string): TemplateField | null {
  let label = inner
  let type: TemplateFieldType = 'text'
  const i = inner.lastIndexOf(':')
  if (i >= 0) {
    const t = TYPE_WORDS[inner.slice(i + 1).trim().toLowerCase()]
    if (t) { label = inner.slice(0, i); type = t }
  }
  label = label.trim()
  return label ? { key: TEMPLATE_KEY_PREFIX + label, label, type } : null
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
    // ExpenseClaimPreview / ExpenseClaimPdf): a blank filled in as 1000.50 has
    // to print as 1,000.50, not 1,000.5.
    return Number.isFinite(n) ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : v
  }
  return v
}

// What an empty blank prints as.
export function blankFor(field: TemplateField): string {
  return field.type === 'text' ? '.'.repeat(40) : '.'.repeat(24)
}

// The token for a field, or '' if the name is empty once { } : are removed.
export function makeToken(label: string, type: TemplateFieldType = 'text'): string {
  const clean = label.replace(/[{}:]/g, '').trim()
  return clean ? `{{${clean}${TYPE_SUFFIX[type]}}}` : ''
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
