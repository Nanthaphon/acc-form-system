import { describe, expect, it } from 'vitest'
import { canManageLogin, isSuperAdmin, passwordState, roleLabel, roleTone } from './roles'

describe('roles', () => {
  it('labels the three levels', () => {
    expect(roleLabel({ role: 'admin', isSuperAdmin: true })).toBe('Super Admin')
    expect(roleLabel({ role: 'admin' })).toBe('Account Admin')
    expect(roleLabel({ role: 'employee' })).toBe('พนักงาน')
    expect(roleTone({ role: 'admin', isSuperAdmin: true })).toBe('amber')
  })

  it('needs the admin role as well as the flag to be Super Admin', () => {
    expect(isSuperAdmin({ role: 'admin', isSuperAdmin: true })).toBe(true)
    expect(isSuperAdmin({ role: 'employee', isSuperAdmin: true })).toBe(false)
    expect(isSuperAdmin(null)).toBe(false)
  })
})

describe('passwordState', () => {
  it('reads the stored flags', () => {
    expect(passwordState({ mustChangePassword: true, passwordIsDefault: true })).toBe('default')
    expect(passwordState({ mustChangePassword: false, passwordIsDefault: true })).toBe('default')
    expect(passwordState({ mustChangePassword: true, passwordIsDefault: false })).toBe('temporary')
    expect(passwordState({ mustChangePassword: false, passwordIsDefault: false })).toBe('own')
  })

  it('falls back to mustChangePassword before the column exists', () => {
    expect(passwordState({ mustChangePassword: true })).toBe('default')
    expect(passwordState({ mustChangePassword: false })).toBe('own')
  })
})

describe('canManageLogin', () => {
  const employee = { role: 'employee' } as const
  const accAdmin = { role: 'admin' } as const
  const superAdmin = { role: 'admin', isSuperAdmin: true } as const

  it('lets any admin set up an employee, and nobody else', () => {
    expect(canManageLogin(accAdmin, employee)).toBe(true)
    expect(canManageLogin(superAdmin, employee)).toBe(true)
    expect(canManageLogin(employee, employee)).toBe(false)
    expect(canManageLogin(null, employee)).toBe(false)
  })

  it('keeps the Super Admin account for the Super Admin alone', () => {
    expect(canManageLogin(accAdmin, superAdmin)).toBe(false)
    expect(canManageLogin(superAdmin, superAdmin)).toBe(true)
  })
})
