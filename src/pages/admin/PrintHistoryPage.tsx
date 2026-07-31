import { useEffect, useState } from 'react'
import { listAllSubmissions, submissionAmount } from '../../data/submissions'
import type { Submission } from '../../types/schema'

export default function PrintHistoryPage() {
  const [rows, setRows] = useState<Submission[]>([])
  const [emp, setEmp] = useState('')
  useEffect(() => { listAllSubmissions().then(setRows) }, [])
  const filtered = rows.filter(r => r.createdByEmployeeId.includes(emp))
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-xl font-medium">ประวัติการพิมพ์ทั้งหมด</h1>
        <input className="rounded border px-2 py-1" placeholder="กรองด้วยรหัสพนักงาน" value={emp} onChange={e => setEmp(e.target.value)} />
      </div>
      <table className="w-full border text-sm">
        <thead className="bg-gray-50"><tr>{['เลขที่','รหัสพนง.','วันที่สร้าง','ยอดสุทธิ','พิมพ์(ครั้ง)','พิมพ์ล่าสุด'].map(h => <th key={h} className="border px-2 py-1">{h}</th>)}</tr></thead>
        <tbody>
          {filtered.map(r => (
            <tr key={r.id}>
              <td className="border px-2 py-1">{r.docNumber}</td>
              <td className="border px-2 py-1">{r.createdByEmployeeId}</td>
              <td className="border px-2 py-1">{new Date(r.createdAt).toLocaleDateString('th-TH')}</td>
              <td className="border px-2 py-1 text-right">{submissionAmount(r).toLocaleString()}</td>
              <td className="border px-2 py-1 text-center">{r.printCount}</td>
              <td className="border px-2 py-1">{r.lastPrintedAt ? new Date(r.lastPrintedAt).toLocaleString('th-TH') : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
