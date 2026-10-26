import { describe, expect, it } from 'vitest'
import { emailProblem, isValidEmail, normalizeEmail } from './emailAddress'

describe('employee email', () => {
  it('is stored trimmed and in lower case', () => {
    expect(normalizeEmail('  Somchai@Globe.CO.TH ')).toBe('somchai@globe.co.th')
    expect(normalizeEmail(undefined)).toBe('')
  })

  it('catches a slip, and an empty value is not a problem', () => {
    expect(isValidEmail('a@b.co')).toBe(true)
    expect(isValidEmail('a@b')).toBe(false)
    expect(emailProblem('somchai globe.co.th')).toMatch(/ไม่ถูกต้อง/)
    expect(emailProblem('')).toBeNull()
  })
})
