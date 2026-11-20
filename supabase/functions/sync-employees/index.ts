// sync-employees — copies the company's employee master (IT Asset Management
// project, report.employees) into this system, one way only: nothing here is
// ever written back to the master.
//
//   POST {}                →  SyncSummary   (dryRun: true previews without writing)
//
// What a sync does:
//   • people already here (same employee ID): name, position, department,
//     company and email are replaced by the master's
//   • people in the master, still working, with no login here: a login is made
//     (username and first password = employee ID, changed at first sign-in)
//   • people who have left: marked, never deleted or locked out
//
// Who may call it (deployed with verify_jwt = false, see supabase/config.toml —
// it checks the caller itself):
//   • it-asset, the moment an employee is added/changed/removed, and hourly:
//     header x-sync-secret = its acc_feed_token, the same as CENTRAL_FEED_TOKEN
//     here (supabase/central/2026-11-20b-acc-employee-realtime.sql)
//   • an admin of this system: the button on ข้อมูลพนักงาน
//
// Secrets (Supabase → Edge Functions → Secrets), see docs/central-employees.md:
//   CENTRAL_URL         https://wvxjhjcliusgsfyqfqnh.supabase.co
//   CENTRAL_ANON_KEY    that project's anon / publishable key
//   CENTRAL_FEED_TOKEN  the token supabase/central/2026-11-20-acc-employee-feed.sql printed
//   SYNC_SECRET         optional: another secret accepted as x-sync-secret
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { bangkokToday, CENTRAL_FIELDS, loginEmail, planSync } from './plan.ts'
import type { CentralEmployee, CentralField, LocalCompany, LocalProfile } from './plan.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
// A pasted secret easily picks up a space, a line break or quotes.
const env = (k: string) => (Deno.env.get(k) ?? '').trim().replace(/^["']|["']$/g, '')

const PAGE = 1000 // the central Data API's max rows per request

async function fetchCentral(): Promise<CentralEmployee[]> {
  const url = env('CENTRAL_URL').replace(/\/+$/, '')
  const anon = env('CENTRAL_ANON_KEY')
  const token = env('CENTRAL_FEED_TOKEN')
  if (!url || !anon || !token) throw new Error('NOT_CONFIGURED')
  const all: CentralEmployee[] = []
  for (let offset = 0; ; offset += PAGE) {
    const res = await fetch(`${url}/rest/v1/rpc/acc_employee_feed?limit=${PAGE}&offset=${offset}&order=emp_id`, {
      method: 'POST',
      headers: { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const body = await res.text()
    if (!res.ok) throw new Error(`CENTRAL ${res.status}: ${body.slice(0, 300)}`)
    const rows = JSON.parse(body) as CentralEmployee[]
    all.push(...rows)
    if (rows.length < PAGE) return all
  }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })
  // it-asset's trigger sends its acc_feed_token (= CENTRAL_FEED_TOKEN here); SYNC_SECRET is optional.
  const secrets = [env('CENTRAL_FEED_TOKEN'), env('SYNC_SECRET')].filter(Boolean)
  const sent = (req.headers.get('x-sync-secret') ?? '').trim()
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  let by: string
  if (sent && secrets.includes(sent)) by = 'auto'
  else if (jwt && jwt === env('SUPABASE_SERVICE_ROLE_KEY')) by = 'schedule'
  else {
    const { data: u } = jwt ? await admin.auth.getUser(jwt) : { data: null }
    if (!u?.user) return json({ error: 'ต้องเข้าสู่ระบบก่อน' }, 401)
    const { data: me } = await admin.from('profiles').select('role,"employeeId"').eq('uid', u.user.id).maybeSingle()
    if (me?.role !== 'admin') return json({ error: 'เฉพาะผู้ดูแลระบบ' }, 403)
    by = me.employeeId
  }
  const { dryRun = false } = await req.json().catch(() => ({})) as { dryRun?: boolean }

  // Columns that come with later migrations — a sync works with whatever the
  // database has:  email (2026-10-26-employee-email.sql) · nickname
  // (2026-11-20d-employee-nickname.sql) · centralValues (2026-11-20c-employee-edit-here.sql:
  // without it every sync copies the master over what was typed here).
  const has = async (col: string) => !(await admin.from('profiles').select(`"${col}"`).limit(0)).error
  if (!(await has('centralFields'))) return json({ error: 'MIGRATION_MISSING' }, 409)
  const [hasEmail, hasNickname, trackValues] = await Promise.all([has('email'), has('nickname'), has('centralValues')])
  const fields: readonly CentralField[] = CENTRAL_FIELDS.filter(f =>
    (f !== 'email' || hasEmail) && (f !== 'nickname' || hasNickname))
  const cols = ['uid', 'employeeId', 'firstName', 'lastName', 'position', 'department', 'companyId', 'centralStatus', 'centralFields',
    ...(hasEmail ? ['email'] : []), ...(hasNickname ? ['nickname'] : []), ...(trackValues ? ['centralValues'] : [])]
  const { data: profiles, error } = await admin.from('profiles').select(cols.map(c => `"${c}"`).join(','))
  if (error) return json({ error: error.message }, 500)
  const { data: companies } = await admin.from('companies').select('id,name,"shortName"')

  let central: CentralEmployee[]
  try { central = await fetchCentral() }
  catch (e) {
    const msg = (e as Error).message
    return json({ error: msg }, msg === 'NOT_CONFIGURED' ? 409 : 502)
  }
  if (central.length === 0) return json({ error: 'CENTRAL_EMPTY' }, 502) // never mark everyone missing on a bad read

  const plan = planSync(central, (profiles ?? []) as LocalProfile[], (companies ?? []) as LocalCompany[], bangkokToday(), fields, trackValues)
  const failed: { employeeId: string; error: string }[] = []
  const created: { employeeId: string; name: string }[] = []
  const now = Date.now()

  if (!dryRun) {
    for (const p of plan.patches) {
      const { error: e } = await admin.from('profiles').update({ ...p.set, centralSyncedAt: now }).eq('uid', p.uid)
      if (e) failed.push({ employeeId: p.employeeId, error: e.message })
    }

    // New people: the same login the ข้อมูลพนักงาน page would make for them.
    for (const n of plan.notHere) {
      const { data: made, error: e1 } = await admin.auth.admin.createUser({
        email: loginEmail(n.employeeId), password: n.employeeId, email_confirm: true,
      })
      if (e1 || !made?.user) {
        const taken = /already|registered|exists/i.test(e1?.message ?? '')
        failed.push({ employeeId: n.employeeId, error: taken ? 'มีบัญชีเข้าสู่ระบบด้วยรหัสนี้อยู่แล้ว แต่ไม่มีข้อมูลพนักงาน — ลบบัญชีค้างแล้วซิงก์ใหม่' : (e1?.message ?? 'สร้างบัญชีไม่สำเร็จ') })
        continue
      }
      const { error: e2 } = await admin.from('profiles').insert({
        uid: made.user.id, employeeId: n.employeeId,
        firstName: '', lastName: '', position: '', department: '', companyId: '',
        defaultJob: '', bankAccount: '', role: 'employee',
        mustChangePassword: true, createdAt: now,
        ...n.set, centralSyncedAt: now,
      })
      if (e2) {
        await admin.auth.admin.deleteUser(made.user.id) // no login left without a profile
        failed.push({ employeeId: n.employeeId, error: e2.message })
        continue
      }
      created.push({ employeeId: n.employeeId, name: n.name })
    }
  }

  const updated = plan.patches.filter(p => p.changed.length > 0).map(p => ({ employeeId: p.employeeId, name: p.name, changed: p.changed }))
  const summary = {
    dryRun,
    ranAt: now,
    centralCount: central.length,
    updated,
    unchanged: plan.unchanged,
    notInCentral: plan.notInCentral,
    notHere: plan.notHere.map(({ employeeId, name, company }) => ({ employeeId, name, company })),
    created,
    clashes: plan.clashes,
    shortIds: plan.shortIds,
    resigned: plan.resigned,
    unknownCompanies: plan.unknownCompanies,
    failed,
  }
  // Every real run is logged, automatic ones too (a trigger fires per change,
  // plus once an hour): the log is how anyone can tell the trigger works.
  if (!dryRun) {
    await admin.from('employee_sync_runs').insert({ ranAt: now, by, ok: failed.length === 0, summary })
  }
  return json(summary)
})
