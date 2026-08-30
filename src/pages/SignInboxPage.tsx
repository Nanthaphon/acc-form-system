import { uiAlert, uiConfirm } from '../components/dialog/dialogService'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Inbox, PenLine } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import type { Submission, FormSettings, DocSignature } from '../types/schema'
import { listMyAssigned, signDocument, submissionAmount } from '../data/submissions'
import { listForms } from '../data/formSettings'
import { formatDate } from '../shared/date'

export default function SignInboxPage() {
  const { profile } = useAuth()
  const [rows, setRows] = useState<Submission[]>([])
  const [forms, setForms] = useState<FormSettings[]>([])
  const [loading, setLoading] = useState(true)

  function reload() { if (profile) listMyAssigned(profile.uid).then(r => { setRows(r); setLoading(false) }) }
  useEffect(() => { reload(); listForms().then(setForms) }, [profile])

  const formName = (ft: string) => {
    const f = forms.find(x => x.formType === ft)
    return f?.name || f?.title || ft
  }
  const myBlocks = (s: Submission): DocSignature[] => (s.signatures ?? []).filter(x => x.assignedUid === profile?.uid)
  const pendingRows = rows.filter(s => myBlocks(s).some(b => b.status === 'pending'))
  const doneRows = rows.filter(s => myBlocks(s).length > 0 && myBlocks(s).every(b => b.status === 'signed'))

  async function onSign(s: Submission, blockId: string, blockLabel: string) {
    if (!profile?.signatureImage) {
      uiAlert('คุณยังไม่ได้อัปโหลดลายเซ็น — ไปที่หน้า “ข้อมูลของฉัน” เพื่ออัปโหลดก่อน แล้วจึงเซ็นได้')
      return
    }
    if (!(await uiConfirm(`ลายเซ็นของคุณจะถูกแปะลงเอกสาร`, { title: `เซ็นช่อง "${blockLabel}" ของเอกสาร ${s.docNumber} ?`, confirmText: 'เซ็น' }))) return
    try { await signDocument(s.id, blockId); reload() }
    catch (e: any) { uiAlert('เซ็นไม่สำเร็จ: ' + (e?.message || 'เกิดข้อผิดพลาด')) }
  }

  return (
    <div className="space-y-6">
      {/* รอฉันเซ็น */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-500"><Inbox size={20} /></div>
          <h1 className="text-xl font-semibold text-gray-900">รอฉันเซ็น</h1>
          {!loading && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">{pendingRows.length}</span>}
        </div>

        {!profile?.signatureImage && (
          <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            คุณยังไม่ได้อัปโหลดลายเซ็น — <Link to="/profile" className="font-medium underline">ไปอัปโหลดที่หน้าข้อมูลของฉัน</Link> ก่อนจึงจะเซ็นได้
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>{['เลขที่', 'ฟอร์ม', 'ผู้ขอ', 'ยอด', 'วันที่', 'ช่องที่ต้องเซ็น', ''].map(h => (
                <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pendingRows.map(r => (
                <tr key={r.id} className="align-top hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap">{r.docNumber}</td>
                  <td className="px-3 py-2">{formName(r.formType)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.header.firstName} {r.header.lastName}</td>
                  <td className="px-3 py-2 text-right">{submissionAmount(r).toLocaleString()}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500">{formatDate(r.createdAt)}</td>
                  <td className="px-3 py-2">{myBlocks(r).filter(b => b.status === 'pending').map(b => b.blockLabel).join(', ')}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-right">
                    <Link className="text-blue-600 hover:underline" to={`/submission/${r.id}/preview`}>ดู</Link>
                    {myBlocks(r).filter(b => b.status === 'pending').map(b => (
                      <span key={b.blockId}>
                        <span className="mx-1.5 text-gray-300">|</span>
                        <button className="inline-flex items-center gap-1 font-medium text-green-700 hover:underline" onClick={() => onSign(r, b.blockId, b.blockLabel)}>
                          <PenLine size={13} /> เซ็น {b.blockLabel}
                        </button>
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
              {!loading && pendingRows.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">ไม่มีเอกสารรอเซ็น</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ประวัติที่ฉันเซ็น */}
      <div className="space-y-3">
        <h2 className="text-[15px] font-semibold text-gray-900">ประวัติที่ฉันเซ็น ({doneRows.length})</h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>{['เลขที่', 'ฟอร์ม', 'ผู้ขอ', 'ช่องที่เซ็น', 'วันที่เซ็น', ''].map(h => (
                <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {doneRows.map(r => {
                const mine = myBlocks(r)
                const lastSignedAt = Math.max(...mine.map(b => b.signedAt ?? 0))
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap">{r.docNumber}</td>
                    <td className="px-3 py-2">{formName(r.formType)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.header.firstName} {r.header.lastName}</td>
                    <td className="px-3 py-2">{mine.map(b => b.blockLabel).join(', ')}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-500">{lastSignedAt ? formatDate(lastSignedAt) : '-'}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      <Link className="text-blue-600 hover:underline" to={`/submission/${r.id}/preview`}>ดู</Link>
                    </td>
                  </tr>
                )
              })}
              {!loading && doneRows.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-400">ยังไม่มีเอกสารที่คุณเซ็น</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
