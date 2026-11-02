import { uiAlert, uiConfirm, uiPrompt } from '../components/dialog/dialogService'
import { dbErrorMessage } from '../shared/dbError'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowDownWideNarrow, ArrowUpNarrowWide, CopyPlus, FileText, Folder, FolderInput, FolderPlus, LayoutGrid, List, Pencil, Plus, Search, Settings, Trash2 } from 'lucide-react'
import ActionIconButton from '../components/ActionIconButton'
import { PageHeader, ui } from '../components/ui'
import { useAuth } from '../auth/AuthProvider'
import type { FormGroup, FormSettings } from '../types/schema'
import { isActive, canSeeForm } from '../types/schema'
import { listGroups, renameGroup, createGroup, deleteGroup, setGroupActive } from '../data/formGroups'
import { listForms, createForm, duplicateForm, renameForm, deleteForm, setFormActive, moveForm } from '../data/formSettings'
import { folderOpen, parentOf, subfoldersAvailable, subfoldersOf } from '../shared/folders'
import MoveFormDialog from '../components/MoveFormDialog'
import FolderCard from '../components/FolderCard'
import { RowMenu } from '../components/RowActions'
import type { RowMenuItem } from '../components/RowActions'
import { filterAndSortForms, formDisplayName, FORM_SORT_LABELS } from '../shared/formSort'
import type { FormSortKey, SortDir } from '../shared/formSort'
import { formatDate } from '../shared/date'
import Switch from '../components/Switch'

const SORT_PREF_KEY = 'formListSort'
const VIEW_PREF_KEY = 'formListView'

type FormView = 'card' | 'list'
// Cards suit a folder of a few forms; a list reads faster once there are many.
function loadViewPref(): FormView {
  try { return localStorage.getItem(VIEW_PREF_KEY) === 'list' ? 'list' : 'card' } catch { return 'card' }
}

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
  const [view, setView] = useState<FormView>(loadViewPref)
  const [moving, setMoving] = useState<FormSettings | null>(null)

  function reload() {
    listGroups().then(setGroups)
    listForms().then(setForms)
  }
  useEffect(() => { reload() }, [])
  useEffect(() => {
    try { localStorage.setItem(SORT_PREF_KEY, JSON.stringify(sort)) } catch { /* ignore */ }
  }, [sort])
  useEffect(() => {
    try { localStorage.setItem(VIEW_PREF_KEY, view) } catch { /* ignore */ }
  }, [view])

  const group = groups.find(g => g.id === groupId)
  // Same fallback rule as the dashboard: forms without a groupId belong to the first group.
  const firstGroupId = groups[0]?.id
  // Visibility is by ACCESS GROUP (not folder) — see canSeeForm.
  const canSee = (f: FormSettings) => canSeeForm(f, profile?.accessGroup, isAdmin)
  // A sub-folder is open to employees only while the folder it sits in is too.
  const groupActive = !group || folderOpen(groups, groupId)
  const formsIn = (id: string | undefined) => forms.filter(f =>
    (f.groupId ?? firstGroupId) === id && canSee(f) && (isAdmin || (isActive(f) && folderOpen(groups, id)))
  )
  const groupForms = formsIn(groupId).filter(() => isAdmin || groupActive)
  // One level of sub-folders: a sub-folder holds forms only.
  const parent = parentOf(groups, groupId)
  const subfolders = parent ? [] : subfoldersOf(groups, groupId)
    .filter(sf => isAdmin || (isActive(sf) && groupActive && formsIn(sf.id).length > 0))
  const canAddSubfolder = isAdmin && !!group && !parent && subfoldersAvailable(groups)
  const needle = query.trim().toLowerCase()
  const shownSubfolders = needle ? subfolders.filter(sf => sf.name.toLowerCase().includes(needle)) : subfolders
  const shownForms = filterAndSortForms(groupForms, query, sort.key, sort.dir)

  async function onRenameGroup() {
    if (!group) return
    const name = (await uiPrompt('ตั้งชื่อกลุ่มใหม่', { title: 'เปลี่ยนชื่อกลุ่ม', defaultValue: group.name, confirmText: 'บันทึก' }))?.trim()
    if (!name || name === group.name) return
    try { await renameGroup(group.id, name); reload() }
    catch { uiAlert('เปลี่ยนชื่อกลุ่มไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  async function onCreateSubfolder() {
    if (!group) return
    const name = (await uiPrompt('ตั้งชื่อโฟลเดอร์ย่อย', { title: `สร้างโฟลเดอร์ย่อยใน "${group.name}"`, placeholder: 'เช่น ค่าเดินทาง', confirmText: 'สร้าง' }))?.trim()
    if (!name) return
    try { await createGroup(name, group.id); reload() }
    catch (e) { uiAlert(dbErrorMessage(e), { title: 'สร้างโฟลเดอร์ย่อยไม่สำเร็จ' }) }
  }

  async function onRenameSubfolder(sf: FormGroup) {
    const name = (await uiPrompt('ตั้งชื่อโฟลเดอร์ใหม่', { title: 'เปลี่ยนชื่อโฟลเดอร์ย่อย', defaultValue: sf.name, confirmText: 'บันทึก' }))?.trim()
    if (!name || name === sf.name) return
    try { await renameGroup(sf.id, name); reload() }
    catch { uiAlert('เปลี่ยนชื่อโฟลเดอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  async function onDeleteSubfolder(sf: FormGroup) {
    if (forms.some(f => f.groupId === sf.id)) { uiAlert('โฟลเดอร์นี้ยังมีฟอร์มอยู่ — ย้ายหรือลบฟอร์มข้างในก่อน'); return }
    if (!(await uiConfirm(`ลบโฟลเดอร์ "${sf.name}" ?`, { tone: 'danger', confirmText: 'ลบ' }))) return
    try { await deleteGroup(sf.id); reload() }
    catch { uiAlert('ลบโฟลเดอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  async function onToggleSubfolder(sf: FormGroup) {
    try { await setGroupActive(sf.id, !isActive(sf)); reload() }
    catch { uiAlert('เปลี่ยนสถานะโฟลเดอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  async function onMoveForm(form: FormSettings, to: string) {
    try { await moveForm(form.formType, to); setMoving(null); reload() }
    catch (e) { uiAlert(dbErrorMessage(e), { title: 'ย้ายฟอร์มไม่สำเร็จ' }) }
  }

  async function onCreateForm() {
    if (!groupId) return
    // The folder may have been deleted in another tab; a form created here would
    // belong to no folder and be unreachable from the dashboard.
    if (!group) { uiAlert('ไม่พบโฟลเดอร์นี้ อาจถูกลบไปแล้ว — กลับไปหน้าแรกแล้วลองใหม่', { title: 'สร้างฟอร์มไม่ได้' }); return }
    const name = (await uiPrompt('ตั้งชื่อฟอร์มใหม่', { title: 'สร้างฟอร์ม', placeholder: 'เช่น ใบเบิกค่าใช้จ่าย', confirmText: 'สร้าง' }))?.trim()
    if (!name) return
    try {
      const newId = await createForm(name, groupId)
      nav(`/form/${newId}/edit`)
    } catch (e) { uiAlert(dbErrorMessage(e), { title: 'สร้างฟอร์มไม่สำเร็จ' }) }
  }

  // A similar form starts from a copy of this one rather than from nothing.
  async function onDuplicateForm(form: FormSettings) {
    const name = (await uiPrompt('ตั้งค่าทุกอย่างคัดลอกมาด้วย · รหัสฟอร์มเว้นว่างให้ตั้งใหม่ (กันเลขที่เอกสารซ้ำ) · ฟอร์มใหม่ปิดปรับปรุงไว้ก่อน', {
      title: 'ทำสำเนาฟอร์ม', defaultValue: `${formDisplayName(form)} (สำเนา)`, confirmText: 'ทำสำเนา',
    }))?.trim()
    if (!name) return
    try {
      const newId = await duplicateForm(form, name)
      nav(`/form/${newId}/edit`)
    } catch (e) { uiAlert(dbErrorMessage(e), { title: 'ทำสำเนาฟอร์มไม่สำเร็จ' }) }
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

  // The ⋯ menu of a form: what is done now and then, out of the card's way.
  const formMenu = (form: FormSettings): RowMenuItem[] => [
    { label: 'เปลี่ยนชื่อฟอร์ม', icon: <Pencil size={16} />, onClick: () => onRenameForm(form) },
    { label: 'ทำสำเนาฟอร์ม', icon: <CopyPlus size={16} />, onClick: () => onDuplicateForm(form) },
    { label: 'ย้ายไปโฟลเดอร์อื่น', icon: <FolderInput size={16} />, onClick: () => setMoving(form) },
    { label: 'ลบฟอร์ม', icon: <Trash2 size={16} />, onClick: () => onDeleteForm(form), danger: true },
  ]
  // Settings, the one a card is most often opened for, stays in sight.
  const formActions = (form: FormSettings) => (
    <span className="flex items-center gap-1" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
      <ActionIconButton label="ตั้งค่าฟอร์ม" icon={<Settings size={16} />} onClick={() => nav(`/form/${form.formType}/edit`)} />
      <RowMenu items={formMenu(form)} label={`ตัวเลือกของ ${formDisplayName(form)}`} />
    </span>
  )
  const activeLabel = (form: FormSettings) => (
    <span className={`whitespace-nowrap text-xs font-medium ${isActive(form) ? 'text-olive-600' : 'text-stone-400'}`}>{isActive(form) ? 'เปิดใช้งาน' : 'ปิดปรับปรุง'}</span>
  )
  const sectionTitle = (title: string, n: number) => (
    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-700">
      {title}<span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">{n}</span>
    </h2>
  )
  const empty = (text: string) => (
    <div className="rounded-xl border border-dashed border-stone-300 bg-white px-4 py-10 text-center text-sm text-stone-500">{text}</div>
  )
  const hasAnything = groupForms.length > 0 || subfolders.length > 0

  return (
    <div>
      <PageHeader
        onBack={() => nav(parent ? `/group/${parent.id}` : '/')}
        icon={<Folder size={20} />}
        title={group?.name ?? 'กลุ่มฟอร์ม'}
        subtitle={[
          parent && `ใน ${parent.name}`,
          subfolders.length > 0 && `${subfolders.length} โฟลเดอร์`,
          `${groupForms.length} ฟอร์ม`,
        ].filter(Boolean).join(' · ')}
        actions={isAdmin && (
          <>
            {group && <ActionIconButton label={parent ? 'เปลี่ยนชื่อโฟลเดอร์' : 'เปลี่ยนชื่อกลุ่ม'} icon={<Pencil size={16} />} onClick={onRenameGroup} />}
            {canAddSubfolder && (
              <button onClick={onCreateSubfolder} className={ui.btnSecondary}>
                <FolderPlus size={16} /> โฟลเดอร์ย่อย
              </button>
            )}
            <button onClick={onCreateForm} className={ui.btnPrimary}>
              <Plus size={16} /> สร้างฟอร์ม
            </button>
          </>
        )}
      />

      {/* One bar for the whole page: the search finds sub-folders and forms alike */}
      {hasAnything && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 sm:max-w-sm">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={subfolders.length > 0 ? 'ค้นหาโฟลเดอร์ / ชื่อฟอร์ม / รหัสฟอร์ม' : 'ค้นหาชื่อฟอร์ม / รหัสฟอร์ม'}
              aria-label="ค้นหา"
              className={`${ui.input} pl-9`}
            />
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <select
              value={sort.key}
              onChange={e => setSort(s => ({ ...s, key: e.target.value as FormSortKey }))}
              aria-label="เรียงตาม"
              title="เรียงตาม"
              className={ui.input + ' !w-auto'}
            >
              {(Object.keys(FORM_SORT_LABELS) as FormSortKey[]).map(k => <option key={k} value={k}>เรียงตาม{FORM_SORT_LABELS[k]}</option>)}
            </select>
            <button
              type="button"
              onClick={() => setSort(s => ({ ...s, dir: nextDir }))}
              title={sort.dir === 'asc' ? 'เรียงจากน้อยไปมาก — คลิกเพื่อสลับ' : 'เรียงจากมากไปน้อย — คลิกเพื่อสลับ'}
              aria-label={sort.dir === 'asc' ? 'เรียงจากน้อยไปมาก' : 'เรียงจากมากไปน้อย'}
              className={`${ui.btnSecondary} whitespace-nowrap`}
            >
              {sort.dir === 'asc' ? <ArrowUpNarrowWide size={16} /> : <ArrowDownWideNarrow size={16} />}
              {dirLabel(sort.key, sort.dir)}
            </button>
            <div className="flex overflow-hidden rounded-xl border border-stone-200/60 bg-white">
              {([['card', LayoutGrid, 'มุมมองการ์ด'], ['list', List, 'มุมมองรายการ']] as const).map(([v, Icon, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  aria-label={label}
                  aria-pressed={view === v}
                  title={label}
                  className={`flex h-[42px] w-11 items-center justify-center transition-colors ${view === v ? 'bg-clay-600 text-white' : 'text-stone-500 hover:bg-stone-50'}`}
                >
                  <Icon size={16} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sub-folders first, the same cards as the folders on the first page */}
      {shownSubfolders.length > 0 && (
        <section className="mb-7">
          {sectionTitle('โฟลเดอร์ย่อย', shownSubfolders.length)}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {shownSubfolders.map(sf => (
              <FolderCard
                key={sf.id}
                name={sf.name}
                count={formsIn(sf.id).length}
                active={isActive(sf)}
                isAdmin={isAdmin}
                noun="โฟลเดอร์"
                onOpen={() => nav(`/group/${sf.id}`)}
                onToggle={() => onToggleSubfolder(sf)}
                onRename={() => onRenameSubfolder(sf)}
                onDelete={() => onDeleteSubfolder(sf)}
              />
            ))}
          </div>
        </section>
      )}

      {(groupForms.length > 0 || !hasAnything) && (
        <section>
          {subfolders.length > 0 && sectionTitle('ฟอร์ม', shownForms.length)}

          {view === 'card' && shownForms.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {shownForms.map(form => {
                const stamp = showCreated ? form.createdAt : form.updatedAt
                return (
                  <div
                    key={form.formType}
                    role="button"
                    tabIndex={0}
                    onClick={() => nav(`/form/${form.formType}`)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nav(`/form/${form.formType}`) } }}
                    className={`flex cursor-pointer flex-col rounded-xl border border-stone-200 bg-white p-5 transition hover:border-stone-300 hover:shadow-md ${isAdmin && !isActive(form) ? 'opacity-60' : ''}`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-clay-50 text-clay-600"><FileText size={20} /></div>
                      {isAdmin && formActions(form)}
                    </div>
                    <div className="font-medium text-stone-900">{formDisplayName(form)}</div>
                    <div className="text-sm text-stone-500">{form.formCode || '—'}</div>
                    {!!stamp && (
                      <div className="mt-1 text-xs text-stone-500">{showCreated ? 'สร้างเมื่อ' : 'แก้ไขล่าสุด'} {formatDate(stamp)}</div>
                    )}
                    {isAdmin && (
                      <div className="mt-auto flex items-center gap-2 pt-3" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
                        <Switch on={isActive(form)} onChange={() => onToggleForm(form)} />
                        {activeLabel(form)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {view === 'list' && shownForms.length > 0 && (
            <div className={ui.tableWrap}>
              <ul className="divide-y divide-stone-100">
                {shownForms.map(form => {
                  const stamp = showCreated ? form.createdAt : form.updatedAt
                  return (
                    <li
                      key={form.formType}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-stone-50 ${isAdmin && !isActive(form) ? 'opacity-60' : ''}`}
                    >
                      <button
                        type="button"
                        onClick={() => nav(`/form/${form.formType}`)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-clay-50 text-clay-600"><FileText size={18} /></span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-stone-900">{formDisplayName(form)}</span>
                          <span className="block truncate text-xs text-stone-500">
                            {form.formCode}
                            {!!stamp && ` · ${showCreated ? 'สร้างเมื่อ' : 'แก้ไขล่าสุด'} ${formatDate(stamp)}`}
                          </span>
                        </span>
                      </button>
                      {isAdmin && (
                        <div className="flex shrink-0 items-center gap-2">
                          <Switch on={isActive(form)} onChange={() => onToggleForm(form)} />
                          <span className="hidden w-[4.5rem] sm:inline">{activeLabel(form)}</span>
                          {formActions(form)}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {!hasAnything && empty('ยังไม่มีฟอร์มในกลุ่มนี้')}
          {groupForms.length > 0 && shownForms.length === 0 && shownSubfolders.length === 0 && empty(`ไม่พบโฟลเดอร์หรือฟอร์มที่ตรงกับ “${query}”`)}
          {groupForms.length > 0 && shownForms.length === 0 && shownSubfolders.length > 0 && (
            <p className="text-sm text-stone-500">ไม่มีฟอร์มที่ตรงกับ “{query}”</p>
          )}
        </section>
      )}

      {moving && (
        <MoveFormDialog
          form={moving}
          groups={groups}
          current={moving.groupId ?? firstGroupId}
          onMove={to => onMoveForm(moving, to)}
          onClose={() => setMoving(null)}
        />
      )}
    </div>
  )
}
