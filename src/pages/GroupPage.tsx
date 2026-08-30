import { uiAlert, uiConfirm } from '../components/dialog/dialogService'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Folder, Pencil, Plus, SquarePen, Trash2 } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import type { FormGroup, FormSettings } from '../types/schema'
import { isActive } from '../types/schema'
import { listGroups, renameGroup } from '../data/formGroups'
import { listForms, createForm, renameForm, deleteForm, setFormActive } from '../data/formSettings'
import Switch from '../components/Switch'

export default function GroupPage() {
  const { groupId } = useParams<{ groupId: string }>()
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

  const group = groups.find(g => g.id === groupId)
  // Same fallback rule as the dashboard: forms without a groupId belong to the first group.
  const firstGroupId = groups[0]?.id
  // Visibility is by ACCESS GROUP (not folder): admins see everything; a
  // non-admin sees a form only if it has no access group or it matches theirs.
  const canSee = (f: FormSettings) => isAdmin || !f.accessGroup || f.accessGroup === profile?.accessGroup
  const groupActive = !group || isActive(group)
  const groupForms = forms.filter(f =>
    (f.groupId ?? firstGroupId) === groupId && canSee(f) && (isAdmin || (isActive(f) && groupActive))
  )

  async function onRenameGroup() {
    if (!group) return
    const name = window.prompt('ชื่อกลุ่มใหม่', group.name)?.trim()
    if (!name || name === group.name) return
    try { await renameGroup(group.id, name); reload() }
    catch { uiAlert('เปลี่ยนชื่อกลุ่มไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  async function onCreateForm() {
    if (!groupId) return
    const name = window.prompt('ชื่อฟอร์มใหม่')?.trim()
    if (!name) return
    try {
      const newId = await createForm(name, groupId)
      nav(`/form/${newId}/edit`)
    } catch { uiAlert('สร้างฟอร์มไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  async function onRenameForm(form: FormSettings) {
    const name = window.prompt('ชื่อฟอร์มใหม่', form.name || form.title)?.trim()
    if (!name) return
    try { await renameForm(form.formType, name); reload() }
    catch { uiAlert('เปลี่ยนชื่อฟอร์มไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  async function onDeleteForm(form: FormSettings) {
    if (!(await uiConfirm(`เอกสารที่พนักงานเคยกรอกไว้จะยังอยู่`, { title: `ลบฟอร์ม "${form.name || form.title}" ?`, tone: 'danger', confirmText: 'ลบ' }))) return
    try { await deleteForm(form.formType); reload() }
    catch { uiAlert('ลบฟอร์มไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  async function onToggleForm(form: FormSettings) {
    try { await setFormActive(form.formType, !isActive(form)); reload() }
    catch { uiAlert('เปลี่ยนสถานะฟอร์มไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => nav('/')}
          className="inline-flex items-center gap-1 rounded-[10px] border border-[#e5eaf3] bg-white px-3 py-1.5 text-sm font-medium text-[#16233f] hover:border-[#2b5bd7] hover:text-[#2b5bd7]"
        >
          <ArrowLeft size={16} /> กลับ
        </button>
        <span className="text-2xl"><Folder size={24} /></span>
        <h1 className="text-xl font-medium text-[#16233f]">{group?.name ?? 'กลุ่มฟอร์ม'}</h1>
        {isAdmin && group && (
          <button
            title="เปลี่ยนชื่อกลุ่ม"
            aria-label="เปลี่ยนชื่อกลุ่ม"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e5eaf3] bg-white text-sm hover:border-[#2b5bd7] hover:text-[#2b5bd7]"
            onClick={onRenameGroup}
          >
            <Pencil size={16} />
          </button>
        )}
        {isAdmin && (
          <button
            onClick={onCreateForm}
            className="ml-auto inline-flex items-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed border-[#b9c4da] bg-white px-3.5 py-2 text-sm font-medium text-[#2b5bd7] hover:border-[#2b5bd7]"
          >
            <Plus size={16} /> สร้างฟอร์ม
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {groupForms.map(form => (
          <div
            key={form.formType}
            role="button"
            tabIndex={0}
            onClick={() => nav(`/form/${form.formType}`)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nav(`/form/${form.formType}`) } }}
            className={`relative cursor-pointer rounded-lg border border-[#e5eaf3] bg-white p-6 hover:shadow ${isAdmin && !isActive(form) ? 'opacity-60' : ''}`}
          >
            <div className="font-medium text-[#16233f]">{form.name || form.title}</div>
            <div className="text-sm text-gray-500">{form.formCode}</div>
            {isAdmin && (
              <div className="mt-3 flex items-center gap-2">
                <Switch on={isActive(form)} onChange={() => onToggleForm(form)} />
                <span className={`text-xs font-medium ${isActive(form) ? 'text-green-600' : 'text-gray-400'}`}>{isActive(form) ? 'เปิดใช้งาน' : 'ปิดปรับปรุง'}</span>
              </div>
            )}
            {isAdmin && (
              <div className="absolute right-2 top-2 flex gap-1">
                <button
                  title="แก้ไขฟอร์ม"
                  aria-label="แก้ไขฟอร์ม"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e5eaf3] bg-white text-sm hover:border-[#2b5bd7] hover:text-[#2b5bd7]"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); nav(`/form/${form.formType}/edit`) }}
                >
                  <Pencil size={16} />
                </button>
                <button
                  title="เปลี่ยนชื่อฟอร์ม"
                  aria-label="เปลี่ยนชื่อฟอร์ม"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e5eaf3] bg-white text-sm hover:border-[#2b5bd7] hover:text-[#2b5bd7]"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRenameForm(form) }}
                >
                  <SquarePen size={16} />
                </button>
                <button
                  title="ลบฟอร์ม"
                  aria-label="ลบฟอร์ม"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e5eaf3] bg-white text-sm text-[#d64545] hover:border-[#d64545]"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteForm(form) }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
        ))}
        {groupForms.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed border-[#e5eaf3] p-6 text-sm text-[#7a869a]">
            ยังไม่มีฟอร์มในกลุ่มนี้
          </div>
        )}
      </div>
    </div>
  )
}
