import { uiAlert } from '../../components/dialog/dialogService'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createEmployee } from '../../data/users'
import { listCompanies } from '../../data/companies'
import { listAccessGroups } from '../../data/accessGroups'
import { listDepartments } from '../../data/departments'
import type { Company, AccessGroup, Department } from '../../types/schema'

export default function AddEmployeePage() {
  const nav = useNavigate()
  const [companies, setCompanies] = useState<Company[]>([])
  const [groups, setGroups] = useState<AccessGroup[]>([])
  const [depts, setDepts] = useState<Department[]>([])
  const [f, setF] = useState({ employeeId: '', firstName: '', lastName: '', position: '', department: '', departmentId: '', companyId: '', defaultJob: '', bankAccount: '', role: 'employee' as const, accessGroup: '' })
  useEffect(() => { listCompanies().then(setCompanies); listAccessGroups().then(setGroups); listDepartments().then(setDepts) }, [])
  const set = (k: string, v: string) => setF({ ...f, [k]: v })
  // Store the department id (for approval routing) plus its name (for display).
  const setDept = (id: string) => setF({ ...f, departmentId: id, department: depts.find(d => d.id === id)?.name ?? '' })
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (f.employeeId.trim().length < 6) {
      uiAlert('รหัสพนักงานต้องมีอย่างน้อย 6 ตัวอักษร (เพราะใช้เป็นรหัสผ่านเริ่มต้นด้วย)')
      return
    }
    try {
      await createEmployee(f as any)
      uiAlert('เพิ่มพนักงานแล้ว (รหัสผ่านเริ่มต้น = รหัสพนักงาน)', { tone: 'success' })
      nav('/admin/employees')
    } catch (err: any) {
      uiAlert('เพิ่มพนักงานไม่สำเร็จ: ' + (err?.message || 'เกิดข้อผิดพลาด'))
    }
  }
  return (
    <form onSubmit={submit} className="max-w-lg space-y-3">
      <h1 className="text-xl font-medium">เพิ่มพนักงาน</h1>
      {[['employeeId','รหัสพนักงาน'],['firstName','ชื่อ'],['lastName','นามสกุล'],['position','ตำแหน่ง']].map(([k,l]) => (
        <input key={k} className="w-full rounded border px-3 py-2" placeholder={l} value={(f as any)[k]} onChange={e => set(k, e.target.value)} />
      ))}
      <select className="w-full rounded border px-3 py-2" value={f.departmentId} onChange={e => setDept(e.target.value)}>
        <option value="">— เลือกแผนก —</option>
        {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
      <select className="w-full rounded border px-3 py-2" value={f.companyId} onChange={e => set('companyId', e.target.value)}>
        <option value="">— เลือกบริษัท —</option>
        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select className="w-full rounded border px-3 py-2" value={f.accessGroup} onChange={e => set('accessGroup', e.target.value)}>
        <option value="">— ไม่ระบุ —</option>
        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
      </select>
      <select className="w-full rounded border px-3 py-2" value={f.role} onChange={e => set('role', e.target.value)}>
        <option value="employee">พนักงาน</option><option value="admin">แอดมิน</option>
      </select>
      <button className="rounded bg-blue-600 px-4 py-2 text-white">บันทึก</button>
    </form>
  )
}
