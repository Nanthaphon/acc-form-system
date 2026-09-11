import { uiAlert } from '../../components/dialog/dialogService'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AtSign, IdCard, Lock, Save } from 'lucide-react'
import { useAuth } from '../../auth/AuthProvider'
import { getProfileByUid, updateProfile } from '../../data/users'
import { listCompanies } from '../../data/companies'
import { listAccessGroups } from '../../data/accessGroups'
import { listDepartments } from '../../data/departments'
import { dbErrorMessage } from '../../shared/dbError'
import { isSuperAdmin, ROLE_OPTIONS } from '../../shared/roles'
import ChangeUsernameModal from '../../components/ChangeUsernameModal'
import { PageHeader, ui } from '../../components/ui'
import type { Company, UserProfile, AccessGroup, Department } from '../../types/schema'

export default function EditEmployeePage() {
  const { uid } = useParams<{ uid: string }>()
  const nav = useNavigate()
  const { profile: me, refresh } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [groups, setGroups] = useState<AccessGroup[]>([])
  const [depts, setDepts] = useState<Department[]>([])
  const [f, setF] = useState<UserProfile | null>(null)
  const [saving, setSaving] = useState(false)
  const [changingUsername, setChangingUsername] = useState(false)

  useEffect(() => { listCompanies().then(setCompanies); listAccessGroups().then(setGroups); listDepartments().then(setDepts) }, [])
  useEffect(() => {
    if (!uid) return
    getProfileByUid(uid).then(p => setF(p))
  }, [uid])

  const set = (k: keyof UserProfile, v: string) => setF(prev => prev ? { ...prev, [k]: v } : prev)
  // Store the department id plus its name (for display).
  const setDept = (id: string) => setF(prev => prev ? { ...prev, departmentId: id, department: depts.find(d => d.id === id)?.name ?? '' } : prev)

  const viewerIsSuper = isSuperAdmin(me)
  const targetIsSuper = isSuperAdmin(f)
  // The Super Admin's account can be changed only by the Super Admin (the database enforces it too).
  const readOnly = targetIsSuper && !viewerIsSuper

  // The rename is saved on its own; keep any unsaved edits in the form and just take the new username.
  function afterUsernameChange(newUsername: string) {
    setF(prev => prev ? { ...prev, employeeId: newUsername } : prev)
    if (uid === me?.uid) refresh()
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!uid || !f || readOnly) return
    setSaving(true)
    try {
      await updateProfile(uid, {
        firstName: f.firstName, lastName: f.lastName, position: f.position,
        department: f.department, departmentId: f.departmentId, companyId: f.companyId, defaultJob: f.defaultJob,
        bankAccount: f.bankAccount, accessGroup: f.accessGroup,
        ...(targetIsSuper ? {} : { role: f.role }),
      })
      uiAlert('บันทึกข้อมูลพนักงานแล้ว', { tone: 'success' })
      nav('/admin/employees')
    } catch (err) {
      uiAlert(dbErrorMessage(err), { title: 'บันทึกไม่สำเร็จ' })
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
      <PageHeader
        icon={<IdCard size={20} />}
        title="แก้ไขข้อมูลพนักงาน"
        subtitle={`${fullName || 'พนักงาน'} · ชื่อผู้ใช้ ${f.employeeId}`}
        onBack={() => nav('/admin/employees')}
      />

      {readOnly && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Lock size={16} className="shrink-0" /> บัญชี Super Admin แก้ไขได้เฉพาะ Super Admin
        </div>
      )}

      <form onSubmit={submit}>
        <fieldset disabled={readOnly} className="space-y-6">
          {/* ข้อมูลส่วนตัว */}
          <div className={ui.card}>
            <h2 className={`${ui.cardTitle} mb-4`}>ข้อมูลส่วนตัว</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={ui.label}>รหัสพนักงาน (ชื่อผู้ใช้)</label>
                <div className="flex gap-2">
                  <input className={`${ui.input} font-mono`} value={f.employeeId} disabled />
                  {viewerIsSuper && (
                    <button type="button" className={`${ui.btnSecondary} shrink-0`} onClick={() => setChangingUsername(true)}>
                      <AtSign size={16} /> เปลี่ยน
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-gray-400">{viewerIsSuper ? 'ใช้เข้าสู่ระบบ · เปลี่ยนแล้วมีผลทันที' : 'เปลี่ยนได้เฉพาะ Super Admin'}</p>
              </div>
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
                <input className={ui.input} placeholder="เช่น หัวหน้าฝ่ายบัญชี" value={f.position} onChange={e => set('position', e.target.value)} />
              </div>
            </div>
          </div>

          {/* สังกัด & สิทธิ์ */}
          <div className={ui.card}>
            <h2 className={`${ui.cardTitle} mb-4`}>สังกัดและสิทธิ์การใช้งาน</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={ui.label}>แผนก</label>
                <select className={ui.input} value={f.departmentId ?? ''} onChange={e => setDept(e.target.value)}>
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
                <select className={ui.input} value={f.accessGroup ?? ''} onChange={e => set('accessGroup', e.target.value)}>
                  <option value="">— ไม่ระบุ —</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className={ui.label}>สิทธิ์การใช้งาน</label>
                {targetIsSuper ? (
                  <>
                    <select className={ui.input} disabled><option>Super Admin</option></select>
                    <p className="mt-1 text-[11px] text-gray-400">สิทธิ์ของ Super Admin เปลี่ยนไม่ได้</p>
                  </>
                ) : (
                  <select className={ui.input} value={f.role} onChange={e => set('role', e.target.value)}>
                    {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                )}
              </div>
            </div>
          </div>
        </fieldset>

        {/* Outside the fieldset so "cancel" still works when the form is read-only. */}
        <div className="mt-6 flex items-center gap-2.5">
          <button type="submit" disabled={saving || readOnly} className={ui.btnPrimary}>
            <Save size={16} /> {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
          <button type="button" onClick={() => nav('/admin/employees')} className={ui.btnSecondary}>ยกเลิก</button>
        </div>
      </form>

      {changingUsername && <ChangeUsernameModal profile={f} onClose={() => setChangingUsername(false)} onDone={afterUsernameChange} />}
    </div>
  )
}
