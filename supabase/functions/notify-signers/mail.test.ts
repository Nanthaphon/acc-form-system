import { describe, expect, it } from 'vitest'
import { allSigned, buildMail, buildSignedMail, docAmount, graphMessage, justSigned, linesToNotify, SIGNED_FRESH_MS } from './mail'
import type { DocForMail, SignatureLine } from './mail'

const line = (blockId: string, uid: string, status: SignatureLine['status'] = 'pending'): SignatureLine =>
  ({ blockId, blockLabel: blockId, assignedUid: uid, assignedName: uid, status })

describe('linesToNotify', () => {
  const doc: DocForMail = {
    createdBy: 'me', docNumber: 'GAC-1',
    signatures: [line('requester', 'me'), line('head', 'boss'), line('approver', 'boss'), line('checker', 'acc', 'signed'), line('receiver', 'other')],
  }

  it('mails each person asked once, never the requester or someone already signed', () => {
    expect(linesToNotify(doc, ['me', 'boss', 'acc']).map(l => [l.blockId, l.assignedUid])).toEqual([['head', 'boss']])
  })

  it('ignores a uid that is not waiting on the document', () => {
    expect(linesToNotify(doc, ['stranger'])).toEqual([])
    expect(linesToNotify({ ...doc, signatures: null }, ['boss'])).toEqual([])
  })
})

describe('docAmount', () => {
  it('prefers the net total, as the printed form shows it', () => {
    expect(docAmount({ createdBy: '', docNumber: '', totals: { grandTotal: 100, netTotal: 97 } })).toBe(97)
    expect(docAmount({ createdBy: '', docNumber: '', totals: { grandTotal: 100 } })).toBe(100)
    expect(docAmount({ createdBy: '', docNumber: '', totals: null })).toBeNull()
  })
})

describe('buildMail', () => {
  const base = {
    recipientName: 'ไกรธัช', requesterName: 'นันทพล นายาต', docNumber: 'GAC-0011', formName: 'ใบเบิกค่าใช้จ่าย',
    blockLabel: 'ผู้อนุมัติ', amount: 1234.5, appUrl: 'https://acc-form-system.vercel.app/', submissionId: 'df31cf43',
  }

  it('names the document and links to the signing inbox', () => {
    const { subject, html } = buildMail(base)
    expect(subject).toBe('เอกสารรอเซ็น GAC-0011 จาก นันทพล นายาต')
    expect(html).toContain('href="https://acc-form-system.vercel.app/submission/df31cf43/preview"')
    expect(html).toContain('1,234.50 บาท')
    expect(html).toContain('ผู้อนุมัติ')
  })

  it('escapes what people typed', () => {
    const { html } = buildMail({ ...base, requesterName: '<script>x</script>', amount: null })
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('จำนวนเงิน')
  })
})

it('graphMessage is the sendMail body', () => {
  expect(graphMessage('a@b.co', 's', '<p>h</p>')).toEqual({
    message: { subject: 's', body: { contentType: 'HTML', content: '<p>h</p>' }, toRecipients: [{ emailAddress: { address: 'a@b.co' } }] },
    saveToSentItems: false,
  })
})

describe('justSigned — the signature that is worth a notice to the requester', () => {
  const NOW = 1_000_000_000_000
  const sig = (o: Partial<SignatureLine> = {}): SignatureLine =>
    ({ blockId: 'approver', blockLabel: 'ผู้อนุมัติ', assignedUid: 'boss', assignedName: 'ไกรธัช', status: 'signed', signedAt: NOW - 5_000, ...o })
  const doc = (signatures: SignatureLine[]): DocForMail => ({ createdBy: 'me', docNumber: 'GAC-1', signatures })

  it('is the line the caller signed a moment ago', () => {
    expect(justSigned(doc([sig()]), 'approver', 'boss', NOW)?.blockId).toBe('approver')
  })

  it('is nothing for the requester signing their own line', () => {
    expect(justSigned(doc([sig({ assignedUid: 'me' })]), 'approver', 'me', NOW)).toBeNull()
  })

  it('is nothing for a line that is not the caller’s, not signed, or not there', () => {
    expect(justSigned(doc([sig()]), 'approver', 'someone-else', NOW)).toBeNull()
    expect(justSigned(doc([sig({ status: 'pending', signedAt: undefined })]), 'approver', 'boss', NOW)).toBeNull()
    expect(justSigned(doc([sig()]), 'nope', 'boss', NOW)).toBeNull()
  })

  it('is nothing once the signature is old, so a call cannot be repeated to mail again', () => {
    expect(justSigned(doc([sig({ signedAt: NOW - SIGNED_FRESH_MS - 1 })]), 'approver', 'boss', NOW)).toBeNull()
    expect(justSigned(doc([sig({ signedAt: undefined })]), 'approver', 'boss', NOW)).toBeNull()
  })
})

describe('allSigned', () => {
  const line = (status: 'pending' | 'signed'): SignatureLine => ({ blockId: status, blockLabel: '', assignedUid: 'u', assignedName: 'u', status })
  it('is true only when every line is signed', () => {
    expect(allSigned({ createdBy: 'me', docNumber: 'x', signatures: [line('signed'), line('signed')] })).toBe(true)
    expect(allSigned({ createdBy: 'me', docNumber: 'x', signatures: [line('signed'), line('pending')] })).toBe(false)
    expect(allSigned({ createdBy: 'me', docNumber: 'x', signatures: [] })).toBe(false)
  })
})

describe('buildSignedMail', () => {
  const base = {
    recipientName: 'นันทพล', signerName: 'ไกรธัช', docNumber: 'GAC-0011', formName: 'ใบอนุมัติค่าใช้จ่าย',
    blockLabel: 'ผู้อนุมัติ', amount: 1234.5, complete: false, appUrl: 'https://acc-form-system.vercel.app/', submissionId: 'df31cf43',
  }

  it('tells the requester who signed which line', () => {
    const { subject, html } = buildSignedMail(base)
    expect(subject).toBe('ไกรธัช เซ็นเอกสาร GAC-0011 แล้ว')
    expect(html).toContain('ไกรธัช')
    expect(html).toContain('ผู้อนุมัติ')
    expect(html).toContain('1,234.50 บาท')
    expect(html).toContain('href="https://acc-form-system.vercel.app/submission/df31cf43/preview"')
    expect(html).toContain('รอลายเซ็นช่องอื่น')
  })

  it('says the document is approved in full when it was the last signature', () => {
    const { subject, html } = buildSignedMail({ ...base, complete: true })
    expect(subject).toBe('เอกสาร GAC-0011 เซ็นครบแล้ว')
    expect(html).toContain('เซ็นครบ')
  })

  it('escapes what people typed', () => {
    expect(buildSignedMail({ ...base, signerName: '<b>x</b>' }).html).not.toContain('<b>x</b>')
  })
})

describe('signedLine — the one-off resend', () => {
  const line = (o: Partial<SignatureLine> = {}): SignatureLine =>
    ({ blockId: 'approver', blockLabel: 'ผู้อนุมัติ', assignedUid: 'boss', assignedName: 'ไกรธัช', status: 'signed', signedAt: 1, ...o })
  it('finds a signed line however old, and never the requester’s own', async () => {
    const { signedLine } = await import('./mail')
    expect(signedLine({ createdBy: 'me', docNumber: 'x', signatures: [line()] }, 'approver')?.assignedUid).toBe('boss')
    expect(signedLine({ createdBy: 'me', docNumber: 'x', signatures: [line({ status: 'pending' })] }, 'approver')).toBeNull()
    expect(signedLine({ createdBy: 'boss', docNumber: 'x', signatures: [line()] }, 'approver')).toBeNull()
  })
})
