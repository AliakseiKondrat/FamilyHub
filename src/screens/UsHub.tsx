import { useMemo, useState } from 'react'
import { base, other, update, useApp, visible } from '../store'
import { useT } from '../i18n'
import { useNav } from '../nav'
import { DateRow, Row, Section, Sheet, TextRow, haptic } from '../ui'
import { addDays, diffDays, fmtDate, occursOn, today } from '../lib/date'
import { thoughtFor } from '../lib/thoughts'
import { activeLook, activePiggy, lookOf } from '../lib/unlocks'
import { PiggyBar, openCollection } from './Collection'
import { PhotoThumb, useBlobUrl } from './Photos'
import { NoteComposer } from './LoveNotes'
import { hasExamples, removeExamples } from '../lib/examples'
import type { CalEvent, State } from '../types'

/*
 * The couple's hub on the Us screen: who we are and for how long, what's coming up, a warm thought,
 * an evening idea, our important dates, savings and memories — around the ritual (mascot, flame, quests).
 */

/** Days counts worth a note on the way: 100, 200 … 1000, 1500 … */
const ROUND = [100, 200, 300, 500, 700, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000]

/** Next date (from `from`, inclusive) a yearly date comes round. */
function nextYearly(date: string, from: string) {
  const md = date.slice(5)
  const y = +from.slice(0, 4)
  let d = `${y}-${md}`
  if (md === '02-29' && new Date(y, 1, 29).getMonth() !== 1) d = `${y}-02-28`
  return d >= from ? d : `${y + 1}-${md === '02-29' ? '03-01' : md}`
}

export function useTogether(s: State) {
  const d = today()
  if (!s.since || s.since > d) return null
  return diffDays(d, s.since) + 1
}

/* ---------- couple card (in the hero) ---------- */
function CouplePhoto({ id }: { id: string }) {
  const url = useBlobUrl(id + ':thumb')
  return url ? <img src={url} alt="" /> : null
}

export function CoupleCard() {
  const s = useApp()
  const t = useT()
  const [sheet, setSheet] = useState<'since' | 'photo' | null>(null)
  const n = useTogether(s)
  const me = s.users[s.me], partner = s.users[other(s.me)]
  const photo = s.couplePhoto && s.photos.some((p) => p.id === s.couplePhoto) ? s.couplePhoto : undefined
  const decor = lookOf(activeLook(s)).decor
  return (
    <div className="couple-card">
      <button className="couple-avatars" onClick={() => setSheet('photo')} aria-label={t('hub.photo')}>
        {photo ? <span className="couple-photo"><CouplePhoto id={photo} /></span> : <><span>{me.emoji}</span><span>{partner.emoji}</span></>}
        {decor && <i className="couple-decor">{decor}</i>}
      </button>
      <div className="couple-names">{me.name} & {partner.name}</div>
      <button className="couple-since lg" onClick={() => setSheet('since')}>{n ? `💕 ${t('hub.together', { n: n.toLocaleString() })}` : t('hub.askSince')}</button>
      {sheet === 'since' && <SinceSheet onClose={() => setSheet(null)} />}
      {sheet === 'photo' && <PhotoSheet onClose={() => setSheet(null)} />}
    </div>
  )
}

function SinceSheet({ onClose }: { onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const [v, setV] = useState<string | undefined>(s.since ?? today())
  return (
    <Sheet title={t('hub.sinceTitle')} onClose={onClose} onDone={() => update((st) => { st.since = v })}>
      <Section footer={t('hub.sinceHint')}><DateRow label={`💕 ${t('date')}`} value={v} onChange={setV} /></Section>
    </Sheet>
  )
}

function PhotoSheet({ onClose }: { onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const photos = visible(s.photos, s.me).filter((p) => !p.privateTo).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 60)
  const pick = (id?: string) => { update((st) => { st.couplePhoto = id }); haptic(); onClose() }
  return (
    <Sheet title={t('hub.photo')} onClose={onClose}>
      <div className="col-hint" style={{ margin: '0 30px 12px' }}>{photos.length ? t('hub.photoPick') : t('hub.photoNone')}</div>
      {photos.length > 0 && <div className="photos" style={{ margin: '0 16px 16px' }}>{photos.map((p) => <PhotoThumb key={p.id} photo={p} onClick={() => pick(p.id)} />)}</div>}
      {s.couplePhoto && <Section><button className="row tap destructive" onClick={() => pick(undefined)}>{t('hub.photoRemove')}</button></Section>}
    </Sheet>
  )
}

/* ---------- first steps ---------- */
export function FirstSteps() {
  const s = useApp()
  const t = useT()
  const nav = useNav()
  const [since, setSince] = useState(false)
  const [date, setDate] = useState(false)
  if (s.prefs.stepsHidden) return null
  const steps = [
    { key: 'since', done: !!s.since, go: () => setSince(true) },
    { key: 'mood', done: s.moods.some((m) => m.createdBy === s.me), go: () => document.querySelector('.mood-row')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) },
    // Starter examples don't count: the steps are about the couple's own first entries.
    { key: 'list', done: s.groceries.some((x) => !x.example) || s.tasks.some((x) => !x.example), go: () => nav.open('groceries') },
    { key: 'date', done: s.events.some((e) => e.repeat === 'yearly' && !e.example), go: () => setDate(true) },
    { key: 'wish', done: s.wishes.some((w) => w.createdBy === s.me && !w.example), go: () => nav.open('wishlist') },
  ] as const
  const done = steps.filter((x) => x.done).length
  const examples = hasExamples(s)
  if (done === steps.length && !examples) return null
  return (
    <Section header={`🚀 ${t('hub.steps')} · ${t('hub.stepsN', { done, total: steps.length })}`}
      action={<button onClick={() => update((st) => { st.prefs = { ...st.prefs, stepsHidden: true } })}>{t('hub.stepsHide')}</button>}>
      {steps.map((x) => (
        <Row key={x.key} icon={x.done ? '✅' : '⬜'} title={t(`hub.step.${x.key}`)} dim={x.done} chevron={!x.done} onClick={x.done ? undefined : x.go} />
      ))}
      {examples && <button className="row tap accent" onClick={removeExamples}>🧹 {t('ex.remove')}</button>}
      {since && <SinceSheet onClose={() => setSince(false)} />}
      {date && <DateSheet onClose={() => setDate(false)} />}
    </Section>
  )
}

/* ---------- a warm thought ---------- */
export function Thought() {
  const s = useApp()
  const t = useT()
  return (
    <Section header={`💭 ${t('hub.thought')}`}>
      <div className="row thought">{thoughtFor(today(), s.lang)}</div>
    </Section>
  )
}

/* ---------- what's coming up in 30 days ---------- */
interface Ahead { date: string; emoji: string; title: string; open?: () => void }

export function Coming() {
  const s = useApp()
  const t = useT()
  const nav = useNav()
  const d = today(), end = addDays(d, 30)
  const items = useMemo(() => {
    const out: Ahead[] = []
    for (const e of visible(s.events, s.me)) {
      if (e.repeat === 'daily' || e.repeat === 'weekly') continue
      if (e.repeat === 'none') { if (e.date >= d && e.date <= end) out.push({ date: e.date, emoji: e.emoji || '📅', title: e.title, open: () => nav.open('calendar') }); continue }
      for (let x = d; x <= end; x = addDays(x, 1)) {
        if (occursOn(e.date, e.repeat, x, e.endDate)) { out.push({ date: x, emoji: e.emoji || (e.repeat === 'yearly' ? '🎉' : '📅'), title: e.title, open: () => nav.open('calendar') }); break }
      }
    }
    for (const k of visible(s.tasks, s.me)) if (!k.done && k.due && k.due >= d && k.due <= end) out.push({ date: k.due, emoji: k.emoji || '✅', title: k.title, open: () => nav.open('tasks') })
    for (const tr of visible(s.trips, s.me)) if (tr.start >= d && tr.start <= end) out.push({ date: tr.start, emoji: '✈️', title: tr.title || tr.destination, open: () => nav.open('travel') })
    if (s.since) {
      for (const r of ROUND) { const x = addDays(s.since, r - 1); if (x >= d && x <= end) out.push({ date: x, emoji: '💞', title: t('hub.round', { n: r.toLocaleString() }) }) }
      const a = nextYearly(s.since, d)
      if (a > s.since && a <= end) out.push({ date: a, emoji: '💍', title: t('hub.anniversary', { n: +a.slice(0, 4) - +s.since.slice(0, 4) }) })
    }
    return out.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 7)
  }, [s.events, s.tasks, s.trips, s.since, s.me, d, s.lang]) // eslint-disable-line react-hooks/exhaustive-deps
  const when = (x: string) => (x === d ? t('today') : x === addDays(d, 1) ? t('tomorrow') : t('inDays', { n: diffDays(x, d) }))
  return (
    <Section header={`🗓️ ${t('hub.ahead')}`} action={<button onClick={() => nav.open('calendar')}>{t('mod.calendar')}</button>}>
      {items.length === 0 && <Row title={<span style={{ color: 'var(--label2)', fontWeight: 400 }}>{t('hub.aheadEmpty')}</span>} />}
      {items.map((x, i) => <Row key={i} icon={x.emoji} title={x.title} sub={fmtDate(x.date, s.lang, { weekday: 'short', day: 'numeric', month: 'short' })}
        detail={when(x.date)} chevron={!!x.open} onClick={x.open} />)}
    </Section>
  )
}

/* ---------- tiles: a perfect evening, the collection ---------- */
export function Tiles() {
  const t = useT()
  const nav = useNav()
  const [evening, setEvening] = useState(false)
  const [note, setNote] = useState(false)
  return (
    <div className="hub-tiles">
      <button className="hub-tile note" onClick={() => setNote(true)}>
        <span className="ht-emoji">💌</span><b>{t('note.tile')}</b><span>{t('note.tileSub')}</span>
      </button>
      <button className="hub-tile" onClick={() => setEvening(true)}>
        <span className="ht-emoji">🍿🍳</span><b>{t('hub.evening')}</b><span>{t('hub.eveningSub')}</span>
      </button>
      <button className="hub-tile" onClick={() => openCollection(nav, 'theme')}>
        <span className="ht-emoji">✨</span><b>{t('col.title')}</b><span>{t('hub.collectionSub')}</span>
      </button>
      {evening && <EveningSheet onClose={() => setEvening(false)} />}
      {note && <NoteComposer onClose={() => setNote(false)} />}
    </div>
  )
}

function EveningSheet({ onClose }: { onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const nav = useNav()
  const movies = visible(s.watch, s.me).filter((w) => w.status !== 'done')
  const recipes = visible(s.recipes, s.me)
  const [n, setN] = useState(() => Math.floor(Math.random() * 1000))
  const movie = movies.length ? movies[n % movies.length] : undefined
  const recipe = recipes.length ? recipes[(n * 7 + 3) % recipes.length] : undefined
  return (
    <Sheet title={`🌙 ${t('hub.eveningTitle')}`} onClose={onClose}>
      {!movie && !recipe && <div className="col-hint" style={{ margin: '0 30px 16px' }}>{t('hub.eveningEmpty')}</div>}
      {movie && <Section header={`🍿 ${t('hub.eveningMovie')}`}><Row icon="🎬" title={movie.title} sub={movie.year} chevron onClick={() => { onClose(); nav.open('watch') }} /></Section>}
      {recipe && <Section header={`🍳 ${t('hub.eveningCook')}`}><Row icon="🍽️" title={recipe.title} sub={recipe.minutes ? t('minutesN', { n: recipe.minutes }) : undefined} chevron onClick={() => { onClose(); nav.open('recipes') }} /></Section>}
      {(movies.length > 1 || recipes.length > 1) && <Section><button className="row tap accent" onClick={() => { setN((x) => x + 1 + Math.floor(Math.random() * 5)); haptic() }}>🎲 {t('hub.eveningAnother')}</button></Section>}
    </Sheet>
  )
}

/* ---------- important dates ---------- */
export function ImportantDates() {
  const s = useApp()
  const t = useT()
  const nav = useNav()
  const [add, setAdd] = useState(false)
  const d = today()
  const yearly = visible(s.events, s.me).filter((e) => e.repeat === 'yearly')
    .map((e) => ({ e, next: nextYearly(e.date, d) })).sort((a, b) => a.next.localeCompare(b.next))
  const when = (x: string) => (x === d ? t('today') : x === addDays(d, 1) ? t('tomorrow') : t('inDays', { n: diffDays(x, d) }))
  const together = useTogether(s)
  const nextRound = together ? ROUND.find((r) => r >= together) : undefined
  return (
    <Section header={`🎉 ${t('hub.dates')}`} action={<button onClick={() => setAdd(true)}>+ {t('hub.addDate')}</button>}>
      {s.since && (
        <Row icon="💍" title={t('hub.anniversary', { n: +nextYearly(s.since, addDays(d, 1)).slice(0, 4) - +s.since.slice(0, 4) })}
          sub={fmtDate(s.since, s.lang, { day: 'numeric', month: 'long', year: 'numeric' })} detail={when(nextYearly(s.since, addDays(d, 1)))} />
      )}
      {nextRound && together && (
        <Row icon="💞" title={t('hub.round', { n: nextRound.toLocaleString() })} detail={nextRound === together ? t('today') : t('inDays', { n: nextRound - together })} />
      )}
      {yearly.map(({ e, next }) => (
        <Row key={e.id} icon={e.emoji || '🎂'} title={e.title} sub={`${fmtDate(e.date, s.lang, { day: 'numeric', month: 'long' })} · ${t('hub.everyYear')}`}
          detail={when(next)} chevron onClick={() => nav.open('calendar')} />
      ))}
      {!s.since && yearly.length === 0 && <Row title={<span style={{ color: 'var(--label2)', fontWeight: 400 }}>{t('hub.datesEmpty')}</span>} />}
      {add && <DateSheet onClose={() => setAdd(false)} />}
    </Section>
  )
}

function DateSheet({ onClose }: { onClose: () => void }) {
  const t = useT()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState<string | undefined>(today())
  const save = () => update((st) => {
    const e: CalEvent = { ...base(st.me), title: title.trim(), date: date ?? today(), who: 'both', repeat: 'yearly' }
    st.events = [e, ...st.events]
  })
  return (
    <Sheet title={t('hub.addDate')} onClose={onClose} onDone={save} doneDisabled={!title.trim() || !date}>
      <Section header={t('hub.dateName')}><TextRow value={title} onChange={setTitle} placeholder={t('hub.datePlaceholder')} autoFocus /></Section>
      <Section footer={t('hub.datesEmpty')}><DateRow label={`📅 ${t('date')}`} value={date} onChange={setDate} clearable={false} /></Section>
    </Sheet>
  )
}

/* ---------- savings and memories ---------- */
export function Savings() {
  const s = useApp()
  const t = useT()
  const nav = useNav()
  const goals = visible(s.goals, s.me)
  if (!goals.length) return null
  const design = activePiggy(s)
  return (
    <Section header={`🐷 ${t('goals')}`} action={<button onClick={() => nav.open('budget')}>{t('mod.budget')}</button>}>
      {goals.slice(0, 4).map((g) => (
        <div key={g.id} className="row hub-goal" role="button" onClick={() => nav.open('budget')}>
          <span className="hg-emoji">{g.emoji}</span>
          <div className="hg-body"><b>{g.title}</b><PiggyBar id={design} pct={(g.saved / g.target) * 100} /></div>
          <span className="hg-pct">{Math.round((g.saved / g.target) * 100)}%</span>
        </div>
      ))}
    </Section>
  )
}

export function Flashback() {
  const s = useApp()
  const t = useT()
  const nav = useNav()
  const d = today()
  const photos = visible(s.photos, s.me).filter((p) => p.createdAt.slice(5, 10) === d.slice(5, 10) && p.createdAt.slice(0, 4) < d.slice(0, 4))
  if (!photos.length) return null
  return (
    <Section header={`📸 ${t('onThisDay')}`}>
      <div className="photos" style={{ margin: 0, borderRadius: 0 }}>{photos.slice(0, 6).map((p) => <PhotoThumb key={p.id} photo={p} onClick={() => nav.open('photos')} />)}</div>
    </Section>
  )
}
