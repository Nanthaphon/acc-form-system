import { describe, it, expect } from 'vitest'
import { bahtText } from './bahttext'

describe('bahtText', () => {
  it('ศูนย์', () => expect(bahtText(0)).toBe('ศูนย์บาทถ้วน'))
  it('หลักหน่วย', () => expect(bahtText(1)).toBe('หนึ่งบาทถ้วน'))
  it('เอ็ด', () => expect(bahtText(11)).toBe('สิบเอ็ดบาทถ้วน'))
  it('ยี่สิบ', () => expect(bahtText(21)).toBe('ยี่สิบเอ็ดบาทถ้วน'))
  it('ร้อย', () => expect(bahtText(101)).toBe('หนึ่งร้อยเอ็ดบาทถ้วน'))
  it('พัน', () => expect(bahtText(13095)).toBe('หนึ่งหมื่นสามพันเก้าสิบห้าบาทถ้วน'))
  it('ล้าน', () => expect(bahtText(1000000)).toBe('หนึ่งล้านบาทถ้วน'))
  it('สตางค์', () => expect(bahtText(25.50)).toBe('ยี่สิบห้าบาทห้าสิบสตางค์'))
  it('ปัดสตางค์', () => expect(bahtText(0.25)).toBe('ยี่สิบห้าสตางค์'))
})
