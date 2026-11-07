import { useEffect, useState } from 'react'
import { base, other, update, useApp, visible } from '../store'
import { moduleLabel, useT } from '../i18n'
import { Empty, GlassButton, Marks, Row, Screen, Section, Segmented, Sheet, Stars, TextRow, VisibilityFields, haptic } from '../ui'
import type { UserId, WatchItem, WatchLink, WatchStatus } from '../types'
import { CoverBox, CoverPicker } from '../cover'

const KIND_EMOJI = { movie: '🎬', series: '📺', other: '🎞️' }

/** «S2 · E5» for a series we're in the middle of. */
export const epLabel = (w: WatchItem, t: ReturnType<typeof useT>) => (w.kind === 'series' && (w.season || w.episode) ? t('wt.ep', { s: w.season ?? 1, e: w.episode ?? 1 }) : '')

/** Whose turn it is to choose: the other person than whoever chose last (nobody yet = either of you). */
export function chooserOf(items: WatchItem[]): UserId | undefined {
  const last = items.filter((w) => w.pickedBy && w.pickedAt).sort((a, b) => (a.pickedAt! < b.pickedAt! ? 1 : -1))[0]
  return last ? other(last.pickedBy!) : undefined
}
/** Moving a title to «watching» records who chose it. */
const startWatching = (w: WatchItem, me: UserId): WatchItem => ({ ...w, status: 'watching', pickedBy: me, pickedAt: new Date().toISOString() })

/** Streaming services with a button on every title; "custom" is any site the two of you use. */
export const SERVICES = {
  netflix: { name: 'Netflix', short: 'N', search: (q: string) => `https://www.netflix.com/search?q=${q}`, match: /netflix\.com/ },
  youtube: { name: 'YouTube', short: '▶', search: (q: string) => `https://www.youtube.com/results?search_query=${q}`, match: /youtube\.com|youtu\.be/ },
  appletv: { name: 'Apple TV', short: 'tv', search: (q: string) => `https://tv.apple.com/search?term=${q}`, match: /tv\.apple\.com/ },
} as const
type ServiceId = keyof typeof SERVICES

/** A search on one of our own sites: its search page with {q}, else Google limited to that site. */
export function siteSearch(url: string, title: string) {
  const q = encodeURIComponent(title)
  if (url.includes('{q}')) return url.replace('{q}', q)
  let host = url
  try { host = new URL(/^https?:/.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '') } catch { /* keep as typed */ }
  return `https://www.google.com/search?q=${encodeURIComponent(`site:${host}`)}+${q}`
}

export function detectService(url: string): WatchLink {
  for (const [id, sv] of Object.entries(SERVICES)) if (sv.match.test(url)) return { service: id, url }
  let host = ''
  try { host = new URL(url).hostname.replace(/^www\./, '') } catch { /* not a URL */ }
  return { service: 'custom', url, label: host || undefined }
}

/**
 * Poster from Wikipedia (no API key, CORS-enabled): find the article, then the picture whose file name
 * says "poster" or shares a word with the title, else the first photo on the page.
 */
async function findPoster(w: WatchItem): Promise<{ poster: string; year?: string }> {
  const ru = /[а-яё]/i.test(w.title)
  const api = `https://${ru ? 'ru' : 'en'}.wikipedia.org/w/api.php`
  const hint = w.kind === 'series' ? (ru ? 'сериал' : 'TV series') : (ru ? 'фильм' : 'film')
  const get = (q: string) => fetch(`${api}?${q}&format=json&origin=*`).then((r) => r.json())
  const s = await get(`action=query&list=search&srlimit=1&srsearch=${encodeURIComponent(`${w.title} ${hint}`)}`)
  const hit = s.query?.search?.[0]
  if (!hit) return { poster: '' }
  // A film article's snippet opens with its year; series snippets are too noisy for that.
  const year = w.kind === 'movie' ? (hit.snippet as string | undefined)?.match(/\b(19|20)\d{2}\b/)?.[0] : undefined
  const p = await get(`action=parse&prop=images&page=${encodeURIComponent(hit.title)}`)
  const files = ((p.parse?.images ?? []) as string[]).filter((f) => /\.(jpe?g|png|webp)$/i.test(f) && !/logo|icon|flag|commons|wiki|symbol/i.test(f))
  const words = w.title.toLowerCase().split(/[^\p{L}\d]+/u).filter((x) => x.length > 2)
  const file = files.find((f) => /poster|постер|cartel|plakat/i.test(f)) ?? files.find((f) => words.some((x) => f.toLowerCase().includes(x))) ?? (w.kind === 'series' ? undefined : files[0])
  if (!file) return { poster: '', year }
  const ii = await get(`action=query&prop=imageinfo&iiprop=url&iiurlwidth=500&titles=${encodeURIComponent('File:' + file)}`)
  const info = (Object.values(ii.query?.pages ?? {})[0] as { imageinfo?: { thumburl?: string; url?: string }[] } | undefined)?.imageinfo?.[0]
  return { poster: info?.thumburl ?? info?.url ?? '', year }
}

function ServiceBadges({ links }: { links?: WatchLink[] }) {
  if (!links?.length) return null
  return (
    <div className="svc-dots">
      {links.map((l, i) => (
        <span key={i} className={`svc svc-${l.service in SERVICES ? l.service : 'custom'}`}>
          {l.service in SERVICES ? SERVICES[l.service as ServiceId].short : (l.label ?? '•').slice(0, 1).toUpperCase()}
        </span>
      ))}
    </div>
  )
}

export default function Watch({ back }: { back?: boolean }) {
  const s = useApp()
  const t = useT()
  const [tab, setTab] = useState<WatchStatus>('want')
  const [edit, setEdit] = useState<WatchItem | null>(null)
  const [pick, setPick] = useState<WatchItem | null>(null)
  const all = visible(s.watch, s.me)
  const list = all.filter((w) => w.status === tab)
  const chooser = chooserOf(all)

  // Fetch posters for titles that have never been looked up.
  useEffect(() => {
    all.filter((w) => w.poster === undefined && w.title).slice(0, 6).forEach(async (w) => {
      const p = await findPoster(w).catch(() => ({ poster: '', year: undefined as string | undefined }))
      update((st) => { const x = st.watch.find((k) => k.id === w.id); if (x) { x.poster = p.poster; x.year ??= p.year } })
    })
  }, [all.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const random = () => {
    const pool = all.filter((w) => w.status === 'want')
    if (pool.length) setPick(pool[Math.floor(Math.random() * pool.length)])
  }

  return (
    <Screen title={moduleLabel(s, 'watch').title} back={back} accent="watch"
      right={<GlassButton icon="plus" label={t('add')} onClick={() => setEdit({ ...base(s.me), title: '', kind: 'movie', status: tab, links: [] })} />}
      actions={[{ icon: '🎲', label: t('whatToWatch'), onClick: random }]}
      head={<Segmented value={tab} onChange={setTab} options={(['want', 'watching', 'done'] as WatchStatus[]).map((x) => ({ value: x, label: `${t(`ws.${x}`)} · ${all.filter((w) => w.status === x).length}` }))} />}>
      {tab === 'want' && all.length > 0 && (
        <Section footer={t('wt.turnHint')}>
          <Row icon="🎯" title={chooser ? t('wt.turn', { name: s.users[chooser].name }) : t('wt.turnAny')}
            detail={chooser === s.me ? t('wt.you') : undefined} />
        </Section>
      )}
      {list.length === 0 && <Empty emoji="🍿" text={t('empty')} />}
      <div className="poster-grid">
        {list.map((w) => (
          <button key={w.id} className="poster" onClick={() => setEdit(w)}>
            <CoverBox className="poster-img" src={w.poster} fallback={KIND_EMOJI[w.kind]}>
              <ServiceBadges links={w.links} />
            </CoverBox>
            <div className="poster-title">{w.title} <Marks x={w} /></div>
            <div className="poster-sub">
              {w.status === 'done' && w.rating
                ? (['a', 'j'] as UserId[]).filter((u) => w.rating?.[u]).map((u) => <span key={u}>{s.users[u].emoji}{w.rating![u]}★</span>)
                : epLabel(w, t) ? <span className="ep-badge">📺 {epLabel(w, t)}</span>
                : <span>{t(`wk.${w.kind}`)}{w.year ? ` · ${w.year}` : ''}</span>}
            </div>
          </button>
        ))}
      </div>

      {pick && (
        <Sheet title={t('randomPick')} onClose={() => setPick(null)}>
          <div style={{ textAlign: 'center', padding: '8px 20px 20px' }}>
            <CoverBox className="poster-img" style={{ width: 160, margin: '0 auto' }} src={pick.poster} fallback={KIND_EMOJI[pick.kind]} />
            <div className="ts-title">{pick.title}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="glass-btn lg" onClick={random}>🎲 {t('random')}</button>
            <button className="glass-btn lg tint" onClick={() => { update((st) => { st.watch = st.watch.map((x) => (x.id === pick.id ? startWatching(x, st.me) : x)) }); setPick(null) }}>▶︎ {t('ws.watching')}</button>
          </div>
        </Sheet>
      )}
      {edit && <WatchEditor item={edit} onClose={() => setEdit(null)} />}
    </Screen>
  )
}

function WatchEditor({ item, onClose }: { item: WatchItem; onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const [v, setV] = useState<WatchItem>({ ...item, links: item.links ?? (item.url ? [detectService(item.url)] : []) })
  const isNew = !s.watch.some((w) => w.id === item.id)
  const q = encodeURIComponent(v.title)
  const linkOf = (id: string) => v.links!.find((l) => l.service === id)
  const setLink = (service: string, url: string, label?: string) => {
    const rest = v.links!.filter((l) => l.service !== service)
    setV({ ...v, links: url.trim() ? [...rest, { service, url: url.trim(), label }] : rest })
  }
  const custom = linkOf('custom')
  const [sites, setSites] = useState(false)

  return (
    <Sheet title={isNew ? t('add') : v.title} onClose={onClose} doneDisabled={!v.title.trim()}
      onDone={() => update((st) => {
        // A renamed title gets its poster looked up again.
        let x: WatchItem = { ...v, poster: v.title !== item.title && v.poster === item.poster && !v.poster?.startsWith('photo:') ? undefined : v.poster }
        if (x.status === 'watching' && item.status !== 'watching') x = startWatching(x, st.me)
        if (isNew) st.watch.unshift(x); else st.watch = st.watch.map((w) => (w.id === x.id ? x : w))
      })}>
      {v.poster && <CoverBox className="poster-img" style={{ width: 150, margin: '4px auto 6px' }} src={v.poster} />}
      {v.title.trim() && <CoverPicker compact auto={false} id={v.id} url={v.links?.[0]?.url} cover={v.poster} title={v.title} onChange={(p) => setV((x) => ({ ...x, ...(p.cover !== undefined ? { poster: p.cover } : {}) }))} />}
      <Section>
        <TextRow value={v.title} onChange={(title) => setV({ ...v, title })} placeholder={t('title')} autoFocus={isNew} />
      </Section>

      {v.title.trim() && (
        <>
          <div className="section-header" style={{ padding: '0 30px 8px' }}>{t('whereToWatch')}</div>
          <div className="svc-row">
            {(Object.keys(SERVICES) as ServiceId[]).map((id) => {
              const l = linkOf(id)
              return (
                <a key={id} className={`svc-btn ${id}`} href={l?.url ?? SERVICES[id].search(q)} target="_blank" rel="noreferrer">
                  {l ? '▶︎' : '🔎'} {SERVICES[id].name}{!l && <small>{t('searchOn', { s: '' }).replace(/[:\s]+$/, '')}</small>}
                </a>
              )
            })}
            {(s.watchSites ?? []).map((x, i) => (
              <a key={`site${i}`} className="svc-btn custom" href={siteSearch(x.url, v.title)} target="_blank" rel="noreferrer">🔎 {x.name}</a>
            ))}
            {custom && <a className="svc-btn custom" href={custom.url} target="_blank" rel="noreferrer">▶︎ {custom.label ?? t('customSite')}</a>}
            <button className="svc-btn custom" onClick={() => setSites(true)}>＋ {t('wt.mySite')}</button>
          </div>
        </>
      )}

      <Section header={t('link')}>
        {(Object.keys(SERVICES) as ServiceId[]).map((id) => (
          <div key={id} className="row with-icon">
            <div className="row-icon"><span className={`svc svc-${id}`}>{SERVICES[id].short}</span></div>
            <input value={linkOf(id)?.url ?? ''} placeholder={t('attachLink', { s: SERVICES[id].name })} inputMode="url"
              onChange={(e) => setLink(id, e.target.value)} />
          </div>
        ))}
        <div className="row with-icon">
          <div className="row-icon"><span className="svc svc-custom">★</span></div>
          <input value={custom?.label ?? ''} placeholder={t('siteName')} style={{ maxWidth: '38%' }}
            onChange={(e) => setV({ ...v, links: [...v.links!.filter((l) => l.service !== 'custom'), { service: 'custom', url: custom?.url ?? '', label: e.target.value || undefined }] })} />
          <input value={custom?.url ?? ''} placeholder={t('attachLink', { s: t('customSite') })} inputMode="url"
            onChange={(e) => setLink('custom', e.target.value, custom?.label)} />
        </div>
      </Section>

      <div style={{ margin: '0 14px' }}>
        <Segmented inSheet value={v.kind} onChange={(kind) => setV({ ...v, kind, poster: undefined })}
          options={(['movie', 'series', 'other'] as const).map((k) => ({ value: k, label: `${KIND_EMOJI[k]} ${t(`wk.${k}`)}` }))} />
        <Segmented inSheet value={v.status} onChange={(status) => setV({ ...v, status })}
          options={(['want', 'watching', 'done'] as WatchStatus[]).map((x) => ({ value: x, label: t(`ws.${x}`) }))} />
      </div>
      {v.kind === 'series' && v.status !== 'done' && (
        <Section header={t('wt.where')} footer={v.pickedBy ? t('wt.chose', { name: s.users[v.pickedBy].name }) : undefined}>
          <Row title={t('wt.season')} right={<Stepper value={v.season ?? 1} onChange={(season) => setV({ ...v, season, episode: season !== (v.season ?? 1) ? 1 : v.episode })} />} />
          <Row title={t('wt.episode')} right={<Stepper value={v.episode ?? 1} onChange={(episode) => setV({ ...v, episode, season: v.season ?? 1 })} />} />
          <button className="row tap accent" onClick={() => { setV({ ...v, season: v.season ?? 1, episode: (v.episode ?? 1) + 1, status: v.status === 'want' ? 'watching' : v.status }); haptic() }}>✓ {t('wt.next')}</button>
        </Section>
      )}
      {v.status === 'done' && (
        <Section header={t('rating')}>
          {(['a', 'j'] as UserId[]).map((u) => (
            <Row key={u} title={`${s.users[u].emoji} ${s.users[u].name}`}
              right={<Stars value={v.rating?.[u]} onChange={u === s.me ? (n) => setV({ ...v, rating: { ...v.rating, [u]: n || undefined } }) : undefined} />} />
          ))}
        </Section>
      )}
      <Section>
        <TextRow value={v.notes ?? ''} onChange={(notes) => setV({ ...v, notes })} placeholder={t('notes')} multiline />
      </Section>
      <VisibilityFields value={v} onChange={setV} />
      {!isNew && (
        <Section>
          <button className="row tap destructive" onClick={() => { update((st) => { st.watch = st.watch.filter((w) => w.id !== v.id) }); onClose() }}>{t('delete')}</button>
        </Section>
      )}
      {sites && <SitesSheet onClose={() => setSites(false)} />}
    </Sheet>
  )
}

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <span className="stepper">
      <button onClick={() => onChange(Math.max(1, value - 1))} aria-label="−">−</button>
      <b>{value}</b>
      <button onClick={() => { onChange(value + 1); haptic() }} aria-label="+">+</button>
    </span>
  )
}

/** Our own sites for looking titles up — shared by the couple, a button on every title. */
function SitesSheet({ onClose }: { onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const list = s.watchSites ?? []
  const add = () => {
    if (!name.trim() || !url.trim()) return
    update((st) => { st.watchSites = [...(st.watchSites ?? []), { name: name.trim(), url: url.trim() }] })
    setName(''); setUrl(''); haptic()
  }
  return (
    <Sheet title={t('wt.mySites')} onClose={onClose}>
      {list.length > 0 && (
        <Section>
          {list.map((x, i) => (
            <Row key={i} icon="🔎" title={x.name} sub={x.url}
              right={<button className="ls-del" aria-label={t('delete')} onClick={() => update((st) => { st.watchSites = (st.watchSites ?? []).filter((_, k) => k !== i) })}>×</button>} />
          ))}
        </Section>
      )}
      <Section footer={t('wt.mySitesHint')}>
        <TextRow value={name} onChange={setName} placeholder={t('siteName')} />
        <TextRow value={url} onChange={setUrl} placeholder={t('wt.siteUrl')} />
        <button className="row tap accent" disabled={!name.trim() || !url.trim()} onClick={add}>＋ {t('add')}</button>
      </Section>
    </Sheet>
  )
}
