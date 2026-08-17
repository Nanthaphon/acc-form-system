import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { pdf } from '@react-pdf/renderer'
import { ArrowLeft, Download, Printer, Receipt, Save, PenLine } from 'lucide-react'
import { useAuth } from '../../auth/AuthProvider'
import type { ExpenseHeader, ExpenseRow, ExpenseTotals, Company, FormSettings, SubmissionStatus } from '../../types/schema'
import { emptyRow, EXPENSE_CLAIM_DEFAULTS } from '../../types/schema'
import { computeColumnTotals, grandTotal, bahtTextForRows } from '../../features/expense-claim/calc'
import ExpenseClaimForm from '../../features/expense-claim/ExpenseClaimForm'
import ExpenseClaimPreview from '../../features/expense-claim/ExpenseClaimPreview'
import { ExpenseClaimPdf } from '../../features/expense-claim/ExpenseClaimPdf'
import { createSubmission, updateSubmission, getSubmission, incrementPrint, requestApproval, subStatus, statusMeta } from '../../data/submissions'
import { getCompany, listCompanies } from '../../data/companies'
import { getFormSettings } from '../../data/formSettings'
import { formatDateTime } from '../../shared/date'

export default function FormPage() {
  const { id, formType } = useParams()
  const { profile } = useAuth()
  const nav = useNavigate()
  const [company, setCompany] = useState<Company | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [settings, setSettings] = useState<FormSettings>(EXPENSE_CLAIM_DEFAULTS)
  const [docNumber, setDocNumber] = useState('(ยังไม่บันทึก)')
  const [savedId, setSavedId] = useState<string | null>(id ?? null)
  const [showPreview, setShowPreview] = useState(false)
  const [status, setStatus] = useState<SubmissionStatus>('draft')
  const [rejectReason, setRejectReason] = useState<string | null>(null)
  const [approval, setApproval] = useState<{ name?: string | null; signature?: string | null; at?: number | null } | undefined>(undefined)
  const [header, setHeader] = useState<ExpenseHeader>({
    subject: 'ขออนุมัติเบิกค่าใช้จ่าย', categories: [], companyId: profile?.companyId ?? '',
    firstName: profile?.firstName ?? '', lastName: profile?.lastName ?? '',
    position: profile?.position ?? '', job: profile?.defaultJob ?? '',
  })
  const [items, setItems] = useState<ExpenseRow[]>([emptyRow(EXPENSE_CLAIM_DEFAULTS.columns)])

  function buildTotals(): ExpenseTotals {
    return {
      columnTotals: computeColumnTotals(settings.columns, items),
      grandTotal: grandTotal(settings.columns, items),
      amountInThaiText: bahtTextForRows(settings.columns, items),
    }
  }

  useEffect(() => { // EDIT mode: load existing submission + its form settings
    if (!id) return
    getSubmission(id).then(s => {
      if (!s) return
      setHeader(s.header); setItems(s.items); setDocNumber(s.docNumber); setSavedId(s.id)
      setStatus(subStatus(s)); setRejectReason(s.rejectReason ?? null)
      setApproval(s.approverSignature || s.approvedByName
        ? { name: s.approvedByName, signature: s.approverSignature, at: s.approvedAt } : undefined)
      getFormSettings(s.formType).then(setSettings)
    })
  }, [id])
  useEffect(() => { // NEW mode: load the form settings for this formType
    if (id || !formType) return
    getFormSettings(formType).then(fs => { setSettings(fs); setItems([emptyRow(fs.columns)]) })
  }, [id, formType])
  useEffect(() => { if (header.companyId) getCompany(header.companyId).then(setCompany) }, [header.companyId])
  useEffect(() => { listCompanies().then(setCompanies) }, [])

  async function save() {
    const totals = buildTotals()
    const hasAmount = totals.grandTotal > 0
    if (!hasAmount) {
      alert('กรุณากรอกรายการอย่างน้อย 1 รายการ (วันทำงาน x วันละ ต้องมากกว่า 0)')
      return
    }
    if (!header.firstName.trim() || !header.lastName.trim() || !header.position.trim()) {
      alert('กรุณากรอกชื่อ นามสกุล และตำแหน่งให้ครบถ้วน')
      return
    }
    try {
      if (savedId) {
        const existing = await getSubmission(savedId)
        if (existing) await updateSubmission(savedId, { ...existing, header, items, totals })
      } else {
        const created = await createSubmission({
          formType: settings.formType, header, items, totals,
          createdBy: profile!.uid, createdByEmployeeId: profile!.employeeId,
        }, settings.formCode || settings.formType)
        setSavedId(created.id); setDocNumber(created.docNumber)
      }
      alert('บันทึกแล้ว')
    } catch {
      alert('บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    }
  }

  async function downloadPdf() {
    const blob = await pdf(<ExpenseClaimPdf company={company} header={header} items={items} docNumber={docNumber} settings={settings} />).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${docNumber}.pdf`; a.click()
  }
  async function print() {
    if (savedId) await incrementPrint(savedId)
    window.print()
  }

  async function askApproval() {
    if (!savedId) { alert('กรุณาบันทึกเอกสารก่อนขออนุมัติ'); return }
    if (!profile?.departmentId) { alert('บัญชีคุณยังไม่ได้กำหนดแผนก — แจ้งแอดมินให้ตั้งแผนกก่อน'); return }
    if (!confirm('ส่งเอกสารนี้ให้หัวหน้าอนุมัติ?\nหลังส่งจะแก้ไขไม่ได้จนกว่าจะถูกตีกลับ')) return
    try {
      await requestApproval(savedId)
      setStatus('pending'); setRejectReason(null)
      alert('ส่งขออนุมัติแล้ว — รอหัวหน้าเซ็น')
    } catch {
      alert('ส่งขออนุมัติไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    }
  }

  const isAdmin = profile?.role === 'admin'
  const locked = status === 'pending' || status === 'approved'
  const showDoc = showPreview || locked
  const canRequest = !!savedId && (status === 'draft' || status === 'rejected')

  // A closed form (maintenance) is not accessible to employees via direct URL.
  if (!id && settings.active === false && !isAdmin) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center">
        <div className="text-lg font-semibold text-gray-900">ฟอร์มนี้ปิดปรับปรุงชั่วคราว</div>
        <div className="mt-2 text-sm text-gray-500">กรุณากลับมาใหม่ภายหลัง</div>
        <button onClick={() => nav('/')} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">กลับหน้าหลัก</button>
      </div>
    )
  }

  return (
    <div>
      <div className="no-print space-y-4">
        <div className="mb-2 flex items-center gap-3">
          <button
            onClick={() => nav(settings.groupId ? `/group/${settings.groupId}` : '/')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:border-gray-300 hover:text-gray-900"
          >
            <ArrowLeft size={16} /> กลับ
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-500"><Receipt size={20} /></div>
          <h1 className="text-xl font-semibold text-gray-900">{settings.name || settings.title}</h1>
          {!locked && (
            <button
              className="ml-auto inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300 hover:text-gray-900"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? 'แก้ไข' : 'ดูตัวอย่าง'}
            </button>
          )}
        </div>
        {savedId && status !== 'draft' && (
          <div className={`rounded-lg px-4 py-3 text-sm ${statusMeta(status).className}`}>
            <span className="font-semibold">สถานะ: {statusMeta(status).label}</span>
            {status === 'pending' && ' · รอหัวหน้าเซ็น — แก้ไขไม่ได้จนกว่าจะถูกตีกลับ (พิมพ์/ดาวน์โหลดได้)'}
            {status === 'approved' && approval?.name && ` · อนุมัติโดย ${approval.name}${approval.at ? ` เมื่อ ${formatDateTime(approval.at)}` : ''}`}
            {status === 'rejected' && rejectReason && ` · เหตุผล: ${rejectReason}`}
          </div>
        )}
        {!showDoc && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <label className="mb-1.5 block text-xs font-medium text-gray-500">บริษัท</label>
            <select
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
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
        {!showDoc && <ExpenseClaimForm header={header} items={items} onHeaderChange={setHeader} onItemsChange={setItems} columns={settings.columns} categories={settings.categories} />}
      </div>
      <div className={showDoc ? '' : 'hidden print:block'}>
        <ExpenseClaimPreview company={company} header={header} items={items} docNumber={docNumber} settings={settings} approval={approval} />
      </div>
      <div className="no-print mt-4 flex flex-wrap gap-2.5">
        {!locked && (
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            onClick={save}
          >
            <Save size={16} /> บันทึก
          </button>
        )}
        {canRequest && (
          <button
            className="inline-flex items-center gap-2 rounded-lg border-[1.5px] border-blue-600 bg-white px-5 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
            onClick={askApproval}
          >
            <PenLine size={16} /> ขอลายเซ็นอนุมัติ
          </button>
        )}
        <button
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-300 hover:text-gray-900"
          onClick={downloadPdf}
        >
          <Download size={16} /> ดาวน์โหลด PDF
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-300 hover:text-gray-900"
          onClick={print}
        >
          <Printer size={16} /> สั่งพิมพ์
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-800"
          onClick={() => nav('/history')}
        >
          ไปหน้าประวัติ
        </button>
      </div>
    </div>
  )
}
