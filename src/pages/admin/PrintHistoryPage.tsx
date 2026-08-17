import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listAllSubmissions, submissionAmount, deleteSubmission, subStatus, statusMeta } from '../../data/submissions'
import { getVersionCounts, editLabel } from '../../data/versions'
import { listEmployees } from '../../data/users'
import { listForms } from '../../data/formSettings'
import type { Submission, UserProfile, FormSettings, SubmissionStatus } from '../../types/schema'
import { formatDate, formatDateTime } from '../../shared/date'
import DateInput from '../../components/DateInput'

const STATUSES: SubmissionStatus[] = ['pending', 'approved', 'rejected', 'draft']
const inputCls = 'rounded border px-2 py-1.5 text-sm'

export default function PrintHistoryPage() {
  const [rows, setRows] = useState<Submission[]>([])
  const [employees, setEmployees] = useState<UserProfile[]>([])
  const [forms, setForms] = useState<FormSettings[]>([])
  const [vcounts, setVcounts] = useState<Record<string, number>>({})
  // filters
  const [emp, setEmp] = useState('')          // employeeId; '' = all
  const [q, setQ] = useState('')              // search doc number / name
  const [formF, setFormF] = useState('')      // formType
  const [statusF, setStatusF] = useState('')  // status
  const [datePreset, setDatePreset] = useState('all')
  const [fromD, setFromD] = useState('')      // ISO yyyy-mm-dd
  const [toD, setToD] = useState('')

  function clearFilters() {
    setEmp(''); setQ(''); setFormF(''); setStatusF(''); setDatePreset('all'); setFromD(''); setToD('')
  }

  function loadRows() { listAllSubmissions().then(setRows) }
  useEffect(() => {
    loadRows()
    listEmployees().then(setEmployees)
    listForms().then(setForms)
    getVersionCounts().then(setVcounts)
  }, [])

  async function onDelete(r: Submission) {
    if (!confirm(`ลบเอกสาร "${r.docNumber || 'ไม่มีเลขที่'}" ?\nลบถาวร ยกเลิกไม่ได้`)) return
    try { await deleteSubmission(r.id); loadRows() }
    catch { alert('ลบเอกสารไม่สำเร็จ') }
  }

  const empName = (eid: string) => {
    const p = employees.find(e => e.employeeId === eid)
    return p ? `${p.firstName} ${p.lastName}` : ''
  }
  const formName = (ft: string) => {
    const f = forms.find(x => x.formType === ft)
    return f?.name || f?.title || ft
  }

  function dateBounds(): [number, number] {
    const now = new Date()
    const y = now.getFullYear(), m = now.getMonth()
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    switch (datePreset) {
      case 'today': return [startOfDay(now), startOfDay(now) + 86400000 - 1]
      case 'thisMonth': return [new Date(y, m, 1).getTime(), new Date(y, m + 1, 1).getTime() - 1]
      case 'lastMonth': return [new Date(y, m - 1, 1).getTime(), new Date(y, m, 1).getTime() - 1]
      case 'thisYear': return [new Date(y, 0, 1).getTime(), new Date(y + 1, 0, 1).getTime() - 1]
      case 'custom': return [
        fromD ? new Date(fromD + 'T00:00:00').getTime() : -Infinity,
        toD ? new Date(toD + 'T23:59:59.999').getTime() : Infinity,
      ]
      default: return [-Infinity, Infinity]
    }
  }
  const [dStart, dEnd] = dateBounds()
  const needle = q.trim().toLowerCase()
  const filtered = rows.filter(r => {
    if (emp && r.createdByEmployeeId !== emp) return false
    if (formF && r.formType !== formF) return false
    if (statusF && subStatus(r) !== statusF) return false
    if (r.createdAt < dStart || r.createdAt > dEnd) return false
    if (needle) {
      const hay = `${r.docNumber} ${empName(r.createdByEmployeeId)} ${r.createdByEmployeeId}`.toLowerCase()
      if (!hay.includes(needle)) return false
    }
    return true
  })

  return (
    <div>
      <div className="mb-4 space-y-3">
        <h1 className="text-xl font-medium">ประวัติการพิมพ์ทั้งหมด</h1>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className={`${inputCls} w-52`}
            placeholder="ค้นหา เลขที่ / ชื่อพนักงาน"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <select className={inputCls} value={formF} onChange={e => setFormF(e.target.value)}>
            <option value="">— ฟอร์มทั้งหมด —</option>
            {forms.map(f => <option key={f.formType} value={f.formType}>{f.name || f.title}</option>)}
          </select>
          <select className={inputCls} value={statusF} onChange={e => setStatusF(e.target.value)}>
            <option value="">— สถานะทั้งหมด —</option>
            {STATUSES.map(s => <option key={s} value={s}>{statusMeta(s).label}</option>)}
          </select>
          <select className={inputCls} value={emp} onChange={e => setEmp(e.target.value)}>
            <option value="">— พนักงานทั้งหมด —</option>
            {employees.map(p => (
              <option key={p.uid} value={p.employeeId}>{p.employeeId} — {p.firstName} {p.lastName}</option>
            ))}
          </select>
          <select className={inputCls} value={datePreset} onChange={e => setDatePreset(e.target.value)}>
            <option value="all">— ทุกวันที่ —</option>
            <option value="today">วันนี้</option>
            <option value="thisMonth">เดือนนี้</option>
            <option value="lastMonth">เดือนที่แล้ว</option>
            <option value="thisYear">ปีนี้</option>
            <option value="custom">กำหนดเอง…</option>
          </select>
          {datePreset === 'custom' && (
            <>
              <DateInput className={`${inputCls} w-32`} value={fromD} onChange={setFromD} />
              <span className="text-sm text-gray-400">ถึง</span>
              <DateInput className={`${inputCls} w-32`} value={toD} onChange={setToD} />
            </>
          )}
          <button onClick={clearFilters} className="rounded border px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900">ล้างตัวกรอง</button>
          <span className="ml-auto text-sm text-gray-500">{filtered.length} รายการ</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border text-sm">
          <thead className="bg-gray-50">
            <tr>{['เลขที่', 'พนักงาน', 'ฟอร์ม', 'วันที่', 'ยอด', 'สถานะ', 'แก้ไข', 'พิมพ์ (ครั้ง)', 'พิมพ์ล่าสุด', ''].map(h => (
              <th key={h} className="border px-2 py-1 whitespace-nowrap">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="border px-2 py-1 whitespace-nowrap">{r.docNumber}</td>
                <td className="border px-2 py-1 whitespace-nowrap">
                  {empName(r.createdByEmployeeId)} <span className="text-gray-400">({r.createdByEmployeeId})</span>
                </td>
                <td className="border px-2 py-1">{formName(r.formType)}</td>
                <td className="border px-2 py-1 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                <td className="border px-2 py-1 text-right">{submissionAmount(r).toLocaleString()}</td>
                <td className="border px-2 py-1 text-center">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusMeta(subStatus(r)).className}`}>{statusMeta(subStatus(r)).label}</span>
                </td>
                <td className="border px-2 py-1 whitespace-nowrap text-center">
                  {editLabel(r, vcounts)
                    ? <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">✎ {editLabel(r, vcounts)}</span>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="border px-2 py-1 text-center">{r.printCount}</td>
                <td className="border px-2 py-1 whitespace-nowrap">{formatDateTime(r.lastPrintedAt)}</td>
                <td className="border px-2 py-1 whitespace-nowrap text-center">
                  <Link className="text-blue-600 hover:underline" to={`/submission/${r.id}`}>แก้ไข</Link>
                  <span className="mx-1.5 text-gray-300">|</span>
                  <Link className="text-green-700 hover:underline" to={`/submission/${r.id}/preview`}>พิมพ์</Link>
                  <span className="mx-1.5 text-gray-300">|</span>
                  <button className="text-red-600 hover:underline" onClick={() => onDelete(r)}>ลบ</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="border px-2 py-6 text-center text-gray-400">ยังไม่มีเอกสาร</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
