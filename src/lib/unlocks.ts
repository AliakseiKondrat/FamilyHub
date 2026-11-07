import { useSyncExternalStore } from 'react'
import { DEMO, SYNC_ENABLED } from '../config'
import { supabase } from './supabase'
import { getState, useApp } from '../store'
import { progressionOf } from './progression'
import { CATALOG, DEFAULTS, ITEMS, LOOKS, type Item, type Kind, type Metric, type Rule, type Tier } from './catalog'
import type { State, UserId } from '../types'

/*
 * Who has what in the collection. The household's tier, the developers' rule overrides and the items the
 * household owns come from the server (RLS keeps each couple to its own rows); usage numbers are computed
 * from the couple's joint actions on the device. Cached locally so the look survives offline starts.
 */

export interface Grant { item: string; source: 'purchase' | 'gift' | 'dev' | 'reward'; from_role: UserId | null; seen: boolean; created_at: string }
interface Server {
  tier: Tier | null
  refs: number
  overrides: Record<string, Partial<Rule> | null>
  freeForAll: boolean
  grants: Grant[]
  publicFactor?: number
}

const CACHE = 'familyhub:unlocks'
const empty: Server = { tier: null, refs: 0, overrides: {}, freeForAll: false, grants: [] }
let server: Server = (() => { try { return { ...empty, ...JSON.parse(localStorage.getItem(CACHE) || '{}') } } catch { return empty } })()
const listeners = new Set<() => void>()
function setServer(patch: Partial<Server>) {
  server = { ...server, ...patch }
  try { localStorage.setItem(CACHE, JSON.stringify(server)) } catch { /* ignore */ }
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
export const useServerUnlocks = () => useSyncExternalStore(subscribe, () => server)

/** Fetch the tier, rules, referrals and grants; called after sign-in and when the app comes back to the foreground. */
export async function loadUnlocks() {
  if (!supabase) return
  const [tier, refs, config, grants] = await Promise.all([
    supabase.rpc('my_tier'),
    supabase.rpc('my_referrals'),
    supabase.from('app_config').select('key, value'),
    supabase.from('grants').select('item, source, from_role, seen, created_at'),
  ])
  const cfg = Object.fromEntries((config.data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]))
  setServer({
    tier: (tier.data as Tier) ?? server.tier,
    refs: (refs.data as number) ?? server.refs,
    overrides: (cfg.catalog as Server['overrides']) ?? (config.error ? server.overrides : {}),
    freeForAll: !!(cfg.test as { freeForAll?: boolean } | undefined)?.freeForAll,
    publicFactor: (cfg.progression as { publicFactor?: number } | undefined)?.publicFactor,
    grants: grants.error ? server.grants : (grants.data as Grant[]),
  })
}
export function clearUnlocks() { setServer({ ...empty }) }

/** The household's real tier. The local demo behaves like a close couple (`?demo&dev` previews the developer side). */
export function realTier(): Tier {
  if (!SYNC_ENABLED) return DEMO && new URLSearchParams(location.search).has('dev') ? 'dev' : 'close'
  return server.tier ?? 'public'
}
/** The tier the app behaves as: developers may preview it as another couple. */
export const effectiveTier = (s: State): Tier => (realTier() === 'dev' && s.prefs.devAs ? s.prefs.devAs : realTier())

/* ---------- usage numbers ---------- */
export type Stats = Record<Exclude<Metric, 'event'>, number> & { event: number; refs: number }
let memo: { acts: unknown; game: unknown; trips: unknown; moods: unknown; refs: number; stats: Stats } | undefined
export function statsOf(s: State): Stats {
  if (memo && memo.acts === s.acts && memo.game === s.game && memo.trips === s.trips && memo.moods === s.moods && memo.refs === server.refs) return memo.stats
  const r = progressionOf(s)
  const c = r.chains
  const stats: Stats = {
    level: r.p.level, flame: r.p.best, acts: r.p.actions, days: r.p.fed.size, quests: c.quests, stamps: c.stamps,
    cook: c.cook, watch: c.watch, notes: c.notes, dates: c.dates, trips: c.trips, gifts: c.gifts, checkins: c.checkins, blind: c.blind,
    tasks: c.tasks, shop: c.shop, taps: c.taps, moods: c.moods, photos: c.photos, music: c.music, goals: c.goals, events: c.events,
    event: 0, refs: server.refs,
  }
  memo = { acts: s.acts, game: s.game, trips: s.trips, moods: s.moods, refs: server.refs, stats }
  return stats
}

/** An item's rule with the developers' overrides applied (undefined = free for everyone). */
export function ruleOf(id: string): Rule | undefined {
  const base = ITEMS[id]?.rule
  const o = server.overrides[id]
  if (o === null) return undefined // made free by the developers
  if (!base && !o) return undefined
  return { m: 'level', n: 1, price: 100, ...base, ...o } as Rule
}

export type Status =
  | { open: true; why: 'free' | 'dev' | 'test' | 'owned' | 'earned'; grant?: Grant }
  | { open: false; id: string; tier: 'close' | 'public'; rule: Rule; have: number; need: number; refs: number }

/** Couples who aren't close can earn everything too, just twice as far (the developers can change it). */
export const publicFactor = () => server.publicFactor ?? 2

export function statusOf(id: string, s: State = getState()): Status {
  const rule = ruleOf(id)
  if (!rule) return { open: true, why: 'free' }
  const grant = server.grants.find((g) => g.item === id)
  if (grant) return { open: true, why: 'owned', grant }
  const tier = effectiveTier(s)
  if (tier === 'dev') return { open: true, why: 'dev' }
  if (server.freeForAll) return { open: true, why: 'test' }
  // Marathon rewards: earned in «Around the world» only (everyone else may also buy them).
  if (rule.m === 'event' && progressionOf(s).m.earned.has(id)) return { open: true, why: 'earned' }
  const st = statsOf(s)
  if (rule.m === 'event') return { open: false, id, tier, rule, have: 0, need: 0, refs: st.refs }
  const have = st[rule.m as Exclude<Metric, 'event'>]
  const need = tier === 'close' ? rule.n : Math.ceil(rule.n * publicFactor())
  if (have >= need || (tier === 'close' && !!rule.refs && st.refs >= rule.refs)) return { open: true, why: 'earned' }
  return { open: false, id, tier, rule, have, need, refs: st.refs }
}
export const isOpen = (id: string, s: State = getState()) => statusOf(id, s).open

/* ---------- what is in use ---------- */
export interface Choice { theme: string; mascot: string; scene: string; card: string; piggy: string }
const ok = (id: string | undefined, kind: Kind, s: State) => (id && ITEMS[id]?.kind === kind && isOpen(id, s) ? id : undefined)

/** My look: the item being tried on, else my pick if it's open to us, else the classic theme. */
export function activeLook(s: State = getState()): string {
  const t = tryOnNow()
  if (t) return t
  const id = s.prefs.look
  return (id && ITEMS[id] && (ITEMS[id].kind === 'theme' || ITEMS[id].kind === 'atmo') && isOpen(id, s)) ? id : DEFAULTS.theme
}
export const lookOf = (id: string) => LOOKS[ITEMS[id]?.key ?? 'classic'] ?? LOOKS.classic

export function activeMascot(s: State = getState()) { return ok(`mascot:${s.game.mascotKind}`, 'mascot', s) ?? DEFAULTS.mascot }
/** The mascot's scene: the couple's pick, else the scene that comes with my atmosphere, else none. */
export function activeScene(s: State = getState()) {
  const pick = ok(s.game.scene, 'scene', s)
  if (pick && pick !== DEFAULTS.scene) return pick
  const atmo = lookOf(activeLook(s)).scene
  return atmo ? `scene:${atmo}` : pick ?? DEFAULTS.scene
}
export const activeCard = (s: State = getState()) => ok(s.game.card, 'card', s) ?? DEFAULTS.card
export const activePiggy = (s: State = getState()) => ok(s.game.piggy, 'piggy', s) ?? DEFAULTS.piggy
export const activeFlame = (s: State = getState()) => ok(s.game.flame, 'flame', s) ?? DEFAULTS.flame
export const activeFrame = (s: State = getState()) => ok(s.game.frame, 'frame', s) ?? DEFAULTS.frame
export const activeHat = (s: State = getState()) => ok(s.game.hat, 'hat', s) ?? DEFAULTS.hat

/** Re-render on server changes as well as state changes. */
export function useUnlocks() {
  const s = useApp()
  const srv = useServerUnlocks()
  useTryOn()
  return { s, server: srv, tier: effectiveTier(s), real: realTier(), stats: statsOf(s), status: (id: string) => statusOf(id, s) }
}
export const itemsOf = (kind: Kind): Item[] => CATALOG.filter((i) => i.kind === kind)

/* ---------- trying a look on for a minute ---------- */
let tryOn: { id: string; until: number } | null = null
let tryTimer: ReturnType<typeof setTimeout> | undefined
const tryListeners = new Set<() => void>()
function tryOnNow() { return tryOn && tryOn.until > Date.now() ? tryOn.id : null }
export function startTryOn(id: string, seconds = 60) {
  tryOn = { id, until: Date.now() + seconds * 1000 }
  clearTimeout(tryTimer)
  tryTimer = setTimeout(stopTryOn, seconds * 1000)
  tryListeners.forEach((l) => l())
}
export function stopTryOn() { tryOn = null; clearTimeout(tryTimer); tryListeners.forEach((l) => l()) }
export const useTryOn = () => useSyncExternalStore((l) => { tryListeners.add(l); return () => { tryListeners.delete(l) } }, () => tryOn)

/* ---------- gifts from the partner ---------- */
/** Gifts the partner gave me that I haven't thanked for yet. */
export const unseenGifts = (s: State) => server.grants.filter((g) => g.source === 'gift' && !g.seen && g.from_role && g.from_role !== s.me)
export async function thankForGift(item: string) {
  setServer({ grants: server.grants.map((g) => (g.item === item ? { ...g, seen: true } : g)) })
  await supabase?.from('grants').update({ seen: true }).eq('item', item)
}

/* ---------- developer tools (the server refuses them for everyone else) ---------- */
export interface Household { id: string; tier: Tier; members: number; emails: string | null; last_active: string | null; referred_by: string | null }
export interface HouseholdGrant extends Grant { household: string }

export async function devSetRule(id: string, rule: Partial<Rule> | null | 'reset') {
  const overrides = { ...server.overrides }
  if (rule === 'reset') delete overrides[id]
  else overrides[id] = rule
  setServer({ overrides })
  if (!supabase) return
  const { error } = await supabase.from('app_config').upsert({ key: 'catalog', value: overrides, updated_at: new Date().toISOString() })
  if (error) throw error
}
export async function devSetFreeForAll(on: boolean) {
  setServer({ freeForAll: on })
  if (!supabase) return
  const { error } = await supabase.from('app_config').upsert({ key: 'test', value: { freeForAll: on }, updated_at: new Date().toISOString() })
  if (error) throw error
}
export async function devHouseholds(): Promise<Household[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('dev_households')
  if (error) throw error
  return data as Household[]
}
export async function devUpdateHousehold(id: string, patch: { tier?: Tier; referred_by?: string | null }) {
  const { error } = await supabase!.from('households').update(patch).eq('id', id)
  if (error) throw error
}
export async function devGrants(household: string): Promise<HouseholdGrant[]> {
  const { data, error } = await supabase!.from('grants').select('household, item, source, from_role, seen, created_at').eq('household', household)
  if (error) throw error
  return data as HouseholdGrant[]
}
export async function devGrant(household: string, item: string, source: Grant['source'], from_role: UserId | null) {
  const { error } = await supabase!.from('grants').insert({ household, item, source, from_role })
  if (error) throw error
  if (household === myHousehold()) await loadUnlocks()
}
export async function devRevoke(household: string, item: string) {
  const { error } = await supabase!.from('grants').delete().eq('household', household).eq('item', item)
  if (error) throw error
  if (household === myHousehold()) await loadUnlocks()
}
let hh: () => string | null = () => null
/** sync.ts tells us which household is signed in (avoids an import cycle). */
export function setHouseholdGetter(f: () => string | null) { hh = f }
const myHousehold = () => hh()
