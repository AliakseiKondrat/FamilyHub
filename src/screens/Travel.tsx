import { useState } from 'react'
import { base, uid, update, useApp, visible } from '../store'
import { moduleLabel, useT } from '../i18n'
import { useNav } from '../nav'
import {
  Check, DateRow, Empty, GlassButton, Marks, QuickAdd, Row, Screen, Section, Segmented, Sheet, Swipe, TextRow, VisibilityFields, Em, EmojiField,
} from '../ui'
import { addDays, diffDays, fmtDate, today } from '../lib/date'
import type { DocLink, Trip } from '../types'
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
      detail={x.start > d ? t('inDays', { n: diffDays(x.start, d) }) : undefined} />
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
  const [tab, setTab] = useState<'plan' | 'packing' | 'docs'>('plan')
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
        { value: 'docs', label: `🎫 ${t('docs')}` },
      ]} />}>

      {tab === 'plan' && days.map((day, i) => {
        const items = trip.plan.filter((p) => p.date === day).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
        return (
          <Section key={day} big header={`${i + 1}. ${fmtDate(day, s.lang, { weekday: 'short', day: 'numeric', month: 'short' })}`}
            action={<button onClick={() => setPlanDate(day)}>+ {t('add')}</button>}>
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
                  title={<><Em x={p} />{p.title}</>} dim={p.done} />
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
