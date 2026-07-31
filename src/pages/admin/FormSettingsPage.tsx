import { useEffect, useState } from 'react'
import type { Company, FormSettings } from '../../types/schema'
import { EXPENSE_CLAIM_DEFAULTS } from '../../types/schema'
import { getFormSettings, updateFormSettings } from '../../data/formSettings'
import { listCompanies, updateCompanyLogo } from '../../data/companies'

const cardClass = 'rounded-2xl border border-[#e5eaf3] bg-white p-6 shadow-[0_1px_2px_rgba(16,32,64,0.03)]'
const cardTitleClass = "flex items-center gap-2 text-sm font-semibold text-[#16233f] before:block before:h-4 before:w-1 before:rounded-[3px] before:bg-[#2b5bd7]"
const inputClass = 'w-full rounded-[10px] border border-[#e5eaf3] bg-[#fbfcfe] px-3 py-2.5 text-sm placeholder:text-[#7a869a] focus:border-[#2b5bd7] focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-[#2b5bd7]/[.12]'

export default function FormSettingsPage() {
  const [settings, setSettings] = useState<FormSettings>(EXPENSE_CLAIM_DEFAULTS)
  const [companies, setCompanies] = useState<Company[]>([])
  const [saving, setSaving] = useState(false)

  function loadCompanies() { listCompanies().then(setCompanies) }
  useEffect(() => {
    getFormSettings('expense-claim').then(setSettings)
    loadCompanies()
  }, [])

  function setField<K extends keyof FormSettings>(key: K, value: FormSettings[K]) {
    setSettings(s => ({ ...s, [key]: value }))
  }
  function setCategory(idx: number, value: string) {
    setSettings(s => ({ ...s, categories: s.categories.map((c, i) => i === idx ? value : c) }))
  }
  function removeCategory(idx: number) {
    setSettings(s => ({ ...s, categories: s.categories.filter((_, i) => i !== idx) }))
  }
  function addCategory() {
    setSettings(s => ({ ...s, categories: [...s.categories, ''] }))
  }
  function setNote(idx: number, value: string) {
    setSettings(s => ({ ...s, notes: s.notes.map((n, i) => i === idx ? value : n) }))
  }
  function removeNote(idx: number) {
    setSettings(s => ({ ...s, notes: s.notes.filter((_, i) => i !== idx) }))
  }
  function addNote() {
    setSettings(s => ({ ...s, notes: [...s.notes, ''] }))
  }

  async function save() {
    setSaving(true)
    try {
      await updateFormSettings({ ...settings, formType: 'expense-claim' })
      alert('บันทึกการตั้งค่าแล้ว')
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
      if (dataUrl.length > 400000) {
        alert('ไฟล์ใหญ่เกินไป แนะนำโลโก้เล็กกว่า ~300KB')
        return
      }
      try {
        await updateCompanyLogo(company.id, dataUrl)
        loadCompanies()
      } catch {
        alert('อัปโหลดโลโก้ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
      }
    }
    reader.readAsDataURL(file)
  }

  async function removeLogo(company: Company) {
    try {
      await updateCompanyLogo(company.id, null)
      loadCompanies()
    } catch {
      alert('ลบโลโก้ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    }
  }

  return (
    <div className="space-y-4">
      <div className="mb-2 flex items-center gap-3.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-[#eaf0ff] text-xl text-[#2b5bd7]">⚙️</div>
        <div>
          <h1 className="text-xl font-semibold text-[#1f2a3d]">ตั้งค่าฟอร์ม — ใบเบิกค่าใช้จ่าย</h1>
          <div className="text-[13px] text-[#7a869a]">แก้ไขข้อความหัวฟอร์ม หมวดค่าใช้จ่าย หมายเหตุ และโลโก้บริษัท</div>
        </div>
      </div>

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

      {/* หมวดค่าใช้จ่าย */}
      <div className={cardClass}>
        <h2 className={`${cardTitleClass} mb-4`}>หมวดค่าใช้จ่าย (ช่องติ๊ก)</h2>
        <div className="space-y-2.5">
          {settings.categories.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className={inputClass} value={c} onChange={e => setCategory(i, e.target.value)} />
              <button
                onClick={() => removeCategory(i)}
                className="shrink-0 rounded-[10px] border border-[#e5eaf3] px-3 py-2.5 text-sm text-[#d64545] hover:border-[#d64545]"
              >
                ลบ
              </button>
            </div>
          ))}
        </div>
        <button
          className="mt-3 inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-[#b9c4da] bg-white px-4 py-2.5 text-sm font-medium text-[#2b5bd7]"
          onClick={addCategory}
        >
          ＋ เพิ่มหมวด
        </button>
      </div>

      {/* หมายเหตุท้ายฟอร์ม */}
      <div className={cardClass}>
        <h2 className={`${cardTitleClass} mb-4`}>หมายเหตุท้ายฟอร์ม</h2>
        <div className="space-y-2.5">
          {settings.notes.map((n, i) => (
            <div key={i} className="flex items-start gap-2">
              <textarea className={`${inputClass} min-h-[52px] resize-y`} value={n} onChange={e => setNote(i, e.target.value)} />
              <button
                onClick={() => removeNote(i)}
                className="shrink-0 rounded-[10px] border border-[#e5eaf3] px-3 py-2.5 text-sm text-[#d64545] hover:border-[#d64545]"
              >
                ลบ
              </button>
            </div>
          ))}
        </div>
        <button
          className="mt-3 inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-[#b9c4da] bg-white px-4 py-2.5 text-sm font-medium text-[#2b5bd7]"
          onClick={addNote}
        >
          ＋ เพิ่มหมายเหตุ
        </button>
      </div>

      <button
        className="inline-flex items-center gap-2 rounded-[11px] bg-[#2b5bd7] px-5 py-3 text-sm font-medium text-white shadow-[0_6px_16px_rgba(43,91,215,0.28)] hover:bg-[#1e46b0] disabled:opacity-60"
        onClick={save}
        disabled={saving}
      >
        💾 บันทึกการตั้งค่า
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
                  <button
                    onClick={() => removeLogo(company)}
                    className="rounded-[10px] border border-[#e5eaf3] px-3 py-2 text-sm text-[#d64545] hover:border-[#d64545]"
                  >
                    ลบโลโก้
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
