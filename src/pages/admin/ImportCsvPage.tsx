import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Download, FileSpreadsheet, FileUp, Upload } from 'lucide-react'
import { checkAgainstLists, parseEmployeeCsv, parseEmployeeGrid } from '../../shared/csv'
import type { CsvEmployeeRow, ImportLists } from '../../shared/csv'
import { isXlsx, readSheet } from '../../shared/xlsx'
import { importEmployees } from '../../data/users'
import { listCompanies } from '../../data/companies'
import { listAccessGroups } from '../../data/accessGroups'
import { loadOptionLists } from '../../data/fieldOptions'
import { dbErrorMessage } from '../../shared/dbError'
import type { Company } from '../../types/schema'
import { uiAlert, uiConfirm } from '../../components/dialog/dialogService'
import { Spinner } from '../../components/Spinner'
import { ui } from '../../components/ui'

const PREVIEW_ROWS = 8
// The sheet the template asks people to fill in. Named rather than taken as
// the first one, so adding a sheet to the workbook cannot change what is read.
const SHEET = 'พนักงาน'

// The lists as they stand right now — fetched again for every download and
// every upload, so a department added a minute ago is already in both.
async function loadLists(): Promise<ImportLists> {
  const [companies, groups, options] = await Promise.all([listCompanies(), listAccessGroups(), loadOptionLists()])
  return { companies, groups, departments: options.department, positions: options.position }
}

function saveFile(bytes: Uint8Array, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  // Revoked a moment later: revoking at once can cancel the download itself.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function ImportCsvPage() {
  const nav = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<CsvEmployeeRow[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [building, setBuilding] = useState(false)
  useEffect(() => { listCompanies().then(setCompanies) }, [])

  function reset() {
    setFileName(''); setRows([]); setErrors([])
    if (inputRef.current) inputRef.current.value = ''
  }

  // Parse only — nothing is created until the admin reviews and confirms.
  async function onFile(file: File | undefined) {
    if (!file) return
    setFileName(file.name)
    try {
      const parsed = isXlsx(file)
        ? parseEmployeeGrid(await readSheet(file, SHEET))
        : parseEmployeeCsv(await file.text())
      const { rows, errors } = checkAgainstLists(parsed, await loadLists())
      setRows(rows); setErrors(errors)
    } catch (err: any) {
      // A file that cannot be opened at all is reported where every other
      // problem with the file is reported, rather than as a popup.
      setRows([]); setErrors([err?.message || 'เปิดไฟล์นี้ไม่ได้'])
    }
    if (inputRef.current) inputRef.current.value = '' // allow re-picking the fixed file
  }

  // Built on request, from the live lists. The builder is loaded only here,
  // so the rest of the app does not carry it.
  async function downloadTemplate() {
    setBuilding(true)
    try {
      const [lists, template] = await Promise.all([loadLists(), import('../../shared/employeeTemplate')])
      saveFile(await template.buildEmployeeTemplate(lists), 'employees-template.xlsx', template.TEMPLATE_MIME)
    } catch (e) {
      uiAlert('สร้างไฟล์ไม่สำเร็จ: ' + dbErrorMessage(e))
    } finally {
      setBuilding(false)
    }
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
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-600 hover:border-stone-300 hover:text-stone-900"
        >
          <ArrowLeft size={16} /> กลับ
        </button>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-clay-50 text-clay-600"><FileUp size={20} /></div>
        <div>
          <h1 className="text-xl font-semibold text-stone-900">นำเข้าพนักงานจากไฟล์</h1>
          <p className="text-sm text-stone-500">เพิ่มพนักงานหลายคนพร้อมกันจากไฟล์ Excel</p>
        </div>
      </div>

      {/* Step 1: pick a file */}
      <div className="rounded-xl border border-stone-200 bg-white p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold text-stone-900">1. เลือกไฟล์</h2>
          <button type="button" onClick={downloadTemplate} disabled={building} className={ui.btnPrimary}>
            {building ? <Spinner size={16} /> : <Download size={16} />} ดาวน์โหลดไฟล์ Excel
          </button>
        </div>

        <p className={`${ui.hint} mb-4`}>
          ช่องพื้นเหลืองต้องกรอก · ช่องสิทธิ์ บริษัท และกลุ่ม มีรายการให้เลือก ส่วนแผนกและตำแหน่งพิมพ์ได้อิสระ —
          กรอกเสร็จแล้ว <span className="font-medium text-stone-700">อัปโหลดไฟล์ .xlsx ได้เลย</span> ไม่ต้องแปลงเป็นอย่างอื่น
        </p>

        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 px-6 py-8 text-center hover:border-clay-400 hover:bg-clay-50/40">
          <FileSpreadsheet size={28} className="text-stone-400" />
          <span className="text-sm font-medium text-stone-700">{fileName || 'คลิกเพื่อเลือกไฟล์ที่กรอกแล้ว'}</span>
          <span className="text-xs text-stone-400">{fileName ? 'คลิกเพื่อเลือกไฟล์อื่น' : 'รับไฟล์ .xlsx และ .csv'}</span>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={e => onFile(e.target.files?.[0])}
          />
        </label>
      </div>

      {/* Step 2: review */}
      {fileName && (
        <div className="rounded-xl border border-stone-200 bg-white p-6">
          <h2 className="mb-4 text-[15px] font-semibold text-stone-900">2. ตรวจสอบก่อนนำเข้า</h2>

          {errors.length > 0 ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brick-700">
                <AlertTriangle size={16} /> พบข้อผิดพลาด {errors.length} จุด — แก้ไฟล์แล้วเลือกใหม่อีกครั้ง
              </div>
              <ul className="max-h-48 list-disc space-y-0.5 overflow-y-auto pl-5 text-sm text-brick-700">
                {errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-stone-500">ไม่พบข้อมูลพนักงานในไฟล์</p>
          ) : (
            <>
              <p className="mb-3 text-sm text-stone-600">พบพนักงาน <b className="text-stone-900">{rows.length}</b> คน{rows.length > PREVIEW_ROWS ? ` — แสดง ${PREVIEW_ROWS} คนแรก` : ''}</p>
              <div className="overflow-x-auto rounded-lg border border-stone-100">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 text-stone-600">
                    <tr>{['รหัส', 'ชื่อ-นามสกุล', 'ตำแหน่ง', 'บริษัท', 'สิทธิ์'].map(h => <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-medium">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {rows.slice(0, PREVIEW_ROWS).map((r, i) => (
                      <tr key={i}>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-[13px] text-stone-600">{r.employeeId}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-stone-900">{r.firstName} {r.lastName}</td>
                        <td className="px-3 py-2 text-stone-700">{r.position || '—'}</td>
                        <td className="px-3 py-2 text-stone-700">
                          {companyName(r.companyId) ?? <span className="text-ochre-600" title="ไม่พบรหัสบริษัทนี้ในระบบ">{r.companyId} ⚠</span>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-stone-700">{r.role === 'admin' ? 'Account Admin' : 'พนักงาน'}</td>
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
                className="inline-flex items-center gap-2 rounded-lg bg-clay-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-clay-700 disabled:opacity-60"
              >
                {importing ? <><Spinner size={16} /> กำลังนำเข้า...</> : <><Upload size={16} /> นำเข้า {rows.length} คน</>}
              </button>
            )}
            <button
              type="button"
              onClick={reset}
              disabled={importing}
              className="rounded-lg border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 hover:border-stone-300 hover:text-stone-900 disabled:opacity-60"
            >
              ล้างไฟล์
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
