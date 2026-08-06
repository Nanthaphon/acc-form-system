import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { Building2, ClipboardList, FileText, History, Inbox, KeyRound, LogOut, Printer, Tags, User, Users } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { logout } from '../data/auth'
import { countPendingForApprover } from '../data/submissions'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-sm transition-colors ${
    isActive
      ? 'bg-[#2b5bd7] text-white shadow-[0_4px_14px_rgba(43,91,215,0.35)]'
      : 'text-[#aeb9cf] hover:bg-white/[.06] hover:text-white'
  }`

export default function Layout() {
  const { profile } = useAuth()
  const [pending, setPending] = useState(0)
  useEffect(() => { if (profile?.canApprove) countPendingForApprover().then(setPending) }, [profile?.canApprove])
  return (
    <div className="flex min-h-screen bg-[#f4f6fb]">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col bg-[#16233f] pb-4 text-[#cdd6e6]">
        <div className="flex items-center gap-2.5 px-5 py-5 text-base font-semibold text-white">
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-gradient-to-br from-[#3b6fe0] to-[#5b8bff] text-lg">
            <ClipboardList size={20} />
          </span>
          ระบบเบิกค่าใช้จ่าย
        </div>
        <nav className="flex flex-col gap-0.5 px-3 py-2">
          <NavLink to="/" end className={navLinkClass}>
            <FileText size={18} className="opacity-85" /> แบบฟอร์มเบิกจ่าย
          </NavLink>
          <NavLink to="/history" className={navLinkClass}>
            <History size={18} className="opacity-85" /> ประวัติ
          </NavLink>
          {profile?.canApprove && (
            <NavLink to="/approvals" className={navLinkClass}>
              <Inbox size={18} className="opacity-85" /> รออนุมัติ
              {pending > 0 && <span className="ml-auto rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-[#16233f]">{pending}</span>}
            </NavLink>
          )}
          {profile?.role === 'admin' && <>
            <NavLink to="/admin/employees" className={navLinkClass}>
              <Users size={18} className="opacity-85" /> พนักงาน
            </NavLink>
            <NavLink to="/admin/prints" className={navLinkClass}>
              <Printer size={18} className="opacity-85" /> ประวัติการพิมพ์ทั้งหมด
            </NavLink>
            <NavLink to="/admin/access-groups" className={navLinkClass}>
              <Tags size={18} className="opacity-85" /> จัดการกลุ่ม
            </NavLink>
            <NavLink to="/admin/departments" className={navLinkClass}>
              <Building2 size={18} className="opacity-85" /> จัดการแผนก
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
              className="flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-left text-sm text-[#aeb9cf] transition-colors hover:bg-white/[.06] hover:text-white"
            >
              <LogOut size={18} className="opacity-85" /> ออกจากระบบ
            </button>
          </nav>
          <Link to="/profile" className="mt-3 block px-3.5 text-xs text-[#7a869a] hover:text-[#cdd6e6]">
            {profile?.firstName} {profile?.lastName}
          </Link>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  )
}
