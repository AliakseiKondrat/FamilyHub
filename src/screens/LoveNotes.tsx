import { useEffect, useState } from 'react'
import { base, other, update, useApp, visible } from '../store'
import { useT } from '../i18n'
import { useNav } from '../nav'
import { Row, Section, Segmented, Sheet, TextRow, haptic, toast } from '../ui'
import { fmtDate, toISO } from '../lib/date'
import { award, unaward } from '../lib/game'
import { itemName } from '../lib/catalog'
import { activeCard, itemsOf, statusOf } from '../lib/unlocks'
import { Postcard, openCollection } from './Collection'
import type { LoveNote, State } from '../types'

/*
 * Surprise love notes: written on a postcard, delivered now, at a set time or at a random moment in the next
 * day or two. Until then only the author sees it (and can take it back); the partner gets a push and opens it here.
 */

export const MAX_NOTE = 300
const nowIso = () => new Date().toISOString()

/** Notes as each of us sees them right now. */
export function notesOf(s: State) {
  const now = nowIso()
  const all = visible(s.loveNotes, s.me)
  const delivered = all.filter((n) => n.deliverAt <= now)
  return {
    unread: delivered.filter((n) => n.to === s.me && !n.seenAt),
    pending: all.filter((n) => n.createdBy === s.me && n.deliverAt > now).sort((a, b) => a.deliverAt.localeCompare(b.deliverAt)),
    history: delivered.sort((a, b) => b.deliverAt.localeCompare(a.deliverAt)),
  }
}

/** A moment in the next day or two, but never at night (9:00–21:00 local). */
function randomMoment() {
  const d = new Date(Date.now() + (3 + Math.random() * 33) * 3600000)
  const h = d.getHours()
  if (h < 9) d.setHours(9 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60))
  else if (h >= 21) { d.setDate(d.getDate() + 1); d.setHours(9 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60)) }
  return d
}
const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

/* ---------- writing ---------- */
export function NoteComposer({ onClose }: { onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const nav = useNav()
  const partner = s.users[other(s.me)].name
  const [text, setText] = useState('')
  const [card, setCard] = useState(activeCard(s))
  const [mode, setMode] = useState<LoveNote['mode']>('random')
  const [at, setAt] = useState(() => localInput(new Date(Date.now() + 3 * 3600000)))
  const save = () => {
    const when = mode === 'now' ? new Date() : mode === 'time' ? new Date(at) : randomMoment()
    const deliver = when.getTime() < Date.now() ? new Date() : when
    update((st) => {
      const to = other(st.me)
      const n: LoveNote = { ...base(st.me), text: text.trim().slice(0, MAX_NOTE), card, to, mode, deliverAt: deliver.toISOString(), surpriseFor: to, revealAt: toISO(deliver) }
      st.loveNotes = [n, ...st.loveNotes]
      award(st, 'note', n.id)
    })
    toast(mode === 'now' ? t('note.sent') : t('note.scheduled'))
  }
  const hint = mode === 'random' ? 'note.randomHint' : mode === 'now' ? 'note.nowHint' : 'note.timeHint'
  return (
    <Sheet title={`💌 ${t('note.title')}`} onClose={onClose} onDone={save} doneDisabled={!text.trim()}>
      <div style={{ margin: '0 16px 14px' }}><Postcard id={card} text={text.trim() || t('note.placeholder')} /></div>
      <Section header={t('note.card')}>
        <div className="note-cards">
          {itemsOf('card').map((c) => {
            const open = statusOf(c.id, s).open
            return (
              <button key={c.id} className={'note-card-pick' + (card === c.id ? ' on' : '')} title={itemName(c, s.lang)}
                onClick={() => (open ? setCard(c.id) : openCollection(nav, 'card'))}>
                <Postcard id={c.id} text="" small />{!open && <span className="col-lock">🔒</span>}
              </button>
            )
          })}
        </div>
      </Section>
      <Section footer={t('note.count', { n: text.length, max: MAX_NOTE })}>
        <TextRow value={text} onChange={(v) => setText(v.slice(0, MAX_NOTE))} placeholder={t('note.placeholder')} multiline autoFocus />
      </Section>
      <div style={{ margin: '0 14px 6px' }}>
        <div className="section-header" style={{ padding: '6px 16px 8px' }}>{t('note.mode')}</div>
        <Segmented inSheet value={mode} onChange={setMode}
          options={(['random', 'now', 'time'] as const).map((m) => ({ value: m, label: t(`note.${m}`) }))} />
      </div>
      <Section footer={t(hint, { name: partner })}>
        {mode === 'time' && (
          <label className="row"><span className="label">🕰️ {t('time')}</span>
            <input className="pill-input" type="datetime-local" value={at} min={localInput(new Date())} onChange={(e) => setAt(e.target.value)} /></label>
        )}
        <button className="row tap accent" disabled={!text.trim()} style={!text.trim() ? { opacity: 0.4 } : undefined}
          onClick={() => { save(); onClose() }}>{mode === 'now' ? `💌 ${t('note.send')}` : `⏳ ${t('note.schedule')}`}</button>
      </Section>
    </Sheet>
  )
}

/* ---------- reading ---------- */
export function NoteView({ id, onClose }: { id: string; onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const note = s.loveNotes.find((n) => n.id === id)
  const [reply, setReply] = useState('')
  const mine = note?.to === s.me
  useEffect(() => {
    if (note && mine && !note.seenAt) update((st) => { st.loveNotes = st.loveNotes.map((n) => (n.id === id ? { ...n, seenAt: nowIso() } : n)) })
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!note) return null
  const from = s.users[note.createdBy].name
  const send = () => { update((st) => { st.loveNotes = st.loveNotes.map((n) => (n.id === id ? { ...n, reply: reply.trim().slice(0, MAX_NOTE) } : n)) }); haptic(); onClose() }
  return (
    <Sheet title={`💌 ${t('note.from', { name: from })}`} onClose={onClose}>
      <div className="note-open" style={{ margin: '0 16px 14px' }}><Postcard id={note.card} text={note.text} /></div>
      <div className="col-hint" style={{ margin: '0 30px 14px' }}>{fmtDate(note.deliverAt.slice(0, 10), s.lang, { day: 'numeric', month: 'long' })}</div>
      {note.reply
        ? <Section header={mine ? t('note.yourReply') : t('note.replyFrom', { name: s.users[note.to].name })}><div className="row thought">{note.reply}</div></Section>
        : mine && (
          <Section>
            <TextRow value={reply} onChange={(v) => setReply(v.slice(0, MAX_NOTE))} placeholder={t('note.replyPlaceholder')} multiline />
            <button className="row tap accent" disabled={!reply.trim()} style={!reply.trim() ? { opacity: 0.4 } : undefined} onClick={send}>↩️ {t('note.reply')}</button>
          </Section>
        )}
    </Sheet>
  )
}

/* ---------- on the Us screen ---------- */
export function LoveNotesSection() {
  const s = useApp()
  const t = useT()
  const [write, setWrite] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [, tick] = useState(0)
  // Scheduled notes "arrive" on their own while the screen is open.
  useEffect(() => { const i = setInterval(() => tick((n) => n + 1), 30000); return () => clearInterval(i) }, [])
  const { unread, pending, history } = notesOf(s)
  const partner = s.users[other(s.me)].name
  const when = (n: LoveNote) => {
    const d = new Date(n.deliverAt)
    const day = toISO(d) === toISO(new Date()) ? t('today').toLowerCase() : fmtDate(toISO(d), s.lang, { day: 'numeric', month: 'short' })
    return `${day}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  const cancel = (id: string) => {
    update((st) => { st.loveNotes = st.loveNotes.filter((n) => n.id !== id); unaward(st, 'note', id) })
    toast(t('note.canceled'))
  }
  return (
    <>
      {unread.map((n) => (
        <div key={n.id} className="section">
          <button className="list note-new" onClick={() => setOpen(n.id)}>
            <span className="nn-emoji">💌</span>
            <span><b>{t('note.newFrom', { name: s.users[n.createdBy].name })}</b><small>{t('note.open')}</small></span>
          </button>
        </div>
      ))}
      <Section header={`💌 ${t('note.notes')}`} action={<button onClick={() => setWrite(true)}>+ {t('note.write')}</button>}>
        {pending.map((n) => (
          <Row key={n.id} icon="⏳" title={n.mode === 'random' ? t('note.pendingRandom', { name: partner }) : t('note.pending', { name: partner, when: when(n) })}
            sub={n.text.length > 60 ? n.text.slice(0, 60) + '…' : n.text}
            right={<button className="glass-btn lg" style={{ height: 32, fontSize: 14 }} onClick={(e) => { e.stopPropagation(); cancel(n.id) }}>{t('note.cancel')}</button>} />
        ))}
        {history.slice(0, 5).map((n) => (
          <Row key={n.id} icon={n.createdBy === s.me ? '📤' : '📥'} title={n.text.length > 48 ? n.text.slice(0, 48) + '…' : n.text}
            sub={`${n.createdBy === s.me ? t('note.toName', { name: partner }) : t('note.from', { name: s.users[n.createdBy].name })} · ${fmtDate(n.deliverAt.slice(0, 10), s.lang)}${n.reply ? ' · ↩️' : ''}`}
            chevron onClick={() => setOpen(n.id)} />
        ))}
        {pending.length === 0 && history.length === 0 && (
          <Row title={<span style={{ color: 'var(--label2)', fontWeight: 400 }}>{t('note.empty', { name: partner })}</span>} />
        )}
      </Section>
      {write && <NoteComposer onClose={() => setWrite(false)} />}
      {open && <NoteView id={open} onClose={() => setOpen(null)} />}
    </>
  )
}
