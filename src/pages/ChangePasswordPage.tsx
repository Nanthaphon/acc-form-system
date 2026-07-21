import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { changeMyPassword } from '../data/auth'
import { setMustChangePassword } from '../data/users'

export default function ChangePasswordPage() {
  const { user, refresh } = useAuth()
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('')
  const [msg, setMsg] = useState(''); const nav = useNavigate()

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (pw.length < 6) return setMsg('รหัสผ่านอย่างน้อย 6 ตัว')
    if (pw !== pw2) return setMsg('รหัสผ่านไม่ตรงกัน')
    await changeMyPassword(user!, pw)
    await setMustChangePassword(user!.uid, false)
    await refresh()
    nav('/')
  }
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-4 text-xl font-medium">เปลี่ยนรหัสผ่าน</h1>
      <form onSubmit={submit} className="space-y-4">
        <input className="w-full rounded border px-3 py-2" type="password" placeholder="รหัสผ่านใหม่"
          value={pw} onChange={e => setPw(e.target.value)} />
        <input className="w-full rounded border px-3 py-2" type="password" placeholder="ยืนยันรหัสผ่าน"
          value={pw2} onChange={e => setPw2(e.target.value)} />
        {msg && <p className="text-sm text-red-600">{msg}</p>}
        <button className="w-full rounded bg-blue-600 py-2 text-white">บันทึก</button>
      </form>
    </div>
  )
}
