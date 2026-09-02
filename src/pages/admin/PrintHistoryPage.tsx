import { uiAlert, uiConfirm } from '../../components/dialog/dialogService'
import { useEffect, useState } from 'react'
import { Copy, Pencil, Printer, Trash2 } from 'lucide-react'
import { listAllSubmissions, submissionAmount, deleteSubmission } from '../../data/submissions'
import StatusBadge from '../../components/StatusBadge'
import { getVersionCounts, editLabel } from '../../data/versions'
import { listEmployees } from '../../data/users'
import { listForms } from '../../data/formSettings'
import { listGroups } from '../../data/formGroups'
import type { Submission, UserProfile, FormSettings, FormGroup } from '../../types/schema'
import { formatDate, formatDateTime } from '../../shared/date'
import type { Filters } from '../../shared/submissionFilter'
import { emptyFilters, applyFilters } from '../../shared/submissionFilter'
import SubmissionFilterBar from '../../components/SubmissionFilterBar'
import ActionIconButton from '../../components/ActionIconButton'

export default function PrintHistoryPage() {
  const [rows, setRows] = useState<Submission[]>([])
  const [employees, setEmployees] = useState<UserProfile[]>([])
  const [forms, setForms] = useState<FormSettings[]>([])
  const [groups, setGroups] = useState<FormGroup[]>([])
  const [vcounts, setVcounts] = useState<Record<string, number>>({})
  const [filters, setFilters] = useState<Filters>(emptyFilters)

  function loadRows() { listAllSubmissions().then(setRows) }
  useEffect(() => {
    loadRows()
    listEmployees().then(setEmployees)
    listForms().then(setForms)
    listGroups().then(setGroups)
    getVersionCounts().then(setVcounts)
  }, [])

  async function onDelete(r: Submission) {
    if (!(await uiConfirm(`ลบถาวร ยกเลิกไม่ได้`, { title: `ลบเอกสาร "${r.docNumber || 'ไม่มีเลขที่'}" ?`, tone: 'danger', confirmText: 'ลบ' }))) return
    try { await deleteSubmission(r.id); loadRows() }
    catch { uiAlert('ลบเอกสารไม่สำเร็จ') }
  }

  const empName = (eid: string) => {
    const p = employees.find(e => e.employeeId === eid)
    return p ? `${p.firstName} ${p.lastName}` : ''
  }
  const formName = (ft: string) => {
    const f = forms.find(x => x.formType === ft)
    return f?.name || f?.title || ft
  }

  const formGroup = (ft: string) => forms.find(f => f.formType === ft)?.groupId ?? groups[0]?.id
  const filtered = applyFilters(rows, filters, empName, formGroup, formName)

  return (
    <div>
      <div className="mb-4 space-y-3">
        <h1 className="text-xl font-medium">ประวัติการพิมพ์ทั้งหมด</h1>
        <SubmissionFilterBar value={filters} onChange={setFilters} forms={forms} groups={groups} employees={employees} resultCount={filtered.length} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border text-sm">
          <thead className="bg-gray-50">
            <tr>{['ชื่อฟอร์ม', 'เลขที่', 'พนักงาน', 'วันที่', 'ยอด', 'สถานะ', 'แก้ไข', 'พิมพ์ (ครั้ง)', 'พิมพ์ล่าสุด', ''].map(h => (
              <th key={h} className="border px-2 py-1 whitespace-nowrap">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="border px-2 py-1">{formName(r.formType)}</td>
                <td className="border px-2 py-1 whitespace-nowrap">{r.docNumber}</td>
                <td className="border px-2 py-1 whitespace-nowrap">
                  {empName(r.createdByEmployeeId)} <span className="text-gray-400">({r.createdByEmployeeId})</span>
                </td>
                <td className="border px-2 py-1 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                <td className="border px-2 py-1 text-right">{submissionAmount(r).toLocaleString()}</td>
                <td className="border px-2 py-1 text-center">
                  <StatusBadge sub={r} />
                </td>
                <td className="border px-2 py-1 whitespace-nowrap text-center">
                  {editLabel(r, vcounts)
                    ? <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">✎ {editLabel(r, vcounts)}</span>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="border px-2 py-1 text-center">{r.printCount}</td>
                <td className="border px-2 py-1 whitespace-nowrap">{formatDateTime(r.lastPrintedAt)}</td>
                <td className="border px-2 py-1 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <ActionIconButton label="แก้ไข" to={`/submission/${r.id}`} icon={<Pencil size={16} />} />
                    <ActionIconButton label="พิมพ์" to={`/submission/${r.id}/preview`} tone="green" icon={<Printer size={16} />} />
                    <ActionIconButton label="คัดลอก" to={`/form/${r.formType}?clone=${r.id}`} tone="indigo" icon={<Copy size={16} />} />
                    <ActionIconButton label="ลบ" onClick={() => onDelete(r)} tone="red" icon={<Trash2 size={16} />} />
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="border px-2 py-6 text-center text-gray-400">ยังไม่มีเอกสาร</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
