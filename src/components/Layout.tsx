import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { logout } from '../data/auth'

export default function Layout() {
  const { profile } = useAuth()
  return (
    <div className="min-h-screen">
      <nav className="flex items-center gap-4 border-b bg-white px-6 py-3">
        <Link to="/" className="font-medium">แบบฟอร์มเบิกจ่าย</Link>
        <Link to="/history">ประวัติ</Link>
        {profile?.role === 'admin' && <>
          <Link to="/admin/employees">พนักงาน</Link>
          <Link to="/admin/prints">ประวัติการพิมพ์</Link>
        </>}
        <span className="ml-auto text-sm text-gray-600">{profile?.firstName} {profile?.lastName}</span>
        <Link to="/change-password" className="text-sm">เปลี่ยนรหัส</Link>
        <button onClick={() => logout()} className="text-sm text-red-600">ออก</button>
      </nav>
      <main className="p-6"><Outlet /></main>
    </div>
  )
}
