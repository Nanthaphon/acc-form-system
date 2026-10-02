import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  FileText, History, Inbox, KeyRound, ListChecks, LogOut,
  PanelLeftClose, PanelLeftOpen, Printer, Tags, User, Users,
} from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { logout } from '../data/auth'
import { usePendingSignCount } from '../shared/usePendingSignCount'
import { roleLabel } from '../shared/roles'
import NavCountBadge from './NavCountBadge'

// Collapsing is a per-person habit, so it is remembered in this browser.
const COLLAPSED_KEY = 'sidebar:collapsed'

const navLinkClass = (collapsed: boolean) => ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg py-2.5 text-sm transition-colors ${collapsed ? 'justify-center px-2' : 'px-3.5'} ${
    isActive
      ? 'bg-clay-600 text-white shadow-[0_4px_14px_rgba(43,103,119,0.35)]'
      : 'text-clay-200 hover:bg-white/[.06] hover:text-white'
  }`
const iconBtn = 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-clay-200 transition-colors hover:bg-white/[.08] hover:text-white'

interface NavItem { to: string; icon: LucideIcon; label: string; end?: boolean; count?: number }

export default function Layout() {
  const { profile } = useAuth()
  const toSign = usePendingSignCount(profile?.uid)
  const isAdmin = profile?.role === 'admin'
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSED_KEY) === '1' } catch { return false }
  })
  useEffect(() => {
    try { localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0') } catch { /* storage can be blocked */ }
  }, [collapsed])

  const items: NavItem[] = [
    { to: '/', icon: FileText, label: 'แบบฟอร์มเบิกจ่าย', end: true },
    // An admin has two history menus — their own documents and everyone's.
    { to: '/history', icon: History, label: isAdmin ? 'ประวัติของผู้ดูแลระบบ' : 'ประวัติ' },
    { to: '/sign', icon: Inbox, label: 'ฟอร์มเอกสารรอเซ็น', count: toSign },
    ...(isAdmin ? [
      { to: '/admin/employees', icon: Users, label: 'ข้อมูลพนักงาน' },
      { to: '/admin/prints', icon: Printer, label: 'ประวัติพิมพ์ทั้งหมดในระบบ' },
      { to: '/admin/access-groups', icon: Tags, label: 'จัดการสิทธิ์เข้าถึงฟอร์ม' },
      { to: '/admin/field-options', icon: ListChecks, label: 'Custom Field' },
    ] : []),
    { to: '/profile', icon: User, label: 'ข้อมูลของฉัน' },
  ]

  const navRow = ({ to, icon: Icon, label, end, count }: NavItem) => (
    <NavLink key={to} to={to} end={end} className={navLinkClass(collapsed)} title={collapsed ? label : undefined}>
      {({ isActive }) => (
        <>
          <span className="relative shrink-0">
            <Icon size={18} className="opacity-85" />
            {/* Collapsed to icons only, the count rides on the icon itself. */}
            {collapsed && !!count && (
              <span className="absolute -right-2.5 -top-2">
                <NavCountBadge count={count} active={isActive} label={`รอเซ็น ${count} ฉบับ`} />
              </span>
            )}
          </span>
          {!collapsed && (
            <>
              {label}
              {!!count && <NavCountBadge count={count} active={isActive} label={`รอเซ็น ${count} ฉบับ`} />}
            </>
          )}
        </>
      )}
    </NavLink>
  )

  return (
    <div className="flex min-h-screen bg-sand-50">
      <aside className={`sticky top-0 flex h-screen shrink-0 flex-col bg-clay-900 pb-4 text-clay-100 transition-[width] duration-200 ${collapsed ? 'w-[4.5rem]' : 'w-[17.5rem]'}`}>
        <div className={`flex items-center gap-2.5 py-5 text-base font-semibold text-white ${collapsed ? 'flex-col px-2' : 'px-5'}`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white p-1 shadow-[0_2px_8px_rgba(0,0,0,0.22)]">
            <img src="/logo.webp" alt="" className="h-full w-full object-contain" />
          </span>
          {!collapsed && <span className="min-w-0 flex-1 truncate">Acc Documents</span>}
          <button
            type="button"
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'ขยายแถบเมนู' : 'หุบแถบเมนู'}
            aria-label={collapsed ? 'ขยายแถบเมนู' : 'หุบแถบเมนู'}
            className={iconBtn}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <nav className="flex flex-col gap-0.5 px-3 py-2">
          {items.map(navRow)}
        </nav>

        <div className="mt-auto border-t border-white/[.08] px-3 pt-2">
          <nav className="flex flex-col gap-0.5">
            {navRow({ to: '/change-password', icon: KeyRound, label: 'เปลี่ยนรหัสผ่าน' })}
            <button
              onClick={() => logout()}
              title={collapsed ? 'ออกจากระบบ' : undefined}
              aria-label="ออกจากระบบ"
              className={`flex items-center gap-3 rounded-lg py-2.5 text-left text-sm text-clay-200 transition-colors hover:bg-white/[.06] hover:text-white ${collapsed ? 'justify-center px-2' : 'px-3.5'}`}
            >
              <LogOut size={18} className="shrink-0 opacity-85" />
              {!collapsed && 'ออกจากระบบ'}
            </button>
          </nav>
          {!collapsed && (
            <Link to="/profile" className="mt-3 block px-3.5 text-xs text-clay-200 hover:text-clay-50">
              {profile?.firstName} {profile?.lastName}
              {profile && <span className="mt-0.5 block text-[11px] text-clay-300">{roleLabel(profile)}</span>}
            </Link>
          )}
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  )
}
