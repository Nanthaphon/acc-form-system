import { uiAlert } from '../../components/dialog/dialogService'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, KeyRound, Save, UserPlus } from 'lucide-react'
import { Spinner } from '../../components/Spinner'
import { Credential } from '../../components/LoginInfo'
import { PageHeader, ui } from '../../components/ui'
import { createEmployee } from '../../data/users'
import type { NewEmployee } from '../../data/users'
import { listCompanies } from '../../data/companies'
import { listAccessGroups } from '../../data/accessGroups'
import { listDepartments } from '../../data/departments'
import { ROLE_OPTIONS } from '../../shared/roles'
import type { Company, AccessGroup, Department, Role } from '../../types/schema'

const MIN_ID = 6 // the employee ID is also the first password, which needs 6+ characters

const EMPTY = {
  employeeId: '', firstName: '', lastName: '', position: '',
  department: '', departmentId: '', companyId: '', defaultJob: '', bankAccount: '',
  role: 'employee' as Role, accessGroup: '',
}

export default function AddEmployeePage() {
  const nav = useNavigate()
  const [companies, setCompanies] = useState<Company[]>([])
  const [groups, setGroups] = useState<AccessGroup[]>([])
  const [depts, setDepts] = useState<Department[]>([])
  const [f, setF] = useState(EMPTY)
  const [mustChange, setMustChange] = useState(true)
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState<{ employeeId: string; name: string; mustChange: boolean } | null>(null)
  useEffect(() => { listCompanies().then(setCompanies); listAccessGroups().then(setGroups); listDepartments().then(setDepts) }, [])

  const set = (k: keyof typeof EMPTY, v: string) => setF(prev => ({ ...prev, [k]: v }))
  // Store the department id plus its name (for display).
  const setDept = (id: string) => setF(prev => ({ ...prev, departmentId: id, department: depts.find(d => d.id === id)?.name ?? '' }))
  const username = f.employeeId.trim()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    if (username.length < MIN_ID) {
      uiAlert(`รหัสพนักงานต้องมีอย่างน้อย ${MIN_ID} ตัวอักษร (เพราะใช้เป็นรหัสผ่านเริ่มต้นด้วย)`, { title: 'ข้อมูลไม่ครบ' })
      return
    }
    if (!f.firstName.trim() || !f.lastName.trim()) {
      uiAlert('กรุณากรอกชื่อและนามสกุล', { title: 'ข้อมูลไม่ครบ' })
      return
    }
    setSaving(true)
    try {
      const emp: NewEmployee = { ...f, employeeId: username, accessGroup: f.accessGroup || undefined, mustChangePassword: mustChange }
      await createEmployee(emp)
      setCreated({ employeeId: username, name: `${f.firstName} ${f.lastName}`.trim(), mustChange })
    } catch (err: any) {
      uiAlert('เพิ่มพนักงานไม่สำเร็จ: ' + (err?.message || 'เกิดข้อผิดพลาด'))
    } finally {
      setSaving(false)
    }
  }
  function addAnother() { setF(EMPTY); setMustChange(true); setCreated(null) }

  const header = (
    <PageHeader
      icon={<UserPlus size={20} />}
      title="เพิ่มพนักงาน"
      subtitle="ชื่อผู้ใช้ = รหัสพนักงาน · รหัสผ่านเริ่มต้น = รหัสพนักงาน"
      onBack={() => nav('/admin/employees')}
    />
  )

  // After saving: the login details to hand to the new employee.
  if (created) return (
    <div className="mx-auto max-w-2xl">
      {header}
      <div className={ui.card}>
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-600"><CheckCircle2 size={22} /></span>
          <div>
            <h2 className={ui.cardTitle}>เพิ่ม {created.name} แล้ว</h2>
            <p className={ui.hint}>ส่งข้อมูลเข้าสู่ระบบนี้ให้พนักงาน</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Credential label="ชื่อผู้ใช้" value={created.employeeId} />
          <Credential label="รหัสผ่าน" value={created.employeeId} />
        </div>
        <p className="mt-3 text-xs text-gray-500">
          {created.mustChange ? 'ระบบจะให้เปลี่ยนรหัสผ่านเมื่อเข้าใช้ครั้งแรก' : 'ไม่บังคับเปลี่ยนรหัสผ่าน · เปลี่ยนเองได้ที่เมนู “เปลี่ยนรหัสผ่าน”'}
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <button className={ui.btnPrimary} onClick={addAnother}><UserPlus size={16} /> เพิ่มอีกคน</button>
          <button className={ui.btnSecondary} onClick={() => nav('/admin/employees')}>กลับไปหน้ารายชื่อ</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="mx-auto max-w-2xl">
      {header}
      <form onSubmit={submit} className="space-y-6">
        {/* ข้อมูลเข้าสู่ระบบ */}
        <div className={ui.card}>
          <h2 className={`${ui.cardTitle} mb-4 flex items-center gap-2`}><KeyRound size={16} className="text-gray-400" /> ข้อมูลเข้าสู่ระบบ</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={ui.label}>รหัสพนักงาน (ชื่อผู้ใช้)</label>
              <input className={`${ui.input} font-mono`} placeholder="เช่น 1010122" autoFocus value={f.employeeId} onChange={e => set('employeeId', e.target.value)} />
              <p className="mt-1 text-[11px] text-gray-400">อย่างน้อย {MIN_ID} ตัวอักษร · แก้ไขภายหลังไม่ได้</p>
            </div>
            <div>
              <label className={ui.label}>รหัสผ่านเริ่มต้น</label>
              <div className={`${ui.input} bg-gray-50 font-mono`}>
                {username || <span className="font-sans text-gray-400">เหมือนรหัสพนักงาน</span>}
              </div>
              <p className="mt-1 text-[11px] text-gray-400">ตั้งให้อัตโนมัติ = รหัสพนักงาน</p>
            </div>
          </div>
          <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={mustChange} onChange={e => setMustChange(e.target.checked)} />
            ให้เปลี่ยนรหัสผ่านเมื่อเข้าใช้ครั้งแรก
          </label>
        </div>

        {/* ข้อมูลส่วนตัว */}
        <div className={ui.card}>
          <h2 className={`${ui.cardTitle} mb-4`}>ข้อมูลส่วนตัว</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={ui.label}>ชื่อ</label>
              <input className={ui.input} placeholder="ชื่อจริง" value={f.firstName} onChange={e => set('firstName', e.target.value)} />
            </div>
            <div>
              <label className={ui.label}>นามสกุล</label>
              <input className={ui.input} placeholder="นามสกุล" value={f.lastName} onChange={e => set('lastName', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={ui.label}>ตำแหน่ง</label>
              <input className={ui.input} placeholder="เช่น เจ้าหน้าที่บัญชี" value={f.position} onChange={e => set('position', e.target.value)} />
            </div>
          </div>
        </div>

        {/* สังกัด & สิทธิ์ */}
        <div className={ui.card}>
          <h2 className={`${ui.cardTitle} mb-4`}>สังกัดและสิทธิ์การใช้งาน</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={ui.label}>แผนก</label>
              <select className={ui.input} value={f.departmentId} onChange={e => setDept(e.target.value)}>
                <option value="">— เลือกแผนก —</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className={ui.label}>บริษัท</label>
              <select className={ui.input} value={f.companyId} onChange={e => set('companyId', e.target.value)}>
                <option value="">— เลือกบริษัท —</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={ui.label}>กลุ่มการเข้าถึง</label>
              <select className={ui.input} value={f.accessGroup} onChange={e => set('accessGroup', e.target.value)}>
                <option value="">— ไม่ระบุ —</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className={ui.label}>สิทธิ์การใช้งาน</label>
              <select className={ui.input} value={f.role} onChange={e => set('role', e.target.value)}>
                {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button type="submit" disabled={saving} className={ui.btnPrimary}>
            {saving ? <><Spinner size={16} /> กำลังบันทึก...</> : <><Save size={16} /> บันทึก</>}
          </button>
          <button type="button" onClick={() => nav('/admin/employees')} className={ui.btnSecondary}>ยกเลิก</button>
        </div>
      </form>
    </div>
  )
}
