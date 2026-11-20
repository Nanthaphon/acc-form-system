import { describe, expect, it } from 'vitest'
import { bangkokToday, hasResigned, loginEmail, matchCompany, planSync, stripPrefix } from './plan'
import { employeeIdToEmail } from '../../../src/data/auth'
import type { CentralEmployee, LocalCompany, LocalProfile } from './plan'

const COMPANIES: LocalCompany[] = [
  { id: 'globe', name: 'บริษัท โกลบ ซินดิเคท (ประเทศไทย) จำกัด', shortName: 'Globe Syndicate' },
  { id: 'besthrm', name: 'บริษัท เบสท์ เอช อาร์ เอ็ม จำกัด', shortName: 'Besthrm' },
]
const TODAY = '2026-11-20'

const emp = (o: Partial<CentralEmployee>): CentralEmployee => ({
  emp_id: '1010001', company: 'Globe Syndicate', name_prefix: 'นาง', first_name: 'อ้อมฤทัย', last_name: 'ใจดี',
  position: 'ผู้จัดการ', department: 'บัญชี', m365_email: 'Om@globe.co.th', resign_date: null, ...o,
})
const prof = (o: Partial<LocalProfile>): LocalProfile => ({
  uid: 'u1', employeeId: '1010001', firstName: 'อ้อม', lastName: 'ใจดี', position: '', department: 'บัญชี',
  companyId: 'globe', email: null, ...o,
})

describe('stripPrefix', () => {
  it('takes the title off a first name that has it typed in', () => {
    expect(stripPrefix('นางสาวพรชนก', 'นางสาว')).toBe('พรชนก')
    expect(stripPrefix('นางอ้อมฤทัย', 'นาง')).toBe('อ้อมฤทัย')
    expect(stripPrefix('นางสาวสุภาพร', 'นาง')).toBe('สุภาพร') // longest known title first
  })
  it('leaves a plain name alone, even one that is only a title', () => {
    expect(stripPrefix('เบญจวรรณ', 'นางสาว')).toBe('เบญจวรรณ')
    expect(stripPrefix('นาย', 'นาย')).toBe('นาย')
  })
})

describe('matchCompany', () => {
  it('matches the short name, full name or id, case and spacing aside', () => {
    expect(matchCompany('Globe Syndicate', COMPANIES)).toBe('globe')
    expect(matchCompany(' globe  syndicate ', COMPANIES)).toBe('globe')
    expect(matchCompany('BESTHRM', COMPANIES)).toBe('besthrm')
  })
  it('is null for an unknown or empty name', () => {
    expect(matchCompany('Other Co', COMPANIES)).toBeNull()
    expect(matchCompany('', COMPANIES)).toBeNull()
  })
})

describe('hasResigned', () => {
  it('counts the resign day itself as gone', () => {
    expect(hasResigned('2026-11-20', TODAY)).toBe(true)
    expect(hasResigned('2026-11-21', TODAY)).toBe(false)
    expect(hasResigned(null, TODAY)).toBe(false)
  })
})

describe('bangkokToday', () => {
  it('is already tomorrow in Bangkok after 17:00 UTC', () => {
    expect(bangkokToday(new Date('2026-11-20T17:30:00Z'))).toBe('2026-11-21')
    expect(bangkokToday(new Date('2026-11-20T16:59:00Z'))).toBe('2026-11-20')
  })
})

describe('planSync', () => {
  it('copies the master details onto the profile with the same employee ID', () => {
    const plan = planSync([emp({})], [prof({})], COMPANIES, TODAY)
    expect(plan.patches).toHaveLength(1)
    const p = plan.patches[0]
    expect(p.set).toEqual({
      firstName: 'อ้อมฤทัย', lastName: 'ใจดี', position: 'ผู้จัดการ', department: 'บัญชี',
      companyId: 'globe', email: 'om@globe.co.th',
      centralStatus: 'active', centralFields: ['firstName', 'lastName', 'position', 'department', 'companyId', 'email'],
    })
    expect(p.changed).toEqual(['firstName', 'position', 'email'])
  })

  it('matches the employee ID regardless of case and spaces', () => {
    const plan = planSync([emp({ emp_id: ' gs001 ' })], [prof({ employeeId: 'GS001' })], COMPANIES, TODAY)
    expect(plan.notInCentral).toEqual([])
    expect(plan.patches[0].set.centralStatus).toBe('active')
  })

  it('never blanks a field the master has empty, and does not own it', () => {
    const plan = planSync([emp({ position: '  ', m365_email: null })], [prof({ position: 'หัวหน้า', email: 'me@x.com' })], COMPANIES, TODAY)
    const set = plan.patches[0].set
    expect(set.position).toBeUndefined()
    expect(set.email).toBeUndefined()
    expect(set.centralFields).not.toContain('position')
    expect(set.centralFields).not.toContain('email')
  })

  it('leaves the company alone and reports it when the name matches no company', () => {
    const plan = planSync([emp({ company: 'New Brand Co' })], [prof({ companyId: 'besthrm' })], COMPANIES, TODAY)
    expect(plan.patches[0].set.companyId).toBeUndefined()
    expect(plan.unknownCompanies).toEqual(['New Brand Co'])
  })

  it('skips the email when the database has no email column', () => {
    const plan = planSync([emp({})], [prof({})], COMPANIES, TODAY, ['firstName', 'lastName', 'position', 'department', 'companyId'])
    expect(plan.patches[0].set.email).toBeUndefined()
    expect(plan.patches[0].set.centralFields).not.toContain('email')
  })

  it('writes nothing for a profile already in step', () => {
    const synced = prof({
      firstName: 'อ้อมฤทัย', position: 'ผู้จัดการ', email: 'om@globe.co.th', centralStatus: 'active',
      centralFields: ['firstName', 'lastName', 'position', 'department', 'companyId', 'email'],
    })
    const plan = planSync([emp({})], [synced], COMPANIES, TODAY)
    expect(plan.patches).toEqual([])
    expect(plan.unchanged).toBe(1)
  })

  it('marks people the master says have left, without removing them', () => {
    const plan = planSync([emp({ resign_date: '2026-10-31' })], [prof({})], COMPANIES, TODAY)
    expect(plan.patches[0].set.centralStatus).toBe('resigned')
    expect(plan.resigned).toEqual([{ employeeId: '1010001', name: 'อ้อมฤทัย ใจดี', resignDate: '2026-10-31' }])
  })

  it('hands the fields back for someone no longer in the master', () => {
    const plan = planSync([], [prof({ centralStatus: 'active', centralFields: ['firstName'] })], COMPANIES, TODAY)
    expect(plan.notInCentral).toEqual([{ employeeId: '1010001', name: 'อ้อม ใจดี' }])
    expect(plan.patches[0].set).toEqual({ centralStatus: 'missing', centralFields: [] })
    // …and only once.
    const again = planSync([], [prof({ centralStatus: 'missing', centralFields: [] })], COMPANIES, TODAY)
    expect(again.patches).toEqual([])
  })

  it('lists people still working who have no login here, not those who left', () => {
    const plan = planSync(
      [emp({}), emp({ emp_id: '1010182', name_prefix: 'นางสาว', first_name: 'นางสาวเบญจวรรณ', last_name: 'ดี' }), emp({ emp_id: '1010999', resign_date: '2025-01-01' })],
      [prof({})], COMPANIES, TODAY,
    )
    expect(plan.notHere).toHaveLength(1)
    expect(plan.notHere[0]).toMatchObject({ employeeId: '1010182', name: 'เบญจวรรณ ดี', company: 'Globe Syndicate' })
    // …with the details the new account is made with
    expect(plan.notHere[0].set).toMatchObject({ firstName: 'เบญจวรรณ', lastName: 'ดี', companyId: 'globe', centralStatus: 'active' })
    expect(plan.notHere[0].set.centralFields).toContain('firstName')
  })

  it('prefers the row still working when the master lists an ID twice', () => {
    const plan = planSync(
      [emp({ company: 'Besthrm', resign_date: '2025-01-01' }), emp({ company: 'Globe Syndicate' })],
      [prof({ companyId: 'besthrm' })], COMPANIES, TODAY,
    )
    expect(plan.patches[0].set.companyId).toBe('globe')
    expect(plan.patches[0].set.centralStatus).toBe('active')
  })

  it('makes no second account for someone already here under another employee ID', () => {
    const plan = planSync(
      [emp({ emp_id: '1010050', first_name: 'สมชาย', last_name: 'ใจดี', m365_email: 'somchai@globe.co.th' }),
       emp({ emp_id: '1010051', first_name: 'วิภา', last_name: 'สุข', m365_email: 'wipa@globe.co.th' })],
      [prof({ employeeId: 'ACC01', firstName: 'สมชาย', lastName: 'ใจดี' }), prof({ uid: 'u2', employeeId: 'ACC02', firstName: 'Wipa', lastName: 'S', email: 'WIPA@globe.co.th' })],
      COMPANIES, TODAY,
    )
    expect(plan.notHere).toEqual([])
    expect(plan.clashes).toEqual([
      { employeeId: '1010050', name: 'สมชาย ใจดี', existingEmployeeId: 'ACC01' },
      { employeeId: '1010051', name: 'วิภา สุข', existingEmployeeId: 'ACC02' },
    ])
  })
})

describe('planSync — edits made here', () => {
  const seen = { firstName: 'อ้อมฤทัย', lastName: 'ใจดี', position: 'ผู้จัดการ', department: 'บัญชี', companyId: 'globe', email: 'om@globe.co.th' }
  const fields = ['firstName', 'lastName', 'position', 'department', 'companyId', 'email'] as const
  const synced = (o: Partial<LocalProfile> = {}) => prof({ ...seen, centralStatus: 'active', centralFields: [...fields], centralValues: { ...seen }, ...o })

  it('keeps a value typed here while the master still has the same one', () => {
    const plan = planSync([emp({})], [synced({ position: 'ผู้จัดการฝ่ายบัญชีอาวุโส' })], COMPANIES, TODAY, fields, true)
    expect(plan.patches).toEqual([])
    expect(plan.unchanged).toBe(1)
  })

  it('copies a field again once the master changes it, and only that field', () => {
    const plan = planSync([emp({ department: 'การเงิน' })], [synced({ position: 'ตำแหน่งที่แก้เอง' })], COMPANIES, TODAY, fields, true)
    const p = plan.patches[0]
    expect(p.changed).toEqual(['department'])
    expect(p.set.department).toBe('การเงิน')
    expect(p.set.position).toBeUndefined() // the edit here stays
    expect(p.set.centralValues).toMatchObject({ department: 'การเงิน', position: 'ผู้จัดการ' })
  })

  it('copies everything for someone never synced', () => {
    const plan = planSync([emp({})], [prof({ position: 'อะไรก็ได้' })], COMPANIES, TODAY, fields, true)
    expect(plan.patches[0].set.position).toBe('ผู้จัดการ')
    expect(plan.patches[0].set.centralValues).toEqual(seen)
  })

  it('without the centralValues column, copies the master every time as before', () => {
    const plan = planSync([emp({})], [synced({ position: 'แก้เอง' })], COMPANIES, TODAY, fields, false)
    expect(plan.patches[0].set.position).toBe('ผู้จัดการ')
    expect(plan.patches[0].set.centralValues).toBeUndefined()
  })

  it('remembers the master values for a new account', () => {
    const plan = planSync([emp({ emp_id: '1010300' })], [], COMPANIES, TODAY, fields, true)
    expect(plan.notHere[0].set.centralValues).toEqual(seen)
  })
})

describe('loginEmail', () => {
  it('is the login the app itself uses for an employee ID', () => {
    for (const id of ['1010001', 'ACC001', 'Acc@GB', ' gs-01 ']) expect(loginEmail(id)).toBe(employeeIdToEmail(id))
  })
})
