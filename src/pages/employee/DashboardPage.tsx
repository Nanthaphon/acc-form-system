import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'

export default function DashboardPage() {
  const { profile } = useAuth()
  const nav = useNavigate()
  const isAdmin = profile?.role === 'admin'
  return (
    <div>
      {profile?.mustChangePassword && (
        <div className="mb-4 rounded bg-yellow-50 p-3 text-sm">
          คุณยังใช้รหัสผ่านเริ่มต้น — <Link to="/change-password" className="text-blue-600 underline">เปลี่ยนรหัสผ่าน</Link>
        </div>
      )}
      <h1 className="mb-4 text-xl font-medium">เลือกฟอร์ม</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Link to="/form" className="relative rounded-lg border bg-white p-6 hover:shadow">
          <div className="font-medium">ใบเบิกค่าใช้จ่าย</div>
          <div className="text-sm text-gray-500">GAC6709-003</div>
          {isAdmin && (
            <button
              title="แก้ไขฟอร์ม"
              aria-label="แก้ไขฟอร์ม"
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg border border-[#e5eaf3] bg-white text-sm hover:border-[#2b5bd7] hover:text-[#2b5bd7]"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); nav('/form/expense-claim/edit') }}
            >
              ✏️
            </button>
          )}
        </Link>
      </div>
    </div>
  )
}
