import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listAllSubmissions, submissionAmount, deleteSubmission, subStatus, statusMeta } from '../../data/submissions'
import { getVersionCounts, editLabel } from '../../data/versions'
import { listEmployees } from '../../data/users'
import { listForms } from '../../data/formSettings'
import type { Submission, UserProfile, FormSettings } from '../../types/schema'
import { formatDate, formatDateTime } from '../../shared/date'

export default function PrintHistoryPage() {
  const [rows, setRows] = useState<Submission[]>([])
  const [employees, setEmployees] = useState<UserProfile[]>([])
  const [forms, setForms] = useState<FormSettings[]>([])
  const [emp, setEmp] = useState('') // filter by employeeId; '' = all
  const [vcounts, setVcounts] = useState<Record<string, number>>({})

  function loadRows() { listAllSubmissions().then(setRows) }
  useEffect(() => {
    loadRows()
    listEmployees().then(setEmployees)
    listForms().then(setForms)
    getVersionCounts().then(setVcounts)
  }, [])

  async function onDelete(r: Submission) {
    if (!confirm(`ลบเอกสาร "${r.docNumber || 'ไม่มีเลขที่'}" ?\nลบถาวร ยกเลิกไม่ได้`)) return
    try { await deleteSubmission(r.id); loadRows() }
    catch { alert('ลบเอกสารไม่สำเร็จ') }
  }

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
            <tr>{['เลขที่', 'พนักงาน', 'ฟอร์ม', 'วันที่', 'ยอด', 'สถานะ', 'แก้ไข', 'พิมพ์ (ครั้ง)', 'พิมพ์ล่าสุด', ''].map(h => (
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
                <td className="border px-2 py-1 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                <td className="border px-2 py-1 text-right">{submissionAmount(r).toLocaleString()}</td>
                <td className="border px-2 py-1 text-center">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusMeta(subStatus(r)).className}`}>{statusMeta(subStatus(r)).label}</span>
                </td>
                <td className="border px-2 py-1 whitespace-nowrap text-center">
                  {editLabel(r, vcounts)
                    ? <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">✎ {editLabel(r, vcounts)}</span>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="border px-2 py-1 text-center">{r.printCount}</td>
                <td className="border px-2 py-1 whitespace-nowrap">{formatDateTime(r.lastPrintedAt)}</td>
                <td className="border px-2 py-1 whitespace-nowrap text-center">
                  <Link className="text-blue-600 hover:underline" to={`/submission/${r.id}`}>แก้ไข</Link>
                  <span className="mx-1.5 text-gray-300">|</span>
                  <Link className="text-green-700 hover:underline" to={`/submission/${r.id}/preview`}>พิมพ์</Link>
                  <span className="mx-1.5 text-gray-300">|</span>
                  <button className="text-red-600 hover:underline" onClick={() => onDelete(r)}>ลบ</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="border px-2 py-6 text-center text-gray-400">ยังไม่มีเอกสาร</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
