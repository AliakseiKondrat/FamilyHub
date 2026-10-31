import { useState } from 'react'
import { base, update, useApp, visible } from '../store'
import { moduleLabel, useT } from '../i18n'
import {
  Check, DateRow, Empty, GlassButton, Marks, QuickAdd, RepeatRow, Row, Screen, Section, Segmented, Sheet, Swipe, TextRow,
  VisibilityFields, toast,
} from '../ui'
import { fmtDate, nextRepeat, today } from '../lib/date'
import { guessCategory } from '../lib/categories'
import type { ModuleId, Note, NoteModule, State } from '../types'
import { newTask } from './Tasks'

const ICON: Record<NoteModule, string> = { home: '🏠', inbox: '📥', archive: '🗂️', dates: '💕' }

/** Home, Inbox, Archive and Dates share one list screen with small per-module twists. */
export default function Notes({ module, back }: { module: NoteModule; back?: boolean }) {
  const s = useApp()
  const t = useT()
  const [edit, setEdit] = useState<Note | null>(null)
  const [been, setBeen] = useState(false)
  const [pick, setPick] = useState<Note | null>(null)
  const all = visible(s.notes, s.me).filter((n) => n.module === module)
  const list = module === 'dates' ? all.filter((n) => !!n.done === been) : all
  const reminders = module === 'home' ? list.filter((n) => n.due).sort((a, b) => a.due!.localeCompare(b.due!)) : []
  const rest = list.filter((n) => !reminders.includes(n))

  const toggle = (n: Note) => update((st) => {
    const x = st.notes.find((k) => k.id === n.id)!
    if (!x.done && x.due && x.repeat && x.repeat !== 'none') { x.due = nextRepeat(x.due, x.repeat); return }
    x.done = !x.done
  })
  const random = () => {
    const pool = all.filter((n) => !n.done)
    if (pool.length) setPick(pool[Math.floor(Math.random() * pool.length)])
  }

  const row = (n: Note) => (
    <Swipe key={n.id} onDelete={() => update((st) => { st.notes = st.notes.filter((k) => k.id !== n.id) })}>
      <Row
        left={module === 'home' && n.due ? <Check on={!!n.done} onChange={() => toggle(n)} /> : undefined}
        icon={module === 'home' && n.due ? undefined : n.url ? '🔗' : ICON[module]}
        title={<>{n.title} <Marks x={n} /></>} dim={module === 'home' && n.done}
        sub={(n.due || n.tags?.length || n.notes) && <>
          {n.due && <span className={!n.done && n.due < today() ? 'red' : ''}>{fmtDate(n.due, s.lang)}{n.repeat && n.repeat !== 'none' ? ' 🔁' : ''}</span>}
          {n.tags?.map((x) => <span key={x} className="tag">{x}</span>)}
          {!n.due && n.notes && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{n.notes}</span>}
        </>}
        chevron onClick={() => setEdit(n)} />
    </Swipe>
  )

  return (
    <Screen title={moduleLabel(s, module as ModuleId).title} back={back} accent={module}
      right={<GlassButton icon="plus" label={t('add')} onClick={() => setEdit({ ...base(s.me), module, title: '' })} />}
      actions={module === 'dates' ? [{ icon: '🎲', label: t('randomIdea'), onClick: random }] : undefined}
      head={<>
        {module === 'inbox' && <QuickAdd placeholder={t('add') + '…'} onAdd={(title) => update((st) => {
          const url = title.match(/https?:\/\/\S+/)?.[0]
          st.notes.unshift({ ...base(st.me), module, title: url ? title.replace(url, '').trim() || url : title, url })
        })} />}
        {module === 'dates' && <Segmented value={been ? 'been' : 'ideas'} onChange={(x) => setBeen(x === 'been')}
          options={[{ value: 'ideas', label: `💡 ${t('ideas')}` }, { value: 'been', label: `✓ ${t('been')}` }]} />}
      </>}>

      {list.length === 0 && <Empty emoji={ICON[module]} text={t('empty')} />}
      {reminders.length > 0 && <Section big header={`⏰ ${t('upcoming')}`}>{reminders.map(row)}</Section>}
      {rest.length > 0 && <Section>{rest.map(row)}</Section>}

      {pick && (
        <Sheet title={t('randomPick')} onClose={() => setPick(null)}>
          <Empty emoji="💕" text={<b style={{ fontSize: 24, color: 'var(--label)' }}>{pick.title}</b>} />
          <div style={{ display: 'flex', justifyContent: 'center' }}><button className="glass-btn" onClick={random}>🎲 {t('random')}</button></div>
        </Sheet>
      )}
      {edit && <NoteEditor note={edit} onClose={() => setEdit(null)} />}
    </Screen>
  )
}

const MOVE_TARGETS = ['tasks', 'groceries', 'watch', 'recipes', 'dates', 'home', 'archive'] as const

function moveNote(st: State, n: Note, target: (typeof MOVE_TARGETS)[number]) {
  st.notes = st.notes.filter((k) => k.id !== n.id)
  const b = { ...base(st.me), createdBy: n.createdBy, surpriseFor: n.surpriseFor, revealAt: n.revealAt, privateTo: n.privateTo }
  switch (target) {
    case 'tasks': st.tasks.unshift({ ...newTask(st.me), ...b, title: n.title, notes: [n.notes, n.url].filter(Boolean).join('\n') || undefined }); break
    case 'groceries': st.groceries.unshift({ ...b, title: n.title, category: guessCategory(n.title), done: false }); break
    case 'watch': st.watch.unshift({ ...b, title: n.title, kind: 'movie', status: 'want', url: n.url, notes: n.notes }); break
    case 'recipes': st.recipes.unshift({ ...b, title: n.title, url: n.url, notes: n.notes, tags: [], ingredients: [], someday: true, cooked: 0 }); break
    default: st.notes.unshift({ ...n, module: target })
  }
}

function NoteEditor({ note, onClose }: { note: Note; onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const [v, setV] = useState(note)
  const [tags, setTags] = useState((note.tags ?? []).join(', '))
  const isNew = !s.notes.some((n) => n.id === note.id)
  const collect = (): Note => ({ ...v, tags: tags.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean) })
  const save = () => update((st) => {
    const x = collect()
    if (isNew) st.notes.unshift(x)
    else st.notes = st.notes.map((n) => (n.id === x.id ? x : n))
  })
  return (
    <Sheet title={isNew ? t('add') : v.title} onClose={onClose} onDone={save} doneDisabled={!v.title.trim()}>
      <Section>
        <TextRow value={v.title} onChange={(title) => setV({ ...v, title })} placeholder={t('title')} autoFocus={isNew} />
        <TextRow value={v.url ?? ''} onChange={(url) => setV({ ...v, url })} placeholder={`🔗 ${t('link')}`} />
        {(v.module === 'dates' || v.module === 'archive') && <TextRow value={tags} onChange={setTags} placeholder={`# ${t('tags')}`} />}
        <TextRow value={v.notes ?? ''} onChange={(notes) => setV({ ...v, notes })} placeholder={t('notes')} multiline />
      </Section>
      {v.module === 'home' && (
        <Section>
          <DateRow label={`⏰ ${t('date')}`} value={v.due} onChange={(due) => setV({ ...v, due })} />
          {v.due && <RepeatRow value={v.repeat ?? 'none'} onChange={(repeat) => setV({ ...v, repeat })} />}
        </Section>
      )}
      {v.module === 'dates' && (
        <Section><Row left={<Check on={!!v.done} onChange={() => setV({ ...v, done: !v.done })} color="var(--pink)" />} title={t('been')} /></Section>
      )}
      {v.url && <Section><a className="row tap accent" href={v.url} target="_blank" rel="noreferrer">🔗 {t('open_link')}</a></Section>}
      <VisibilityFields value={v} onChange={setV} allowPrivate={v.module === 'archive' || v.module === 'inbox' || v.module === 'home'} />
      {!isNew && (
        <Section header={t('moveTo')}>
          {MOVE_TARGETS.filter((m) => m !== v.module).map((m) => {
            const l = moduleLabel(s, m)
            return <Row key={m} icon={l.emoji} title={l.title} chevron onClick={() => {
              update((st) => moveNote(st, collect(), m))
              toast(`${l.emoji} ${l.title} ✓`)
              onClose()
            }} />
          })}
        </Section>
      )}
    </Sheet>
  )
}
