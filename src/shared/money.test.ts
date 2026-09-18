import { describe, it, expect } from 'vitest'
import { formatMoney } from './money'

describe('formatMoney', () => {
  it('keeps the satang — 1000.5 is 1,000.50, never 1,000.5', () => {
    expect(formatMoney(1000.5)).toBe('1,000.50')
    expect(formatMoney(1000.50)).toBe('1,000.50')
    expect(formatMoney(100.1)).toBe('100.10')
    expect(formatMoney(0.5)).toBe('0.50')
  })
  it('shows two decimals on a whole number too', () => {
    expect(formatMoney(1000)).toBe('1,000.00')
    expect(formatMoney(0)).toBe('0.00')
  })
  it('separates thousands', () => {
    expect(formatMoney(1234567.89)).toBe('1,234,567.89')
  })
  it('rounds anything finer than satang', () => {
    expect(formatMoney(1.005)).toBe('1.01')
    expect(formatMoney(1234.567)).toBe('1,234.57')
  })
  it('handles negatives', () => {
    expect(formatMoney(-20.4)).toBe('-20.40')
  })
  it('falls back to zero rather than printing NaN in a document', () => {
    expect(formatMoney(NaN)).toBe('0.00')
    expect(formatMoney(Infinity)).toBe('0.00')
  })
})
