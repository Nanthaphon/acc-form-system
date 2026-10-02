import { Link, NavLink, Outlet } from 'react-router-dom'
import { FileText, History, Inbox, KeyRound, ListChecks, LogOut, Printer, Tags, User, Users } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { logout } from '../data/auth'
import { usePendingSignCount } from '../shared/usePendingSignCount'
import { roleLabel } from '../shared/roles'
import NavCountBadge from './NavCountBadge'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm transition-colors ${
    isActive
      ? 'bg-clay-600 text-white shadow-[0_4px_14px_rgba(43,103,119,0.35)]'
      : 'text-clay-200 hover:bg-white/[.06] hover:text-white'
  }`

export default function Layout() {
  const { profile } = useAuth()
  const toSign = usePendingSignCount(profile?.uid)
  const isAdmin = profile?.role === 'admin'
  return (
    <div className="flex min-h-screen bg-sand-50">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col bg-clay-900 pb-4 text-clay-100">
        <div className="flex items-center gap-2.5 px-5 py-5 text-base font-semibold text-white">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white p-1 shadow-[0_2px_8px_rgba(0,0,0,0.22)]">
            <img src="/logo.webp" alt="" className="h-full w-full object-contain" />
          </span>
          Acc Documents
        </div>
        <nav className="flex flex-col gap-0.5 px-3 py-2">
          <NavLink to="/" end className={navLinkClass}>
            <FileText size={18} className="opacity-85" /> แบบฟอร์มเบิกจ่าย
          </NavLink>
          <NavLink to="/history" className={navLinkClass}>
            <History size={18} className="opacity-85" /> {isAdmin ? 'ประวัติของผู้ดูแลระบบ' : 'ประวัติ'}
          </NavLink>
          <NavLink to="/sign" className={navLinkClass}>
            {({ isActive }) => (
              <>
                <Inbox size={18} className="opacity-85" /> รอฉันเซ็น
                <NavCountBadge count={toSign} active={isActive} label={`รอเซ็น ${toSign} ฉบับ`} />
              </>
            )}
          </NavLink>
          {isAdmin && <>
            <NavLink to="/admin/employees" className={navLinkClass}>
              <Users size={18} className="opacity-85" /> พนักงาน
            </NavLink>
            <NavLink to="/admin/prints" className={navLinkClass}>
              <Printer size={18} className="opacity-85" /> ประวัติการพิมพ์ทั้งหมด
            </NavLink>
            <NavLink to="/admin/access-groups" className={navLinkClass}>
              <Tags size={18} className="opacity-85" /> จัดการกลุ่ม
            </NavLink>
            <NavLink to="/admin/field-options" className={navLinkClass}>
              <ListChecks size={18} className="opacity-85" /> Custom Field
            </NavLink>
          </>}
          <NavLink to="/profile" className={navLinkClass}>
            <User size={18} className="opacity-85" /> ข้อมูลของฉัน
          </NavLink>
        </nav>
        <div className="mt-auto border-t border-white/[.08] px-3 pt-2">
          <nav className="flex flex-col gap-0.5">
            <NavLink to="/change-password" className={navLinkClass}>
              <KeyRound size={18} className="opacity-85" /> เปลี่ยนรหัสผ่าน
            </NavLink>
            <button
              onClick={() => logout()}
              className="flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-sm text-clay-200 transition-colors hover:bg-white/[.06] hover:text-white"
            >
              <LogOut size={18} className="opacity-85" /> ออกจากระบบ
            </button>
          </nav>
          <Link to="/profile" className="mt-3 block px-3.5 text-xs text-clay-200 hover:text-clay-50">
            {profile?.firstName} {profile?.lastName}
            {profile && <span className="mt-0.5 block text-[11px] text-clay-300">{roleLabel(profile)}</span>}
          </Link>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  )
}
