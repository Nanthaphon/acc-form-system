import type { UserProfile } from '../types/schema'

// Three levels: Super Admin (an admin flagged isSuperAdmin — may also set
// anyone's password), Account Admin (role 'admin'), and employees.
type RoleInfo = Pick<UserProfile, 'role' | 'isSuperAdmin'>
type Tone = 'gray' | 'blue' | 'amber' | 'green'

export function isSuperAdmin(p?: RoleInfo | null): boolean {
  return !!p && p.role === 'admin' && !!p.isSuperAdmin
}

// Who may set someone's password or put a signature on their account: any
// admin — but the Super Admin's own account is only ever touched by the Super
// Admin (the database enforces the same rule).
export function canManageLogin(viewer?: RoleInfo | null, target?: RoleInfo | null): boolean {
  if (viewer?.role !== 'admin') return false
  return isSuperAdmin(target) ? isSuperAdmin(viewer) : true
}

export const ROLE_OPTIONS: { value: UserProfile['role']; label: string }[] = [
  { value: 'employee', label: 'พนักงาน' },
  { value: 'admin', label: 'Account Admin' },
]

export function roleLabel(p: RoleInfo): string {
  if (isSuperAdmin(p)) return 'Super Admin'
  return ROLE_OPTIONS.find(o => o.value === p.role)?.label ?? p.role
}
export function roleTone(p: RoleInfo): Tone {
  return isSuperAdmin(p) ? 'amber' : p.role === 'admin' ? 'blue' : 'gray'
}

// Where a login password stands. Passwords are stored one-way (hashed), so only
// the default one (= the employee ID) can ever be shown.
//   default   — still the default password
//   temporary — set by an admin, the employee hasn't changed it yet
//   own       — the employee chose it
export type PasswordState = 'default' | 'temporary' | 'own'

export function passwordState(p: Pick<UserProfile, 'mustChangePassword' | 'passwordIsDefault'>): PasswordState {
  // Before the passwordIsDefault column existed, only untouched accounts had mustChangePassword on.
  if (p.passwordIsDefault ?? p.mustChangePassword) return 'default'
  return p.mustChangePassword ? 'temporary' : 'own'
}

export const PASSWORD_STATE: Record<PasswordState, { label: string; tone: Tone; hint: string; short: string }> = {
  default: { label: 'รหัสเริ่มต้น', tone: 'amber', hint: 'ยังใช้รหัสเริ่มต้น (= ชื่อผู้ใช้)', short: 'รหัสผ่าน = ชื่อผู้ใช้' },
  temporary: { label: 'รหัสชั่วคราว', tone: 'blue', hint: 'ผู้ดูแลระบบตั้งให้ · รอพนักงานเปลี่ยน', short: 'ผู้ดูแลระบบตั้งให้' },
  own: { label: 'ตั้งเองแล้ว', tone: 'green', hint: 'พนักงานเปลี่ยนรหัสเองแล้ว · ระบบเก็บแบบเข้ารหัส ดูย้อนหลังไม่ได้', short: 'พนักงานตั้งเอง (ดูไม่ได้)' },
}
