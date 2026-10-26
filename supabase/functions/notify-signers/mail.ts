// The parts of notify-signers that are plain logic — who gets a notice and
// what it says — kept free of Deno and network calls so the app's own test
// run (vitest) covers them. index.ts does the fetching and sending.

export interface SignatureLine {
  blockId: string
  blockLabel: string
  assignedUid: string
  assignedName: string
  status: 'pending' | 'signed'
}

export interface DocForMail {
  createdBy: string
  docNumber: string
  signatures?: SignatureLine[] | null
  totals?: { grandTotal?: number; netTotal?: number } | null
}

/**
 * The lines to tell someone about: still waiting, for one of the people the
 * requester has just sent it to, and not the requester's own line — they are
 * the one pressing the button. One notice per person, however many lines of
 * the document are theirs.
 */
export function linesToNotify(doc: DocForMail, uids: string[]): SignatureLine[] {
  const asked = new Set(uids)
  const seen = new Set<string>()
  return (doc.signatures ?? []).filter(s => {
    if (s.status !== 'pending' || !asked.has(s.assignedUid) || s.assignedUid === doc.createdBy) return false
    if (seen.has(s.assignedUid)) return false
    seen.add(s.assignedUid)
    return true
  })
}

const escapeHtml = (v: string) =>
  v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export const formatBaht = (n: number) =>
  n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** What the document comes to, as the printed form shows it: net when there is one. */
export function docAmount(doc: DocForMail): number | null {
  const t = doc.totals
  const n = t?.netTotal ?? t?.grandTotal
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}

export interface MailInput {
  recipientName: string
  requesterName: string
  docNumber: string
  formName: string
  blockLabel: string
  amount: number | null
  /** The app's address, e.g. https://acc-form-system.vercel.app */
  appUrl: string
}

export function buildMail(m: MailInput): { subject: string; html: string } {
  const link = `${m.appUrl.replace(/\/+$/, '')}/sign`
  const subject = `เอกสารรอเซ็น ${m.docNumber} จาก ${m.requesterName}`
  const row = (label: string, value: string) => `
        <tr>
          <td style="padding:6px 0;color:#64757D;width:120px;vertical-align:top">${label}</td>
          <td style="padding:6px 0;color:#162024;font-weight:600">${escapeHtml(value)}</td>
        </tr>`
  const html = `<!doctype html>
<html lang="th"><body style="margin:0;padding:24px;background:#F7F9FA;font-family:Tahoma,'Leelawadee UI',sans-serif;font-size:15px;line-height:1.6">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #E1E8EB;border-radius:8px">
    <tr><td style="padding:28px 32px">
      <p style="margin:0 0 16px;color:#162024">เรียน คุณ${escapeHtml(m.recipientName)}</p>
      <p style="margin:0 0 20px;color:#374449">มีเอกสารรอให้คุณเซ็นในช่อง <b>${escapeHtml(m.blockLabel)}</b></p>
      <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-top:1px solid #EFF3F5;border-bottom:1px solid #EFF3F5;margin-bottom:24px">${
        row('เลขที่เอกสาร', m.docNumber)}${
        m.formName ? row('แบบฟอร์ม', m.formName) : ''}${
        row('ผู้เบิก', m.requesterName)}${
        m.amount !== null ? row('จำนวนเงิน', `${formatBaht(m.amount)} บาท`) : ''}
      </table>
      <a href="${escapeHtml(link)}" style="display:inline-block;background:#2B6777;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px">เปิดเอกสารรอเซ็น</a>
      <p style="margin:24px 0 0;color:#64757D;font-size:13px">อีเมลนี้ส่งอัตโนมัติจากระบบ Acc Documents — ไม่ต้องตอบกลับ</p>
    </td></tr>
  </table>
</body></html>`
  return { subject, html }
}

/** The body of Microsoft Graph's POST /users/{sender}/sendMail. */
export function graphMessage(to: string, subject: string, html: string) {
  return {
    message: {
      subject,
      body: { contentType: 'HTML', content: html },
      toRecipients: [{ emailAddress: { address: to } }],
    },
    saveToSentItems: false,
  }
}
