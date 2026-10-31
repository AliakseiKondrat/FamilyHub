import { useState, type CSSProperties } from 'react'
import { base, update, useApp, visible } from '../store'
import { moduleLabel, useT } from '../i18n'
import {
  Avatar, DateRow, GlassButton, Icon, Marks, RepeatRow, Row, Screen, Section, Sheet, TextRow, ToggleRow, VisibilityFields, WhoPicker,
} from '../ui'
import { addDays, fmtDate, fromISO, LOCALES, occursOn, toISO, today, weekdayNames } from '../lib/date'
import { periodDays } from '../lib/cycle'
import { PET_EMOJI } from '../lib/categories'
import { useNav } from '../nav'
import type { CalEvent, State, Task, Who } from '../types'
import { TaskEditor, TaskRow } from './Tasks'

const whoColor = (w: Who) => (w === 'both' ? 'var(--purple)' : `var(--${w})`)

/** Everything that lands on a given day, already filtered for the current user. */
export function dayAgenda(s: State, day: string) {
  const events = visible(s.events, s.me).filter((e) => occursOn(e.date, e.repeat, day, e.endDate))
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
  const tasks = visible(s.tasks, s.me).filter((k) => k.due === day)
  const trips = visible(s.trips, s.me).filter((tr) => tr.start <= day && tr.end >= day)
  const pet = visible(s.petRecords, s.me).filter((r) => r.nextDue === day)
  return { events, tasks, trips, pet }
}

export default function Calendar({ back }: { back?: boolean }) {
  const s = useApp()
  const t = useT()
  const nav = useNav()
  const [sel, setSel] = useState(today())
  const [month, setMonth] = useState(() => sel.slice(0, 7))
  const [editEvent, setEditEvent] = useState<CalEvent | null>(null)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const period = periodDays(s)

  // Monday-first grid covering the whole month.
  const first = fromISO(month + '-01')
  const ws = s.prefs.weekStart
  const offset = (first.getDay() - ws + 7) % 7
  const wdNames = weekdayNames(s.lang)
  const weekdays = ws === 0 ? [wdNames[6], ...wdNames.slice(0, 6)] : wdNames
  const gridStart = addDays(toISO(first), -offset)
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const cells = Math.ceil((offset + daysInMonth) / 7) * 7
  const [slide, setSlide] = useState<'slide-l' | 'slide-r' | ''>('')
  const shiftMonth = (n: number) => {
    const d = new Date(first.getFullYear(), first.getMonth() + n, 1)
    setSlide(n > 0 ? 'slide-l' : 'slide-r')
    setMonth(toISO(d).slice(0, 7))
  }

  const ag = dayAgenda(s, sel)
  const isPeriod = period.has(sel)
  const empty = !ag.events.length && !ag.tasks.length && !ag.trips.length && !ag.pet.length

  const { title } = moduleLabel(s, 'calendar')
  return (
    <Screen title={title} back={back} accent="calendar"
      right={<>
        <GlassButton label={t('today')} onClick={() => { setSel(today()); setMonth(today().slice(0, 7)) }} />
        <GlassButton icon="plus" label={t('newEvent')} onClick={() => setEditEvent(newEvent(s.me, sel))} />
      </>}>
      <div className="cal">
        <div className="cal-head">
          <div className="cal-month">{new Intl.DateTimeFormat(LOCALES[s.lang], { month: 'long', year: 'numeric' }).format(first)}</div>
          <div className="cal-nav">
            <button onClick={() => shiftMonth(-1)} aria-label="Previous"><Icon name="back" /></button>
            <button onClick={() => shiftMonth(1)} aria-label="Next"><Icon name="fwd" /></button>
          </div>
        </div>
        <div className={'cal-grid ' + slide} key={month}>
          {weekdays.map((w) => <div key={w} className="cal-wd">{w}</div>)}
          {Array.from({ length: cells }, (_, i) => {
            const day = addDays(gridStart, i)
            const a = dayAgenda(s, day)
            const dots = [
              ...a.events.slice(0, 2).map((e) => whoColor(e.who)),
              ...(a.tasks.length ? ['var(--orange)'] : []),
              ...(a.trips.length ? ['var(--indigo)'] : []),
              ...(a.pet.length ? ['var(--brown)'] : []),
            ].slice(0, 3)
            const cls = ['day', day.slice(0, 7) !== month && 'out', day === today() && 'today', day === sel && 'sel', period.has(day) && 'period']
            return (
              <button key={day} className={cls.filter(Boolean).join(' ')} onClick={() => setSel(day)}>
                <span className="num">{fromISO(day).getDate()}</span>
                <span className="dots">{dots.map((c, k) => <i key={k} style={{ '--c': c } as CSSProperties} />)}</span>
              </button>
            )
          })}
        </div>
      </div>

      <Section big header={<span className="cap" style={{ display: 'inline-block' }}>{fmtDate(sel, s.lang, { weekday: 'long', day: 'numeric', month: 'long' })}</span>}>
        {isPeriod && <Row icon="🌸" iconBg="color-mix(in srgb, var(--pink) 18%, transparent)"
          title={s.me === 'j' ? t('inPeriod') : t('periodNow', { name: s.users.j.name }).replace('🌸 ', '')} />}
        {ag.trips.map((tr) => <Row key={tr.id} icon="✈️" title={tr.title} sub={tr.destination} chevron onClick={() => nav.push({ trip: tr.id })} />)}
        {ag.events.map((e) => (
          <Row key={e.id} onClick={() => setEditEvent(e)}
            left={<div className="color-bar" style={{ '--c': whoColor(e.who) } as CSSProperties} />}
            title={<>{e.title} <Marks x={e} />{(e as { source?: string }).source === 'google' && <span className="badge" style={{ '--c': '#4285f4' } as CSSProperties}>G</span>}</>}
            sub={e.time ? `${e.time}${e.endTime ? ` – ${e.endTime}` : ''}` : t('allDay')}
            right={<Avatar who={e.who} />} />
        ))}
        {ag.pet.map((r) => <Row key={r.id} icon={PET_EMOJI[r.kind]} title={r.title} sub={s.pet.name} onClick={() => nav.open('pet')} chevron />)}
        {ag.tasks.map((k) => <TaskRow key={k.id} task={k} onOpen={setEditTask} />)}
        {empty && !isPeriod && <Row title={<span style={{ color: 'var(--label2)' }}>{t('noEvents')}</span>} />}
      </Section>

      <Section footer={t('gHow')}>
        <Row icon={<span style={{ fontWeight: 800, color: '#4285f4' }}>G</span>} title={t('connectGoogle')} chevron onClick={() => nav.settings('google')} />
      </Section>

      {editEvent && <EventEditor event={editEvent} onClose={() => setEditEvent(null)} />}
      {editTask && <TaskEditor task={editTask} onClose={() => setEditTask(null)} />}
    </Screen>
  )
}

export function newEvent(me: CalEvent['createdBy'], date: string): CalEvent {
  return { ...base(me), title: '', date, who: 'both', repeat: 'none' }
}

export function EventEditor({ event, onClose }: { event: CalEvent; onClose: () => void }) {
  const t = useT()
  const s = useApp()
  const [v, setV] = useState(event)
  const isNew = !s.events.some((e) => e.id === event.id)
  const save = () => update((st) => {
    if (isNew) st.events.push(v)
    else st.events = st.events.map((e) => (e.id === v.id ? v : e))
  })
  const allDay = !v.time
  return (
    <Sheet title={isNew ? t('newEvent') : t('edit')} onClose={onClose} onDone={save} doneDisabled={!v.title.trim()}>
      <Section>
        <TextRow value={v.title} onChange={(title) => setV({ ...v, title })} placeholder={t('title')} autoFocus={isNew} />
      </Section>
      <Section>
        <ToggleRow label={t('allDay')} on={allDay} onChange={(on) => setV({ ...v, time: on ? undefined : '10:00', endTime: on ? undefined : '11:00' })} />
        <DateRow label={t('start')} value={v.date} clearable={false} onChange={(date) => date && setV({ ...v, date })} />
        {!allDay && <DateRow label={t('time')} type="time" value={v.time} clearable={false} onChange={(time) => setV({ ...v, time })} />}
        {!allDay && <DateRow label={t('end')} type="time" value={v.endTime} onChange={(endTime) => setV({ ...v, endTime })} />}
        {allDay && <DateRow label={t('end')} value={v.endDate} onChange={(endDate) => setV({ ...v, endDate })} />}
        <RepeatRow value={v.repeat} onChange={(repeat) => setV({ ...v, repeat })} />
      </Section>
      <div className="section-header" style={{ padding: '0 32px 7px' }}>{t('who')}</div>
      <div style={{ margin: '0 16px 10px' }}><WhoPicker value={v.who} onChange={(who) => setV({ ...v, who })} /></div>
      <Section>
        <TextRow value={v.notes ?? ''} onChange={(notes) => setV({ ...v, notes })} placeholder={t('notes')} multiline />
      </Section>
      <VisibilityFields value={v} onChange={setV} allowPrivate />
      {!isNew && (
        <Section>
          <button className="row tap destructive" onClick={() => { update((st) => { st.events = st.events.filter((e) => e.id !== v.id) }); onClose() }}>{t('delete')}</button>
        </Section>
      )}
    </Sheet>
  )
}
