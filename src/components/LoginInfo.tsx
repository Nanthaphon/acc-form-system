import type { ReactNode } from 'react'
import { AtSign, KeyRound } from 'lucide-react'
import type { UserProfile } from '../types/schema'
import { PASSWORD_STATE, passwordState } from '../shared/roles'
import CopyButton from './CopyButton'
import { Badge, ui } from './ui'

// One login detail in a copyable box (a hidden password shows dots, no copy).
export function Credential({ label, value, hidden, badge, note }: {
  label: string
  value: string
  hidden?: boolean
  badge?: ReactNode
  note?: string
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        {badge}
      </div>
      <div className="flex items-center gap-1">
        <span className={`min-w-0 flex-1 truncate font-mono text-base font-semibold ${hidden ? 'tracking-widest text-gray-300' : 'text-gray-900'}`}>
          {hidden ? '••••••••' : value}
        </span>
        {!hidden && <CopyButton value={value} label={`คัดลอก${label}`} />}
      </div>
      {note && <p className="mt-1 text-xs text-gray-500">{note}</p>}
    </div>
  )
}

// An employee's username and where their password stands — what an admin
// hands over, or checks when someone can't log in. The two actions are passed
// only for the Super Admin.
export default function LoginInfo({ profile, onSetPassword, onChangeUsername }: {
  profile: UserProfile
  onSetPassword?: () => void
  onChangeUsername?: () => void
}) {
  const st = passwordState(profile)
  const meta = PASSWORD_STATE[st]
  return (
    <div className={ui.card}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className={`${ui.cardTitle} flex items-center gap-2`}><KeyRound size={16} className="text-gray-400" /> ข้อมูลเข้าสู่ระบบ</h2>
        <div className="flex flex-wrap gap-2">
          {onChangeUsername && (
            <button className={ui.btnSecondary} onClick={onChangeUsername}><AtSign size={16} /> แก้ชื่อผู้ใช้</button>
          )}
          {onSetPassword && (
            <button className={ui.btnSecondary} onClick={onSetPassword}><KeyRound size={16} /> ตั้งรหัสผ่านใหม่</button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Credential label="ชื่อผู้ใช้" value={profile.employeeId} />
        <Credential
          label="รหัสผ่าน"
          value={profile.employeeId}
          hidden={st !== 'default'}
          badge={<Badge tone={meta.tone}>{meta.label}</Badge>}
          note={meta.hint}
        />
      </div>
      {!onSetPassword && st !== 'default' && (
        <p className="mt-3 text-xs text-gray-500">ถ้าพนักงานลืมรหัสผ่าน ให้ Super Admin ตั้งรหัสใหม่ให้</p>
      )}
    </div>
  )
}
