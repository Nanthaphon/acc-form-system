import { uiAlert } from './dialog/dialogService'
import { notifyPendingSignChanged } from '../shared/pendingSignBus'
import { useState } from 'react'
import { PenLine, X } from 'lucide-react'
import type { Submission, FormSettings, DocSignature } from '../types/schema'
import { formSignatureBlocks } from '../types/schema'
import { assignSigners, signDocument } from '../data/submissions'
import type { Signer } from '../data/submissions'
import SignerSelect from './SignerSelect'
import { Badge, ui } from './ui'

interface Props {
  submission: Submission
  settings: FormSettings          // for signatureBlocks
  signers: Signer[]
  currentUid: string
  currentName: string
  currentSignature?: string | null
  onClose: () => void
  onDone: () => void              // reload the list after sending
}

// Pick who signs each of the form's signature blocks, then send for signing.
// The first block is the requester (self) — it auto-signs if they have a saved
// signature. Any block left without a signer stays blank for a wet signature.
export default function AssignSignersModal({ submission, settings, signers, currentUid, currentName, currentSignature, onClose, onDone }: Props) {
  const allBlocks = formSignatureBlocks(settings)
  const requesterBlockId = allBlocks[0]?.id
  const isSelf = (id: string) => id === requesterBlockId
  const sigs = submission.signatures ?? []
  const sigFor = (id: string) => sigs.find(x => x.blockId === id)
  const [assign, setAssign] = useState<Record<string, string>>(Object.fromEntries(sigs.map(x => [x.blockId, x.assignedUid])))
  const [busy, setBusy] = useState(false)
  const signerName = (uid: string) => signers.find(s => s.uid === uid)?.name ?? ''

  async function send() {
    const pending = allBlocks.filter(b => sigFor(b.id)?.status !== 'signed')
    // Not required to fill every block — unselected blocks are left blank for a
    // wet signature (print & sign on paper). Only assign blocks that have a signer.
    const assignments: DocSignature[] = pending
      .filter(b => isSelf(b.id) || assign[b.id])
      .map(b => {
        const uid = isSelf(b.id) ? currentUid : assign[b.id]
        return { blockId: b.id, blockLabel: b.label, assignedUid: uid, assignedName: isSelf(b.id) ? currentName : signerName(uid), status: 'pending' as const }
      })
    setBusy(true)
    try {
      await assignSigners(submission.id, assignments)
      if (currentSignature) {
        for (const b of pending.filter(b => isSelf(b.id))) { try { await signDocument(submission.id, b.id) } catch { /* leave pending */ } }
      }
      uiAlert('ส่งให้เซ็นแล้ว — ผู้ถูกเลือกจะเห็นในเมนู "รอฉันเซ็น"', { tone: 'success' })
      notifyPendingSignChanged()
      onDone(); onClose()
    } catch (e: any) {
      uiAlert('ส่งให้เซ็นไม่สำเร็จ: ' + (e?.message || 'เกิดข้อผิดพลาด'))
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/40 p-4 sm:p-8" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><PenLine size={18} /></div>
          <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-gray-900">ส่งให้เซ็น — {submission.docNumber}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><X size={18} /></button>
        </div>
        {allBlocks.length <= 1 ? (
          <div className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">ฟอร์มนี้ไม่มีช่องให้ผู้อื่นเซ็น</div>
        ) : (
          <>
            <p className={`${ui.hint} mb-4`}>เลือกคนที่จะให้เซ็นแต่ละช่อง (ช่องผู้เบิก = ตัวคุณเอง) · ช่องที่ไม่เลือกจะเว้นว่างไว้เซ็นบนกระดาษ</p>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
              {allBlocks.map(b => {
                const sig = sigFor(b.id)
                return (
                  <div key={b.id} className="flex min-h-[52px] flex-wrap items-center gap-2 px-3 py-2">
                    <span className="w-32 shrink-0 text-sm font-medium text-gray-700">{b.label}</span>
                    {sig?.status === 'signed' ? (
                      <Badge tone="green">✔ เซ็นแล้วโดย {sig.assignedName}</Badge>
                    ) : isSelf(b.id) ? (
                      <span className="text-sm text-gray-700">ตัวเอง (คุณ){sig?.status === 'pending' ? ' · รอเซ็น' : ''}</span>
                    ) : (
                      <>
                        <SignerSelect
                          className={`${ui.inputSm} w-56`}
                          value={assign[b.id] ?? ''}
                          onChange={uid => setAssign({ ...assign, [b.id]: uid })}
                          signers={signers}
                        />
                        {sig?.status === 'pending' && <Badge tone="amber">รอเซ็น</Badge>}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={onClose} className={ui.btnSecondary}>ยกเลิก</button>
              <button onClick={send} disabled={busy} className={ui.btnPrimary}>
                <PenLine size={16} /> ส่งให้เซ็น
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
