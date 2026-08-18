import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { listMySubmissions, submissionAmount, deleteSubmission, subStatus, statusMeta } from '../../data/submissions'
import { getVersionCounts, editLabel } from '../../data/versions'
import { listForms } from '../../data/formSettings'
import type { Submission, FormSettings } from '../../types/schema'
import { formatDate } from '../../shared/date'
import type { Filters } from '../../shared/submissionFilter'
import { emptyFilters, applyFilters } from '../../shared/submissionFilter'
import SubmissionFilterBar from '../../components/SubmissionFilterBar'

export default function HistoryPage() {
  const { profile } = useAuth()
  const [rows, setRows] = useState<Submission[]>([])
  const [forms, setForms] = useState<FormSettings[]>([])
  const [vcounts, setVcounts] = useState<Record<string, number>>({})
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  function load() { if (profile) listMySubmissions(profile.uid).then(setRows) }
  useEffect(() => { load(); getVersionCounts().then(setVcounts) }, [profile])
  useEffect(() => { listForms().then(setForms) }, [])

  const myName = () => profile ? `${profile.firstName} ${profile.lastName}` : ''
  const filtered = applyFilters(rows, filters, myName)

  async function onDelete(r: Submission) {
    if (!confirm(`ลบเอกสาร "${r.docNumber || 'ไม่มีเลขที่'}" ?\nลบถาวร ยกเลิกไม่ได้`)) return
    try { await deleteSubmission(r.id); load() }
    catch { alert('ลบเอกสารไม่สำเร็จ') }
  }
  return (
    <div>
      <div className="mb-4 space-y-3">
        <h1 className="text-xl font-medium">ประวัติเอกสารของฉัน</h1>
        <SubmissionFilterBar value={filters} onChange={setFilters} forms={forms} resultCount={filtered.length} />
      </div>
      <table className="w-full border text-sm">
        <thead className="bg-gray-50"><tr>{['เลขที่','วันที่','ยอดสุทธิ','พิมพ์แล้ว(ครั้ง)','สถานะ','แก้ไข',''].map(h => <th key={h} className="border px-2 py-1">{h}</th>)}</tr></thead>
        <tbody>
          {filtered.map(r => (
            <tr key={r.id}>
              <td className="border px-2 py-1">{r.docNumber}</td>
              <td className="border px-2 py-1">{formatDate(r.createdAt)}</td>
              <td className="border px-2 py-1 text-right">{submissionAmount(r).toLocaleString()}</td>
              <td className="border px-2 py-1 text-center">{r.printCount}</td>
              <td className="border px-2 py-1 text-center">
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusMeta(subStatus(r)).className}`}>{statusMeta(subStatus(r)).label}</span>
              </td>
              <td className="border px-2 py-1 whitespace-nowrap text-center">
                {editLabel(r, vcounts)
                  ? <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">✎ {editLabel(r, vcounts)}</span>
                  : <span className="text-gray-300">—</span>}
              </td>
              <td className="border px-2 py-1 whitespace-nowrap">
                <Link className="text-blue-600 hover:underline" to={`/submission/${r.id}`}>แก้ไข</Link>
                <span className="mx-1.5 text-gray-300">|</span>
                <Link className="text-green-700 hover:underline" to={`/submission/${r.id}/preview`}>พิมพ์</Link>
                <span className="mx-1.5 text-gray-300">|</span>
                <button className="text-red-600 hover:underline" onClick={() => onDelete(r)}>ลบ</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
