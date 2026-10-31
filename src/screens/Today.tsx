import { useMemo, useState } from 'react'
import { useApp, visible } from '../store'
import { moduleLabel, useT } from '../i18n'
import { useNav } from '../nav'
import { Avatar, GlassButton, Marks, Row, Screen, Section } from '../ui'
import { addDays, diffDays, fmtDate, today } from '../lib/date'
import { cycleDay, nextStart, periodDays } from '../lib/cycle'
import { PET_EMOJI } from '../lib/categories'
import type { CalEvent, Task } from '../types'
import { dayAgenda, EventEditor, newEvent } from './Calendar'
import { newTask, TaskEditor, TaskRow } from './Tasks'
import { PhotoThumb } from './Photos'

export default function Today() {
  const s = useApp()
  const t = useT()
  const nav = useNav()
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [editEvent, setEditEvent] = useState<CalEvent | null>(null)
  const d = today()
  const me = s.users[s.me]

  const h = new Date().getHours()
  const greet = h < 5 ? 'greet.night' : h < 12 ? 'greet.morning' : h < 18 ? 'greet.day' : h < 23 ? 'greet.evening' : 'greet.night'

  const ag = dayAgenda(s, d)
  const tasksNow = visible(s.tasks, s.me).filter((k) => !k.done && k.due && k.due <= d)
    .sort((a, b) => ((a.due ?? '') + (a.time ?? '')).localeCompare((b.due ?? '') + (b.time ?? '')))
  const groceriesLeft = visible(s.groceries, s.me).filter((g) => !g.done).length
  const trip = visible(s.trips, s.me).filter((tr) => tr.end >= d).sort((a, b) => a.start.localeCompare(b.start))[0]
  const petSoon = visible(s.petRecords, s.me).filter((r) => r.nextDue && diffDays(r.nextDue, d) <= 7)
  const ideas = visible(s.notes, s.me).filter((n) => n.module === 'dates' && !n.done)
  // Same idea for the whole day, different tomorrow.
  const idea = ideas.length ? ideas[Number(d.replace(/-/g, '')) % ideas.length] : undefined

  // Cycle: Julia sees her cycle day; the partner only learns that a period is on or near.
  const period = periodDays(s)
  const next = nextStart(s)
  let cycleLine: string | undefined
  if (s.me === 'j') {
    const cd = cycleDay(s)
    if (cd) cycleLine = `🌸 ${t('cycleDay', { n: cd })}`
  } else if (period.has(d)) cycleLine = t('periodNow', { name: s.users.j.name })
  else if (next && diffDays(next, d) <= 3) cycleLine = t('periodSoon', { name: s.users.j.name, n: diffDays(next, d) })

  const memories = useMemo(() => visible(s.photos, s.me).filter((p) => p.createdAt.slice(5, 10) === d.slice(5, 10) && p.createdAt.slice(0, 4) < d.slice(0, 4)), [s.photos, s.me, d])

  return (
    <Screen title={t(greet as 'greet.day', { name: me.name })} accent="today"
      subtitle={<span className="cap" style={{ display: 'block' }}>{fmtDate(d, s.lang, { weekday: 'long', day: 'numeric', month: 'long' })}</span>}
      right={<GlassButton label={me.emoji} onClick={() => nav.push({ settings: true })} />}
      hero={<>
        {cycleLine && <div className="hero-sub" style={{ marginTop: 0 }}>{cycleLine}</div>}
        <div className="hero-row" style={{ marginTop: cycleLine ? 12 : 0 }}>
          <div><div className="hero-num">{ag.events.length}</div><div className="hero-lbl">{t('todayEvents')}</div></div>
          <div><div className="hero-num">{tasksNow.length}</div><div className="hero-lbl">{t('todayTasks')}</div></div>
          <div><div className="hero-num">{groceriesLeft}</div><div className="hero-lbl">{moduleLabel(s, 'groceries').title}</div></div>
        </div>
      </>}
      actions={[
        { icon: '✅', label: moduleLabel(s, 'tasks').title, onClick: () => setEditTask(newTask(s.me, { due: d })) },
        { icon: '📅', label: moduleLabel(s, 'calendar').title, onClick: () => setEditEvent(newEvent(s.me, d)) },
        { icon: '🛒', label: moduleLabel(s, 'groceries').title, onClick: () => nav.setTab('groceries') },
        { icon: '💸', label: moduleLabel(s, 'budget').title, onClick: () => nav.open('budget') },
      ]}>


      {trip && (
        <button className="banner" onClick={() => nav.push({ trip: trip.id })}>
          <span className="big-emoji">✈️</span>
          <div>
            <b>{trip.start <= d ? t('tripNow', { place: trip.title }) : t('tripIn', { place: trip.title, n: diffDays(trip.start, d) })}</b>
            <span>{fmtDate(trip.start, s.lang)} – {fmtDate(trip.end, s.lang)}</span>
          </div>
        </button>
      )}

      {ag.events.length > 0 && (
        <Section big header={t('todayEvents')}>
          {ag.events.map((e) => (
            <Row key={e.id} onClick={() => setEditEvent(e)}
              left={<div className="time-col">{e.time ?? '—'}</div>}
              title={<>{e.title} <Marks x={e} /></>} sub={e.endTime ? `→ ${e.endTime}` : undefined}
              right={<Avatar who={e.who} />} />
          ))}
        </Section>
      )}

      <Section big header={t('todayTasks')} action={<button onClick={() => nav.setTab('tasks')}>{t('all')}</button>}>
        {tasksNow.length
          ? tasksNow.map((k) => <TaskRow key={k.id} task={k} onOpen={setEditTask} />)
          : <Row title={<span style={{ color: 'var(--label2)' }}>{t('nothingToday')}</span>} />}
      </Section>

      {petSoon.length > 0 && (
        <Section big header={`${s.pet.emoji} ${t('petDue', { name: s.pet.name })}`}>
          {petSoon.map((r) => {
            const n = diffDays(r.nextDue!, d)
            return <Row key={r.id} icon={PET_EMOJI[r.kind]} title={r.title} chevron onClick={() => nav.open('pet')}
              detail={<span style={{ color: n < 0 ? 'var(--red)' : n <= 1 ? 'var(--orange)' : undefined }}>
                {n === 0 ? t('today') : n === 1 ? t('tomorrow') : n < 0 ? t('daysAgo', { n: -n }) : t('inDays', { n })}</span>} />
          })}
        </Section>
      )}

      {memories.length > 0 && (
        <Section big header={`📸 ${t('onThisDay')}`}>
          <div className="photos">{memories.slice(0, 6).map((p) => <PhotoThumb key={p.id} photo={p} onClick={() => nav.open('photos')} />)}</div>
        </Section>
      )}

      {idea && (
        <Section big header={`💕 ${t('dateIdea')}`}>
          <Row title={idea.title} sub={idea.tags?.map((tg) => <span key={tg} className="tag">{tg}</span>)} chevron onClick={() => nav.open('dates')} />
        </Section>
      )}

      <Section>
        <Row icon="📆" title={t('tomorrow')} sub={summary(dayAgenda(s, addDays(d, 1)))} chevron onClick={() => nav.setTab('calendar')} />
      </Section>

      {editTask && <TaskEditor task={editTask} onClose={() => setEditTask(null)} />}
      {editEvent && <EventEditor event={editEvent} onClose={() => setEditEvent(null)} />}
    </Screen>
  )
}

function summary(a: ReturnType<typeof dayAgenda>) {
  const items = [...a.events.map((e) => (e.time ? `${e.time} ${e.title}` : e.title)), ...a.tasks.map((k) => k.title)]
  return items.length ? items.slice(0, 3).join(' · ') : '—'
}
