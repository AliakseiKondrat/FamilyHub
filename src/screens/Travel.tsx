import { useState, type CSSProperties } from 'react'
import { base, uid, update, useApp, visible } from '../store'
import { moduleLabel, useT, type TKey } from '../i18n'
import { useNav } from '../nav'
import {
  Check, DateRow, Empty, GlassButton, Marks, QuickAdd, Row, Screen, Section, Segmented, Sheet, Swipe, TextRow, ToggleRow, VisibilityFields, haptic, Em, EmojiField,
} from '../ui'
import { addDays, diffDays, fmtDate, fmtMoney, today } from '../lib/date'
import type { DocLink, Expense, Trip, TripCost, Who } from '../types'
import { currencyOf } from './Budget'

const COST_CATS: TripCost['category'][] = ['tickets', 'transfer', 'stay', 'food', 'fun', 'other']
const COST_EMOJI: Record<TripCost['category'], string> = { tickets: '🎫', transfer: '🚕', stay: '🏨', food: '🍽️', fun: '🎡', other: '🧾' }
/** Planned, happening now, or already behind us — from the dates. */
export const tripStatus = (x: Trip, d = today()) => (x.start > d ? 'planned' : x.end >= d ? 'now' : 'done')
import { CoverPicker, Thumb, fromPreview, hostOf, isUrl, relink, useAutoCovers } from '../cover'

export default function Travel({ back }: { back?: boolean }) {
  const s = useApp()
  const t = useT()
  const nav = useNav()
  const [edit, setEdit] = useState<Trip | null>(null)
  const d = today()
  const trips = visible(s.trips, s.me)
  const upcoming = trips.filter((x) => x.end >= d).sort((a, b) => a.start.localeCompare(b.start))
  const past = trips.filter((x) => x.end < d).sort((a, b) => b.start.localeCompare(a.start))

  const row = (x: Trip) => (
    <Row key={x.id} icon={x.emoji || "✈️"} iconBg="color-mix(in srgb, var(--indigo) 18%, transparent)" chevron onClick={() => nav.push({ trip: x.id })}
      title={<>{x.title} <Marks x={x} /></>}
      sub={`${x.destination ? x.destination + ' · ' : ''}${fmtDate(x.start, s.lang)} – ${fmtDate(x.end, s.lang)}`}
      detail={x.start > d ? t('inDays', { n: diffDays(x.start, d) }) : t(`tr.status.${tripStatus(x, d)}` as TKey)} />
  )

  return (
    <Screen title={moduleLabel(s, 'travel').title} back={back} accent="travel"
      right={<GlassButton icon="plus" label={t('newTrip')} onClick={() => setEdit({ ...base(s.me), title: '', destination: '', start: addDays(d, 30), end: addDays(d, 35), plan: [], packing: [], docs: [] })} />}>
      {trips.length === 0 && <Empty emoji="🧳" text={t('empty')} />}
      {upcoming.length > 0 && <Section big header={t('upcomingTrips')}>{upcoming.map(row)}</Section>}
      {past.length > 0 && <Section big header={t('pastTrips')}>{past.map(row)}</Section>}
      {edit && <TripEditor trip={edit} onClose={() => setEdit(null)} />}
    </Screen>
  )
}

function TripEditor({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const [v, setV] = useState(trip)
  const isNew = !s.trips.some((x) => x.id === trip.id)
  return (
    <Sheet title={isNew ? t('newTrip') : v.title} onClose={onClose} doneDisabled={!v.title.trim()}
      onDone={() => update((st) => { if (isNew) st.trips.push(v); else st.trips = st.trips.map((x) => (x.id === v.id ? v : x)) })}>
      <Section>
        <TextRow value={v.title} onChange={(title) => setV({ ...v, title })} placeholder={t('title')} autoFocus={isNew} />
        <TextRow value={v.destination} onChange={(destination) => setV({ ...v, destination })} placeholder={`📍 ${t('destination')}`} />
      </Section>
      <Section>
        <DateRow label={t('start')} value={v.start} clearable={false} onChange={(start) => start && setV({ ...v, start, end: v.end < start ? start : v.end })} />
        <DateRow label={t('end')} value={v.end} clearable={false} onChange={(end) => end && setV({ ...v, end })} />
      </Section>
      <Section><TextRow value={v.notes ?? ''} onChange={(notes) => setV({ ...v, notes })} placeholder={t('notes')} multiline /></Section>
      <EmojiField value={v} onChange={setV} />
      <VisibilityFields value={v} onChange={setV} />
      {!isNew && (
        <Section>
          <button className="row tap destructive" onClick={() => { update((st) => { st.trips = st.trips.filter((x) => x.id !== v.id) }); history.back(); onClose() }}>{t('delete')}</button>
        </Section>
      )}
    </Sheet>
  )
}

export function TripDetail({ id }: { id: string }) {
  const s = useApp()
  const t = useT()
  const [tab, setTab] = useState<'plan' | 'packing' | 'money' | 'docs'>('plan')
  const [edit, setEdit] = useState(false)
  const [planDate, setPlanDate] = useState<string | null>(null)
  const trip = s.trips.find((x) => x.id === id)
  if (!trip) return <Screen title="—" back accent="travel"><Empty emoji="🧳" text={t('empty')} /></Screen>

  const mut = (fn: (x: Trip) => void) => update((st) => fn(st.trips.find((x) => x.id === id)!))
  const days = Array.from({ length: diffDays(trip.end, trip.start) + 1 }, (_, i) => addDays(trip.start, i))
  const packed = trip.packing.filter((p) => p.done).length

  return (
    <Screen title={trip.title} back accent="travel" right={<GlassButton label={t('edit')} onClick={() => setEdit(true)} />}
      subtitle={`${trip.destination ? trip.destination + ' · ' : ''}${fmtDate(trip.start, s.lang, { day: 'numeric', month: 'long' })} – ${fmtDate(trip.end, s.lang, { day: 'numeric', month: 'long' })}`}
      hero={trip.start > today() ? <><div className="hero-big">{diffDays(trip.start, today())}</div><div className="hero-sub">{t('inDays', { n: diffDays(trip.start, today()) })}</div></> : undefined}
      head={<Segmented value={tab} onChange={setTab} options={[
        { value: 'plan', label: `🗓️ ${t('plan')}` },
        { value: 'packing', label: `🧳 ${trip.packing.length ? `${packed}/${trip.packing.length}` : t('packing')}` },
        { value: 'money', label: `💶 ${t('tr.money')}` },
        { value: 'docs', label: `🎫 ${t('docs')}` },
      ]} />}>

      {tab === 'plan' && days.map((day, i) => {
        const items = trip.plan.filter((p) => p.date === day).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
        return (
          <Section key={day} big header={`${i + 1}. ${fmtDate(day, s.lang, { weekday: 'short', day: 'numeric', month: 'short' })}`}
            action={<span style={{ display: 'flex', gap: 12 }}>{items.length > 0 && <a href={routeUrl(trip, items.map((p) => p.title))} target="_blank" rel="noreferrer">🗺️ {t('tr.route')}</a>}<button onClick={() => setPlanDate(day)}>+ {t('add')}</button></span>}>
            {items.map((p) => (
              <Swipe key={p.id} onDelete={() => mut((x) => { x.plan = x.plan.filter((k) => k.id !== p.id) })}>
                <Row left={<div className="time-col">{p.time ?? '·'}</div>} title={<><Em x={p} />{p.title}</>} />
              </Swipe>
            ))}
          </Section>
        )
      })}

      {tab === 'packing' && <>
        <QuickAdd placeholder={t('add') + '…'} onAdd={(title) => mut((x) => { x.packing.push({ id: uid(), title, done: false }) })} />
        {trip.packing.length === 0 && (
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <button className="glass-btn" onClick={() => mut((x) => { x.packing = t('defaultPacking').split(',').map((title) => ({ id: uid(), title, done: false })) })}>✨ {t('addDefaults')}</button>
          </div>
        )}
        {trip.packing.length > 0 && (
          <Section>
            {trip.packing.map((p) => (
              <Swipe key={p.id} onDelete={() => mut((x) => { x.packing = x.packing.filter((k) => k.id !== p.id) })}>
                <Row left={<Check on={p.done} color="var(--indigo)" onChange={() => mut((x) => { const k = x.packing.find((q) => q.id === p.id)!; k.done = !k.done })} />}
                  title={<><Em x={p} />{p.title}</>} dim={p.done}
                  right={<button className="tr-who" aria-label={t('tr.who')} onClick={(e) => { e.stopPropagation(); haptic(); mut((x) => { const k = x.packing.find((q) => q.id === p.id)!; k.who = nextWho(k.who) }) }}>{p.who ? (p.who === 'both' ? '💞' : s.users[p.who].emoji) : '＋'}</button>} />
              </Swipe>
            ))}
          </Section>
        )}
      </>}

      {tab === 'packing' && trip.packing.length > 0 && <div className="col-hint" style={{ margin: '-6px 30px 16px' }}>{t('tr.whoHint')}</div>}
      {tab === 'money' && <MoneyTab trip={trip} onChange={mut} />}
      {tab === 'docs' && <DocsTab trip={trip} onChange={mut} />}

      {edit && <TripEditor trip={trip} onClose={() => setEdit(false)} />}
      {planDate && <PlanSheet date={planDate} onClose={() => setPlanDate(null)} onAdd={(title, time) => mut((x) => { x.plan.push({ id: uid(), date: planDate, title, time }) })} />}
    </Screen>
  )
}

function DocsTab({ trip, onChange }: { trip: Trip; onChange: (fn: (x: Trip) => void) => void }) {
  const t = useT()
  const [url, setUrl] = useState('')
  const [edit, setEdit] = useState<DocLink | null>(null)
  useAutoCovers(trip.docs, (id, p) => onChange((x) => { const d = x.docs.find((k) => k.id === id); if (d) Object.assign(d, fromPreview(d, p)) }))
  const save = (d: DocLink) => onChange((x) => { x.docs = x.docs.some((k) => k.id === d.id) ? x.docs.map((k) => (k.id === d.id ? d : k)) : [...x.docs, d] })
  return <>
    {trip.docs.length > 0 && (
      <Section>
        {trip.docs.map((dc) => (
          <Swipe key={dc.id} onDelete={() => onChange((x) => { x.docs = x.docs.filter((k) => k.id !== dc.id) })}>
            <Row left={dc.cover ? <Thumb src={dc.cover} /> : undefined} icon={dc.cover ? undefined : '🎫'}
              title={dc.title} sub={dc.site || hostOf(dc.url)} chevron onClick={() => setEdit(dc)} />
          </Swipe>
        ))}
      </Section>
    )}
    <Section header={t('add')}>
      <TextRow value={url} onChange={setUrl} placeholder={`🔗 ${t('link')}`} />
      <button className="row tap accent" disabled={!url.trim()} style={{ opacity: !url.trim() ? 0.4 : 1 }}
        onClick={() => { setEdit({ id: uid(), title: '', url: url.trim() }); setUrl('') }}>
        + {t('add')}
      </button>
    </Section>
    {edit && <DocSheet doc={edit} onClose={() => setEdit(null)} onSave={save} />}
  </>
}

/** A ticket, booking or map link shown as a picture with a caption; the picture can be swapped for your own. */
function DocSheet({ doc, onClose, onSave }: { doc: DocLink; onClose: () => void; onSave: (d: DocLink) => void }) {
  const t = useT()
  const [v, setV] = useState(doc)
  return (
    <Sheet title={v.title || t('docs')} onClose={onClose} doneDisabled={!v.url.trim()}
      onDone={() => onSave({ ...v, title: v.title.trim() || v.site || hostOf(v.url), url: v.url.trim() })}>
      <CoverPicker id={v.id} url={v.url} cover={v.cover} title={v.title} emoji="🎫" onChange={(p) => setV((x) => ({ ...x, ...p }))} />
      <Section>
        <TextRow value={v.title} onChange={(title) => setV({ ...v, title })} placeholder={t('caption')} autoFocus={!doc.title} />
        <TextRow value={v.url} onChange={(url) => setV({ ...v, url, ...relink(v, url) })} placeholder={`🔗 ${t('link')}`} />
      </Section>
      {isUrl(v.url) && <Section><a className="row tap accent" href={v.url} target="_blank" rel="noreferrer">🔗 {t('open_link')}</a></Section>}
    </Sheet>
  )
}

function PlanSheet({ date, onClose, onAdd }: { date: string; onClose: () => void; onAdd: (title: string, time?: string) => void }) {
  const s = useApp()
  const t = useT()
  const [title, setTitle] = useState('')
  const [time, setTime] = useState<string | undefined>()
  return (
    <Sheet title={fmtDate(date, s.lang, { weekday: 'long', day: 'numeric', month: 'long' })} onClose={onClose}
      doneDisabled={!title.trim()} onDone={() => onAdd(title.trim(), time)}>
      <Section>
        <TextRow value={title} onChange={setTitle} placeholder={t('title')} autoFocus />
        <DateRow label={t('time')} type="time" value={time} onChange={setTime} />
      </Section>
    </Sheet>
  )
}

const nextWho = (w?: Who): Who | undefined => (w === undefined ? 'a' : w === 'a' ? 'j' : w === 'j' ? 'both' : undefined)

/** Google Maps directions through the day's stops, around the destination. */
function routeUrl(trip: Trip, stops: string[]) {
  const where = (x: string) => encodeURIComponent(trip.destination ? `${x}, ${trip.destination}` : x)
  return `https://www.google.com/maps/dir/${stops.map(where).join('/')}`
}

/** The trip's money: a budget, costs by kind with bookings, and whether we fit. */
function MoneyTab({ trip, onChange }: { trip: Trip; onChange: (fn: (x: Trip) => void) => void }) {
  const s = useApp()
  const t = useT()
  const [cost, setCost] = useState<TripCost | null>(null)
  const cur = currencyOf(s)
  const money = (n: number) => fmtMoney(n, cur, s.lang)
  const costs = trip.costs ?? []
  const spent = costs.reduce((a, c) => a + c.amount, 0)
  const left = (trip.budget ?? 0) - spent
  return <>
    <Section>
      <label className="row"><span className="label" style={{ flex: 1 }}>🎯 {t('tr.budget')}</span>
        <input type="number" inputMode="decimal" min={0} value={trip.budget ?? ''} placeholder="—" style={{ width: 110, textAlign: 'right', border: 0, background: 'none' }}
          onChange={(e) => onChange((x) => { x.budget = e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)) })} /></label>
      <Row icon="💸" title={t('tr.spent')} detail={<b>{money(spent)}</b>} />
      {!!trip.budget && <Row icon={left < 0 ? '⚠️' : '✅'} title={left < 0 ? t('tr.over', { sum: money(-left) }) : t('tr.left')}
        detail={left >= 0 ? <b>{money(left)}</b> : undefined} className={left < 0 ? 'tr-over' : undefined} />}
      {!!trip.budget && <div className="row"><div className="progress" style={{ flex: 1, marginTop: 0 }}><i style={{ width: `${Math.min(100, (spent / trip.budget) * 100)}%`, '--c': left < 0 ? 'var(--red)' : 'var(--green)' } as CSSProperties} /></div></div>}
    </Section>
    <Section header={t('tr.costs')} action={<button onClick={() => setCost({ id: uid(), title: '', category: 'tickets', amount: 0 })}>+ {t('tr.addCost')}</button>}>
      {costs.length === 0 && <Row title={<span style={{ color: 'var(--label2)', fontWeight: 400 }}>{t('tr.noCosts')}</span>} />}
      {COST_CATS.flatMap((c) => costs.filter((x) => x.category === c)).map((c) => (
        <Swipe key={c.id} onDelete={() => onChange((x) => { x.costs = (x.costs ?? []).filter((k) => k.id !== c.id) })}>
          <Row icon={COST_EMOJI[c.category]} title={c.title || t(`tr.cat.${c.category}` as TKey)}
            sub={[c.booked && `✓ ${t('tr.booked')}`, c.expenseId && `💰 ${t('tr.inBudget')}`].filter(Boolean).join(' · ') || undefined}
            detail={<span className="money">{money(c.amount)}</span>} chevron onClick={() => setCost(c)} />
        </Swipe>
      ))}
    </Section>
    {cost && <CostSheet trip={trip} cost={cost} onClose={() => setCost(null)} onSave={(c) => onChange((x) => { x.costs = (x.costs ?? []).some((k) => k.id === c.id) ? (x.costs ?? []).map((k) => (k.id === c.id ? c : k)) : [...(x.costs ?? []), c] })} />}
  </>
}

function CostSheet({ trip, cost, onClose, onSave }: { trip: Trip; cost: TripCost; onClose: () => void; onSave: (c: TripCost) => void }) {
  const s = useApp()
  const t = useT()
  const [v, setV] = useState(cost)
  const [toBudget, setToBudget] = useState(!!cost.expenseId)
  const save = () => {
    let c = { ...v, title: v.title.trim() }
    // Write it to the shared budget once (as a travel expense); the link keeps it from being added twice.
    if (toBudget && !c.expenseId && c.amount > 0) {
      const e: Expense = { ...base(s.me), title: `${trip.title}: ${c.title || t(`tr.cat.${c.category}` as TKey)}`, amount: c.amount, currency: currencyOf(s), category: 'travel', paidBy: s.me, shared: true, date: today() }
      update((st) => { st.expenses = [e, ...st.expenses] })
      c = { ...c, expenseId: e.id }
    }
    onSave(c)
  }
  return (
    <Sheet title={v.title || t('tr.cost')} onClose={onClose} onDone={save} doneDisabled={!(v.amount > 0)}>
      <div className="chips pl-filters" style={{ margin: '0 16px 12px' }}>
        {COST_CATS.map((c) => <button key={c} className={'chip' + (v.category === c ? ' on' : '')} onClick={() => setV((x) => ({ ...x, category: c }))}>{COST_EMOJI[c]} {t(`tr.cat.${c}` as TKey)}</button>)}
      </div>
      <Section>
        <TextRow value={v.title} onChange={(title) => setV((x) => ({ ...x, title }))} placeholder={t(`tr.cat.${v.category}` as TKey)} autoFocus={!cost.title} />
        <label className="row"><span className="label" style={{ flex: 1 }}>💶 {t('amount')}</span>
          <input type="number" inputMode="decimal" min={0} value={v.amount || ''} placeholder="0" style={{ width: 110, textAlign: 'right', border: 0, background: 'none' }}
            onChange={(e) => setV((x) => ({ ...x, amount: Math.max(0, Number(e.target.value) || 0) }))} /></label>
        <TextRow value={v.url ?? ''} onChange={(url) => setV((x) => ({ ...x, url: url || undefined }))} placeholder={`🔗 ${t('tr.bookingLink')}`} />
      </Section>
      <Section footer={v.expenseId ? t('tr.inBudgetHint') : undefined}>
        <ToggleRow icon="✓" label={t('tr.booked')} on={!!v.booked} onChange={(booked) => setV((x) => ({ ...x, booked }))} />
        <ToggleRow icon="💰" label={t('tr.toBudget')} on={toBudget} onChange={(on) => !v.expenseId && setToBudget(on)} />
      </Section>
      {v.url && <Section><a className="row tap accent" href={v.url} target="_blank" rel="noreferrer">🔗 {t('open_link')}</a></Section>}
    </Sheet>
  )
}
