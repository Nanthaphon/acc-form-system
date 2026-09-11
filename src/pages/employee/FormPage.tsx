import { uiAlert } from '../../components/dialog/dialogService'
import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { pdf } from '@react-pdf/renderer'
import { Download, Eye, Pencil, Printer, Receipt, Save } from 'lucide-react'
import { PageHeader, ui } from '../../components/ui'
import { useAuth } from '../../auth/AuthProvider'
import type { ExpenseHeader, ExpenseRow, ExpenseTotals, Company, FormSettings, SubmissionVersion, DocSignature, Attachment } from '../../types/schema'
import { emptyRow, EXPENSE_CLAIM_DEFAULTS } from '../../types/schema'
import { computeColumnTotals, grandTotal, taxSummary } from '../../features/expense-claim/calc'
import { bahtText } from '../../shared/bahttext'
import ExpenseClaimForm from '../../features/expense-claim/ExpenseClaimForm'
import VersionHistory from '../../components/VersionHistory'
import ExpenseClaimPreview from '../../features/expense-claim/ExpenseClaimPreview'
import { ExpenseClaimPdf } from '../../features/expense-claim/ExpenseClaimPdf'
import { createSubmission, updateSubmission, getSubmission, incrementPrint } from '../../data/submissions'
import { getCompany, listCompanies } from '../../data/companies'
import { getFormSettings } from '../../data/formSettings'
import { uploadAttachments, deleteAttachmentFiles, saveAttachmentList } from '../../data/attachments'
import AttachmentsField from '../../components/AttachmentsField'
import { Spinner } from '../../components/Spinner'

export default function FormPage() {
  const { id, formType } = useParams()
  const [searchParams] = useSearchParams()
  const cloneId = searchParams.get('clone')
  const { profile } = useAuth()
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
  const [header, setHeader] = useState<ExpenseHeader>({
    subject: 'ขออนุมัติเบิกค่าใช้จ่าย', categories: [], companyId: profile?.companyId ?? '',
    firstName: profile?.firstName ?? '', lastName: profile?.lastName ?? '',
    position: profile?.position ?? '', job: profile?.defaultJob ?? '',
  })
  const [items, setItems] = useState<ExpenseRow[]>([emptyRow(EXPENSE_CLAIM_DEFAULTS.columns)])

  function buildTotals(): ExpenseTotals {
    const subtotal = grandTotal(settings.columns, items)
    const tax = taxSummary(subtotal, header.vat, header.whtRate)
    return {
      columnTotals: computeColumnTotals(settings.columns, items),
      grandTotal: subtotal,
      amountInThaiText: bahtText(tax.netTotal),
      vatAmount: tax.vatAmount,
      whtAmount: tax.whtAmount,
      netTotal: tax.netTotal,
    }
  }

  useEffect(() => { // EDIT mode: load existing submission + its form settings
    if (!id) return
    getSubmission(id).then(s => {
      if (!s) return
      setHeader(s.header); setItems(s.items); setDocNumber(s.docNumber); setSavedId(s.id)
      setSigs(s.signatures ?? [])
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

  async function save() {
    if (saving) return // a double click must not create two documents
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
    try { await persist(totals) } finally { setSaving(false) }
  }

  // Save the document first (a new one needs its id before files can be stored
  // under it), then upload new attachments, record the list, drop removed files.
  async function persist(totals: ExpenseTotals) {
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
    } catch {
      uiAlert('บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
      return
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
        uiAlert('บันทึกเอกสารแล้ว แต่อัปโหลดไฟล์แนบไม่สำเร็จ — กด “บันทึก” อีกครั้งเพื่อลองใหม่', { title: 'แนบไฟล์ไม่สำเร็จ' })
        return
      }
    }
    uiAlert('บันทึกแล้ว — ส่งให้เซ็นได้ที่หน้าประวัติ', { tone: 'success' })
  }

  function handleRestore(v: SubmissionVersion) {
    setHeader(v.header); setItems(v.items); setShowPreview(false)
    uiAlert(`ดึงเนื้อหาเวอร์ชัน ${v.version} กลับมาแล้ว — ตรวจสอบแล้วกด "บันทึก" เพื่อสร้างเป็นเวอร์ชันใหม่`)
  }

  async function downloadPdf() {
    const blob = await pdf(<ExpenseClaimPdf company={company} header={header} items={items} docNumber={docNumber} settings={settings} signatures={sigs} />).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${docNumber}.pdf`; a.click()
  }
  async function print() {
    if (savedId) await incrementPrint(savedId)
    window.print()
  }

  const isAdmin = profile?.role === 'admin'

  // A closed form (maintenance) is not accessible to employees via direct URL.
  if (!id && settings.active === false && !isAdmin) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center">
        <div className="text-lg font-semibold text-gray-900">ฟอร์มนี้ปิดปรับปรุงชั่วคราว</div>
        <div className="mt-2 text-sm text-gray-500">กรุณากลับมาใหม่ภายหลัง</div>
        <button onClick={() => nav('/')} className={`${ui.btnPrimary} mt-4`}>กลับหน้าหลัก</button>
      </div>
    )
  }

  return (
    <div>
      <div className="no-print space-y-4">
        <PageHeader
          onBack={() => nav(settings.groupId ? `/group/${settings.groupId}` : '/')}
          icon={<Receipt size={20} />}
          title={settings.name || settings.title}
          subtitle={`เลขที่ ${docNumber}`}
          actions={
            <button className={ui.btnSecondary} onClick={() => setShowPreview(!showPreview)}>
              {showPreview ? <><Pencil size={16} /> แก้ไข</> : <><Eye size={16} /> ดูตัวอย่าง</>}
            </button>
          }
        />
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
        {!showPreview && <ExpenseClaimForm header={header} items={items} onHeaderChange={setHeader} onItemsChange={setItems} columns={settings.columns} categories={settings.categories} headerFields={settings.headerFields} />}
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
        <ExpenseClaimPreview company={company} header={header} items={items} docNumber={docNumber} settings={settings} signatures={sigs} />
      </div>
      <div className="no-print mt-4 flex flex-wrap items-center gap-2.5">
        <button
          className={ui.btnPrimary}
          onClick={save}
          disabled={saving}
        >
          {saving ? <><Spinner size={16} /> กำลังบันทึก...</> : <><Save size={16} /> บันทึก</>}
        </button>
        <button
          className={ui.btnSecondary}
          onClick={downloadPdf}
        >
          <Download size={16} /> ดาวน์โหลด PDF
        </button>
        <button
          className={ui.btnSecondary}
          onClick={print}
        >
          <Printer size={16} /> สั่งพิมพ์
        </button>
        <button
          className={ui.btnGhost}
          onClick={() => nav('/history')}
        >
          ไปหน้าประวัติ
        </button>
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
