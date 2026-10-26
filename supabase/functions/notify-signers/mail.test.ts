import { describe, expect, it } from 'vitest'
import { buildMail, docAmount, graphMessage, linesToNotify } from './mail'
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
    blockLabel: 'ผู้อนุมัติ', amount: 1234.5, appUrl: 'https://acc-form-system.vercel.app/',
  }

  it('names the document and links to the signing inbox', () => {
    const { subject, html } = buildMail(base)
    expect(subject).toBe('เอกสารรอเซ็น GAC-0011 จาก นันทพล นายาต')
    expect(html).toContain('href="https://acc-form-system.vercel.app/sign"')
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
