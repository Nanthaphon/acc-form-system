import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  BookOpen, ChevronDown, FileText, Headset, History, Inbox, KeyRound, ListChecks, LogOut, Megaphone,
  PanelLeftClose, PanelLeftOpen, Printer, Tags, Users,
} from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { logout } from '../data/auth'
import { usePendingSignCount } from '../shared/usePendingSignCount'
import { roleLabel } from '../shared/roles'
import NavCountBadge from './NavCountBadge'
import { useUnreadAnnouncement } from '../shared/useUnreadAnnouncement'
import { useSupportUnread } from '../shared/useSupportUnread'
import SupportChatButton from './support/SupportChatButton'

// Collapsing is a per-person habit, so it is remembered in this browser.
const COLLAPSED_KEY = 'sidebar:collapsed'
const ADMIN_CLOSED_KEY = 'sidebar:adminClosed'

const navLinkClass = (collapsed: boolean) => ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg py-2 text-sm transition-colors ${collapsed ? 'justify-center px-2' : 'px-3.5'} ${
    isActive
      ? 'bg-clay-600 text-white shadow-[0_4px_14px_rgba(43,103,119,0.35)]'
      : 'text-clay-200 hover:bg-white/[.06] hover:text-white'
  }`
const iconBtn = 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-clay-200 transition-colors hover:bg-white/[.08] hover:text-white'

interface NavItem { to: string; icon: LucideIcon; label: string; end?: boolean; count?: number; countLabel?: string; dot?: boolean }

// The person's initials, for the round badge at the foot of the sidebar.
function initials(first?: string, last?: string): string {
  return [first, last].map(n => (n ?? '').trim().charAt(0)).join('') || '?'
}

export default function Layout() {
  const { profile } = useAuth()
  const toSign = usePendingSignCount(profile?.uid)
  // A change nobody has read yet is marked, rather than counted: there is
  // one thing to go and look at, not a number of them.
  const unreadNews = useUnreadAnnouncement()
  const isAdmin = profile?.role === 'admin'
  const support = useSupportUnread(profile?.uid, isAdmin)
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSED_KEY) === '1' } catch { return false }
  })
  useEffect(() => {
    try { localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0') } catch { /* storage can be blocked */ }
  }, [collapsed])
  // The admin menus fold away under their heading; remembered like the sidebar.
  const [adminClosed, setAdminClosed] = useState(() => {
    try { return localStorage.getItem(ADMIN_CLOSED_KEY) === '1' } catch { return false }
  })
  useEffect(() => {
    try { localStorage.setItem(ADMIN_CLOSED_KEY, adminClosed ? '1' : '0') } catch { /* storage can be blocked */ }
  }, [adminClosed])

  // Three groups, so a long menu reads as a few short ones: the day's work,
  // the admins' tools (folding away), and help. The person's own page,
  // password and sign-out live at the foot, with their name.
  const work: NavItem[] = [
    { to: '/', icon: FileText, label: 'แบบฟอร์มเบิกจ่าย', end: true },
    // An admin has two history menus — their own documents and everyone's.
    { to: '/history', icon: History, label: isAdmin ? 'ประวัติของผู้ดูแลระบบ' : 'ประวัติ' },
    { to: '/sign', icon: Inbox, label: 'ฟอร์มเอกสารรอเซ็น', count: toSign },
  ]
  const admin: NavItem[] = isAdmin ? [
    { to: '/admin/employees', icon: Users, label: 'ข้อมูลพนักงาน' },
    { to: '/admin/prints', icon: Printer, label: 'ประวัติพิมพ์ทั้งหมดในระบบ' },
    { to: '/admin/support', icon: Headset, label: 'รับเรื่องแจ้งปัญหา', count: support.inbox, countLabel: `รอตอบ ${support.inbox} เรื่อง` },
    { to: '/admin/access-groups', icon: Tags, label: 'จัดการสิทธิ์เข้าถึงฟอร์ม' },
    { to: '/admin/field-options', icon: ListChecks, label: 'Custom Field' },
  ] : []
  const help: NavItem[] = [
    { to: '/manual', icon: BookOpen, label: 'คู่มือการใช้งาน' },
    { to: '/announcements', icon: Megaphone, label: 'ประกาศ', dot: unreadNews },
  ]
  // Folded away, but never while one of its pages is open.
  const adminOpen = !adminClosed || pathname.startsWith('/admin')
  const adminWaiting = admin.reduce((n, i) => n + (i.count ?? 0), 0)

  // A heading over a group; on the icon-only sidebar, a thin rule instead.
  const heading = (title: string) => collapsed
    ? <div className="mx-2 my-2 border-t border-white/[.08]" />
    : <div className="px-3.5 pb-1 pt-4 text-[11px] font-medium text-clay-300">{title}</div>

  const navRow = ({ to, icon: Icon, label, end, count, countLabel, dot }: NavItem) => (
    <NavLink key={to} to={to} end={end} className={navLinkClass(collapsed)} title={collapsed ? label : undefined}>
      {({ isActive }) => (
        <>
          <span className="relative shrink-0">
            <Icon size={18} className="opacity-85" />
            {/* Collapsed to icons only, the count rides on the icon itself. */}
            {collapsed && !!count && (
              <span className="absolute -right-2.5 -top-2">
                <NavCountBadge count={count} active={isActive} label={countLabel ?? `รอเซ็น ${count} ฉบับ`} />
              </span>
            )}
            {dot && (
              <span
                aria-label="มีประกาศใหม่"
                className={`absolute -right-1 -top-0.5 h-2 w-2 rounded-full ring-2 ${isActive ? 'bg-white ring-clay-600' : 'bg-ochre-500 ring-clay-900'}`}
              />
            )}
          </span>
          {!collapsed && (
            <>
              {label}
              {!!count && <NavCountBadge count={count} active={isActive} label={countLabel ?? `รอเซ็น ${count} ฉบับ`} />}
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

        <nav className="scroll-slim flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-2" aria-label="เมนูหลัก">
          {work.map(navRow)}

          {admin.length > 0 && (
            <>
              {collapsed ? heading('') : (
                <button
                  type="button"
                  onClick={() => setAdminClosed(c => !c)}
                  aria-expanded={adminOpen}
                  className="mt-3 flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-left text-[11px] font-medium text-clay-300 transition-colors hover:text-white"
                >
                  <span className="flex-1">ผู้ดูแลระบบ</span>
                  {!adminOpen && <NavCountBadge count={adminWaiting} label={`รอดำเนินการ ${adminWaiting} รายการ`} />}
                  <ChevronDown size={14} className={`transition-transform ${adminOpen ? '' : '-rotate-90'}`} />
                </button>
              )}
              {(adminOpen || collapsed) && admin.map(navRow)}
            </>
          )}

          {heading('ช่วยเหลือ')}
          {help.map(navRow)}
        </nav>

        {/* who is signed in: their page, password, sign-out */}
        <div className={`mt-2 border-t border-white/[.08] px-3 pt-3 ${collapsed ? 'flex flex-col items-center gap-1' : 'flex items-center gap-1'}`}>
          <NavLink
            to="/profile"
            title={collapsed ? 'ข้อมูลของฉัน' : undefined}
            aria-label="ข้อมูลของฉัน"
            className={({ isActive }) => `flex min-w-0 items-center gap-2.5 rounded-lg p-1.5 transition-colors ${collapsed ? '' : 'flex-1'} ${isActive ? 'bg-white/[.08]' : 'hover:bg-white/[.06]'}`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-clay-600 text-xs font-semibold text-white">
              {initials(profile?.firstName, profile?.lastName)}
            </span>
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate text-sm text-white">{profile?.firstName} {profile?.lastName}</span>
                {profile && <span className="block truncate text-[11px] text-clay-300">{roleLabel(profile)}</span>}
              </span>
            )}
          </NavLink>
          <Link to="/change-password" title="เปลี่ยนรหัสผ่าน" aria-label="เปลี่ยนรหัสผ่าน" className={iconBtn}>
            <KeyRound size={17} />
          </Link>
          <button type="button" onClick={() => logout()} title="ออกจากระบบ" aria-label="ออกจากระบบ" className={iconBtn}>
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      {/* bottom padding: the chat button floats over the page's last line */}
      <main className="min-w-0 flex-1 p-6 pb-24 md:p-8 md:pb-24">
        <Outlet />
      </main>
      {/* Not on the inbox itself, where admins already answer — the button would sit over its reply box. */}
      {profile && support.available && !pathname.startsWith('/admin/support') && (
        <SupportChatButton uid={profile.uid} unread={support.mine} />
      )}
    </div>
  )
}
