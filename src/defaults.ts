import type { Category, Design, GameSettings, ModuleId, Prefs, State, TodayBlock } from './types'
import { BUDGET_CATS, BUDGET_EMOJI, GROCERY_CATS, GROCERY_EMOJI } from './lib/categories'

export const defaultDesign = (): Design => ({
  accents: {}, glass: 'normal', radius: 'normal', textSize: 'm', header: 'gradient', cards: 'shadow',
  tabLabels: true, reduceMotion: false, haptics: true, tabTint: 'blue',
})

/** Status presets added after release: offered once to people whose saved list predates them. */
const NEW_PRESETS = ['rest']

/** Fill settings saved by an older app version with newer fields and newly added status presets. */
export function upgradePrefs(saved: Partial<Prefs> | undefined): Prefs {
  const d = defaultPrefs()
  const p: Prefs = { ...d, ...saved, notify: { ...d.notify, ...saved?.notify } }
  const seen = new Set(saved?.presetsAdded ?? [])
  const missing = d.statusPresets.filter((x) => NEW_PRESETS.includes(x.id) && !seen.has(x.id) && !p.statusPresets.some((y) => y.id === x.id))
  if (missing.length) p.statusPresets = [...p.statusPresets.filter((x) => !x.together), ...missing.filter((x) => !x.together),
    ...p.statusPresets.filter((x) => x.together), ...missing.filter((x) => x.together)]
  p.presetsAdded = NEW_PRESETS
  // New Today blocks go on top once; turning one off later keeps it off.
  const known = new Set(saved?.blocksAdded ?? [])
  const fresh = NEW_BLOCKS.filter((b) => !known.has(b) && !p.todayBlocks.some((x) => x.id === b))
  if (fresh.length) p.todayBlocks = [...fresh.map((id) => ({ id, on: true })), ...p.todayBlocks]
  p.blocksAdded = NEW_BLOCKS
  return p
}

export const defaultPrefs = (): Prefs => ({
  tabs: ['today', 'calendar', 'tasks', 'groceries'],
  todayActions: ['budget', 'music', 'photos', 'pet'],
  todayBlocks: (['ritual', 'events', 'tasks', 'trip', 'budget', 'pet', 'music', 'memories', 'dateIdea', 'tomorrow'] as const).map((id) => ({ id, on: true })),
  blocksAdded: NEW_BLOCKS,
  weekStart: 1,
  startTab: 'today',
  swipeTabs: true,
  groceryQuickChips: true,
  groceryCollapsed: [],
  showCompletedTasks: false,
  budgetFilter: 'all',
  notify: { activity: true, reminders: true, morning: true, morningTime: '09:00', eventLead: 30 },
  layout: 'auto',
  statusPresets: [
    { id: 'work', emoji: '💼', label: 'Работаю' },
    { id: 'busy', emoji: '⛔️', label: 'Занят(а)' },
    { id: 'free', emoji: '🟢', label: 'Свободен(на)' },
    { id: 'drive', emoji: '🚗', label: 'За рулём' },
    { id: 'home', emoji: '🏠', label: 'Дома' },
    { id: 'sport', emoji: '🏃', label: 'Спорт' },
    { id: 'shop', emoji: '🛒', label: 'В магазине' },
    { id: 'sleep', emoji: '😴', label: 'Сплю' },
    { id: 'rest', emoji: '🛋️', label: 'Отдыхаю' },
    { id: 'drive2', emoji: '🚙', label: 'Едем вместе', together: true },
    { id: 'dinner2', emoji: '🍽️', label: 'Ужинаем', together: true },
    { id: 'movie2', emoji: '🍿', label: 'Смотрим кино', together: true },
    { id: 'walk2', emoji: '🐶', label: 'Гуляем с собакой', together: true },
  ],
  presetsAdded: NEW_PRESETS,
  statusHours: 8,
  showStatuses: true,
  linkPreviews: true,
  favorites: [],
  roundMoney: false,
  confirmDelete: false,
  weekNumbers: false,
  groceryHideBought: false,
  groceryEmoji: true,
})

/** Saved game settings on top of the defaults; a retired mascot kind (the otter) becomes the fox. */
export function upgradeGame(g?: Partial<GameSettings>): GameSettings {
  const x = { ...defaultGame(), ...g }
  if (x.mascotKind === 'otter') x.mascotKind = 'fox'
  return x
}

export const defaultGame = (): GameSettings => ({
  enabled: true, mascot: true, tree: true, quests: true, taps: true, moodAlerts: true,
  mascotKind: 'fox', mascotName: '', questMode: 'all', pauses: [],
})

/** Today blocks added in newer versions: appended once to lists saved before them. */
const NEW_BLOCKS: TodayBlock[] = ['ritual']

export const defaultGroceryCats = (): Category[] => GROCERY_CATS.map((id) => ({ id, emoji: GROCERY_EMOJI[id] }))
export const defaultBudgetCats = (): Category[] => BUDGET_CATS.map((id) => ({ id, emoji: BUDGET_EMOJI[id] }))

/** Settings each person keeps for themselves (synced privately between their own devices). */
export const PERSONAL_KEYS = ['lang', 'theme', 'design', 'prefs'] as const satisfies readonly (keyof State)[]
/** Settings the two of you share. */
export const SHARED_KEYS = ['users', 'pet', 'modules', 'budgets', 'country', 'cycleLength', 'periodLength', 'groceryCats', 'budgetCats', 'splitA', 'game', 'since', 'couplePhoto'] as const satisfies readonly (keyof State)[]

/** Modules that can live in the tab bar or be opened from More. */
export const ALL_MODULES: ModuleId[] = ['today', 'us', 'calendar', 'tasks', 'groceries', 'budget', 'music', 'photos', 'watch', 'wishlist', 'recipes', 'pet', 'home', 'travel', 'dates', 'inbox', 'archive', 'cycle']

/** Every section in my order: my own order if I set one (sections added later go to the end), else tab bar sections first. */
export function moduleOrder(s: Pick<State, 'prefs'>): ModuleId[] {
  const own = (s.prefs.order ?? []).filter((m) => ALL_MODULES.includes(m))
  if (own.length) return [...own, ...ALL_MODULES.filter((m) => !own.includes(m))]
  return [...s.prefs.tabs, ...ALL_MODULES.filter((m) => !s.prefs.tabs.includes(m))]
}
