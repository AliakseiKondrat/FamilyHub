import { useState, type CSSProperties } from 'react'
import { base, update, useApp, visible } from '../store'
import { moduleLabel, useT } from '../i18n'
import {
  Avatar, Check, DateRow, Empty, GlassButton, Marks, QuickAdd, RepeatRow, Row, Screen, Section, Segmented, Sheet, Swipe,
  TextRow, VisibilityFields, WhoPicker,
} from '../ui'
import { addDays, fmtDate, nextRepeat, parseQuick, today } from '../lib/date'
import type { Task } from '../types'

/** Completing a repeating task moves it to the next date instead of closing it. */
export function toggleTask(id: string) {
  update((st) => {
    const x = st.tasks.find((k) => k.id === id)!
    if (!x.done && x.repeat !== 'none' && x.due) { x.due = nextRepeat(x.due, x.repeat); return }
    x.done = !x.done
    x.doneAt = x.done ? new Date().toISOString() : undefined
  })
}

export function newTask(me: Task['createdBy'], partial: Partial<Task> = {}): Task {
  return { ...base(me), title: '', assignee: 'both', done: false, repeat: 'none', ...partial }
}

export function TaskRow({ task, onOpen }: { task: Task; onOpen: (t: Task) => void }) {
  const s = useApp()
  const t = useT()
  const d = today()
  const due = task.due
  const dueLabel = due ? (due === d ? t('today') : due === addDays(d, 1) ? t('tomorrow') : due === addDays(d, -1) ? t('yesterday') : fmtDate(due, s.lang)) : null
  return (
    <Swipe onDelete={() => update((st) => { st.tasks = st.tasks.filter((k) => k.id !== task.id) })}>
      <Row
        left={<Check on={task.done} onChange={() => toggleTask(task.id)} />}
        title={<>{task.title} <Marks x={task} /></>}
        dim={task.done}
        sub={(dueLabel || task.repeat !== 'none' || task.notes) && (
          <>
            {dueLabel && <span className={!task.done && due! < d ? 'red' : ''}>{dueLabel}{task.time ? `, ${task.time}` : ''}</span>}
            {task.repeat !== 'none' && <span>🔁</span>}
            {task.notes && <span>📝</span>}
          </>
        )}
        right={<Avatar who={task.assignee} />}
        onClick={() => onOpen(task)}
      />
    </Swipe>
  )
}

export default function Tasks({ back }: { back?: boolean }) {
  const s = useApp()
  const t = useT()
  const [filter, setFilter] = useState<'all' | 'mine' | 'shared'>('all')
  const [showDone, setShowDone] = useState(false)
  const [edit, setEdit] = useState<Task | null>(null)
  const d = today()

  const all = visible(s.tasks, s.me).filter((k) =>
    filter === 'all' ? true : filter === 'mine' ? k.assignee === s.me : k.assignee === 'both')
  const open = all.filter((k) => !k.done)
  const groups: { key: string; title: string; color?: string; items: Task[] }[] = [
    { key: 'overdue', title: t('overdue'), color: 'var(--red)', items: open.filter((k) => k.due && k.due < d) },
    { key: 'today', title: t('today'), color: 'var(--blue)', items: open.filter((k) => k.due === d) },
    { key: 'tomorrow', title: t('tomorrow'), items: open.filter((k) => k.due === addDays(d, 1)) },
    { key: 'later', title: t('later'), items: open.filter((k) => k.due && k.due > addDays(d, 1)) },
    { key: 'nodate', title: t('noDate'), items: open.filter((k) => !k.due) },
  ]
  const sortByDue = (a: Task, b: Task) => ((a.due ?? '') + (a.time ?? '')).localeCompare((b.due ?? '') + (b.time ?? ''))
  const done = all.filter((k) => k.done).sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''))

  const quick = (text: string) => {
    const p = parseQuick(text)
    update((st) => { st.tasks.unshift(newTask(st.me, { title: p.title || text, due: p.due, time: p.time, assignee: filter === 'mine' ? st.me : 'both' })) })
  }

  const { title } = moduleLabel(s, 'tasks')
  return (
    <Screen title={title} back={back} accent="tasks" subtitle={open.length ? `${open.length} ${t('tasksLeft')}` : undefined}
      right={<GlassButton icon="plus" label={t('add')} onClick={() => setEdit(newTask(s.me))} />}
      head={<>
        <Segmented value={filter} onChange={setFilter} options={[
          { value: 'all', label: t('filter.all') }, { value: 'mine', label: t('filter.mine') }, { value: 'shared', label: t('filter.shared') },
        ]} />
        <div style={{ height: 12 }} />
        <QuickAdd placeholder={t('task.placeholder')} onAdd={quick} />
      </>}>

      {open.length === 0 && <Empty emoji="🎉" text={t('empty')} />}

      {groups.map((g) => g.items.length > 0 && (
        <Section key={g.key} big header={<span style={{ color: g.color } as CSSProperties}>{g.title}</span>}>
          {g.items.sort(sortByDue).map((k) => <TaskRow key={k.id} task={k} onOpen={setEdit} />)}
        </Section>
      ))}

      {done.length > 0 && (
        <Section big header={`${t('completed')} · ${done.length}`}
          action={<button onClick={() => setShowDone(!showDone)}>{showDone ? t('hideCompleted') : t('showCompleted')}</button>}>
          {showDone ? done.map((k) => <TaskRow key={k.id} task={k} onOpen={setEdit} />) : <></>}
        </Section>
      )}

      {edit && <TaskEditor task={edit} onClose={() => setEdit(null)} />}
    </Screen>
  )
}

export function TaskEditor({ task, onClose }: { task: Task; onClose: () => void }) {
  const t = useT()
  const [v, setV] = useState(task)
  const isNew = !useApp().tasks.some((k) => k.id === task.id)
  const save = () => update((st) => {
    if (isNew) st.tasks.unshift(v)
    else st.tasks = st.tasks.map((k) => (k.id === v.id ? v : k))
  })
  return (
    <Sheet title={isNew ? t('add') : t('edit')} onClose={onClose} onDone={save} doneDisabled={!v.title.trim()}>
      <Section>
        <TextRow value={v.title} onChange={(title) => setV({ ...v, title })} placeholder={t('title')} autoFocus={isNew} />
        <TextRow value={v.notes ?? ''} onChange={(notes) => setV({ ...v, notes })} placeholder={t('notes')} multiline />
      </Section>
      <Section>
        <DateRow label={`📅 ${t('date')}`} value={v.due} onChange={(due) => setV({ ...v, due, time: due ? v.time : undefined })} />
        {v.due && <DateRow label={`⏰ ${t('time')}`} type="time" value={v.time} onChange={(time) => setV({ ...v, time })} />}
        <RepeatRow value={v.repeat} onChange={(repeat) => setV({ ...v, repeat })} />
      </Section>
      <div className="section-header" style={{ padding: '0 32px 7px' }}>{t('assignee')}</div>
      <div style={{ margin: '0 16px 10px' }}><WhoPicker value={v.assignee} onChange={(assignee) => setV({ ...v, assignee })} /></div>
      <VisibilityFields value={v} onChange={setV} allowPrivate />
      {!isNew && (
        <Section>
          <button className="row tap destructive" onClick={() => { update((st) => { st.tasks = st.tasks.filter((k) => k.id !== v.id) }); onClose() }}>{t('delete')}</button>
        </Section>
      )}
    </Sheet>
  )
}
