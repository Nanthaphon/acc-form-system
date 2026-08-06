import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { listMySubmissions, submissionAmount, deleteSubmission, subStatus, statusMeta } from '../../data/submissions'
import type { Submission } from '../../types/schema'

export default function HistoryPage() {
  const { profile } = useAuth()
  const [rows, setRows] = useState<Submission[]>([])
  function load() { if (profile) listMySubmissions(profile.uid).then(setRows) }
  useEffect(() => { load() }, [profile])

  async function onDelete(r: Submission) {
    if (!confirm(`ลบเอกสาร "${r.docNumber || 'ไม่มีเลขที่'}" ?\nลบถาวร ยกเลิกไม่ได้`)) return
    try { await deleteSubmission(r.id); load() }
    catch { alert('ลบเอกสารไม่สำเร็จ') }
  }
  return (
    <div>
      <h1 className="mb-4 text-xl font-medium">ประวัติเอกสารของฉัน</h1>
      <table className="w-full border text-sm">
        <thead className="bg-gray-50"><tr>{['เลขที่','วันที่','ยอดสุทธิ','พิมพ์แล้ว(ครั้ง)','สถานะ',''].map(h => <th key={h} className="border px-2 py-1">{h}</th>)}</tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td className="border px-2 py-1">{r.docNumber}</td>
              <td className="border px-2 py-1">{new Date(r.createdAt).toLocaleDateString('th-TH')}</td>
              <td className="border px-2 py-1 text-right">{submissionAmount(r).toLocaleString()}</td>
              <td className="border px-2 py-1 text-center">{r.printCount}</td>
              <td className="border px-2 py-1 text-center">
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusMeta(subStatus(r)).className}`}>{statusMeta(subStatus(r)).label}</span>
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
