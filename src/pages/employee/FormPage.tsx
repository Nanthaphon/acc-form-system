import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { pdf } from '@react-pdf/renderer'
import { useAuth } from '../../auth/AuthProvider'
import type { ExpenseHeader, ExpenseItem, Company } from '../../types/schema'
import { emptyItem } from '../../types/schema'
import { computeTotals } from '../../features/expense-claim/calc'
import ExpenseClaimForm from '../../features/expense-claim/ExpenseClaimForm'
import ExpenseClaimPreview from '../../features/expense-claim/ExpenseClaimPreview'
import { ExpenseClaimPdf } from '../../features/expense-claim/ExpenseClaimPdf'
import { createSubmission, updateSubmission, getSubmission, incrementPrint } from '../../data/submissions'
import { getCompany } from '../../data/companies'

export default function FormPage() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const nav = useNavigate()
  const [company, setCompany] = useState<Company | null>(null)
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

  async function save() {
    const totals = computeTotals(items)
    if (savedId) {
      const existing = await getSubmission(savedId)
      if (existing) await updateSubmission(savedId, { ...existing, header, items, totals })
    } else {
      const created = await createSubmission({
        formType: 'expense-claim', header, items, totals,
        createdBy: user!.uid, createdByEmployeeId: profile!.employeeId,
      })
      setSavedId(created.id); setDocNumber(created.docNumber)
    }
    alert('บันทึกแล้ว')
  }

  async function downloadPdf() {
    const blob = await pdf(<ExpenseClaimPdf company={company} header={header} items={items} docNumber={docNumber} />).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${docNumber}.pdf`; a.click()
    if (savedId) await incrementPrint(savedId)
  }
  async function print() {
    if (savedId) await incrementPrint(savedId)
    window.print()
  }

  return (
    <div>
      <div className="no-print space-y-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-medium">ใบเบิกค่าใช้จ่าย</h1>
          <span className="text-sm text-gray-500">{docNumber}</span>
          <button className="ml-auto rounded border px-3 py-1" onClick={() => setShowPreview(!showPreview)}>{showPreview ? 'แก้ไข' : 'ดูตัวอย่าง'}</button>
        </div>
        {!showPreview && <ExpenseClaimForm header={header} items={items} onHeaderChange={setHeader} onItemsChange={setItems} />}
        <div className="flex gap-2">
          <button className="rounded bg-blue-600 px-4 py-2 text-white" onClick={save}>บันทึก</button>
          <button className="rounded border px-4 py-2" onClick={downloadPdf}>ดาวน์โหลด PDF</button>
          <button className="rounded border px-4 py-2" onClick={print}>สั่งพิมพ์</button>
          <button className="rounded border px-4 py-2" onClick={() => nav('/history')}>ไปหน้าประวัติ</button>
        </div>
      </div>
      {(showPreview || true) && <ExpenseClaimPreview company={company} header={header} items={items} docNumber={docNumber} />}
    </div>
  )
}
