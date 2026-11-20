// What a sync changes, worked out without touching any database, so it can be
// tested on its own (plan.test.ts) and the edge function only has to apply it.
//
// The company's employee master lives in the IT Asset Management project
// (report.employees, read through public.acc_employee_feed — see
// supabase/central/2026-11-20-acc-employee-feed.sql). This system keeps its own
// profiles, tied to its own logins; a sync copies the master's details onto the
// profiles whose employee ID matches. Everything only this system knows — role,
// access group, signature, bank account, default job, passwords — is left alone.

/** One row of public.acc_employee_feed() in the central project. */
export interface CentralEmployee {
  emp_id: string | null
  company: string | null
  name_prefix: string | null
  first_name: string | null
  last_name: string | null
  position: string | null
  department: string | null
  m365_email: string | null
  resign_date: string | null   // 'yyyy-mm-dd'
}

/** The profile columns a sync reads. */
export interface LocalProfile {
  uid: string
  employeeId: string
  firstName: string
  lastName: string
  position: string
  department: string
  companyId: string
  email?: string | null
  centralStatus?: string | null
  centralFields?: string[] | null
  /** The master's values as the last sync saw them. A field is copied again
   *  only when the master's value has moved on from this — so a change typed
   *  here stays until the master itself changes that field.
   *  Absent (never synced, or a database without the column): copy them all. */
  centralValues?: Partial<Record<string, string>> | null
}

export interface LocalCompany { id: string; name: string; shortName?: string | null }

/** The profile columns the master may own. */
export const CENTRAL_FIELDS = ['firstName', 'lastName', 'position', 'department', 'companyId', 'email'] as const
export type CentralField = typeof CENTRAL_FIELDS[number]

export type CentralStatus = 'active' | 'resigned' | 'missing'

export interface ProfilePatch {
  uid: string
  employeeId: string
  name: string
  set: Partial<Record<CentralField, string>> & {
    centralStatus: CentralStatus
    centralFields: CentralField[]
    centralValues?: Partial<Record<CentralField, string>>
  }
  /** Fields whose value actually changed (for the summary). */
  changed: CentralField[]
}

export interface SyncPlan {
  patches: ProfilePatch[]
  /** Profiles whose details were already the master's. */
  unchanged: number
  /** Here, but not in the master (by employee ID). */
  notInCentral: { employeeId: string; name: string }[]
  /** In the master and still working, but with no login here yet: an account
   *  is made for each, with these details (`set`). */
  notHere: { employeeId: string; name: string; company: string; set: ProfilePatch['set'] }[]
  /** In the master with no login here, but a profile here under another
   *  employee ID has the same name or email — probably the same person, so no
   *  second account is made; an admin fixes the ID. */
  clashes: { employeeId: string; name: string; existingEmployeeId: string }[]
  /** Matched people the master says have left. */
  resigned: { employeeId: string; name: string; resignDate: string }[]
  /** Company names in the master that match no company here. */
  unknownCompanies: string[]
}

const clean = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim()
const key = (id: string | null | undefined) => clean(id).toLowerCase()

// Longest first, so นางสาว is taken before นาง.
const PREFIXES = ['นางสาว', 'น.ส.', 'นาง', 'นาย', 'Miss', 'Mrs.', 'Mrs', 'Mr.', 'Mr', 'Ms.', 'Ms']

/** The master sometimes has the title typed into the first name as well
 *  ("นางสาวพรชนก" with prefix "นางสาว"); this system keeps names without it. */
export function stripPrefix(firstName: string, prefix?: string | null): string {
  let s = clean(firstName)
  const candidates = [clean(prefix), ...PREFIXES].filter(Boolean).sort((a, b) => b.length - a.length)
  for (const p of candidates) {
    if (s.length > p.length && s.toLowerCase().startsWith(p.toLowerCase())) {
      s = s.slice(p.length).trim()
      break
    }
  }
  return s
}

/** The company here a master company name means: its id, short name or full
 *  name, case and spacing aside. Null when none or more than one match. */
export function matchCompany(name: string | null | undefined, companies: LocalCompany[]): string | null {
  const n = key(name)
  if (!n) return null
  const hits = companies.filter(c => [c.id, c.shortName, c.name].some(v => key(v) === n))
  return hits.length === 1 ? hits[0].id : null
}

/** Left on or before today (Bangkok), as report.employees.status does. */
export function hasResigned(resignDate: string | null | undefined, today: string): boolean {
  const d = clean(resignDate).slice(0, 10)
  return !!d && d <= today
}

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every(x => b.includes(x))
const sameValues = (a: Partial<Record<string, string>> | null, b: Partial<Record<string, string>>) =>
  !!a && sameSet(Object.keys(a), Object.keys(b)) && Object.keys(b).every(k => a[k] === b[k])

export function planSync(
  central: CentralEmployee[],
  profiles: LocalProfile[],
  companies: LocalCompany[],
  today: string,
  /** The fields this database can take (no email column on an older one). */
  fields: readonly CentralField[] = CENTRAL_FIELDS,
  /** The database has profiles."centralValues" (2026-11-20c-employee-edit-here.sql). */
  trackValues = false,
): SyncPlan {
  // One master row per employee ID. The view can list someone twice (moved
  // company); the row still working wins, then the later start.
  const byId = new Map<string, CentralEmployee>()
  for (const c of central) {
    const k = key(c.emp_id)
    if (!k) continue
    const prev = byId.get(k)
    if (!prev || (hasResigned(prev.resign_date, today) && !hasResigned(c.resign_date, today))) byId.set(k, c)
  }

  const plan: SyncPlan = { patches: [], unchanged: 0, notInCentral: [], notHere: [], clashes: [], resigned: [], unknownCompanies: [] }
  const unknown = new Set<string>()
  const matched = new Set<string>()

  // The master's details for one person. A field is the master's only when the
  // master has a value for it; an empty one there never blanks what was typed here.
  function values(c: CentralEmployee): Partial<Record<CentralField, string>> {
    const wanted: Partial<Record<CentralField, string>> = {}
    const first = stripPrefix(clean(c.first_name), c.name_prefix)
    if (first) wanted.firstName = first
    if (clean(c.last_name)) wanted.lastName = clean(c.last_name)
    if (clean(c.position)) wanted.position = clean(c.position)
    if (clean(c.department)) wanted.department = clean(c.department)
    if (clean(c.m365_email)) wanted.email = clean(c.m365_email).toLowerCase()
    const companyId = matchCompany(c.company, companies)
    if (companyId) wanted.companyId = companyId
    else if (clean(c.company)) unknown.add(clean(c.company))
    for (const f of CENTRAL_FIELDS) if (!fields.includes(f)) delete wanted[f]
    return wanted
  }

  for (const p of profiles) {
    const name = `${p.firstName} ${p.lastName}`.trim()
    const c = byId.get(key(p.employeeId))
    if (!c) {
      plan.notInCentral.push({ employeeId: p.employeeId, name })
      // Once taken from the master, now gone from it: hand the fields back.
      if (p.centralStatus !== 'missing' || (p.centralFields?.length ?? 0) > 0) {
        plan.patches.push({ uid: p.uid, employeeId: p.employeeId, name, set: { centralStatus: 'missing', centralFields: [] }, changed: [] })
      }
      continue
    }
    matched.add(key(p.employeeId))

    const wanted = values(c)
    const owned = CENTRAL_FIELDS.filter(f => f in wanted)
    // Copy a field only when the master changed it since the last sync (or
    // there is no record of the last sync): an edit made here survives until then.
    const seen = trackValues ? p.centralValues ?? null : null
    const copy = owned.filter(f => !seen || seen[f] !== wanted[f])
    const changed = copy.filter(f => (p[f] ?? '') !== wanted[f])
    const left = hasResigned(c.resign_date, today)
    const status: CentralStatus = left ? 'resigned' : 'active'
    if (left) plan.resigned.push({ employeeId: p.employeeId, name: `${wanted.firstName ?? p.firstName} ${wanted.lastName ?? p.lastName}`.trim(), resignDate: clean(c.resign_date).slice(0, 10) })

    const valuesMoved = trackValues && !sameValues(seen, wanted)
    if (changed.length === 0 && !valuesMoved && p.centralStatus === status && sameSet(p.centralFields ?? [], owned)) {
      plan.unchanged++
      continue
    }
    const set: ProfilePatch['set'] = { centralStatus: status, centralFields: owned }
    for (const f of copy) set[f] = wanted[f]
    if (trackValues) set.centralValues = wanted
    plan.patches.push({ uid: p.uid, employeeId: p.employeeId, name, set, changed })
  }

  // Profiles under an ID the master does not have — where a duplicate would come from.
  const unmatched = profiles.filter(p => !byId.has(key(p.employeeId)))
  for (const [k, c] of byId) {
    if (matched.has(k) || hasResigned(c.resign_date, today)) continue
    const wanted = values(c)
    const name = `${wanted.firstName ?? ''} ${wanted.lastName ?? ''}`.trim()
    const email = clean(c.m365_email).toLowerCase()
    const twin = unmatched.find(p =>
      (name && key(`${p.firstName} ${p.lastName}`) === key(name)) || (email && clean(p.email).toLowerCase() === email))
    if (twin) {
      plan.clashes.push({ employeeId: clean(c.emp_id), name, existingEmployeeId: twin.employeeId })
      continue
    }
    plan.notHere.push({
      employeeId: clean(c.emp_id),
      name,
      company: clean(c.company),
      set: { ...wanted, centralStatus: 'active', centralFields: CENTRAL_FIELDS.filter(f => f in wanted), ...(trackValues ? { centralValues: wanted } : {}) },
    })
  }
  plan.notHere.sort((a, b) => a.employeeId.localeCompare(b.employeeId))
  plan.unknownCompanies = [...unknown].sort()
  return plan
}

/** The login email for an employee ID — the same as src/data/auth.ts
 *  employeeIdToEmail (a test keeps the two together). */
export function loginEmail(employeeId: string): string {
  const local = employeeId.trim().replace(/[^A-Za-z0-9._-]/gu, c => '+' + c.codePointAt(0)!.toString(16))
  return `${local}@globe.local`
}

/** Today in Bangkok, 'yyyy-mm-dd'. */
export function bangkokToday(now = new Date()): string {
  return new Date(now.getTime() + 7 * 3600_000).toISOString().slice(0, 10)
}
