import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProfileByUid } from '../../data/users'
import { listMySubmissions, submissionAmount } from '../../data/submissions'
import { listForms } from '../../data/formSettings'
import { listCompanies } from '../../data/companies'
import { downloadSubmissionPdf } from '../../features/expense-claim/printSubmission'
import type { UserProfile, Submission, FormSettings, Company } from '../../types/schema'

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium text-[#1f2a3d]">{value || '-'}</div>
    </div>
  )
}

export default function EmployeeDetailPage() {
  const { uid } = useParams()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [subs, setSubs] = useState<Submission[]>([])
  const [forms, setForms] = useState<FormSettings[]>([])
  const [companies, setCompanies] = useState<Company[]>([])

  useEffect(() => {
    if (!uid) return
    getProfileByUid(uid).then(setProfile)
    listMySubmissions(uid).then(setSubs)
    listForms().then(setForms)
    listCompanies().then(setCompanies)
  }, [uid])

  const formName = (ft: string) => {
    const f = forms.find(x => x.formType === ft)
    return f?.name || f?.title || ft
  }
  const companyName = (id: string) => companies.find(c => c.id === id)?.name || id

  if (!profile) return <div className="p-4 text-gray-500">กำลังโหลด...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/employees" className="rounded border px-3 py-1.5 text-sm hover:border-blue-500 hover:text-blue-600">← กลับ</Link>
        <h1 className="text-xl font-medium">ข้อมูลพนักงาน</h1>
        <Link to={`/admin/employees/${profile.uid}/edit`} className="ml-auto rounded bg-blue-600 px-3 py-1.5 text-sm text-white">แก้ไขข้อมูล</Link>
      </div>

      <div className="rounded-2xl border border-[#e5eaf3] bg-white p-6">
        <div className="grid grid-cols-2 gap-5 text-sm md:grid-cols-3">
          <Info label="รหัสพนักงาน" value={profile.employeeId} />
          <Info label="ชื่อ-นามสกุล" value={`${profile.firstName} ${profile.lastName}`} />
          <Info label="ตำแหน่ง" value={profile.position} />
          <Info label="แผนก" value={profile.department} />
          <Info label="บริษัท" value={companyName(profile.companyId)} />
          <Info label="Job" value={profile.defaultJob} />
          <Info label="เลขบัญชี" value={profile.bankAccount} />
          <Info label="สิทธิ์" value={profile.role} />
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-[#16233f]">เอกสารที่พิมพ์ ({subs.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full border text-sm">
            <thead className="bg-gray-50">
              <tr>{['เลขที่', 'ฟอร์ม', 'วันที่', 'ยอด', 'พิมพ์ (ครั้ง)', 'พิมพ์ล่าสุด', ''].map(h => (
                <th key={h} className="border px-2 py-1 whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {subs.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="border px-2 py-1 whitespace-nowrap">{r.docNumber}</td>
                  <td className="border px-2 py-1">{formName(r.formType)}</td>
                  <td className="border px-2 py-1 whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString('th-TH')}</td>
                  <td className="border px-2 py-1 text-right">{submissionAmount(r).toLocaleString()}</td>
                  <td className="border px-2 py-1 text-center">{r.printCount}</td>
                  <td className="border px-2 py-1 whitespace-nowrap">{r.lastPrintedAt ? new Date(r.lastPrintedAt).toLocaleString('th-TH') : '-'}</td>
                  <td className="border px-2 py-1 whitespace-nowrap text-center">
                    <Link className="text-blue-600 hover:underline" to={`/submission/${r.id}`}>ดู</Link>
                    <span className="mx-1.5 text-gray-300">|</span>
                    <button className="text-green-700 hover:underline" onClick={() => downloadSubmissionPdf(r)}>พิมพ์</button>
                  </td>
                </tr>
              ))}
              {subs.length === 0 && (
                <tr><td colSpan={7} className="border px-2 py-6 text-center text-gray-400">ยังไม่มีเอกสาร</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
