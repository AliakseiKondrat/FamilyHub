import { useEffect, useState } from 'react'
import { base, update, useApp } from '../store'
import { moduleLabel, useT } from '../i18n'
import { useNav } from '../nav'
import { Row, Section, Sheet, toast } from '../ui'
import { CoverBox, fetchPreview, hostOf, type LinkPreview } from '../cover'
import type { ModuleId } from '../types'
import { addItems } from './Groceries'
import { newTask } from './Tasks'
import { detectService } from './Watch'
import { fromLink, isMusicLink } from './Music'

/** What another app handed us through "Share → Family Hub" (Android), or an icon shortcut's "?open=…". */
export interface Shared { title?: string; text?: string; url?: string }

/** Read and remove the launch parameters from the address, keeping `?demo`. */
export function takeLaunchParams(): { open?: ModuleId; shared?: Shared } {
  const q = new URLSearchParams(location.search)
  const open = q.get('open') as ModuleId | null
  const shared: Shared = { title: q.get('title') ?? undefined, text: q.get('text') ?? undefined, url: q.get('url') ?? undefined }
  const has = !!(shared.title || shared.text || shared.url)
  if (!open && !has) return {}
  for (const k of ['open', 'title', 'text', 'url']) q.delete(k)
  history.replaceState(history.state, '', location.pathname + (q.toString() ? `?${q}` : ''))
  return { open: open ?? undefined, shared: has ? shared : undefined }
}

type Target = 'inbox' | 'music' | 'watch' | 'recipes' | 'groceries' | 'tasks'

/** "Where to save?" for something shared from another app: a link becomes a picture tile wherever it lands. */
export function ShareSheet({ shared, onClose }: { shared: Shared; onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const nav = useNav()
  const [busy, setBusy] = useState(false)
  // Apps put the link in `url` or inside `text` ("Look at this https://…").
  const url = shared.url || shared.text?.match(/https?:\/\/\S+/)?.[0]
  const note = (shared.text ?? '').replace(url ?? '', '').trim()
  const [preview, setPreview] = useState<LinkPreview | null>(null)
  useEffect(() => { if (url) fetchPreview(url).then(setPreview).catch(() => {}) }, [url])
  // A bare link takes the page's own title as soon as it's known.
  const title = (shared.title || note || preview?.title || (url ? hostOf(url) : '')).trim()
  const fromPage = preview ? { cover: preview.image ?? '', site: preview.site } : {}
  const targets: Target[] = url
    ? ['inbox', ...(isMusicLink(url) ? ['music' as const] : []), 'watch', 'recipes']
    : ['inbox', 'groceries', 'tasks']

  const save = async (to: Target) => {
    setBusy(true)
    const me = s.me
    if (to === 'music') {
      const track = await fromLink(me, url!)
      update((st) => { st.music.unshift(track ?? { ...base(me), title, artist: '', url, likes: [] }) })
    } else if (to === 'recipes') {
      const id = base(me)
      update((st) => { st.recipes.unshift({ ...id, title, url, image: preview?.image, tags: [], ingredients: [], someday: false, cooked: 0, notes: note || undefined }) })
      // Tapped before the preview arrived: the photo is filled in when it does.
      if (!preview) fetchPreview(url!).then((p) => update((st) => {
        const r = st.recipes.find((x) => x.id === id.id)
        if (r) { r.image ??= p?.image; if (p?.title && r.title === hostOf(url)) r.title = p.title }
      })).catch(() => {})
    } else if (to === 'watch') {
      const link = detectService(url!)
      // YouTube and custom sites keep their own picture; films get a poster looked up by title.
      const poster = link.service === 'netflix' || link.service === 'appletv' ? undefined : preview?.image
      update((st) => { st.watch.unshift({ ...base(me), title, kind: 'movie', status: 'want', links: [link], poster, notes: note || undefined }) })
    } else if (to === 'groceries') {
      update((st) => addItems(st, [shared.title, shared.text].filter(Boolean).join(', ')))
    } else if (to === 'tasks') {
      update((st) => { st.tasks.unshift(newTask(me, { title })) })
    } else {
      update((st) => { st.notes.unshift({ ...base(me), module: 'inbox', title: title || url!, url, ...(url ? fromPage : {}), notes: url && note && note !== title ? note : undefined }) })
    }
    const l = moduleLabel(s, to)
    toast(`${l.emoji} ${l.title} ✓`)
    onClose()
    nav.open(to)
  }

  return (
    <Sheet title={t('shareTitle')} onClose={onClose}>
      {url && <CoverBox className="cover-hero" style={{ margin: '0 14px 16px' }} src={preview?.image} fallback={<span>🔗</span>} />}
      <Section>
        <Row title={title || url}sub={url ? preview?.site || hostOf(url) : undefined} />
      </Section>
      <Section header={t('shareWhere')}>
        {targets.map((m) => {
          const l = moduleLabel(s, m as ModuleId)
          return <Row key={m} icon={l.emoji} title={l.title} chevron onClick={() => { if (!busy) save(m) }} />
        })}
      </Section>
    </Sheet>
  )
}
