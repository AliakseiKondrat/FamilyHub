import type { CSSProperties } from 'react'
import { uid, update, useApp } from '../store'
import { moduleLabel, useT } from '../i18n'
import { Empty, Row, Screen, Section, Swipe } from '../ui'
import { addDays, diffDays, fmtDate, today } from '../lib/date'
import { avgCycle, cycleDay, nextStart } from '../lib/cycle'

/** Julia's private tracker. Her partner never gets here; they only see period days in the calendar. */
export default function Cycle() {
  const s = useApp()
  const t = useT()
  const title = moduleLabel(s, 'cycle').title
  if (s.me !== 'j') return <Screen title={title} back><Empty emoji="🔒" text={t('privateHint')} /></Screen>

  const d = today()
  const periods = [...s.periods].sort((a, b) => b.start.localeCompare(a.start))
  const current = periods.find((p) => p.start <= d && (!p.end ? diffDays(d, p.start) < 10 : p.end >= d))
  const next = nextStart(s)
  const cd = cycleDay(s)
  const cyc = avgCycle(s)

  return (
    <Screen title={title} back>
      <div className="hero" style={{ '--h1': '#ff375f', '--h2': '#bf5af2', textAlign: 'center' } as CSSProperties}>
        <div className="h-lbl">{current ? t('inPeriod') : '🌸'}</div>
        <div style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.2 }}>
          {current ? t('dayN', { n: diffDays(d, current.start) + 1 }) : cd ? t('cycleDay', { n: cd }) : '—'}
        </div>
        {!current && next && <div className="h-sub">{t('nextPeriod')}: {fmtDate(next, s.lang, { day: 'numeric', month: 'long' })} · {t('inDays', { n: diffDays(next, d) })}</div>}
      </div>

      <Section>
        {!current
          ? <button className="row tap accent" onClick={() => update((st) => { st.periods.push({ id: uid(), start: today() }) })}>🌸 {t('logStart')}</button>
          : <button className="row tap accent" onClick={() => update((st) => { st.periods.find((p) => p.id === current.id)!.end = today() })}>✓ {t('logEnd')}</button>}
      </Section>

      <Section footer={t('cyclePrivate', { name: s.users.a.name })}>
        <Row icon="🔄" title={t('avgCycle')} detail={`${cyc} ${t('days')}`} />
        <Row icon="🩸" title={t('periodLength')} detail={
          <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button className="chip" style={{ background: 'var(--fill)' }} onClick={() => update((st) => { st.periodLength = Math.max(2, st.periodLength - 1) })}>−</button>
            {s.periodLength} {t('days')}
            <button className="chip" style={{ background: 'var(--fill)' }} onClick={() => update((st) => { st.periodLength = Math.min(10, st.periodLength + 1) })}>+</button>
          </span>} />
      </Section>

      <Section header={t('history')}>
        {periods.map((p) => (
          <Swipe key={p.id} onDelete={() => update((st) => { st.periods = st.periods.filter((x) => x.id !== p.id) })}>
            <Row icon="🌸" title={`${fmtDate(p.start, s.lang, { day: 'numeric', month: 'long' })} – ${fmtDate(p.end ?? addDays(p.start, s.periodLength - 1), s.lang, { day: 'numeric', month: 'long' })}`} />
          </Swipe>
        ))}
      </Section>
    </Screen>
  )
}
