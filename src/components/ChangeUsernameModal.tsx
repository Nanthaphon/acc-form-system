import { useState } from 'react'
import { AtSign, CheckCircle2, X } from 'lucide-react'
import type { UserProfile } from '../types/schema'
import { adminChangeUsername } from '../data/users'
import { dbErrorMessage } from '../shared/dbError'
import { passwordState } from '../shared/roles'
import { uiAlert } from './dialog/dialogService'
import { Credential } from './LoginInfo'
import { Spinner } from './Spinner'
import { ui } from './ui'

const MIN_LENGTH = 6 // a default password equals the username, and passwords need 6+

function usernameError(e: unknown): string {
  const err = (e ?? {}) as { code?: string; message?: string }
  if (err.code === '23505' || err.message?.includes('already in use')) return 'ชื่อผู้ใช้นี้มีคนใช้แล้ว กรุณาเลือกชื่ออื่น'
  return dbErrorMessage(e)
}

interface Props { profile: UserProfile; onClose: () => void; onDone: (newUsername: string) => void }

// Super Admin: rename an employee's username (their login). A still-default
// password follows the new username; any other password keeps working.
export default function ChangeUsernameModal({ profile, onClose, onDone }: Props) {
  const [value, setValue] = useState(profile.employeeId)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const next = value.trim()
  const followsPassword = passwordState(profile) === 'default'
  const name = `${profile.firstName} ${profile.lastName}`.trim() || profile.employeeId

  async function save() {
    if (next.length < MIN_LENGTH) {
      uiAlert(`ชื่อผู้ใช้ต้องมีอย่างน้อย ${MIN_LENGTH} ตัวอักษร`, { title: 'ชื่อผู้ใช้สั้นเกินไป' })
      return
    }
    if (next === profile.employeeId) { onClose(); return }
    setBusy(true)
    try {
      await adminChangeUsername(profile.uid, next)
      setSaved(next)
    } catch (e) {
      uiAlert(usernameError(e), { title: 'เปลี่ยนชื่อผู้ใช้ไม่สำเร็จ' })
    } finally {
      setBusy(false)
    }
  }
  function close() {
    if (saved !== null) onDone(saved)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/40 p-4 sm:p-8" onClick={close}>
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><AtSign size={18} /></div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-gray-900">เปลี่ยนชื่อผู้ใช้</h2>
            <p className="truncate text-xs text-gray-500">{name} · ปัจจุบัน {profile.employeeId}</p>
          </div>
          <button onClick={close} aria-label="ปิด" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><X size={18} /></button>
        </div>

        {saved === null ? (
          <>
            <label className={ui.label}>ชื่อผู้ใช้ใหม่</label>
            <input
              className={`${ui.input} font-mono`}
              aria-label="ชื่อผู้ใช้ใหม่"
              autoFocus
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') save() }}
            />
            <p className="mt-1 text-[11px] text-gray-400">อย่างน้อย {MIN_LENGTH} ตัวอักษร · ใช้เป็นรหัสพนักงานด้วย</p>
            <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2.5 text-xs text-gray-600">
              {followsPassword
                ? <>รหัสผ่านยังเป็นรหัสเริ่มต้น จึงจะเปลี่ยนเป็น <span className="font-mono font-semibold text-gray-900">{next || '…'}</span> ตามไปด้วย</>
                : 'รหัสผ่านเดิมยังใช้ได้ตามปกติ'}
              {' · '}เอกสารเดิมของพนักงานยังอยู่ครบ
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={close} className={ui.btnSecondary}>ยกเลิก</button>
              <button onClick={save} disabled={busy} className={ui.btnPrimary}>
                {busy ? <Spinner size={16} /> : <AtSign size={16} />} บันทึกชื่อผู้ใช้
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
              <CheckCircle2 size={18} className="shrink-0" /> เปลี่ยนชื่อผู้ใช้แล้ว — แจ้ง {name} ให้ใช้ชื่อใหม่เข้าสู่ระบบ
            </div>
            <div className="space-y-2">
              <Credential label="ชื่อผู้ใช้" value={saved} />
              {followsPassword && <Credential label="รหัสผ่าน" value={saved} />}
            </div>
            {!followsPassword && <p className="mt-2 text-xs text-gray-500">รหัสผ่านเดิมยังใช้ได้</p>}
            <div className="mt-5 flex justify-end">
              <button onClick={close} className={ui.btnPrimary}>เสร็จสิ้น</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
