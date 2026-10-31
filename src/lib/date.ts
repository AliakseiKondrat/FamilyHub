import type { Lang, Repeat } from '../types'

const pad = (n: number) => String(n).padStart(2, '0')

export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const fromISO = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const today = () => toISO(new Date())

export function addDays(iso: string, n: number) {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

export function addMonths(iso: string, n: number) {
  const d = fromISO(iso)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, last))
  return toISO(d)
}

export const diffDays = (a: string, b: string) => Math.round((fromISO(a).getTime() - fromISO(b).getTime()) / 86400000)

export function nextRepeat(iso: string, r: Repeat) {
  switch (r) {
    case 'daily': return addDays(iso, 1)
    case 'weekly': return addDays(iso, 7)
    case 'monthly': return addMonths(iso, 1)
    case 'yearly': return addMonths(iso, 12)
    default: return iso
  }
}

export const LOCALES: Record<Lang, string> = { ru: 'ru-RU', en: 'en-GB', pl: 'pl-PL', es: 'es-ES' }

export function fmtDate(iso: string, lang: Lang, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) {
  return new Intl.DateTimeFormat(LOCALES[lang], opts).format(fromISO(iso))
}

/** Mirrors the "amounts without cents" setting; the store keeps it current. */
let roundMoney = false
export const setMoneyRounding = (v: boolean) => { roundMoney = v }

export function fmtMoney(amount: number, currency: string, lang: Lang) {
  const round = roundMoney
  return new Intl.NumberFormat(LOCALES[lang], { style: 'currency', currency, maximumFractionDigits: !round && amount % 1 ? 2 : 0 }).format(round ? Math.round(amount) : amount)
}

/** Monday-first weekday names. */
export function weekdayNames(lang: Lang) {
  const base = new Date(2024, 0, 1) // a Monday
  return Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(LOCALES[lang], { weekday: 'short' }).format(new Date(base.getTime() + i * 86400000)))
}

/** Whether a repeating item with start `start` falls on `day`. */
export function occursOn(start: string, repeat: Repeat, day: string, end?: string) {
  if (day < start) return false
  if (end && repeat === 'none') return day <= end
  if (repeat === 'none') return day === start
  const s = fromISO(start), d = fromISO(day)
  switch (repeat) {
    case 'daily': return true
    case 'weekly': return diffDays(day, start) % 7 === 0
    case 'monthly': return s.getDate() === d.getDate()
    case 'yearly': return s.getDate() === d.getDate() && s.getMonth() === d.getMonth()
  }
}

/**
 * Pulls "today / tomorrow / 18:00 / 12.11" out of a quick-add line in any of the four languages.
 * "купить цветы завтра 18:00" → { title: "купить цветы", due: <tomorrow>, time: "18:00" }
 */
export function parseQuick(text: string): { title: string; due?: string; time?: string } {
  let s = ' ' + text + ' '
  let due: string | undefined
  let time: string | undefined
  const take = (re: RegExp, fn: (m: RegExpMatchArray) => void) => {
    const m = s.match(re)
    if (m) { fn(m); s = s.replace(re, ' ') }
  }
  take(/\s(послезавтра|pojutrze|pasado mañana|pasado manana|day after tomorrow)\s/i, () => { due = addDays(today(), 2) })
  take(/\s(завтра|tomorrow|jutro|mañana|manana)\s/i, () => { due = addDays(today(), 1) })
  take(/\s(сегодня|today|dziś|dzis|dzisiaj|hoy)\s/i, () => { due = today() })
  take(/\s(?:в|at|o|a las)?\s?([01]?\d|2[0-3]):([0-5]\d)\s/i, (m) => { time = `${pad(+m[1])}:${m[2]}` })
  take(/\s(\d{1,2})[./](\d{1,2})\s/, (m) => {
    const now = new Date()
    let d = new Date(now.getFullYear(), +m[2] - 1, +m[1])
    if (toISO(d) < today()) d = new Date(now.getFullYear() + 1, +m[2] - 1, +m[1])
    due = toISO(d)
  })
  if (time && !due) due = today()
  return { title: s.replace(/\s+/g, ' ').trim(), due, time }
}
