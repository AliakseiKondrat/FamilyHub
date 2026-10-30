import { useSyncExternalStore } from 'react'
import type { Base, State, UserId } from './types'
import { today } from './lib/date'
import { demoState } from './demo'

const KEY = 'familyhub:v1'

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...demoState(), ...JSON.parse(raw) }
  } catch { /* storage unavailable: fall back to demo data */ }
  return demoState()
}

let state: State = load()
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
  save()
  listeners.forEach((l) => l())
  onLocalChange?.(prev, next)
}

/** Replace the state without treating it as a local edit (used for demo reset and data from the server). */
export function replaceState(s: State) {
  state = s
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
