// sync-employees — copies the company's employee master (IT Asset Management
// project, report.employees) onto this system's profiles.
//
//   POST {}               →  SyncSummary   (dryRun: true previews without writing)
//
// Who may call it: an admin of this system (the button on ข้อมูลพนักงาน), or a
// scheduled job using this project's service role key. Logins stay this
// system's own: nobody is created, banned or deleted here — people with no
// login yet and people who have left are only listed for an admin to act on.
//
// Secrets (Supabase → Edge Functions → Secrets), see docs/central-employees.md:
//   CENTRAL_URL         https://wvxjhjcliusgsfyqfqnh.supabase.co
//   CENTRAL_ANON_KEY    that project's anon / publishable key
//   CENTRAL_FEED_TOKEN  the token supabase/central/2026-11-20-acc-employee-feed.sql printed
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { bangkokToday, CENTRAL_FIELDS, planSync } from './plan.ts'
import type { CentralEmployee, CentralField, LocalCompany, LocalProfile } from './plan.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
const env = (k: string) => Deno.env.get(k) ?? ''

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
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  let by = 'schedule'
  if (jwt !== env('SUPABASE_SERVICE_ROLE_KEY')) {
    const { data: u } = await admin.auth.getUser(jwt)
    if (!u?.user) return json({ error: 'ต้องเข้าสู่ระบบก่อน' }, 401)
    const { data: me } = await admin.from('profiles').select('role,"employeeId"').eq('uid', u.user.id).maybeSingle()
    if (me?.role !== 'admin') return json({ error: 'เฉพาะผู้ดูแลระบบ' }, 403)
    by = me.employeeId
  }
  const { dryRun = false } = await req.json().catch(() => ({})) as { dryRun?: boolean }

  // The columns this database has: centralFields/centralStatus come with
  // supabase/2026-11-20-central-employees.sql, email with 2026-10-26-employee-email.sql.
  const base = 'uid,"employeeId","firstName","lastName",position,department,"companyId"'
  let { data: profiles, error } = await admin.from('profiles').select(`${base},email,"centralStatus","centralFields"`)
  let fields: readonly CentralField[] = CENTRAL_FIELDS
  if (error?.code === '42703') {
    const probe = await admin.from('profiles').select(`${base},"centralStatus","centralFields"`)
    if (probe.error?.code === '42703') return json({ error: 'MIGRATION_MISSING' }, 409)
    ;({ data: profiles, error } = probe)
    fields = CENTRAL_FIELDS.filter(f => f !== 'email')
  }
  if (error) return json({ error: error.message }, 500)
  const { data: companies } = await admin.from('companies').select('id,name,"shortName"')

  let central: CentralEmployee[]
  try { central = await fetchCentral() }
  catch (e) {
    const msg = (e as Error).message
    return json({ error: msg === 'NOT_CONFIGURED' ? 'NOT_CONFIGURED' : msg }, msg === 'NOT_CONFIGURED' ? 409 : 502)
  }
  if (central.length === 0) return json({ error: 'CENTRAL_EMPTY' }, 502) // never mark everyone missing on a bad read

  const plan = planSync(central, (profiles ?? []) as LocalProfile[], (companies ?? []) as LocalCompany[], bangkokToday(), fields)
  const failed: { employeeId: string; error: string }[] = []
  const now = Date.now()
  if (!dryRun) {
    for (const p of plan.patches) {
      const { error: e } = await admin.from('profiles').update({ ...p.set, centralSyncedAt: now }).eq('uid', p.uid)
      if (e) failed.push({ employeeId: p.employeeId, error: e.message })
    }
  }

  const summary = {
    dryRun,
    ranAt: now,
    centralCount: central.length,
    updated: plan.patches.filter(p => p.changed.length > 0).map(p => ({ employeeId: p.employeeId, name: p.name, changed: p.changed })),
    unchanged: plan.unchanged,
    notInCentral: plan.notInCentral,
    notHere: plan.notHere,
    resigned: plan.resigned,
    unknownCompanies: plan.unknownCompanies,
    failed,
  }
  if (!dryRun) {
    await admin.from('employee_sync_runs').insert({ ranAt: now, by, ok: failed.length === 0, summary })
  }
  return json(summary)
})
