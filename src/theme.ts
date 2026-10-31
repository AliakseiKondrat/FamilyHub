import type { CSSProperties } from 'react'
import type { ModuleId } from './types'

export type Accent = ModuleId | 'more' | 'settings'

/** Header gradient per section (Revolut-style colored top behind the status bar). */
const ACCENTS: Record<Accent, [string, string]> = {
  today: ['#4338ca', '#a855f7'],
  calendar: ['#e11d48', '#fb923c'],
  tasks: ['#1d4ed8', '#06b6d4'],
  groceries: ['#15803d', '#84cc16'],
  budget: ['#0f766e', '#22c55e'],
  watch: ['#7c3aed', '#ec4899'],
  recipes: ['#c2410c', '#facc15'],
  pet: ['#92400e', '#f59e0b'],
  home: ['#0369a1', '#38bdf8'],
  travel: ['#312e81', '#3b82f6'],
  dates: ['#be185d', '#fb7185'],
  inbox: ['#334155', '#64748b'],
  archive: ['#3f3f46', '#a1a1aa'],
  photos: ['#9333ea', '#f472b6'],
  cycle: ['#be123c', '#c084fc'],
  more: ['#18181b', '#52525b'],
  settings: ['#18181b', '#52525b'],
}

export const accentStyle = (a: Accent) => ({ '--a1': ACCENTS[a][0], '--a2': ACCENTS[a][1] }) as CSSProperties
