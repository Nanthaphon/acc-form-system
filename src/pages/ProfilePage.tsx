import { uiAlert } from '../components/dialog/dialogService'
import { useEffect, useState } from 'react'
import { PenLine, Save, Trash2, Upload, UserRound } from 'lucide-react'
import ActionIconButton from '../components/ActionIconButton'
import { Spinner } from '../components/Spinner'
import { useAuth } from '../auth/AuthProvider'
import { updateProfile } from '../data/users'
import { listCompanies } from '../data/companies'
import { roleLabel } from '../shared/roles'
import type { Company } from '../types/schema'

const labelCls = 'mb-1.5 block text-xs font-medium text-gray-500'
const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100'

const FIELDS: Array<[key: string, label: string, placeholder: string, wide?: boolean]> = [
  ['firstName', 'ชื่อ', 'ชื่อจริง'],
  ['lastName', 'นามสกุล', 'นามสกุล'],
  ['position', 'ตำแหน่ง', 'เช่น เจ้าหน้าที่บัญชี'],
  ['department', 'แผนก', 'เช่น Payroll'],
  ['defaultJob', 'Job (ค่าเริ่มต้น)', 'ใส่อัตโนมัติเวลากรอกฟอร์ม'],
  ['bankAccount', 'เลขบัญชี', 'เลขบัญชีธนาคาร'],
]

export default function ProfilePage() {
  const { profile, refresh } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [form, setForm] = useState(profile)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  useEffect(() => { listCompanies().then(setCompanies) }, [])
  useEffect(() => setForm(profile), [profile])
  if (!form) return null

  async function save() {
    setSaving(true)
    try {
      await updateProfile(form!.uid, form!)
      await refresh()
      uiAlert('บันทึกข้อมูลแล้ว', { tone: 'success' })
    } catch {
      uiAlert('บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setSaving(false)
    }
  }
  const set = (k: string, v: string) => setForm({ ...form!, [k]: v })

  async function onSignaturePick(file: File | undefined) {
    if (!file) return
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = String(reader.result)
      if (dataUrl.length > 400000) { uiAlert('ไฟล์ใหญ่เกินไป แนะนำลายเซ็นเล็กกว่า ~300KB'); setUploading(false); return }
      try { await updateProfile(form!.uid, { signatureImage: dataUrl }); await refresh() }
      catch { uiAlert('อัปโหลดลายเซ็นไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
      finally { setUploading(false) }
    }
    reader.onerror = () => { setUploading(false); uiAlert('อ่านไฟล์ไม่สำเร็จ') }
    reader.readAsDataURL(file)
  }
  async function removeSignature() {
    try { await updateProfile(form!.uid, { signatureImage: null } as any); await refresh() }
    catch { uiAlert('ลบลายเซ็นไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  const fullName = `${form.firstName ?? ''} ${form.lastName ?? ''}`.trim()
  const companyName = companies.find(c => c.id === form.companyId)?.name

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <UserRound size={24} />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold text-gray-900">{fullName || 'ข้อมูลของฉัน'}</h1>
          <p className="truncate text-sm text-gray-500">
            {form.position || 'ไม่ระบุตำแหน่ง'}
            {form.employeeId ? ` · รหัส ${form.employeeId}` : ''}
            {companyName ? ` · ${companyName}` : ''}
          </p>
        </div>
        {form.role === 'admin' && (
          <span className="ml-auto shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{roleLabel(form)}</span>
        )}
      </div>

      {/* ข้อมูลส่วนตัว */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-[15px] font-semibold text-gray-900">ข้อมูลส่วนตัว</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FIELDS.map(([k, label, placeholder]) => (
            <div key={k}>
              <label className={labelCls}>{label}</label>
              <input
                className={inputCls}
                placeholder={placeholder}
                value={(form as any)[k] || ''}
                onChange={e => set(k, e.target.value)}
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <label className={labelCls}>บริษัท / สังกัด</label>
            <select className={inputCls} value={form.companyId} onChange={e => set('companyId', e.target.value)}>
              <option value="">— เลือกบริษัท —</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ลายเซ็น */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-1 flex items-center gap-2">
          <PenLine size={16} className="text-gray-400" />
          <h2 className="text-[15px] font-semibold text-gray-900">ลายเซ็นของฉัน</h2>
        </div>
        <p className="mb-4 text-xs text-gray-500">ใช้เซ็นเอกสารออนไลน์ · แนะนำรูปพื้นหลังโปร่ง (PNG) จะดูเหมือนเซ็นจริงมากกว่า</p>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-24 w-56 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50">
            {uploading
              ? <Spinner size={20} className="text-gray-400" />
              : form.signatureImage
                ? <img src={form.signatureImage} alt="ลายเซ็น" className="h-full w-full object-contain p-2" />
                : <span className="text-xs text-gray-400">ยังไม่มีลายเซ็น</span>}
          </div>

          <div className="flex items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-300 hover:text-gray-900">
              <Upload size={16} />
              {form.signatureImage ? 'เปลี่ยนลายเซ็น' : 'อัปโหลดลายเซ็น'}
              <input type="file" accept="image/*" className="hidden" onChange={e => onSignaturePick(e.target.files?.[0])} />
            </label>
            {form.signatureImage && (
              <ActionIconButton label="ลบลายเซ็น" tone="red" icon={<Trash2 size={16} />} onClick={removeSignature} />
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? <><Spinner size={16} /> กำลังบันทึก...</> : <><Save size={16} /> บันทึก</>}
        </button>
      </div>
    </div>
  )
}
