import { uiAlert } from '../../components/dialog/dialogService'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, IdCard, Save } from 'lucide-react'
import { getProfileByUid, updateProfile } from '../../data/users'
import { listCompanies } from '../../data/companies'
import { listAccessGroups } from '../../data/accessGroups'
import { listDepartments } from '../../data/departments'
import type { Company, UserProfile, AccessGroup, Department } from '../../types/schema'

const labelCls = 'mb-1.5 block text-xs font-medium text-gray-500'
const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100'

export default function EditEmployeePage() {
  const { uid } = useParams<{ uid: string }>()
  const nav = useNavigate()
  const [companies, setCompanies] = useState<Company[]>([])
  const [groups, setGroups] = useState<AccessGroup[]>([])
  const [depts, setDepts] = useState<Department[]>([])
  const [f, setF] = useState<UserProfile | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { listCompanies().then(setCompanies); listAccessGroups().then(setGroups); listDepartments().then(setDepts) }, [])
  useEffect(() => {
    if (!uid) return
    getProfileByUid(uid).then(p => setF(p))
  }, [uid])

  const set = (k: keyof UserProfile, v: string) => setF(prev => prev ? { ...prev, [k]: v } : prev)
  // Store the department id plus its name (for display).
  const setDept = (id: string) => setF(prev => prev ? { ...prev, departmentId: id, department: depts.find(d => d.id === id)?.name ?? '' } : prev)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!uid || !f) return
    setSaving(true)
    try {
      await updateProfile(uid, {
        firstName: f.firstName, lastName: f.lastName, position: f.position,
        department: f.department, departmentId: f.departmentId, companyId: f.companyId, defaultJob: f.defaultJob,
        bankAccount: f.bankAccount, role: f.role, accessGroup: f.accessGroup,
      })
      uiAlert('บันทึกข้อมูลพนักงานแล้ว', { tone: 'success' })
      nav('/admin/employees')
    } catch (err: any) {
      uiAlert('บันทึกไม่สำเร็จ: ' + (err?.message || 'เกิดข้อผิดพลาด'))
    } finally {
      setSaving(false)
    }
  }

  if (!f) return (
    <div className="mx-auto max-w-2xl animate-pulse space-y-3">
      <div className="h-7 w-48 rounded bg-gray-200" />
      <div className="h-64 rounded-xl bg-gray-100" />
    </div>
  )

  const fullName = `${f.firstName} ${f.lastName}`.trim()

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => nav('/admin/employees')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:border-gray-300 hover:text-gray-900"
        >
          <ArrowLeft size={16} /> กลับ
        </button>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><IdCard size={20} /></div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">แก้ไขข้อมูลพนักงาน</h1>
          <p className="text-sm text-gray-500">{fullName || 'พนักงาน'} · รหัส {f.employeeId}</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-6">
        {/* ข้อมูลส่วนตัว */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-[15px] font-semibold text-gray-900">ข้อมูลส่วนตัว</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls}>รหัสพนักงาน</label>
              <input className={`${inputCls} bg-gray-50 text-gray-500`} value={f.employeeId} disabled />
              <p className="mt-1 text-[11px] text-gray-400">รหัสพนักงานแก้ไขไม่ได้</p>
            </div>
            <div>
              <label className={labelCls}>ชื่อ</label>
              <input className={inputCls} placeholder="ชื่อจริง" value={f.firstName} onChange={e => set('firstName', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>นามสกุล</label>
              <input className={inputCls} placeholder="นามสกุล" value={f.lastName} onChange={e => set('lastName', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>ตำแหน่ง</label>
              <input className={inputCls} placeholder="เช่น หัวหน้าฝ่ายบัญชี" value={f.position} onChange={e => set('position', e.target.value)} />
            </div>
          </div>
        </div>

        {/* สังกัด & สิทธิ์ */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-[15px] font-semibold text-gray-900">สังกัดและสิทธิ์การใช้งาน</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>แผนก</label>
              <select className={inputCls} value={f.departmentId ?? ''} onChange={e => setDept(e.target.value)}>
                <option value="">— เลือกแผนก —</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>บริษัท</label>
              <select className={inputCls} value={f.companyId} onChange={e => set('companyId', e.target.value)}>
                <option value="">— เลือกบริษัท —</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>กลุ่มการเข้าถึง</label>
              <select className={inputCls} value={f.accessGroup ?? ''} onChange={e => set('accessGroup', e.target.value)}>
                <option value="">— ไม่ระบุ —</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>สิทธิ์การใช้งาน</label>
              <select className={inputCls} value={f.role} onChange={e => set('role', e.target.value)}>
                <option value="employee">พนักงาน</option>
                <option value="admin">แอดมิน</option>
              </select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Save size={16} /> {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
          <button
            type="button"
            onClick={() => nav('/admin/employees')}
            className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-300 hover:text-gray-900"
          >
            ยกเลิก
          </button>
        </div>
      </form>
    </div>
  )
}
