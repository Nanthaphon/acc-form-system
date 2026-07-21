import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createEmployee } from '../../data/users'
import { listCompanies } from '../../data/companies'
import type { Company } from '../../types/schema'

export default function AddEmployeePage() {
  const nav = useNavigate()
  const [companies, setCompanies] = useState<Company[]>([])
  const [f, setF] = useState({ employeeId: '', firstName: '', lastName: '', position: '', department: '', companyId: '', defaultJob: '', bankAccount: '', role: 'employee' as const })
  useEffect(() => { listCompanies().then(setCompanies) }, [])
  const set = (k: string, v: string) => setF({ ...f, [k]: v })
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await createEmployee(f as any)
      alert('เพิ่มพนักงานแล้ว (รหัสผ่านเริ่มต้น = รหัสพนักงาน)')
      nav('/admin/employees')
    } catch {
      alert('เพิ่มพนักงานไม่สำเร็จ: อาจมีรหัสพนักงานนี้อยู่แล้ว')
    }
  }
  return (
    <form onSubmit={submit} className="max-w-lg space-y-3">
      <h1 className="text-xl font-medium">เพิ่มพนักงาน</h1>
      {[['employeeId','รหัสพนักงาน'],['firstName','ชื่อ'],['lastName','นามสกุล'],['position','ตำแหน่ง'],['department','แผนก'],['defaultJob','Job'],['bankAccount','เลขบัญชี']].map(([k,l]) => (
        <input key={k} className="w-full rounded border px-3 py-2" placeholder={l} value={(f as any)[k]} onChange={e => set(k, e.target.value)} />
      ))}
      <select className="w-full rounded border px-3 py-2" value={f.companyId} onChange={e => set('companyId', e.target.value)}>
        <option value="">— เลือกบริษัท —</option>
        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select className="w-full rounded border px-3 py-2" value={f.role} onChange={e => set('role', e.target.value)}>
        <option value="employee">พนักงาน</option><option value="admin">แอดมิน</option>
      </select>
      <button className="rounded bg-blue-600 px-4 py-2 text-white">บันทึก</button>
    </form>
  )
}
