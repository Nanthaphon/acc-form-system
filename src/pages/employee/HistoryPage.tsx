import { uiAlert, uiConfirm } from '../../components/dialog/dialogService'
import { useEffect, useState } from 'react'
import { Copy, Pencil, Printer, RotateCcw, Send, Trash2 } from 'lucide-react'
import { useAuth } from '../../auth/AuthProvider'
import { listMySubmissions, submissionAmount, deleteSubmission, subStatus, isUnsigned, listSigners, cancelSigning } from '../../data/submissions'
import type { Signer } from '../../data/submissions'
import { getVersionCounts, editLabel } from '../../data/versions'
import { listForms } from '../../data/formSettings'
import { listGroups } from '../../data/formGroups'
import type { Submission, FormSettings, FormGroup } from '../../types/schema'
import { formSignatureBlocks, canRequestSignatures } from '../../types/schema'
import { formatDate } from '../../shared/date'
import type { Filters } from '../../shared/submissionFilter'
import { emptyFilters, applyFilters } from '../../shared/submissionFilter'
import SubmissionFilterBar from '../../components/SubmissionFilterBar'
import AssignSignersModal from '../../components/AssignSignersModal'
import StatusBadge from '../../components/StatusBadge'
import { notifyPendingSignChanged } from '../../shared/pendingSignBus'
import ActionIconButton from '../../components/ActionIconButton'

export default function HistoryPage() {
  const { profile } = useAuth()
  const [rows, setRows] = useState<Submission[]>([])
  const [forms, setForms] = useState<FormSettings[]>([])
  const [vcounts, setVcounts] = useState<Record<string, number>>({})
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [signers, setSigners] = useState<Signer[]>([])
  const [groups, setGroups] = useState<FormGroup[]>([])
  const [signModal, setSignModal] = useState<Submission | null>(null)
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
  const canSend = (r: Submission) => canRequestSignatures(formOf(r.formType)) && subStatus(r) !== 'signed'

  async function onDelete(r: Submission) {
    if (!(await uiConfirm(`ลบถาวร ยกเลิกไม่ได้`, { title: `ลบเอกสาร "${r.docNumber || 'ไม่มีเลขที่'}" ?`, tone: 'danger', confirmText: 'ลบ' }))) return
    try { await deleteSubmission(r.id); load() }
    catch { uiAlert('ลบเอกสารไม่สำเร็จ') }
  }

  async function onCancelSign(r: Submission) {
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
      <div className="mb-4 space-y-3">
        <h1 className="text-xl font-medium">ประวัติเอกสารของฉัน</h1>
        <SubmissionFilterBar value={filters} onChange={setFilters} forms={forms} groups={groups} resultCount={filtered.length} />
      </div>
      <table className="w-full border text-sm">
        <thead className="bg-gray-50"><tr>{['ชื่อฟอร์ม','เลขที่','วันที่','ยอดสุทธิ','พิมพ์แล้ว(ครั้ง)','สถานะ','แก้ไข',''].map(h => <th key={h} className="border px-2 py-1">{h}</th>)}</tr></thead>
        <tbody>
          {filtered.map(r => (
            <tr key={r.id}>
              <td className="border px-2 py-1">{formName(r.formType)}</td>
              <td className="border px-2 py-1 whitespace-nowrap">{r.docNumber}</td>
              <td className="border px-2 py-1">{formatDate(r.createdAt)}</td>
              <td className="border px-2 py-1 text-right">{submissionAmount(r).toLocaleString()}</td>
              <td className="border px-2 py-1 text-center">{r.printCount}</td>
              <td className="border px-2 py-1 text-center">
                <StatusBadge sub={r} />
              </td>
              <td className="border px-2 py-1 whitespace-nowrap text-center">
                {editLabel(r, vcounts)
                  ? <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">✎ {editLabel(r, vcounts)}</span>
                  : <span className="text-gray-300">—</span>}
              </td>
              <td className="border px-2 py-1 whitespace-nowrap">
                <div className="flex items-center justify-center gap-1.5">
                <ActionIconButton label="แก้ไข" to={`/submission/${r.id}`} icon={<Pencil size={16} />} />
                <ActionIconButton label="พิมพ์" to={`/submission/${r.id}/preview`} tone="green" icon={<Printer size={16} />} />
                <ActionIconButton label="คัดลอก" to={`/form/${r.formType}?clone=${r.id}`} tone="indigo" icon={<Copy size={16} />} />
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
        </tbody>
      </table>

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
