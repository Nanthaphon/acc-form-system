import { uiAlert, uiConfirm } from '../../components/dialog/dialogService'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Copy, History, Pencil, PenLine, Printer, RotateCcw, Send, Trash2 } from 'lucide-react'
import { useAuth } from '../../auth/AuthProvider'
import { listMySubmissions, submissionAmount, deleteSubmission, subStatus, isUnsigned, listSigners, cancelSigning } from '../../data/submissions'
import type { Signer } from '../../data/submissions'
import { getVersionCounts, editLabel } from '../../data/versions'
import { listForms } from '../../data/formSettings'
import { listGroups } from '../../data/formGroups'
import type { SubmissionSummary, FormSettings, FormGroup } from '../../types/schema'
import { formSignatureBlocks, canRequestSignatures } from '../../types/schema'
import { formatDate } from '../../shared/date'
import type { Filters } from '../../shared/submissionFilter'
import { emptyFilters, applyFilters } from '../../shared/submissionFilter'
import SubmissionFilterBar from '../../components/SubmissionFilterBar'
import AssignSignersModal from '../../components/AssignSignersModal'
import SignNowModal from '../../components/SignNowModal'
import StatusBadge from '../../components/StatusBadge'
import { notifyPendingSignChanged } from '../../shared/pendingSignBus'
import ActionIconButton from '../../components/ActionIconButton'
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
  const [signers, setSigners] = useState<Signer[]>([])
  const [groups, setGroups] = useState<FormGroup[]>([])
  const [signModal, setSignModal] = useState<SubmissionSummary | null>(null)
  const [signNow, setSignNow] = useState<SubmissionSummary | null>(null)
  function load() { if (profile) listMySubmissions(profile.uid).then(setRows) }
  useEffect(() => { load(); getVersionCounts().then(setVcounts) }, [profile])
  useEffect(() => { listForms().then(setForms); listSigners().then(setSigners); listGroups().then(setGroups) }, [])

  const formGroup = (ft: string) => forms.find(f => f.formType === ft)?.groupId ?? groups[0]?.id

  const formOf = (ft: string) => forms.find(f => f.formType === ft)
  const formName = (ft: string) => { const f = formOf(ft); return f?.name || f?.title || '—' }
  const myName = () => profile ? `${profile.firstName} ${profile.lastName}` : ''
  const filtered = applyFilters(rows, filters, { formGroup, formName })
  // A doc can be sent for signing if its form has someone besides the requester
  // to sign, and it isn't fully signed yet.
  const canSend = (r: SubmissionSummary) => canRequestSignatures(formOf(r.formType)) && subStatus(r) !== 'signed'
  // Admins sign their own document on the spot, without sending it to anyone
  // first. Shown while any signature line is still open — including on a form
  // with a single line, which canSend() deliberately leaves out.
  const isAdmin = profile?.role === 'admin'
  const canSignNow = (r: SubmissionSummary) =>
    isAdmin && formSignatureBlocks(formOf(r.formType)).some(b =>
      (r.signatures ?? []).find(x => x.blockId === b.id)?.status !== 'signed')

  const { hidden, toggle, reset } = useHiddenColumns('cols:myHistory')
  const columns: Column[] = [
    {
      key: 'form', label: 'ชื่อฟอร์ม', locked: true, tdCls: 'whitespace-nowrap font-medium text-gray-900',
      // One line: long names are cut with … and shown in full on hover.
      cell: r => <div className="max-w-[240px] truncate" title={formName(r.formType)}>{formName(r.formType)}</div>,
    },
    { key: 'doc', label: 'เลขที่', locked: true, tdCls: 'whitespace-nowrap font-mono text-[13px]', cell: r => r.docNumber },
    { key: 'date', label: 'วันที่', tdCls: 'whitespace-nowrap', cell: r => formatDate(r.createdAt) },
    { key: 'amount', label: 'ยอดสุทธิ', thCls: 'text-right', tdCls: 'whitespace-nowrap text-right tabular-nums', cell: r => submissionAmount(r).toLocaleString() },
    { key: 'prints', label: 'พิมพ์แล้ว (ครั้ง)', thCls: 'text-center', tdCls: 'text-center tabular-nums', cell: r => r.printCount },
    { key: 'status', label: 'สถานะ', tdCls: 'whitespace-nowrap', cell: r => <StatusBadge sub={r} /> },
    {
      key: 'edits', label: 'แก้ไข', tdCls: 'whitespace-nowrap',
      cell: r => editLabel(r, vcounts) ? <Badge tone="amber">✎ {editLabel(r, vcounts)}</Badge> : <span className="text-gray-300">—</span>,
    },
  ]
  const shown = columns.filter(c => c.locked || !hidden.has(c.key))

  async function onDelete(r: SubmissionSummary) {
    if (!(await uiConfirm(`ลบถาวร ยกเลิกไม่ได้`, { title: `ลบเอกสาร "${r.docNumber || 'ไม่มีเลขที่'}" ?`, tone: 'danger', confirmText: 'ลบ' }))) return
    try { await deleteSubmission(r.id); load() }
    catch { uiAlert('ลบเอกสารไม่สำเร็จ') }
  }

  async function onCancelSign(r: SubmissionSummary) {
    const signed = (r.signatures ?? []).filter(x => x.status === 'signed').length
    const msg = signed > 0
      ? `ยกเลิกการส่งเซ็น "${r.docNumber}" ?\nมีลายเซ็นแล้ว ${signed} ช่อง — การยกเลิกจะลบลายเซ็นทั้งหมด และกลับไปสถานะ "เสร็จสิ้น"`
      : `ยกเลิกการส่งเซ็น "${r.docNumber}" ? เอกสารจะกลับไปสถานะ "เสร็จสิ้น"`
    if (!(await uiConfirm(msg, { tone: 'danger', confirmText: 'ยกเลิกส่งเซ็น' }))) return
    try { await cancelSigning(r.id); load(); notifyPendingSignChanged() }
    catch (e: any) { uiAlert('ยกเลิกไม่สำเร็จ: ' + (e?.message || 'เกิดข้อผิดพลาด')) }
  }
  return (
    <div>
      <PageHeader
        icon={<History size={20} />}
        title="ประวัติเอกสารของฉัน"
        subtitle={`ทั้งหมด ${rows.length} รายการ`}
      />
      <div className="mb-4">
        <SubmissionFilterBar value={filters} onChange={setFilters} forms={forms} groups={groups} resultCount={filtered.length} />
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
                    {canSignNow(r) && (
                      <ActionIconButton label="เซ็นเอกสารนี้" onClick={() => setSignNow(r)} tone="green" icon={<PenLine size={16} />} />
                    )}
                    {canSend(r) && (
                      <ActionIconButton label="ส่งให้เซ็น" onClick={() => setSignModal(r)} tone="blue" icon={<Send size={16} />} />
                    )}
                    {subStatus(r) === 'pending' && (
                      <ActionIconButton label="ยกเลิกส่งเซ็น" onClick={() => onCancelSign(r)} tone="amber" icon={<RotateCcw size={16} />} />
                    )}
                    {isUnsigned(r) && (
                      <ActionIconButton label="ลบ" onClick={() => onDelete(r)} tone="red" icon={<Trash2 size={16} />} />
                    )}
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

      {signNow && profile && (
        <SignNowModal
          submission={signNow}
          settings={formOf(signNow.formType) ?? ({ signatureBlocks: formSignatureBlocks(null) } as FormSettings)}
          me={{ uid: profile.uid, name: myName() }}
          mySignature={profile.signatureImage}
          onClose={() => setSignNow(null)}
          onDone={load}
        />
      )}

      {signModal && profile && (
        <AssignSignersModal
          submission={signModal}
          settings={formOf(signModal.formType) ?? ({ signatureBlocks: formSignatureBlocks(null) } as FormSettings)}
          signers={signers}
          currentUid={profile.uid}
          currentName={myName()}
          currentSignature={profile.signatureImage}
          onClose={() => setSignModal(null)}
          onDone={load}
        />
      )}
    </div>
  )
}
