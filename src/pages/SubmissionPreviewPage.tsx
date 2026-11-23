import { useEffect, useState } from 'react'
import { PageSkeleton } from '../components/TableSkeleton'
import { useNavigate, useParams } from 'react-router-dom'
import { Ban, Eye, FileSpreadsheet, FileText, Printer } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import ExpenseClaimPreview from '../features/expense-claim/ExpenseClaimPreview'
import { getSubmission, incrementPrint } from '../data/submissions'
import { getFormSettings } from '../data/formSettings'
import { adoptDocumentWht } from '../features/expense-claim/calc'
import { getCompany } from '../data/companies'
import type { Submission, FormSettings, Company } from '../types/schema'
import AttachmentsField from '../components/AttachmentsField'
import { Spinner } from '../components/Spinner'
import { PageHeader, ui } from '../components/ui'
import { formatDateTime } from '../shared/date'
import { dbErrorMessage } from '../shared/dbError'
import { saveFile } from '../shared/saveFile'
import { uiAlert } from '../components/dialog/dialogService'
import { loadChunk } from '../shared/loadChunk'

export default function SubmissionPreviewPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { profile } = useAuth()
  const [sub, setSub] = useState<Submission | null>(null)
  const [settings, setSettings] = useState<FormSettings | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!id) return
    getSubmission(id).then(async s => {
      if (!s) return
      const fs = await getFormSettings(s.formType)
      // saved before its form worked withholding out in the table: lines take the document's rate
      setSub({ ...s, items: adoptDocumentWht(fs.columns, s.header, s.items) })
      setSettings(fs)
      if (s.header.companyId) setCompany(await getCompany(s.header.companyId))
    })
  }, [id])

  async function onPrint() {
    if (sub) await incrementPrint(sub.id)
    window.print()
  }

  // Built on request. The builder is loaded only here, so the rest of the app does not carry it.
  async function onExportExcel() {
    if (!sub || !settings) return
    setExporting(true)
    try {
      const x = await loadChunk(() => import('../features/expense-claim/excelExport'))
      const bytes = await x.buildDocumentXlsx({
        company, header: sub.header, items: sub.items, docNumber: sub.docNumber, settings,
        signatures: sub.signatures, voided: !!sub.voided, replacedBy: sub.voided?.replacedByNumber, createdAt: sub.createdAt,
      })
      saveFile(bytes, x.excelFileName(sub.docNumber), x.XLSX_MIME)
    } catch (e) {
      uiAlert('สร้างไฟล์ Excel ไม่สำเร็จ: ' + dbErrorMessage(e))
    } finally {
      setExporting(false)
    }
  }

  if (!sub || !settings) return (
    <PageSkeleton />
  )

  // Only the document owner or an admin can print; others (e.g. assigned signers) view only.
  const canPrint = profile?.role === 'admin' || sub.createdBy === profile?.uid

  return (
    <div>
      <div className="no-print">
        <PageHeader
          icon={<FileText size={20} />}
          title={`ดูตัวอย่าง — ${sub.docNumber}`}
          onBack={() => nav(-1)}
          actions={canPrint
            ? <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={onExportExcel} disabled={exporting} className={ui.btnSecondary}>
                  {exporting ? <Spinner size={16} /> : <FileSpreadsheet size={16} />} ส่งออก Excel
                </button>
                <button type="button" onClick={onPrint} className={ui.btnPrimary}><Printer size={16} /> พิมพ์ / บันทึก PDF</button>
              </div>
            : <span className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100 px-3 py-2 text-sm font-medium text-stone-500"><Eye size={16} /> ดูอย่างเดียว</span>}
        />
      </div>
      {sub.voided && (
        <div className="no-print mb-4 flex items-start gap-2 rounded-lg bg-rose-50 px-4 py-3 text-sm text-brick-700">
          <Ban size={16} className="mt-0.5 shrink-0" />
          <span>
            เอกสารนี้ถูกยกเลิกแล้ว — {sub.voided.reason}
            {sub.voided.replacedByNumber && <> · ฉบับแก้ไขคือ <span className="font-mono font-medium">{sub.voided.replacedByNumber}</span></>}
            <span className="block text-xs">โดย {sub.voided.byName || "—"} · {formatDateTime(sub.voided.at)}</span>
          </span>
        </div>
      )}
      {sub.replaces && (
        <div className="no-print mb-4 rounded-lg border border-clay-200 bg-clay-50 px-4 py-3 text-sm text-clay-800">
          ฉบับแก้ไขของ <span className="font-mono font-medium">{sub.replaces.docNumber}</span> (ฉบับเดิมถูกยกเลิกแล้ว)
        </div>
      )}
      {/* Approvers see the receipts here — the fill page is owner-only. */}
      {(sub.attachments?.length ?? 0) > 0 && (
        <div className="no-print mb-4"><AttachmentsField saved={sub.attachments ?? []} readOnly /></div>
      )}
      <ExpenseClaimPreview company={company} header={sub.header} items={sub.items} docNumber={sub.docNumber} settings={settings} signatures={sub.signatures} voided={!!sub.voided} replacedBy={sub.voided?.replacedByNumber} createdAt={sub.createdAt} />
    </div>
  )
}
