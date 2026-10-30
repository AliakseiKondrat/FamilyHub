import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { base, update, useApp, visible } from '../store'
import { moduleLabel, useT } from '../i18n'
import { Empty, GlassButton, Icon, Screen } from '../ui'
import { compress, deleteBlob, getBlob, putBlob } from '../lib/photos'
import { ALBUMS } from '../lib/categories'
import { fmtDate } from '../lib/date'
import type { Photo } from '../types'

/** Object URL for a stored blob, revoked on unmount. */
function useBlobUrl(key: string) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    let u: string | undefined
    let alive = true
    getBlob(key).then((b) => { if (b && alive) { u = URL.createObjectURL(b); setUrl(u) } }).catch(() => {})
    return () => { alive = false; if (u) URL.revokeObjectURL(u) }
  }, [key])
  return url
}

export function PhotoThumb({ photo, onClick }: { photo: Photo; onClick: () => void }) {
  const url = useBlobUrl(photo.id + ':thumb')
  return <button className="photo" onClick={onClick}>{url && <img src={url} alt={photo.caption ?? ''} loading="lazy" />}</button>
}

export default function Photos() {
  const s = useApp()
  const t = useT()
  const [album, setAlbum] = useState<string>('all')
  const [busy, setBusy] = useState(0)
  const [open, setOpen] = useState<number | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const photos = visible(s.photos, s.me).filter((p) => album === 'all' || p.album === album)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  // The iOS picker hands over already-converted JPEGs; we keep a 2048px copy and a 400px thumbnail.
  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const list = [...files]
    setBusy(list.length)
    for (const f of list) {
      try {
        const meta = { ...base(s.me), album: album === 'all' ? 'us' : album }
        const full = await compress(f, 2048)
        const thumb = await compress(f, 400, 0.75)
        await putBlob(meta.id + ':full', full.blob)
        await putBlob(meta.id + ':thumb', thumb.blob)
        update((st) => { st.photos.push({ ...meta, width: full.width, height: full.height }) })
      } catch { /* unreadable file: skip it */ }
      setBusy((n) => n - 1)
    }
    if (input.current) input.current.value = ''
  }

  return (
    <Screen title={moduleLabel(s, 'photos').title} back
      subtitle={busy ? t('uploading') + ` (${busy})` : `${photos.length} 📷`}
      right={<GlassButton icon="plus" label={t('addPhotos')} onClick={() => input.current?.click()} />}>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      <div className="chips">
        <button className={'chip' + (album === 'all' ? ' on' : '')} onClick={() => setAlbum('all')}>{t('all')}</button>
        {ALBUMS.map((a) => <button key={a} className={'chip' + (album === a ? ' on' : '')} onClick={() => setAlbum(a)}>{t(`alb.${a}`)}</button>)}
      </div>
      {photos.length === 0
        ? <button style={{ border: 0, background: 'none', width: '100%' }} onClick={() => input.current?.click()}><Empty emoji="📸" text={t('noPhotos')} /></button>
        : <div className="photos">{photos.map((p, i) => <PhotoThumb key={p.id} photo={p} onClick={() => setOpen(i)} />)}</div>}
      <div className="section-footer" style={{ textAlign: 'center' }}>{t('photoHint')}</div>
      {open != null && photos[open] && <Viewer photos={photos} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </Screen>
  )
}

function Viewer({ photos, index, onIndex, onClose }: { photos: Photo[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const p = photos[index]
  const url = useBlobUrl(p.id + ':full')
  const startX = useRef<number | null>(null)
  const go = (d: number) => { const n = index + d; if (n >= 0 && n < photos.length) onIndex(n) }
  return createPortal(
    <div className="viewer"
      onPointerDown={(e) => { startX.current = e.clientX }}
      onPointerUp={(e) => { if (startX.current != null) { const dx = e.clientX - startX.current; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1) } startX.current = null }}>
      <div className="viewer-bar">
        <button className="glass-btn" onClick={onClose}><Icon name="close" /></button>
        <select className="glass-btn" value={p.album} onChange={(e) => update((st) => { st.photos.find((x) => x.id === p.id)!.album = e.target.value })}>
          {ALBUMS.map((a) => <option key={a} value={a}>{t(`alb.${a}`)}</option>)}
        </select>
      </div>
      {url && <img src={url} alt="" />}
      <div className="viewer-bar bottom">
        <span style={{ fontSize: 15 }}>{s.users[p.createdBy].emoji} {fmtDate(p.createdAt.slice(0, 10), s.lang, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        <button className="glass-btn" aria-label={t('delete')} onClick={() => {
          update((st) => { st.photos = st.photos.filter((x) => x.id !== p.id) })
          deleteBlob(p.id + ':full'); deleteBlob(p.id + ':thumb')
          if (photos.length <= 1) onClose(); else if (index >= photos.length - 1) onIndex(index - 1)
        }}><Icon name="trash" /></button>
      </div>
    </div>,
    document.body,
  )
}
