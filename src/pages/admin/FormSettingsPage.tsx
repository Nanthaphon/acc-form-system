import { uiAlert } from '../../components/dialog/dialogService'
import { dbErrorMessage } from '../../shared/dbError'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, ChevronUp, Eye, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import type { Company, FormSettings, FormColumn, ColumnType, CalcDef, ExpenseHeader, ExpenseRow, AccessGroup, SignatureBlock, HeaderField } from '../../types/schema'
import { EXPENSE_CLAIM_DEFAULTS, calcOperands, formSignatureBlocks, formAccessGroups, MAX_SIGNATURE_BLOCKS, DEFAULT_REQUESTER_TITLE, DEFAULT_ITEMS_TITLE, SEQ_COLUMN_WIDTH, seqColumnWidth } from '../../types/schema'
import ExpenseClaimPreview from '../../features/expense-claim/ExpenseClaimPreview'
import MultiSelect from '../../components/MultiSelect'
import { ui, PageHeader, Badge } from '../../components/ui'
import { getFormSettings, updateFormSettings } from '../../data/formSettings'
import { listCompanies, updateCompanyLogo } from '../../data/companies'
import TemplateTextarea from '../../components/TemplateTextarea'
import { listAccessGroups } from '../../data/accessGroups'

// Page-local extras on top of the shared `ui` tokens.
// Neutral square icon button (same look as ActionIconButton) — a plain <button> so it can be disabled.
const iconBtn = 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/80 transition hover:bg-gray-50 disabled:opacity-40'
// Compact dashed "add" button for nested panels (calc operands, dropdown options, chips).
const btnDashedSm = 'inline-flex items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600'
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

// A settings card that folds away. The summary line says what is inside, so the
// page reads as a short list of what this form has and only the part being
// edited needs to be open. Interactive controls belong in the body, never in
// the summary — a click there would toggle the card.
function Section({ title, summary, defaultOpen, children }: {
  title: string; summary?: string; defaultOpen?: boolean; children: ReactNode
}) {
  return (
    <details className={`${ui.card} group`} open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center gap-3">
        <ChevronDown size={18} className="shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
        <h2 className={`${ui.cardTitle} shrink-0`}>{title}</h2>
        {summary && <span className="min-w-0 flex-1 truncate text-right text-xs text-gray-400">{summary}</span>}
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className={ui.label}>{label}</label>
      {children}
    </div>
  )
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
      const skipped = await updateFormSettings({
        ...settings, formType,
        // Always write the multi-group list and clear the legacy single field,
        // otherwise un-ticking every group would fall back to the old value.
        accessGroups: selectedGroups, accessGroup: null,
        // Drop the retired per-block `online` flag from saved configs.
        signatureBlocks: settings.signatureBlocks?.map(({ id, label }) => ({ id, label })),
      })
      // Until the database is updated it can hold only one group per form.
      const firstGroupOnly = skipped.includes('accessGroups') && selectedGroups.length > 1
      uiAlert(
        firstGroupOnly ? 'ตอนนี้ฐานข้อมูลเก็บกลุ่มได้กลุ่มเดียว จึงบันทึกเฉพาะกลุ่มแรก — เมื่ออัปเดตฐานข้อมูลแล้วจะเลือกได้หลายกลุ่ม' : 'บันทึกฟอร์มแล้ว',
        { tone: 'success', title: firstGroupOnly ? 'บันทึกแล้ว' : undefined },
      )
      if (firstGroupOnly) setAccessGroups(selectedGroups.slice(0, 1))
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

  // One-line descriptions on the folded cards, so the page says what this form
  // already has without opening anything.
  const groupsSummary = selectedGroups.length === 0
    ? 'ทุกคน'
    : selectedGroups.map(id => groups.find(g => g.id === id)?.name ?? id).join(', ')
  const textSummary = [settings.introText?.trim() && 'เหนือตาราง', settings.bodyText?.trim() && 'ใต้ตาราง']
    .filter(Boolean).join(' · ') || 'ไม่มีข้อความ'

  return (
    <div className="space-y-3">
      {/* Stays on screen while scrolling a long form, so saving is always one click away. */}
      <div className="sticky top-0 z-20 -mt-2 bg-[#f4f6fb] pt-2">
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
      </div>

      {showPreview && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 p-4">
          <ExpenseClaimPreview company={previewCompany} header={previewHeader} items={previewItems} docNumber={settings.formCode || 'GAC6709-003'} settings={settings} />
        </div>
      )}

      {!showPreview && (
      <div className="space-y-3">

      <Section title="ข้อมูลทั่วไป" summary={`${settings.formCode || 'ไม่มีรหัสฟอร์ม'} · เห็นได้: ${groupsSummary}`} defaultOpen>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="ชื่อบนเอกสาร">
            <input className={ui.input} value={settings.title} onChange={e => setField('title', e.target.value)} />
          </Field>
          <Field label="รหัสฟอร์ม">
            <input className={ui.input} value={settings.formCode} onChange={e => setField('formCode', e.target.value)} />
          </Field>
          <Field label="เรื่อง">
            <input className={ui.input} value={settings.subject} onChange={e => setField('subject', e.target.value)} />
          </Field>
          <Field label="เรียน">
            <input className={ui.input} value={settings.attention} onChange={e => setField('attention', e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="กลุ่มที่เห็นฟอร์มนี้">
              {groups.length === 0 ? (
                <p className="py-2.5 text-sm text-gray-400">ทุกคน · ยังไม่มีกลุ่ม</p>
              ) : (
                <MultiSelect
                  options={groups.map(g => ({ value: g.id, label: g.name }))}
                  value={selectedGroups}
                  onChange={setAccessGroups}
                  placeholder="ทุกคน"
                  searchPlaceholder="ค้นหากลุ่ม…"
                  emptyText="ไม่พบกลุ่มที่ค้นหา"
                />
              )}
            </Field>
          </div>
        </div>
      </Section>

      <Section title="หน้ากรอกของพนักงาน" summary={`${settings.requesterTitle || DEFAULT_REQUESTER_TITLE} · ${settings.itemsTitle || DEFAULT_ITEMS_TITLE} · ช่องเพิ่มเติม ${headerFields().length}`}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="ชื่อหัวข้อส่วนบน">
            <input
              className={ui.input}
              placeholder={DEFAULT_REQUESTER_TITLE}
              value={settings.requesterTitle ?? ''}
              onChange={e => setField('requesterTitle', e.target.value)}
            />
          </Field>
          <Field label="ชื่อหัวข้อส่วนตาราง">
            <input
              className={ui.input}
              placeholder={DEFAULT_ITEMS_TITLE}
              value={settings.itemsTitle ?? ''}
              onChange={e => setField('itemsTitle', e.target.value)}
            />
          </Field>
        </div>
        <p className={`${ui.hint} mt-2`}>เห็นเฉพาะตอนกรอก ไม่ขึ้นบนเอกสารที่พิมพ์</p>

        <div className="mt-5 border-t border-gray-100 pt-4">
          <span className="text-xs font-medium text-gray-500">ช่องกรอกเพิ่มเติม (ใต้ชื่อผู้เบิก)</span>
          {headerFields().length > 0 && (
            <div className="mt-2 space-y-2">
              {headerFields().map((f, i) => (
                <div key={f.id} className="flex flex-wrap items-center gap-2">
                  <input className={`${ui.inputSm} min-w-[160px] flex-1`} value={f.label} placeholder="ชื่อช่อง" onChange={e => setHFieldLabel(i, e.target.value)} />
                  <select className={ui.inputSm} value={f.type} onChange={e => setHFieldType(i, e.target.value as HeaderField['type'])}>
                    <option value="text">ข้อความ</option>
                    <option value="date">วันที่</option>
                  </select>
                  <button className={iconBtn} onClick={() => moveHeaderField(i, -1)} disabled={i === 0} title="เลื่อนขึ้น"><ChevronUp size={16} /></button>
                  <button className={iconBtn} onClick={() => moveHeaderField(i, 1)} disabled={i === headerFields().length - 1} title="เลื่อนลง"><ChevronDown size={16} /></button>
                  <button className={iconBtn} onClick={() => removeHeaderField(i)} title="ลบช่อง"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          )}
          <button className={`${btnDashedSm} mt-2`} onClick={addHeaderField}><Plus size={14} /> เพิ่มช่อง</button>
        </div>
      </Section>

      <Section title="คอลัมน์ตาราง" summary={`${columns.length} คอลัมน์ · แสดง ${visibleCount}/${MAX_VISIBLE}`} defaultOpen>
        {/* What the table will look like — the quickest way to check the result. */}
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className={ui.thead}>
                <th className="px-2 py-1.5 font-medium text-gray-500" style={{ width: `${seqColumnWidth(settings)}px` }}>ลำดับ</th>
                {columns.filter(c => !c.hidden).map(c => (
                  <th key={c.key} className="whitespace-pre-line px-2 py-1.5 font-semibold text-gray-900">
                    {c.label || <span className="font-normal text-gray-400">(ไม่มีชื่อ)</span>}
                    {c.type === 'calc' && <span className="ml-1 font-normal text-gray-500">ƒ</span>}
                  </th>
                ))}
              </tr>
            </thead>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 p-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-200 text-xs font-semibold text-gray-600">#</span>
          <span className="text-sm text-gray-700">คอลัมน์ลำดับ</span>
          <label className="flex items-center gap-1 text-xs text-gray-500" title="กว้างเกินไปจะกินที่คอลัมน์อื่น แคบเกินไปคำว่า “ลำดับ” จะตกบรรทัด">
            กว้าง
            <input
              type="number"
              min={1}
              placeholder={String(SEQ_COLUMN_WIDTH)}
              value={settings.seqWidth ?? ''}
              onChange={e => setField('seqWidth', e.target.value ? Number(e.target.value) : undefined)}
              className={`${ui.inputSm} w-[88px]`}
            />
          </label>
          <span className={`${ui.hint} ml-auto`}>เป็นคอลัมน์ในตัว ลบไม่ได้</span>
        </div>

        <div className="mt-2 space-y-2">
          {columns.map((col, i) => {
            const others = columns.filter((c, x) => x !== i && (c.type === 'number' || c.type === 'calc'))
            const isPercent = col.calc?.op === 'percent'
            const operands = col.calc ? calcOperands(col.calc) : []
            return (
              <div key={i} className={`rounded-lg border border-gray-200 p-2 ${col.hidden ? 'bg-gray-50' : 'bg-white'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-xs font-semibold text-blue-600">{i + 1}</span>
                  <textarea
                    rows={1}
                    className={`${ui.inputSm} min-w-[150px] flex-1 resize-y`}
                    placeholder="ชื่อคอลัมน์"
                    title="กด Enter เพื่อขึ้นบรรทัดใหม่ในหัวตาราง"
                    value={col.label}
                    onChange={e => patchColumn(i, { label: e.target.value })}
                  />
                  <select className={ui.inputSm} title="ชนิดข้อมูล" value={col.type} onChange={e => changeType(i, e.target.value as ColumnType)}>
                    <option value="text">ข้อความ</option>
                    <option value="number">ตัวเลข</option>
                    <option value="date">วันที่</option>
                    <option value="select">ตัวเลือก</option>
                    <option value="calc">คำนวณ</option>
                  </select>
                  <label className="flex items-center gap-1 text-xs text-gray-500" title="ความกว้างบนเอกสาร · เว้นว่าง = อัตโนมัติ">
                    กว้าง
                    <input
                      type="number"
                      placeholder="อัตโนมัติ"
                      value={col.width ?? ''}
                      onChange={e => patchColumn(i, { width: e.target.value ? Number(e.target.value) : undefined })}
                      className={`${ui.inputSm} w-[88px]`}
                    />
                  </label>
                  <label className="flex cursor-pointer select-none items-center gap-1.5 text-sm text-gray-700" title="เอาออกจากเอกสารโดยไม่ต้องลบคอลัมน์">
                    <input type="checkbox" checked={!col.hidden} onChange={() => toggleVisible(i)} />
                    แสดง
                  </label>
                  <div className="ml-auto flex items-center gap-1">
                    <button className={iconBtn} onClick={() => moveColumn(i, -1)} disabled={i === 0} title="เลื่อนขึ้น"><ChevronUp size={16} /></button>
                    <button className={iconBtn} onClick={() => moveColumn(i, 1)} disabled={i === columns.length - 1} title="เลื่อนลง"><ChevronDown size={16} /></button>
                    <button className={iconBtn} onClick={() => insertColumnAt(i + 1)} title="แทรกคอลัมน์ถัดจากนี้"><Plus size={16} /></button>
                    <button className={iconBtn} onClick={() => removeColumn(i)} title="ลบคอลัมน์"><Trash2 size={16} /></button>
                  </div>
                </div>

                {col.type === 'calc' && (
                  <div className={`${subPanel} mt-2 flex flex-wrap items-center gap-2`}>
                    <span className="text-xs text-gray-500">คำนวณจาก</span>
                    <select className={ui.inputSm} value={col.calc?.op ?? 'multiply'} onChange={e => changeOp(i, e.target.value as CalcDef['op'])}>
                      {(['multiply', 'subtract', 'add', 'divide'] as CalcDef['op'][]).map(op => <option key={op} value={op}>{OP_LABELS[op]}</option>)}
                      {/* ร้อยละ ถูกยกเลิก — คงไว้เฉพาะคอลัมน์เดิมที่ใช้อยู่ ให้ยังแก้ไขได้ */}
                      {col.calc?.op === 'percent' && <option value="percent">{OP_LABELS.percent}</option>}
                    </select>
                    {isPercent ? (
                      <>
                        <select className={ui.inputSm} value={operands[0] ?? ''} onChange={e => patchCalc(i, { a: e.target.value })}>
                          <option value="">— เลือกคอลัมน์ —</option>
                          {others.map(o => <option key={o.key} value={o.key}>{o.label || o.key}</option>)}
                        </select>
                        <input type="number" className={`${ui.inputSm} w-20 text-right`} value={col.calc?.percent ?? 0} onChange={e => patchCalc(i, { percent: Number(e.target.value) })} />
                        <span className="text-xs text-gray-500">%</span>
                      </>
                    ) : (
                      <>
                        {operands.map((opKey, opIdx) => (
                          <div key={opIdx} className="flex items-center gap-1.5">
                            {opIdx > 0 && <span className="text-sm text-gray-500">{OP_SYMBOL[col.calc?.op ?? 'multiply']}</span>}
                            <select className={ui.inputSm} value={opKey} onChange={e => setOperand(i, opIdx, e.target.value)}>
                              <option value="">— เลือกคอลัมน์ —</option>
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
                        ))}
                        <button type="button" className={btnDashedSm} onClick={() => addOperand(i)}>
                          <Plus size={14} /> เพิ่มค่า
                        </button>
                      </>
                    )}
                  </div>
                )}

                {col.type === 'select' && (
                  <div className={`${subPanel} mt-2`}>
                    <span className="text-xs text-gray-500">ตัวเลือกที่พนักงานเลือกได้</span>
                    <div className="mt-2 space-y-2">
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
                    <button type="button" className={`${btnDashedSm} mt-2`} onClick={() => addOption(i)}>
                      <Plus size={14} /> เพิ่มตัวเลือก
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button className={ui.btnDashed} onClick={() => insertColumnAt(columns.length)}>
            <Plus size={16} /> เพิ่มคอลัมน์
          </button>
          {columns.length > 0 && (
            <button className={btnDashedSm} onClick={() => insertColumnAt(0)}>
              <Plus size={14} /> แทรกไว้บนสุด
            </button>
          )}
        </div>
      </Section>

      <Section title="ข้อความในเอกสาร" summary={textSummary}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Field label="เหนือตาราง">
            <TemplateTextarea
              value={settings.introText ?? ''}
              placeholder="เว้นว่างถ้าไม่ใช้"
              onChange={v => setSettings(s => ({ ...s, introText: v }))}
            />
          </Field>
          <Field label="ใต้ตาราง (เหนือลายเซ็น)">
            <TemplateTextarea
              value={settings.bodyText ?? ''}
              placeholder="เว้นว่างถ้าไม่ใช้"
              onChange={v => setSettings(s => ({ ...s, bodyText: v }))}
            />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={settings.showRequester !== false} onChange={e => setSettings(s => ({ ...s, showRequester: e.target.checked }))} />
            แสดงชื่อ-ตำแหน่งผู้เบิก
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={settings.showAmountWords !== false} onChange={e => setSettings(s => ({ ...s, showAmountWords: e.target.checked }))} />
            แสดงจำนวนเงินเป็นตัวอักษร
          </label>
        </div>
      </Section>

      <Section title="ช่องลายเซ็น" summary={`${sigBlocks().length} ช่อง · ${sigBlocks().map(b => b.label).join(', ')}`}>
        <div className="space-y-2">
          {sigBlocks().map((b, i) => (
            <div key={b.id} className="flex items-center gap-2">
              <input className={`${ui.inputSm} min-w-0 flex-1`} value={b.label} placeholder="ชื่อตำแหน่ง" onChange={e => setSigLabel(i, e.target.value)} />
              {i === 0 && <Badge tone="blue">ผู้เบิก · เซ็นอัตโนมัติ</Badge>}
              <button className={iconBtn} onClick={() => moveSigBlock(i, -1)} disabled={i === 0} title="เลื่อนขึ้น"><ChevronUp size={16} /></button>
              <button className={iconBtn} onClick={() => moveSigBlock(i, 1)} disabled={i === sigBlocks().length - 1} title="เลื่อนลง"><ChevronDown size={16} /></button>
              <button className={iconBtn} onClick={() => removeSigBlock(i)} title="ลบช่อง"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
        <button className={`${btnDashedSm} mt-3`} onClick={addSigBlock} disabled={sigBlocks().length >= MAX_SIGNATURE_BLOCKS}>
          <Plus size={14} /> เพิ่มช่องลายเซ็น (สูงสุด {MAX_SIGNATURE_BLOCKS})
        </button>
      </Section>

      <Section title="หมวดค่าใช้จ่าย" summary={settings.categories.filter(Boolean).length ? settings.categories.filter(Boolean).join(', ') : 'ไม่มี'}>
        <div className="flex flex-wrap items-center gap-2">
          {settings.categories.map((c, i) => (
            <span key={i} className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 pl-2.5 focus-within:border-blue-500 focus-within:bg-white">
              <input
                className="bg-transparent py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
                size={Math.max(6, c.length + 1)}
                value={c}
                placeholder="ชื่อหมวด"
                onChange={e => setCategory(i, e.target.value)}
              />
              <button type="button" onClick={() => removeCategory(i)} aria-label={`ลบหมวด ${c}`} className="px-1.5 py-1.5 text-gray-400 hover:text-red-600">
                <X size={14} />
              </button>
            </span>
          ))}
          <button className={btnDashedSm} onClick={addCategory}><Plus size={14} /> เพิ่ม</button>
        </div>
      </Section>

      <Section title="หมายเหตุท้ายเอกสาร" summary={settings.notes.length ? `${settings.notes.length} ข้อ` : 'ไม่มี'}>
        {settings.notes.length > 0 && (
          <div className="space-y-2">
            {settings.notes.map((n, i) => (
              <div key={i} className="flex items-start gap-2">
                <textarea className={`${ui.input} min-h-[44px] resize-y py-2`} value={n} onChange={e => setNote(i, e.target.value)} />
                <button className={`${iconBtn} mt-1.5`} onClick={() => removeNote(i)} title="ลบหมายเหตุ"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        )}
        <button className={`${btnDashedSm} mt-2`} onClick={addNote}><Plus size={14} /> เพิ่มหมายเหตุ</button>
      </Section>

      <Section title="โลโก้บริษัท" summary="ใช้กับทุกฟอร์ม">
        <div className="space-y-3">
          {companies.map(company => (
            <div key={company.id} className={`${subCard} flex flex-wrap items-center gap-4`}>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                {company.logo
                  ? <img src={company.logo} alt={company.name} className="h-full w-full object-contain" />
                  : <span className="px-1 text-center text-[10px] leading-tight text-gray-400">ไม่มีโลโก้</span>}
              </div>
              <div className="min-w-[140px] flex-1 text-sm font-semibold text-gray-900">{company.name}</div>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  className="text-xs text-gray-500 file:mr-2 file:cursor-pointer file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                  onChange={e => onLogoPick(company, e.target.files?.[0])}
                />
                {company.logo && (
                  <button className={iconBtn} onClick={() => removeLogo(company)} title="ลบโลโก้"><Trash2 size={16} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>
      </div>
      )}
    </div>
  )
}

