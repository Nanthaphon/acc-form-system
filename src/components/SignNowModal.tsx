import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eraser, PenLine, Signature, X } from 'lucide-react'
import type { SubmissionSummary, FormSettings } from '../types/schema'
import { formSignatureBlocks } from '../types/schema'
import { signBlockAsSelf, unsignDocument, canRemoveSignature } from '../data/submissions'
import type { Signer } from '../data/submissions'
import { uiAlert, uiConfirm } from './dialog/dialogService'
import { dbErrorMessage } from '../shared/dbError'
import { notifyPendingSignChanged } from '../shared/pendingSignBus'
import { Badge, ui } from './ui'
import { Spinner } from './Spinner'

interface Props {
  submission: SubmissionSummary
  settings: FormSettings          // for signatureBlocks
  me: Signer
  mySignature?: string | null
  onClose: () => void
  onDone: () => void              // reload the list after signing
}

// Admins sign their own document here: every signature line of the form is
// listed with a button that stamps their saved signature on the spot. No
// sending and no picking a signer — that flow (AssignSignersModal) is still how
// a document goes out to OTHER people.
export default function SignNowModal({ submission, settings, me, mySignature, onClose, onDone }: Props) {
  const blocks = formSignatureBlocks(settings)
  const sigs = submission.signatures ?? []
  const ownerUid = submission.createdBy
  const sigFor = (id: string) => sigs.find(x => x.blockId === id)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function sign(blockId: string, blockLabel: string) {
    if (busyId) return
    if (!(await uiConfirm('ลายเซ็นของคุณจะถูกแปะลงเอกสารทันที', {
      title: `เซ็นช่อง "${blockLabel}" ของเอกสาร ${submission.docNumber} ?`, confirmText: 'เซ็น',
    }))) return
    setBusyId(blockId)
    try {
      await signBlockAsSelf(submission, { id: blockId, label: blockLabel }, me)
      notifyPendingSignChanged()
      onDone(); onClose()
    } catch (e: any) {
      uiAlert('เซ็นไม่สำเร็จ: ' + (e?.message || 'เกิดข้อผิดพลาด'))
    } finally { setBusyId(null) }
  }

  // Signed the wrong line: take that one signature off again. Everyone else's
  // signatures stay — cancelling the whole document is a separate action.
  async function unsign(blockId: string, blockLabel: string, signedBy: string) {
    if (busyId) return
    const whose = signedBy && signedBy !== me.name ? `ลายเซ็นของ ${signedBy} ` : 'ลายเซ็นของคุณ '
    if (!(await uiConfirm(`${whose}จะถูกลบออกจากช่องนี้ · ช่องอื่นไม่กระทบ · เซ็นใหม่หรือส่งให้คนอื่นเซ็นได้`, {
      title: `ลบลายเซ็นช่อง "${blockLabel}" ?`, tone: 'danger', confirmText: 'ลบลายเซ็น',
    }))) return
    setBusyId(blockId)
    try {
      await unsignDocument(submission.id, blockId)
      notifyPendingSignChanged()
      onDone(); onClose()
    } catch (e) {
      uiAlert(dbErrorMessage(e), { title: 'ลบลายเซ็นไม่สำเร็จ' })
    } finally { setBusyId(null) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/40 p-4 sm:p-8" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><PenLine size={18} /></div>
          <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-gray-900">เซ็นเอกสาร — {submission.docNumber}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><X size={18} /></button>
        </div>

        {!mySignature ? (
          <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            คุณยังไม่ได้อัปโหลดลายเซ็น — <Link to="/profile" className="font-medium underline">ไปอัปโหลดที่หน้าข้อมูลของฉัน</Link> ก่อนจึงจะเซ็นได้
          </div>
        ) : (
          <>
            <p className={`${ui.hint} mb-4`}>เลือกช่องที่จะเซ็น · ลายเซ็นที่บันทึกไว้จะถูกแปะลงทันที ช่องที่ไม่เซ็นจะเว้นว่างไว้เซ็นบนกระดาษ</p>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
              {blocks.map(b => {
                const sig = sigFor(b.id)
                const mine = sig?.assignedUid === me.uid
                return (
                  <div key={b.id} className="flex min-h-[52px] flex-wrap items-center gap-2 px-3 py-2">
                    <span className="w-32 shrink-0 text-sm font-medium text-gray-700">{b.label}</span>
                    {sig?.status === 'signed' ? (
                      <>
                        <Badge tone="green">✔ เซ็นแล้วโดย {sig.assignedName}</Badge>
                        {canRemoveSignature(sig, me.uid, ownerUid) && (
                          <button
                            onClick={() => unsign(b.id, b.label, sig.assignedName)}
                            disabled={busyId !== null}
                            className={`${ui.btnSecondary} ml-auto text-red-600 ring-red-200 hover:bg-red-50 disabled:opacity-60`}
                          >
                            {busyId === b.id ? <><Spinner size={16} /> กำลังลบ...</> : <><Eraser size={16} /> ลบลายเซ็น</>}
                          </button>
                        )}
                      </>
                    ) : sig?.status === 'pending' && !mine ? (
                      // Someone else was already asked to sign this line — leave it to them.
                      <Badge tone="amber">รอ {sig.assignedName} เซ็น</Badge>
                    ) : (
                      <button
                        onClick={() => sign(b.id, b.label)}
                        disabled={busyId !== null}
                        className={`${ui.btnSecondary} ml-auto disabled:opacity-60`}
                      >
                        {busyId === b.id ? <><Spinner size={16} /> กำลังเซ็น...</> : <><Signature size={16} /> เซ็นตรงนี้</>}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className={ui.btnSecondary}>ปิด</button>
        </div>
      </div>
    </div>
  )
}
