import { uiAlert, uiConfirm } from '../../components/dialog/dialogService'
import { Fragment, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Ban, ChevronDown, ChevronRight, Copy, FilePen, History, Pencil, Printer, RotateCcw, Send, Signature, Trash2 } from 'lucide-react'
import { useAuth } from '../../auth/AuthProvider'
import { listMySubmissions, submissionAmount, deleteSubmission, subStatus, isUnsigned, onlyOwnerSigns, hasUnsignedLine, listSigners, cancelSigning, voidingAvailable } from '../../data/submissions'
import type { Signer } from '../../data/submissions'
import { getVersionCounts, editLabel } from '../../data/versions'
import { listForms } from '../../data/formSettings'
import { listGroups } from '../../data/formGroups'
import type { SubmissionSummary, FormSettings, FormGroup } from '../../types/schema'
import { formSignatureBlocks } from '../../types/schema'
import { formatDate } from '../../shared/date'
import { formatMoney } from '../../shared/money'
import type { Filters } from '../../shared/submissionFilter'
import { emptyFilters, applyFilters, filterChoices } from '../../shared/submissionFilter'
import SubmissionFilterBar from '../../components/SubmissionFilterBar'
import AssignSignersModal from '../../components/AssignSignersModal'
import StatusBadge from '../../components/StatusBadge'
import DocNumberCell from '../../components/DocNumberCell'
import { askAndVoid } from '../../components/voidDocument'
import { ActionGroup, ActionGroupItem, PrimaryAction, PrimarySlot } from '../../components/RowActions'
import ActionIconButton from '../../components/ActionIconButton'
import Pagination from '../../components/Pagination'
import { usePagination } from '../../shared/usePagination'
import { chainRows, chainLength } from '../../shared/revisionChain'
import { Badge, PageHeader, ui } from '../../components/ui'
import ColumnPicker from '../../components/ColumnPicker'
import type { PickableColumn } from '../../components/ColumnPicker'
import { useHiddenColumns } from '../../shared/useHiddenColumns'

interface Column extends PickableColumn {
  thCls?: string
  tdCls: string
  cell: (r: SubmissionSummary) => ReactNode
}

export default function HistoryPage() {
  const { profile } = useAuth()
  const [rows, setRows] = useState<SubmissionSummary[]>([])
  const [forms, setForms] = useState<FormSettings[]>([])
  const [vcounts, setVcounts] = useState<Record<string, number>>({})
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [open, setOpen] = useState<Set<string>>(new Set())
  function toggleOpen(id: string) {
    setOpen(o => { const n = new Set(o); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const [signers, setSigners] = useState<Signer[]>([])
  const [groups, setGroups] = useState<FormGroup[]>([])
  const [signModal, setSignModal] = useState<SubmissionSummary | null>(null)
  function load() { if (profile) listMySubmissions(profile.uid).then(setRows) }
  useEffect(() => { load(); getVersionCounts().then(setVcounts) }, [profile])
  useEffect(() => { listForms().then(setForms); listSigners().then(setSigners); listGroups().then(setGroups) }, [])

  const formGroup = (ft: string) => forms.find(f => f.formType === ft)?.groupId ?? groups[0]?.id

  const formOf = (ft: string) => forms.find(f => f.formType === ft)
  const formName = (ft: string) => { const f = formOf(ft); return f?.name || f?.title || '—' }
  const myName = () => profile ? `${profile.firstName} ${profile.lastName}` : ''
  const filtered = applyFilters(rows, filters, { formGroup, formName, groups: groups })
  // A corrected document and the rounds before it are one line, folded.
  const chains = chainRows(filtered, rows)
  // Ten lines a page, as on ประวัติการพิมพ์ทั้งหมด; a filter change starts at page 1.
  const pager = usePagination(chains, { pageSize: 10, storageKey: 'pageSize:myHistory' })
  function changeFilters(f: Filters) { setFilters(f); pager.setPage(1) }
  // The filter offers only the folders and forms this person may use (and any
  // their own documents were made on).
  const choices = filterChoices(forms, groups, {
    accessGroup: profile?.accessGroup, isAdmin: profile?.role === 'admin', usedFormTypes: rows.map(r => r.formType),
  })
  // "เซ็น / ส่งเซ็น" — sign your own line, take your signature back off, or
  // send the other lines out. Worth opening while some line is unsigned, or
  // while the requester's own signature is the only one (and can come off).
  const blocksOf = (r: SubmissionSummary) => formSignatureBlocks(formOf(r.formType))
  const canSignOrSend = (r: SubmissionSummary) =>
    !!formOf(r.formType) && (hasUnsignedLine(r, blocksOf(r)) || onlyOwnerSigns(r))
  // The highlighted button only where the document is still waiting on
  // something. A document others have signed in full may keep a line for pen —
  // sending that one out too is the smaller send icon beside it instead.
  const signingIsNext = (r: SubmissionSummary) =>
    hasUnsignedLine(r, blocksOf(r)) && (subStatus(r) !== 'signed' || onlyOwnerSigns(r))
  // Admins sign their own document on the spot, without sending it to anyone
  // first — and take a signature back off again when they signed the wrong
  // line. Always offered, including on a fully signed document (which is
  // exactly when a mistake needs undoing).
  const isAdmin = profile?.role === 'admin'
  const canSignNow = () => isAdmin

  const { hidden, toggle, reset } = useHiddenColumns('cols:myHistory')
  const columns: Column[] = [
    {
      key: 'form', label: 'ชื่อฟอร์ม', locked: true, tdCls: 'whitespace-nowrap font-medium text-stone-900',
      // One line: long names are cut with … and shown in full on hover.
      cell: r => <div className="max-w-[240px] truncate" title={formName(r.formType)}>{formName(r.formType)}</div>,
    },
    { key: 'doc', label: 'เลขที่', locked: true, tdCls: 'whitespace-nowrap font-mono text-[13px]', cell: r => <DocNumberCell sub={r} /> },
    { key: 'date', label: 'วันที่', tdCls: 'whitespace-nowrap', cell: r => formatDate(r.createdAt) },
    { key: 'amount', label: 'ยอดสุทธิ', thCls: 'text-right', tdCls: 'whitespace-nowrap text-right tabular-nums', cell: r => formatMoney(submissionAmount(r)) },
    { key: 'prints', label: 'พิมพ์แล้ว (ครั้ง)', thCls: 'text-center', tdCls: 'text-center tabular-nums', cell: r => r.printCount },
    { key: 'status', label: 'สถานะ', tdCls: 'whitespace-nowrap', cell: r => <StatusBadge sub={r} /> },
    {
      key: 'edits', label: 'แก้ไข', tdCls: 'whitespace-nowrap',
      cell: r => editLabel(r, vcounts) ? <Badge tone="amber">✎ {editLabel(r, vcounts)}</Badge> : <span className="text-stone-300">—</span>,
    },
  ]
  const shown = columns.filter(c => c.locked || !hidden.has(c.key))

  async function onDelete(r: SubmissionSummary) {
    if (!(await uiConfirm(`ลบถาวร ยกเลิกไม่ได้`, { title: `ลบเอกสาร "${r.docNumber || 'ไม่มีเลขที่'}" ?`, tone: 'danger', confirmText: 'ลบ' }))) return
    try {
      // A signed document cannot be deleted; the requester's own signature,
      // the only one on it, comes off first.
      if (onlyOwnerSigns(r)) await cancelSigning(r.id)
      await deleteSubmission(r.id); load()
    }
    catch { uiAlert('ลบเอกสารไม่สำเร็จ') }
  }

  async function onCancelSign(r: SubmissionSummary) {
    const signed = (r.signatures ?? []).filter(x => x.status === 'signed').length
    const msg = signed > 0
      ? `ยกเลิกการส่งเซ็น "${r.docNumber}" ?\nมีลายเซ็นแล้ว ${signed} ช่อง — การยกเลิกจะลบลายเซ็นทั้งหมด และกลับไปสถานะ "บันทึกแล้ว"`
      : `ยกเลิกการส่งเซ็น "${r.docNumber}" ? เอกสารจะกลับไปสถานะ "บันทึกแล้ว"`
    if (!(await uiConfirm(msg, { tone: 'danger', confirmText: 'ยกเลิกส่งเซ็น' }))) return
    try { await cancelSigning(r.id); load() }
    catch (e: any) { uiAlert('ยกเลิกไม่สำเร็จ: ' + (e?.message || 'เกิดข้อผิดพลาด')) }
  }
  return (
    <div>
      <PageHeader
        icon={<History size={20} />}
        title="ประวัติเอกสารของฉัน"
      />
      <div className="mb-4">
        <SubmissionFilterBar value={filters} onChange={changeFilters} forms={choices.forms} groups={choices.groups} formGroup={formGroup}
          resultCount={chains.length} total={chainRows(rows).length}
          extra={<ColumnPicker columns={columns} hidden={hidden} onToggle={toggle} onReset={reset} />} />
      </div>
      <div className={ui.tableCard}>
      <div className={ui.tableScroll}>
        <table className={ui.table}>
          <thead className={ui.thead}>
            <tr>
              {shown.map(c => <th key={c.key} className={`${ui.th} ${c.thCls ?? ''}`}>{c.label}</th>)}
              <th className={`${ui.th} text-right`}>จัดการ</th>
            </tr>
          </thead>
          <tbody className={ui.tbody}>
            {pager.pageItems.map(({ latest: r, older }) => {
              // A cancelled document is a record: it can be looked at, printed
              // and copied, nothing more.
              const voided = !!r.voided
              // Signed by someone else, so it cannot change any more: correcting
              // it makes a new document, and this one is cancelled in its favour.
              // Signed by the requester alone — even while sent to others who
              // have not signed yet — it is still edited in place (FormPage).
              const frozen = (r.signatures ?? []).some(x => x.status === 'signed' && x.assignedUid !== r.createdBy)
              const canVoid = voidingAvailable()
              const primary = !voided && signingIsNext(r)
              // Deleted while nobody else has been asked; otherwise kept, and cancelled instead.
              const deletable = !voided && (isUnsigned(r) || onlyOwnerSigns(r))
              const showing = open.has(r.id)
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
                        {voided || (frozen && !canVoid) ? null : frozen
                          ? <ActionGroupItem label="แก้ไขเป็นฉบับใหม่ — ฉบับนี้จะถูกยกเลิก" to={`/form/${r.formType}?revise=${r.id}`} icon={<FilePen size={15} />} />
                          : <ActionGroupItem label="แก้ไขเอกสาร" to={`/submission/${r.id}`} icon={<Pencil size={15} />} />}
                        <ActionGroupItem label="ดูเอกสาร / สั่งพิมพ์" to={`/submission/${r.id}/preview`} icon={<Printer size={15} />} />
                        <ActionGroupItem label="คัดลอกเป็นเอกสารใหม่" to={`/form/${r.formType}?clone=${r.id}`} icon={<Copy size={15} />} />
                        {!voided && !primary && (canSignOrSend(r) || canSignNow()) && <ActionGroupItem label="เซ็น / ส่งเซ็น" onClick={() => setSignModal(r)} icon={<Send size={15} />} />}
                        {!voided && subStatus(r) === 'pending' && <ActionGroupItem label="ยกเลิกการส่งให้เซ็น" onClick={() => onCancelSign(r)} icon={<RotateCcw size={15} />} />}
                        {!voided && !deletable && canVoid && <ActionGroupItem label="ยกเลิกเอกสาร" onClick={async () => { if (await askAndVoid(r)) load() }} icon={<Ban size={15} />} />}
                      </ActionGroup>
                      {primary
                        ? <PrimaryAction label="เซ็นเอง หรือส่งให้คนอื่นเซ็น" short="เซ็น / ส่งเซ็น" onClick={() => setSignModal(r)} icon={<Signature size={15} />} />
                        : <PrimarySlot />}
                      {deletable
                        ? <ActionIconButton label={`ลบเอกสาร ${r.docNumber}`} tone="red" icon={<Trash2 size={16} />} onClick={() => onDelete(r)} />
                        : <span aria-hidden className="inline-block w-8" />}
                    </div>
                  </td>
                </tr>
                {showing && older.map((o, i) => (
                  <tr key={o.id} className="bg-stone-50/70">
                    <td colSpan={shown.length + 1} className="px-4 py-2">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-6 text-xs text-stone-500">
                        <span className="text-stone-400">{i === older.length - 1 ? 'ฉบับแรก' : `ฉบับก่อนหน้า ${older.length - i}`}</span>
                        <span className="font-mono text-[13px] line-through decoration-stone-400">{o.docNumber}</span>
                        <span>{formatDate(o.createdAt)}</span>
                        {o.voided?.reason && <span className="truncate" title={o.voided.reason}>เหตุผล: {o.voided.reason}</span>}
                        <ActionGroupItem label={`ดูเอกสารฉบับ ${o.docNumber}`} to={`/submission/${o.id}/preview`} icon={<Printer size={15} />} />
                      </div>
                    </td>
                  </tr>
                ))}
                </Fragment>
              )
            })}
            {chains.length === 0 && (
              <tr>
                <td colSpan={shown.length + 1} className={ui.emptyCell}>
                  {rows.length === 0 ? 'ยังไม่มีเอกสาร' : 'ไม่พบเอกสารที่ตรงกับตัวกรอง'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {chains.length > 0 && (
        <Pagination page={pager.page} pageCount={pager.pageCount} pageSize={pager.pageSize} from={pager.from} to={pager.to} total={pager.total}
          onPage={pager.setPage} onPageSize={pager.setPageSize} />
      )}
      </div>

      {signModal && profile && (
        <AssignSignersModal
          submission={signModal}
          settings={formOf(signModal.formType) ?? ({ signatureBlocks: formSignatureBlocks(null) } as FormSettings)}
          signers={signers}
          currentUid={profile.uid}
          currentName={myName()}
          currentSignature={profile.signatureImage}
          canSignAny={canSignNow()}
          onClose={() => setSignModal(null)}
          onDone={load}
        />
      )}
    </div>
  )
}
