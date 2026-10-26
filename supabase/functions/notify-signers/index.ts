// notify-signers — emails each person a document has just been sent to for
// signing, through the company's Microsoft 365 (Microsoft Graph sendMail).
//
// Called by the app right after "ส่งเซ็น" with the requester's own login:
//   POST { submissionId, uids }  →  { sent, noEmail, failed }
// It only ever mails people who are actually waiting on that document, and
// only for a document the caller created — the uids are a hint, not trusted.
// A notice that cannot be sent never undoes the sending itself.
//
// Secrets (Supabase → Edge Functions → Secrets), see docs/email-notifications.md:
//   MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET  — the Entra ID app
//   MAIL_SENDER  — the mailbox it sends as, e.g. acc-documents@company.co.th
//   APP_URL      — optional, defaults to the production address
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { buildMail, docAmount, graphMessage, linesToNotify } from './mail.ts'
import type { DocForMail } from './mail.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const env = (k: string) => Deno.env.get(k) ?? ''

async function graphToken(): Promise<string> {
  const res = await fetch(`https://login.microsoftonline.com/${env('MS_TENANT_ID')}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env('MS_CLIENT_ID'),
      client_secret: env('MS_CLIENT_SECRET'),
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  })
  const data = await res.json()
  if (!res.ok || !data.access_token) throw new Error(`Microsoft sign-in failed: ${data.error_description ?? res.status}`)
  return data.access_token
}

async function sendMail(token: string, to: string, subject: string, html: string): Promise<void> {
  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(env('MAIL_SENDER'))}/sendMail`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(graphMessage(to, subject, html)),
  })
  if (!res.ok) throw new Error(`sendMail ${res.status}: ${(await res.text()).slice(0, 300)}`)
}

const fullName = (p?: { firstName?: string; lastName?: string } | null) =>
  `${p?.firstName ?? ''} ${p?.lastName ?? ''}`.trim()

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  for (const k of ['MS_TENANT_ID', 'MS_CLIENT_ID', 'MS_CLIENT_SECRET', 'MAIL_SENDER']) {
    if (!env(k)) return json({ error: `secret ${k} is not set` }, 500)
  }

  const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Who is asking: the requester's own session token.
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: who, error: whoErr } = await admin.auth.getUser(jwt)
  if (whoErr || !who.user) return json({ error: 'not signed in' }, 401)

  let body: { submissionId?: string; uids?: string[] }
  try { body = await req.json() } catch { return json({ error: 'bad body' }, 400) }
  if (!body.submissionId || !Array.isArray(body.uids)) return json({ error: 'submissionId and uids required' }, 400)

  const { data: doc, error: docErr } = await admin
    .from('submissions').select('createdBy,docNumber,formType,signatures,totals')
    .eq('id', body.submissionId).maybeSingle()
  if (docErr || !doc) return json({ error: 'document not found' }, 404)
  if (doc.createdBy !== who.user.id) return json({ error: 'not your document' }, 403)

  const lines = linesToNotify(doc as DocForMail, body.uids)
  if (lines.length === 0) return json({ sent: 0, noEmail: [], failed: [] })

  const [{ data: people, error: peopleErr }, { data: form }] = await Promise.all([
    admin.from('profiles').select('uid,firstName,lastName,email').in('uid', [doc.createdBy, ...lines.map(l => l.assignedUid)]),
    admin.from('form_settings').select('*').eq('formType', doc.formType).maybeSingle(),
  ])
  // No email column yet (supabase/2026-10-26-employee-email.sql not run): nobody to mail.
  if (peopleErr) return json({ sent: 0, noEmail: lines.map(l => l.assignedName), failed: [], error: peopleErr.message })
  const byUid = new Map((people ?? []).map(p => [p.uid, p]))

  const noEmail: string[] = []
  const failed: string[] = []
  let sent = 0
  let token: string | null = null
  for (const line of lines) {
    const person = byUid.get(line.assignedUid)
    const to = String(person?.email ?? '').trim()
    if (!to) { noEmail.push(line.assignedName); continue }
    const { subject, html } = buildMail({
      recipientName: fullName(person) || line.assignedName,
      requesterName: fullName(byUid.get(doc.createdBy)) || 'ผู้เบิก',
      docNumber: doc.docNumber,
      formName: form?.name || form?.title || '',
      blockLabel: line.blockLabel,
      amount: docAmount(doc as DocForMail),
      appUrl: env('APP_URL') || 'https://acc-form-system.vercel.app',
    })
    try {
      token ??= await graphToken()
      await sendMail(token, to, subject, html)
      sent++
    } catch (e) {
      console.error(`notify ${line.assignedUid}:`, e)
      failed.push(line.assignedName)
    }
  }
  return json({ sent, noEmail, failed })
})
