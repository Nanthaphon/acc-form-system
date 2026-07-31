import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import type { FormGroup, FormSettings } from '../../types/schema'
import { listGroups, createGroup, deleteGroup } from '../../data/formGroups'
import { listForms, createForm, deleteForm } from '../../data/formSettings'

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

  async function onCreateForm(groupId: string) {
    const name = window.prompt('ชื่อฟอร์มใหม่')?.trim()
    if (!name) return
    try {
      const newId = await createForm(name, groupId)
      nav(`/form/${newId}/edit`)
    } catch { alert('สร้างฟอร์มไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  async function onDeleteForm(form: FormSettings) {
    if (!confirm(`ลบฟอร์ม "${form.name || form.title}" ?\n(เอกสารที่พนักงานเคยกรอกไว้จะยังอยู่)`)) return
    try { await deleteForm(form.formType); reload() }
    catch { alert('ลบฟอร์มไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
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
        <h1 className="text-xl font-medium">เลือกฟอร์ม</h1>
        {isAdmin && (
          <button
            onClick={onCreateGroup}
            className="ml-auto inline-flex items-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed border-[#b9c4da] bg-white px-3.5 py-2 text-sm font-medium text-[#2b5bd7] hover:border-[#2b5bd7]"
          >
            ＋ สร้างกลุ่ม
          </button>
        )}
      </div>

      <div className="space-y-6">
        {groups.map(g => (
          <section key={g.id}>
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#16233f]">{g.name}</h2>
              {isAdmin && (
                <button
                  onClick={() => onCreateForm(g.id)}
                  className="text-xs font-medium text-[#2b5bd7] hover:underline"
                >
                  ＋ สร้างฟอร์ม
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => onDeleteGroup(g)}
                  className="text-xs font-medium text-[#d64545] hover:underline"
                >
                  ลบกลุ่ม
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {formsForGroup(g).map(form => (
                <div
                  key={form.formType}
                  role="button"
                  tabIndex={0}
                  onClick={() => nav(`/form/${form.formType}`)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nav(`/form/${form.formType}`) } }}
                  className="relative cursor-pointer rounded-lg border bg-white p-6 hover:shadow"
                >
                  <div className="font-medium">{form.name || form.title}</div>
                  <div className="text-sm text-gray-500">{form.formCode}</div>
                  {isAdmin && (
                    <div className="absolute right-2 top-2 flex gap-1">
                      <button
                        title="แก้ไขฟอร์ม"
                        aria-label="แก้ไขฟอร์ม"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e5eaf3] bg-white text-sm hover:border-[#2b5bd7] hover:text-[#2b5bd7]"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); nav(`/form/${form.formType}/edit`) }}
                      >
                        ✏️
                      </button>
                      <button
                        title="ลบฟอร์ม"
                        aria-label="ลบฟอร์ม"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e5eaf3] bg-white text-sm text-[#d64545] hover:border-[#d64545]"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteForm(form) }}
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {formsForGroup(g).length === 0 && (
                <div className="col-span-full rounded-lg border border-dashed border-[#e5eaf3] p-6 text-sm text-[#7a869a]">
                  ยังไม่มีฟอร์มในกลุ่มนี้
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
