import { uiAlert } from '../components/dialog/dialogService'
import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import ActionIconButton from '../components/ActionIconButton'
import { useAuth } from '../auth/AuthProvider'
import { updateProfile } from '../data/users'
import { listCompanies } from '../data/companies'
import type { Company } from '../types/schema'

export default function ProfilePage() {
  const { profile, refresh } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [form, setForm] = useState(profile)
  useEffect(() => { listCompanies().then(setCompanies) }, [])
  useEffect(() => setForm(profile), [profile])
  if (!form) return null

  async function save() { await updateProfile(form!.uid, form!); await refresh() }
  const set = (k: string, v: string) => setForm({ ...form!, [k]: v })

  async function onSignaturePick(file: File | undefined) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = String(reader.result)
      if (dataUrl.length > 400000) { uiAlert('ไฟล์ใหญ่เกินไป แนะนำลายเซ็นเล็กกว่า ~300KB'); return }
      try { await updateProfile(form!.uid, { signatureImage: dataUrl }); await refresh() }
      catch { uiAlert('อัปโหลดลายเซ็นไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
    }
    reader.readAsDataURL(file)
  }
  async function removeSignature() {
    try { await updateProfile(form!.uid, { signatureImage: null } as any); await refresh() }
    catch { uiAlert('ลบลายเซ็นไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  return (
    <div className="max-w-lg space-y-3">
      <h1 className="text-xl font-medium">โปรไฟล์</h1>
      {[['firstName','ชื่อ'],['lastName','นามสกุล'],['position','ตำแหน่ง'],['department','แผนก'],['defaultJob','Job'],['bankAccount','เลขบัญชี']].map(([k,label]) => (
        <label key={k} className="block">
          <span className="text-sm text-gray-600">{label}</span>
          <input className="w-full rounded border px-3 py-2" value={(form as any)[k] || ''} onChange={e => set(k, e.target.value)} />
        </label>
      ))}
      <label className="block">
        <span className="text-sm text-gray-600">บริษัท/สังกัด</span>
        <select className="w-full rounded border px-3 py-2" value={form.companyId} onChange={e => set('companyId', e.target.value)}>
          <option value="">— เลือก —</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <div className="space-y-2 rounded-lg border border-gray-200 p-3">
          <div className="text-sm font-medium text-gray-800">ลายเซ็นของฉัน (ใช้เซ็นเอกสาร)</div>
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-40 shrink-0 items-center justify-center overflow-hidden rounded border border-gray-200 bg-gray-50">
              {form.signatureImage
                ? <img src={form.signatureImage} alt="ลายเซ็น" className="h-full w-full object-contain" />
                : <span className="text-xs text-gray-400">ยังไม่มีลายเซ็น</span>}
            </div>
            <div className="flex flex-col items-start gap-2">
              <input
                type="file"
                accept="image/*"
                className="text-xs text-gray-500 file:mr-2 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-700"
                onChange={e => onSignaturePick(e.target.files?.[0])}
              />
              {form.signatureImage && (
                <ActionIconButton label="ลบลายเซ็น" tone="red" icon={<Trash2 size={16} />} onClick={removeSignature} />
              )}
            </div>
          </div>
          <div className="text-xs text-gray-500">แนะนำรูปพื้นหลังโปร่ง (PNG) จะดูเหมือนเซ็นจริงมากกว่า</div>
      </div>

      <button onClick={save} className="rounded bg-blue-600 px-4 py-2 text-white">บันทึก</button>
    </div>
  )
}
