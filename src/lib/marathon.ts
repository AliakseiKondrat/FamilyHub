import type { State } from '../types'
import { addDays, today } from './date'
import { pausesOf } from './game'
import { SEASON_A, SEASON_B, cultureOf, type Culture } from './cultures'

/*
 * The «Around the world» marathon: an extension of the flame, not a separate game.
 * A couple joins (both see it, the setting is shared). Every ISO week has its culture (cultures.ts); a week where every
 * day has all three daily quests done earns that culture's atmosphere and a passport stamp. Pauses (vacation, trips)
 * neither count nor break. A whole month of quests (three days of slack) earns the month's postcard and a joker, which
 * claims any culture the couple missed — so nothing is lost for good. Weeks in a row earn travel rewards.
 * Leaving the marathon resets the run (weeks in a row start from zero); everything already earned stays.
 * Everything is computed from the shared record of quests, so both phones agree without a server.
 */

export const QUESTS_A_DAY = 3
/** A week needs at least this many days inside the run (joining on a Friday starts with the next week). */
const MIN_DAYS = 4
/** Days a month may miss and still count. */
const MONTH_SLACK = 3

/** Rewards for weeks in a row. */
export const STREAK_REWARDS: { weeks: number; item: string }[] = [
  { weeks: 2, item: 'mascot:parrot' }, { weeks: 4, item: 'scene:globe' }, { weeks: 8, item: 'mascot:camel' },
  { weeks: 13, item: 'piggy:suitcase' }, { weeks: 26, item: 'mascot:kangaroo' }, { weeks: 39, item: 'card:passport' },
  { weeks: 52, item: 'atmo:c-world' },
]
export const cultureItem = (c: Culture) => `atmo:c-${c.code}`
/** The month's postcard: card:m01 … card:m12. */
export const monthItem = (month: string) => `card:m${month.slice(5, 7)}`

/** ISO week-numbering year and week of a date (weeks start on Monday; week 1 holds the first Thursday). */
export function isoWeek(iso: string) {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + 3) // this week's Thursday
  const year = d.getUTCFullYear()
  const week = 1 + Math.floor((d.getTime() - Date.UTC(year, 0, 1)) / 86400000 / 7)
  return { year, week }
}
const mondayOfIso = (iso: string) => { const d = new Date(iso + 'T00:00:00Z'); return addDays(iso, -((d.getUTCDay() + 6) % 7)) }
export const cultureOfDate = (iso: string) => { const w = isoWeek(iso); return cultureOf(w.year, w.week) }

export type DayMark = 'done' | 'part' | 'miss' | 'pause' | 'today' | 'future' | 'out'
export interface Week {
  monday: string; year: number; week: number; culture: Culture
  days: { date: string; mark: DayMark; n: number }[]
  done: number; eligible: boolean; complete: boolean; past: boolean; failed: boolean
}
export interface Month { month: string; done: number; need: number; eligible: boolean; complete: boolean; past: boolean }
export interface Marathon {
  joined: boolean; since?: string
  /** This week, shown even before joining (as a preview of what's on offer). */
  current: Week
  weeks: Week[]
  /** Weeks in a row in the current run, and the best run ever. */
  streak: number; best: number
  month: Month; months: Month[]
  earned: Set<string>
  stamps: Culture[]
  missed: Culture[]
  jokers: number
  nextStreak?: { weeks: number; item: string }
}

let memo: { acts: unknown; game: unknown; trips: unknown; now: string; m: Marathon } | undefined

export function marathonOf(s: State, now = today()): Marathon {
  if (memo && memo.acts === s.acts && memo.game === s.game && memo.trips === s.trips && memo.now === now) return memo.m
  const runs = s.game.marathon?.runs ?? []
  const claims = s.game.marathon?.claims ?? []
  const open = runs.find((r) => !r.to)
  const pauses = pausesOf(s)
  const qn = new Map<string, number>()
  for (const a of s.acts) if (a.kind === 'quest') qn.set(a.date, (qn.get(a.date) ?? 0) + 1)
  const inRun = (d: string) => runs.some((r) => d >= r.from && (!r.to || d <= r.to))
  const paused = (d: string) => pauses.some((p) => d >= p.from && d <= p.to)
  const mark = (d: string): DayMark => {
    if (d > now) return open && d >= open.from ? 'future' : 'out'
    if (!inRun(d)) return 'out'
    const n = qn.get(d) ?? 0
    if (n >= QUESTS_A_DAY) return 'done'
    if (paused(d)) return 'pause'
    if (d === now) return 'today'
    return n > 0 ? 'part' : 'miss'
  }

  const weekAt = (monday: string): Week => {
    const { year, week } = isoWeek(monday)
    const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i)).map((date) => ({ date, mark: mark(date), n: qn.get(date) ?? 0 }))
    const counted = days.filter((d) => d.mark !== 'out' && d.mark !== 'pause')
    const done = days.filter((d) => d.mark === 'done').length
    const failed = days.some((d) => d.mark === 'miss' || d.mark === 'part')
    const past = addDays(monday, 6) < now
    const eligible = counted.length >= MIN_DAYS
    const finished = !days.some((d) => d.mark === 'today' || d.mark === 'future')
    // The run must reach the week's Sunday: leaving mid-week doesn't turn a short week into a whole one.
    const endsIn = days[6].mark !== 'out'
    return { monday, year, week, culture: cultureOf(year, week), days, done, eligible, past, failed, complete: eligible && endsIn && !failed && finished && done >= MIN_DAYS }
  }

  // Every week a run touched, oldest first.
  const weeks: Week[] = []
  const first = runs.map((r) => r.from).sort()[0]
  if (first) for (let m = mondayOfIso(first); m <= now; m = addDays(m, 7)) { const w = weekAt(m); if (w.days.some((d) => d.mark !== 'out')) weeks.push(w) }
  const current = weeks.find((w) => w.monday === mondayOfIso(now)) ?? weekAt(mondayOfIso(now))

  // Weeks in a row: a short first week of a run doesn't break it; the week in progress doesn't count until it's complete.
  const runOf = (w: Week) => runs.findIndex((r) => w.days.some((d) => d.date >= r.from && (!r.to || d.date <= r.to)))
  let best = 0, streak = 0, run = -1
  for (const w of weeks) {
    const r = runOf(w)
    if (r !== run) { run = r; streak = 0 }
    if (w.complete) streak++
    else if (w.past && w.eligible) streak = 0
    best = Math.max(best, streak)
  }
  if (!open) streak = 0
  else if (current.past === false && !current.complete && current.failed) streak = 0

  // Months.
  const months: Month[] = []
  const monthKeys = [...new Set(weeks.flatMap((w) => w.days.filter((d) => d.mark !== 'out').map((d) => d.date.slice(0, 7))))].sort()
  const monthAt = (key: string): Month => {
    const [y, mo] = key.split('-').map(Number)
    const len = new Date(Date.UTC(y, mo, 0)).getUTCDate()
    const all = Array.from({ length: len }, (_, i) => `${key}-${String(i + 1).padStart(2, '0')}`)
    const marks = all.map((d) => ({ d, m: mark(d) }))
    const counted = marks.filter((x) => x.m !== 'out' && x.m !== 'pause')
    const done = marks.filter((x) => x.m === 'done').length
    const need = Math.max(1, counted.length - MONTH_SLACK)
    const eligible = counted.length >= 14
    return { month: key, done, need, eligible, complete: eligible && done >= need, past: all[len - 1] < now }
  }
  for (const k of monthKeys) months.push(monthAt(k))
  const month = months.find((m) => m.month === now.slice(0, 7)) ?? monthAt(now.slice(0, 7))

  // What the marathon has given.
  const earned = new Set<string>()
  const stamps: Culture[] = []
  const stamp = (c: Culture) => { if (!earned.has(cultureItem(c))) { earned.add(cultureItem(c)); stamps.push(c) } }
  for (const w of weeks) if (w.complete) stamp(w.culture)
  for (const code of claims) { const w = weeks.find((x) => x.culture.code === code); if (w) stamp(w.culture) }
  for (const r of STREAK_REWARDS) if (best >= r.weeks) earned.add(r.item)
  const monthsDone = months.filter((m) => m.complete)
  for (const m of monthsDone) earned.add(monthItem(m.month))
  const missed = weeks.filter((w) => w.past && w.eligible && !w.complete && !earned.has(cultureItem(w.culture))).map((w) => w.culture)
    .filter((c, i, a) => a.findIndex((x) => x.code === c.code) === i)
  const m: Marathon = {
    joined: !!open, since: open?.from, current, weeks, streak, best, month, months, earned, stamps, missed,
    jokers: Math.max(0, monthsDone.length - claims.length),
    nextStreak: STREAK_REWARDS.find((r) => best < r.weeks),
  }
  memo = { acts: s.acts, game: s.game, trips: s.trips, now, m }
  return m
}

/* ---------- actions (inside update()) ---------- */
export function joinMarathon(st: State, now = today()) {
  const mar = st.game.marathon ?? { runs: [] }
  if (mar.runs.some((r) => !r.to)) return
  st.game = { ...st.game, marathon: { ...mar, runs: [...mar.runs, { from: now }] } }
}
/** Leaving ends the run: weeks in a row start over; earned rewards stay. */
export function leaveMarathon(st: State, now = today()) {
  const mar = st.game.marathon
  if (!mar) return
  st.game = { ...st.game, marathon: { ...mar, runs: mar.runs.map((r) => (r.to ? r : { ...r, to: addDays(now, -1) < r.from ? r.from : addDays(now, -1) })) } }
}
/** Spend a joker on a missed culture. */
export function claimCulture(st: State, code: string) {
  const mar = st.game.marathon
  if (!mar || (mar.claims ?? []).includes(code)) return
  st.game = { ...st.game, marathon: { ...mar, claims: [...(mar.claims ?? []), code] } }
}

/** When a culture's week comes round next (cultures repeat every two years). */
export function nextWeekOf(code: string, now = today()) {
  for (let i = 0; i < 2 * 53 + 2; i++) {
    const d = addDays(now, i * 7)
    const w = isoWeek(d)
    const season = w.week >= 53 ? [] : w.year % 2 === 0 ? SEASON_A : SEASON_B
    if ((w.week >= 53 && code === 'world') || season[w.week - 1]?.code === code) {
      const day = new Date(d + 'T00:00:00Z').getUTCDay()
      return addDays(d, -((day + 6) % 7))
    }
  }
  return undefined
}

