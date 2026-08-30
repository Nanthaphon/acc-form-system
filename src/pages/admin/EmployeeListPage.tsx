import { uiAlert, uiConfirm } from '../../components/dialog/dialogService'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listEmployees, deleteEmployee } from '../../data/users'
import { useAuth } from '../../auth/AuthProvider'
import type { UserProfile } from '../../types/schema'

export default function EmployeeListPage() {
  const { profile } = useAuth()
  const [rows, setRows] = useState<UserProfile[]>([])
  const [q, setQ] = useState('')
  function load() { listEmployees().then(setRows) }
  useEffect(() => { load() }, [])
  const filtered = rows.filter(r => (r.employeeId + r.firstName + r.lastName).includes(q))

  async function onDelete(r: UserProfile) {
    if (!(await uiConfirm(`จะลบบัญชี login และประวัติทั้งหมดของคนนี้อย่างถาวร`, { title: `ลบพนักงาน "${r.firstName} ${r.lastName}" (${r.employeeId}) ?`, tone: 'danger', confirmText: 'ลบ' }))) return
    try {
      await deleteEmployee(r.uid)
      load()
    } catch (err: any) {
      uiAlert('ลบไม่สำเร็จ: ' + (err?.message || 'เกิดข้อผิดพลาด'))
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-xl font-medium">พนักงาน</h1>
        <input className="rounded border px-2 py-1" placeholder="ค้นหา" value={q} onChange={e => setQ(e.target.value)} />
        <Link to="/admin/employees/new" className="ml-auto rounded bg-blue-600 px-3 py-1 text-white">+ เพิ่มพนักงาน</Link>
        <Link to="/admin/import" className="rounded border px-3 py-1">Import CSV</Link>
      </div>
      <table className="w-full border text-sm">
        <thead className="bg-gray-50"><tr>{['รหัส', 'ชื่อ-นามสกุล', 'ตำแหน่ง', 'แผนก', 'บริษัท', 'สิทธิ์', ''].map(h => <th key={h} className="border px-2 py-1">{h}</th>)}</tr></thead>
        <tbody>
          {filtered.map(r => (
            <tr key={r.uid}>
              <td className="border px-2 py-1">{r.employeeId}</td>
              <td className="border px-2 py-1"><Link to={`/admin/employees/${r.uid}`} className="text-blue-600 hover:underline">{r.firstName} {r.lastName}</Link></td>
              <td className="border px-2 py-1">{r.position}</td>
              <td className="border px-2 py-1">{r.department}</td>
              <td className="border px-2 py-1">{r.companyId}</td>
              <td className="border px-2 py-1">{r.role}</td>
              <td className="border px-2 py-1 text-center">
                <Link to={`/admin/employees/${r.uid}/edit`} className="text-blue-600 hover:underline">แก้ไข</Link>
                {r.uid !== profile?.uid && (
                  <>
                    {' '}
                    <button onClick={() => onDelete(r)} className="text-red-600 hover:underline">ลบ</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
