import { useState } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, Eye, EyeOff, KeyRound, RefreshCw, X } from 'lucide-react'
import type { UserProfile } from '../types/schema'
import { adminSetPassword } from '../data/users'
import { dbErrorMessage } from '../shared/dbError'
import { uiAlert } from './dialog/dialogService'
import { Credential } from './LoginInfo'
import { Spinner } from './Spinner'
import { ui } from './ui'

const MIN_LENGTH = 6
// No look-alike characters (0/O, 1/l/I), so a password read out loud is typed right.
const CHARS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export function randomPassword(length = 10): string {
  const n = new Uint32Array(length)
  crypto.getRandomValues(n)
  return Array.from(n, x => CHARS[x % CHARS.length]).join('')
}

function Option({ checked, onSelect, title, desc, children }: {
  checked: boolean
  onSelect: () => void
  title: string
  desc?: string
  children?: ReactNode
}) {
  return (
    <label className={`block cursor-pointer rounded-lg border px-4 py-3 transition ${checked ? 'border-blue-500 bg-blue-50/40' : 'border-gray-200 hover:border-gray-300'}`}>
      <span className="flex items-center gap-2">
        <input type="radio" checked={checked} onChange={onSelect} />
        <span className="text-sm font-medium text-gray-900">{title}</span>
      </span>
      {desc && <span className="ml-6 mt-0.5 block text-xs text-gray-500">{desc}</span>}
      {children && <span className="ml-6 mt-2 block">{children}</span>}
    </label>
  )
}

interface Props { profile: UserProfile; onClose: () => void; onDone: () => void }

// Super Admin: give an employee a new login password — back to the default
// (= employee ID) or a custom one — then show it once to hand over.
export default function SetPasswordModal({ profile, onClose, onDone }: Props) {
  const [mode, setMode] = useState<'default' | 'custom'>('default')
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(true)
  const [mustChange, setMustChange] = useState(true)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const name = `${profile.firstName} ${profile.lastName}`.trim() || profile.employeeId
  const password = mode === 'default' ? profile.employeeId : pw

  async function save() {
    if (password.length < MIN_LENGTH) {
      uiAlert(`รหัสผ่านต้องมีอย่างน้อย ${MIN_LENGTH} ตัวอักษร`, { title: 'รหัสผ่านสั้นเกินไป' })
      return
    }
    setBusy(true)
    try {
      await adminSetPassword(profile.uid, password, mustChange)
      setSaved(password)
    } catch (e) {
      uiAlert(dbErrorMessage(e), { title: 'ตั้งรหัสผ่านไม่สำเร็จ' })
    } finally {
      setBusy(false)
    }
  }
  function close() {
    if (saved !== null) onDone()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/40 p-4 sm:p-8" onClick={close}>
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><KeyRound size={18} /></div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-gray-900">ตั้งรหัสผ่านใหม่</h2>
            <p className="truncate text-xs text-gray-500">{name} · ชื่อผู้ใช้ {profile.employeeId}</p>
          </div>
          <button onClick={close} aria-label="ปิด" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><X size={18} /></button>
        </div>

        {saved === null ? (
          <>
            <div className="space-y-2">
              <Option checked={mode === 'default'} onSelect={() => setMode('default')} title="รีเซ็ตเป็นรหัสเริ่มต้น" desc={`รหัสผ่าน = ${profile.employeeId}`} />
              <Option checked={mode === 'custom'} onSelect={() => setMode('custom')} title="กำหนดรหัสเอง">
                {mode === 'custom' && (
                  <span className="flex items-center gap-1.5">
                    <span className="relative flex-1">
                      <input
                        className={`${ui.input} pr-10 font-mono`}
                        type={show ? 'text' : 'password'}
                        autoComplete="new-password"
                        autoFocus
                        placeholder={`อย่างน้อย ${MIN_LENGTH} ตัวอักษร`}
                        value={pw}
                        onChange={e => setPw(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShow(s => !s)}
                        aria-label={show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                        className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-700"
                      >
                        {show ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </span>
                    <button
                      type="button"
                      onClick={() => { setPw(randomPassword()); setShow(true) }}
                      title="สุ่มรหัสผ่าน"
                      aria-label="สุ่มรหัสผ่าน"
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-blue-600"
                    >
                      <RefreshCw size={16} />
                    </button>
                  </span>
                )}
              </Option>
            </div>
            <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={mustChange} onChange={e => setMustChange(e.target.checked)} />
              ให้พนักงานเปลี่ยนรหัสเมื่อเข้าใช้ครั้งถัดไป
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={close} className={ui.btnSecondary}>ยกเลิก</button>
              <button onClick={save} disabled={busy} className={ui.btnPrimary}>
                {busy ? <Spinner size={16} /> : <KeyRound size={16} />} บันทึกรหัสผ่าน
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
              <CheckCircle2 size={18} className="shrink-0" /> ตั้งรหัสผ่านใหม่แล้ว — ส่งข้อมูลนี้ให้ {name}
            </div>
            <div className="space-y-2">
              <Credential label="ชื่อผู้ใช้" value={profile.employeeId} />
              <Credential label="รหัสผ่าน" value={saved} />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {mustChange ? 'ระบบจะให้พนักงานเปลี่ยนรหัสเมื่อเข้าใช้ครั้งถัดไป' : 'ไม่บังคับเปลี่ยนรหัส · พนักงานเปลี่ยนเองได้ที่เมนู “เปลี่ยนรหัสผ่าน”'}
            </p>
            <div className="mt-5 flex justify-end">
              <button onClick={close} className={ui.btnPrimary}>เสร็จสิ้น</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
