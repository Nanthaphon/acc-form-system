import { uiAlert } from '../../components/dialog/dialogService'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AtSign, IdCard, KeyRound, Lock, Save, ShieldCheck, UserRound } from 'lucide-react'
import { useAuth } from '../../auth/AuthProvider'
import { getProfileByUid, updateProfile } from '../../data/users'
import { listCompanies } from '../../data/companies'
import { listAccessGroups } from '../../data/accessGroups'
import { loadOptionLists, NO_OPTIONS } from '../../data/fieldOptions'
import OptionInput from '../../components/OptionInput'
import { dbErrorMessage, EMAIL_NOT_SAVED } from '../../shared/dbError'
import { emailProblem, normalizeEmail } from '../../shared/emailAddress'
import { isSuperAdmin, roleLabel, ROLE_OPTIONS } from '../../shared/roles'
import ChangeUsernameModal from '../../components/ChangeUsernameModal'
import EmployeeSummaryCard from '../../components/EmployeeSummaryCard'
import { PageHeader, ui } from '../../components/ui'
import { CENTRAL_LOCK_HINT, centralOwns, withoutCentral } from '../../data/employeeSync'
import type { Company, UserProfile, AccessGroup } from '../../types/schema'

export default function EditEmployeePage() {
  const { uid } = useParams<{ uid: string }>()
  const nav = useNavigate()
  const { profile: me, refresh } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [groups, setGroups] = useState<AccessGroup[]>([])
  const [lists, setLists] = useState(NO_OPTIONS)
  const [f, setF] = useState<UserProfile | null>(null)
  const [saving, setSaving] = useState(false)
  const [changingUsername, setChangingUsername] = useState(false)

  useEffect(() => { listCompanies().then(setCompanies); listAccessGroups().then(setGroups); loadOptionLists().then(setLists) }, [])
  useEffect(() => {
    if (!uid) return
    getProfileByUid(uid).then(p => setF(p))
  }, [uid])

  const set = (k: keyof UserProfile, v: string) => setF(prev => prev ? { ...prev, [k]: v } : prev)

  const viewerIsSuper = isSuperAdmin(me)
  const targetIsSuper = isSuperAdmin(f)
  // Changing your own role takes effect immediately and can leave nobody with
  // admin rights, so it is only ever done to someone else.
  const isSelf = f?.uid === me?.uid
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
    const mailIssue = emailProblem(f.email)
    if (mailIssue) {
      uiAlert(mailIssue, { title: 'ข้อมูลไม่ถูกต้อง' })
      return
    }
    setSaving(true)
    try {
      const { emailSkipped } = await updateProfile(uid, withoutCentral({
        firstName: f.firstName, lastName: f.lastName, position: f.position,
        department: f.department, companyId: f.companyId, defaultJob: f.defaultJob,
        bankAccount: f.bankAccount, accessGroup: f.accessGroup,
        // Absent when the database has no email column yet — then nothing is sent for it.
        ...(f.email !== undefined ? { email: normalizeEmail(f.email) || null } : {}),
        ...(targetIsSuper || isSelf ? {} : { role: f.role }),
      }, f))
      if (emailSkipped) uiAlert(EMAIL_NOT_SAVED, { title: 'บันทึกแล้ว ยกเว้นอีเมล' })
      else uiAlert('บันทึกข้อมูลพนักงานแล้ว', { tone: 'success' })
      nav('/admin/employees')
    } catch (err) {
      uiAlert(dbErrorMessage(err), { title: 'บันทึกไม่สำเร็จ' })
    } finally {
      setSaving(false)
    }
  }

  if (!f) return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 w-72 rounded-lg bg-stone-200" />
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="h-80 rounded-2xl bg-stone-100" />
        <div className="h-80 rounded-2xl bg-stone-100" />
      </div>
    </div>
  )

  const fullName = `${f.firstName} ${f.lastName}`.trim()
  const hint = 'mt-1 text-[11px] text-stone-500'
  // Fields the employee master owns: shown, not editable here.
  const owns = (k: keyof UserProfile) => centralOwns(f, k)
  const lock = (k: keyof UserProfile) => owns(k) ? <p className={hint}>{CENTRAL_LOCK_HINT}</p> : null

  return (
    <div>
      <PageHeader
        icon={<IdCard size={20} />}
        title="แก้ไขข้อมูลพนักงาน"
        subtitle={fullName || 'พนักงาน'}
        onBack={() => nav('/admin/employees')}
        // Save stays in sight at the top, however far down the form is filled.
        actions={
          <>
            <button type="button" onClick={() => nav('/admin/employees')} className={ui.btnSecondary}>ยกเลิก</button>
            <button type="submit" form="employee-form" disabled={saving || readOnly} className={ui.btnPrimary}>
              <Save size={16} /> {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </>
        }
      />

      {readOnly && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-ochre-200 bg-ochre-50 px-4 py-3 text-sm text-ochre-700">
          <Lock size={16} className="shrink-0" /> บัญชี Super Admin แก้ไขได้เฉพาะ Super Admin
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <EmployeeSummaryCard person={f} companies={companies} groups={groups} />

        <form id="employee-form" onSubmit={submit}>
          <fieldset disabled={readOnly} className="space-y-6">
            {/* เข้าสู่ระบบ */}
            <section className={ui.card}>
              <h2 className={`${ui.cardTitle} mb-4 flex items-center gap-2`}><KeyRound size={16} className="text-stone-400" /> ข้อมูลเข้าสู่ระบบ</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={ui.label}>รหัสพนักงาน (ชื่อผู้ใช้)</label>
                  <div className="flex gap-2">
                    <input className={`${ui.input} font-mono`} value={f.employeeId} disabled />
                    {viewerIsSuper && (
                      <button type="button" className={`${ui.btnSecondary} shrink-0`} onClick={() => setChangingUsername(true)}>
                        <AtSign size={16} /> เปลี่ยน
                      </button>
                    )}
                  </div>
                  <p className={hint}>{viewerIsSuper ? 'ใช้เข้าสู่ระบบ · เปลี่ยนแล้วมีผลทันที' : 'เปลี่ยนได้เฉพาะ Super Admin'}</p>
                </div>
                <div>
                  <label className={ui.label}>อีเมล</label>
                  <input type="email" className={ui.input} placeholder="สำหรับแจ้งเตือนเอกสารรอเซ็น" value={f.email ?? ''} onChange={e => set('email', e.target.value)} disabled={owns('email')} />
                  {lock('email')}
                </div>
              </div>
            </section>

            {/* ข้อมูลส่วนตัว */}
            <section className={ui.card}>
              <h2 className={`${ui.cardTitle} mb-4 flex items-center gap-2`}><UserRound size={16} className="text-stone-400" /> ข้อมูลส่วนตัว</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                <div>
                  <label className={ui.label}>ชื่อ</label>
                  <input className={ui.input} placeholder="ชื่อจริง" value={f.firstName} onChange={e => set('firstName', e.target.value)} disabled={owns('firstName')} />
                  {lock('firstName')}
                </div>
                <div>
                  <label className={ui.label}>นามสกุล</label>
                  <input className={ui.input} placeholder="นามสกุล" value={f.lastName} onChange={e => set('lastName', e.target.value)} disabled={owns('lastName')} />
                  {lock('lastName')}
                </div>
                <div className="md:col-span-2 2xl:col-span-1">
                  <label className={ui.label}>ตำแหน่ง</label>
                  <OptionInput className={ui.input} placeholder="เช่น หัวหน้าฝ่ายบัญชี" value={f.position} options={lists.position} onChange={v => set('position', v)} disabled={owns('position')} />
                  {lock('position')}
                </div>
              </div>
            </section>

            {/* สังกัด & สิทธิ์ */}
            <section className={ui.card}>
              <h2 className={`${ui.cardTitle} mb-4 flex items-center gap-2`}><ShieldCheck size={16} className="text-stone-400" /> สังกัดและสิทธิ์การใช้งาน</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={ui.label}>บริษัท</label>
                  <select className={ui.input} value={f.companyId} onChange={e => set('companyId', e.target.value)} disabled={owns('companyId')}>
                    <option value="">— เลือกบริษัท —</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {lock('companyId')}
                </div>
                <div>
                  <label className={ui.label}>แผนก</label>
                  <OptionInput className={ui.input} placeholder="เช่น Payroll" value={f.department} options={lists.department} onChange={v => set('department', v)} disabled={owns('department')} />
                  {lock('department')}
                </div>
                <div>
                  <label className={ui.label}>กลุ่มการเข้าถึง</label>
                  <select className={ui.input} value={f.accessGroup ?? ''} onChange={e => set('accessGroup', e.target.value)}>
                    <option value="">— ไม่ระบุ —</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                  <p className={hint}>กำหนดว่าเห็นฟอร์มไหนบ้าง</p>
                </div>
                <div>
                  <label className={ui.label}>สิทธิ์การใช้งาน</label>
                  {targetIsSuper || isSelf ? (
                    <>
                      <select className={ui.input} disabled><option>{roleLabel(f)}</option></select>
                      <p className={hint}>{targetIsSuper ? 'สิทธิ์ของ Super Admin เปลี่ยนไม่ได้' : 'เปลี่ยนสิทธิ์ของตัวเองไม่ได้'}</p>
                    </>
                  ) : (
                    <select className={ui.input} value={f.role} onChange={e => set('role', e.target.value)}>
                      {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  )}
                </div>
              </div>
            </section>
          </fieldset>
        </form>
      </div>

      {changingUsername && <ChangeUsernameModal profile={f} onClose={() => setChangingUsername(false)} onDone={afterUsernameChange} />}
    </div>
  )
}
