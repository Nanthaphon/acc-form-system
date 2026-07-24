import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { listMySubmissions } from '../../data/submissions'
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
              <td className="border px-2 py-1 text-right">{r.totals.totalNet.toLocaleString()}</td>
              <td className="border px-2 py-1 text-center">{r.printCount}</td>
              <td className="border px-2 py-1"><Link className="text-blue-600" to={`/form/${r.id}`}>แก้ไข / พิมพ์ใหม่</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
