import { useSyncExternalStore } from 'react'
import type { Base, State, UserId } from './types'
import { setMoneyRounding, today } from './lib/date'
import { blankState, demoState } from './demo'
import { SYNC_ENABLED } from './config'
import { upgradePrefs } from './defaults'

// Demo mode keeps its own copy so it never mixes with an account's data.
const KEY = SYNC_ENABLED ? 'familyhub:v1' : 'familyhub:demo'

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      // Fill in settings added in newer versions of the app.
      const d = demoState(), p = JSON.parse(raw)
      return { ...d, ...p, design: { ...d.design, ...p.design }, prefs: upgradePrefs(p.prefs) }
    }
  } catch { /* storage unavailable: fall back to defaults */ }
  // Signed-in mode starts empty: demo data must never reach the real account (it once booked demo rent).
  return SYNC_ENABLED ? blankState() : demoState()
}

let state: State = load()
setMoneyRounding(state.prefs.roundMoney)
const listeners = new Set<() => void>()

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* ignore quota / private mode */ }
}

/** Called after every local change with the old and new state (the sync engine pushes the diff). */
let onLocalChange: ((prev: State, next: State) => void) | undefined
export const setChangeHook = (fn: typeof onLocalChange) => { onLocalChange = fn }

/** Mutate a copy of the state; subscribers re-render with the new object. */
export function update(fn: (s: State) => void) {
  const prev = state
  const next = structuredClone(state)
  fn(next)
  state = next
  setMoneyRounding(next.prefs.roundMoney)
  save()
  listeners.forEach((l) => l())
  onLocalChange?.(prev, next)
}

/** Replace the state without treating it as a local edit (used for demo reset and data from the server). */
export function replaceState(s: State) {
  state = s
  setMoneyRounding(s.prefs.roundMoney)
  save()
  listeners.forEach((l) => l())
}

export const getState = () => state
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
export const useApp = () => useSyncExternalStore(subscribe, getState)

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

export const other = (u: UserId): UserId => (u === 'a' ? 'j' : 'a')

export function base(me: UserId): Base {
  return { id: uid(), createdBy: me, createdAt: new Date().toISOString() }
}

export const isRevealed = (x: Base) => !x.surpriseFor || (!!x.revealAt && x.revealAt <= today())

/** The one rule for what a user may see: private records and unrevealed surprises are filtered out. */
export function visible<T extends Base>(list: T[], me: UserId): T[] {
  return list.filter((x) => (!x.privateTo || x.privateTo === me) && (x.surpriseFor !== me || isRevealed(x)))
}
