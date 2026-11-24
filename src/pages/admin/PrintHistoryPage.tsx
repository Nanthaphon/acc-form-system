import { uiAlert, uiConfirm } from '../../components/dialog/dialogService'
import OlderVersionRow, { roundLabel } from '../../components/OlderVersionRow'
import EmptyRow from '../../components/EmptyRow'
import { Fragment, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ArchiveRestore, Ban, ChevronDown, ChevronRight, Copy, FilePen, Pencil, Printer, Trash2 } from 'lucide-react'
import { ActionGroup, ActionGroupItem } from '../../components/RowActions'
import ActionIconButton from '../../components/ActionIconButton'
import { listAllSubmissions, submissionAmount, deleteSubmission, isSigned, voidingAvailable, docStatusAvailable } from '../../data/submissions'
import { loadOptionLists } from '../../data/fieldOptions'
import DocStatusPicker from '../../components/DocStatusPicker'
import { chainRows, chainLength } from '../../shared/revisionChain'
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
import { usePagination } from '../../shared/usePagination'
import Pagination from '../../components/Pagination'
import TableSkeleton from '../../components/TableSkeleton'
import { recall, remember } from '../../shared/cache'
import SubmissionFilterBar from '../../components/SubmissionFilterBar'
import ColumnPicker from '../../components/ColumnPicker'
import type { PickableColumn } from '../../components/ColumnPicker'
import { PageHeader, ui } from '../../components/ui'
import StatusTiles from '../../components/StatusTiles'
import { avatarTone, initialOf } from '../../shared/initials'
import { formatMoney } from '../../shared/money'

interface Column extends PickableColumn {
  thCls?: string
  tdCls: string
  cell: (r: SubmissionSummary) => ReactNode
}

export default function PrintHistoryPage() {
  const [rows, setRows] = useState<SubmissionSummary[]>(() => recall<SubmissionSummary[]>('subs:all') ?? [])
  // Nothing to show yet — the first visit; a return shows the last list while the new one loads.
  const [loading, setLoading] = useState(() => recall('subs:all') === undefined)
  const [employees, setEmployees] = useState<UserProfile[]>([])
  const [forms, setForms] = useState<FormSettings[]>([])
  const [groups, setGroups] = useState<FormGroup[]>([])
  const [vcounts, setVcounts] = useState<Record<string, number>>({})
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [statuses, setStatuses] = useState<string[]>([])
  const [open, setOpen] = useState<Set<string>>(new Set())
  // v2: พิมพ์ล่าสุด starts hidden; a new key so the default reaches people who opened the page before.
  const { hidden, toggle, reset } = useHiddenColumns('cols:printHistory:v2', ['lastPrinted'])

  function loadRows() { listAllSubmissions().then(r => { setRows(remember('subs:all', r)); setLoading(false) }).catch(() => setLoading(false)) }
  useEffect(() => {
    loadRows()
    listEmployees().then(setEmployees)
    listForms().then(setForms)
    listGroups().then(setGroups)
    getVersionCounts().then(setVcounts)
    loadOptionLists().then(l => setStatuses(l.docStatus))
  }, [])

  // Keep the row in hand rather than reloading the whole list for one word.
  function statusChanged(id: string, status: string | null) {
    setRows(rs => rs.map(r => (r.id === id ? { ...r, docStatus: status } : r)))
  }
  function toggleOpen(id: string) {
    setOpen(o => { const n = new Set(o); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

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
  // Every round of a corrected document is one line, with the rounds before it
  // folded underneath — the wrong copies no longer sit between the right ones.
  const chains = chainRows(filtered, rows)
  // Ten lines a page. A filter change starts again from page 1; deleting or
  // cancelling keeps the page open (or steps back one if it was the last line).
  const pager = usePagination(chains, { pageSize: 10, storageKey: 'pageSize:printHistory' })
  // Counted in lines, as the table and the pager count them — a corrected
  // document and its earlier rounds are one line.
  const allLines = chainRows(rows).length
  function changeFilters(f: Filters) { setFilters(f); pager.setPage(1) }

  const columns: Column[] = [
    {
      key: 'form', label: 'เอกสาร', locked: true, tdCls: 'whitespace-nowrap',
      // The form's name over the number; long names are cut with … and shown in full on hover.
      cell: r => (
        <div className="min-w-0">
          <div className="max-w-[260px] truncate font-medium text-stone-900" title={formName(r.formType)}>{formName(r.formType)}</div>
          <div className="mt-0.5 font-mono text-[12px] text-stone-500"><DocNumberCell sub={r} /></div>
        </div>
      ),
    },
    {
      key: 'emp', label: 'พนักงาน', tdCls: 'whitespace-nowrap',
      cell: r => {
        const name = empName(r.createdByEmployeeId)
        return (
          <div className="flex items-center gap-2.5">
            <span aria-hidden className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarTone(r.createdByEmployeeId)}`}>
              {initialOf(name || r.createdByEmployeeId) || '?'}
            </span>
            <div className="min-w-0">
              <div className="text-stone-900">{name || '—'}</div>
              <div className="font-mono text-[12px] text-stone-500">{r.createdByEmployeeId}</div>
            </div>
          </div>
        )
      },
    },
    {
      key: 'nickname', label: 'ชื่อเล่น', tdCls: 'whitespace-nowrap',
      cell: r => employees.find(e => e.employeeId === r.createdByEmployeeId)?.nickname || <span className="text-stone-300">—</span>,
    },
    { key: 'date', label: 'วันที่', tdCls: 'whitespace-nowrap', cell: r => formatDate(r.createdAt) },
    { key: 'amount', label: 'ยอด (บาท)', thCls: 'text-right', tdCls: 'whitespace-nowrap text-right font-semibold tabular-nums text-stone-900', cell: r => formatMoney(submissionAmount(r)) },
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
    // The admin's own tag (เอกสารผิด, ไม่ได้ใช้ …) — its own column, so it can be seen and sorted out at a glance.
    ...(docStatusAvailable() ? [{
      key: 'docStatus', label: 'ป้ายสถานะ', tdCls: 'whitespace-nowrap',
      cell: (r: SubmissionSummary) => <DocStatusPicker sub={r} options={statuses} onChanged={st => statusChanged(r.id, st)} />,
    }] : []),
  ]
  const shown = columns.filter(c => c.locked || !hidden.has(c.key))

  return (
    <div>
      <PageHeader
        icon={<Printer size={20} />}
        title="ประวัติการพิมพ์ทั้งหมดในระบบ"
      />
      <StatusTiles docs={chainRows(rows).map(c => c.latest)} shown={chains.map(c => c.latest)} status={filters.status}
        onStatus={status => changeFilters({ ...filters, status })} />
      <div className="mb-4 rounded-2xl border border-stone-200/60 bg-white p-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <SubmissionFilterBar value={filters} onChange={changeFilters} forms={forms} groups={groups} formGroup={formGroup} employees={employees}
          docStatuses={docStatusAvailable() ? statuses : undefined}
          resultCount={chains.length} total={allLines}
          extra={<ColumnPicker columns={columns} hidden={hidden} onToggle={toggle} onReset={reset} />} />
      </div>
      <div className={ui.tableCard}>
      <div className={ui.tableScroll}>
        <table className={ui.table}>
          <thead className={ui.thead}>
            <tr>
              {shown.map(c => <th key={c.key} className={`${ui.th} ${c.thCls ?? ''}`}>{c.label}</th>)}
              <th className={ui.th} aria-label="การจัดการ" />
            </tr>
          </thead>
          <tbody className={ui.tbody}>
            {pager.pageItems.map(({ latest: r, older }) => {
              const showing = open.has(r.id)
              // A document others have signed is no longer changed in place: it
              // is corrected by a new one in its stead, carrying its number and
              // the round of correction (…-R1).
              const corrects = isSigned(r) && voidingAvailable()
              return (
                <Fragment key={r.id}>
                  <tr className={ui.tr}>
                    {shown.map((c, i) => (
                      <td key={c.key} className={`${ui.td} ${c.tdCls}`}>
                        {i === 0 && older.length > 0 ? (
                          <span className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => toggleOpen(r.id)}
                              aria-expanded={showing}
                              title={showing ? 'ซ่อนฉบับก่อนหน้า' : `ดูฉบับก่อนหน้า ${older.length} ฉบับ`}
                              aria-label={showing ? 'ซ่อนฉบับก่อนหน้า' : `ดูฉบับก่อนหน้า ${older.length} ฉบับ`}
                              className="inline-flex h-6 items-center gap-0.5 rounded-md border border-stone-200 bg-white pl-0.5 pr-1.5 text-[11px] font-medium text-stone-600 transition-colors hover:border-clay-300 hover:text-clay-700"
                            >
                              {showing ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              {chainLength({ latest: r, older })} ฉบับ
                            </button>
                            {c.cell(r)}
                          </span>
                        ) : c.cell(r)}
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-4 py-2">
                      <div className="flex items-center justify-end gap-2">
                        <ActionGroup>
                          {/* Cancelled: nothing to change. Signed: corrected as a new round. */}
                          {!r.voided && (corrects
                            ? <ActionGroupItem label="แก้ไขเป็นฉบับแก้ไข (R) — ฉบับนี้จะถูกยกเลิก" to={`/form/${r.formType}?revise=${r.id}`} icon={<FilePen size={15} />} />
                            : <ActionGroupItem label="แก้ไขเอกสาร" to={`/submission/${r.id}`} icon={<Pencil size={15} />} />)}
                          <ActionGroupItem label="ดูเอกสาร / สั่งพิมพ์" to={`/submission/${r.id}/preview`} icon={<Printer size={15} />} />
                          <ActionGroupItem label="คัดลอกเป็นเอกสารใหม่" to={`/form/${r.formType}?clone=${r.id}`} icon={<Copy size={15} />} />
                          {r.voided
                            ? <ActionGroupItem label="กู้คืนเอกสารที่ยกเลิก" onClick={async () => { if (await askAndUnvoid(r)) loadRows() }} icon={<ArchiveRestore size={15} />} />
                            : voidingAvailable() && <ActionGroupItem label="ยกเลิกเอกสาร" onClick={async () => { if (await askAndVoid(r)) loadRows() }} icon={<Ban size={15} />} />}
                        </ActionGroup>
                        <ActionIconButton label={`ลบเอกสาร ${r.docNumber}`} tone="red" icon={<Trash2 size={16} />} onClick={() => onDelete(r)} />
                      </div>
                    </td>
                  </tr>
                  {showing && older.map((o, i) => (
                    <OlderVersionRow key={o.id} doc={o} colSpan={shown.length + 1} label={roundLabel(o.docNumber)} last={i === older.length - 1} />
                  ))}
                </Fragment>
              )
            })}
            {loading && <TableSkeleton cols={shown.length + 1} />}
            {!loading && chains.length === 0 && (
              <EmptyRow colSpan={shown.length + 1} icon={<Printer size={20} />}>

                {rows.length === 0 ? 'ยังไม่มีเอกสาร' : 'ไม่พบเอกสารที่ตรงกับตัวกรอง'}

              </EmptyRow>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={pager.page} pageCount={pager.pageCount} pageSize={pager.pageSize} from={pager.from} to={pager.to} total={pager.total}
        onPage={pager.setPage} onPageSize={pager.setPageSize} />
      </div>
    </div>
  )
}
