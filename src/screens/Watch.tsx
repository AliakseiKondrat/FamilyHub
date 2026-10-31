import { useState } from 'react'
import { base, update, useApp, visible } from '../store'
import { moduleLabel, useT } from '../i18n'
import { Empty, GlassButton, Marks, Row, Screen, Section, Segmented, Sheet, Stars, Swipe, TextRow, VisibilityFields } from '../ui'
import type { UserId, WatchItem, WatchStatus } from '../types'

const KIND_EMOJI = { movie: '🎬', series: '📺', other: '🎞️' }

export default function Watch() {
  const s = useApp()
  const t = useT()
  const [tab, setTab] = useState<WatchStatus>('want')
  const [edit, setEdit] = useState<WatchItem | null>(null)
  const [pick, setPick] = useState<WatchItem | null>(null)
  const list = visible(s.watch, s.me).filter((w) => w.status === tab)

  const random = () => {
    const pool = visible(s.watch, s.me).filter((w) => w.status === 'want')
    if (pool.length) setPick(pool[Math.floor(Math.random() * pool.length)])
  }

  return (
    <Screen title={moduleLabel(s, 'watch').title} back accent="watch"
      right={<GlassButton icon="plus" label={t('add')} onClick={() => setEdit({ ...base(s.me), title: '', kind: 'movie', status: tab })} />}
      actions={[{ icon: '🎲', label: t('whatToWatch'), onClick: random }]}
      head={<Segmented value={tab} onChange={setTab} options={(['want', 'watching', 'done'] as WatchStatus[]).map((x) => ({ value: x, label: t(`ws.${x}`) }))} />}>
      {list.length === 0 && <Empty emoji="🍿" text={t('empty')} />}
      {list.length > 0 && (
        <Section>
          {list.map((w) => (
            <Swipe key={w.id} onDelete={() => update((st) => { st.watch = st.watch.filter((x) => x.id !== w.id) })}>
              <Row icon={KIND_EMOJI[w.kind]} title={<>{w.title} <Marks x={w} /></>} onClick={() => setEdit(w)} chevron
                sub={w.status === 'done' && w.rating
                  ? (['a', 'j'] as UserId[]).filter((u) => w.rating?.[u]).map((u) => <span key={u}>{s.users[u].emoji} {'★'.repeat(w.rating![u]!)}</span>)
                  : t(`wk.${w.kind}`)} />
            </Swipe>
          ))}
        </Section>
      )}

      {pick && (
        <Sheet title={t('randomPick')} onClose={() => setPick(null)}>
          <Empty emoji={KIND_EMOJI[pick.kind]} text={<b style={{ fontSize: 24, color: 'var(--label)' }}>{pick.title}</b>} />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="glass-btn" onClick={random}>🎲 {t('random')}</button>
            <button className="glass-btn tint" onClick={() => { update((st) => { st.watch.find((x) => x.id === pick.id)!.status = 'watching' }); setPick(null) }}>▶︎ {t('ws.watching')}</button>
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
  const [v, setV] = useState(item)
  const isNew = !s.watch.some((w) => w.id === item.id)
  return (
    <Sheet title={isNew ? t('add') : v.title} onClose={onClose} doneDisabled={!v.title.trim()}
      onDone={() => update((st) => { if (isNew) st.watch.unshift(v); else st.watch = st.watch.map((w) => (w.id === v.id ? v : w)) })}>
      <Section>
        <TextRow value={v.title} onChange={(title) => setV({ ...v, title })} placeholder={t('title')} autoFocus={isNew} />
        <TextRow value={v.url ?? ''} onChange={(url) => setV({ ...v, url })} placeholder={`🔗 ${t('link')}`} />
      </Section>
      <div style={{ margin: '0 16px' }}>
        <Segmented inSheet value={v.kind} onChange={(kind) => setV({ ...v, kind })}
          options={(['movie', 'series', 'other'] as const).map((k) => ({ value: k, label: `${KIND_EMOJI[k]} ${t(`wk.${k}`)}` }))} />
        <Segmented inSheet value={v.status} onChange={(status) => setV({ ...v, status })}
          options={(['want', 'watching', 'done'] as WatchStatus[]).map((x) => ({ value: x, label: t(`ws.${x}`) }))} />
      </div>
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
      {v.url && <Section><a className="row tap accent" href={v.url} target="_blank" rel="noreferrer">{t('open_link')}</a></Section>}
      <VisibilityFields value={v} onChange={setV} />
    </Sheet>
  )
}
