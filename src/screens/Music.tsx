import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { base, getState, other, update, useApp, visible } from '../store'
import { moduleLabel, useT } from '../i18n'
import { Avatar, Empty, GlassButton, Icon, Row, Screen, Section, Sheet, TextRow, VisibilityFields, toast } from '../ui'
import type { Track, UserId } from '../types'

/* ---------- Apple's public iTunes Search API: covers + 30-second previews, no key needed ---------- */
interface ItunesSong { trackId: number; trackName: string; artistName: string; collectionName?: string; artworkUrl100?: string; previewUrl?: string; trackViewUrl?: string }

export async function searchSongs(q: string): Promise<ItunesSong[]> {
  const country = getState().country === 'ES' ? 'es' : 'pl'
  const r = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=15&country=${country}`)
  if (!r.ok) return []
  return (await r.json()).results ?? []
}
const bigArt = (url?: string) => url?.replace(/\d+x\d+bb/, '600x600bb')

function fromItunes(me: UserId, x: ItunesSong): Track {
  return { ...base(me), title: x.trackName, artist: x.artistName, album: x.collectionName, artwork: bigArt(x.artworkUrl100), preview: x.previewUrl, url: x.trackViewUrl, likes: [] }
}

/* ---------- Tiny global player for previews ---------- */
type PlayerState = { track?: Track; playing: boolean; progress: number }
let ps: PlayerState = { playing: false, progress: 0 }
const audio = typeof Audio !== 'undefined' ? new Audio() : undefined
const pl = new Set<() => void>()
const setPs = (p: Partial<PlayerState>) => { ps = { ...ps, ...p }; pl.forEach((l) => l()) }
audio?.addEventListener('timeupdate', () => setPs({ progress: audio.duration ? audio.currentTime / audio.duration : 0 }))
audio?.addEventListener('ended', () => setPs({ playing: false, progress: 0 }))
audio?.addEventListener('pause', () => setPs({ playing: false }))
audio?.addEventListener('play', () => setPs({ playing: true }))
export const player = {
  toggle(t: Track) {
    if (!audio || !t.preview) return
    if (ps.track?.id === t.id) { if (audio.paused) audio.play(); else audio.pause(); return }
    audio.src = t.preview
    setPs({ track: t, progress: 0 })
    audio.play().catch(() => {})
  },
  stop() { audio?.pause(); setPs({ track: undefined, playing: false, progress: 0 }) },
}
export const usePlayer = () => useSyncExternalStore((l) => { pl.add(l); return () => { pl.delete(l) } }, () => ps)

/* ---------- Pieces ---------- */
export function Cover({ track, size, radius }: { track: Track; size?: number; radius?: number }) {
  const style = { width: size, height: size, borderRadius: radius ?? (size && size < 60 ? 12 : 18) } as CSSProperties
  // Fallback art: a gradient seeded from the title.
  const hue = [...track.title].reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  return track.artwork
    ? <img className="cover" src={track.artwork} alt="" style={style} loading="lazy" />
    : <div className="cover" style={{ ...style, background: `linear-gradient(135deg, hsl(${hue} 80% 60%), hsl(${(hue + 60) % 360} 80% 45%))` }}>🎵</div>
}

function PlayButton({ track, big }: { track: Track; big?: boolean }) {
  const p = usePlayer()
  if (!track.preview) return null
  const on = p.track?.id === track.id && p.playing
  return (
    <button className={'play-btn lg on-accent' + (big ? ' big' : '')} onClick={(e) => { e.stopPropagation(); player.toggle(track) }} aria-label="Play">
      <span>{on ? '❚❚' : '▶︎'}</span>
    </button>
  )
}

export function MiniPlayer() {
  const p = usePlayer()
  if (!p.track) return null
  return (
    <div className="mini-player lg">
      <Cover track={p.track} size={40} radius={10} />
      <div className="mp-text">
        <b>{p.track.title}</b>
        <span>{p.track.artist}</span>
      </div>
      <button className="mp-btn" onClick={() => player.toggle(p.track!)}>{p.playing ? '❚❚' : '▶︎'}</button>
      <button className="mp-btn" onClick={() => player.stop()}><Icon name="close" /></button>
      <i className="mp-progress" style={{ transform: `scaleX(${p.progress})` }} />
    </div>
  )
}

/* ---------- Screen ---------- */
export default function Music({ back }: { back?: boolean }) {
  const s = useApp()
  const t = useT()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<ItunesSong[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState<'all' | 'fav' | UserId>('all')
  const [open, setOpen] = useState<Track | null>(null)
  const [manual, setManual] = useState<Track | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const all = visible(s.music, s.me)
  const list = all.filter((x) => filter === 'all' || (filter === 'fav' ? x.likes.includes(s.me) : x.createdBy === filter))
  const featured = all[0]

  // Fill in covers for tracks added by hand (once per track).
  useEffect(() => {
    const missing = all.filter((x) => x.artwork === undefined).slice(0, 6)
    missing.forEach(async (x) => {
      const r = await searchSongs(`${x.artist} ${x.title}`).catch(() => [])
      const hit = r[0]
      update((st) => {
        const tr = st.music.find((m) => m.id === x.id)
        if (!tr) return
        tr.artwork = bigArt(hit?.artworkUrl100) ?? ''
        if (hit && !tr.preview) tr.preview = hit.previewUrl
        if (hit && !tr.url) tr.url = hit.trackViewUrl
      })
    })
  }, [all.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const onQuery = (v: string) => {
    setQ(v)
    clearTimeout(timer.current)
    if (!v.trim() || /^https?:\/\//.test(v.trim())) { setResults(null); return }
    timer.current = setTimeout(async () => {
      setBusy(true)
      setResults(await searchSongs(v.trim()).catch(() => []))
      setBusy(false)
    }, 350)
  }
  const submit = () => {
    const v = q.trim()
    if (/^https?:\/\//.test(v)) { setManual({ ...base(s.me), title: '', artist: '', url: v, likes: [] }); setQ('') }
  }
  const share = (x: ItunesSong) => {
    update((st) => { st.music.unshift(fromItunes(st.me, x)) })
    toast(`🎧 ${x.trackName} ✓`)
    setQ('')
    setResults(null)
  }

  const counts = { a: all.filter((x) => x.createdBy === 'a').length, j: all.filter((x) => x.createdBy === 'j').length }

  return (
    <Screen title={moduleLabel(s, 'music').title} accent="music" back={back} auraImage={featured?.artwork || undefined}
      right={<GlassButton icon="plus" label={t('addManually')} onClick={() => setManual({ ...base(s.me), title: '', artist: '', likes: [] })} />}
      hero={featured && (
        <button className="music-hero" onClick={() => setOpen(featured)}>
          <Cover track={featured} size={112} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="hero-lbl">{t('latest')} · {t('fromName', { name: s.users[featured.createdBy].name })}</div>
            <div className="mh-title">{featured.title}</div>
            <div className="hero-sub" style={{ marginTop: 2 }}>{featured.artist}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <PlayButton track={featured} />
              <LikeButton track={featured} />
            </div>
          </div>
        </button>
      )}
      head={<>
        <div className="quick lg">
          <span style={{ position: 'relative', zIndex: 2 }}>🔎</span>
          <input value={q} placeholder={t('music.search')} onChange={(e) => onQuery(e.target.value)} enterKeyHint="search"
            onKeyDown={(e) => { if (e.key === 'Enter') submit() }} />
          {q && <button className="plus" onClick={() => { setQ(''); setResults(null) }} aria-label="Clear"><Icon name="close" /></button>}
        </div>
        {!results && (
          <div className="chips">
            <button className={'chip' + (filter === 'all' ? ' on' : '')} onClick={() => setFilter('all')}>{t('all')} · {all.length}</button>
            <button className={'chip' + (filter === 'fav' ? ' on' : '')} onClick={() => setFilter('fav')}>❤️ {t('favorites')}</button>
            {(['a', 'j'] as UserId[]).map((u) => (
              <button key={u} className={'chip' + (filter === u ? ' on' : '')} onClick={() => setFilter(u)}>{s.users[u].emoji} {s.users[u].name} · {counts[u]}</button>
            ))}
          </div>
        )}
      </>}>

      {results && (
        <Section big header={busy ? '…' : t('results')}>
          {results.length === 0 && !busy && <Row title={<span style={{ color: 'var(--label2)' }}>{t('noResults')}</span>} />}
          {results.map((x) => {
            const tr = fromItunes(s.me, x)
            return (
              <Row key={x.trackId} left={<Cover track={tr} size={48} radius={10} />} title={x.trackName} sub={x.artistName}
                right={<div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {x.previewUrl && <button className="chip" style={{ background: 'var(--fill)', boxShadow: 'none' }} onClick={() => player.toggle({ ...tr, id: 'preview-' + x.trackId })}>▶︎</button>}
                  <button className="chip on" onClick={() => share(x)}>{t('share')}</button>
                </div>} />
            )
          })}
        </Section>
      )}

      {!results && list.length === 0 && <Empty emoji="🎧" text={t('empty')} />}
      {!results && list.length > 0 && (
        <div className="track-grid">
          {list.map((x) => (
            <button key={x.id} className="track-card" onClick={() => setOpen(x)}>
              <div className="tc-cover">
                <Cover track={x} />
                <div className="tc-play"><PlayButton track={x} /></div>
              </div>
              <div className="tc-title">{x.title}</div>
              <div className="tc-sub">
                <Avatar who={x.createdBy} />
                <span>{x.artist}</span>
                {x.likes.length > 0 && <span className="tc-likes">❤️{x.likes.length > 1 ? x.likes.length : ''}</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {open && <TrackSheet track={open} onClose={() => setOpen(null)} />}
      {manual && <ManualSheet track={manual} onClose={() => setManual(null)} />}
    </Screen>
  )
}

function LikeButton({ track }: { track: Track }) {
  const s = useApp()
  const live = s.music.find((m) => m.id === track.id) ?? track
  const on = live.likes.includes(s.me)
  return (
    <button className={'play-btn lg on-accent like' + (on ? ' on' : '')} aria-label="Like"
      onClick={(e) => { e.stopPropagation(); update((st) => { const m = st.music.find((x) => x.id === track.id)!; m.likes = on ? m.likes.filter((u) => u !== st.me) : [...m.likes, st.me] }) }}>
      <span>{on ? '❤️' : '🤍'}</span>
    </button>
  )
}

function TrackSheet({ track, onClose }: { track: Track; onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const live = s.music.find((m) => m.id === track.id) ?? track
  const [note, setNote] = useState(live.note ?? '')
  const q = encodeURIComponent(`${live.artist} ${live.title}`)
  const partner = s.users[other(live.createdBy)]
  const links = [
    { name: 'Apple Music', icon: '🍎', url: live.url?.includes('apple.com') ? live.url : `https://music.apple.com/search?term=${q}` },
    { name: 'Spotify', icon: '🟢', url: live.url?.includes('spotify.com') ? live.url : `https://open.spotify.com/search/${q}` },
    { name: 'YouTube Music', icon: '▶️', url: live.url?.includes('youtube.com') || live.url?.includes('youtu.be') ? live.url : `https://music.youtube.com/search?q=${q}` },
  ]
  return (
    <Sheet title={t('nowPlaying')} onClose={onClose}
      onDone={() => update((st) => { const m = st.music.find((x) => x.id === live.id); if (m) m.note = note || undefined })}>
      <div className="track-sheet-head">
        {live.artwork && <div className="ts-bg" style={{ backgroundImage: `url("${live.artwork}")` }} />}
        <Cover track={live} size={220} radius={24} />
        <div className="ts-title">{live.title}</div>
        <div className="ts-artist">{live.artist}{live.album ? ` · ${live.album}` : ''}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 14 }}>
          <PlayButton track={live} big />
          <LikeButton track={live} />
        </div>
      </div>
      <Section header={t('listenOn')}>
        {links.map((l) => (
          <a key={l.name} className="row tap with-icon" href={l.url} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>
            <div className="row-icon">{l.icon}</div>
            <div className="row-main"><div className="row-title">{l.name}</div></div>
            <Icon name="link" style={{ width: 18, height: 18, color: 'var(--label3)' }} />
          </a>
        ))}
      </Section>
      <Section header={t('comment')} footer={`${s.users[live.createdBy].emoji} ${t('fromName', { name: s.users[live.createdBy].name })}${live.likes.includes(other(live.createdBy)) ? ` · ❤️ ${partner.name}` : ''}`}>
        <TextRow value={note} onChange={setNote} placeholder={t('comment')} multiline />
      </Section>
      {live.createdBy === s.me && (
        <Section>
          <button className="row tap destructive" onClick={() => { update((st) => { st.music = st.music.filter((m) => m.id !== live.id) }); onClose() }}>{t('delete')}</button>
        </Section>
      )}
    </Sheet>
  )
}

function ManualSheet({ track, onClose }: { track: Track; onClose: () => void }) {
  const t = useT()
  const [v, setV] = useState(track)
  return (
    <Sheet title={t('addManually')} onClose={onClose} doneDisabled={!v.title.trim()}
      onDone={() => update((st) => { st.music.unshift({ ...v, title: v.title.trim(), artist: v.artist.trim() }) })}>
      <Section>
        <TextRow value={v.title} onChange={(title) => setV({ ...v, title })} placeholder={t('title')} autoFocus />
        <TextRow value={v.artist} onChange={(artist) => setV({ ...v, artist })} placeholder={t('artist')} />
        <TextRow value={v.url ?? ''} onChange={(url) => setV({ ...v, url })} placeholder={`🔗 ${t('link')}`} />
        <TextRow value={v.note ?? ''} onChange={(note) => setV({ ...v, note })} placeholder={t('comment')} multiline />
      </Section>
      <VisibilityFields value={v} onChange={setV} />
    </Sheet>
  )
}
