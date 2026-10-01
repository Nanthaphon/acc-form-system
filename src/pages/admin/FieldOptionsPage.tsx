import { uiAlert, uiConfirm, uiPrompt } from '../../components/dialog/dialogService'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ListChecks, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import ActionIconButton from '../../components/ActionIconButton'
import { Badge, PageHeader, ui } from '../../components/ui'
import { dbErrorMessage } from '../../shared/dbError'
import {
  OPTION_FIELDS, listFieldOptions, addFieldOption, renameFieldOption, deleteFieldOption,
  fieldUsage, isMissingTable, matchOption,
} from '../../data/fieldOptions'
import type { FieldOption, OptionField } from '../../data/fieldOptions'

type Usage = Record<OptionField, Map<string, number>>
const NO_USAGE: Usage = { department: new Map(), position: new Map() }
// A list this long is quicker to search than to scroll.
const SEARCH_FROM = 8
// The card holds its own scrolling list, so it keeps its padding off the edges.
const cardClass = ui.card.replace('p-6', 'overflow-hidden')

function writeError(e: unknown): string {
  if ((e as { code?: string } | null)?.code === '23505') return 'มีตัวเลือกนี้อยู่แล้ว'
  return dbErrorMessage(e)
}

export default function FieldOptionsPage() {
  const nav = useNavigate()
  const [options, setOptions] = useState<FieldOption[]>([])
  const [usage, setUsage] = useState<Usage>(NO_USAGE)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [queries, setQueries] = useState<Record<string, string>>({})

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

  const valuesOf = (field: OptionField) => options.filter(o => o.field === field)

  async function onAdd(field: OptionField, label: string) {
    const value = (await uiPrompt(`พิมพ์${label}ที่จะให้เลือกได้`, { title: `เพิ่มตัวเลือก${label}`, confirmText: 'เพิ่ม' }))?.trim()
    if (!value) return
    const existing = matchOption(valuesOf(field).map(o => o.value), value)
    if (existing) { uiAlert(`มี "${existing}" อยู่ในรายการแล้ว`); return }
    try { await addFieldOption(field, value); reload() }
    catch (e) { uiAlert('เพิ่มไม่สำเร็จ: ' + writeError(e)) }
  }

  async function onRename(o: FieldOption, label: string) {
    const used = usage[o.field].get(o.value) ?? 0
    const value = (await uiPrompt(
      used > 0 ? `พนักงาน ${used} คนที่ใช้ "${o.value}" อยู่ จะถูกเปลี่ยนตามไปด้วย` : `ตั้งชื่อ${label}ใหม่`,
      { title: `เปลี่ยนชื่อ "${o.value}"`, defaultValue: o.value, confirmText: 'บันทึก' },
    ))?.trim()
    if (!value || value === o.value) return
    try { await renameFieldOption(o.id, value); reload() }
    catch (e) { uiAlert('เปลี่ยนชื่อไม่สำเร็จ: ' + writeError(e)) }
  }

  async function onDelete(o: FieldOption) {
    const used = usage[o.field].get(o.value) ?? 0
    const msg = used > 0
      ? `พนักงาน ${used} คนยังใช้ค่านี้อยู่ ข้อมูลของพวกเขาไม่หาย — แค่จะไม่ขึ้นเป็นคำแนะนำให้เลือกอีก`
      : 'ลบออกจากรายการตัวเลือก'
    if (!(await uiConfirm(msg, { title: `ลบ "${o.value}" ?`, tone: 'danger', confirmText: 'ลบ' }))) return
    try { await deleteFieldOption(o.id); reload() }
    catch (e) { uiAlert('ลบไม่สำเร็จ: ' + writeError(e)) }
  }

  return (
    <div className="max-w-5xl">
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
        <div className="grid gap-5 lg:grid-cols-2">
          {OPTION_FIELDS.map(({ key, label }) => {
            const rows = valuesOf(key)
            const q = (queries[key] ?? '').trim().toLowerCase()
            const shown = q ? rows.filter(o => o.value.toLowerCase().includes(q)) : rows
            return (
              <section key={key} className={cardClass}>
                <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-4">
                  <h2 className={ui.cardTitle}>{label}</h2>
                  {rows.length > 0
                    ? <Badge tone="blue">{rows.length} ตัวเลือก</Badge>
                    : <Badge>ยังไม่มีตัวเลือก</Badge>}
                  <button type="button" onClick={() => onAdd(key, label)} className={`${ui.btnGhost} ml-auto`}>
                    <Plus size={16} /> เพิ่มตัวเลือก
                  </button>
                </div>

                {rows.length > SEARCH_FROM && (
                  <div className="relative border-b border-stone-100 px-5 py-3">
                    <Search size={15} className="pointer-events-none absolute left-8 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      value={queries[key] ?? ''}
                      onChange={e => setQueries(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={`ค้นหา${label} (${rows.length} รายการ)`}
                      className={`${ui.input} pl-9`}
                    />
                  </div>
                )}

                <ul className="max-h-[26rem] divide-y divide-stone-100 overflow-auto">
                  {loading ? (
                    <li className="px-5 py-10 text-center text-sm text-stone-400">กำลังโหลด...</li>
                  ) : rows.length === 0 ? (
                    <li className="px-5 py-10 text-center text-sm text-stone-400">
                      ยังไม่มีตัวเลือก — กด “เพิ่มตัวเลือก” เพื่อให้มีคำแนะนำตอนกรอก{label}
                    </li>
                  ) : shown.length === 0 ? (
                    <li className="px-5 py-10 text-center text-sm text-stone-400">ไม่พบ “{queries[key]}”</li>
                  ) : shown.map(o => (
                    <li key={o.id} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-stone-50">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-900" title={o.value}>{o.value}</span>
                      <span className="shrink-0 text-xs tabular-nums text-stone-400">{usage[key].get(o.value) ?? 0} คน</span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <ActionIconButton label="เปลี่ยนชื่อ" icon={<Pencil size={16} />} onClick={() => onRename(o, label)} />
                        <ActionIconButton label="ลบตัวเลือก" tone="red" icon={<Trash2 size={16} />} onClick={() => onDelete(o)} />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
