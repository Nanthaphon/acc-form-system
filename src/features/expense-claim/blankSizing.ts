import type { TemplateFieldType } from '../../shared/bodyTemplate'

// How wide a {{blank}} inside a form's paragraph is drawn on the fill-in screen.
// A paragraph mixes short answers (a name, an amount) with long ones, so one
// fixed width either wastes the line or hides the end of what was typed: the
// blank is measured against its own content instead and grows between a
// minimum (so an empty blank still reads as a blank) and a maximum (so a very
// long entry cannot push the rest of the sentence off the line).
export interface BlankLimits { min: number; max: number }

// The input's own horizontal padding + border + a little caret room, added to
// the measured text width. Keep in step with blankClass in ExpenseClaimForm.
export const BLANK_PAD_PX = 24

export const BLANK_LIMITS: Record<TemplateFieldType, BlankLimits> = {
  // Free text — names, reasons, addresses. Grows the most.
  text: { min: 260, max: 620 },
  // An amount: "1,234,567.89" is about as long as these get.
  number: { min: 160, max: 280 },
  // Always dd/mm/yyyy, so there is nothing to grow into.
  date: { min: 160, max: 160 },
}

// Width for a blank whose text measures `measured` px. Text wider than the
// maximum keeps the maximum (the input scrolls) rather than breaking the line.
export function blankWidth(measured: number, limits: BlankLimits): number {
  if (!Number.isFinite(measured) || measured <= 0) return limits.min
  return Math.min(limits.max, Math.max(limits.min, Math.ceil(measured) + BLANK_PAD_PX))
}
