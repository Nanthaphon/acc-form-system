import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Download, FileSpreadsheet, FileUp, Upload } from 'lucide-react'
import { parseEmployeeCsv } from '../../shared/csv'
import type { CsvEmployeeRow } from '../../shared/csv'
import { importEmployees } from '../../data/users'
import { listCompanies } from '../../data/companies'
import type { Company } from '../../types/schema'
import { uiAlert, uiConfirm } from '../../components/dialog/dialogService'
import { Spinner } from '../../components/Spinner'
import { ui } from '../../components/ui'

// CSV columns, in template order: [name, required, what goes in it]
const COLUMNS: Array<[string, boolean, string]> = [
  ['employeeId', true, 'รหัสพนักงาน — อย่างน้อย 6 ตัว ใช้เป็นรหัสผ่านเริ่มต้น'],
  ['firstName', true, 'ชื่อ'],
  ['lastName', true, 'นามสกุล'],
  ['companyId', true, 'รหัสบริษัท'],
  ['position', false, 'ตำแหน่ง'],
  ['department', false, 'แผนก'],
  ['defaultJob', false, 'Job เริ่มต้น'],
  ['bankAccount', false, 'เลขบัญชี'],
  ['role', false, 'employee = พนักงาน, admin = Account Admin (เว้นว่าง = employee)'],
  ['accessGroup', false, 'รหัสกลุ่มการเข้าถึง'],
]
const PREVIEW_ROWS = 8

// A ready-to-fill template. The BOM makes Excel open the Thai text correctly.
function downloadTemplate() {
  const header = COLUMNS.map(c => c[0]).join(',')
  const sample = '1010999,สมชาย,ใจดี,globe,เจ้าหน้าที่บัญชี,Payroll,,,employee,'
  const blob = new Blob([`\uFEFF${header}\n${sample}\n`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'employees-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function ImportCsvPage() {
  const nav = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<CsvEmployeeRow[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  useEffect(() => { listCompanies().then(setCompanies) }, [])

  function reset() {
    setFileName(''); setRows([]); setErrors([])
    if (inputRef.current) inputRef.current.value = ''
  }

  // Parse only — nothing is created until the admin reviews and confirms.
  async function onFile(file: File | undefined) {
    if (!file) return
    const { rows, errors } = parseEmployeeCsv(await file.text())
    setFileName(file.name); setRows(rows); setErrors(errors)
    if (inputRef.current) inputRef.current.value = '' // allow re-picking the fixed file
  }

  async function onImport() {
    if (!(await uiConfirm(`ระบบจะสร้างบัญชีเข้าใช้ให้ทุกคน รหัสผ่านเริ่มต้น = รหัสพนักงาน`, { title: `นำเข้าพนักงาน ${rows.length} คน ?`, confirmText: 'นำเข้า' }))) return
    setImporting(true)
    try {
      const res = await importEmployees(rows)
      if (res.failed.length === 0) {
        uiAlert(`เพิ่มพนักงานสำเร็จ ${res.ok} คน`, { title: 'นำเข้าเรียบร้อย', tone: 'success' })
      } else {
        const lines = res.failed.map(f => `• ${f.employeeId} — ${f.reason}`).join('\n')
        uiAlert(`สำเร็จ ${res.ok} คน · ไม่สำเร็จ ${res.failed.length} คน\n\n${lines}`, { title: 'นำเข้าไม่ครบทุกคน', tone: 'danger' })
      }
      reset()
    } catch (err: any) {
      uiAlert('นำเข้าไม่สำเร็จ: ' + (err?.message || 'เกิดข้อผิดพลาด'))
    } finally {
      setImporting(false)
    }
  }

  const companyName = (id: string) => companies.find(c => c.id === id)?.name
  const ready = rows.length > 0 && errors.length === 0

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => nav('/admin/employees')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:border-gray-300 hover:text-gray-900"
        >
          <ArrowLeft size={16} /> กลับ
        </button>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><FileUp size={20} /></div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Import พนักงานจาก CSV</h1>
          <p className="text-sm text-gray-500">เพิ่มพนักงานหลายคนพร้อมกันจากไฟล์ CSV</p>
        </div>
      </div>

      {/* Step 1: pick a file */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold text-gray-900">1. เลือกไฟล์</h2>
          <a
            href="/employees-template.xlsx"
            download
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Download size={16} /> ดาวน์โหลดไฟล์ Excel (แนะนำ)
          </a>
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-300 hover:text-gray-900"
          >
            <Download size={16} /> ไฟล์ CSV เปล่า
          </button>
        </div>

        <p className={`${ui.hint} mb-4`}>
          ไฟล์ Excel มีคำอธิบายทุกคอลัมน์และมีรายการให้เลือก (สิทธิ์ · บริษัท · กลุ่ม) —
          กรอกเสร็จแล้วต้อง <span className="font-medium text-gray-700">บันทึกเป็น CSV UTF-8</span> ก่อนอัปโหลด เพราะระบบอ่านเฉพาะไฟล์ .csv
        </p>

        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-center hover:border-blue-400 hover:bg-blue-50/40">
          <FileSpreadsheet size={28} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-700">{fileName || 'คลิกเพื่อเลือกไฟล์ .csv'}</span>
          <span className="text-xs text-gray-400">{fileName ? 'คลิกเพื่อเลือกไฟล์อื่น' : 'ไฟล์ UTF-8 · แถวแรกเป็นชื่อคอลัมน์'}</span>
          <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={e => onFile(e.target.files?.[0])} />
        </label>

        <details className="mt-4 text-sm">
          <summary className="cursor-pointer select-none font-medium text-gray-700">คอลัมน์ในไฟล์</summary>
          <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            {COLUMNS.map(([name, required, note]) => (
              <li key={name} className="flex items-baseline gap-2 text-xs text-gray-600">
                <code className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-800">{name}</code>
                <span>{note}{required && <span className="ml-1 text-red-500">*</span>}</span>
              </li>
            ))}
          </ul>
          {companies.length > 0 && (
            <p className="mt-2 text-xs text-gray-500">รหัสบริษัทที่ใช้ได้: {companies.map(c => `${c.id} (${c.name})`).join(', ')}</p>
          )}
        </details>
      </div>

      {/* Step 2: review */}
      {fileName && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-[15px] font-semibold text-gray-900">2. ตรวจสอบก่อนนำเข้า</h2>

          {errors.length > 0 ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-700">
                <AlertTriangle size={16} /> พบข้อผิดพลาด {errors.length} จุด — แก้ไฟล์แล้วเลือกใหม่อีกครั้ง
              </div>
              <ul className="max-h-48 list-disc space-y-0.5 overflow-y-auto pl-5 text-sm text-red-700">
                {errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-gray-500">ไม่พบข้อมูลพนักงานในไฟล์</p>
          ) : (
            <>
              <p className="mb-3 text-sm text-gray-600">พบพนักงาน <b className="text-gray-900">{rows.length}</b> คน{rows.length > PREVIEW_ROWS ? ` — แสดง ${PREVIEW_ROWS} คนแรก` : ''}</p>
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>{['รหัส', 'ชื่อ-นามสกุล', 'ตำแหน่ง', 'บริษัท', 'สิทธิ์'].map(h => <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-medium">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.slice(0, PREVIEW_ROWS).map((r, i) => (
                      <tr key={i}>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-[13px] text-gray-600">{r.employeeId}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-gray-900">{r.firstName} {r.lastName}</td>
                        <td className="px-3 py-2 text-gray-700">{r.position || '—'}</td>
                        <td className="px-3 py-2 text-gray-700">
                          {companyName(r.companyId) ?? <span className="text-amber-600" title="ไม่พบรหัสบริษัทนี้ในระบบ">{r.companyId} ⚠</span>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-gray-700">{r.role === 'admin' ? 'Account Admin' : 'พนักงาน'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="mt-5 flex items-center gap-2.5">
            {ready && (
              <button
                type="button"
                onClick={onImport}
                disabled={importing}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {importing ? <><Spinner size={16} /> กำลังนำเข้า...</> : <><Upload size={16} /> นำเข้า {rows.length} คน</>}
              </button>
            )}
            <button
              type="button"
              onClick={reset}
              disabled={importing}
              className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-300 hover:text-gray-900 disabled:opacity-60"
            >
              ล้างไฟล์
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
