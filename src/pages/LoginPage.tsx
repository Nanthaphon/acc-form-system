import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, LogIn } from 'lucide-react'
import { loginWithEmployeeId } from '../data/auth'
import { Spinner } from '../components/Spinner'

const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50'

export default function LoginPage() {
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (loading) return
    setError('')
    setLoading(true)
    try {
      await loginWithEmployeeId(employeeId, password)
      nav('/')
    } catch {
      setError('รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง')
      setLoading(false) // stay on the page; on success we navigate away
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f6fb] p-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#3b6fe0] to-[#5b8bff] text-white">
            <ClipboardList size={24} />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">ระบบเบิกค่าใช้จ่าย</h1>
            <p className="mt-0.5 text-sm text-gray-500">เข้าสู่ระบบเพื่อใช้งาน</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">รหัสพนักงาน</label>
            <input
              className={inputCls}
              placeholder="เช่น 1010122"
              autoFocus
              disabled={loading}
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">รหัสผ่าน</label>
            <input
              className={inputCls}
              type="password"
              placeholder="รหัสผ่าน"
              disabled={loading}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? <><Spinner size={16} /> กำลังเข้าสู่ระบบ...</> : <><LogIn size={16} /> เข้าสู่ระบบ</>}
          </button>
        </form>
      </div>
    </div>
  )
}
