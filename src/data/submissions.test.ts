import { describe, expect, it } from 'vitest'
import type { Submission, DocSignature } from '../types/schema'
import { canRequestSignatures, DEFAULT_SIGNATURE_BLOCKS } from '../types/schema'
import { subStatus, statusLabel, statusMeta, isUnsigned } from './submissions'

function sub(signatures?: DocSignature[]): Submission {
  return {
    id: 'sub-1', formType: 'expense-claim', docNumber: 'GAC-202609-0001',
    header: { subject: '', categories: [], companyId: 'globe', firstName: '', lastName: '', position: '', job: '' },
    items: [], totals: { columnTotals: {}, grandTotal: 0, amountInThaiText: '' },
    createdBy: 'uid-1', createdByEmployeeId: 'E001',
    createdAt: 0, updatedAt: 0, printCount: 0, lastPrintedAt: null, signatures,
  }
}
const sig = (status: 'pending' | 'signed'): DocSignature =>
  ({ blockId: 'head', blockLabel: 'หัวหน้าแผนก', assignedUid: 'uid-2', assignedName: 'หัวหน้า', status })

describe('subStatus', () => {
  it('is เสร็จสิ้น when nobody was asked to sign — sending is optional', () => {
    expect(subStatus(sub())).toBe('done')
    expect(subStatus(sub([]))).toBe('done')
    expect(statusMeta('done').label).toBe('เสร็จสิ้น')
  })

  it('reports progress while signatures are outstanding', () => {
    const s = sub([sig('signed'), sig('pending')])
    expect(subStatus(s)).toBe('pending')
    expect(statusLabel(s)).toBe('รอลายเซ็น (1/2)')
  })

  it('is เซ็นครบ once every assigned block is signed', () => {
    expect(subStatus(sub([sig('signed')]))).toBe('signed')
  })
})

describe('isUnsigned', () => {
  it('is true until anyone is assigned', () => {
    expect(isUnsigned(sub())).toBe(true)
    expect(isUnsigned(sub([]))).toBe(true)
    expect(isUnsigned(sub([sig('pending')]))).toBe(false)
    expect(isUnsigned(sub([sig('signed')]))).toBe(false)
  })
})

describe('canRequestSignatures', () => {
  it('needs a block besides the requester (the first block)', () => {
    expect(canRequestSignatures({ signatureBlocks: [{ id: 'requester', label: 'ผู้เบิก' }] })).toBe(false)
    expect(canRequestSignatures({ signatureBlocks: [{ id: 'requester', label: 'ผู้เบิก' }, { id: 'head', label: 'หัวหน้า' }] })).toBe(true)
  })

  it('uses the built-in blocks for a form that was never configured', () => {
    // form_settings.signatureBlocks defaults to [] in the DB.
    expect(canRequestSignatures({ signatureBlocks: [] })).toBe(DEFAULT_SIGNATURE_BLOCKS.length > 1)
    expect(canRequestSignatures(null)).toBe(true)
  })
})
