import { uiAlert, uiConfirm, uiPrompt } from './dialog/dialogService'
import { unvoidSubmission, voidSubmission } from '../data/submissions'
import type { SubmissionSummary } from '../types/schema'

// Asks why, then cancels the document. True once it is cancelled.
export async function askAndVoid(r: Pick<SubmissionSummary, 'id' | 'docNumber'>): Promise<boolean> {
  const reason = await uiPrompt('เอกสารยังอยู่ในระบบ แต่จะขึ้นว่า "ยกเลิก" แก้ไขหรือส่งเซ็นต่อไม่ได้ · ใครที่ยังรอเซ็นจะไม่ต้องเซ็นแล้ว', {
    title: `ยกเลิกเอกสาร "${r.docNumber}" ?`,
    placeholder: 'เหตุผล เช่น กรอกยอดผิด',
    confirmText: 'ยกเลิกเอกสาร',
    cancelText: 'ไม่ยกเลิก',
    tone: 'danger',
  })
  if (reason === null) return false
  if (!reason.trim()) { uiAlert('กรุณาระบุเหตุผลที่ยกเลิก', { title: 'ยังไม่ได้ยกเลิก' }); return false }
  try {
    await voidSubmission(r.id, reason.trim())
    return true
  } catch (e) {
    uiAlert((e as Error).message, { title: 'ยกเลิกเอกสารไม่สำเร็จ' })
    return false
  }
}

// Admin: bring back a document cancelled by mistake. True once restored.
export async function askAndUnvoid(r: Pick<SubmissionSummary, 'id' | 'docNumber' | 'voided'>): Promise<boolean> {
  const replaced = r.voided?.replacedByNumber
  const msg = replaced
    ? `เอกสารนี้มีฉบับแก้ไข ${replaced} อยู่แล้ว — กู้คืนแล้วจะมีทั้ง 2 ฉบับที่ใช้งานได้`
    : 'เอกสารจะกลับมาใช้งานได้ตามเดิม — คนที่เคยรอเซ็นจะกลับมารอเซ็นอีกครั้ง'
  if (!(await uiConfirm(msg, { title: `กู้คืนเอกสาร "${r.docNumber}" ?`, confirmText: 'กู้คืน' }))) return false
  try {
    await unvoidSubmission(r.id)
    return true
  } catch (e) {
    uiAlert((e as Error).message, { title: 'กู้คืนไม่สำเร็จ' })
    return false
  }
}
