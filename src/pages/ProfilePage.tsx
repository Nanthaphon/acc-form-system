import { useEffect, useState } from 'react'
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
      <button onClick={save} className="rounded bg-blue-600 px-4 py-2 text-white">บันทึก</button>
    </div>
  )
}
