import { useState } from 'react'
import { base, uid, update, useApp, visible } from '../store'
import { useT } from '../i18n'
import { DateRow, GlassButton, Row, Screen, Section, SelectRow, Sheet, Swipe, TextRow } from '../ui'
import { addDays, diffDays, fmtDate, today } from '../lib/date'
import { PET_EMOJI, PET_INTERVAL } from '../lib/categories'
import type { PetKind, PetRecord } from '../types'

const KINDS: PetKind[] = ['vaccine', 'parasite', 'vet', 'groom', 'other']

export default function Pet({ back }: { back?: boolean }) {
  const s = useApp()
  const t = useT()
  const [edit, setEdit] = useState<PetRecord | null>(null)
  const [weight, setWeight] = useState(false)
  const [profile, setProfile] = useState(false)
  const d = today()
  const recs = visible(s.petRecords, s.me)
  const upcoming = recs.filter((r) => r.nextDue).sort((a, b) => a.nextDue!.localeCompare(b.nextDue!))
  const history = [...recs].sort((a, b) => b.date.localeCompare(a.date))
  const weights = [...s.weights].sort((a, b) => a.date.localeCompare(b.date))
  const lastW = weights[weights.length - 1]

  let age = ''
  if (s.pet.birthday) {
    const months = Math.floor(diffDays(d, s.pet.birthday) / 30.44)
    age = months >= 12 ? `${Math.floor(months / 12)} ${t('years')} ${months % 12 ? `${months % 12} ${t('months')}` : ''}` : `${months} ${t('months')}`
  }

  // "Done": log today's record and roll the reminder forward.
  const markDone = (r: PetRecord) => update((st) => {
    const old = st.petRecords.find((x) => x.id === r.id)!
    const interval = PET_INTERVAL[r.kind] ?? (r.nextDue && r.date ? diffDays(r.nextDue, r.date) : undefined)
    old.nextDue = undefined
    st.petRecords.push({ ...base(st.me), kind: r.kind, title: r.title, date: today(), nextDue: interval ? addDays(today(), interval) : undefined })
  })

  return (
    <Screen title={s.pet.name} back={back} accent="pet"
      right={<GlassButton icon="plus" label={t('add')} onClick={() => setEdit({ ...base(s.me), kind: 'vaccine', title: '', date: d, nextDue: addDays(d, 365) })} />}
      hero={<div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <span className="circle lg" style={{ width: 76, height: 76, fontSize: 42 }}>{s.pet.emoji}</span>
        <div>
          <div className="hero-num">{lastW ? `${lastW.kg} ${t('kg')}` : '—'}</div>
          <div className="hero-sub" style={{ marginTop: 2 }}>{[s.pet.breed, age].filter(Boolean).join(' · ')}</div>
        </div>
      </div>}
      actions={[
        { icon: '💉', label: t('add'), onClick: () => setEdit({ ...base(s.me), kind: 'vaccine', title: '', date: d, nextDue: addDays(d, 365) }) },
        { icon: '⚖️', label: t('weight'), onClick: () => setWeight(true) },
        { icon: '✏️', label: t('edit'), onClick: () => setProfile(true) },
      ]}>

      {upcoming.length > 0 && (
        <Section big header={t('upcoming')}>
          {upcoming.map((r) => {
            const n = diffDays(r.nextDue!, d)
            return (
              <Row key={r.id} icon={PET_EMOJI[r.kind]} title={r.title} onClick={() => setEdit(r)}
                sub={<span className={n < 0 ? 'red' : ''}>{fmtDate(r.nextDue!, s.lang, { day: 'numeric', month: 'long' })} · {n === 0 ? t('today') : n < 0 ? t('daysAgo', { n: -n }) : t('inDays', { n })}</span>}
                right={<button className="chip" style={{ background: 'var(--fill)' }} onClick={(e) => { e.stopPropagation(); markDone(r) }}>✓</button>} />
            )
          })}
        </Section>
      )}

      <Section big header={t('weight')} action={<button onClick={() => setWeight(true)}>{t('addWeight')}</button>}>
        <div style={{ padding: '12px 16px' }}><Sparkline points={weights.map((w) => w.kg)} /></div>
        {[...weights].reverse().slice(0, 3).map((w) => (
          <Row key={w.id} title={`${w.kg} ${t('kg')}`} detail={fmtDate(w.date, s.lang)} />
        ))}
      </Section>

      <Section big header={t('history')}>
        {history.map((r) => (
          <Swipe key={r.id} onDelete={() => update((st) => { st.petRecords = st.petRecords.filter((x) => x.id !== r.id) })}>
            <Row icon={PET_EMOJI[r.kind]} title={r.title} sub={r.notes} detail={fmtDate(r.date, s.lang, { day: 'numeric', month: 'short', year: '2-digit' })} onClick={() => setEdit(r)} />
          </Swipe>
        ))}
      </Section>

      {edit && <RecordEditor rec={edit} onClose={() => setEdit(null)} />}
      {weight && <WeightSheet onClose={() => setWeight(false)} />}
      {profile && <ProfileSheet onClose={() => setProfile(false)} />}
    </Screen>
  )
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null
  const min = Math.min(...points) - 0.2, max = Math.max(...points) + 0.2
  const xy = points.map((p, i) => [(i / (points.length - 1)) * 300, 60 - ((p - min) / (max - min)) * 52 - 4])
  const path = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  return (
    <svg className="sparkline" viewBox="0 0 300 64" preserveAspectRatio="none">
      <path d={`${path} L300,64 L0,64 Z`} fill="color-mix(in srgb, var(--brown) 18%, transparent)" />
      <path d={path} fill="none" stroke="var(--brown)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  )
}

function RecordEditor({ rec, onClose }: { rec: PetRecord; onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const [v, setV] = useState(rec)
  const isNew = !s.petRecords.some((r) => r.id === rec.id)
  return (
    <Sheet title={isNew ? t('add') : v.title} onClose={onClose} doneDisabled={!v.title.trim()}
      onDone={() => update((st) => { if (isNew) st.petRecords.push(v); else st.petRecords = st.petRecords.map((r) => (r.id === v.id ? v : r)) })}>
      <Section>
        <SelectRow label={t('type')} value={v.kind} options={KINDS.map((k) => ({ value: k, label: `${PET_EMOJI[k]} ${t(`pk.${k}`)}` }))}
          onChange={(kind) => {
            const iv = PET_INTERVAL[kind]
            setV({ ...v, kind, title: v.title || t(`pk.${kind}`), nextDue: iv ? addDays(v.date, iv) : undefined })
          }} />
        <TextRow value={v.title} onChange={(title) => setV({ ...v, title })} placeholder={t('title')} autoFocus={isNew} />
      </Section>
      <Section>
        <DateRow label={t('date')} value={v.date} clearable={false} onChange={(date) => date && setV({ ...v, date })} />
        <DateRow label={`⏰ ${t('nextDue')}`} value={v.nextDue} onChange={(nextDue) => setV({ ...v, nextDue })} />
      </Section>
      <Section><TextRow value={v.notes ?? ''} onChange={(notes) => setV({ ...v, notes })} placeholder={t('notes')} multiline /></Section>
    </Sheet>
  )
}

function WeightSheet({ onClose }: { onClose: () => void }) {
  const t = useT()
  const [v, setV] = useState('')
  const kg = parseFloat(v.replace(',', '.'))
  return (
    <Sheet title={t('addWeight')} onClose={onClose} doneDisabled={!(kg > 0)}
      onDone={() => update((st) => { st.weights.push({ id: uid(), date: today(), kg }) })}>
      <input className="amount-input" inputMode="decimal" placeholder="0.0" value={v} data-autofocus onChange={(e) => setV(e.target.value.replace(/[^\d.,]/g, ''))} />
      <div style={{ textAlign: 'center', marginTop: -14, color: 'var(--label2)' }}>{t('kg')}</div>
    </Sheet>
  )
}

function ProfileSheet({ onClose }: { onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const [v, setV] = useState(s.pet)
  return (
    <Sheet title={s.pet.name} onClose={onClose} onDone={() => update((st) => { st.pet = v })}>
      <Section>
        <TextRow value={v.name} onChange={(name) => setV({ ...v, name })} placeholder={t('name')} />
        <TextRow value={v.emoji} onChange={(emoji) => setV({ ...v, emoji })} placeholder={t('emoji')} />
        <TextRow value={v.breed ?? ''} onChange={(breed) => setV({ ...v, breed })} placeholder="🐕" />
        <DateRow label={`🎂 ${t('age')}`} value={v.birthday} onChange={(birthday) => setV({ ...v, birthday })} />
      </Section>
    </Sheet>
  )
}
