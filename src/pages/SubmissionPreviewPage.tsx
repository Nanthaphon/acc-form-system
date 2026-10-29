import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Ban, Eye, FileText, Printer } from 'lucide-react'
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

export default function SubmissionPreviewPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { profile } = useAuth()
  const [sub, setSub] = useState<Submission | null>(null)
  const [settings, setSettings] = useState<FormSettings | null>(null)
  const [company, setCompany] = useState<Company | null>(null)

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

  if (!sub || !settings) return (
    <div className="flex items-center gap-2 p-4 text-sm text-stone-500"><Spinner size={16} /> กำลังโหลด...</div>
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
            ? <button type="button" onClick={onPrint} className={ui.btnPrimary}><Printer size={16} /> พิมพ์ / บันทึก PDF</button>
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
      <ExpenseClaimPreview company={company} header={sub.header} items={sub.items} docNumber={sub.docNumber} settings={settings} signatures={sub.signatures} voided={!!sub.voided} />
    </div>
  )
}
