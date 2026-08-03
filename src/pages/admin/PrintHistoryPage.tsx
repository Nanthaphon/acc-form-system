import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listAllSubmissions, submissionAmount } from '../../data/submissions'
import { listEmployees } from '../../data/users'
import { listForms } from '../../data/formSettings'
import { downloadSubmissionPdf } from '../../features/expense-claim/printSubmission'
import type { Submission, UserProfile, FormSettings } from '../../types/schema'

export default function PrintHistoryPage() {
  const [rows, setRows] = useState<Submission[]>([])
  const [employees, setEmployees] = useState<UserProfile[]>([])
  const [forms, setForms] = useState<FormSettings[]>([])
  const [emp, setEmp] = useState('') // filter by employeeId; '' = all

  useEffect(() => {
    listAllSubmissions().then(setRows)
    listEmployees().then(setEmployees)
    listForms().then(setForms)
  }, [])

  const empName = (eid: string) => {
    const p = employees.find(e => e.employeeId === eid)
    return p ? `${p.firstName} ${p.lastName}` : ''
  }
  const formName = (ft: string) => {
    const f = forms.find(x => x.formType === ft)
    return f?.name || f?.title || ft
  }

  const filtered = emp ? rows.filter(r => r.createdByEmployeeId === emp) : rows

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-medium">ประวัติการพิมพ์ทั้งหมด</h1>
        <select className="rounded border px-2 py-1 text-sm" value={emp} onChange={e => setEmp(e.target.value)}>
          <option value="">— พนักงานทั้งหมด —</option>
          {employees.map(p => (
            <option key={p.uid} value={p.employeeId}>{p.employeeId} — {p.firstName} {p.lastName}</option>
          ))}
        </select>
        <span className="text-sm text-gray-500">{filtered.length} รายการ</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border text-sm">
          <thead className="bg-gray-50">
            <tr>{['เลขที่', 'พนักงาน', 'ฟอร์ม', 'วันที่', 'ยอด', 'พิมพ์ (ครั้ง)', 'พิมพ์ล่าสุด', ''].map(h => (
              <th key={h} className="border px-2 py-1 whitespace-nowrap">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="border px-2 py-1 whitespace-nowrap">{r.docNumber}</td>
                <td className="border px-2 py-1 whitespace-nowrap">
                  {empName(r.createdByEmployeeId)} <span className="text-gray-400">({r.createdByEmployeeId})</span>
                </td>
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
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="border px-2 py-6 text-center text-gray-400">ยังไม่มีเอกสาร</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
