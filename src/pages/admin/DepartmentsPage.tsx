import { uiAlert, uiConfirm, uiPrompt } from '../../components/dialog/dialogService'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Building2, Pencil, Plus, Trash2 } from 'lucide-react'
import ActionIconButton from '../../components/ActionIconButton'
import type { Department } from '../../types/schema'
import { listDepartments, createDepartment, renameDepartment, deleteDepartment, departmentUsage } from '../../data/departments'

export default function DepartmentsPage() {
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
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:border-gray-300 hover:text-gray-900"><ArrowLeft size={16} /> กลับ</Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-500"><Building2 size={20} /></div>
        <h1 className="text-xl font-semibold text-gray-900">จัดการแผนก</h1>
        <button
          onClick={onAdd}
          className="ml-auto inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={16} /> เพิ่มแผนก
        </button>
      </div>

      <p className="text-sm text-gray-500">
        แผนกใช้กำหนดว่าใครเป็นหัวหน้าเซ็นอนุมัติให้พนักงานคนไหน · กำหนดแผนกให้พนักงานได้ในหน้าข้อมูลพนักงาน
      </p>

      <div className="rounded-xl border border-gray-200 bg-white">
        {loading ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">กำลังโหลด...</div>
        ) : depts.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">ยังไม่มีแผนก — กด “เพิ่มแผนก” เพื่อสร้าง</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {depts.map(d => (
              <li key={d.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="text-sm font-medium text-gray-900">{d.name}</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <ActionIconButton label="เปลี่ยนชื่อ" icon={<Pencil size={16} />} onClick={() => onRename(d)} />
                  <ActionIconButton label="ลบแผนก" tone="red" icon={<Trash2 size={16} />} onClick={() => onDelete(d)} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
