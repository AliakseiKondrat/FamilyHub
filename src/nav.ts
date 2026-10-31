import { useSyncExternalStore } from 'react'
import type { ModuleId } from './types'

export type Tab = 'today' | 'calendar' | 'tasks' | 'groceries' | 'more'
/** A pushed screen: a section, a trip detail, or settings. */
export type Route = { mod: ModuleId } | { trip: string } | { settings: true }

interface NavState { tab: Tab; stack: Route[] }
let nav: NavState = { tab: 'today', stack: [] }
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function set(next: NavState, push = false) {
  nav = next
  // Keep browser history in step so the system back gesture works too.
  if (push) history.pushState({ depth: nav.stack.length }, '')
  emit()
}

window.addEventListener('popstate', () => {
  const depth: number = history.state?.depth ?? 0
  if (nav.stack.length > depth) { nav = { ...nav, stack: nav.stack.slice(0, depth) }; emit() }
})

const actions = {
  setTab: (tab: Tab) => set({ tab, stack: [] }),
  push: (r: Route) => set({ ...nav, stack: [...nav.stack, r] }, true),
  pop: () => { if (nav.stack.length) history.back() },
  /** Jump to a module: tab modules switch tab, others push onto More. */
  open: (mod: ModuleId) => {
    if (mod === 'today' || mod === 'calendar' || mod === 'tasks' || mod === 'groceries') set({ tab: mod, stack: [] })
    else set({ tab: 'more', stack: [{ mod }] }, true)
  },
}

/** After an edge-swipe the screen is already off-screen, so the pop must not animate again. */
let skipLeave = false
export function popWithoutAnimation() { skipLeave = true; history.back() }
export function consumeSkipLeave() { const v = skipLeave; skipLeave = false; return v }

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
export function useNav() {
  const state = useSyncExternalStore(subscribe, () => nav)
  return { ...state, ...actions }
}
