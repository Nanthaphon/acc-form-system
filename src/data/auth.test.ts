import { describe, expect, it } from 'vitest'
import { employeeIdToEmail } from './auth'

describe('employeeIdToEmail', () => {
  it('leaves ordinary IDs unchanged so existing logins still work', () => {
    expect(employeeIdToEmail('admin001')).toBe('admin001@globe.local')
    expect(employeeIdToEmail(' 1010122 ')).toBe('1010122@globe.local')
    expect(employeeIdToEmail('EMP_01.a-b')).toBe('EMP_01.a-b@globe.local')
  })

  it('encodes characters an email cannot hold, keeping a single @', () => {
    const email = employeeIdToEmail('Acc@GB')
    expect(email).toBe('Acc+40GB@globe.local')
    expect(email.split('@')).toHaveLength(2)
    expect(employeeIdToEmail('a b')).toBe('a+20b@globe.local')
  })
})
