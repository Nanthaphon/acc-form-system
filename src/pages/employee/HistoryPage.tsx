import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { listMySubmissions, submissionAmount } from '../../data/submissions'
import type { Submission } from '../../types/schema'

export default function HistoryPage() {
  const { profile } = useAuth()
  const [rows, setRows] = useState<Submission[]>([])
  useEffect(() => { if (profile) listMySubmissions(profile.uid).then(setRows) }, [profile])
  return (
    <div>
      <h1 className="mb-4 text-xl font-medium">ประวัติเอกสารของฉัน</h1>
      <table className="w-full border text-sm">
        <thead className="bg-gray-50"><tr>{['เลขที่','วันที่','ยอดสุทธิ','พิมพ์แล้ว(ครั้ง)',''].map(h => <th key={h} className="border px-2 py-1">{h}</th>)}</tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td className="border px-2 py-1">{r.docNumber}</td>
              <td className="border px-2 py-1">{new Date(r.createdAt).toLocaleDateString('th-TH')}</td>
              <td className="border px-2 py-1 text-right">{submissionAmount(r).toLocaleString()}</td>
              <td className="border px-2 py-1 text-center">{r.printCount}</td>
              <td className="border px-2 py-1 whitespace-nowrap">
                <Link className="text-blue-600 hover:underline" to={`/submission/${r.id}`}>แก้ไข</Link>
                <span className="mx-1.5 text-gray-300">|</span>
                <Link className="text-green-700 hover:underline" to={`/submission/${r.id}/preview`}>พิมพ์</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
