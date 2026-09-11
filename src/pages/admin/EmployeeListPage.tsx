import { uiAlert, uiConfirm } from '../../components/dialog/dialogService'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileUp, Pencil, Search, Trash2, UserPlus, Users } from 'lucide-react'
import ActionIconButton from '../../components/ActionIconButton'
import { Spinner } from '../../components/Spinner'
import { listEmployees, deleteEmployee } from '../../data/users'
import { listCompanies } from '../../data/companies'
import { useAuth } from '../../auth/AuthProvider'
import type { Company, UserProfile } from '../../types/schema'

const HEADERS = ['รหัส', 'ชื่อ-นามสกุล', 'ตำแหน่ง', 'แผนก', 'บริษัท', 'สิทธิ์', '']

export default function EmployeeListPage() {
  const { profile } = useAuth()
  const [rows, setRows] = useState<UserProfile[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  function load() { listEmployees().then(r => { setRows(r); setLoading(false) }) }
  useEffect(() => { load(); listCompanies().then(setCompanies) }, [])

  const companyName = (id: string) => companies.find(c => c.id === id)?.name || id
  // Search the fields people actually look someone up by.
  const needle = q.trim().toLowerCase()
  const filtered = needle
    ? rows.filter(r => `${r.employeeId} ${r.firstName} ${r.lastName} ${r.position} ${r.department}`.toLowerCase().includes(needle))
    : rows

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
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Users size={20} /></div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">พนักงาน</h1>
          <p className="text-sm text-gray-500">{loading ? 'กำลังโหลด...' : `ทั้งหมด ${rows.length} คน`}</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Link
            to="/admin/import"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-300 hover:text-gray-900"
          >
            <FileUp size={16} /> Import CSV
          </Link>
          <Link
            to="/admin/employees/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <UserPlus size={16} /> เพิ่มพนักงาน
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="ค้นหารหัส / ชื่อ / ตำแหน่ง / แผนก"
          className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>{HEADERS.map(h => <th key={h} className="whitespace-nowrap px-4 py-3 text-left font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(r => (
              <tr key={r.uid} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[13px] text-gray-600">{r.employeeId}</td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  <Link to={`/admin/employees/${r.uid}`} className="font-medium text-gray-900 hover:text-blue-600">
                    {r.firstName} {r.lastName}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-gray-700">{r.position || <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-2.5 text-gray-700">{r.department || <span className="text-gray-300">—</span>}</td>
                <td className="max-w-[220px] truncate px-4 py-2.5 text-gray-700" title={companyName(r.companyId)}>{companyName(r.companyId)}</td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  {r.role === 'admin'
                    ? <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">แอดมิน</span>
                    : <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">พนักงาน</span>}
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center justify-end gap-1.5">
                    <ActionIconButton label="แก้ไข" to={`/admin/employees/${r.uid}/edit`} icon={<Pencil size={16} />} />
                    {r.uid !== profile?.uid && (
                      <ActionIconButton label="ลบพนักงาน" tone="red" icon={<Trash2 size={16} />} onClick={() => onDelete(r)} />
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {loading && (
              <tr><td colSpan={HEADERS.length} className="px-4 py-10 text-center text-gray-400"><Spinner size={20} className="mx-auto" /></td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={HEADERS.length} className="px-4 py-10 text-center text-sm text-gray-400">
                  {rows.length === 0 ? 'ยังไม่มีพนักงาน' : `ไม่พบพนักงานที่ตรงกับ “${q}”`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
