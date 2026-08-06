import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getProfileByUid, updateProfile } from '../../data/users'
import { listCompanies } from '../../data/companies'
import { listAccessGroups } from '../../data/accessGroups'
import { listDepartments } from '../../data/departments'
import type { Company, UserProfile, AccessGroup, Department } from '../../types/schema'

export default function EditEmployeePage() {
  const { uid } = useParams<{ uid: string }>()
  const nav = useNavigate()
  const [companies, setCompanies] = useState<Company[]>([])
  const [groups, setGroups] = useState<AccessGroup[]>([])
  const [depts, setDepts] = useState<Department[]>([])
  const [f, setF] = useState<UserProfile | null>(null)

  useEffect(() => { listCompanies().then(setCompanies); listAccessGroups().then(setGroups); listDepartments().then(setDepts) }, [])
  useEffect(() => {
    if (!uid) return
    getProfileByUid(uid).then(p => setF(p))
  }, [uid])

  const set = (k: keyof UserProfile, v: string) => setF(prev => prev ? { ...prev, [k]: v } : prev)
  const setBool = (k: keyof UserProfile, v: boolean) => setF(prev => prev ? { ...prev, [k]: v } : prev)
  // Store the department id (for approval routing) plus its name (for display).
  const setDept = (id: string) => setF(prev => prev ? { ...prev, departmentId: id, department: depts.find(d => d.id === id)?.name ?? '' } : prev)
  const toggleCoverDept = (id: string) => setF(prev => {
    if (!prev) return prev
    const cur = prev.approverDepartments ?? []
    return { ...prev, approverDepartments: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] }
  })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!uid || !f) return
    try {
      await updateProfile(uid, {
        firstName: f.firstName, lastName: f.lastName, position: f.position,
        department: f.department, departmentId: f.departmentId, companyId: f.companyId, defaultJob: f.defaultJob,
        bankAccount: f.bankAccount, role: f.role, accessGroup: f.accessGroup,
        canApprove: f.canApprove, approverAllDepartments: f.approverAllDepartments, approverDepartments: f.approverDepartments,
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
      {([['firstName', 'ชื่อ'], ['lastName', 'นามสกุล'], ['position', 'ตำแหน่ง']] as const).map(([k, l]) => (
        <input key={k} className="w-full rounded border px-3 py-2" placeholder={l} value={f[k]} onChange={e => set(k, e.target.value)} />
      ))}
      <select className="w-full rounded border px-3 py-2" value={f.departmentId ?? ''} onChange={e => setDept(e.target.value)}>
        <option value="">— เลือกแผนก —</option>
        {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
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

      <div className="space-y-2 rounded-lg border border-gray-200 p-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
          <input type="checkbox" checked={!!f.canApprove} onChange={e => setBool('canApprove', e.target.checked)} />
          เป็นผู้อนุมัติ (เซ็นเอกสารได้)
        </label>
        {f.canApprove && (
          <div className="space-y-1.5 pl-6">
            <div className="text-xs text-gray-500">ดูแลแผนก — คำขอจากแผนกที่ดูแลจะมาให้เซ็น</div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!f.approverAllDepartments} onChange={e => setBool('approverAllDepartments', e.target.checked)} />
              ทุกแผนก (หัวใหญ่)
            </label>
            {!f.approverAllDepartments && depts.map(d => (
              <label key={d.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={(f.approverDepartments ?? []).includes(d.id)} onChange={() => toggleCoverDept(d.id)} />
                {d.name}
              </label>
            ))}
            {!f.approverAllDepartments && depts.length === 0 && (
              <div className="text-xs text-gray-400">ยังไม่มีแผนก — สร้างในเมนู “จัดการแผนก” ก่อน</div>
            )}
          </div>
        )}
      </div>

      <button className="rounded bg-blue-600 px-4 py-2 text-white">บันทึก</button>
    </form>
  )
}
