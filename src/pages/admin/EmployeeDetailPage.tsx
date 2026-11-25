import { uiAlert, uiConfirm } from '../../components/dialog/dialogService'
import EmptyRow from '../../components/EmptyRow'
import { PageSkeleton } from '../../components/TableSkeleton'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useGoBack } from '../../shared/useGoBack'
import { AtSign, FileText, KeyRound, Pencil, Printer, Signature, Trash2, UserRound } from 'lucide-react'
import { useAuth } from '../../auth/AuthProvider'
import { getProfileByUid } from '../../data/users'
import { listMySubmissions, submissionAmount, deleteSubmission, isSigned } from '../../data/submissions'
import { getVersionCounts, editLabel } from '../../data/versions'
import { listForms } from '../../data/formSettings'
import { listGroups } from '../../data/formGroups'
import { listCompanies } from '../../data/companies'
import { listAccessGroups } from '../../data/accessGroups'
import type { UserProfile, SubmissionSummary, FormSettings, Company, AccessGroup, FormGroup } from '../../types/schema'
import { formatDate } from '../../shared/date'
import type { Filters } from '../../shared/submissionFilter'
import { emptyFilters, applyFilters } from '../../shared/submissionFilter'
import { canManageLogin, isSuperAdmin, passwordState, PASSWORD_STATE, roleLabel, roleTone } from '../../shared/roles'
import { AVATAR_TONE, initialsOf } from '../../shared/initials'
import { chainRows, chainLength } from '../../shared/revisionChain'
import { usePagination } from '../../shared/usePagination'
import SubmissionFilterBar from '../../components/SubmissionFilterBar'
import Pagination from '../../components/Pagination'
import { ActionGroup, ActionGroupItem } from '../../components/RowActions'
import ActionIconButton from '../../components/ActionIconButton'
import StatusBadge from '../../components/StatusBadge'
import CopyButton from '../../components/CopyButton'
import SignatureField from '../../components/SignatureField'
import SetPasswordModal from '../../components/SetPasswordModal'
import ChangeUsernameModal from '../../components/ChangeUsernameModal'
import { Badge, PageHeader, SectionTitle, ui } from '../../components/ui'
import DocNumberCell from '../../components/DocNumberCell'
import { formatMoney } from '../../shared/money'
import { useLiveSubmissions } from '../../shared/liveSubmissions'

const HEADERS = [
  { label: 'เอกสาร', cls: '' },
  { label: 'วันที่', cls: '' },
  { label: 'ยอด (บาท)', cls: 'text-right' },
  { label: 'สถานะ', cls: '' },
  { label: '', cls: '' },
]

export default function EmployeeDetailPage() {
  const { uid } = useParams()
  const goBack = useGoBack()
  const { profile: me, refresh } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [subs, setSubs] = useState<SubmissionSummary[]>([])
  const [forms, setForms] = useState<FormSettings[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [groups, setGroups] = useState<AccessGroup[]>([])
  const [folders, setFolders] = useState<FormGroup[]>([])
  const [vcounts, setVcounts] = useState<Record<string, number>>({})
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [settingPassword, setSettingPassword] = useState(false)
  const [changingUsername, setChangingUsername] = useState(false)

  function loadProfile() { if (uid) getProfileByUid(uid).then(setProfile) }
  function loadSubs() { if (uid) listMySubmissions(uid).then(setSubs) }
  useLiveSubmissions(loadSubs)
  useEffect(() => {
    if (!uid) return
    loadProfile()
    loadSubs()
    getVersionCounts().then(setVcounts)
    listForms().then(setForms)
    listCompanies().then(setCompanies)
    listAccessGroups().then(setGroups)
    listGroups().then(setFolders)
  }, [uid])

  async function onDeleteSub(r: SubmissionSummary) {
    if (!(await uiConfirm(`ลบถาวร ยกเลิกไม่ได้`, { title: `ลบเอกสาร "${r.docNumber || 'ไม่มีเลขที่'}" ?`, tone: 'danger', confirmText: 'ลบ' }))) return
    try { await deleteSubmission(r.id); loadSubs() }
    catch { uiAlert('ลบเอกสารไม่สำเร็จ') }
  }
  function afterUsernameChange() {
    loadProfile()
    loadSubs()
    if (uid === me?.uid) refresh() // renamed themselves: the sidebar and session profile follow
  }

  const formName = (ft: string) => {
    const f = forms.find(x => x.formType === ft)
    return f?.name || f?.title || ft
  }
  const formGroup = (ft: string) => forms.find(f => f.formType === ft)?.groupId ?? folders[0]?.id
  const filtered = applyFilters(subs, filters, { formGroup, formName, groups: folders })
  // As on ประวัติการพิมพ์ทั้งหมด: a corrected document and its earlier rounds
  // are one line, ten lines a page.
  const chains = chainRows(filtered, subs)
  const pager = usePagination(chains, { pageSize: 10, storageKey: 'pageSize:employeeDocs' })
  function changeFilters(f: Filters) { setFilters(f); pager.setPage(1) }

  if (!profile) return (
    <PageSkeleton />
  )

  const viewerIsSuper = isSuperAdmin(me)
  // Only the Super Admin may edit the Super Admin's account, rename usernames and set others' passwords.
  const canEdit = !isSuperAdmin(profile) || viewerIsSuper
  // Any admin can hand someone a new password (and a signature); only the Super
  // Admin touches the Super Admin's own account.
  const canManage = canManageLogin(me, profile)
  const canSetPassword = canManage && profile.uid !== me?.uid
  const name = `${profile.firstName} ${profile.lastName}`.trim()
  const pw = passwordState(profile)
  const company = companies.find(c => c.id === profile.companyId)
  const details: { label: string; value?: string | null }[] = [
    { label: 'รหัสพนักงาน', value: profile.employeeId },
    { label: 'แผนก', value: profile.department },
    { label: 'บริษัท', value: company?.shortName || company?.name },
    { label: 'อีเมล', value: profile.email },
    { label: 'กลุ่มการเข้าถึง', value: groups.find(g => g.id === profile.accessGroup)?.name },
  ]

  return (
    <div>
      <PageHeader
        icon={<UserRound size={20} />}
        title={name || 'ข้อมูลพนักงาน'}
        onBack={() => goBack('/admin/employees')}
        actions={canEdit && (
          <Link to={`/admin/employees/${profile.uid}/edit`} className={ui.btnPrimary}>
            <Pencil size={16} /> แก้ไขข้อมูล
          </Link>
        )}
      />

      {/* One card, read top to bottom: who the person is, then three equal
          columns — their details, how they sign in, their signature — each a
          plain list of label and value, so nothing floats in a half-empty grid. */}
      <section className={`${ui.card} mb-8 !p-0`}>
        <div className="flex flex-wrap items-center gap-4 border-b border-stone-100 px-6 py-5">
          <span aria-hidden className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-semibold ${AVATAR_TONE}`}>
            {initialsOf(profile.firstName, profile.lastName) || '?'}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <h2 className="text-lg font-semibold text-stone-900">{name || '—'}</h2>
              {profile.nickname && <span className="text-sm text-stone-500">({profile.nickname})</span>}
            </div>
            <p className="text-sm text-stone-500">{profile.position || '—'}</p>
          </div>
          <div className="ml-auto flex flex-wrap gap-1.5">
            <Badge tone={roleTone(profile)}>{roleLabel(profile)}</Badge>
            {profile.centralStatus === 'resigned' && <Badge tone="amber">ลาออกแล้ว</Badge>}
          </div>
        </div>

        <div className="grid divide-y divide-stone-100 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          <div className="px-6 py-5">
            <h3 className="mb-3 text-sm font-semibold text-stone-900">ข้อมูลพนักงาน</h3>
            <dl className="space-y-2.5 text-sm">
              {details.map(d => (
                <div key={d.label} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3">
                  <dt className="text-stone-500">{d.label}</dt>
                  <dd className={`break-words ${d.value ? 'text-stone-900' : 'text-stone-400'}`}>{d.value || '—'}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Signing in: the username, and the password while it is still the default */}
          <div className="flex flex-col px-6 py-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-900"><KeyRound size={15} className="text-stone-500" /> เข้าสู่ระบบ</h3>
            <dl className="space-y-2.5 text-sm">
              <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3">
                <dt className="text-stone-500">ชื่อผู้ใช้</dt>
                <dd className="flex items-center gap-1 font-mono text-stone-900">{profile.employeeId}<CopyButton value={profile.employeeId} label="คัดลอกชื่อผู้ใช้" /></dd>
              </div>
              <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3">
                <dt className="text-stone-500">รหัสผ่าน</dt>
                <dd className="flex flex-wrap items-center gap-1.5">
                  {pw === 'default'
                    ? <><span className="font-mono text-stone-900">{profile.employeeId}</span><CopyButton value={profile.employeeId} label="คัดลอกรหัสผ่าน" /></>
                    : <span className="font-mono text-stone-400">••••••</span>}
                  <Badge tone={PASSWORD_STATE[pw].tone}>{PASSWORD_STATE[pw].label}</Badge>
                </dd>
              </div>
            </dl>
            {(viewerIsSuper || canSetPassword) && (
              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                {canSetPassword && <button type="button" onClick={() => setSettingPassword(true)} className={`${ui.btnSecondary} !px-3 !py-1.5`}><KeyRound size={15} /> ตั้งรหัสผ่านใหม่</button>}
                {viewerIsSuper && <button type="button" onClick={() => setChangingUsername(true)} className={`${ui.btnSecondary} !px-3 !py-1.5`}><AtSign size={15} /> แก้ชื่อผู้ใช้</button>}
              </div>
            )}
          </div>

          {/* An admin can put a signature on the account so the person can sign online. */}
          <div className="px-6 py-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-900"><Signature size={15} className="text-stone-500" /> ลายเซ็น</h3>
            <SignatureField uid={profile.uid} signature={profile.signatureImage} canEdit={canManage} onChanged={loadProfile} />
          </div>
        </div>
      </section>

      {/* Their documents — the same filter bar, table and pages as ประวัติการพิมพ์ทั้งหมด */}
      <section>
        <SectionTitle icon={<FileText size={16} />} className="mb-3">เอกสาร</SectionTitle>
        <div className="mb-4 rounded-2xl border border-stone-200/60 bg-white p-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <SubmissionFilterBar value={filters} onChange={changeFilters} forms={forms} groups={folders} formGroup={formGroup}
            resultCount={chains.length} total={chainRows(subs).length} />
        </div>
        <div className={ui.tableCard}>
          <div className={ui.tableScroll}>
            <table className={ui.table}>
              <thead className={ui.thead}>
                <tr>{HEADERS.map(h => <th key={h.label} className={`${ui.th} ${h.cls}`}>{h.label}</th>)}</tr>
              </thead>
              <tbody className={ui.tbody}>
                {pager.pageItems.map(({ latest: r, older }) => (
                  <tr key={r.id} className={ui.tr}>
                    <td className={`${ui.td} whitespace-nowrap`}>
                      {/* The form's name over its number, as on the history pages */}
                      <div className="flex items-center gap-1.5">
                        <span className="max-w-[260px] truncate font-medium text-stone-900" title={formName(r.formType)}>{formName(r.formType)}</span>
                        {older.length > 0 && (
                          <span className="rounded-md border border-stone-200 px-1.5 text-[11px] font-medium text-stone-600" title="จำนวนฉบับรวมฉบับแก้ไข">
                            {chainLength({ latest: r, older })} ฉบับ
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 font-mono text-[12px] text-stone-500"><DocNumberCell sub={r} /></div>
                    </td>
                    <td className={`${ui.td} whitespace-nowrap`}>{formatDate(r.createdAt)}</td>
                    <td className={`${ui.td} whitespace-nowrap text-right font-semibold tabular-nums text-stone-900`}>{formatMoney(submissionAmount(r))}</td>
                    <td className={`${ui.td} whitespace-nowrap`}>
                      <span className="inline-flex items-center gap-2">
                        <StatusBadge sub={r} />
                        {editLabel(r, vcounts) && <span className="text-xs text-stone-500" title="จำนวนครั้งที่แก้ไขหลังบันทึก">· {editLabel(r, vcounts)}</span>}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      <div className="flex items-center justify-end gap-2">
                        <ActionGroup>
                          {!r.voided && !isSigned(r) && <ActionGroupItem label="แก้ไขเอกสาร" to={`/submission/${r.id}`} icon={<Pencil size={15} />} />}
                          <ActionGroupItem label="ดูเอกสาร / สั่งพิมพ์" to={`/submission/${r.id}/preview`} icon={<Printer size={15} />} />
                        </ActionGroup>
                        <ActionIconButton label={`ลบเอกสาร ${r.docNumber}`} tone="red" icon={<Trash2 size={16} />} onClick={() => onDeleteSub(r)} />
                      </div>
                    </td>
                  </tr>
                ))}
                {chains.length === 0 && (
                  <EmptyRow colSpan={HEADERS.length} icon={<FileText size={20} />}>

                    {subs.length === 0 ? 'ยังไม่มีเอกสาร' : 'ไม่พบเอกสารที่ตรงกับตัวกรอง'}

                  </EmptyRow>
                )}
              </tbody>
            </table>
          </div>
          {chains.length > 0 && (
            <Pagination page={pager.page} pageCount={pager.pageCount} pageSize={pager.pageSize} from={pager.from} to={pager.to} total={pager.total}
              onPage={pager.setPage} onPageSize={pager.setPageSize} />
          )}
        </div>
      </section>

      {settingPassword && <SetPasswordModal profile={profile} onClose={() => setSettingPassword(false)} onDone={loadProfile} />}
      {changingUsername && <ChangeUsernameModal profile={profile} onClose={() => setChangingUsername(false)} onDone={afterUsernameChange} />}
    </div>
  )
}
