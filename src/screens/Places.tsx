import { useEffect, useRef, useState } from 'react'
import { base, update, useApp, visible } from '../store'
import { moduleLabel, useT } from '../i18n'
import { DateRow, Empty, GlassButton, Marks, Row, Screen, Section, Segmented, Sheet, Stars, Swipe, TextRow, ToggleRow, VisibilityFields, haptic, toast, Em, EmojiField } from '../ui'
import { fmtDate, today } from '../lib/date'
import { award } from '../lib/game'
import { CoverPicker, Thumb, fromPreview, hostOf, relink, useAutoCovers } from '../cover'
import type { Note, Visit } from '../types'

/*
 * Places (the Dates section): ideas for going out and the places we've been. Each place has a budget from free
 * to pricey, an address with a map link, tags and visits with stars, a review and «shall we come back?».
 * Visits can be edited and removed. The wheel picks a place by budget, tag and «not been yet».
 */

const BUDGETS = [1, 2, 3, 4] as const
const budgetMark = (b?: number) => (b ? (b === 1 ? '🆓' : '💸'.repeat(b - 1)) : '')
const isBeen = (n: Note) => !!n.done || !!n.visits?.length
const avgRating = (n: Note) => {
  const r = (n.visits ?? []).filter((v) => v.rating).map((v) => v.rating!)
  return r.length ? r.reduce((a, b) => a + b, 0) / r.length : 0
}
const lastVisit = (n: Note) => [...(n.visits ?? [])].sort((a, b) => b.date.localeCompare(a.date))[0]
const mapUrl = (n: Note) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(n.address || n.title)}`

/** A Google Maps place link → its name: …/maps/place/Caf%C3%A9+Nero/@52.2,21.0 → «Café Nero». */
export function placeFromMaps(url: string) {
  const m = url.match(/google\.[^/]+\/maps\/place\/([^/@?]+)/)
  if (!m) return null
  try { return decodeURIComponent(m[1].replace(/\+/g, ' ')).trim() || null } catch { return null }
}

type Sort = 'new' | 'az' | 'cheap' | 'rating'

export default function Places({ back }: { back?: boolean }) {
  const s = useApp()
  const t = useT()
  const [edit, setEdit] = useState<Note | null>(null)
  const [been, setBeen] = useState(false)
  const [tag, setTag] = useState<string | null>(null)
  const [budget, setBudget] = useState<number | null>(null)
  const [sort, setSort] = useState<Sort>('new')
  const [wheel, setWheel] = useState(false)
  const all = visible(s.notes, s.me).filter((n) => n.module === 'dates')
  useAutoCovers(all, (id, p) => update((st) => { const x = st.notes.find((k) => k.id === id); if (x) Object.assign(x, fromPreview(x, p)) }))
  const tags = [...new Set(all.flatMap((n) => n.tags ?? []))].sort()
  const list = all
    .filter((n) => isBeen(n) === been && (!tag || n.tags?.includes(tag)) && (!budget || n.budget === budget))
    .sort((a, b) => sort === 'az' ? a.title.localeCompare(b.title, s.lang)
      : sort === 'cheap' ? (a.budget ?? 9) - (b.budget ?? 9) || (a.price ?? 1e9) - (b.price ?? 1e9)
        : sort === 'rating' ? avgRating(b) - avgRating(a)
          : (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))

  const row = (n: Note) => {
    const v = lastVisit(n)
    const r = avgRating(n)
    return (
      <Swipe key={n.id} onDelete={() => update((st) => { st.notes = st.notes.filter((k) => k.id !== n.id) })}>
        <Row left={n.cover ? <Thumb src={n.cover} /> : undefined} icon={n.cover ? undefined : n.emoji || '💕'}
          title={<>{n.cover && <Em x={n} />}{n.title} <Marks x={n} /></>}
          sub={<>
            {n.budget && <span>{budgetMark(n.budget)}</span>}
            {r > 0 && <span>⭐ {r.toFixed(1)}</span>}
            {v && <span>{fmtDate(v.date, s.lang)}{v.again ? ' · 🔁' : ''}</span>}
            {n.tags?.map((x) => <span key={x} className="tag">{x}</span>)}
            {!v && !n.tags?.length && (n.address || n.url) && <span>{n.address || n.site || hostOf(n.url)}</span>}
          </>}
          chevron onClick={() => setEdit(n)} />
      </Swipe>
    )
  }

  return (
    <Screen title={moduleLabel(s, 'dates').title} back={back} accent="dates"
      right={<GlassButton icon="plus" label={t('add')} onClick={() => setEdit({ ...base(s.me), module: 'dates', title: '' })} />}
      actions={[{ icon: '🎡', label: t('pl.wheel'), onClick: () => setWheel(true) }]}
      head={<>
        <Segmented value={been ? 'been' : 'ideas'} onChange={(x) => setBeen(x === 'been')}
          options={[{ value: 'ideas', label: `💡 ${t('ideas')} · ${all.filter((n) => !isBeen(n)).length}` }, { value: 'been', label: `✓ ${t('been')} · ${all.filter(isBeen).length}` }]} />
        {(tags.length > 0 || all.some((n) => n.budget)) && (
          <div className="chips pl-filters">
            {BUDGETS.filter((b) => all.some((n) => n.budget === b)).map((b) => (
              <button key={b} className={'chip' + (budget === b ? ' on' : '')} onClick={() => setBudget(budget === b ? null : b)}>{budgetMark(b)}</button>
            ))}
            {tags.map((x) => <button key={x} className={'chip' + (tag === x ? ' on' : '')} onClick={() => setTag(tag === x ? null : x)}>#{x}</button>)}
          </div>
        )}
      </>}>
      {all.length > 1 && (
        <div className="chips pl-sort">
          {(['new', 'az', 'cheap', 'rating'] as const).map((x) => (
            <button key={x} className={'chip' + (sort === x ? ' on' : '')} onClick={() => setSort(x)}>{t(`pl.sort.${x}`)}</button>
          ))}
        </div>
      )}
      {list.length === 0 && <Empty emoji="💕" text={been ? t('pl.emptyBeen') : t('pl.emptyIdeas')} />}
      {list.length > 0 && <Section>{list.map(row)}</Section>}
      {wheel && <WheelSheet places={all} tags={tags} onOpen={(n) => { setWheel(false); setEdit(n) }} onClose={() => setWheel(false)} />}
      {edit && <PlaceEditor place={edit} onClose={() => setEdit(null)} />}
    </Screen>
  )
}

/* ---------- one place ---------- */
function PlaceEditor({ place, onClose }: { place: Note; onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const [v, setV] = useState(place)
  const [tags, setTags] = useState((place.tags ?? []).join(', '))
  const [visit, setVisit] = useState<Visit | null>(null)
  const isNew = !s.notes.some((n) => n.id === place.id)
  const collect = (): Note => ({ ...v, title: v.title.trim(), tags: tags.split(',').map((x) => x.trim().toLowerCase().replace(/^#/, '')).filter(Boolean) })
  const save = () => update((st) => {
    const x = collect()
    if (isNew) st.notes.unshift(x)
    else st.notes = st.notes.map((n) => (n.id === x.id ? { ...x, visits: n.visits, done: n.done } : n))
  })
  const setUrl = (url: string) => {
    const name = placeFromMaps(url)
    setV((x) => ({ ...x, url: url || undefined, ...relink(x, url), ...(name ? { title: x.title || name, address: x.address || name } : {}) }))
  }
  const live = s.notes.find((n) => n.id === place.id) ?? v
  const visits = [...(live.visits ?? [])].sort((a, b) => b.date.localeCompare(a.date))
  return (
    <Sheet title={isNew ? t('pl.new') : v.title} onClose={onClose} onDone={save} doneDisabled={!v.title.trim()}>
      <Section>
        <TextRow value={v.title} onChange={(title) => setV({ ...v, title })} placeholder={t('pl.name')} autoFocus={isNew} />
        <TextRow value={v.url ?? ''} onChange={setUrl} placeholder={`🔗 ${t('pl.link')}`} />
        <TextRow value={v.address ?? ''} onChange={(address) => setV({ ...v, address: address || undefined })} placeholder={`📍 ${t('pl.address')}`} />
        <TextRow value={tags} onChange={setTags} placeholder={`# ${t('pl.tags')}`} />
        <TextRow value={v.notes ?? ''} onChange={(notes) => setV({ ...v, notes })} placeholder={t('notes')} multiline />
      </Section>
      <div style={{ margin: '0 14px 6px' }}>
        <div className="section-header" style={{ padding: '6px 16px 8px' }}>{t('pl.budget')}</div>
        <Segmented inSheet value={String(v.budget ?? 0)} onChange={(x) => setV({ ...v, budget: x === '0' ? undefined : (Number(x) as Note['budget']) })}
          options={[{ value: '0', label: '—' }, ...BUDGETS.map((b) => ({ value: String(b), label: budgetMark(b) }))]} />
      </div>
      <Section footer={v.budget ? t(`pl.budget${v.budget}`) : undefined}>
        <label className="row"><span className="label" style={{ flex: 1 }}>💶 {t('pl.price')}</span>
          <input type="number" inputMode="decimal" min={0} value={v.price ?? ''} placeholder="—" style={{ width: 100, textAlign: 'right', border: 0, background: 'none' }}
            onChange={(e) => setV({ ...v, price: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)) })} /></label>
      </Section>
      {(v.url || v.cover) && <CoverPicker id={v.id} url={v.url} cover={v.cover} title={v.title} emoji="💕" onChange={(p) => setV((x) => ({ ...x, ...p }))} />}
      {(v.address || v.title) && <Section><a className="row tap accent" href={mapUrl(v)} target="_blank" rel="noreferrer">🗺️ {t('pl.onMap')}</a>
        {v.url && <a className="row tap accent" href={v.url} target="_blank" rel="noreferrer">🔗 {t('open_link')}</a>}</Section>}
      {!isNew && (
        <Section header={`✓ ${t('pl.visits')}`} action={<button onClick={() => setVisit({ id: base(s.me).id, date: today(), by: s.me })}>+ {t('pl.markVisit')}</button>}>
          {visits.length === 0 && <Row title={<span style={{ color: 'var(--label2)', fontWeight: 400 }}>{t('pl.noVisits')}</span>} />}
          {visits.map((x) => (
            <Row key={x.id} icon={x.again ? '🔁' : '📍'} title={`${fmtDate(x.date, s.lang, { day: 'numeric', month: 'long', year: 'numeric' })}${x.rating ? ' · ' + '⭐'.repeat(x.rating) : ''}`}
              sub={x.review} chevron onClick={() => setVisit(x)} />
          ))}
        </Section>
      )}
      {!v.cover && <EmojiField value={v} onChange={setV} />}
      <VisibilityFields value={v} onChange={setV} />
      {visit && <VisitSheet placeId={place.id} visit={visit} onClose={() => setVisit(null)} />}
    </Sheet>
  )
}

function VisitSheet({ placeId, visit, onClose }: { placeId: string; visit: Visit; onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const [v, setV] = useState(visit)
  const isNew = !s.notes.find((n) => n.id === placeId)?.visits?.some((x) => x.id === visit.id)
  const save = () => update((st) => {
    const p = st.notes.find((n) => n.id === placeId)
    if (!p) return
    p.visits = isNew ? [...(p.visits ?? []), v] : (p.visits ?? []).map((x) => (x.id === v.id ? v : x))
    p.done = true
    award(st, 'date', `${placeId}:${v.date}`)
  })
  const remove = () => {
    update((st) => {
      const p = st.notes.find((n) => n.id === placeId)
      if (p) { p.visits = (p.visits ?? []).filter((x) => x.id !== v.id); if (!p.visits.length) p.done = false }
    })
    onClose()
  }
  return (
    <Sheet title={isNew ? t('pl.markVisit') : t('pl.visit')} onClose={onClose} onDone={() => { save(); toast(t('pl.saved')) }}>
      <Section><DateRow label={`📅 ${t('date')}`} value={v.date} onChange={(date) => setV({ ...v, date: date ?? today() })} clearable={false} /></Section>
      <Section header={t('pl.howWasIt')}>
        <div className="row" style={{ justifyContent: 'center' }}><Stars value={v.rating} onChange={(rating) => setV({ ...v, rating: rating || undefined })} /></div>
        <TextRow value={v.review ?? ''} onChange={(review) => setV({ ...v, review: review || undefined })} placeholder={t('pl.review')} multiline />
      </Section>
      <Section><ToggleRow icon="🔁" label={t('pl.again')} on={!!v.again} onChange={(again) => setV({ ...v, again })} /></Section>
      {!isNew && <Section><button className="row tap destructive" onClick={remove}>{t('delete')}</button></Section>}
    </Sheet>
  )
}

/* ---------- the wheel ---------- */
function WheelSheet({ places, tags, onOpen, onClose }: { places: Note[]; tags: string[]; onOpen: (n: Note) => void; onClose: () => void }) {
  const t = useT()
  const [maxBudget, setMaxBudget] = useState(4)
  const [tag, setTag] = useState<string | null>(null)
  const [fresh, setFresh] = useState(true)
  const [shown, setShown] = useState<Note | null>(null)
  const [spinning, setSpinning] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval>>()
  useEffect(() => () => clearInterval(timer.current), [])
  const pool = places.filter((n) => (n.budget ?? 1) <= maxBudget && (!tag || n.tags?.includes(tag)) && (!fresh || !isBeen(n)))
  const spin = () => {
    if (!pool.length) return
    setSpinning(true)
    let k = 0
    const steps = 14 + Math.floor(Math.random() * 6)
    timer.current = setInterval(() => {
      setShown(pool[Math.floor(Math.random() * pool.length)])
      haptic()
      if (++k >= steps) { clearInterval(timer.current); setSpinning(false) }
    }, 70 + k * 6)
  }
  return (
    <Sheet title={`🎡 ${t('pl.wheel')}`} onClose={onClose}>
      <div className={'pl-wheel' + (spinning ? ' spinning' : '')}>
        <div className="pl-wheel-emoji">{spinning ? '🎡' : shown ? (shown.emoji || '💕') : '🎡'}</div>
        <b>{shown ? shown.title : t('pl.wheelHint')}</b>
        {shown && !spinning && <span>{[budgetMark(shown.budget), shown.address, ...(shown.tags ?? []).map((x) => '#' + x)].filter(Boolean).join(' · ')}</span>}
      </div>
      <Section footer={t('pl.poolN', { n: pool.length })}>
        <ToggleRow icon="✨" label={t('pl.onlyNew')} on={fresh} onChange={setFresh} />
      </Section>
      <div className="chips pl-filters" style={{ margin: '0 16px 10px' }}>
        {BUDGETS.map((b) => <button key={b} className={'chip' + (maxBudget === b ? ' on' : '')} onClick={() => setMaxBudget(b)}>≤ {budgetMark(b)}</button>)}
      </div>
      {tags.length > 0 && (
        <div className="chips pl-filters" style={{ margin: '0 16px 14px' }}>
          {tags.map((x) => <button key={x} className={'chip' + (tag === x ? ' on' : '')} onClick={() => setTag(tag === x ? null : x)}>#{x}</button>)}
        </div>
      )}
      <Section>
        <button className="row tap accent" disabled={!pool.length || spinning} style={!pool.length ? { opacity: 0.4 } : undefined} onClick={spin}>🎲 {shown ? t('pl.spinAgain') : t('pl.spin')}</button>
        {shown && !spinning && <button className="row tap accent" onClick={() => onOpen(shown)}>💕 {t('pl.letsGo')}</button>}
      </Section>
    </Sheet>
  )
}
