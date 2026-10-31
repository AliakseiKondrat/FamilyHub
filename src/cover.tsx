import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { supabase } from './lib/supabase'
import { API_BASE } from './lib/widget'
import { compress, getBlob, putBlob } from './lib/photos'
import { useApp } from './store'
import { useT } from './i18n'
import { haptic, toast } from './ui'

// A saved link is shown as a picture with a caption, not as a bare URL. The picture comes from the
// page itself (og:image, read on our server) or is the family's own photo, stored as "photo:<blob key>".

export interface LinkPreview { title?: string; image?: string; site?: string }

export const isUrl = (s?: string) => !!s && /^https?:\/\/[^\s/]+\.[^\s]+$/.test(s.trim())
export const hostOf = (url?: string) => { try { return new URL(url!).hostname.replace(/^www\./, '') } catch { return '' } }

const cache = new Map<string, Promise<LinkPreview | null>>()
/** Title, picture and site name for a link (signed-in only; the public route covers music and video links). */
export function fetchPreview(url: string): Promise<LinkPreview | null> {
  url = url.trim()
  if (!cache.has(url)) cache.set(url, (async () => {
    const token = (await supabase?.auth.getSession())?.data.session?.access_token
    const r = token
      ? await fetch(`${API_BASE}/preview?url=${encodeURIComponent(url)}`, { headers: { Authorization: `Bearer ${token}` } }).then((x) => x.json()).catch(() => null)
      : await fetch(`${API_BASE}/meta?url=${encodeURIComponent(url)}`).then((x) => x.json()).catch(() => null)
    if (!r || r.error) return null
    return { title: r.title || undefined, image: r.image || r.artwork || undefined, site: r.site || r.service || undefined }
  })())
  return cache.get(url)!
}

/** An image URL for a cover: web pictures as they are, our own photos from the photo store. */
export function useCoverUrl(src?: string) {
  const own = src?.startsWith('photo:') ? src : undefined
  const [blobUrl, setBlobUrl] = useState<string>()
  useEffect(() => {
    if (!own) return
    let alive = true, u: string | undefined
    getBlob(own.slice(6).split('?')[0]).then((b) => { if (b && alive) { u = URL.createObjectURL(b); setBlobUrl(u) } }).catch(() => {})
    return () => { alive = false; if (u) URL.revokeObjectURL(u) }
  }, [own])
  return own ? blobUrl : src || undefined
}

/** A box with the cover as its background (or the fallback inside when there is none). */
export function CoverBox({ src, className, style, children, fallback }: {
  src?: string; className?: string; style?: CSSProperties; children?: ReactNode; fallback?: ReactNode
}) {
  const url = useCoverUrl(src)
  return (
    <div className={className} style={{ ...style, ...(url ? { backgroundImage: `url("${url}")` } : {}) }}>
      {!url && fallback}{children}
    </div>
  )
}

/** Small square picture at the start of a list row. */
export const Thumb = ({ src, emoji }: { src?: string; emoji?: string }) => <CoverBox className="thumb" src={src} fallback={emoji} />

/**
 * Fill in pictures for saved links that have never been looked up (added from the inbox, by Siri, in Telegram import…).
 * `cover === undefined` means "not looked up yet"; '' means "none" (also when someone removed it on purpose).
 */
export function useAutoCovers<T extends { id: string; url?: string; cover?: string }>(items: T[], apply: (id: string, p: LinkPreview) => void) {
  const on = useApp().prefs.linkPreviews
  const busy = useRef(new Set<string>())
  useEffect(() => {
    if (!on) return
    items.filter((x) => x.cover === undefined && isUrl(x.url) && !busy.current.has(x.id)).slice(0, 6).forEach(async (x) => {
      busy.current.add(x.id)
      const p = await fetchPreview(x.url!).catch(() => null)
      apply(x.id, p ?? {})
    })
  })
}

/** Patch for an item from a fetched preview: the picture, and a caption when there is none yet. */
export function fromPreview(x: { title?: string; url?: string }, p: LinkPreview) {
  const bare = !x.title?.trim() || x.title.trim() === x.url?.trim()
  return { cover: p.image ?? '', site: p.site, ...(bare && p.title ? { title: p.title } : {}) }
}

/** A changed link drops the picture taken from the old one (so the new one is looked up); own photos stay. */
export const relink = (x: { url?: string; cover?: string }, url: string) =>
  url.trim() !== (x.url ?? '').trim() && !x.cover?.startsWith('photo:') ? { cover: undefined, site: undefined } : {}

/**
 * Picture editor for anything with a link: shows the cover, fetches it from the link as soon as one is pasted,
 * and lets you pick your own photo or remove the picture. The caption is the item's own title field.
 */
export function CoverPicker({ id, url, cover, title, onChange, auto = true, emoji = '🔗', tall, compact }: {
  id: string; url?: string; cover?: string; title?: string; emoji?: string; auto?: boolean; tall?: boolean; compact?: boolean
  onChange: (patch: { cover?: string; title?: string; site?: string }) => void
}) {
  const t = useT()
  const s = useApp()
  const [busy, setBusy] = useState(false)
  const latest = useRef({ cover, title, url, onChange })
  latest.current = { cover, title, url, onChange }
  const load = async (force: boolean) => {
    const u = latest.current.url
    if (!isUrl(u)) return
    setBusy(true)
    const p = await fetchPreview(u!).catch(() => null)
    setBusy(false)
    if (latest.current.url !== u) return
    if (!p?.image && !p?.title) { if (force) toast(t('noPreview')); else latest.current.onChange({ cover: '' }); return }
    const patch = fromPreview(latest.current, p)
    if (!force && latest.current.cover) delete (patch as { cover?: string }).cover
    latest.current.onChange(patch)
    haptic()
  }
  // A freshly pasted link fetches its picture after a short pause; an existing picture is never replaced by itself.
  useEffect(() => {
    if (!auto || !s.prefs.linkPreviews || cover !== undefined || !isUrl(url)) return
    const h = setTimeout(() => load(false), 600)
    return () => clearTimeout(h)
  }, [url]) // eslint-disable-line react-hooks/exhaustive-deps

  const pickPhoto = async (file?: File) => {
    if (!file) return
    setBusy(true)
    try {
      const { blob } = await compress(file, 1200)
      await putBlob(`${id}:cover`, blob)
      onChange({ cover: `photo:${id}:cover?${Date.now()}` })
      haptic()
    } catch { toast(t('photoFail')) }
    setBusy(false)
  }
  return (
    <div className="cover-pick">
      {!compact && <CoverBox className={'cover-hero' + (tall ? ' tall' : '') + (busy ? ' busy' : '')} src={cover} fallback={<span>{busy ? '⏳' : emoji}</span>} />}
      <div className="chips cover-actions">
        <label className="chip">📷 {t('ownPhoto')}<input type="file" accept="image/*" hidden onChange={(e) => pickPhoto(e.target.files?.[0])} /></label>
        {isUrl(url) && <button className="chip" onClick={() => load(true)} disabled={busy}>🔄 {t('fromLink')}</button>}
        {cover && <button className="chip" onClick={() => onChange({ cover: '' })}>✕ {t('noPicture')}</button>}
      </div>
    </div>
  )
}
