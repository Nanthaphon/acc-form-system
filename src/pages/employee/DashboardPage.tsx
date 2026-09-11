import { uiAlert, uiConfirm, uiPrompt } from '../../components/dialog/dialogService'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FolderOpen, Pencil, Plus, Trash2 } from 'lucide-react'
import { PageHeader, ui } from '../../components/ui'
import { useAuth } from '../../auth/AuthProvider'
import type { FormGroup, FormSettings } from '../../types/schema'
import { isActive, canSeeForm } from '../../types/schema'
import { listGroups, createGroup, renameGroup, deleteGroup, setGroupActive } from '../../data/formGroups'
import { listForms } from '../../data/formSettings'
import Switch from '../../components/Switch'
import FolderCardIcon from '../../components/FolderCardIcon'
import ActionIconButton from '../../components/ActionIconButton'

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
    const name = (await uiPrompt('ตั้งชื่อกลุ่มฟอร์ม', { title: 'สร้างกลุ่มฟอร์ม', placeholder: 'เช่น เบิกค่าใช้จ่าย', confirmText: 'สร้าง' }))?.trim()
    if (!name) return
    try { await createGroup(name); reload() }
    catch { uiAlert('สร้างกลุ่มไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  async function onRenameGroup(g: FormGroup) {
    const name = (await uiPrompt('ตั้งชื่อกลุ่มใหม่', { title: 'เปลี่ยนชื่อกลุ่ม', defaultValue: g.name, confirmText: 'บันทึก' }))?.trim()
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

  // Visibility is by ACCESS GROUP (not folder) — see canSeeForm.
  const canSee = (f: FormSettings) => canSeeForm(f, profile?.accessGroup, isAdmin)
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
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          คุณยังใช้รหัสผ่านเริ่มต้น — <Link to="/change-password" className="font-medium underline">เปลี่ยนรหัสผ่าน</Link>
        </div>
      )}
      <PageHeader
        icon={<FolderOpen size={20} />}
        title="เลือกกลุ่มฟอร์ม"
        subtitle={`${visibleGroups.length} กลุ่ม`}
        actions={isAdmin && (
          <button onClick={onCreateGroup} className={ui.btnPrimary}>
            <Plus size={16} /> สร้างกลุ่ม
          </button>
        )}
      />

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
              className={`relative cursor-pointer rounded-xl border border-gray-200 bg-white p-6 text-center transition hover:border-gray-300 hover:shadow-md ${isAdmin && !isActive(g) ? 'opacity-60' : ''}`}
            >
              <FolderCardIcon count={count} />
              <div className="mt-3 truncate font-medium text-gray-900">{g.name}</div>
              <div className="text-sm text-gray-500">{count} ฟอร์ม</div>
              {isAdmin && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <Switch on={isActive(g)} onChange={() => onToggleGroup(g)} />
                  <span className={`text-xs font-medium ${isActive(g) ? 'text-green-600' : 'text-gray-400'}`}>{isActive(g) ? 'เปิด' : 'ปิด'}</span>
                </div>
              )}
              {isAdmin && (
                <div className="absolute right-2 top-2 flex gap-1">
                  <ActionIconButton
                    label="เปลี่ยนชื่อกลุ่ม"
                    icon={<Pencil size={16} />}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRenameGroup(g) }}
                  />
                  <ActionIconButton
                    label="ลบกลุ่ม"
                    tone="red"
                    icon={<Trash2 size={16} />}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteGroup(g) }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
