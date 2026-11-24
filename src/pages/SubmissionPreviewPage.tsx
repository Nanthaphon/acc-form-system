import { useEffect, useState } from 'react'
import { PageSkeleton } from '../components/TableSkeleton'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Ban, ChevronDown, Eye, FileSpreadsheet, FileText, History, Printer, Signature } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import ExpenseClaimPreview from '../features/expense-claim/ExpenseClaimPreview'
import { getSubmission, incrementPrint, signDocument } from '../data/submissions'
import { notifySigned } from '../data/notify'
import { getFormSettings } from '../data/formSettings'
import { adoptDocumentWht } from '../features/expense-claim/calc'
import { getCompany } from '../data/companies'
import type { Submission, FormSettings, Company } from '../types/schema'
import AttachmentsField from '../components/AttachmentsField'
import { Spinner } from '../components/Spinner'
import { PageHeader, ui } from '../components/ui'
import { formatDate, formatDateTime } from '../shared/date'
import { roundLabel } from '../components/OlderVersionRow'
import { dbErrorMessage } from '../shared/dbError'
import { saveFile } from '../shared/saveFile'
import { uiAlert, uiConfirm } from '../components/dialog/dialogService'
import { loadChunk } from '../shared/loadChunk'

export default function SubmissionPreviewPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { profile } = useAuth()
  const [sub, setSub] = useState<Submission | null>(null)
  const [settings, setSettings] = useState<FormSettings | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [exporting, setExporting] = useState(false)
  const [signing, setSigning] = useState<string | null>(null)
  // The rounds this one corrects, newest first: R1's original, R2's R1 and original …
  const [older, setOlder] = useState<Submission[]>([])

  function load() {
    if (!id) return
    getSubmission(id).then(async s => {
      if (!s) return
      const fs = await getFormSettings(s.formType)
      // saved before its form worked withholding out in the table: lines take the document's rate
      setSub({ ...s, items: adoptDocumentWht(fs.columns, s.header, s.items) })
      setSettings(fs)
      if (s.header.companyId) setCompany(await getCompany(s.header.companyId))
    })
  }
  useEffect(load, [id])
  // Follow "replaces" back to the original. A round that cannot be read (no
  // right to it, or gone) ends the walk; ten is far more than anyone corrects.
  useEffect(() => {
    let alive = true
    setOlder([])
    ;(async () => {
      const found: Submission[] = []
      let next = sub?.replaces?.id
      while (next && found.length < 10) {
        const o = await getSubmission(next).catch(() => null)
        if (!o) break
        found.push(o)
        next = o.replaces?.id
      }
      if (alive) setOlder(found)
    })()
    return () => { alive = false }
  }, [sub?.id, sub?.replaces?.id])

  // Opened from the mail "มีเอกสารรอเซ็น": sign right here, after reading it.
  async function onSign(blockId: string, blockLabel: string) {
    if (!sub || signing) return
    if (!(await uiConfirm('ลายเซ็นของคุณจะถูกแปะลงเอกสาร', { title: `เซ็นช่อง "${blockLabel}" ของเอกสาร ${sub.docNumber} ?`, confirmText: 'เซ็น' }))) return
    setSigning(blockId)
    try {
      await signDocument(sub.id, blockId)
    } catch (e) {
      uiAlert('เซ็นไม่สำเร็จ: ' + dbErrorMessage(e))
      setSigning(null)
      return
    }
    void notifySigned(sub.id, blockId) // the requester is told by email, best effort
    setSigning(null)
    load()
    uiAlert('เซ็นเอกสารแล้ว', { tone: 'success' })
  }

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
  // The lines this document is waiting on the viewer for.
  const myLines = sub.voided ? [] : (sub.signatures ?? []).filter(x => x.assignedUid === profile?.uid && x.status === 'pending')

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
      {myLines.length > 0 && (
        <div className="no-print mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-clay-200 bg-clay-50 px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-clay-600 text-white"><Signature size={18} /></span>
          <span className="min-w-0 flex-1 text-sm font-medium text-clay-800">เอกสารนี้รอคุณเซ็น</span>
          {profile?.signatureImage
            ? myLines.map(l => (
                <button key={l.blockId} type="button" disabled={!!signing} onClick={() => onSign(l.blockId, l.blockLabel)} className={ui.btnPrimary}>
                  {signing === l.blockId ? <Spinner size={16} /> : <Signature size={16} />} เซ็นช่อง {l.blockLabel}
                </button>
              ))
            : <Link to="/profile" className={ui.btnSecondary}>อัปโหลดลายเซ็นก่อนเซ็น</Link>}
        </div>
      )}
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

      {/* The rounds before this correction, each openable in full — with the
          cancelled watermark, so none of them can pass for the live one. Screen only. */}
      {older.length > 0 && (
        <section className="no-print mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-stone-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-clay-100 text-clay-700"><History size={16} /></span>
            ฉบับก่อนแก้ไข <span className="text-sm font-normal text-stone-500">{older.length} ฉบับ</span>
          </h2>
          <div className="space-y-3">
            {older.map(o => (
              <details key={o.id} className="group/old overflow-hidden rounded-2xl border border-stone-200/70 bg-white">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm hover:bg-clay-50/40">
                  <ChevronDown size={16} className="shrink-0 text-stone-400 transition-transform group-open/old:rotate-180" />
                  <span className="rounded-md bg-white px-1.5 py-0.5 text-xs font-medium text-clay-700 ring-1 ring-clay-200">{roundLabel(o.docNumber)}</span>
                  <span className="font-mono text-[13px] text-stone-500 line-through decoration-stone-400">{o.docNumber}</span>
                  <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-xs font-medium text-brick-700">ไม่ได้ใช้แล้ว</span>
                  <span className="text-xs text-stone-500">{formatDate(o.createdAt)}</span>
                  {o.voided?.reason && <span className="min-w-0 max-w-[28rem] truncate text-xs text-stone-500" title={o.voided.reason}>เหตุผลที่แก้: {o.voided.reason}</span>}
                </summary>
                <div className="border-t border-stone-100 bg-stone-50/60 p-4">
                  <ExpenseClaimPreview company={company} header={o.header} items={adoptDocumentWht(settings.columns, o.header, o.items)} docNumber={o.docNumber} settings={settings} signatures={o.signatures} voided replacedBy={o.voided?.replacedByNumber ?? sub.docNumber} createdAt={o.createdAt} />
                </div>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
