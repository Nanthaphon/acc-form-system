import { useState } from 'react'
import { PenLine, X } from 'lucide-react'
import type { Submission, FormSettings, DocSignature } from '../types/schema'
import { DEFAULT_SIGNATURE_BLOCKS } from '../types/schema'
import { assignSigners, signDocument } from '../data/submissions'
import type { Signer } from '../data/submissions'
import SignerSelect from './SignerSelect'

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

// Pick signers for a document's online signature blocks, then send for signing.
// The first block is the requester (self); it auto-signs if they have a saved signature.
export default function AssignSignersModal({ submission, settings, signers, currentUid, currentName, currentSignature, onClose, onDone }: Props) {
  const allBlocks = settings.signatureBlocks?.length ? settings.signatureBlocks : DEFAULT_SIGNATURE_BLOCKS
  const requesterBlockId = allBlocks[0]?.id
  const isSelf = (id: string) => id === requesterBlockId
  const onlineBlocks = allBlocks.filter(b => b.online)
  const sigs = submission.signatures ?? []
  const sigFor = (id: string) => sigs.find(x => x.blockId === id)
  const [assign, setAssign] = useState<Record<string, string>>(Object.fromEntries(sigs.map(x => [x.blockId, x.assignedUid])))
  const [busy, setBusy] = useState(false)
  const signerName = (uid: string) => signers.find(s => s.uid === uid)?.name ?? ''

  async function send() {
    const pending = onlineBlocks.filter(b => sigFor(b.id)?.status !== 'signed')
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
      alert('ส่งให้เซ็นแล้ว — ผู้ถูกเลือกจะเห็นในเมนู "รอฉันเซ็น"')
      onDone(); onClose()
    } catch (e: any) {
      alert('ส่งให้เซ็นไม่สำเร็จ: ' + (e?.message || 'เกิดข้อผิดพลาด'))
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/40 p-4 sm:p-8" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6" onClick={e => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">ส่งให้เซ็น — {submission.docNumber}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        {onlineBlocks.length === 0 ? (
          <div className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">ฟอร์มนี้ไม่มีช่องเซ็นออนไลน์</div>
        ) : (
          <>
            <p className="mb-3 text-xs text-gray-500">เลือกคนที่จะให้เซ็นแต่ละช่อง (ช่องผู้เบิก = ตัวคุณเอง) · ช่องที่ไม่เลือกจะเว้นว่างไว้เซ็นบนกระดาษ</p>
            <div className="space-y-2">
              {onlineBlocks.map(b => {
                const sig = sigFor(b.id)
                return (
                  <div key={b.id} className="flex flex-wrap items-center gap-2">
                    <span className="w-32 shrink-0 text-sm text-gray-700">{b.label}</span>
                    {sig?.status === 'signed' ? (
                      <span className="text-sm font-medium text-green-700">✔ เซ็นแล้วโดย {sig.assignedName}</span>
                    ) : isSelf(b.id) ? (
                      <span className="text-sm text-gray-700">ตัวเอง (คุณ){sig?.status === 'pending' ? ' · รอเซ็น' : ''}</span>
                    ) : (
                      <>
                        <SignerSelect
                          className="w-56 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          value={assign[b.id] ?? ''}
                          onChange={uid => setAssign({ ...assign, [b.id]: uid })}
                          signers={signers}
                        />
                        {sig?.status === 'pending' && <span className="text-xs font-medium text-amber-600">รอเซ็น</span>}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:border-gray-300">ยกเลิก</button>
              <button onClick={send} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                <PenLine size={16} /> ส่งให้เซ็น
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
