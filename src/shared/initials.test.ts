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

describe('AVATAR_TONE', () => {
  it('is one grey for everyone', async () => {
    const { AVATAR_TONE } = await import('./initials')
    expect(AVATAR_TONE).toContain('bg-stone-100')
  })
})
