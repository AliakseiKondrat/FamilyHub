export type UserId = 'a' | 'j'
export type Who = UserId | 'both'
export type Lang = 'ru' | 'en' | 'pl' | 'es'
export type Country = 'PL' | 'ES'
export type Theme = 'auto' | 'light' | 'dark'

export type ModuleId =
  | 'today' | 'groceries' | 'tasks' | 'calendar' | 'budget' | 'watch' | 'recipes'
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
}

export type WatchStatus = 'want' | 'watching' | 'done'
export interface WatchItem extends Base {
  title: string; kind: 'movie' | 'series' | 'other'; status: WatchStatus
  rating?: Partial<Record<UserId, number>>; url?: string; notes?: string
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

export interface ModuleSettings { title?: string; emoji?: string }

export interface State {
  version: 1
  me: UserId
  users: Record<UserId, { name: string; emoji: string }>
  lang: Lang
  country: Country
  theme: Theme
  pet: { name: string; emoji: string; birthday?: string; breed?: string }
  modules: Partial<Record<ModuleId, ModuleSettings>>
  budgets: Record<string, number>
  groceries: Grocery[]
  tasks: Task[]
  events: CalEvent[]
  expenses: Expense[]
  watch: WatchItem[]
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
