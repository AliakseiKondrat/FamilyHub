import { useState } from 'react'
import { base, other, update, useApp } from '../store'
import { useT, type TKey } from '../i18n'
import { Row, Section, Sheet, TextRow, haptic, toast } from '../ui'
import { addDays, fmtDate, mondayOf, today } from '../lib/date'
import { award } from '../lib/game'
import type { CheckIn, State, UserId } from '../types'

/*
 * The weekly check-in: six short questions from 1 to 5 and a wish for next week. The partner's answers stay
 * hidden until both have answered; after that the week is frozen (no rewriting it later), differences of two
 * or more get a gentle «talk about it», and a small chart shows the last eight weeks.
 * The answers are shared records, hidden by the app until both are in — fine between the two of us.
 */

export const QUESTIONS = 6
const SCALE = [1, 2, 3, 4, 5]
const FACES = ['😣', '🙁', '😐', '🙂', '🤩']

const ofWeek = (s: State, week: string, u: UserId) => s.checkins.find((c) => c.week === week && c.createdBy === u)

export function weekStatus(s: State, week = mondayOf(today())) {
  const mine = ofWeek(s, week, s.me), theirs = ofWeek(s, week, other(s.me))
  return { week, mine, theirs, both: !!mine && !!theirs }
}

/** Average of both answers for the last weeks the couple completed together (oldest first). */
function history(s: State, weeks = 8) {
  const out: { week: string; avg: number }[] = []
  for (let i = weeks; i >= 1; i--) {
    const w = addDays(mondayOf(today()), -7 * i)
    const a = ofWeek(s, w, 'a'), j = ofWeek(s, w, 'j')
    if (a && j) out.push({ week: w, avg: [...a.answers, ...j.answers].reduce((x, y) => x + y, 0) / (a.answers.length + j.answers.length) })
  }
  const now = weekStatus(s)
  if (now.both) out.push({ week: now.week, avg: [...now.mine!.answers, ...now.theirs!.answers].reduce((x, y) => x + y, 0) / (QUESTIONS * 2) })
  return out
}

export function CheckinSection() {
  const s = useApp()
  const t = useT()
  const [open, setOpen] = useState<'answer' | 'results' | null>(null)
  const st = weekStatus(s)
  const partner = s.users[other(s.me)].name
  return (
    <Section header={`📝 ${t('ci.title')}`}>
      {!st.mine
        ? <Row icon="📝" title={st.theirs ? t('ci.yourTurn', { name: partner }) : t('ci.prompt')} sub={t('ci.promptSub')} chevron onClick={() => setOpen('answer')} />
        : !st.theirs
          ? <Row icon="⏳" title={t('ci.waiting', { name: partner })} sub={t('ci.waitingSub')} chevron onClick={() => setOpen('answer')} />
          : <Row icon="💞" title={t('ci.ready')} sub={t('ci.readySub')} chevron onClick={() => setOpen('results')} />}
      {history(s).length > 1 && <Trend s={s} />}
      {open === 'answer' && <AnswerSheet frozen={st.both} onClose={() => setOpen(null)} />}
      {open === 'results' && <ResultsSheet onClose={() => setOpen(null)} />}
    </Section>
  )
}

function AnswerSheet({ frozen, onClose }: { frozen: boolean; onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const st = weekStatus(s)
  const [answers, setAnswers] = useState<number[]>(st.mine?.answers ?? Array(QUESTIONS).fill(0))
  const [note, setNote] = useState(st.mine?.note ?? '')
  const done = answers.every((a) => a > 0)
  const save = () => {
    update((x) => {
      const id = `checkin:${st.week}:${x.me}`
      const c: CheckIn = { ...base(x.me), ...(x.checkins.find((y) => y.id === id) ?? {}), id, week: st.week, answers, note: note.trim() || undefined }
      x.checkins = [c, ...x.checkins.filter((y) => y.id !== id)]
      award(x, 'checkin', `${st.week}:${x.me}`)
    })
    toast(t('ci.saved'))
  }
  return (
    <Sheet title={`📝 ${t('ci.title')}`} onClose={onClose} onDone={frozen ? undefined : save} doneDisabled={!done}>
      <div className="col-hint" style={{ margin: '0 30px 12px' }}>{t('ci.intro', { date: fmtDate(st.week, s.lang, { day: 'numeric', month: 'long' }) })}</div>
      {Array.from({ length: QUESTIONS }, (_, q) => (
        <Section key={q} header={`${q + 1}. ${t(`ci.q${q + 1}` as TKey)}`}>
          <div className="ci-scale">
            {SCALE.map((v) => (
              <button key={v} className={'ci-dot' + (answers[q] === v ? ' on' : '')} disabled={frozen}
                onClick={() => { setAnswers((a) => a.map((x, i) => (i === q ? v : x))); haptic() }}>
                <span>{FACES[v - 1]}</span><small>{v}</small>
              </button>
            ))}
          </div>
        </Section>
      ))}
      <Section header={t('ci.note')}>
        {frozen ? <div className="row thought">{note || '—'}</div> : <TextRow value={note} onChange={setNote} placeholder={t('ci.notePlaceholder')} multiline />}
      </Section>
      {frozen && <div className="col-hint" style={{ margin: '0 30px 16px' }}>{t('ci.frozen')}</div>}
    </Sheet>
  )
}

function ResultsSheet({ onClose }: { onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const st = weekStatus(s)
  if (!st.mine || !st.theirs) return null
  const me = s.users[s.me], partner = s.users[other(s.me)]
  const gaps = st.mine.answers.filter((a, i) => Math.abs(a - st.theirs!.answers[i]) >= 2).length
  return (
    <Sheet title={`💞 ${t('ci.results')}`} onClose={onClose}>
      <div className="col-hint" style={{ margin: '0 30px 12px' }}>{gaps ? t('ci.gapsHint') : t('ci.allClose')}</div>
      <div className="ci-legend"><span><i className="me" />{me.emoji} {me.name}</span><span><i className="partner" />{partner.emoji} {partner.name}</span></div>
      {Array.from({ length: QUESTIONS }, (_, q) => {
        const a = st.mine!.answers[q], b = st.theirs!.answers[q]
        return (
          <Section key={q} header={`${q + 1}. ${t(`ci.q${q + 1}` as TKey)}`} footer={Math.abs(a - b) >= 2 ? `💬 ${t('ci.talk')}` : undefined}>
            <div className="row ci-bars">
              <div className="ci-bar me"><i style={{ width: `${a * 20}%` }} /><b>{FACES[a - 1]} {a}</b></div>
              <div className="ci-bar partner"><i style={{ width: `${b * 20}%` }} /><b>{FACES[b - 1]} {b}</b></div>
            </div>
          </Section>
        )
      })}
      {(st.mine.note || st.theirs.note) && (
        <Section header={t('ci.wishes')}>
          {st.mine.note && <Row icon={me.emoji} title={<span style={{ fontWeight: 400 }}>{st.mine.note}</span>} />}
          {st.theirs.note && <Row icon={partner.emoji} title={<span style={{ fontWeight: 400 }}>{st.theirs.note}</span>} />}
        </Section>
      )}
      <Section header={t('ci.trend')}><Trend s={s} /></Section>
    </Sheet>
  )
}

/** The couple's average per week, as a small line from 1 to 5. */
function Trend({ s }: { s: State }) {
  const t = useT()
  const h = history(s)
  if (h.length < 2) return <div className="row" style={{ color: 'var(--label2)' }}>{t('ci.trendEmpty')}</div>
  const W = 300, H = 80, pad = 12
  const x = (i: number) => pad + (i * (W - pad * 2)) / (h.length - 1)
  const y = (v: number) => H - pad - ((v - 1) / 4) * (H - pad * 2)
  const pts = h.map((p, i) => `${x(i)},${y(p.avg)}`).join(' ')
  return (
    <div className="row ci-trend">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-label={t('ci.trend')}>
        <polyline points={pts} fill="none" stroke="var(--pink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {h.map((p, i) => <circle key={p.week} cx={x(i)} cy={y(p.avg)} r="4" fill="var(--pink)" />)}
      </svg>
      <div className="ci-trend-labels">
        <span>{fmtDate(h[0].week, s.lang)}</span><b>{h[h.length - 1].avg.toFixed(1)}</b><span>{fmtDate(h[h.length - 1].week, s.lang)}</span>
      </div>
    </div>
  )
}
