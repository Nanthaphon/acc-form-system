import { uiAlert, uiConfirm } from '../../components/dialog/dialogService'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ArchiveRestore, Ban, Copy, Pencil, Printer, Trash2 } from 'lucide-react'
import { ActionGroup, ActionGroupItem, RowMenu } from '../../components/RowActions'
import type { RowMenuItem } from '../../components/RowActions'
import { listAllSubmissions, submissionAmount, deleteSubmission, isSigned, voidingAvailable } from '../../data/submissions'
import StatusBadge from '../../components/StatusBadge'
import DocNumberCell from '../../components/DocNumberCell'
import { askAndUnvoid, askAndVoid } from '../../components/voidDocument'
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
import ColumnPicker from '../../components/ColumnPicker'
import type { PickableColumn } from '../../components/ColumnPicker'
import { PageHeader, ui } from '../../components/ui'
import { formatMoney } from '../../shared/money'

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
  const filtered = applyFilters(rows, filters, { formGroup, formName, groups: groups })

  const columns: Column[] = [
    {
      key: 'form', label: 'ชื่อฟอร์ม', locked: true, tdCls: 'whitespace-nowrap font-medium text-stone-900',
      // One line: long names are cut with … and shown in full on hover.
      cell: r => <div className="max-w-[240px] truncate" title={formName(r.formType)}>{formName(r.formType)}</div>,
    },
    { key: 'doc', label: 'เลขที่', locked: true, tdCls: 'whitespace-nowrap font-mono text-[13px]', cell: r => <DocNumberCell sub={r} /> },
    {
      key: 'emp', label: 'พนักงาน', tdCls: 'whitespace-nowrap',
      cell: r => <>{empName(r.createdByEmployeeId)} <span className="text-stone-500">({r.createdByEmployeeId})</span></>,
    },
    { key: 'date', label: 'วันที่', tdCls: 'whitespace-nowrap', cell: r => formatDate(r.createdAt) },
    { key: 'amount', label: 'ยอด', thCls: 'text-right', tdCls: 'whitespace-nowrap text-right tabular-nums', cell: r => formatMoney(submissionAmount(r)) },
    // How many times it was edited rides beside the status, rather than a column of dashes.
    {
      key: 'status', label: 'สถานะ', tdCls: 'whitespace-nowrap',
      cell: r => (
        <span className="inline-flex items-center gap-2">
          <StatusBadge sub={r} />
          {editLabel(r, vcounts) && <span className="text-xs text-ochre-700" title="จำนวนครั้งที่แก้ไขหลังบันทึก">✎ {editLabel(r, vcounts)}</span>}
        </span>
      ),
    },
    // When it was last printed, and how many times in all.
    {
      key: 'lastPrinted', label: 'พิมพ์ล่าสุด', tdCls: 'whitespace-nowrap',
      cell: r => r.printCount > 0
        ? <>{formatDateTime(r.lastPrintedAt)} <span className="text-xs text-stone-500">· {r.printCount} ครั้ง</span></>
        : <span className="text-stone-500">ยังไม่พิมพ์</span>,
    },
  ]
  const shown = columns.filter(c => c.locked || !hidden.has(c.key))

  return (
    <div>
      <PageHeader
        icon={<Printer size={20} />}
        title="ประวัติการพิมพ์ทั้งหมดในระบบ"
      />
      <div className="mb-4">
        <SubmissionFilterBar value={filters} onChange={setFilters} forms={forms} groups={groups} formGroup={formGroup} employees={employees}
          resultCount={filtered.length} total={rows.length}
          extra={<ColumnPicker columns={columns} hidden={hidden} onToggle={toggle} onReset={reset} />} />
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
            {filtered.map(r => {
              // The everyday actions side by side; cancelling and deleting wait behind ⋯,
              // as on ประวัติ — a red ลบ on every line drew the eye to the one to avoid.
              const more: RowMenuItem[] = [
                ...(r.voided
                  ? [{ label: 'กู้คืนเอกสารที่ยกเลิก', icon: <ArchiveRestore size={16} />, onClick: async () => { if (await askAndUnvoid(r)) loadRows() } }]
                  : voidingAvailable() ? [{ label: 'ยกเลิกเอกสาร', icon: <Ban size={16} />, onClick: async () => { if (await askAndVoid(r)) loadRows() }, danger: true }] : []),
                { label: 'ลบเอกสาร', icon: <Trash2 size={16} />, onClick: () => onDelete(r), danger: true },
              ]
              return (
                <tr key={r.id} className={ui.tr}>
                  {shown.map(c => <td key={c.key} className={`${ui.td} ${c.tdCls}`}>{c.cell(r)}</td>)}
                  <td className="whitespace-nowrap px-4 py-2">
                    <div className="flex items-center justify-end gap-2">
                      <ActionGroup>
                        {/* Signed or cancelled: no editing — "พิมพ์" opens the document. */}
                        {!r.voided && !isSigned(r) && <ActionGroupItem label="แก้ไขเอกสาร" short="แก้ไข" to={`/submission/${r.id}`} icon={<Pencil size={15} />} />}
                        <ActionGroupItem label="ดูเอกสาร / สั่งพิมพ์" short="พิมพ์" to={`/submission/${r.id}/preview`} icon={<Printer size={15} />} />
                        <ActionGroupItem label="คัดลอกเป็นเอกสารใหม่" short="คัดลอก" to={`/form/${r.formType}?clone=${r.id}`} icon={<Copy size={15} />} />
                      </ActionGroup>
                      <RowMenu items={more} label={`ตัวเลือกเพิ่มเติม ${r.docNumber}`} />
                    </div>
                  </td>
                </tr>
              )
            })}
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
