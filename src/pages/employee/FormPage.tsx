import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { pdf } from '@react-pdf/renderer'
import { useAuth } from '../../auth/AuthProvider'
import type { ExpenseHeader, ExpenseItem, Company, FormSettings } from '../../types/schema'
import { emptyItem, EXPENSE_CLAIM_DEFAULTS } from '../../types/schema'
import { computeTotals } from '../../features/expense-claim/calc'
import ExpenseClaimForm from '../../features/expense-claim/ExpenseClaimForm'
import ExpenseClaimPreview from '../../features/expense-claim/ExpenseClaimPreview'
import { ExpenseClaimPdf } from '../../features/expense-claim/ExpenseClaimPdf'
import { createSubmission, updateSubmission, getSubmission, incrementPrint } from '../../data/submissions'
import { getCompany } from '../../data/companies'
import { getFormSettings } from '../../data/formSettings'

export default function FormPage() {
  const { id } = useParams()
  const { profile } = useAuth()
  const nav = useNavigate()
  const [company, setCompany] = useState<Company | null>(null)
  const [settings, setSettings] = useState<FormSettings>(EXPENSE_CLAIM_DEFAULTS)
  const [docNumber, setDocNumber] = useState('(ยังไม่บันทึก)')
  const [savedId, setSavedId] = useState<string | null>(id ?? null)
  const [showPreview, setShowPreview] = useState(false)
  const [header, setHeader] = useState<ExpenseHeader>({
    subject: 'ขออนุมัติเบิกค่าใช้จ่าย', categories: [], companyId: profile?.companyId ?? '',
    firstName: profile?.firstName ?? '', lastName: profile?.lastName ?? '',
    position: profile?.position ?? '', job: profile?.defaultJob ?? '',
  })
  const [items, setItems] = useState<ExpenseItem[]>([emptyItem()])

  useEffect(() => { // โหลดใบเดิมกรณีแก้ไข
    if (id) getSubmission(id).then(s => {
      if (s) { setHeader(s.header); setItems(s.items); setDocNumber(s.docNumber); setSavedId(s.id) }
    })
  }, [id])
  useEffect(() => { if (header.companyId) getCompany(header.companyId).then(setCompany) }, [header.companyId])
  useEffect(() => { getFormSettings('expense-claim').then(setSettings) }, [])

  async function save() {
    const totals = computeTotals(items)
    const hasAmount = totals.totalBefore > 0
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
          formType: 'expense-claim', header, items, totals,
          createdBy: profile!.uid, createdByEmployeeId: profile!.employeeId,
        })
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

  return (
    <div>
      <div className="no-print space-y-4">
        <div className="mb-2 flex items-center gap-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-[#eaf0ff] text-xl text-[#2b5bd7]">🧾</div>
          <div>
            <h1 className="text-xl font-semibold text-[#1f2a3d]">ใบเบิกค่าใช้จ่าย</h1>
            <div className="text-[13px] text-[#7a869a]">กรอกรายการที่ต้องการเบิก · ระบบคำนวณให้อัตโนมัติ</div>
          </div>
          <span className="ml-auto rounded-[10px] bg-[#eaf0ff] px-3.5 py-2 text-[13px] font-semibold text-[#1e46b0]">{docNumber}</span>
          <button
            className="inline-flex items-center gap-2 rounded-[11px] border-[1.5px] border-[#e5eaf3] bg-white px-4 py-2 text-sm font-medium text-[#1f2a3d] hover:border-[#2b5bd7] hover:text-[#2b5bd7]"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? 'แก้ไข' : 'ดูตัวอย่าง'}
          </button>
        </div>
        {!showPreview && <ExpenseClaimForm header={header} items={items} onHeaderChange={setHeader} onItemsChange={setItems} categories={settings.categories} />}
        <div className="flex flex-wrap gap-3">
          <button
            className="inline-flex items-center gap-2 rounded-[11px] bg-[#2b5bd7] px-5 py-3 text-sm font-medium text-white shadow-[0_6px_16px_rgba(43,91,215,0.28)] hover:bg-[#1e46b0]"
            onClick={save}
          >
            💾 บันทึก
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-[11px] border-[1.5px] border-[#e5eaf3] bg-white px-5 py-3 text-sm font-medium text-[#1f2a3d] hover:border-[#2b5bd7] hover:text-[#2b5bd7]"
            onClick={downloadPdf}
          >
            📄 ดาวน์โหลด PDF
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-[11px] border-[1.5px] border-[#e5eaf3] bg-white px-5 py-3 text-sm font-medium text-[#1f2a3d] hover:border-[#2b5bd7] hover:text-[#2b5bd7]"
            onClick={print}
          >
            🖨️ สั่งพิมพ์
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-[11px] border-[1.5px] border-[#e5eaf3] bg-white px-5 py-3 text-sm font-medium text-[#1f2a3d] hover:border-[#2b5bd7] hover:text-[#2b5bd7]"
            onClick={() => nav('/history')}
          >
            ไปหน้าประวัติ
          </button>
        </div>
      </div>
      <div className={showPreview ? '' : 'hidden print:block'}>
        <ExpenseClaimPreview company={company} header={header} items={items} docNumber={docNumber} settings={settings} />
      </div>
    </div>
  )
}
