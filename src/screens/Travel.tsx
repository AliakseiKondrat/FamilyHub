import { useState, type CSSProperties } from 'react'
import { base, uid, update, useApp, visible } from '../store'
import { moduleLabel, useT } from '../i18n'
import { useNav } from '../nav'
import { Check, DateRow, Empty, GlassButton, Marks, QuickAdd, Row, Screen, Section, Segmented, Sheet, Swipe, TextRow, VisibilityFields } from '../ui'
import { addDays, diffDays, fmtDate, today } from '../lib/date'
import type { Trip } from '../types'

export default function Travel() {
  const s = useApp()
  const t = useT()
  const nav = useNav()
  const [edit, setEdit] = useState<Trip | null>(null)
  const d = today()
  const trips = visible(s.trips, s.me)
  const upcoming = trips.filter((x) => x.end >= d).sort((a, b) => a.start.localeCompare(b.start))
  const past = trips.filter((x) => x.end < d).sort((a, b) => b.start.localeCompare(a.start))

  const row = (x: Trip) => (
    <Row key={x.id} icon="✈️" iconBg="color-mix(in srgb, var(--indigo) 18%, transparent)" chevron onClick={() => nav.push({ trip: x.id })}
      title={<>{x.title} <Marks x={x} /></>}
      sub={`${x.destination ? x.destination + ' · ' : ''}${fmtDate(x.start, s.lang)} – ${fmtDate(x.end, s.lang)}`}
      detail={x.start > d ? t('inDays', { n: diffDays(x.start, d) }) : undefined} />
  )

  return (
    <Screen title={moduleLabel(s, 'travel').title} back
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
  const [tab, setTab] = useState<'plan' | 'packing' | 'docs'>('plan')
  const [edit, setEdit] = useState(false)
  const [planDate, setPlanDate] = useState<string | null>(null)
  const trip = s.trips.find((x) => x.id === id)
  if (!trip) return <Screen title="—" back><Empty emoji="🧳" text={t('empty')} /></Screen>

  const mut = (fn: (x: Trip) => void) => update((st) => fn(st.trips.find((x) => x.id === id)!))
  const days = Array.from({ length: diffDays(trip.end, trip.start) + 1 }, (_, i) => addDays(trip.start, i))
  const packed = trip.packing.filter((p) => p.done).length

  return (
    <Screen title={trip.title} back right={<GlassButton label={t('edit')} onClick={() => setEdit(true)} />}
      subtitle={`${trip.destination ? trip.destination + ' · ' : ''}${fmtDate(trip.start, s.lang, { day: 'numeric', month: 'long' })} – ${fmtDate(trip.end, s.lang, { day: 'numeric', month: 'long' })}`}>
      <Segmented value={tab} onChange={setTab} options={[
        { value: 'plan', label: `🗓️ ${t('plan')}` },
        { value: 'packing', label: `🧳 ${t('packing')} ${trip.packing.length ? `${packed}/${trip.packing.length}` : ''}` },
        { value: 'docs', label: `🎫 ${t('docs')}` },
      ]} />

      {tab === 'plan' && days.map((day, i) => {
        const items = trip.plan.filter((p) => p.date === day).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
        return (
          <Section key={day} header={`${i + 1}. ${fmtDate(day, s.lang, { weekday: 'short', day: 'numeric', month: 'short' })}`}
            action={<button onClick={() => setPlanDate(day)}>+ {t('add')}</button>}>
            {items.map((p) => (
              <Swipe key={p.id} onDelete={() => mut((x) => { x.plan = x.plan.filter((k) => k.id !== p.id) })}>
                <Row left={<div className="time-col">{p.time ?? '·'}</div>} title={p.title} />
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
                  title={p.title} dim={p.done} />
              </Swipe>
            ))}
          </Section>
        )}
      </>}

      {tab === 'docs' && <DocsTab trip={trip} onChange={mut} />}

      {edit && <TripEditor trip={trip} onClose={() => setEdit(false)} />}
      {planDate && <PlanSheet date={planDate} onClose={() => setPlanDate(null)} onAdd={(title, time) => mut((x) => { x.plan.push({ id: uid(), date: planDate, title, time }) })} />}
    </Screen>
  )
}

function DocsTab({ trip, onChange }: { trip: Trip; onChange: (fn: (x: Trip) => void) => void }) {
  const t = useT()
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  return <>
    {trip.docs.length > 0 && (
      <Section>
        {trip.docs.map((dc) => (
          <Swipe key={dc.id} onDelete={() => onChange((x) => { x.docs = x.docs.filter((k) => k.id !== dc.id) })}>
            <a href={dc.url} target="_blank" rel="noreferrer" style={{ color: 'inherit' } as CSSProperties}>
              <Row icon="🎫" title={dc.title} sub={new URL(dc.url, location.href).hostname} chevron />
            </a>
          </Swipe>
        ))}
      </Section>
    )}
    <Section header={t('add')}>
      <TextRow value={title} onChange={setTitle} placeholder={t('title')} />
      <TextRow value={url} onChange={setUrl} placeholder={`🔗 ${t('link')}`} />
      <button className="row tap accent" disabled={!title.trim() || !url.trim()} style={{ opacity: !title.trim() || !url.trim() ? 0.4 : 1 }}
        onClick={() => { onChange((x) => { x.docs.push({ id: uid(), title: title.trim(), url: url.trim() }) }); setTitle(''); setUrl('') }}>
        + {t('add')}
      </button>
    </Section>
  </>
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
