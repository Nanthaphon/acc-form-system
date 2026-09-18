import { describe, it, expect } from 'vitest'
import { blankWidth, BLANK_LIMITS, BLANK_PAD_PX } from './blankSizing'

const text = BLANK_LIMITS.text
const num = BLANK_LIMITS.number

describe('blankWidth', () => {
  it('keeps the minimum for an empty or short blank', () => {
    expect(blankWidth(0, text)).toBe(text.min)
    expect(blankWidth(83, text)).toBe(text.min)   // "สมชาย ใจดี"
    expect(blankWidth(87, num)).toBe(num.min)     // "1,234,567.89"
  })
  it('grows past the minimum to fit longer text, plus room for the padding', () => {
    expect(blankWidth(288, text)).toBe(288 + BLANK_PAD_PX)  // a long company name
    expect(blankWidth(589, text)).toBe(589 + BLANK_PAD_PX)  // a full address
  })
  it('stops at the maximum so a very long entry cannot break the line', () => {
    expect(blankWidth(1041, text)).toBe(text.max)
    expect(blankWidth(99999, num)).toBe(num.max)
  })
  it('falls back to the minimum where there is no layout to measure', () => {
    // offsetWidth is 0 in jsdom and before the first paint.
    expect(blankWidth(0, num)).toBe(num.min)
    expect(blankWidth(NaN, text)).toBe(text.min)
    expect(blankWidth(-5, text)).toBe(text.min)
  })
  it('never returns a width below the minimum or above the maximum', () => {
    for (const m of [0, 1, 100, 250, 600, 5000]) {
      const w = blankWidth(m, text)
      expect(w).toBeGreaterThanOrEqual(text.min)
      expect(w).toBeLessThanOrEqual(text.max)
    }
  })
  it('a date blank has nothing to grow into', () => {
    const d = BLANK_LIMITS.date
    expect(d.min).toBe(d.max)
    expect(blankWidth(5000, d)).toBe(d.min)
  })
})
