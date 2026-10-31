export type UserId = 'a' | 'j'
export type Who = UserId | 'both'
export type Lang = 'ru' | 'en' | 'pl' | 'es'
export type Country = 'PL' | 'ES'
export type Theme = 'auto' | 'light' | 'dark'

export type ModuleId =
  | 'today' | 'groceries' | 'tasks' | 'calendar' | 'budget' | 'watch' | 'recipes' | 'music'
  | 'pet' | 'home' | 'travel' | 'dates' | 'inbox' | 'archive' | 'photos' | 'cycle'

/** Fields every record carries: author plus the two visibility rules (surprise, private). */
export interface Base {
  id: string
  createdBy: UserId
  createdAt: string
  /** Hidden from this user until revealed (by date or by hand). */
  surpriseFor?: UserId
  revealAt?: string
  /** Only this user can see it. */
  privateTo?: UserId
}

export interface Grocery extends Base { title: string; category: string; done: boolean; doneAt?: string }

export type Repeat = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
export interface Task extends Base {
  title: string; notes?: string; due?: string; time?: string
  assignee: Who; done: boolean; doneAt?: string; repeat: Repeat
}

export interface CalEvent extends Base {
  title: string; date: string; endDate?: string; time?: string; endTime?: string
  who: Who; notes?: string; repeat: Repeat
}

export interface Expense extends Base {
  title: string; amount: number; currency: string; category: string
  paidBy: UserId; shared: boolean; date: string; settlement?: boolean
  /** Money coming in (salary etc.) rather than spent. */
  income?: boolean
  /** Generated from a recurring payment. */
  recurringId?: string
}

/** A monthly payment (rent, subscriptions) that adds itself to the budget on its day. */
export interface Recurring extends Base {
  title: string; amount: number; category: string; paidBy: UserId; shared: boolean; day: number; active: boolean
}

/** Savings goal ("piggy bank"). */
export interface Goal extends Base { title: string; emoji: string; target: number; saved: number; deadline?: string }

export type WatchStatus = 'want' | 'watching' | 'done'
export interface WatchLink { service: string; url: string; label?: string }
export interface WatchItem extends Base {
  title: string; kind: 'movie' | 'series' | 'other'; status: WatchStatus
  rating?: Partial<Record<UserId, number>>; url?: string; notes?: string
  links?: WatchLink[]; poster?: string; year?: string
}

export interface Track extends Base {
  title: string; artist: string; artwork?: string; preview?: string; url?: string
  album?: string; note?: string; likes: UserId[]
}

export interface Recipe extends Base {
  title: string; url?: string; tags: string[]; ingredients: string[]; someday: boolean
  cooked: number; notes?: string
}

export type PetKind = 'vaccine' | 'parasite' | 'vet' | 'groom' | 'other'
export interface PetRecord extends Base { kind: PetKind; title: string; date: string; nextDue?: string; notes?: string }
export interface Weight { id: string; date: string; kg: number }

export type NoteModule = 'home' | 'inbox' | 'archive' | 'dates'
export interface Note extends Base {
  module: NoteModule; title: string; notes?: string; url?: string
  due?: string; repeat?: Repeat; done?: boolean; tags?: string[]
}

export interface Check { id: string; title: string; done: boolean }
export interface PlanItem { id: string; date: string; time?: string; title: string }
export interface DocLink { id: string; title: string; url: string }
export interface Trip extends Base {
  title: string; destination: string; start: string; end: string; notes?: string
  plan: PlanItem[]; packing: Check[]; docs: DocLink[]
}

export interface Photo extends Base { album: string; caption?: string; width: number; height: number }

export interface Period { id: string; start: string; end?: string }

export interface ModuleSettings { title?: string; emoji?: string; hidden?: boolean }

/** An editable category (groceries, budget): built-ins can be renamed/hidden, custom ones deleted. */
export interface Category { id: string; title?: string; emoji: string; hidden?: boolean; custom?: boolean }

export type TodayBlock = 'events' | 'tasks' | 'trip' | 'pet' | 'music' | 'memories' | 'dateIdea' | 'budget' | 'tomorrow'

export interface Design {
  /** Per-section header gradient overrides (preset id). */
  accents: Partial<Record<string, string>>
  glass: 'strong' | 'normal' | 'off'
  radius: 'compact' | 'normal' | 'round'
  textSize: 's' | 'm' | 'l'
  header: 'gradient' | 'mesh' | 'solid'
  cards: 'shadow' | 'flat'
  tabLabels: boolean
  reduceMotion: boolean
  haptics: boolean
  tabTint: 'blue' | 'accent' | 'mono'
}

export interface Prefs {
  /** Four tabs in the bottom bar; "More" is always fifth. */
  tabs: ModuleId[]
  todayActions: ModuleId[]
  todayBlocks: { id: TodayBlock; on: boolean }[]
  weekStart: 1 | 0
  startTab: ModuleId
  swipeTabs: boolean
  groceryQuickChips: boolean
  groceryCollapsed: string[]
  showCompletedTasks: boolean
  budgetFilter: 'all' | 'shared' | 'mine'
  /** Read by the server when sending pushes. */
  notify: { activity: boolean; reminders: boolean; morning: boolean; morningTime: string; eventLead: number }
  /** Large-screen layout: auto picks by width, phone forces the single column. */
  layout: 'auto' | 'phone' | 'wide'
}

export interface State {
  version: 1
  me: UserId
  users: Record<UserId, { name: string; emoji: string }>
  lang: Lang
  country: Country
  theme: Theme
  design: Design
  prefs: Prefs
  pet: { name: string; emoji: string; birthday?: string; breed?: string }
  modules: Partial<Record<ModuleId, ModuleSettings>>
  groceryCats: Category[]
  budgetCats: Category[]
  /** Share of a shared expense that user "a" covers, in percent (50 = half each). */
  splitA: number
  budgets: Record<string, number>
  groceries: Grocery[]
  tasks: Task[]
  events: CalEvent[]
  expenses: Expense[]
  recurring: Recurring[]
  goals: Goal[]
  watch: WatchItem[]
  music: Track[]
  recipes: Recipe[]
  petRecords: PetRecord[]
  weights: Weight[]
  notes: Note[]
  trips: Trip[]
  photos: Photo[]
  periods: Period[]
  /** Period days published by Julia's device — the only cycle data her partner receives. */
  sharedPeriodDays?: string[]
  cycleLength: number
  periodLength: number
}
