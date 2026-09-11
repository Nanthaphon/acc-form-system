import { uiAlert, uiConfirm, uiPrompt } from '../components/dialog/dialogService'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowDownWideNarrow, ArrowUpNarrowWide, FileText, Folder, Pencil, Plus, Search, Settings, Trash2 } from 'lucide-react'
import ActionIconButton from '../components/ActionIconButton'
import { PageHeader, ui } from '../components/ui'
import { useAuth } from '../auth/AuthProvider'
import type { FormGroup, FormSettings } from '../types/schema'
import { isActive, canSeeForm } from '../types/schema'
import { listGroups, renameGroup } from '../data/formGroups'
import { listForms, createForm, renameForm, deleteForm, setFormActive } from '../data/formSettings'
import { filterAndSortForms, formDisplayName, FORM_SORT_LABELS } from '../shared/formSort'
import type { FormSortKey, SortDir } from '../shared/formSort'
import { formatDate } from '../shared/date'
import Switch from '../components/Switch'

const SORT_PREF_KEY = 'formListSort'

// Remember the viewer's sort choice between visits (per browser). Storage can
// throw (private mode, blocked site data) — then just start from name A→Z.
function loadSortPref(): { key: FormSortKey; dir: SortDir } {
  try {
    const v = JSON.parse(localStorage.getItem(SORT_PREF_KEY) ?? '')
    if (v && v.key in FORM_SORT_LABELS && (v.dir === 'asc' || v.dir === 'desc')) return v
  } catch { /* ignore */ }
  return { key: 'name', dir: 'asc' }
}

// Direction wording that matches what is being sorted.
function dirLabel(key: FormSortKey, dir: SortDir): string {
  if (key === 'name') return dir === 'asc' ? 'ก → ฮ' : 'ฮ → ก'
  return dir === 'asc' ? 'เก่า → ใหม่' : 'ใหม่ → เก่า'
}

export default function GroupPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const { profile } = useAuth()
  const nav = useNavigate()
  const isAdmin = profile?.role === 'admin'
  const [groups, setGroups] = useState<FormGroup[]>([])
  const [forms, setForms] = useState<FormSettings[]>([])
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState(loadSortPref)

  function reload() {
    listGroups().then(setGroups)
    listForms().then(setForms)
  }
  useEffect(() => { reload() }, [])
  useEffect(() => {
    try { localStorage.setItem(SORT_PREF_KEY, JSON.stringify(sort)) } catch { /* ignore */ }
  }, [sort])

  const group = groups.find(g => g.id === groupId)
  // Same fallback rule as the dashboard: forms without a groupId belong to the first group.
  const firstGroupId = groups[0]?.id
  // Visibility is by ACCESS GROUP (not folder) — see canSeeForm.
  const canSee = (f: FormSettings) => canSeeForm(f, profile?.accessGroup, isAdmin)
  const groupActive = !group || isActive(group)
  const groupForms = forms.filter(f =>
    (f.groupId ?? firstGroupId) === groupId && canSee(f) && (isAdmin || (isActive(f) && groupActive))
  )
  const shownForms = filterAndSortForms(groupForms, query, sort.key, sort.dir)

  async function onRenameGroup() {
    if (!group) return
    const name = (await uiPrompt('ตั้งชื่อกลุ่มใหม่', { title: 'เปลี่ยนชื่อกลุ่ม', defaultValue: group.name, confirmText: 'บันทึก' }))?.trim()
    if (!name || name === group.name) return
    try { await renameGroup(group.id, name); reload() }
    catch { uiAlert('เปลี่ยนชื่อกลุ่มไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  async function onCreateForm() {
    if (!groupId) return
    const name = (await uiPrompt('ตั้งชื่อฟอร์มใหม่', { title: 'สร้างฟอร์ม', placeholder: 'เช่น ใบเบิกค่าใช้จ่าย', confirmText: 'สร้าง' }))?.trim()
    if (!name) return
    try {
      const newId = await createForm(name, groupId)
      nav(`/form/${newId}/edit`)
    } catch { uiAlert('สร้างฟอร์มไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  async function onRenameForm(form: FormSettings) {
    const name = (await uiPrompt('ตั้งชื่อฟอร์มใหม่', { title: 'เปลี่ยนชื่อฟอร์ม', defaultValue: form.name || form.title, confirmText: 'บันทึก' }))?.trim()
    if (!name) return
    try { await renameForm(form.formType, name); reload() }
    catch { uiAlert('เปลี่ยนชื่อฟอร์มไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  async function onDeleteForm(form: FormSettings) {
    if (!(await uiConfirm(`เอกสารที่พนักงานเคยกรอกไว้จะยังอยู่`, { title: `ลบฟอร์ม "${form.name || form.title}" ?`, tone: 'danger', confirmText: 'ลบ' }))) return
    try { await deleteForm(form.formType); reload() }
    catch { uiAlert('ลบฟอร์มไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  async function onToggleForm(form: FormSettings) {
    try { await setFormActive(form.formType, !isActive(form)); reload() }
    catch { uiAlert('เปลี่ยนสถานะฟอร์มไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  // The date shown on a card follows the sort key, so the order is self-explanatory.
  const showCreated = sort.key === 'createdAt'
  const nextDir: SortDir = sort.dir === 'asc' ? 'desc' : 'asc'

  return (
    <div>
      <PageHeader
        onBack={() => nav('/')}
        icon={<Folder size={20} />}
        title={group?.name ?? 'กลุ่มฟอร์ม'}
        subtitle={`${groupForms.length} ฟอร์ม`}
        actions={isAdmin && (
          <>
            {group && <ActionIconButton label="เปลี่ยนชื่อกลุ่ม" icon={<Pencil size={16} />} onClick={onRenameGroup} />}
            <button onClick={onCreateForm} className={ui.btnPrimary}>
              <Plus size={16} /> สร้างฟอร์ม
            </button>
          </>
        )}
      />

      {/* Search + sort */}
      {groupForms.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="ค้นหาชื่อฟอร์ม / รหัสฟอร์ม"
              className={`${ui.input} pl-9`}
            />
          </div>
          <label className="ml-auto flex items-center gap-2 text-sm text-gray-500">
            เรียงตาม
            <select
              value={sort.key}
              onChange={e => setSort(s => ({ ...s, key: e.target.value as FormSortKey }))}
              className={ui.input}
            >
              {(Object.keys(FORM_SORT_LABELS) as FormSortKey[]).map(k => <option key={k} value={k}>{FORM_SORT_LABELS[k]}</option>)}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setSort(s => ({ ...s, dir: nextDir }))}
            title={sort.dir === 'asc' ? 'เรียงจากน้อยไปมาก (Ascending) — คลิกเพื่อสลับ' : 'เรียงจากมากไปน้อย (Descending) — คลิกเพื่อสลับ'}
            aria-label={sort.dir === 'asc' ? 'เรียงจากน้อยไปมาก' : 'เรียงจากมากไปน้อย'}
            className={ui.btnSecondary}
          >
            {sort.dir === 'asc' ? <ArrowUpNarrowWide size={16} /> : <ArrowDownWideNarrow size={16} />}
            {dirLabel(sort.key, sort.dir)}
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {shownForms.map(form => {
          const stamp = showCreated ? form.createdAt : form.updatedAt
          return (
            <div
              key={form.formType}
              role="button"
              tabIndex={0}
              onClick={() => nav(`/form/${form.formType}`)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nav(`/form/${form.formType}`) } }}
              className={`relative cursor-pointer rounded-xl border border-gray-200 bg-white p-5 transition hover:border-gray-300 hover:shadow-md ${isAdmin && !isActive(form) ? 'opacity-60' : ''}`}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><FileText size={20} /></div>
              <div className="font-medium text-gray-900">{formDisplayName(form)}</div>
              <div className="text-sm text-gray-500">{form.formCode}</div>
              {!!stamp && (
                <div className="mt-1 text-xs text-gray-400">{showCreated ? 'สร้างเมื่อ' : 'แก้ไขล่าสุด'} {formatDate(stamp)}</div>
              )}
              {isAdmin && (
                <div className="mt-3 flex items-center gap-2">
                  <Switch on={isActive(form)} onChange={() => onToggleForm(form)} />
                  <span className={`text-xs font-medium ${isActive(form) ? 'text-green-600' : 'text-gray-400'}`}>{isActive(form) ? 'เปิดใช้งาน' : 'ปิดปรับปรุง'}</span>
                </div>
              )}
              {isAdmin && (
                <div className="absolute right-2 top-2 flex gap-1">
                  <ActionIconButton
                    label="ตั้งค่าฟอร์ม"
                    icon={<Settings size={16} />}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); nav(`/form/${form.formType}/edit`) }}
                  />
                  <ActionIconButton
                    label="เปลี่ยนชื่อฟอร์ม"
                    icon={<Pencil size={16} />}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRenameForm(form) }}
                  />
                  <ActionIconButton
                    label="ลบฟอร์ม"
                    tone="red"
                    icon={<Trash2 size={16} />}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteForm(form) }}
                  />
                </div>
              )}
            </div>
          )
        })}
        {groupForms.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center text-sm text-gray-400">
            ยังไม่มีฟอร์มในกลุ่มนี้
          </div>
        )}
        {groupForms.length > 0 && shownForms.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center text-sm text-gray-400">
            ไม่พบฟอร์มที่ตรงกับ “{query}”
          </div>
        )}
      </div>
    </div>
  )
}
