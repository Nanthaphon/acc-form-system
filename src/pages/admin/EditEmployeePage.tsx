import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getProfileByUid, updateProfile } from '../../data/users'
import { listCompanies } from '../../data/companies'
import { listAccessGroups } from '../../data/accessGroups'
import type { Company, UserProfile, AccessGroup } from '../../types/schema'

export default function EditEmployeePage() {
  const { uid } = useParams<{ uid: string }>()
  const nav = useNavigate()
  const [companies, setCompanies] = useState<Company[]>([])
  const [groups, setGroups] = useState<AccessGroup[]>([])
  const [f, setF] = useState<UserProfile | null>(null)

  useEffect(() => { listCompanies().then(setCompanies); listAccessGroups().then(setGroups) }, [])
  useEffect(() => {
    if (!uid) return
    getProfileByUid(uid).then(p => setF(p))
  }, [uid])

  const set = (k: keyof UserProfile, v: string) => setF(prev => prev ? { ...prev, [k]: v } : prev)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!uid || !f) return
    try {
      await updateProfile(uid, {
        firstName: f.firstName, lastName: f.lastName, position: f.position,
        department: f.department, companyId: f.companyId, defaultJob: f.defaultJob,
        bankAccount: f.bankAccount, role: f.role, accessGroup: f.accessGroup,
      })
      alert('บันทึกข้อมูลพนักงานแล้ว')
      nav('/admin/employees')
    } catch (err: any) {
      alert('บันทึกไม่สำเร็จ: ' + (err?.message || 'เกิดข้อผิดพลาด'))
    }
  }

  if (!f) return <div className="max-w-lg">กำลังโหลด...</div>

  return (
    <form onSubmit={submit} className="max-w-lg space-y-3">
      <h1 className="text-xl font-medium">แก้ไขข้อมูลพนักงาน</h1>
      <input className="w-full rounded border bg-gray-100 px-3 py-2 text-gray-500" value={f.employeeId} disabled />
      {([['firstName', 'ชื่อ'], ['lastName', 'นามสกุล'], ['position', 'ตำแหน่ง'], ['department', 'แผนก']] as const).map(([k, l]) => (
        <input key={k} className="w-full rounded border px-3 py-2" placeholder={l} value={f[k]} onChange={e => set(k, e.target.value)} />
      ))}
      <select className="w-full rounded border px-3 py-2" value={f.companyId} onChange={e => set('companyId', e.target.value)}>
        <option value="">— เลือกบริษัท —</option>
        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select className="w-full rounded border px-3 py-2" value={f.accessGroup ?? ''} onChange={e => set('accessGroup', e.target.value)}>
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
