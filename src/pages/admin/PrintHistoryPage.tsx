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
import { Badge, PageHeader, ui } from '../../components/ui'

const HEADERS = [
  { label: 'ชื่อฟอร์ม', cls: '' },
  { label: 'เลขที่', cls: '' },
  { label: 'พนักงาน', cls: '' },
  { label: 'วันที่', cls: '' },
  { label: 'ยอด', cls: 'text-right' },
  { label: 'สถานะ', cls: '' },
  { label: 'แก้ไข', cls: '' },
  { label: 'พิมพ์ (ครั้ง)', cls: 'text-center' },
  { label: 'พิมพ์ล่าสุด', cls: '' },
  { label: '', cls: '' },
]

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
  const filtered = applyFilters(rows, filters, { formGroup, formName })

  return (
    <div>
      <PageHeader
        icon={<Printer size={20} />}
        title="ประวัติการพิมพ์ทั้งหมด"
        subtitle={`ทั้งหมด ${rows.length} รายการ`}
      />
      <div className="mb-4">
        <SubmissionFilterBar value={filters} onChange={setFilters} forms={forms} groups={groups} employees={employees} resultCount={filtered.length} />
      </div>
      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead className={ui.thead}>
            <tr>{HEADERS.map(h => <th key={h.label} className={`${ui.th} ${h.cls}`}>{h.label}</th>)}</tr>
          </thead>
          <tbody className={ui.tbody}>
            {filtered.map(r => (
              <tr key={r.id} className={ui.tr}>
                <td className={`${ui.td} font-medium text-gray-900`}>{formName(r.formType)}</td>
                <td className={`${ui.td} whitespace-nowrap font-mono text-[13px]`}>{r.docNumber}</td>
                <td className={`${ui.td} whitespace-nowrap`}>
                  {empName(r.createdByEmployeeId)} <span className="text-gray-400">({r.createdByEmployeeId})</span>
                </td>
                <td className={`${ui.td} whitespace-nowrap`}>{formatDate(r.createdAt)}</td>
                <td className={`${ui.td} whitespace-nowrap text-right tabular-nums`}>{submissionAmount(r).toLocaleString()}</td>
                <td className={`${ui.td} whitespace-nowrap`}>
                  <StatusBadge sub={r} />
                </td>
                <td className={`${ui.td} whitespace-nowrap`}>
                  {editLabel(r, vcounts)
                    ? <Badge tone="amber">✎ {editLabel(r, vcounts)}</Badge>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className={`${ui.td} text-center tabular-nums`}>{r.printCount}</td>
                <td className={`${ui.td} whitespace-nowrap`}>{formatDateTime(r.lastPrintedAt)}</td>
                <td className="whitespace-nowrap px-4 py-2">
                  <div className="flex items-center justify-end gap-1.5">
                    <ActionIconButton label="แก้ไข" to={`/submission/${r.id}`} icon={<Pencil size={16} />} />
                    <ActionIconButton label="พิมพ์" to={`/submission/${r.id}/preview`} tone="green" icon={<Printer size={16} />} />
                    <ActionIconButton label="คัดลอก" to={`/form/${r.formType}?clone=${r.id}`} tone="indigo" icon={<Copy size={16} />} />
                    <ActionIconButton label="ลบ" onClick={() => onDelete(r)} tone="red" icon={<Trash2 size={16} />} />
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={HEADERS.length} className={ui.emptyCell}>
                  {rows.length === 0 ? 'ยังไม่มีเอกสาร' : 'ไม่พบเอกสารที่ตรงกับตัวกรอง'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
