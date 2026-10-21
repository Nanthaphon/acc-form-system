import { uiAlert, uiConfirm } from '../../components/dialog/dialogService'
import { dbErrorMessage } from '../../shared/dbError'
import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, LockOpen, Pencil, Printer, Save } from 'lucide-react'
import { PageHeader, ui } from '../../components/ui'
import { useAuth } from '../../auth/AuthProvider'
import type { ExpenseHeader, ExpenseRow, ExpenseTotals, Company, FormSettings, SubmissionVersion, DocSignature, Attachment, SubmissionSummary } from '../../types/schema'
import { emptyRow, EXPENSE_CLAIM_DEFAULTS, formSignatureBlocks } from '../../types/schema'
import { computeColumnTotals, grandTotal, taxBases, taxSummary } from '../../features/expense-claim/calc'
import { FEATURES } from '../../shared/features'
import { bahtText } from '../../shared/bahttext'
import ExpenseClaimForm from '../../features/expense-claim/ExpenseClaimForm'
import VersionHistory from '../../components/VersionHistory'
import ExpenseClaimPreview from '../../features/expense-claim/ExpenseClaimPreview'
import { createSubmission, updateSubmission, getSubmission, incrementPrint, isSigned, signBlockAsSelf, cancelSigning, unsignDocument } from '../../data/submissions'
import { getCompany, listCompanies } from '../../data/companies'
import { getFormSettings } from '../../data/formSettings'
import { uploadAttachments, deleteAttachmentFiles, saveAttachmentList } from '../../data/attachments'
import AttachmentsField from '../../components/AttachmentsField'
import OwnSignatureToggle from '../../components/OwnSignatureToggle'
import { Spinner } from '../../components/Spinner'

export default function FormPage() {
  const { id, formType } = useParams()
  const [searchParams] = useSearchParams()
  const cloneId = searchParams.get('clone')
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

  useEffect(() => { // EDIT mode: load existing submission + its form settings
    if (!id) return
    getSubmission(id).then(s => {
      if (!s) return
      setHeader(s.header); setItems(s.items); setDocNumber(s.docNumber); setSavedId(s.id)
      setSigs(s.signatures ?? []); setOwnerUid(s.createdBy)
      setAttachments(s.attachments ?? [])
      getFormSettings(s.formType).then(setSettings)
    })
  }, [id])
  useEffect(() => { // NEW mode: load the form settings for this formType
    if (id || !formType || cloneId) return
    getFormSettings(formType).then(fs => { setSettings(fs); setItems([emptyRow(fs.columns)]) })
  }, [id, formType, cloneId])
  useEffect(() => { // CLONE mode: prefill from a source doc but stay a NEW (unsaved) doc
    if (id || !cloneId) return
    getSubmission(cloneId).then(s => {
      if (!s) return
      setHeader(s.header); setItems(s.items) // copy content only — new number is assigned on save
      getFormSettings(s.formType).then(setSettings)
    })
  }, [id, cloneId])
  useEffect(() => { if (header.companyId) getCompany(header.companyId).then(setCompany) }, [header.companyId])
  useEffect(() => { listCompanies().then(setCompanies) }, [])

  // Saving and printing are one button: people printed a filled-in form and
  // walked away believing it was in the system, when nothing had been saved.
  // The document is saved first and printed only once it is; a signed one
  // can no longer change, so it is just printed.
  async function saveAndPrint() {
    if (saving) return // a double click must not create two documents
    if (locked) { await print(savedId, false); return }
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
    setSaving(true)
    try {
      const subId = await persist(totals)
      if (!subId || !(await stampMySignature(subId))) return
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

  // A signature locks the content (protect_signed_content). When every
  // signature on it is the requester's own, they take it off right here to
  // correct the document, and "บันทึกและพิมพ์" puts it back on.
  async function unlockToEdit() {
    if (!savedId) return
    if (!(await uiConfirm('ลายเซ็นของคุณจะถูกเอาออกจากเอกสาร เพื่อให้แก้ไขได้ — แก้เสร็จแล้วกด “บันทึกและพิมพ์” ระบบจะใส่ลายเซ็นให้ใหม่', {
      title: 'แก้ไขเอกสารนี้?', confirmText: 'เอาลายเซ็นออกและแก้ไข',
    }))) return
    try {
      // Nobody else is on it: clear it back to a plain saved document rather
      // than leave a line waiting on the requester.
      if (sigs.every(x => x.assignedUid === profile?.uid)) await cancelSigning(savedId)
      else for (const s of sigs.filter(x => x.status === 'signed')) await unsignDocument(savedId, s.blockId)
      setSigs((await getSubmission(savedId))?.signatures ?? [])
    } catch (e) {
      uiAlert(dbErrorMessage(e), { title: 'เอาลายเซ็นออกไม่สำเร็จ' })
    }
  }

  // Save the document first (a new one needs its id before files can be stored
  // under it), then upload new attachments, record the list, drop removed files.
  // Gives back the document's id once all of it is stored, or null.
  async function persist(totals: ExpenseTotals): Promise<string | null> {
    const editor = { uid: profile!.uid, name: `${profile!.firstName ?? ''} ${profile!.lastName ?? ''}`.trim() }
    let subId = savedId
    try {
      if (savedId) {
        const existing = await getSubmission(savedId)
        if (existing) await updateSubmission(savedId, { ...existing, header, items, totals }, editor)
      } else {
        const created = await createSubmission({
          formType: settings.formType, header, items, totals,
          createdBy: profile!.uid, createdByEmployeeId: profile!.employeeId,
        }, settings.formCode || '', editor)
        subId = created.id
        setSavedId(created.id); setDocNumber(created.docNumber)
      }
      setVersionRefresh(n => n + 1)
    } catch (e) {
      uiAlert(dbErrorMessage(e), { title: 'บันทึกไม่สำเร็จ' })
      return null
    }

    if (subId && (pendingFiles.length || removedAtts.length)) {
      let uploaded: Attachment[] = []
      try {
        if (pendingFiles.length) uploaded = await uploadAttachments(subId, pendingFiles)
        const next = [...attachments, ...uploaded]
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
  const canUnlock = locked && isMine && sigs.filter(x => x.status === 'signed').every(x => x.assignedUid === profile?.uid)
  // The sheet shows the signature the requester has chosen to put on before it
  // is actually there — "บันทึกและพิมพ์" signs it, today. Never on a locked
  // document: that button only prints it, and the paper would carry a
  // signature the system does not have.
  const previewMine = stampsMySignature && !locked && !sigs.some(x => x.blockId === requesterBlock.id && x.status === 'signed')
  const sheetSigs: DocSignature[] = previewMine
    ? [...sigs.filter(x => x.blockId !== requesterBlock.id), {
      blockId: requesterBlock.id, blockLabel: requesterBlock.label, assignedUid: me.uid, assignedName: me.name,
      status: 'signed', signatureImage: profile?.signatureImage ?? undefined, signedAt: Date.now(),
    }]
    : sigs
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
        {locked && (canUnlock ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-ochre-50 px-4 py-3 text-sm text-ochre-700">
            <span className="min-w-0 flex-1">เอกสารนี้มีลายเซ็นของคุณแล้ว จึงล็อกเนื้อหาไว้ — ถ้าต้องแก้ ให้เอาลายเซ็นออกก่อน</span>
            <button type="button" onClick={unlockToEdit} className={ui.btnSecondary}>
              <LockOpen size={16} /> แก้ไขเอกสาร
            </button>
          </div>
        ) : (
          <div className="rounded-lg bg-ochre-50 px-4 py-3 text-sm text-ochre-700">
            เอกสารนี้มีลายเซ็นแล้ว จึงแก้ไขเนื้อหาไม่ได้ — ถ้าต้องแก้ ให้ลบลายเซ็นออกก่อนที่หน้าประวัติ
          </div>
        ))}
        <PageHeader
          onBack={() => nav(settings.groupId ? `/group/${settings.groupId}` : '/')}
          title={settings.name || settings.title}
          subtitle={`เลขที่ ${docNumber}`}
        />
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
        {!showPreview && <ExpenseClaimForm header={header} items={items} onHeaderChange={setHeader} onItemsChange={setItems} companyName={company?.name} columns={settings.columns} categories={settings.categories} headerFields={settings.headerFields} introText={settings.introText} bodyText={settings.bodyText} requesterTitle={settings.requesterTitle} itemsTitle={settings.itemsTitle} showSeq={settings.showSeq !== false} />}
        {!showPreview && (
          <AttachmentsField
            saved={attachments}
            pending={pendingFiles}
            onAdd={files => setPendingFiles(p => [...p, ...files])}
            onRemoveSaved={a => { setAttachments(list => list.filter(x => x.path !== a.path)); setRemovedAtts(r => [...r, a]) }}
            onRemovePending={i => setPendingFiles(p => p.filter((_, x) => x !== i))}
          />
        )}
      </div>
      <div className={showPreview ? '' : 'hidden print:block'}>
        <ExpenseClaimPreview company={company} header={header} items={items} docNumber={docNumber} settings={settings} signatures={sheetSigs} />
      </div>
      {!locked && isMine && requesterBlock && (
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
          title={locked ? 'เอกสารมีลายเซ็นแล้ว แก้ไขไม่ได้ — พิมพ์ได้อย่างเดียว' : undefined}
        >
          {saving ? <><Spinner size={16} /> กำลังบันทึก...</>
            : locked ? <><Printer size={16} /> พิมพ์ / บันทึก PDF</>
            : <><Save size={16} /> บันทึกและพิมพ์</>}
        </button>
        <button
          className={ui.btnGhost}
          onClick={() => nav('/history')}
        >
          ไปหน้าประวัติ
        </button>
        <span className="w-full text-xs text-stone-400 sm:w-auto">
          {locked ? '' : 'บันทึกเข้าระบบก่อน แล้วเปิดหน้าพิมพ์ · '}ต้องการไฟล์ PDF: เลือกปลายทางเป็น “Save as PDF”
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
