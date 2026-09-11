import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, Save } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { changeMyPassword } from '../data/auth'
import { setMustChangePassword } from '../data/users'
import { uiAlert } from '../components/dialog/dialogService'
import { Spinner } from '../components/Spinner'

const labelCls = 'mb-1.5 block text-xs font-medium text-gray-500'
const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100'

export default function ChangePasswordPage() {
  const { profile, refresh } = useAuth()
  const nav = useNavigate()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    if (pw.length < 6) { uiAlert('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', { title: 'รหัสผ่านสั้นเกินไป' }); return }
    if (pw !== pw2) { uiAlert('รหัสผ่านใหม่และช่องยืนยันไม่ตรงกัน', { title: 'รหัสผ่านไม่ตรงกัน' }); return }
    setSaving(true)
    try {
      await changeMyPassword(pw)
      await setMustChangePassword(profile!.uid, false)
      await refresh()
      uiAlert('เปลี่ยนรหัสผ่านเรียบร้อย ครั้งหน้าให้ใช้รหัสผ่านใหม่ในการเข้าสู่ระบบ', { tone: 'success' })
      nav('/')
    } catch (err: any) {
      uiAlert('เปลี่ยนรหัสผ่านไม่สำเร็จ: ' + (err?.message || 'เกิดข้อผิดพลาด'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-gray-200 bg-white p-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><KeyRound size={24} /></span>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">เปลี่ยนรหัสผ่าน</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {profile?.mustChangePassword ? 'กรุณาตั้งรหัสผ่านใหม่ก่อนเริ่มใช้งาน' : 'ตั้งรหัสผ่านใหม่สำหรับเข้าสู่ระบบ'}
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className={labelCls}>รหัสผ่านใหม่</label>
            <input className={inputCls} type="password" autoFocus autoComplete="new-password" placeholder="อย่างน้อย 6 ตัวอักษร"
              value={pw} onChange={e => setPw(e.target.value)} disabled={saving} />
          </div>
          <div>
            <label className={labelCls}>ยืนยันรหัสผ่านใหม่</label>
            <input className={inputCls} type="password" autoComplete="new-password" placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง"
              value={pw2} onChange={e => setPw2(e.target.value)} disabled={saving} />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? <><Spinner size={16} /> กำลังบันทึก...</> : <><Save size={16} /> บันทึกรหัสผ่านใหม่</>}
          </button>
        </form>
      </div>
    </div>
  )
}
