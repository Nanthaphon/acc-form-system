import { uiAlert, uiConfirm, uiPrompt } from '../../components/dialog/dialogService'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus, Tags, Trash2 } from 'lucide-react'
import ActionIconButton from '../../components/ActionIconButton'
import type { AccessGroup } from '../../types/schema'
import { listAccessGroups, createAccessGroup, renameAccessGroup, deleteAccessGroup, accessGroupUsage } from '../../data/accessGroups'

export default function AccessGroupsPage() {
  const [groups, setGroups] = useState<AccessGroup[]>([])
  const [loading, setLoading] = useState(true)

  function reload() { listAccessGroups().then(g => { setGroups(g); setLoading(false) }) }
  useEffect(() => { reload() }, [])

  async function onAdd() {
    const name = (await uiPrompt('ตั้งชื่อกลุ่มการเข้าถึงใหม่', { title: 'เพิ่มกลุ่ม', confirmText: 'เพิ่ม' }))?.trim()
    if (!name) return
    try { await createAccessGroup(name); reload() }
    catch { uiAlert('เพิ่มกลุ่มไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  async function onRename(g: AccessGroup) {
    const name = (await uiPrompt('ตั้งชื่อกลุ่มใหม่', { title: 'เปลี่ยนชื่อกลุ่ม', defaultValue: g.name, confirmText: 'บันทึก' }))?.trim()
    if (!name || name === g.name) return
    try { await renameAccessGroup(g.id, name); reload() }
    catch { uiAlert('เปลี่ยนชื่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  async function onDelete(g: AccessGroup) {
    const usage = await accessGroupUsage(g.id)
    if (usage.employees > 0 || usage.forms > 0) {
      uiAlert(`ลบไม่ได้ — กลุ่มนี้ยังถูกใช้อยู่ (พนักงาน ${usage.employees} คน, ฟอร์ม ${usage.forms} ฟอร์ม)\nกรุณาย้ายพนักงานและฟอร์มออกจากกลุ่มนี้ก่อน`)
      return
    }
    if (!(await uiConfirm(`ลบกลุ่ม "${g.name}" ?`, { tone: 'danger', confirmText: 'ลบ' }))) return
    try { await deleteAccessGroup(g.id); reload() }
    catch { uiAlert('ลบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:border-gray-300 hover:text-gray-900"><ArrowLeft size={16} /> กลับ</Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-500"><Tags size={20} /></div>
        <h1 className="text-xl font-semibold text-gray-900">จัดการกลุ่ม</h1>
        <button
          onClick={onAdd}
          className="ml-auto inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={16} /> เพิ่มกลุ่ม
        </button>
      </div>

      <p className="text-sm text-gray-500">
        กลุ่มใช้กำหนดว่าฟอร์มไหนให้พนักงานกลุ่มใดเห็น · เพิ่มกลุ่มที่นี่แล้วจะเลือกได้ในข้อมูลพนักงานและหน้าแก้ไขฟอร์ม
      </p>

      <div className="rounded-xl border border-gray-200 bg-white">
        {loading ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">กำลังโหลด...</div>
        ) : groups.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">ยังไม่มีกลุ่ม — กด “เพิ่มกลุ่ม” เพื่อสร้าง</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {groups.map(g => (
              <li key={g.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="text-sm font-medium text-gray-900">{g.name}</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <ActionIconButton label="เปลี่ยนชื่อ" icon={<Pencil size={16} />} onClick={() => onRename(g)} />
                  <ActionIconButton label="ลบกลุ่ม" tone="red" icon={<Trash2 size={16} />} onClick={() => onDelete(g)} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
