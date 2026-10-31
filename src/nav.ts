import { useSyncExternalStore } from 'react'
import type { ModuleId } from './types'
import { getState } from './store'

/** A tab is any section the person put in the bottom bar, or "More". */
export type Tab = ModuleId | 'more'
export type SettingsPage = 'root' | 'design' | 'tabs' | 'today' | 'sections' | 'groceryCats' | 'budget' | 'people' | 'region' | 'data'
  | 'notifications' | 'siri' | 'widget' | 'google' | 'statuses' | 'shortcuts'
/** A pushed screen: a section, a trip detail, or a settings page. */
export type Route = { mod: ModuleId } | { trip: string } | { settings: SettingsPage } | { search: true }

interface NavState { tab: Tab; stack: Route[] }
const startTab = (): Tab => {
  const p = getState().prefs
  return p.tabs.includes(p.startTab) ? p.startTab : p.tabs[0] ?? 'more'
}
let nav: NavState = { tab: startTab(), stack: [] }
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

/** In the wide (iPad/Mac) layout every section sits in the sidebar, so opening one is a tab switch. */
let wide = false
export const setWideNav = (v: boolean) => { wide = v }

const actions = {
  setTab: (tab: Tab) => set({ tab, stack: [] }),
  push: (r: Route) => set({ ...nav, stack: [...nav.stack, r] }, true),
  pop: () => { if (nav.stack.length) history.back() },
  /** Jump to a module: one in the tab bar switches tab, others push onto the current tab. */
  open: (mod: ModuleId) => {
    if (wide || getState().prefs.tabs.includes(mod)) set({ tab: mod, stack: [] })
    else set({ ...nav, stack: [...nav.stack, { mod }] }, true)
  },
  search: () => set({ ...nav, stack: [...nav.stack, { search: true }] }, true),
  settings: (page: SettingsPage = 'root') => set({ ...nav, stack: [...nav.stack, { settings: page }] }, true),
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
