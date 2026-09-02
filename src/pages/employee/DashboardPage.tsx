import { uiAlert, uiConfirm } from '../../components/dialog/dialogService'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../../auth/AuthProvider'
import type { FormGroup, FormSettings } from '../../types/schema'
import { isActive } from '../../types/schema'
import { listGroups, createGroup, renameGroup, deleteGroup, setGroupActive } from '../../data/formGroups'
import { listForms } from '../../data/formSettings'
import Switch from '../../components/Switch'
import FolderCardIcon from '../../components/FolderCardIcon'

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
    catch { uiAlert('สร้างกลุ่มไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  async function onRenameGroup(g: FormGroup) {
    const name = window.prompt('ชื่อกลุ่มใหม่', g.name)?.trim()
    if (!name || name === g.name) return
    try { await renameGroup(g.id, name); reload() }
    catch { uiAlert('เปลี่ยนชื่อกลุ่มไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  async function onDeleteGroup(g: FormGroup) {
    if (formsForGroup(g).length > 0) { uiAlert('กลุ่มนี้ยังมีฟอร์มอยู่ — กรุณาลบฟอร์มในกลุ่มก่อน'); return }
    if (!(await uiConfirm(`ลบกลุ่ม "${g.name}" ?`, { tone: 'danger', confirmText: 'ลบ' }))) return
    try { await deleteGroup(g.id); reload() }
    catch { uiAlert('ลบกลุ่มไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  async function onToggleGroup(g: FormGroup) {
    try { await setGroupActive(g.id, !isActive(g)); reload() }
    catch { uiAlert('เปลี่ยนสถานะกลุ่มไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  // Forms whose groupId matches — for the first group, also catch forms with no groupId.
  const firstGroupId = groups[0]?.id
  function formsForGroup(g: FormGroup): FormSettings[] {
    return forms.filter(f => (f.groupId ?? firstGroupId) === g.id)
  }

  // Visibility is by ACCESS GROUP (not folder): admins see everything; a
  // non-admin sees a form only if it has no access group (everyone) or its
  // access group matches theirs.
  function canSee(f: FormSettings): boolean {
    if (isAdmin) return true
    return !f.accessGroup || f.accessGroup === profile?.accessGroup
  }
  // Forms visible to the current viewer within a folder (non-admins also need
  // the form to be active).
  function visibleFormsForGroup(g: FormGroup): FormSettings[] {
    return formsForGroup(g).filter(f => canSee(f) && (isAdmin || isActive(f)))
  }

  // Folders are purely organizational: everyone sees all folders, except that a
  // non-admin's inactive folders — or folders with zero visible forms — are hidden.
  const visibleGroups = isAdmin
    ? groups
    : groups.filter(g => isActive(g) && visibleFormsForGroup(g).length > 0)

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
            <Plus size={16} /> สร้างกลุ่ม
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {visibleGroups.map(g => {
          const count = isAdmin ? formsForGroup(g).length : visibleFormsForGroup(g).length
          return (
            <div
              key={g.id}
              role="button"
              tabIndex={0}
              onClick={() => nav(`/group/${g.id}`)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nav(`/group/${g.id}`) } }}
              className={`relative cursor-pointer rounded-lg border border-[#e5eaf3] bg-white p-6 text-center hover:shadow ${isAdmin && !isActive(g) ? 'opacity-60' : ''}`}
            >
              <FolderCardIcon count={count} />
              <div className="mt-3 truncate font-medium text-[#16233f]">{g.name}</div>
              <div className="text-sm text-gray-500">{count} ฟอร์ม</div>
              {isAdmin && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <Switch on={isActive(g)} onChange={() => onToggleGroup(g)} />
                  <span className={`text-xs font-medium ${isActive(g) ? 'text-green-600' : 'text-gray-400'}`}>{isActive(g) ? 'เปิด' : 'ปิด'}</span>
                </div>
              )}
              {isAdmin && (
                <div className="absolute right-2 top-2 flex gap-1">
                  <button
                    title="เปลี่ยนชื่อกลุ่ม"
                    aria-label="เปลี่ยนชื่อกลุ่ม"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e5eaf3] bg-white text-sm hover:border-[#2b5bd7] hover:text-[#2b5bd7]"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRenameGroup(g) }}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    title="ลบกลุ่ม"
                    aria-label="ลบกลุ่ม"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e5eaf3] bg-white text-sm text-[#d64545] hover:border-[#d64545]"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteGroup(g) }}
                  >
                    <Trash2 size={16} />
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
