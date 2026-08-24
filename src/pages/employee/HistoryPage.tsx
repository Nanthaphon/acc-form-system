import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { listMySubmissions, submissionAmount, deleteSubmission, subStatus, statusMeta, statusLabel, listSigners, cancelSigning } from '../../data/submissions'
import type { Signer } from '../../data/submissions'
import { getVersionCounts, editLabel } from '../../data/versions'
import { listForms } from '../../data/formSettings'
import { listGroups } from '../../data/formGroups'
import type { Submission, FormSettings, FormGroup } from '../../types/schema'
import { DEFAULT_SIGNATURE_BLOCKS } from '../../types/schema'
import { formatDate } from '../../shared/date'
import type { Filters } from '../../shared/submissionFilter'
import { emptyFilters, applyFilters } from '../../shared/submissionFilter'
import SubmissionFilterBar from '../../components/SubmissionFilterBar'
import AssignSignersModal from '../../components/AssignSignersModal'

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

  const myName = () => profile ? `${profile.firstName} ${profile.lastName}` : ''
  const formGroup = (ft: string) => forms.find(f => f.formType === ft)?.groupId ?? groups[0]?.id
  const filtered = applyFilters(rows, filters, myName, formGroup)

  const formOf = (ft: string) => forms.find(f => f.formType === ft)
  // A doc can be sent for signing if its form has online blocks and it isn't fully signed.
  const canSend = (r: Submission) => {
    const blocks = formOf(r.formType)?.signatureBlocks ?? DEFAULT_SIGNATURE_BLOCKS
    return blocks.some(b => b.online) && subStatus(r) !== 'signed'
  }

  async function onDelete(r: Submission) {
    if (!confirm(`ลบเอกสาร "${r.docNumber || 'ไม่มีเลขที่'}" ?\nลบถาวร ยกเลิกไม่ได้`)) return
    try { await deleteSubmission(r.id); load() }
    catch { alert('ลบเอกสารไม่สำเร็จ') }
  }

  async function onCancelSign(r: Submission) {
    const signed = (r.signatures ?? []).filter(x => x.status === 'signed').length
    const msg = signed > 0
      ? `ยกเลิกการส่งเซ็น "${r.docNumber}" ?\nมีลายเซ็นแล้ว ${signed} ช่อง — การยกเลิกจะลบลายเซ็นทั้งหมด และกลับเป็นร่าง`
      : `ยกเลิกการส่งเซ็น "${r.docNumber}" ? เอกสารจะกลับเป็นร่าง`
    if (!confirm(msg)) return
    try { await cancelSigning(r.id); load() }
    catch (e: any) { alert('ยกเลิกไม่สำเร็จ: ' + (e?.message || 'เกิดข้อผิดพลาด')) }
  }
  return (
    <div>
      <div className="mb-4 space-y-3">
        <h1 className="text-xl font-medium">ประวัติเอกสารของฉัน</h1>
        <SubmissionFilterBar value={filters} onChange={setFilters} forms={forms} groups={groups} resultCount={filtered.length} />
      </div>
      <table className="w-full border text-sm">
        <thead className="bg-gray-50"><tr>{['เลขที่','วันที่','ยอดสุทธิ','พิมพ์แล้ว(ครั้ง)','สถานะ','แก้ไข',''].map(h => <th key={h} className="border px-2 py-1">{h}</th>)}</tr></thead>
        <tbody>
          {filtered.map(r => (
            <tr key={r.id}>
              <td className="border px-2 py-1">{r.docNumber}</td>
              <td className="border px-2 py-1">{formatDate(r.createdAt)}</td>
              <td className="border px-2 py-1 text-right">{submissionAmount(r).toLocaleString()}</td>
              <td className="border px-2 py-1 text-center">{r.printCount}</td>
              <td className="border px-2 py-1 text-center">
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusMeta(subStatus(r)).className}`}>{statusLabel(r)}</span>
              </td>
              <td className="border px-2 py-1 whitespace-nowrap text-center">
                {editLabel(r, vcounts)
                  ? <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">✎ {editLabel(r, vcounts)}</span>
                  : <span className="text-gray-300">—</span>}
              </td>
              <td className="border px-2 py-1 whitespace-nowrap">
                <Link className="text-blue-600 hover:underline" to={`/submission/${r.id}`}>แก้ไข</Link>
                <span className="mx-1.5 text-gray-300">|</span>
                <Link className="text-green-700 hover:underline" to={`/submission/${r.id}/preview`}>พิมพ์</Link>
                {canSend(r) && (
                  <>
                    <span className="mx-1.5 text-gray-300">|</span>
                    <button className="font-medium text-blue-600 hover:underline" onClick={() => setSignModal(r)}>ส่งให้เซ็น</button>
                  </>
                )}
                {subStatus(r) === 'pending' && (
                  <>
                    <span className="mx-1.5 text-gray-300">|</span>
                    <button className="text-amber-700 hover:underline" onClick={() => onCancelSign(r)}>ยกเลิกส่งเซ็น</button>
                  </>
                )}
                {subStatus(r) === 'draft' && (
                  <>
                    <span className="mx-1.5 text-gray-300">|</span>
                    <button className="text-red-600 hover:underline" onClick={() => onDelete(r)}>ลบ</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {signModal && profile && (
        <AssignSignersModal
          submission={signModal}
          settings={formOf(signModal.formType) ?? ({ signatureBlocks: DEFAULT_SIGNATURE_BLOCKS } as FormSettings)}
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
