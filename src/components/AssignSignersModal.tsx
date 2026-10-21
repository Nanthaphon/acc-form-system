import { uiAlert } from './dialog/dialogService'
import { useState } from 'react'
import { CheckCircle2, Clock3, PenLine, Send, Signature, X } from 'lucide-react'
import type { SubmissionSummary, FormSettings, DocSignature } from '../types/schema'
import { formSignatureBlocks } from '../types/schema'
import { assignSigners, signDocument, unsignDocument } from '../data/submissions'
import type { Signer } from '../data/submissions'
import { dbErrorMessage } from '../shared/dbError'
import { formatDateTime } from '../shared/date'
import SignerSelect from './SignerSelect'
import OwnSignatureToggle from './OwnSignatureToggle'
import { Spinner } from './Spinner'
import { ui } from './ui'

interface Props {
  submission: SubmissionSummary
  settings: FormSettings          // for signatureBlocks
  signers: Signer[]
  currentUid: string
  currentName: string
  currentSignature?: string | null
  onClose: () => void
  onDone: () => void              // reload the list after sending
}

function Step({ n, title, hint }: { n: number; title: string; hint: string }) {
  return (
    <div className="mb-3 flex items-start gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-clay-600 text-xs font-semibold text-white">{n}</span>
      <div>
        <div className="text-sm font-semibold text-stone-900">{title}</div>
        <div className="text-xs text-stone-500">{hint}</div>
      </div>
    </div>
  )
}

// One place for everything about a document's signatures: the requester signs
// their own line (or takes their signature back off), and picks who signs the
// other lines online — any line left without anyone is signed in pen on paper.
// Nothing happens until the one button at the bottom, which says what it will do.
export default function AssignSignersModal({ submission, settings, signers, currentUid, currentName, currentSignature, onClose, onDone }: Props) {
  const allBlocks = formSignatureBlocks(settings)
  const ownBlock = allBlocks[0]
  const others = allBlocks.slice(1)
  const sigs = submission.signatures ?? []
  const sigFor = (id: string) => sigs.find(x => x.blockId === id)
  const ownSig = ownBlock ? sigFor(ownBlock.id) : undefined
  const ownSigned = ownSig?.status === 'signed'

  // The requester's line starts as it is: signed stays signed; unsigned starts
  // ticked when there is a signature to put on it — that is what most people
  // open this for.
  const [signMine, setSignMine] = useState(ownSigned || !!currentSignature)
  // The other lines start with nobody — signed on paper unless someone is
  // picked — apart from those already waiting on someone.
  const [assign, setAssign] = useState<Record<string, string>>(() =>
    Object.fromEntries(sigs.filter(x => x.status === 'pending').map(x => [x.blockId, x.assignedUid])))
  const [busy, setBusy] = useState(false)
  const signerName = (uid: string) => signers.find(s => s.uid === uid)?.name ?? ''

  // What the button will do.
  const willSign = !!ownBlock && signMine && !ownSigned && !!currentSignature
  const willUnsign = !!ownBlock && !signMine && ownSigned
  const open = others.filter(b => sigFor(b.id)?.status !== 'signed')
  const newSends = open.filter(b => assign[b.id] && sigFor(b.id)?.assignedUid !== assign[b.id]).length
  const recalled = open.filter(b => sigFor(b.id)?.status === 'pending' && !assign[b.id]).length
  // A line waiting on the requester from before, now left unticked.
  const dropOwnPending = ownSig?.status === 'pending' && !signMine
  const changed = willSign || willUnsign || dropOwnPending || newSends > 0 || recalled > 0
  const action = willSign && newSends ? `เซ็นและส่งให้ ${newSends} คน`
    : willSign ? 'เซ็นเอกสาร'
    : newSends && !willUnsign && !recalled ? `ส่งให้ ${newSends} คนเซ็น`
    : willUnsign && !newSends && !recalled ? 'เอาลายเซ็นออก'
    : 'บันทึก'

  async function confirm() {
    if (!changed || busy) return
    setBusy(true)
    try {
      // Taking the signature off leaves the line waiting on the requester; the
      // assignment below, which no longer lists it, then clears it.
      if (willUnsign) await unsignDocument(submission.id, ownBlock.id)
      const assignments: DocSignature[] = [
        ...(willSign || (ownSig?.status === 'pending' && signMine)
          ? [{ blockId: ownBlock.id, blockLabel: ownBlock.label, assignedUid: currentUid, assignedName: currentName, status: 'pending' as const }]
          : []),
        ...open.filter(b => assign[b.id]).map(b => ({
          blockId: b.id, blockLabel: b.label, assignedUid: assign[b.id], assignedName: signerName(assign[b.id]), status: 'pending' as const,
        })),
      ]
      // Lines the form no longer lists are not in `allBlocks`, and assign_signers
      // keeps only already-signed entries — resend their pending assignments or
      // the people waiting on them are dropped without a word.
      const listed = new Set(allBlocks.map(b => b.id))
      const strays = sigs.filter(x => x.status === 'pending' && !listed.has(x.blockId))
      await assignSigners(submission.id, [...assignments, ...strays])
      if (willSign) await signDocument(submission.id, ownBlock.id)
      uiAlert(
        newSends ? 'เรียบร้อย — คนที่เลือกจะเห็นเอกสารในเมนู "ฟอร์มเอกสารรอเซ็น"' : willSign ? 'เซ็นเอกสารแล้ว' : 'บันทึกแล้ว',
        { tone: 'success' },
      )
      onDone(); onClose()
    } catch (e) {
      uiAlert(dbErrorMessage(e), { title: 'ทำรายการไม่สำเร็จ' })
    } finally { setBusy(false) }
  }

  return (
    // Centred on the screen; a screen too short for it scrolls instead.
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40">
      <div className="flex min-h-full items-center justify-center p-4 sm:p-8" onClick={onClose}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`เซ็น / ส่งเซ็น ${submission.docNumber}`}
          className="w-full max-w-4xl rounded-lg border border-stone-200 bg-white shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center gap-4 border-b border-stone-100 px-10 py-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-clay-50 text-clay-600"><Signature size={24} /></div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-semibold text-stone-900">เซ็น / ส่งเซ็น</h2>
              <div className="truncate text-xs text-stone-500">
                <span className="font-mono">{submission.docNumber}</span>
                {(settings.name || settings.title) && <> · {settings.name || settings.title}</>}
              </div>
            </div>
            <button onClick={onClose} aria-label="ปิด" className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"><X size={18} /></button>
          </div>
  
          <div className="space-y-8 px-10 py-8">
            {ownBlock && (
              <section>
                <Step n={1} title="ลายเซ็นของคุณ" hint={`ช่อง “${ownBlock.label}” ของเอกสาร`} />
                <OwnSignatureToggle
                  signature={ownSigned ? (ownSig?.signatureImage ?? currentSignature) : currentSignature}
                  blockLabel={ownBlock.label}
                  on={signMine}
                  onChange={setSignMine}
                  fullWidth
                  texts={ownSigned ? {
                    on: 'เซ็นแล้ว',
                    onHint: <>ช่อง “{ownBlock.label}” · เซ็นเมื่อ {formatDateTime(ownSig?.signedAt)}</>,
                    off: 'จะเอาลายเซ็นออก',
                    offHint: <>ช่อง “{ownBlock.label}” จะกลับเป็นช่องว่างเมื่อกดบันทึก</>,
                  } : {
                    on: 'ลงลายเซ็นของฉัน',
                    onHint: <>ใส่ในช่อง “{ownBlock.label}” เมื่อกดปุ่มด้านล่าง</>,
                    off: 'ไม่ใส่ลายเซ็นของฉัน',
                    offHint: <>ช่อง “{ownBlock.label}” จะเว้นว่างไว้เซ็นบนกระดาษ</>,
                  }}
                />
              </section>
            )}
  
            {others.length > 0 && (
              <section>
                <Step n={ownBlock ? 2 : 1} title="ให้คนอื่นเซ็นออนไลน์" hint="เลือกคนเซ็นในแต่ละช่อง · ไม่เลือกใคร = เว้นไว้เซ็นด้วยปากกาบนกระดาษ" />
                <div className="divide-y divide-stone-100 rounded-xl border border-stone-200">
                  {others.map(b => {
                    const sig = sigFor(b.id)
                    const picked = assign[b.id] ?? ''
                    return (
                      <div key={b.id} className="flex min-h-[68px] flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                        <span className="w-36 shrink-0 text-sm font-medium text-stone-700">{b.label}</span>
                        {sig?.status === 'signed' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-olive-50 px-3 py-1 text-xs font-medium text-olive-700">
                            <CheckCircle2 size={14} /> เซ็นแล้วโดย {sig.assignedName} · {formatDateTime(sig.signedAt)}
                          </span>
                        ) : (
                          <>
                            <div className="min-w-0 flex-1">
                              <SignerSelect
                                className={`${ui.inputSm} w-full max-w-md`}
                                ariaLabel={`ผู้เซ็นช่อง ${b.label}`}
                                value={picked}
                                onChange={uid => setAssign({ ...assign, [b.id]: uid })}
                                signers={signers}
                                emptyLabel="— ไม่ส่งใคร (เซ็นบนกระดาษ) —"
                              />
                            </div>
                            {sig?.status === 'pending' && sig.assignedUid === picked ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-ochre-50 px-2.5 py-1 text-xs font-medium text-ochre-700"><Clock3 size={13} /> รอเซ็น</span>
                            ) : picked ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-clay-50 px-2.5 py-1 text-xs font-medium text-clay-700"><Send size={13} /> จะส่งให้เซ็น</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-500"><PenLine size={13} /> เซ็นบนกระดาษ</span>
                            )}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </div>
  
          <div className="flex items-center justify-end gap-2 rounded-b-lg border-t border-stone-100 bg-stone-50/60 px-10 py-5">
            {!changed && <span className="mr-auto text-xs text-stone-400">ยังไม่มีอะไรเปลี่ยน</span>}
            <button onClick={onClose} className={ui.btnSecondary}>ยกเลิก</button>
            <button onClick={confirm} disabled={!changed || busy} className={`${ui.btnPrimary} disabled:opacity-50`}>
              {busy ? <><Spinner size={16} /> กำลังทำรายการ...</> : <>{willSign ? <Signature size={16} /> : <Send size={16} />} {action}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
