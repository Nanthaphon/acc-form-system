import { uiAlert, uiConfirm, uiPrompt } from '../../components/dialog/dialogService'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react'
import ActionIconButton from '../../components/ActionIconButton'
import { PageHeader, ui } from '../../components/ui'
import type { AccessGroup } from '../../types/schema'
import { listAccessGroups, createAccessGroup, renameAccessGroup, deleteAccessGroup, accessGroupUsage } from '../../data/accessGroups'

export default function AccessGroupsPage() {
  const nav = useNavigate()
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
    <div className="max-w-2xl">
      <PageHeader
        onBack={() => nav('/')}
        icon={<Tags size={20} />}
        title="จัดการกลุ่ม"
        subtitle={loading ? 'กำลังโหลด...' : `ทั้งหมด ${groups.length} กลุ่ม`}
        actions={
          <button onClick={onAdd} className={ui.btnPrimary}>
            <Plus size={16} /> เพิ่มกลุ่ม
          </button>
        }
      />

      <p className="mb-4 text-sm text-gray-500">
        กลุ่มใช้กำหนดว่าฟอร์มไหนให้พนักงานกลุ่มใดเห็น · เพิ่มกลุ่มที่นี่แล้วจะเลือกได้ในข้อมูลพนักงานและหน้าแก้ไขฟอร์ม
      </p>

      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead className={ui.thead}>
            <tr>
              <th className={ui.th}>ชื่อกลุ่ม</th>
              <th className={ui.th}></th>
            </tr>
          </thead>
          <tbody className={ui.tbody}>
            {loading ? (
              <tr><td colSpan={2} className={ui.emptyCell}>กำลังโหลด...</td></tr>
            ) : groups.length === 0 ? (
              <tr><td colSpan={2} className={ui.emptyCell}>ยังไม่มีกลุ่ม — กด “เพิ่มกลุ่ม” เพื่อสร้าง</td></tr>
            ) : (
              groups.map(g => (
                <tr key={g.id} className={ui.tr}>
                  <td className={`${ui.td} font-medium text-gray-900`}>{g.name}</td>
                  <td className={ui.td}>
                    <div className="flex items-center justify-end gap-1.5">
                      <ActionIconButton label="เปลี่ยนชื่อ" icon={<Pencil size={16} />} onClick={() => onRename(g)} />
                      <ActionIconButton label="ลบกลุ่ม" tone="red" icon={<Trash2 size={16} />} onClick={() => onDelete(g)} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
