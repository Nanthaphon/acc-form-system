import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import type { FormGroup, FormSettings } from '../../types/schema'
import { listGroups, createGroup, renameGroup, deleteGroup } from '../../data/formGroups'
import { listForms } from '../../data/formSettings'

export default function DashboardPage() {
  const { profile } = useAuth()
  const nav = useNavigate()
  const isAdmin = profile?.role === 'admin'
  const [groups, setGroups] = useState<FormGroup[]>([])
  const [forms, setForms] = useState<FormSettings[]>([])

  function reload() {
    listGroups().then(setGroups)
    listForms().then(setForms)
  }
  useEffect(() => { reload() }, [])

  async function onCreateGroup() {
    const name = window.prompt('ชื่อกลุ่มฟอร์ม')?.trim()
    if (!name) return
    try { await createGroup(name); reload() }
    catch { alert('สร้างกลุ่มไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  async function onRenameGroup(g: FormGroup) {
    const name = window.prompt('ชื่อกลุ่มใหม่', g.name)?.trim()
    if (!name || name === g.name) return
    try { await renameGroup(g.id, name); reload() }
    catch { alert('เปลี่ยนชื่อกลุ่มไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  async function onDeleteGroup(g: FormGroup) {
    if (formsForGroup(g).length > 0) { alert('กลุ่มนี้ยังมีฟอร์มอยู่ — กรุณาลบฟอร์มในกลุ่มก่อน'); return }
    if (!confirm(`ลบกลุ่ม "${g.name}" ?`)) return
    try { await deleteGroup(g.id); reload() }
    catch { alert('ลบกลุ่มไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  // Forms whose groupId matches — for the first group, also catch forms with no groupId.
  const firstGroupId = groups[0]?.id
  function formsForGroup(g: FormGroup): FormSettings[] {
    return forms.filter(f => (f.groupId ?? firstGroupId) === g.id)
  }

  return (
    <div>
      {profile?.mustChangePassword && (
        <div className="mb-4 rounded bg-yellow-50 p-3 text-sm">
          คุณยังใช้รหัสผ่านเริ่มต้น — <Link to="/change-password" className="text-blue-600 underline">เปลี่ยนรหัสผ่าน</Link>
        </div>
      )}
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-xl font-medium">เลือกกลุ่มฟอร์ม</h1>
        {isAdmin && (
          <button
            onClick={onCreateGroup}
            className="ml-auto inline-flex items-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed border-[#b9c4da] bg-white px-3.5 py-2 text-sm font-medium text-[#2b5bd7] hover:border-[#2b5bd7]"
          >
            ＋ สร้างกลุ่ม
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {groups.map(g => {
          const count = formsForGroup(g).length
          return (
            <div
              key={g.id}
              role="button"
              tabIndex={0}
              onClick={() => nav(`/group/${g.id}`)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nav(`/group/${g.id}`) } }}
              className="relative cursor-pointer rounded-lg border border-[#e5eaf3] bg-white p-6 text-center hover:shadow"
            >
              <div className="text-4xl">📁</div>
              <div className="mt-2 truncate font-medium text-[#16233f]">{g.name}</div>
              <div className="text-sm text-gray-500">{count} ฟอร์ม</div>
              {isAdmin && (
                <div className="absolute right-2 top-2 flex gap-1">
                  <button
                    title="เปลี่ยนชื่อกลุ่ม"
                    aria-label="เปลี่ยนชื่อกลุ่ม"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e5eaf3] bg-white text-sm hover:border-[#2b5bd7] hover:text-[#2b5bd7]"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRenameGroup(g) }}
                  >
                    ✏️
                  </button>
                  <button
                    title="ลบกลุ่ม"
                    aria-label="ลบกลุ่ม"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e5eaf3] bg-white text-sm text-[#d64545] hover:border-[#d64545]"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteGroup(g) }}
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
