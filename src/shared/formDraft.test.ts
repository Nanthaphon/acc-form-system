import { beforeEach, describe, expect, it } from 'vitest'
import { clearFormDraft, draftStillCurrent, formDraftKey, readFormDraft, writeFormDraft } from './formDraft'
import type { ExpenseHeader } from '../types/schema'

const header: ExpenseHeader = { subject: '', categories: [], companyId: 'globe', firstName: 'ก', lastName: 'ข', position: '', job: '' }

beforeEach(() => localStorage.clear())

describe('formDraftKey', () => {
  it('is one per person per document: a saved one, a copy, or a new one of a form', () => {
    expect(formDraftKey('u1', { id: 's1', formType: 'f' })).toBe('formDraft:v1:u1:doc:s1')
    expect(formDraftKey('u1', { cloneId: 's9', formType: 'f' })).toBe('formDraft:v1:u1:clone:s9')
    expect(formDraftKey('u1', { formType: 'f' })).toBe('formDraft:v1:u1:new:f')
    expect(formDraftKey('u2', { formType: 'f' })).not.toBe(formDraftKey('u1', { formType: 'f' }))
  })

  it('is nothing before anyone is signed in', () => {
    expect(formDraftKey('', { formType: 'f' })).toBeNull()
  })
})

describe('reading and writing', () => {
  it('keeps what was typed, with when', () => {
    writeFormDraft('k', header, [{ detail: 'ค่าเดินทาง', amount: 500 }], 1234)
    expect(readFormDraft('k')).toEqual({ header, items: [{ detail: 'ค่าเดินทาง', amount: 500 }], savedAt: 1234 })
    clearFormDraft('k')
    expect(readFormDraft('k')).toBeNull()
  })

  it('ignores something in storage that is not a draft', () => {
    localStorage.setItem('k', '{"oops":1}')
    expect(readFormDraft('k')).toBeNull()
    localStorage.setItem('k', 'not json')
    expect(readFormDraft('k')).toBeNull()
  })
})

describe('draftStillCurrent', () => {
  it('is current only if written after the document was last saved', () => {
    const d = { header, items: [], savedAt: 2000 }
    expect(draftStillCurrent(d, 1000)).toBe(true)
    expect(draftStillCurrent(d, 3000)).toBe(false)
    expect(draftStillCurrent(d)).toBe(true)   // never saved
  })
})
