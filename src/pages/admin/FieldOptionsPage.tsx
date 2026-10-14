import { uiAlert, uiConfirm } from '../../components/dialog/dialogService'
import { useEffect, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Check, ListChecks, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { PageHeader, ui } from '../../components/ui'
import { dbErrorMessage } from '../../shared/dbError'
import {
  OPTION_FIELDS, listFieldOptions, addFieldOption, renameFieldOption, deleteFieldOption,
  fieldUsage, isMissingTable, matchOption,
} from '../../data/fieldOptions'
import type { FieldOption, OptionField } from '../../data/fieldOptions'

type Usage = Record<OptionField, Map<string, number>>
type Sort = 'name' | 'usage'
const NO_USAGE: Usage = { department: new Map(), position: new Map() }

function writeError(e: unknown): string {
  if ((e as { code?: string } | null)?.code === '23505') return 'มีตัวเลือกนี้อยู่แล้ว'
  return dbErrorMessage(e)
}

// The row's edit and delete appear when the row is pointed at or tabbed into,
// so a list of forty values is forty names rather than eighty buttons. A
// screen without hover — a phone — shows them all the time.
const ROW_ACTIONS = 'flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100'
const ICON_BTN = 'inline-flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900'
const BOX = 'min-w-0 flex-1 rounded-lg border border-clay-600 bg-white px-3 py-1.5 text-sm text-stone-900 outline-none ring-2 ring-clay-600/15'

export default function FieldOptionsPage() {
  const nav = useNavigate()
  const [options, setOptions] = useState<FieldOption[]>([])
  const [usage, setUsage] = useState<Usage>(NO_USAGE)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [field, setField] = useState<OptionField>('department')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('name')
  // One row at a time is being renamed, or a new value typed in.
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null)
  const [adding, setAdding] = useState<{ text: string; error?: string } | null>(null)
  const [saving, setSaving] = useState(false)

  async function reload() {
    try {
      const [rows, used] = await Promise.all([listFieldOptions(), fieldUsage()])
      setOptions(rows); setUsage(used); setMissing(false)
    } catch (e) {
      if (isMissingTable(e)) setMissing(true)
      else uiAlert('โหลดข้อมูลไม่สำเร็จ: ' + dbErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { reload() }, [])

  const label = OPTION_FIELDS.find(f => f.key === field)!.label
  const valuesOf = (f: OptionField) => options.filter(o => o.field === f)
  const usedBy = (o: FieldOption) => usage[o.field].get(o.value) ?? 0

  const q = query.trim().toLowerCase()
  const shown = valuesOf(field)
    .filter(o => !q || o.value.toLowerCase().includes(q))
    .sort((a, b) => sort === 'usage'
      ? usedBy(b) - usedBy(a) || a.value.localeCompare(b.value, 'th')
      : a.value.localeCompare(b.value, 'th'))

  function switchTo(f: OptionField) {
    setField(f); setQuery(''); setEditing(null); setAdding(null)
  }

  async function saveNew() {
    const value = adding?.text.trim()
    if (!value) { setAdding(null); return }
    const existing = matchOption(valuesOf(field).map(o => o.value), value)
    if (existing) { setAdding({ text: value, error: `มี "${existing}" อยู่ในรายการแล้ว` }); return }
    setSaving(true)
    try { await addFieldOption(field, value); setAdding(null); await reload() }
    catch (e) { setAdding({ text: value, error: 'เพิ่มไม่สำเร็จ: ' + writeError(e) }) }
    finally { setSaving(false) }
  }

  async function saveRename(o: FieldOption) {
    const value = editing?.text.trim()
    if (!value || value === o.value) { setEditing(null); return }
    setSaving(true)
    try { await renameFieldOption(o.id, value); setEditing(null); await reload() }
    catch (e) { uiAlert('เปลี่ยนชื่อไม่สำเร็จ: ' + writeError(e)) }
    finally { setSaving(false) }
  }

  async function onDelete(o: FieldOption) {
    const used = usedBy(o)
    const msg = used > 0
      ? `พนักงาน ${used} คนยังใช้ค่านี้อยู่ ข้อมูลของพวกเขาไม่หาย — แค่จะไม่ขึ้นเป็นคำแนะนำให้เลือกอีก`
      : 'ลบออกจากรายการตัวเลือก'
    if (!(await uiConfirm(msg, { title: `ลบ "${o.value}" ?`, tone: 'danger', confirmText: 'ลบ' }))) return
    try { await deleteFieldOption(o.id); reload() }
    catch (e) { uiAlert('ลบไม่สำเร็จ: ' + writeError(e)) }
  }

  const keys = (save: () => void, cancel: () => void) => (e: KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); save() }
    if (e.key === 'Escape') { e.preventDefault(); cancel() }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        onBack={() => nav('/')}
        icon={<ListChecks size={20} />}
        title="Custom Field"
        subtitle="ตัวเลือกที่ขึ้นให้กดเลือกตอนกรอกข้อมูลพนักงาน · พิมพ์ค่าอื่นเองได้เสมอ"
      />

      {missing ? (
        <div className="flex gap-3 rounded-2xl border border-ochre-200 bg-ochre-50 p-5 text-sm text-ochre-700">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold">ยังใช้งานไม่ได้ — ฐานข้อมูลยังไม่มีตารางสำหรับเมนูนี้</div>
            <div className="mt-1">ผู้ดูแลระบบต้องรันไฟล์ <code className="rounded bg-white/70 px-1">supabase/2026-09-25-field-options.sql</code> ใน Supabase ก่อน</div>
          </div>
        </div>
      ) : (
        <div className={`${ui.card.replace('p-6', '')} overflow-hidden`}>
          {/* Tabs: one field at a time, each saying how much it holds. */}
          <div role="tablist" aria-label="ฟิลด์" className="flex gap-1 border-b border-stone-100 px-4 pt-3">
            {OPTION_FIELDS.map(f => {
              const active = f.key === field
              return (
                <button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => switchTo(f.key)}
                  className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 pb-3 pt-1 text-sm font-medium transition-colors ${
                    active ? 'border-clay-600 text-clay-700' : 'border-transparent text-stone-500 hover:text-stone-800'
                  }`}
                >
                  {f.label}
                  <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${active ? 'bg-clay-50 text-clay-700' : 'bg-stone-100 text-stone-500'}`}>
                    {valuesOf(f.key).length}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 px-4 py-3">
            <div className="relative min-w-[12rem] flex-1">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={`ค้นหา${label}`}
                className={`${ui.inputSm} w-full pl-9`}
              />
            </div>
            <span role="radiogroup" aria-label="เรียงตาม" className="inline-flex overflow-hidden rounded-xl border border-stone-200 bg-white text-xs">
              {([['name', 'ก–ฮ'], ['usage', 'ใช้มากสุด']] as const).map(([v, text]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={sort === v}
                  onClick={() => setSort(v)}
                  className={`px-3 py-1.5 transition-colors ${sort === v ? 'bg-clay-600 font-medium text-white' : 'text-stone-500 hover:bg-stone-50'}`}
                >
                  {text}
                </button>
              ))}
            </span>
            <button type="button" onClick={() => { setEditing(null); setAdding({ text: '' }) }} className={`${ui.btnPrimary} py-1.5`}>
              <Plus size={16} /> เพิ่ม{label}
            </button>
          </div>

          <ul className="divide-y divide-stone-100">
            {adding && (
              <li className="bg-clay-50/40 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    aria-label={`${label}ใหม่`}
                    placeholder={`พิมพ์${label}ใหม่ แล้วกด Enter`}
                    value={adding.text}
                    onChange={e => setAdding({ text: e.target.value })}
                    onKeyDown={keys(saveNew, () => setAdding(null))}
                    className={BOX}
                  />
                  <button type="button" aria-label="บันทึก" disabled={saving} onClick={saveNew} className={`${ICON_BTN} text-clay-700`}><Check size={16} /></button>
                  <button type="button" aria-label="ยกเลิก" onClick={() => setAdding(null)} className={ICON_BTN}><X size={16} /></button>
                </div>
                {adding.error && <div className="mt-1.5 text-xs text-brick-600">{adding.error}</div>}
              </li>
            )}

            {loading ? (
              <li className="px-4 py-12 text-center text-sm text-stone-400">กำลังโหลด...</li>
            ) : valuesOf(field).length === 0 && !adding ? (
              <li className="px-4 py-12 text-center text-sm text-stone-400">
                ยังไม่มีตัวเลือก{label} — กด “เพิ่ม{label}” แล้วจะขึ้นเป็นคำแนะนำตอนกรอก
              </li>
            ) : shown.length === 0 && q ? (
              <li className="px-4 py-12 text-center text-sm text-stone-400">ไม่พบ “{query}”</li>
            ) : shown.map(o => {
              const used = usedBy(o)
              if (editing?.id === o.id) {
                return (
                  <li key={o.id} className="bg-clay-50/40 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        aria-label={`ชื่อใหม่ของ ${o.value}`}
                        value={editing.text}
                        onChange={e => setEditing({ id: o.id, text: e.target.value })}
                        onKeyDown={keys(() => saveRename(o), () => setEditing(null))}
                        className={BOX}
                      />
                      <button type="button" aria-label="บันทึก" disabled={saving} onClick={() => saveRename(o)} className={`${ICON_BTN} text-clay-700`}><Check size={16} /></button>
                      <button type="button" aria-label="ยกเลิก" onClick={() => setEditing(null)} className={ICON_BTN}><X size={16} /></button>
                    </div>
                    {used > 0 && (
                      <div className="mt-1.5 text-xs text-stone-500">พนักงาน {used} คนที่ใช้ค่านี้จะถูกเปลี่ยนตามไปด้วย · Enter บันทึก · Esc ยกเลิก</div>
                    )}
                  </li>
                )
              }
              return (
                <li key={o.id} className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-stone-50/70">
                  <span data-testid="option-value" className="min-w-0 flex-1 truncate text-sm text-stone-900" title={o.value}>{o.value}</span>
                  {used > 0
                    ? <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-xs tabular-nums text-stone-600">{used} คน</span>
                    : <span className="shrink-0 text-xs text-stone-400">ยังไม่มีคนใช้</span>}
                  <div className={ROW_ACTIONS}>
                    <button type="button" aria-label="เปลี่ยนชื่อ" title="เปลี่ยนชื่อ" onClick={() => { setAdding(null); setEditing({ id: o.id, text: o.value }) }} className={ICON_BTN}>
                      <Pencil size={15} />
                    </button>
                    <button type="button" aria-label="ลบตัวเลือก" title="ลบ" onClick={() => onDelete(o)} className={`${ICON_BTN} hover:bg-rose-50 hover:text-brick-600`}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
