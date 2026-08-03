import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ExpenseClaimPreview from '../features/expense-claim/ExpenseClaimPreview'
import { getSubmission, incrementPrint } from '../data/submissions'
import { getFormSettings } from '../data/formSettings'
import { getCompany } from '../data/companies'
import type { Submission, FormSettings, Company } from '../types/schema'

export default function SubmissionPreviewPage() {
  const { id } = useParams()
  const nav = useNavigate()
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

  return (
    <div>
      <div className="no-print mb-4 flex items-center gap-3">
        <button onClick={() => nav(-1)} className="rounded border px-3 py-1.5 text-sm hover:border-blue-500 hover:text-blue-600">← กลับ</button>
        <h1 className="text-lg font-medium">ดูตัวอย่าง — {sub.docNumber}</h1>
        <button onClick={onPrint} className="ml-auto rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700">🖨️ สั่งพิมพ์</button>
      </div>
      <ExpenseClaimPreview company={company} header={sub.header} items={sub.items} docNumber={sub.docNumber} settings={settings} />
    </div>
  )
}
