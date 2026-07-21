import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listEmployees } from '../../data/users'
import type { UserProfile } from '../../types/schema'

export default function EmployeeListPage() {
  const [rows, setRows] = useState<UserProfile[]>([])
  const [q, setQ] = useState('')
  useEffect(() => { listEmployees().then(setRows) }, [])
  const filtered = rows.filter(r => (r.employeeId + r.firstName + r.lastName).includes(q))
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-xl font-medium">พนักงาน</h1>
        <input className="rounded border px-2 py-1" placeholder="ค้นหา" value={q} onChange={e => setQ(e.target.value)} />
        <Link to="/admin/employees/new" className="ml-auto rounded bg-blue-600 px-3 py-1 text-white">+ เพิ่มพนักงาน</Link>
        <Link to="/admin/import" className="rounded border px-3 py-1">Import CSV</Link>
      </div>
      <table className="w-full border text-sm">
        <thead className="bg-gray-50"><tr>{['รหัส','ชื่อ-นามสกุล','ตำแหน่ง','แผนก','บริษัท','สิทธิ์'].map(h => <th key={h} className="border px-2 py-1">{h}</th>)}</tr></thead>
        <tbody>
          {filtered.map(r => (
            <tr key={r.uid}>
              <td className="border px-2 py-1">{r.employeeId}</td>
              <td className="border px-2 py-1">{r.firstName} {r.lastName}</td>
              <td className="border px-2 py-1">{r.position}</td>
              <td className="border px-2 py-1">{r.department}</td>
              <td className="border px-2 py-1">{r.companyId}</td>
              <td className="border px-2 py-1">{r.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
