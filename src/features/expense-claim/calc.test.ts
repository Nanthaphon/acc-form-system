import { describe, it, expect } from 'vitest'
import { computeItem, computeTotals, round2 } from './calc'
import { emptyItem } from '../../types/schema'

describe('computeItem', () => {
  it('คำนวณ ก่อนหัก = วันทำงาน × วันละ', () => {
    const r = computeItem({ ...emptyItem(), workDays: 27, ratePerDay: 500 })
    expect(r.amountBeforeWht).toBe(13500)
  })
  it('หัก 3% และยอดสุทธิ', () => {
    const r = computeItem({ ...emptyItem(), workDays: 27, ratePerDay: 500, applyWht: true })
    expect(r.wht3).toBe(405)
    expect(r.amountNet).toBe(13095)
  })
  it('ไม่หักเมื่อ applyWht=false', () => {
    const r = computeItem({ ...emptyItem(), workDays: 10, ratePerDay: 500, applyWht: false })
    expect(r.wht3).toBe(0)
    expect(r.amountNet).toBe(5000)
  })
  it('override ก่อนหัก แล้วสูตรอื่นคิดต่อจากค่า override', () => {
    const r = computeItem({ ...emptyItem(), workDays: 1, ratePerDay: 1, applyWht: true,
      amountBeforeWht: 1000, overrides: { amountBeforeWht: true } })
    expect(r.amountBeforeWht).toBe(1000)
    expect(r.wht3).toBe(30)
    expect(r.amountNet).toBe(970)
  })
  it('override wht3 โดยตรง', () => {
    const r = computeItem({ ...emptyItem(), workDays: 27, ratePerDay: 500, applyWht: true,
      wht3: 400, overrides: { wht3: true } })
    expect(r.wht3).toBe(400)
    expect(r.amountNet).toBe(13100)
  })
})

describe('computeTotals', () => {
  it('รวมทุกคอลัมน์ + ตัวอักษรไทย', () => {
    const items = [
      { ...emptyItem(), workDays: 27, ratePerDay: 500 },
      { ...emptyItem(), workDays: 25, ratePerDay: 500 },
    ]
    const t = computeTotals(items)
    expect(t.totalBefore).toBe(26000)
    expect(t.totalWht).toBe(780)
    expect(t.totalNet).toBe(25220)
    expect(t.amountInThaiText).toBe('สองหมื่นห้าพันสองร้อยยี่สิบบาทถ้วน')
  })
})

describe('round2', () => {
  it('ปัด 2 ตำแหน่ง', () => expect(round2(405.005)).toBe(405.01))
})
