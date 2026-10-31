import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useApp, visible } from '../store'
import { moduleLabel, useT } from '../i18n'
import { useNav } from '../nav'
import { Avatar, GlassButton, Marks, Row, Screen, Section, type Action } from '../ui'
import { addDays, diffDays, fmtDate, fmtMoney, today } from '../lib/date'
import { cycleDay, nextStart, periodDays } from '../lib/cycle'
import { PET_EMOJI } from '../lib/categories'
import type { CalEvent, ModuleId, Task, TodayBlock } from '../types'
import { dayAgenda, EventEditor, newEvent } from './Calendar'
import { newTask, TaskEditor, TaskRow } from './Tasks'
import { PhotoThumb } from './Photos'
import { currencyOf, monthSpending } from './Budget'
import { Cover, player } from './Music'
import { StatusChips } from './Statuses'

export default function Today({ back }: { back?: boolean }) {
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
  const track = visible(s.music, s.me)[0]
  const spend = monthSpending(s, d.slice(0, 7))

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

  // Shortcuts never repeat what the tab bar already offers.
  const shortcut = (m: ModuleId): Action => {
    const l = moduleLabel(s, m)
    const onClick = m === 'tasks' ? () => setEditTask(newTask(s.me, { due: d }))
      : m === 'calendar' ? () => setEditEvent(newEvent(s.me, d))
      : () => nav.open(m)
    return { icon: l.emoji, label: l.title, onClick }
  }
  const actions = s.prefs.todayActions.filter((m) => !s.prefs.tabs.includes(m) && (m !== 'cycle' || s.me === 'j')).slice(0, 4).map(shortcut)

  const blocks: Record<TodayBlock, () => ReactNode> = {
    trip: () => trip && (
      <button key="trip" className="banner" onClick={() => nav.push({ trip: trip.id })}>
        <span className="big-emoji">✈️</span>
        <div>
          <b>{trip.start <= d ? t('tripNow', { place: trip.title }) : t('tripIn', { place: trip.title, n: diffDays(trip.start, d) })}</b>
          <span>{fmtDate(trip.start, s.lang)} – {fmtDate(trip.end, s.lang)}</span>
        </div>
      </button>
    ),
    events: () => ag.events.length > 0 && (
      <Section key="events" big header={t('todayEvents')}>
        {ag.events.map((e) => (
          <Row key={e.id} onClick={() => setEditEvent(e)}
            left={<div className="time-col">{e.time ?? '—'}</div>}
            title={<>{e.busy ? t('busy') : e.title} <Marks x={e} /></>} sub={[e.endTime && `→ ${e.endTime}`, e.calendar].filter(Boolean).join(' · ') || undefined}
            right={<Avatar who={e.who} />} />
        ))}
      </Section>
    ),
    tasks: () => (
      <Section key="tasks" big header={t('todayTasks')} action={<button onClick={() => nav.open('tasks')}>{t('all')}</button>}>
        {tasksNow.length
          ? tasksNow.map((k) => <TaskRow key={k.id} task={k} onOpen={setEditTask} />)
          : <Row title={<span style={{ color: 'var(--label2)' }}>{t('nothingToday')}</span>} />}
      </Section>
    ),
    budget: () => (
      <button key="budget" className="banner" onClick={() => nav.open('budget')}>
        <span className="big-emoji">💰</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <b className="money">{fmtMoney(spend.spent, currencyOf(s), s.lang)}{spend.limit ? <span> / {fmtMoney(spend.limit, currencyOf(s), s.lang)}</span> : null}</b>
          {spend.limit > 0 && <div className="progress"><i style={{ width: Math.min(100, (spend.spent / spend.limit) * 100) + '%', '--c': spend.spent > spend.limit ? 'var(--red)' : 'var(--green)' } as CSSProperties} /></div>}
        </div>
      </button>
    ),
    pet: () => petSoon.length > 0 && (
      <Section key="pet" big header={`${s.pet.emoji} ${t('petDue', { name: s.pet.name })}`}>
        {petSoon.map((r) => {
          const n = diffDays(r.nextDue!, d)
          return <Row key={r.id} icon={PET_EMOJI[r.kind]} title={r.title} chevron onClick={() => nav.open('pet')}
            detail={<span style={{ color: n < 0 ? 'var(--red)' : n <= 1 ? 'var(--orange)' : undefined }}>
              {n === 0 ? t('today') : n === 1 ? t('tomorrow') : n < 0 ? t('daysAgo', { n: -n }) : t('inDays', { n })}</span>} />
        })}
      </Section>
    ),
    music: () => track && (
      <button key="music" className="banner" onClick={() => nav.open('music')}>
        <Cover track={track} size={46} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</b>
          <span>{track.artist} · {t('fromName', { name: s.users[track.createdBy].name })}</span>
        </div>
        {track.preview && <span className="circle" style={{ width: 38, height: 38, fontSize: 15, background: 'var(--fill)' }}
          onClick={(e) => { e.stopPropagation(); player.toggle(track) }}>▶︎</span>}
      </button>
    ),
    memories: () => memories.length > 0 && (
      <Section key="memories" big header={`📸 ${t('onThisDay')}`}>
        <div className="photos" style={{ margin: 0, borderRadius: 0 }}>{memories.slice(0, 6).map((p) => <PhotoThumb key={p.id} photo={p} onClick={() => nav.open('photos')} />)}</div>
      </Section>
    ),
    dateIdea: () => idea && (
      <Section key="dateIdea" big header={`💕 ${t('dateIdea')}`}>
        <Row title={idea.title} sub={idea.tags?.map((tg) => <span key={tg} className="tag">{tg}</span>)} chevron onClick={() => nav.open('dates')} />
      </Section>
    ),
    tomorrow: () => (
      <Section key="tomorrow">
        <Row icon="📆" title={t('tomorrow')} sub={summary(dayAgenda(s, addDays(d, 1)))} chevron onClick={() => nav.open('calendar')} />
      </Section>
    ),
  }

  return (
    <Screen title={t(greet as 'greet.day', { name: me.name })} accent="today" back={back}
      subtitle={<span className="cap" style={{ display: 'block' }}>{fmtDate(d, s.lang, { weekday: 'long', day: 'numeric', month: 'long' })}</span>}
      searchable={false}
      right={<>
        <GlassButton icon="search" label={t('searchAll')} onClick={nav.search} />
        {/* Find My does the location sharing itself; we only jump to it. */}
        <GlassButton label="📍" onClick={() => { location.href = 'findmy://' }} />
        <GlassButton label={me.emoji} onClick={() => nav.settings()} />
      </>}
      hero={<>
        <StatusChips />
        {cycleLine && <div className="hero-sub" style={{ marginTop: 12 }}>{cycleLine}</div>}
        <div className="hero-row" style={{ marginTop: cycleLine ? 12 : 0 }}>
          <div><div className="hero-num">{ag.events.length}</div><div className="hero-lbl">{t('todayEvents')}</div></div>
          <div><div className="hero-num">{tasksNow.length}</div><div className="hero-lbl">{t('todayTasks')}</div></div>
          <div><div className="hero-num">{groceriesLeft}</div><div className="hero-lbl">{moduleLabel(s, 'groceries').title}</div></div>
        </div>
      </>}
      actions={actions}>
      {s.prefs.todayBlocks.filter((b) => b.on).map((b) => blocks[b.id]?.())}
      {editTask && <TaskEditor task={editTask} onClose={() => setEditTask(null)} />}
      {editEvent && <EventEditor event={editEvent} onClose={() => setEditEvent(null)} />}
    </Screen>
  )
}

function summary(a: ReturnType<typeof dayAgenda>) {
  const items = [...a.events.map((e) => (e.time ? `${e.time} ${e.title}` : e.title)), ...a.tasks.map((k) => k.title)]
  return items.length ? items.slice(0, 3).join(' · ') : '—'
}
