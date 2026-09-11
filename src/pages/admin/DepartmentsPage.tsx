import { uiAlert, uiConfirm, uiPrompt } from '../../components/dialog/dialogService'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Pencil, Plus, Trash2 } from 'lucide-react'
import ActionIconButton from '../../components/ActionIconButton'
import { PageHeader, ui } from '../../components/ui'
import type { Department } from '../../types/schema'
import { listDepartments, createDepartment, renameDepartment, deleteDepartment, departmentUsage } from '../../data/departments'

export default function DepartmentsPage() {
  const nav = useNavigate()
  const [depts, setDepts] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)

  function reload() { listDepartments().then(d => { setDepts(d); setLoading(false) }) }
  useEffect(() => { reload() }, [])

  async function onAdd() {
    const name = (await uiPrompt('ตั้งชื่อแผนกใหม่', { title: 'เพิ่มแผนก', confirmText: 'เพิ่ม' }))?.trim()
    if (!name) return
    try { await createDepartment(name); reload() }
    catch { uiAlert('เพิ่มแผนกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  async function onRename(d: Department) {
    const name = (await uiPrompt('ตั้งชื่อแผนกใหม่', { title: 'เปลี่ยนชื่อแผนก', defaultValue: d.name, confirmText: 'บันทึก' }))?.trim()
    if (!name || name === d.name) return
    try { await renameDepartment(d.id, name); reload() }
    catch { uiAlert('เปลี่ยนชื่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  async function onDelete(d: Department) {
    const used = await departmentUsage(d.id)
    if (used > 0) {
      uiAlert(`ลบไม่ได้ — ยังมีพนักงาน ${used} คนอยู่แผนกนี้\nกรุณาย้ายพนักงานออกจากแผนกนี้ก่อน`)
      return
    }
    if (!(await uiConfirm(`ลบแผนก "${d.name}" ?`, { tone: 'danger', confirmText: 'ลบ' }))) return
    try { await deleteDepartment(d.id); reload() }
    catch { uiAlert('ลบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        onBack={() => nav('/')}
        icon={<Building2 size={20} />}
        title="จัดการแผนก"
        subtitle={loading ? 'กำลังโหลด...' : `ทั้งหมด ${depts.length} แผนก`}
        actions={
          <button onClick={onAdd} className={ui.btnPrimary}>
            <Plus size={16} /> เพิ่มแผนก
          </button>
        }
      />

      <p className="mb-4 text-sm text-gray-500">
        แผนกใช้กำหนดว่าใครเป็นหัวหน้าเซ็นอนุมัติให้พนักงานคนไหน · กำหนดแผนกให้พนักงานได้ในหน้าข้อมูลพนักงาน
      </p>

      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead className={ui.thead}>
            <tr>
              <th className={ui.th}>ชื่อแผนก</th>
              <th className={ui.th}></th>
            </tr>
          </thead>
          <tbody className={ui.tbody}>
            {loading ? (
              <tr><td colSpan={2} className={ui.emptyCell}>กำลังโหลด...</td></tr>
            ) : depts.length === 0 ? (
              <tr><td colSpan={2} className={ui.emptyCell}>ยังไม่มีแผนก — กด “เพิ่มแผนก” เพื่อสร้าง</td></tr>
            ) : (
              depts.map(d => (
                <tr key={d.id} className={ui.tr}>
                  <td className={`${ui.td} font-medium text-gray-900`}>{d.name}</td>
                  <td className={ui.td}>
                    <div className="flex items-center justify-end gap-1.5">
                      <ActionIconButton label="เปลี่ยนชื่อ" icon={<Pencil size={16} />} onClick={() => onRename(d)} />
                      <ActionIconButton label="ลบแผนก" tone="red" icon={<Trash2 size={16} />} onClick={() => onDelete(d)} />
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
