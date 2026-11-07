import type { CSSProperties } from 'react'
import type { ModuleId, State } from './types'
import { getState } from './store'
import { activeLook, lookOf } from './lib/unlocks'

export type Accent = ModuleId | 'more' | 'settings'

/** Gradient presets a section header can use. */
export const PRESETS: Record<string, [string, string]> = {
  indigo: ['#4338ca', '#a855f7'],
  sunset: ['#e11d48', '#fb923c'],
  ocean: ['#1d4ed8', '#06b6d4'],
  lime: ['#15803d', '#84cc16'],
  emerald: ['#0f766e', '#22c55e'],
  grape: ['#7c3aed', '#ec4899'],
  mango: ['#c2410c', '#facc15'],
  amber: ['#92400e', '#f59e0b'],
  sky: ['#0369a1', '#38bdf8'],
  night: ['#312e81', '#3b82f6'],
  rose: ['#be185d', '#fb7185'],
  slate: ['#334155', '#64748b'],
  steel: ['#3f3f46', '#a1a1aa'],
  orchid: ['#9333ea', '#f472b6'],
  bloom: ['#be123c', '#c084fc'],
  graphite: ['#18181b', '#52525b'],
  music: ['#fa2d48', '#a21caf'],
  aurora: ['#0ea5e9', '#a855f7'],
  peach: ['#f97316', '#ec4899'],
  forest: ['#14532d', '#10b981'],
}

export const DEFAULT_ACCENT: Record<Accent, string> = {
  today: 'indigo', calendar: 'sunset', tasks: 'ocean', groceries: 'lime', budget: 'emerald', watch: 'grape',
  recipes: 'mango', pet: 'amber', home: 'sky', travel: 'night', dates: 'rose', inbox: 'slate', archive: 'steel',
  photos: 'orchid', cycle: 'bloom', wishlist: 'peach', us: 'peach', music: 'music', more: 'graphite', settings: 'graphite',
}

/** A section's header colours: the person's own pick for that section, else the theme's single gradient, else the default. */
export function accentColors(a: Accent, s: State = getState()): [string, string] {
  const own = s.design?.accents?.[a]
  if (own && PRESETS[own]) return PRESETS[own]
  return lookOf(activeLook(s)).headers ?? PRESETS[DEFAULT_ACCENT[a]]
}

export const accentStyle = (a: Accent) => {
  const [a1, a2] = accentColors(a)
  return { '--a1': a1, '--a2': a2 } as CSSProperties
}

/** Mirror design settings onto <html> data attributes; CSS does the rest. */
export function applyDesign(s: State, theme: 'light' | 'dark') {
  const el = document.documentElement
  const d = s.design
  el.dataset.theme = theme
  el.dataset.glass = d.glass
  el.dataset.radius = d.radius
  el.dataset.text = d.textSize
  el.dataset.header = d.header
  el.dataset.cards = d.cards
  el.dataset.tablabels = d.tabLabels ? 'on' : 'off'
  el.dataset.motion = d.reduceMotion ? 'reduce' : 'full'
  el.dataset.tabtint = d.tabTint
  el.lang = s.lang
  applyLook(s, theme)
}

const LOOK_VARS = ['--bg', '--cell', '--cell-hi', '--blue', '--wall'] as const
/** Paint my theme or atmosphere: palette variables on <html>, an optional wallpaper, and data-look for the ambient layer. */
export function applyLook(s: State, theme: 'light' | 'dark') {
  const el = document.documentElement
  const id = activeLook(s)
  const look = lookOf(id)
  const pal = theme === 'dark' ? look.dark : look.light
  for (const v of LOOK_VARS) el.style.removeProperty(v)
  if (pal[0]) {
    el.style.setProperty('--bg', pal[0])
    el.style.setProperty('--cell', pal[1])
    el.style.setProperty('--cell-hi', pal[2])
    el.style.setProperty('--blue', pal[3])
  }
  const wall = look.wall?.[theme === 'dark' ? 1 : 0]
  if (wall) el.style.setProperty('--wall', wall)
  el.dataset.wall = wall ? 'on' : 'off'
  el.dataset.look = id
}
