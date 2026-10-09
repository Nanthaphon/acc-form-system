import type { DocTextSize } from '../types/schema'

// How large the text is — both in the table being filled in and in the document
// itself, on screen and on paper. Columns are narrow and a claim can hold a lot
// of detail: เล็ก fits more of it on a sheet, ใหญ่ reads more comfortably.
// The choice belongs to the document, not to the browser, so the sheet the
// approver signs and prints is the one the person filling it in laid out.
export const TEXT_SIZES: {
  value: DocTextSize
  label: string
  cell: string    // the fill-in table's cells
  head: string    // its column headings
  doc: number     // how much the printed document grows or shrinks
}[] = [
  { value: 'small', label: 'เล็ก', cell: 'text-[11px]', head: 'text-[10px]', doc: 0.85 },
  { value: 'normal', label: 'ปกติ', cell: 'text-xs', head: 'text-[11px]', doc: 1 },
  { value: 'large', label: 'ใหญ่', cell: 'text-sm', head: 'text-xs', doc: 1.15 },
]

const NORMAL = TEXT_SIZES[1]

// A document saved before the choice existed, or one carrying something
// unknown, reads as ปกติ — exactly how it has always printed.
export function textSizeOf(value: unknown): DocTextSize {
  return TEXT_SIZES.find(s => s.value === value)?.value ?? NORMAL.value
}

export function textSizeStyles(value: unknown): { cell: string; head: string } {
  const chosen = TEXT_SIZES.find(s => s.value === value) ?? NORMAL
  return { cell: chosen.cell, head: chosen.head }
}

// The document's text is sized from one number, so everything on the sheet
// grows and shrinks together: 1 is the size every form has printed at so far.
export function docScale(value: unknown): number {
  return (TEXT_SIZES.find(s => s.value === value) ?? NORMAL).doc
}

// The document's base text in pixels — the size of its ordinary text at ปกติ,
// which every other size on the sheet is a fraction or multiple of.
export const DOC_BASE_PX = 12
