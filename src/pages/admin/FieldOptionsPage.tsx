import { uiAlert, uiConfirm, uiPrompt } from '../../components/dialog/dialogService'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ListChecks, Pencil, Plus, Trash2 } from 'lucide-react'
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

  async function onAdd(field: OptionField, label: string, preset?: string) {
    const value = preset ?? (await uiPrompt(`พิมพ์${label}ที่จะให้เลือกได้`, { title: `เพิ่มตัวเลือก${label}`, confirmText: 'เพิ่ม' }))?.trim()
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
      ? `พนักงาน ${used} คนยังใช้ค่านี้อยู่ ข้อมูลของพวกเขาจะไม่หาย แต่ค่านี้จะเลือกใหม่ไม่ได้อีก`
      : 'ลบออกจากรายการตัวเลือก'
    if (!(await uiConfirm(msg, { title: `ลบ "${o.value}" ?`, tone: 'danger', confirmText: 'ลบ' }))) return
    try { await deleteFieldOption(o.id); reload() }
    catch (e) { uiAlert('ลบไม่สำเร็จ: ' + writeError(e)) }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        onBack={() => nav('/')}
        icon={<ListChecks size={20} />}
        title="Custom Field"
        subtitle="รายการตัวเลือกของข้อมูลพนักงาน"
      />

      <p className="mb-5 text-sm text-stone-500">
        ช่องที่มีตัวเลือก จะเป็น Dropdown ให้เลือกในหน้าเพิ่ม/แก้ไขพนักงาน หน้าข้อมูลของฉัน และในไฟล์นำเข้าพนักงาน ·
        ช่องที่ยังไม่มีตัวเลือก พิมพ์ได้อิสระเหมือนเดิม
      </p>

      {missing ? (
        <div className="flex gap-3 rounded-2xl border border-ochre-200 bg-ochre-50 p-5 text-sm text-ochre-700">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold">ยังใช้งานไม่ได้ — ฐานข้อมูลยังไม่มีตารางสำหรับเมนูนี้</div>
            <div className="mt-1">ผู้ดูแลระบบต้องรันไฟล์ <code className="rounded bg-white/70 px-1">supabase/2026-09-25-field-options.sql</code> ใน Supabase ก่อน</div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {OPTION_FIELDS.map(({ key, label }) => {
            const rows = valuesOf(key)
            const listed = new Set(rows.map(o => o.value))
            const unlisted = [...usage[key].entries()].filter(([v]) => !listed.has(v)).sort((a, b) => b[1] - a[1])
            return (
              <section key={key}>
                <div className="mb-2 flex items-center gap-2">
                  <h2 className="text-[15px] font-semibold text-stone-900">{label}</h2>
                  {rows.length > 0
                    ? <Badge tone="blue">Dropdown · {rows.length} ตัวเลือก</Badge>
                    : <Badge>พิมพ์อิสระ</Badge>}
                  <button type="button" onClick={() => onAdd(key, label)} className={`${ui.btnGhost} ml-auto`}>
                    <Plus size={16} /> เพิ่มตัวเลือก
                  </button>
                </div>

                <div className={ui.tableWrap}>
                  <table className={ui.table}>
                    <thead className={ui.thead}>
                      <tr>
                        <th className={ui.th}>ตัวเลือก</th>
                        <th className={`${ui.th} text-right`}>พนักงานที่ใช้</th>
                        <th className={ui.th} aria-label="จัดการ" />
                      </tr>
                    </thead>
                    <tbody className={ui.tbody}>
                      {loading ? (
                        <tr><td colSpan={3} className={ui.emptyCell}>กำลังโหลด...</td></tr>
                      ) : rows.length === 0 ? (
                        <tr><td colSpan={3} className={ui.emptyCell}>ยังไม่มีตัวเลือก — ช่อง{label}พิมพ์ได้อิสระ</td></tr>
                      ) : rows.map(o => (
                        <tr key={o.id} className={ui.tr}>
                          <td className={`${ui.td} font-medium text-stone-900`}>{o.value}</td>
                          <td className={`${ui.td} text-right tabular-nums`}>{usage[key].get(o.value) ?? 0} คน</td>
                          <td className={ui.td}>
                            <div className="flex items-center justify-end gap-1.5">
                              <ActionIconButton label="เปลี่ยนชื่อ" icon={<Pencil size={16} />} onClick={() => onRename(o, label)} />
                              <ActionIconButton label="ลบตัวเลือก" tone="red" icon={<Trash2 size={16} />} onClick={() => onDelete(o)} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Values people already have that the list does not know about —
                    the quickest way to build a list is from what is already there. */}
                {!loading && unlisted.length > 0 && (
                  <div className="mt-2 text-xs text-stone-500">
                    <span className="mr-1">มีในข้อมูลพนักงานแต่ยังไม่อยู่ในรายการ:</span>
                    {unlisted.map(([v, n]) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => onAdd(key, label, v)}
                        title={`เพิ่ม "${v}" เข้ารายการ`}
                        className="mb-1 mr-1 inline-flex items-center gap-1 rounded-lg border border-dashed border-stone-300 px-2 py-0.5 text-stone-600 transition-colors hover:border-clay-600 hover:text-clay-700"
                      >
                        <Plus size={12} /> {v} <span className="text-stone-400">({n})</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
