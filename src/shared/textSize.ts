import type { DocTextSize } from '../types/schema'

// How large the text is in the boxes being typed into. Columns are narrow and a
// claim can hold a lot of detail: เล็ก shows more of a long entry at once, ใหญ่
// reads more comfortably. It is the form's own setting, saved with it, so it
// follows that document and no other — and the printed sheet is unaffected,
// which is laid out by the form's own settings.
export const TEXT_SIZES: { value: DocTextSize; label: string; cell: string; px: number }[] = [
  { value: 'small', label: 'เล็ก', cell: 'text-[11px]', px: 11 },
  { value: 'normal', label: 'ปกติ', cell: 'text-xs', px: 12 },
  { value: 'large', label: 'ใหญ่', cell: 'text-sm', px: 14 },
]

const NORMAL = TEXT_SIZES[1]

// A document saved before the choice existed, or one carrying something
// unknown, reads as ปกติ.
export function textSizeOf(value: unknown): DocTextSize {
  return TEXT_SIZES.find(s => s.value === value)?.value ?? NORMAL.value
}

// The class for a cell being filled in.
export function textSizeStyles(value: unknown): string {
  return (TEXT_SIZES.find(s => s.value === value) ?? NORMAL).cell
}

// How much wider a box has to be at this size before the text in it is cut
// off — a date has to show dd/mm/yyyy whole at any size.
export function textSizeScale(value: unknown): number {
  const chosen = TEXT_SIZES.find(s => s.value === value) ?? NORMAL
  return chosen.px / NORMAL.px
}
