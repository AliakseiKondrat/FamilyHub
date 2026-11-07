import type { Act, State } from '../types'
import { addDays, today } from './date'
import { pausesOf, progress, TAP_GOAL, type Progress } from './game'
import { marathonOf, type Marathon } from './marathon'

/*
 * Progression beyond the mascot: everything the couple does in the app moves something forward.
 *  - chains: one long ladder per part of life (cooking, films, places, chores…), 9–14 steps each, a medal per step;
 *  - achievements: one-off moments found by themselves (first note, night owls, a whole week of quests…);
 *  - titles: what the couple is called at its level, up to 500.
 * Nothing to claim, nothing expires: it all follows from the shared record, so both phones agree.
 */

export type ChainId = 'days' | 'flame' | 'level' | 'quests' | 'tasks' | 'shop' | 'cook' | 'watch' | 'dates' | 'trips' | 'gifts'
  | 'notes' | 'checkins' | 'blind' | 'goals' | 'photos' | 'music' | 'events' | 'taps' | 'moods' | 'stamps'
export interface Chain { id: ChainId; emoji: string; steps: number[] }

export const CHAINS: Chain[] = [
  { id: 'days', emoji: '📅', steps: [1, 7, 14, 30, 60, 100, 150, 200, 365, 500, 730, 1000, 1500, 2000] },
  { id: 'flame', emoji: '🔥', steps: [3, 7, 14, 21, 30, 45, 60, 100, 150, 200, 365, 500, 730, 1000] },
  { id: 'level', emoji: '⭐', steps: [5, 10, 20, 30, 50, 75, 100, 150, 200, 250, 300, 400, 500] },
  { id: 'quests', emoji: '🎯', steps: [1, 10, 30, 60, 100, 200, 365, 500, 750, 1000, 1500, 2000, 3000] },
  { id: 'stamps', emoji: '🛂', steps: [1, 4, 8, 13, 26, 39, 52, 78, 104] },
  { id: 'tasks', emoji: '✅', steps: [1, 10, 25, 50, 100, 250, 500, 1000, 2000, 3500, 5000] },
  { id: 'shop', emoji: '🛒', steps: [1, 7, 20, 50, 100, 200, 365, 500, 750, 1000] },
  { id: 'cook', emoji: '🍳', steps: [1, 3, 10, 25, 50, 100, 150, 250, 365, 500] },
  { id: 'watch', emoji: '🍿', steps: [1, 3, 10, 25, 50, 100, 150, 250, 365, 500] },
  { id: 'dates', emoji: '📍', steps: [1, 3, 5, 10, 20, 35, 50, 75, 100, 150, 200] },
  { id: 'trips', emoji: '✈️', steps: [1, 2, 3, 5, 7, 10, 15, 20, 30, 50] },
  { id: 'gifts', emoji: '🎁', steps: [1, 3, 5, 10, 20, 35, 50, 75, 100] },
  { id: 'notes', emoji: '💌', steps: [1, 5, 10, 25, 50, 100, 200, 365, 500, 1000] },
  { id: 'checkins', emoji: '📝', steps: [1, 4, 8, 13, 26, 52, 78, 104, 156, 260] },
  { id: 'blind', emoji: '🎭', steps: [1, 3, 5, 10, 20, 30, 50, 75, 100] },
  { id: 'goals', emoji: '🐷', steps: [1, 5, 10, 25, 50, 100, 200, 365] },
  { id: 'taps', emoji: '💞', steps: [1, 7, 14, 30, 60, 100, 200, 365, 500] },
  { id: 'moods', emoji: '🙂', steps: [1, 7, 14, 30, 60, 100, 200, 365, 500, 1000] },
  { id: 'photos', emoji: '📸', steps: [1, 7, 30, 60, 100, 200, 365, 500, 1000] },
  { id: 'music', emoji: '🎧', steps: [1, 7, 30, 60, 100, 200, 365, 500] },
  { id: 'events', emoji: '🗓️', steps: [1, 5, 10, 25, 50, 100, 200, 365, 500] },
]
/** A medal for each step of a chain. */
export const MEDALS = ['🥉', '🥈', '🥇', '🏅', '🎖️', '💎', '👑', '🌟', '🔱', '✨', '☄️', '🌌', '♾️', '🏵️']
export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV']

/** Where a chain stands: steps reached, the next goal and how far along it is. */
export function chainStep(c: Chain, have: number) {
  const reached = c.steps.filter((n) => have >= n).length
  const next = c.steps[reached]
  const prev = reached ? c.steps[reached - 1] : 0
  return { reached, next, done: next === undefined, pct: next === undefined ? 100 : ((have - prev) / (next - prev)) * 100 }
}

/* ---------- one-off achievements ---------- */
export type AchId = 'firstQuest' | 'fullDay' | 'questWeek' | 'firstNote' | 'firstBlind' | 'firstTrip' | 'firstCheckin' | 'firstPlace'
  | 'firstCook' | 'firstFilm' | 'firstGift' | 'tapsGoal' | 'nightOwls' | 'earlyBirds' | 'flame7' | 'flame30' | 'flame100' | 'flame365'
  | 'bothMoods' | 'weekend' | 'explorers' | 'goalReached' | 'checkinMonth' | 'level10' | 'level50' | 'level100' | 'level250' | 'level500'
  | 'marathon' | 'stamp1' | 'stamp13' | 'stamp52' | 'monthDone' | 'joker' | 'comeback' | 'anniversary'
export interface Ach { id: AchId; emoji: string; test: (c: Ctx) => boolean }

interface Ctx { s: State; p: Progress; m: Marathon; count: (k: Act['kind']) => number; acts: Act[] }
const hourOf = (a: Act) => new Date(a.createdAt).getHours()

export const ACHIEVEMENTS: Ach[] = [
  { id: 'firstQuest', emoji: '🎯', test: (c) => c.count('quest') > 0 },
  { id: 'fullDay', emoji: '✅', test: (c) => [...questDays(c.acts).values()].some((n) => n >= 3) },
  { id: 'questWeek', emoji: '🗓️', test: (c) => longestQuestRun(c.acts) >= 7 },
  { id: 'firstNote', emoji: '💌', test: (c) => c.count('note') > 0 },
  { id: 'firstBlind', emoji: '🎭', test: (c) => c.count('blind') > 0 },
  { id: 'firstTrip', emoji: '✈️', test: (c) => c.count('trip') > 0 },
  { id: 'firstCheckin', emoji: '📝', test: (c) => c.count('checkin') > 0 },
  { id: 'firstPlace', emoji: '📍', test: (c) => c.count('date') > 0 },
  { id: 'firstCook', emoji: '🍳', test: (c) => c.count('recipe') > 0 },
  { id: 'firstFilm', emoji: '🍿', test: (c) => c.count('watch') > 0 },
  { id: 'firstGift', emoji: '🎁', test: (c) => c.count('wish') > 0 },
  { id: 'tapsGoal', emoji: '💞', test: (c) => tapDays(c.acts) > 0 },
  { id: 'nightOwls', emoji: '🦉', test: (c) => c.acts.some((a) => a.kind !== 'taps' && hourOf(a) < 4) },
  { id: 'earlyBirds', emoji: '🐦', test: (c) => c.acts.some((a) => a.kind !== 'taps' && hourOf(a) >= 5 && hourOf(a) < 7) },
  { id: 'flame7', emoji: '🔥', test: (c) => c.p.best >= 7 },
  { id: 'flame30', emoji: '🔥', test: (c) => c.p.best >= 30 },
  { id: 'flame100', emoji: '💯', test: (c) => c.p.best >= 100 },
  { id: 'flame365', emoji: '🎆', test: (c) => c.p.best >= 365 },
  { id: 'bothMoods', emoji: '🙂', test: (c) => bothMoodDays(c.s) >= 7 },
  { id: 'weekend', emoji: '🛋️', test: (c) => [...c.p.fed].some((d) => new Date(d + 'T00:00:00').getDay() === 6 && c.p.fed.has(addDays(d, 1))) },
  { id: 'explorers', emoji: '🧭', test: (c) => new Set(c.acts.filter((a) => a.kind !== 'taps').map((a) => a.kind)).size >= 10 },
  { id: 'goalReached', emoji: '🐷', test: (c) => c.acts.some((a) => a.kind === 'goal' && a.ref.endsWith(':reached')) },
  { id: 'checkinMonth', emoji: '🗓️', test: (c) => checkinWeeks(c.acts) >= 4 },
  { id: 'level10', emoji: '⭐', test: (c) => c.p.level >= 10 },
  { id: 'level50', emoji: '🌟', test: (c) => c.p.level >= 50 },
  { id: 'level100', emoji: '🏆', test: (c) => c.p.level >= 100 },
  { id: 'level250', emoji: '💎', test: (c) => c.p.level >= 250 },
  { id: 'level500', emoji: '♾️', test: (c) => c.p.level >= 500 },
  { id: 'marathon', emoji: '🌍', test: (c) => (c.s.game.marathon?.runs.length ?? 0) > 0 },
  { id: 'stamp1', emoji: '🛂', test: (c) => c.m.stamps.length >= 1 },
  { id: 'stamp13', emoji: '🗺️', test: (c) => c.m.stamps.length >= 13 },
  { id: 'stamp52', emoji: '🌐', test: (c) => c.m.stamps.length >= 52 },
  { id: 'monthDone', emoji: '📆', test: (c) => c.m.months.some((x) => x.complete) },
  { id: 'joker', emoji: '🃏', test: (c) => (c.s.game.marathon?.claims?.length ?? 0) > 0 },
  { id: 'comeback', emoji: '🌱', test: (c) => comeback(c.p) },
  { id: 'anniversary', emoji: '💍', test: (c) => !!c.s.since && addDays(c.s.since, 365) <= today() },
]

/* ---------- couple titles by level ---------- */
export const TITLES = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 125, 150, 175, 200, 250, 300, 350, 400, 450, 500] as const
export const titleOf = (level: number) => TITLES.reduce<number>((t, n) => (level >= n ? n : t), 1)
export const nextTitle = (level: number) => TITLES.find((n) => n > level)

/* ---------- counting ---------- */
function questDays(acts: Act[]) {
  const m = new Map<string, number>()
  for (const a of acts) if (a.kind === 'quest') m.set(a.date, (m.get(a.date) ?? 0) + 1)
  return m
}
/** Longest run of days with all three quests. */
function longestQuestRun(acts: Act[]) {
  const full = [...questDays(acts)].filter(([, n]) => n >= 3).map(([d]) => d).sort()
  let best = 0, run = 0, prev = ''
  for (const d of full) { run = prev && addDays(prev, 1) === d ? run + 1 : 1; best = Math.max(best, run); prev = d }
  return best
}
function tapDays(acts: Act[]) {
  const per = new Map<string, { a: number; j: number }>()
  for (const a of acts) if (a.kind === 'taps') { const t = per.get(a.date) ?? { a: 0, j: 0 }; t[a.createdBy] = Math.max(t[a.createdBy], a.count ?? 0); per.set(a.date, t) }
  return [...per.values()].filter((t) => t.a >= TAP_GOAL && t.j >= TAP_GOAL).length
}
function bothMoodDays(s: State) {
  const by = new Map<string, Set<string>>()
  for (const m of s.moods) { const x = by.get(m.date) ?? new Set(); x.add(m.createdBy); by.set(m.date, x) }
  return [...by.values()].filter((x) => x.size >= 2).length
}
/** Weeks where both answered the check-in (acts checkin:<week>:<role>). */
function checkinWeeks(acts: Act[]) {
  const by = new Map<string, number>()
  for (const a of acts) if (a.kind === 'checkin') { const w = a.ref.split(':')[0]; by.set(w, (by.get(w) ?? 0) + 1) }
  return [...by.values()].filter((n) => n >= 2).length
}
/** The flame went out after a while and is burning again for three days. */
function comeback(p: Progress) {
  const days = [...p.fed].sort()
  for (let i = 1; i < days.length; i++) {
    if (addDays(days[i - 1], 7) <= days[i] && days[i + 2] && addDays(days[i], 2) === days[i + 2]) return true
  }
  return false
}

export interface Progression {
  p: Progress; m: Marathon
  chains: Record<ChainId, number>
  achieved: Set<AchId>
  /** Steps reached across all chains, and how many there are. */
  medals: number; medalsAll: number
}

let memo: { acts: unknown; game: unknown; trips: unknown; moods: unknown; since: unknown; now: string; r: Progression } | undefined
export function progressionOf(s: State, now = today()): Progression {
  if (memo && memo.acts === s.acts && memo.game === s.game && memo.trips === s.trips && memo.moods === s.moods && memo.since === s.since && memo.now === now) return memo.r
  const p = progress(s.acts, pausesOf(s), now)
  const m = marathonOf(s, now)
  const by = new Map<Act['kind'], number>()
  for (const a of s.acts) by.set(a.kind, (by.get(a.kind) ?? 0) + 1)
  const count = (k: Act['kind']) => by.get(k) ?? 0
  const chains: Record<ChainId, number> = {
    days: p.fed.size, flame: p.best, level: p.level, quests: count('quest'), stamps: m.stamps.length,
    tasks: count('task'), shop: count('grocery'), cook: count('recipe'), watch: count('watch'), dates: count('date'),
    trips: count('trip'), gifts: count('wish'), notes: count('note'), checkins: checkinWeeks(s.acts), blind: count('blind'),
    goals: count('goal'), taps: tapDays(s.acts), moods: bothMoodDays(s), photos: count('photo'), music: count('music'), events: count('event'),
  }
  const ctx: Ctx = { s, p, m, count, acts: s.acts }
  const achieved = new Set(ACHIEVEMENTS.filter((a) => a.test(ctx)).map((a) => a.id))
  const medals = CHAINS.reduce((n, c) => n + chainStep(c, chains[c.id]).reached, 0)
  const r: Progression = { p, m, chains, achieved, medals, medalsAll: CHAINS.reduce((n, c) => n + c.steps.length, 0) }
  memo = { acts: s.acts, game: s.game, trips: s.trips, moods: s.moods, since: s.since, now, r }
  return r
}

/** Everything unlocked so far, as stable keys (for «new!» banners): achievements, chain steps, titles. */
export function unlockKeys(r: Progression): string[] {
  const keys = [...r.achieved].map((a) => `a:${a}`)
  for (const c of CHAINS) { const n = chainStep(c, r.chains[c.id]).reached; for (let i = 0; i < n; i++) keys.push(`c:${c.id}:${i}`) }
  for (const t of TITLES) if (r.p.level >= t && t > 1) keys.push(`t:${t}`)
  return keys
}
