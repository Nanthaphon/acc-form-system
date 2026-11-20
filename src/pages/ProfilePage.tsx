import { uiAlert } from '../components/dialog/dialogService'
import SignatureField from '../components/SignatureField'
import { useEffect, useState } from 'react'
import { Save, Signature, UserRound } from 'lucide-react'
import { Badge, PageHeader, SectionTitle, ui } from '../components/ui'
import { Spinner } from '../components/Spinner'
import { useAuth } from '../auth/AuthProvider'
import { updateProfile } from '../data/users'
import { listCompanies } from '../data/companies'
import { loadOptionLists, NO_OPTIONS } from '../data/fieldOptions'
import type { OptionField } from '../data/fieldOptions'
import OptionInput from '../components/OptionInput'
import { roleLabel } from '../shared/roles'
import { emailProblem, normalizeEmail } from '../shared/emailAddress'
import { dbErrorMessage, EMAIL_NOT_SAVED } from '../shared/dbError'
import type { Company } from '../types/schema'

const FIELDS: Array<[key: string, label: string]> = [
  ['firstName', 'ชื่อ'],
  ['lastName', 'นามสกุล'],
  ['nickname', 'ชื่อเล่น'],
  ['position', 'ตำแหน่ง'],
  ['department', 'แผนก'],
  ['email', 'อีเมล'],
  ['defaultJob', 'Job'],
  ['bankAccount', 'เลขบัญชี'],
]

export default function ProfilePage() {
  const { profile, refresh } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [lists, setLists] = useState(NO_OPTIONS)
  const [form, setForm] = useState(profile)
  const [saving, setSaving] = useState(false)
  useEffect(() => { listCompanies().then(setCompanies); loadOptionLists().then(setLists) }, [])
  useEffect(() => setForm(profile), [profile])
  if (!form) return null

  async function save() {
    const mailIssue = emailProblem(form!.email)
    if (mailIssue) {
      uiAlert(mailIssue, { title: 'ข้อมูลไม่ถูกต้อง' })
      return
    }
    setSaving(true)
    const f = form!
    try {
      // Only what this page edits — not the whole row (role, signature image,
      // super-admin and password flags…), which the database guards.
      const { emailSkipped } = await updateProfile(f.uid, {
        firstName: f.firstName, lastName: f.lastName, nickname: f.nickname ?? '', position: f.position,
        department: f.department, defaultJob: f.defaultJob, bankAccount: f.bankAccount,
        companyId: f.companyId,
        // undefined when the database has no email column: an untouched field sends nothing.
        ...(f.email !== undefined ? { email: normalizeEmail(f.email) || null } : {}),
      })
      await refresh()
      if (emailSkipped) uiAlert(EMAIL_NOT_SAVED, { title: 'บันทึกแล้ว ยกเว้นอีเมล' })
      else uiAlert('บันทึกข้อมูลแล้ว', { tone: 'success' })
    } catch (e) {
      uiAlert(dbErrorMessage(e), { title: 'บันทึกไม่สำเร็จ' })
    } finally {
      setSaving(false)
    }
  }
  const set = (k: string, v: string) => setForm({ ...form!, [k]: v })

  const fullName = `${form.firstName ?? ''} ${form.lastName ?? ''}`.trim()

  return (
    <div>
      <PageHeader
        icon={<UserRound size={20} />}
        title={fullName || 'ข้อมูลของฉัน'}
        subtitle={form.employeeId}
        actions={<>
          {form.role === 'admin' && <Badge tone="blue">{roleLabel(form)}</Badge>}
          <button type="button" onClick={save} disabled={saving} className={ui.btnPrimary}>
            {saving ? <><Spinner size={16} /> กำลังบันทึก...</> : <><Save size={16} /> บันทึก</>}
          </button>
        </>}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className={ui.card}>
          <SectionTitle icon={<UserRound size={16} />} className="mb-5">ข้อมูลส่วนตัว</SectionTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FIELDS.map(([k, label]) => (
              <div key={k}>
                <label htmlFor={`me-${k}`} className={ui.label}>{label}</label>
                <OptionInput
                  id={`me-${k}`}
                  className={ui.input}
                  value={(form as any)[k] || ''}
                  options={k in lists ? lists[k as OptionField] : []}
                  onChange={v => set(k, v)}
                />
              </div>
            ))}
            <div className="sm:col-span-2 lg:col-span-1">
              <label htmlFor="me-company" className={ui.label}>บริษัท</label>
              <select id="me-company" className={ui.input} value={form.companyId} onChange={e => set('companyId', e.target.value)}>
                <option value="">—</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.shortName || c.name}</option>)}
              </select>
            </div>
          </div>
        </section>

        <section className={ui.card}>
          <SectionTitle icon={<Signature size={16} />} className="mb-5">ลายเซ็นของฉัน</SectionTitle>
          <SignatureField uid={form.uid} signature={form.signatureImage} onChanged={refresh} />
        </section>
      </div>
    </div>
  )
}
