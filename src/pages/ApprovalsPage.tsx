import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Inbox } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import type { Submission, FormSettings } from '../types/schema'
import { listPendingForApprover, approveSubmission, rejectSubmission, submissionAmount } from '../data/submissions'
import { listForms } from '../data/formSettings'

export default function ApprovalsPage() {
  const { profile } = useAuth()
  const [subs, setSubs] = useState<Submission[]>([])
  const [forms, setForms] = useState<FormSettings[]>([])
  const [loading, setLoading] = useState(true)

  function reload() { listPendingForApprover().then(s => { setSubs(s); setLoading(false) }) }
  useEffect(() => { reload(); listForms().then(setForms) }, [])

  const formName = (ft: string) => {
    const f = forms.find(x => x.formType === ft)
    return f?.name || f?.title || ft
  }

  async function onApprove(r: Submission) {
    if (!profile?.signatureImage) {
      alert('คุณยังไม่ได้อัปโหลดลายเซ็น — ไปที่หน้า “ข้อมูลของฉัน” เพื่ออัปโหลดก่อน แล้วจึงอนุมัติได้')
      return
    }
    if (!confirm(`อนุมัติเอกสาร "${r.docNumber}" ?\nลายเซ็นของคุณจะถูกแปะลงเอกสาร`)) return
    try { await approveSubmission(r.id); reload() }
    catch (e: any) { alert('อนุมัติไม่สำเร็จ: ' + (e?.message || 'เกิดข้อผิดพลาด')) }
  }

  async function onReject(r: Submission) {
    const reason = window.prompt(`ตีกลับเอกสาร "${r.docNumber}" — ระบุเหตุผล`)?.trim()
    if (!reason) return
    try { await rejectSubmission(r.id, reason); reload() }
    catch (e: any) { alert('ตีกลับไม่สำเร็จ: ' + (e?.message || 'เกิดข้อผิดพลาด')) }
  }

  if (profile && !profile.canApprove) {
    return <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">คุณไม่มีสิทธิ์อนุมัติเอกสาร</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-500"><Inbox size={20} /></div>
        <h1 className="text-xl font-semibold text-gray-900">รออนุมัติ</h1>
        {!loading && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">{subs.length}</span>}
      </div>

      {!profile?.signatureImage && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          คุณยังไม่ได้อัปโหลดลายเซ็น — <Link to="/profile" className="font-medium underline">ไปอัปโหลดที่หน้าข้อมูลของฉัน</Link> ก่อนจึงจะอนุมัติได้
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>{['เลขที่', 'ฟอร์ม', 'ผู้ขอ', 'ยอด', 'ขอเมื่อ', ''].map(h => (
              <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {subs.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap">{r.docNumber}</td>
                <td className="px-3 py-2">{formName(r.formType)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.header.firstName} {r.header.lastName}</td>
                <td className="px-3 py-2 text-right">{submissionAmount(r).toLocaleString()}</td>
                <td className="px-3 py-2 whitespace-nowrap text-gray-500">{r.requestedAt ? new Date(r.requestedAt).toLocaleString('th-TH') : '-'}</td>
                <td className="px-3 py-2 whitespace-nowrap text-right">
                  <Link className="text-blue-600 hover:underline" to={`/submission/${r.id}/preview`}>ดู</Link>
                  <span className="mx-1.5 text-gray-300">|</span>
                  <button className="inline-flex items-center gap-1 font-medium text-green-700 hover:underline" onClick={() => onApprove(r)}><CheckCircle2 size={14} /> อนุมัติ</button>
                  <span className="mx-1.5 text-gray-300">|</span>
                  <button className="text-red-600 hover:underline" onClick={() => onReject(r)}>ตีกลับ</button>
                </td>
              </tr>
            ))}
            {!loading && subs.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-400">ไม่มีเอกสารรออนุมัติ</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
