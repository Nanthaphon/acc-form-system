import { uiAlert } from '../../components/dialog/dialogService'
import { dbErrorMessage } from '../../shared/dbError'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, ChevronUp, Eye, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import type { Company, FormSettings, FormColumn, ColumnType, CalcDef, ExpenseHeader, ExpenseRow, AccessGroup, SignatureBlock, HeaderField } from '../../types/schema'
import { EXPENSE_CLAIM_DEFAULTS, calcOperands, formSignatureBlocks, formAccessGroups, MAX_SIGNATURE_BLOCKS } from '../../types/schema'
import ExpenseClaimPreview from '../../features/expense-claim/ExpenseClaimPreview'
import MultiSelect from '../../components/MultiSelect'
import { ui, PageHeader, Badge } from '../../components/ui'
import { getFormSettings, updateFormSettings } from '../../data/formSettings'
import { listCompanies, updateCompanyLogo } from '../../data/companies'
import TemplateTextarea from '../../components/TemplateTextarea'
import { listAccessGroups } from '../../data/accessGroups'

// Page-local extras on top of the shared `ui` tokens.
// Neutral square icon button (same look as ActionIconButton) — a plain <button> so it can be disabled.
const iconBtn = 'inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/80 transition hover:bg-gray-50 disabled:opacity-40'
// Compact dashed "add" button for nested panels (calc operands, dropdown options).
const btnDashedSm = 'inline-flex items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600'
// Outlined text button for removing a row.
const btnRemove = 'shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-red-600 hover:border-red-200 hover:bg-red-50'
// Inline text link ("insert column here").
const linkBtn = 'inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline'
// Nested panel inside a card (one column's settings, one company's logo).
const subCard = 'rounded-xl border border-gray-200 bg-white p-4'
const subPanel = 'rounded-lg bg-gray-50 p-3'

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
    else if (c.type === 'select') r[c.key] = c.options?.find(o => o.trim()) ?? 'ตัวอย่าง'
  }
  return r
}

export default function FormSettingsPage() {
  const nav = useNavigate()
  const { formType = 'expense-claim' } = useParams()
  const [settings, setSettings] = useState<FormSettings>(EXPENSE_CLAIM_DEFAULTS)
  const [companies, setCompanies] = useState<Company[]>([])
  const [groups, setGroups] = useState<AccessGroup[]>([])
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  function loadCompanies() { listCompanies(true).then(setCompanies) } // logos are edited here
  useEffect(() => {
    getFormSettings(formType).then(setSettings)
    loadCompanies()
    listAccessGroups().then(setGroups)
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

  // ----- custom header fields -----
  const headerFields = (): HeaderField[] => settings.headerFields ?? []
  function setHeaderFields(fs: HeaderField[]) { setSettings(s => ({ ...s, headerFields: fs })) }
  function addHeaderField() { setHeaderFields([...headerFields(), { id: crypto.randomUUID(), label: 'ช่องใหม่', type: 'text' }]) }
  function setHFieldLabel(idx: number, label: string) { setHeaderFields(headerFields().map((f, i) => i === idx ? { ...f, label } : f)) }
  function setHFieldType(idx: number, type: HeaderField['type']) { setHeaderFields(headerFields().map((f, i) => i === idx ? { ...f, type } : f)) }
  function removeHeaderField(idx: number) { setHeaderFields(headerFields().filter((_, i) => i !== idx)) }
  function moveHeaderField(idx: number, dir: -1 | 1) {
    const a = [...headerFields()]; const j = idx + dir
    if (j < 0 || j >= a.length) return
    ;[a[idx], a[j]] = [a[j], a[idx]]; setHeaderFields(a)
  }

  // ----- access groups (a form may be shown to several) -----
  const selectedGroups = formAccessGroups(settings)
  const setAccessGroups = (next: string[]) => setSettings(s => ({ ...s, accessGroups: next, accessGroup: null }))

  // ----- signature blocks -----
  const sigBlocks =(): SignatureBlock[] => formSignatureBlocks(settings)
  function setSigBlocks(blocks: SignatureBlock[]) { setSettings(s => ({ ...s, signatureBlocks: blocks })) }
  function addSigBlock() {
    const b = sigBlocks()
    if (b.length >= MAX_SIGNATURE_BLOCKS) { uiAlert(`ช่องลายเซ็นได้ไม่เกิน ${MAX_SIGNATURE_BLOCKS} ช่อง`); return }
    setSigBlocks([...b, { id: crypto.randomUUID(), label: 'ตำแหน่งใหม่' }])
  }
  function setSigLabel(idx: number, label: string) { setSigBlocks(sigBlocks().map((b, i) => i === idx ? { ...b, label } : b)) }
  function removeSigBlock(idx: number) { setSigBlocks(sigBlocks().filter((_, i) => i !== idx)) }
  function moveSigBlock(idx: number, dir: -1 | 1) {
    const b = [...sigBlocks()]; const j = idx + dir
    if (j < 0 || j >= b.length) return
    ;[b[idx], b[j]] = [b[j], b[idx]]; setSigBlocks(b)
  }

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
    } else if (type === 'select') {
      patchColumn(idx, { type, calc: undefined, options: col.options?.length ? col.options : [''] })
    } else {
      patchColumn(idx, { type, calc: undefined })
    }
  }

  // ----- select options -----
  function setOption(idx: number, optIdx: number, value: string) {
    const opts = [...(settings.columns[idx].options ?? [])]; opts[optIdx] = value
    patchColumn(idx, { options: opts })
  }
  function addOption(idx: number) { patchColumn(idx, { options: [...(settings.columns[idx].options ?? []), ''] }) }
  function removeOption(idx: number, optIdx: number) {
    patchColumn(idx, { options: (settings.columns[idx].options ?? []).filter((_, i) => i !== optIdx) })
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
        uiAlert('แสดงได้ไม่เกิน 12 คอลัมน์')
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
      await updateFormSettings({
        ...settings, formType,
        // Always write the multi-group list and clear the legacy single field,
        // otherwise un-ticking every group would fall back to the old value.
        accessGroups: selectedGroups, accessGroup: null,
        // Drop the retired per-block `online` flag from saved configs.
        signatureBlocks: settings.signatureBlocks?.map(({ id, label }) => ({ id, label })),
      })
      uiAlert('บันทึกฟอร์มแล้ว', { tone: 'success' })
    } catch (e) {
      uiAlert(dbErrorMessage(e), { title: 'บันทึกไม่สำเร็จ' })
    } finally {
      setSaving(false)
    }
  }

  async function onLogoPick(company: Company, file: File | undefined) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = String(reader.result)
      if (dataUrl.length > 400000) { uiAlert('ไฟล์ใหญ่เกินไป แนะนำโลโก้เล็กกว่า ~300KB'); return }
      try { await updateCompanyLogo(company.id, dataUrl); loadCompanies() }
      catch { uiAlert('อัปโหลดโลโก้ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
    }
    reader.readAsDataURL(file)
  }
  async function removeLogo(company: Company) {
    try { await updateCompanyLogo(company.id, null); loadCompanies() }
    catch { uiAlert('ลบโลโก้ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
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
      <PageHeader
        icon={<Pencil size={20} />}
        title={`แก้ไขฟอร์ม — ${settings.name || settings.title}`}
        onBack={() => nav(settings.groupId ? `/group/${settings.groupId}` : '/')}
        actions={<>
          <button className={ui.btnSecondary} onClick={() => setShowPreview(p => !p)}>
            {showPreview ? <><Pencil size={16} /> กลับไปแก้ไข</> : <><Eye size={16} /> ดูตัวอย่าง</>}
          </button>
          <button className={ui.btnPrimary} onClick={save} disabled={saving}>
            <Save size={16} /> บันทึกฟอร์ม
          </button>
        </>}
      />

      {showPreview && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 p-4">
          <ExpenseClaimPreview company={previewCompany} header={previewHeader} items={previewItems} docNumber={settings.formCode || 'GAC6709-003'} settings={settings} />
        </div>
      )}

      {!showPreview && (
      <div className="space-y-4">

      {/* กลุ่มที่มองเห็นฟอร์ม (Access group) — เลือกได้หลายกลุ่ม ค้นหาได้ */}
      <div className={ui.card}>
        <h2 className={`${ui.cardTitle} mb-1`}>กลุ่มที่มองเห็นฟอร์มนี้</h2>
        <p className={`${ui.hint} mb-3`}>เลือกได้หลายกลุ่ม · ไม่เลือกเลย = ทุกคนเห็น</p>
        {groups.length === 0 ? (
          <p className="text-sm text-gray-400">ยังไม่มีกลุ่ม — สร้างได้ที่เมนู “จัดการกลุ่ม”</p>
        ) : (
          <div className="sm:max-w-lg">
            <MultiSelect
              options={groups.map(g => ({ value: g.id, label: g.name }))}
              value={selectedGroups}
              onChange={setAccessGroups}
              placeholder="ทุกคนเห็น (ไม่จำกัดกลุ่ม)"
              searchPlaceholder="ค้นหากลุ่ม…"
              emptyText="ไม่พบกลุ่มที่ค้นหา"
            />
          </div>
        )}
      </div>

      {/* ข้อความหัวฟอร์ม */}
      <div className={ui.card}>
        <h2 className={`${ui.cardTitle} mb-4`}>ข้อความหัวฟอร์ม</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={ui.label}>ชื่อฟอร์ม (หัวกล่องขวาบน)</label>
            <input className={ui.input} value={settings.title} onChange={e => setField('title', e.target.value)} />
          </div>
          <div>
            <label className={ui.label}>รหัสฟอร์ม</label>
            <input className={ui.input} value={settings.formCode} onChange={e => setField('formCode', e.target.value)} />
          </div>
          <div>
            <label className={ui.label}>เรื่อง</label>
            <input className={ui.input} value={settings.subject} onChange={e => setField('subject', e.target.value)} />
          </div>
          <div>
            <label className={ui.label}>เรียน</label>
            <input className={ui.input} value={settings.attention} onChange={e => setField('attention', e.target.value)} />
          </div>
        </div>
      </div>

      {/* ช่องหัวฟอร์ม (เพิ่มเติม) */}
      <div className={ui.card}>
        <h2 className={ui.cardTitle}>ช่องหัวฟอร์ม (เพิ่มเติม)</h2>
        <p className={`${ui.hint} mb-3`}>ช่องข้อมูลใต้ชื่อผู้เบิก นอกเหนือจาก ชื่อ/นามสกุล/ตำแหน่ง/Job เช่น “วันที่ต้องการใช้เงิน”, “วัตถุประสงค์”</p>
        <div className="space-y-2">
          {headerFields().map((f, i) => (
            <div key={f.id} className="flex flex-wrap items-center gap-2">
              <input className={`${ui.input} min-w-[160px] flex-1`} value={f.label} placeholder="ชื่อช่อง" onChange={e => setHFieldLabel(i, e.target.value)} />
              <select className={ui.inputSm} value={f.type} onChange={e => setHFieldType(i, e.target.value as HeaderField['type'])}>
                <option value="text">ข้อความ</option>
                <option value="date">วันที่</option>
              </select>
              <div className="flex items-center gap-1.5">
                <button className={iconBtn} onClick={() => moveHeaderField(i, -1)} disabled={i === 0} title="เลื่อนขึ้น"><ChevronUp size={16} /></button>
                <button className={iconBtn} onClick={() => moveHeaderField(i, 1)} disabled={i === headerFields().length - 1} title="เลื่อนลง"><ChevronDown size={16} /></button>
                <button className={iconBtn} onClick={() => removeHeaderField(i)} title="ลบช่อง"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
        <button className={`${ui.btnDashed} mt-3`} onClick={addHeaderField}><Plus size={14} /> เพิ่มช่องหัวฟอร์ม</button>
      </div>

      {/* คอลัมน์ตาราง (Column builder) */}
      <div className={ui.card}>
        <div className="mb-1 flex items-center justify-between gap-2">
          <h2 className={ui.cardTitle}>คอลัมน์ตาราง</h2>
          <Badge tone={visibleCount >= MAX_VISIBLE ? 'red' : 'gray'}>
            แสดงอยู่ {visibleCount} / {MAX_VISIBLE}
          </Badge>
        </div>
        <div className="mb-4" />

        {/* Representative header preview */}
        <div className="mb-4 overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className={ui.thead}>
                <th className="px-2 py-1.5 font-medium text-gray-500">#</th>
                {columns.map(c => (
                  <th key={c.key} className="whitespace-nowrap px-2 py-1.5 font-semibold text-gray-900">
                    {c.label || <span className="font-normal text-gray-400">(ไม่มีชื่อ)</span>}
                    {c.type === 'calc' && <span className="ml-1 font-normal text-gray-500">ƒ</span>}
                  </th>
                ))}
              </tr>
            </thead>
          </table>
        </div>

        <div className="space-y-3">
          <button onClick={() => insertColumnAt(0)} className={linkBtn}><Plus size={14} /> แทรกคอลัมน์ที่ตำแหน่งแรก</button>
          {columns.map((col, i) => {
            const others = columns.filter((c, x) => x !== i && (c.type === 'number' || c.type === 'calc'))
            const isPercent = col.calc?.op === 'percent'
            const operands = col.calc ? calcOperands(col.calc) : []
            return (
              <div key={i}>
                <div className={subCard}>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center self-end rounded-lg bg-blue-50 text-sm font-semibold text-blue-600">{i + 1}</div>
                    <div className="min-w-[180px] flex-1">
                      <label className={ui.label}>ชื่อคอลัมน์</label>
                      <input className={ui.input} value={col.label} onChange={e => patchColumn(i, { label: e.target.value })} />
                    </div>
                    <div>
                      <label className={ui.label}>ชนิด</label>
                      <select className={ui.inputSm} value={col.type} onChange={e => changeType(i, e.target.value as ColumnType)}>
                        <option value="text">Text (ข้อความ)</option>
                        <option value="number">Number (ตัวเลข)</option>
                        <option value="date">วันที่ (Date)</option>
                        <option value="select">Dropdown (ตัวเลือก)</option>
                        <option value="calc">คำนวณ</option>
                      </select>
                    </div>
                    <div>
                      <label className={ui.label}>กว้าง (px)</label>
                      <input
                        type="number"
                        placeholder="อัตโนมัติ"
                        value={col.width ?? ''}
                        onChange={e => patchColumn(i, { width: e.target.value ? Number(e.target.value) : undefined })}
                        className={ui.inputSm + ' w-24'}
                      />
                    </div>
                    <label className="ml-auto flex cursor-pointer select-none items-center gap-1.5 pb-2 text-sm text-gray-700">
                      <input type="checkbox" checked={!col.hidden} onChange={() => toggleVisible(i)} />
                      แสดง
                    </label>
                    <div className="flex items-center gap-1.5 pb-1">
                      <button className={iconBtn} onClick={() => moveColumn(i, -1)} disabled={i === 0} title="เลื่อนขึ้น"><ChevronUp size={16} /></button>
                      <button className={iconBtn} onClick={() => moveColumn(i, 1)} disabled={i === columns.length - 1} title="เลื่อนลง"><ChevronDown size={16} /></button>
                      <button className={iconBtn} onClick={() => removeColumn(i)} title="ลบคอลัมน์"><Trash2 size={16} /></button>
                    </div>
                  </div>

                  {col.type === 'calc' && (
                    <div className={`${subPanel} mt-3 flex flex-wrap items-end gap-2`}>
                      <div>
                        <label className={ui.label}>สูตร</label>
                        <select className={ui.inputSm} value={col.calc?.op ?? 'multiply'} onChange={e => changeOp(i, e.target.value as CalcDef['op'])}>
                          {(['multiply', 'subtract', 'add', 'divide'] as CalcDef['op'][]).map(op => <option key={op} value={op}>{OP_LABELS[op]}</option>)}
                          {/* ร้อยละ ถูกยกเลิก — คงไว้เฉพาะคอลัมน์เดิมที่ใช้อยู่ ให้ยังแก้ไขได้ */}
                          {col.calc?.op === 'percent' && <option value="percent">{OP_LABELS.percent}</option>}
                        </select>
                      </div>
                      {isPercent ? (
                        <>
                          <div>
                            <label className={ui.label}>ค่า A</label>
                            <select className={ui.inputSm} value={operands[0] ?? ''} onChange={e => patchCalc(i, { a: e.target.value })}>
                              <option value="">— เลือก —</option>
                              {others.map(o => <option key={o.key} value={o.key}>{o.label || o.key}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className={ui.label}>ร้อยละ (%)</label>
                            <input type="number" className={`${ui.inputSm} w-24 text-right`} value={col.calc?.percent ?? 0} onChange={e => patchCalc(i, { percent: Number(e.target.value) })} />
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-wrap items-end gap-1.5">
                          {operands.map((opKey, opIdx) => (
                            <div key={opIdx} className="flex items-end gap-1.5">
                              {opIdx > 0 && <span className="pb-2 text-sm text-gray-500">{OP_SYMBOL[col.calc?.op ?? 'multiply']}</span>}
                              <div>
                                <label className={ui.label}>ค่า {opIdx + 1}</label>
                                <div className="flex items-center gap-1">
                                  <select className={ui.inputSm} value={opKey} onChange={e => setOperand(i, opIdx, e.target.value)}>
                                    <option value="">— เลือก —</option>
                                    {others.map(o => <option key={o.key} value={o.key}>{o.label || o.key}</option>)}
                                  </select>
                                  <button
                                    type="button"
                                    className={iconBtn}
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
                            className={`${btnDashedSm} mb-0.5`}
                            onClick={() => addOperand(i)}
                          >
                            <Plus size={14} /> เพิ่มค่า
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {col.type === 'select' && (
                    <div className={`${subPanel} mt-3`}>
                      <label className={ui.label}>ตัวเลือกใน Dropdown (พนักงานเลือกตอนกรอก)</label>
                      <div className="space-y-2">
                        {(col.options ?? []).map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <span className="w-5 shrink-0 text-right text-xs text-gray-500">{optIdx + 1}.</span>
                            <input
                              className={`${ui.inputSm} flex-1`}
                              value={opt}
                              placeholder={`ตัวเลือกที่ ${optIdx + 1}`}
                              onChange={e => setOption(i, optIdx, e.target.value)}
                            />
                            <button type="button" className={iconBtn} onClick={() => removeOption(i, optIdx)} title="ลบตัวเลือก"><X size={14} /></button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        className={`${btnDashedSm} mt-2`}
                        onClick={() => addOption(i)}
                      >
                        <Plus size={14} /> เพิ่มตัวเลือก
                      </button>
                    </div>
                  )}
                </div>
                <button onClick={() => insertColumnAt(i + 1)} className={`${linkBtn} mt-1.5`}><Plus size={14} /> แทรกคอลัมน์ถัดจากนี้</button>
              </div>
            )
          })}
        </div>

        <button
          className={`${ui.btnDashed} mt-3`}
          onClick={() => insertColumnAt(columns.length)}
        >
          <Plus size={16} /> เพิ่มคอลัมน์
        </button>
      </div>

      {/* หมวดค่าใช้จ่าย */}
      <div className={ui.card}>
        <h2 className={`${ui.cardTitle} mb-4`}>หมวดค่าใช้จ่าย (ช่องติ๊ก)</h2>
        <div className="space-y-2.5">
          {settings.categories.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className={ui.input} value={c} onChange={e => setCategory(i, e.target.value)} />
              <button onClick={() => removeCategory(i)} className={btnRemove}>ลบ</button>
            </div>
          ))}
        </div>
        <button className={`${ui.btnDashed} mt-3`} onClick={addCategory}><Plus size={14} /> เพิ่มหมวด</button>
      </div>

      {/* ข้อความ / การแสดงผล */}
      <div className={ui.card}>
        <h2 className={`${ui.cardTitle} mb-1`}>ข้อความ / การแสดงผล</h2>
        <p className={`${ui.hint} mb-3`}>
          ย่อหน้าข้อความและตัวเลือกการแสดงผลของเอกสาร · เว้นว่างไว้ถ้าไม่ใช้ · ใส่ <code className="rounded bg-gray-100 px-1 text-gray-700">{'{{ชื่อช่อง}}'}</code> ตรงที่ต้องการให้ผู้กรอกใส่ข้อมูลในระบบ
          (ถ้าไม่กรอก จะพิมพ์ออกเป็น ........ ให้เขียนด้วยมือ)
        </p>

        <label className={ui.label}>ข้อความหัวฟอร์ม (เหนือตาราง)</label>
        <TemplateTextarea
          value={settings.introText ?? ''}
          placeholder="เช่น บริษัท … ได้รับเงินจาก {{ได้รับเงินจาก}} ครบถ้วนตามจำนวนเงิน {{จำนวนเงิน:ตัวเลข}} บาท"
          onChange={v => setSettings(s => ({ ...s, introText: v }))}
        />

        <label className={`${ui.label} mt-4`}>ข้อความรับรอง / คำประกาศ (ใต้ตาราง เหนือลายเซ็น)</label>
        <TemplateTextarea
          value={settings.bodyText ?? ''}
          placeholder="เช่น ขอรับรองว่า … ตั้งแต่วันที่ {{ตั้งแต่วันที่:วันที่}} ถึงวันที่ {{ถึงวันที่:วันที่}}"
          onChange={v => setSettings(s => ({ ...s, bodyText: v }))}
        />

        <div className="mt-4 space-y-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={settings.showRequester !== false} onChange={e => setSettings(s => ({ ...s, showRequester: e.target.checked }))} />
            แสดงบรรทัด ชื่อ / นามสกุล / ตำแหน่ง / Job
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={settings.showAmountWords !== false} onChange={e => setSettings(s => ({ ...s, showAmountWords: e.target.checked }))} />
            แสดงกล่อง “เป็นจำนวนเงิน … บาทถ้วน”
          </label>
        </div>
      </div>

      {/* หมายเหตุท้ายฟอร์ม */}
      <div className={ui.card}>
        <h2 className={`${ui.cardTitle} mb-4`}>หมายเหตุท้ายฟอร์ม</h2>
        <div className="space-y-2.5">
          {settings.notes.map((n, i) => (
            <div key={i} className="flex items-start gap-2">
              <textarea className={`${ui.input} min-h-[52px] resize-y`} value={n} onChange={e => setNote(i, e.target.value)} />
              <button onClick={() => removeNote(i)} className={btnRemove}>ลบ</button>
            </div>
          ))}
        </div>
        <button className={`${ui.btnDashed} mt-3`} onClick={addNote}><Plus size={14} /> เพิ่มหมายเหตุ</button>
      </div>

      {/* ช่องลายเซ็น */}
      <div className={ui.card}>
        <div className="mb-1 flex items-center justify-between gap-2">
          <h2 className={ui.cardTitle}>ช่องลายเซ็น</h2>
          <Badge>{sigBlocks().length} / {MAX_SIGNATURE_BLOCKS}</Badge>
        </div>
        <p className={`${ui.hint} mb-3`}>ช่องลายเซ็นบนเอกสาร (สูงสุด {MAX_SIGNATURE_BLOCKS} ช่อง รวมผู้เบิก) · ช่องแรกคือผู้เบิก เซ็นอัตโนมัติ · ช่องอื่นเลือกคนเซ็นได้ตอนกด “ส่งให้เซ็น” ช่องที่ไม่เลือกจะเว้นเส้นให้เซ็นสด</p>
        <div className="space-y-2">
          {sigBlocks().map((b, i) => (
            <div key={b.id} className="flex flex-wrap items-center gap-2">
              <input className={`${ui.input} min-w-[160px] flex-1`} value={b.label} placeholder="ชื่อตำแหน่ง" onChange={e => setSigLabel(i, e.target.value)} />
              {i === 0 && <Badge tone="blue">ผู้เบิก · เซ็นอัตโนมัติ</Badge>}
              <div className="flex items-center gap-1.5">
                <button className={iconBtn} onClick={() => moveSigBlock(i, -1)} disabled={i === 0} title="เลื่อนขึ้น"><ChevronUp size={16} /></button>
                <button className={iconBtn} onClick={() => moveSigBlock(i, 1)} disabled={i === sigBlocks().length - 1} title="เลื่อนลง"><ChevronDown size={16} /></button>
                <button className={iconBtn} onClick={() => removeSigBlock(i)} title="ลบช่อง"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
        <button
          className={`${ui.btnDashed} mt-3`}
          onClick={addSigBlock}
          disabled={sigBlocks().length >= MAX_SIGNATURE_BLOCKS}
        >
          <Plus size={14} /> เพิ่มช่องลายเซ็น
        </button>
      </div>

      <button
        className={ui.btnPrimary}
        onClick={save}
        disabled={saving}
      >
        <Save size={16} /> บันทึกฟอร์ม
      </button>

      {/* โลโก้บริษัท */}
      <div className={ui.card}>
        <h2 className={`${ui.cardTitle} mb-4`}>โลโก้บริษัท</h2>
        <div className="space-y-4">
          {companies.map(company => (
            <div key={company.id} className={`${subCard} flex flex-wrap items-center gap-4`}>
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                {company.logo
                  ? <img src={company.logo} alt={company.name} className="h-full w-full object-contain" />
                  : <span className="px-1 text-center text-[10px] leading-tight text-gray-400">ยังไม่มีโลโก้</span>}
              </div>
              <div className="min-w-[140px] flex-1">
                <div className="text-sm font-semibold text-gray-900">{company.name}</div>
                <div className="text-xs text-gray-500">{company.id}</div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  className="text-xs text-gray-500 file:mr-2 file:cursor-pointer file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                  onChange={e => onLogoPick(company, e.target.files?.[0])}
                />
                {company.logo && (
                  <button onClick={() => removeLogo(company)} className={btnRemove}>ลบโลโก้</button>
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
