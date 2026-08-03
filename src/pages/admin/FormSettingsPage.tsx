import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronUp, Eye, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import type { Company, FormSettings, FormColumn, ColumnType, CalcDef, ExpenseHeader, ExpenseRow } from '../../types/schema'
import { EXPENSE_CLAIM_DEFAULTS, calcOperands } from '../../types/schema'
import ExpenseClaimPreview from '../../features/expense-claim/ExpenseClaimPreview'
import { getFormSettings, updateFormSettings } from '../../data/formSettings'
import { listCompanies, updateCompanyLogo } from '../../data/companies'

const cardClass = 'rounded-2xl border border-[#e5eaf3] bg-white p-6 shadow-[0_1px_2px_rgba(16,32,64,0.03)]'
const cardTitleClass = "flex items-center gap-2 text-sm font-semibold text-[#16233f] before:block before:h-4 before:w-1 before:rounded-[3px] before:bg-[#2b5bd7]"
const inputClass = 'w-full rounded-[10px] border border-[#e5eaf3] bg-[#fbfcfe] px-3 py-2.5 text-sm placeholder:text-[#7a869a] focus:border-[#2b5bd7] focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-[#2b5bd7]/[.12]'
const smallSelect = 'rounded-[8px] border border-[#e5eaf3] bg-white px-2 py-1.5 text-sm'
const iconBtn = 'rounded-[8px] border border-[#e5eaf3] px-2 py-1.5 text-sm hover:border-[#2b5bd7] hover:text-[#2b5bd7] disabled:opacity-40 disabled:hover:border-[#e5eaf3] disabled:hover:text-inherit'

const OP_LABELS: Record<CalcDef['op'], string> = {
  multiply: '× คูณ', subtract: '− ลบ', add: '+ บวก', divide: '÷ หาร', percent: '% ร้อยละ',
}
const OP_SYMBOL: Record<CalcDef['op'], string> = {
  multiply: '×', subtract: '−', add: '+', divide: '÷', percent: '%',
}

const MAX_VISIBLE = 12

function newColumnKey(existing: FormColumn[]): string {
  let n = existing.length + 1
  const keys = new Set(existing.map(c => c.key))
  while (keys.has(`col${n}`)) n++
  return `col${n}`
}

// Sample row for the preview (text -> 'ตัวอย่าง', number -> 100; calc columns compute from these).
function sampleRow(cols: FormColumn[]): ExpenseRow {
  const r: ExpenseRow = {}
  for (const c of cols) {
    if (c.type === 'number') r[c.key] = 100
    else if (c.type === 'text') r[c.key] = 'ตัวอย่าง'
    else if (c.type === 'date') r[c.key] = '2026-01-01'
  }
  return r
}

export default function FormSettingsPage() {
  const nav = useNavigate()
  const { formType = 'expense-claim' } = useParams()
  const [settings, setSettings] = useState<FormSettings>(EXPENSE_CLAIM_DEFAULTS)
  const [companies, setCompanies] = useState<Company[]>([])
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  function loadCompanies() { listCompanies().then(setCompanies) }
  useEffect(() => {
    getFormSettings(formType).then(setSettings)
    loadCompanies()
  }, [formType])

  function setField<K extends keyof FormSettings>(key: K, value: FormSettings[K]) {
    setSettings(s => ({ ...s, [key]: value }))
  }

  // ----- categories -----
  function setCategory(idx: number, value: string) { setSettings(s => ({ ...s, categories: s.categories.map((c, i) => i === idx ? value : c) })) }
  function removeCategory(idx: number) { setSettings(s => ({ ...s, categories: s.categories.filter((_, i) => i !== idx) })) }
  function addCategory() { setSettings(s => ({ ...s, categories: [...s.categories, ''] })) }

  // ----- notes -----
  function setNote(idx: number, value: string) { setSettings(s => ({ ...s, notes: s.notes.map((n, i) => i === idx ? value : n) })) }
  function removeNote(idx: number) { setSettings(s => ({ ...s, notes: s.notes.filter((_, i) => i !== idx) })) }
  function addNote() { setSettings(s => ({ ...s, notes: [...s.notes, ''] })) }

  // ----- columns -----
  function setColumns(cols: FormColumn[]) { setSettings(s => ({ ...s, columns: cols })) }
  function patchColumn(idx: number, patch: Partial<FormColumn>) {
    setColumns(settings.columns.map((c, i) => i === idx ? { ...c, ...patch } : c))
  }
  function changeType(idx: number, type: ColumnType) {
    const col = settings.columns[idx]
    if (type === 'calc') {
      const others = settings.columns.filter((c, i) => i !== idx && (c.type === 'number' || c.type === 'calc'))
      const legacyOps = col.calc ? calcOperands(col.calc) : []
      const operands = legacyOps.length >= 2 ? legacyOps : [others[0]?.key, others[1]?.key].filter((x): x is string => !!x)
      patchColumn(idx, { type, calc: col.calc ?? { op: 'multiply', operands } })
    } else {
      patchColumn(idx, { type, calc: undefined })
    }
  }
  function patchCalc(idx: number, patch: Partial<CalcDef>) {
    const col = settings.columns[idx]
    const calc: CalcDef = { op: 'multiply', a: '', ...col.calc, ...patch }
    patchColumn(idx, { calc })
  }
  // Switch the calc operator, initializing operands sensibly:
  // - to percent: collapse to a single operand (from existing operands/a, or the first other column)
  // - to multiply/add/subtract: reuse existing operands (>=2) if present, else the first two other columns
  function changeOp(idx: number, op: CalcDef['op']) {
    const col = settings.columns[idx]
    const others = settings.columns.filter((c, i) => i !== idx && (c.type === 'number' || c.type === 'calc'))
    if (op === 'percent') {
      const existing = col.calc ? calcOperands(col.calc) : []
      const a = existing[0] ?? others[0]?.key ?? ''
      patchColumn(idx, { calc: { op, a, percent: col.calc?.percent ?? 0 } })
    } else {
      const legacyOps = col.calc ? calcOperands(col.calc) : []
      const operands = legacyOps.length >= 2 ? legacyOps : [others[0]?.key, others[1]?.key].filter((x): x is string => !!x)
      patchColumn(idx, { calc: { op, operands } })
    }
  }
  function setOperand(idx: number, opIdx: number, value: string) {
    const col = settings.columns[idx]
    const ops = col.calc ? [...calcOperands(col.calc)] : []
    ops[opIdx] = value
    patchColumn(idx, { calc: { ...(col.calc as CalcDef), operands: ops } })
  }
  function addOperand(idx: number) {
    const col = settings.columns[idx]
    const others = settings.columns.filter((c, i) => i !== idx && (c.type === 'number' || c.type === 'calc'))
    const ops = col.calc ? [...calcOperands(col.calc)] : []
    const unused = others.find(o => !ops.includes(o.key))?.key ?? others[0]?.key ?? ''
    ops.push(unused)
    patchColumn(idx, { calc: { ...(col.calc as CalcDef), operands: ops } })
  }
  function removeOperand(idx: number, opIdx: number) {
    const col = settings.columns[idx]
    const ops = col.calc ? [...calcOperands(col.calc)] : []
    if (ops.length <= 2) return
    ops.splice(opIdx, 1)
    patchColumn(idx, { calc: { ...(col.calc as CalcDef), operands: ops } })
  }
  function insertColumnAt(pos: number) {
    const cols = [...settings.columns]
    // If 12 columns are already visible, add the new one hidden so we never exceed 12 visible.
    const atMaxVisible = cols.filter(c => !c.hidden).length >= MAX_VISIBLE
    cols.splice(pos, 0, { key: newColumnKey(cols), label: 'คอลัมน์ใหม่', type: 'text', hidden: atMaxVisible || undefined })
    setColumns(cols)
  }
  function toggleVisible(idx: number) {
    const col = settings.columns[idx]
    if (col.hidden) {
      // Making it visible — enforce the max.
      if (settings.columns.filter(c => !c.hidden).length >= MAX_VISIBLE) {
        alert('แสดงได้ไม่เกิน 12 คอลัมน์')
        return
      }
      patchColumn(idx, { hidden: false })
    } else {
      patchColumn(idx, { hidden: true })
    }
  }
  function removeColumn(idx: number) { setColumns(settings.columns.filter((_, i) => i !== idx)) }
  function moveColumn(idx: number, dir: -1 | 1) {
    const j = idx + dir
    if (j < 0 || j >= settings.columns.length) return
    const cols = [...settings.columns]
    ;[cols[idx], cols[j]] = [cols[j], cols[idx]]
    setColumns(cols)
  }

  async function save() {
    setSaving(true)
    try {
      await updateFormSettings({ ...settings, formType })
      alert('บันทึกฟอร์มแล้ว')
    } catch {
      alert('บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setSaving(false)
    }
  }

  async function onLogoPick(company: Company, file: File | undefined) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = String(reader.result)
      if (dataUrl.length > 400000) { alert('ไฟล์ใหญ่เกินไป แนะนำโลโก้เล็กกว่า ~300KB'); return }
      try { await updateCompanyLogo(company.id, dataUrl); loadCompanies() }
      catch { alert('อัปโหลดโลโก้ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
    }
    reader.readAsDataURL(file)
  }
  async function removeLogo(company: Company) {
    try { await updateCompanyLogo(company.id, null); loadCompanies() }
    catch { alert('ลบโลโก้ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  const columns = settings.columns
  const visibleCount = columns.filter(c => !c.hidden).length
  const previewCompany = companies[0] ?? null
  const previewHeader: ExpenseHeader = {
    subject: settings.subject, categories: settings.categories.slice(0, 1),
    companyId: previewCompany?.id ?? '', firstName: 'สมชาย', lastName: 'ใจดี', position: 'พนักงาน', job: 'ตัวอย่าง',
  }
  const previewItems: ExpenseRow[] = [sampleRow(columns), sampleRow(columns)]

  return (
    <div className="space-y-4">
      <div className="mb-2 flex items-center gap-3.5">
        <button onClick={() => nav('/')} className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#e5eaf3] px-3 py-2 text-sm hover:border-[#2b5bd7] hover:text-[#2b5bd7]"><ArrowLeft size={16} /> กลับ</button>
        <div className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-[#eaf0ff] text-xl text-[#2b5bd7]"><Pencil size={20} /></div>
        <div>
          <h1 className="text-xl font-semibold text-[#1f2a3d]">แก้ไขฟอร์ม — {settings.name || settings.title}</h1>
          <div className="text-[13px] text-[#7a869a]">แก้ไขหัวฟอร์ม คอลัมน์ตาราง หมวดค่าใช้จ่าย หมายเหตุ และโลโก้บริษัท</div>
        </div>
        <button
          className="ml-auto inline-flex items-center gap-2 rounded-[11px] border border-[#e5eaf3] px-4 py-3 text-sm font-medium hover:border-[#2b5bd7] hover:text-[#2b5bd7]"
          onClick={() => setShowPreview(p => !p)}
        >
          {showPreview ? <><Pencil size={16} /> กลับไปแก้ไข</> : <><Eye size={16} /> ดูตัวอย่าง</>}
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-[11px] bg-[#2b5bd7] px-5 py-3 text-sm font-medium text-white shadow-[0_6px_16px_rgba(43,91,215,0.28)] hover:bg-[#1e46b0] disabled:opacity-60"
          onClick={save}
          disabled={saving}
        >
          <Save size={16} /> บันทึกฟอร์ม
        </button>
      </div>

      {showPreview && (
        <div className="overflow-x-auto rounded-2xl border border-[#e5eaf3] bg-[#f4f6fb] p-4">
          <ExpenseClaimPreview company={previewCompany} header={previewHeader} items={previewItems} docNumber={settings.formCode || 'GAC6709-003'} settings={settings} />
        </div>
      )}

      {!showPreview && (
      <div className="space-y-4">

      {/* ข้อความหัวฟอร์ม */}
      <div className={cardClass}>
        <h2 className={`${cardTitleClass} mb-4`}>ข้อความหัวฟอร์ม</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs text-[#7a869a]">ชื่อฟอร์ม (หัวกล่องขวาบน)</label>
            <input className={inputClass} value={settings.title} onChange={e => setField('title', e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-[#7a869a]">รหัสฟอร์ม</label>
            <input className={inputClass} value={settings.formCode} onChange={e => setField('formCode', e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-[#7a869a]">เรื่อง</label>
            <input className={inputClass} value={settings.subject} onChange={e => setField('subject', e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-[#7a869a]">เรียน</label>
            <input className={inputClass} value={settings.attention} onChange={e => setField('attention', e.target.value)} />
          </div>
        </div>
      </div>

      {/* คอลัมน์ตาราง (Column builder) */}
      <div className={cardClass}>
        <div className="mb-1 flex items-center justify-between gap-2">
          <h2 className={cardTitleClass}>คอลัมน์ตาราง</h2>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${visibleCount >= MAX_VISIBLE ? 'bg-[#fdecec] text-[#d64545]' : 'bg-[#eaf0ff] text-[#1e46b0]'}`}>
            แสดงอยู่ {visibleCount} / {MAX_VISIBLE}
          </span>
        </div>
        <p className="mb-4 text-xs text-[#7a869a]">กำหนดคอลัมน์ในตารางรายการเบิก · คอลัมน์แบบ “คำนวณ” จะคิดค่าให้อัตโนมัติจากคอลัมน์อื่น · ติ๊ก “แสดง” เพื่อเลือกคอลัมน์ที่จะแสดงในเอกสาร (สูงสุด {MAX_VISIBLE})</p>

        {/* Representative header preview */}
        <div className="mb-4 overflow-x-auto rounded-[10px] border border-[#eef2f8]">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="bg-[#f7f9fd]">
                <th className="px-2 py-1.5 text-[#7a869a]">#</th>
                {columns.map(c => (
                  <th key={c.key} className="px-2 py-1.5 font-semibold text-[#16233f]">
                    {c.label || <span className="text-[#c3ccdb]">(ไม่มีชื่อ)</span>}
                    {c.type === 'calc' && <span className="ml-1 font-normal text-[#7a869a]">ƒ</span>}
                  </th>
                ))}
              </tr>
            </thead>
          </table>
        </div>

        <div className="space-y-3">
          <button onClick={() => insertColumnAt(0)} className="inline-flex items-center gap-1 text-xs font-medium text-[#2b5bd7] hover:underline"><Plus size={14} /> แทรกคอลัมน์ที่ตำแหน่งแรก</button>
          {columns.map((col, i) => {
            const others = columns.filter((c, x) => x !== i && (c.type === 'number' || c.type === 'calc'))
            const isPercent = col.calc?.op === 'percent'
            const operands = col.calc ? calcOperands(col.calc) : []
            return (
              <div key={i}>
                <div className="rounded-[12px] border border-[#eef2f8] p-3">
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center self-end rounded-[9px] bg-[#eaf0ff] text-sm font-semibold text-[#2b5bd7]">{i + 1}</div>
                    <div className="min-w-[180px] flex-1">
                      <label className="mb-1 block text-[11px] text-[#7a869a]">ชื่อคอลัมน์</label>
                      <input className={inputClass} value={col.label} onChange={e => patchColumn(i, { label: e.target.value })} />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-[#7a869a]">ชนิด</label>
                      <select className={smallSelect} value={col.type} onChange={e => changeType(i, e.target.value as ColumnType)}>
                        <option value="text">Text (ข้อความ)</option>
                        <option value="number">Number (ตัวเลข)</option>
                        <option value="date">วันที่ (Date)</option>
                        <option value="calc">คำนวณ</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-[#7a869a]">กว้าง (px)</label>
                      <input
                        type="number"
                        placeholder="อัตโนมัติ"
                        value={col.width ?? ''}
                        onChange={e => patchColumn(i, { width: e.target.value ? Number(e.target.value) : undefined })}
                        className={smallSelect + ' w-24'}
                      />
                    </div>
                    <label className="ml-auto flex cursor-pointer select-none items-center gap-1.5 pb-2 text-[12px] text-[#16233f]">
                      <input type="checkbox" checked={!col.hidden} onChange={() => toggleVisible(i)} />
                      แสดง
                    </label>
                    <div className="flex items-center gap-1.5 pb-1">
                      <button className={iconBtn} onClick={() => moveColumn(i, -1)} disabled={i === 0} title="เลื่อนขึ้น"><ChevronUp size={16} /></button>
                      <button className={iconBtn} onClick={() => moveColumn(i, 1)} disabled={i === columns.length - 1} title="เลื่อนลง"><ChevronDown size={16} /></button>
                      <button className={`${iconBtn} text-[#d64545] hover:border-[#d64545]`} onClick={() => removeColumn(i)} title="ลบคอลัมน์"><Trash2 size={16} /></button>
                    </div>
                  </div>

                  {col.type === 'calc' && (
                    <div className="mt-3 flex flex-wrap items-end gap-2 rounded-[10px] bg-[#f7f9fd] p-3">
                      <div>
                        <label className="mb-1 block text-[11px] text-[#7a869a]">สูตร</label>
                        <select className={smallSelect} value={col.calc?.op ?? 'multiply'} onChange={e => changeOp(i, e.target.value as CalcDef['op'])}>
                          {(Object.keys(OP_LABELS) as CalcDef['op'][]).map(op => <option key={op} value={op}>{OP_LABELS[op]}</option>)}
                        </select>
                      </div>
                      {isPercent ? (
                        <>
                          <div>
                            <label className="mb-1 block text-[11px] text-[#7a869a]">ค่า A</label>
                            <select className={smallSelect} value={operands[0] ?? ''} onChange={e => patchCalc(i, { a: e.target.value })}>
                              <option value="">— เลือก —</option>
                              {others.map(o => <option key={o.key} value={o.key}>{o.label || o.key}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] text-[#7a869a]">ร้อยละ (%)</label>
                            <input type="number" className={`${smallSelect} w-24 text-right`} value={col.calc?.percent ?? 0} onChange={e => patchCalc(i, { percent: Number(e.target.value) })} />
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-wrap items-end gap-1.5">
                          {operands.map((opKey, opIdx) => (
                            <div key={opIdx} className="flex items-end gap-1.5">
                              {opIdx > 0 && <span className="pb-2.5 text-sm text-[#7a869a]">{OP_SYMBOL[col.calc?.op ?? 'multiply']}</span>}
                              <div>
                                <label className="mb-1 block text-[11px] text-[#7a869a]">ค่า {opIdx + 1}</label>
                                <div className="flex items-center gap-1">
                                  <select className={smallSelect} value={opKey} onChange={e => setOperand(i, opIdx, e.target.value)}>
                                    <option value="">— เลือก —</option>
                                    {others.map(o => <option key={o.key} value={o.key}>{o.label || o.key}</option>)}
                                  </select>
                                  <button
                                    type="button"
                                    className={`${iconBtn} px-1.5 py-1`}
                                    onClick={() => removeOperand(i, opIdx)}
                                    disabled={operands.length <= 2}
                                    title="ลบค่านี้"
                                  ><X size={14} /></button>
                                </div>
                              </div>
                            </div>
                          ))}
                          <button
                            type="button"
                            className="mb-[3px] inline-flex items-center gap-1 rounded-[8px] border-[1.5px] border-dashed border-[#b9c4da] bg-white px-2.5 py-1.5 text-xs font-medium text-[#2b5bd7]"
                            onClick={() => addOperand(i)}
                          >
                            <Plus size={14} /> เพิ่มค่า
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button onClick={() => insertColumnAt(i + 1)} className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-[#2b5bd7] hover:underline"><Plus size={14} /> แทรกคอลัมน์ถัดจากนี้</button>
              </div>
            )
          })}
        </div>

        <button
          className="mt-3 inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-[#b9c4da] bg-white px-4 py-2.5 text-sm font-medium text-[#2b5bd7]"
          onClick={() => insertColumnAt(columns.length)}
        >
          <Plus size={16} /> เพิ่มคอลัมน์
        </button>
      </div>

      {/* หมวดค่าใช้จ่าย */}
      <div className={cardClass}>
        <h2 className={`${cardTitleClass} mb-4`}>หมวดค่าใช้จ่าย (ช่องติ๊ก)</h2>
        <div className="space-y-2.5">
          {settings.categories.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className={inputClass} value={c} onChange={e => setCategory(i, e.target.value)} />
              <button onClick={() => removeCategory(i)} className="shrink-0 rounded-[10px] border border-[#e5eaf3] px-3 py-2.5 text-sm text-[#d64545] hover:border-[#d64545]">ลบ</button>
            </div>
          ))}
        </div>
        <button className="mt-3 inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-[#b9c4da] bg-white px-4 py-2.5 text-sm font-medium text-[#2b5bd7]" onClick={addCategory}><Plus size={14} /> เพิ่มหมวด</button>
      </div>

      {/* หมายเหตุท้ายฟอร์ม */}
      <div className={cardClass}>
        <h2 className={`${cardTitleClass} mb-4`}>หมายเหตุท้ายฟอร์ม</h2>
        <div className="space-y-2.5">
          {settings.notes.map((n, i) => (
            <div key={i} className="flex items-start gap-2">
              <textarea className={`${inputClass} min-h-[52px] resize-y`} value={n} onChange={e => setNote(i, e.target.value)} />
              <button onClick={() => removeNote(i)} className="shrink-0 rounded-[10px] border border-[#e5eaf3] px-3 py-2.5 text-sm text-[#d64545] hover:border-[#d64545]">ลบ</button>
            </div>
          ))}
        </div>
        <button className="mt-3 inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-[#b9c4da] bg-white px-4 py-2.5 text-sm font-medium text-[#2b5bd7]" onClick={addNote}><Plus size={14} /> เพิ่มหมายเหตุ</button>
      </div>

      <button
        className="inline-flex items-center gap-2 rounded-[11px] bg-[#2b5bd7] px-5 py-3 text-sm font-medium text-white shadow-[0_6px_16px_rgba(43,91,215,0.28)] hover:bg-[#1e46b0] disabled:opacity-60"
        onClick={save}
        disabled={saving}
      >
        <Save size={16} /> บันทึกฟอร์ม
      </button>

      {/* โลโก้บริษัท */}
      <div className={cardClass}>
        <h2 className={`${cardTitleClass} mb-4`}>โลโก้บริษัท</h2>
        <div className="space-y-4">
          {companies.map(company => (
            <div key={company.id} className="flex flex-wrap items-center gap-4 rounded-[12px] border border-[#eef2f8] p-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-[#e5eaf3] bg-[#fbfcfe]">
                {company.logo
                  ? <img src={company.logo} alt={company.name} className="h-full w-full object-contain" />
                  : <span className="px-1 text-center text-[10px] leading-tight text-[#7a869a]">ยังไม่มีโลโก้</span>}
              </div>
              <div className="min-w-[140px] flex-1">
                <div className="text-sm font-semibold text-[#16233f]">{company.name}</div>
                <div className="text-xs text-[#7a869a]">{company.id}</div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  className="text-xs text-[#7a869a] file:mr-2 file:rounded-[8px] file:border-0 file:bg-[#eaf0ff] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#1e46b0]"
                  onChange={e => onLogoPick(company, e.target.files?.[0])}
                />
                {company.logo && (
                  <button onClick={() => removeLogo(company)} className="rounded-[10px] border border-[#e5eaf3] px-3 py-2 text-sm text-[#d64545] hover:border-[#d64545]">ลบโลโก้</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
      )}
    </div>
  )
}
