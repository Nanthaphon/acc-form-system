import { uiAlert, uiConfirm } from '../components/dialog/dialogService'
import EmptyRow from '../components/EmptyRow'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Inbox, Signature } from 'lucide-react'
import ActionIconButton from '../components/ActionIconButton'
import { Badge, PageHeader, ui } from '../components/ui'
import DocNumberCell from '../components/DocNumberCell'
import TableSkeleton from '../components/TableSkeleton'
import { useAuth } from '../auth/AuthProvider'
import type { SubmissionSummary, FormSettings, DocSignature } from '../types/schema'
import { listMyAssigned, signDocument, submissionAmount } from '../data/submissions'
import { notifySigned } from '../data/notify'
import { listForms } from '../data/formSettings'
import { formatDate } from '../shared/date'
import { formatMoney } from '../shared/money'
import { useLiveSubmissions } from '../shared/liveSubmissions'

// Amount header lines up with its right-aligned cells.
const thRight = ui.th.replace('text-left', 'text-right')

export default function SignInboxPage() {
  const { profile } = useAuth()
  const [rows, setRows] = useState<SubmissionSummary[]>([])
  const [forms, setForms] = useState<FormSettings[]>([])
  const [loading, setLoading] = useState(true)

  function reload() { if (profile) listMyAssigned(profile.uid).then(r => { setRows(r); setLoading(false) }) }
  // A document sent to me, or called back: the list follows without a refresh.
  useLiveSubmissions(reload)
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
    try { await signDocument(s.id, blockId) }
    catch (e: any) { uiAlert('เซ็นไม่สำเร็จ: ' + (e?.message || 'เกิดข้อผิดพลาด')); return }
    reload()
    // The signature is done; the requester is told by email on a best-effort basis.
    void notifySigned(s.id, blockId)
  }

  return (
    <div className="space-y-8">
      {/* ฟอร์มเอกสารรอเซ็น */}
      <div>
        <PageHeader
          icon={<Inbox size={20} />}
          title={
            <span className="inline-flex items-center gap-2">
              ฟอร์มเอกสารรอเซ็น
              {!loading && <Badge tone="amber">{pendingRows.length}</Badge>}
            </span>
          }
        />

        {!profile?.signatureImage && (
          <div className="mb-4 rounded-lg bg-ochre-50 px-4 py-3 text-sm text-ochre-700">
            คุณยังไม่ได้อัปโหลดลายเซ็น — <Link to="/profile" className="font-medium underline">ไปอัปโหลดที่หน้าข้อมูลของฉัน</Link> ก่อนจึงจะเซ็นได้
          </div>
        )}

        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead className={ui.thead}>
              <tr>{['เลขที่', 'ฟอร์ม', 'ผู้ขอ', 'ยอด', 'วันที่', 'ช่องที่ต้องเซ็น', 'จัดการ'].map(h => (
                <th key={h} className={h === 'ยอด' ? thRight : ui.th}>{h}</th>
              ))}</tr>
            </thead>
            <tbody className={ui.tbody}>
              {pendingRows.map(r => (
                <tr key={r.id} className={`${ui.tr} align-top`}>
                  <td className={`${ui.td} whitespace-nowrap font-medium text-stone-900`}><DocNumberCell sub={r} /></td>
                  <td className={ui.td}>{formName(r.formType)}</td>
                  <td className={`${ui.td} whitespace-nowrap`}>{r.header.firstName} {r.header.lastName}</td>
                  <td className={`${ui.td} whitespace-nowrap text-right tabular-nums`}>{formatMoney(submissionAmount(r))}</td>
                  <td className={`${ui.td} whitespace-nowrap text-stone-500`}>{formatDate(r.createdAt)}</td>
                  <td className={ui.td}>{myBlocks(r).filter(b => b.status === 'pending').map(b => b.blockLabel).join(', ')}</td>
                  <td className={`${ui.td} whitespace-nowrap`}>
                    <div className="flex items-center justify-end gap-1.5">
                      <ActionIconButton showLabel label="ดูเอกสาร" to={`/submission/${r.id}/preview`} icon={<Eye size={16} />} />
                      {myBlocks(r).filter(b => b.status === 'pending').map(b => (
                        <ActionIconButton
                          key={b.blockId}
                          showLabel
                          label={`เซ็นช่อง ${b.blockLabel}`}
                          short={`เซ็น ${b.blockLabel}`}
                          tone="green"
                          icon={<Signature size={16} />}
                          onClick={() => onSign(r, b.blockId, b.blockLabel)}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {loading && <TableSkeleton cols={7} rows={4} />}
              {!loading && pendingRows.length === 0 && (
                <EmptyRow colSpan={7} icon={<Inbox size={20} />}>ไม่มีเอกสารรอเซ็น</EmptyRow>
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
                    <td className={`${ui.td} whitespace-nowrap font-medium text-stone-900`}><DocNumberCell sub={r} /></td>
                    <td className={ui.td}>{formName(r.formType)}</td>
                    <td className={`${ui.td} whitespace-nowrap`}>{r.header.firstName} {r.header.lastName}</td>
                    <td className={ui.td}>{mine.map(b => b.blockLabel).join(', ')}</td>
                    <td className={`${ui.td} whitespace-nowrap text-stone-500`}>{lastSignedAt ? formatDate(lastSignedAt) : '-'}</td>
                    <td className={`${ui.td} whitespace-nowrap`}>
                      <div className="flex items-center justify-end">
                        <ActionIconButton label="ดูเอกสาร" to={`/submission/${r.id}/preview`} icon={<Eye size={16} />} />
                      </div>
                    </td>
                  </tr>
                )
              })}
              {loading && <TableSkeleton cols={6} rows={3} />}
              {!loading && doneRows.length === 0 && (
                <EmptyRow colSpan={6} icon={<Signature size={20} />}>ยังไม่มีเอกสารที่คุณเซ็น</EmptyRow>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
