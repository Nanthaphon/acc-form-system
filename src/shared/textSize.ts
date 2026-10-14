// How large the text is in the boxes being typed into, in pixels. Columns are
// narrow and a claim can hold a lot of detail: smaller shows more of a long
// entry at once, larger reads more comfortably. It is the form's own setting,
// saved with it, so it follows that document and no other — and the printed
// sheet is unaffected, which is laid out by the form's own settings.

export const MIN_TEXT_PX = 10
export const MAX_TEXT_PX = 20
export const DEFAULT_TEXT_PX = 12

// What the three fixed sizes offered before a size could be typed now mean,
// so a document saved with one of them opens at the size it was saved at.
const OLD_SIZES: Record<string, number> = { small: 11, normal: 12, large: 14 }

/** The size in pixels for whatever a document carries: a number kept within
 *  10–20, one of the old named sizes, or nothing at all (12). */
export function textPx(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.min(MAX_TEXT_PX, Math.max(MIN_TEXT_PX, Math.round(value)))
  }
  return typeof value === 'string' && value in OLD_SIZES ? OLD_SIZES[value] : DEFAULT_TEXT_PX
}

// How much wider a box has to be at this size before the text in it is cut
// off — a date has to show dd/mm/yyyy whole at any size.
export function textSizeScale(value: unknown): number {
  return textPx(value) / DEFAULT_TEXT_PX
}
