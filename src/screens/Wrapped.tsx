import { useState } from 'react'
import { other, useApp, visible } from '../store'
import { useT } from '../i18n'
import { Row, Section, Segmented, Sheet, toast } from '../ui'
import { fmtMoney, today } from '../lib/date'
import { pausesOf, progress } from '../lib/game'
import { currencyOf } from './Budget'
import type { Base, State } from '../types'

/*
 * «Our year»: what we did together in a year, counted from our own data — dates and places, trips, recipes,
 * tasks, notes, surprises, wishes, photos, songs, days with the flame — plus the place and the recipe of the year.
 * A card to screenshot or share as text. Also the flashback: this day in earlier years, across sections.
 */

const inYear = (iso: string | undefined, y: string) => !!iso && iso.slice(0, 4) === y

export function yearStats(s: State, year: string) {
  const v = <T extends Base>(list: T[]) => visible(list, s.me)
  const places = v(s.notes).filter((n) => n.module === 'dates')
  const visits = places.flatMap((p) => (p.visits ?? []).filter((x) => inYear(x.date, year)).map((x) => ({ p, x })))
  const placeCount = new Map<string, number>()
  for (const { p } of visits) placeCount.set(p.id, (placeCount.get(p.id) ?? 0) + 1)
  const placeOfYear = [...placeCount].sort((a, b) => b[1] - a[1])[0]
  const cooks = v(s.recipes).flatMap((r) => (r.cooks ?? []).filter((c) => inYear(c.date, year)).map((c) => ({ r, c })))
  const recipeCount = new Map<string, number>()
  for (const { r } of cooks) recipeCount.set(r.id, (recipeCount.get(r.id) ?? 0) + 1)
  const recipeOfYear = [...recipeCount].sort((a, b) => b[1] - a[1])[0]
  const blind = v(s.blindDates).filter((b) => inYear(b.when, year))
  const p = progress(s.acts, pausesOf(s))
  return {
    dates: visits.length + blind.length,
    places: places.filter((n) => inYear(n.createdAt, year)).length,
    trips: v(s.trips).filter((x) => inYear(x.start, year)).length,
    recipes: cooks.length,
    tasks: v(s.tasks).filter((k) => inYear(k.doneAt, year)).length + s.acts.filter((a) => a.kind === 'task' && inYear(a.date, year) && a.ref.includes(':')).length,
    notes: v(s.loveNotes).filter((n) => inYear(n.deliverAt, year) && n.deliverAt <= new Date().toISOString()).length,
    blind: blind.length,
    wishes: v(s.wishes).filter((w) => w.got && (inYear(w.gotAt, year) || (!w.gotAt && inYear(w.createdAt, year)))).length,
    photos: v(s.photos).filter((x) => inYear(x.createdAt, year)).length,
    songs: v(s.music).filter((x) => inYear(x.createdAt, year)).length,
    flame: [...p.fed].filter((d) => d.startsWith(year)).length,
    spent: v(s.expenses).filter((e) => e.shared && !e.income && !e.settlement && inYear(e.date, year)).reduce((a, e) => a + e.amount, 0),
    placeOfYear: placeOfYear ? places.find((x) => x.id === placeOfYear[0])?.title : undefined,
    recipeOfYear: recipeOfYear ? s.recipes.find((x) => x.id === recipeOfYear[0])?.title : undefined,
  }
}

export function WrappedSheet({ onClose }: { onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const now = today().slice(0, 4)
  const years = [String(+now - 1), now]
  const [year, setYear] = useState(now)
  const st = yearStats(s, year)
  const money = fmtMoney(st.spent, currencyOf(s), s.lang)
  const tiles: [string, number | string, string][] = [
    ['💕', st.dates, t('wr.dates')], ['✈️', st.trips, t('wr.trips')], ['📍', st.places, t('wr.places')],
    ['🍳', st.recipes, t('wr.recipes')], ['✅', st.tasks, t('wr.tasks')], ['💌', st.notes, t('wr.notes')],
    ['🎭', st.blind, t('wr.blind')], ['🎁', st.wishes, t('wr.wishes')], ['📸', st.photos, t('wr.photos')],
    ['🎧', st.songs, t('wr.songs')], ['🔥', st.flame, t('wr.flame')], ['💶', money, t('wr.spent')],
  ]
  const shown = tiles.filter(([, n]) => n !== 0 && n !== '0')
  const share = async () => {
    const text = `${s.users[s.me].name} & ${s.users[other(s.me)].name} · ${t('wr.title', { year })}\n` +
      shown.map(([e, n, l]) => `${e} ${n} ${l}`).join('\n') +
      (st.placeOfYear ? `\n📍 ${t('wr.placeOfYear')}: ${st.placeOfYear}` : '') + (st.recipeOfYear ? `\n🍳 ${t('wr.recipeOfYear')}: ${st.recipeOfYear}` : '')
    try {
      if (navigator.share) await navigator.share({ text })
      else { await navigator.clipboard.writeText(text); toast(t('copied')) }
    } catch { /* cancelled */ }
  }
  return (
    <Sheet title={`🎉 ${t('wr.title', { year })}`} onClose={onClose}>
      <div style={{ margin: '0 16px 12px' }}><Segmented inSheet value={year} onChange={setYear} options={years.map((y) => ({ value: y, label: y }))} /></div>
      <div className="wr-card">
        <div className="wr-head">{s.users[s.me].emoji} {s.users[s.me].name} & {s.users[other(s.me)].name} {s.users[other(s.me)].emoji}</div>
        <div className="wr-year">{year}</div>
        {shown.length === 0 && <div className="wr-empty">{t('wr.empty')}</div>}
        <div className="wr-grid">
          {shown.map(([e, n, l]) => <div key={l} className="wr-tile"><span>{e}</span><b>{n}</b><small>{l}</small></div>)}
        </div>
        {(st.placeOfYear || st.recipeOfYear) && (
          <div className="wr-best">
            {st.placeOfYear && <div>📍 <small>{t('wr.placeOfYear')}</small><b>{st.placeOfYear}</b></div>}
            {st.recipeOfYear && <div>🍳 <small>{t('wr.recipeOfYear')}</small><b>{st.recipeOfYear}</b></div>}
          </div>
        )}
      </div>
      <div className="col-hint" style={{ margin: '0 30px 12px', textAlign: 'center' }}>{t('wr.screenshot')}</div>
      <Section><button className="row tap accent" onClick={share}>📤 {t('share')}</button></Section>
    </Sheet>
  )
}

/** This day in earlier years, across sections (photos have their own row of pictures). */
export function flashbackItems(s: State) {
  const d = today(), md = d.slice(5), y = d.slice(0, 4)
  const was = (iso?: string) => !!iso && iso.slice(5, 10) === md && iso.slice(0, 4) < y
  const ago = (iso: string) => +y - +iso.slice(0, 4)
  const out: { emoji: string; title: string; years: number }[] = []
  for (const tr of visible(s.trips, s.me)) if (was(tr.start)) out.push({ emoji: '✈️', title: tr.title || tr.destination, years: ago(tr.start) })
  for (const p of visible(s.notes, s.me).filter((n) => n.module === 'dates')) for (const x of p.visits ?? []) if (was(x.date)) out.push({ emoji: '📍', title: p.title, years: ago(x.date) })
  for (const r of visible(s.recipes, s.me)) for (const c of r.cooks ?? []) if (was(c.date)) out.push({ emoji: '🍳', title: r.title, years: ago(c.date) })
  for (const n of visible(s.loveNotes, s.me)) if (was(n.deliverAt)) out.push({ emoji: '💌', title: n.text.length > 40 ? n.text.slice(0, 40) + '…' : n.text, years: ago(n.deliverAt) })
  for (const b of visible(s.blindDates, s.me)) if (was(b.when)) out.push({ emoji: '🎭', title: '⭐'.repeat(b.rating ?? 0) || '🎭', years: ago(b.when) })
  for (const e of visible(s.events, s.me)) if (e.repeat === 'none' && was(e.date)) out.push({ emoji: e.emoji || '📅', title: e.title, years: ago(e.date) })
  return out
}

export function FlashbackRows() {
  const s = useApp()
  const t = useT()
  const items = flashbackItems(s)
  return <>{items.slice(0, 6).map((x, i) => <Row key={i} icon={x.emoji} title={x.title} detail={t('wr.yearsAgo', { n: x.years })} />)}</>
}

