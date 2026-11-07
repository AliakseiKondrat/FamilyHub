import { useState } from 'react'
import { base, uid, update, useApp, visible } from '../store'
import { moduleLabel, useT, type TKey } from '../i18n'
import { Check, Empty, GlassButton, Row, Screen, Section, Sheet, TextRow, VisibilityFields, haptic, toast } from '../ui'
import type { ListItem, Note } from '../types'

/*
 * Lists: your own lists about anything — books, places to go, gifts for friends, what to pack. Each list has items
 * to tick off, a quick «add several at once», a progress count and a dice for «pick one for us». Lists are notes
 * with module 'lists', so they sync, search and stay private like any other note.
 */

const TEMPLATES = ['books', 'travel', 'gifts', 'pack', 'films', 'dreams'] as const
const TEMPLATE_EMOJI: Record<(typeof TEMPLATES)[number], string> = { books: '📚', travel: '🗺️', gifts: '🎁', pack: '🧳', films: '🎬', dreams: '🌠' }

const progressOf = (n: Note) => ({ done: (n.items ?? []).filter((i) => i.done).length, all: (n.items ?? []).length })

export default function Lists({ back }: { back?: boolean }) {
  const s = useApp()
  const t = useT()
  const [open, setOpen] = useState<Note | null>(null)
  const lists = visible(s.notes, s.me).filter((n) => n.module === 'lists')
  const create = (title: string, emoji?: string) => {
    const n: Note = { ...base(s.me), module: 'lists', title, emoji, items: [] }
    update((st) => { st.notes.unshift(n) })
    setOpen(n)
  }
  return (
    <Screen title={moduleLabel(s, 'lists').title} back={back} accent="lists"
      right={<GlassButton icon="plus" label={t('add')} onClick={() => setOpen({ ...base(s.me), module: 'lists', title: '', items: [] })} />}>
      {lists.length === 0 && <Empty emoji="📝" text={t('ls.empty')} />}
      {lists.length > 0 && (
        <Section>
          {lists.map((n) => {
            const p = progressOf(n)
            return (
              <Row key={n.id} icon={n.emoji ?? '📝'} title={n.title} chevron onClick={() => setOpen(n)}
                sub={<>
                  <span>{p.all ? t('ls.progress', { done: p.done, all: p.all }) : t('ls.noItems')}</span>
                  {p.all > 0 && <span className="col-bar" style={{ margin: '6px 0 0' }}><i style={{ width: `${(p.done / p.all) * 100}%` }} /></span>}
                </>} />
            )
          })}
        </Section>
      )}
      <Section header={t('ls.ideas')} footer={t('ls.ideasHint')}>
        <div className="chips-wrap">
          {TEMPLATES.map((k) => (
            <button key={k} className="chip" onClick={() => create(t(`ls.tpl.${k}` as TKey), TEMPLATE_EMOJI[k])}>{TEMPLATE_EMOJI[k]} {t(`ls.tpl.${k}` as TKey)}</button>
          ))}
        </div>
      </Section>
      {open && <ListSheet list={open} onClose={() => setOpen(null)} />}
    </Screen>
  )
}

function ListSheet({ list, onClose }: { list: Note; onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const live = s.notes.find((n) => n.id === list.id)
  const isNew = !live
  const [title, setTitle] = useState(list.title)
  const [emoji, setEmoji] = useState(list.emoji ?? '')
  const [draft, setDraft] = useState('')
  const [vis, setVis] = useState<Note>(live ?? list)
  const items = live?.items ?? []
  const p = progressOf(live ?? list)

  // Changes to items apply right away (both of you see them live); title and visibility on «Done».
  const save = (fn: (n: Note) => void) => update((st) => {
    let n = st.notes.find((x) => x.id === list.id)
    if (!n) { n = { ...list, title: title.trim() || t('ls.untitled'), emoji: emoji || undefined, items: [] }; st.notes.unshift(n) }
    fn(n)
  })
  const add = () => {
    const parts = draft.split(',').map((x) => x.trim()).filter(Boolean)
    if (!parts.length) return
    save((n) => { n.items = [...(n.items ?? []), ...parts.map((text): ListItem => ({ id: uid(), text, by: s.me }))] })
    setDraft('')
    haptic()
  }
  const random = () => {
    const pool = items.filter((i) => !i.done)
    if (!pool.length) return
    const x = pool[Math.floor(Math.random() * pool.length)]
    toast(`🎲 ${x.text}`)
    haptic()
  }
  return (
    <Sheet title={isNew ? t('ls.new') : `${emoji || '📝'} ${title}`} onClose={onClose} doneDisabled={!title.trim()}
      onDone={() => save((n) => { n.title = title.trim(); n.emoji = emoji.trim() || undefined; n.privateTo = vis.privateTo; n.surpriseFor = vis.surpriseFor; n.revealAt = vis.revealAt })}>
      <Section>
        <div className="row">
          <input className="ls-emoji" value={emoji} onChange={(e) => setEmoji([...e.target.value].slice(-2).join(''))} placeholder="📝" aria-label="emoji" />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('ls.title')} autoFocus={isNew} />
        </div>
      </Section>
      <Section header={p.all ? t('ls.progress', { done: p.done, all: p.all }) : t('ls.items')}
        action={items.some((i) => !i.done) ? <button onClick={random}>🎲 {t('ls.random')}</button> : undefined}>
        {items.map((i) => (
          <Row key={i.id} left={<Check on={!!i.done} onChange={() => save((n) => { const x = n.items!.find((y) => y.id === i.id)!; x.done = !x.done })} />}
            title={i.text} dim={i.done}
            right={<button className="ls-del" aria-label={t('delete')} onClick={(e) => { e.stopPropagation(); save((n) => { n.items = n.items!.filter((y) => y.id !== i.id) }) }}>×</button>}
            onClick={() => save((n) => { const x = n.items!.find((y) => y.id === i.id)!; x.done = !x.done })} />
        ))}
        <div className="row">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t('ls.addItems')} enterKeyHint="done"
            onKeyDown={(e) => { if (e.key === 'Enter') add() }} />
          <button className="chip" onClick={add} disabled={!draft.trim()}>＋</button>
        </div>
        {items.some((i) => i.done) && (
          <button className="row tap" onClick={() => save((n) => { n.items = n.items!.filter((y) => !y.done) })}>🧹 {t('ls.clearDone')}</button>
        )}
      </Section>
      <VisibilityFields value={vis} onChange={setVis} allowPrivate />
      {!isNew && (
        <Section>
          <button className="row tap destructive" onClick={() => { update((st) => { st.notes = st.notes.filter((n) => n.id !== list.id) }); onClose() }}>{t('ls.delete')}</button>
        </Section>
      )}
      <Section><TextRow value={live?.notes ?? ''} onChange={(notes) => save((n) => { n.notes = notes || undefined })} placeholder={t('notes')} multiline /></Section>
    </Sheet>
  )
}
