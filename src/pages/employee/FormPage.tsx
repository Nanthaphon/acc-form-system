import { uiAlert, uiPrompt } from '../../components/dialog/dialogService'
import { dbErrorMessage } from '../../shared/dbError'
import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Ban, Check, Eye, FilePen, History, Lock, Pencil, Printer, Save } from 'lucide-react'
import { PageHeader, ui } from '../../components/ui'
import { useAuth } from '../../auth/AuthProvider'
import type { ExpenseHeader, ExpenseRow, ExpenseTotals, Company, FormSettings, SubmissionVersion, DocSignature, Attachment, SubmissionSummary, VoidInfo } from '../../types/schema'
import { emptyRow, EXPENSE_CLAIM_DEFAULTS, formSignatureBlocks, seqColumnWidth } from '../../types/schema'
import { computeColumnTotals, grandTotal, taxBases, taxSummary } from '../../features/expense-claim/calc'
import { FEATURES } from '../../shared/features'
import { bahtText } from '../../shared/bahttext'
import ExpenseClaimForm from '../../features/expense-claim/ExpenseClaimForm'
import VersionHistory from '../../components/VersionHistory'
import ExpenseClaimPreview from '../../features/expense-claim/ExpenseClaimPreview'
import { createSubmission, updateSubmission, getSubmission, incrementPrint, isSigned, signBlockAsSelf, cancelSigning, unsignDocument, voidSubmission } from '../../data/submissions'
import { getCompany, listCompanies } from '../../data/companies'
import { getFormSettings } from '../../data/formSettings'
import { uploadAttachments, deleteAttachmentFiles, saveAttachmentList, copyAttachmentsTo, storedUnder } from '../../data/attachments'
import AttachmentsField from '../../components/AttachmentsField'
import OwnSignatureToggle from '../../components/OwnSignatureToggle'
import { Spinner } from '../../components/Spinner'
import { formatDateTime } from '../../shared/date'
import { clearFormDraft, draftStillCurrent, formDraftKey, readFormDraft, writeFormDraft } from '../../shared/formDraft'

// The form's content as one comparable string — a draft is whatever differs
// from what the form held when it finished loading.
const snapshot = (header: ExpenseHeader, items: ExpenseRow[]) => JSON.stringify({ header, items })

export default function FormPage() {
  const { id, formType } = useParams()
  const [searchParams] = useSearchParams()
  const cloneId = searchParams.get('clone')
  // Correcting a document others have signed: a new document from its content,
  // and the original cancelled in its favour once the new one is saved.
  const reviseId = searchParams.get('revise')
  const sourceId = cloneId ?? reviseId
  const { profile, refresh: refreshProfile } = useAuth()
  const nav = useNavigate()
  const [company, setCompany] = useState<Company | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [settings, setSettings] = useState<FormSettings>(EXPENSE_CLAIM_DEFAULTS)
  const [docNumber, setDocNumber] = useState('(ยังไม่บันทึก)')
  const [savedId, setSavedId] = useState<string | null>(id ?? null)
  const [showPreview, setShowPreview] = useState(false)
  const [versionRefresh, setVersionRefresh] = useState(0)
  const [sigs, setSigs] = useState<DocSignature[]>([]) // signed signatures, to stamp on the document
  const [attachments, setAttachments] = useState<Attachment[]>([]) // files already uploaded
  const [pendingFiles, setPendingFiles] = useState<File[]>([])     // picked; uploaded on save
  const [removedAtts, setRemovedAtts] = useState<Attachment[]>([]) // deleted from storage on save
  const [saving, setSaving] = useState(false)
  const [ownerUid, setOwnerUid] = useState<string | null>(null) // null: a new document, which is mine
  const [signMine, setSignMine] = useState(true)
  const [voided, setVoided] = useState<VoidInfo | null>(null)                           // this document was cancelled
  const [revising, setRevising] = useState<{ id: string; docNumber: string } | null>(null) // the one this new document corrects
  const [header, setHeader] = useState<ExpenseHeader>({
    subject: 'ขออนุมัติเบิกค่าใช้จ่าย', categories: [], companyId: profile?.companyId ?? '',
    firstName: profile?.firstName ?? '', lastName: profile?.lastName ?? '',
    position: profile?.position ?? '', job: profile?.defaultJob ?? '',
  })
  const [items, setItems] = useState<ExpenseRow[]>([emptyRow(EXPENSE_CLAIM_DEFAULTS.columns)])

  function buildTotals(): ExpenseTotals {
    const subtotal = grandTotal(settings.columns, items)
    // The saved totals follow what is actually charged — see shared/features.
    const tax = taxSummary(subtotal, header.vat, header.whtRate, header.retentionRate,
      taxBases(settings.columns, items, FEATURES.taxPerRow ? { vat: header.vatScope, wht: header.whtScope, ret: header.retentionScope } : {}),
      FEATURES.taxOnNet ? { vat: header.vatOnNet, whtRate: header.whtOnNetRate } : undefined)
    return {
      columnTotals: computeColumnTotals(settings.columns, items),
      grandTotal: subtotal,
      amountInThaiText: bahtText(tax.netTotal),
      vatAmount: tax.vatAmount,
      whtAmount: tax.whtAmount,
      retentionAmount: tax.retentionAmount,
      netTotal: tax.netTotal,
    }
  }

  // What the form held when it finished loading, and when that was last saved
  // (0 for a document not saved yet) — what a draft is measured against.
  const [loaded, setLoaded] = useState<{ header: ExpenseHeader; items: ExpenseRow[]; updatedAt: number } | null>(null)
  const headerNow = useRef(header)
  headerNow.current = header

  useEffect(() => { // EDIT mode: load existing submission + its form settings
    if (!id) return
    getSubmission(id).then(s => {
      if (!s) return
      setHeader(s.header); setItems(s.items); setDocNumber(s.docNumber); setSavedId(s.id)
      setSigs(s.signatures ?? []); setOwnerUid(s.createdBy); setVoided(s.voided ?? null)
      setAttachments(s.attachments ?? [])
      setLoaded({ header: s.header, items: s.items, updatedAt: s.updatedAt ?? 0 })
      getFormSettings(s.formType).then(setSettings)
    })
  }, [id])
  useEffect(() => { // NEW mode: load the form settings for this formType
    if (id || !formType || sourceId) return
    getFormSettings(formType).then(fs => {
      const fresh = [emptyRow(fs.columns)]
      setSettings(fs); setItems(fresh)
      setLoaded({ header: headerNow.current, items: fresh, updatedAt: 0 })
    })
  }, [id, formType, sourceId])
  useEffect(() => { // CLONE / REVISE mode: prefill from a source doc but stay a NEW (unsaved) doc
    if (id || !sourceId) return
    getSubmission(sourceId).then(s => {
      if (!s) return
      setHeader(s.header); setItems(s.items) // copy content only — new number is assigned on save
      // A correction keeps the original's receipts (copied over on save); one
      // already cancelled is simply copied.
      if (reviseId && !s.voided) { setRevising({ id: s.id, docNumber: s.docNumber }); setAttachments(s.attachments ?? []) }
      setLoaded({ header: s.header, items: s.items, updatedAt: 0 })
      getFormSettings(s.formType).then(setSettings)
    })
  }, [id, sourceId, reviseId])

  // ----- Draft -----
  // What is typed is kept in this browser as it is typed, so leaving for
  // another menu does not lose it; coming back puts it back. Keyed by the
  // document as saved: once a new one is saved it is that document's draft.
  const draftKey = formDraftKey(profile?.uid ?? '', { id: savedId, cloneId: savedId ? null : (cloneId ?? (reviseId ? `revise-${reviseId}` : null)), formType })
  const baseline = useRef<string | null>(null)       // the content nothing needs keeping beyond
  const restoreTried = useRef(false)
  const [restoredAt, setRestoredAt] = useState<number | null>(null)
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null)
  useEffect(() => {
    if (!loaded || !draftKey || restoreTried.current) return
    restoreTried.current = true
    baseline.current = snapshot(loaded.header, loaded.items)
    const d = readFormDraft(draftKey)
    if (!d) return
    // Saved over since, or nothing in it the form does not already hold: not worth restoring.
    if (!draftStillCurrent(d, loaded.updatedAt) || snapshot(d.header, d.items) === baseline.current) { clearFormDraft(draftKey); return }
    setHeader(d.header); setItems(d.items); setRestoredAt(d.savedAt)
  }, [loaded, draftKey])
  useEffect(() => { if (header.companyId) getCompany(header.companyId).then(setCompany) }, [header.companyId])
  useEffect(() => { listCompanies().then(setCompanies) }, [])

  // Saving and printing are one button: people printed a filled-in form and
  // walked away believing it was in the system, when nothing had been saved.
  // The document is saved first and printed only once it is. One someone else
  // has signed can no longer change, so it is just printed.
  async function saveAndPrint() {
    if (saving) return // a double click must not create two documents
    if (frozen) { await print(savedId, false); return }
    // Signed by the requester alone and left as it was: printed as it is.
    const unchanged = baseline.current === snapshot(header, items) && !pendingFiles.length && !removedAtts.length
    if (ownSigned && signMine && unchanged) { await print(savedId, false); return }
    const totals = buildTotals()
    // Require a total > 0 only for forms that actually have amount columns.
    const hasNumericCol = settings.columns.some(c => c.type === 'number' || c.type === 'calc')
    if (hasNumericCol && totals.grandTotal <= 0) {
      uiAlert('กรุณากรอกยอดเงินอย่างน้อย 1 รายการ (ยอดรวมต้องมากกว่า 0)')
      return
    }
    if (!header.firstName.trim() || !header.lastName.trim() || !header.position.trim()) {
      uiAlert('กรุณากรอกชื่อ นามสกุล และตำแหน่งให้ครบถ้วน')
      return
    }
    // Why the original is being replaced — kept on it as it is cancelled.
    let reviseReason = ''
    if (revising) {
      const typed = await uiPrompt(`เมื่อบันทึก จะได้เอกสารเลขที่ใหม่ และ ${revising.docNumber} จะขึ้นว่า "ยกเลิก"`, {
        title: 'เหตุผลที่แก้ไข', placeholder: 'เช่น กรอกยอดผิด', confirmText: 'บันทึกฉบับใหม่',
      })
      if (typed === null) return
      if (!typed.trim()) { uiAlert('กรุณาระบุเหตุผลที่แก้ไข', { title: 'ยังไม่ได้บันทึก' }); return }
      reviseReason = typed.trim()
    }
    setSaving(true)
    try {
      // A signed document cannot be changed (protect_signed_content): the
      // requester's own signature comes off first, and goes back on once the
      // change is saved — they need never know the document was locked.
      if (ownSigned && !(await takeOwnSignatureOff())) return
      const subId = await persist(totals)
      if (!subId) return
      if (revising) await voidOriginal(subId, reviseReason)
      if (!(await stampMySignature(subId))) return
      await print(subId, true)
    } finally { setSaving(false) }
  }

  // Most documents are signed by the requester in the system and by everyone
  // else in pen on the printed sheet. So the requester's own line is signed
  // with the signature they uploaded as the document is saved, and the paper
  // leaves the printer already carrying it — no trip to the history page to
  // send the document to themselves first.
  const me = { uid: profile?.uid ?? '', name: `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim() }
  const isMine = !ownerUid || ownerUid === profile?.uid
  const requesterBlock = formSignatureBlocks(settings)[0]
  const stampsMySignature = signMine && isMine && !!requesterBlock && !!profile?.signatureImage
  async function stampMySignature(subId: string): Promise<boolean> {
    if (!stampsMySignature) return true
    try {
      const fresh = await getSubmission(subId)
      const signedAlready = (fresh?.signatures ?? []).some(x => x.blockId === requesterBlock.id && x.status === 'signed')
      if (!signedAlready) await signBlockAsSelf({ id: subId, signatures: fresh?.signatures } as SubmissionSummary, requesterBlock, me)
      setSigs((await getSubmission(subId))?.signatures ?? [])
      return true
    } catch (e) {
      uiAlert(`บันทึกเอกสารแล้ว แต่ใส่ลายเซ็นไม่สำเร็จ (${dbErrorMessage(e)}) — กด “บันทึกและพิมพ์” อีกครั้งเพื่อลองใหม่`, { title: 'ใส่ลายเซ็นไม่สำเร็จ' })
      return false
    }
  }

  // The corrected document is saved: the original is cancelled in its favour.
  // Failing here leaves both — the new one is kept, and the person is told to
  // cancel the original from the history page.
  async function voidOriginal(newId: string, reason: string) {
    if (!revising) return
    try {
      await voidSubmission(revising.id, reason, newId)
    } catch (e) {
      uiAlert(`บันทึกฉบับใหม่แล้ว แต่ยกเลิกฉบับเดิม ${revising.docNumber} ไม่สำเร็จ (${(e as Error).message}) — ไปกด “ยกเลิกเอกสาร” ที่ฉบับเดิมในหน้าประวัติ`, { title: 'ยกเลิกฉบับเดิมไม่สำเร็จ' })
    }
    setRevising(null)
  }

  // Take the requester's own signature off so the document can be changed.
  async function takeOwnSignatureOff(): Promise<boolean> {
    if (!savedId) return true
    try {
      // Nobody else is on it: clear it back to a plain saved document rather
      // than leave a line waiting on the requester.
      if (sigs.every(x => x.assignedUid === profile?.uid)) await cancelSigning(savedId)
      else for (const s of sigs.filter(x => x.status === 'signed')) await unsignDocument(savedId, s.blockId)
      setSigs((await getSubmission(savedId))?.signatures ?? [])
      return true
    } catch (e) {
      uiAlert(dbErrorMessage(e), { title: 'บันทึกไม่สำเร็จ' })
      return false
    }
  }

  // Save the document first (a new one needs its id before files can be stored
  // under it), then upload new attachments, record the list, drop removed files.
  // Gives back the document's id once all of it is stored, or null.
  async function persist(totals: ExpenseTotals): Promise<string | null> {
    const editor = { uid: profile!.uid, name: `${profile!.firstName ?? ''} ${profile!.lastName ?? ''}`.trim() }
    let subId = savedId
    try {
      // Stored: the draft has done its job. Settled before a new document's id
      // moves the draft onto that document, so nothing is kept for it twice.
      const settleDraft = () => {
        clearFormDraft(draftKey)
        baseline.current = snapshot(header, items)
        setRestoredAt(null); setDraftSavedAt(null)
      }
      if (savedId) {
        const existing = await getSubmission(savedId)
        if (existing) await updateSubmission(savedId, { ...existing, header, items, totals }, editor)
        settleDraft()
      } else {
        const created = await createSubmission({
          formType: settings.formType, header, items, totals,
          createdBy: profile!.uid, createdByEmployeeId: profile!.employeeId,
        }, settings.formCode || '', editor)
        subId = created.id
        settleDraft()
        setSavedId(created.id); setDocNumber(created.docNumber)
      }
      setVersionRefresh(n => n + 1)
    } catch (e) {
      uiAlert(dbErrorMessage(e), { title: 'บันทึกไม่สำเร็จ' })
      return null
    }

    // Files carried over from the document being corrected are still stored
    // under it until they are copied here.
    const carried = subId ? attachments.filter(a => !storedUnder(subId!, a)) : []
    if (subId && (pendingFiles.length || removedAtts.length || carried.length)) {
      let uploaded: Attachment[] = []   // made now — undone if the rest fails
      try {
        const own = carried.length ? await copyAttachmentsTo(subId, attachments) : attachments
        uploaded = own.filter(a => !attachments.includes(a))
        const fresh = pendingFiles.length ? await uploadAttachments(subId, pendingFiles) : []
        uploaded = [...uploaded, ...fresh]
        const next = [...own, ...fresh]
        await saveAttachmentList(subId, next)
        await deleteAttachmentFiles(removedAtts.map(a => a.path))
        setAttachments(next); setPendingFiles([]); setRemovedAtts([])
      } catch {
        await deleteAttachmentFiles(uploaded.map(a => a.path)) // keep storage in step with the saved list
        uiAlert('บันทึกเอกสารแล้ว แต่อัปโหลดไฟล์แนบไม่สำเร็จ — กด “บันทึกและพิมพ์” อีกครั้งเพื่อลองใหม่', { title: 'แนบไฟล์ไม่สำเร็จ' })
        return null
      }
    }
    return subId
  }

  function handleRestore(v: SubmissionVersion) {
    setHeader(v.header); setItems(v.items); setShowPreview(false)
    uiAlert(`ดึงเนื้อหาเวอร์ชัน ${v.version} กลับมาแล้ว — ตรวจสอบแล้วกด "บันทึกและพิมพ์" เพื่อสร้างเป็นเวอร์ชันใหม่`)
  }

  // Paper and PDF come from the same place: the browser prints what
  // ExpenseClaimPreview lays out, and its "Save as PDF" destination writes
  // that very page to a file. There used to be a second renderer just for
  // the PDF, and it drifted from the printed page every time either changed.
  // A document saved a moment ago has only just been given its number, so the
  // print waits for the page to show it (the effect below) — otherwise the
  // paper would read "(ยังไม่บันทึก)".
  const [printRequest, setPrintRequest] = useState<{ saved: boolean } | null>(null)
  async function print(subId: string | null, saved: boolean) {
    if (subId) { try { await incrementPrint(subId) } catch { /* the count is not worth losing the print over */ } }
    setPrintRequest({ saved })
  }
  useEffect(() => {
    if (!printRequest) return
    window.print()
    if (printRequest.saved) uiAlert('บันทึกแล้ว — ดูเอกสารทั้งหมดได้ที่หน้าประวัติ', { tone: 'success' })
  }, [printRequest])

  // Signed documents are locked in the database (protect_signed_content), so
  // the page says so up front instead of only failing at save time.
  const locked = isSigned({ signatures: sigs } as never)
  // Signed by the requester alone: still theirs to change — saving takes the
  // signature off and puts it back (saveAndPrint). Signed by anyone else: frozen,
  // and the boxes are shut so nothing can be typed that will not be kept.
  const ownSigned = locked && isMine && sigs.filter(x => x.status === 'signed').every(x => x.assignedUid === profile?.uid)
  const frozen = (locked && !ownSigned) || !!voided

  // Keep the draft as it is typed — gone again once it matches what is saved.
  // A frozen document cannot be changed, so it has nothing to keep.
  useEffect(() => {
    if (!restoreTried.current || baseline.current === null || frozen) return
    if (snapshot(header, items) === baseline.current) { clearFormDraft(draftKey); setDraftSavedAt(null); return }
    const now = Date.now()
    writeFormDraft(draftKey, header, items, now)
    setDraftSavedAt(now)
  }, [header, items, draftKey, frozen])

  // Back to what the form held when it opened, and the draft thrown away.
  function discardDraft() {
    if (!loaded) return
    clearFormDraft(draftKey)
    setHeader(loaded.header); setItems(loaded.items); setRestoredAt(null)
  }
  // The sheet shows the signature the requester has chosen to put on before it
  // is actually there — "บันทึกและพิมพ์" signs it, today — and no longer shows
  // their own one once they have switched it off. Never on a frozen document:
  // that button only prints it, and the paper would carry a signature the
  // system does not have.
  const ownLineSigned = sigs.some(x => x.blockId === requesterBlock.id && x.status === 'signed')
  const previewMine = stampsMySignature && !frozen && !ownLineSigned
  const shownSigs = ownSigned && !signMine ? sigs.filter(x => x.blockId !== requesterBlock.id) : sigs
  const sheetSigs: DocSignature[] = previewMine
    ? [...shownSigs.filter(x => x.blockId !== requesterBlock.id), {
      blockId: requesterBlock.id, blockLabel: requesterBlock.label, assignedUid: me.uid, assignedName: me.name,
      status: 'signed', signatureImage: profile?.signatureImage ?? undefined, signedAt: Date.now(),
    }]
    : shownSigs
  const isAdmin = profile?.role === 'admin'

  // A closed form (maintenance) is not accessible to employees via direct URL.
  if (!id && settings.active === false && !isAdmin) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-stone-200 bg-white p-8 text-center">
        <div className="text-lg font-semibold text-stone-900">ฟอร์มนี้ปิดปรับปรุงชั่วคราว</div>
        <div className="mt-2 text-sm text-stone-500">กรุณากลับมาใหม่ภายหลัง</div>
        <button onClick={() => nav('/')} className={`${ui.btnPrimary} mt-4`}>กลับหน้าหลัก</button>
      </div>
    )
  }

  return (
    <div>
      <div className="no-print space-y-4">
        {voided && (
          <div className="flex items-start gap-2 rounded-lg bg-rose-50 px-4 py-3 text-sm text-brick-700">
            <Ban size={16} className="mt-0.5 shrink-0" />
            <span>
              เอกสารนี้ถูกยกเลิกแล้ว — {voided.reason}
              {voided.replacedByNumber && <> · ฉบับแก้ไขคือ <span className="font-mono font-medium">{voided.replacedByNumber}</span></>}
              <span className="block text-xs">โดย {voided.byName || '—'} · {formatDateTime(voided.at)}</span>
            </span>
          </div>
        )}
        {revising && (
          <div className="flex items-start gap-2 rounded-lg border border-clay-200 bg-clay-50 px-4 py-3 text-sm text-clay-800">
            <FilePen size={16} className="mt-0.5 shrink-0" />
            <span>
              กำลังแก้ไข <span className="font-mono font-medium">{revising.docNumber}</span> เป็นฉบับใหม่ — กด “บันทึกและพิมพ์” แล้วจะได้เลขที่ใหม่
              และ {revising.docNumber} จะขึ้นว่า “ยกเลิก” (ยังเก็บไว้ดูได้) · ไฟล์แนบเดิมติดมาด้วย
            </span>
          </div>
        )}
        {frozen && !voided && (
          <div className="flex items-center gap-2 rounded-lg bg-ochre-50 px-4 py-3 text-sm text-ochre-700">
            <Lock size={16} className="shrink-0" />
            เอกสารนี้มีคนเซ็นแล้ว จึงแก้ไขเนื้อหาไม่ได้ — ถ้าต้องแก้ กด “แก้ไข” ที่หน้าประวัติ ระบบจะออกเป็นฉบับใหม่และยกเลิกฉบับนี้ให้
          </div>
        )}
        <PageHeader
          onBack={() => nav(settings.groupId ? `/group/${settings.groupId}` : '/')}
          title={settings.name || settings.title}
          subtitle={`เลขที่ ${docNumber}`}
        />
        {restoredAt && (
          <div role="status" className="flex flex-wrap items-center gap-3 rounded-lg border border-clay-200 bg-clay-50 px-4 py-2.5 text-sm text-clay-800">
            <History size={16} className="shrink-0" />
            <span className="min-w-0 flex-1">กู้คืนข้อมูลที่กรอกค้างไว้เมื่อ {formatDateTime(restoredAt)} — ยังไม่ได้บันทึกเข้าระบบ</span>
            <button type="button" onClick={discardDraft} className="rounded-md px-2 py-1 text-xs font-medium text-clay-700 underline-offset-2 hover:bg-clay-100 hover:underline">
              ทิ้งดราฟ
            </button>
          </div>
        )}
        {/* Switching between filling and checking happens all the way down a long
            form, so the button stays put instead of making anyone scroll back up. */}
        <button
          type="button"
          onClick={() => setShowPreview(p => !p)}
          title={showPreview ? 'กลับไปแก้ไข' : 'ดูตัวอย่างเอกสาร'}
          aria-label={showPreview ? 'กลับไปแก้ไข' : 'ดูตัวอย่างเอกสาร'}
          className="no-print fixed right-6 top-6 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-clay-600 text-white shadow-[0_8px_22px_rgba(43,103,119,0.45)] ring-4 ring-white/70 transition hover:bg-clay-700 hover:shadow-[0_12px_28px_rgba(43,103,119,0.55)] focus:outline-none focus:ring-clay-600/30"
        >
          {showPreview ? <Pencil size={20} /> : <Eye size={20} />}
        </button>
        {/* Everything typed into: shut on a frozen document, so nothing can be
            typed there that will not be kept. */}
        <fieldset disabled={frozen} className="m-0 min-w-0 space-y-4 border-0 p-0">
        {!showPreview && (
          <div className={ui.card}>
            <label className={ui.label}>บริษัท</label>
            <select
              className={ui.input}
              value={header.companyId}
              onChange={e => setHeader({ ...header, companyId: e.target.value })}
            >
              {!header.companyId && <option value="">— เลือกบริษัท —</option>}
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
        {!showPreview && <ExpenseClaimForm header={header} items={items} onHeaderChange={setHeader} onItemsChange={setItems} companyName={company?.name} columns={settings.columns} categories={settings.categories} headerFields={settings.headerFields} introText={settings.introText} bodyText={settings.bodyText} requesterTitle={settings.requesterTitle} itemsTitle={settings.itemsTitle} showSeq={settings.showSeq !== false} seqWidth={seqColumnWidth(settings)} />}
        {!showPreview && (
          <AttachmentsField
            saved={attachments}
            pending={pendingFiles}
            onAdd={files => setPendingFiles(p => [...p, ...files])}
            onRemoveSaved={a => {
              setAttachments(list => list.filter(x => x.path !== a.path))
              // A file still belonging to the original is just left off this one.
              if (savedId && storedUnder(savedId, a)) setRemovedAtts(r => [...r, a])
            }}
            onRemovePending={i => setPendingFiles(p => p.filter((_, x) => x !== i))}
          />
        )}
        </fieldset>
      </div>
      <div className={showPreview ? '' : 'hidden print:block'}>
        <ExpenseClaimPreview company={company} header={header} items={items} docNumber={docNumber} settings={settings} signatures={sheetSigs} voided={!!voided} />
      </div>
      {!frozen && isMine && requesterBlock && (
        <div className="no-print mt-4">
          <OwnSignatureToggle
            signature={profile?.signatureImage} blockLabel={requesterBlock.label} on={signMine} onChange={setSignMine}
            upload={profile ? { uid: profile.uid, onUploaded: refreshProfile } : undefined}
          />
        </div>
      )}
      <div className="no-print mt-4 flex flex-wrap items-center gap-2.5">
        <button
          className={ui.btnPrimary}
          onClick={saveAndPrint}
          disabled={saving}
          title={voided ? 'เอกสารถูกยกเลิกแล้ว — พิมพ์ได้อย่างเดียว' : frozen ? 'เอกสารมีคนเซ็นแล้ว แก้ไขไม่ได้ — พิมพ์ได้อย่างเดียว' : undefined}
        >
          {saving ? <><Spinner size={16} /> กำลังบันทึก...</>
            : frozen ? <><Printer size={16} /> พิมพ์ / บันทึก PDF</>
            : <><Save size={16} /> บันทึกและพิมพ์</>}
        </button>
        <button
          className={ui.btnGhost}
          onClick={() => nav('/history')}
        >
          ไปหน้าประวัติ
        </button>
        <span className="w-full text-xs text-stone-400 sm:w-auto">
          {draftSavedAt && <span className="mr-2 inline-flex items-center gap-1 text-olive-700"><Check size={13} /> เก็บดราฟแล้ว {formatDateTime(draftSavedAt).slice(-5)}</span>}
          {frozen ? '' : 'บันทึกเข้าระบบก่อน แล้วเปิดหน้าพิมพ์ · '}ต้องการไฟล์ PDF: เลือกปลายทางเป็น “Save as PDF”
        </span>
      </div>
      {savedId && (
        <div className="no-print mt-4">
          <VersionHistory
            submissionId={savedId}
            columns={settings.columns}
            settings={settings}
            company={company}
            refreshKey={versionRefresh}
            canRestore={true}
            onRestore={handleRestore}
          />
        </div>
      )}
    </div>
  )
}
