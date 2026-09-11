import { uiAlert, uiConfirm } from '../../components/dialog/dialogService'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Copy, Pencil, Printer, Trash2 } from 'lucide-react'
import { listAllSubmissions, submissionAmount, deleteSubmission } from '../../data/submissions'
import StatusBadge from '../../components/StatusBadge'
import { getVersionCounts, editLabel } from '../../data/versions'
import { listEmployees } from '../../data/users'
import { listForms } from '../../data/formSettings'
import { listGroups } from '../../data/formGroups'
import type { SubmissionSummary, UserProfile, FormSettings, FormGroup } from '../../types/schema'
import { formatDate, formatDateTime } from '../../shared/date'
import type { Filters } from '../../shared/submissionFilter'
import { emptyFilters, applyFilters } from '../../shared/submissionFilter'
import { useHiddenColumns } from '../../shared/useHiddenColumns'
import SubmissionFilterBar from '../../components/SubmissionFilterBar'
import ActionIconButton from '../../components/ActionIconButton'
import ColumnPicker from '../../components/ColumnPicker'
import type { PickableColumn } from '../../components/ColumnPicker'
import { Badge, PageHeader, ui } from '../../components/ui'

interface Column extends PickableColumn {
  thCls?: string
  tdCls: string
  cell: (r: SubmissionSummary) => ReactNode
}

export default function PrintHistoryPage() {
  const [rows, setRows] = useState<SubmissionSummary[]>([])
  const [employees, setEmployees] = useState<UserProfile[]>([])
  const [forms, setForms] = useState<FormSettings[]>([])
  const [groups, setGroups] = useState<FormGroup[]>([])
  const [vcounts, setVcounts] = useState<Record<string, number>>({})
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const { hidden, toggle, reset } = useHiddenColumns('cols:printHistory')

  function loadRows() { listAllSubmissions().then(setRows) }
  useEffect(() => {
    loadRows()
    listEmployees().then(setEmployees)
    listForms().then(setForms)
    listGroups().then(setGroups)
    getVersionCounts().then(setVcounts)
  }, [])

  async function onDelete(r: SubmissionSummary) {
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

  const columns: Column[] = [
    {
      key: 'form', label: 'ชื่อฟอร์ม', locked: true, tdCls: 'whitespace-nowrap font-medium text-gray-900',
      // One line: long names are cut with … and shown in full on hover.
      cell: r => <div className="max-w-[240px] truncate" title={formName(r.formType)}>{formName(r.formType)}</div>,
    },
    { key: 'doc', label: 'เลขที่', locked: true, tdCls: 'whitespace-nowrap font-mono text-[13px]', cell: r => r.docNumber },
    {
      key: 'emp', label: 'พนักงาน', tdCls: 'whitespace-nowrap',
      cell: r => <>{empName(r.createdByEmployeeId)} <span className="text-gray-400">({r.createdByEmployeeId})</span></>,
    },
    { key: 'date', label: 'วันที่', tdCls: 'whitespace-nowrap', cell: r => formatDate(r.createdAt) },
    { key: 'amount', label: 'ยอด', thCls: 'text-right', tdCls: 'whitespace-nowrap text-right tabular-nums', cell: r => submissionAmount(r).toLocaleString() },
    { key: 'status', label: 'สถานะ', tdCls: 'whitespace-nowrap', cell: r => <StatusBadge sub={r} /> },
    {
      key: 'edits', label: 'แก้ไข', tdCls: 'whitespace-nowrap',
      cell: r => editLabel(r, vcounts) ? <Badge tone="amber">✎ {editLabel(r, vcounts)}</Badge> : <span className="text-gray-300">—</span>,
    },
    { key: 'prints', label: 'พิมพ์ (ครั้ง)', thCls: 'text-center', tdCls: 'text-center tabular-nums', cell: r => r.printCount },
    { key: 'lastPrinted', label: 'พิมพ์ล่าสุด', tdCls: 'whitespace-nowrap', cell: r => formatDateTime(r.lastPrintedAt) },
  ]
  const shown = columns.filter(c => c.locked || !hidden.has(c.key))

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
      <div className="mb-3 flex justify-end">
        <ColumnPicker columns={columns} hidden={hidden} onToggle={toggle} onReset={reset} />
      </div>
      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead className={ui.thead}>
            <tr>
              {shown.map(c => <th key={c.key} className={`${ui.th} ${c.thCls ?? ''}`}>{c.label}</th>)}
              <th className={ui.th} aria-label="การจัดการ" />
            </tr>
          </thead>
          <tbody className={ui.tbody}>
            {filtered.map(r => (
              <tr key={r.id} className={ui.tr}>
                {shown.map(c => <td key={c.key} className={`${ui.td} ${c.tdCls}`}>{c.cell(r)}</td>)}
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
                <td colSpan={shown.length + 1} className={ui.emptyCell}>
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
