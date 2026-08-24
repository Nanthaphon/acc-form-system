import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Eye, Printer } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import ExpenseClaimPreview from '../features/expense-claim/ExpenseClaimPreview'
import { getSubmission, incrementPrint } from '../data/submissions'
import { getFormSettings } from '../data/formSettings'
import { getCompany } from '../data/companies'
import type { Submission, FormSettings, Company } from '../types/schema'

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
      setSub(s)
      setSettings(await getFormSettings(s.formType))
      if (s.header.companyId) setCompany(await getCompany(s.header.companyId))
    })
  }, [id])

  async function onPrint() {
    if (sub) await incrementPrint(sub.id)
    window.print()
  }

  if (!sub || !settings) return <div className="p-4 text-gray-500">กำลังโหลด...</div>

  // Only the document owner or an admin can print; others (e.g. assigned signers) view only.
  const canPrint = profile?.role === 'admin' || sub.createdBy === profile?.uid

  return (
    <div>
      <div className="no-print mb-4 flex items-center gap-3">
        <button onClick={() => nav(-1)} className="inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-sm hover:border-blue-500 hover:text-blue-600"><ArrowLeft size={16} /> กลับ</button>
        <h1 className="text-lg font-medium">ดูตัวอย่าง — {sub.docNumber}</h1>
        {canPrint
          ? <button onClick={onPrint} className="ml-auto inline-flex items-center gap-1.5 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"><Printer size={16} /> สั่งพิมพ์</button>
          : <span className="ml-auto inline-flex items-center gap-1.5 rounded bg-gray-100 px-3 py-2 text-sm text-gray-500"><Eye size={16} /> ดูอย่างเดียว</span>}
      </div>
      <ExpenseClaimPreview company={company} header={sub.header} items={sub.items} docNumber={sub.docNumber} settings={settings} signatures={sub.signatures} />
    </div>
  )
}
