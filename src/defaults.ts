import type { Category, Design, ModuleId, Prefs, State } from './types'
import { BUDGET_CATS, BUDGET_EMOJI, GROCERY_CATS, GROCERY_EMOJI } from './lib/categories'

export const defaultDesign = (): Design => ({
  accents: {}, glass: 'normal', radius: 'normal', textSize: 'm', header: 'gradient', cards: 'shadow',
  tabLabels: true, reduceMotion: false, haptics: true, tabTint: 'blue',
})

export const defaultPrefs = (): Prefs => ({
  tabs: ['today', 'calendar', 'tasks', 'groceries'],
  todayActions: ['budget', 'music', 'photos', 'pet'],
  todayBlocks: (['events', 'tasks', 'trip', 'budget', 'pet', 'music', 'memories', 'dateIdea', 'tomorrow'] as const).map((id) => ({ id, on: true })),
  weekStart: 1,
  startTab: 'today',
  swipeTabs: true,
  groceryQuickChips: true,
  groceryCollapsed: [],
  showCompletedTasks: false,
  budgetFilter: 'all',
})

export const defaultGroceryCats = (): Category[] => GROCERY_CATS.map((id) => ({ id, emoji: GROCERY_EMOJI[id] }))
export const defaultBudgetCats = (): Category[] => BUDGET_CATS.map((id) => ({ id, emoji: BUDGET_EMOJI[id] }))

/** Settings each person keeps for themselves (synced privately between their own devices). */
export const PERSONAL_KEYS = ['lang', 'theme', 'design', 'prefs'] as const satisfies readonly (keyof State)[]
/** Settings the two of you share. */
export const SHARED_KEYS = ['users', 'pet', 'modules', 'budgets', 'country', 'cycleLength', 'periodLength', 'groceryCats', 'budgetCats', 'splitA'] as const satisfies readonly (keyof State)[]

/** Modules that can live in the tab bar or be opened from More. */
export const ALL_MODULES: ModuleId[] = ['today', 'calendar', 'tasks', 'groceries', 'budget', 'music', 'photos', 'watch', 'recipes', 'pet', 'home', 'travel', 'dates', 'inbox', 'archive', 'cycle']
