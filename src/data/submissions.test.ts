import { describe, expect, it } from 'vitest'
import type { Submission, DocSignature } from '../types/schema'
import { canRequestSignatures, DEFAULT_SIGNATURE_BLOCKS } from '../types/schema'
import { subStatus, statusLabel, statusMeta, isUnsigned, assignmentsForSelfSign, canRemoveSignature } from './submissions'

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

describe('assignmentsForSelfSign', () => {
  const me = { uid: 'uid-1', name: 'ผู้ดูแล ระบบ' }
  const block = { id: 'requester', label: 'ผู้จัดทำเอกสาร' }
  const other = (blockId: string, status: 'pending' | 'signed'): DocSignature =>
    ({ blockId, blockLabel: blockId, assignedUid: 'uid-9', assignedName: 'คนอื่น', status })

  it('assigns the block to me, pending, so sign_document can stamp it', () => {
    expect(assignmentsForSelfSign([], block, me)).toEqual([
      { blockId: 'requester', blockLabel: 'ผู้จัดทำเอกสาร', assignedUid: 'uid-1', assignedName: 'ผู้ดูแล ระบบ', status: 'pending' },
    ])
    expect(assignmentsForSelfSign(undefined, block, me)).toHaveLength(1)
  })

  it('carries other people\u2019s pending assignments along — assign_signers replaces the whole pending set', () => {
    const out = assignmentsForSelfSign([other('checker', 'pending')], block, me)
    expect(out.map(x => x.blockId)).toEqual(['checker', 'requester'])
    expect(out.find(x => x.blockId === 'checker')?.assignedUid).toBe('uid-9')
  })

  it('does not resend blocks that are already signed (the database keeps those)', () => {
    const out = assignmentsForSelfSign([other('checker', 'signed')], block, me)
    expect(out.map(x => x.blockId)).toEqual(['requester'])
  })

  it('takes over the block when it was pending on me, without duplicating it', () => {
    const mineAlready: DocSignature =
      { blockId: 'requester', blockLabel: 'ผู้จัดทำเอกสาร', assignedUid: 'uid-1', assignedName: 'ผู้ดูแล ระบบ', status: 'pending' }
    const out = assignmentsForSelfSign([mineAlready], block, me)
    expect(out).toHaveLength(1)
    expect(out[0].assignedUid).toBe('uid-1')
  })

  it('never lets the same block appear twice', () => {
    const out = assignmentsForSelfSign(
      [other('requester', 'pending'), other('checker', 'pending')], block, me)
    const ids = out.map(x => x.blockId)
    expect(new Set(ids).size).toBe(ids.length)
    expect(out.find(x => x.blockId === 'requester')?.assignedUid).toBe('uid-1')
  })
})

describe('canRemoveSignature', () => {
  const ME = 'uid-1', OWNER = 'uid-1', OTHER = 'uid-9'
  const s = (status: 'pending' | 'signed', assignedUid: string): DocSignature =>
    ({ blockId: 'b', blockLabel: 'b', assignedUid, assignedName: 'x', status })

  it('lets me take back a signature I put on', () => {
    expect(canRemoveSignature(s('signed', ME), ME, OTHER)).toBe(true)
  })
  it('lets the document owner clear a signature someone else left', () => {
    expect(canRemoveSignature(s('signed', OTHER), OWNER, OWNER)).toBe(true)
  })
  it('refuses when the line was never signed — there is nothing to take back', () => {
    expect(canRemoveSignature(s('pending', ME), ME, ME)).toBe(false)
  })
  it('refuses someone else\u2019s signature on a document that is not mine', () => {
    expect(canRemoveSignature(s('signed', OTHER), 'uid-2', OWNER)).toBe(false)
  })
})
