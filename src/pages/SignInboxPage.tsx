import { uiAlert, uiConfirm } from '../components/dialog/dialogService'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Inbox, PenLine } from 'lucide-react'
import ActionIconButton from '../components/ActionIconButton'
import { Badge, PageHeader, ui } from '../components/ui'
import { Spinner } from '../components/Spinner'
import { useAuth } from '../auth/AuthProvider'
import type { SubmissionSummary, FormSettings, DocSignature } from '../types/schema'
import { listMyAssigned, signDocument, submissionAmount } from '../data/submissions'
import { listForms } from '../data/formSettings'
import { notifyPendingSignChanged } from '../shared/pendingSignBus'
import { formatDate } from '../shared/date'

// Amount header lines up with its right-aligned cells.
const thRight = ui.th.replace('text-left', 'text-right')

export default function SignInboxPage() {
  const { profile } = useAuth()
  const [rows, setRows] = useState<SubmissionSummary[]>([])
  const [forms, setForms] = useState<FormSettings[]>([])
  const [loading, setLoading] = useState(true)

  function reload() { if (profile) listMyAssigned(profile.uid).then(r => { setRows(r); setLoading(false) }) }
  useEffect(() => { reload(); listForms().then(setForms) }, [profile])

  const formName = (ft: string) => {
    const f = forms.find(x => x.formType === ft)
    return f?.name || f?.title || ft
  }
  const myBlocks = (s: SubmissionSummary): DocSignature[] => (s.signatures ?? []).filter(x => x.assignedUid === profile?.uid)
  const pendingRows = rows.filter(s => myBlocks(s).some(b => b.status === 'pending'))
  const doneRows = rows.filter(s => myBlocks(s).length > 0 && myBlocks(s).every(b => b.status === 'signed'))

  async function onSign(s: SubmissionSummary, blockId: string, blockLabel: string) {
    if (!profile?.signatureImage) {
      uiAlert('คุณยังไม่ได้อัปโหลดลายเซ็น — ไปที่หน้า “ข้อมูลของฉัน” เพื่ออัปโหลดก่อน แล้วจึงเซ็นได้')
      return
    }
    if (!(await uiConfirm(`ลายเซ็นของคุณจะถูกแปะลงเอกสาร`, { title: `เซ็นช่อง "${blockLabel}" ของเอกสาร ${s.docNumber} ?`, confirmText: 'เซ็น' }))) return
    try { await signDocument(s.id, blockId); reload(); notifyPendingSignChanged() }
    catch (e: any) { uiAlert('เซ็นไม่สำเร็จ: ' + (e?.message || 'เกิดข้อผิดพลาด')) }
  }

  return (
    <div className="space-y-8">
      {/* รอฉันเซ็น */}
      <div>
        <PageHeader
          icon={<Inbox size={20} />}
          title={
            <span className="inline-flex items-center gap-2">
              รอฉันเซ็น
              {!loading && <Badge tone="amber">{pendingRows.length}</Badge>}
            </span>
          }
        />

        {!profile?.signatureImage && (
          <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            คุณยังไม่ได้อัปโหลดลายเซ็น — <Link to="/profile" className="font-medium underline">ไปอัปโหลดที่หน้าข้อมูลของฉัน</Link> ก่อนจึงจะเซ็นได้
          </div>
        )}

        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead className={ui.thead}>
              <tr>{['เลขที่', 'ฟอร์ม', 'ผู้ขอ', 'ยอด', 'วันที่', 'ช่องที่ต้องเซ็น', ''].map(h => (
                <th key={h} className={h === 'ยอด' ? thRight : ui.th}>{h}</th>
              ))}</tr>
            </thead>
            <tbody className={ui.tbody}>
              {pendingRows.map(r => (
                <tr key={r.id} className={`${ui.tr} align-top`}>
                  <td className={`${ui.td} whitespace-nowrap font-medium text-gray-900`}>{r.docNumber}</td>
                  <td className={ui.td}>{formName(r.formType)}</td>
                  <td className={`${ui.td} whitespace-nowrap`}>{r.header.firstName} {r.header.lastName}</td>
                  <td className={`${ui.td} whitespace-nowrap text-right tabular-nums`}>{submissionAmount(r).toLocaleString()}</td>
                  <td className={`${ui.td} whitespace-nowrap text-gray-500`}>{formatDate(r.createdAt)}</td>
                  <td className={ui.td}>{myBlocks(r).filter(b => b.status === 'pending').map(b => b.blockLabel).join(', ')}</td>
                  <td className={`${ui.td} whitespace-nowrap`}>
                    <div className="flex items-center justify-end gap-1.5">
                      <ActionIconButton label="ดูเอกสาร" to={`/submission/${r.id}/preview`} icon={<Eye size={16} />} />
                      {myBlocks(r).filter(b => b.status === 'pending').map(b => (
                        <ActionIconButton
                          key={b.blockId}
                          label={`เซ็น ${b.blockLabel}`}
                          tone="green"
                          icon={<PenLine size={16} />}
                          onClick={() => onSign(r, b.blockId, b.blockLabel)}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {loading && (
                <tr><td colSpan={7} className={ui.emptyCell}><Spinner size={20} className="mx-auto" /></td></tr>
              )}
              {!loading && pendingRows.length === 0 && (
                <tr><td colSpan={7} className={ui.emptyCell}>ไม่มีเอกสารรอเซ็น</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ประวัติที่ฉันเซ็น */}
      <div className="space-y-3">
        <h2 className={ui.cardTitle}>ประวัติที่ฉันเซ็น ({doneRows.length})</h2>
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead className={ui.thead}>
              <tr>{['เลขที่', 'ฟอร์ม', 'ผู้ขอ', 'ช่องที่เซ็น', 'วันที่เซ็น', ''].map(h => (
                <th key={h} className={ui.th}>{h}</th>
              ))}</tr>
            </thead>
            <tbody className={ui.tbody}>
              {doneRows.map(r => {
                const mine = myBlocks(r)
                const lastSignedAt = Math.max(...mine.map(b => b.signedAt ?? 0))
                return (
                  <tr key={r.id} className={ui.tr}>
                    <td className={`${ui.td} whitespace-nowrap font-medium text-gray-900`}>{r.docNumber}</td>
                    <td className={ui.td}>{formName(r.formType)}</td>
                    <td className={`${ui.td} whitespace-nowrap`}>{r.header.firstName} {r.header.lastName}</td>
                    <td className={ui.td}>{mine.map(b => b.blockLabel).join(', ')}</td>
                    <td className={`${ui.td} whitespace-nowrap text-gray-500`}>{lastSignedAt ? formatDate(lastSignedAt) : '-'}</td>
                    <td className={`${ui.td} whitespace-nowrap`}>
                      <div className="flex items-center justify-end">
                        <ActionIconButton label="ดูเอกสาร" to={`/submission/${r.id}/preview`} icon={<Eye size={16} />} />
                      </div>
                    </td>
                  </tr>
                )
              })}
              {loading && (
                <tr><td colSpan={6} className={ui.emptyCell}><Spinner size={20} className="mx-auto" /></td></tr>
              )}
              {!loading && doneRows.length === 0 && (
                <tr><td colSpan={6} className={ui.emptyCell}>ยังไม่มีเอกสารที่คุณเซ็น</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
