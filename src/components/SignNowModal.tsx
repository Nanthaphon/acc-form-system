import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Clock3, Eraser, PenLine, Signature, X } from 'lucide-react'
import type { SubmissionSummary, FormSettings } from '../types/schema'
import { formSignatureBlocks } from '../types/schema'
import { signBlockAsSelf, unsignDocument, canRemoveSignature } from '../data/submissions'
import type { Signer } from '../data/submissions'
import { uiAlert, uiConfirm } from './dialog/dialogService'
import { dbErrorMessage } from '../shared/dbError'
import { formatDateTime } from '../shared/date'
import { ui } from './ui'
import { Spinner } from './Spinner'

interface Props {
  submission: SubmissionSummary
  settings: FormSettings          // for signatureBlocks
  me: Signer
  mySignature?: string | null
  onClose: () => void
  onDone: () => void              // reload the list after signing
}

// The compact button at the end of a signature line.
const btnRow = 'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60'

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
      onDone(); onClose()
    } catch (e) {
      uiAlert(dbErrorMessage(e), { title: 'ลบลายเซ็นไม่สำเร็จ' })
    } finally { setBusyId(null) }
  }

  return (
    // Centred on the screen; a screen too short for it scrolls instead.
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40">
      <div className="flex min-h-full items-center justify-center p-4 sm:p-8" onClick={onClose}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`เซ็นเอกสาร ${submission.docNumber}`}
          className="w-full max-w-xl rounded-lg border border-stone-200 bg-white shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 border-b border-stone-100 px-6 py-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-clay-50 text-clay-600"><Signature size={20} /></div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-stone-900">เซ็นเอกสาร</h2>
              <div className="truncate text-xs text-stone-500">
                <span className="font-mono">{submission.docNumber}</span>
                {(settings.name || settings.title) && <> · {settings.name || settings.title}</>}
              </div>
            </div>
            <button onClick={onClose} aria-label="ปิด" className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-700"><X size={18} /></button>
          </div>

          <div className="space-y-4 px-6 py-5">
            {!mySignature ? (
              <div className="rounded-lg bg-ochre-50 px-4 py-3 text-sm text-ochre-700">
                คุณยังไม่ได้อัปโหลดลายเซ็น — <Link to="/profile" className="font-medium underline">ไปอัปโหลดที่หน้าข้อมูลของฉัน</Link> ก่อนจึงจะเซ็นได้
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4 rounded-lg border border-stone-200 bg-stone-50/60 px-4 py-3">
                  <div className="flex h-12 w-28 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-white">
                    <img src={mySignature} alt="ลายเซ็นของคุณ" className="max-h-10 max-w-[100px] object-contain" />
                  </div>
                  <div className="min-w-0 text-xs text-stone-500">
                    <div className="text-sm font-medium text-stone-800">ลายเซ็นของคุณ</div>
                    กด “เซ็นตรงนี้” เพื่อแปะลงช่องนั้นทันที · ช่องที่ไม่เซ็นเว้นไว้เซ็นบนกระดาษ
                  </div>
                </div>

                <ul className="divide-y divide-stone-100 rounded-lg border border-stone-200">
                  {blocks.map(b => {
                    const sig = sigFor(b.id)
                    const signed = sig?.status === 'signed'
                    // Someone else was already asked to sign this line — leave it to them.
                    const waiting = sig?.status === 'pending' && sig.assignedUid !== me.uid
                    return (
                      <li key={b.id} className="flex min-h-[64px] items-center gap-3 px-4 py-3">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          signed ? 'bg-olive-50 text-olive-700' : waiting ? 'bg-ochre-50 text-ochre-700' : 'bg-stone-100 text-stone-500'}`}>
                          {signed ? <CheckCircle2 size={16} /> : waiting ? <Clock3 size={16} /> : <PenLine size={16} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-stone-800">{b.label}</div>
                          <div className="text-xs text-stone-500">
                            {signed ? <>เซ็นแล้วโดย {sig.assignedName}{sig.signedAt ? <span className="block whitespace-nowrap sm:inline"><span className="hidden sm:inline"> · </span>{formatDateTime(sig.signedAt)}</span> : null}</>
                              : waiting ? <>รอ {sig.assignedName} เซ็น</>
                              : 'ยังไม่มีลายเซ็น'}
                          </div>
                        </div>
                        {signed ? (
                          canRemoveSignature(sig, me.uid, ownerUid) && (
                            <button
                              onClick={() => unsign(b.id, b.label, sig.assignedName)}
                              disabled={busyId !== null}
                              className={`${btnRow} border-stone-200 bg-white text-brick-600 hover:border-rose-200 hover:bg-rose-50`}
                            >
                              {busyId === b.id ? <><Spinner size={15} /> กำลังลบ...</> : <><Eraser size={15} /> ลบลายเซ็น</>}
                            </button>
                          )
                        ) : waiting ? null : (
                          <button
                            onClick={() => sign(b.id, b.label)}
                            disabled={busyId !== null}
                            className={`${btnRow} border-clay-600 bg-clay-600 text-white hover:border-clay-700 hover:bg-clay-700`}
                          >
                            {busyId === b.id ? <><Spinner size={15} /> กำลังเซ็น...</> : <><Signature size={15} /> เซ็นตรงนี้</>}
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </div>

          <div className="flex justify-end rounded-b-lg border-t border-stone-100 bg-stone-50/60 px-6 py-4">
            <button onClick={onClose} className={ui.btnSecondary}>ปิด</button>
          </div>
        </div>
      </div>
    </div>
  )
}
