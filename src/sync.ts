import { useSyncExternalStore } from 'react'
import type { RealtimeChannel, Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { getState, replaceState, setChangeHook } from './store'
import { blankState } from './demo'
import { periodDays } from './lib/cycle'
import { flushPhotoUploads } from './lib/photos'
import type { State, UserId } from './types'

/**
 * Local-first sync: the app keeps working on its local state; every local edit is diffed into
 * rows, queued in a persistent outbox and upserted to Supabase. Remote changes arrive by a full
 * pull (on start / when the app comes back to the foreground) and by Realtime in between.
 */

const COLLECTIONS = ['groceries', 'tasks', 'events', 'expenses', 'watch', 'recipes', 'petRecords', 'weights', 'notes', 'trips', 'photos', 'periods'] as const
type Coll = (typeof COLLECTIONS)[number]
/** Settings both of you share; me / lang / theme stay per device. */
const SHARED_KEYS = ['users', 'pet', 'modules', 'budgets', 'country', 'cycleLength', 'periodLength'] as const
const SETTINGS_ID = 'meta:settings'
const PERIOD_DAYS_ID = 'meta:period_days'

interface Row {
  id: string; collection: string; data: unknown; created_by: UserId
  private_to: UserId | null; surprise_for: UserId | null; reveal_at: string | null; deleted: boolean
}
type Item = { id: string; createdBy?: UserId; privateTo?: UserId; surpriseFor?: UserId; revealAt?: string; createdAt?: string }

/* ---------- auth status ---------- */
export type AuthStatus = 'loading' | 'signedOut' | 'noAccess' | 'ready'
let auth: { status: AuthStatus; email?: string; online: boolean; pending: number } = {
  status: supabase ? 'loading' : 'ready', online: navigator.onLine, pending: 0,
}
const authListeners = new Set<() => void>()
const setAuth = (patch: Partial<typeof auth>) => { auth = { ...auth, ...patch }; authListeners.forEach((l) => l()) }
export const useSync = () => useSyncExternalStore((l) => { authListeners.add(l); return () => { authListeners.delete(l) } }, () => auth)

/* ---------- outbox ---------- */
const OUTBOX_KEY = 'familyhub:outbox'
const USER_KEY = 'familyhub:user'
let outbox: Record<string, Row> = (() => { try { return JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? '{}') } catch { return {} } })()
const saveOutbox = () => {
  try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox)) } catch { /* ignore */ }
  setAuth({ pending: Object.keys(outbox).length })
}

function toRow(c: Coll, item: Item, me: UserId, deleted = false): Row {
  return {
    id: item.id, collection: c, data: item, created_by: item.createdBy ?? me,
    // Cycle data is always Julia's alone, whoever's device wrote it.
    private_to: c === 'periods' ? 'j' : item.privateTo ?? null,
    surprise_for: item.surpriseFor ?? null, reveal_at: item.revealAt ?? null, deleted,
  }
}
const metaRow = (id: string, data: unknown, me: UserId): Row =>
  ({ id, collection: 'meta', data, created_by: me, private_to: null, surprise_for: null, reveal_at: null, deleted: false })
const shared = (s: State) => Object.fromEntries(SHARED_KEYS.map((k) => [k, s[k]]))

function enqueue(rows: Row[]) {
  if (!rows.length) return
  for (const r of rows) outbox[r.id] = r
  saveOutbox()
  scheduleFlush(300)
}

/** Turn one local edit into the rows that changed. */
function diff(prev: State, next: State) {
  const rows: Row[] = []
  for (const c of COLLECTIONS) {
    const before = new Map((prev[c] as Item[]).map((x) => [x.id, x]))
    for (const x of next[c] as Item[]) {
      const p = before.get(x.id)
      if (!p || JSON.stringify(p) !== JSON.stringify(x)) rows.push(toRow(c, x, next.me))
      before.delete(x.id)
    }
    for (const gone of before.values()) rows.push(toRow(c, gone, next.me, true))
  }
  if (JSON.stringify(shared(prev)) !== JSON.stringify(shared(next))) rows.push(metaRow(SETTINGS_ID, shared(next), next.me))
  // Julia's device publishes just the period days for her partner's calendar.
  if (next.me === 'j' && (rows.some((r) => r.collection === 'periods') || prev.periodLength !== next.periodLength || prev.cycleLength !== next.cycleLength)) {
    rows.push(metaRow(PERIOD_DAYS_ID, { days: [...periodDays(next)].sort() }, next.me))
  }
  enqueue(rows)
}

let flushing = false
let flushTimer: ReturnType<typeof setTimeout> | undefined
function scheduleFlush(ms: number) {
  clearTimeout(flushTimer)
  flushTimer = setTimeout(flush, ms)
}

async function flush() {
  if (!supabase || auth.status !== 'ready' || flushing) return
  const rows = Object.values(outbox)
  flushing = true
  try {
    if (rows.length) {
      const { error } = await supabase.from('records').upsert(rows)
      if (error) throw error
      // Drop only what was sent; anything edited meanwhile stays queued.
      for (const r of rows) if (outbox[r.id] === r) delete outbox[r.id]
      saveOutbox()
    }
    await flushPhotoUploads()
    setAuth({ online: true })
  } catch {
    setAuth({ online: navigator.onLine })
    scheduleFlush(15000)
  } finally {
    flushing = false
  }
}

/* ---------- pull & realtime ---------- */
function sortNewestFirst(list: Item[]) {
  return list.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
}

function applyRows(base: State, rows: Row[], replace: boolean): State {
  const next = structuredClone(base)
  if (replace) for (const c of COLLECTIONS) (next[c] as Item[]) = []
  for (const r of rows) {
    if (outbox[r.id] && !replace) continue // our own unsent edit is newer
    if (r.collection === 'meta') {
      if (r.id === SETTINGS_ID && !r.deleted) Object.assign(next, r.data)
      if (r.id === PERIOD_DAYS_ID && !r.deleted) next.sharedPeriodDays = (r.data as { days: string[] }).days
      continue
    }
    if (!COLLECTIONS.includes(r.collection as Coll)) continue
    const c = r.collection as Coll
    const list = (next[c] as Item[]).filter((x) => x.id !== r.id)
    if (!r.deleted) list.push(r.data as Item)
    ;(next[c] as Item[]) = list
  }
  if (replace) {
    // Unsent local edits win over what the server returned.
    for (const r of Object.values(outbox)) {
      if (r.collection === 'meta') { if (r.id === SETTINGS_ID) Object.assign(next, r.data); continue }
      const c = r.collection as Coll
      const list = (next[c] as Item[]).filter((x) => x.id !== r.id)
      if (!r.deleted) list.push(r.data as Item)
      ;(next[c] as Item[]) = list
    }
  }
  for (const c of COLLECTIONS) sortNewestFirst(next[c] as Item[])
  return next
}

async function pull(): Promise<boolean> {
  if (!supabase) return false
  const rows: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('records').select('id,collection,data,created_by,private_to,surprise_for,reveal_at,deleted').range(from, from + 999)
    if (error) throw error
    rows.push(...(data as Row[]))
    if (data.length < 1000) break
  }
  replaceState(applyRows(getState(), rows, true))
  return rows.some((r) => r.id === SETTINGS_ID)
}

let channel: RealtimeChannel | undefined
function subscribe() {
  if (!supabase || channel) return
  channel = supabase.channel('records')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'records' }, (p) => {
      const row = p.new as Row
      if (row?.id) replaceState(applyRows(getState(), [row], false))
    })
    .subscribe()
}

/* ---------- session lifecycle ---------- */
let currentUser: string | undefined

async function onSession(session: Session | null) {
  if (!supabase) return
  if (!session) {
    currentUser = undefined
    if (channel) { supabase.removeChannel(channel); channel = undefined }
    setChangeHook(undefined)
    setAuth({ status: 'signedOut', email: undefined })
    return
  }
  if (currentUser === session.user.id && auth.status === 'ready') return
  currentUser = session.user.id
  setAuth({ email: session.user.email })

  // A network error here means we're offline: carry on with the local data.
  const { data: role, error } = await supabase.rpc('my_role')
  if (!error && !role) { setAuth({ status: 'noAccess' }); return }

  const s = getState()
  if (localStorage.getItem(USER_KEY) !== session.user.id) {
    // A new account on this device: start clean so demo data never reaches the server.
    outbox = {}
    saveOutbox()
    replaceState({ ...blankState(), lang: s.lang, theme: s.theme, me: (role as UserId) ?? s.me })
    localStorage.setItem(USER_KEY, session.user.id)
  } else if (role) {
    replaceState({ ...s, me: role as UserId })
  }

  setChangeHook(diff)
  setAuth({ status: 'ready' })
  try {
    const hasSettings = await pull()
    if (!hasSettings) enqueue([metaRow(SETTINGS_ID, shared(getState()), getState().me)])
    setAuth({ online: true })
  } catch {
    setAuth({ online: false })
  }
  subscribe()
  flush()
}

export async function initSync() {
  if (!supabase) return
  supabase.auth.onAuthStateChange((_e, session) => { setTimeout(() => onSession(session), 0) })
  const { data } = await supabase.auth.getSession()
  await onSession(data.session)
  window.addEventListener('online', () => { setAuth({ online: true }); flush() })
  window.addEventListener('offline', () => setAuth({ online: false }))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && auth.status === 'ready') pull().then(() => flush()).catch(() => {})
  })
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase!.auth.signInWithPassword({ email, password })
  return error?.message
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase!.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } })
  if (error) return { error: error.message }
  return { needsConfirm: !data.session }
}

export async function signOut() {
  await supabase?.auth.signOut()
  // Leave nothing personal behind on this device.
  outbox = {}
  saveOutbox()
  localStorage.removeItem(USER_KEY)
  replaceState({ ...blankState(), lang: getState().lang, theme: getState().theme })
}
