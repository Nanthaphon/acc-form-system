import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginWithEmployeeId } from '../data/auth'

export default function LoginPage() {
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const nav = useNavigate()

  async function submit(e: FormEvent) {
    e.preventDefault(); setError('')
    try { await loginWithEmployeeId(employeeId, password); nav('/') }
    catch { setError('รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง') }
  }
  return (
    <div className="mx-auto mt-24 max-w-sm rounded-lg border bg-white p-8">
      <h1 className="mb-6 text-xl font-medium">เข้าสู่ระบบ</h1>
      <form onSubmit={submit} className="space-y-4">
        <input className="w-full rounded border px-3 py-2" placeholder="รหัสพนักงาน"
          value={employeeId} onChange={e => setEmployeeId(e.target.value)} />
        <input className="w-full rounded border px-3 py-2" type="password" placeholder="รหัสผ่าน"
          value={password} onChange={e => setPassword(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded bg-blue-600 py-2 text-white">เข้าสู่ระบบ</button>
      </form>
    </div>
  )
}
