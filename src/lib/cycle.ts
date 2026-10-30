import type { State } from '../types'
import { addDays, diffDays, today } from './date'

/** Average gap between period starts (falls back to the configured length). */
export function avgCycle(s: State) {
  const starts = [...s.periods].map((p) => p.start).sort()
  if (starts.length < 2) return s.cycleLength
  const gaps = starts.slice(1).map((d, i) => diffDays(d, starts[i])).filter((g) => g > 15 && g < 60)
  return gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : s.cycleLength
}

export function lastStart(s: State) {
  return [...s.periods].map((p) => p.start).sort().pop()
}

export function nextStart(s: State) {
  const last = lastStart(s)
  if (!last) return undefined
  let next = addDays(last, avgCycle(s))
  while (next < today()) next = addDays(next, avgCycle(s))
  return next
}

/**
 * Period days only — logged ones plus predictions for the next few cycles.
 * This is the single thing the partner is allowed to see from the cycle module.
 */
export function periodDays(s: State): Set<string> {
  const days = new Set<string>()
  const len = s.periodLength
  for (const p of s.periods) {
    const end = p.end ?? addDays(p.start, len - 1)
    for (let d = p.start; d <= end; d = addDays(d, 1)) days.add(d)
  }
  const last = lastStart(s)
  if (last) {
    const cyc = avgCycle(s)
    for (let i = 1; i <= 4; i++) {
      const st = addDays(last, cyc * i)
      for (let k = 0; k < len; k++) days.add(addDays(st, k))
    }
  }
  return days
}

export function cycleDay(s: State) {
  const last = lastStart(s)
  return last ? diffDays(today(), last) + 1 : undefined
}
