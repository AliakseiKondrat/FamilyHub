import { useEffect, useState } from 'react'
import { base, other, update, useApp, visible } from '../store'
import { useT, type TKey } from '../i18n'
import { Row, Section, Sheet, Stars, TextRow, haptic, toast } from '../ui'
import { addDays, fmtDate, toISO, today } from '../lib/date'
import { award } from '../lib/game'
import type { BlindDate, BlindSecret, CalEvent, State } from '../types'

/*
 * A blind date: one of us plans it in four steps (mood → the secret place → when → up to three hints) and seals
 * the envelope. The other sees a countdown, the mood and the hints as they open, and can say «can't wait!».
 * The place lives in a separate surprise record the database hides until the day; at the set time the envelope
 * opens, and afterwards the date gets stars and a few words.
 */

export const MOODS: { key: BlindDate['mood']; emoji: string }[] = [
  { key: 'romantic', emoji: '🌹' }, { key: 'active', emoji: '🏃' }, { key: 'cozy', emoji: '🛋️' },
  { key: 'tasty', emoji: '🍝' }, { key: 'adventure', emoji: '🧭' }, { key: 'culture', emoji: '🎭' },
]
const moodEmoji = (m: BlindDate['mood']) => MOODS.find((x) => x.key === m)?.emoji ?? '🎁'
const ms = (iso: string) => Date.parse(iso)

/** "in 2 d 3 h" / "in 3 h 20 min" until a moment. */
function useLeft(iso: string) {
  const t = useT()
  const [, tick] = useState(0)
  useEffect(() => { const i = setInterval(() => tick((n) => n + 1), 30000); return () => clearInterval(i) }, [])
  const left = ms(iso) - Date.now()
  if (left <= 0) return null
  const d = Math.floor(left / 86400000), h = Math.floor((left % 86400000) / 3600000), m = Math.floor((left % 3600000) / 60000)
  return d > 0 ? t('bd.leftDays', { d, h }) : t('bd.leftHours', { h, m })
}

export function blindOf(s: State) {
  const all = visible(s.blindDates, s.me)
  const now = Date.now()
  const active = all.filter((b) => !b.rating && ms(b.when) + 2 * 86400000 > now).sort((a, b) => ms(a.when) - ms(b.when))
  return {
    forMe: active.filter((b) => b.to === s.me),
    fromMe: active.filter((b) => b.createdBy === s.me),
    done: all.filter((b) => !!b.rating).sort((a, b) => ms(b.when) - ms(a.when)),
  }
}

/* ---------- planning ---------- */
const at = (date: string, time: string) => new Date(`${date}T${time}:00`)
const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
function presets() {
  const d = today(), now = new Date()
  const sat = addDays(d, (6 - now.getDay() + 7) % 7 || 7)
  const out: { key: string; when: Date }[] = []
  if (now.getHours() < 17) out.push({ key: 'tonight', when: at(d, '19:00') })
  out.push({ key: 'tomorrow', when: at(addDays(d, 1), '19:00') }, { key: 'weekend', when: at(sat, '18:00') })
  return out
}
const HINT_AT = ['now', 'day', '2h'] as const

export function BlindWizard({ onClose }: { onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const partner = s.users[other(s.me)].name
  const [step, setStep] = useState(0)
  const [mood, setMood] = useState<BlindDate['mood'] | null>(null)
  const [place, setPlace] = useState('')
  const [when, setWhen] = useState<Date>(() => presets()[0].when)
  const [custom, setCustom] = useState(false)
  const [hints, setHints] = useState<{ text: string; at: (typeof HINT_AT)[number] }[]>([{ text: '', at: 'now' }])
  const seal = () => {
    const w = when.getTime() < Date.now() + 10 * 60000 ? new Date(Date.now() + 60 * 60000) : when
    const release = (a: (typeof HINT_AT)[number]) => new Date(a === 'now' ? Date.now() : a === 'day' ? Math.max(Date.now(), w.getTime() - 86400000) : Math.max(Date.now(), w.getTime() - 2 * 3600000)).toISOString()
    update((st) => {
      const to = other(st.me)
      const id = base(st.me).id
      const ev: CalEvent = { ...base(st.me), blindId: id, title: `${moodEmoji(mood!)} ${t('bd.event')}`, date: toISO(w), time: `${String(w.getHours()).padStart(2, '0')}:${String(w.getMinutes()).padStart(2, '0')}`, who: 'both', repeat: 'none' }
      const b: BlindDate = { ...base(st.me), id, to, mood: mood!, when: w.toISOString(), eventId: ev.id,
        hints: hints.filter((h) => h.text.trim()).map((h) => ({ text: h.text.trim(), at: release(h.at) })) }
      st.events = [ev, ...st.events]
      st.blindDates = [b, ...st.blindDates]
      if (place.trim()) {
        const secret: BlindSecret = { ...base(st.me), dateId: b.id, place: place.trim(), surpriseFor: to, revealAt: toISO(w) }
        st.blindSecrets = [secret, ...st.blindSecrets]
      }
      award(st, 'blind', b.id)
    })
    toast(t('bd.sealed'))
    onClose()
  }
  const steps = ['mood', 'place', 'when', 'hints'] as const
  const can = step === 0 ? !!mood : true
  return (
    <Sheet title={`🎭 ${t('bd.title')}`} onClose={onClose}>
      <div className="coach-dots" style={{ marginTop: 4 }}>{steps.map((_, k) => <i key={k} className={k === step ? 'on' : k < step ? 'past' : ''} />)}</div>
      <div className="col-hint" style={{ margin: '0 30px 12px' }}>{t(`bd.step.${steps[step]}` as TKey, { name: partner })}</div>
      {step === 0 && (
        <div className="bd-moods">
          {MOODS.map((m) => (
            <button key={m.key} className={'bd-mood' + (mood === m.key ? ' on' : '')} onClick={() => { setMood(m.key); haptic() }}>
              <span>{m.emoji}</span>{t(`bd.mood.${m.key}` as TKey)}
            </button>
          ))}
        </div>
      )}
      {step === 1 && (
        <Section footer={t('bd.placeHint', { name: partner })}>
          <TextRow value={place} onChange={setPlace} placeholder={t('bd.placePlaceholder')} autoFocus />
        </Section>
      )}
      {step === 2 && (
        <Section>
          {presets().map((p) => (
            <Row key={p.key} icon={!custom && Math.abs(p.when.getTime() - when.getTime()) < 60000 ? '🔘' : '⚪️'} title={t(`bd.when.${p.key}` as TKey)}
              detail={`${fmtDate(toISO(p.when), s.lang, { weekday: 'short', day: 'numeric', month: 'short' })}, ${String(p.when.getHours()).padStart(2, '0')}:00`}
              onClick={() => { setWhen(p.when); setCustom(false) }} />
          ))}
          <Row icon={custom ? '🔘' : '⚪️'} title={t('bd.when.custom')} onClick={() => setCustom(true)} />
          {custom && (
            <label className="row"><span className="label">🕰️ {t('time')}</span>
              <input className="pill-input" type="datetime-local" value={localInput(when)} min={localInput(new Date())} onChange={(e) => e.target.value && setWhen(new Date(e.target.value))} /></label>
          )}
        </Section>
      )}
      {step === 3 && (
        <>
          {hints.map((h, i) => (
            <Section key={i} header={`${t('bd.hint')} ${i + 1}`}>
              <TextRow value={h.text} onChange={(text) => setHints((x) => x.map((y, k) => (k === i ? { ...y, text } : y)))} placeholder={t('bd.hintPlaceholder')} />
              <div className="bd-hint-at">
                {HINT_AT.map((a) => (
                  <button key={a} className={'chip' + (h.at === a ? ' on' : '')} onClick={() => setHints((x) => x.map((y, k) => (k === i ? { ...y, at: a } : y)))}>{t(`bd.at.${a}` as TKey)}</button>
                ))}
              </div>
            </Section>
          ))}
          {hints.length < 3 && <Section><button className="row tap accent" onClick={() => setHints((x) => [...x, { text: '', at: 'day' }])}>+ {t('bd.addHint')}</button></Section>}
        </>
      )}
      <div className="coach-nav" style={{ margin: '4px 16px 20px' }}>
        {step > 0 && <button className="glass-btn lg" onClick={() => setStep(step - 1)}>← {t('tour.back')}</button>}
        {step < 3
          ? <button className="glass-btn lg tint" disabled={!can} style={!can ? { opacity: 0.4 } : undefined} onClick={() => setStep(step + 1)}>{t('tour.next')} →</button>
          : <button className="glass-btn lg tint" onClick={seal}>✉️ {t('bd.seal')}</button>}
      </div>
    </Sheet>
  )
}

/* ---------- the envelope ---------- */
function Envelope({ b, onClose }: { b: BlindDate; onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')
  const left = useLeft(b.when)
  const mine = b.to === s.me
  const from = s.users[b.createdBy].name, to = s.users[b.to].name
  const secret = s.blindSecrets.find((x) => x.dateId === b.id)
  const open = !left
  // Hints open on schedule; once the envelope is open there's nothing left to hide.
  const hints = b.hints.filter((h) => !mine || open || ms(h.at) <= Date.now())
  const set = (patch: Partial<BlindDate>) => update((st) => { st.blindDates = st.blindDates.map((x) => (x.id === b.id ? { ...x, ...patch } : x)) })
  useEffect(() => { if (mine && open && !b.openedAt) set({ openedAt: new Date().toISOString() }) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const rate = () => { set({ rating, review: review.trim() || undefined }); update((st) => award(st, 'date', `blind:${b.id}`)); haptic(); toast(t('bd.thanks')); onClose() }
  return (
    <Sheet title={`${moodEmoji(b.mood)} ${t('bd.title')}`} onClose={onClose}>
      <div className={'bd-envelope' + (open ? ' open' : '')}>
        <div className="bd-env-emoji">{open ? '💌' : '✉️'}</div>
        <b>{mine ? t('bd.fromName', { name: from }) : t('bd.forName', { name: to })}</b>
        <span>{t(`bd.mood.${b.mood}` as TKey)} · {fmtDate(toISO(new Date(b.when)), s.lang, { weekday: 'long', day: 'numeric', month: 'long' })}, {new Date(b.when).toTimeString().slice(0, 5)}</span>
        {left && <span className="bd-left">⏳ {left}</span>}
      </div>
      {open && (
        <Section header={t('bd.where')}>
          <Row icon="📍" title={secret?.place ?? t('bd.noPlace')} />
        </Section>
      )}
      {!open && !mine && secret && <Section header={t('bd.where')} footer={t('bd.secretHint', { name: to })}><Row icon="🔒" title={secret.place} /></Section>}
      {hints.length > 0 && (
        <Section header={t('bd.hints')}>
          {hints.map((h, i) => <Row key={i} icon="💡" title={<span style={{ fontWeight: 400 }}>{h.text}</span>}
            sub={!mine && ms(h.at) > Date.now() ? t('bd.opensAt', { when: fmtDate(toISO(new Date(h.at)), s.lang) + ', ' + new Date(h.at).toTimeString().slice(0, 5) }) : undefined} />)}
        </Section>
      )}
      {mine && !open && (
        <Section footer={b.excitedAt ? t('bd.excitedSent', { name: from }) : undefined}>
          <button className="row tap accent" disabled={!!b.excitedAt} style={b.excitedAt ? { opacity: 0.5 } : undefined}
            onClick={() => { set({ excitedAt: new Date().toISOString() }); haptic() }}>🙌 {t('bd.excited')}</button>
        </Section>
      )}
      {!mine && b.excitedAt && <Section><Row icon="🙌" title={t('bd.isExcited', { name: to })} /></Section>}
      {mine && open && !b.rating && (
        <Section header={t('bd.rate')}>
          <div className="row" style={{ justifyContent: 'center' }}><Stars value={rating} onChange={setRating} /></div>
          <TextRow value={review} onChange={setReview} placeholder={t('bd.reviewPlaceholder')} multiline />
          <button className="row tap accent" disabled={!rating} style={!rating ? { opacity: 0.4 } : undefined} onClick={rate}>✓ {t('bd.saveRating')}</button>
        </Section>
      )}
      {b.rating && <Section header={t('bd.rated')}><Row title={'⭐'.repeat(b.rating)} sub={b.review} /></Section>}
    </Sheet>
  )
}

/* ---------- on the Us screen ---------- */
export function BlindSection() {
  const s = useApp()
  const t = useT()
  const [plan, setPlan] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const { forMe, fromMe, done } = blindOf(s)
  const partner = s.users[other(s.me)].name
  const current = open ? s.blindDates.find((b) => b.id === open) : undefined
  if (!forMe.length && !fromMe.length && !done.length) return null
  return (
    <Section header={`🎭 ${t('bd.section')}`} action={<button onClick={() => setPlan(true)}>+ {t('bd.plan')}</button>}>
      {forMe.map((b) => <EnvelopeRow key={b.id} b={b} title={t('bd.forMeRow', { name: s.users[b.createdBy].name })} onClick={() => setOpen(b.id)} />)}
      {fromMe.map((b) => <EnvelopeRow key={b.id} b={b} title={t('bd.fromMeRow', { name: partner })} onClick={() => setOpen(b.id)} />)}
      {done.slice(0, 4).map((b) => (
        <Row key={b.id} icon={moodEmoji(b.mood)} title={'⭐'.repeat(b.rating ?? 0)} sub={`${fmtDate(toISO(new Date(b.when)), s.lang)}${b.review ? ' · ' + b.review : ''}`} chevron onClick={() => setOpen(b.id)} />
      ))}
      {plan && <BlindWizard onClose={() => setPlan(false)} />}
      {current && <Envelope b={current} onClose={() => setOpen(null)} />}
    </Section>
  )
}

function EnvelopeRow({ b, title, onClick }: { b: BlindDate; title: string; onClick: () => void }) {
  const t = useT()
  const left = useLeft(b.when)
  return <Row icon={left ? '✉️' : '💌'} title={title} sub={left ? `⏳ ${left}${b.excitedAt ? ' · 🙌' : ''}` : t('bd.openNow')} chevron onClick={onClick} />
}
