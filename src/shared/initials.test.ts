import { describe, expect, it } from 'vitest'
import { initialOf, initialsOf } from './initials'

describe('initials', () => {
  it('takes the consonant, not a vowel written before it', () => {
    expect(initialsOf('อ้อมฤทัย', 'โรจนภาสกร')).toBe('อร')
    expect(initialOf('เยาวลักษณ์')).toBe('ย')
    expect(initialOf('ไพรัช')).toBe('พ')
  })
  it('upper-cases a Latin name and is empty for none', () => {
    expect(initialsOf('jadsada', 'dachanithi')).toBe('JD')
    expect(initialOf('  ')).toBe('')
    expect(initialOf(null)).toBe('')
  })
})

describe('avatarTone', () => {
  it('gives one person the same colour every time, and spreads people over the colours', async () => {
    const { avatarTone } = await import('./initials')
    expect(avatarTone('1010001')).toBe(avatarTone('1010001'))
    const tones = new Set(Array.from({ length: 40 }, (_, i) => avatarTone(String(1010000 + i))))
    expect(tones.size).toBeGreaterThan(1)
  })
})
