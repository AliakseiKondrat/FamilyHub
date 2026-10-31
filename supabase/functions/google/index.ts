// Family Hub ⇄ Google Calendar (several calendars) + Google Tasks, two-way.
//  POST { action: 'status' | 'start' | 'sync' | 'settings' | 'disconnect' }  with the user's JWT (sync also via x-cron-secret)
//  GET  ?code&state                                                           OAuth redirect from Google
// Needs edge function secrets GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (set in the Supabase dashboard).
import { createClient } from 'npm:@supabase/supabase-js@2'

type Role = 'a' | 'j'
type Mode = 'full' | 'busy' | 'off'
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void }
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') ?? ''
const CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? ''
const SELF = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google`
const APP_URL = 'https://aliakseikondrat.github.io/FamilyHub/'
const SCOPES = 'openid email https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/tasks'
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' }
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

let cronSecret: Promise<string> | null = null
const secret = () => (cronSecret ??= sb.rpc('get_app_secret', { secret_name: 'cron_secret' }).then((r) => r.data as string))

async function roleFromJwt(req: Request): Promise<Role | null> {
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: u } = await sb.auth.getUser(jwt)
  if (!u.user?.email) return null
  const { data: m } = await sb.from('members').select('role').ilike('email', u.user.email).maybeSingle()
  return (m?.role as Role) ?? null
}

/* ---------- signed OAuth state ---------- */
async function hmac(data: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(await secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/[+/=]/g, '')
}
const makeState = async (role: Role) => { const p = `${role}.${Date.now()}`; return `${p}.${await hmac(p)}` }
async function readState(state: string): Promise<Role | null> {
  const [role, ts, sig] = state.split('.')
  if (!role || !ts || sig !== (await hmac(`${role}.${ts}`)) || Date.now() - Number(ts) > 15 * 60000) return null
  return role as Role
}

/* ---------- Google HTTP ---------- */
async function accessToken(refresh: string) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, refresh_token: refresh, grant_type: 'refresh_token' }),
  })
  const j = await r.json()
  if (!j.access_token) throw new Error(j.error_description ?? j.error ?? 'token refresh failed')
  return j.access_token as string
}
async function g(token: string, url: string, init: RequestInit = {}) {
  const r = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) } })
  if (r.status === 204 || r.status === 410 || (init.method === 'DELETE' && r.status === 404)) return null
  const j = await r.json()
  if (!r.ok) throw new Error(`${r.status} ${j.error?.message ?? ''}`)
  return j
}
const calUrl = (cal: string) => `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal)}/events`
const TASKS = 'https://tasks.googleapis.com/tasks/v1/lists/@default/tasks'
// Event mapping ids carry their calendar: "<calendarId>|<eventId>".
const splitGid = (gid: string) => { const i = gid.lastIndexOf('|'); return i < 0 ? ['primary', gid] : [gid.slice(0, i), gid.slice(i + 1)] }
const short = (s: string) => { let h = 5381; for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0; return h.toString(36) }

async function calendarList(token: string) {
  const j = await g(token, 'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250')
  return ((j?.items ?? []) as any[]).map((c) => ({
    id: c.id as string, summary: (c.summaryOverride ?? c.summary) as string, color: c.backgroundColor as string,
    primary: !!c.primary, writable: c.accessRole === 'owner' || c.accessRole === 'writer', freeBusyOnly: c.accessRole === 'freeBusyReader',
  }))
}

/* ---------- mapping between Family Hub and Google ---------- */
const addDay = (d: string, n: number) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10) }
const RRULE: Record<string, string> = { daily: 'RRULE:FREQ=DAILY', weekly: 'RRULE:FREQ=WEEKLY', monthly: 'RRULE:FREQ=MONTHLY', yearly: 'RRULE:FREQ=YEARLY' }
const repeatFrom = (rec?: string[]) => {
  const f = rec?.find((x) => x.startsWith('RRULE:'))?.match(/FREQ=(\w+)/)?.[1]
  return f === 'DAILY' ? 'daily' : f === 'WEEKLY' ? 'weekly' : f === 'MONTHLY' ? 'monthly' : f === 'YEARLY' ? 'yearly' : 'none'
}
function eventToGoogle(d: any, tz: string) {
  const body: any = { summary: d.title, description: d.notes ?? '' }
  if (d.time) {
    const end = d.endTime && d.endTime > d.time ? d.endTime : `${String(Math.min(23, Number(d.time.slice(0, 2)) + 1)).padStart(2, '0')}:${d.time.slice(3)}`
    body.start = { dateTime: `${d.date}T${d.time}:00`, timeZone: tz }
    body.end = { dateTime: `${d.endDate ?? d.date}T${end}:00`, timeZone: tz }
  } else {
    body.start = { date: d.date }
    body.end = { date: addDay(d.endDate ?? d.date, 1) }
  }
  body.recurrence = RRULE[d.repeat] ? [RRULE[d.repeat]] : []
  return body
}
function eventFromGoogle(e: any, cal: { summary: string; color: string; writable: boolean }, mode: Mode) {
  const allDay = !!e.start?.date
  const date = allDay ? e.start.date : e.start.dateTime.slice(0, 10)
  const endDate = allDay ? addDay(e.end.date, -1) : e.end?.dateTime?.slice(0, 10)
  const busy = mode === 'busy'
  return {
    // "Busy" calendars keep only the time slot — no title or notes leave Google.
    title: busy ? '' : e.summary ?? '(без названия)', notes: busy ? undefined : e.description || undefined, date,
    endDate: endDate && endDate !== date ? endDate : undefined,
    time: allDay ? undefined : e.start.dateTime.slice(11, 16), endTime: allDay ? undefined : e.end?.dateTime?.slice(11, 16),
    repeat: repeatFrom(e.recurrence), busy: busy || undefined, calendar: cal.summary, color: cal.color,
    readonly: busy || !cal.writable || undefined,
  }
}
const taskToGoogle = (d: any) => ({ title: d.title, notes: d.notes ?? '', status: d.done ? 'completed' : 'needsAction', due: d.due ? `${d.due}T00:00:00.000Z` : null })
const taskFromGoogle = (t: any) => ({ title: t.title || '(без названия)', notes: t.notes || undefined, due: t.due?.slice(0, 10), done: t.status === 'completed' })

/* ---------- the sync ---------- */
async function syncRole(acc: any) {
  const role = acc.role as Role
  const start = new Date().toISOString()
  const since: string | null = acc.last_sync
  const token = await accessToken(acc.refresh_token)
  const { data: settings } = await sb.from('records').select('data').eq('id', 'meta:settings').maybeSingle()
  const tz = settings?.data?.country === 'ES' ? 'Europe/Madrid' : 'Europe/Warsaw'
  const modes: Record<string, Mode> = acc.calendars ?? { primary: 'full' }
  const cals = await calendarList(token)
  const calById = (id: string) => cals.find((c) => c.id === id || (id === 'primary' && c.primary))
  const writeCal = acc.write_calendar ?? 'primary'
  const { data: mapRows } = await sb.from('google_map').select('*').eq('role', role)
  const byLocal = new Map((mapRows ?? []).map((m) => [`${m.kind}:${m.local_id}`, m.google_id]))
  const byGoogle = new Map((mapRows ?? []).map((m) => [`${m.kind}:${m.google_id}`, m.local_id]))
  const pushed = new Set<string>()

  // 1. Local → Google: everything of mine that changed since the last run.
  let q = sb.from('records').select('id,collection,data,deleted,private_to,surprise_for,updated_at').in('collection', acc.sync_tasks ? ['events', 'tasks'] : ['events'])
  if (since) q = q.gt('updated_at', since)
  const { data: changed } = await q
  for (const r of changed ?? []) {
    if (r.private_to && r.private_to !== role) continue
    if (r.surprise_for === role) continue
    const d = r.data ?? {}
    if (d.readonly) continue // busy / read-only calendars are never written back
    const kind = r.collection === 'events' ? 'event' : 'task'
    const mine = kind === 'event' ? d.who === role || d.who === 'both' : d.assignee === role || d.assignee === 'both'
    const gid = byLocal.get(`${kind}:${r.id}`)
    const url = kind === 'event' ? (gid ? calUrl(splitGid(gid)[0]) : calUrl(writeCal)) : TASKS
    const remoteId = gid ? (kind === 'event' ? splitGid(gid)[1] : gid) : undefined
    if (r.deleted || !mine) {
      if (gid) {
        await g(token, `${url}/${encodeURIComponent(remoteId!)}`, { method: 'DELETE' }).catch(() => null)
        await sb.from('google_map').delete().match({ role, kind, google_id: gid })
      }
      continue
    }
    const body = kind === 'event' ? eventToGoogle(d, tz) : taskToGoogle(d)
    if (gid) {
      await g(token, `${url}/${encodeURIComponent(remoteId!)}`, { method: 'PATCH', body: JSON.stringify(body) })
      pushed.add(gid)
    } else {
      const created = await g(token, url, { method: 'POST', body: JSON.stringify(body) })
      if (created?.id) {
        const newGid = kind === 'event' ? `${writeCal}|${created.id}` : created.id
        await sb.from('google_map').insert({ role, kind, local_id: r.id, google_id: newGid })
        byGoogle.set(`${kind}:${newGid}`, r.id)
        pushed.add(newGid)
      }
    }
  }

  // 2. Google → local: each chosen calendar (first run: two months back, a year ahead).
  const now = Date.now()
  for (const [calId, mode] of Object.entries(modes)) {
    if (mode === 'off') continue
    const cal = calById(calId)
    if (!cal) continue
    const params = new URLSearchParams({ maxResults: '2500', showDeleted: 'true', singleEvents: 'false' })
    if (since) params.set('updatedMin', since)
    else { params.set('timeMin', new Date(now - 60 * 86400000).toISOString()); params.set('timeMax', new Date(now + 400 * 86400000).toISOString()) }
    let pageToken: string | undefined
    do {
      if (pageToken) params.set('pageToken', pageToken)
      const page = await g(token, `${calUrl(calId)}?${params}`)
      for (const e of page?.items ?? []) {
        const gid = `${calId}|${e.id}`
        if (pushed.has(gid) || e.recurringEventId) continue
        await applyRemote(role, 'event', gid, e.status === 'cancelled' ? null : eventFromGoogle(e, cal, mode), byGoogle, acc.share_events, short(calId))
      }
      pageToken = page?.nextPageToken
    } while (pageToken)
  }

  // 3. Google → local: tasks.
  if (acc.sync_tasks) {
    const tp = new URLSearchParams({ maxResults: '100', showCompleted: 'true', showHidden: 'true', showDeleted: 'true' })
    if (since) tp.set('updatedMin', since)
    let tPage: string | undefined
    do {
      if (tPage) tp.set('pageToken', tPage)
      const page = await g(token, `${TASKS}?${tp}`)
      for (const t of page?.items ?? []) {
        if (pushed.has(t.id)) continue
        await applyRemote(role, 'task', t.id, t.deleted ? null : taskFromGoogle(t), byGoogle, acc.share_events, '')
      }
      tPage = page?.nextPageToken
    } while (tPage)
  }

  await sb.from('google_accounts').update({ last_sync: start, last_error: null }).eq('role', role)
  await ensureWatches(role, token, Object.entries(modes).filter(([, m]) => m !== 'off').map(([c]) => c))
}

/** Create, update or delete the local record that mirrors a Google item. */
async function applyRemote(role: Role, kind: 'event' | 'task', gid: string, fields: any | null, byGoogle: Map<string, string>, share: boolean, calTag: string) {
  const localId = byGoogle.get(`${kind}:${gid}`)
  const collection = kind === 'event' ? 'events' : 'tasks'
  if (!fields) {
    if (localId) {
      await sb.from('records').update({ deleted: true }).eq('id', localId)
      await sb.from('google_map').delete().match({ role, kind, google_id: gid })
    }
    return
  }
  if (localId) {
    const { data: rec } = await sb.from('records').select('data,deleted').eq('id', localId).maybeSingle()
    // Only write when something really changed, so our own pushes don't bounce back and forth.
    const same = rec && !rec.deleted && Object.entries(fields).every(([k, v]) => (rec.data[k] ?? undefined) === (v ?? undefined))
    if (rec && !same) await sb.from('records').update({ data: { ...rec.data, ...fields }, deleted: false }).eq('id', localId)
    return
  }
  const remoteId = kind === 'event' ? splitGid(gid)[1] : gid
  const id = (kind === 'event' ? `g-${role}-${calTag}-${remoteId}` : `gt-${role}-${remoteId}`).slice(0, 120)
  const base = { id, createdBy: role, createdAt: new Date().toISOString(), source: 'google' }
  const data = kind === 'event' ? { ...base, who: role, ...fields } : { ...base, assignee: role, repeat: 'none', ...fields }
  await sb.from('records').upsert({ id, collection, created_by: role, private_to: share ? null : role, data, deleted: false })
  await sb.from('google_map').upsert({ role, kind, local_id: id, google_id: gid })
  byGoogle.set(`${kind}:${gid}`, id)
}

/**
 * Ask Google to ping us whenever a chosen calendar changes, so edits show up in seconds instead of
 * waiting for the 10-minute cron. Channels last a week; they're renewed a day before they expire.
 */
async function ensureWatches(role: Role, token: string, calIds: string[]) {
  const { data: chans } = await sb.from('google_channels').select('*').eq('role', role)
  const soon = Date.now() + 86400000
  for (const c of chans ?? []) {
    if (!calIds.includes(c.calendar_id) || new Date(c.expiration).getTime() < soon) {
      await g(token, 'https://www.googleapis.com/calendar/v3/channels/stop', { method: 'POST', body: JSON.stringify({ id: c.channel_id, resourceId: c.resource_id }) }).catch(() => null)
      await sb.from('google_channels').delete().eq('channel_id', c.channel_id)
    }
  }
  const { data: live } = await sb.from('google_channels').select('calendar_id').eq('role', role)
  for (const cal of calIds.filter((c) => !(live ?? []).some((l) => l.calendar_id === c))) {
    try {
      const ch = await g(token, `${calUrl(cal)}/watch`, {
        method: 'POST', body: JSON.stringify({ id: crypto.randomUUID(), type: 'web_hook', address: SELF, token: role, params: { ttl: '604800' } }),
      })
      if (ch?.id) await sb.from('google_channels').insert({ channel_id: ch.id, role, calendar_id: cal, resource_id: ch.resourceId, expiration: new Date(Number(ch.expiration)).toISOString() })
    } catch { /* push channels are a bonus: the cron sync still runs */ }
  }
}

/** Drop the local copies of calendars that were switched off. */
async function forgetCalendars(role: Role, calIds: string[]) {
  if (!calIds.length) return
  const { data: rows } = await sb.from('google_map').select('local_id,google_id').eq('role', role).eq('kind', 'event')
  const gone = (rows ?? []).filter((r) => calIds.some((c) => r.google_id.startsWith(`${c}|`)))
  if (!gone.length) return
  await sb.from('records').update({ deleted: true }).in('id', gone.map((r) => r.local_id))
  await sb.from('google_map').delete().eq('role', role).eq('kind', 'event').in('google_id', gone.map((r) => r.google_id))
}

async function syncAll(only?: Role) {
  let q = sb.from('google_accounts').select('*')
  if (only) q = q.eq('role', only)
  const { data: accounts } = await q
  for (const acc of accounts ?? []) {
    try { await syncRole(acc) } catch (e) { await sb.from('google_accounts').update({ last_error: String((e as Error).message ?? e).slice(0, 300) }).eq('role', acc.role) }
  }
}

/* ---------- entry ---------- */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const url = new URL(req.url)

  // Google's change ping for a watched calendar: re-sync that person in the background.
  const channel = req.headers.get('x-goog-channel-id')
  if (channel) {
    const { data: ch } = await sb.from('google_channels').select('role').eq('channel_id', channel).maybeSingle()
    if (ch && req.headers.get('x-goog-resource-state') !== 'sync') EdgeRuntime.waitUntil(syncAll(ch.role as Role))
    return new Response('ok')
  }

  // OAuth redirect back from Google.
  if (req.method === 'GET' && (url.searchParams.has('code') || url.searchParams.has('error'))) {
    const role = await readState(url.searchParams.get('state') ?? '')
    const code = url.searchParams.get('code')
    if (!role || !code) return Response.redirect(`${APP_URL}?google=error`, 302)
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET, redirect_uri: SELF, grant_type: 'authorization_code' }),
    })
    const tok = await r.json()
    if (!tok.refresh_token) return Response.redirect(`${APP_URL}?google=error`, 302)
    let email: string | undefined
    try { email = JSON.parse(atob(tok.id_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).email } catch { /* optional */ }
    await sb.from('google_accounts').upsert({ role, email, refresh_token: tok.refresh_token, last_sync: null, last_error: null })
    await sb.from('google_map').delete().eq('role', role)
    EdgeRuntime.waitUntil(syncAll(role)) // first import keeps running after the redirect
    return Response.redirect(`${APP_URL}?google=ok`, 302)
  }

  const body = await req.json().catch(() => ({}))
  if (body.action === 'sync' && req.headers.get('x-cron-secret') === (await secret())) {
    await syncAll()
    return json({ ok: true })
  }

  const role = await roleFromJwt(req)
  if (!role) return json({ error: 'forbidden' }, 403)
  const { data: acc } = await sb.from('google_accounts').select('*').eq('role', role).maybeSingle()

  switch (body.action) {
    case 'status': {
      if (!acc) return json({ configured: !!(CLIENT_ID && CLIENT_SECRET), connected: false })
      const modes: Record<string, Mode> = acc.calendars ?? { primary: 'full' }
      let calendars: any[] = []
      try {
        calendars = (await calendarList(await accessToken(acc.refresh_token))).map((c) => ({
          ...c, mode: modes[c.id] ?? (c.primary ? modes.primary : undefined) ?? 'off',
        }))
      } catch (e) { acc.last_error = String((e as Error).message ?? e) }
      const { refresh_token: _, ...safe } = acc
      return json({ configured: true, connected: true, ...safe, calendars })
    }
    case 'start': {
      if (!CLIENT_ID) return json({ error: 'not configured' }, 400)
      const p = new URLSearchParams({ client_id: CLIENT_ID, redirect_uri: SELF, response_type: 'code', scope: SCOPES, access_type: 'offline', prompt: 'consent', state: await makeState(role) })
      return json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${p}` })
    }
    case 'sync':
      await syncAll(role)
      return json({ ok: true })
    case 'settings': {
      const patch: Record<string, unknown> = {}
      if (body.share_events !== undefined) patch.share_events = !!body.share_events
      if (body.sync_tasks !== undefined) patch.sync_tasks = !!body.sync_tasks
      if (body.write_calendar) patch.write_calendar = String(body.write_calendar)
      if (body.calendars && acc) {
        const before: Record<string, Mode> = acc.calendars ?? {}
        const after: Record<string, Mode> = body.calendars
        await forgetCalendars(role, Object.keys(before).filter((c) => before[c] !== 'off' && (after[c] ?? 'off') === 'off'))
        patch.calendars = after
        // A calendar turned on or switched between full/busy: re-read everything once.
        if (Object.keys(after).some((c) => after[c] !== 'off' && after[c] !== before[c])) patch.last_sync = null
      }
      await sb.from('google_accounts').update(patch).eq('role', role)
      if (patch.last_sync === null) EdgeRuntime.waitUntil(syncAll(role))
      return json({ ok: true })
    }
    case 'disconnect':
      await sb.from('google_channels').delete().eq('role', role)
      await sb.from('google_accounts').delete().eq('role', role)
      await sb.from('google_map').delete().eq('role', role)
      return json({ ok: true })
  }
  return json({ error: 'unknown action' }, 400)
})
